"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveOperator } from "@/lib/auth";
import { toUTCDateOnly, formatDateISO } from "@/lib/utils";
import { AttendanceStatus, RemedialStatus, StudentStatus } from "@prisma/client";

const submitRemedialSchema = z.object({
  studentId: z.string().min(1, "กรุณาเลือกนักเรียน"),
  targetDate: z.string().min(1, "กรุณาเลือกวันที่ขาดแถวที่นำมาแก้"),
  activityTitle: z.string().min(3, "กรุณาระบุชื่อกิจกรรมจิตอาสา/แก้แถวอย่างน้อย 3 ตัวอักษร"),
  description: z.string().min(5, "กรุณาระบุรายละเอียดการปฏิบัติกิจกรรม"),
  hoursEarned: z.coerce.number().min(0.5, "จำนวนชั่วโมงต้องตั้งแต่ 0.5 ชม. ขึ้นไป").max(12),
  proofUrl: z.string().optional().or(z.literal("")),
  autoApprove: z.boolean().optional(),
});

const reviewRemedialSchema = z.object({
  remedialId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().optional(),
});

export interface WeeklyDayStatus {
  dayLabel: "จ" | "อ" | "พ" | "พฤ" | "ศ";
  dayName: string;
  dateIso: string;
  status: "PRESENT" | "ABSENT" | "UNRECORDED";
}

export interface AbsenceDateOption {
  dateIso: string;
  remark: string | null;
  remedialStatus: RemedialStatus | "NONE";
  remedialId?: string;
  activityTitle?: string;
}

export interface RemedialLogItem {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  classroom: string;
  targetDateIso: string;
  activityTitle: string;
  description: string | null;
  hoursEarned: number;
  proofUrl: string | null;
  status: RemedialStatus;
  approvedByName: string | null;
  createdAtIso: string;
}

export interface StudentDeficitReportItem {
  id: string;
  studentId: string;
  title: string;
  firstName: string;
  lastName: string;
  fullName: string;
  classroom: string;
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  leaveDays: number;
  rawAttendancePercent: number;
  approvedRemedialCount: number;
  pendingRemedialCount: number;
  rejectedRemedialCount: number;
  effectivePresentDays: number;
  effectiveAttendancePercent: number;
  remainingDeficitDays: number;
  targetSemesterDays: number;
  isCompletedSemester: boolean;
  thisWeekDays: WeeklyDayStatus[];
  thisWeekPresentDays: number;
  thisWeekAbsentDays: number;
  thisWeekStatus: "PASSED" | "IN_PROGRESS" | "FAILED";
  weeklyDeficitWeeksCount: number;
  remedialOverallStatus: "COMPLIANT" | "REMEDIED" | "IN_PROGRESS" | "WEEKLY_DEFICIT" | "CRITICAL_DEFICIT";
  absenceDates: AbsenceDateOption[];
  remedialRecords: RemedialLogItem[];
}

