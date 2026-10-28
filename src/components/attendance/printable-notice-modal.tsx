"use client";

import * as React from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Printer, Download, X, School, AlertTriangle, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { StudentDeficitReportItem } from "@/actions/remedial";

interface PrintableNoticeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentDeficitReportItem[];
  classrooms?: string[];
}

export function PrintableNoticeModal({
  open,
  onOpenChange,
  students,
  classrooms = [],
}: PrintableNoticeModalProps) {
  const [selectedClassroom, setSelectedClassroom] = React.useState<string>("ALL");

  const filteredStudents = React.useMemo(() => {
    if (selectedClassroom === "ALL") return students;
    return students.filter((s) => s.classroom === selectedClassroom);
  }, [students, selectedClassroom]);

  const todayFormatted = React.useMemo(() => {
    return format(new Date(), "d MMMM yyyy", { locale: th });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const exportData = filteredStudents.map((s, idx) => ({
      "ลำดับ": idx + 1,
      "รหัสนักเรียน": s.studentId,
      "คำนำหน้า": s.title,
      "ชื่อจริง": s.firstName,
      "นามสกุล": s.lastName,
      "ห้องเรียน": s.classroom,
      "สัปดาห์นี้มา (วัน)": s.thisWeekPresentDays,
      "สัปดาห์นี้ขาด (วัน)": s.thisWeekAbsentDays,
      "สถานะสัปดาห์นี้":
        s.thisWeekStatus === "PASSED"
          ? "ผ่าน (≥ 3 วัน)"
          : s.thisWeekStatus === "FAILED"
          ? "ตกเกณฑ์ (< 3 วัน)"
          : "กำลังสะสม",
      "เป้าหมายเทอม (ครั้ง)": 45,
      "มาปกติสะสม (ครั้ง)": s.presentDays,
      "แก้แถวที่อนุมัติ (ครั้ง)": s.approvedRemedialCount,
      "ยอดสุทธิ (ครั้ง)": s.effectivePresentDays,
      "ขาดอีก (ครั้ง)": s.remainingDeficitDays,
      "สถานะ": s.isCompletedSemester ? "ครบ 45 ครั้งแล้ว" : `ขาดอีก ${s.remainingDeficitDays} ครั้ง`,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DeficitNotice");

    ws["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 22 },
    ];

    const fileName = `รายงานนักเรียนตกเกณฑ์แก้แถว_${selectedClassroom === "ALL" ? "ทุกห้อง" : selectedClassroom}_${format(
      new Date(),
      "yyyyMMdd"
    )}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 print:border-none print:shadow-none print:p-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 border-b border-border print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary" />
                ใบแจ้งรายชื่อนักเรียนที่ต้องแก้กิจกรรมเข้าแถว (เป้าหมาย 45 ครั้ง / สัปดาห์ละ ≥ 3 วัน)
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                พิมพ์เอกสารราชการสำหรับติดประกาศ หรือส่งออกเป็นรายงานผู้บริหาร
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">กรองห้อง:</span>
                <select
                  value={selectedClassroom}
                  onChange={(e) => setSelectedClassroom(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-card px-2 text-xs font-medium"
                >
                  <option value="ALL">ทุกห้องเรียน ({students.length} คน)</option>
                  {classrooms.map((c) => (
                    <option key={c} value={c}>
                      ห้อง {c}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-8 text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                ส่งออก Excel
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handlePrint}
                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground"
              >
                <Printer className="h-3.5 w-3.5" />
                พิมพ์เอกสาร / บันทึก PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Printable Paper Area */}
        <div id="printable-notice-area" className="p-6 sm:p-10 bg-white text-slate-900 print:p-0">
          <style dangerouslySetInnerHTML={{
            __html: `
              @media print {
                body * {
                  visibility: hidden;
                }
                #printable-notice-area, #printable-notice-area * {
                  visibility: visible;
                }
                #printable-notice-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  margin: 0;
                  padding: 1.5cm;
                  background: white !important;
                  color: black !important;
                }
              }
            `
          }} />

          {/* Letterhead */}
          <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4">
            <div className="flex items-center justify-center gap-2">
              <School className="h-7 w-7 text-slate-800" />
              <h2 className="text-xl font-bold tracking-tight">
                สถานศึกษา / โรงเรียน LineCheck+ Academy
              </h2>
            </div>
            <h3 className="text-base font-semibold">
              งานกิจกรรมพัฒนาผู้เรียนและฝ่ายกิจการนักเรียน
            </h3>
            <p className="text-sm font-medium">
              ประกาศรายชื่อนักเรียนที่มีเวลาเข้าร่วมกิจกรรมหน้าเสาธงไม่เป็นไปตามเกณฑ์ (เป้าหมาย 45 ครั้ง / สัปดาห์ละ ≥ 3 วัน)
            </p>
            <p className="text-xs text-slate-600">
              ข้อมูล ณ วันที่ {todayFormatted} • ห้องเรียน: {selectedClassroom === "ALL" ? "ทุกห้องเรียน" : `ห้อง ${selectedClassroom}`}
            </p>
          </div>

          {/* Notice description */}
          <div className="my-4 text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 print:bg-transparent print:border-none print:p-0">
            <strong>คำชี้แจง:</strong> ตามระเบียบว่าด้วยการวัดและประเมินผลกิจกรรมพัฒนาผู้เรียน นักเรียนทุกคนใน 1 ภาคเรียนต้องเข้าร่วมกิจกรรมหน้าเสาธงให้ครบอย่างน้อย 45 ครั้ง และภายในแต่ละสัปดาห์ (จันทร์ - ศุกร์) ต้องเข้าแถวไม่น้อยกว่า 3 วัน จึงจะได้รับการตัดสินผลการประเมินเป็น <strong>&ldquo;ผ่าน (ผ)&rdquo;</strong> หากนักเรียนมีรายชื่อปรากฏในเอกสารฉบับนี้ ขอให้ติดต่อครูที่ปรึกษาเพื่อรับมอบหมายกิจกรรมจิตอาสา/บำเพ็ญประโยชน์ชดเชยเวลาเรียนให้ครบตามเกณฑ์ก่อนสิ้นสุดภาคเรียน
          </div>

          {/* Table */}
          <div className="overflow-x-auto my-4">
            <table className="w-full text-left text-xs border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-200 text-slate-900 border-b border-slate-400">
                  <th className="border border-slate-400 px-2 py-1.5 text-center w-10">ลำดับ</th>
                  <th className="border border-slate-400 px-2 py-1.5 text-center w-24">รหัสประจำตัว</th>
                  <th className="border border-slate-400 px-2.5 py-1.5">ชื่อ - นามสกุล</th>
                  <th className="border border-slate-400 px-2 py-1.5 text-center w-16">ห้อง</th>
                  <th className="border border-slate-400 px-2 py-1.5 text-center w-24">สัปดาห์นี้ (≥3 วัน)</th>
                  <th className="border border-slate-400 px-2 py-1.5 text-center w-20">มาสะสม (ครั้ง)</th>
                  <th className="border border-slate-400 px-2 py-1.5 text-center w-20">แก้แล้ว (ครั้ง)</th>
                  <th className="border border-slate-400 px-2 py-1.5 text-center w-24">ยอดสุทธิ (เป้า 45)</th>
                  <th className="border border-slate-400 px-2 py-1.5 text-center w-20">ขาดอีก</th>
                  <th className="border border-slate-400 px-2.5 py-1.5 text-center w-24">สถานะปัจจุบัน</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="border border-slate-400 text-center py-6 text-slate-500">
                      ไม่มีนักเรียนที่ไม่ผ่านเกณฑ์ในห้องที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => (
                    <tr key={s.id} className="border-b border-slate-300">
                      <td className="border border-slate-300 px-2 py-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-semibold">
                        {s.studentId}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-1.5 font-medium">{s.fullName}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">{s.classroom}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">
                        {s.thisWeekStatus === "PASSED" ? (
                          <span className="text-emerald-700 font-semibold">ผ่าน ({s.thisWeekPresentDays}/3 วัน)</span>
                        ) : s.thisWeekStatus === "FAILED" ? (
                          <span className="text-rose-600 font-semibold">ตกเกณฑ์ ({s.thisWeekPresentDays}/3 วัน)</span>
                        ) : (
                          <span className="text-amber-600 font-medium">สะสม ({s.thisWeekPresentDays}/3 วัน)</span>
                        )}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">
                        {s.presentDays}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-emerald-700">
                        {s.approvedRemedialCount > 0 ? `+${s.approvedRemedialCount}` : "-"}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                        {s.effectivePresentDays} / 45
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-rose-600">
                        {s.remainingDeficitDays > 0 ? `${s.remainingDeficitDays} ครั้ง` : "-"}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-center">
                        {s.isCompletedSemester && s.thisWeekStatus !== "FAILED" ? (
                          <span className="text-emerald-700 font-semibold">ผ่านเกณฑ์</span>
                        ) : (
                          <span className="text-red-600 font-semibold">ต้องแก้แถว</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs text-slate-800">
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
                <p className="text-[11px] text-slate-600">หัวหน้างานกิจกรรมพัฒนาผู้เรียน</p>
              </div>
            </div>

            <div className="space-y-12">
              <p>ลงชื่อ............................................................</p>
              <div>
                <p className="font-semibold">(............................................................)</p>
                <p className="text-[11px] text-slate-600">รองผู้อำนวยการฝ่ายกิจการนักเรียน</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 print:hidden flex justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
            ปิด
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              ส่งออก Excel
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="text-xs gap-1.5 bg-primary text-primary-foreground"
            >
              <Printer className="h-3.5 w-3.5" />
              พิมพ์เอกสาร (Print / PDF)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
