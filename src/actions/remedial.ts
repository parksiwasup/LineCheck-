"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveOperator } from "@/lib/auth";
import { toUTCDateOnly, formatDateISO } from "@/lib/utils";
import {
  evaluateStudentAttendanceRules,
  getUtcMonday,
  addUtcDays,
  parseIsoToUtc,
} from "@/lib/attendance-rules";
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
  status: "PRESENT" | "REST" | "MAKEUP_ATTENDED" | "REMEDIED" | "ABSENT" | "UNRECORDED";
  note?: string;
}

export interface AbsenceDateOption {
  dateIso: string;
  remark: string | null;
  remedialStatus: RemedialStatus | "NONE";
  remedialId?: string;
  activityTitle?: string;
  isOverdueCrossWeek?: boolean;
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
  thisWeekRestDays: number;
  thisWeekRemediedDays: number;
  thisWeekAbsentDays: number;
  thisWeekStatus: "PASSED" | "IN_PROGRESS" | "FAILED";
  graceMakeupAbsenceCount: number;
  overdueAbsenceCount: number;
  weeklyDeficitWeeksCount: number;
  remedialOverallStatus:
    | "COMPLIANT"
    | "REMEDIED"
    | "IN_PROGRESS"
    | "SCHEDULED_MAKEUP"
    | "WEEKLY_DEFICIT"
    | "CRITICAL_DEFICIT";
  absenceDates: AbsenceDateOption[];
  remedialRecords: RemedialLogItem[];
}

const THAI_SHORT_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];
const THAI_SHORT_DOW = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

