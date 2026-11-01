import { formatDateISO } from "@/lib/utils";

export type SchoolDayKind = "REQUIRED" | "MAKEUP_HOLIDAY" | "WEEKEND";

export interface SpecialDateItem {
  id: string;
  dateIso: string; // "2026-10-13"
  title: string; // "วันนวมินทรมหาราช"
  kind: SchoolDayKind;
}

export type WeeklyDaysConfig = {
  0: SchoolDayKind; // อาทิตย์
  1: SchoolDayKind; // จันทร์
  2: SchoolDayKind; // อังคาร
  3: SchoolDayKind; // พุธ
  4: SchoolDayKind; // พฤหัสบดี
  5: SchoolDayKind; // ศุกร์
  6: SchoolDayKind; // เสาร์
};

export interface AcademicTerm {
  id: string;
  name: string; // "ภาคเรียนที่ 1/2569"
  academicYear: string; // "2569"
  startDateIso: string; // "2026-05-15"
  endDateIso: string; // "2026-10-31"
  isActive: boolean;
  weeklyDays: WeeklyDaysConfig;
  specialDates: SpecialDateItem[];
  note?: string;
}

export interface AcademicCalendarConfig {
  activeTermId: string;
  terms: AcademicTerm[];
}

export const DEFAULT_WEEKLY_DAYS: WeeklyDaysConfig = {
  0: "WEEKEND",
  1: "REQUIRED",
  2: "REQUIRED",
  3: "MAKEUP_HOLIDAY",
  4: "MAKEUP_HOLIDAY",
  5: "REQUIRED",
  6: "WEEKEND",
};

export const DEFAULT_CALENDAR_CONFIG: AcademicCalendarConfig = {
  activeTermId: "term-1-2569",
  terms: [
    {
      id: "term-1-2569",
      name: "ภาคเรียนที่ 1/2569",
      academicYear: "2569",
      startDateIso: "2026-05-15",
      endDateIso: "2026-10-31",
      isActive: true,
      weeklyDays: { ...DEFAULT_WEEKLY_DAYS },
      specialDates: [],
      note: "ตารางมาตรฐาน: มาแถว 3 วัน (จันทร์, อังคาร, ศุกร์) และวันหยุด/คลินิกแก้แถว 2 วัน (พุธ, พฤหัสบดี)",
    },
    {
      id: "term-2-2569",
      name: "ภาคเรียนที่ 2/2569",
      academicYear: "2569",
      startDateIso: "2026-11-01",
      endDateIso: "2027-03-31",
      isActive: false,
      weeklyDays: { ...DEFAULT_WEEKLY_DAYS },
      specialDates: [],
      note: "ภาคเรียนที่ 2/2569",
    },
  ],
};

const DAY_ABBRS: Record<number, string> = {
  0: "อา.",
  1: "จ.",
  2: "อ.",
  3: "พ.",
  4: "พฤ.",
  5: "ศ.",
  6: "ส.",
};

const DAY_FULL_NAMES: Record<number, string> = {
  0: "วันอาทิตย์",
  1: "วันจันทร์",
  2: "วันอังคาร",
  3: "วันพุธ",
  4: "วันพฤหัสบดี",
  5: "วันศุกร์",
  6: "วันเสาร์",
};

/**
 * สกัด dateIso ("YYYY-MM-DD") และ day-of-week (0=อาทิตย์ .. 6=เสาร์)
 * อย่างถูกต้องทั้งบน Client (Local Date) และ Server (UTC Date)
 */
export function extractDateInfo(d: Date | string): {
  dateIso: string;
  dow: 0 | 1 | 2 | 3 | 4 | 5 | 6;
} {
  if (typeof d === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split("-").map(Number);
      const utc = new Date(Date.UTC(y, m - 1, day));
      return { dateIso: d, dow: utc.getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6 };
    }
    d = new Date(d);
  }

  // หากเป็น UTC Date ที่สร้างผ่าน Date.UTC (เวลา 00:00:00.000Z)
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  ) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return {
      dateIso: `${y}-${m}-${day}`,
      dow: d.getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    };
  }

  // หากเป็น Local Date ใน Browser (เช่น จาก date-fns)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return {
    dateIso: `${y}-${m}-${day}`,
    dow: d.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
  };
}

/**
 * ค้นหาเทอมที่ครอบคลุมวันที่ระบุ (หรือ fallback ไปยัง activeTerm)
 */
export function getTermForDate(
  d: Date | string,
  config?: AcademicCalendarConfig | null
): AcademicTerm | undefined {
  const cfg = config ?? DEFAULT_CALENDAR_CONFIG;
  const { dateIso } = extractDateInfo(d);

  // 1. หาเทอมที่ครอบคลุมช่วงวันที่ตรงๆ ก่อน
  const directMatch = cfg.terms.find(
    (t) => dateIso >= t.startDateIso && dateIso <= t.endDateIso
  );
  if (directMatch) return directMatch;

  // 2. ถ้าไม่ตรงช่วงวันที่ ให้ใช้ activeTermId
  const activeMatch =
    cfg.terms.find((t) => t.id === cfg.activeTermId) ??
    cfg.terms.find((t) => t.isActive);
  if (activeMatch) return activeMatch;

  return cfg.terms[0];
}

/**
 * คำนวณประเภทของวัน (REQUIRED, MAKEUP_HOLIDAY, WEEKEND)
 * ทำงานได้ทั้งบน Client และ Server ปราศจาก dependency เฉพาะตัว
 */
