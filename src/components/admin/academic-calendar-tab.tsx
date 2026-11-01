"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Clock,
  Check,
  Save,
  RotateCcw,
  Sun,
  ShieldCheck,
  CalendarCheck,
  Tag,
  Info,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import {
  AcademicCalendarConfig,
  AcademicTerm,
  WeeklyDaysConfig,
  SpecialDateItem,
  SchoolDayKind,
} from "@/types/academic-calendar";
import {
  saveAcademicTermAction,
  setActiveTermAction,
  deleteAcademicTermAction,
  saveWeeklyScheduleAction,
  addSpecialDateAction,
  deleteSpecialDateAction,
} from "@/actions/academic-calendar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AcademicCalendarTabProps {
  initialConfig: AcademicCalendarConfig;
  onConfigChange?: (newConfig: AcademicCalendarConfig) => void;
}

const DAY_LABELS = [
  { index: 0, thName: "วันอาทิตย์", shortName: "อา.", bg: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25", dot: "bg-rose-500" },
  { index: 1, thName: "วันจันทร์", shortName: "จ.", bg: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25", dot: "bg-amber-400" },
  { index: 2, thName: "วันอังคาร", shortName: "อ.", bg: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/25", dot: "bg-pink-400" },
  { index: 3, thName: "วันพุธ", shortName: "พ.", bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25", dot: "bg-emerald-500" },
  { index: 4, thName: "วันพฤหัสบดี", shortName: "พฤ.", bg: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25", dot: "bg-orange-400" },
  { index: 5, thName: "วันศุกร์", shortName: "ศ.", bg: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25", dot: "bg-sky-400" },
  { index: 6, thName: "วันเสาร์", shortName: "ส.", bg: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25", dot: "bg-purple-400" },
];

function formatThaiDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = format(d, "MMMM", { locale: th });
    const year = d.getFullYear() + 543;
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

export function AcademicCalendarTab({
  initialConfig,
  onConfigChange,
}: AcademicCalendarTabProps) {
  const [config, setConfig] = React.useState<AcademicCalendarConfig>(initialConfig);
  const [selectedTermId, setSelectedTermId] = React.useState<string>(
    initialConfig.activeTermId || initialConfig.terms[0]?.id || ""
  );

  // รายการปีการศึกษาทั้งหมด (เรียงจากล่าสุดไปเก่าสุด)
  const availableYears = React.useMemo(() => {
    const set = new Set(config.terms.map((t) => t.academicYear));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [config.terms]);

  const [selectedYearFilter, setSelectedYearFilter] = React.useState<string>("ALL");

  // กรองเทอมตามปีที่เลือก (หรือทั้งหมด)
  const filteredTerms = React.useMemo(() => {
    if (selectedYearFilter === "ALL") return config.terms;
    return config.terms.filter((t) => t.academicYear === selectedYearFilter);
  }, [config.terms, selectedYearFilter]);

  // Ref สำหรับเลื่อนแถบเทอมซ้าย-ขวา
  const tabsScrollRef = React.useRef<HTMLDivElement>(null);
  const scrollTabs = (direction: "left" | "right") => {
    if (tabsScrollRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      tabsScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // หาเทอมที่กำลังเลือกดู
  const currentTerm = React.useMemo(() => {
    return (
      config.terms.find((t) => t.id === selectedTermId) ??
      config.terms.find((t) => t.isActive) ??
      config.terms[0]
    );
  }, [config, selectedTermId]);

  // Local state สำหรับตาราง 7 วัน
  const [weeklyDays, setWeeklyDays] = React.useState<WeeklyDaysConfig>(
    currentTerm?.weeklyDays || {
      0: "WEEKEND",
      1: "REQUIRED",
      2: "REQUIRED",
      3: "MAKEUP_HOLIDAY",
      4: "MAKEUP_HOLIDAY",
      5: "REQUIRED",
      6: "WEEKEND",
    }
  );

  // อัปเดต weeklyDays เมื่อสลับเทอม
  React.useEffect(() => {
    if (currentTerm?.weeklyDays) {
      setWeeklyDays({ ...currentTerm.weeklyDays });
    }
  }, [currentTerm]);

  const [isSavingWeekly, setIsSavingWeekly] = React.useState(false);

  // Term Modal States
  const [isTermModalOpen, setIsTermModalOpen] = React.useState(false);
  const [editingTerm, setEditingTerm] = React.useState<AcademicTerm | null>(null);
  const [termFormData, setTermFormData] = React.useState({
    name: "",
    academicYear: "",
    startDateIso: "",
    endDateIso: "",
    isActive: false,
    note: "",
  });
  const [isSavingTerm, setIsSavingTerm] = React.useState(false);

  // Special Date Modal States
  const [isSpecialModalOpen, setIsSpecialModalOpen] = React.useState(false);
  const [specialFormData, setSpecialFormData] = React.useState<{
    dateIso: string;
    title: string;
    kind: SchoolDayKind;
  }>({
    dateIso: new Date().toISOString().slice(0, 10),
    title: "",
    kind: "WEEKEND",
  });
  const [isSavingSpecial, setIsSavingSpecial] = React.useState(false);

  // Delete Term Dialog
  const [termToDelete, setTermToDelete] = React.useState<AcademicTerm | null>(null);
  const [isDeletingTerm, setIsDeletingTerm] = React.useState(false);

  // Thai Calendar Popover States
  const [isStartPickerOpen, setIsStartPickerOpen] = React.useState(false);
  const [isEndPickerOpen, setIsEndPickerOpen] = React.useState(false);
  const [isSpecialPickerOpen, setIsSpecialPickerOpen] = React.useState(false);

  const formatThaiDisplay = (isoStr?: string | null): string => {
    if (!isoStr) return "";
    try {
      const d = parseISO(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const bYear = d.getFullYear() + 543;
      return `${format(d, "d MMM", { locale: th })} ${bYear}`;
    } catch {
      return isoStr || "";
    }
  };

  // นับสถิติตารางสัปดาห์
  const weeklyCounts = React.useMemo(() => {
    let required = 0;
    let makeup = 0;
    let weekend = 0;
    for (let i = 0; i < 7; i++) {
      const k = weeklyDays[i as keyof WeeklyDaysConfig];
      if (k === "REQUIRED") required++;
      else if (k === "MAKEUP_HOLIDAY") makeup++;
      else weekend++;
    }
    return { required, makeup, weekend };
  }, [weeklyDays]);

  // ตรวจสอบว่ามีการเปลี่ยนแปลงตารางประจำสัปดาห์ที่ยังไม่ได้บันทึกหรือไม่
  const hasWeeklyChanges = React.useMemo(() => {
    if (!currentTerm?.weeklyDays) return false;
    for (let i = 0; i < 7; i++) {
      const idx = i as keyof WeeklyDaysConfig;
      if (weeklyDays[idx] !== currentTerm.weeklyDays[idx]) return true;
    }
    return false;
  }, [weeklyDays, currentTerm]);

  // Handle Save Weekly Schedule
  const handleSaveWeeklySchedule = async () => {
    if (!currentTerm) return;
    setIsSavingWeekly(true);
    try {
      const res = await saveWeeklyScheduleAction(currentTerm.id, weeklyDays);
      if (res.success && res.data) {
        setConfig(res.data);
        onConfigChange?.(res.data);
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      console.error("Save weekly error:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกตารางสัปดาห์");
    } finally {
      setIsSavingWeekly(false);
    }
  };

  // Reset Weekly Schedule
  const handleResetWeeklySchedule = () => {
    if (currentTerm?.weeklyDays) {
      setWeeklyDays({ ...currentTerm.weeklyDays });
      toast.info("คืนค่าตารางสัปดาห์ตามที่บันทึกไว้ล่าสุด");
    }
  };

  // Set Term as Active
  const handleSetActiveTerm = async (termId: string) => {
    try {
      const res = await setActiveTermAction(termId);
      if (res.success && res.data) {
        setConfig(res.data);
        setSelectedTermId(termId);
        onConfigChange?.(res.data);
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเปลี่ยนภาคเรียน");
    }
  };

  // Open Term Modal (Create or Edit)
  const handleOpenTermModal = (term?: AcademicTerm) => {
    if (term) {
      setEditingTerm(term);
      setTermFormData({
        name: term.name,
        academicYear: term.academicYear,
        startDateIso: term.startDateIso,
        endDateIso: term.endDateIso,
        isActive: term.isActive,
        note: term.note || "",
      });
    } else {
      setEditingTerm(null);
      const currentYear = (new Date().getFullYear() + 543).toString();
      setTermFormData({
        name: `ภาคเรียนที่ ${config.terms.length + 1}/${currentYear}`,
        academicYear: currentYear,
        startDateIso: new Date().toISOString().slice(0, 10),
        endDateIso: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        isActive: config.terms.length === 0,
        note: "",
      });
    }
    setIsTermModalOpen(true);
  };

  // Save Term (Create or Edit)
  const handleSaveTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termFormData.name.trim()) {
      toast.error("กรุณาระบุชื่อภาคเรียน เช่น ภาคเรียนที่ 1/2569");
      return;
    }
    if (!termFormData.startDateIso || !termFormData.endDateIso) {
      toast.error("กรุณาระบุช่วงวันที่เริ่มต้นและสิ้นสุดภาคเรียน");
      return;
    }

    setIsSavingTerm(true);
    try {
      const res = await saveAcademicTermAction({
        id: editingTerm?.id,
        name: termFormData.name,
        academicYear: termFormData.academicYear,
        startDateIso: termFormData.startDateIso,
        endDateIso: termFormData.endDateIso,
        isActive: termFormData.isActive,
        note: termFormData.note,
      });

      if (res.success && res.data) {
        setConfig(res.data);
        if (res.data.activeTermId) {
          setSelectedTermId(res.data.activeTermId);
        }
        onConfigChange?.(res.data);
        toast.success(res.message);
        setIsTermModalOpen(false);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการบันทึกภาคเรียน");
    } finally {
      setIsSavingTerm(false);
    }
  };

  // Confirm Delete Term
  const handleDeleteTermConfirm = async () => {
    if (!termToDelete) return;
    setIsDeletingTerm(true);
    try {
      const res = await deleteAcademicTermAction(termToDelete.id);
      if (res.success && res.data) {
        setConfig(res.data);
        setSelectedTermId(res.data.activeTermId);
        onConfigChange?.(res.data);
        toast.success(res.message);
        setTermToDelete(null);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการลบภาคเรียน");
    } finally {
      setIsDeletingTerm(false);
    }
  };

  // Add Special Date
  const handleSaveSpecialDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTerm) return;
    if (!specialFormData.title.trim()) {
      toast.error("กรุณาระบุชื่อวันหยุดหรือกิจกรรมพิเศษ");
      return;
    }
    if (!specialFormData.dateIso) {
      toast.error("กรุณาเลือกวันที่");
      return;
    }

    setIsSavingSpecial(true);
    try {
      const res = await addSpecialDateAction(currentTerm.id, {
        dateIso: specialFormData.dateIso,
        title: specialFormData.title,
        kind: specialFormData.kind,
      });

      if (res.success && res.data) {
        setConfig(res.data);
        onConfigChange?.(res.data);
        toast.success(res.message);
        setIsSpecialModalOpen(false);
        setSpecialFormData({
          dateIso: new Date().toISOString().slice(0, 10),
          title: "",
          kind: "WEEKEND",
        });
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเพิ่มวันพิเศษ");
    } finally {
      setIsSavingSpecial(false);
    }
  };

  // Delete Special Date
  const handleDeleteSpecialDate = async (specialId: string) => {
    if (!currentTerm) return;
    try {
      const res = await deleteSpecialDateAction(currentTerm.id, specialId);
      if (res.success && res.data) {
        setConfig(res.data);
        onConfigChange?.(res.data);
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการลบวันพิเศษ");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-teal-500/25 bg-gradient-to-br from-card via-card to-teal-500/[0.04] p-5 sm:p-6 shadow-xl backdrop-blur-xl">
        <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-teal-500/60 to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs shrink-0 ring-1 ring-teal-500/30">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                  จัดการวันมาและวันหยุด (Term & Calendar Rules)
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/25">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Real-time Sync ⚡</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                กำหนดตารางวันเข้าแถวหลัก (3 วัน) วันหยุด/คลินิกแก้แถว (2 วัน) และวันหยุดพิเศษ โดยฟิกตามภาคเรียนเพื่อความต่อเนื่อง
              </p>
            </div>
          </div>

          <Button
            onClick={() => handleOpenTermModal()}
            className="h-10 px-4 rounded-xl font-black bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-md shadow-teal-600/25 cursor-pointer gap-2 shrink-0 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มภาคเรียนใหม่</span>
          </Button>
        </div>
      </div>

      {/* Term Selector Tabs & Year Management */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-4 w-4 text-teal-600" />
            <span className="text-xs font-black tracking-wider uppercase text-muted-foreground">
              เลือกภาคเรียนการศึกษา (Term Select)
            </span>
            <span className="text-[11.5px] text-muted-foreground font-semibold">
              ({config.terms.length} ภาคเรียน • {availableYears.length} ปีการศึกษา)
            </span>
          </div>

          {/* Quick Jump & Select Controls */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {/* Quick Jump to Active Term */}
            {config.activeTermId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTermId(config.activeTermId);
                  const activeTermObj = config.terms.find(
                    (t) => t.id === config.activeTermId
                  );
                  if (
                    activeTermObj &&
                    selectedYearFilter !== "ALL" &&
                    selectedYearFilter !== activeTermObj.academicYear
                  ) {
                    setSelectedYearFilter("ALL");
                  }
                }}
                className="h-8 px-2.5 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="กระโดดไปที่ภาคเรียนปัจจุบันทันที"
              >
                <Sparkles className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                <span>ไปที่เทอมปัจจุบัน</span>
              </button>
            )}

            {/* Quick Dropdown Select by Academic Year */}
            <div className="relative">
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="h-8 rounded-xl border border-border/80 bg-card px-2.5 text-xs font-bold text-foreground hover:bg-muted/50 cursor-pointer shadow-2xs focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {availableYears.map((yr) => (
                  <optgroup key={yr} label={`ปีการศึกษา ${yr}`}>
                    {config.terms
                      .filter((t) => t.academicYear === yr)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.isActive ? "🌟 (ปัจจุบัน)" : ""}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Scroll Navigation Arrows */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollTabs("left")}
                className="h-8 w-8 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-colors cursor-pointer shadow-2xs"
                aria-label="เลื่อนซ้าย"
                title="เลื่อนซ้าย"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollTabs("right")}
                className="h-8 w-8 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-colors cursor-pointer shadow-2xs"
                aria-label="เลื่อนขวา"
                title="เลื่อนขวา"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Academic Year Filter Pills (แสดงเมื่อมีหลายปีการศึกษา หรือเทอมเพิ่มขึ้น) */}
        {availableYears.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 shrink-0 mr-1">
              <Filter className="h-3 w-3 text-teal-600" />
              กรองตามปีการศึกษา:
            </span>
            <button
              type="button"
              onClick={() => setSelectedYearFilter("ALL")}
              className={cn(
                "h-7 px-3 rounded-full text-[11px] font-bold transition-all shrink-0 cursor-pointer border",
                selectedYearFilter === "ALL"
                  ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                  : "bg-card hover:bg-muted text-muted-foreground border-border/80"
              )}
            >
              ทั้งหมด ({config.terms.length})
            </button>
            {availableYears.map((yr) => {
              const countInYear = config.terms.filter(
                (t) => t.academicYear === yr
              ).length;
              const hasActiveInYear = config.terms.some(
                (t) => t.academicYear === yr && t.isActive
              );
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYearFilter(yr)}
                  className={cn(
                    "h-7 px-3 rounded-full text-[11px] font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5",
                    selectedYearFilter === yr
                      ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                      : "bg-card hover:bg-muted text-muted-foreground border-border/80"
                  )}
                >
                  <span>ปี {yr}</span>
                  <span className="text-[10px] opacity-75">({countInYear})</span>
                  {hasActiveInYear && <span className="text-[10px]">⭐</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Horizontal Scrollable Tabs */}
        <div
          ref={tabsScrollRef}
          className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-teal-500/20 scroll-smooth"
        >
          {filteredTerms.map((term) => {
            const isSelected = term.id === selectedTermId;
            return (
              <button
                key={term.id}
                type="button"
                onClick={() => setSelectedTermId(term.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all shrink-0 cursor-pointer text-left shadow-2xs",
                  isSelected
                    ? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 ring-2 ring-teal-500/30"
                    : "bg-card text-foreground hover:bg-muted/70 border-border/80"
                )}
              >
                <CalendarCheck
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isSelected ? "text-white" : "text-teal-600"
                  )}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black">{term.name}</span>
                    {term.isActive && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded-md text-[9.5px] font-black uppercase tracking-wider",
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        )}
                      >
                        🌟 กำลังใช้งาน
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-[10.5px] mt-0.5",
                      isSelected ? "text-teal-100" : "text-muted-foreground"
                    )}
                  >
                    ปี {term.academicYear} • {formatThaiDisplay(term.startDateIso)} ถึง{" "}
                    {formatThaiDisplay(term.endDateIso)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {currentTerm && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Term Overview & Special Dates (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Term Summary Card */}
            <Card className="rounded-3xl border-border/70 shadow-lg bg-card overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4 border-b border-border/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-black text-foreground">
                        {currentTerm.name}
                      </CardTitle>
                      {currentTerm.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <Check className="h-3 w-3" />
                          <span>เทอมปัจจุบัน</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-muted text-muted-foreground border">
                          เทอมทั่วไป
                        </span>
                      )}
                    </div>
                    <CardDescription className="text-xs mt-1">
                      ปีการศึกษา {currentTerm.academicYear} • ตั้งค่าเป็นฐานข้อมูลหลักของระบบ
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenTermModal(currentTerm)}
                      className="h-8 w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="แก้ไขข้อมูลภาคเรียน"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {config.terms.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTermToDelete(currentTerm)}
                        className="h-8 w-8 p-0 rounded-xl hover:bg-rose-500/15 text-muted-foreground hover:text-rose-600 cursor-pointer"
                        title="ลบภาคเรียนนี้"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                    <span className="text-[10.5px] text-muted-foreground font-medium block">
                      วันที่เริ่มต้นเทอม
                    </span>
                    <p className="text-sm font-black text-foreground">
                      {formatThaiDateDisplay(currentTerm.startDateIso)}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                    <span className="text-[10.5px] text-muted-foreground font-medium block">
                      วันที่สิ้นสุดเทอม
                    </span>
                    <p className="text-sm font-black text-foreground">
                      {formatThaiDateDisplay(currentTerm.endDateIso)}
                    </p>
                  </div>
                </div>

                {currentTerm.note && (
                  <div className="p-3 rounded-2xl bg-teal-500/[0.06] border border-teal-500/20 text-xs text-teal-800 dark:text-teal-300">
                    <div className="flex items-center gap-1.5 font-bold mb-0.5">
                      <Info className="h-3.5 w-3.5 text-teal-600" />
                      <span>หมายเหตุประจำเทอม:</span>
                    </div>
                    <p className="text-[11.5px] leading-relaxed">{currentTerm.note}</p>
                  </div>
                )}

                {!currentTerm.isActive ? (
                  <Button
                    onClick={() => handleSetActiveTerm(currentTerm.id)}
                    className="w-full min-h-[46px] py-2.5 px-3 rounded-2xl font-black bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 hover:from-teal-500 hover:via-emerald-500 hover:to-teal-500 text-white shadow-md hover:shadow-lg hover:shadow-teal-600/20 cursor-pointer gap-2 text-xs sm:text-sm transition-all border border-teal-400/30 whitespace-normal text-center leading-snug flex items-center justify-center"
                  >
                    <Sparkles className="h-4 w-4 text-amber-300 shrink-0 animate-pulse" />
                    <span>ตั้ง "{currentTerm.name}" เป็นเทอมปัจจุบัน</span>
                  </Button>
                ) : (
                  <div className="w-full py-2.5 px-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center gap-2 text-xs font-black text-teal-800 dark:text-teal-300 text-center">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                    <span>⭐ ภาคเรียนนี้กำลังเปิดใช้งานเป็นเทอมหลัก</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Special Dates Overrides Card */}
            <Card className="rounded-3xl border-border/70 shadow-lg bg-card overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <CardTitle className="text-sm font-black text-foreground">
                      วันหยุดพิเศษ & วันคลินิกเฉพาะกิจ
                    </CardTitle>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsSpecialModalOpen(true)}
                    className="h-8 px-3 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs cursor-pointer gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>เพิ่มวันพิเศษ</span>
                  </Button>
                </div>
                <CardDescription className="text-xs mt-1">
                  กำหนดวันหยุดนักขัตฤกษ์ หรือวันเปิดคลินิกแก้แถวเฉพาะวันที่ระบุในปฏิทิน
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-2.5">
                {!currentTerm.specialDates || currentTerm.specialDates.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground space-y-2">
                    <Sun className="h-8 w-8 mx-auto text-muted-foreground/40" />
                    <p className="text-xs font-bold">ยังไม่มีวันหยุดพิเศษในภาคเรียนนี้</p>
                    <p className="text-[11px] text-muted-foreground/75">
                      สามารถกดปุ่ม "เพิ่มวันพิเศษ" ด้านบน เพื่อระบุวันหยุดนักขัตฤกษ์ หรือวันคลินิกพิเศษ
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 max-h-[340px] overflow-y-auto pr-1">
                    {currentTerm.specialDates.map((item) => {
                      const isRequired = item.kind === "REQUIRED";
                      const isMakeup = item.kind === "MAKEUP_HOLIDAY";
                      return (
                        <div
                          key={item.id}
                          className="py-2.5 flex items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-foreground">
                                {formatThaiDateDisplay(item.dateIso)}
                              </span>
                              <span
                                className={cn(
                                  "px-2 py-0.2 rounded-md text-[10px] font-black border",
                                  isRequired
                                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                                    : isMakeup
                                    ? "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30"
                                    : "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30"
                                )}
                              >
                                {isRequired
                                  ? "วันมาแถวพิเศษ"
                                  : isMakeup
                                  ? "คลินิกแก้แถวพิเศษ"
                                  : "วันหยุดพิเศษ"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {item.title}
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSpecialDate(item.id)}
                            className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/15 cursor-pointer opacity-70 group-hover:opacity-100 transition-opacity"
                            title="ลบวันพิเศษนี้"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Weekly Schedule 7-Day Matrix (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="rounded-3xl border-teal-500/30 shadow-xl bg-card overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-teal-500/[0.08] via-emerald-500/[0.05] to-card border-b border-border/70 p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-teal-600" />
                      <CardTitle className="text-base sm:text-lg font-black text-foreground">
                        ตารางวันเข้าแถว & วันหยุดประจำสัปดาห์
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-1">
                      หลักการเดิม: มาแถว 3 วัน (จันทร์, อังคาร, ศุกร์) และหยุด/คลินิกแก้แถว 2 วัน (พุธ, พฤหัสบดี) — เปลี่ยนแปลงได้ตลอดเวลา
                    </CardDescription>
                  </div>

                  {/* Summary Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>มาแถว {weeklyCounts.required} วัน</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      <span>หยุด/คลินิก {weeklyCounts.makeup} วัน</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-muted text-muted-foreground border">
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      <span>สุดสัปดาห์ {weeklyCounts.weekend} วัน</span>
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* 7 Days Matrix List */}
                <div className="space-y-2.5">
                  {DAY_LABELS.map((day) => {
                    const currentKind = weeklyDays[day.index as keyof WeeklyDaysConfig];

                    return (
                      <div
                        key={day.index}
                        className={cn(
                          "p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                          currentKind === "REQUIRED"
                            ? "bg-emerald-500/[0.04] border-emerald-500/30"
                            : currentKind === "MAKEUP_HOLIDAY"
                            ? "bg-purple-500/[0.04] border-purple-500/30"
                            : "bg-muted/30 border-border/70"
                        )}
                      >
                        {/* Day Name & Indicator */}
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs border shadow-2xs shrink-0",
                              day.bg
                            )}
                          >
                            {day.shortName}
                          </span>
                          <div>
                            <span className="font-black text-sm text-foreground block">
                              {day.thName}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium">
                              {currentKind === "REQUIRED" && "🟢 วันบังคับเข้าแถวปกติ (นักเรียนทุกคน)"}
                              {currentKind === "MAKEUP_HOLIDAY" && "🟣 วันหยุดปกติ / รอบคลินิกนัดแก้แถว"}
                              {currentKind === "WEEKEND" && "⚪ วันหยุดสุดสัปดาห์ (ไม่มีการเช็คชื่อ)"}
                            </span>
                          </div>
                        </div>

                        {/* Segmented Button Group to choose Day Status */}
                        <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setWeeklyDays((prev) => ({
                                ...prev,
                                [day.index]: "REQUIRED",
                              }));
                            }}
                            className={cn(
                              "px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer text-center",
                              currentKind === "REQUIRED"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                            )}
                          >
                            มาแถว
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setWeeklyDays((prev) => ({
                                ...prev,
                                [day.index]: "MAKEUP_HOLIDAY",
                              }));
                            }}
                            className={cn(
                              "px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer text-center",
                              currentKind === "MAKEUP_HOLIDAY"
                                ? "bg-purple-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                            )}
                          >
                            หยุด/คลินิก
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setWeeklyDays((prev) => ({
                                ...prev,
                                [day.index]: "WEEKEND",
                              }));
                            }}
                            className={cn(
                              "px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer text-center",
                              currentKind === "WEEKEND"
                                ? "bg-slate-700 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                            )}
                          >
                            สุดสัปดาห์
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Save Bar & Notification */}
                <div className="pt-3 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {hasWeeklyChanges ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4" />
                        <span>มีการเปลี่ยนแปลงตารางที่ยังไม่ได้บันทึก</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>ตารางสัปดาห์ซิงค์ตรงกับฐานข้อมูลแล้ว</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {hasWeeklyChanges && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetWeeklySchedule}
                        className="h-10 px-3 rounded-xl font-bold cursor-pointer gap-1.5 text-xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>ยกเลิก</span>
                      </Button>
                    )}

                    <Button
                      disabled={isSavingWeekly || !hasWeeklyChanges}
                      onClick={handleSaveWeeklySchedule}
                      className="h-10 px-5 rounded-xl font-black bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-md shadow-teal-600/25 cursor-pointer gap-2 text-xs"
                    >
                      <Save className="h-4 w-4" />
                      <span>{isSavingWeekly ? "กำลังบันทึก..." : "บันทึกตารางประจำสัปดาห์"}</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL 1: Create / Edit Academic Term */}
      <Dialog open={isTermModalOpen} onOpenChange={setIsTermModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-teal-600" />
              <span>{editingTerm ? "แก้ไขภาคเรียนการศึกษา" : "เพิ่มภาคเรียนการศึกษาใหม่"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              กำหนดชื่อภาคเรียน ปีการศึกษา และกรอบวันที่เพื่อใช้เป็นตัวฟิกหลักของระบบ
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTerm} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-foreground">
                ชื่อภาคเรียน <span className="text-rose-500">*</span>
              </label>
              <Input
                value={termFormData.name}
                onChange={(e) => setTermFormData({ ...termFormData, name: e.target.value })}
                placeholder="เช่น ภาคเรียนที่ 1/2569"
                required
                className="rounded-xl h-10 text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-foreground">
                ปีการศึกษา (พ.ศ.) <span className="text-rose-500">*</span>
              </label>
              <Input
                value={termFormData.academicYear}
                onChange={(e) => setTermFormData({ ...termFormData, academicYear: e.target.value })}
                placeholder="เช่น 2569"
                required
                className="rounded-xl h-10 text-xs font-bold font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-foreground">
                  วันที่เริ่มต้นเทอม <span className="text-rose-500">*</span>
                </label>
                <Popover open={isStartPickerOpen} onOpenChange={setIsStartPickerOpen}>
                  <PopoverTrigger
                    type="button"
                    className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors cursor-pointer text-left shadow-2xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <CalendarDays className="h-4 w-4 text-teal-600 shrink-0" />
                      <span className="truncate">
                        {termFormData.startDateIso
                          ? formatThaiDisplay(termFormData.startDateIso)
                          : "เลือกวันที่ (ปฏิทินไทย)"}
                      </span>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    side="bottom"
                    sideOffset={8}
                    className="w-auto p-2 rounded-3xl shadow-2xl border border-border/80 bg-popover z-[100]"
                  >
                    <Calendar
                      variant="term"
                      mode="single"
                      selected={termFormData.startDateIso ? parseISO(termFormData.startDateIso) : undefined}
                      onSelect={(day) => {
                        if (day) {
                          setTermFormData((prev) => ({
                            ...prev,
                            startDateIso: format(day, "yyyy-MM-dd"),
                          }));
                          setIsStartPickerOpen(false);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-foreground">
                  วันที่สิ้นสุดเทอม <span className="text-rose-500">*</span>
                </label>
                <Popover open={isEndPickerOpen} onOpenChange={setIsEndPickerOpen}>
                  <PopoverTrigger
                    type="button"
                    className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors cursor-pointer text-left shadow-2xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <CalendarDays className="h-4 w-4 text-teal-600 shrink-0" />
                      <span className="truncate">
                        {termFormData.endDateIso
                          ? formatThaiDisplay(termFormData.endDateIso)
                          : "เลือกวันที่ (ปฏิทินไทย)"}
                      </span>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    side="bottom"
                    sideOffset={8}
                    className="w-auto p-2 rounded-3xl shadow-2xl border border-border/80 bg-popover z-[100]"
                  >
                    <Calendar
                      variant="term"
                      mode="single"
                      selected={termFormData.endDateIso ? parseISO(termFormData.endDateIso) : undefined}
                      onSelect={(day) => {
                        if (day) {
                          setTermFormData((prev) => ({
                            ...prev,
                            endDateIso: format(day, "yyyy-MM-dd"),
                          }));
                          setIsEndPickerOpen(false);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-foreground">
                หมายเหตุเพิ่มเติม (ถ้ามี)
              </label>
              <Input
                value={termFormData.note}
                onChange={(e) => setTermFormData({ ...termFormData, note: e.target.value })}
                placeholder="เช่น ตารางปกติ / เปิดเทอมใหม่"
                className="rounded-xl h-10 text-xs"
              />
            </div>

            {/* Active Term Selector Box - High Prominence */}
            <div
              onClick={() =>
                setTermFormData({
                  ...termFormData,
                  isActive: !termFormData.isActive,
                })
              }
              className={cn(
                "relative p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer select-none",
                termFormData.isActive
                  ? "bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-teal-500/15 border-teal-500 shadow-md ring-2 ring-teal-500/20"
                  : "bg-muted/40 border-border/80 hover:bg-muted/70 hover:border-muted-foreground/30"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors shadow-2xs",
                      termFormData.isActive
                        ? "bg-teal-600 text-white shadow-teal-600/30"
                        : "bg-muted border border-border text-muted-foreground"
                    )}
                  >
                    <Sparkles
                      className={cn(
                        "h-5 w-5",
                        termFormData.isActive && "animate-pulse text-amber-300"
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-foreground">
                        ตั้งเป็นภาคเรียนปัจจุบันทันที (Active Term)
                      </span>
                      {termFormData.isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                          ⭐ จะมีผลทันทีทั้งระบบ
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                      {termFormData.isActive
                        ? "เมื่อบันทึก ทุกหน้าต่างในระบบ (เช็คชื่อ, ปฏิทิน, คลินิกแก้แถว) จะเริ่มใช้ตารางสัปดาห์และเกณฑ์ของเทอมนี้เป็นหลักทันที"
                        : "คลิกเปิดเพื่อให้ระบบใช้ตารางและเกณฑ์ของภาคเรียนนี้เป็นหลักทันที"}
                    </p>
                  </div>
                </div>

                {/* Modern Toggle Switch */}
                <div
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-1",
                    termFormData.isActive ? "bg-teal-600" : "bg-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                      termFormData.isActive ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTermModalOpen(false)}
                className="rounded-xl h-10 font-bold cursor-pointer"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={isSavingTerm}
                className={cn(
                  "rounded-xl h-10 font-black text-white cursor-pointer transition-all shadow-md",
                  termFormData.isActive
                    ? "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 ring-2 ring-teal-500/30"
                    : "bg-teal-600 hover:bg-teal-500"
                )}
              >
                {isSavingTerm
                  ? "กำลังบันทึก..."
                  : termFormData.isActive
                  ? "✨ บันทึกและเปิดใช้งานทันที"
                  : "บันทึกภาคเรียน"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Add Special Date Override */}
      <Dialog open={isSpecialModalOpen} onOpenChange={setIsSpecialModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <span>เพิ่มวันพิเศษในปฏิทิน</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              ระบุวันหยุดนักขัตฤกษ์ วันหยุดสถานศึกษา หรือเปิดคลินิกแก้แถวเฉพาะกิจ
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSpecialDate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-foreground">
                วันที่ <span className="text-rose-500">*</span>
              </label>
              <Popover open={isSpecialPickerOpen} onOpenChange={setIsSpecialPickerOpen}>
                <PopoverTrigger
                  type="button"
                  className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors cursor-pointer text-left shadow-2xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <CalendarDays className="h-4 w-4 text-purple-600 shrink-0" />
                    <span className="truncate">
                      {specialFormData.dateIso
                        ? formatThaiDisplay(specialFormData.dateIso)
                        : "เลือกวันที่ (ปฏิทินไทย)"}
                    </span>
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="bottom"
                  sideOffset={8}
                  className="w-auto p-2 rounded-3xl shadow-2xl border border-border/80 bg-popover z-[100]"
                >
                  <Calendar
                    variant="term"
                    mode="single"
                    selected={specialFormData.dateIso ? parseISO(specialFormData.dateIso) : undefined}
                    onSelect={(day) => {
                      if (day) {
                        setSpecialFormData((prev) => ({
                          ...prev,
                          dateIso: format(day, "yyyy-MM-dd"),
                        }));
                        setIsSpecialPickerOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-foreground">
                ชื่อกิจกรรม / วันหยุด <span className="text-rose-500">*</span>
              </label>
              <Input
                value={specialFormData.title}
                onChange={(e) => setSpecialFormData({ ...specialFormData, title: e.target.value })}
                placeholder="เช่น วันปิยมหาราช, วันเปิดคลินิกพิเศษรอบบ่าย"
                required
                className="rounded-xl h-10 text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-foreground">
                ประเภทของวัน <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSpecialFormData({ ...specialFormData, kind: "WEEKEND" })}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer",
                    specialFormData.kind === "WEEKEND"
                      ? "bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20"
                      : "bg-card hover:bg-muted text-muted-foreground border-border"
                  )}
                >
                  <Sun className="h-4 w-4 mx-auto mb-1 text-rose-500" />
                  <span>วันหยุดพิเศษ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSpecialFormData({ ...specialFormData, kind: "MAKEUP_HOLIDAY" })}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer",
                    specialFormData.kind === "MAKEUP_HOLIDAY"
                      ? "bg-purple-500/15 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20"
                      : "bg-card hover:bg-muted text-muted-foreground border-border"
                  )}
                >
                  <Sparkles className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                  <span>คลินิกแก้แถว</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSpecialFormData({ ...specialFormData, kind: "REQUIRED" })}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer",
                    specialFormData.kind === "REQUIRED"
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                      : "bg-card hover:bg-muted text-muted-foreground border-border"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                  <span>มาแถวพิเศษ</span>
                </button>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSpecialModalOpen(false)}
                className="rounded-xl h-10 font-bold cursor-pointer"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={isSavingSpecial}
                className="rounded-xl h-10 font-black bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
              >
                {isSavingSpecial ? "กำลังบันทึก..." : "เพิ่มวันพิเศษ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Confirm Delete Term */}
      <Dialog open={Boolean(termToDelete)} onOpenChange={() => setTermToDelete(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center mb-2 mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-foreground">
              ยืนยันการลบภาคเรียน
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              ต้องการลบ "{termToDelete?.name}" ออกจากระบบหรือไม่? การกระทำนี้ไม่สามารถกู้คืนได้
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTermToDelete(null)}
              className="rounded-xl h-10 font-bold cursor-pointer"
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              disabled={isDeletingTerm}
              onClick={handleDeleteTermConfirm}
              className="rounded-xl h-10 font-black bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
            >
              {isDeletingTerm ? "กำลังลบ..." : "ยืนยันการลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
