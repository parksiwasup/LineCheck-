"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Info,
  Check,
} from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  bulkImportStudentsAction,
  type BulkStudentRowInput,
} from "@/actions/admin";

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  existingClassrooms?: string[];
  initialClassroom?: string;
}

interface ParsedStudentRow extends BulkStudentRowInput {
  _rowNum: number;
  _isValid: boolean;
  _errorMsg?: string;
}

export function BulkImportModal({
  open,
  onOpenChange,
  onSuccess,
  existingClassrooms = ["ม.4/1", "ม.4/2", "ม.5/1", "ม.6/1"],
  initialClassroom = "",
}: BulkImportModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedRows, setParsedRows] = React.useState<ParsedStudentRow[]>([]);
  const [defaultClassroom, setDefaultClassroom] = React.useState<string>(initialClassroom);
  const [forceClassroomOverride, setForceClassroomOverride] = React.useState<boolean>(false);
  const [importMode, setImportMode] = React.useState<"UPSERT" | "SKIP_EXISTING">("UPSERT");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isParsing, setIsParsing] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync initial classroom when modal opens or filter changes
  React.useEffect(() => {
    if (open) {
      if (initialClassroom) {
        setDefaultClassroom(initialClassroom);
      }
    } else {
      setFile(null);
      setParsedRows([]);
      setIsProcessing(false);
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open, initialClassroom]);

  // Helper to normalize header names
  const normalizeKey = (key: string): string => {
    return key.toString().trim().toLowerCase().replace(/[\s\-_]/g, "");
  };

  // Helper to parse Thai full name into title, firstName, lastName
  const splitThaiName = (rawName: string) => {
    let name = rawName.trim();
    let title = "นาย";
    const prefixes = [
      "เด็กชาย",
      "เด็กหญิง",
      "ด.ช.",
      "ด.ญ.",
      "นาย",
      "นางสาว",
      "น.ส.",
      "นาง",
    ];

    for (const p of prefixes) {
      if (name.startsWith(p)) {
        title = p;
        name = name.substring(p.length).trim();
        break;
      }
    }

    const parts = name.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "-";

    return { title, firstName, lastName };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        defval: "",
        raw: false,
      });

      if (!jsonData || jsonData.length === 0) {
        toast.error("ไม่พบข้อมูลในชีตแรกของไฟล์");
        setIsParsing(false);
        return;
      }

      const rows: ParsedStudentRow[] = [];
      const seenIds = new Set<string>();

      jsonData.forEach((row: any, idx: number) => {
        const rowNum = idx + 2; // header is row 1
        const keys = Object.keys(row);

        // Find relevant column values
        let studentId = "";
        let title = "";
        let firstName = "";
        let lastName = "";
        let classroom = "";
        let status = "ACTIVE";
        let fullName = "";

        for (const k of keys) {
          const val = String(row[k] || "").trim();
          const nk = normalizeKey(k);

          if (
            nk.includes("รหัสนักเรียน") ||
            nk.includes("รหัสประจำตัว") ||
            nk.includes("เลขประจำตัว") ||
            nk === "studentid" ||
            nk === "id" ||
            nk === "รหัส"
          ) {
            studentId = val;
          } else if (
            nk.includes("คำนำหน้า") ||
            nk === "title" ||
            nk === "prefix"
          ) {
            title = val;
          } else if (
            nk.includes("ชื่อสกุล") ||
            nk.includes("ชื่อ-สกุล") ||
            nk === "fullname"
          ) {
            fullName = val;
          } else if (
            nk.includes("ชื่อจริง") ||
            nk === "ชื่อ" ||
            nk === "firstname" ||
            nk === "name"
          ) {
            firstName = val;
          } else if (
            nk.includes("นามสกุล") ||
            nk === "lastname" ||
            nk === "surname"
          ) {
            lastName = val;
          } else if (
            nk.includes("ห้องเรียน") ||
            nk.includes("ห้อง") ||
            nk.includes("ชั้นเรียน") ||
            nk === "classroom" ||
            nk === "class" ||
            nk === "room"
          ) {
            classroom = val;
          } else if (nk.includes("สถานะ") || nk === "status") {
            status = val;
          }
        }

        // If no explicit firstName but fullName exists, split it
        if (!firstName && fullName) {
          const split = splitThaiName(fullName);
          if (!title) title = split.title;
          firstName = split.firstName;
          if (!lastName) lastName = split.lastName;
        }

        // Format student ID cleanly
        studentId = studentId.replace(/[^\w\d]/g, "");

        // Validation
        let isValid = true;
        let errorMsg = "";

        if (!studentId) {
          isValid = false;
          errorMsg = "ไม่มีรหัสนักเรียน";
        } else if (seenIds.has(studentId)) {
          isValid = false;
          errorMsg = "รหัสซ้ำกับแถวก่อนหน้าในไฟล์";
        } else if (!firstName) {
          isValid = false;
          errorMsg = "ไม่มีชื่อนักเรียน";
        }

        if (isValid) {
          seenIds.add(studentId);
        }

        rows.push({
          _rowNum: rowNum,
          _isValid: isValid,
          _errorMsg: errorMsg,
          studentId,
          title: title || "นาย",
          firstName,
          lastName: lastName || "-",
          classroom,
          status:
            status.toLowerCase().includes("inactive") ||
            status.includes("พัก") ||
            status.includes("ย้าย")
              ? "INACTIVE"
              : "ACTIVE",
        });
      });

      setParsedRows(rows);
      toast.success(`อ่านข้อมูลสำเร็จ: พบทั้งหมด ${rows.length} รายการ`);
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบว่าเป็นไฟล์ Excel หรือ CSV ที่ถูกต้อง");
    } finally {
      setIsParsing(false);
    }
  };

  const handleDownloadTemplate = (type: "xlsx" | "csv") => {
    const templateData = [
      {
        "รหัสนักเรียน": "67001",
        "คำนำหน้า": "นาย",
        "ชื่อจริง": "ธนกฤต",
        "นามสกุล": "สมบูรณ์",
        "ห้องเรียน": "ม.4/1",
        "สถานะ": "กำลังศึกษา",
      },
      {
        "รหัสนักเรียน": "67002",
        "คำนำหน้า": "นางสาว",
        "ชื่อจริง": "กมลวรรณ",
        "นามสกุล": "แสงแก้ว",
        "ห้องเรียน": "ม.4/1",
        "สถานะ": "กำลังศึกษา",
      },
      {
        "รหัสนักเรียน": "67003",
        "คำนำหน้า": "นาย",
        "ชื่อจริง": "ปกรณ์",
        "นามสกุล": "วัฒนา",
        "ห้องเรียน": "ม.4/2",
        "สถานะ": "กำลังศึกษา",
      },
      {
        "รหัสนักเรียน": "67004",
        "คำนำหน้า": "นางสาว",
        "ชื่อจริง": "พิมลภา",
        "นามสกุล": "ศิริชัย",
        "ห้องเรียน": "ม.5/1",
        "สถานะ": "กำลังศึกษา",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");

    // Auto width
    ws["!cols"] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
    ];

    const fileName = `linecheck_student_template.${type}`;
    if (type === "csv") {
      XLSX.writeFile(wb, fileName, { bookType: "csv" });
    } else {
      XLSX.writeFile(wb, fileName, { bookType: "xlsx" });
    }
    toast.success(`ดาวน์โหลดไฟล์แม่แบบ ${fileName} สำเร็จ`);
  };

  const handleStartImport = async () => {
    const validRowsToImport = parsedRows
      .filter((r) => r._isValid)
      .map((r) => ({
        studentId: r.studentId,
        title: r.title,
        firstName: r.firstName,
        lastName: r.lastName,
        classroom:
          forceClassroomOverride && defaultClassroom
            ? defaultClassroom
            : r.classroom || defaultClassroom,
        status: r.status,
      }));

    if (validRowsToImport.length === 0) {
      toast.error("ไม่มีข้อมูลที่ผ่านการตรวจสอบสำหรับนำเข้า");
      return;
    }

    // Check if any row has missing classroom without default
    const missingClassroom = validRowsToImport.some((r) => !r.classroom);
    if (missingClassroom && !defaultClassroom) {
      toast.error("พบข้อมูลบางรายการไม่มีห้องเรียน กรุณาระบุ 'ห้องเรียนเริ่มต้น' ด้านล่าง");
      return;
    }

    setIsProcessing(true);

    try {
      const res = await bulkImportStudentsAction(validRowsToImport, {
        mode: importMode,
        defaultClassroom: defaultClassroom || undefined,
      });

      if (res.success) {
        toast.success(res.message);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter((r) => r._isValid).length;
  const invalidCount = parsedRows.filter((r) => !r._isValid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                นำเข้ารายชื่อนักเรียนแบบกลุ่ม (Bulk Import from Excel / CSV)
              </DialogTitle>
              <DialogDescription>
                รองรับไฟล์นามสกุล .xlsx, .xls และ .csv เพิ่มหรืออัปเดตนักเรียนได้พร้อมกันหลายคน
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 my-2">
          {/* Step 1: Download template */}
          <div className="rounded-xl border border-border bg-muted/30 p-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  ขั้นตอนที่ 1: เตรียมไฟล์ตามแม่แบบ
                </span>
                <p className="text-xs text-foreground/80">
                  ดาวน์โหลดไฟล์ตัวอย่างที่มีคอลัมน์มาตรฐานครบถ้วนไปกรอกข้อมูล
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate("xlsx")}
                  className="h-8 text-xs gap-1.5"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  แม่แบบ Excel (.xlsx)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate("csv")}
                  className="h-8 text-xs gap-1.5"
                >
                  <Download className="h-3.5 w-3.5 text-blue-600" />
                  แม่แบบ CSV (.csv)
                </Button>
              </div>
            </div>
          </div>

          {/* Step 2: Upload file */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-primary" />
              ขั้นตอนที่ 2: เลือกไฟล์ Excel หรือ CSV จากเครื่อง
            </Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {isParsing ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {file ? file.name : "คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  รองรับไฟล์ .xlsx, .xls หรือ .csv ขนาดไม่เกิน 10MB
                </p>
              </div>
              {file && (
                <Badge variant="outline" className="mt-1 gap-1 text-xs font-normal">
                  <Check className="h-3 w-3 text-emerald-600" />
                  เลือกไฟล์แล้ว ({Math.round(file.size / 1024)} KB)
                </Badge>
              )}
            </div>
          </div>

          {/* Step 3: Options & Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">ผลการตรวจสอบข้อมูล:</span>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    ทั้งหมด {parsedRows.length} แถว
                  </Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    ผ่านเกณฑ์ {validCount} คน
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <XCircle className="h-3 w-3" />
                      พบข้อผิดพลาด {invalidCount} แถว
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="import-mode" className="text-xs whitespace-nowrap">
                    หากพบรหัสซ้ำ:
                  </Label>
                  <select
                    id="import-mode"
                    value={importMode}
                    onChange={(e) =>
                      setImportMode(e.target.value as "UPSERT" | "SKIP_EXISTING")
                    }
                    className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-medium"
                  >
                    <option value="UPSERT">อัปเดตข้อมูลเดิม (Upsert)</option>
                    <option value="SKIP_EXISTING">ข้ามรายชื่อเดิม (Skip)</option>
                  </select>
                </div>
              </div>

              {/* Classroom Assignment Box */}
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      🏫 การกำหนดห้องเรียนสำหรับไฟล์นี้
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      เลือกห้องเรียนที่จะจัดนักเรียนเข้า หรือปล่อยว่างเพื่อให้ระบบอ่านห้องจากในไฟล์
                    </p>
                  </div>
                  {defaultClassroom && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs gap-1 shrink-0">
                      ห้องที่เลือก: {defaultClassroom}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label htmlFor="default-classroom" className="text-xs font-medium">
                      เลือกห้องเรียน:
                    </Label>
                    <select
                      id="default-classroom"
                      value={defaultClassroom}
                      onChange={(e) => setDefaultClassroom(e.target.value)}
                      className="w-full mt-1 h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-medium"
                    >
                      <option value="">-- ใช้ตามคอลัมน์ในไฟล์ Excel (ถ้ามี) --</option>
                      {existingClassrooms.map((c) => (
                        <option key={c} value={c}>
                          กำหนดให้นักเรียนทุกคนอยู่ห้อง {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="custom-classroom" className="text-xs font-medium">
                      หรือพิมพ์ระบุห้องเรียนเอง:
                    </Label>
                    <Input
                      id="custom-classroom"
                      placeholder="เช่น ม.4/1 หรือ ม.5/2"
                      value={defaultClassroom}
                      onChange={(e) => setDefaultClassroom(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>

                {defaultClassroom && (
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={forceClassroomOverride}
                      onChange={(e) => setForceClassroomOverride(e.target.checked)}
                      className="rounded border-border text-primary"
                    />
                    <span>
                      บังคับกำหนดทุกคนในไฟล์นี้ให้อยู่ห้อง <strong>{defaultClassroom}</strong> (แม้ในไฟล์จะมีระบุห้องอื่นไว้)
                    </span>
                  </label>
                )}
              </div>

              {/* Preview Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="max-h-56 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-12 text-xs">แถว</TableHead>
                        <TableHead className="text-xs">รหัสนักเรียน</TableHead>
                        <TableHead className="text-xs">คำนำหน้า</TableHead>
                        <TableHead className="text-xs">ชื่อจริง</TableHead>
                        <TableHead className="text-xs">นามสกุล</TableHead>
                        <TableHead className="text-xs">ห้องเรียน</TableHead>
                        <TableHead className="text-xs text-right">สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.slice(0, 50).map((r) => {
                        const assignedClass =
                          forceClassroomOverride && defaultClassroom
                            ? defaultClassroom
                            : r.classroom || defaultClassroom;

                        return (
                          <TableRow
                            key={r._rowNum}
                            className={!r._isValid ? "bg-red-500/10" : undefined}
                          >
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {r._rowNum}
                            </TableCell>
                            <TableCell className="text-xs font-semibold font-mono">
                              {r.studentId || "-"}
                            </TableCell>
                            <TableCell className="text-xs">{r.title}</TableCell>
                            <TableCell className="text-xs font-medium">
                              {r.firstName || "-"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.lastName}
                            </TableCell>
                            <TableCell className="text-xs">
                              {assignedClass ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                                  {assignedClass}
                                  <span className="text-[10px] text-muted-foreground font-normal">
                                    {r.classroom && !forceClassroomOverride
                                      ? "(จากไฟล์)"
                                      : "(กำหนดเอง)"}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-amber-600 font-semibold text-[11px] flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  ยังไม่ได้ระบุห้อง
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              {r._isValid ? (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]"
                                >
                                  สมบูรณ์
                                </Badge>
                              ) : (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px]"
                                  title={r._errorMsg}
                                >
                                  {r._errorMsg}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {parsedRows.length > 50 && (
                  <div className="p-2 text-center text-xs text-muted-foreground bg-muted/20 border-t border-border">
                    แสดงตัวอย่าง 50 รายการแรก จากทั้งหมด {parsedRows.length} รายการ
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="w-full sm:w-auto text-xs"
          >
            ยกเลิก
          </Button>

          <Button
            type="button"
            onClick={handleStartImport}
            disabled={isProcessing || validCount === 0}
            className="w-full sm:w-auto bg-primary text-primary-foreground gap-2 text-xs"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังนำเข้าข้อมูล {validCount} รายการ...
              </>
            ) : (
              <>
                <span>เริ่มนำเข้าข้อมูล ({validCount} คน)</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
