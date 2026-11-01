import "server-only";
import fs from "fs";
import path from "path";
import { formatDateISO } from "@/lib/utils";
import {
  SchoolDayKind,
  SpecialDateItem,
  WeeklyDaysConfig,
  AcademicTerm,
  AcademicCalendarConfig,
  DEFAULT_CALENDAR_CONFIG,
  DEFAULT_WEEKLY_DAYS,
  getSchoolDayKindFromConfig as getSchoolDayKindPure,
} from "@/types/academic-calendar";

export * from "@/types/academic-calendar";

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE_PATH = path.join(DATA_DIR, "academic-calendar.json");

let memoryCache: AcademicCalendarConfig | null = null;

export function getAcademicCalendarConfig(): AcademicCalendarConfig {
  if (memoryCache) {
    return memoryCache;
  }

  try {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(
        CONFIG_FILE_PATH,
        JSON.stringify(DEFAULT_CALENDAR_CONFIG, null, 2),
        "utf-8"
      );
      memoryCache = DEFAULT_CALENDAR_CONFIG;
      return DEFAULT_CALENDAR_CONFIG;
    }

    const raw = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as AcademicCalendarConfig;
    if (parsed && Array.isArray(parsed.terms) && parsed.terms.length > 0) {
      memoryCache = parsed;
      return parsed;
    }
  } catch (error) {
    console.error("Failed to read academic-calendar.json, using default:", error);
  }

  memoryCache = DEFAULT_CALENDAR_CONFIG;
  return DEFAULT_CALENDAR_CONFIG;
}

export function saveAcademicCalendarConfig(config: AcademicCalendarConfig): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      CONFIG_FILE_PATH,
      JSON.stringify(config, null, 2),
      "utf-8"
    );
    memoryCache = config;
  } catch (error) {
    console.error("Failed to write academic-calendar.json:", error);
    throw error;
  }
}

/**
 * คำนวณประเภทของวัน (REQUIRED, MAKEUP_HOLIDAY, WEEKEND)
 * โดยอิงตามเทอมและการตั้งค่าวันมา/วันหยุดจาก JSON
 */
export function getSchoolDayKindFromConfig(
  d: Date | string,
  config?: AcademicCalendarConfig
): SchoolDayKind {
  const cfg = config ?? getAcademicCalendarConfig();
  return getSchoolDayKindPure(d, cfg);
}
