"use server";

import { prisma } from "@/lib/prisma";
import { formatDateISO } from "@/lib/utils";
import {
  evaluateStudentAttendanceRules,
  getSchoolDayKind,
  getUtcMonday,
  addUtcDays,
  parseIsoToUtc,
} from "@/lib/attendance-rules";
import { AttendanceStatus, RemedialStatus, StudentStatus } from "@prisma/client";

export type CalendarDayVisualStatus =
  | "PRESENT"
  | "LATE"
  | "REST"
  | "MAKEUP_ATTENDED"
  | "REMEDIED"
  | "ABSENT_MAKEUP_WINDOW"
  | "ABSENT"
  | "WEEKEND"
  | "UNRECORDED";

export interface CalendarDayCell {
  dateIso: string;
  dayNumber: number;
  dayOfWeek: number; // 1 = Mon .. 7 = Sun
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  isFuture: boolean;
  visualStatus: CalendarDayVisualStatus;
  rawStatus: AttendanceStatus | null;
  remark: string | null;
  statusNote: string | null;
  remedialInfo: {
    id: string;
    activityTitle: string;
    hoursEarned: number;
    status: RemedialStatus;
  } | null;
}

export interface CalendarWeekRow {
  weekIndex: number;
  mondayIso: string;
  days: CalendarDayCell[]; // Always 7 days: Mon (0) .. Sun (6)
  evaluation: {
    presentDays: number; // capped at 3
    restDays: number;
    remediedDays: number;
    absentDays: number; // un-remedied absences
    pendingRemedialDays: number;
    recordedWeekdays: number;
    status: "PASSED" | "SCHEDULED_MAKEUP" | "FAILED" | "IN_PROGRESS" | "EMPTY";
    label: string;
  };
}

export interface StudentMonthlyCalendarData {
  student: {
    id: string;
    studentId: string;
    title: string;
    firstName: string;
    lastName: string;
    fullName: string;
    classroom: string;
  };
  year: number;
  month: number; // 1..12
  monthNameThai: string;
  buddhistYear: number;
  summary: {
    presentDays: number;
    restDays: number;
    remediedDays: number;
    absentDays: number;
    overdueDays: number;
    scheduledMakeupDays: number;
    pendingRemedialDays: number;
    passedWeeks: number;
    failedWeeks: number;
  };
  weeks: CalendarWeekRow[];
}

export interface CalendarStudentDirectoryItem {
  id: string;
  studentId: string;
  fullName: string;
  classroom: string;
}

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

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
  const dow = THAI_SHORT_DOW[d.getUTCDay()] ?? "";
  const day = d.getUTCDate();
  const mon = THAI_SHORT_MONTHS[d.getUTCMonth()] ?? "";
  return `${dow} ${day} ${mon}`;
}

export async function getStudentsDirectoryForCalendarAction(): Promise<{
  classrooms: string[];
  students: CalendarStudentDirectoryItem[];
}> {
  const studentsRaw = await prisma.student.findMany({
    where: { status: StudentStatus.ACTIVE },
    orderBy: [{ classroom: "asc" }, { studentId: "asc" }],
    select: {
      id: true,
      studentId: true,
      title: true,
      firstName: true,
      lastName: true,
      classroom: true,
    },
  });

  const classroomSet = new Set<string>();
  const students = studentsRaw.map((s) => {
    classroomSet.add(s.classroom);
    return {
      id: s.id,
      studentId: s.studentId,
      fullName: `${s.title}${s.firstName} ${s.lastName}`,
      classroom: s.classroom,
    };
  });

  return {
    classrooms: Array.from(classroomSet).sort(),
    students,
  };
}

