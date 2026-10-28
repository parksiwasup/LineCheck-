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
} from "lucide-react";
import type { DashboardAnalyticsData } from "@/actions/dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="space-y-6">
      {/* Hero Banner / Quick Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">
              แดชบอร์ดภาพรวมสถิติการเข้าแถว (Statistics Dashboard)
            </h1>
            <Badge variant="default" className="text-xs">
              Real-time Overview
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            สรุปอัตราการเข้าแถวประจำวัน แนวโน้มรายสัปดาห์ และสัดส่วนนักเรียนที่ผ่านเกณฑ์เทียบกับผู้ที่ต้องแก้แถว
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild variant="outline">
            <Link href="/attendance/remedial">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              <span>จัดการแก้แถว ({summary.deficitStudentCount})</span>
            </Link>
          </Button>
          <Button asChild className="shadow-md">
            <Link href="/attendance/check">
              <ClipboardCheck className="h-4 w-4" />
              <span>ไปหน้าเช็คชื่อประจำวัน</span>
              <ArrowRight className="h-4 w-4" />
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
                  มา {summary.todayPresent} • สาย {summary.todayLate} • ขาด{" "}
                  {summary.todayAbsent} • ลา {summary.todayLeave}
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

      {/* Charts Grid (Recharts 3) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Weekly Attendance Trend Line/Bar Chart */}
        <Card className="lg:col-span-8">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">
                  แนวโน้มการเข้าแถวรายสัปดาห์ (Weekly Attendance Trend)
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                ย้อนหลัง {weeklyTrend.length} วันทำการ
              </Badge>
            </div>
            <CardDescription>
              เปรียบเทียบจำนวนนักเรียนที่มา สาย ขาด และเส้นอัตราการเข้าแถว (%) ในแต่ละวัน
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                    barSize={26}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="late"
                    name="สาย (คน)"
                    stackId="a"
                    fill="#f59e0b"
                    barSize={26}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="leave"
                    name="ลา (คน)"
                    stackId="a"
                    fill="#0ea5e9"
                    barSize={26}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="absent"
                    name="ขาด (คน)"
                    stackId="a"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    barSize={26}
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
          </CardContent>
        </Card>

        {/* Donut Chart: Compliant vs Deficit Ratios */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                สัดส่วนการผ่านเกณฑ์ vs ต้องแก้แถว
              </CardTitle>
            </div>
            <CardDescription>
              เกณฑ์เวลาเข้าร่วมกิจกรรมหน้าเสาธงขั้นต่ำ 80%
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-between">
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
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Classroom Breakdown & Recent Remedial Logs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Classroom Summary */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <School className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                สรุปสถิติแยกตามห้องเรียน
              </CardTitle>
            </div>
            <CardDescription>
              ค่าเฉลี่ยอัตราการเข้าแถวและจำนวนนักเรียนที่ต้องแก้แถวรายห้อง
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {classroomSummary.map((room) => (
              <div
                key={room.classroom}
                className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3.5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">
                      ห้อง {room.classroom}
                    </span>
                    <Badge variant="secondary" className="text-[11px]">
                      {room.totalStudents} คน
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    อัตราการเข้าแถวเฉลี่ย{" "}
                    <span className="font-semibold text-foreground">
                      {room.averageRate}%
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {room.deficitCount > 0 ? (
                    <Badge variant="destructive">
                      ต้องแก้แถว {room.deficitCount} คน
                    </Badge>
                  ) : (
                    <Badge variant="success">ผ่านเกณฑ์ครบทุกคน</Badge>
                  )}
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
    </div>
  );
}