export async function getDeficitReportAction(options?: {
  includeAllStudents?: boolean;
}): Promise<{
  deficitStudents: StudentDeficitReportItem[];
  allRemedialLogs: RemedialLogItem[];
  stats: {
    targetSemesterDays: number;
    totalStudents: number;
    completed45Count: number;
    incompleted45Count: number;
    weeklyPassedCount: number;
    weeklyFailedCount: number;
    weeklyInProgressCount: number;
    pendingApprovalCount: number;
    remediedSuccessCount: number;
    totalBelowStandardRaw: number;
    stillDeficitCount: number;
  };
}> {
  const latestRecord = await prisma.attendanceRecord.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });
  const anchorDate = latestRecord?.date ? new Date(latestRecord.date) : new Date();

  const getMondayOfWeek = (d: Date): Date => {
    const date = new Date(d);
    const day = date.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setUTCDate(date.getUTCDate() + diff);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  };

  const monday = getMondayOfWeek(anchorDate);
  const dayLabels: Array<"จ" | "อ" | "พ" | "พฤ" | "ศ"> = ["จ", "อ", "พ", "พฤ", "ศ"];
  const dayNames = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
  const currentWeekDaysInfo = dayLabels.map((lbl, idx) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + idx);
    return {
      date: d,
      dateIso: formatDateISO(d),
      label: lbl,
      name: dayNames[idx],
    };
  });

  const students = await prisma.student.findMany({
    where: { status: StudentStatus.ACTIVE },
    include: {
      attendanceRecords: {
        orderBy: { date: "desc" },
      },
      remedialRecords: {
        include: { approvedBy: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ classroom: "asc" }, { studentId: "asc" }],
  });

  const allRemedialLogs: RemedialLogItem[] = [];
  const reportItems: StudentDeficitReportItem[] = [];
  const TARGET_SEMESTER_DAYS = 45;

  for (const s of students) {
    const recordMap = new Map<string, AttendanceStatus>();
    for (const r of s.attendanceRecords) {
      recordMap.set(formatDateISO(r.date), r.status);
    }

    // Weekly criterion: Monday-Friday must attend >= 3 days
    let thisWeekPresentDays = 0;
    let thisWeekAbsentDays = 0;
    let thisWeekUnrecordedDays = 0;

    const thisWeekDays: WeeklyDayStatus[] = currentWeekDaysInfo.map((w) => {
      const rec = recordMap.get(w.dateIso);
      let status: "PRESENT" | "ABSENT" | "UNRECORDED" = "UNRECORDED";
      if (rec !== undefined) {
        if (rec === AttendanceStatus.ABSENT) {
          status = "ABSENT";
          thisWeekAbsentDays++;
        } else {
          status = "PRESENT";
          thisWeekPresentDays++;
        }
      } else {
        thisWeekUnrecordedDays++;
      }
      return {
        dayLabel: w.label,
        dayName: w.name,
        dateIso: w.dateIso,
        status,
      };
    });

    let thisWeekStatus: "PASSED" | "IN_PROGRESS" | "FAILED" = "IN_PROGRESS";
    if (thisWeekPresentDays >= 3) {
      thisWeekStatus = "PASSED";
    } else if (thisWeekAbsentDays > 2 || (thisWeekUnrecordedDays === 0 && thisWeekPresentDays < 3)) {
      thisWeekStatus = "FAILED";
    } else {
      thisWeekStatus = "IN_PROGRESS";
    }

    // Historical weeks tracking
    const weekHistoryMap = new Map<string, number>();
    for (const r of s.attendanceRecords) {
      if (r.status !== AttendanceStatus.ABSENT) {
        const rMonIso = formatDateISO(getMondayOfWeek(r.date));
        if (rMonIso !== formatDateISO(monday)) {
          weekHistoryMap.set(rMonIso, (weekHistoryMap.get(rMonIso) ?? 0) + 1);
        }
      }
    }
    let weeklyDeficitWeeksCount = 0;
    for (const [, presentCount] of weekHistoryMap.entries()) {
      if (presentCount < 3) {
        weeklyDeficitWeeksCount++;
      }
    }
    if (thisWeekStatus === "FAILED") {
      weeklyDeficitWeeksCount++;
    }

    // Semester 45 times criterion
    const totalDays = s.attendanceRecords.length;
    const baseAttendedDays = s.attendanceRecords.filter(
      (r) => r.status !== AttendanceStatus.ABSENT
    ).length;
    const lateDays = s.attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.LATE
    ).length;
    const absentDays = s.attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.ABSENT
    ).length;
    const leaveDays = s.attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.LEAVE
    ).length;

    const approvedRemedials = s.remedialRecords.filter(
      (rem) => rem.status === RemedialStatus.APPROVED
    );
    const pendingRemedials = s.remedialRecords.filter(
      (rem) => rem.status === RemedialStatus.PENDING
    );
    const rejectedRemedials = s.remedialRecords.filter(
      (rem) => rem.status === RemedialStatus.REJECTED
    );

    const approvedRemedialCount = approvedRemedials.length;
    const pendingRemedialCount = pendingRemedials.length;
    const rejectedRemedialCount = rejectedRemedials.length;

    const effectivePresentDays = baseAttendedDays + approvedRemedialCount;
    const isCompletedSemester = effectivePresentDays >= TARGET_SEMESTER_DAYS;
    const remainingDeficitDays = Math.max(0, TARGET_SEMESTER_DAYS - effectivePresentDays);

    const rawAttendancePercent =
      TARGET_SEMESTER_DAYS > 0
        ? Math.round((baseAttendedDays / TARGET_SEMESTER_DAYS) * 1000) / 10
        : 100;
    const effectiveAttendancePercent =
      TARGET_SEMESTER_DAYS > 0
        ? Math.min(100, Math.round((effectivePresentDays / TARGET_SEMESTER_DAYS) * 1000) / 10)
        : 100;

    let remedialOverallStatus: StudentDeficitReportItem["remedialOverallStatus"] = "COMPLIANT";
    if (isCompletedSemester && thisWeekStatus !== "FAILED") {
      remedialOverallStatus = approvedRemedialCount > 0 ? "REMEDIED" : "COMPLIANT";
    } else if (pendingRemedialCount > 0) {
      remedialOverallStatus = "IN_PROGRESS";
    } else if (thisWeekStatus === "FAILED") {
      remedialOverallStatus = "WEEKLY_DEFICIT";
    } else {
      remedialOverallStatus = "CRITICAL_DEFICIT";
    }

    const fullName = `${s.title}${s.firstName} ${s.lastName}`;

    const studentRemedialLogs: RemedialLogItem[] = s.remedialRecords.map((rem) => {
      const logItem: RemedialLogItem = {
        id: rem.id,
        studentId: s.id,
        studentCode: s.studentId,
        studentName: fullName,
        classroom: s.classroom,
        targetDateIso: formatDateISO(rem.targetDate),
        activityTitle: rem.activityTitle,
        description: rem.description,
        hoursEarned: rem.hoursEarned,
        proofUrl: rem.proofUrl,
        status: rem.status,
        approvedByName: rem.approvedBy?.name ?? null,
        createdAtIso: rem.createdAt.toISOString(),
      };
      allRemedialLogs.push(logItem);
      return logItem;
    });

    const absenceDates: AbsenceDateOption[] = s.attendanceRecords
      .filter((r) => r.status === AttendanceStatus.ABSENT)
      .map((r) => {
        const dateIso = formatDateISO(r.date);
        const matchingRemedial = s.remedialRecords.find(
          (rem) => formatDateISO(rem.targetDate) === dateIso
        );
        return {
          dateIso,
          remark: r.remark,
          remedialStatus: matchingRemedial ? matchingRemedial.status : "NONE",
          remedialId: matchingRemedial?.id,
          activityTitle: matchingRemedial?.activityTitle,
        };
      });

    if (
      options?.includeAllStudents !== false ||
      !isCompletedSemester ||
      thisWeekStatus === "FAILED" ||
      s.remedialRecords.length > 0
    ) {
      reportItems.push({
        id: s.id,
        studentId: s.studentId,
        title: s.title,
        firstName: s.firstName,
        lastName: s.lastName,
        fullName,
        classroom: s.classroom,
        totalDays,
        presentDays: baseAttendedDays,
        lateDays,
        absentDays,
        leaveDays,
        rawAttendancePercent,
        approvedRemedialCount,
        pendingRemedialCount,
        rejectedRemedialCount,
        effectivePresentDays,
        effectiveAttendancePercent,
        remainingDeficitDays,
        targetSemesterDays: TARGET_SEMESTER_DAYS,
        isCompletedSemester,
        thisWeekDays,
        thisWeekPresentDays,
        thisWeekAbsentDays,
        thisWeekStatus,
        weeklyDeficitWeeksCount,
        remedialOverallStatus,
        absenceDates,
        remedialRecords: studentRemedialLogs,
      });
    }
  }

  allRemedialLogs.sort(
    (a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime()
  );

  const stats = {
    targetSemesterDays: TARGET_SEMESTER_DAYS,
    totalStudents: reportItems.length,
    completed45Count: reportItems.filter((i) => i.isCompletedSemester).length,
    incompleted45Count: reportItems.filter((i) => !i.isCompletedSemester).length,
    weeklyPassedCount: reportItems.filter((i) => i.thisWeekStatus === "PASSED").length,
    weeklyFailedCount: reportItems.filter((i) => i.thisWeekStatus === "FAILED").length,
    weeklyInProgressCount: reportItems.filter((i) => i.thisWeekStatus === "IN_PROGRESS").length,
    pendingApprovalCount: allRemedialLogs.filter((l) => l.status === RemedialStatus.PENDING).length,
    remediedSuccessCount: reportItems.filter((i) => i.approvedRemedialCount > 0).length,
    totalBelowStandardRaw: reportItems.filter((i) => !i.isCompletedSemester || i.thisWeekStatus === "FAILED").length,
    stillDeficitCount: reportItems.filter((i) => !i.isCompletedSemester).length,
  };

  return {
    deficitStudents: reportItems,
    allRemedialLogs,
    stats,
  };
}

