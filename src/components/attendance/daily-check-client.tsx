"use client";

import * as React from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarIcon,
  CalendarDays,
  CheckCheck,
  Save,
  Search,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  Loader2,
  Copy,
  AlertTriangle,
  Wrench,
  Shield,
} from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";
import {
  getDailyAttendanceAction,
  saveDailyAttendanceAction,
  type DailyStudentAttendanceItem,
} from "@/actions/attendance";
import { StudentMonthlyCalendarModal } from "@/components/attendance/student-monthly-calendar";
import { useAttendanceStore } from "@/store/use-attendance-store";
import { cn, formatDateISO } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface DailyCheckClientProps {
  initialClassrooms: string[];
  assignedClassrooms?: string | null;
  userRole?: string;
  initialData: {
    dateIso: string;
    classroom: string;
    isMakeupHoliday: boolean;
    isWeekend: boolean;
    students: DailyStudentAttendanceItem[];
    summary: {
      total: number;
      present: number;
      late: number;
      absent: number;
      leave: number;
      exemption: number;
      recordedCount: number;
      eligibleMakeupStudentsCount: number;
    };
  };
}

// ปุ่มสำหรับวันเข้าแถวปกติ (จันทร์, อังคาร, ศุกร์)
const REQUIRED_DAY_OPTIONS: {
  value: AttendanceStatus;
  label: string;
  activeClass: string;
}[] = [
  {
    value: "PRESENT",
    label: "มา",
    activeClass:
      "bg-emerald-600 text-white border-emerald-600 shadow-sm dark:bg-emerald-500 dark:border-emerald-500",
  },
  {
    value: "ABSENT",
    label: "ขาด",
    activeClass:
      "bg-rose-600 text-white border-rose-600 shadow-sm dark:bg-rose-500 dark:border-rose-500",
  },
];

// ปุ่มสำหรับคลินิกแก้แถวในวันหยุด (พุธ, พฤหัสบดี)
const MAKEUP_CLINIC_OPTIONS: {
  value: AttendanceStatus;
  label: string;
  activeClass: string;
}[] = [
  {
    value: "PRESENT",
    label: "มาแก้แถว",
    activeClass:
      "bg-violet-600 text-white border-violet-600 shadow-sm dark:bg-violet-500 dark:border-violet-500",
  },
  {
    value: "EXEMPTION",
    label: "หยุดพัก",
    activeClass:
      "bg-sky-600 text-white border-sky-600 shadow-sm dark:bg-sky-500 dark:border-sky-500",
  },
];

function formatShortThaiDate(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  return format(new Date(y, m - 1, d), "EEE d MMM", { locale: th });
}

