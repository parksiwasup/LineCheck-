"use client";

import * as React from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarIcon,
  CheckCheck,
  Save,
  Search,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";
import {
  getDailyAttendanceAction,
  saveDailyAttendanceAction,
  type DailyStudentAttendanceItem,
} from "@/actions/attendance";
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
  initialData: {
    dateIso: string;
    classroom: string;
    students: DailyStudentAttendanceItem[];
    summary: {
      total: number;
      present: number;
      late: number;
      absent: number;
      leave: number;
      exemption: number;
      recordedCount: number;
    };
  };
}

const STATUS_OPTIONS: {
  value: AttendanceStatus;
  label: string;
  shortLabel: string;
  activeClass: string;
  dotClass: string;
}[] = [
  {
    value: "PRESENT",
    label: "มา",
    shortLabel: "มา",
    activeClass:
      "bg-emerald-600 text-white border-emerald-600 shadow-xs dark:bg-emerald-500 dark:border-emerald-500",
    dotClass: "bg-emerald-500",
  },
  {
    value: "LATE",
    label: "สาย",
    shortLabel: "สาย",
    activeClass:
      "bg-amber-500 text-white border-amber-500 shadow-xs dark:bg-amber-500 dark:border-amber-500",
    dotClass: "bg-amber-500",
  },
  {
    value: "ABSENT",
    label: "ขาด",
    shortLabel: "ขาด",
    activeClass:
      "bg-rose-600 text-white border-rose-600 shadow-xs dark:bg-rose-500 dark:border-rose-500",
    dotClass: "bg-rose-500",
  },
  {
    value: "LEAVE",
    label: "ลา",
    shortLabel: "ลา",
    activeClass:
      "bg-sky-600 text-white border-sky-600 shadow-xs dark:bg-sky-500 dark:border-sky-500",
    dotClass: "bg-sky-500",
  },
];

