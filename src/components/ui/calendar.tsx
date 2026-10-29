"use client";

import * as React from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarProps {
  mode?: "single";
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
}

const WEEKDAY_HEADERS = [
  { label: "จ.", sub: "มาแถว", kind: "REQUIRED" as const },
  { label: "อ.", sub: "มาแถว", kind: "REQUIRED" as const },
  { label: "พ.", sub: "หยุด/แก้", kind: "MAKEUP_HOLIDAY" as const },
  { label: "พฤ.", sub: "หยุด/แก้", kind: "MAKEUP_HOLIDAY" as const },
  { label: "ศ.", sub: "มาแถว", kind: "REQUIRED" as const },
  { label: "ส.", sub: "วันหยุด", kind: "WEEKEND" as const },
  { label: "อา.", sub: "วันหยุด", kind: "WEEKEND" as const },
];

function getLocalDayKind(date: Date): "REQUIRED" | "MAKEUP_HOLIDAY" | "WEEKEND" {
  const dow = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  if (dow === 0 || dow === 6) return "WEEKEND";
  if (dow === 3 || dow === 4) return "MAKEUP_HOLIDAY";
  return "REQUIRED";
}

function Calendar({ selected, onSelect, className }: CalendarProps) {
  const [viewMonth, setViewMonth] = React.useState<Date>(
    () => selected ?? new Date()
  );

  React.useEffect(() => {
    if (selected) {
      setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }, [selected]);

  const days = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const buddhistYear = viewMonth.getFullYear() + 543;
  const monthLabel = format(viewMonth, "MMMM", { locale: th });

  return (
    <div className={cn("w-[320px] sm:w-[350px] p-2.5 select-none", className)}>
      {/* Month Header */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-border/60">
        <div>
          <p className="text-sm font-bold text-foreground">
            {monthLabel} {buddhistYear}
          </p>
          <p className="text-[11px] text-muted-foreground">
            เลือกวันเข้าแถว หรือ วันหยุดคลินิกแก้แถว
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setViewMonth(now);
              onSelect?.(now);
            }}
            className="rounded-lg border border-border bg-muted/50 hover:bg-accent px-2 py-1 text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-colors cursor-pointer"
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-colors cursor-pointer"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEKDAY_HEADERS.map((wh) => (
          <div
            key={wh.label}
            className={cn(
              "rounded-lg py-1 text-center border",
              wh.kind === "REQUIRED"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                : wh.kind === "MAKEUP_HOLIDAY"
                ? "bg-violet-500/10 border-violet-500/25 text-violet-700 dark:text-violet-300"
                : "bg-rose-500/[0.07] border-rose-500/20 text-rose-600 dark:text-rose-400"
            )}
          >
            <div className="text-[11px] font-bold leading-tight">{wh.label}</div>
            <div className="text-[9px] font-semibold opacity-85 leading-tight">
              {wh.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const isSelected = selected ? isSameDay(day, selected) : false;
          const today = isToday(day);
          const kind = getLocalDayKind(day);

          const baseStyle =
            kind === "REQUIRED"
              ? "bg-emerald-500/[0.08] border-emerald-500/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/20"
              : kind === "MAKEUP_HOLIDAY"
              ? "bg-violet-500/[0.08] border-violet-500/30 text-violet-900 dark:text-violet-200 hover:bg-violet-500/20"
              : "bg-rose-500/[0.05] border-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15";

          const selectedStyle =
            kind === "REQUIRED"
              ? "bg-emerald-600 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/35 hover:bg-emerald-600"
              : kind === "MAKEUP_HOLIDAY"
              ? "bg-violet-600 border-violet-600 text-white shadow-sm ring-2 ring-violet-500/35 hover:bg-violet-600"
              : "bg-rose-600 border-rose-600 text-white shadow-sm ring-2 ring-rose-500/35 hover:bg-rose-600";

          const tagText =
            kind === "REQUIRED"
              ? "มาแถว"
              : kind === "MAKEUP_HOLIDAY"
              ? "หยุด/แก้"
              : "หยุด";

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect?.(day)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl border py-1.5 px-0.5 transition-all cursor-pointer min-h-[46px]",
                isSelected ? selectedStyle : baseStyle,
                !inMonth && !isSelected && "opacity-35 bg-muted/30 border-border/40 text-muted-foreground",
                today && !isSelected && "ring-2 ring-primary"
              )}
            >
              {today && (
                <span
                  className={cn(
                    "absolute top-1 right-1 h-1.5 w-1.5 rounded-full",
                    isSelected ? "bg-white" : "bg-primary"
                  )}
                  title="วันนี้"
                />
              )}
              <span className="text-xs font-bold leading-none">
                {day.getDate()}
              </span>
              <span
                className={cn(
                  "mt-1 text-[9px] font-semibold leading-none",
                  isSelected
                    ? "text-white/95"
                    : kind === "REQUIRED"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : kind === "MAKEUP_HOLIDAY"
                    ? "text-violet-700 dark:text-violet-400"
                    : "text-rose-600/85 dark:text-rose-400"
                )}
              >
                {tagText}
              </span>
            </button>
          );
        })}
      </div>

      {/* Clear Color Legend */}
      <div className="mt-3 pt-2.5 border-t border-border/60 grid grid-cols-3 gap-1.5 text-[10px]">
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 text-emerald-800 dark:text-emerald-300 font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">วันมา (จ.อ.ศ.)</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 border border-violet-500/25 px-2 py-1 text-violet-800 dark:text-violet-300 font-semibold">
          <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />
          <span className="truncate">หยุด/แก้ (พ.พฤ.)</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 px-2 py-1 text-rose-700 dark:text-rose-300 font-semibold">
          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
          <span className="truncate">เสาร์-อาทิตย์</span>
        </div>
      </div>
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