export function DailyCheckClient({
  initialClassrooms,
  assignedClassrooms,
  userRole = "TEACHER",
  initialData,
}: DailyCheckClientProps) {
  const {
    selectedClassroom,
    setSelectedClassroom,
    selectedDate,
    setSelectedDate,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
  } = useAttendanceStore();

  const [students, setStudents] = React.useState<DailyStudentAttendanceItem[]>(
    initialData.students
  );
  const [isMakeupHoliday, setIsMakeupHoliday] = React.useState<boolean>(
    initialData.isMakeupHoliday
  );
  const [showOnlyMakeupQueue, setShowOnlyMakeupQueue] =
    React.useState<boolean>(true);
  const [isFetching, setIsFetching] = React.useState(false);
  const [isSaving, startSaveTransition] = React.useTransition();
  const [isSavedRecently, setIsSavedRecently] = React.useState(false);
  const [calendarStudentCode, setCalendarStudentCode] = React.useState<
    string | null
  >(null);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = React.useState(false);

  const [optimisticStudents, setOptimisticStudents] = React.useOptimistic(
    students,
    (
      current,
      action:
        | { type: "UPDATE_ONE"; id: string; status: AttendanceStatus }
        | { type: "MARK_ALL_DEFAULT"; makeupMode: boolean }
    ) => {
      if (action.type === "MARK_ALL_DEFAULT") {
        return current.map((s) => ({
          ...s,
          status: (action.makeupMode
            ? (s.pendingMakeupCount ?? 0) > 0
              ? "PRESENT"
              : "EXEMPTION"
            : "PRESENT") as AttendanceStatus,
          hasExistingRecord: true,
        }));
      }
      return current.map((s) =>
        s.id === action.id ? { ...s, status: action.status } : s
      );
    }
  );

  // Sync store initial classroom with server initialData on mount
  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const storeDateIso = format(selectedDate, "yyyy-MM-dd");
      if (
        selectedClassroom === initialData.classroom &&
        storeDateIso === initialData.dateIso
      ) {
        return;
      }
    }

    let cancelled = false;
    async function loadRecords() {
      setIsFetching(true);
      try {
        const dateIso = format(selectedDate, "yyyy-MM-dd");
        const res = await getDailyAttendanceAction(selectedClassroom, dateIso);
        if (!cancelled) {
          setStudents(res.students);
          setIsMakeupHoliday(res.isMakeupHoliday);
          setIsSavedRecently(false);
          setStatusFilter("ALL");
        }
      } catch {
        toast.error("ไม่สามารถดึงข้อมูลรายชื่อนักเรียนได้");
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    }

    loadRecords();
    return () => {
      cancelled = true;
    };
  }, [
    selectedClassroom,
    selectedDate,
    initialData.classroom,
    initialData.dateIso,
    setStatusFilter,
  ]);

  // หากเป็นครูที่ถูกจำกัดสิทธิ์ห้องเรียน ให้เลือกห้องที่ดูแลโดยอัตโนมัติ (ป้องกันกรณี store ค้างค่า "ALL" หรือห้องอื่น)
  React.useEffect(() => {
    if (userRole === "TEACHER" && assignedClassrooms?.trim()) {
      const allowedList = assignedClassrooms
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (
        allowedList.length > 0 &&
        (!allowedList.includes(selectedClassroom) || selectedClassroom === "ALL")
      ) {
        setSelectedClassroom(initialClassrooms[0] || allowedList[0]);
      }
    }
  }, [userRole, assignedClassrooms, initialClassrooms, selectedClassroom, setSelectedClassroom]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    React.startTransition(() => {
      setOptimisticStudents({ type: "UPDATE_ONE", id: studentId, status });
    });
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        let nextRemark = s.remark;
        if (isMakeupHoliday) {
          if (status === "PRESENT" && s.nextTargetAbsenceIso) {
            nextRemark = `มาแก้แถวชดเชยวันที่ ${s.nextTargetAbsenceIso}`;
          } else if (status === "EXEMPTION") {
            nextRemark =
              (s.pendingMakeupCount ?? 0) > 0
                ? "ยังไม่มาแก้แถวในวันหยุดนี้"
                : "วันหยุดประจำสัปดาห์ (ไม่ติดขาด)";
          }
        }
        return { ...s, status, remark: nextRemark };
      })
    );
    setIsSavedRecently(false);
  };

  const handleRemarkChange = (studentId: string, remark: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, remark } : s))
    );
    setIsSavedRecently(false);
  };

  const handleMarkAllPresent = () => {
    React.startTransition(() => {
      setOptimisticStudents({
        type: "MARK_ALL_DEFAULT",
        makeupMode: isMakeupHoliday,
      });
    });
    setStudents((prev) =>
      prev.map((s) => {
        if (isMakeupHoliday) {
          const hasDebt = (s.pendingMakeupCount ?? 0) > 0;
          return {
            ...s,
            status: (hasDebt ? "PRESENT" : "EXEMPTION") as AttendanceStatus,
            remark: hasDebt
              ? `มาแก้แถวชดเชยวันที่ ${s.nextTargetAbsenceIso ?? ""}`.trim()
              : "วันหยุดประจำสัปดาห์ (ไม่ติดขาด)",
          };
        }
        return {
          ...s,
          status: "PRESENT" as AttendanceStatus,
          remark: s.status === "ABSENT" ? "" : s.remark,
        };
      })
    );
    toast.info(
      isMakeupHoliday
        ? `ติ๊ก "มาแก้แถว" ให้นักเรียนที่ติดค้างทุกคนในห้อง ${selectedClassroom} แล้ว`
        : `ตั้งค่าสถานะ "มาทุกคน" สำหรับห้อง ${selectedClassroom} แล้ว`,
      {
        description:
          "กดปุ่ม 'บันทึกข้อมูล (Save)' เพื่อยืนยันการบันทึกลงฐานข้อมูล",
      }
    );
  };

  const handleSaveAttendance = () => {
    const dateIso = format(selectedDate, "yyyy-MM-dd");
    startSaveTransition(async () => {
      const payload = {
        dateIso,
        records: students.map((s) => ({
          studentId: s.id,
          status: s.status,
          remark: s.remark,
        })),
      };

      const result = await saveDailyAttendanceAction(payload);
      if (result.success) {
        setStudents((prev) =>
          prev.map((s) => ({ ...s, hasExistingRecord: true }))
        );
        setIsSavedRecently(true);
        toast.success(result.message, {
          description: `ห้อง ${
            selectedClassroom === "ALL" ? "ทุกห้องเรียน" : selectedClassroom
          } • วันที่ ${format(selectedDate, "d MMMM yyyy", { locale: th })}`,
        });
      } else {
        toast.error("บันทึกข้อมูลไม่สำเร็จ", {
          description: result.message,
        });
      }
    });
  };

  // Live statistics
  const counts = React.useMemo(() => {
    const total = optimisticStudents.length;
    const present = optimisticStudents.filter(
      (s) => s.status === "PRESENT" || s.status === "LATE"
    ).length;
    const exemption = optimisticStudents.filter(
      (s) => s.status === "EXEMPTION" || s.status === "LEAVE"
    ).length;
    const absent = optimisticStudents.filter(
      (s) => s.status === "ABSENT"
    ).length;
    const recorded = optimisticStudents.filter(
      (s) => s.hasExistingRecord
    ).length;
    const makeupQueueCount = optimisticStudents.filter(
      (s) =>
        (s.pendingMakeupCount ?? 0) > 0 ||
        s.status === "PRESENT" ||
        s.status === "LATE"
    ).length;
    return { total, present, exemption, absent, recorded, makeupQueueCount };
  }, [optimisticStudents]);

  // Filtered students for display
  const filteredStudents = React.useMemo(() => {
    return optimisticStudents.filter((s) => {
      if (isMakeupHoliday && showOnlyMakeupQueue) {
        const inQueue =
          (s.pendingMakeupCount ?? 0) > 0 ||
          s.status === "PRESENT" ||
          s.status === "LATE";
        if (!inQueue) return false;
      }

      const matchesQuery =
        !searchQuery.trim() ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" || s.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [
    optimisticStudents,
    isMakeupHoliday,
    showOnlyMakeupQueue,
    searchQuery,
    statusFilter,
  ]);

  const activeStatusOptions = isMakeupHoliday
    ? MAKEUP_CLINIC_OPTIONS
    : REQUIRED_DAY_OPTIONS;

  return (
    <div className="space-y-6">
      {/* Header & Top Action Bar */}
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {isMakeupHoliday
                ? "คลินิกแก้แถวในวันหยุด (พุธ - พฤหัสบดี)"
                : "เช็คชื่อเข้าแถวประจำวัน (จันทร์ • อังคาร • ศุกร์)"}
            </h1>
            {isMakeupHoliday ? (
              <Badge className="bg-violet-600 text-white border-violet-600 text-xs shrink-0">
                🛠️ โหมดนัดแก้แถววันหยุด
              </Badge>
            ) : (
              <Badge variant="info" className="text-xs shrink-0">
                📅 วันเข้าแถวบังคับ (จ. อ. ศ.)
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isMakeupHoliday
              ? "วันพุธ-พฤหัสบดีเป็นวันหยุดของเด็กที่มาครบ • เปิดเช็คชื่อเฉพาะนักเรียนที่ติดขาด (จากต้นสัปดาห์ หรือโอนคิวมาจากสัปดาห์ก่อน)"
              : "บังคับเข้าแถวเฉพาะ จันทร์, อังคาร, ศุกร์ (หยุด พุธ-พฤหัสบดี) • หากขาดต้องมาแก้ในวันหยุด พุธ-พฤหัสบดี"}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="hidden sm:flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleMarkAllPresent}
            disabled={isFetching || isSaving || students.length === 0}
            className={cn(
              isMakeupHoliday
                ? "border-violet-500/40 text-violet-700 hover:bg-violet-500/10 dark:text-violet-300"
                : "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
            )}
          >
            <CheckCheck className="h-4 w-4" />
            <span>
              {isMakeupHoliday
                ? `มาแก้ครบทุกคนในคิว (${counts.makeupQueueCount})`
                : "มาทุกคน (Mark All Present)"}
            </span>
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={handleSaveAttendance}
            disabled={isFetching || isSaving || students.length === 0}
            className="min-w-[170px] shadow-md"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>บันทึกข้อมูล (Save)</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Special Banner when viewing Wednesday or Thursday */}
      {isMakeupHoliday && (
        <div className="rounded-2xl border border-violet-500/35 bg-violet-500/[0.07] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-violet-900 dark:text-violet-200">
                วันนี้เป็นวันหยุดประจำสัปดาห์ (พุธ / พฤหัสบดี) — เปิดคลินิกให้เด็กติดขาดมาแก้แถว
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ติ๊ก <strong>&ldquo;มาแก้แถว&rdquo;</strong> ให้นักเรียนที่มารายงานตัวเข้าคลินิกแก้แถวในวันนี้ ระบบจะนำไปหักล้างวันขาดที่เก่าที่สุดให้อัตโนมัติแบบ 1 ต่อ 1 (รองรับทั้งขาด จ.-อ. สัปดาห์นี้ และขาดค้างมาจากสัปดาห์ก่อน)
              </p>
            </div>
          </div>

          <div className="inline-flex items-center rounded-xl border border-violet-500/30 bg-card p-1 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setShowOnlyMakeupQueue(true)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                showOnlyMakeupQueue
                  ? "bg-violet-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              คิวนัดแก้แถว ({counts.makeupQueueCount} คน)
            </button>
            <button
              type="button"
              onClick={() => setShowOnlyMakeupQueue(false)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                !showOnlyMakeupQueue
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ทั้งห้อง ({counts.total} คน)
            </button>
          </div>
        </div>
      )}

      {/* Filter Controls Card */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
            {/* Classroom Selector */}
            <div className="md:col-span-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>ห้องเรียน (Classroom)</span>
                </label>
                {userRole === "TEACHER" && assignedClassrooms?.trim() && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25">
                    <Shield className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    <span>ดูแลเฉพาะ: {assignedClassrooms}</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {initialClassrooms.map((room) => {
                  const isAssigned =
                    userRole === "ADMIN" ||
                    !assignedClassrooms?.trim() ||
                    assignedClassrooms
                      .split(",")
                      .map((c) => c.trim())
                      .includes(room);

                  return (
                    <button
                      key={room}
                      type="button"
                      onClick={() => setSelectedClassroom(room)}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5",
                        selectedClassroom === room
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : isAssigned
                          ? "bg-card text-foreground border-emerald-500/40 hover:bg-emerald-500/10"
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-accent"
                      )}
                    >
                      {userRole === "TEACHER" && assignedClassrooms?.trim() && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      )}
                      <span>{room}</span>
                    </button>
                  );
                })}
                {(userRole === "ADMIN" || !assignedClassrooms?.trim()) && (
                  <button
                    type="button"
                    onClick={() => setSelectedClassroom("ALL")}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer border",
                      selectedClassroom === "ALL"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card text-foreground border-border hover:bg-accent"
                    )}
                  >
                    ทุกห้อง
                  </button>
                )}
              </div>
            </div>

            {/* Date Selector */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                วันที่เช็คชื่อ (จ./อ./ศ. = วันมา • พ./พฤ. = วันหยุด/คลินิกแก้แถว)
              </label>
              <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                <PopoverTrigger
                  className={cn(
                    "flex h-11 w-full items-center justify-between gap-2.5 rounded-full border-2 px-4 py-2 text-sm font-semibold shadow-xs transition-all cursor-pointer",
                    selectedDate.getDay() === 0 || selectedDate.getDay() === 6
                      ? "border-rose-500/40 bg-rose-500/[0.05] hover:bg-rose-500/[0.10] text-rose-950 dark:text-rose-100"
                      : selectedDate.getDay() === 3 || selectedDate.getDay() === 4
                      ? "border-violet-500/50 bg-violet-500/[0.06] hover:bg-violet-500/[0.12] text-violet-950 dark:text-violet-100"
                      : "border-emerald-500/50 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] text-emerald-950 dark:text-emerald-100"
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <CalendarIcon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selectedDate.getDay() === 0 || selectedDate.getDay() === 6
                          ? "text-rose-600 dark:text-rose-400"
                          : selectedDate.getDay() === 3 || selectedDate.getDay() === 4
                          ? "text-violet-600 dark:text-violet-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    />
                    <span className="truncate font-semibold">
                      {format(selectedDate, "EEEEที่ d MMM yyyy", {
                        locale: th,
                      })}
                    </span>
                  </span>
                  {selectedDate.getDay() === 0 || selectedDate.getDay() === 6 ? (
                    <span className="shrink-0 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                      วันหยุด
                    </span>
                  ) : selectedDate.getDay() === 3 || selectedDate.getDay() === 4 ? (
                    <span className="shrink-0 rounded-full bg-violet-500/20 border border-violet-500/35 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                      หยุด • คลินิกแก้แถว
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-emerald-500/20 border border-emerald-500/35 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      วันมาเข้าแถว
                    </span>
                  )}
                </PopoverTrigger>
                <PopoverContent align="start" side="bottom" sideOffset={8} className="w-auto p-2 rounded-3xl shadow-2xl border border-border/80 bg-popover">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(day) => {
                      if (day) {
                        setSelectedDate(day);
                        setIsDatePopoverOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Search Input */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ค้นหานักเรียน (รหัส / ชื่อ-สกุล)
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="เช่น 68219100001 หรือ กมลพิชญ์..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Live Status Summary Pills */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer border",
                  statusFilter === "ALL"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-muted/60 text-muted-foreground border-transparent hover:bg-muted"
                )}
              >
                <Users className="h-3.5 w-3.5" />
                <span>
                  {isMakeupHoliday && showOnlyMakeupQueue
                    ? `คิวนัดแก้แถว (${counts.makeupQueueCount})`
                    : `ทั้งหมด (${counts.total})`}
                </span>
              </button>

              {isMakeupHoliday ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        statusFilter === "PRESENT" ? "ALL" : "PRESENT"
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer border",
                      statusFilter === "PRESENT"
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>มาแก้แถววันนี้ ({counts.present})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        statusFilter === "EXEMPTION" ? "ALL" : "EXEMPTION"
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer border",
                      statusFilter === "EXEMPTION"
                        ? "bg-sky-600 text-white border-sky-600"
                        : "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20"
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>หยุดพัก / ยังไม่มาแก้ ({counts.exemption})</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        statusFilter === "PRESENT" ? "ALL" : "PRESENT"
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer border",
                      statusFilter === "PRESENT"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>มาเข้าแถว ({counts.present})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        statusFilter === "ABSENT" ? "ALL" : "ABSENT"
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer border",
                      statusFilter === "ABSENT"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                    )}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>ขาดแถว ({counts.absent})</span>
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isSavedRecently ? (
                <Badge variant="success" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  บันทึกข้อมูลล่าสุดแล้ว
                </Badge>
              ) : counts.recorded > 0 ? (
                <Badge variant="outline">
                  มีประวัติบันทึกแล้ว {counts.recorded}/{counts.total} คน
                </Badge>
              ) : (
                <Badge variant="warning">
                  {isMakeupHoliday
                    ? "เลือกติ๊ก 'มาแก้แถว' ให้คนที่มาชดเชยในวันหยุดนี้แล้วกด Save"
                    : "ยังไม่ได้บันทึกข้อมูลของวันนี้ (ค่าเริ่มต้น: มา)"}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Row Grid */}
      <Card className="overflow-hidden">
        <div className="hidden sm:block border-b border-border/70 bg-muted/40 px-4 py-3 sm:px-6">
          <div className="grid grid-cols-12 items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-2">รหัส</div>
            <div className="col-span-3">
              {isMakeupHoliday
                ? "ชื่อ - นามสกุล (คิวชดเชยวันขาด)"
                : "ชื่อ - นามสกุล (สถานะสัปดาห์ จ. อ. ศ.)"}
            </div>
            <div className="col-span-1">ห้อง</div>
            <div className="col-span-1 text-center">ปฏิทิน</div>
            <div className="col-span-3 text-center">
              {isMakeupHoliday
                ? "คลินิกวันหยุด [มาแก้แถว] [หยุดพัก]"
                : "สถานะการเข้าแถว [มา] [ขาด]"}
            </div>
            <div className="col-span-2">หมายเหตุ</div>
          </div>
        </div>

        <CardContent className="p-0">
          {isFetching ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm">กำลังโหลดรายชื่อนักเรียน...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500/70" />
              {isMakeupHoliday && showOnlyMakeupQueue ? (
                <>
                  <p className="text-base font-semibold text-foreground">
                    🎉 ไม่มีนักเรียนติดค้างคิวแก้แถวในห้องนี้!
                  </p>
                  <p className="text-xs">
                    นักเรียนทุกคนมาครบตามเกณฑ์ จ.-อ.-ศ. ได้สิทธิ์หยุดพักวันพุธ-พฤหัสบดีครบทุกคน
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOnlyMakeupQueue(false)}
                    className="mt-2 rounded-xl"
                  >
                    ดูรายชื่อนักเรียนทั้งหมดในห้อง ({counts.total} คน)
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-base font-medium">
                    ไม่พบรายชื่อนักเรียนที่ตรงกับเงื่อนไข
                  </p>
                  <p className="text-xs">ลองเปลี่ยนห้องเรียนหรือล้างคำค้นหา</p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              <AnimatePresence initial={false}>
                {filteredStudents.map((student, idx) => {
                  const isCameMakeup =
                    isMakeupHoliday &&
                    (student.status === "PRESENT" || student.status === "LATE");
                  const pendingDebt = student.pendingMakeupCount ?? 0;

                  const totalWeekPresent = isMakeupHoliday
                    ? Math.min(
                        3,
                        (student.weekOtherPresent ?? 0) +
                          (isCameMakeup &&
                          student.nextTargetAbsenceIso &&
                          !student.nextTargetIsCrossWeek
                            ? 1
                            : 0)
                      )
                    : Math.min(
                        3,
                        (student.weekOtherPresent ?? 0) +
                          (student.status === "PRESENT" ||
                          student.status === "LATE"
                            ? 1
                            : 0)
                      );

                  const totalWeekAbsent = isMakeupHoliday
                    ? Math.max(
                        0,
                        (student.weekOtherAbsent ?? 0) -
                          (isCameMakeup &&
                          student.nextTargetAbsenceIso &&
                          !student.nextTargetIsCrossWeek
                            ? 1
                            : 0)
                      )
                    : (student.weekOtherAbsent ?? 0) +
                      (student.status === "ABSENT" ? 1 : 0);

                  return (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.15,
                        delay: Math.min(idx * 0.02, 0.25),
                      }}
                      className={cn(
                        "flex flex-col gap-2.5 p-3.5 sm:grid sm:grid-cols-12 sm:items-center sm:gap-3 sm:px-6 sm:py-3.5 transition-colors",
                        !isMakeupHoliday && student.status === "ABSENT"
                          ? "bg-rose-500/[0.05] hover:bg-rose-500/[0.09]"
                          : isCameMakeup
                          ? "bg-violet-500/[0.06] hover:bg-violet-500/[0.10]"
                          : "hover:bg-muted/30"
                      )}
                    >
                      {/* Mobile Top Row: Student ID + Full Name + Classroom + Calendar */}
                      <div className="flex items-center justify-between sm:contents">
                        <div className="flex items-center gap-1.5 sm:col-span-2 group/code shrink-0 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarStudentCode(student.studentId)
                            }
                            className="font-mono text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-lg border border-primary/20 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                            title="คลิกเพื่อดูปฏิทินรายเดือนของนักเรียน"
                          >
                            {student.studentId}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(student.studentId);
                              toast.success(
                                `คัดลอกรหัส ${student.studentId} เรียบร้อยแล้ว`
                              );
                            }}
                            className="flex items-center justify-center h-6 w-6 rounded-full border border-blue-400/80 bg-blue-50/80 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all cursor-pointer shadow-2xs shrink-0"
                            title="คัดลอกรหัสนักเรียน"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex-1 min-w-0 px-2 sm:px-0 sm:col-span-3">
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarStudentCode(student.studentId)
                            }
                            className="text-sm font-semibold sm:font-medium text-foreground hover:text-primary transition-colors truncate text-left cursor-pointer block max-w-full"
                            title="คลิกดูปฏิทินรายเดือนของนักเรียน"
                          >
                            {student.fullName}
                          </button>

                          {/* Subtitle Status Info */}
                          {isMakeupHoliday ? (
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                              {student.nextTargetAbsenceIso ? (
                                isCameMakeup ? (
                                  <span className="font-bold text-violet-600 dark:text-violet-400">
                                    🟣 ชดเชยวันขาด{" "}
                                    {formatShortThaiDate(
                                      student.nextTargetAbsenceIso
                                    )}{" "}
                                    สำเร็จ!
                                    {pendingDebt > 1
                                      ? ` (ยังเหลืออีก ${pendingDebt - 1} วัน)`
                                      : " (ครบหมดแล้ว)"}
                                  </span>
                                ) : student.hasOverdueDebt ? (
                                  <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3 shrink-0" />
                                    ค้างสะสมข้ามรอบ ({pendingDebt} วัน) • แก้วัน{" "}
                                    {formatShortThaiDate(
                                      student.nextTargetAbsenceIso
                                    )}
                                  </span>
                                ) : (
                                  <span className="font-bold text-amber-600 dark:text-amber-400">
                                    🟠 นัดแก้{" "}
                                    {formatShortThaiDate(
                                      student.nextTargetAbsenceIso
                                    )}
                                    {student.nextTargetIsCrossWeek
                                      ? " (โอนจากศุกร์ที่แล้ว)"
                                      : " (ขาดต้นสัปดาห์นี้)"}
                                  </span>
                                )
                              ) : (
                                <span className="text-sky-600 dark:text-sky-400 font-medium">
                                  🏖️ ไม่ติดขาด (ได้สิทธิ์หยุดพัก พุธ-พฤหัสบดี)
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span
                                className={cn(
                                  "font-semibold",
                                  totalWeekPresent >= 3
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground"
                                )}
                              >
                                สัปดาห์นี้: มา {totalWeekPresent}/3 วัน (จ. อ. ศ.)
                              </span>
                              {totalWeekAbsent > 0 && (
                                <>
                                  <span className="text-muted-foreground/40">
                                    •
                                  </span>
                                  <span className="font-bold text-rose-600 dark:text-rose-400">
                                    ติดขาด {totalWeekAbsent} วัน (นัดแก้ พ.-พฤ.)
                                  </span>
                                </>
                              )}
                              {totalWeekAbsent === 0 && pendingDebt > 0 && (
                                <>
                                  <span className="text-muted-foreground/40">
                                    •
                                  </span>
                                  <span
                                    className={cn(
                                      "font-semibold",
                                      student.hasOverdueDebt
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-amber-600 dark:text-amber-400"
                                    )}
                                  >
                                    {student.hasOverdueDebt
                                      ? `ค้างเก่า ${pendingDebt} วัน`
                                      : `รอแก้ พ.-พฤ. นี้ (${pendingDebt} วัน)`}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="sm:col-span-1">
                          <Badge
                            variant="secondary"
                            className="text-xs font-medium"
                          >
                            {student.classroom}
                          </Badge>
                        </div>

                        {/* Calendar Button Column right before Status */}
                        <div className="hidden sm:flex sm:col-span-1 items-center justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarStudentCode(student.studentId)
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-blue-400/80 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-all cursor-pointer shadow-xs hover:shadow-sm"
                            title="ดูปฏิทินการเข้าแถวเดือนนี้"
                          >
                            <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            <span>ปฏิทิน</span>
                          </button>
                        </div>
                      </div>

                      {/* Quick Status Toggle Switches / Radios */}
                      <div className="sm:col-span-3 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarStudentCode(student.studentId)
                          }
                          className="sm:hidden inline-flex items-center gap-1 rounded-full border border-blue-400/80 bg-blue-50/70 dark:bg-blue-950/40 px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0 cursor-pointer"
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>ปฏิทิน</span>
                        </button>

                        <div
                          role="radiogroup"
                          aria-label={`สถานะของ ${student.fullName}`}
                          className="grid grid-cols-2 gap-1.5 sm:gap-2 rounded-2xl bg-muted/80 p-1 w-full sm:max-w-[230px] border border-border/60"
                        >
                          {activeStatusOptions.map((opt) => {
                            const isSelected =
                              student.status === opt.value ||
                              (opt.value === "PRESENT" &&
                                student.status === "LATE") ||
                              (opt.value === "EXEMPTION" &&
                                student.status === "LEAVE");
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() =>
                                  handleStatusChange(student.id, opt.value)
                                }
                                className={cn(
                                  "rounded-xl py-2 sm:py-1.5 px-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer border touch-manipulation text-center",
                                  isSelected
                                    ? opt.activeClass
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card/70"
                                )}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Optional Remark Input */}
                      <div className="sm:col-span-2">
                        <Input
                          value={student.remark}
                          onChange={(e) =>
                            handleRemarkChange(student.id, e.target.value)
                          }
                          placeholder="หมายเหตุ (ถ้ามี)..."
                          className="h-9 sm:h-8 text-xs rounded-lg bg-background/60"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky Mobile Floating Action Bar */}
      <div className="fixed bottom-[60px] inset-x-0 z-30 flex sm:hidden items-center justify-between gap-2 border-t border-border/80 bg-card/95 backdrop-blur-md px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-lg">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleMarkAllPresent}
          disabled={isFetching || isSaving || students.length === 0}
          className="flex-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
        >
          <CheckCheck className="h-4 w-4" />
          <span>{isMakeupHoliday ? "มาแก้ทุกคน" : "มาทุกคน"}</span>
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleSaveAttendance}
          disabled={isFetching || isSaving || students.length === 0}
          className="flex-1 shadow-sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>กำลังบันทึก...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>บันทึก ({counts.total})</span>
            </>
          )}
        </Button>
      </div>

      {/* Individual Student Monthly Calendar Modal */}
      <StudentMonthlyCalendarModal
        open={Boolean(calendarStudentCode)}
        onOpenChange={(open) => {
          if (!open) setCalendarStudentCode(null);
        }}
        studentIdOrCode={calendarStudentCode}
      />
    </div>
  );
}