function formatShortThaiIso(dateIso: string): string {
  const d = parseIsoToUtc(dateIso);
  return `${THAI_SHORT_DOW[d.getUTCDay()] ?? ""} ${d.getUTCDate()} ${THAI_SHORT_MONTHS[d.getUTCMonth()] ?? ""}`;
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
    scheduledMakeupStudentsCount: number;
    overdueStudentsCount: number;
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
  const now = new Date();
  const nowUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const anchorDate =
    latestRecord?.date && latestRecord.date.getTime() > nowUtc.getTime()
      ? new Date(latestRecord.date)
      : nowUtc;

  const monday = getUtcMonday(anchorDate);
  const mondayIso = formatDateISO(monday);
  const dayLabels: Array<"จ" | "อ" | "พ" | "พฤ" | "ศ"> = ["จ", "อ", "พ", "พฤ", "ศ"];
  const dayNames = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
  const currentWeekDaysInfo = dayLabels.map((lbl, idx) => {
    const d = addUtcDays(monday, idx);
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
    const evalResult = evaluateStudentAttendanceRules(
      s.attendanceRecords,
      s.remedialRecords,
      anchorDate
    );

    const recordMap = new Map<string, AttendanceStatus>();
    for (const r of s.attendanceRecords) {
      recordMap.set(formatDateISO(r.date), r.status);
    }

    let thisWeekPresentDays = 0;
    let thisWeekRestDays = 0;
    let thisWeekRemediedDays = 0;
    let thisWeekAbsentDays = 0;
    let thisWeekUnrecordedRequiredDays = 0;

    const thisWeekDays: WeeklyDayStatus[] = currentWeekDaysInfo.map((w, idx) => {
      const rec = recordMap.get(w.dateIso);
      const isRequiredDay = idx === 0 || idx === 1 || idx === 4; // จ., อ., ศ.
      let status: WeeklyDayStatus["status"] = "UNRECORDED";
      let note: string | undefined;

      if (isRequiredDay) {
        if (rec === AttendanceStatus.PRESENT || rec === AttendanceStatus.LATE) {
          status = "PRESENT";
          thisWeekPresentDays++;
          note = "มาเข้าแถวปกติ (นับโควตา 3 วัน)";
        } else if (rec !== undefined) {
          // ขาด / ลา ในวันบังคับ
          const absInfo = evalResult.absenceByDateMap.get(w.dateIso);
          if (absInfo?.isRemedied) {
            status = "REMEDIED";
            thisWeekRemediedDays++;
            thisWeekPresentDays++;
            note =
              absInfo.remedyType === "MAKEUP_WED_THU" && absInfo.remediedOnDateIso
                ? `แก้แล้วด้วยการมาคลินิกวันหยุด (${formatShortThaiIso(absInfo.remediedOnDateIso)})`
                : `แก้แล้ว (${absInfo.remedyTitle ?? "กิจกรรมจิตอาสา"})`;
          } else {
            status = "ABSENT";
            thisWeekAbsentDays++;
            note =
              idx === 4
                ? "ขาดวันศุกร์! โอนคิวนัดแก้ในวันพุธ-พฤหัสฯ สัปดาห์หน้า"
                : "ขาดแถว! นัดมาแก้ในวันหยุด พุธ-พฤหัสฯ นี้";
          }
        } else {
          thisWeekUnrecordedRequiredDays++;
          note = "ยังไม่ถึงกำหนดเช็คชื่อ";
        }
      } else {
        // วันพุธ (idx=2) และ พฤหัสบดี (idx=3): วันหยุดพัก หรือ คลินิกมาแก้แถว
        if (rec === AttendanceStatus.PRESENT || rec === AttendanceStatus.LATE) {
          status = "MAKEUP_ATTENDED";
          const usage = evalResult.makeupUsageMap.get(w.dateIso);
          note = usage?.targetAbsenceDateIso
            ? `เสียวันหยุดมาแก้แถว (ชดเชยวันขาด ${formatShortThaiIso(usage.targetAbsenceDateIso)})`
            : "มาเข้าคลินิกแก้แถวในวันหยุด";
        } else {
          status = "REST";
          thisWeekRestDays++;
          note = "วันหยุดพักตามสิทธิ์ (พุธ-พฤหัสบดี)";
        }
      }

      return {
        dayLabel: w.label,
        dayName: w.name,
        dateIso: w.dateIso,
        status,
        note,
      };
    });

    const graceMakeupAbsenceCount = evalResult.graceMakeupAbsences.length;
    const overdueAbsenceCount = evalResult.overdueAbsences.length;

    let thisWeekStatus: "PASSED" | "IN_PROGRESS" | "FAILED" = "IN_PROGRESS";
    if (thisWeekAbsentDays > 0 || graceMakeupAbsenceCount > 0) {
      thisWeekStatus = "FAILED";
    } else if (thisWeekPresentDays >= 3) {
      thisWeekStatus = "PASSED";
    } else if (thisWeekPresentDays + thisWeekUnrecordedRequiredDays < 3) {
      thisWeekStatus = "FAILED";
    } else {
      thisWeekStatus = "IN_PROGRESS";
    }

    let weeklyDeficitWeeksCount = 0;
    for (const wk of evalResult.weekSummaries.values()) {
      if (wk.unremediedAbsentCount > 0) {
        weeklyDeficitWeeksCount++;
      }
    }

    const totalDays = s.attendanceRecords.length;
    const baseAttendedDays = evalResult.totalRawAttendedDays;
    const approvedRemedialCount = evalResult.totalRemediedDays;
    const effectivePresentDays = evalResult.effectivePresentDays;

    const lateDays = s.attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.LATE
    ).length;
    const absentDays = evalResult.absences.length;
    const leaveDays = s.attendanceRecords.filter(
      (r) =>
        r.status === AttendanceStatus.LEAVE ||
        r.status === AttendanceStatus.EXEMPTION
    ).length;

    const rejectedRemedialCount = s.remedialRecords.filter(
      (rem) => rem.status === RemedialStatus.REJECTED
    ).length;

    const isCompletedSemester = effectivePresentDays >= TARGET_SEMESTER_DAYS;
    const remainingDeficitDays = Math.max(
      0,
      TARGET_SEMESTER_DAYS - effectivePresentDays
    );

    const rawAttendancePercent =
      TARGET_SEMESTER_DAYS > 0
        ? Math.round((baseAttendedDays / TARGET_SEMESTER_DAYS) * 1000) / 10
        : 100;
    const effectiveAttendancePercent =
      TARGET_SEMESTER_DAYS > 0
        ? Math.min(
            100,
            Math.round((effectivePresentDays / TARGET_SEMESTER_DAYS) * 1000) / 10
          )
        : 100;

    // แยกสถานะ 2 ระดับตามเส้นตายรายสัปดาห์ (Weekly Cutoff = อาทิตย์ 23:59 น.)
    let remedialOverallStatus: StudentDeficitReportItem["remedialOverallStatus"] =
      "COMPLIANT";
    if (overdueAbsenceCount > 0) {
      // พ้นเส้นตายวันอาทิตย์/คลินิกแล้ว -> ล็อกเป็นค้างแก้สะสมข้ามสัปดาห์ (ดองงาน)
      remedialOverallStatus = "CRITICAL_DEFICIT";
    } else if (graceMakeupAbsenceCount > 0) {
      // อยู่ในรอบนัดแก้ พุธ-พฤหัสฯ นี้ (รวมคนขาดวันศุกร์ที่แล้วที่โอนมาแก้พุธ-พฤหัสฯ นี้)
      remedialOverallStatus = "SCHEDULED_MAKEUP";
    } else if (approvedRemedialCount > 0) {
      remedialOverallStatus = "REMEDIED";
    } else {
      remedialOverallStatus = "COMPLIANT";
    }

    const fullName = `${s.title}${s.firstName} ${s.lastName}`;

    // รวมทั้งประวัติกิจกรรมจิตอาสา และประวัติการมาแก้แถวในวันหยุด พุธ/พฤหัสฯ เพื่อให้ครูเห็นครบทุกช่องทาง!
    const studentRemedialLogs: RemedialLogItem[] = [];

    for (const rem of s.remedialRecords) {
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
      studentRemedialLogs.push(logItem);
    }

    for (const abs of evalResult.absences) {
      if (abs.isRemedied && abs.remedyType === "MAKEUP_WED_THU" && abs.remediedOnDateIso) {
        const syntheticLog: RemedialLogItem = {
          id: `makeup-${s.id}-${abs.dateIso}`,
          studentId: s.id,
          studentCode: s.studentId,
          studentName: fullName,
          classroom: s.classroom,
          targetDateIso: abs.dateIso,
          activityTitle: `มาเข้าคลินิกแก้แถวในวันหยุด (${formatShortThaiIso(abs.remediedOnDateIso)})`,
          description: `เสียสิทธิ์วันหยุด พุธ/พฤหัสฯ มาเข้าแถวชดเชยวันขาด (${formatShortThaiIso(abs.dateIso)}) แบบ 1 ต่อ 1 สำเร็จ`,
          hoursEarned: 1,
          proofUrl: null,
          status: RemedialStatus.APPROVED,
          approvedByName: "ระบบจับคู่อัตโนมัติ (FIFO)",
          createdAtIso: `${abs.remediedOnDateIso}T08:00:00.000Z`,
        };
        allRemedialLogs.push(syntheticLog);
        studentRemedialLogs.push(syntheticLog);
      }
    }

    const absenceDates: AbsenceDateOption[] = [...evalResult.absences]
      .reverse()
      .map((abs) => {
        const matchingRemedial = s.remedialRecords.find(
          (rem) => formatDateISO(rem.targetDate) === abs.dateIso
        );
        return {
          dateIso: abs.dateIso,
          remark: abs.remark,
          remedialStatus: abs.isRemedied ? RemedialStatus.APPROVED : "NONE",
          remedialId: matchingRemedial?.id,
          activityTitle: abs.remedyTitle,
          isOverdueCrossWeek: abs.isOverdueCrossWeek,
        };
      });

    if (
      options?.includeAllStudents !== false ||
      !isCompletedSemester ||
      overdueAbsenceCount > 0 ||
      graceMakeupAbsenceCount > 0 ||
      approvedRemedialCount > 0 ||
      mondayIso.length > 0
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
        pendingRemedialCount: 0,
        rejectedRemedialCount,
        effectivePresentDays,
        effectiveAttendancePercent,
        remainingDeficitDays,
        targetSemesterDays: TARGET_SEMESTER_DAYS,
        isCompletedSemester,
        thisWeekDays,
        thisWeekPresentDays,
        thisWeekRestDays,
        thisWeekRemediedDays,
        thisWeekAbsentDays,
        thisWeekStatus,
        graceMakeupAbsenceCount,
        overdueAbsenceCount,
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

  const scheduledMakeupStudentsCount = reportItems.filter(
    (i) => i.graceMakeupAbsenceCount > 0 && i.overdueAbsenceCount === 0
  ).length;
  const overdueStudentsCount = reportItems.filter(
    (i) => i.overdueAbsenceCount > 0
  ).length;

  const stats = {
    targetSemesterDays: TARGET_SEMESTER_DAYS,
    totalStudents: reportItems.length,
    completed45Count: reportItems.filter((i) => i.isCompletedSemester).length,
    incompleted45Count: reportItems.filter((i) => !i.isCompletedSemester).length,
    weeklyPassedCount: reportItems.filter(
      (i) => i.graceMakeupAbsenceCount === 0 && i.overdueAbsenceCount === 0 && i.thisWeekStatus === "PASSED"
    ).length,
    weeklyFailedCount: reportItems.filter(
      (i) => i.graceMakeupAbsenceCount > 0 || i.overdueAbsenceCount > 0
    ).length,
    weeklyInProgressCount: reportItems.filter(
      (i) => i.thisWeekStatus === "IN_PROGRESS" && i.overdueAbsenceCount === 0 && i.graceMakeupAbsenceCount === 0
    ).length,
    scheduledMakeupStudentsCount,
    overdueStudentsCount,
    pendingApprovalCount: 0,
    remediedSuccessCount: reportItems.filter((i) => i.approvedRemedialCount > 0).length,
    totalBelowStandardRaw: reportItems.filter(
      (i) => !i.isCompletedSemester || i.graceMakeupAbsenceCount > 0 || i.overdueAbsenceCount > 0
    ).length,
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
  } = parsed.data;

  const targetUtcDate = toUTCDateOnly(targetDate);
  const operator = await getActiveOperator();

  try {
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
        status: RemedialStatus.APPROVED,
        approvedById: operator?.id ?? null,
      },
    });

    revalidatePath("/attendance/check");
    revalidatePath("/attendance/remedial");
    revalidatePath("/attendance/calendar");
    revalidatePath("/dashboard");
    revalidatePath("/portal");
    revalidatePath("/grades");

    return {
      success: true,
      message: "บันทึกกิจกรรมแก้แถวสำเร็จ ระบบชดเชยวันขาดให้ทันทีแล้ว",
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

    const [attendanceRecords, remedialRecords] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { studentId: updated.studentId },
      }),
      prisma.remedialRecord.findMany({
        where: { studentId: updated.studentId },
      }),
    ]);

    const evalRes = evaluateStudentAttendanceRules(
      attendanceRecords,
      remedialRecords,
      new Date()
    );

    const TARGET_SEMESTER_DAYS = 45;
    const effectivePresentDays = evalRes.effectivePresentDays;
    const updatedAttendancePercent = Math.min(
      100,
      Math.round((effectivePresentDays / TARGET_SEMESTER_DAYS) * 1000) / 10
    );
    const remainingDeficitDays = Math.max(
      0,
      TARGET_SEMESTER_DAYS - effectivePresentDays
    );

    revalidatePath("/attendance/remedial");
    revalidatePath("/dashboard");

    return {
      success: true,
      message:
        status === "APPROVED"
          ? `อนุมัติการแก้แถวสำเร็จ! ยอดเข้าแถวสะสมเป็น ${effectivePresentDays}/${TARGET_SEMESTER_DAYS} ครั้ง`
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