export function getSchoolDayKindFromConfig(
  d: Date | string,
  config?: AcademicCalendarConfig | null
): SchoolDayKind {
  const cfg = config ?? DEFAULT_CALENDAR_CONFIG;
  const { dateIso, dow } = extractDateInfo(d);

  const term = getTermForDate(d, cfg);

  if (term) {
    // เช็ค specialDates ของเทอมนั้นๆ ก่อน
    const special = term.specialDates?.find((s) => s.dateIso === dateIso);
    if (special) {
      return special.kind;
    }

    // ดูการตั้งค่าตารางสัปดาห์ (weeklyDays) ของเทอมนั้น
    if (term.weeklyDays && term.weeklyDays[dow]) {
      return term.weeklyDays[dow];
    }
  }

  // Fallback พื้นฐาน
  if (dow === 0 || dow === 6) return "WEEKEND";
  if (dow === 3 || dow === 4) return "MAKEUP_HOLIDAY";
  return "REQUIRED";
}

/**
 * สร้างคำอธิบายสรุปสั้นๆ สำหรับ Footer Legend หรือ Header
 * เช่น: required="วันมา (จ.พฤ.ศ.)", makeup="หยุด/แก้ (อ.พ.)", weekend="เสาร์-อาทิตย์"
 */
export function getScheduleSummaryLabels(term?: AcademicTerm | null): {
  requiredText: string;
  makeupText: string;
  weekendText: string;
  makeupDaysShort: string;
} {
  const weekly = term?.weeklyDays ?? DEFAULT_WEEKLY_DAYS;

  const reqDays: string[] = [];
  const makeupDays: string[] = [];

  // เรียงวันทำงาน จันทร์ -> ศุกร์
  const workDaysOrder: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
  for (const dayIndex of workDaysOrder) {
    const kind = weekly[dayIndex];
    const abbr = DAY_ABBRS[dayIndex].replace(".", "");
    if (kind === "REQUIRED") {
      reqDays.push(abbr);
    } else if (kind === "MAKEUP_HOLIDAY") {
      makeupDays.push(abbr);
    }
  }

  const reqStr = reqDays.length > 0 ? reqDays.join(".") + "." : "ไม่มี";
  const makeupStr = makeupDays.length > 0 ? makeupDays.join(".") + "." : "ไม่มี";

  return {
    requiredText: `วันมา (${reqStr})`,
    makeupText: `หยุด/แก้ (${makeupStr})`,
    weekendText: "เสาร์-อาทิตย์",
    makeupDaysShort: makeupStr,
  };
}

/**
 * คืนค่า Array สำหรับ Weekday Header ของปฏิทิน 7 คอลัมน์ (จันทร์ -> อาทิตย์)
 * ให้ตรงตามตารางของเทอมนั้นๆ
 */
export function getWeekdayHeadersForDate(
  date: Date | string,
  config?: AcademicCalendarConfig | null
): Array<{ label: string; sub: string; kind: SchoolDayKind }> {
  const term = getTermForDate(date, config);
  const weekly = term?.weeklyDays ?? DEFAULT_WEEKLY_DAYS;

  // ปฏิทินแสดง จันทร์ (1) ถึง อาทิตย์ (0)
  const columns: Array<0 | 1 | 2 | 3 | 4 | 5 | 6> = [1, 2, 3, 4, 5, 6, 0];

  return columns.map((dow) => {
    const kind = weekly[dow] ?? (dow === 0 || dow === 6 ? "WEEKEND" : "REQUIRED");
    let sub = "มาแถว";
    if (kind === "MAKEUP_HOLIDAY") {
      sub = "หยุด/แก้";
    } else if (kind === "WEEKEND") {
      sub = "วันหยุด";
    }

    return {
      label: DAY_ABBRS[dow],
      sub,
      kind,
    };
  });
}

/**
 * คืนค่า Array Header สำหรับตารางปฏิทินของนักเรียนรายเดือน (StudentMonthlyCalendar)
 * ให้ตรงตามเทอมของเดือนนั้นๆ
 */
export function getStudentCalendarDayHeaders(
  targetDate: Date | string,
  config?: AcademicCalendarConfig | null
) {
  const term = getTermForDate(targetDate, config);
  const weekly = term?.weeklyDays ?? DEFAULT_WEEKLY_DAYS;

  const dayMeta = [
    { dow: 1 as const, short: "จ.", full: "จันทร์" },
    { dow: 2 as const, short: "อ.", full: "อังคาร" },
    { dow: 3 as const, short: "พ.", full: "พุธ" },
    { dow: 4 as const, short: "พฤ.", full: "พฤหัสบดี" },
    { dow: 5 as const, short: "ศ.", full: "ศุกร์" },
    { dow: 6 as const, short: "ส.", full: "เสาร์" },
    { dow: 0 as const, short: "อา.", full: "อาทิตย์" },
  ];

  return dayMeta.map((m) => {
    const kind = weekly[m.dow];
    let sub = "วันบังคับ";
    let holiday = false;
    let weekend = false;

    if (kind === "MAKEUP_HOLIDAY") {
      sub = "หยุด / คลินิกแก้แถว";
      holiday = true;
    } else if (kind === "WEEKEND" || m.dow === 0 || m.dow === 6) {
      sub = m.dow === 0 ? "เส้นตาย 23:59" : "วันหยุด";
      weekend = true;
    }

    return {
      short: m.short,
      full: m.full,
      sub,
      holiday,
      weekend,
    };
  });
}

