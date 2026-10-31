"use server";

import { prisma } from "@/lib/prisma";
import { formatDateISO } from "@/lib/utils";
import { evaluateStudentAttendanceRules, getSchoolDayKind } from "@/lib/attendance-rules";
import { AttendanceStatus, RemedialStatus, StudentStatus } from "@prisma/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export type WeeklyTrendStudent = {
  studentId: string;
  fullName: string;
  classroom: string;
};

export type WeeklyTrendItem = {
  dateIso: string;
  dateLabel: string;
  present: number;
  late: number;
  absent: number;
  leave: number;
  attendanceRate: number;
  absentStudents?: WeeklyTrendStudent[];
};

export interface ClassroomDetailStudent {
  id: string;
  studentId: string;
  fullName: string;
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  leaveDays: number;
  rawRate: number;
  effectiveRate: number;
  deficitDays: number;
  approvedRemedialCount: number;
  pendingRemedialCount: number;
  isCompliant: boolean;
}

export interface ClassroomSummaryItem {
  classroom: string;
  totalStudents: number;
  averageRate: number;
  deficitCount: number;
  compliantCount: number;
  students: ClassroomDetailStudent[];
}

export interface RecentRemedialItem {
  id: string;
  studentCode: string;
  studentName: string;
  classroom: string;
  type: "MAKEUP_ATTENDED" | "ACTIVITY";
  activityTitle: string;
  targetDateIso: string;
  remediedOnDateIso: string;
  hoursEarned?: number;
  status: RemedialStatus;
  createdAtIso: string;
}

export interface DashboardAnalyticsData {
  summary: {
    totalStudents: number;
    latestDateIso: string;
    todayAttendanceRate: number;
    todayPresent: number;
    todayLate: number;
    todayAbsent: number;
    todayLeave: number;
    pendingRemedialCount: number;
    approvedRemedialCount: number;
    deficitStudentCount: number;
    compliantStudentCount: number;
  };
  weeklyTrend: WeeklyTrendItem[];
  complianceRatio: {
    name: string;
    value: number;
    color: string;
  }[];
  classroomSummary: ClassroomSummaryItem[];
  recentRemedials: RecentRemedialItem[];
}

