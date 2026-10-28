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
  remedialOverallStatus: "COMPLIANT" | "REMEDIED" | "IN_PROGRESS" | "CRITICAL_DEFICIT";
  absenceDates: AbsenceDateOption[];
  remedialRecords: RemedialLogItem[];
}

export async function getDeficitReportAction(options?: {
  includeAllStudents?: boolean;
}): Promise<{
  deficitStudents: StudentDeficitReportItem[];
  allRemedialLogs: RemedialLogItem[];
  stats: {
    totalBelowStandardRaw: number;
    stillDeficitCount: number;
    remediedSuccessCount: number;
    pendingApprovalCount: number;
  };
}> {
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

  for (const s of students) {
    const totalDays = s.attendanceRecords.length;
    const presentOnly = s.attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.EXEMPTION
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

    // Coming present or late counts as attending morning assembly, while ABSENT and excessive LEAVE reduce compliance
    const baseAttendedDays = presentOnly + lateDays;
    const rawAttendancePercent =
      totalDays > 0 ? Math.round((baseAttendedDays / totalDays) * 1000) / 10 : 100;

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

    const effectivePresentDays = Math.min(
      totalDays,
      baseAttendedDays + approvedRemedialCount
    );
    const effectiveAttendancePercent =
      totalDays > 0
        ? Math.round((effectivePresentDays / totalDays) * 1000) / 10
        : 100;

    const requiredDaysFor80 = Math.ceil(totalDays * 0.8);
    const remainingDeficitDays = Math.max(0, requiredDaysFor80 - effectivePresentDays);

    let remedialOverallStatus: StudentDeficitReportItem["remedialOverallStatus"] =
      "COMPLIANT";
    if (rawAttendancePercent < 80) {
      if (effectiveAttendancePercent >= 80) {
        remedialOverallStatus = "REMEDIED";
      } else if (pendingRemedialCount > 0 || approvedRemedialCount > 0) {
        remedialOverallStatus = "IN_PROGRESS";
      } else {
        remedialOverallStatus = "CRITICAL_DEFICIT";
      }
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
      options?.includeAllStudents ||
      rawAttendancePercent < 80 ||
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
    totalBelowStandardRaw: reportItems.filter((i) => i.rawAttendancePercent < 80).length,
    stillDeficitCount: reportItems.filter((i) => i.effectiveAttendancePercent < 80).length,
    remediedSuccessCount: reportItems.filter((i) => i.remedialOverallStatus === "REMEDIED")
      .length,
    pendingApprovalCount: allRemedialLogs.filter((l) => l.status === RemedialStatus.PENDING)
      .length,
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
  const operator = await getActiveOperator(autoApprove ? "ADMIN" : "TEACHER");

  try {
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
  const adminOperator = await getActiveOperator("ADMIN");

  try {
    const existing = await prisma.remedialRecord.findUnique({
      where: { id: remedialId },
    });

    if (!existing) {
      return {
        success: false,
        message: "ไม่พบรายการแก้แถวที่ระบุ",
      };
    }

    const updatedDescription = note?.trim()
      ? `${existing.description ?? ""}\n[ความเห็นผู้อนุมัติ: ${note.trim()}]`.trim()
      : existing.description;

    const updated = await prisma.remedialRecord.update({
      where: { id: remedialId },
      data: {
        status: status as RemedialStatus,
        approvedById: adminOperator?.id ?? null,
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

    const effectivePresentDays = Math.min(totalDays, baseAttendedDays + approvedCount);
    const updatedAttendancePercent =
      totalDays > 0
        ? Math.round((effectivePresentDays / totalDays) * 1000) / 10
        : 100;
    const requiredDaysFor80 = Math.ceil(totalDays * 0.8);
    const remainingDeficitDays = Math.max(0, requiredDaysFor80 - effectivePresentDays);

    revalidatePath("/attendance/remedial");
    revalidatePath("/dashboard");

    return {
      success: true,
      message:
        status === "APPROVED"
          ? `อนุมัติการแก้แถวสำเร็จ! เวลาเข้าแถวสุทธิปรับเป็น ${updatedAttendancePercent}%`
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
