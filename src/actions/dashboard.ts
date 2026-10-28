"use server";

import { prisma } from "@/lib/prisma";
import { formatDateISO } from "@/lib/utils";
import { AttendanceStatus, RemedialStatus, StudentStatus } from "@prisma/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";

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
  weeklyTrend: {
    dateIso: string;
    dateLabel: string;
    present: number;
    late: number;
    absent: number;
    leave: number;
    attendanceRate: number;
  }[];
  complianceRatio: {
    name: string;
    value: number;
    color: string;
  }[];
  classroomSummary: {
    classroom: string;
    totalStudents: number;
    averageRate: number;
    deficitCount: number;
  }[];
  recentRemedials: {
    id: string;
    studentName: string;
    classroom: string;
    activityTitle: string;
    targetDateIso: string;
    hoursEarned: number;
    status: RemedialStatus;
    createdAtIso: string;
  }[];
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
    { present: number; late: number; absent: number; leave: number; total: number }
  >();

  for (const r of allRecords) {
    const dIso = formatDateISO(r.date);
    const current = dateMap.get(dIso) ?? {
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      total: 0,
    };

    current.total += 1;
    if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.EXEMPTION) {
      current.present += 1;
    } else if (r.status === AttendanceStatus.LATE) {
      current.late += 1;
    } else if (r.status === AttendanceStatus.ABSENT) {
      current.absent += 1;
    } else if (r.status === AttendanceStatus.LEAVE) {
      current.leave += 1;
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
  };

  const todayAttended = latestCounts.present + latestCounts.late;
  const todayAttendanceRate =
    latestCounts.total > 0
      ? Math.round((todayAttended / latestCounts.total) * 1000) / 10
      : 0;

  // Weekly trend (last 7 school days)
  const recentDates = sortedDates.slice(-7);
  const weeklyTrend = recentDates.map((dIso) => {
    const item = dateMap.get(dIso)!;
    const [y, m, d] = dIso.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const rate =
      item.total > 0
        ? Math.round(((item.present + item.late) / item.total) * 1000) / 10
        : 0;
    return {
      dateIso: dIso,
      dateLabel: format(dateObj, "d MMM", { locale: th }),
      present: item.present,
      late: item.late,
      absent: item.absent,
      leave: item.leave,
      attendanceRate: rate,
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
    { totalStudents: number; sumRate: number; deficitCount: number }
  >();

  for (const s of students) {
    const total = s.attendanceRecords.length;
    const baseAttended = s.attendanceRecords.filter(
      (r) =>
        r.status === AttendanceStatus.PRESENT ||
        r.status === AttendanceStatus.LATE ||
        r.status === AttendanceStatus.EXEMPTION
    ).length;

    const approvedForStudent = s.remedialRecords.filter(
      (rem) => rem.status === RemedialStatus.APPROVED
    ).length;
    const pendingForStudent = s.remedialRecords.filter(
      (rem) => rem.status === RemedialStatus.PENDING
    ).length;

    approvedRemedialCount += approvedForStudent;
    pendingRemedialCount += pendingForStudent;

    const rawRate = total > 0 ? (baseAttended / total) * 100 : 100;
    const effectiveAttended = Math.min(total, baseAttended + approvedForStudent);
    const effectiveRate = total > 0 ? (effectiveAttended / total) * 100 : 100;

    if (rawRate >= 80) {
      compliantStandardCount += 1;
    } else if (effectiveRate >= 80) {
      remediedCompliantCount += 1;
    } else {
      deficitCount += 1;
    }

    const cStat = classroomAgg.get(s.classroom) ?? {
      totalStudents: 0,
      sumRate: 0,
      deficitCount: 0,
    };
    cStat.totalStudents += 1;
    cStat.sumRate += effectiveRate;
    if (effectiveRate < 80) {
      cStat.deficitCount += 1;
    }
    classroomAgg.set(s.classroom, cStat);
  }

  const complianceRatio = [
    {
      name: "ผ่านเกณฑ์ปกติ (≥ 80%)",
      value: compliantStandardCount,
      color: "#10b981",
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
    })
  );

  const recentRemedials = recentRemedialRecords.map((rem) => ({
    id: rem.id,
    studentName: `${rem.student.title}${rem.student.firstName} ${rem.student.lastName}`,
    classroom: rem.student.classroom,
    activityTitle: rem.activityTitle,
    targetDateIso: formatDateISO(rem.targetDate),
    hoursEarned: rem.hoursEarned,
    status: rem.status,
    createdAtIso: rem.createdAt.toISOString(),
  }));

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
      approvedRemedialCount,
      deficitStudentCount: deficitCount,
      compliantStudentCount: compliantStandardCount + remediedCompliantCount,
    },
    weeklyTrend,
    complianceRatio,
    classroomSummary,
    recentRemedials,
  };
}
