"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  ShieldAlert,
  TrendingUp,
  PieChart as PieChartIcon,
  School,
  Box,
  Sparkles,
  Download,
  ChevronRight,
  Search,
  Award,
  ExternalLink,
  BookOpenCheck,
  Copy,
  Check,
  CalendarCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAttendanceStore } from "@/store/use-attendance-store";
import * as XLSX from "xlsx";
import type { DashboardAnalyticsData, ClassroomSummaryItem } from "@/actions/dashboard";
import { cn } from "@/lib/utils";
import { ThreeDAttendanceChart } from "./charts/three-d-attendance-chart";
import { ThreeDDonutChart } from "./charts/three-d-donut-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DashboardClientProps {
  data: DashboardAnalyticsData;
}

export function DashboardClient({ data }: DashboardClientProps) {
  const {
    summary,
    weeklyTrend,
    complianceRatio,
    classroomSummary,
    recentRemedials,
  } = data;

  const router = useRouter();
  const { setSelectedClassroom, setRemedialClassroomFilter } = useAttendanceStore();
  const [selectedClassroomDetail, setSelectedClassroomDetail] =
    React.useState<ClassroomSummaryItem | null>(null);
  const [classroomStudentFilter, setClassroomStudentFilter] =
    React.useState<"ALL" | "DEFICIT" | "COMPLIANT">("ALL");
  const [classroomStudentSearch, setClassroomStudentSearch] =
    React.useState("");
  const [copiedRemedialStudentId, setCopiedRemedialStudentId] =
    React.useState<string | null>(null);

  const handleCopyStudentId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedRemedialStudentId(id);
    toast.success(`คัดลอกรหัสประจำตัว ${id} แล้ว`);
    setTimeout(() => setCopiedRemedialStudentId(null), 1600);
  };

  const allDetailedStudents = React.useMemo(() => {
    return classroomSummary.flatMap((c) =>
      c.students.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        fullName: s.fullName,
        classroom: c.classroom,
        effectiveRate: s.effectiveRate,
        deficitDays: s.deficitDays,
        isCompliant: s.isCompliant,
      }))
    );
  }, [classroomSummary]);

  const filteredModalStudents = React.useMemo(() => {
    if (!selectedClassroomDetail) return [];
    return selectedClassroomDetail.students.filter((st) => {
      const matchSearch =
        !classroomStudentSearch.trim() ||
        st.studentId.toLowerCase().includes(classroomStudentSearch.toLowerCase()) ||
        st.fullName.toLowerCase().includes(classroomStudentSearch.toLowerCase());

      const matchFilter =
        classroomStudentFilter === "ALL"
          ? true
          : classroomStudentFilter === "DEFICIT"
          ? !st.isCompliant
          : st.isCompliant;

      return matchSearch && matchFilter;
    });
  }, [selectedClassroomDetail, classroomStudentFilter, classroomStudentSearch]);

  const [chartMode, setChartMode] = React.useState<"3d" | "2d">("3d");

  React.useEffect(() => {
    const saved = localStorage.getItem("linecheck-chart-mode") as
      | "3d"
      | "2d"
      | null;
    if (saved === "3d" || saved === "2d") {
      setChartMode(saved);
    }
  }, []);

  const handleToggleMode = (mode: "3d" | "2d") => {
    setChartMode(mode);
    localStorage.setItem("linecheck-chart-mode", mode);
  };

  const handleExportDashboardExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Classroom Summary
    const classData = classroomSummary.map((c, idx) => ({
      "ลำดับ": idx + 1,
      "ห้องเรียน": c.classroom,
      "จำนวนนักเรียนทั้งหมด (คน)": c.totalStudents,
      "อัตราการเข้าแถวเฉลี่ย (%)": `${c.averageRate.toFixed(1)}%`,
      "นักเรียนต่ำกว่าเกณฑ์ 80% (คน)": c.deficitCount,
    }));
    const ws1 = XLSX.utils.json_to_sheet(classData);
    ws1["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 26 }, { wch: 24 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, ws1, "ClassroomSummary");

    // Sheet 2: Weekly Trend
    const trendData = weeklyTrend.map((w, idx) => ({
      "ลำดับ": idx + 1,
      "วันที่": w.dateLabel,
      "อัตราการเข้าแถว (%)": `${w.attendanceRate.toFixed(1)}%`,
      "มาเข้าแถว (คน)": w.present,
      "ขาดแถว (คน)": w.absent,
    }));
    const ws2 = XLSX.utils.json_to_sheet(trendData);
    ws2["!cols"] = [{ wch: 6 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws2, "WeeklyTrend");

    // Sheet 3: Executive Stats
    const execData = [
      { "รายการ": "จำนวนนักเรียนทั้งหมดในระบบ", "ค่าสถิติ": `${summary.totalStudents} คน` },
      { "รายการ": "อัตราการเข้าแถวประจำวันล่าสุด", "ค่าสถิติ": `${summary.todayAttendanceRate.toFixed(1)}%` },
      { "รายการ": "ยอดมาเข้าแถววันนี้", "ค่าสถิติ": `${summary.todayPresent} คน` },
      { "รายการ": "ยอดขาดแถววันนี้", "ค่าสถิติ": `${summary.todayAbsent} คน` },
      { "รายการ": "นักเรียนที่มีเวลาเข้าแถวต่ำกว่าเกณฑ์ (< 80%)", "ค่าสถิติ": `${summary.deficitStudentCount} คน` },
      { "รายการ": "กิจกรรมแก้แถวรอการอนุมัติ", "ค่าสถิติ": `${summary.pendingRemedialCount} รายการ` },
      { "รายการ": "กิจกรรมแก้แถวที่อนุมัติแล้ว", "ค่าสถิติ": `${summary.approvedRemedialCount} รายการ` },
    ];
    const ws3 = XLSX.utils.json_to_sheet(execData);
    ws3["!cols"] = [{ wch: 45 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws3, "ExecutiveSummary");

    const fileName = `รายงานสถิติการเข้าแถวผู้บริหาร_${format(new Date(), "yyyyMMdd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner / Quick Navigation with Luxury Glassmorphism & Ambient Glow */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card/95 via-card/80 to-primary/[0.04] p-5 sm:p-7 backdrop-blur-xl shadow-lg shadow-primary/5 transition-all">
        {/* Ambient Glow Orbs */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Column: Badges, Title, Description, and Micro-Stats */}
          <div className="space-y-3.5 max-w-3xl">
            {/* Top Badges & Live Status */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Real-time Live</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground border border-border/60">
                <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                <span>
                  {format(new Date(), "EEEEที่ d MMMM yyyy", { locale: th })}
                </span>
              </span>

              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <Sparkles className="h-3 w-3" />
                <span>อัปเดตสถิติล่าสุด</span>
              </span>
            </div>

            {/* Hero Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                แดชบอร์ดภาพรวม{" "}
                <span className="bg-gradient-to-r from-primary via-indigo-600 to-sky-500 dark:from-primary dark:via-sky-400 dark:to-indigo-300 bg-clip-text text-transparent">
                  สถิติการเข้าแถว
                </span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                สรุปอัตราการเข้าแถวประจำวัน แนวโน้มรายสัปดาห์ และสัดส่วนนักเรียนที่ผ่านเกณฑ์เทียบกับผู้ที่ต้องเข้าคลินิกแก้แถว
              </p>
            </div>

            {/* Quick Micro-Stat Capsules */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 w-full max-w-2xl">
              <div className="flex items-center justify-between gap-1.5 rounded-xl border border-border/70 bg-card/80 px-3 py-2 text-xs font-medium text-foreground shadow-2xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="text-muted-foreground truncate">นักเรียนทั้งหมด:</span>
                </div>
                <span className="font-bold text-foreground shrink-0">
                  {summary.totalStudents.toLocaleString()} คน
                </span>
              </div>

              <div className="flex items-center justify-between gap-1.5 rounded-xl border border-border/70 bg-card/80 px-3 py-2 text-xs font-medium text-foreground shadow-2xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-muted-foreground truncate">มาแถววันนี้:</span>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  {summary.todayAttendanceRate}%
                </span>
              </div>

              <div
                className={cn(
                  "flex items-center justify-between gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium shadow-2xs",
                  summary.deficitStudentCount > 0
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                    : "border-border/70 bg-card/80 text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertTriangle
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      summary.deficitStudentCount > 0 ? "text-rose-500" : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate">ต้องแก้แถว:</span>
                </div>
                <span className="font-bold shrink-0">
                  {summary.deficitStudentCount.toLocaleString()} คน
                </span>
              </div>

              <div className="flex items-center justify-between gap-1.5 rounded-xl border border-border/70 bg-card/80 px-3 py-2 text-xs font-medium text-foreground shadow-2xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <School className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="text-muted-foreground truncate">ห้องเรียน:</span>
                </div>
                <span className="font-bold text-foreground shrink-0">
                  {classroomSummary.length} ห้อง
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: High-Impact Action Buttons */}
          <div className="flex flex-col items-stretch justify-end gap-2.5 shrink-0 pt-2 lg:pt-0 w-full sm:w-auto lg:w-72">
            {/* Primary CTA with Shimmer Sweep */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
              <Button
                asChild
                size="lg"
                className="relative overflow-hidden group w-full h-11 rounded-2xl px-5 text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all cursor-pointer"
              >
                <Link href="/attendance/check" className="flex items-center justify-center gap-2">
                  {/* Shimmer light reflection sweep */}
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out pointer-events-none" />
                  <ClipboardCheck className="h-4 w-4 shrink-0" />
                  <span>ไปหน้าเช็คชื่อประจำวัน</span>
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>

            <div className="flex items-center gap-2 w-full">
              {/* Remedial Clinic Button */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  asChild
                  variant="outline"
                  className={cn(
                    "w-full h-10 rounded-xl text-xs font-bold gap-1.5 shadow-2xs transition-all",
                    summary.deficitStudentCount > 0
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20"
                      : "border-border/80 bg-card hover:bg-muted"
                  )}
                >
                  <Link href="/attendance/remedial" className="flex items-center justify-center gap-1.5">
                    <ShieldAlert
                      className={cn(
                        "h-4 w-4 shrink-0",
                        summary.deficitStudentCount > 0 ? "text-rose-500 animate-pulse" : "text-muted-foreground"
                      )}
                    />
                    <span>จัดการแก้แถว ({summary.deficitStudentCount})</span>
                  </Link>
                </Button>
              </motion.div>

              {/* Excel Export Button */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportDashboardExcel}
                  className="h-10 rounded-xl border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold gap-1.5 shadow-2xs cursor-pointer transition-all px-3.5"
                  title="ส่งออกรายงาน Excel"
                >
                  <Download className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Excel</span>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Students */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="relative overflow-hidden h-full border border-border/70 hover:border-blue-400/60 hover:shadow-lg transition-all duration-300 group">
            {/* Top accent gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span>จำนวนนักเรียนทั้งหมด (Total)</span>
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-3xl font-extrabold tracking-tight text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {summary.totalStudents}
                  </p>
                  <span className="text-xs font-medium text-muted-foreground">คน</span>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    สถานะ ACTIVE ครบทุกห้อง
                  </span>
                </div>
              </div>
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 2: Today's Attendance Rate */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="relative overflow-hidden h-full border border-border/70 hover:border-emerald-400/60 hover:shadow-lg transition-all duration-300 group">
            {/* Top accent gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-400" />
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>อัตราเข้าแถวล่าสุด (Attendance Rate)</span>
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {summary.todayAttendanceRate}%
                  </p>
                </div>
                <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    มา {summary.todayPresent}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    ขาด {summary.todayAbsent}
                  </span>
                </div>
              </div>
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 3: Remedial Completed */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="relative overflow-hidden h-full border border-border/70 hover:border-violet-400/60 hover:shadow-lg transition-all duration-300 group">
            {/* Top accent gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-400" />
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-violet-500" />
                  <span>บันทึกแก้แถวสำเร็จ (Remedial)</span>
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-3xl font-extrabold tracking-tight text-violet-600 dark:text-violet-400">
                    {summary.approvedRemedialCount}
                  </p>
                  <span className="text-xs font-medium text-muted-foreground">รายการ</span>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                    <Sparkles className="h-2.5 w-2.5" />
                    ชดเชยวันขาดให้ทันที
                  </span>
                </div>
              </div>
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 border border-violet-500/20 text-violet-600 dark:text-violet-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm">
                <Sparkles className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 4: Deficit Students */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="relative overflow-hidden h-full border border-border/70 hover:border-rose-400/60 hover:shadow-lg transition-all duration-300 group">
            {/* Top accent gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-rose-500" />
                  <span>นักเรียนที่ต้องแก้แถว (&lt; 80%)</span>
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
                    {summary.deficitStudentCount}
                  </p>
                  <span className="text-xs font-medium text-muted-foreground">คน</span>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    ผ่านเกณฑ์ {summary.compliantStudentCount}/{summary.totalStudents} คน
                  </span>
                </div>
              </div>
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/15 to-amber-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-400 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-sm">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section Header with 2D / 3D Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight">
              การวิเคราะห์ข้อมูลเชิงลึก (Analytics & Visualizations)
            </h2>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {chartMode === "3d" ? "🧊 3D Isometric View" : "📊 2D Classic View"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            กราฟแท่งแนวโน้ม 3D ทรงกระบอก พร้อมเส้นเรืองแสง และกราฟวงแหวนโดนัท 3D แสดงสัดส่วนผ่านเกณฑ์
          </p>
        </div>

        {/* 2D / 3D Mode Toggle Switch */}
        <div className="inline-flex items-center rounded-xl border border-border bg-muted/60 p-1 self-start sm:self-auto shadow-2xs shrink-0">
          <button
            type="button"
            onClick={() => handleToggleMode("3d")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              chartMode === "3d"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Box className="h-3.5 w-3.5 shrink-0" />
            <span>โหมด 3D มีมิติ</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode("2d")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              chartMode === "2d"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            <span>โหมด 2D มาตรฐาน</span>
          </button>
        </div>
      </div>

      {/* Charts Grid (3D or 2D) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Weekly Attendance Trend Line/Bar Chart */}
        <Card className="lg:col-span-8 shadow-sm border-t-2 border-t-primary/30">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {chartMode === "3d" ? (
                    <Box className="h-5 w-5" />
                  ) : (
                    <TrendingUp className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base truncate sm:text-clip">
                    แนวโน้มการเข้าแถวรายสัปดาห์ (Weekly Attendance Trend)
                  </CardTitle>
                  <CardDescription className="hidden sm:block">
                    {chartMode === "3d"
                      ? `มุมมอง 3D จำนวนนักเรียนที่มา/ขาดในแต่ละวัน (จากทั้งหมด ${summary.totalStudents} คน) พร้อมเส้นอัตราเข้าแถว (%)`
                      : `เปรียบเทียบจำนวนนักเรียนที่มาเข้าแถว ขาดแถว (จากทั้งหมด ${summary.totalStudents} คน) และอัตราการเข้าแถว (%)`}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {chartMode === "3d" && (
                  <Badge variant="secondary" className="shrink-0 whitespace-nowrap text-[10px] bg-primary/10 text-primary border-primary/20">
                    3D Isometric
                  </Badge>
                )}
                <Badge variant="outline" className="shrink-0 whitespace-nowrap text-xs">
                  ย้อนหลัง {weeklyTrend.length} วันทำการ
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartMode === "3d" ? (
              <div className="pt-2">
                <ThreeDAttendanceChart data={weeklyTrend} totalStudents={summary.totalStudents} />
              </div>
            ) : (
              <div className="h-[320px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={weeklyTrend}
                    margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      opacity={0.25}
                    />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid rgba(148, 163, 184, 0.25)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                    <Bar
                      yAxisId="left"
                      dataKey="present"
                      name="มา (คน)"
                      stackId="a"
                      fill="#10b981"
                      radius={[0, 0, 4, 4]}
                      barSize={28}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="absent"
                      name="ขาด (คน)"
                      stackId="a"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                      barSize={28}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="attendanceRate"
                      name="อัตราเข้าแถว (%)"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#6366f1" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donut Chart: Compliant vs Deficit Ratios */}
        <Card className="lg:col-span-4 shadow-sm border-t-2 border-t-green-500/30">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                  {chartMode === "3d" ? (
                    <Box className="h-5 w-5" />
                  ) : (
                    <PieChartIcon className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base whitespace-nowrap">
                    สัดส่วนผ่านเกณฑ์
                  </CardTitle>
                  <CardDescription className="text-xs">
                    เกณฑ์เวลาเข้าร่วมขั้นต่ำ 80%
                  </CardDescription>
                </div>
              </div>
              {chartMode === "3d" && (
                <Badge variant="secondary" className="shrink-0 whitespace-nowrap text-[10px] bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 self-start sm:self-auto">
                  3D Extruded
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col justify-between">
            {chartMode === "3d" ? (
              <ThreeDDonutChart
                data={complianceRatio}
                totalStudents={summary.totalStudents}
                students={allDetailedStudents}
              />
            ) : (
              <>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={complianceRatio}
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={88}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {complianceRatio.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 border-t border-border/60 pt-3">
                  {complianceRatio.map((item) => {
                    const pct =
                      summary.totalStudents > 0
                        ? Math.round((item.value / summary.totalStudents) * 100)
                        : 0;
                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <span className="font-semibold">
                          {item.value} คน ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Classroom Breakdown & Recent Remedial Logs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Classroom Summary */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <School className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">
                    สรุปสถิติแยกตามห้องเรียน
                  </CardTitle>
                  <CardDescription className="text-xs">
                    ค่าเฉลี่ยอัตราการเข้าแถวและนักเรียนที่ต้องแก้แถว
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground self-start sm:self-auto shrink-0 whitespace-nowrap">
                คลิกดูรายละเอียดได้
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {classroomSummary.map((room) => (
              <div
                key={room.classroom}
                onClick={() => {
                  setSelectedClassroomDetail(room);
                  setClassroomStudentFilter("ALL");
                  setClassroomStudentSearch("");
                }}
                className="group flex items-center justify-between rounded-2xl border border-border/70 bg-card hover:bg-muted/40 hover:border-primary/50 p-3.5 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                      ห้อง {room.classroom}
                    </span>
                    <Badge variant="secondary" className="text-[11px] font-mono">
                      {room.totalStudents} คน
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span>
                      อัตราการเข้าแถวเฉลี่ย{" "}
                      <b
                        className={cn(
                          room.averageRate >= 80
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {room.averageRate}%
                      </b>
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {room.deficitCount > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      ต้องแก้แถว {room.deficitCount} คน
                    </Badge>
                  ) : (
                    <Badge variant="success" className="text-xs">
                      ผ่านเกณฑ์ครบทุกคน
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Remedials Section */}
        <Card className="lg:col-span-7 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">
                      รายการแก้แถวล่าสุด
                    </CardTitle>
                    <span className="text-xs font-normal text-muted-foreground hidden sm:inline">
                      (Recent Remedials)
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-bold bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/25 shrink-0 whitespace-nowrap">
                      {recentRemedials.length} รายการ
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    ความเคลื่อนไหวการมาแก้แถวของนักเรียนในคลินิกแก้แถว
                  </CardDescription>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm" className="shrink-0 self-start sm:self-auto">
                <Link href="/attendance/remedial">
                  <span>ดูทั้งหมด</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentRemedials.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                ยังไม่มีรายการบันทึกแก้แถว
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {recentRemedials.map((rem) => (
                  <div
                    key={rem.id}
                    className="flex flex-col gap-2 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between hover:border-violet-500/40 hover:bg-violet-500/[0.02] transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400">
                        <CalendarCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">
                            {rem.studentCode}
                          </span>
                          {/* Circular blue copy button */}
                          <button
                            type="button"
                            onClick={() => handleCopyStudentId(rem.studentCode)}
                            title="คัดลอกรหัสประจำตัว"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-400/80 bg-blue-50/80 text-blue-600 transition-all hover:border-blue-500 hover:bg-blue-100 hover:scale-110 active:scale-95 shadow-2xs cursor-pointer"
                          >
                            {copiedRemedialStudentId === rem.studentCode ? (
                              <Check className="h-2.5 w-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-2.5 w-2.5" />
                            )}
                          </button>
                          <span className="font-semibold text-sm text-foreground">
                            {rem.studentName}
                          </span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {rem.classroom}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0 font-bold border-fuchsia-500/40 text-fuchsia-700 bg-fuchsia-500/10 dark:text-fuchsia-300"
                          >
                            มาแก้แถว
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5">
                          <span>
                            มาแก้แถวเมื่อ{" "}
                            {format(new Date(rem.remediedOnDateIso), "d MMM yyyy", { locale: th })}
                          </span>
                          <span>•</span>
                          <span className="text-violet-700 dark:text-violet-300 font-medium">
                            ชดเชยวันขาด {format(new Date(rem.targetDateIso), "d MMM yyyy", { locale: th })}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="self-start sm:self-center shrink-0">
                      <Badge variant="success" className="gap-1 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>แก้แถวแล้ว</span>
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Classroom Detail Modal */}
      <Dialog
        open={!!selectedClassroomDetail}
        onOpenChange={(open) => {
          if (!open) setSelectedClassroomDetail(null);
        }}
      >
        <DialogContent className="max-w-3xl h-[92vh] sm:h-auto sm:max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-3xl">
          {/* Modal Header */}
          <div className="p-3.5 sm:p-5 pb-3 border-b border-border/70 bg-muted/20 shrink-0">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                  <School className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base sm:text-xl font-bold flex items-center gap-2 truncate">
                    <span>ห้อง {selectedClassroomDetail?.classroom}</span>
                    <Badge variant="secondary" className="text-xs font-mono shrink-0">
                      {selectedClassroomDetail?.totalStudents} คน
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate hidden sm:block">
                    รายชื่อนักเรียนและอัตราการเข้าแถวรายบุคคลของห้อง {selectedClassroomDetail?.classroom}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Stat Counters Grid - 4 Columns compact on both mobile and desktop */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 mt-2.5 sm:mt-3.5">
              <div className="rounded-xl border border-border/80 bg-card p-1.5 sm:p-2.5 text-center shadow-2xs">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">นักเรียนทั้งหมด</p>
                <p className="text-xs sm:text-base font-bold mt-0.5 text-foreground">
                  {selectedClassroomDetail?.totalStudents} คน
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-1.5 sm:p-2.5 text-center shadow-2xs">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">เข้าแถวเฉลี่ย</p>
                <p
                  className={cn(
                    "text-xs sm:text-base font-bold mt-0.5",
                    (selectedClassroomDetail?.averageRate ?? 0) >= 80
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {selectedClassroomDetail?.averageRate}%
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-1.5 sm:p-2.5 text-center shadow-2xs">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">ผ่านเกณฑ์</p>
                <p className="text-xs sm:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {selectedClassroomDetail?.compliantCount} คน
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-1.5 sm:p-2.5 text-center shadow-2xs">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">ต้องแก้แถว</p>
                <p className="text-xs sm:text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  {selectedClassroomDetail?.deficitCount} คน
                </p>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-2.5 sm:mt-3">
              <div className="flex items-center gap-1 bg-background p-0.5 sm:p-1 rounded-xl border border-border text-xs shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setClassroomStudentFilter("ALL")}
                  className={cn(
                    "px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                    classroomStudentFilter === "ALL"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  ทั้งหมด ({selectedClassroomDetail?.totalStudents})
                </button>
                <button
                  type="button"
                  onClick={() => setClassroomStudentFilter("DEFICIT")}
                  className={cn(
                    "px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                    classroomStudentFilter === "DEFICIT"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  ต้องแก้ ({selectedClassroomDetail?.deficitCount})
                </button>
                <button
                  type="button"
                  onClick={() => setClassroomStudentFilter("COMPLIANT")}
                  className={cn(
                    "px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                    classroomStudentFilter === "COMPLIANT"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  ผ่าน ({selectedClassroomDetail?.compliantCount})
                </button>
              </div>

              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="ค้นหาชื่อ หรือเลขประจำตัว..."
                  value={classroomStudentSearch}
                  onChange={(e) => setClassroomStudentSearch(e.target.value)}
                  className="pl-8 h-8 sm:h-9 text-xs rounded-lg sm:rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Student List (Scrollable, takes all remaining space) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-2">
            {filteredModalStudents.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                ไม่พบนักเรียนตามเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className="space-y-2">
                {filteredModalStudents.map((st) => (
                  <div
                    key={st.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 rounded-xl sm:rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-colors shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                          {st.studentId}
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {st.fullName}
                        </span>
                        {st.isCompliant ? (
                          <Badge variant="success" className="text-[10px] py-0 shrink-0">
                            ผ่านเกณฑ์ (ผ.)
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] py-0 shrink-0">
                            ต้องแก้ {st.deficitDays} วัน
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          มา {st.presentDays} วัน
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          ขาด {st.absentDays} วัน
                        </span>
                        {st.approvedRemedialCount > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            (แก้แล้ว +{st.approvedRemedialCount} วัน)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Percent */}
                    <div className="w-full sm:w-44 space-y-1 shrink-0 pt-1 sm:pt-0 border-t border-border/40 sm:border-t-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground text-[11px]">อัตราสุทธิ</span>
                        <span
                          className={cn(
                            "font-bold text-xs",
                            st.effectiveRate >= 80
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {st.effectiveRate}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            st.effectiveRate >= 80 ? "bg-emerald-500" : "bg-rose-500"
                          )}
                          style={{ width: `${Math.min(100, st.effectiveRate)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer Quick Actions */}
          <div className="p-3 sm:p-4 border-t border-border/70 bg-muted/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              ทางลัดจัดการห้อง {selectedClassroomDetail?.classroom}:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedClassroomDetail) {
                    setSelectedClassroom(selectedClassroomDetail.classroom);
                    router.push("/attendance/check");
                  }
                }}
                className="text-xs h-8 rounded-xl"
              >
                <ClipboardCheck className="h-3.5 w-3.5 mr-1 text-primary" />
                <span>เช็คชื่อห้องนี้</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedClassroomDetail) {
                    setRemedialClassroomFilter(selectedClassroomDetail.classroom);
                    router.push("/attendance/remedial");
                  }
                }}
                className="text-xs h-8 rounded-xl"
              >
                <ShieldAlert className="h-3.5 w-3.5 mr-1 text-amber-500" />
                <span>แก้แถวห้องนี้</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  if (selectedClassroomDetail) {
                    router.push(
                      `/grades?classroom=${encodeURIComponent(
                        selectedClassroomDetail.classroom
                      )}`
                    );
                  }
                }}
                className="text-xs h-8 rounded-xl"
              >
                <Award className="h-3.5 w-3.5 mr-1" />
                <span>ตัดเกรดห้องนี้ (ผ./มผ.)</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
