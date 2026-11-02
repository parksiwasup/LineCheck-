"use server";

import { signIn, signOut, getActiveOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "กรุณาระบุชื่อ-นามสกุลอย่างน้อย 2 ตัวอักษร"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),
  classrooms: z.string().optional().nullable(),
});

export async function registerUserAction(formData: {
  name: string;
  email: string;
  password: string;
  classrooms?: string | null;
}): Promise<{ success: boolean; message: string }> {
  try {
    const parsed = registerSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "ข้อมูลที่กรอกไม่ถูกต้อง",
      };
    }

    const cleanEmail = parsed.data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return {
        success: false,
        message: "อีเมลนี้มีผู้ใช้งานในระบบแล้ว กรุณาใช้อีเมลอื่น หรือเข้าสู่ระบบ",
      };
    }

    await prisma.user.create({
      data: {
        name: parsed.data.name.trim(),
        email: cleanEmail,
        password: parsed.data.password,
        role: "TEACHER",
        classrooms: parsed.data.classrooms?.trim() || null,
      },
    });

    return {
      success: true,
      message: "สมัครสมาชิกสำเร็จเรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยบัญชีของคุณ",
    };
  } catch (error) {
    console.error("Failed to register user:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง",
    };
  }
}

export async function loginWithGoogleAction(): Promise<void> {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function getGoogleSignInUrlAction(
  callbackUrl?: string
): Promise<{ success: boolean; url?: string; message?: string }> {
  try {
    const redirectUrl = await signIn("google", {
      redirectTo: callbackUrl || "/dashboard",
      redirect: false,
    });
    if (typeof redirectUrl === "string" && redirectUrl.length > 0) {
      return { success: true, url: redirectUrl };
    }
    return {
      success: false,
      message: "ไม่สามารถสร้างลิงก์เชื่อมต่อ Google OAuth ได้",
    };
  } catch (error) {
    console.error("Failed to generate Google OAuth URL:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการเชื่อมต่อ Google OAuth กรุณาลองใหม่อีกครั้ง",
    };
  }
}

export async function loginWithCredentialsAction(formData: {
  email: string;
  password?: string;
  redirectTo?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const cleanEmail = formData.email.trim().toLowerCase();
    const rawPassword = formData.password ?? "";

    if (!cleanEmail) {
      return { success: false, message: "กรุณากรอกอีเมล" };
    }
    if (!rawPassword) {
      return { success: false, message: "กรุณากรอกรหัสผ่าน" };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!existingUser) {
      return {
        success: false,
        message:
          "ไม่พบบัญชีอีเมลนี้ในระบบ กรุณากด 'สมัครสมาชิกใหม่' หรือกดปุ่ม 'เข้าสู่ระบบด้วย Google'",
      };
    }

    if (!existingUser.password) {
      return {
        success: false,
        message:
          "อีเมลนี้ลงทะเบียนผ่านบัญชี Google กรุณากดปุ่ม 'เข้าสู่ระบบด้วย Google' ด้านล่าง",
      };
    }

    if (existingUser.password !== rawPassword) {
      return {
        success: false,
        message: "รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านอีกครั้ง",
      };
    }

    await signIn("credentials", {
      email: cleanEmail,
      password: rawPassword,
      redirect: false,
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    if (
      error instanceof AuthError ||
      (typeof error === "object" &&
        error !== null &&
        "type" in error &&
        (error as { type?: string }).type === "CredentialsSignin")
    ) {
      return { success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    }
    console.error("Credentials login error:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง",
    };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export interface QuickLoginUser {
  id: string;
  name: string;
  email: string;
  role: "TEACHER" | "ADMIN";
  classrooms?: string | null;
  image?: string | null;
}

export async function getQuickLoginUsersAction(): Promise<QuickLoginUser[]> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        classrooms: true,
        image: true,
      },
      orderBy: [
        { role: "asc" }, // ADMIN first
        { email: "asc" },
      ],
    });
    return users;
  } catch (error) {
    console.error("Failed to load quick login users:", error);
    return [];
  }
}

export async function updateUserProfileImageAction(imageUrl: string): Promise<{
  success: boolean;
  message: string;
  image?: string;
}> {
  try {
    const operator = await getActiveOperator();
    if (!operator?.id) {
      return { success: false, message: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" };
    }

    const updated = await prisma.user.update({
      where: { id: operator.id },
      data: { image: imageUrl },
    });

    revalidatePath("/", "layout");

    return {
      success: true,
      message: "อัปเดตรูปโปรไฟล์สำเร็จแล้ว",
      image: updated.image ?? imageUrl,
    };
  } catch (error) {
    console.error("Failed to update profile image:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการบันทึกรูปโปรไฟล์" };
  }
}
