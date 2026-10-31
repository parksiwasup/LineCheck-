"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  Loader2,
  FilePlus2,
  Copy,
} from "lucide-react";
import {
  getStudentMonthlyCalendarAction,
  type StudentMonthlyCalendarData,
  type CalendarDayCell,
} from "@/actions/calendar";
import { RemedialClinicDialog } from "./remedial-clinic-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DAY_HEADERS = [
  { short: "จ.", full: "จันทร์", sub: "วันบังคับ", holiday: false, weekend: false },
  { short: "อ.", full: "อังคาร", sub: "วันบังคับ", holiday: false, weekend: false },
  { short: "พ.", full: "พุธ", sub: "หยุด / คลินิกแก้แถว", holiday: true, weekend: false },
  { short: "พฤ.", full: "พฤหัสบดี", sub: "หยุด / คลินิกแก้แถว", holiday: true, weekend: false },
  { short: "ศ.", full: "ศุกร์", sub: "วันบังคับ", holiday: false, weekend: false },
  { short: "ส.", full: "เสาร์", sub: "วันหยุด", holiday: false, weekend: true },
  { short: "อา.", full: "อาทิตย์", sub: "เส้นตาย 23:59", holiday: false, weekend: true },
];

interface StudentMonthlyCalendarProps {
  studentIdOrCode: string;
  initialData?: StudentMonthlyCalendarData | null;
  onSelectAbsentDate?: (studentId: string, dateIso: string) => void;
  showFullPageLink?: boolean;
  compact?: boolean;
  readOnly?: boolean;
}

