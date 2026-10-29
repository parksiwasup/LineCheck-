"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  useTable,
  tableFeatures,
  rowSortingFeature,
  rowPaginationFeature,
  createSortedRowModel,
  createPaginatedRowModel,
  sortFns,
  createColumnHelper,
} from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FilePlus2,
  Search,
  ArrowUpDown,
  Check,
  X,
  Sparkles,
  CalendarDays,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  Printer,
  Download,
  Camera,
  Image as ImageIcon,
  Target,
  Copy,
} from "lucide-react";
import * as XLSX from "xlsx";
import { PrintableNoticeModal } from "./printable-notice-modal";
import { StudentMonthlyCalendarModal } from "./student-monthly-calendar";
import {
  submitRemedialTaskAction,
  reviewRemedialTaskAction,
  type StudentDeficitReportItem,
  type RemedialLogItem,
} from "@/actions/remedial";
import { useAttendanceStore } from "@/store/use-attendance-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Configure @tanstack/react-table v9 features
const remedialTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns,
});

const columnHelper = createColumnHelper<
  typeof remedialTableFeatures,
  StudentDeficitReportItem
>();

const remedialFormSchema = z.object({
  studentId: z.string().min(1, "กรุณาเลือกนักเรียน"),
  targetDate: z.string().min(1, "กรุณาเลือกวันที่ขาดแถวที่ต้องการนำมาแก้"),
  activityTitle: z
    .string()
    .min(3, "กรุณาระบุชื่อกิจกรรมจิตอาสา/บำเพ็ญประโยชน์อย่างน้อย 3 ตัวอักษร"),
  description: z
    .string()
    .min(5, "กรุณาระบุรายละเอียดการปฏิบัติงานอย่างน้อย 5 ตัวอักษร"),
  hoursEarned: z
    .number()
    .min(0.5, "จำนวนชั่วโมงต้องตั้งแต่ 0.5 ชม.")
    .max(12, "ไม่เกิน 12 ชม. ต่อครั้ง"),
  proofUrl: z.string().optional(),
  autoApprove: z.boolean(),
});

type RemedialFormValues = z.infer<typeof remedialFormSchema>;

const PRESET_ACTIVITIES = [
  "จิตอาสาทำความสะอาดลานอเนกประสงค์",
  "ช่วยงานห้องสมุดจัดเรียงหมวดหมู่หนังสือ",
  "บำเพ็ญประโยชน์คัดแยกขยะรีไซเคิล",
  "ดูแลแปลงเกษตรและรดน้ำต้นไม้โรงเรียน",
];

interface RemedialManagementClientProps {
  classrooms: string[];
  initialReport: {
    deficitStudents: StudentDeficitReportItem[];
    allRemedialLogs: RemedialLogItem[];
    stats: {
      targetSemesterDays: number;
      totalStudents: number;
      completed45Count: number;
      incompleted45Count: number;
      weeklyPassedCount: number;
      weeklyFailedCount: number;
      weeklyInProgressCount: number;
      scheduledMakeupStudentsCount: number;
      overdueStudentsCount: number;
      pendingApprovalCount: number;
      remediedSuccessCount: number;
      totalBelowStandardRaw: number;
      stillDeficitCount: number;
    };
  };
  currentUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: "TEACHER" | "ADMIN";
    classrooms?: string | null;
  } | null;
}

