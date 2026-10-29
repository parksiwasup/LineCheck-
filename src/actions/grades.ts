"use server";

import { prisma } from "@/lib/prisma";
import {
  evaluateStudentAttendanceRules,
  getSchoolDayKind,
} from "@/lib/attendance-rules";
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

  // 2. Total distinct required school days (Mon, Tue, Fri)
  const allSchoolDates = await prisma.attendanceRecord.findMany({
    select: { date: true },
    distinct: ["date"],
  });
  const requiredDatesCount = allSchoolDates.filter(
    (d) => getSchoolDayKind(d.date) === "REQUIRED"
  ).length;
  const totalDays = Math.max(1, requiredDatesCount);

  // 3. Fetch students
  const whereClause: { status: StudentStatus; classroom?: string } = {
    status: StudentStatus.ACTIVE,
  };
  if (classroomFilter !== "ALL") {
    whereClause.classroom = classroomFilter;
  }

  const studentsRaw = await prisma.student.findMany({
    where: whereClause,
    include: {
      attendanceRecords: {
        orderBy: { date: "asc" },
      },
      remedialRecords: {
        where: { status: { not: RemedialStatus.REJECTED } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ classroom: "asc" }, { studentId: "asc" }],
  });

  const minRequiredDays = Math.ceil((passingRate / 100) * totalDays);
  const now = new Date();

  const students: StudentGradeItem[] = studentsRaw.map((s) => {
    const evalRes = evaluateStudentAttendanceRules(
      s.attendanceRecords,
      s.remedialRecords,
      now
    );

    const lateDays = s.attendanceRecords.filter(
      (r) =>
        getSchoolDayKind(r.date) === "REQUIRED" &&
        r.status === AttendanceStatus.LATE
    ).length;
    const leaveDays = s.attendanceRecords.filter(
      (r) =>
        getSchoolDayKind(r.date) === "MAKEUP_HOLIDAY" &&
        (r.status === AttendanceStatus.LEAVE ||
          r.status === AttendanceStatus.EXEMPTION)
    ).length;

    const presentDays = evalRes.totalRawAttendedDays;
    const absentDays = evalRes.absences.length;
    const approvedRemedials = evalRes.totalRemediedDays;
    const effectivePresentDays = Math.min(totalDays, evalRes.effectivePresentDays);

    const rawRate = Math.min(100, (presentDays / totalDays) * 100);
    const netRate = Math.min(100, (effectivePresentDays / totalDays) * 100);

    const unremediedAbsences = evalRes.unremediedAbsences.length;
    const isPassed = unremediedAbsences === 0 && netRate >= passingRate;
    const grade: "ผ" | "มผ" = isPassed ? "ผ" : "มผ";
    const daysNeededToPass = Math.max(
      unremediedAbsences,
      minRequiredDays - effectivePresentDays
    );

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
  const passedPercentage =
    totalStudents > 0 ? (passedCount / totalStudents) * 100 : 0;
  const failedPercentage =
    totalStudents > 0 ? (failedCount / totalStudents) * 100 : 0;

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
