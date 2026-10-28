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
} from "lucide-react";
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
      totalBelowStandardRaw: number;
      stillDeficitCount: number;
      remediedSuccessCount: number;
      pendingApprovalCount: number;
    };
  };
}

export function RemedialManagementClient({
  classrooms,
  initialReport,
}: RemedialManagementClientProps) {
  const router = useRouter();
  const {
    remedialClassroomFilter,
    setRemedialClassroomFilter,
    remedialSearchQuery,
    setRemedialSearchQuery,
    activeRole,
  } = useAttendanceStore();

  const [isPending, startTransition] = React.useTransition();
  const [selectedStudent, setSelectedStudent] =
    React.useState<StudentDeficitReportItem | null>(
      initialReport.deficitStudents[0] ?? null
    );
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);

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

  const handleOpenRemedialModal = (student: StudentDeficitReportItem) => {
    setSelectedStudent(student);
    const availableAbsence =
      student.absenceDates.find(
        (d) => d.remedialStatus === "NONE" || d.remedialStatus === "REJECTED"
      ) ?? student.absenceDates[0];

    form.reset({
      studentId: student.id,
      targetDate: availableAbsence?.dateIso ?? "",
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
                ? "นักเรียนมีเวลาเรียนครบเกณฑ์ 80% แล้ว!"
                : `ยังต้องแก้แถวเพิ่มอีก ${res.remainingDeficitDays} วันจึงจะครบเกณฑ์ 80%`,
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
      return matchClass && matchQuery;
    });
  }, [
    initialReport.deficitStudents,
    remedialClassroomFilter,
    remedialSearchQuery,
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
          cell: (info) => (
            <span className="font-mono font-semibold text-primary">
              {info.getValue()}
            </span>
          ),
        }),
        columnHelper.accessor("fullName", {
          header: "ชื่อ - นามสกุล",
          cell: ({ row }) => (
            <div>
              <p className="font-medium text-foreground">{row.original.fullName}</p>
              <p className="text-xs text-muted-foreground">
                ห้อง {row.original.classroom}
              </p>
            </div>
          ),
        }),
        columnHelper.accessor("presentDays", {
          header: "มา / ขาด (วัน)",
          cell: ({ row }) => (
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-400">
                มา {row.original.presentDays}/{row.original.totalDays}
              </span>
              <span className="rounded-md bg-rose-500/10 px-2 py-0.5 font-semibold text-rose-600 dark:text-rose-400">
                ขาด {row.original.absentDays}
              </span>
            </div>
          ),
        }),
        columnHelper.accessor("effectiveAttendancePercent", {
          header: ({ column }) => (
            <button
              type="button"
              onClick={column.getToggleSortingHandler()}
              className="inline-flex items-center gap-1 font-semibold hover:text-foreground cursor-pointer"
            >
              <span>% การเข้าแถว (เกณฑ์ 80%)</span>
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          ),
          cell: ({ row }) => {
            const raw = row.original.rawAttendancePercent;
            const effective = row.original.effectiveAttendancePercent;
            const hasOffset = effective > raw;
            return (
              <div className="w-44 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={cn(
                      "font-bold",
                      effective >= 80
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {effective}%
                  </span>
                  {hasOffset ? (
                    <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                      (เดิม {raw}% + แก้แล้ว {row.original.approvedRemedialCount} วัน)
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      ต้องแก้เพิ่ม {row.original.remainingDeficitDays} วัน
                    </span>
                  )}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      effective >= 80 ? "bg-emerald-500" : "bg-rose-500"
                    )}
                    style={{ width: `${Math.min(100, effective)}%` }}
                  />
                </div>
              </div>
            );
          },
        }),
        columnHelper.accessor("remedialOverallStatus", {
          header: "สถานะการแก้แถว",
          cell: ({ row }) => {
            const st = row.original.remedialOverallStatus;
            if (st === "REMEDIED") {
              return (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" />
                  แก้แถวผ่านเกณฑ์แล้ว
                </Badge>
              );
            }
            if (st === "IN_PROGRESS") {
              return (
                <Badge variant="warning">
                  <Clock className="h-3 w-3" />
                  กำลังแก้แถว (รอตรวจ {row.original.pendingRemedialCount})
                </Badge>
              );
            }
            return (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3" />
                ต้องแก้แถว ({row.original.remainingDeficitDays} วัน)
              </Badge>
            );
          },
        }),
        columnHelper.display({
          id: "actions",
          header: "การจัดการ",
          cell: ({ row }) => (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => handleOpenRemedialModal(row.original)}
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">
              ระบบจัดการแก้กิจกรรมเข้าแถว (Remedial & Deficit Report)
            </h1>
            <Badge variant="destructive" className="text-xs">
              เกณฑ์ขั้นต่ำ 80%
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            รายชื่อนักเรียนที่มีเวลาเข้าแถวต่ำกว่าเกณฑ์ 80% พร้อมระบบส่งงานจิตอาสาและอนุมัติชดเชยวันขาดแถวอัตโนมัติ
          </p>
        </div>

        {initialReport.deficitStudents.length > 0 && (
          <Button
            onClick={() =>
              handleOpenRemedialModal(
                selectedStudent ?? initialReport.deficitStudents[0]
              )
            }
            className="shadow-md"
          >
            <FilePlus2 className="h-4 w-4" />
            <span>บันทึกกิจกรรมแก้แถวใหม่</span>
          </Button>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                นักเรียนต่ำกว่าเกณฑ์ (&lt; 80%)
              </p>
              <p className="text-2xl font-bold mt-1">
                {initialReport.stats.totalBelowStandardRaw} คน
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                จากประวัติการเช็คชื่อทั้งหมด
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                ยังต้องแก้แถวเพิ่ม
              </p>
              <p className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                {initialReport.stats.stillDeficitCount} คน
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                เวลาเรียนสุทธิยังไม่ถึง 80%
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CalendarDays className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                รอการตรวจสอบ/อนุมัติ (Pending)
              </p>
              <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                {initialReport.stats.pendingApprovalCount} รายการ
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                พร้อมให้ครู/ฝ่ายปกครองอนุมัติ
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                แก้แถวผ่านเกณฑ์สำเร็จ
              </p>
              <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {initialReport.stats.remediedSuccessCount} คน
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ชดเชยเวลาเรียนครบ ≥ 80% แล้ว
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs: Deficit Table (@tanstack/react-table v9) & Remedial Approval Logs */}
      <Tabs defaultValue="deficit-table">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="deficit-table">
              ตารางนักเรียนต่ำกว่าเกณฑ์ ({filteredDeficitData.length})
            </TabsTrigger>
            <TabsTrigger value="approval-logs">
              ประวัติและอนุมัติผลกิจกรรมแก้แถว ({initialReport.allRemedialLogs.length})
            </TabsTrigger>
          </TabsList>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
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

            <div className="relative w-full sm:w-60">
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
                รายชื่อนักเรียนที่มีเวลาเข้าแถวต่ำกว่า 80%
              </CardTitle>
              <CardDescription>
                ตารางแสดงสถิติวันมาเรียน วันขาดแถว เปอร์เซ็นต์เวลาเรียนสุทธิหลังหักลบวันแก้แถวที่อนุมัติแล้ว
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
                                    ห้อง {item.classroom} • มา {item.presentDays}/{item.totalDays} วัน (ขาด {item.absentDays} วัน)
                                  </p>
                                </div>
                                {item.remedialOverallStatus === "REMEDIED" ? (
                                  <Badge variant="success">ผ่านเกณฑ์แล้ว</Badge>
                                ) : item.remedialOverallStatus === "IN_PROGRESS" ? (
                                  <Badge variant="warning">
                                    รอตรวจ ({item.pendingRemedialCount})
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    ต้องแก้ ({item.remainingDeficitDays} วัน)
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    เวลาเข้าแถวสุทธิ
                                  </span>
                                  <span
                                    className={cn(
                                      "font-bold",
                                      item.effectiveAttendancePercent >= 80
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-rose-600 dark:text-rose-400"
                                    )}
                                  >
                                    {item.effectiveAttendancePercent}%
                                  </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      item.effectiveAttendancePercent >= 80
                                        ? "bg-emerald-500"
                                        : "bg-rose-500"
                                    )}
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        item.effectiveAttendancePercent
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>

                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleOpenRemedialModal(item)}
                              >
                                <FilePlus2 className="h-3.5 w-3.5" />
                                <span>บันทึกกิจกรรมแก้แถว</span>
                              </Button>
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
                    รายการส่งงานกิจกรรมแก้แถวและอนุมัติชดเชยเวลาเรียน
                  </CardTitle>
                  <CardDescription>
                    เมื่อกด &quot;อนุมัติ (Approve)&quot; ระบบจะนำวันขาดแถวที่เลือกไปคำนวณชดเชยเปอร์เซ็นต์การเข้าแถวทันที
                  </CardDescription>
                </div>
                <Badge variant="info">
                  สิทธิ์ปัจจุบัน: {activeRole === "ADMIN" ? "ผู้ดูแลระบบ (อนุมัติได้)" : "ครูที่ปรึกษา"}
                </Badge>
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
                        {log.status === "PENDING" ? (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              disabled={isPending}
                              onClick={() =>
                                handleReviewLog(log.id, "APPROVED")
                              }
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>อนุมัติ (Approve)</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isPending}
                              onClick={() =>
                                handleReviewLog(log.id, "REJECTED")
                              }
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>ไม่อนุมัติ</span>
                            </Button>
                          </>
                        ) : log.status === "APPROVED" ? (
                          <Badge variant="success" className="px-3 py-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            อนุมัติแล้ว (ชดเชยสำเร็จ)
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="px-3 py-1">
                              ไม่อนุมัติ (Rejected)
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() =>
                                handleReviewLog(log.id, "APPROVED")
                              }
                            >
                              อนุมัติย้อนหลัง
                            </Button>
                          </div>
                        )}
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
              เลือกวันที่นักเรียนขาดแถวเพื่อนำกิจกรรมบำเพ็ญประโยชน์มาชดเชยเวลาเข้าแถวให้ครบเกณฑ์ 80%
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
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {abs.remedialStatus === "APPROVED"
                            ? "อนุมัติแล้ว"
                            : abs.remedialStatus === "PENDING"
                            ? "รอตรวจ"
                            : abs.remedialStatus === "REJECTED"
                            ? "ส่งแก้ใหม่ได้"
                            : "ยังไม่แก้แถว"}
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

              <div className="space-y-1.5">
                <Label htmlFor="proofUrl">ลิงก์รูปภาพหลักฐาน (ถ้ามี)</Label>
                <Input
                  id="proofUrl"
                  placeholder="https://..."
                  {...form.register("proofUrl")}
                />
              </div>
            </div>

            {/* Auto-approve toggle for Admin/Teacher */}
            <label className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 p-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                {...form.register("autoApprove")}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="font-medium">
                  อนุมัติทันทีและคำนวณชดเชยเวลาเรียน (Approve & Offset Immediately)
                </span>
                <p className="text-xs text-muted-foreground">
                  หากครูตรวจสอบงานเรียบร้อยแล้ว สามารถติ๊กเพื่อปรับเพิ่ม % การเข้าแถวทันที
                </p>
              </div>
            </label>

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
    </div>
  );
}
