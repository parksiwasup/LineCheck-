"use server";

import { prisma } from "@/lib/prisma";
import { formatDateISO } from "@/lib/utils";
import {
  evaluateStudentAttendanceRules,
  getSchoolDayKind,
  parseIsoToUtc,
} from "@/lib/attendance-rules";
import { AttendanceStatus, RemedialStatus, StudentStatus } from "@prisma/client";

export interface StudentPortalData {
  student: {
    id: string;
    studentId: string;
    title: string;
    firstName: string;
    lastName: string;
    fullName: string;
    classroom: string;
    status: StudentStatus;
  };
  metrics: {
    totalDays: number;
    presentDays: number;
    lateDays: number;
    absentDays: number;
    leaveDays: number;
    rawAttendancePercent: number;
    approvedRemedialCount: number;
    approvedRemedialHours: number;
    pendingRemedialCount: number;
    effectivePresentDays: number;
    netAttendancePercent: number;
    isCompliant: number; // 1 = passed, 0 = failed
    gradeResult: "ผ" | "มผ";
    hoursNeededToPass: number;
    daysNeededToPass: number;
  };
  absenceList: Array<{
    dateIso: string;
    dateFormatted: string;
    remark: string | null;
    remedialStatus: RemedialStatus | "NONE";
    activityTitle?: string;
    hoursEarned?: number;
    proofUrl?: string | null;
  }>;
  recentRemedials: Array<{
    id: string;
    activityTitle: string;
    description: string | null;
    targetDateIso: string;
    hoursEarned: number;
    status: RemedialStatus;
    proofUrl: string | null;
    createdAtIso: string;
    approvedByName: string | null;
  }>;
}

export async function getStudentPortalDataAction(
  searchQuery: string
): Promise<{ success: boolean; message?: string; data?: StudentPortalData }> {
  const query = searchQuery.trim();
  if (!query) {
    return { success: false, message: "กรุณาระบุเลขประจำตัวนักเรียน" };
  }

  const student = await prisma.student.findFirst({
    where: {
      OR: [
        { studentId: query },
        { id: query },
        { firstName: { contains: query } },
      ],
    },
    include: {
      attendanceRecords: {
        orderBy: { date: "desc" },
      },
      remedialRecords: {
        orderBy: { createdAt: "desc" },
        include: {
          approvedBy: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!student) {
    return {
      success: false,
      message: `ไม่พบข้อมูลนักเรียนสำหรับรหัส "${query}" กรุณาตรวจสอบเลขประจำตัวอีกครั้ง`,
    };
  }

  // Distinct required school days (Mon, Tue, Fri)
  const allSchoolDates = await prisma.attendanceRecord.findMany({
    select: { date: true },
    distinct: ["date"],
  });
  const requiredDatesCount = allSchoolDates.filter(
    (d) => getSchoolDayKind(d.date) === "REQUIRED"
  ).length;
  const totalDays = Math.max(1, requiredDatesCount);

  const evalRes = evaluateStudentAttendanceRules(
    student.attendanceRecords,
    student.remedialRecords,
    new Date()
  );

  const presentDays = evalRes.totalRawAttendedDays;
  const lateDays = student.attendanceRecords.filter(
    (r) =>
      getSchoolDayKind(r.date) === "REQUIRED" &&
      r.status === AttendanceStatus.LATE
  ).length;
  const absentDays = evalRes.absences.length;
  const leaveDays = student.attendanceRecords.filter(
    (r) =>
      getSchoolDayKind(r.date) === "MAKEUP_HOLIDAY" &&
      (r.status === AttendanceStatus.LEAVE ||
        r.status === AttendanceStatus.EXEMPTION)
  ).length;

  const approvedRemedials = student.remedialRecords.filter(
    (r) => r.status !== RemedialStatus.REJECTED
  );
  const approvedRemedialCount = evalRes.totalRemediedDays;
  const approvedRemedialHours =
    approvedRemedials.reduce((acc, r) => acc + r.hoursEarned, 0) +
    evalRes.absences.filter(
      (a) => a.isRemedied && a.remedyType === "MAKEUP_WED_THU"
    ).length;
  const pendingRemedialCount = 0;

  const rawAttendancePercent = Math.min(100, (presentDays / totalDays) * 100);
  const effectivePresentDays = Math.min(totalDays, evalRes.effectivePresentDays);
  const netAttendancePercent = Math.min(
    100,
    (effectivePresentDays / totalDays) * 100
  );

  const daysNeededToPass = evalRes.unremediedAbsences.length;
  const isCompliant = daysNeededToPass === 0 ? 1 : 0;
  const gradeResult: "ผ" | "มผ" = isCompliant ? "ผ" : "มผ";
  const hoursNeededToPass = daysNeededToPass * 1;

  const remedialByTargetDate = new Map<
    string,
    (typeof student.remedialRecords)[0]
  >();
  student.remedialRecords.forEach((r) => {
    const dIso = formatDateISO(r.targetDate);
    remedialByTargetDate.set(dIso, r);
  });

  const absenceList = [...evalRes.absences].reverse().map((abs) => {
    const linkedRemedial = remedialByTargetDate.get(abs.dateIso);
    const dObj = parseIsoToUtc(abs.dateIso);
    const dateFormatted = dObj.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return {
      dateIso: abs.dateIso,
      dateFormatted,
      remark: abs.remark,
      remedialStatus: (abs.isRemedied
        ? RemedialStatus.APPROVED
        : "NONE") as RemedialStatus | "NONE",
      activityTitle: abs.remedyTitle ?? linkedRemedial?.activityTitle,
      hoursEarned: linkedRemedial?.hoursEarned ?? (abs.isRemedied ? 1 : undefined),
      proofUrl: linkedRemedial?.proofUrl,
    };
  });

  const recentRemedials = student.remedialRecords.map((r) => ({
    id: r.id,
    activityTitle: r.activityTitle,
    description: r.description,
    targetDateIso: formatDateISO(r.targetDate),
    hoursEarned: r.hoursEarned,
    status: r.status,
    proofUrl: r.proofUrl,
    createdAtIso: r.createdAt.toISOString(),
    approvedByName: r.approvedBy?.name ?? null,
  }));

  for (const abs of evalRes.absences) {
    if (
      abs.isRemedied &&
      abs.remedyType === "MAKEUP_WED_THU" &&
      abs.remediedOnDateIso
    ) {
      recentRemedials.push({
        id: `makeup-${student.id}-${abs.dateIso}`,
        activityTitle: abs.remedyTitle ?? `มาแก้แถวในวันหยุด (${abs.remediedOnDateIso})`,
        description: "เสียสิทธิ์วันหยุดพุธ/พฤหัสบดี มาเข้าคลินิกแก้แถวชดเชยวันขาด (1 ต่อ 1)",
        targetDateIso: abs.dateIso,
        hoursEarned: 1,
        status: RemedialStatus.APPROVED,
        proofUrl: null,
        createdAtIso: `${abs.remediedOnDateIso}T08:00:00.000Z`,
        approvedByName: "ระบบจับคู่อัตโนมัติ (FIFO)",
      });
    }
  }

  recentRemedials.sort(
    (a, b) =>
      new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime()
  );

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
        status: student.status,
      },
      metrics: {
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        leaveDays,
        rawAttendancePercent,
        approvedRemedialCount,
        approvedRemedialHours,
        pendingRemedialCount,
        effectivePresentDays,
        netAttendancePercent,
        isCompliant,
        gradeResult,
        hoursNeededToPass,
        daysNeededToPass,
      },
      absenceList,
      recentRemedials,
    },
  };
}
