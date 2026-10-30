"use server";

import { signIn, signOut, getActiveOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";

export async function loginWithCredentialsAction(formData: {
  email: string;
  password?: string;
  redirectTo?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    await signIn("credentials", {
      email: formData.email.trim(),
      password: formData.password || "password123",
      redirectTo: formData.redirectTo || "/dashboard",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
        default:
          return {
            success: false,
            message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง",
          };
      }
    }
    // Next.js redirect mechanism throws a standard NEXT_REDIRECT error that must be re-thrown
    throw error;
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
