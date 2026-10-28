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
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
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
    signIn: "/dashboard",
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
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "TEACHER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as Role) ?? "TEACHER";
      }
      return session;
    },
  },
});

/**
 * Helper to get the active session user, or fallback to default seeded teacher/admin
 * so the system works seamlessly in interactive demos and Server Actions.
 */
export async function getActiveOperator(preferredRole: "TEACHER" | "ADMIN" = "TEACHER") {
  try {
    const session = await auth();
    if (session?.user?.id) {
      return session.user;
    }
  } catch {
    // Fallback when called outside standard request context
  }

  const fallbackUser = await prisma.user.findFirst({
    where: { role: preferredRole },
  });

  if (fallbackUser) {
    return {
      id: fallbackUser.id,
      name: fallbackUser.name,
      email: fallbackUser.email,
      role: fallbackUser.role,
    };
  }

  const anyUser = await prisma.user.findFirst();
  return anyUser
    ? { id: anyUser.id, name: anyUser.name, email: anyUser.email, role: anyUser.role }
    : null;
}
