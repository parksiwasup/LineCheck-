"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Shield,
  UserCheck,
  Search,
  Edit3,
  Trash2,
  Power,
  CalendarDays,
  Settings2,
  Database,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  Plus,
  LayoutGrid,
  School,
  ArrowUpRight,
  ClipboardCheck,
  ShieldAlert,
  LayoutDashboard,
  FileSpreadsheet,
  Download,
  Award,
  GraduationCap,
  Copy,
  Sparkles,
  Crown,
  KeyRound,
  Mail,
  User,
  Check,
  Hash,
  ArrowRight,
  Zap,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { BulkImportModal } from "./bulk-import-modal";
import { loginWithCredentialsAction } from "@/actions/auth-actions";
import {
  upsertStudentAction,
  toggleStudentStatusAction,
  deleteStudentAction,
  upsertUserAction,
  deleteUserAction,
  deleteAttendanceByDateAction,
  deleteAdminRemedialAction,
  type AdminStudentItem,
  type AdminUserItem,
  type AdminAttendanceDateSummary,
  type AdminRemedialItem,
} from "@/actions/admin";
import { useAttendanceStore } from "@/store/use-attendance-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

import { AcademicCalendarTab } from "@/components/admin/academic-calendar-tab";
import {
  DEFAULT_CALENDAR_CONFIG,
  type AcademicCalendarConfig,
} from "@/types/academic-calendar";

type AdminSection =
  | "overview"
  | "students"
  | "classrooms"
  | "users"
  | "logs"
  | "remedials"
  | "schedule";

interface AdminBackofficeClientProps {
  initialData: {
    students: AdminStudentItem[];
    users: AdminUserItem[];
    classrooms: string[];
    attendanceDates: AdminAttendanceDateSummary[];
    remedials?: AdminRemedialItem[];
    academicCalendar?: AcademicCalendarConfig;
    systemStats: {
      totalStudents: number;
      activeStudents: number;
      inactiveStudents: number;
      totalUsers: number;
      totalAttendanceRecords: number;
      totalRemedialRecords: number;
    };
  };
}

function getStudentInitials(fullName: string): string {
  const cleaned = fullName
    .replace(/^(นาย|นางสาว|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.)\s*/, "")
    .trim();
  return cleaned.slice(0, 2) || "นร";
}

function getUserInitials(name: string): string {
  const cleaned = name
    .replace(/^(ครู|นาย|นางสาว|นาง|อาจารย์|ผอ\.)\s*/, "")
    .trim();
  return cleaned.slice(0, 2) || "ครู";
}

