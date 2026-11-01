"use server";

import { revalidatePath } from "next/cache";
import {
  getAcademicCalendarConfig,
  saveAcademicCalendarConfig,
  AcademicTerm,
  AcademicCalendarConfig,
  WeeklyDaysConfig,
  SpecialDateItem,
} from "@/lib/academic-calendar";
import { getActiveOperator } from "@/lib/auth";

function revalidateAllAttendancePaths() {
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/portal");
}

export async function getAcademicCalendarAction(): Promise<{
  success: boolean;
  data: AcademicCalendarConfig;
}> {
  const config = getAcademicCalendarConfig();
  return { success: true, data: config };
}

export async function saveAcademicTermAction(termData: {
  id?: string;
  name: string;
  academicYear: string;
  startDateIso: string;
  endDateIso: string;
  isActive?: boolean;
  note?: string;
  weeklyDays?: WeeklyDaysConfig;
}): Promise<{ success: boolean; message: string; data?: AcademicCalendarConfig }> {
  try {
    await getActiveOperator("ADMIN");
    const config = getAcademicCalendarConfig();

    const isEdit = Boolean(termData.id);
    const termId = termData.id || `term-${Date.now()}`;

    const defaultWeekly: WeeklyDaysConfig = {
      0: "WEEKEND",
      1: "REQUIRED",
      2: "REQUIRED",
      3: "MAKEUP_HOLIDAY",
      4: "MAKEUP_HOLIDAY",
      5: "REQUIRED",
      6: "WEEKEND",
    };

    let targetTerm: AcademicTerm;

    if (isEdit) {
      const existing = config.terms.find((t) => t.id === termId);
      if (!existing) {
        return { success: false, message: "ไม่พบข้อมูลภาคเรียนที่ต้องการแก้ไข" };
      }
      targetTerm = {
        ...existing,
        name: termData.name.trim(),
        academicYear: termData.academicYear.trim(),
        startDateIso: termData.startDateIso,
        endDateIso: termData.endDateIso,
        note: termData.note?.trim(),
        weeklyDays: termData.weeklyDays || existing.weeklyDays || defaultWeekly,
      };
      if (termData.isActive !== undefined) {
        targetTerm.isActive = termData.isActive;
      }
      config.terms = config.terms.map((t) => (t.id === termId ? targetTerm : t));
    } else {
      targetTerm = {
        id: termId,
        name: termData.name.trim(),
        academicYear: termData.academicYear.trim(),
        startDateIso: termData.startDateIso,
        endDateIso: termData.endDateIso,
        isActive: Boolean(termData.isActive || config.terms.length === 0),
        weeklyDays: termData.weeklyDays || defaultWeekly,
        specialDates: [],
        note: termData.note?.trim(),
      };
      config.terms.push(targetTerm);
    }

    if (targetTerm.isActive) {
      config.activeTermId = targetTerm.id;
      config.terms.forEach((t) => {
        t.isActive = t.id === targetTerm.id;
      });
    }

    saveAcademicCalendarConfig(config);
    revalidateAllAttendancePaths();

    return {
      success: true,
      message: isEdit
        ? `บันทึกข้อมูลภาคเรียน "${targetTerm.name}" เรียบร้อยแล้ว`
        : `เพิ่มภาคเรียนใหม่ "${targetTerm.name}" สำเร็จ`,
      data: config,
    };
  } catch (error) {
    console.error("saveAcademicTermAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกภาคเรียน",
    };
  }
}

export async function setActiveTermAction(
  termId: string
): Promise<{ success: boolean; message: string; data?: AcademicCalendarConfig }> {
  try {
    await getActiveOperator("ADMIN");
    const config = getAcademicCalendarConfig();

    const term = config.terms.find((t) => t.id === termId);
    if (!term) {
      return { success: false, message: "ไม่พบข้อมูลภาคเรียนที่เลือก" };
    }

    config.activeTermId = term.id;
    config.terms.forEach((t) => {
      t.isActive = t.id === term.id;
    });

    saveAcademicCalendarConfig(config);
    revalidateAllAttendancePaths();

    return {
      success: true,
      message: `เปลี่ยนภาคเรียนปัจจุบันเป็น "${term.name}" เรียบร้อยแล้ว`,
      data: config,
    };
  } catch (error) {
    console.error("setActiveTermAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการเปลี่ยนภาคเรียน",
    };
  }
}

