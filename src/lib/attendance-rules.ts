import { AttendanceStatus, RemedialStatus } from "@prisma/client";
import { formatDateISO } from "@/lib/utils";

export type SchoolDayKind = "REQUIRED" | "MAKEUP_HOLIDAY" | "WEEKEND";

export interface RawAttendanceInput {
  date: Date;
  status: AttendanceStatus;
  remark?: string | null;
}

export interface RawRemedialInput {
  id: string;
  targetDate: Date;
  activityTitle: string;
  description?: string | null;
  hoursEarned: number;
  proofUrl?: string | null;
  status: RemedialStatus;
  createdAt?: Date;
}

export interface ResolvedAbsenceItem {
  dateIso: string;
  mondayIso: string;
  dayOfWeek: number; // 1=Mon, 2=Tue, 5=Fri
  remark: string | null;
  isRemedied: boolean;
  remedyType: "MAKEUP_WED_THU" | "ACTIVITY" | "NONE";
  remediedOnDateIso?: string;
  remedyTitle?: string;
  isInCurrentWeek: boolean;
  isGraceMakeUpWindow: boolean; // ขาดในสัปดาห์นี้ หรือขาดวันศุกร์สัปดาห์ก่อนที่ยังอยู่ในรอบนัดแก้ พุธ-พฤหัสฯ นี้
  isOverdueCrossWeek: boolean; // พ้นเส้นตายรอบนัดแก้แล้ว (ดองข้ามสัปดาห์)
}

export interface MakeUpSessionUsage {
  makeupDateIso: string;
  targetAbsenceDateIso: string | null; // วันที่ขาดที่ถูกนำมาล้างหนี้ (1 ต่อ 1 แบบ FIFO)
}

export interface EvaluatedWeekSummary {
  mondayIso: string;
  requiredRecordedCount: number; // 0..3 (จ., อ., ศ.)
  attendedCount: number; // มาปกติ + แก้แล้ว (สูงสุด 3)
  rawAttendedCount: number; // มาปกติอย่างเดียว (จ., อ., ศ.)
  remediedCount: number; // แก้แล้วกี่วันในสัปดาห์นี้
  unremediedAbsentCount: number; // ยังค้างแก้กี่วันในสัปดาห์นี้
  hasOverdueAbsence: boolean; // มีวันขาดที่พ้นเส้นตายกลายเป็นค้างสะสมข้ามสัปดาห์
  hasGraceMakeupAbsence: boolean; // มีวันขาดที่อยู่ในรอบนัดแก้ พุธ-พฤหัสฯ
  makeupAttendedDates: string[]; // วันพุธ/พฤหัสฯ ในสัปดาห์นี้ที่มาเข้าคลินิกแก้แถว
  status: "PASSED" | "SCHEDULED_MAKEUP" | "OVERDUE" | "IN_PROGRESS" | "EMPTY";
}

export function getSchoolDayKind(d: Date): SchoolDayKind {
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return "WEEKEND";
  if (dow === 3 || dow === 4) return "MAKEUP_HOLIDAY"; // พุธ, พฤหัสบดี = วันหยุดปกติ / วันคลินิกนัดแก้แถว
  return "REQUIRED"; // จันทร์ (1), อังคาร (2), ศุกร์ (5) = วันบังคับเข้าแถว
}

export function getUtcMonday(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
}

export function addUtcDays(d: Date, days: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
}

