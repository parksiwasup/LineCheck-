"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  Sparkles,
  Loader2,
  Check,
  CalendarCheck,
  Info,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import {
  getStudentClinicMakeupInfoAction,
  submitClinicMakeupAction,
  cancelClinicMakeupAction,
  type StudentClinicMakeupInfo,
} from "@/actions/remedial";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RemedialClinicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentIdOrCode: string | null;
  initialTargetDateIso?: string | null;
  onSuccess?: () => void;
}

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const currentBaseYear = new Date().getFullYear();
const YEAR_OPTIONS = [
  currentBaseYear - 1,
  currentBaseYear,
  currentBaseYear + 1,
  currentBaseYear + 2,
];

export function RemedialClinicDialog({
  open,
  onOpenChange,
  studentIdOrCode,
  initialTargetDateIso,
  onSuccess,
}: RemedialClinicDialogProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [data, setData] = React.useState<StudentClinicMakeupInfo | null>(null);
  const [selectedTargetDate, setSelectedTargetDate] = React.useState<string>(
    initialTargetDateIso ?? ""
  );
  const [selectedClinicDate, setSelectedClinicDate] = React.useState<string>("");
  const [clinicNote, setClinicNote] = React.useState<string>("");

  const [clinicYear, setClinicYear] = React.useState<number>(currentBaseYear);
  const [clinicMonth, setClinicMonth] = React.useState<number>(new Date().getMonth() + 1);

  const loadData = React.useCallback(
    async (studCode: string, targetIso?: string, year?: number, month?: number) => {
      setIsLoading(true);
      try {
        const res = await getStudentClinicMakeupInfoAction(
          studCode,
          targetIso,
          year,
          month
        );
        if (res.success && res.data) {
          setData(res.data);
          setClinicYear(res.data.activeClinicYear);
          setClinicMonth(res.data.activeClinicMonth);

          const activeDate =
            targetIso ?? res.data.targetAbsence?.dateIso ?? res.data.allAbsences[0]?.dateIso ?? "";
          setSelectedTargetDate(activeDate);

          // หา clinic date เริ่มต้นที่จับคู่อยู่แล้ว หรือวันแรกของรอบสัปดาห์
          const matchingClinic = res.data.clinicDates.find(
            (c) => c.remediesDateIso === activeDate || c.isRemedyingTarget
          );
          if (matchingClinic) {
            setSelectedClinicDate(matchingClinic.dateIso);
          } else {
            const firstAvailable =
              res.data.clinicDates.find((c) => c.isSameWeek) ?? res.data.clinicDates[0];
            setSelectedClinicDate(firstAvailable?.dateIso ?? "");
          }
        } else {
          toast.error(res.message ?? "ไม่สามารถดึงข้อมูลคลินิกแก้แถวได้");
        }
      } catch (err) {
        console.error(err);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    if (open && studentIdOrCode) {
      loadData(studentIdOrCode, initialTargetDateIso ?? undefined);
    }
  }, [open, studentIdOrCode, initialTargetDateIso, loadData]);

  // เมื่อเปลี่ยน Target Absence Date ให้โหลดตัวเลือกวันคลินิกที่สอดคล้องใหม่
  const handleSelectTargetDate = (dateIso: string) => {
    setSelectedTargetDate(dateIso);
    if (studentIdOrCode) {
      // เมื่อเปลี่ยนวันขาด ให้ดึงเดือน/ปีของวันขาดนั้นเป็นค่าเริ่มต้น
      loadData(studentIdOrCode, dateIso);
    }
  };

  const handlePrevMonth = () => {
    const nextMonth = clinicMonth === 1 ? 12 : clinicMonth - 1;
    const nextYear = clinicMonth === 1 ? clinicYear - 1 : clinicYear;
    setClinicMonth(nextMonth);
    setClinicYear(nextYear);
    if (studentIdOrCode) {
      loadData(studentIdOrCode, selectedTargetDate, nextYear, nextMonth);
    }
  };

  const handleNextMonth = () => {
    const nextMonth = clinicMonth === 12 ? 1 : clinicMonth + 1;
    const nextYear = clinicMonth === 12 ? clinicYear + 1 : clinicYear;
    setClinicMonth(nextMonth);
    setClinicYear(nextYear);
    if (studentIdOrCode) {
      loadData(studentIdOrCode, selectedTargetDate, nextYear, nextMonth);
    }
  };

  const handleMonthChange = (m: number) => {
    setClinicMonth(m);
    if (studentIdOrCode) {
      loadData(studentIdOrCode, selectedTargetDate, clinicYear, m);
    }
  };

  const handleYearChange = (y: number) => {
    setClinicYear(y);
    if (studentIdOrCode) {
      loadData(studentIdOrCode, selectedTargetDate, y, clinicMonth);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`คัดลอก${label}เรียบร้อยแล้ว`, {
      description: text,
    });
  };

  const currentAbsence =
    data?.allAbsences.find((a) => a.dateIso === selectedTargetDate) ?? data?.targetAbsence;

  // บันทึกการมาเข้าคลินิกแก้แถว (พ./พฤ.)
  const handleSubmitClinicMakeup = async () => {
    if (!data?.student.id || !selectedTargetDate || !selectedClinicDate) {
      toast.error("กรุณาเลือกวันที่คลินิกแก้ (พ./พฤ.) ให้เรียบร้อย");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitClinicMakeupAction({
        studentId: data.student.id,
        targetAbsenceDate: selectedTargetDate,
        clinicMakeupDate: selectedClinicDate,
        note: clinicNote,
      });

      if (res.success) {
        toast.success("บันทึกการแก้แถวสำเร็จ 🎉", {
          description: res.message,
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error("บันทึกไม่สำเร็จ", {
          description: res.message,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ยกเลิกการแก้แถวของวันนี้
  const handleCancelMakeup = async () => {
    if (!data?.student.id || !selectedTargetDate) return;
    if (!confirm(`คุณต้องการยกเลิกการแก้แถวของวันที่ ${selectedTargetDate} ใช่หรือไม่?`)) return;

    setIsSubmitting(true);
    try {
      const res = await cancelClinicMakeupAction({
        studentId: data.student.id,
        targetAbsenceDate: selectedTargetDate,
        clinicMakeupDate: currentAbsence?.remediedOnDateIso ?? selectedClinicDate,
      });

      if (res.success) {
        toast.success("ยกเลิกการแก้แถวเรียบร้อยแล้ว", {
          description: res.message,
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error("ไม่สามารถยกเลิกได้", {
          description: res.message,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการยกเลิก");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl border border-border/80">
        {/* Sticky Header */}
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-3.5 border-b border-border/60 bg-muted/20 shrink-0 text-left">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>บันทึกการมาเข้าแถวแก้ (คลินิก พ./พฤ.)</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                  <Sparkles className="h-3 w-3" /> ชดเชย 1 ต่อ 1
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                ดึงข้อมูลวันคลินิกแก้แถว (พ./พฤ.) ให้ติ๊กว่านักเรียนมาในวันนั้น เพื่อแก้วันที่ขาดของวันนี้
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">กำลังดึงข้อมูลวันที่คลินิกแก้แถว...</p>
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
              <p className="text-sm">ไม่พบข้อมูลนักเรียนหรือข้อมูลวันขาด</p>
            </div>
          ) : (
            <>
              {/* Student Capsule Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 bg-card px-2.5 py-1 rounded-lg border border-primary/30 shadow-2xs">
                    <span className="font-mono text-xs sm:text-sm font-bold text-primary">
                      {data.student.studentId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(data.student.studentId, "รหัสนักเรียน")}
                      className="flex items-center justify-center h-5 w-5 rounded-md hover:bg-muted text-muted-foreground transition-all cursor-pointer"
                      title="คัดลอกรหัส"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {data.student.fullName}
                    </h4>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1">
                  ห้อง {data.student.classroom}
                </Badge>
              </div>

              {/* Target Absence Date Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-rose-500" />
                    <span>วันที่ขาดแถวที่นำมาแก้ (Target Absence Date)</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    ขาดทั้งหมด {data.allAbsences.length} วัน
                  </span>
                </div>

                {data.allAbsences.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data.allAbsences.map((abs) => {
                      const isSelected = abs.dateIso === selectedTargetDate;
                      return (
                        <button
                          key={abs.dateIso}
                          type="button"
                          onClick={() => handleSelectTargetDate(abs.dateIso)}
                          className={cn(
                            "flex items-center justify-between rounded-xl border p-2.5 text-left transition-all cursor-pointer",
                            isSelected
                              ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs"
                              : "border-border/70 bg-card hover:bg-muted/40",
                            abs.isRemedied && "border-emerald-500/40 bg-emerald-500/[0.04]"
                          )}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground truncate">
                                {abs.dayName} {abs.dateThai}
                              </span>
                            </div>
                            <div className="mt-0.5">
                              {abs.isRemedied ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                                  <span>{abs.remedyTitle ?? "แก้แถวแล้ว"}</span>
                                </span>
                              ) : abs.isOverdueCrossWeek ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>ค้างสะสมข้ามรอบ!</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  <span>รอนัดแก้ พ.-พฤ. นี้</span>
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xs">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                    นักเรียนคนนี้ไม่มีประวัติขาดแถว
                  </div>
                )}
              </div>

              {/* Info rule banner */}
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.06] p-3 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
                <div>
                  <p className="font-semibold">กติกาคลินิกแก้แถว (วันพุธ และพฤหัสบดี):</p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    นักเรียนเสียสิทธิ์วันหยุดพักตามสิทธิ์ มาเข้าแถวในคลินิกวันพุธ/พฤหัสฯ เพื่อนำมาชดเชยวันขาดของ{" "}
                    <strong className="underline">
                      {currentAbsence?.dayName} {currentAbsence?.dateThai}
                    </strong>{" "}
                    แบบ 1 ต่อ 1
                  </p>
                </div>
              </div>

              {/* List of Clinic Dates (พ./พฤ.) with Month & Year Switcher */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>เลือกวันที่นักเรียนมาเข้าคลินิกแก้แถว (ติ๊กเพื่อแก้):</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    ดึงเฉพาะวัน พุธ / พฤหัสบดี
                  </span>
                </div>

                {/* Month & Year Navigation Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-border/80 bg-muted/30 p-2 sm:p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePrevMonth}
                      disabled={isLoading}
                      className="h-8 w-8 p-0 rounded-lg shrink-0 cursor-pointer"
                      title="เดือนก่อนหน้า"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Month Dropdown */}
                    <select
                      value={clinicMonth}
                      onChange={(e) => handleMonthChange(Number(e.target.value))}
                      disabled={isLoading}
                      className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                    >
                      {THAI_MONTHS.map((m, idx) => (
                        <option key={idx} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>

                    {/* Year Dropdown */}
                    <select
                      value={clinicYear}
                      onChange={(e) => handleYearChange(Number(e.target.value))}
                      disabled={isLoading}
                      className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                    >
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>
                          พ.ศ. {y + 543} ({y})
                        </option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleNextMonth}
                      disabled={isLoading}
                      className="h-8 w-8 p-0 rounded-lg shrink-0 cursor-pointer"
                      title="เดือนถัดไป"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      รอบคลินิก:
                    </span>
                    <Badge variant="outline" className="text-[11px] font-bold text-primary bg-primary/5 border-primary/20">
                      {THAI_MONTHS[clinicMonth - 1]} {clinicYear + 543}
                    </Badge>
                  </div>
                </div>

                {data.clinicDates.length > 0 ? (
                  <div className="space-y-2">
                    {data.clinicDates.map((clinic) => {
                      const isSelected = selectedClinicDate === clinic.dateIso;
                      const isWed = clinic.dayOfWeek === 3;
                      return (
                        <div
                          key={clinic.dateIso}
                          onClick={() => setSelectedClinicDate(clinic.dateIso)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                            isSelected
                              ? "border-primary bg-primary/[0.08] ring-2 ring-primary/40 shadow-xs"
                              : "border-border/70 bg-card hover:bg-muted/40",
                            clinic.isRemedyingTarget && "border-emerald-500 bg-emerald-500/[0.08]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-2xs",
                                isWed
                                  ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30"
                                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                              )}
                            >
                              {clinic.dayShort}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-bold text-foreground">
                                  {clinic.dayName}ที่ {clinic.dateThaiFormatted}
                                </span>
                                {clinic.isSameWeek && (
                                  <span className="inline-flex rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary border border-primary/20">
                                    แนะนำ (รอบตรงสัปดาห์)
                                  </span>
                                )}
                                {clinic.isNextWeek && (
                                  <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                                    สัปดาห์ถัดไป
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                {clinic.isAttended ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>เคยบันทึกมาเข้าคลินิกแล้ว</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/90 font-medium">
                                    วันคลินิกแก้แถว (เปิดรับรายงานตัว)
                                  </span>
                                )}
                                {clinic.remediesDateIso && (
                                  <span className="text-violet-600 dark:text-violet-400 font-medium">
                                    • ชดเชยวันขาด {clinic.remediesDateIso}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-full border transition-all",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                                  : "border-muted-foreground/30 bg-card"
                              )}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-dashed text-center gap-2 bg-muted/15">
                    <Calendar className="h-6 w-6 text-muted-foreground/50" />
                    <p className="text-xs font-semibold text-foreground">
                      ไม่พบวันคลินิก (พ./พฤ.) ที่เปิดหลังวันที่ขาดในเดือน {THAI_MONTHS[clinicMonth - 1]} {clinicYear + 543}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      นักเรียนไม่สามารถมาแก้แถวก่อนวันที่ขาดได้ สามารถกดเปลี่ยนเดือนหรือปีเพื่อดูรอบคลินิกได้
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleNextMonth}
                      className="text-xs mt-1 rounded-xl gap-1.5 cursor-pointer"
                    >
                      <span>ดูวันคลินิกในเดือนถัดไป ({clinicMonth === 12 ? THAI_MONTHS[0] : THAI_MONTHS[clinicMonth]})</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Optional Note */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="clinicNote" className="text-xs font-semibold">
                  หมายเหตุเพิ่มเติม (Optional)
                </Label>
                <Input
                  id="clinicNote"
                  placeholder="เช่น ครูสมศรีผู้ควบคุมแถว / มาเข้าแถวรอบเช้า 07:45 น."
                  value={clinicNote}
                  onChange={(e) => setClinicNote(e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
              </div>
            </>
          )}
        </div>

        {/* Sticky Footer */}
        <DialogFooter className="px-5 sm:px-6 py-3.5 border-t border-border/60 bg-muted/20 shrink-0 flex flex-row items-center justify-between sm:justify-between gap-2">
          {currentAbsence?.isRemedied ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={handleCancelMakeup}
              className="text-xs border-rose-500/40 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 gap-1.5 rounded-xl cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>ยกเลิกการแก้แถว</span>
            </Button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs rounded-xl"
            >
              ปิด
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isSubmitting || !selectedClinicDate || !selectedTargetDate}
              onClick={handleSubmitClinicMakeup}
              className="text-xs font-bold rounded-xl gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>บันทึกว่ามาเข้าคลินิกแก้แถว</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