export function AdminBackofficeClient({
  initialData,
}: AdminBackofficeClientProps) {
  const router = useRouter();
  const { activeRole, setActiveRole } = useAttendanceStore();
  const [isPending, startTransition] = React.useTransition();
  const [activeSection, setActiveSection] =
    React.useState<AdminSection>("students");
  const [calendarConfig, setCalendarConfig] =
    React.useState<AcademicCalendarConfig>(
      initialData.academicCalendar || DEFAULT_CALENDAR_CONFIG
    );

  // Student filters
  const [studentSearch, setStudentSearch] = React.useState("");
  const [classroomFilter, setClassroomFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");
  const [studentTeacherFilter, setStudentTeacherFilter] = React.useState("ALL");

  // User filters
  const [userSearch, setUserSearch] = React.useState("");
  const [userRoleFilter, setUserRoleFilter] = React.useState<"ALL" | "ADMIN" | "TEACHER">("ALL");

  // Remedial filters & state
  const [remedials, setRemedials] = React.useState<AdminRemedialItem[]>(
    initialData.remedials ?? []
  );
  const [remedialSearch, setRemedialSearch] = React.useState("");
  const [remedialDateFilter, setRemedialDateFilter] = React.useState("");
  const [remedialClassroomFilter, setRemedialClassroomFilter] = React.useState("ALL");
  const [remedialStudentFilter, setRemedialStudentFilter] = React.useState("ALL");
  const [remedialTeacherFilter, setRemedialTeacherFilter] = React.useState("ALL");
  const [remedialTypeFilter, setRemedialTypeFilter] = React.useState<"ALL" | "CLINIC_MAKEUP" | "SPECIAL_ACTIVITY">("ALL");

  // Date logs filters & state
  const [logSearch, setLogSearch] = React.useState("");
  const [logDateFilter, setLogDateFilter] = React.useState("");
  const [logClassroomFilter, setLogClassroomFilter] = React.useState("ALL");
  const [logStudentFilter, setLogStudentFilter] = React.useState("ALL");
  const [logTeacherFilter, setLogTeacherFilter] = React.useState("ALL");

  // Thai Datepicker popover states
  const [isLogDateOpen, setIsLogDateOpen] = React.useState(false);
  const [isRemedialDateOpen, setIsRemedialDateOpen] = React.useState(false);

  const formatThaiDisplay = (isoStr: string) => {
    if (!isoStr) return "";
    try {
      const d = parseISO(isoStr);
      const bYear = d.getFullYear() + 543;
      return `${format(d, "d MMM", { locale: th })} ${bYear}`;
    } catch {
      return isoStr;
    }
  };

  React.useEffect(() => {
    if (initialData.remedials) {
      setRemedials(initialData.remedials);
    }
  }, [initialData.remedials]);

  // Teachers available across system
  const availableTeachers = React.useMemo(() => {
    const set = new Set<string>();
    initialData.users.forEach((u) => {
      if (u.name) set.add(u.name.trim());
    });
    initialData.attendanceDates.forEach((d) => {
      d.teachers?.forEach((t) => set.add(t.trim()));
    });
    remedials.forEach((r) => {
      if (r.approvedByName) set.add(r.approvedByName.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [initialData.users, initialData.attendanceDates, remedials]);

  // Students available for remedial dropdown (filtered by selected classroom if any)
  const availableStudentsForRemedials = React.useMemo(() => {
    if (remedialClassroomFilter === "ALL") {
      return initialData.students;
    }
    return initialData.students.filter(
      (s) => s.classroom === remedialClassroomFilter
    );
  }, [initialData.students, remedialClassroomFilter]);

  // Students available for date logs dropdown (filtered by selected classroom if any)
  const availableStudentsForLogs = React.useMemo(() => {
    if (logClassroomFilter === "ALL") {
      return initialData.students;
    }
    return initialData.students.filter(
      (s) => s.classroom === logClassroomFilter
    );
  }, [initialData.students, logClassroomFilter]);

  const filteredRemedials = React.useMemo(() => {
    const q = remedialSearch.trim().toLowerCase();
    return remedials.filter((rem) => {
      const matchSearch =
        !q ||
        rem.studentCode.toLowerCase().includes(q) ||
        rem.studentName.toLowerCase().includes(q) ||
        rem.classroom.toLowerCase().includes(q) ||
        rem.activityTitle.toLowerCase().includes(q) ||
        rem.targetDateIso.includes(q) ||
        (rem.approvedByName && rem.approvedByName.toLowerCase().includes(q));

      const matchDate =
        !remedialDateFilter ||
        rem.targetDateIso === remedialDateFilter ||
        rem.createdAtIso.startsWith(remedialDateFilter) ||
        rem.activityTitle.includes(remedialDateFilter);

      const matchClassroom =
        remedialClassroomFilter === "ALL" || rem.classroom === remedialClassroomFilter;

      const matchStudent =
        remedialStudentFilter === "ALL" ||
        rem.studentCode === remedialStudentFilter ||
        rem.studentId === remedialStudentFilter;

      const matchTeacher =
        remedialTeacherFilter === "ALL" ||
        rem.approvedByName === remedialTeacherFilter;

      const matchType =
        remedialTypeFilter === "ALL" || rem.type === remedialTypeFilter;

      return (
        matchSearch &&
        matchDate &&
        matchClassroom &&
        matchStudent &&
        matchTeacher &&
        matchType
      );
    });
  }, [
    remedials,
    remedialSearch,
    remedialDateFilter,
    remedialClassroomFilter,
    remedialStudentFilter,
    remedialTeacherFilter,
    remedialTypeFilter,
  ]);

  const filteredAttendanceDates = React.useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return initialData.attendanceDates.filter((d) => {
      // ค้นหาครอบคลุมทั้งรหัสนักเรียน, ชื่อ-สกุล, ห้องเรียน, ครูผู้เช็ค, วันที่ ISO และชื่อวันภาษาไทย
      const matchSearch =
        !q ||
        d.dateIso.includes(q) ||
        format(new Date(d.dateIso), "วันEEEEที่ d MMMM yyyy", { locale: th })
          .toLowerCase()
          .includes(q) ||
        format(new Date(d.dateIso), "d MMMM yyyy", { locale: th })
          .toLowerCase()
          .includes(q) ||
        d.classrooms?.some((c) => c.toLowerCase().includes(q)) ||
        d.teachers?.some((t) => t.toLowerCase().includes(q)) ||
        d.students?.some(
          (s) =>
            s.studentCode.toLowerCase().includes(q) ||
            s.fullName.toLowerCase().includes(q) ||
            s.classroom.toLowerCase().includes(q)
        );

      const matchDate = !logDateFilter || d.dateIso === logDateFilter;

      const matchClassroom =
        logClassroomFilter === "ALL" ||
        d.classrooms?.includes(logClassroomFilter);

      const matchStudent =
        logStudentFilter === "ALL" ||
        d.students?.some(
          (s) =>
            s.studentId === logStudentFilter ||
            s.studentCode === logStudentFilter
        );

      const matchTeacher =
        logTeacherFilter === "ALL" ||
        d.teachers?.includes(logTeacherFilter);

      return (
        matchSearch &&
        matchDate &&
        matchClassroom &&
        matchStudent &&
        matchTeacher
      );
    });
  }, [
    initialData.attendanceDates,
    logSearch,
    logDateFilter,
    logClassroomFilter,
    logStudentFilter,
    logTeacherFilter,
  ]);

  // Student Dialog state
  const [isStudentModalOpen, setIsStudentModalOpen] = React.useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = React.useState(false);
  const [studentForm, setStudentForm] = React.useState<{
    id?: string;
    studentId: string;
    title: string;
    firstName: string;
    lastName: string;
    classroom: string;
    status: "ACTIVE" | "INACTIVE";
  }>({
    studentId: "",
    title: "นาย",
    firstName: "",
    lastName: "",
    classroom: initialData.classrooms[0] ?? "ม.4/1",
    status: "ACTIVE",
  });

  // User Dialog state
  const [isUserModalOpen, setIsUserModalOpen] = React.useState(false);
  const [userForm, setUserForm] = React.useState<{
    id?: string;
    name: string;
    email: string;
    password: string;
    role: "TEACHER" | "ADMIN";
    classrooms?: string;
  }>({
    name: "",
    email: "",
    password: "",
    role: "TEACHER",
    classrooms: "",
  });

  // Custom Luxury Confirmation Modal state (แทนที่ window.confirm)
  const [deleteDialog, setDeleteDialog] = React.useState<{
    isOpen: boolean;
    title: string;
    description: string;
    itemName: string;
    itemSubtitle?: string;
    itemDetail?: string;
    itemBadge?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    itemName: "",
    onConfirm: () => {},
  });

  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirmDelete = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteDialog.onConfirm();
      setDeleteDialog((prev) => ({ ...prev, isOpen: false }));
    } catch (error) {
      console.error("Delete action failed:", error);
      toast.error("เกิดข้อผิดพลาดในการลบข้อมูล กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredStudents = React.useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return initialData.students.filter((s) => {
      const matchClass =
        classroomFilter === "ALL" || s.classroom === classroomFilter;
      const matchStatus = statusFilter === "ALL" || s.status === statusFilter;

      // Filter by teacher (advisor of this classroom)
      let matchTeacher = true;
      if (studentTeacherFilter !== "ALL") {
        const teacherUser = initialData.users.find(
          (u) => u.name.trim() === studentTeacherFilter.trim() || u.id === studentTeacherFilter
        );
        if (teacherUser && teacherUser.classrooms) {
          const allowedRooms = teacherUser.classrooms.split(",").map((c) => c.trim());
          matchTeacher = allowedRooms.includes(s.classroom);
        } else {
          matchTeacher = false;
        }
      }

      // Check if search query matches student ID, full name, classroom, or teacher name advising this classroom
      let matchAdvisorSearch = false;
      if (q) {
        const advisors = initialData.users.filter((u) => {
          if (!u.classrooms) return false;
          const rooms = u.classrooms.split(",").map((c) => c.trim());
          return rooms.includes(s.classroom);
        });
        matchAdvisorSearch = advisors.some((a) => a.name.toLowerCase().includes(q));
      }

      const matchQuery =
        !q ||
        s.studentId.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q) ||
        s.classroom.toLowerCase().includes(q) ||
        matchAdvisorSearch;

      return matchClass && matchStatus && matchTeacher && matchQuery;
    });
  }, [
    initialData.students,
    initialData.users,
    classroomFilter,
    statusFilter,
    studentTeacherFilter,
    studentSearch,
  ]);

  const filteredUsers = React.useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return initialData.users.filter((u) => {
      const matchQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.classrooms && u.classrooms.toLowerCase().includes(q));

      const matchRole =
        userRoleFilter === "ALL" || u.role === userRoleFilter;

      return matchQuery && matchRole;
    });
  }, [initialData.users, userSearch, userRoleFilter]);

  const handleExportStudentsExcel = () => {
    const listToExport = filteredStudents;
    const exportData = listToExport.map((s, idx) => ({
      "ลำดับ": idx + 1,
      "รหัสนักเรียน": s.studentId,
      "คำนำหน้า": s.title,
      "ชื่อจริง": s.firstName,
      "นามสกุล": s.lastName,
      "ห้องเรียน": s.classroom,
      "สถานะการศึกษา": s.status === "ACTIVE" ? "กำลังศึกษา" : "พัก/ย้ายออก",
      "มาแถวปกติ (วัน)": s.presentCount,
      "ขาดแถว (วัน)": s.absentCount,
      "แก้แถว (รายการ)": s.remedialCount,
      "เช็คชื่อทั้งหมด (วัน)": s.attendanceCount,
      "วันที่ลงทะเบียน": format(new Date(s.createdAtIso), "dd/MM/yyyy"),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");

    ws["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];

    const fileName = `รายชื่อนักเรียน_${classroomFilter === "ALL" ? "ทุกห้อง" : classroomFilter}_${format(
      new Date(),
      "yyyyMMdd"
    )}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`ส่งออกรายชื่อนักเรียนสำเร็จ (${listToExport.length} คน)`);
  };

  const classroomBreakdown = React.useMemo(() => {
    return initialData.classrooms.map((room) => {
      const inRoom = initialData.students.filter((s) => s.classroom === room);
      const activeCount = inRoom.filter((s) => s.status === "ACTIVE").length;
      const inactiveCount = inRoom.filter((s) => s.status === "INACTIVE").length;
      const totalAbsent = inRoom.reduce((acc, s) => acc + s.absentCount, 0);
      return {
        classroom: room,
        total: inRoom.length,
        activeCount,
        inactiveCount,
        totalAbsent,
      };
    });
  }, [initialData.classrooms, initialData.students]);

  const handleOpenAddStudent = (presetClassroom?: string) => {
    setStudentForm({
      studentId: "",
      title: "นาย",
      firstName: "",
      lastName: "",
      classroom:
        presetClassroom ??
        (classroomFilter !== "ALL"
          ? classroomFilter
          : initialData.classrooms[0] ?? "ม.4/1"),
      status: "ACTIVE",
    });
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (st: AdminStudentItem) => {
    setStudentForm({
      id: st.id,
      studentId: st.studentId,
      title: st.title,
      firstName: st.firstName,
      lastName: st.lastName,
      classroom: st.classroom,
      status: st.status,
    });
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await upsertStudentAction(studentForm);
      if (res.success) {
        toast.success(res.message);
        setIsStudentModalOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleToggleStudentStatus = (st: AdminStudentItem) => {
    const nextStatus = st.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      const res = await toggleStudentStatusAction(st.id, nextStatus);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleDeleteStudent = (st: AdminStudentItem) => {
    setDeleteDialog({
      isOpen: true,
      title: "ยืนยันการลบข้อมูลนักเรียน",
      description: "ข้อมูลประวัติการเข้าแถว บันทึกเวลา และสถิติแก้แถวทั้งหมดของนักเรียนคนนี้จะถูกลบออกจากฐานข้อมูลถาวร",
      itemName: `${st.studentId} ${st.fullName}`,
      itemDetail: `ห้องเรียน: ${st.classroom} • มาแถว: ${st.presentCount}/${st.attendanceCount} วัน • ขาดแถว: ${st.absentCount} วัน`,
      itemBadge: st.status === "ACTIVE" ? "กำลังศึกษา" : "พักการเรียน",
      onConfirm: async () => {
        const res = await deleteStudentAction(st.id);
        if (res.success) {
          toast.success(res.message);
          router.refresh();
        } else {
          toast.error(res.message);
        }
      },
    });
  };

  // Helper: ทำความสะอาดชื่อครู ตัดข้อความ (ดูแล ...) ออกเพื่อให้เหลือเฉพาะชื่อจริง
  const cleanTeacherName = (rawName: string): string => {
    return (rawName || "").replace(/\s*\((?:ดูแล|ประจำชั้น)[^)]*\)/g, "").trim();
  };

  const handleOpenAddUser = () => {
    setUserForm({
      name: "",
      email: "",
      password: "password123",
      role: "TEACHER",
      classrooms: "",
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: AdminUserItem) => {
    setUserForm({
      id: u.id,
      name: cleanTeacherName(u.name),
      email: u.email,
      password: "",
      role: u.role,
      classrooms: u.classrooms || "",
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const cleanForm = {
        ...userForm,
        name: cleanTeacherName(userForm.name),
      };
      const res = await upsertUserAction(cleanForm);
      if (res.success) {
        toast.success(res.message);
        setIsUserModalOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleDeleteUser = (u: AdminUserItem) => {
    setDeleteDialog({
      isOpen: true,
      title: "ยืนยันการลบบัญชีผู้ใช้งาน",
      description: "เมื่อลบบัญชีนี้ บุคลากรจะไม่สามารถเข้าสู่ระบบหรือใช้สิทธิ์เช็คชื่อและอนุมัติกิจกรรมได้อีกต่อไป",
      itemName: u.name,
      itemDetail: `อีเมล: ${u.email} • เช็คชื่อ ${u.recordedCount} ครั้ง • อนุมัติแก้แถว ${u.approvedCount} รายการ`,
      itemBadge: u.role === "ADMIN" ? "ADMIN ฝ่ายปกครอง" : "TEACHER ครูที่ปรึกษา",
      onConfirm: async () => {
        const res = await deleteUserAction(u.id);
        if (res.success) {
          toast.success(res.message);
          router.refresh();
        } else {
          toast.error(res.message);
        }
      },
    });
  };

  const handleSwitchUserSession = async (userItem: AdminUserItem) => {
    try {
      setActiveRole(userItem.role);
      toast.loading(`กำลังสลับการใช้งานเป็น ${userItem.name}...`, { id: "switch-user" });
      const res = await loginWithCredentialsAction({
        email: userItem.email,
        password: "password123",
        redirectTo: userItem.role === "ADMIN" ? "/admin" : "/dashboard",
      });

      if (!res.success) {
        toast.error(res.message || "ไม่สามารถสลับบัญชีได้", { id: "switch-user" });
      } else {
        toast.success(`เข้าสู่ระบบในชื่อ ${userItem.name} สำเร็จ`, { id: "switch-user" });
        router.push(userItem.role === "ADMIN" ? "/admin" : "/dashboard");
        router.refresh();
      }
    } catch {
      toast.success(`เข้าสู่ระบบในชื่อ ${userItem.name} สำเร็จ`, { id: "switch-user" });
      router.push(userItem.role === "ADMIN" ? "/admin" : "/dashboard");
      router.refresh();
    }
  };

  const handleDeleteDateLogs = (dateIso: string, count: number) => {
    const formattedDate = format(new Date(dateIso), "d MMMM yyyy", { locale: th });
    setDeleteDialog({
      isOpen: true,
      title: "ยืนยันการล้างประวัติการเช็คชื่อ",
      description: "รายการเช็คชื่อนักเรียนทุกคนในวันที่เลือกจะถูกล้างออกจากระบบทันที กรุณาตรวจสอบให้แน่ใจก่อนยืนยัน",
      itemName: `ประวัติการเข้าแถววันที่ ${formattedDate}`,
      itemDetail: `จำนวนข้อมูลที่จะถูกลบ: ${count} รายการ`,
      itemBadge: "ลบประวัติวัน",
      onConfirm: async () => {
        const res = await deleteAttendanceByDateAction(dateIso);
        if (res.success) {
          toast.success(res.message);
          router.refresh();
        } else {
          toast.error(res.message);
        }
      },
    });
  };

  const handleDeleteRemedial = (rem: AdminRemedialItem) => {
    setDeleteDialog({
      isOpen: true,
      title: "ยืนยันการลบรายการแก้แถว",
      description: `ต้องการลบรายการแก้แถวของ ${rem.studentName} (${rem.studentCode}) วันที่ชดเชย ${rem.targetDateIso} หรือไม่? การลบนี้จะส่งผลต่อสถิติและซิงค์ข้อมูลกับระบบทันที`,
      itemName: rem.studentName,
      itemSubtitle: rem.activityTitle,
      itemDetail: `ห้อง ${rem.classroom} • รหัส ${rem.studentCode} • วันที่ชดเชย: ${rem.targetDateIso}`,
      itemBadge: rem.type === "CLINIC_MAKEUP" ? "คลินิกแก้แถว" : "กิจกรรมพิเศษ",
      onConfirm: async () => {
        const res = await deleteAdminRemedialAction(rem.id);
        if (res.success) {
          toast.success(res.message);
          setRemedials((prev) => prev.filter((r) => r.id !== rem.id));
          router.refresh();
        } else {
          toast.error(res.message);
        }
      },
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`คัดลอกรหัส ${code} เรียบร้อยแล้ว`);
  };

  const { systemStats } = initialData;

  const sidebarItems: {
    id: AdminSection;
    label: string;
    sub: string;
    count?: number;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    shadow: string;
    iconColor: string;
    iconBg: string;
  }[] = [
    {
      id: "overview",
      label: "ภาพรวมหลังบ้าน",
      sub: "System Overview",
      icon: LayoutGrid,
      gradient: "from-slate-900 via-indigo-950 to-slate-900 ring-1 ring-sky-400/50",
      shadow: "shadow-indigo-950/40",
      iconColor: "text-sky-400",
      iconBg: "bg-sky-500/15",
    },
    {
      id: "students",
      label: "จัดการทะเบียนนักเรียน",
      sub: "Students Directory",
      count: initialData.students.length,
      icon: Users,
      gradient: "from-blue-600 via-indigo-600 to-sky-600",
      shadow: "shadow-blue-500/25",
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-500/15",
    },
    {
      id: "classrooms",
      label: "จัดการห้องเรียน",
      sub: "Classrooms Setup",
      count: initialData.classrooms.length,
      icon: School,
      gradient: "from-emerald-600 via-teal-600 to-cyan-600",
      shadow: "shadow-emerald-500/25",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/15",
    },
    {
      id: "users",
      label: "จัดการครู & สิทธิ์ผู้ใช้",
      sub: "Teachers & Admins",
      count: initialData.users.length,
      icon: Shield,
      gradient: "from-amber-500 via-rose-500 to-purple-600",
      shadow: "shadow-amber-500/25",
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/15",
    },
    {
      id: "logs",
      label: "ฐานข้อมูลเช็คชื่อรายวัน",
      sub: "Attendance Logs",
      count: initialData.attendanceDates.length,
      icon: Database,
      gradient: "from-rose-600 via-pink-600 to-indigo-600",
      shadow: "shadow-rose-500/25",
      iconColor: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-500/15",
    },
    {
      id: "remedials",
      label: "จัดการข้อมูลการแก้แถว",
      sub: "Remedial & Clinic",
      count: remedials.length,
      icon: Sparkles,
      gradient: "from-violet-600 via-purple-600 to-indigo-600",
      shadow: "shadow-violet-500/25",
      iconColor: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-violet-500/15",
    },
    {
      id: "schedule",
      label: "จัดการวันมาและวันหยุด",
      sub: "Terms & Calendar Rules",
      count: calendarConfig.terms.length,
      icon: CalendarDays,
      gradient: "from-teal-600 via-emerald-600 to-indigo-600",
      shadow: "shadow-teal-500/25",
      iconColor: "text-teal-600 dark:text-teal-400",
      iconBg: "bg-teal-500/15",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Zone Banner separating Front-Office vs Back-Office */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                BACKOFFICE MANAGEMENT
              </span>
              <span className="text-xs text-slate-300">
                • แยกสัดส่วนจากระบบหน้าบ้าน (Front-Office)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              ศูนย์บริหารจัดการข้อมูลระบบหลังบ้าน (Admin Control Center)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              จัดการฐานข้อมูลตั้งต้น: รายชื่อนักเรียน ห้องเรียน สิทธิ์ครูที่ปรึกษา/ฝ่ายปกครอง และดูแลความถูกต้องของข้อมูลเช็คชื่อ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              onClick={() => setIsBulkImportOpen(true)}
              variant="outline"
              className="border-primary/50 bg-primary/10 text-white hover:bg-primary/20 shadow-sm gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>นำเข้า Excel / CSV</span>
            </Button>
            <Button
              onClick={() => handleOpenAddStudent()}
              className="bg-primary text-primary-foreground shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ เพิ่มนักเรียนใหม่</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenAddUser}
              className="border-slate-600 bg-slate-800/80 text-white hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" />
              <span>+ เพิ่มบัญชีครู/แอดมิน</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Back-Office 2-Column Layout: Left Sidebar Menu + Right Content Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* LEFT SIDEBAR: Back-Office Menu + Front-Office Quick Links */}
        <aside className="lg:col-span-3 space-y-4.5 lg:sticky lg:top-22">
          {/* Back-Office Command Menu */}
          <div className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-card via-card to-indigo-500/[0.04] p-3.5 shadow-xl backdrop-blur-xl">
            {/* Top Glossy Hairline */}
            <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between px-2 pt-1 pb-3 border-b border-border/70 mb-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                  <Settings2 className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-black tracking-tight text-foreground">
                  เมนูจัดการหลังบ้าน
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 uppercase tracking-wider shadow-2xs">
                <ShieldCheck className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                <span>BACK-OFFICE ⚙️</span>
              </span>
            </div>

            {/* STRICTLY VERTICAL - NO OVERFLOW-X, NO HORIZONTAL SCROLLBAR */}
            <div className="flex flex-col gap-1.5 overflow-hidden">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "flex items-center justify-between gap-2.5 rounded-2xl px-3.5 py-3 text-left transition-all duration-200 cursor-pointer w-full group",
                      isSelected
                        ? cn("bg-gradient-to-r text-white shadow-lg font-black ring-1 ring-white/20", item.gradient, item.shadow)
                        : "text-foreground hover:bg-muted/70 font-bold"
                    )}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                          isSelected
                            ? "bg-white/20 text-white backdrop-blur-md shadow-xs ring-1 ring-white/30"
                            : cn(item.iconBg, item.iconColor)
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-xs sm:text-sm tracking-tight truncate">{item.label}</span>
                    </span>

                    {item.count !== undefined && (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-black shrink-0 transition-all",
                          isSelected
                            ? "bg-white/25 text-white border border-white/30 backdrop-blur-md shadow-xs"
                            : "bg-muted text-muted-foreground border border-border/60"
                        )}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Distinct Front-Office Quick Jump Box */}
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] via-teal-500/[0.03] to-card p-4 shadow-lg backdrop-blur-xl space-y-3">
            {/* Ambient top hairline */}
            <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black tracking-tight text-emerald-800 dark:text-emerald-300">
                  ทางลัดไประบบหน้าบ้าน
                </span>
              </div>
              <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 uppercase tracking-wider">
                FRONT-OFFICE 🚀
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              สลับไปหน้าปฏิบัติงานรายวันของครู
            </p>

            <div className="space-y-1.5 pt-1">
              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/90 px-3 py-2 text-xs font-bold hover:bg-card hover:border-blue-500/40 hover:shadow-md transition-all group cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <span className="h-7 w-7 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-foreground group-hover:text-primary transition-colors">หน้าแดชบอร์ดสถิติ</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-600 transition-all" />
              </Link>

              <Link
                href="/attendance/check"
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/90 px-3 py-2 text-xs font-bold hover:bg-card hover:border-emerald-500/40 hover:shadow-md transition-all group cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <span className="h-7 w-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-foreground group-hover:text-emerald-600 transition-colors">หน้าเช็คชื่อเข้าแถวรายวัน</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-600 transition-all" />
              </Link>

              <Link
                href="/attendance/remedial"
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/90 px-3 py-2 text-xs font-bold hover:bg-card hover:border-rose-500/40 hover:shadow-md transition-all group cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <span className="h-7 w-7 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <ShieldAlert className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-foreground group-hover:text-rose-600 transition-colors">หน้าระบบแก้แถว (&lt; 80%)</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-rose-600 transition-all" />
              </Link>

              <Link
                href="/grades"
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/90 px-3 py-2 text-xs font-bold hover:bg-card hover:border-amber-500/40 hover:shadow-md transition-all group cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <span className="h-7 w-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <Award className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-foreground group-hover:text-amber-600 transition-colors">ระบบตัดเกรดกิจกรรม (ผ./มผ.)</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-amber-600 transition-all" />
              </Link>

              <Link
                href="/portal"
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/90 px-3 py-2 text-xs font-bold hover:bg-card hover:border-sky-500/40 hover:shadow-md transition-all group cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <span className="h-7 w-7 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <GraduationCap className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-foreground group-hover:text-sky-600 transition-colors">หน้านักเรียน/ผู้ปกครองเช็คผล</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-sky-600 transition-all" />
              </Link>
            </div>
          </div>
        </aside>

        {/* RIGHT WORKSPACE: Active Back-Office Module */}
        <section className="lg:col-span-9 space-y-6">
          {/* MODULE 1: OVERVIEW (HERO COMMAND CENTER & LUXURY 3D STATS) */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              {/* Top Luxury Banner */}
              <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl shadow-indigo-950/20">
                {/* Glow orbs & reflection line */}
                <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/30 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
                <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-400/60 to-transparent pointer-events-none" />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-[11px] font-black uppercase tracking-wider text-sky-300 border border-white/15">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                        <span>ADMIN COMMAND CENTER</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-400/30">
                        <Crown className="h-3 w-3" />
                        <span>สิทธิ์: {activeRole}</span>
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                      <span>ภาพรวมสถานะระบบและการจัดการข้อมูล</span>
                      <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                      ศูนย์ควบคุมและตรวจสอบข้อมูลทะเบียนนักเรียน บัญชีผู้ใช้งาน สถิติการเช็คชื่อเข้าแถว และประวัติกิจกรรมแก้แถวทั้งสถานศึกษา
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">ฐานข้อมูลระบบ</p>
                      <p className="text-xs font-mono font-bold text-emerald-400">MySQL Cloud • Online</p>
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-sky-400 shadow-inner">
                      <Database className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Super Luxury Overview Stat Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* 1. Students Card */}
                <Card className="relative overflow-hidden rounded-3xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-card backdrop-blur-xl shadow-lg hover:shadow-2xl hover:shadow-blue-500/15 hover:border-blue-500/50 hover:-translate-y-1 transition-all duration-300 group">
                  <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent pointer-events-none" />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0 group-hover:scale-110 group-hover:rotate-2 transition-transform duration-300 ring-2 ring-white/30 dark:ring-white/10">
                          <Users className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base font-black text-foreground">
                              ฐานข้อมูลนักเรียน
                            </CardTitle>
                            <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25 uppercase tracking-wider shrink-0 whitespace-nowrap inline-flex items-center">
                              STUDENTS 👨‍🎓
                            </span>
                          </div>
                          <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            จำนวนนักเรียนทั้งหมดในระบบแยกตามสถานะ
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-baseline justify-between pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                          {systemStats.totalStudents}
                        </span>
                        <span className="text-sm font-bold text-muted-foreground">คน</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 justify-end">
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs shrink-0 whitespace-nowrap">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>กำลังศึกษา {systemStats.activeStudents}</span>
                        </span>
                        {systemStats.inactiveStudents > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-muted text-muted-foreground border border-border/80 shrink-0 whitespace-nowrap">
                            <span>พัก/ย้าย {systemStats.inactiveStudents}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-10 rounded-xl bg-blue-600/10 hover:bg-blue-600 hover:text-white border border-blue-500/25 text-blue-700 dark:text-blue-300 font-bold transition-all duration-200 cursor-pointer group/btn shadow-2xs"
                      onClick={() => setActiveSection("students")}
                    >
                      <span>ไปที่เมนูจัดการทะเบียนนักเรียน</span>
                      <ArrowRight className="h-4 w-4 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>

                {/* 2. Users / Staff Card */}
                <Card className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-amber-500/10 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:shadow-indigo-500/15 hover:border-indigo-500/50 hover:-translate-y-1 transition-all duration-300 group">
                  <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent pointer-events-none" />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0 group-hover:scale-110 group-hover:rotate-2 transition-transform duration-300 ring-2 ring-white/30 dark:ring-white/10">
                          <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base font-black text-foreground">
                              ครูที่ปรึกษา & ผู้ดูแลระบบ
                            </CardTitle>
                            <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 uppercase tracking-wider shrink-0 whitespace-nowrap inline-flex items-center">
                              USERS 👑
                            </span>
                          </div>
                          <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            บัญชีผู้มีสิทธิ์เช็คชื่อและอนุมัติกิจกรรมแก้แถว
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-baseline justify-between pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500 bg-clip-text text-transparent">
                          {systemStats.totalUsers}
                        </span>
                        <span className="text-sm font-bold text-muted-foreground">บัญชี</span>
                      </div>

                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/35 shadow-2xs shrink-0 whitespace-nowrap">
                        <Crown className="h-3 w-3 text-amber-500" />
                        <span>สิทธิ์ปัจจุบัน: {activeRole}</span>
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-10 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 hover:text-white border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 font-bold transition-all duration-200 cursor-pointer group/btn shadow-2xs"
                      onClick={() => setActiveSection("users")}
                    >
                      <span>ไปที่เมนูจัดการครูและสิทธิ์ผู้ใช้</span>
                      <ArrowRight className="h-4 w-4 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>

                {/* 3. Classrooms Card */}
                <Card className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-card backdrop-blur-xl shadow-lg hover:shadow-2xl hover:shadow-emerald-500/15 hover:border-emerald-500/50 hover:-translate-y-1 transition-all duration-300 group">
                  <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent pointer-events-none" />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0 group-hover:scale-110 group-hover:rotate-2 transition-transform duration-300 ring-2 ring-white/30 dark:ring-white/10">
                          <School className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base font-black text-foreground">
                              ห้องเรียนทั้งหมด
                            </CardTitle>
                            <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 uppercase tracking-wider shrink-0 whitespace-nowrap inline-flex items-center">
                              ROOMS 🏫
                            </span>
                          </div>
                          <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            ห้องเรียนที่เปิดให้เช็คชื่อหน้าบ้าน
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                          {initialData.classrooms.length}
                        </span>
                        <span className="text-sm font-bold text-muted-foreground">ห้อง</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1 justify-end max-w-[65%]">
                        {initialData.classrooms.map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10.5px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-10 rounded-xl bg-emerald-600/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold transition-all duration-200 cursor-pointer group/btn shadow-2xs"
                      onClick={() => setActiveSection("classrooms")}
                    >
                      <span>ดูรายละเอียดรายห้องเรียน</span>
                      <ArrowRight className="h-4 w-4 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>

                {/* 4. Attendance & Remedial Database Logs Card */}
                <Card className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:shadow-amber-500/15 hover:border-amber-500/50 hover:-translate-y-1 transition-all duration-300 group">
                  <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent pointer-events-none" />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0 group-hover:scale-110 group-hover:rotate-2 transition-transform duration-300 ring-2 ring-white/30 dark:ring-white/10">
                          <Database className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base font-black text-foreground">
                              ข้อมูลเช็คชื่อ & แก้แถวสะสม
                            </CardTitle>
                            <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 uppercase tracking-wider shrink-0 whitespace-nowrap inline-flex items-center">
                              RECORDS ⚡
                            </span>
                          </div>
                          <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            จำนวนเรคคอร์ดในฐานข้อมูล MySQL Cloud
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-baseline justify-between pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
                          {systemStats.totalAttendanceRecords}
                        </span>
                        <span className="text-sm font-bold text-muted-foreground">รายการ</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveSection("remedials")}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30 shadow-2xs hover:bg-purple-500/25 transition-colors cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3 text-purple-600" />
                        <span>แก้แถว {remedials.length} รายการ</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 rounded-xl bg-amber-600/10 hover:bg-amber-600 hover:text-white border border-amber-500/25 text-amber-700 dark:text-amber-300 font-bold transition-all duration-200 cursor-pointer group/btn shadow-2xs text-xs"
                        onClick={() => setActiveSection("logs")}
                      >
                        <span>ประวัติเช็คชื่อ</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 rounded-xl bg-purple-600/10 hover:bg-purple-600 hover:text-white border border-purple-500/25 text-purple-700 dark:text-purple-300 font-bold transition-all duration-200 cursor-pointer group/btn shadow-2xs text-xs"
                        onClick={() => setActiveSection("remedials")}
                      >
                        <span>รายการแก้แถว</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* MODULE 2: STUDENT MANAGEMENT CRUD (LUXURY DIRECTORY) */}
          {activeSection === "students" && (
            <div className="space-y-4">
              {/* Luxury Hero Header Banner (Consistent with Modules 3, 4, 5) */}
              <div className="relative overflow-hidden rounded-3xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-card backdrop-blur-xl shadow-lg p-6">
                <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent pointer-events-none" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-13 w-13 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0 ring-2 ring-white/30 dark:ring-white/10">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-foreground tracking-tight">
                          จัดการทะเบียนรายชื่อนักเรียน (Student Directory)
                        </h3>
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 uppercase tracking-wider shrink-0 whitespace-nowrap inline-flex items-center">
                          {filteredStudents.length} นักเรียน 👨‍🎓
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        เพิ่ม แก้ไข ย้ายห้องเรียน หรือปรับสถานะการศึกษานักเรียนรายบุคคล พร้อมประวัติการเข้าแถว
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      onClick={() => handleOpenAddStudent(classroomFilter === "ALL" ? "" : classroomFilter)}
                      className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white shadow-md shadow-blue-500/25 font-bold h-10 px-4 rounded-xl gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus className="h-4 w-4" />
                      <span>เพิ่มนักเรียนใหม่</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Table Card with Clean Toolbar */}
              <Card className="relative overflow-hidden rounded-3xl border border-border/80 bg-card shadow-xl">
                {/* Glossy top sheen line */}
                <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent pointer-events-none" />

                <div className="p-4 border-b border-border/70 bg-card/60 space-y-3">
                  {/* Row 1: Search Input + Excel Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="ค้นหาด้วยรหัสนักศึกษา, ชื่อ-สกุล, ห้องเรียน..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="h-10 pl-9 text-xs rounded-xl bg-muted/40 border-border/70 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBulkImportOpen(true)}
                        className="h-10 gap-1.5 text-xs font-bold rounded-xl border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>นำเข้า Excel</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportStudentsExcel}
                        className="h-10 gap-1.5 text-xs font-bold rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                        <span>ส่งออก Excel</span>
                      </Button>
                    </div>
                  </div>

                  {/* Row 2: Classroom & Status Filters */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                    {/* Classroom Dropdown */}
                    <select
                      value={classroomFilter}
                      onChange={(e) => setClassroomFilter(e.target.value)}
                      className="h-9 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="ALL">ทุกห้องเรียน ({initialData.classrooms.length} ห้อง)</option>
                      {initialData.classrooms.map((c) => (
                        <option key={c} value={c}>
                          ห้อง {c}
                        </option>
                      ))}
                    </select>

                    {/* Teacher / Advisor Dropdown */}
                    <select
                      value={studentTeacherFilter}
                      onChange={(e) => setStudentTeacherFilter(e.target.value)}
                      className="h-9 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="ALL">ครูทุกคน ({availableTeachers.length} ท่าน)</option>
                      {availableTeachers.map((t) => (
                        <option key={t} value={t}>
                          ครู {t}
                        </option>
                      ))}
                    </select>

                    {/* Status Dropdown */}
                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(
                          e.target.value as "ALL" | "ACTIVE" | "INACTIVE"
                        )
                      }
                      className="h-9 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="ALL">ทุกสถานะการศึกษา</option>
                      <option value="ACTIVE">กำลังศึกษา (ACTIVE)</option>
                      <option value="INACTIVE">พัก/ย้ายออก (INACTIVE)</option>
                    </select>

                    {(studentSearch || classroomFilter !== "ALL" || studentTeacherFilter !== "ALL" || statusFilter !== "ALL") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStudentSearch("");
                          setClassroomFilter("ALL");
                          setStudentTeacherFilter("ALL");
                          setStatusFilter("ALL");
                        }}
                        className="h-9 rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                      >
                        ล้างตัวกรองทั้งหมด
                      </Button>
                    )}

                    <span className="text-[11px] text-muted-foreground ml-auto font-medium">
                      แสดง {filteredStudents.length} จาก {initialData.students.length} คน
                    </span>
                  </div>
                </div>

              <CardContent className="p-0">
                <div className="hidden md:block">
                  <Table className="w-full">
                    <TableHeader className="bg-muted/40">
                      <TableRow className="hover:bg-transparent border-b border-border/70">
                        <TableHead className="w-[125px] font-black text-xs uppercase tracking-wider text-muted-foreground py-2.5 px-3 whitespace-nowrap">
                          รหัสนักเรียน
                        </TableHead>
                        <TableHead className="font-black text-xs uppercase tracking-wider text-muted-foreground py-2.5 px-3">
                          ข้อมูลนักเรียน (ชื่อ - สกุล)
                        </TableHead>
                        <TableHead className="w-[90px] font-black text-xs uppercase tracking-wider text-muted-foreground py-2.5 px-3 text-center whitespace-nowrap">
                          ห้องเรียน
                        </TableHead>
                        <TableHead className="w-[190px] font-black text-xs uppercase tracking-wider text-muted-foreground py-2.5 px-3 whitespace-nowrap">
                          สถิติเข้าแถว / แก้แถว
                        </TableHead>
                        <TableHead className="w-[110px] font-black text-xs uppercase tracking-wider text-muted-foreground py-2.5 px-3 text-center whitespace-nowrap">
                          สถานะการศึกษา
                        </TableHead>
                        <TableHead className="w-[125px] font-black text-xs uppercase tracking-wider text-muted-foreground py-2.5 px-3 text-right whitespace-nowrap">
                          จัดการ
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="h-40 text-center text-muted-foreground"
                          >
                            {initialData.students.length === 0 ? (
                              <div className="flex flex-col items-center justify-center gap-3 py-4">
                                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                                  <FileSpreadsheet className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                  <p className="font-black text-sm text-foreground">ลบข้อมูลตัวอย่างเรียบร้อยแล้ว (ฐานข้อมูลว่าง 100%)</p>
                                  <p className="text-xs text-muted-foreground">พร้อมนำเข้าไฟล์ Excel / CSV รายชื่อนักเรียนจริงเข้าสู่ระบบ</p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => setIsBulkImportOpen(true)}
                                  className="h-9 px-4 rounded-xl font-bold bg-primary text-white shadow-md shadow-primary/25 cursor-pointer gap-2"
                                >
                                  <FileSpreadsheet className="h-4 w-4" />
                                  <span>คลิกเพื่อนำเข้าไฟล์ Excel ตอนนี้</span>
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Users className="h-8 w-8 text-muted-foreground/40" />
                                <p className="font-bold text-sm">ไม่พบข้อมูลนักเรียนตามเงื่อนไขที่เลือก</p>
                                <p className="text-xs text-muted-foreground">ลองล้างช่องค้นหาหรือเปลี่ยนห้องเรียนที่เลือก</p>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((st) => {
                          const isFemale =
                            st.title.includes("นาง") ||
                            st.title.includes("หญิง");
                          const initials = getStudentInitials(st.fullName);

                          return (
                            <TableRow
                              key={st.id}
                              className="hover:bg-primary/[0.03] transition-colors border-b border-border/60 group"
                            >
                              {/* รหัสนักเรียน */}
                              <TableCell className="font-mono font-bold text-primary py-2.5 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 shadow-2xs tracking-wider">
                                    {st.studentId}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(st.studentId);
                                      toast.success(
                                        `คัดลอกรหัส ${st.studentId} เรียบร้อยแล้ว`
                                      );
                                    }}
                                    className="flex items-center justify-center h-6 w-6 rounded-lg border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs shrink-0"
                                    title="คัดลอกรหัสนักเรียน"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                              </TableCell>

                              {/* ชื่อ-นามสกุล พร้อม Initial Avatar */}
                              <TableCell className="py-2.5 px-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={cn(
                                      "h-8 w-8 rounded-xl flex items-center justify-center text-[11px] font-black shadow-xs shrink-0",
                                      isFemale
                                        ? "bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 text-white"
                                        : "bg-gradient-to-tr from-blue-500 via-indigo-600 to-sky-600 text-white"
                                    )}
                                  >
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                                      {st.fullName}
                                    </p>
                                    <p className="text-[10.5px] text-muted-foreground truncate mt-0.5">
                                      {st.title} • ลงทะเบียนในระบบ
                                    </p>
                                  </div>
                                </div>
                              </TableCell>

                              {/* ห้องเรียน */}
                              <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-500/25 shadow-2xs">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  <span>{st.classroom}</span>
                                </span>
                              </TableCell>

                              {/* สถิติเข้าแถว / แก้แถว */}
                              <TableCell className="py-2.5 px-3 whitespace-nowrap">
                                {st.attendanceCount === 0 ? (
                                  <span className="text-xs text-muted-foreground/60 italic font-medium">
                                    ยังไม่มีประวัติ
                                  </span>
                                ) : st.absentCount === 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/25 shadow-2xs">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>มาครบ 100% ({st.attendanceCount} วัน)</span>
                                  </span>
                                ) : (
                                  <div className="flex flex-col gap-0.5 items-start">
                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-bold border border-rose-500/25 shadow-2xs">
                                        <XCircle className="h-3.5 w-3.5" />
                                        <span>ขาด {st.absentCount} วัน</span>
                                      </span>

                                      {st.remedialCount > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-500/25 shadow-2xs">
                                          <Zap className="h-3 w-3 text-purple-500" />
                                          <span>แก้แล้ว {st.remedialCount}</span>
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10.5px] text-muted-foreground font-medium pl-1">
                                      มา {st.presentCount}/{st.attendanceCount} วัน ({Math.round((st.presentCount / st.attendanceCount) * 100)}%)
                                    </span>
                                  </div>
                                )}
                              </TableCell>

                              {/* สถานะ */}
                              <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                                {st.status === "ACTIVE" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs shrink-0 whitespace-nowrap">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                    </span>
                                    <span>กำลังศึกษา</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-muted text-muted-foreground border border-border/80 shrink-0 whitespace-nowrap">
                                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                                    <span>พัก/ย้ายออก</span>
                                  </span>
                                )}
                              </TableCell>

                              {/* จัดการ */}
                              <TableCell className="text-right py-2.5 px-3 whitespace-nowrap">
                                <div className="inline-flex items-center gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenEditStudent(st)}
                                    className="h-7.5 px-2 rounded-lg font-bold text-xs hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer shadow-2xs"
                                  >
                                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                                    <span>แก้ไข</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title={st.status === "ACTIVE" ? "เปลี่ยนเป็นพักการเรียน" : "เปลี่ยนเป็นกำลังศึกษา"}
                                    onClick={() => handleToggleStudentStatus(st)}
                                    disabled={isPending}
                                    className="h-7.5 w-7.5 p-0 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 transition-all cursor-pointer"
                                  >
                                    <Power className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7.5 w-7.5 p-0 rounded-lg hover:bg-rose-500/10 text-rose-600 transition-all cursor-pointer"
                                    onClick={() => handleDeleteStudent(st)}
                                    disabled={isPending}
                                    title="ลบข้อมูลนักเรียน"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards (Luxury responsive view) */}
                <div className="divide-y divide-border/60 md:hidden">
                  {filteredStudents.map((st) => {
                    const isFemale =
                      st.title.includes("นาง") || st.title.includes("หญิง");
                    const initials = getStudentInitials(st.fullName);

                    return (
                      <div key={st.id} className="p-4 space-y-3 bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center text-xs font-black shadow-xs shrink-0",
                                isFemale
                                  ? "bg-gradient-to-tr from-pink-500 to-rose-600 text-white"
                                  : "bg-gradient-to-tr from-blue-500 to-indigo-600 text-white"
                              )}
                            >
                              {initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-black text-primary px-1.5 py-0.2 rounded-md bg-primary/10 border border-primary/20">
                                  {st.studentId}
                                </span>
                                <span className="font-black text-sm text-foreground">
                                  {st.fullName}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                ห้อง {st.classroom} •{" "}
                                {st.attendanceCount === 0 ? (
                                  "ยังไม่มีข้อมูลเช็คชื่อ"
                                ) : st.absentCount === 0 ? (
                                  <span className="text-emerald-600 font-bold">มาครบ 100% ({st.attendanceCount} วัน)</span>
                                ) : (
                                  <>
                                    มา {st.presentCount}/{st.attendanceCount} วัน{" "}
                                    <span className="text-rose-600 font-bold">(ขาด {st.absentCount} วัน)</span>
                                    {st.remedialCount > 0 && (
                                      <span className="text-purple-600 font-bold ml-1">• แก้แล้ว {st.remedialCount}</span>
                                    )}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <span
                            className={cn(
                              "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 whitespace-nowrap inline-flex items-center",
                              st.status === "ACTIVE"
                                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                                : "bg-muted text-muted-foreground border-border/80"
                            )}
                          >
                            {st.status === "ACTIVE" ? "กำลังศึกษา" : "พักการเรียน"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-xl font-bold text-xs"
                            onClick={() => handleOpenEditStudent(st)}
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1" />
                            <span>แก้ไข</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl px-3"
                            onClick={() => handleToggleStudentStatus(st)}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="rounded-xl px-3"
                            onClick={() => handleDeleteStudent(st)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Table Footer Summary Banner */}
                <div className="p-4 border-t border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground font-medium">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>แสดง <b>{filteredStudents.length}</b> จาก <b>{initialData.students.length}</b> คน</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">กำลังศึกษา {initialData.systemStats.activeStudents} คน</span>
                    {initialData.systemStats.inactiveStudents > 0 && (
                      <>
                        <span>•</span>
                        <span>พัก/ย้าย {initialData.systemStats.inactiveStudents} คน</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">LineCheck+ Academic OS</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          )}

          {/* MODULE 3: CLASSROOMS MANAGEMENT */}
          {activeSection === "classrooms" && (
            <div className="space-y-4">
              {/* Luxury Header Banner */}
              <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-card backdrop-blur-xl shadow-lg p-6">
                <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent pointer-events-none" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-13 w-13 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0 ring-2 ring-white/30 dark:ring-white/10">
                      <School className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-foreground tracking-tight">
                          จัดการห้องเรียนและจำนวนนักเรียนรายห้อง
                        </h3>
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase tracking-wider shrink-0 whitespace-nowrap inline-flex items-center">
                          {classroomBreakdown.length} ห้องเรียน 🏫
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ตรวจสอบสถิตินักเรียนแต่ละห้อง เพิ่มนักเรียนเข้าห้องเดิม หรือเปิดห้องเรียนใหม่ได้ทันที
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleOpenAddStudent("")}
                    className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/25 font-bold h-10 px-4 rounded-xl gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>เปิดห้องเรียนใหม่ / เพิ่มนักเรียน</span>
                  </Button>
                </div>
              </div>

              {/* Classroom Cards Grid */}
              <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                {classroomBreakdown.length === 0 ? (
                  <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center gap-2">
                    <School className="h-8 w-8 text-muted-foreground/40" />
                    <p className="font-bold text-sm text-foreground">ยังไม่มีห้องเรียนในระบบ</p>
                    <p className="text-xs text-muted-foreground">
                      ห้องเรียนจะถูกสร้างขึ้นอัตโนมัติตามไฟล์ Excel หรือคลิกปุ่มเปิดห้องเรียนใหม่ด้านบน
                    </p>
                  </div>
                ) : (
                  classroomBreakdown.map((item) => (
                  <div
                    key={item.classroom}
                    className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-emerald-500/[0.04] p-5 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between space-y-4"
                  >
                    <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent pointer-events-none" />

                    {/* Top Section */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-500/20 ring-2 ring-white/50 dark:ring-white/10 group-hover:scale-110 group-hover:rotate-2 transition-transform duration-300">
                          <School className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-black text-lg text-foreground tracking-tight">
                              ห้อง {item.classroom}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shrink-0 whitespace-nowrap inline-flex items-center">
                              มัธยมศึกษา
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span>พร้อมใช้งานเช็คชื่อหน้าบ้าน</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-3xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                          {item.total}
                          <span className="text-xs font-semibold text-muted-foreground ml-1">คน</span>
                        </div>
                        <div className="text-[10px] font-semibold text-muted-foreground">นักเรียนทั้งหมด</div>
                      </div>
                    </div>

                    {/* Middle Stat Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-500/25">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>กำลังศึกษา {item.activeCount} คน</span>
                      </span>

                      {item.inactiveCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/80 text-muted-foreground text-xs font-bold border border-border">
                          <span>พัก/ย้าย {item.inactiveCount} คน</span>
                        </span>
                      )}

                      {item.totalAbsent > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-bold border border-rose-500/25">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>ขาดแถวสะสม {item.totalAbsent} ครั้ง</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300 text-xs font-bold border border-sky-500/25">
                          <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                          <span>ขาดแถว 0 ครั้ง (ดีเยี่ยม)</span>
                        </span>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl font-bold text-xs h-9.5 border-border/80 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-500/30 transition-all cursor-pointer gap-1.5"
                        onClick={() => {
                          setClassroomFilter(item.classroom);
                          setActiveSection("students");
                        }}
                      >
                        <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>ดูรายชื่อในห้องนี้</span>
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 font-bold text-xs h-9.5 px-3.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] gap-1.5"
                        onClick={() => handleOpenAddStudent(item.classroom)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>เพิ่มนักเรียนเข้าห้อง</span>
                      </Button>
                    </div>
                  </div>
                )))}
              </div>
            </div>
          )}

          {/* MODULE 4: USERS & ROLES */}
          {activeSection === "users" && (
            <div className="space-y-4">
              {/* Luxury Header Banner */}
              <div className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-card backdrop-blur-xl shadow-lg p-6">
                <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent pointer-events-none" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-13 w-13 rounded-2xl bg-gradient-to-tr from-amber-500 via-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0 ring-2 ring-white/30 dark:ring-white/10">
                      <Crown className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-foreground tracking-tight">
                          จัดการบัญชีครูที่ปรึกษา (TEACHER) และผู้ดูแลระบบฝ่ายปกครอง (ADMIN)
                        </h3>
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 uppercase tracking-wider shrink-0 whitespace-nowrap inline-flex items-center">
                          {initialData.users.length} บัญชีผู้ใช้งาน 🛡️
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        กำหนดสิทธิ์ผู้ใช้งานระบบสำหรับบันทึกการเช็คชื่อและอนุมัติกิจกรรมแก้แถว หรือทดสอบใช้งานสิทธิ์ได้ทันที
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleOpenAddUser}
                    className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/25 font-bold h-10 px-4 rounded-xl gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>เพิ่มบัญชีครู / แอดมิน</span>
                  </Button>
                </div>
              </div>

              {/* Toolbar & Filters for Users */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="ค้นหาชื่อครู, อีเมล, ห้องเรียนที่ดูแล..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9 h-10 rounded-xl text-xs bg-muted/40 border-border/70"
                    />
                  </div>

                  {/* Role Filter & Clear */}
                  <div className="flex items-center gap-2">
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value as "ALL" | "ADMIN" | "TEACHER")}
                      className="h-10 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="ALL">ทุกสิทธิ์ผู้ใช้งาน</option>
                      <option value="ADMIN">ADMIN ฝ่ายปกครอง</option>
                      <option value="TEACHER">TEACHER ครูที่ปรึกษา</option>
                    </select>

                    {(userSearch || userRoleFilter !== "ALL") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUserSearch("");
                          setUserRoleFilter("ALL");
                        }}
                        className="h-10 rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                      >
                        ล้างตัวกรอง
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground font-medium">
                  <span>ค้นหาจากชื่อครู, อีเมล หรือห้องเรียนที่ดูแล</span>
                  <span>แสดง {filteredUsers.length} จาก {initialData.users.length} บัญชี</span>
                </div>
              </div>

              {/* Users List */}
              <div className="space-y-3.5">
                {filteredUsers.length === 0 ? (
                  <div className="py-16 text-center rounded-3xl border border-dashed border-border/80 bg-muted/20">
                    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mx-auto mb-3">
                      <Users className="h-7 w-7" />
                    </div>
                    <p className="font-bold text-sm text-foreground">ไม่พบบัญชีผู้ใช้งานตามเงื่อนไข</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูรายชื่อทั้งหมด
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                  const isAdmin = u.role === "ADMIN";
                  const initials = getUserInitials(u.name);

                  return (
                    <div
                      key={u.id}
                      className={cn(
                        "relative overflow-hidden rounded-3xl border p-5 transition-all duration-300 group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm hover:shadow-xl",
                        isAdmin
                          ? "border-amber-500/30 bg-gradient-to-r from-amber-500/[0.08] via-purple-500/[0.04] to-card hover:border-amber-500/55 hover:shadow-amber-500/10"
                          : "border-teal-500/25 bg-gradient-to-r from-teal-500/[0.08] via-sky-500/[0.03] to-card hover:border-teal-500/50 hover:shadow-teal-500/10"
                      )}
                    >
                      {/* Top Hairline */}
                      <div
                        className={cn(
                          "absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent to-transparent pointer-events-none",
                          isAdmin ? "via-amber-500/50" : "via-teal-500/40"
                        )}
                      />

                      {/* Left Info */}
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Avatar with Halo Ring */}
                        <div
                          className={cn(
                            "h-13 w-13 rounded-2xl p-[2px] shadow-md shrink-0 transition-transform group-hover:scale-105",
                            isAdmin
                              ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-amber-500/25"
                              : "bg-gradient-to-tr from-teal-400 via-emerald-500 to-cyan-600 shadow-teal-500/25"
                          )}
                        >
                          <div className="h-full w-full rounded-[14px] bg-background flex items-center justify-center font-black text-sm tracking-tight text-foreground">
                            {isAdmin ? (
                              <span className="text-amber-500 font-black flex items-center gap-0.5">
                                👑
                              </span>
                            ) : (
                              <span className="text-teal-600 dark:text-teal-400 font-black">
                                {initials}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-base text-foreground tracking-tight">
                              {cleanTeacherName(u.name)}
                            </span>

                            {isAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-800 dark:text-amber-300 text-xs font-black border border-amber-500/40 shadow-xs">
                                <Crown className="h-3 w-3 text-amber-500" />
                                <span>ADMIN (ฝ่ายปกครอง)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-black border border-emerald-500/30 shadow-xs">
                                <UserCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span>TEACHER (ครูที่ปรึกษา)</span>
                              </span>
                            )}

                            {isAdmin ? (
                              <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25 shrink-0 whitespace-nowrap">
                                ⚡ สิทธิ์เต็ม 100% (ทุกห้อง)
                              </span>
                            ) : u.classrooms ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 shadow-2xs shrink-0 whitespace-nowrap">
                                <School className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span>ดูแลเฉพาะ: {u.classrooms}</span>
                              </span>
                            ) : (
                              <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border shrink-0 whitespace-nowrap">
                                <span>ดูแลได้ทุกห้อง</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-mono font-medium">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{u.email}</span>
                            </span>
                            <span>•</span>
                            <span>
                              เช็คชื่อสะสม: <b className="text-foreground font-black">{u.recordedCount.toLocaleString()}</b> รายการ
                            </span>
                            <span>•</span>
                            <span>
                              อนุมัติแก้แถว: <b className="text-foreground font-black">{u.approvedCount.toLocaleString()}</b> รายการ
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Actions: Interactive Luxury Capsule */}
                      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/40 dark:bg-muted/20 border border-border/70 backdrop-blur-xs shadow-xs shrink-0 self-end sm:self-center transition-all hover:border-primary/30">
                        {/* Quick Copy Email Button */}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(u.email);
                            toast.success(`คัดลอกอีเมล ${u.email} เรียบร้อยแล้ว`);
                          }}
                          className="group/copy flex items-center justify-center h-8.5 w-8.5 rounded-xl bg-card hover:bg-sky-500 text-muted-foreground hover:text-white border border-border/70 hover:border-sky-500 shadow-2xs hover:shadow-md hover:shadow-sky-500/20 transition-all duration-200 cursor-pointer active:scale-90"
                          title={`คลิกเพื่อคัดลอกอีเมล (${u.email})`}
                        >
                          <Copy className="h-3.5 w-3.5 transition-transform group-hover/copy:scale-110" />
                        </button>

                        {/* Luxury Edit Button with Shimmer & Animated Pencil */}
                        <Button
                          size="sm"
                          onClick={() => handleOpenEditUser(u)}
                          className="relative overflow-hidden group/edit h-8.5 px-3.5 rounded-xl font-bold text-xs bg-card hover:bg-gradient-to-r hover:from-primary hover:to-indigo-600 text-foreground hover:text-white border border-border/80 hover:border-transparent shadow-2xs hover:shadow-md hover:shadow-primary/20 transition-all duration-300 cursor-pointer active:scale-95 gap-1.5"
                        >
                          <div className="absolute inset-0 -translate-x-full group-hover/edit:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 pointer-events-none" />
                          <Edit3 className="h-3.5 w-3.5 text-primary group-hover/edit:text-white transition-all duration-300 group-hover/edit:rotate-12 group-hover/edit:-translate-y-0.5" />
                          <span>แก้ไข</span>
                        </Button>

                        {/* Danger Delete Button with Jiggle Animation */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="group/del h-8.5 w-8.5 p-0 rounded-xl bg-card hover:bg-rose-500 text-rose-500 hover:text-white border border-border/70 hover:border-rose-500 shadow-2xs hover:shadow-md hover:shadow-rose-500/25 transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-90"
                          onClick={() => handleDeleteUser(u)}
                          disabled={isPending}
                          title="ลบบัญชีผู้ใช้"
                        >
                          <Trash2 className="h-3.5 w-3.5 transition-all duration-200 group-hover/del:scale-110 group-hover/del:-rotate-12" />
                        </Button>
                      </div>
                    </div>
                  );
                }))}
              </div>
            </div>
          )}

          {/* MODULE 5: ATTENDANCE LOGS */}
          {activeSection === "logs" && (
            <div className="space-y-4">
              {/* Luxury Header Banner */}
              <div className="relative overflow-hidden rounded-3xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-purple-500/5 to-card backdrop-blur-xl shadow-lg p-6">
                <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent pointer-events-none" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-13 w-13 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0 ring-2 ring-white/30 dark:ring-white/10">
                      <CalendarDays className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-foreground tracking-tight">
                          จัดการประวัติการเช็คชื่อรายวัน (Attendance Date Logs)
                        </h3>
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 uppercase tracking-wider shrink-0 whitespace-nowrap inline-flex items-center">
                          {initialData.attendanceDates.length} วันที่บันทึก 📅
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ตรวจสอบสรุปยอดเช็คชื่อย้อนหลังแต่ละวัน หรือลบข้อมูลวันที่เช็คชื่อผิดพลาดเพื่อรีเซ็ตบันทึกใหม่
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toolbar & Filters for Date Logs */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="ค้นหาด้วยรหัสนักศึกษา, ชื่อ-สกุล, ห้องเรียน หรือวันที่..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="pl-9 h-10 rounded-xl text-xs bg-muted/40 border-border/70"
                    />
                  </div>

                  {/* Date Picker Filter (Thai Calendar Popover) */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Popover open={isLogDateOpen} onOpenChange={setIsLogDateOpen}>
                      <PopoverTrigger className="flex h-10 items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors cursor-pointer w-full sm:min-w-[190px]">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                          <span>
                            {logDateFilter
                              ? formatThaiDisplay(logDateFilter)
                              : "เลือกวันที่ (ปฏิทินไทย)"}
                          </span>
                        </div>
                        {logDateFilter && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLogDateFilter("");
                            }}
                            className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title="ล้างวันที่"
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        side="bottom"
                        sideOffset={8}
                        collisionPadding={12}
                        className="w-auto p-2 rounded-3xl shadow-2xl border border-border/80 bg-popover z-50"
                      >
                        <Calendar
                          mode="single"
                          selected={logDateFilter ? parseISO(logDateFilter) : undefined}
                          onSelect={(day) => {
                            if (day) {
                              setLogDateFilter(format(day, "yyyy-MM-dd"));
                              setIsLogDateOpen(false);
                            }
                          }}
                        />
                        {logDateFilter && (
                          <div className="pt-2 px-2 pb-1 border-t border-border/60 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setLogDateFilter("");
                                setIsLogDateOpen(false);
                              }}
                              className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                            >
                              ล้างวันที่เลือก
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Filters row: Classroom, Student & Teacher */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                  {/* Filter by Classroom */}
                  <select
                    value={logClassroomFilter}
                    onChange={(e) => {
                      setLogClassroomFilter(e.target.value);
                      setLogStudentFilter("ALL");
                    }}
                    className="h-9 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="ALL">ทุกห้องเรียน ({initialData.classrooms.length} ห้อง)</option>
                    {initialData.classrooms.map((c) => (
                      <option key={c} value={c}>
                        ห้อง {c}
                      </option>
                    ))}
                  </select>

                  {/* Filter by Student */}
                  <select
                    value={logStudentFilter}
                    onChange={(e) => setLogStudentFilter(e.target.value)}
                    className="h-9 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20 max-w-[220px] truncate"
                  >
                    <option value="ALL">
                      นักเรียนทุกคน ({availableStudentsForLogs.length} คน)
                    </option>
                    {availableStudentsForLogs.map((s) => (
                      <option key={s.id} value={s.studentId}>
                        {s.studentId} - {s.fullName}
                      </option>
                    ))}
                  </select>

                  {/* Filter by Teacher */}
                  <select
                    value={logTeacherFilter}
                    onChange={(e) => setLogTeacherFilter(e.target.value)}
                    className="h-9 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="ALL">ครูทุกคน ({availableTeachers.length} ท่าน)</option>
                    {availableTeachers.map((t) => (
                      <option key={t} value={t}>
                        ครู {t}
                      </option>
                    ))}
                  </select>

                  {(logSearch || logDateFilter || logClassroomFilter !== "ALL" || logStudentFilter !== "ALL" || logTeacherFilter !== "ALL") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLogSearch("");
                        setLogDateFilter("");
                        setLogClassroomFilter("ALL");
                        setLogStudentFilter("ALL");
                        setLogTeacherFilter("ALL");
                      }}
                      className="h-9 rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                    >
                      ล้างตัวกรองทั้งหมด
                    </Button>
                  )}

                  <span className="text-[11px] text-muted-foreground ml-auto font-medium">
                    แสดง {filteredAttendanceDates.length} จาก {initialData.attendanceDates.length} วัน
                  </span>
                </div>
              </div>

              {/* Logs List */}
              <div className="space-y-3">
                {filteredAttendanceDates.length === 0 ? (
                  <div className="py-16 text-center rounded-3xl border border-dashed border-border/80 bg-muted/20">
                    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mx-auto mb-3">
                      <CalendarDays className="h-7 w-7" />
                    </div>
                    <p className="font-bold text-sm text-foreground">ไม่พบประวัติการเช็คชื่อตามตัวกรอง</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ลองเปลี่ยนวันที่ หรือล้างตัวกรองเพื่อดูข้อมูลทั้งหมด
                    </p>
                  </div>
                ) : (
                  filteredAttendanceDates.map((d) => (
                    <div
                      key={d.dateIso}
                      className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-rose-500/[0.02] p-4.5 hover:border-rose-500/35 hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group"
                    >
                      {/* Left Date + Badges */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-primary/15 to-indigo-500/15 border border-primary/25 text-primary flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                          <CalendarDays className="h-5 w-5" />
                        </div>

                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-sm text-foreground tracking-tight">
                              {format(new Date(d.dateIso), "วันEEEEที่ d MMMM yyyy", { locale: th })}
                            </span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/80 font-bold">
                              ({d.dateIso})
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-500/10 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-500/20">
                              รวม {d.totalRecords} รายการ
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              <span>มา {d.presentCount}</span>
                            </span>
                            {d.lateCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-500/30">
                                สาย {d.lateCount}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
                                สาย 0
                              </span>
                            )}
                            {d.absentCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-800 dark:text-rose-400 text-xs font-bold border border-rose-500/30">
                                <XCircle className="h-3 w-3" />
                                <span>ขาด {d.absentCount}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
                                ขาด 0
                              </span>
                            )}
                            {d.leaveCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-500/15 text-sky-800 dark:text-sky-300 text-xs font-bold border border-sky-500/30">
                                ลา {d.leaveCount}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
                                ลา 0
                              </span>
                            )}
                          </div>

                          {/* Extra info: Classrooms & Teachers recorded */}
                          {((d.classrooms && d.classrooms.length > 0) || (d.teachers && d.teachers.length > 0)) && (
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                              {d.classrooms && d.classrooms.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/70 text-foreground font-medium border border-border/50">
                                  <span>🏫 ห้อง:</span>
                                  <span className="font-bold">{d.classrooms.join(", ")}</span>
                                </span>
                              )}
                              {d.teachers && d.teachers.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/70 text-foreground font-medium border border-border/50">
                                  <span>👨‍🏫 ครูผู้เช็ค:</span>
                                  <span className="font-bold">{d.teachers.join(", ")}</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Matching students when searching or filtering */}
                          {(() => {
                            const q = logSearch.trim().toLowerCase();
                            const matches = (d.students || []).filter((st) => {
                              if (logStudentFilter !== "ALL") {
                                return st.studentId === logStudentFilter || st.studentCode === logStudentFilter;
                              }
                              if (q) {
                                return (
                                  st.studentCode.toLowerCase().includes(q) ||
                                  st.fullName.toLowerCase().includes(q) ||
                                  st.classroom.toLowerCase().includes(q)
                                );
                              }
                              return false;
                            });

                            if (matches.length === 0) return null;

                            return (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/40">
                                <span className="text-[10px] font-bold text-muted-foreground">
                                  🔍 นักศึกษาที่เกี่ยวข้อง ({matches.length}):
                                </span>
                                {matches.slice(0, 6).map((st) => (
                                  <span
                                    key={st.studentCode}
                                    className={cn(
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border",
                                      st.status === "ABSENT"
                                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                        : st.status === "LATE"
                                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                        : st.status === "LEAVE"
                                        ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30"
                                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                    )}
                                  >
                                    <span>{st.studentCode} {st.fullName}</span>
                                    <span className="opacity-80">
                                      [{st.status === "PRESENT" ? "มา" : st.status === "ABSENT" ? "ขาด" : st.status === "LATE" ? "สาย" : "ลา"}]
                                    </span>
                                  </span>
                                ))}
                                {matches.length > 6 && (
                                  <span className="text-[10px] font-medium text-muted-foreground">
                                    + อีก {matches.length - 6} คน
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Right Action Button */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleDeleteDateLogs(d.dateIso, d.totalRecords)}
                          className="border-rose-500/30 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 shadow-xs hover:shadow-md hover:shadow-rose-500/20 font-bold text-xs h-9 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>ล้างข้อมูลวันนี้</span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* MODULE 6: REMEDIAL & CLINIC RECORDS MANAGEMENT */}
          {activeSection === "remedials" && (
            <div className="space-y-4">
              {/* Luxury Header Banner */}
              <div className="relative overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-card backdrop-blur-xl shadow-lg p-6">
                <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent pointer-events-none" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-13 w-13 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0 ring-2 ring-white/30 dark:ring-white/10">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-foreground tracking-tight">
                          จัดการข้อมูลการแก้แถว & คลินิกแก้แถว (Remedials)
                        </h3>
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 uppercase tracking-wider shrink-0 whitespace-nowrap inline-flex items-center">
                          {filteredRemedials.length} รายการ ✨
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ตรวจสอบ ประวัติการเข้าคลินิกแก้แถววันพุธ-พฤหัสฯ และกิจกรรมชดเชยเวลาเรียน ซิงค์กับระบบหน้าบ้านทันที
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/attendance/remedial")}
                      className="rounded-xl border-violet-500/30 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10 font-bold text-xs h-10 px-4"
                    >
                      <ArrowUpRight className="h-4 w-4 mr-1.5" />
                      <span>เปิดระบบคลินิกแก้แถว</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats Overview Row (including Image 2 design!) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Stat 1: Matching Image 2 */}
                <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4 sm:p-5 flex items-center justify-between shadow-xs">
                  <div>
                    <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                      แก้แถวสำเร็จแล้วทั้งหมด
                    </p>
                    <p className="text-2xl sm:text-3xl font-black mt-1 text-violet-600 dark:text-violet-400">
                      {remedials.length} ครั้ง
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      คลินิกแก้แถววันพุธ-พฤหัสบดี
                    </p>
                  </div>
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-400 shrink-0">
                    <Sparkles className="h-6 w-6" />
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 flex items-center justify-between shadow-xs">
                  <div>
                    <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                      อนุมัติสมบูรณ์ (APPROVED)
                    </p>
                    <p className="text-2xl sm:text-3xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
                      {remedials.filter((r) => r.status === "APPROVED").length} รายการ
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      ชดเชยเวลาเรียนเรียบร้อย
                    </p>
                  </div>
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 sm:p-5 flex items-center justify-between shadow-xs">
                  <div>
                    <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                      เข้าคลินิกแก้แถว
                    </p>
                    <p className="text-2xl sm:text-3xl font-black mt-1 text-blue-600 dark:text-blue-400">
                      {remedials.filter((r) => r.type === "CLINIC_MAKEUP").length} ครั้ง
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      รอบชดเชยวันพุธ-พฤหัสบดี
                    </p>
                  </div>
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                </div>

                {/* Stat 4 */}
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 flex items-center justify-between shadow-xs">
                  <div>
                    <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                      กิจกรรมชดเชยอื่น ๆ
                    </p>
                    <p className="text-2xl sm:text-3xl font-black mt-1 text-amber-600 dark:text-amber-400">
                      {remedials.filter((r) => r.type === "SPECIAL_ACTIVITY").length} รายการ
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      บำเพ็ญประโยชน์ / กิจกรรม
                    </p>
                  </div>
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                    <Award className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Toolbar & Filters */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
                {/* Row 1: Search & Date picker */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="ค้นหาด้วยรหัสนักศึกษา, ชื่อ-สกุล, ห้องเรียน หรือวันที่..."
                      value={remedialSearch}
                      onChange={(e) => setRemedialSearch(e.target.value)}
                      className="pl-9 h-10 rounded-xl text-xs bg-muted/40 border-border/70"
                    />
                  </div>

                  {/* Date Filter Picker (Thai Calendar Popover) */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Popover open={isRemedialDateOpen} onOpenChange={setIsRemedialDateOpen}>
                      <PopoverTrigger className="flex h-10 items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors cursor-pointer w-full sm:min-w-[190px]">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                          <span>
                            {remedialDateFilter
                              ? formatThaiDisplay(remedialDateFilter)
                              : "เลือกวันที่ (ปฏิทินไทย)"}
                          </span>
                        </div>
                        {remedialDateFilter && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRemedialDateFilter("");
                            }}
                            className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title="ล้างวันที่"
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        side="bottom"
                        sideOffset={8}
                        collisionPadding={12}
                        className="w-auto p-2 rounded-3xl shadow-2xl border border-border/80 bg-popover z-50"
                      >
                        <Calendar
                          mode="single"
                          selected={remedialDateFilter ? parseISO(remedialDateFilter) : undefined}
                          onSelect={(day) => {
                            if (day) {
                              setRemedialDateFilter(format(day, "yyyy-MM-dd"));
                              setIsRemedialDateOpen(false);
                            }
                          }}
                        />
                        {remedialDateFilter && (
                          <div className="pt-2 px-2 pb-1 border-t border-border/60 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRemedialDateFilter("");
                                setIsRemedialDateOpen(false);
                              }}
                              className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                            >
                              ล้างวันที่เลือก
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Row 2: Select Classroom, Student, Teacher, Type & Clear */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                  {/* 1. เลือกห้องเรียน */}
                  <select
                    value={remedialClassroomFilter}
                    onChange={(e) => {
                      setRemedialClassroomFilter(e.target.value);
                      setRemedialStudentFilter("ALL");
                    }}
                    className="h-9 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="ALL">ทุกห้องเรียน ({initialData.classrooms.length} ห้อง)</option>
                    {initialData.classrooms.map((c) => (
                      <option key={c} value={c}>
                        ห้อง {c}
                      </option>
                    ))}
                  </select>

                  {/* 2. เลือกนักเรียน */}
                  <select
                    value={remedialStudentFilter}
                    onChange={(e) => setRemedialStudentFilter(e.target.value)}
                    className="h-9 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20 max-w-[220px] truncate"
                  >
                    <option value="ALL">
                      นักเรียนทุกคน ({availableStudentsForRemedials.length} คน)
                    </option>
                    {availableStudentsForRemedials.map((s) => (
                      <option key={s.id} value={s.studentId}>
                        {s.studentId} - {s.fullName}
                      </option>
                    ))}
                  </select>

                  {/* 3. เลือกครู (ผู้อนุมัติ) */}
                  <select
                    value={remedialTeacherFilter}
                    onChange={(e) => setRemedialTeacherFilter(e.target.value)}
                    className="h-9 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="ALL">ครูทุกคน ({availableTeachers.length} ท่าน)</option>
                    {availableTeachers.map((t) => (
                      <option key={t} value={t}>
                        ครู {t}
                      </option>
                    ))}
                  </select>

                  {/* 4. เลือกประเภทการแก้ */}
                  <select
                    value={remedialTypeFilter}
                    onChange={(e) => setRemedialTypeFilter(e.target.value as "ALL" | "CLINIC_MAKEUP" | "SPECIAL_ACTIVITY")}
                    className="h-9 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="ALL">ทุกประเภทการแก้</option>
                    <option value="CLINIC_MAKEUP">คลินิกแก้แถว</option>
                    <option value="SPECIAL_ACTIVITY">กิจกรรมพิเศษ</option>
                  </select>

                  {(remedialSearch ||
                    remedialDateFilter ||
                    remedialClassroomFilter !== "ALL" ||
                    remedialStudentFilter !== "ALL" ||
                    remedialTeacherFilter !== "ALL" ||
                    remedialTypeFilter !== "ALL") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRemedialSearch("");
                        setRemedialDateFilter("");
                        setRemedialClassroomFilter("ALL");
                        setRemedialStudentFilter("ALL");
                        setRemedialTeacherFilter("ALL");
                        setRemedialTypeFilter("ALL");
                      }}
                      className="h-9 rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                    >
                      ล้างตัวกรองทั้งหมด
                    </Button>
                  )}

                  <span className="text-[11px] text-muted-foreground ml-auto font-medium">
                    แสดง {filteredRemedials.length} จาก {remedials.length} รายการ
                  </span>
                </div>
              </div>

              {/* Remedials List Section - Matching Image 1! */}
              <div className="space-y-3">
                {filteredRemedials.length === 0 ? (
                  <div className="py-16 text-center rounded-3xl border border-dashed border-border/80 bg-muted/20">
                    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mx-auto mb-3">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <p className="font-bold text-sm text-foreground">ไม่พบรายการแก้แถว</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ยังไม่มีรายการแก้แถวตามเงื่อนไขที่เลือก หรือยังไม่มีนักเรียนบันทึกแก้แถว
                    </p>
                  </div>
                ) : (
                  filteredRemedials.map((rem) => {
                    const formattedCreated = format(new Date(rem.createdAtIso), "d ต.ค. yyyy", { locale: th });
                    const formattedTarget = format(new Date(rem.targetDateIso), "d ต.ค. yyyy", { locale: th });
                    const stu = initialData.students.find((s) => s.studentId === rem.studentCode || s.id === rem.studentId);
                    const remainingDebt = stu ? Math.max(0, stu.absentCount - stu.remedialCount) : 0;

                    return (
                      <div
                        key={rem.id}
                        className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 sm:p-5 hover:border-violet-500/40 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group"
                      >
                        {/* Left: Icon, Student Code, Copy, Name, Classroom, Type badge */}
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 shrink-0 group-hover:scale-105 transition-transform">
                            <CalendarDays className="h-5 w-5" />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs sm:text-sm font-bold text-foreground tracking-tight">
                                {rem.studentCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(rem.studentCode)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md hover:bg-muted cursor-pointer"
                                title="คัดลอกรหัส"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-xs sm:text-sm font-bold text-foreground">
                                {rem.studentName}
                              </span>
                              <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.2">
                                {rem.classroom}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold border-violet-500/30 text-violet-700 dark:text-violet-300 bg-violet-500/10"
                              >
                                {rem.type === "CLINIC_MAKEUP" ? "มาแก้แถว" : "กิจกรรมแก้แถว"}
                              </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                              <span>มาแก้แถวเมื่อ {formattedCreated}</span>
                              <span>•</span>
                              <span>ชดเชยวันขาด {formattedTarget}</span>
                              {rem.activityTitle && (
                                <>
                                  <span>•</span>
                                  <span className="text-foreground/80 font-medium">
                                    {rem.activityTitle}
                                  </span>
                                </>
                              )}
                              {rem.approvedByName && (
                                <>
                                  <span>•</span>
                                  <span className="text-muted-foreground/80">
                                    ผู้อนุมัติ: {rem.approvedByName}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Right: Status badge & Admin Delete button */}
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0 self-end sm:self-center">
                          {remainingDebt > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>ค้างแก้สะสมข้ามสัปดาห์ ({remainingDebt} ครั้ง)</span>
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>แก้แถวแล้ว</span>
                          </span>

                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => handleDeleteRemedial(rem)}
                            className="h-9 w-9 p-0 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="ลบรายการแก้แถวนี้"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* MODULE 7: ACADEMIC CALENDAR & TERMS MANAGEMENT */}
          {activeSection === "schedule" && (
            <AcademicCalendarTab
              initialConfig={calendarConfig}
              onConfigChange={(newCfg) => setCalendarConfig(newCfg)}
            />
          )}
        </section>
      </div>

      {/* ============================================================
          ADD / EDIT STUDENT MODAL (DESIGN LUXURY)
          ============================================================ */}
      <Dialog open={isStudentModalOpen} onOpenChange={setIsStudentModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-sky-500/30 bg-card shadow-2xl shadow-sky-500/15">
          {/* Top Sky Iridescent Ambient Banner */}
          <div className="relative bg-gradient-to-br from-sky-500/15 via-blue-500/10 to-indigo-500/10 px-6 pt-6 pb-4 border-b border-border/70 shrink-0">
            {/* Glossy reflection line */}
            <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-500/50 to-transparent pointer-events-none" />

            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/25 shrink-0 ring-2 ring-white/30 dark:ring-white/10">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-black text-foreground tracking-tight">
                    {studentForm.id
                      ? "แก้ไขข้อมูลนักเรียน"
                      : "เพิ่มนักเรียนใหม่เข้าสู่ระบบ"}
                  </DialogTitle>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25 uppercase tracking-wider shrink-0">
                    STUDENT 🎒
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  กรอกรหัสนักเรียน ชื่อ-นามสกุล และห้องเรียนเพื่อใช้ในการเช็คชื่อเข้าแถว
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveStudent} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="st-id" className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Hash className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                  <span>รหัสนักเรียน</span>
                </Label>
                <Input
                  id="st-id"
                  required
                  placeholder="เช่น 68219100001"
                  value={studentForm.studentId}
                  onChange={(e) =>
                    setStudentForm((p) => ({ ...p, studentId: e.target.value }))
                  }
                  className="h-10.5 rounded-xl font-mono font-bold tracking-wider bg-background/80 border-border/80 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="st-classroom" className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <School className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                  <span>ห้องเรียน</span>
                </Label>
                <Input
                  id="st-classroom"
                  required
                  placeholder="เช่น ม.4/1"
                  value={studentForm.classroom}
                  onChange={(e) =>
                    setStudentForm((p) => ({ ...p, classroom: e.target.value }))
                  }
                  className="h-10.5 rounded-xl font-bold bg-background/80 border-border/80 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="st-title" className="text-xs font-bold text-foreground">
                  คำนำหน้า
                </Label>
                <select
                  id="st-title"
                  value={studentForm.title}
                  onChange={(e) =>
                    setStudentForm((p) => ({ ...p, title: e.target.value }))
                  }
                  className="flex h-10.5 w-full rounded-xl border border-border/80 bg-background/80 px-3 text-sm font-semibold focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                >
                  <option value="นาย">นาย</option>
                  <option value="นางสาว">นางสาว</option>
                  <option value="เด็กชาย">เด็กชาย</option>
                  <option value="เด็กหญิง">เด็กหญิง</option>
                </select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="st-first" className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <User className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                  <span>ชื่อจริง</span>
                </Label>
                <Input
                  id="st-first"
                  required
                  placeholder="ชื่อจริง..."
                  value={studentForm.firstName}
                  onChange={(e) =>
                    setStudentForm((p) => ({ ...p, firstName: e.target.value }))
                  }
                  className="h-10.5 rounded-xl font-medium bg-background/80 border-border/80 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="st-last" className="text-xs font-bold text-foreground">
                  นามสกุล
                </Label>
                <Input
                  id="st-last"
                  required
                  placeholder="นามสกุล..."
                  value={studentForm.lastName}
                  onChange={(e) =>
                    setStudentForm((p) => ({ ...p, lastName: e.target.value }))
                  }
                  className="h-10.5 rounded-xl font-medium bg-background/80 border-border/80 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {/* Status Radio Buttons (แทนที่ native select) */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>สถานะการศึกษา</span>
                </Label>
                <div className="grid grid-cols-2 gap-2 h-10.5">
                  <button
                    type="button"
                    onClick={() =>
                      setStudentForm((p) => ({ ...p, status: "ACTIVE" }))
                    }
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs font-bold transition-all cursor-pointer",
                      studentForm.status === "ACTIVE"
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500/40"
                        : "border-border/80 bg-background/60 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>กำลังศึกษา</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setStudentForm((p) => ({ ...p, status: "INACTIVE" }))
                    }
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs font-bold transition-all cursor-pointer",
                      studentForm.status === "INACTIVE"
                        ? "border-rose-500 bg-rose-500/20 text-rose-800 dark:text-rose-300 shadow-xs ring-1 ring-rose-500/40"
                        : "border-border/80 bg-background/60 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                    <span>พัก/ย้ายออก</span>
                  </button>
                </div>
              </div>
            </div>

            </div>

            <DialogFooter className="px-6 py-4 bg-muted/20 border-t border-border/70 flex items-center justify-end gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStudentModalOpen(false)}
                className="rounded-xl px-4 font-semibold cursor-pointer"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="relative overflow-hidden rounded-xl px-5 font-bold shadow-lg shadow-sky-500/25 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white cursor-pointer transition-all active:scale-95 group"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 pointer-events-none" />
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="h-4 w-4 mr-1.5" />
                    <span>บันทึกข้อมูลนักเรียน</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          ADD / EDIT USER MODAL (DESIGN LUXURY)
          ============================================================ */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-2xl shadow-primary/15">
          {/* Top Royal Iridescent Ambient Banner */}
          <div className="relative bg-gradient-to-br from-primary/15 via-indigo-600/10 to-emerald-500/10 px-6 pt-6 pb-4 border-b border-border/70 shrink-0">
            {/* Glossy reflection line */}
            <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none" />

            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary via-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-primary/25 shrink-0 ring-2 ring-white/30 dark:ring-white/10">
                {userForm.id ? (
                  <Edit3 className="h-6 w-6" />
                ) : (
                  <UserPlus className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-black text-foreground tracking-tight">
                    {userForm.id
                      ? "แก้ไขบัญชีครู / ผู้ดูแลระบบ"
                      : "เพิ่มบัญชีครูที่ปรึกษา / ผู้ดูแลระบบ"}
                  </DialogTitle>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 uppercase tracking-wider shrink-0">
                    STAFF 🛡️
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  กำหนดชื่อ อีเมล และระดับสิทธิ์การใช้งาน (TEACHER หรือ ADMIN)
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveUser} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <Label htmlFor="u-name" className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>ชื่อ - นามสกุล / ตำแหน่ง</span>
                </Label>
                <Input
                  id="u-name"
                  required
                  placeholder="เช่น ครูสมศรี ที่ปรึกษา"
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="h-11 rounded-xl text-sm bg-background/80 border-border/80 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="u-email" className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <span>อีเมลเข้าสู่ระบบ (Email Login)</span>
                </Label>
                <Input
                  id="u-email"
                  type="email"
                  required
                  placeholder="teacher2@school.ac.th"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, email: e.target.value }))
                  }
                  className="h-11 rounded-xl text-sm font-mono bg-background/80 border-border/80 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Interactive Visual Role Cards (แทนที่ native select เดิม) */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span>ระดับสิทธิ์การใช้งาน (Role)</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {/* TEACHER Role Card */}
                  <button
                    type="button"
                    onClick={() =>
                      setUserForm((p) => ({ ...p, role: "TEACHER" }))
                    }
                    className={cn(
                      "flex flex-col items-start p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group",
                      userForm.role === "TEACHER"
                        ? "border-emerald-500 bg-emerald-500/15 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                        : "border-border/80 bg-background/60 hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-black",
                        userForm.role === "TEACHER" ? "text-emerald-800 dark:text-emerald-300" : "text-foreground"
                      )}>
                        <GraduationCap className="h-3.5 w-3.5 text-emerald-500" />
                        <span>TEACHER</span>
                      </span>
                      {userForm.role === "TEACHER" && (
                        <span className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10.5px] font-semibold text-muted-foreground mt-1">
                      ครูที่ปรึกษา (ประจำชั้น)
                    </span>
                    <span className="text-[9.5px] text-muted-foreground/80 mt-0.5 line-clamp-1">
                      เช็คชื่อ & อนุมัติแก้แถวห้องที่ดูแล
                    </span>
                  </button>

                  {/* ADMIN Role Card */}
                  <button
                    type="button"
                    onClick={() =>
                      setUserForm((p) => ({ ...p, role: "ADMIN" }))
                    }
                    className={cn(
                      "flex flex-col items-start p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group",
                      userForm.role === "ADMIN"
                        ? "border-amber-500 bg-amber-500/15 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/30"
                        : "border-border/80 bg-background/60 hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-black",
                        userForm.role === "ADMIN" ? "text-amber-800 dark:text-amber-300" : "text-foreground"
                      )}>
                        <Crown className="h-3.5 w-3.5 text-amber-500" />
                        <span>ADMIN</span>
                      </span>
                      {userForm.role === "ADMIN" && (
                        <span className="h-4 w-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10.5px] font-semibold text-muted-foreground mt-1">
                      ฝ่ายปกครอง (ผู้ดูแลระบบ)
                    </span>
                    <span className="text-[9.5px] text-muted-foreground/80 mt-0.5 line-clamp-1">
                      สิทธิ์เต็ม 100% ดูแลทั้งโรงเรียน
                    </span>
                  </button>
                </div>
              </div>

              {/* Assigned Classrooms (เฉพาะครูที่ปรึกษา TEACHER) */}
              {userForm.role === "TEACHER" && (
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-emerald-500/[0.07] border border-emerald-500/25">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="u-classrooms" className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <School className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>ห้องเรียนที่รับผิดชอบ (จำกัดสิทธิ์เฉพาะห้องนี้)</span>
                    </Label>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                      จำกัดสิทธิ์รายห้อง 🔒
                    </span>
                  </div>

                  <Input
                    id="u-classrooms"
                    placeholder="เช่น ปวช.2/1 หรือ ม.4/1, ม.4/2"
                    value={userForm.classrooms || ""}
                    onChange={(e) =>
                      setUserForm((p) => ({ ...p, classrooms: e.target.value }))
                    }
                    className="h-10.5 rounded-xl text-xs font-bold bg-background/90 border-border/80 focus:ring-2 focus:ring-emerald-500/20"
                  />

                  {/* Quick Toggle Classrooms Chips if classrooms exist */}
                  {initialData.classrooms.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10.5px] text-muted-foreground font-semibold">
                        คลิกเลือกห้องเรียนที่มีในระบบด่วน:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {initialData.classrooms.map((room) => {
                          const currentList = (userForm.classrooms || "")
                            .split(",")
                            .map((c) => c.trim())
                            .filter(Boolean);
                          const isChecked = currentList.includes(room);

                          return (
                            <button
                              key={room}
                              type="button"
                              onClick={() => {
                                let nextList: string[];
                                if (isChecked) {
                                  nextList = currentList.filter((c) => c !== room);
                                } else {
                                  nextList = [...currentList, room];
                                }
                                setUserForm((p) => ({
                                  ...p,
                                  classrooms: nextList.join(", "),
                                }));
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1",
                                isChecked
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                  : "bg-card text-muted-foreground border-border/80 hover:border-emerald-500/40"
                              )}
                            >
                              {isChecked && <Check className="h-3 w-3" />}
                              <span>{room}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                    ครูจะสามารถเห็นและบันทึกการเช็คชื่อได้<b>เฉพาะห้องที่ระบุเท่านั้น</b> (สามารถระบุห้องเดียวหรือคั่นด้วยจุลภาค เช่น <code>ม.4/1, ม.4/2</code> หรือเว้นว่างหากดูแลได้ทุกห้อง)
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="u-pass" className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  <span>
                    รหัสผ่าน (Password) {userForm.id && <span className="text-muted-foreground font-normal">(เว้นว่างหากไม่ต้องการเปลี่ยน)</span>}
                  </span>
                </Label>
                <Input
                  id="u-pass"
                  type="text"
                  placeholder="password123"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, password: e.target.value }))
                  }
                  className="h-10.5 rounded-xl font-mono text-sm bg-background/80 border-border/80 focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[10.5px] text-muted-foreground">
                  รหัสผ่านเริ่มต้นสำหรับบัญชีทดสอบในระบบคือ <code className="font-mono text-primary font-bold">password123</code>
                </p>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 bg-muted/20 border-t border-border/70 flex items-center justify-end gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUserModalOpen(false)}
                className="rounded-xl px-4 font-semibold cursor-pointer"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="relative overflow-hidden rounded-xl px-5 font-bold shadow-lg shadow-primary/25 bg-gradient-to-r from-primary via-indigo-600 to-emerald-600 hover:from-primary/90 hover:to-emerald-500 text-white cursor-pointer transition-all active:scale-95 group"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 pointer-events-none" />
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    <span>บันทึกข้อมูลผู้ใช้งาน</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <BulkImportModal
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onSuccess={() => router.refresh()}
        existingClassrooms={initialData.classrooms}
        initialClassroom={classroomFilter === "ALL" ? "" : classroomFilter}
      />

      {/* ============================================================
          LUXURY DANGER CONFIRMATION DIALOG (แทนที่ window.confirm เดิม)
          ============================================================ */}
      <Dialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setDeleteDialog((prev) => ({ ...prev, isOpen: open }));
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-0 gap-0 overflow-hidden rounded-3xl border border-rose-500/30 bg-card shadow-2xl shadow-rose-500/15">
          {/* Top Rose Glowing Ambient Banner */}
          <div className="relative bg-gradient-to-br from-rose-600/15 via-red-500/10 to-amber-500/5 px-6 pt-7 pb-5 text-center border-b border-rose-500/20">
            {/* Glossy sheen */}
            <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-rose-500/60 to-transparent pointer-events-none" />

            {/* 3D Pulsing Danger Icon */}
            <div className="relative inline-flex items-center justify-center mb-3">
              <div className="absolute -inset-2 rounded-3xl bg-rose-500/25 blur-md animate-pulse" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 text-white shadow-lg shadow-rose-600/30 ring-2 ring-white/30 dark:ring-white/10">
                <Trash2 className="h-6 w-6" />
              </div>
            </div>

            <DialogTitle className="text-lg font-black text-foreground tracking-tight">
              {deleteDialog.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1.5 px-3 leading-relaxed">
              {deleteDialog.description}
            </DialogDescription>
          </div>

          {/* Target Item Highlight Card */}
          <div className="p-5 sm:p-6 space-y-4">
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 dark:bg-rose-950/20 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-black text-rose-950 dark:text-rose-100 break-words leading-snug">
                    {deleteDialog.itemName}
                  </p>
                  {deleteDialog.itemSubtitle && (
                    <p className="text-xs font-semibold text-rose-800 dark:text-rose-200 break-words leading-relaxed">
                      {deleteDialog.itemSubtitle}
                    </p>
                  )}
                </div>
                {deleteDialog.itemBadge && (
                  <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300">
                    {deleteDialog.itemBadge}
                  </span>
                )}
              </div>
              {deleteDialog.itemDetail && (
                <p className="text-xs text-rose-700/80 dark:text-rose-300/80 leading-relaxed pt-0.5 border-t border-rose-500/15">
                  {deleteDialog.itemDetail}
                </p>
              )}
            </div>

            {/* Warning Note */}
            <div className="flex items-center gap-2.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 leading-tight">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>การกระทำนี้ส่งผลต่อฐานข้อมูลทันที และไม่สามารถกู้คืนได้</span>
            </div>

            {/* Action Buttons: Responsive 2-column grid preventing overflow and cut-off */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={() =>
                  setDeleteDialog((prev) => ({ ...prev, isOpen: false }))
                }
                className="w-full h-11 rounded-xl font-semibold border-border hover:bg-muted cursor-pointer transition-colors text-xs sm:text-sm"
              >
                ยกเลิก (Cancel)
              </Button>
              <Button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="w-full h-11 rounded-xl font-bold shadow-lg shadow-rose-600/25 bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white cursor-pointer transition-all active:scale-95 text-xs sm:text-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5 shrink-0" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1.5 shrink-0" />
                    <span>ยืนยันการลบ</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