export async function getDashboardAnalyticsAction(): Promise<DashboardAnalyticsData> {
  const students = await prisma.student.findMany({
    where: { status: StudentStatus.ACTIVE },
    include: {
      attendanceRecords: true,
      remedialRecords: true,
    },
    orderBy: [{ classroom: "asc" }, { studentId: "asc" }],
  });

  const allRecords = await prisma.attendanceRecord.findMany({
    include: { student: true },
    orderBy: { date: "asc" },
  });

  const recentRemedialRecords = await prisma.remedialRecord.findMany({
    include: { student: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  // Group all records by dateIso
  const dateMap = new Map<
    string,
    {
      present: number;
      late: number;
      absent: number;
      leave: number;
      total: number;
      absentStudents: WeeklyTrendStudent[];
    }
  >();

  for (const r of allRecords) {
    if (getSchoolDayKind(r.date) !== "REQUIRED") continue;
    const dIso = formatDateISO(r.date);
    const current = dateMap.get(dIso) ?? {
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      total: 0,
      absentStudents: [],
    };

    current.total += 1;
    if (r.status === AttendanceStatus.ABSENT) {
      current.absent += 1;
      if (r.student) {
        current.absentStudents.push({
          studentId: r.student.studentId,
          fullName: `${r.student.title ?? ""}${r.student.firstName} ${r.student.lastName}`.trim(),
          classroom: r.student.classroom,
        });
      }
    } else {
      current.present += 1;
    }
    dateMap.set(dIso, current);
  }

  const sortedDates = Array.from(dateMap.keys()).sort();
  const latestDateIso =
    sortedDates[sortedDates.length - 1] ?? formatDateISO(new Date());
  const latestCounts = dateMap.get(latestDateIso) ?? {
    present: 0,
    late: 0,
    absent: 0,
    leave: 0,
    total: 0,
    absentStudents: [],
  };

  const todayAttendanceRate =
    latestCounts.total > 0
      ? Math.round((latestCounts.present / latestCounts.total) * 1000) / 10
      : 0;

  // Weekly trend (last 7 school days)
  const recentDates = sortedDates.slice(-7);
  const weeklyTrend = recentDates.map((dIso) => {
    const item = dateMap.get(dIso)!;
    const [y, m, d] = dIso.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const rate =
      item.total > 0
        ? Math.round((item.present / item.total) * 1000) / 10
        : 0;
    return {
      dateIso: dIso,
      dateLabel: format(dateObj, "d MMM", { locale: th }),
      present: item.present,
      late: 0,
      absent: item.absent,
      leave: 0,
      attendanceRate: rate,
      absentStudents: item.absentStudents,
    };
  });

  // Calculate compliance vs deficit across active students
  let compliantStandardCount = 0;
  let remediedCompliantCount = 0;
  let deficitCount = 0;
  let pendingRemedialCount = 0;
  let approvedRemedialCount = 0;

  const classroomAgg = new Map<
    string,
    {
      totalStudents: number;
      sumRate: number;
      deficitCount: number;
      compliantCount: number;
      students: ClassroomDetailStudent[];
    }
  >();

  const allResolvedRemedials: RecentRemedialItem[] = [];

  const now = new Date();
  for (const s of students) {
    const evalRes = evaluateStudentAttendanceRules(
      s.attendanceRecords,
      s.remedialRecords,
      now
    );

    for (const a of evalRes.absences) {
      if (a.isRemedied) {
        allResolvedRemedials.push({
          id: `${s.id}-${a.dateIso}`,
          studentCode: s.studentId,
          studentName: `${s.title}${s.firstName} ${s.lastName}`,
          classroom: s.classroom,
          type: "MAKEUP_ATTENDED",
          activityTitle: "มาแก้แถว",
          targetDateIso: a.dateIso,
          remediedOnDateIso: a.remediedOnDateIso ?? a.dateIso,
          status: RemedialStatus.APPROVED,
          createdAtIso: a.remediedOnDateIso ?? a.dateIso,
        });
      }
    }

    const requiredRecordsCount = s.attendanceRecords.filter(
      (r) => getSchoolDayKind(r.date) === "REQUIRED"
    ).length;
    const total = Math.max(1, requiredRecordsCount);
    const presentCount = evalRes.totalRawAttendedDays;
    const absentCount = evalRes.absences.length;
    const approvedForStudent = evalRes.totalRemediedDays;
    const pendingForStudent = 0;

    approvedRemedialCount += approvedForStudent;
    pendingRemedialCount += pendingForStudent;

    const rawRate = requiredRecordsCount > 0 ? (presentCount / total) * 100 : 100;
    const effectiveAttended = Math.min(total, evalRes.effectivePresentDays);
    const effectiveRate =
      requiredRecordsCount > 0 ? (effectiveAttended / total) * 100 : 100;
    const unremediedAbsentCount = evalRes.unremediedAbsences.length;
    const isCompliant = unremediedAbsentCount === 0;
    const deficitDays = unremediedAbsentCount;

    if (absentCount === 0) {
      compliantStandardCount += 1;
    } else if (unremediedAbsentCount === 0) {
      remediedCompliantCount += 1;
    } else {
      deficitCount += 1;
    }

    const cStat = classroomAgg.get(s.classroom) ?? {
      totalStudents: 0,
      sumRate: 0,
      deficitCount: 0,
      compliantCount: 0,
      students: [],
    };

    cStat.totalStudents += 1;
    cStat.sumRate += effectiveRate;
    if (isCompliant) {
      cStat.compliantCount += 1;
    } else {
      cStat.deficitCount += 1;
    }

    cStat.students.push({
      id: s.id,
      studentId: s.studentId,
      fullName: `${s.title}${s.firstName} ${s.lastName}`,
      totalDays: requiredRecordsCount,
      presentDays: presentCount,
      lateDays: 0,
      absentDays: absentCount,
      leaveDays: 0,
      rawRate: Math.round(rawRate * 10) / 10,
      effectiveRate: Math.round(effectiveRate * 10) / 10,
      deficitDays,
      approvedRemedialCount: approvedForStudent,
      pendingRemedialCount: pendingForStudent,
      isCompliant,
    });

    classroomAgg.set(s.classroom, cStat);
  }

  const complianceRatio = [
    {
      name: "ผ่านเกณฑ์ปกติ (≥ 80%)",
      value: compliantStandardCount,
      color: "#22c55e",
    },
    ...(remediedCompliantCount > 0
      ? [
          {
            name: "ผ่านเกณฑ์หลังแก้แถว",
            value: remediedCompliantCount,
            color: "#3b82f6",
          },
        ]
      : []),
    {
      name: "ต้องแก้แถว (< 80%)",
      value: deficitCount,
      color: "#f43f5e",
    },
  ];

  const classroomSummary = Array.from(classroomAgg.entries()).map(
    ([classroom, stat]) => ({
      classroom,
      totalStudents: stat.totalStudents,
      averageRate:
        stat.totalStudents > 0
          ? Math.round((stat.sumRate / stat.totalStudents) * 10) / 10
          : 100,
      deficitCount: stat.deficitCount,
      compliantCount: stat.compliantCount,
      students: stat.students,
    })
  );

  // Sort resolved remedials by date descending (latest remedial date first)
  allResolvedRemedials.sort((a, b) => {
    return (
      b.remediedOnDateIso.localeCompare(a.remediedOnDateIso) ||
      b.targetDateIso.localeCompare(a.targetDateIso)
    );
  });

  const recentRemedials = allResolvedRemedials;

  return {
    summary: {
      totalStudents: students.length,
      latestDateIso,
      todayAttendanceRate,
      todayPresent: latestCounts.present,
      todayLate: latestCounts.late,
      todayAbsent: latestCounts.absent,
      todayLeave: latestCounts.leave,
      pendingRemedialCount,
      approvedRemedialCount: allResolvedRemedials.length,
      deficitStudentCount: deficitCount,
      compliantStudentCount: compliantStandardCount + remediedCompliantCount,
    },
    weeklyTrend,
    complianceRatio,
    classroomSummary,
    recentRemedials,
  };
}