export function DailyCheckClient({
  initialClassrooms,
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
  const [isFetching, setIsFetching] = React.useState(false);
  const [isSaving, startSaveTransition] = React.useTransition();
  const [isSavedRecently, setIsSavedRecently] = React.useState(false);

  const [optimisticStudents, setOptimisticStudents] = React.useOptimistic(
    students,
    (
      current,
      action:
        | { type: "UPDATE_ONE"; id: string; status: AttendanceStatus }
        | { type: "MARK_ALL_PRESENT" }
    ) => {
      if (action.type === "MARK_ALL_PRESENT") {
        return current.map((s) => ({
          ...s,
          status: "PRESENT" as AttendanceStatus,
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
      return;
    }

    let cancelled = false;
    async function loadRecords() {
      setIsFetching(true);
      try {
        const dateIso = format(selectedDate, "yyyy-MM-dd");
        const res = await getDailyAttendanceAction(selectedClassroom, dateIso);
        if (!cancelled) {
          setStudents(res.students);
          setIsSavedRecently(false);
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
  }, [selectedClassroom, selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    React.startTransition(() => {
      setOptimisticStudents({ type: "UPDATE_ONE", id: studentId, status });
    });
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status } : s))
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
      setOptimisticStudents({ type: "MARK_ALL_PRESENT" });
    });
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: "PRESENT" as AttendanceStatus,
        remark: s.status === "ABSENT" ? "" : s.remark,
      }))
    );
    toast.info(`ตั้งค่าสถานะ "มาทุกคน" สำหรับห้อง ${selectedClassroom} แล้ว`, {
      description: "กดปุ่ม 'บันทึกข้อมูล (Save)' เพื่อยืนยันการบันทึกลงฐานข้อมูล",
    });
  };

  const handleSaveAttendance = () => {
    const dateIso = format(selectedDate, "yyyy-MM-dd");
    startSaveTransition(async () => {
      setOptimisticStudents({ type: "MARK_ALL_PRESENT" }); // trigger optimistic feedback
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
          description: `ห้อง ${selectedClassroom === "ALL" ? "ทุกห้องเรียน" : selectedClassroom} • วันที่ ${format(selectedDate, "d MMMM yyyy", { locale: th })}`,
        });
      } else {
        toast.error("บันทึกข้อมูลไม่สำเร็จ", {
          description: result.message,
        });
      }
    });
  };

  // Filtered students for display
  const filteredStudents = React.useMemo(() => {
    return optimisticStudents.filter((s) => {
      const matchesQuery =
        !searchQuery.trim() ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" || s.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [optimisticStudents, searchQuery, statusFilter]);

  // Live statistics
  const counts = React.useMemo(() => {
    const total = optimisticStudents.length;
    const present = optimisticStudents.filter((s) => s.status === "PRESENT").length;
    const late = optimisticStudents.filter((s) => s.status === "LATE").length;
    const absent = optimisticStudents.filter((s) => s.status === "ABSENT").length;
    const leave = optimisticStudents.filter((s) => s.status === "LEAVE").length;
    const recorded = optimisticStudents.filter((s) => s.hasExistingRecord).length;
    return { total, present, late, absent, leave, recorded };
  }, [optimisticStudents]);

  return (
    <div className="space-y-6">
      {/* Header & Top Action Bar */}
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              เช็คชื่อเข้าแถวประจำวัน
            </h1>
            <Badge variant="info" className="text-xs shrink-0">
              Daily Attendance Check
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            เลือกห้องเรียนและวันที่เพื่อเช็คชื่อกิจกรรมหน้าเสาธง พร้อมระบบบันทึกแบบ Optimistic UI
          </p>
        </div>

        {/* Quick Actions: Mark All Present & Save */}
        <div className="hidden sm:flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleMarkAllPresent}
            disabled={isFetching || isSaving || students.length === 0}
            className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
          >
            <CheckCheck className="h-4 w-4" />
            <span>มาทุกคน (Mark All Present)</span>
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

      {/* Filter Controls Card */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
            {/* Classroom Selector (Zustand State) */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ห้องเรียน (Classroom)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {initialClassrooms.map((room) => (
                  <button
                    key={room}
                    type="button"
                    onClick={() => setSelectedClassroom(room)}
                    className={cn(
                      "rounded-xl px-3.5 py-2 text-sm font-semibold transition-all cursor-pointer border",
                      selectedClassroom === room
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card text-foreground border-border hover:bg-accent"
                    )}
                  >
                    {room}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedClassroom("ALL")}
                  className={cn(
                    "rounded-xl px-3.5 py-2 text-sm font-semibold transition-all cursor-pointer border",
                    selectedClassroom === "ALL"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card text-foreground border-border hover:bg-accent"
                  )}
                >
                  ทุกห้อง
                </button>
              </div>
            </div>

            {/* Date Selector (react-day-picker 10 + date-fns 4) */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                วันที่เช็คชื่อ (Attendance Date)
              </label>
              <Popover>
                <PopoverTrigger
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-xl border border-input bg-card px-3.5 py-2 text-sm font-medium shadow-xs hover:bg-accent/50 transition-colors cursor-pointer"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    <span>
                      {format(selectedDate, "EEEEที่ d MMMM yyyy", {
                        locale: th,
                      })}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateISO(selectedDate)}
                  </span>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(day) => {
                      if (day) setSelectedDate(day);
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
                  placeholder="เช่น 66001 หรือ ธนกร..."
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
                <span>ทั้งหมด ({counts.total})</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setStatusFilter(statusFilter === "PRESENT" ? "ALL" : "PRESENT")
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer border",
                  statusFilter === "PRESENT"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>มาเรียน ({counts.present})</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setStatusFilter(statusFilter === "LATE" ? "ALL" : "LATE")
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer border",
                  statusFilter === "LATE"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>มาสาย ({counts.late})</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setStatusFilter(statusFilter === "ABSENT" ? "ALL" : "ABSENT")
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

              <button
                type="button"
                onClick={() =>
                  setStatusFilter(statusFilter === "LEAVE" ? "ALL" : "LEAVE")
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer border",
                  statusFilter === "LEAVE"
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20"
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>ลา ({counts.leave})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isSavedRecently ? (
                <Badge variant="success" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  บันทึกข้อมูลล่าสุดแล้ว
                </Badge>
              ) : counts.recorded > 0 ? (
                <Badge variant="outline">
                  มีประวัติเช็คชื่อแล้ว {counts.recorded}/{counts.total} คน
                </Badge>
              ) : (
                <Badge variant="warning">
                  ยังไม่ได้บันทึกข้อมูลของวันนี้ (ค่าเริ่มต้น: มา)
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Row Grid (Desktop/Tablet) & Touch Card List (Mobile) */}
      <Card className="overflow-hidden">
        <div className="hidden sm:block border-b border-border/70 bg-muted/40 px-4 py-3 sm:px-6">
          <div className="grid grid-cols-12 items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-1">รหัส</div>
            <div className="col-span-4">ชื่อ - นามสกุล</div>
            <div className="col-span-1">ห้อง</div>
            <div className="col-span-4 text-center">
              สถานะการเข้าแถว [มา] [สาย] [ขาด] [ลา]
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
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Users className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-base font-medium">ไม่พบรายชื่อนักเรียนที่ตรงกับเงื่อนไข</p>
              <p className="text-xs mt-1">ลองเปลี่ยนห้องเรียนหรือล้างคำค้นหา</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              <AnimatePresence initial={false}>
                {filteredStudents.map((student, idx) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.25) }}
                    className={cn(
                      "flex flex-col gap-2.5 p-3.5 sm:grid sm:grid-cols-12 sm:items-center sm:gap-3 sm:px-6 sm:py-3.5 transition-colors",
                      student.status === "ABSENT"
                        ? "bg-rose-500/[0.04] hover:bg-rose-500/[0.08]"
                        : student.status === "LATE"
                        ? "bg-amber-500/[0.04] hover:bg-amber-500/[0.08]"
                        : "hover:bg-muted/30"
                    )}
                  >
                    {/* Mobile Top Row: Student ID + Full Name + Classroom Badge */}
                    <div className="flex items-center justify-between sm:contents">
                      <div className="flex items-center gap-2 sm:col-span-1">
                        <span className="font-mono text-xs sm:text-sm font-bold text-primary">
                          {student.studentId}
                        </span>
                      </div>

                      <div className="flex-1 px-2 sm:px-0 sm:col-span-4">
                        <p className="text-sm font-semibold sm:font-medium text-foreground truncate">
                          {student.fullName}
                        </p>
                      </div>

                      <div className="sm:col-span-1">
                        <Badge variant="secondary" className="text-xs font-medium">
                          {student.classroom}
                        </Badge>
                      </div>
                    </div>

                    {/* Quick Status Toggle Switches / Radios: [มา] [สาย] [ขาด] [ลา] */}
                    <div className="sm:col-span-4 flex items-center justify-center">
                      <div
                        role="radiogroup"
                        aria-label={`สถานะของ ${student.fullName}`}
                        className="grid grid-cols-4 gap-1.5 sm:gap-1 rounded-xl bg-muted/70 p-1 w-full sm:max-w-[270px]"
                      >
                        {STATUS_OPTIONS.map((opt) => {
                          const isSelected = student.status === opt.value;
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
                                "rounded-lg py-2 sm:py-1.5 px-2 text-xs font-semibold transition-all cursor-pointer border touch-manipulation",
                                isSelected
                                  ? opt.activeClass
                                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card/60"
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
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky Mobile Floating Action Bar for One-Thumb Saving on Phones */}
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
          <span>มาทุกคน</span>
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
    </div>
  );
}
