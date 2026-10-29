"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { th } from "date-fns/locale";
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
      {/* Hero Banner / Quick Navigation */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-3xl border border-border/80 bg-card/60 p-5 sm:p-6 backdrop-blur-sm shadow-xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Real-time Overview
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              อัปเดตสถิติประจำวัน
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
            แดชบอร์ดภาพรวมสถิติการเข้าแถว
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            สรุปอัตราการเข้าแถวประจำวัน แนวโน้มรายสัปดาห์ และสัดส่วนนักเรียนที่ผ่านเกณฑ์เทียบกับผู้ที่ต้องแก้แถว
          </p>
        </div>

        {/* Action Buttons Group */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 pt-1 lg:pt-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportDashboardExcel}
            className="h-10 rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>ส่งออกรายงาน Excel</span>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-10 rounded-xl border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-semibold gap-1.5 shadow-2xs"
          >
            <Link href="/attendance/remedial">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-500" />
              <span>จัดการแก้แถว ({summary.deficitStudentCount})</span>
            </Link>
          </Button>

          <Button
            asChild
            className="h-10 rounded-xl px-4 text-xs sm:text-sm font-semibold shadow-md gap-2"
          >
            <Link href="/attendance/check">
              <ClipboardCheck className="h-4 w-4 shrink-0" />
              <span>ไปหน้าเช็คชื่อประจำวัน</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="h-full">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  จำนวนนักเรียนทั้งหมด (Total Students)
                </p>
                <p className="text-3xl font-bold mt-1">
                  {summary.totalStudents}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    คน
                  </span>
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium">
                  สถานะกำลังศึกษา (ACTIVE) ครบทุกห้อง
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <Card className="h-full">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  อัตราเข้าแถวล่าสุด (Today&apos;s Attendance Rate)
                </p>
                <p className="text-3xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {summary.todayAttendanceRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  มาเข้าแถว {summary.todayPresent} คน • ขาดแถว {summary.todayAbsent} คน
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <Card className="h-full">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  รายการแก้แถวรออนุมัติ (Pending Remedial)
                </p>
                <p className="text-3xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                  {summary.pendingRemedialCount}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    รายการ
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  อนุมัติสะสมแล้ว {summary.approvedRemedialCount} รายการ
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
        >
          <Card className="h-full">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  นักเรียนที่ต้องแก้แถว (&lt; 80% Deficit)
                </p>
                <p className="text-3xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                  {summary.deficitStudentCount}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    คน
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  ผ่านเกณฑ์แล้ว {summary.compliantStudentCount}/
                  {summary.totalStudents} คน
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section Header with 2D / 3D Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <span>การวิเคราะห์ข้อมูลเชิงลึก (Analytics & Visualizations)</span>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {chartMode === "3d" ? "🧊 3D Isometric View" : "📊 2D Classic View"}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            กราฟแท่งแนวโน้ม 3D ทรงกระบอก พร้อมเส้นเรืองแสง และกราฟวงแหวนโดนัท 3D แสดงสัดส่วนผ่านเกณฑ์
          </p>
        </div>

        {/* 2D / 3D Mode Toggle Switch */}
        <div className="inline-flex items-center rounded-xl border border-border bg-muted/60 p-1 self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => handleToggleMode("3d")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
              chartMode === "3d"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Box className="h-3.5 w-3.5" />
            <span>โหมด 3D มีมิติ</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode("2d")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
              chartMode === "2d"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>โหมด 2D มาตรฐาน</span>
          </button>
        </div>
      </div>

      {/* Charts Grid (3D or 2D) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Weekly Attendance Trend Line/Bar Chart */}
        <Card className="lg:col-span-8 shadow-sm border-t-2 border-t-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {chartMode === "3d" ? (
                  <Box className="h-5 w-5 text-primary" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-primary" />
                )}
                <CardTitle className="text-base">
                  แนวโน้มการเข้าแถวรายสัปดาห์ (Weekly Attendance Trend)
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {chartMode === "3d" && (
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                    3D Isometric
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  ย้อนหลัง {weeklyTrend.length} วันทำการ
                </Badge>
              </div>
            </div>
            <CardDescription>
              {chartMode === "3d"
                ? "มุมมอง 3D เสาทรงกระบอกซ้อนชั้น มา/ขาด พร้อมเส้นเรซิ่นเรืองแสงบอกอัตราเข้าแถว (%)"
                : "เปรียบเทียบจำนวนนักเรียนที่มาเข้าแถว ขาดแถว และเส้นอัตราการเข้าแถว (%) ในแต่ละวัน"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartMode === "3d" ? (
              <div className="pt-2">
                <ThreeDAttendanceChart data={weeklyTrend} />
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
        <Card className="lg:col-span-4 shadow-sm border-t-2 border-t-emerald-500/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {chartMode === "3d" ? (
                  <Box className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <PieChartIcon className="h-5 w-5 text-primary" />
                )}
                <CardTitle className="text-base">
                  สัดส่วนการผ่านเกณฑ์ vs ต้องแก้แถว
                </CardTitle>
              </div>
              {chartMode === "3d" && (
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                  3D Extruded
                </Badge>
              )}
            </div>
            <CardDescription>
              {chartMode === "3d"
                ? "มุมมอง 3D โดนัททรงกระบอกตัดเฉียง พร้อมความหนา 28px และฐานเงาเสมือนจริง"
                : "เกณฑ์เวลาเข้าร่วมกิจกรรมหน้าเสาธงขั้นต่ำ 80%"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-between">
            {chartMode === "3d" ? (
              <ThreeDDonutChart
                data={complianceRatio}
                totalStudents={summary.totalStudents}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">
                  สรุปสถิติแยกตามห้องเรียน
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                คลิกดูรายละเอียดได้
              </Badge>
            </div>
            <CardDescription>
              ค่าเฉลี่ยอัตราการเข้าแถวและจำนวนนักเรียนที่ต้องแก้แถวรายห้อง (คลิกที่ห้องเพื่อดูรายชื่อนักเรียน)
            </CardDescription>
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

        {/* Recent Remedial Submissions */}
        <Card className="lg:col-span-7">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  รายการส่งงานแก้แถวล่าสุด (Recent Remedial Activities)
                </CardTitle>
                <CardDescription>
                  ความเคลื่อนไหวการส่งกิจกรรมบำเพ็ญประโยชน์ของนักเรียน
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
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
              <div className="space-y-2.5">
                {recentRemedials.map((rem) => (
                  <div
                    key={rem.id}
                    className="flex flex-col gap-2 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {rem.studentName}
                        </span>
                        <Badge variant="secondary" className="text-[11px]">
                          {rem.classroom}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rem.activityTitle} ({rem.hoursEarned} ชม.) • ชดเชยวันที่{" "}
                        {format(new Date(rem.targetDateIso), "d MMM yyyy", {
                          locale: th,
                        })}
                      </p>
                    </div>

                    <div className="self-start sm:self-center">
                      {rem.status === "APPROVED" ? (
                        <Badge variant="success">อนุมัติแล้ว</Badge>
                      ) : rem.status === "PENDING" ? (
                        <Badge variant="warning">รอตรวจสอบ</Badge>
                      ) : (
                        <Badge variant="destructive">ไม่อนุมัติ</Badge>
                      )}
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
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl">
          {/* Modal Header */}
          <div className="p-5 sm:p-6 pb-4 border-b border-border/70 bg-muted/20">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                  <School className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <span>รายละเอียดสถิติและการเข้าแถว ห้อง {selectedClassroomDetail?.classroom}</span>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {selectedClassroomDetail?.totalStudents} คน
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    รายชื่อนักเรียนและอัตราการเข้าแถวรายบุคคลของห้อง {selectedClassroomDetail?.classroom}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Stat Counters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
              <div className="rounded-2xl border border-border/80 bg-card p-3 text-center shadow-2xs">
                <p className="text-[11px] text-muted-foreground font-medium">นักเรียนทั้งหมด</p>
                <p className="text-lg font-bold mt-0.5 text-foreground">
                  {selectedClassroomDetail?.totalStudents} คน
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-3 text-center shadow-2xs">
                <p className="text-[11px] text-muted-foreground font-medium">เข้าแถวเฉลี่ย</p>
                <p
                  className={cn(
                    "text-lg font-bold mt-0.5",
                    (selectedClassroomDetail?.averageRate ?? 0) >= 80
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {selectedClassroomDetail?.averageRate}%
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-3 text-center shadow-2xs">
                <p className="text-[11px] text-muted-foreground font-medium">ผ่านเกณฑ์ (≥ 80%)</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {selectedClassroomDetail?.compliantCount} คน
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-3 text-center shadow-2xs">
                <p className="text-[11px] text-muted-foreground font-medium">ต้องแก้แถว (&lt; 80%)</p>
                <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  {selectedClassroomDetail?.deficitCount} คน
                </p>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mt-4">
              <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setClassroomStudentFilter("ALL")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
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
                    "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                    classroomStudentFilter === "DEFICIT"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  ต้องแก้แถว ({selectedClassroomDetail?.deficitCount})
                </button>
                <button
                  type="button"
                  onClick={() => setClassroomStudentFilter("COMPLIANT")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                    classroomStudentFilter === "COMPLIANT"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  ผ่านเกณฑ์ ({selectedClassroomDetail?.compliantCount})
                </button>
              </div>

              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="ค้นหาชื่อ หรือเลขประจำตัว..."
                  value={classroomStudentSearch}
                  onChange={(e) => setClassroomStudentSearch(e.target.value)}
                  className="pl-8.5 h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Student List (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
            {filteredModalStudents.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                ไม่พบนักเรียนตามเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className="space-y-2">
                {filteredModalStudents.map((st) => (
                  <div
                    key={st.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-colors shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {st.studentId}
                        </span>
                        <span className="font-bold text-sm text-foreground">
                          {st.fullName}
                        </span>
                        {st.isCompliant ? (
                          <Badge variant="success" className="text-[10px] py-0">
                            ผ่านเกณฑ์ (ผ.)
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] py-0">
                            ต้องแก้ {st.deficitDays} วัน
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
                    <div className="w-full sm:w-44 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground text-[11px]">อัตราสุทธิ</span>
                        <span
                          className={cn(
                            "font-bold",
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
          <div className="p-4 border-t border-border/70 bg-muted/20 flex flex-wrap items-center justify-between gap-2.5">
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
