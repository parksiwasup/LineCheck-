"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import {
  Search,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CalendarDays,
  FileText,
  Printer,
  ArrowRight,
  Sparkles,
  School,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  User,
} from "lucide-react";
import {
  getStudentPortalDataAction,
  type StudentPortalData,
} from "@/actions/portal";
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

interface StudentPortalClientProps {
  initialStudentId?: string;
  sampleIds?: string[];
}

export function StudentPortalClient({
  initialStudentId = "",
  sampleIds = ["67001", "67002", "67003", "67004"],
}: StudentPortalClientProps) {
  const [searchId, setSearchId] = React.useState(initialStudentId);
  const [portalData, setPortalData] = React.useState<StudentPortalData | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);

  // Auto-fetch if initialStudentId is present
  React.useEffect(() => {
    if (initialStudentId) {
      handleSearch(initialStudentId);
    }
  }, [initialStudentId]);

  const handleSearch = async (idToQuery?: string) => {
    const query = (idToQuery || searchId).trim();
    if (!query) {
      toast.error("กรุณากรอกเลขประจำตัวนักเรียน");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const res = await getStudentPortalDataAction(query);
      if (res.success && res.data) {
        setPortalData(res.data);
      } else {
        setPortalData(null);
        toast.error(res.message || "ไม่พบข้อมูลนักเรียน");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      setPortalData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const { student, metrics, absenceList, recentRemedials } = portalData || {};
  const absences = absenceList ?? [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header & Search Bar (hidden in print) */}
      <div className="text-center space-y-2 pt-2 sm:pt-6 print:hidden">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <GraduationCap className="h-4 w-4" />
          <span>Student & Parent Self-Service Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          ระบบตรวจสอบเวลาเข้าแถวและแก้กิจกรรม
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
          พิมพ์เลขประจำตัวนักเรียนเพื่อตรวจสอบสถิติเวลาเข้าแถว เกณฑ์การประเมิน (ผ./มผ.) และจำนวนชั่วโมงจิตอาสาที่ต้องแก้แถว
        </p>

        {/* Search Input Box */}
        <div className="pt-3 max-w-md mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="พิมพ์เลขประจำตัวนักเรียน 5 หลัก (เช่น 67001)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="h-11 pl-10 text-sm rounded-xl font-medium shadow-xs"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 px-5 rounded-xl bg-primary text-primary-foreground gap-1.5 shadow-sm shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>ค้นหา</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Quick sample chips */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5 text-xs text-muted-foreground">
            <span>ตัวอย่างรหัส:</span>
            {sampleIds.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSearchId(id);
                  handleSearch(id);
                }}
                className="px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors font-mono cursor-pointer"
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result Section */}
      {portalData && student && metrics && (
        <div id="student-transcript-area" className="space-y-6">
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #student-transcript-area, #student-transcript-area * {
                    visibility: visible;
                  }
                  #student-transcript-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 1.5cm;
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

          {/* Official Printable Header (Visible in print) */}
          <div className="hidden print:block text-center space-y-1 border-b-2 border-slate-900 pb-4 mb-6">
            <h2 className="text-xl font-bold">สถานศึกษา / โรงเรียน LineCheck+ Academy</h2>
            <h3 className="text-base font-semibold">ใบรายงานผลเวลาเข้าร่วมกิจกรรมเข้าแถวหน้าเสาธงรายบุคคล</h3>
            <p className="text-xs text-slate-600">
              ข้อมูล ณ วันที่ {format(new Date(), "d MMMM yyyy", { locale: th })}
            </p>
          </div>

          {/* Main Profile & Grade Card */}
          <Card className="border-2 shadow-sm overflow-hidden">
            <div
              className={`p-1.5 ${
                metrics.isCompliant
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                  : "bg-gradient-to-r from-rose-500 to-amber-500"
              }`}
            />
            <CardHeader className="pb-3 pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-xl shrink-0">
                    <User className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl sm:text-2xl">
                        {student.fullName}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs font-mono">
                        รหัส {student.studentId}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs sm:text-sm mt-0.5">
                      ห้องเรียน: <strong>{student.classroom}</strong> • สถานะ:{" "}
                      {student.status === "ACTIVE" ? "กำลังศึกษา" : "พักการเรียน"}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {metrics.isCompliant ? (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2 text-emerald-700 dark:text-emerald-300">
                      <ShieldCheck className="h-5 w-5" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider">
                          ผลการประเมิน
                        </p>
                        <p className="text-base font-black">ผ่านเกณฑ์ (ผ.)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2 text-rose-700 dark:text-rose-300">
                      <ShieldAlert className="h-5 w-5" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider">
                          ผลการประเมิน
                        </p>
                        <p className="text-base font-black">ตกเกณฑ์ (มผ.)</p>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="h-10 text-xs gap-1.5 no-print"
                  >
                    <Printer className="h-4 w-4" />
                    <span>พิมพ์ใบรายงานผล (PDF)</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-2">
              {/* Progress Gauge & Stats Bar */}
              <div className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary" />
                    เปอร์เซ็นต์เวลาเข้าแถวสุทธิ (Net Rate)
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-black ${
                        metrics.isCompliant
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {metrics.netAttendancePercent.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (เกณฑ์มาตรฐาน 80%)
                    </span>
                  </div>
                </div>

                {/* Progress bar with 80% mark */}
                <div className="relative h-4 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      metrics.isCompliant
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                        : "bg-gradient-to-r from-rose-500 to-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, metrics.netAttendancePercent)}%` }}
                  />
                  {/* 80% threshold indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white z-10"
                    style={{ left: "80%" }}
                    title="เกณฑ์ขั้นต่ำ 80%"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                  <span>0%</span>
                  <span className="font-bold text-foreground">เกณฑ์ผ่าน 80%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* 3 Metric Highlight Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    สถิติการมาเรียน
                  </p>
                  <p className="text-xl font-bold">
                    {metrics.presentDays} / {metrics.totalDays}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      วัน
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    สาย {metrics.lateDays} วัน • ลา {metrics.leaveDays} วัน
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                    ขาดเข้าแถวสะสม
                  </p>
                  <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                    {metrics.absentDays}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      วัน
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    แก้แล้ว {metrics.approvedRemedialCount} วัน • รอตรวจ{" "}
                    {metrics.pendingRemedialCount} วัน
                  </p>
                </div>

                <div
                  className={`rounded-xl border p-3.5 space-y-1 ${
                    metrics.isCompliant
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100"
                      : "border-rose-500/30 bg-rose-500/5 text-rose-950 dark:text-rose-100"
                  }`}
                >
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    ชั่วโมงจิตอาสาที่ต้องแก้แถว
                  </p>
                  {metrics.isCompliant ? (
                    <div>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        0 ชม. (ผ่านเกณฑ์)
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        เวลาเรียนสุทธิครบตามระเบียบ 80% แล้ว
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                        ต้องทำเพิ่ม {metrics.hoursNeededToPass} ชม.
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        เทียบเท่าแก้แถวอีก {metrics.daysNeededToPass} วัน เพื่อให้ได้ 80%
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Absent dates breakdown table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    ประวัติวันที่ขาดแถวและการแก้กิจกรรม ({absences.length} วัน)
                  </h3>
                </div>

                {absences.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    🎉 ยอดเยี่ยมมาก! นักเรียนไม่เคยมีประวัติขาดแถวเลย
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="text-xs">วันที่ขาดแถว</TableHead>
                          <TableHead className="text-xs">หมายเหตุ</TableHead>
                          <TableHead className="text-xs">สถานะการแก้แถว</TableHead>
                          <TableHead className="text-xs">กิจกรรมจิตอาสา</TableHead>
                          <TableHead className="text-xs text-right">หลักฐาน</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {absences.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs font-medium">
                              {item.dateFormatted}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {item.remark || "ขาดแถวหน้าเสาธง"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {item.remedialStatus === "APPROVED" ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                                  อนุมัติชดเชยแล้ว
                                </Badge>
                              ) : item.remedialStatus === "PENDING" ? (
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                                  รอครูตรวจสอบ
                                </Badge>
                              ) : item.remedialStatus === "REJECTED" ? (
                                <Badge variant="destructive" className="text-[10px]">
                                  ไม่ผ่าน (ต้องส่งใหม่)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-500/30">
                                  ยังไม่ได้แก้แถว
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {item.activityTitle ? (
                                <span>
                                  {item.activityTitle} ({item.hoursEarned} ชม.)
                                </span>
                              ) : (
                                <span className="text-muted-foreground/60">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              {item.proofUrl ? (
                                <a
                                  href={item.proofUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-[11px]"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  ดูรูปถ่าย
                                </a>
                              ) : (
                                <span className="text-muted-foreground/60">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Advice box for student */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-1">
                <p className="font-semibold text-foreground">💡 คำแนะนำสำหรับนักเรียนและผู้ปกครอง:</p>
                <p className="text-muted-foreground leading-relaxed">
                  หากนักเรียนยังมีผลการประเมินเป็น <strong>&ldquo;มผ.&rdquo;</strong> หรือมีวันที่ยังไม่ได้แก้แถว ขอให้นักเรียนติดต่อครูที่ปรึกษาประจำชั้นห้อง <strong>{student.classroom}</strong> เพื่อขอรับมอบหมายกิจกรรมจิตอาสา เช่น ช่วยเหลืองานห้องสมุด ทำความสะอาดบริเวณโรงเรียน หรือบำเพ็ญประโยชน์ เพื่อชดเชยเวลาเรียนให้ครบตามเกณฑ์ 80% ก่อนวันปิดภาคเรียน
                </p>
              </div>

              {/* Signatures for Print view only */}
              <div className="hidden print:grid grid-cols-2 gap-8 pt-12 text-center text-xs">
                <div className="space-y-10">
                  <p>ลงชื่อ.................................................................</p>
                  <div>
                    <p className="font-semibold">(.................................................................)</p>
                    <p className="text-slate-600">ครูประจำชั้น / ที่ปรึกษา</p>
                  </div>
                </div>

                <div className="space-y-10">
                  <p>ลงชื่อ.................................................................</p>
                  <div>
                    <p className="font-semibold">(.................................................................)</p>
                    <p className="text-slate-600">นักเรียน / ผู้ปกครองรับทราบ</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Initial Empty state */}
      {!portalData && !isLoading && hasSearched && (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Search className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold">ไม่พบข้อมูลนักเรียน</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              กรุณาตรวจสอบความถูกต้องของเลขประจำตัวนักเรียน หรือสอบถามครูประจำชั้น
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
