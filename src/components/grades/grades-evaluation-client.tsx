"use client";

import * as React from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import {
  Award,
  CheckCircle2,
  XCircle,
  Download,
  Printer,
  Search,
  Filter,
  School,
  Sparkles,
  BookOpenCheck,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  getGradeEvaluationDataAction,
  type GradeEvaluationResult,
  type StudentGradeItem,
} from "@/actions/grades";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface GradesEvaluationClientProps {
  initialData: GradeEvaluationResult;
}

export function GradesEvaluationClient({
  initialData,
}: GradesEvaluationClientProps) {
  const [data, setData] = React.useState<GradeEvaluationResult>(initialData);
  const [classroomFilter, setClassroomFilter] = React.useState<string>("ALL");
  const [passingRate, setPassingRate] = React.useState<number>(80);
  const [gradeFilter, setGradeFilter] = React.useState<"ALL" | "PASSED" | "FAILED">("ALL");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const fetchGrades = async (classroom: string, rate: number) => {
    setIsLoading(true);
    try {
      const res = await getGradeEvaluationDataAction(classroom, rate);
      setData(res);
    } catch {
      toast.error("ไม่สามารถโหลดข้อมูลการตัดเกรดได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassroomChange = (cls: string) => {
    setClassroomFilter(cls);
    fetchGrades(cls, passingRate);
  };

  const handlePassingRateChange = (newRate: number) => {
    setPassingRate(newRate);
    fetchGrades(classroomFilter, newRate);
  };

  const filteredStudents = React.useMemo(() => {
    return data.students.filter((s) => {
      const matchGrade =
        gradeFilter === "ALL" ||
        (gradeFilter === "PASSED" && s.isPassed) ||
        (gradeFilter === "FAILED" && !s.isPassed);

      const matchSearch =
        !searchQuery.trim() ||
        s.studentId.includes(searchQuery.trim()) ||
        s.fullName.includes(searchQuery.trim());

      return matchGrade && matchSearch;
    });
  }, [data.students, gradeFilter, searchQuery]);

  const handleExportExcel = () => {
    const exportData = filteredStudents.map((s, idx) => ({
      "ลำดับ": idx + 1,
      "รหัสประจำตัว": s.studentId,
      "คำนำหน้า": s.title,
      "ชื่อ": s.firstName,
      "นามสกุล": s.lastName,
      "ห้องเรียน": s.classroom,
      "วันทำการทั้งหมด": s.totalDays,
      "เวลาเรียนปกติ (วัน)": s.presentDays,
      "สาย (วัน)": s.lateDays,
      "ขาด (วัน)": s.absentDays,
      "ลา (วัน)": s.leaveDays,
      "ชดเชยจิตอาสาที่อนุมัติ (วัน)": s.approvedRemedials,
      "เวลาเรียนสุทธิ (วัน)": s.effectivePresentDays,
      "ร้อยละเวลาเรียนสุทธิ (%)": Number(s.netRate.toFixed(1)),
      "ผลการตัดสิน": s.grade,
      "สถานะการประเมิน": s.isPassed ? "ผ่านเกณฑ์" : "ไม่ผ่านเกณฑ์",
      "ต้องแก้เพิ่ม (วัน)": s.isPassed ? 0 : s.daysNeededToPass,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GradeEvaluation_ปพ5");

    ws["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 24 },
      { wch: 20 },
      { wch: 22 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
    ];

    const fileName = `สรุปผลการตัดเกรดกิจกรรมเข้าแถว_ปพ5_${classroomFilter === "ALL" ? "ทุกห้อง" : classroomFilter}_${format(
      new Date(),
      "yyyyMMdd"
    )}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`ส่งออกเอกสารตัดเกรดฝ่ายทะเบียนสำเร็จ (${filteredStudents.length} คน)`);
  };

  const handlePrint = () => {
    window.print();
  };

  const todayFormatted = React.useMemo(() => {
    return format(new Date(), "d MMMM yyyy", { locale: th });
  }, []);

  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              ระบบประเมินผลและตัดเกรดกิจกรรมเข้าแถว (ผ./มผ.)
            </h1>
            <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">
              เกณฑ์ สพฐ. 80%
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            สรุปผลการตัดสินกิจกรรมพัฒนาผู้เรียนตามระเบียบกระทรวงศึกษาธิการ สำหรับส่งฝ่ายทะเบียนวัดผล (ปพ.5 / SGS)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportExcel}
            className="h-9 gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>ส่งออก ปพ.5 (Excel)</span>
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            className="h-9 gap-1.5 text-xs bg-primary text-primary-foreground shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>พิมพ์ใบสรุปผลประเมิน (PDF)</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 print:hidden">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">นักเรียนทั้งหมด</p>
              <p className="text-2xl font-bold mt-0.5">{summary.totalStudents} คน</p>
              <p className="text-[11px] text-muted-foreground">
                {classroomFilter === "ALL" ? "ทุกห้องเรียน" : `ห้อง ${classroomFilter}`}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <School className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">ผ่านเกณฑ์ (ผ.)</p>
              <p className="text-2xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
                {summary.passedCount} คน
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold">
                {summary.passedPercentage.toFixed(1)}% ของนักเรียน
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">ไม่ผ่านเกณฑ์ (มผ.)</p>
              <p className="text-2xl font-bold mt-0.5 text-rose-600 dark:text-rose-400">
                {summary.failedCount} คน
              </p>
              <p className="text-[11px] text-rose-600 font-semibold">
                {summary.failedPercentage.toFixed(1)}% ต้องแก้แถว
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">เกณฑ์ตัดสินขั้นต่ำ</p>
              <p className="text-2xl font-bold mt-0.5 text-primary">{passingRate}%</p>
              <p className="text-[11px] text-muted-foreground">เวลาเข้าร่วมกิจกรรมหน้าเสาธง</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Toolbar (print:hidden) */}
      <Card className="print:hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Classroom tabs */}
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => handleClassroomChange("ALL")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                  classroomFilter === "ALL"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                ทุกห้องเรียน
              </button>
              {data.classrooms.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleClassroomChange(c)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                    classroomFilter === c
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  ห้อง {c}
                </button>
              ))}
            </div>

            {/* Other filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Grade filter */}
              <select
                value={gradeFilter}
                onChange={(e) =>
                  setGradeFilter(e.target.value as "ALL" | "PASSED" | "FAILED")
                }
                className="h-9 rounded-xl border border-input bg-card px-2.5 text-xs font-medium"
              >
                <option value="ALL">ผลการตัดสินทั้งหมด</option>
                <option value="PASSED">เฉพาะ ผ่าน (ผ.)</option>
                <option value="FAILED">เฉพาะ ไม่ผ่าน (มผ.)</option>
              </select>

              {/* Passing rate dropdown */}
              <select
                value={passingRate}
                onChange={(e) => handlePassingRateChange(Number(e.target.value))}
                className="h-9 rounded-xl border border-input bg-card px-2.5 text-xs font-medium"
              >
                <option value={80}>เกณฑ์ 80% (มาตรฐาน สพฐ.)</option>
                <option value={75}>เกณฑ์ 75%</option>
                <option value={70}>เกณฑ์ 70%</option>
              </select>

              {/* Search */}
              <div className="relative w-full sm:w-48">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ค้นหารหัส / ชื่อ-สกุล..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-8 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grade Ledger Table & Printable Area */}
      <div id="grades-ledger-area">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                body * {
                  visibility: hidden;
                }
                #grades-ledger-area, #grades-ledger-area * {
                  visibility: visible;
                }
                #grades-ledger-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  padding: 1.2cm;
                  background: white !important;
                  color: black !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `,
          }}
        />

        {/* Printable Official Header */}
        <div className="hidden print:block text-center space-y-1 border-b-2 border-slate-900 pb-4 mb-5">
          <h2 className="text-xl font-bold">สถานศึกษา / โรงเรียน LineCheck+ Academy</h2>
          <h3 className="text-base font-semibold">
            แบบสรุปผลการประเมินกิจกรรมพัฒนาผู้เรียน (กิจกรรมเข้าแถวหน้าเสาธง) ประจำภาคเรียน
          </h3>
          <p className="text-xs text-slate-700">
            ห้องเรียน: {classroomFilter === "ALL" ? "ทุกห้องเรียน" : `ชั้นมัธยมศึกษาปีที่ ${classroomFilter}`} • ข้อมูล ณ วันที่ {todayFormatted} • เกณฑ์การตัดสิน: ร้อยละ {passingRate}
          </p>
          <div className="text-xs text-slate-600 flex justify-center gap-6 pt-1 font-medium">
            <span>นักเรียนทั้งหมด: {summary.totalStudents} คน</span>
            <span>ผ่านเกณฑ์ (ผ.): {summary.passedCount} คน ({summary.passedPercentage.toFixed(1)}%)</span>
            <span>ไม่ผ่านเกณฑ์ (มผ.): {summary.failedCount} คน ({summary.failedPercentage.toFixed(1)}%)</span>
          </div>
        </div>

        <Card className="border shadow-xs overflow-hidden print:border-none print:shadow-none">
          <CardHeader className="p-4 border-b border-border print:hidden">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BookOpenCheck className="h-4 w-4 text-primary" />
                บัญชีสรุปผลการตัดสินเกรดกิจกรรม (แสดง {filteredStudents.length} คน)
              </CardTitle>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  ผ. = ผ่านเกณฑ์ (≥ {passingRate}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  มผ. = ไม่ผ่านเกณฑ์ (&lt; {passingRate}%)
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="print:text-xs">
                <TableHeader className="bg-muted/50 print:bg-slate-200">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs">ลำดับ</TableHead>
                    <TableHead className="text-xs">รหัสประจำตัว</TableHead>
                    <TableHead className="text-xs">ชื่อ - นามสกุล</TableHead>
                    <TableHead className="text-xs text-center">ห้อง</TableHead>
                    <TableHead className="text-xs text-center">วันทั้งหมด</TableHead>
                    <TableHead className="text-xs text-center">มาปกติ</TableHead>
                    <TableHead className="text-xs text-center text-rose-600 font-semibold">ขาด</TableHead>
                    <TableHead className="text-xs text-center text-emerald-600 font-semibold">แก้แล้ว</TableHead>
                    <TableHead className="text-xs text-center font-bold">เวลาสุทธิ (%)</TableHead>
                    <TableHead className="text-xs text-center w-24">ผลการตัดสิน</TableHead>
                    <TableHead className="text-xs text-right print:hidden">การแก้แถว</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-32 text-center text-muted-foreground text-xs">
                        ไม่พบข้อมูลนักเรียนตามเงื่อนไขที่เลือก
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((s, idx) => (
                      <TableRow key={s.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-center text-muted-foreground font-mono">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-semibold">
                          {s.studentId}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {s.fullName}
                        </TableCell>
                        <TableCell className="text-xs text-center">{s.classroom}</TableCell>
                        <TableCell className="text-xs text-center">{s.totalDays}</TableCell>
                        <TableCell className="text-xs text-center text-muted-foreground">
                          {s.presentDays}
                        </TableCell>
                        <TableCell className="text-xs text-center text-rose-600 font-medium">
                          {s.absentDays}
                        </TableCell>
                        <TableCell className="text-xs text-center text-emerald-600 font-medium">
                          {s.approvedRemedials > 0 ? `+${s.approvedRemedials}` : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-center font-bold">
                          {s.netRate.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {s.isPassed ? (
                            <span className="inline-flex items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
                              ผ.
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center rounded-lg bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-xs font-black text-rose-700 dark:text-rose-300">
                              มผ.
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right print:hidden">
                          {s.isPassed ? (
                            <span className="text-emerald-600 font-medium text-[11px]">
                              ผ่านเกณฑ์แล้ว
                            </span>
                          ) : (
                            <span className="text-rose-600 font-medium text-[11px]">
                              ต้องแก้เพิ่ม {s.daysNeededToPass} วัน
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Printable Official Signatures */}
        <div className="hidden print:grid grid-cols-3 gap-8 pt-12 text-center text-xs text-slate-800">
          <div className="space-y-12">
            <p>ลงชื่อ............................................................</p>
            <div>
              <p className="font-semibold">(............................................................)</p>
              <p className="text-[11px] text-slate-600">ครูประจำชั้น / ครูที่ปรึกษา</p>
            </div>
          </div>

          <div className="space-y-12">
            <p>ลงชื่อ............................................................</p>
            <div>
              <p className="font-semibold">(............................................................)</p>
              <p className="text-[11px] text-slate-600">หัวหน้างานทะเบียนและวัดผล</p>
            </div>
          </div>

          <div className="space-y-12">
            <p>ลงชื่อ............................................................</p>
            <div>
              <p className="font-semibold">(............................................................)</p>
              <p className="text-[11px] text-slate-600">ผู้อำนวยการสถานศึกษา</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
