"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toUTCDateOnly, formatDateISO } from "@/lib/utils";
import { Role, StudentStatus } from "@prisma/client";

const studentSchema = z.object({
  id: z.string().optional(),
  studentId: z
    .string()
    .min(3, "รหัสนักเรียนต้องมีอย่างน้อย 3 ตัวอักษร")
    .max(20),
  title: z.string().min(1, "กรุณาระบุคำนำหน้า"),
  firstName: z.string().min(1, "กรุณาระบุชื่อจริง"),
  lastName: z.string().min(1, "กรุณาระบุนามสกุล"),
  classroom: z.string().min(1, "กรุณาระบุห้องเรียน เช่น ม.4/1"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "กรุณาระบุชื่อ-นามสกุลผู้ใช้งาน"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().optional(),
  role: z.enum(["TEACHER", "ADMIN"]),
});

export interface AdminStudentItem {
  id: string;
  studentId: string;
  title: string;
  firstName: string;
  lastName: string;
  fullName: string;
  classroom: string;
  status: StudentStatus;
  attendanceCount: number;
  absentCount: number;
  remedialCount: number;
  createdAtIso: string;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  recordedCount: number;
  approvedCount: number;
  createdAtIso: string;
}

export interface AdminAttendanceDateSummary {
  dateIso: string;
  totalRecords: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  leaveCount: number;
}

export async function getAdminBackofficeDataAction(): Promise<{
  students: AdminStudentItem[];
  users: AdminUserItem[];
  classrooms: string[];
  attendanceDates: AdminAttendanceDateSummary[];
  systemStats: {
    totalStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    totalUsers: number;
    totalAttendanceRecords: number;
    totalRemedialRecords: number;
  };
}> {
  const [studentsRaw, usersRaw, allAttendances, totalRemedialRecords] =
    await Promise.all([
      prisma.student.findMany({
        include: {
          attendanceRecords: {
            select: { status: true },
          },
          _count: {
            select: {
              attendanceRecords: true,
              remedialRecords: true,
            },
          },
        },
        orderBy: [{ classroom: "asc" }, { studentId: "asc" }],
      }),
      prisma.user.findMany({
        include: {
          _count: {
            select: {
              recordedAttendances: true,
              approvedRemedials: true,
            },
          },
        },
        orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      }),
      prisma.attendanceRecord.findMany({
        select: { date: true, status: true },
        orderBy: { date: "desc" },
      }),
      prisma.remedialRecord.count(),
    ]);

  const students: AdminStudentItem[] = studentsRaw.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    title: s.title,
    firstName: s.firstName,
    lastName: s.lastName,
    fullName: `${s.title}${s.firstName} ${s.lastName}`,
    classroom: s.classroom,
    status: s.status,
    attendanceCount: s._count.attendanceRecords,
    absentCount: s.attendanceRecords.filter((r) => r.status === "ABSENT").length,
    remedialCount: s._count.remedialRecords,
    createdAtIso: s.createdAt.toISOString(),
  }));

  const users: AdminUserItem[] = usersRaw.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    recordedCount: u._count.recordedAttendances,
    approvedCount: u._count.approvedRemedials,
    createdAtIso: u.createdAt.toISOString(),
  }));

  const classroomSet = new Set<string>(["ม.4/1", "ม.4/2", "ม.5/1", "ม.6/1"]);
  students.forEach((s) => classroomSet.add(s.classroom));
  const classrooms = Array.from(classroomSet).sort();

  const dateMap = new Map<string, AdminAttendanceDateSummary>();
  for (const r of allAttendances) {
    const dIso = formatDateISO(r.date);
    const item = dateMap.get(dIso) ?? {
      dateIso: dIso,
      totalRecords: 0,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      leaveCount: 0,
    };
    item.totalRecords += 1;
    if (r.status === "PRESENT" || r.status === "EXEMPTION") item.presentCount += 1;
    else if (r.status === "LATE") item.lateCount += 1;
    else if (r.status === "ABSENT") item.absentCount += 1;
    else if (r.status === "LEAVE") item.leaveCount += 1;
    dateMap.set(dIso, item);
  }

  const attendanceDates = Array.from(dateMap.values()).sort((a, b) =>
    b.dateIso.localeCompare(a.dateIso)
  );

  return {
    students,
    users,
    classrooms,
    attendanceDates,
    systemStats: {
      totalStudents: students.length,
      activeStudents: students.filter((s) => s.status === "ACTIVE").length,
      inactiveStudents: students.filter((s) => s.status === "INACTIVE").length,
      totalUsers: users.length,
      totalAttendanceRecords: allAttendances.length,
      totalRemedialRecords,
    },
  };
}