export function RemedialManagementClient({
  classrooms,
  initialReport,
  currentUser,
}: RemedialManagementClientProps) {
  const router = useRouter();
  const {
    remedialClassroomFilter,
    setRemedialClassroomFilter,
    remedialSearchQuery,
    setRemedialSearchQuery,
    activeRole,
  } = useAttendanceStore();

  const userRole = currentUser?.role ?? activeRole;
  const teacherRooms = React.useMemo(() => {
    if (!currentUser?.classrooms) return [];
    return currentUser.classrooms.split(",").map((c) => c.trim()).filter(Boolean);
  }, [currentUser?.classrooms]);

  const [isPending, startTransition] = React.useTransition();
  const [statusFilter, setStatusFilter] = React.useState<
    "ALL" | "SCHEDULED_MAKEUP" | "OVERDUE_DEBT" | "INCOMPLETE_45" | "COMPLETED_45"
  >("ALL");
  const [selectedStudent, setSelectedStudent] =
    React.useState<StudentDeficitReportItem | null>(
      initialReport.deficitStudents[0] ?? null
    );
  const [calendarStudentCode, setCalendarStudentCode] = React.useState<string | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [isPrintNoticeOpen, setIsPrintNoticeOpen] = React.useState(false);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = React.useState(false);
  const proofFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDirectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("ขนาดรูปภาพต้องไม่เกิน 10MB");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setIsUploadingProof(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        form.setValue("proofUrl", data.url);
        toast.success("อัปโหลดรูปภาพหลักฐานเรียบร้อยแล้ว");
      } else {
        toast.error(data.error || "ไม่สามารถอัปโหลดรูปภาพได้");
        setImagePreview(null);
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
      setImagePreview(null);
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleExportDeficitExcel = () => {
    const exportData = filteredDeficitData.map((s, idx) => ({
      "ลำดับ": idx + 1,
      "รหัสนักเรียน": s.studentId,
      "คำนำหน้า": s.title,
      "ชื่อจริง": s.firstName,
      "นามสกุล": s.lastName,
      "ห้องเรียน": s.classroom,
      "สัปดาห์นี้มา (วัน)": s.thisWeekPresentDays,
      "สัปดาห์นี้ขาด (วัน)": s.thisWeekAbsentDays,
      "สถานะสัปดาห์นี้ (เกณฑ์ ≥ 3 วัน)":
        s.thisWeekStatus === "PASSED"
          ? "ผ่านเกณฑ์สัปดาห์ (≥ 3 วัน)"
          : s.thisWeekStatus === "FAILED"
          ? "ตกเกณฑ์สัปดาห์ (< 3 วัน)"
          : "กำลังสะสม",
      "เป้าหมายเทอม (ครั้ง)": 45,
      "มาปกติสะสม (ครั้ง)": s.presentDays,
      "แก้แถวที่อนุมัติ (ครั้ง)": s.approvedRemedialCount,
      "ยอดสุทธิสะสม (ครั้ง)": s.effectivePresentDays,
      "ขาดอีก (ครั้ง)": s.remainingDeficitDays,
      "สถานะเทอม (ครบ 45 ครั้ง)": s.isCompletedSemester
        ? "ครบเกณฑ์ 45 ครั้งแล้ว"
        : `ยังขาดอีก ${s.remainingDeficitDays} ครั้ง`,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AttendanceReport");

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

    const fileName = `รายงานนักเรียนตกเกณฑ์แก้แถว_${remedialClassroomFilter === "ALL" ? "ทุกห้อง" : remedialClassroomFilter}_${format(
      new Date(),
      "yyyyMMdd"
    )}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("ส่งออกรายงาน Excel สำเร็จ");
  };

  const form = useForm<RemedialFormValues>({
    resolver: zodResolver(remedialFormSchema),
    defaultValues: {
      studentId: initialReport.deficitStudents[0]?.id ?? "",
      targetDate:
        initialReport.deficitStudents[0]?.absenceDates.find(
          (d) => d.remedialStatus === "NONE" || d.remedialStatus === "REJECTED"
        )?.dateIso ??
        initialReport.deficitStudents[0]?.absenceDates[0]?.dateIso ??
        "",
      activityTitle: PRESET_ACTIVITIES[0],
      description: "",
      hoursEarned: 1,
      proofUrl: "",
      autoApprove: false,
    },
  });

  // Sync selectedStudent when initialReport refreshes
  React.useEffect(() => {
    if (selectedStudent) {
      const updated = initialReport.deficitStudents.find(
        (s) => s.id === selectedStudent.id
      );
      if (updated) setSelectedStudent(updated);
    } else if (initialReport.deficitStudents.length > 0) {
      setSelectedStudent(initialReport.deficitStudents[0]);
    }
  }, [initialReport.deficitStudents, selectedStudent]);

  const handleOpenRemedialModal = (
    student: StudentDeficitReportItem,
    specificDateIso?: string
  ) => {
    setSelectedStudent(student);
    const availableAbsence =
      student.absenceDates.find(
        (d) => d.remedialStatus === "NONE" || d.remedialStatus === "REJECTED"
      ) ?? student.absenceDates[0];

    form.reset({
      studentId: student.id,
      targetDate: specificDateIso ?? availableAbsence?.dateIso ?? "",
      activityTitle: PRESET_ACTIVITIES[0],
      description: "",
      hoursEarned: 1,
      proofUrl: "",
      autoApprove: activeRole === "ADMIN",
    });
    setIsFormDialogOpen(true);
  };

  const onSubmitRemedialForm = (values: RemedialFormValues) => {
    startTransition(async () => {
      const res = await submitRemedialTaskAction(values);
      if (res.success) {
        toast.success("บันทึกกิจกรรมแก้แถวสำเร็จ", {
          description: res.message,
        });
        setIsFormDialogOpen(false);
        router.refresh();
      } else {
        toast.error("ไม่สามารถบันทึกได้", {
          description: res.message,
        });
      }
    });
  };

  const handleReviewLog = (
    remedialId: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    startTransition(async () => {
      const res = await reviewRemedialTaskAction({
        remedialId,
        status,
      });
      if (res.success) {
        if (status === "APPROVED") {
          toast.success(res.message, {
            description:
              res.remainingDeficitDays === 0
                ? "นักเรียนเข้าแถวสะสมครบเป้าหมาย 45 ครั้งแล้ว!"
                : `ยังขาดอีก ${res.remainingDeficitDays} ครั้งจึงจะครบ 45 ครั้ง`,
          });
        } else {
          toast.warning(res.message);
        }
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  // Filtered rows for @tanstack/react-table v9
  const filteredDeficitData = React.useMemo(() => {
    return initialReport.deficitStudents.filter((s) => {
      const matchClass =
        remedialClassroomFilter === "ALL" ||
        s.classroom === remedialClassroomFilter;
      const matchQuery =
        !remedialSearchQuery.trim() ||
        s.studentId.toLowerCase().includes(remedialSearchQuery.toLowerCase()) ||
        s.fullName.toLowerCase().includes(remedialSearchQuery.toLowerCase());

      let matchStatus = true;
      if (statusFilter === "SCHEDULED_MAKEUP") {
        matchStatus = s.graceMakeupAbsenceCount > 0;
      } else if (statusFilter === "OVERDUE_DEBT") {
        matchStatus = s.overdueAbsenceCount > 0;
      } else if (statusFilter === "INCOMPLETE_45") {
        matchStatus = !s.isCompletedSemester;
      } else if (statusFilter === "COMPLETED_45") {
        matchStatus = s.isCompletedSemester;
      }

      return matchClass && matchQuery && matchStatus;
    });
  }, [
    initialReport.deficitStudents,
    remedialClassroomFilter,
    remedialSearchQuery,
    statusFilter,
  ]);

  const columns = React.useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("studentId", {
          header: ({ column }) => (
            <button
              type="button"
              onClick={column.getToggleSortingHandler()}
              className="inline-flex items-center gap-1 font-semibold hover:text-foreground cursor-pointer"
            >
              <span>รหัสนักเรียน</span>
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          ),
          cell: (info) => {
            const sid = info.getValue();
            return (
              <div className="flex items-center gap-1.5 group/code">
                <button
                  type="button"
                  onClick={() => setCalendarStudentCode(sid)}
                  className="inline-flex items-center font-mono font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-lg border border-primary/20"
                  title="คลิกเพื่อดูปฏิทินรายเดือนของนักเรียน"
                >
                  {sid}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(sid);
                    toast.success(`คัดลอกรหัส ${sid} เรียบร้อยแล้ว`);
                  }}
                  className="flex items-center justify-center h-6 w-6 rounded-full border border-blue-400/80 bg-blue-50/80 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all cursor-pointer shadow-2xs shrink-0"
                  title="คัดลอกรหัสนักเรียน"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            );
          },
        }),
        columnHelper.accessor("fullName", {
          header: "ชื่อ - นามสกุล",
          cell: ({ row }) => (
            <button
              type="button"
              onClick={() => setCalendarStudentCode(row.original.studentId)}
              className="text-left group cursor-pointer"
              title="คลิกดูปฏิทินรายเดือนของนักเรียน"
            >
              <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                {row.original.fullName}
              </p>
              <p className="text-xs text-muted-foreground">
                ห้อง {row.original.classroom}
              </p>
            </button>
          ),
        }),
        columnHelper.accessor("thisWeekStatus", {
          header: "สัปดาห์นี้ (เข้าแถว จ./อ./ศ. • คลินิกแก้ พ./พฤ.)",
          cell: ({ row }) => {
            const st = row.original;
            return (
              <div className="space-y-1.5 min-w-[175px]">
                <div className="flex items-center gap-1">
                  {st.thisWeekDays.map((d) => (
                    <span
                      key={d.dateIso}
                      title={`${d.dayName} (${d.dateIso}): ${
                        d.note ??
                        (d.status === "PRESENT"
                          ? "มาเข้าแถวปกติ"
                          : d.status === "REST"
                          ? "วันหยุดพักตามสิทธิ์"
                          : d.status === "MAKEUP_ATTENDED"
                          ? "มาเข้าคลินิกแก้แถวในวันหยุด"
                          : d.status === "REMEDIED"
                          ? "แก้แถวผ่านแล้ว"
                          : d.status === "ABSENT"
                          ? "ขาดแถว!"
                          : "ยังไม่เช็คชื่อ")
                      }`}
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold transition-all",
                        d.status === "PRESENT"
                          ? "bg-emerald-500 text-white shadow-xs"
                          : d.status === "REST"
                          ? "bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40"
                          : d.status === "MAKEUP_ATTENDED"
                          ? "bg-fuchsia-600 text-white shadow-xs ring-1 ring-fuchsia-500/40"
                          : d.status === "REMEDIED"
                          ? "bg-violet-600 text-white shadow-xs"
                          : d.status === "ABSENT"
                          ? "bg-amber-500 text-white shadow-xs ring-2 ring-amber-500/30"
                          : "bg-muted text-muted-foreground border border-border/60"
                      )}
                    >
                      {d.dayLabel}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {st.graceMakeupAbsenceCount > 0 ? (
                    <Badge variant="warning" className="text-[10px] py-0 px-1.5 font-semibold">
                      <Clock className="h-3 w-3 mr-0.5" />
                      รอนัดแก้ พุธ-พฤหัสฯ นี้ ({st.graceMakeupAbsenceCount} วัน)
                    </Badge>
                  ) : st.thisWeekStatus === "PASSED" ? (
                    <Badge variant="success" className="text-[10px] py-0 px-1.5 font-medium">
                      <CheckCircle2 className="h-3 w-3 mr-0.5" />
                      ครบ {st.thisWeekPresentDays}/3 วัน
                      {st.thisWeekRemediedDays > 0 ? ` (แก้ ${st.thisWeekRemediedDays})` : ""}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium text-sky-700 dark:text-sky-300 border-sky-400/50 bg-sky-500/10">
                      <Clock className="h-3 w-3 mr-0.5" />
                      กำลังสะสม (มา {st.thisWeekPresentDays}/3 วัน)
                    </Badge>
                  )}
                </div>
              </div>
            );
          },
        }),
        columnHelper.accessor("effectivePresentDays", {
          header: ({ column }) => (
            <button
              type="button"
              onClick={column.getToggleSortingHandler()}
              className="inline-flex items-center gap-1 font-semibold hover:text-foreground cursor-pointer"
            >
              <span>ยอดทั้งเทอม (เป้า 45 ครั้ง)</span>
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          ),
          cell: ({ row }) => {
            const st = row.original;
            return (
              <div className="w-44 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={cn(
                      "font-bold font-mono",
                      st.isCompletedSemester
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {st.effectivePresentDays} / 45 ครั้ง
                  </span>
                  {st.isCompletedSemester ? (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ครบแล้ว 🎉
                    </span>
                  ) : (
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                      ขาดอีก {st.remainingDeficitDays} ครั้ง
                    </span>
                  )}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      st.isCompletedSemester ? "bg-emerald-500" : "bg-primary"
                    )}
                    style={{
                      width: `${Math.min(100, (st.effectivePresentDays / 45) * 100)}%`,
                    }}
                  />
                </div>
                {st.approvedRemedialCount > 0 && (
                  <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">
                    (มาปกติ {st.presentDays} + แก้แล้ว {st.approvedRemedialCount} ครั้ง)
                  </p>
                )}
              </div>
            );
          },
        }),
        columnHelper.accessor("remedialOverallStatus", {
          header: "สถานะเส้นตายรายสัปดาห์",
          cell: ({ row }) => {
            const st = row.original;
            if (st.overdueAbsenceCount > 0) {
              return (
                <div className="space-y-1">
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3" />
                    ค้างแก้สะสมข้ามสัปดาห์ ({st.overdueAbsenceCount} ครั้ง)
                  </Badge>
                  {st.graceMakeupAbsenceCount > 0 && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      + รอนัดแก้รอบนี้อีก {st.graceMakeupAbsenceCount} วัน
                    </p>
                  )}
                </div>
              );
            }
            if (st.graceMakeupAbsenceCount > 0) {
              return (
                <Badge variant="warning">
                  <Clock className="h-3 w-3" />
                  รอนัดแก้ พุธ-พฤหัสฯ นี้ ({st.graceMakeupAbsenceCount} วัน)
                </Badge>
              );
            }
            if (st.remedialOverallStatus === "REMEDIED") {
              return (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" />
                  แก้แถวผ่านเกณฑ์แล้ว
                </Badge>
              );
            }
            return (
              <Badge variant="success">
                <CheckCircle2 className="h-3 w-3" />
                ปกติ (ไม่ติดขาด)
              </Badge>
            );
          },
        }),
        columnHelper.display({
          id: "actions",
          header: "การจัดการ",
          cell: ({ row }) => (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCalendarStudentCode(row.original.studentId)}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/80 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-all shrink-0 cursor-pointer shadow-xs hover:shadow-sm"
                title="ดูปฏิทินการเข้าแถวเดือนนี้"
              >
                <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>ปฏิทิน</span>
              </button>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleOpenRemedialModal(row.original)}
                className="gap-1.5 px-3 py-1.5 h-8 rounded-xl shadow-2xs font-medium"
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                <span>บันทึกแก้แถว</span>
              </Button>
            </div>
          ),
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeRole]
  );

  const table = useTable({
    features: remedialTableFeatures,
    data: filteredDeficitData,
    columns,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 8,
      },
    },
  });

  const watchedStudentId = form.watch("studentId");
  const activeModalStudent = React.useMemo(
    () =>
      initialReport.deficitStudents.find((s) => s.id === watchedStudentId) ??
      selectedStudent,
    [initialReport.deficitStudents, watchedStudentId, selectedStudent]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              ระบบจัดการแก้กิจกรรมเข้าแถว
            </h1>
            <Badge variant="outline" className="text-xs shrink-0 border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300 font-semibold">
              คลินิกแก้แถววันหยุด: พุธ • พฤหัสบดี
            </Badge>
            <Badge variant="destructive" className="text-xs shrink-0 font-semibold">
              เส้นตายตัดรอบ: อาทิตย์ 23:59 น.
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            แยกชัดเจนระหว่าง <strong>🟠 รอนัดแก้ พุธ-พฤหัสฯ นี้</strong> (ขาดในสัปดาห์ หรือโอนจากวันศุกร์ที่แล้ว) กับ <strong>❌ ค้างแก้สะสมข้ามสัปดาห์</strong> (พ้นเส้นตายวันอาทิตย์แล้วไม่มาแก้)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportDeficitExcel}
            className="h-9 gap-1.5 text-xs shadow-sm"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>ส่งออก Excel</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPrintNoticeOpen(true)}
            className="h-9 gap-1.5 text-xs shadow-sm border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
          >
            <Printer className="h-4 w-4" />
            <span>พิมพ์ใบแจ้งแก้แถว</span>
          </Button>

          {initialReport.deficitStudents.length > 0 && (
            <Button
              onClick={() =>
                handleOpenRemedialModal(
                  selectedStudent ?? initialReport.deficitStudents[0]
                )
              }
              className="w-full sm:w-auto shadow-md shrink-0 h-9 text-xs"
            >
              <FilePlus2 className="h-4 w-4" />
              <span>บันทึกกิจกรรมจิตอาสาแก้แถว</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <Card className="cursor-pointer transition-all hover:border-amber-400/60" onClick={() => setStatusFilter("SCHEDULED_MAKEUP")}>
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                รอนัดแก้ พุธ-พฤหัสฯ นี้
              </p>
              <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1 text-amber-600 dark:text-amber-400">
                {initialReport.stats.scheduledMakeupStudentsCount} คน
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                ขาดรอบนี้ / โอนจากศุกร์ที่แล้ว
              </p>
            </div>
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all hover:border-rose-400/60" onClick={() => setStatusFilter("OVERDUE_DEBT")}>
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                ค้างแก้ข้ามสัปดาห์ (ดองงาน!)
              </p>
              <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1 text-rose-600 dark:text-rose-400">
                {initialReport.stats.overdueStudentsCount} คน
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                พ้นเส้นตายวันอาทิตย์ 23:59 น.
              </p>
            </div>
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all hover:border-violet-400/50" onClick={() => setStatusFilter("ALL")}>
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                แก้แถวสำเร็จแล้วทั้งหมด
              </p>
              <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1 text-violet-600 dark:text-violet-400">
                {initialReport.allRemedialLogs.length} ครั้ง
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                คลินิกวันหยุด พ.-พฤ. + จิตอาสา
              </p>
            </div>
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all hover:border-emerald-400/50" onClick={() => setStatusFilter("INCOMPLETE_45")}>
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                ผ่านเกณฑ์ 45 ครั้งสมบูรณ์
              </p>
              <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1 text-emerald-600 dark:text-emerald-400">
                {initialReport.stats.completed45Count} / {initialReport.stats.totalStudents} คน
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                กำลังสะสม {initialReport.stats.incompleted45Count} คน
              </p>
            </div>
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Target className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs: Deficit Table (@tanstack/react-table v9) & Remedial Approval Logs */}
      <Tabs defaultValue="deficit-table">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList>
            <TabsTrigger value="deficit-table">
              ตารางนักเรียน ({filteredDeficitData.length})
            </TabsTrigger>
            <TabsTrigger value="approval-logs">
              ประวัติการแก้แถวทั้งหมด ({initialReport.allRemedialLogs.length})
            </TabsTrigger>
          </TabsList>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Status Filter Chips */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={cn(
                  "rounded-lg px-2 py-1 text-xs font-semibold transition-colors cursor-pointer",
                  statusFilter === "ALL"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/70 text-muted-foreground hover:text-foreground"
                )}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("SCHEDULED_MAKEUP")}
                className={cn(
                  "rounded-lg px-2 py-1 text-xs font-semibold transition-colors cursor-pointer",
                  statusFilter === "SCHEDULED_MAKEUP"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                )}
              >
                🟠 รอนัดแก้ พ.-พฤ. นี้
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("OVERDUE_DEBT")}
                className={cn(
                  "rounded-lg px-2 py-1 text-xs font-semibold transition-colors cursor-pointer",
                  statusFilter === "OVERDUE_DEBT"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                )}
              >
                ❌ ค้างสะสมข้ามสัปดาห์
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("INCOMPLETE_45")}
                className={cn(
                  "rounded-lg px-2 py-1 text-xs font-semibold transition-colors cursor-pointer",
                  statusFilter === "INCOMPLETE_45"
                    ? "bg-sky-600 text-white"
                    : "bg-sky-500/10 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20"
                )}
              >
                ⚠️ ยังไม่ครบ 45 ครั้ง
              </button>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setRemedialClassroomFilter("ALL")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
                  remedialClassroomFilter === "ALL"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                ทุกห้อง
              </button>
              {classrooms.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setRemedialClassroomFilter(c)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
                    remedialClassroomFilter === c
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-52">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหารหัส หรือ ชื่อนักเรียน..."
                value={remedialSearchQuery}
                onChange={(e) => setRemedialSearchQuery(e.target.value)}
                className="h-9 pl-9 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: @tanstack/react-table v9 Deficit Table */}
        <TabsContent value="deficit-table">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                รายชื่อนักเรียนและสถานะการแก้แถว (คลินิกวันหยุด พุธ-พฤหัสบดี & เส้นตายวันอาทิตย์ 23:59 น.)
              </CardTitle>
              <CardDescription>
                บังคับเข้าแถว จันทร์ • อังคาร • ศุกร์ (3 วัน/สัปดาห์) • หากขาดให้เสียสิทธิ์วันหยุดมาเข้าคลินิกแก้แถวในวันพุธ/พฤหัสบดี (1 วันหยุด = ล้าง 1 วันขาด แบบ FIFO) หรือส่งงานจิตอาสา
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <table.Subscribe
                selector={(state) => ({
                  sorting: state.sorting,
                  pagination: state.pagination,
                })}
              >
                {() => (
                  <>
                    {/* Desktop & Tablet Table View */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                              {headerGroup.headers.map((header) => (
                                <TableHead key={header.id}>
                                  {header.isPlaceholder ? null : (
                                    <table.FlexRender header={header} />
                                  )}
                                </TableHead>
                              ))}
                            </TableRow>
                          ))}
                        </TableHeader>
                        <TableBody>
                          {table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={columns.length}
                                className="h-32 text-center text-muted-foreground"
                              >
                                ไม่พบรายชื่อนักเรียนที่ต่ำกว่าเกณฑ์ในเงื่อนไขที่เลือก
                              </TableCell>
                            </TableRow>
                          ) : (
                            table.getRowModel().rows.map((row) => (
                              <TableRow key={row.id}>
                                {row.getAllCells().map((cell) => (
                                  <TableCell key={cell.id}>
                                    <table.FlexRender cell={cell} />
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Responsive Card View (< 768px) */}
                    <div className="divide-y divide-border/60 md:hidden">
                      {table.getRowModel().rows.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                          ไม่พบรายชื่อนักเรียนที่ต่ำกว่าเกณฑ์ในเงื่อนไขที่เลือก
                        </div>
                      ) : (
                        table.getRowModel().rows.map((row) => {
                          const item = row.original;
                          return (
                            <div key={row.id} className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-primary">
                                      {item.studentId}
                                    </span>
                                    <span className="font-semibold text-sm">
                                      {item.fullName}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    ห้อง {item.classroom}
                                  </p>
                                </div>
                                {item.overdueAbsenceCount > 0 ? (
                                  <Badge variant="destructive">
                                    ค้างข้ามสัปดาห์ ({item.overdueAbsenceCount} ครั้ง)
                                  </Badge>
                                ) : item.graceMakeupAbsenceCount > 0 ? (
                                  <Badge variant="warning">
                                    รอนัดแก้ พ.-พฤ. นี้ ({item.graceMakeupAbsenceCount} วัน)
                                  </Badge>
                                ) : item.remedialOverallStatus === "REMEDIED" ? (
                                  <Badge variant="success">แก้แถวผ่านแล้ว</Badge>
                                ) : (
                                  <Badge variant="success">ปกติ (ไม่ติดขาด)</Badge>
                                )}
                              </div>

                              {/* Week Tracker */}
                              <div className="flex items-center justify-between text-xs bg-muted/40 p-2 rounded-lg">
                                <span className="text-muted-foreground font-medium">สัปดาห์นี้ (เข้าแถว จ./อ./ศ.):</span>
                                <div className="flex items-center gap-1">
                                  {item.thisWeekDays.map((d) => (
                                    <span
                                      key={d.dateIso}
                                      className={cn(
                                        "flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold",
                                        d.status === "PRESENT"
                                          ? "bg-emerald-500 text-white"
                                          : d.status === "REST"
                                          ? "bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40"
                                          : d.status === "MAKEUP_ATTENDED"
                                          ? "bg-fuchsia-600 text-white"
                                          : d.status === "REMEDIED"
                                          ? "bg-violet-600 text-white"
                                          : d.status === "ABSENT"
                                          ? "bg-amber-500 text-white"
                                          : "bg-muted text-muted-foreground border border-border/50"
                                      )}
                                    >
                                      {d.dayLabel}
                                    </span>
                                  ))}
                                  <span className="ml-1 text-[11px] font-semibold">
                                    ({item.thisWeekPresentDays}/3 วัน)
                                  </span>
                                </div>
                              </div>

                              {/* Semester Progress */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    ยอดสะสมทั้งเทอม (เป้า 45 ครั้ง)
                                  </span>
                                  <span
                                    className={cn(
                                      "font-bold font-mono",
                                      item.isCompletedSemester
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-amber-600 dark:text-amber-400"
                                    )}
                                  >
                                    {item.effectivePresentDays} / 45 ครั้ง
                                  </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      item.isCompletedSemester
                                        ? "bg-emerald-500"
                                        : "bg-primary"
                                    )}
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        (item.effectivePresentDays / 45) * 100
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full gap-1.5"
                                  onClick={() => setCalendarStudentCode(item.studentId)}
                                >
                                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                                  <span>ปฏิทินเดือนนี้</span>
                                </Button>
                                <Button
                                  size="sm"
                                  className="w-full"
                                  onClick={() => handleOpenRemedialModal(item)}
                                >
                                  <FilePlus2 className="h-3.5 w-3.5" />
                                  <span>บันทึกแก้แถว</span>
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex items-center justify-between border-t border-border/60 px-6 py-3 text-xs text-muted-foreground">
                      <div>
                        แสดง {table.getRowModel().rows.length} จากทั้งหมด{" "}
                        {filteredDeficitData.length} รายการ
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          <span>ก่อนหน้า</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => table.nextPage()}
                          disabled={!table.getCanNextPage()}
                        >
                          <span>ถัดไป</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </table.Subscribe>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Remedial Approval & Log Management */}
        <TabsContent value="approval-logs">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">
                    ประวัติการบันทึกกิจกรรมแก้แถวและชดเชยวันขาด
                  </CardTitle>
                  <CardDescription>
                    รายการกิจกรรมจิตอาสาที่บันทึกแล้ว ระบบนำวันขาดไปคำนวณชดเชยให้ทันทีโดยไม่ต้องรออนุมัติซ้ำ
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">
                    สิทธิ์ปัจจุบัน: {userRole === "ADMIN" ? "ผู้ดูแลระบบ (อนุมัติได้ทุกห้อง)" : "ครูที่ปรึกษา"}
                  </Badge>
                  {userRole === "TEACHER" && teacherRooms.length > 0 && (
                    <Badge variant="success">
                      ห้องที่คุณดูแลและอนุมัติได้: {teacherRooms.join(", ")}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {initialReport.allRemedialLogs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  ยังไม่มีประวัติการส่งกิจกรรมแก้แถว
                </div>
              ) : (
                <div className="space-y-3">
                  {initialReport.allRemedialLogs.map((log, idx) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: idx * 0.03 }}
                      className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-4 sm:flex-row sm:items-center sm:justify-between hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            {log.studentCode}
                          </span>
                          <span className="font-semibold text-sm">
                            {log.studentName}
                          </span>
                          <Badge variant="secondary">{log.classroom}</Badge>
                          <Badge variant="outline" className="gap-1">
                            <CalendarDays className="h-3 w-3 text-rose-500" />
                            ชดเชยวันขาด:{" "}
                            {format(new Date(log.targetDateIso), "d MMM yyyy", {
                              locale: th,
                            })}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <BookOpenCheck className="h-4 w-4 text-primary shrink-0" />
                          <span>{log.activityTitle}</span>
                          <span className="text-xs text-muted-foreground">
                            ({log.hoursEarned} ชั่วโมง)
                          </span>
                        </div>

                        {log.description && (
                          <p className="text-xs text-muted-foreground">
                            {log.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                          <span>
                            ส่งเมื่อ:{" "}
                            {format(
                              new Date(log.createdAtIso),
                              "d MMM yyyy HH:mm น.",
                              { locale: th }
                            )}
                          </span>
                          {log.approvedByName && (
                            <span>ผู้ตรวจ: {log.approvedByName}</span>
                          )}
                          {log.proofUrl && (
                            <a
                              href={log.proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                            >
                              <ExternalLink className="h-3 w-3" />
                              ดูหลักฐานภาพถ่าย
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Badge variant="success" className="px-3 py-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          แก้แถวแล้ว (ชดเชยสำเร็จ)
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Remedial Submission Dialog Form */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              บันทึกกิจกรรมแก้แถว (Remedial Activity Form)
            </DialogTitle>
            <DialogDescription>
              เลือกวันที่นักเรียนขาดแถวเพื่อนำกิจกรรมบำเพ็ญประโยชน์มาชดเชยเวลาเข้าแถวให้ครบเกณฑ์ 45 ครั้ง
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmitRemedialForm)}
            className="space-y-4 mt-2"
          >
            {/* Select Student */}
            <div className="space-y-1.5">
              <Label htmlFor="studentId">นักเรียนที่ต้องการแก้แถว</Label>
              <select
                id="studentId"
                {...form.register("studentId", {
                  onChange: (e) => {
                    const st = initialReport.deficitStudents.find(
                      (item) => item.id === e.target.value
                    );
                    if (st) {
                      setSelectedStudent(st);
                      const firstAvailable =
                        st.absenceDates.find(
                          (d) =>
                            d.remedialStatus === "NONE" ||
                            d.remedialStatus === "REJECTED"
                        ) ?? st.absenceDates[0];
                      form.setValue(
                        "targetDate",
                        firstAvailable?.dateIso ?? ""
                      );
                    }
                  },
                })}
                className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {initialReport.deficitStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.studentId} - {st.fullName} ({st.classroom}) • ปัจจุบัน{" "}
                    {st.effectiveAttendancePercent}%
                  </option>
                ))}
              </select>
              {form.formState.errors.studentId && (
                <p className="text-xs text-rose-500">
                  {form.formState.errors.studentId.message}
                </p>
              )}
            </div>

            {/* Select Target Absence Date to Offset */}
            <div className="space-y-1.5">
              <Label htmlFor="targetDate">
                เลือกวันที่ขาดแถวที่นำมาแก้ (Target Absence Date)
              </Label>
              {activeModalStudent &&
              activeModalStudent.absenceDates.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeModalStudent.absenceDates.map((abs) => {
                    const isSelected =
                      form.watch("targetDate") === abs.dateIso;
                    const isUsed =
                      abs.remedialStatus === "APPROVED" ||
                      abs.remedialStatus === "PENDING";
                    return (
                      <button
                        key={abs.dateIso}
                        type="button"
                        disabled={isUsed}
                        onClick={() =>
                          form.setValue("targetDate", abs.dateIso, {
                            shouldValidate: true,
                          })
                        }
                        className={cn(
                          "flex flex-col items-start rounded-xl border p-2.5 text-left text-xs transition-all cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                            : "border-border bg-card hover:bg-accent",
                          isUsed && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span className="font-semibold text-foreground">
                          {format(new Date(abs.dateIso), "d MMM yyyy", {
                            locale: th,
                          })}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] mt-0.5 font-medium",
                            isUsed
                              ? "text-emerald-600 dark:text-emerald-400"
                              : abs.isOverdueCrossWeek
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {isUsed
                            ? abs.activityTitle
                              ? `แก้แล้ว (${abs.activityTitle})`
                              : "แก้แถวแล้ว"
                            : abs.isOverdueCrossWeek
                            ? "ค้างสะสมข้ามสัปดาห์!"
                            : "รอนัดแก้รอบนี้"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Input type="date" {...form.register("targetDate")} />
              )}
              {form.formState.errors.targetDate && (
                <p className="text-xs text-rose-500">
                  {form.formState.errors.targetDate.message}
                </p>
              )}
            </div>

            {/* Activity Title + Quick Presets */}
            <div className="space-y-1.5">
              <Label htmlFor="activityTitle">หัวข้อกิจกรรมบำเพ็ญประโยชน์</Label>
              <Input
                id="activityTitle"
                placeholder="เช่น จิตอาสาทำความสะอาดหอประชุม..."
                {...form.register("activityTitle")}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_ACTIVITIES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      form.setValue("activityTitle", preset, {
                        shouldValidate: true,
                      })
                    }
                    className="rounded-lg border border-border/70 bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
              {form.formState.errors.activityTitle && (
                <p className="text-xs text-rose-500">
                  {form.formState.errors.activityTitle.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">รายละเอียดการปฏิบัติกิจกรรม</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="ระบุสถานที่ ครูผู้ควบคุม และสิ่งที่ได้ปฏิบัติ..."
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-rose-500">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            {/* Hours Earned & Optional Proof URL */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="hoursEarned">จำนวนชั่วโมงจิตอาสา (ชม.)</Label>
                <Input
                  id="hoursEarned"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  {...form.register("hoursEarned", { valueAsNumber: true })}
                />
                {form.formState.errors.hoursEarned && (
                  <p className="text-xs text-rose-500">
                    {form.formState.errors.hoursEarned.message}
                  </p>
                )}
              </div>
            </div>

            {/* Direct Image Upload for Proof */}
            <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <span>รูปภาพหลักฐานการทำกิจกรรมจิตอาสา (Direct Upload)</span>
                </Label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      form.setValue("proofUrl", "");
                    }}
                    className="text-xs text-rose-500 hover:underline cursor-pointer"
                  >
                    ลบรูปภาพ
                  </button>
                )}
              </div>

              {imagePreview ? (
                <div className="relative rounded-xl border border-border p-2.5 bg-card flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Proof preview"
                    className="h-16 w-16 rounded-lg object-cover border border-border shadow-xs"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      แนบรูปภาพหลักฐานเรียบร้อยแล้ว
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {form.watch("proofUrl") || "พร้อมบันทึกลงในระบบ"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => proofFileInputRef.current?.click()}
                    className="h-8 text-xs shrink-0"
                  >
                    เปลี่ยนรูป
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => proofFileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-card p-4 text-center hover:border-primary/50 hover:bg-muted/40 cursor-pointer transition-all"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {isUploadingProof ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">
                      {isUploadingProof
                        ? "กำลังอัปโหลดรูปภาพ..."
                        : "คลิกเพื่อถ่ายรูป หรือเลือกรูปภาพจากเครื่อง"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      รองรับไฟล์ JPG, PNG, WebP (ถ่ายภาพจากมือถือหรือแท็บเล็ตได้)
                    </p>
                  </div>
                </div>
              )}

              <input
                ref={proofFileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleDirectImageUpload}
                className="hidden"
              />

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  หรือวาง URL:
                </span>
                <Input
                  id="proofUrl"
                  placeholder="https://..."
                  className="h-7 text-xs flex-1"
                  {...form.register("proofUrl")}
                  onChange={(e) => {
                    form.setValue("proofUrl", e.target.value);
                    if (
                      e.target.value.startsWith("http") ||
                      e.target.value.startsWith("/")
                    ) {
                      setImagePreview(e.target.value);
                    }
                  }}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>บันทึกข้อมูลแก้แถว</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Printable Deficit Notice Modal (< 80%) */}
      <PrintableNoticeModal
        open={isPrintNoticeOpen}
        onOpenChange={setIsPrintNoticeOpen}
        students={initialReport.deficitStudents}
        classrooms={Array.from(
          new Set(initialReport.deficitStudents.map((s) => s.classroom))
        ).sort()}
      />

      {/* Individual Student Monthly Calendar Modal */}
      <StudentMonthlyCalendarModal
        open={Boolean(calendarStudentCode)}
        onOpenChange={(open) => {
          if (!open) setCalendarStudentCode(null);
        }}
        studentIdOrCode={calendarStudentCode}
        onSelectAbsentDate={(studentUuid, dateIso) => {
          const found = initialReport.deficitStudents.find(
            (s) => s.id === studentUuid
          );
          if (found) {
            handleOpenRemedialModal(found, dateIso);
          }
        }}
      />
    </div>
  );
}
