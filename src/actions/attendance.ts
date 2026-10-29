"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveOperator } from "@/lib/auth";
import { toUTCDateOnly, formatDateISO } from "@/lib/utils";
import {
  evaluateStudentAttendanceRules,
  getSchoolDayKind,
  getUtcMonday,
} from "@/lib/attendance-rules";
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
  weekOtherPresent?: number;
  weekOtherRest?: number;
  weekOtherAbsent?: number;
  // ข้อมูลคลินิกแก้แถววันหยุด (พุธ-พฤหัสบดี) และหนี้วันขาดข้ามสัปดาห์
  pendingMakeupCount?: number; // จำนวนวันขาดที่รอมาแก้ (ไม่นับรวมวันนี้)
  nextTargetAbsenceIso?: string | null; // วันที่ขาดเก่าที่สุดที่จะถูกล้างหนี้หากมาแก้ในวันพุธ/พฤหัสฯ นี้
  nextTargetIsCrossWeek?: boolean; // เป็นหนี้ค้างมาจากสัปดาห์ก่อนหรือไม่
  hasOverdueDebt?: boolean; // พ้นเส้นตายวันอาทิตย์ / รอบนัดแล้วหรือยัง
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
  isMakeupHoliday: boolean;
  isWeekend: boolean;
  students: DailyStudentAttendanceItem[];
  summary: {
    total: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
    exemption: number;
    recordedCount: number;
    eligibleMakeupStudentsCount: number;
  };
}> {
  const targetDate = toUTCDateOnly(dateIso);
  const targetIso = formatDateISO(targetDate);
  const dayKind = getSchoolDayKind(targetDate);
  const isMakeupHoliday = dayKind === "MAKEUP_HOLIDAY";
  const isWeekend = dayKind === "WEEKEND";
  const targetMondayIso = formatDateISO(getUtcMonday(targetDate));

  const students = await prisma.student.findMany({
    where: {
      status: StudentStatus.ACTIVE,
      ...(classroom && classroom !== "ALL" ? { classroom } : {}),
    },
    include: {
      attendanceRecords: {
        orderBy: { date: "asc" },
      },
      remedialRecords: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ classroom: "asc" }, { studentId: "asc" }],
  });

  const items: DailyStudentAttendanceItem[] = students.map((student) => {
    const existing = student.attendanceRecords.find(
      (r) => formatDateISO(r.date) === targetIso
    );

    // ประเมินสถานะสะสมโดย "ไม่นับรวม record ของ targetIso" เพื่อดูว่าก่อนถึงวันนี้ เด็กมีหนี้วันขาดรอมาแก้กี่วัน
    const recordsExcludingTarget = student.attendanceRecords.filter(
      (r) => formatDateISO(r.date) !== targetIso
    );
    const evalBeforeToday = evaluateStudentAttendanceRules(
      recordsExcludingTarget,
      student.remedialRecords,
      targetDate
    );

    // หาวันขาดที่เกิดขึ้นก่อน targetIso ที่ยังไม่ได้รับการแก้ (FIFO: เก่าสุดก่อน)
    const eligibleAbsences = evalBeforeToday.unremediedAbsences.filter(
      (a) => a.dateIso < targetIso
    );
    const oldestPendingAbsence = eligibleAbsences[0] ?? null;

    // นับสถิติเฉพาะสัปดาห์ของ targetDate (จ., อ., ศ. อื่นๆ ที่ไม่ใช่วันนี้)
    const wkSummary = evalBeforeToday.weekSummaries.get(targetMondayIso);
    const weekOtherPresent = wkSummary?.attendedCount ?? 0;
    const weekOtherAbsent = wkSummary?.unremediedAbsentCount ?? 0;
    const weekOtherRest = 2;

    // วันพุธ-พฤหัสบดี: ค่าเริ่มต้นเป็นวันหยุดพัก (EXEMPTION) เว้นแต่ครูติ๊ก PRESENT = มาเข้าคลินิกแก้แถว
    // วันจันทร์-อังคาร-ศุกร์: ค่าเริ่มต้นเป็นมาเข้าแถวปกติ (PRESENT)
    const defaultStatus: AttendanceStatus =
      isMakeupHoliday || isWeekend
        ? AttendanceStatus.EXEMPTION
        : AttendanceStatus.PRESENT;

    const effectiveStatus = existing?.status ?? defaultStatus;

    let autoRemark = existing?.remark ?? "";
    if (!existing) {
      if (isMakeupHoliday) {
        autoRemark = oldestPendingAbsence
          ? `นัดมาแก้แถวชดเชยวันที่ ${oldestPendingAbsence.dateIso}`
          : "วันหยุดประจำสัปดาห์ (ไม่ติดขาด)";
      }
    }

    return {
      id: student.id,
      studentId: student.studentId,
      title: student.title,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.title}${student.firstName} ${student.lastName}`,
      classroom: student.classroom,
      status: effectiveStatus,
      remark: autoRemark,
      hasExistingRecord: Boolean(existing),
      recordId: existing?.id,
      weekOtherPresent,
      weekOtherRest,
      weekOtherAbsent,
      pendingMakeupCount: eligibleAbsences.length,
      nextTargetAbsenceIso: oldestPendingAbsence?.dateIso ?? null,
      nextTargetIsCrossWeek: oldestPendingAbsence
        ? oldestPendingAbsence.mondayIso !== targetMondayIso
        : false,
      hasOverdueDebt: eligibleAbsences.some((a) => a.isOverdueCrossWeek),
    };
  });

  const summary = {
    total: items.length,
    present: items.filter((i) => i.status === AttendanceStatus.PRESENT).length,
    late: items.filter((i) => i.status === AttendanceStatus.LATE).length,
    absent: items.filter((i) => i.status === AttendanceStatus.ABSENT).length,
    leave: items.filter((i) => i.status === AttendanceStatus.LEAVE).length,
    exemption: items.filter((i) => i.status === AttendanceStatus.EXEMPTION)
      .length,
    recordedCount: items.filter((i) => i.hasExistingRecord).length,
    eligibleMakeupStudentsCount: items.filter(
      (i) =>
        (i.pendingMakeupCount ?? 0) > 0 ||
        i.status === AttendanceStatus.PRESENT ||
        i.status === AttendanceStatus.LATE
    ).length,
  };

  return {
    dateIso: targetIso,
    classroom,
    isMakeupHoliday,
    isWeekend,
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
  const isMakeupHoliday = getSchoolDayKind(targetDate) === "MAKEUP_HOLIDAY";
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
    revalidatePath("/attendance/calendar");
    revalidatePath("/dashboard");
    revalidatePath("/grades");
    revalidatePath("/portal");

    const cameMakeupCount = records.filter(
      (r) => r.status === "PRESENT" || r.status === "LATE"
    ).length;

    return {
      success: true,
      message: isMakeupHoliday
        ? `บันทึกคลินิกแก้แถววันหยุดสำเร็จ (มาแก้แถวชดเชย ${cameMakeupCount} คน)`
        : `บันทึกข้อมูลการเช็คชื่อสำเร็จจำนวน ${records.length} คน`,
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