export async function submitRemedialTaskAction(
  rawInput: z.infer<typeof submitRemedialSchema>
): Promise<{
  success: boolean;
  message: string;
}> {
  const parsed = submitRemedialSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "ข้อมูลแบบฟอร์มไม่ถูกต้อง",
    };
  }

  const {
    studentId,
    targetDate,
    activityTitle,
    description,
    hoursEarned,
    proofUrl,
    autoApprove,
  } = parsed.data;

  const targetUtcDate = toUTCDateOnly(targetDate);
  const operator = await getActiveOperator();

  try {
    // Check teacher permission for student's classroom
    const targetStudent = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, classroom: true },
    });

    if (!targetStudent) {
      return {
        success: false,
        message: "ไม่พบข้อมูลนักเรียนที่ระบุ",
      };
    }

    if (operator?.role === "TEACHER" && operator.classrooms) {
      const allowedRooms = operator.classrooms.split(",").map((c) => c.trim());
      if (allowedRooms.length > 0 && !allowedRooms.includes(targetStudent.classroom)) {
        return {
          success: false,
          message: `คุณไม่มีสิทธิ์จัดการข้อมูลนักเรียนห้อง ${targetStudent.classroom} (คุณดูแลห้อง: ${operator.classrooms})`,
        };
      }
    }

    // Check if there is already a non-rejected remedial record for this student and date
    const existing = await prisma.remedialRecord.findFirst({
      where: {
        studentId,
        targetDate: targetUtcDate,
        status: { in: [RemedialStatus.PENDING, RemedialStatus.APPROVED] },
      },
    });

    if (existing) {
      return {
        success: false,
        message: "วันที่ขาดแถวนี้มีการส่งบันทึกกิจกรรมแก้แถวไว้แล้ว",
      };
    }

    await prisma.remedialRecord.create({
      data: {
        studentId,
        targetDate: targetUtcDate,
        activityTitle: activityTitle.trim(),
        description: description.trim(),
        hoursEarned,
        proofUrl: proofUrl?.trim() || null,
        status: autoApprove ? RemedialStatus.APPROVED : RemedialStatus.PENDING,
        approvedById: autoApprove ? (operator?.id ?? null) : null,
      },
    });

    revalidatePath("/attendance/remedial");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: autoApprove
        ? "บันทึกและอนุมัติกิจกรรมแก้แถวเรียบร้อยแล้ว ระบบคำนวณชดเชยเวลาเรียนทันที"
        : "บันทึกการส่งงานแก้แถวสำเร็จ สถานะรอการอนุมัติ",
    };
  } catch (error) {
    console.error("Failed to submit remedial record:", error);
    return {
      success: false,
      message: "ไม่สามารถบันทึกข้อมูลกิจกรรมแก้แถวได้",
    };
  }
}