export function StudentMonthlyCalendar({
  studentIdOrCode,
  initialData = null,
  onSelectAbsentDate,
  showFullPageLink = false,
  compact = false,
  readOnly = false,
}: StudentMonthlyCalendarProps) {
  const now = React.useMemo(() => new Date(), []);
  const [year, setYear] = React.useState<number>(
    initialData?.year ?? now.getFullYear()
  );
  const [month, setMonth] = React.useState<number>(
    initialData?.month ?? now.getMonth() + 1
  );
  const [calendarData, setCalendarData] =
    React.useState<StudentMonthlyCalendarData | null>(initialData);
  const [isLoading, setIsLoading] = React.useState<boolean>(!initialData);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [internalTargetDate, setInternalTargetDate] = React.useState<string | null>(null);
  const [isInternalModalOpen, setIsInternalModalOpen] = React.useState(false);

  const handleOpenRemedial = React.useCallback(
    (sid: string, dateIso: string) => {
      if (onSelectAbsentDate) {
        onSelectAbsentDate(sid, dateIso);
      } else {
        setInternalTargetDate(dateIso);
        setIsInternalModalOpen(true);
      }
    },
    [onSelectAbsentDate]
  );

  const loadCalendar = React.useCallback(
    async (targetStudent: string, targetYear: number, targetMonth: number) => {
      if (!targetStudent) return;
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await getStudentMonthlyCalendarAction(
          targetStudent,
          targetYear,
          targetMonth
        );
        if (res.success && res.data) {
          setCalendarData(res.data);
        } else {
          setErrorMsg(res.message ?? "ไม่สามารถโหลดปฏิทินของนักเรียนได้");
        }
      } catch {
        setErrorMsg("เกิดข้อผิดพลาดในการดึงข้อมูลปฏิทิน");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    if (
      initialData &&
      (initialData.student.id === studentIdOrCode ||
        initialData.student.studentId === studentIdOrCode) &&
      initialData.year === year &&
      initialData.month === month
    ) {
      setCalendarData(initialData);
      setIsLoading(false);
      return;
    }
    loadCalendar(studentIdOrCode, year, month);
  }, [studentIdOrCode, year, month, initialData, loadCalendar]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleResetCurrentMonth = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  const renderDayBadge = (day: CalendarDayCell, mobile: boolean = false) => {
    switch (day.visualStatus) {
      case "PRESENT":
        return (
          <span className="inline-flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs shrink-0 whitespace-nowrap">
            {mobile ? "มา" : "มาเข้าแถว"}
          </span>
        );
      case "LATE":
        return (
          <span className="inline-flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs shrink-0 whitespace-nowrap">
            {mobile ? "สาย" : "มา (สาย)"}
          </span>
        );
      case "REST":
        return (
          <span className="inline-flex items-center justify-center gap-1 rounded-md bg-sky-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs shrink-0 whitespace-nowrap">
            {mobile ? "พัก" : "หยุดพัก"}
          </span>
        );
      case "MAKEUP_ATTENDED":
        return (
          <span className="inline-flex items-center justify-center gap-1 rounded-md bg-fuchsia-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs shrink-0 whitespace-nowrap">
            {mobile ? "มาแก้" : "มาแก้แถว"}
          </span>
        );
      case "REMEDIED":
        return (
          <span className="inline-flex items-center justify-center gap-1 rounded-md bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs shrink-0 whitespace-nowrap">
            แก้แล้ว
          </span>
        );
      case "ABSENT_MAKEUP_WINDOW":
        return (
          <span className="inline-flex items-center justify-center gap-1 rounded-md bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs shrink-0 whitespace-nowrap">
            {mobile ? "รอแก้" : "ขาด (รอแก้)"}
          </span>
        );
      case "ABSENT":
        return (
          <span className="inline-flex items-center justify-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs shrink-0 whitespace-nowrap">
            {mobile ? "ขาด" : "ค้างแก้ข้ามรอบ!"}
          </span>
        );
      case "WEEKEND":
        return (
          <span className="text-[10px] font-medium text-muted-foreground/60 shrink-0 whitespace-nowrap">
            วันหยุด
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium text-muted-foreground/60 shrink-0 whitespace-nowrap">
            {day.isFuture
              ? "-"
              : day.dayOfWeek === 3 || day.dayOfWeek === 4
              ? mobile ? "พัก" : "หยุดพัก"
              : mobile ? "-" : "ยังไม่เช็ค"}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Student Info & Month Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/70 bg-card/80 p-3.5 sm:p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            {calendarData ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                    <span className="font-mono text-xs font-bold text-primary">
                      {calendarData.student.studentId}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(calendarData.student.studentId);
                        toast.success(`คัดลอกรหัส ${calendarData.student.studentId} เรียบร้อยแล้ว`);
                      }}
                      className="flex items-center justify-center h-5 w-5 rounded-full border border-blue-400/80 bg-blue-50/80 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all cursor-pointer shadow-2xs shrink-0"
                      title="คัดลอกรหัสนักเรียน"
                    >
                      <Copy className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {calendarData.student.fullName}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    ห้อง {calendarData.student.classroom}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  กติกา: เข้าแถว <strong>จ. • อ. • ศ.</strong> (3 วัน) • หยุดพัก <strong>พ. • พฤ.</strong> (หากขาดวันบังคับ เปิดให้เสียวันหยุดมาเข้าคลินิกแก้แถววันพุธ/พฤหัสฯ ได้แบบ 1 ต่อ 1)
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">
                กำลังโหลดข้อมูลนักเรียน...
              </p>
            )}
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            disabled={isLoading}
            className="h-8 w-8 p-0 rounded-xl"
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-[140px] text-center px-3 py-1 rounded-xl bg-muted/60 border border-border/60 text-xs sm:text-sm font-bold">
            {calendarData
              ? `${calendarData.monthNameThai} ${calendarData.buddhistYear}`
              : `${month}/${year + 543}`}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            disabled={isLoading}
            className="h-8 w-8 p-0 rounded-xl"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetCurrentMonth}
            disabled={isLoading}
            className="h-8 text-xs rounded-xl"
          >
            เดือนนี้
          </Button>

          {showFullPageLink && calendarData && (
            <Link
              href={`/attendance/calendar?student=${calendarData.student.studentId}&year=${year}&month=${month}`}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 rounded-xl"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>เปิดหน้าเต็ม</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Monthly KPI Summary Cards */}
      {calendarData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                มาเข้าแถวปกติ (จ./อ./ศ.)
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="mt-1 text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {calendarData.summary.presentDays}{" "}
              <span className="text-xs font-normal">วัน</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              ผ่านเกณฑ์ {calendarData.summary.passedWeeks} สัปดาห์
            </p>
          </div>

          <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.06] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-sky-700 dark:text-sky-400">
                หยุดพักตามสิทธิ์ (พ./พฤ.)
              </span>
              <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
            <p className="mt-1 text-lg sm:text-xl font-bold text-sky-700 dark:text-sky-300">
              {calendarData.summary.restDays}{" "}
              <span className="text-xs font-normal">วัน</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              วันหยุดสำหรับคนไม่ติดขาด
            </p>
          </div>

          <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.06] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-violet-700 dark:text-violet-400">
                แก้แถวสำเร็จแล้ว
              </span>
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="mt-1 text-lg sm:text-xl font-bold text-violet-700 dark:text-violet-300">
              {calendarData.summary.remediedDays}{" "}
              <span className="text-xs font-normal">วัน</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              เข้าคลินิกแก้แถว พุธ - พฤหัสบดี
            </p>
          </div>

          <div
            className={cn(
              "rounded-xl border p-3",
              calendarData.summary.overdueDays > 0
                ? "border-rose-500/40 bg-rose-500/[0.08]"
                : calendarData.summary.scheduledMakeupDays > 0
                ? "border-amber-500/40 bg-amber-500/[0.08]"
                : "border-border/60 bg-muted/30"
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-xs font-medium",
                  calendarData.summary.overdueDays > 0
                    ? "text-rose-700 dark:text-rose-400"
                    : calendarData.summary.scheduledMakeupDays > 0
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-muted-foreground"
                )}
              >
                {calendarData.summary.overdueDays > 0
                  ? "ค้างแก้สะสมข้ามสัปดาห์!"
                  : calendarData.summary.scheduledMakeupDays > 0
                  ? "รอนัดแก้ พุธ-พฤหัสฯ นี้"
                  : "ยอดค้างแก้แถว"}
              </span>
              <XCircle
                className={cn(
                  "h-4 w-4",
                  calendarData.summary.overdueDays > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : calendarData.summary.scheduledMakeupDays > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                )}
              />
            </div>
            <p
              className={cn(
                "mt-1 text-lg sm:text-xl font-bold",
                calendarData.summary.overdueDays > 0
                  ? "text-rose-700 dark:text-rose-300"
                  : calendarData.summary.scheduledMakeupDays > 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-foreground"
              )}
            >
              {calendarData.summary.absentDays}{" "}
              <span className="text-xs font-normal">วัน</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {calendarData.summary.overdueDays > 0
                ? `ดองข้ามรอบ ${calendarData.summary.overdueDays} วัน • รอนัดแก้ ${calendarData.summary.scheduledMakeupDays} วัน`
                : calendarData.summary.scheduledMakeupDays > 0
                ? "นัดมาแก้ในคลินิกวันพุธ-พฤหัสฯ"
                : "ยอดเยี่ยม! ไม่มีวันขาดค้าง"}
            </p>
          </div>
        </div>
      )}

      {/* Color Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs px-1">
        <span className="font-semibold text-muted-foreground">สัญลักษณ์สี:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span>มาเข้าแถว (จ./อ./ศ.)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
          <span>วันหยุดพัก (พ./พฤ.)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-600" />
          <span>มาแก้แถวในวันหยุด (พ./พฤ.)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
          <span>วันขาดที่แก้ผ่านแล้ว</span>
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span>รอนัดแก้ พุธ-พฤหัสฯ นี้</span>
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
          <span>ค้างสะสมข้ามสัปดาห์ (พ้นเส้นตาย!)</span>
        </span>
      </div>

      {/* Calendar Body */}
      <Card className="overflow-hidden border-border/70">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm">กำลังโหลดปฏิทินรายเดือน...</p>
            </div>
          ) : errorMsg || !calendarData ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
              <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
              <p className="text-sm font-medium">{errorMsg ?? "ไม่พบข้อมูล"}</p>
            </div>
          ) : (
            <>
              {/* Desktop / Tablet Full Calendar Grid */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse table-fixed">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/50 text-xs font-bold text-muted-foreground">
                      {DAY_HEADERS.map((dh) => (
                        <th
                          key={dh.short}
                          className={cn(
                            "py-2 px-2 text-center border-r border-border/50",
                            dh.weekend
                              ? "w-[9%] bg-muted/70 text-muted-foreground/70"
                              : dh.holiday
                              ? "w-[12.5%] bg-violet-500/[0.05] text-violet-700 dark:text-violet-300"
                              : "w-[12.5%]"
                          )}
                        >
                          <div>{dh.full}</div>
                          <div className="text-[10px] font-normal opacity-80">
                            {dh.sub}
                          </div>
                        </th>
                      ))}
                      <th className="w-[19.5%] py-2.5 px-3 text-left bg-primary/[0.04] text-primary">
                        สรุปผลรายสัปดาห์
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {calendarData.weeks.map((week) => (
                      <tr key={week.mondayIso} className="align-top">
                        {week.days.map((day) => {
                          const isUnremediedAbsent =
                            day.visualStatus === "ABSENT" ||
                            day.visualStatus === "ABSENT_MAKEUP_WINDOW";

                          const cellBg = !day.isCurrentMonth
                            ? "bg-muted/25 opacity-45"
                            : day.visualStatus === "PRESENT" ||
                              day.visualStatus === "LATE"
                            ? "bg-emerald-500/[0.06] hover:bg-emerald-500/[0.11]"
                            : day.visualStatus === "REST"
                            ? "bg-sky-500/[0.05] hover:bg-sky-500/[0.09]"
                            : day.visualStatus === "MAKEUP_ATTENDED"
                            ? "bg-fuchsia-500/[0.08] hover:bg-fuchsia-500/[0.14] ring-1 ring-inset ring-fuchsia-500/25"
                            : day.visualStatus === "REMEDIED"
                            ? "bg-violet-500/[0.07] hover:bg-violet-500/[0.12]"
                            : day.visualStatus === "ABSENT_MAKEUP_WINDOW"
                            ? "bg-amber-500/[0.10] hover:bg-amber-500/[0.15] ring-1 ring-inset ring-amber-500/35"
                            : day.visualStatus === "ABSENT"
                            ? "bg-rose-500/[0.10] hover:bg-rose-500/[0.15] ring-1 ring-inset ring-rose-500/35"
                            : day.isWeekend
                            ? "bg-muted/35"
                            : "bg-card hover:bg-muted/20";

                          return (
                            <td
                              key={day.dateIso}
                              className={cn(
                                "border-r border-border/50 p-2 transition-colors",
                                compact ? "min-h-[82px]" : "min-h-[98px]",
                                cellBg
                              )}
                            >
                              <div className="flex flex-col justify-between h-full min-h-[76px] gap-1.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={cn(
                                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                                      day.isToday
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : day.isWeekend
                                        ? "text-muted-foreground/70"
                                        : "text-foreground"
                                    )}
                                  >
                                    {day.dayNumber}
                                  </span>
                                  {day.isToday && (
                                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                      วันนี้
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-1">
                                  {renderDayBadge(day)}

                                  {day.statusNote &&
                                    day.statusNote !== "ค้างสะสมข้ามรอบ!" &&
                                    day.statusNote !== "ค้างแก้ข้ามรอบ!" && (
                                    <p
                                      className={cn(
                                        "text-[10px] leading-tight truncate font-semibold",
                                        day.visualStatus === "REMEDIED" ||
                                          day.visualStatus === "MAKEUP_ATTENDED"
                                          ? "text-violet-700 dark:text-violet-300"
                                          : day.visualStatus === "ABSENT_MAKEUP_WINDOW"
                                          ? "text-amber-700 dark:text-amber-300"
                                          : day.visualStatus === "ABSENT"
                                          ? "text-rose-700 dark:text-rose-300"
                                          : "text-muted-foreground"
                                      )}
                                      title={day.statusNote}
                                    >
                                      {day.statusNote}
                                    </p>
                                  )}

                                  {!day.statusNote && day.remark && (
                                    <p
                                      className="text-[10px] leading-tight text-muted-foreground truncate"
                                      title={day.remark}
                                    >
                                      {day.remark}
                                    </p>
                                  )}

                                  {!readOnly && isUnremediedAbsent && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenRemedial(
                                          calendarData.student.id,
                                          day.dateIso
                                        )
                                      }
                                      className="mt-0.5 inline-flex w-full items-center justify-center gap-1 rounded-md border border-rose-500/40 bg-white/90 dark:bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <FilePlus2 className="h-3 w-3" />
                                      <span>เข้าแถวแก้</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}

                        {/* Weekly Evaluation Summary Cell */}
                        <td className="p-2.5 bg-primary/[0.02] align-middle">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                              <span>สัปดาห์ที่ {week.weekIndex}</span>
                              <span>มา {week.evaluation.presentDays}/3</span>
                            </div>

                            {week.evaluation.status === "PASSED" ? (
                              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span>{week.evaluation.label}</span>
                              </div>
                            ) : week.evaluation.status === "SCHEDULED_MAKEUP" ? (
                              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                                <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span>{week.evaluation.label}</span>
                              </div>
                            ) : week.evaluation.status === "FAILED" ? (
                              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span>{week.evaluation.label}</span>
                              </div>
                            ) : week.evaluation.status === "IN_PROGRESS" ? (
                              <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300 flex items-start gap-1.5">
                                <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span>{week.evaluation.label}</span>
                              </div>
                            ) : (
                              <p className="text-[11px] text-muted-foreground/60">
                                {week.evaluation.label}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Weekly Cards View (จ - ศ) */}
              <div className="md:hidden divide-y divide-border/60">
                {calendarData.weeks.map((week) => (
                  <div key={week.mondayIso} className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground">
                        สัปดาห์ที่ {week.weekIndex}
                      </span>
                      {week.evaluation.status === "PASSED" ? (
                        <Badge variant="success" className="text-[10px]">
                          {week.evaluation.label}
                        </Badge>
                      ) : week.evaluation.status === "SCHEDULED_MAKEUP" ? (
                        <Badge variant="warning" className="text-[10px]">
                          {week.evaluation.label}
                        </Badge>
                      ) : week.evaluation.status === "FAILED" ? (
                        <Badge variant="destructive" className="text-[10px]">
                          {week.evaluation.label}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          {week.evaluation.label}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {week.days.slice(0, 5).map((day, idx) => (
                        <div
                          key={day.dateIso}
                          onClick={() => {
                            if (
                              !readOnly &&
                              (day.visualStatus === "ABSENT" ||
                                day.visualStatus === "ABSENT_MAKEUP_WINDOW")
                            ) {
                              handleOpenRemedial(
                                calendarData.student.id,
                                day.dateIso
                              );
                            }
                          }}
                          className={cn(
                            "rounded-xl border p-1.5 text-center flex flex-col items-center justify-between min-h-[66px] transition-all",
                            !day.isCurrentMonth && "opacity-35 bg-muted/15 border-border/40",
                            day.isToday && "ring-2 ring-primary ring-offset-1",
                            day.visualStatus === "PRESENT" ||
                              day.visualStatus === "LATE"
                              ? "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15"
                              : day.visualStatus === "REST"
                              ? "border-sky-500/30 bg-sky-500/[0.08]"
                              : day.visualStatus === "MAKEUP_ATTENDED"
                              ? "border-fuchsia-500/50 bg-fuchsia-500/15"
                              : day.visualStatus === "REMEDIED"
                              ? "border-violet-500/40 bg-violet-500/15"
                              : day.visualStatus === "ABSENT_MAKEUP_WINDOW"
                              ? "border-amber-500/60 bg-amber-500/15"
                              : day.visualStatus === "ABSENT"
                              ? "border-rose-500/60 bg-rose-500/15"
                              : "border-border/60 bg-muted/20"
                          )}
                        >
                          <div className="flex flex-col items-center leading-none gap-0.5">
                            <span className="text-[9px] font-medium text-muted-foreground uppercase">
                              {DAY_HEADERS[idx].short.replace(".", "")}
                            </span>
                            <span
                              className={cn(
                                "text-xs font-bold leading-none",
                                day.isToday
                                  ? "inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]"
                                  : "text-foreground"
                              )}
                            >
                              {day.dayNumber}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center justify-center">
                            {renderDayBadge(day, true)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Internal Remedial Clinic Makeup Modal (Only for Staff/Teacher) */}
      {!readOnly && (
        <RemedialClinicDialog
          open={isInternalModalOpen}
          onOpenChange={setIsInternalModalOpen}
          studentIdOrCode={calendarData?.student.studentId ?? studentIdOrCode}
          initialTargetDateIso={internalTargetDate}
          onSuccess={() => {
            loadCalendar(studentIdOrCode, year, month);
          }}
        />
      )}
    </div>
  );
}

interface StudentMonthlyCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentIdOrCode: string | null;
  onSelectAbsentDate?: (studentId: string, dateIso: string) => void;
}

export function StudentMonthlyCalendarModal({
  open,
  onOpenChange,
  studentIdOrCode,
  onSelectAbsentDate,
}: StudentMonthlyCalendarModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            <span>ปฏิทินการเข้าแถวรายเดือนของนักเรียน</span>
          </DialogTitle>
        </DialogHeader>

        {studentIdOrCode && (
          <StudentMonthlyCalendar
            studentIdOrCode={studentIdOrCode}
            showFullPageLink
            compact
            onSelectAbsentDate={
              onSelectAbsentDate
                ? (sid, dateIso) => {
                    onOpenChange(false);
                    onSelectAbsentDate(sid, dateIso);
                  }
                : undefined
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