export async function upsertStudentAction(
  rawInput: z.infer<typeof studentSchema>
): Promise<{ success: boolean; message: string }> {
  const parsed = studentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "ข้อมูลนักเรียนไม่ถูกต้อง",
    };
  }

  const data = parsed.data;

  try {
    // Check duplicate studentId
    const duplicate = await prisma.student.findUnique({
      where: { studentId: data.studentId.trim() },
    });

    if (duplicate && duplicate.id !== data.id) {
      return {
        success: false,
        message: `รหัสนักเรียน ${data.studentId} มีอยู่ในระบบแล้ว`,
      };
    }

    if (data.id) {
      await prisma.student.update({
        where: { id: data.id },
        data: {
          studentId: data.studentId.trim(),
          title: data.title.trim(),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          classroom: data.classroom.trim(),
          status: data.status as StudentStatus,
        },
      });
    } else {
      await prisma.student.create({
        data: {
          studentId: data.studentId.trim(),
          title: data.title.trim(),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          classroom: data.classroom.trim(),
          status: data.status as StudentStatus,
        },
      });
    }

    revalidatePath("/admin");
    revalidatePath("/attendance/check");
    revalidatePath("/attendance/remedial");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: data.id
        ? `อัปเดตข้อมูลนักเรียน ${data.firstName} เรียบร้อยแล้ว`
        : `เพิ่มนักเรียนใหม่ (${data.studentId} ${data.firstName}) สำเร็จ`,
    };
  } catch (error) {
    console.error("Upsert student error:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการบันทึกข้อมูลนักเรียน",
    };
  }
}

export async function toggleStudentStatusAction(
  id: string,
  newStatus: "ACTIVE" | "INACTIVE"
): Promise<{ success: boolean; message: string }> {
  try {
    const updated = await prisma.student.update({
      where: { id },
      data: { status: newStatus as StudentStatus },
    });

    revalidatePath("/admin");
    revalidatePath("/attendance/check");
    revalidatePath("/attendance/remedial");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `เปลี่ยนสถานะของ ${updated.firstName} เป็น ${newStatus === "ACTIVE" ? "กำลังศึกษา (ACTIVE)" : "พักการเรียน/ย้ายออก (INACTIVE)"} แล้ว`,
    };
  } catch {
    return {
      success: false,
      message: "ไม่สามารถเปลี่ยนสถานะนักเรียนได้",
    };
  }
}

export async function deleteStudentAction(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    const deleted = await prisma.student.delete({
      where: { id },
    });

    revalidatePath("/admin");
    revalidatePath("/attendance/check");
    revalidatePath("/attendance/remedial");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `ลบข้อมูลนักเรียน ${deleted.studentId} ${deleted.firstName} เรียบร้อยแล้ว`,
    };
  } catch {
    return {
      success: false,
      message: "ไม่สามารถลบข้อมูลนักเรียนได้",
    };
  }
}

export async function upsertUserAction(
  rawInput: z.infer<typeof userSchema>
): Promise<{ success: boolean; message: string }> {
  const parsed = userSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "ข้อมูลผู้ใช้งานไม่ถูกต้อง",
    };
  }

  const data = parsed.data;

  try {
    const duplicate = await prisma.user.findUnique({
      where: { email: data.email.trim().toLowerCase() },
    });

    if (duplicate && duplicate.id !== data.id) {
      return {
        success: false,
        message: `อีเมล ${data.email} มีอยู่ในระบบแล้ว`,
      };
    }

    if (data.id) {
      await prisma.user.update({
        where: { id: data.id },
        data: {
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          role: data.role as Role,
          ...(data.password?.trim() ? { password: data.password.trim() } : {}),
        },
      });
    } else {
      await prisma.user.create({
        data: {
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          password: data.password?.trim() || "password123",
          role: data.role as Role,
        },
      });
    }

    revalidatePath("/admin");

    return {
      success: true,
      message: data.id
        ? `อัปเดตข้อมูลผู้ใช้งาน ${data.name} เรียบร้อยแล้ว`
        : `เพิ่มผู้ใช้งาน ${data.name} (${data.role}) สำเร็จ`,
    };
  } catch (error) {
    console.error("Upsert user error:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้งาน",
    };
  }
}

export async function deleteUserAction(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    const count = await prisma.user.count();
    if (count <= 1) {
      return {
        success: false,
        message: "ไม่สามารถลบบัญชีผู้ใช้งานคนสุดท้ายของระบบได้",
      };
    }

    const deleted = await prisma.user.delete({
      where: { id },
    });

    revalidatePath("/admin");

    return {
      success: true,
      message: `ลบบัญชีผู้ใช้งาน ${deleted.name} เรียบร้อยแล้ว`,
    };
  } catch {
    return {
      success: false,
      message: "ไม่สามารถลบบัญชีผู้ใช้งานได้",
    };
  }
}

export async function deleteAttendanceByDateAction(
  dateIso: string
): Promise<{ success: boolean; message: string }> {
  try {
    const targetDate = toUTCDateOnly(dateIso);
    const res = await prisma.attendanceRecord.deleteMany({
      where: { date: targetDate },
    });

    revalidatePath("/admin");
    revalidatePath("/attendance/check");
    revalidatePath("/attendance/remedial");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `ลบประวัติการเช็คชื่อของวันที่ ${dateIso} จำนวน ${res.count} รายการเรียบร้อยแล้ว`,
    };
  } catch {
    return {
      success: false,
      message: "ไม่สามารถลบประวัติการเช็คชื่อได้",
    };
  }
}