export function parseIsoToUtc(dateIso: string): Date {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * คำนวณการจับคู่แก้แถวแบบ FIFO (ขาดก่อน แก้ก่อน 1 ต่อ 1):
 * - วันบังคับเข้าแถวคือ จันทร์ (1), อังคาร (2), ศุกร์ (5)
 * - วันพุธ (3), พฤหัสบดี (4) เป็นวันหยุดของเด็กที่มาครบ แต่ถ้าเด็กมีเช็คชื่อ PRESENT/LATE ในวันพุธ/พฤหัสฯ
 *   จะถือเป็นการ "เสียวันหยุดมาแก้แถว" และนำไปหักล้างวันขาดที่เก่าที่สุด (ทั้งในสัปดาห์เดียวกัน หรือค้างมาจากสัปดาห์ก่อนหน้า) แบบ 1 ต่อ 1
 * - หรือถ้ามีการบันทึกกิจกรรมจิตอาสา (RemedialRecord) สำหรับวันที่ขาดนั้น ก็ถือว่าแก้แล้วเช่นกัน
 */
export function evaluateStudentAttendanceRules(
  attendanceRecords: RawAttendanceInput[],
  remedialRecords: RawRemedialInput[],
  referenceDate: Date = new Date()
) {
  const refUtc = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate()
    )
  );
  const currentMonday = getUtcMonday(refUtc);
  const currentMondayIso = formatDateISO(currentMonday);

  // เรียงประวัติเช็คชื่อจากเก่าไปใหม่เสมอเพื่อทำ FIFO
  const sortedAttendance = [...attendanceRecords].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // แผนที่กิจกรรมจิตอาสาที่บันทึกเจาะจงวันที่ขาด
  const activityRemedyByTargetIso = new Map<string, RawRemedialInput>();
  for (const rem of remedialRecords) {
    if (rem.status === RemedialStatus.REJECTED) continue;
    const tIso = formatDateISO(rem.targetDate);
    if (!activityRemedyByTargetIso.has(tIso)) {
      activityRemedyByTargetIso.set(tIso, rem);
    }
  }

  // 1. รวบรวมวันขาดบนวันบังคับ (จ., อ., ศ.) และวันที่มาเข้าคลินิกแก้แถวในวันหยุด (พ., พฤ.)
  const absences: ResolvedAbsenceItem[] = [];
  const makeupDates: string[] = [];

  // รวบรวมวันที่นักเรียนมีบันทึกเช็คชื่อมาเข้าคลินิกแก้แถว (พ./พฤ.) ไว้ก่อน
  for (const rec of sortedAttendance) {
    if (getSchoolDayKind(rec.date) === "MAKEUP_HOLIDAY") {
      if (
        rec.status === AttendanceStatus.PRESENT ||
        rec.status === AttendanceStatus.LATE
      ) {
        makeupDates.push(formatDateISO(rec.date));
      }
    }
  }

  for (const rec of sortedAttendance) {
    const kind = getSchoolDayKind(rec.date);
    const dateIso = formatDateISO(rec.date);
    const dow = rec.date.getUTCDay();

    if (kind === "REQUIRED") {
      const isAttended =
        rec.status === AttendanceStatus.PRESENT ||
        rec.status === AttendanceStatus.LATE;
      if (!isAttended) {
        const mondayIso = formatDateISO(getUtcMonday(rec.date));
        const actRem = activityRemedyByTargetIso.get(dateIso);
        // ตรวจสอบว่ากิจกรรมนี้เป็นบันทึกการมาเข้าคลินิกแก้แถว (พ./พฤ.) เจาะจงวันหรือไม่
        const clinicMatch = actRem?.activityTitle.match(/\((\d{4}-\d{2}-\d{2})\)/);
        const clinicDateIso = clinicMatch ? clinicMatch[1] : undefined;

        // หากเป็นคลินิก ต้องยืนยันว่ามีบันทึกการมาคลินิกในวันนั้นจริงๆ ใน makeupDates
        const isClinicConfirmed = clinicDateIso ? makeupDates.includes(clinicDateIso) : false;
        const isRemedied = clinicDateIso ? isClinicConfirmed : Boolean(actRem);

        absences.push({
          dateIso,
          mondayIso,
          dayOfWeek: dow,
          remark: rec.remark ?? null,
          isRemedied,
          remedyType: isClinicConfirmed ? "MAKEUP_WED_THU" : actRem && !clinicDateIso ? "ACTIVITY" : "NONE",
          remediedOnDateIso: isClinicConfirmed
            ? clinicDateIso
            : actRem && !clinicDateIso
            ? actRem.createdAt
              ? formatDateISO(actRem.createdAt)
              : dateIso
            : undefined,
          remedyTitle: isRemedied ? actRem?.activityTitle : undefined,
          isInCurrentWeek: mondayIso === currentMondayIso,
          isGraceMakeUpWindow: false,
          isOverdueCrossWeek: false,
        });
      }
    }
  }

  // 2. จับคู่วันที่มาแก้แถวในวันหยุด (พ., พฤ.) เข้ากับวันขาดที่เก่าที่สุดที่ยังไม่ได้แก้ (FIFO: 1 วันหยุด = ล้าง 1 วันขาด โดยวันที่มาแก้ต้องหลังวันที่ขาด)
  const makeupUsageMap = new Map<string, MakeUpSessionUsage>();

  // 2.1 บันทึกการจับคู่ที่ระบุเจาะจงล่วงหน้าจากคลินิกแก้แถว (พ./พฤ.)
  for (const abs of absences) {
    if (abs.isRemedied && abs.remedyType === "MAKEUP_WED_THU" && abs.remediedOnDateIso) {
      makeupUsageMap.set(abs.remediedOnDateIso, {
        makeupDateIso: abs.remediedOnDateIso,
        targetAbsenceDateIso: abs.dateIso,
      });
    }
  }

  // 2.2 จับคู่ FIFO สำหรับวันที่มาแก้แถวที่ยังไม่ได้จับคู่แบบเจาะจง
  for (const mDateIso of makeupDates) {
    if (makeupUsageMap.has(mDateIso)) continue;
    const targetAbsence = absences.find(
      (abs) => !abs.isRemedied && abs.dateIso < mDateIso
    );
    if (targetAbsence) {
      targetAbsence.isRemedied = true;
      targetAbsence.remedyType = "MAKEUP_WED_THU";
      targetAbsence.remediedOnDateIso = mDateIso;
      targetAbsence.remedyTitle = `มาแก้แถวในวันหยุด (${mDateIso})`;
      makeupUsageMap.set(mDateIso, {
        makeupDateIso: mDateIso,
        targetAbsenceDateIso: targetAbsence.dateIso,
      });
    } else {
      makeupUsageMap.set(mDateIso, {
        makeupDateIso: mDateIso,
        targetAbsenceDateIso: null,
      });
    }
  }

  // 3. คำนวณเส้นตาย 2 ระดับ (Weekly Cutoff = อาทิตย์ 23:59 น. + โควตาแก้พุธ-พฤหัสฯ ถัดไปสำหรับคนขาดวันศุกร์)
  const refIso = formatDateISO(refUtc);
  for (const abs of absences) {
    if (abs.isRemedied) continue;

    const absMonday = parseIsoToUtc(abs.mondayIso);
    const absSunday = addUtcDays(absMonday, 6); // อาทิตย์ 23:59 ของสัปดาห์ที่ขาด
    const nextWeekThursday = addUtcDays(absMonday, 10); // วันพฤหัสบดีของสัปดาห์ถัดไป

    if (abs.mondayIso === currentMondayIso) {
      // ขาดในสัปดาห์ปัจจุบัน -> ต้องแก้ภายในอาทิตย์นี้ (หรือนัดแก้พุธ-พฤหัสฯ)
      abs.isGraceMakeUpWindow = true;
      abs.isOverdueCrossWeek = false;
    } else if (
      abs.dayOfWeek === 5 &&
      refIso <= formatDateISO(nextWeekThursday)
    ) {
      // ขาด "วันศุกร์" ของสัปดาห์ก่อนหน้า -> ยังอยู่ในโควตานัดมาแก้ในวันหยุด พุธ-พฤหัสฯ ของสัปดาห์ถัดไป!
      abs.isGraceMakeUpWindow = true;
      abs.isOverdueCrossWeek = false;
    } else if (refIso <= formatDateISO(absSunday)) {
      abs.isGraceMakeUpWindow = true;
      abs.isOverdueCrossWeek = false;
    } else {
      // พ้นเส้นตายวันอาทิตย์ (และพ้นรอบพุธ-พฤหัสฯ นัดแก้แล้ว) -> ล็อกเป็นค้างแก้แถวสะสมข้ามสัปดาห์!
      abs.isGraceMakeUpWindow = false;
      abs.isOverdueCrossWeek = true;
    }
  }

  // 4. สรุปผลรายสัปดาห์ (แยกตามวันจันทร์ของแต่ละสัปดาห์)
  const absenceByDateMap = new Map<string, ResolvedAbsenceItem>();
  for (const abs of absences) {
    absenceByDateMap.set(abs.dateIso, abs);
  }

  const weekSummaries = new Map<string, EvaluatedWeekSummary>();
  const ensureWeek = (mondayIso: string): EvaluatedWeekSummary => {
    let wk = weekSummaries.get(mondayIso);
    if (!wk) {
      wk = {
        mondayIso,
        requiredRecordedCount: 0,
        attendedCount: 0,
        rawAttendedCount: 0,
        remediedCount: 0,
        unremediedAbsentCount: 0,
        hasOverdueAbsence: false,
        hasGraceMakeupAbsence: false,
        makeupAttendedDates: [],
        status: "EMPTY",
      };
      weekSummaries.set(mondayIso, wk);
    }
    return wk;
  };

  for (const rec of sortedAttendance) {
    const kind = getSchoolDayKind(rec.date);
    const dateIso = formatDateISO(rec.date);
    const mondayIso = formatDateISO(getUtcMonday(rec.date));
    const wk = ensureWeek(mondayIso);

    if (kind === "REQUIRED") {
      wk.requiredRecordedCount++;
      const isAttended =
        rec.status === AttendanceStatus.PRESENT ||
        rec.status === AttendanceStatus.LATE;
      if (isAttended) {
        wk.rawAttendedCount = Math.min(3, wk.rawAttendedCount + 1);
        wk.attendedCount = Math.min(3, wk.attendedCount + 1);
      } else {
        const absInfo = absenceByDateMap.get(dateIso);
        if (absInfo?.isRemedied) {
          wk.remediedCount++;
          wk.attendedCount = Math.min(3, wk.attendedCount + 1);
        } else {
          wk.unremediedAbsentCount++;
          if (absInfo?.isOverdueCrossWeek) wk.hasOverdueAbsence = true;
          else wk.hasGraceMakeupAbsence = true;
        }
      }
    } else if (kind === "MAKEUP_HOLIDAY") {
      if (
        rec.status === AttendanceStatus.PRESENT ||
        rec.status === AttendanceStatus.LATE
      ) {
        wk.makeupAttendedDates.push(dateIso);
      }
    }
  }

  for (const wk of weekSummaries.values()) {
    if (wk.requiredRecordedCount === 0 && wk.makeupAttendedDates.length === 0) {
      wk.status = "EMPTY";
    } else if (wk.unremediedAbsentCount > 0) {
      wk.status = wk.hasOverdueAbsence ? "OVERDUE" : "SCHEDULED_MAKEUP";
    } else if (wk.attendedCount >= 3) {
      wk.status = "PASSED";
    } else if (wk.mondayIso >= currentMondayIso) {
      wk.status = "IN_PROGRESS";
    } else {
      // สัปดาห์ในอดีตที่มีวันหยุดราชการทำให้เช็คไม่ถึง 3 วัน แต่ไม่มีวันขาดค้างเลย
      wk.status = "PASSED";
    }
  }

  // ยอดสะสมทั้งเทอม (เป้า 45 ครั้ง):
  // นับจากวันบังคับที่มาปกติ + วันที่แก้แถวสำเร็จแล้วทั้งหมด
  let totalRawAttendedDays = 0;
  let totalRemediedDays = 0;
  for (const wk of weekSummaries.values()) {
    totalRawAttendedDays += wk.rawAttendedCount;
    totalRemediedDays += wk.remediedCount;
  }

  const unremediedAbsences = absences.filter((a) => !a.isRemedied);
  const overdueAbsences = unremediedAbsences.filter((a) => a.isOverdueCrossWeek);
  const graceMakeupAbsences = unremediedAbsences.filter(
    (a) => a.isGraceMakeUpWindow
  );

  return {
    absences,
    absenceByDateMap,
    makeupUsageMap,
    weekSummaries,
    totalRawAttendedDays,
    totalRemediedDays,
    effectivePresentDays: totalRawAttendedDays + totalRemediedDays,
    unremediedAbsences,
    overdueAbsences,
    graceMakeupAbsences,
  };
}