export async function getStudentMonthlyCalendarAction(
  studentIdOrCode: string,
  year?: number,
  month?: number
): Promise<{ success: boolean; message?: string; data?: StudentMonthlyCalendarData }> {
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth() + 1; // 1..12

  const query = studentIdOrCode.trim();
  const student = query
    ? await prisma.student.findFirst({
        where: {
          OR: [{ id: query }, { studentId: query }],
        },
      })
    : await prisma.student.findFirst({
        where: { status: StudentStatus.ACTIVE },
        orderBy: [{ classroom: "asc" }, { studentId: "asc" }],
      });

  if (!student) {
    return {
      success: false,
      message: "ไม่พบข้อมูลนักเรียนที่ระบุ",
    };
  }

  // First day and last day of target month in UTC
  const firstOfMonth = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
  const lastOfMonth = new Date(Date.UTC(targetYear, targetMonth, 0));

  // Expand range to full Monday..Sunday weeks covering the month
  const gridStart = getUtcMonday(firstOfMonth);
  const lastDayOfWeek = lastOfMonth.getUTCDay(); // 0=Sun..6=Sat
  const daysToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  const gridEnd = addUtcDays(lastOfMonth, daysToSunday);

  // ดึงประวัติทั้งหมดของนักเรียนคนนี้เพื่อให้การจับคู่แก้แถวข้ามสัปดาห์/ข้ามเดือน (FIFO) แม่นยำ 100%
  const [attendanceRecords, remedialRecords] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { studentId: student.id },
      orderBy: { date: "asc" },
    }),
    prisma.remedialRecord.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const evalResult = evaluateStudentAttendanceRules(
    attendanceRecords,
    remedialRecords,
    now
  );

  const attendanceMap = new Map<
    string,
    { status: AttendanceStatus; remark: string | null }
  >();
  for (const r of attendanceRecords) {
    attendanceMap.set(formatDateISO(r.date), {
      status: r.status,
      remark: r.remark,
    });
  }

  const remedialMap = new Map<
    string,
    { id: string; activityTitle: string; hoursEarned: number; status: RemedialStatus }
  >();
  for (const rem of remedialRecords) {
    if (rem.status === RemedialStatus.REJECTED) continue;
    const dIso = formatDateISO(rem.targetDate);
    if (!remedialMap.has(dIso)) {
      remedialMap.set(dIso, {
        id: rem.id,
        activityTitle: rem.activityTitle,
        hoursEarned: rem.hoursEarned,
        status: rem.status,
      });
    }
  }

  const todayIso = formatDateISO(now);
  const weeks: CalendarWeekRow[] = [];
  let cursor = gridStart;
  let weekIdx = 1;

  // Monthly totals (counted strictly for days belonging to targetMonth)
  let monthPresent = 0;
  let monthRest = 0;
  let monthRemedied = 0;
  let monthAbsent = 0;
  let monthOverdue = 0;
  let monthScheduledMakeup = 0;
  let passedWeeks = 0;
  let failedWeeks = 0;

  while (cursor.getTime() <= gridEnd.getTime()) {
    const mondayIso = formatDateISO(cursor);
    const wkEval = evalResult.weekSummaries.get(mondayIso);
    let wkRestCount = 0;

    const weekDays: CalendarDayCell[] = [];

    for (let dOffset = 0; dOffset < 7; dOffset++) {
      const cellDate = addUtcDays(cursor, dOffset);
      const dateIso = formatDateISO(cellDate);
      const dayNumber = cellDate.getUTCDate();
      const dayOfWeek = dOffset + 1; // 1=Mon..7=Sun
      const dayKind = getSchoolDayKind(cellDate);
      const isWeekend = dayKind === "WEEKEND";
      const isCurrentMonth =
        cellDate.getUTCFullYear() === targetYear &&
        cellDate.getUTCMonth() === targetMonth - 1;
      const isToday = dateIso === todayIso;
      const isFuture = dateIso > todayIso;

      const rec = attendanceMap.get(dateIso);
      const rem = remedialMap.get(dateIso) ?? null;

      let visualStatus: CalendarDayVisualStatus = isWeekend ? "WEEKEND" : "UNRECORDED";
      let statusNote: string | null = null;

      if (dayKind === "REQUIRED") {
        if (rec) {
          const isAttended =
            rec.status === AttendanceStatus.PRESENT ||
            rec.status === AttendanceStatus.LATE;
          if (isAttended) {
            visualStatus =
              rec.status === AttendanceStatus.LATE ? "LATE" : "PRESENT";
          } else {
            const absInfo = evalResult.absenceByDateMap.get(dateIso);
            if (absInfo?.isRemedied) {
              visualStatus = "REMEDIED";
              if (
                absInfo.remedyType === "MAKEUP_WED_THU" &&
                absInfo.remediedOnDateIso
              ) {
                statusNote = `มาแก้เมื่อ ${formatShortThaiIso(absInfo.remediedOnDateIso)}`;
              } else if (absInfo.remedyTitle) {
                statusNote = absInfo.remedyTitle;
              }
            } else if (absInfo?.isOverdueCrossWeek) {
              visualStatus = "ABSENT";
              statusNote = "ค้างสะสมข้ามรอบ!";
            } else {
              visualStatus = "ABSENT_MAKEUP_WINDOW";
              statusNote =
                dayOfWeek === 5
                  ? "นัดแก้ พ.-พฤ. หน้า"
                  : "นัดแก้ พ.-พฤ. นี้";
            }
          }
        }
      } else if (dayKind === "MAKEUP_HOLIDAY") {
        // วันพุธ (3) และ พฤหัสบดี (4): วันหยุดพักตามสิทธิ์ หรือ คลินิกมาแก้แถว
        if (
          rec?.status === AttendanceStatus.PRESENT ||
          rec?.status === AttendanceStatus.LATE
        ) {
          visualStatus = "MAKEUP_ATTENDED";
          const usage = evalResult.makeupUsageMap.get(dateIso);
          statusNote = usage?.targetAbsenceDateIso
            ? `ชดเชย ${formatShortThaiIso(usage.targetAbsenceDateIso)}`
            : "มาเข้าคลินิกวันหยุด";
        } else if (rec || !isFuture) {
          visualStatus = "REST";
          wkRestCount++;
        }
      }

      if (isCurrentMonth && !isWeekend) {
        if (visualStatus === "PRESENT" || visualStatus === "LATE") {
          monthPresent++;
        } else if (visualStatus === "REST") {
          monthRest++;
        } else if (visualStatus === "REMEDIED") {
          monthRemedied++;
        } else if (visualStatus === "ABSENT_MAKEUP_WINDOW") {
          monthAbsent++;
          monthScheduledMakeup++;
        } else if (visualStatus === "ABSENT") {
          monthAbsent++;
          monthOverdue++;
        }
      }

      weekDays.push({
        dateIso,
        dayNumber,
        dayOfWeek,
        isCurrentMonth,
        isWeekend,
        isToday,
        isFuture,
        visualStatus,
        rawStatus: rec?.status ?? null,
        remark: rec?.remark ?? null,
        statusNote,
        remedialInfo: rem,
      });
    }

    // Evaluate this week's rule from FIFO engine
    let evalStatus: CalendarWeekRow["evaluation"]["status"] = "EMPTY";
    let evalLabel = "ยังไม่มีข้อมูลเช็คชื่อ";

    if (wkEval && wkEval.status !== "EMPTY") {
      if (wkEval.status === "PASSED") {
        evalStatus = "PASSED";
        evalLabel =
          wkEval.remediedCount > 0
            ? `ผ่านเกณฑ์ (ครบ 3/3 • แก้แล้ว ${wkEval.remediedCount} วัน)`
            : `ผ่านเกณฑ์ (มาครบ ${wkEval.attendedCount}/3 วัน)`;
      } else if (wkEval.status === "SCHEDULED_MAKEUP") {
        evalStatus = "SCHEDULED_MAKEUP";
        evalLabel = `รอนัดแก้ พุธ-พฤหัสฯ (${wkEval.unremediedAbsentCount} วัน)`;
      } else if (wkEval.status === "OVERDUE") {
        evalStatus = "FAILED";
        evalLabel = `ค้างแก้ข้ามสัปดาห์! (${wkEval.unremediedAbsentCount} วัน)`;
      } else if (wkEval.status === "IN_PROGRESS") {
        evalStatus = "IN_PROGRESS";
        evalLabel = `กำลังสะสม (มา ${wkEval.attendedCount}/3 วัน)`;
      }
    }

    const hasWeekdayInMonth = weekDays.some((d) => !d.isWeekend && d.isCurrentMonth);
    if (hasWeekdayInMonth) {
      if (evalStatus === "PASSED") passedWeeks++;
      else if (evalStatus === "FAILED" || evalStatus === "SCHEDULED_MAKEUP") failedWeeks++;
    }

    weeks.push({
      weekIndex: weekIdx++,
      mondayIso,
      days: weekDays,
      evaluation: {
        presentDays: wkEval?.attendedCount ?? 0,
        restDays: wkRestCount,
        remediedDays: wkEval?.remediedCount ?? 0,
        absentDays: wkEval?.unremediedAbsentCount ?? 0,
        pendingRemedialDays: 0,
        recordedWeekdays: wkEval?.requiredRecordedCount ?? 0,
        status: evalStatus,
        label: evalLabel,
      },
    });

    cursor = addUtcDays(cursor, 7);
  }

  return {
    success: true,
    data: {
      student: {
        id: student.id,
        studentId: student.studentId,
        title: student.title,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.title}${student.firstName} ${student.lastName}`,
        classroom: student.classroom,
      },
      year: targetYear,
      month: targetMonth,
      monthNameThai: THAI_MONTHS[targetMonth - 1] ?? "",
      buddhistYear: targetYear + 543,
      summary: {
        presentDays: monthPresent,
        restDays: monthRest,
        remediedDays: monthRemedied,
        absentDays: monthAbsent,
        overdueDays: monthOverdue,
        scheduledMakeupDays: monthScheduledMakeup,
        pendingRemedialDays: 0,
        passedWeeks,
        failedWeeks,
      },
      weeks,
    },
  };
}
