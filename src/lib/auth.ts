import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      classrooms?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    classrooms?: string | null;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user) return null;
        if (user.password && user.password !== parsed.data.password) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image ?? null,
          classrooms: (user as { classrooms?: string | null }).classrooms ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role ?? "TEACHER";
        token.image = user.image ?? null;
        token.classrooms = (user as { classrooms?: string | null }).classrooms ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && (token.id || token.email)) {
        if (token.id) session.user.id = token.id as string;

        // Fetch latest profile state (name, image, classrooms, role) from DB for real-time sync
        try {
          let freshUser = token.id
            ? await prisma.user.findUnique({
                where: { id: token.id as string },
                select: { id: true, role: true, image: true, classrooms: true, name: true, email: true },
              })
            : null;

          if (!freshUser && (token.email || session.user.email)) {
            const lookupEmail = (token.email || session.user.email) as string;
            freshUser = await prisma.user.findUnique({
              where: { email: lookupEmail },
              select: { id: true, role: true, image: true, classrooms: true, name: true, email: true },
            });
            if (freshUser) {
              session.user.id = freshUser.id;
            }
          }

          if (freshUser) {
            session.user.role = freshUser.role;
            session.user.image = freshUser.image;
            session.user.classrooms = freshUser.classrooms;
            if (freshUser.name) session.user.name = freshUser.name;
            if (freshUser.email) session.user.email = freshUser.email;
          } else {
            session.user.role = (token.role as Role) ?? "TEACHER";
            session.user.image = (token.image as string | null) ?? null;
            session.user.classrooms = (token.classrooms as string | null) ?? null;
            if (token.name) session.user.name = token.name;
          }
        } catch {
          session.user.role = (token.role as Role) ?? "TEACHER";
          session.user.image = (token.image as string | null) ?? null;
          session.user.classrooms = (token.classrooms as string | null) ?? null;
        }
      }
      return session;
    },
  },
});

/**
 * Helper to get the active session user, or fallback to default seeded teacher/admin
 * so the system works seamlessly in interactive demos and Server Actions.
 */
export async function getActiveOperator(preferredRole?: "TEACHER" | "ADMIN") {
  try {
    const session = await auth();
    if (session?.user?.id) {
      return {
        id: session.user.id,
        name: session.user.name ?? "ผู้ใช้งาน",
        email: session.user.email ?? "",
        role: session.user.role,
        classrooms: session.user.classrooms ?? null,
      };
    }
  } catch {
    // Fallback when called outside standard request context
  }

  const fallbackUser = preferredRole
    ? await prisma.user.findFirst({ where: { role: preferredRole } })
    : await prisma.user.findFirst();

  if (fallbackUser) {
    return {
      id: fallbackUser.id,
      name: fallbackUser.name,
      email: fallbackUser.email,
      role: fallbackUser.role,
      classrooms: (fallbackUser as { classrooms?: string | null }).classrooms ?? null,
    };
  }

  const anyUser = await prisma.user.findFirst();
  return anyUser
    ? {
        id: anyUser.id,
        name: anyUser.name,
        email: anyUser.email,
        role: anyUser.role,
        classrooms: (anyUser as { classrooms?: string | null }).classrooms ?? null,
      }
    : null;
}
