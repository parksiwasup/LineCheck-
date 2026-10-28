"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveOperator } from "@/lib/auth";
import { toUTCDateOnly, formatDateISO } from "@/lib/utils";
import { AttendanceStatus, StudentStatus } from "@prisma/client";

const saveAttendanceSchema = z.object({
  dateIso: z.string().min(1, "กรุณาระบุวันที่"),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(["PRESENT", "LATE", "ABSENT", "LEAVE", "EXEMPTION"]),
        remark: z.string().optional().nullable(),
      })
    )
    .min(1, "ไม่มีรายชื่อนักเรียนที่จะบันทึก"),
});

export interface DailyStudentAttendanceItem {
  id: string;
  studentId: string;
  title: string;
  firstName: string;
  lastName: string;
  fullName: string;
  classroom: string;
  status: AttendanceStatus;
  remark: string;
  hasExistingRecord: boolean;
  recordId?: string;
}

export async function getClassroomsAction(): Promise<string[]> {
  const classrooms = await prisma.student.findMany({
    where: { status: StudentStatus.ACTIVE },
    select: { classroom: true },
    distinct: ["classroom"],
    orderBy: { classroom: "asc" },
  });

  const list = classrooms.map((c) => c.classroom);
  return list.length > 0 ? list : ["ม.4/1", "ม.4/2", "ม.5/1", "ม.6/1"];
}

export async function getDailyAttendanceAction(
  classroom: string,
  dateIso: string
): Promise<{
  dateIso: string;
  classroom: string;
  students: DailyStudentAttendanceItem[];
  summary: {
    total: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
    exemption: number;
    recordedCount: number;
  };
}> {
  const targetDate = toUTCDateOnly(dateIso);

  const students = await prisma.student.findMany({
    where: {
      status: StudentStatus.ACTIVE,
      ...(classroom && classroom !== "ALL" ? { classroom } : {}),
    },
    include: {
      attendanceRecords: {
        where: { date: targetDate },
        take: 1,
      },
    },
    orderBy: [{ classroom: "asc" }, { studentId: "asc" }],
  });

  const items: DailyStudentAttendanceItem[] = students.map((student) => {
    const existing = student.attendanceRecords[0];
    return {
      id: student.id,
      studentId: student.studentId,
      title: student.title,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.title}${student.firstName} ${student.lastName}`,
      classroom: student.classroom,
      status: existing?.status ?? AttendanceStatus.PRESENT,
      remark: existing?.remark ?? "",
      hasExistingRecord: Boolean(existing),
      recordId: existing?.id,
    };
  });

  const summary = {
    total: items.length,
    present: items.filter((i) => i.status === AttendanceStatus.PRESENT).length,
    late: items.filter((i) => i.status === AttendanceStatus.LATE).length,
    absent: items.filter((i) => i.status === AttendanceStatus.ABSENT).length,
    leave: items.filter((i) => i.status === AttendanceStatus.LEAVE).length,
    exemption: items.filter((i) => i.status === AttendanceStatus.EXEMPTION).length,
    recordedCount: items.filter((i) => i.hasExistingRecord).length,
  };

  return {
    dateIso: formatDateISO(targetDate),
    classroom,
    students: items,
    summary,
  };
}

export async function saveDailyAttendanceAction(
  rawInput: z.infer<typeof saveAttendanceSchema>
): Promise<{
  success: boolean;
  message: string;
  count?: number;
}> {
  const parsed = saveAttendanceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  const { dateIso, records } = parsed.data;
  const targetDate = toUTCDateOnly(dateIso);
  const operator = await getActiveOperator("TEACHER");

  try {
    await prisma.$transaction(
      records.map((rec) =>
        prisma.attendanceRecord.upsert({
          where: {
            studentId_date: {
              studentId: rec.studentId,
              date: targetDate,
            },
          },
          update: {
            status: rec.status as AttendanceStatus,
            remark: rec.remark?.trim() || null,
            recordedById: operator?.id ?? null,
          },
          create: {
            studentId: rec.studentId,
            date: targetDate,
            status: rec.status as AttendanceStatus,
            remark: rec.remark?.trim() || null,
            recordedById: operator?.id ?? null,
          },
        })
      )
    );

    revalidatePath("/attendance/check");
    revalidatePath("/attendance/remedial");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `บันทึกข้อมูลการเช็คชื่อสำเร็จจำนวน ${records.length} คน`,
      count: records.length,
    };
  } catch (error) {
    console.error("Failed to save attendance:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล",
    };
  }
}
