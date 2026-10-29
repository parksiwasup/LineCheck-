"use server";

import { prisma } from "@/lib/prisma";
import { AttendanceStatus, RemedialStatus, StudentStatus } from "@prisma/client";

export interface StudentGradeItem {
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
  rawRate: number;
  approvedRemedials: number;
  effectivePresentDays: number;
  netRate: number;
  grade: "ผ" | "มผ";
  isPassed: boolean;
  daysNeededToPass: number;
}

export interface GradeEvaluationResult {
  passingRate: number;
  selectedClassroom: string;
  classrooms: string[];
  summary: {
    totalStudents: number;
    passedCount: number;
    passedPercentage: number;
    failedCount: number;
    failedPercentage: number;
  };
  students: StudentGradeItem[];
}

export async function getGradeEvaluationDataAction(
  classroomFilter: string = "ALL",
  passingRate: number = 80
): Promise<GradeEvaluationResult> {
  // 1. Fetch classrooms
  const classroomsRaw = await prisma.student.findMany({
    where: { status: StudentStatus.ACTIVE },
    select: { classroom: true },
    distinct: ["classroom"],
    orderBy: { classroom: "asc" },
  });
  const classrooms = classroomsRaw.map((c) => c.classroom);

  // 2. Total distinct school days
  const allSchoolDates = await prisma.attendanceRecord.findMany({
    select: { date: true },
    distinct: ["date"],
  });
  const totalDays = Math.max(1, allSchoolDates.length);

  // 3. Fetch students
  const whereClause: any = { status: StudentStatus.ACTIVE };
  if (classroomFilter !== "ALL") {
    whereClause.classroom = classroomFilter;
  }

  const studentsRaw = await prisma.student.findMany({
    where: whereClause,
    include: {
      attendanceRecords: {
        select: { status: true },
      },
      remedialRecords: {
        where: { status: RemedialStatus.APPROVED },
        select: { id: true, hoursEarned: true },
      },
    },
    orderBy: [{ classroom: "asc" }, { studentId: "asc" }],
  });

  const minRequiredDays = Math.ceil((passingRate / 100) * totalDays);

  const students: StudentGradeItem[] = studentsRaw.map((s) => {
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let leaveDays = 0;

    s.attendanceRecords.forEach((r) => {
      if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.EXEMPTION) {
        presentDays++;
      } else if (r.status === AttendanceStatus.LATE) {
        lateDays++;
      } else if (r.status === AttendanceStatus.ABSENT) {
        absentDays++;
      } else if (r.status === AttendanceStatus.LEAVE) {
        leaveDays++;
      }
    });

    const approvedRemedials = s.remedialRecords.length;
    const rawRate = Math.min(100, (presentDays / totalDays) * 100);
    const effectivePresentDays = Math.min(totalDays, presentDays + approvedRemedials);
    const netRate = Math.min(100, (effectivePresentDays / totalDays) * 100);

    const isPassed = netRate >= passingRate;
    const grade: "ผ" | "มผ" = isPassed ? "ผ" : "มผ";
    const daysNeededToPass = Math.max(0, minRequiredDays - effectivePresentDays);

    return {
      id: s.id,
      studentId: s.studentId,
      title: s.title,
      firstName: s.firstName,
      lastName: s.lastName,
      fullName: `${s.title}${s.firstName} ${s.lastName}`,
      classroom: s.classroom,
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      leaveDays,
      rawRate,
      approvedRemedials,
      effectivePresentDays,
      netRate,
      grade,
      isPassed,
      daysNeededToPass,
    };
  });

  const passedCount = students.filter((s) => s.isPassed).length;
  const failedCount = students.filter((s) => !s.isPassed).length;
  const totalStudents = students.length;
  const passedPercentage = totalStudents > 0 ? (passedCount / totalStudents) * 100 : 0;
  const failedPercentage = totalStudents > 0 ? (failedCount / totalStudents) * 100 : 0;

  return {
    passingRate,
    selectedClassroom: classroomFilter,
    classrooms,
    summary: {
      totalStudents,
      passedCount,
      passedPercentage,
      failedCount,
      failedPercentage,
    },
    students,
  };
}
