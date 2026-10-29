"use server";

import { prisma } from "@/lib/prisma";
import { formatDateISO } from "@/lib/utils";
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

  // Find student by studentId
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

  // Calculate distinct school days across the system
  const allSchoolDates = await prisma.attendanceRecord.findMany({
    select: { date: true },
    distinct: ["date"],
  });
  const totalDays = Math.max(1, allSchoolDates.length);

  // Group student's records
  let presentDays = 0;
  let lateDays = 0;
  let absentDays = 0;
  let leaveDays = 0;

  student.attendanceRecords.forEach((r) => {
    if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.EXEMPTION) {
      presentDays++;
    } else if (r.status === AttendanceStatus.LATE) {
      lateDays++;
      // standard school: 2 or 3 lates could count, but here let's keep direct status
    } else if (r.status === AttendanceStatus.ABSENT) {
      absentDays++;
    } else if (r.status === AttendanceStatus.LEAVE) {
      leaveDays++;
    }
  });

  // Calculate remedials
  const approvedRemedials = student.remedialRecords.filter(
    (r) => r.status === RemedialStatus.APPROVED
  );
  const pendingRemedials = student.remedialRecords.filter(
    (r) => r.status === RemedialStatus.PENDING
  );

  const approvedRemedialCount = approvedRemedials.length;
  const approvedRemedialHours = approvedRemedials.reduce(
    (acc, r) => acc + r.hoursEarned,
    0
  );
  const pendingRemedialCount = pendingRemedials.length;

  const rawAttendancePercent = Math.min(100, (presentDays / totalDays) * 100);
  const effectivePresentDays = Math.min(
    totalDays,
    presentDays + approvedRemedialCount
  );
  const netAttendancePercent = Math.min(
    100,
    (effectivePresentDays / totalDays) * 100
  );

  const isCompliant = netAttendancePercent >= 80 ? 1 : 0;
  const gradeResult: "ผ" | "มผ" = isCompliant ? "ผ" : "มผ";

  // Days needed to reach 80%: ceil(0.8 * totalDays) - effectivePresentDays
  const minRequiredDays = Math.ceil(0.8 * totalDays);
  const daysNeededToPass = Math.max(0, minRequiredDays - effectivePresentDays);
  const hoursNeededToPass = daysNeededToPass * 1; // 1 hour volunteer per missed day standard

  // Map absence dates
  const absentRecords = student.attendanceRecords.filter(
    (r) => r.status === AttendanceStatus.ABSENT
  );

  const remedialByTargetDate = new Map<string, typeof student.remedialRecords[0]>();
  student.remedialRecords.forEach((r) => {
    const dIso = formatDateISO(r.targetDate);
    remedialByTargetDate.set(dIso, r);
  });

  const absenceList = absentRecords.map((r) => {
    const dIso = formatDateISO(r.date);
    const linkedRemedial = remedialByTargetDate.get(dIso);

    // Thai formatted date e.g. 15 ต.ค. 2569
    const dObj = new Date(r.date);
    const dateFormatted = dObj.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return {
      dateIso: dIso,
      dateFormatted,
      remark: r.remark,
      remedialStatus: (linkedRemedial ? linkedRemedial.status : "NONE") as RemedialStatus | "NONE",
      activityTitle: linkedRemedial?.activityTitle,
      hoursEarned: linkedRemedial?.hoursEarned,
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