export async function reviewRemedialTaskAction(
  rawInput: z.infer<typeof reviewRemedialSchema>
): Promise<{
  success: boolean;
  message: string;
  updatedAttendancePercent?: number;
  remainingDeficitDays?: number;
}> {
  const parsed = reviewRemedialSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: "ข้อมูลการอนุมัติไม่ถูกต้อง",
    };
  }

  const { remedialId, status, note } = parsed.data;
  const operator = await getActiveOperator();

  if (!operator) {
    return {
      success: false,
      message: "กรุณาเข้าสู่ระบบก่อนทำการอนุมัติกิจกรรมแก้แถว",
    };
  }

  try {
    const existing = await prisma.remedialRecord.findUnique({
      where: { id: remedialId },
      include: {
        student: {
          select: { classroom: true, studentId: true },
        },
      },
    });

    if (!existing) {
      return {
        success: false,
        message: "ไม่พบรายการแก้แถวที่ระบุ",
      };
    }

    // Role & classroom permission check:
    // Homeroom teacher can approve their assigned classrooms (e.g. "ม.4/1,ม.4/2")
    // Admin can approve all classrooms
    if (operator.role === "TEACHER" && operator.classrooms) {
      const allowedRooms = operator.classrooms.split(",").map((c) => c.trim());
      if (allowedRooms.length > 0 && !allowedRooms.includes(existing.student.classroom)) {
        return {
          success: false,
          message: `คุณไม่มีสิทธิ์อนุมัติรายการของห้อง ${existing.student.classroom} (คุณดูแลห้อง: ${operator.classrooms})`,
        };
      }
    }

    const updatedDescription = note?.trim()
      ? `${existing.description ?? ""}\n[ความเห็นผู้อนุมัติ: ${note.trim()}]`.trim()
      : existing.description;

    const updated = await prisma.remedialRecord.update({
      where: { id: remedialId },
      data: {
        status: status as RemedialStatus,
        approvedById: operator.id,
        description: updatedDescription,
      },
    });

    // Calculate deficit offset upon approval/rejection
    const [attendanceRecords, approvedCount] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { studentId: updated.studentId },
      }),
      prisma.remedialRecord.count({
        where: {
          studentId: updated.studentId,
          status: RemedialStatus.APPROVED,
        },
      }),
    ]);

    const totalDays = attendanceRecords.length;
    const baseAttendedDays = attendanceRecords.filter(
      (r) =>
        r.status === AttendanceStatus.PRESENT ||
        r.status === AttendanceStatus.LATE ||
        r.status === AttendanceStatus.EXEMPTION
    ).length;

    const TARGET_SEMESTER_DAYS = 45;
    const effectivePresentDays = baseAttendedDays + approvedCount;
    const updatedAttendancePercent = Math.min(
      100,
      Math.round((effectivePresentDays / TARGET_SEMESTER_DAYS) * 1000) / 10
    );
    const remainingDeficitDays = Math.max(0, TARGET_SEMESTER_DAYS - effectivePresentDays);

    revalidatePath("/attendance/remedial");
    revalidatePath("/dashboard");

    return {
      success: true,
      message:
        status === "APPROVED"
          ? `อนุมัติการแก้แถวสำเร็จ! ยอดเข้าแถวสะสมเป็น ${effectivePresentDays}/${TARGET_SEMESTER_DAYS} ครั้ง ${
              remainingDeficitDays === 0 ? "(ครบเกณฑ์ 45 ครั้งแล้ว)" : `(ยังขาดอีก ${remainingDeficitDays} ครั้ง)`
            }`
          : "ปฏิเสธรายการแก้แถวเรียบร้อยแล้ว",
      updatedAttendancePercent,
      remainingDeficitDays,
    };
  } catch (error) {
    console.error("Failed to review remedial record:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการอัปเดตสถานะการแก้แถว",
    };
  }
}