export async function deleteAcademicTermAction(
  termId: string
): Promise<{ success: boolean; message: string; data?: AcademicCalendarConfig }> {
  try {
    await getActiveOperator("ADMIN");
    const config = getAcademicCalendarConfig();

    if (config.terms.length <= 1) {
      return { success: false, message: "ไม่สามารถลบภาคเรียนได้ เนื่องจากต้องมีอย่างน้อย 1 ภาคเรียนในระบบ" };
    }

    const termToDelete = config.terms.find((t) => t.id === termId);
    if (!termToDelete) {
      return { success: false, message: "ไม่พบข้อมูลภาคเรียนที่ต้องการลบ" };
    }

    config.terms = config.terms.filter((t) => t.id !== termId);

    if (config.activeTermId === termId) {
      config.terms[0].isActive = true;
      config.activeTermId = config.terms[0].id;
    }

    saveAcademicCalendarConfig(config);
    revalidateAllAttendancePaths();

    return {
      success: true,
      message: `ลบภาคเรียน "${termToDelete.name}" เรียบร้อยแล้ว`,
      data: config,
    };
  } catch (error) {
    console.error("deleteAcademicTermAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบภาคเรียน",
    };
  }
}

export async function saveWeeklyScheduleAction(
  termId: string,
  weeklyDays: WeeklyDaysConfig
): Promise<{ success: boolean; message: string; data?: AcademicCalendarConfig }> {
  try {
    await getActiveOperator("ADMIN");
    const config = getAcademicCalendarConfig();

    const term = config.terms.find((t) => t.id === termId);
    if (!term) {
      return { success: false, message: "ไม่พบข้อมูลภาคเรียนที่เลือก" };
    }

    term.weeklyDays = weeklyDays;

    saveAcademicCalendarConfig(config);
    revalidateAllAttendancePaths();

    return {
      success: true,
      message: `บันทึกตารางวันมา-วันหยุดประจำสัปดาห์ของ "${term.name}" เรียบร้อยแล้ว`,
      data: config,
    };
  } catch (error) {
    console.error("saveWeeklyScheduleAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกตาราง",
    };
  }
}

export async function addSpecialDateAction(
  termId: string,
  item: Omit<SpecialDateItem, "id">
): Promise<{ success: boolean; message: string; data?: AcademicCalendarConfig }> {
  try {
    await getActiveOperator("ADMIN");
    const config = getAcademicCalendarConfig();

    const term = config.terms.find((t) => t.id === termId);
    if (!term) {
      return { success: false, message: "ไม่พบข้อมูลภาคเรียนที่เลือก" };
    }

    if (!term.specialDates) {
      term.specialDates = [];
    }

    // ลบวันที่ซ้ำเดิมถ้ามี
    term.specialDates = term.specialDates.filter((s) => s.dateIso !== item.dateIso);

    const newItem: SpecialDateItem = {
      id: `special-${Date.now()}`,
      dateIso: item.dateIso,
      title: item.title.trim(),
      kind: item.kind,
    };

    term.specialDates.push(newItem);
    term.specialDates.sort((a, b) => a.dateIso.localeCompare(b.dateIso));

    saveAcademicCalendarConfig(config);
    revalidateAllAttendancePaths();

    return {
      success: true,
      message: `เพิ่มวันพิเศษ "${newItem.title}" (${newItem.dateIso}) เรียบร้อยแล้ว`,
      data: config,
    };
  } catch (error) {
    console.error("addSpecialDateAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการเพิ่มวันพิเศษ",
    };
  }
}

export async function deleteSpecialDateAction(
  termId: string,
  specialDateId: string
): Promise<{ success: boolean; message: string; data?: AcademicCalendarConfig }> {
  try {
    await getActiveOperator("ADMIN");
    const config = getAcademicCalendarConfig();

    const term = config.terms.find((t) => t.id === termId);
    if (!term) {
      return { success: false, message: "ไม่พบข้อมูลภาคเรียนที่เลือก" };
    }

    term.specialDates = (term.specialDates || []).filter((s) => s.id !== specialDateId);

    saveAcademicCalendarConfig(config);
    revalidateAllAttendancePaths();

    return {
      success: true,
      message: "ลบวันพิเศษออกจากปฏิทินเรียบร้อยแล้ว",
      data: config,
    };
  } catch (error) {
    console.error("deleteSpecialDateAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบวันพิเศษ",
    };
  }
}
