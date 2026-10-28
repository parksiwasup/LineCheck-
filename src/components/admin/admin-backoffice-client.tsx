"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
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
  Loader2,
  Plus,
  LayoutGrid,
  School,
  ArrowUpRight,
  ClipboardCheck,
  ShieldAlert,
  LayoutDashboard,
} from "lucide-react";
import {
  upsertStudentAction,
  toggleStudentStatusAction,
  deleteStudentAction,
  upsertUserAction,
  deleteUserAction,
  deleteAttendanceByDateAction,
  type AdminStudentItem,
  type AdminUserItem,
  type AdminAttendanceDateSummary,
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

type AdminSection = "overview" | "students" | "classrooms" | "users" | "logs";

interface AdminBackofficeClientProps {
  initialData: {
    students: AdminStudentItem[];
    users: AdminUserItem[];
    classrooms: string[];
    attendanceDates: AdminAttendanceDateSummary[];
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

export function AdminBackofficeClient({
  initialData,
}: AdminBackofficeClientProps) {
  const router = useRouter();
  const { activeRole, setActiveRole } = useAttendanceStore();
  const [isPending, startTransition] = React.useTransition();
  const [activeSection, setActiveSection] =
    React.useState<AdminSection>("students");

  // Student filters
  const [studentSearch, setStudentSearch] = React.useState("");
  const [classroomFilter, setClassroomFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");

  // Student Dialog state
  const [isStudentModalOpen, setIsStudentModalOpen] = React.useState(false);
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
  }>({
    name: "",
    email: "",
    password: "",
    role: "TEACHER",
  });

  const filteredStudents = React.useMemo(() => {
    return initialData.students.filter((s) => {
      const matchClass =
        classroomFilter === "ALL" || s.classroom === classroomFilter;
      const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
      const matchQuery =
        !studentSearch.trim() ||
        s.studentId.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.fullName.toLowerCase().includes(studentSearch.toLowerCase());
      return matchClass && matchStatus && matchQuery;
    });
  }, [initialData.students, classroomFilter, statusFilter, studentSearch]);

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
    if (
      !window.confirm(
        `ยืนยันการลบข้อมูลนักเรียน "${st.studentId} ${st.fullName}" (รวมถึงประวัติการเช็คชื่อทั้งหมดของนักเรียนคนนี้)?`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteStudentAction(st.id);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleOpenAddUser = () => {
    setUserForm({
      name: "",
      email: "",
      password: "password123",
      role: "TEACHER",
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: AdminUserItem) => {
    setUserForm({
      id: u.id,
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await upsertUserAction(userForm);
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
    if (!window.confirm(`ยืนยันการลบบัญชีผู้ใช้งาน "${u.name}" (${u.email})?`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteUserAction(u.id);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleDeleteDateLogs = (dateIso: string, count: number) => {
    if (
      !window.confirm(
        `ยืนยันการล้างข้อมูลการเช็คชื่อของวันที่ ${dateIso} จำนวน ${count} รายการ?`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteAttendanceByDateAction(dateIso);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const { systemStats } = initialData;

  const sidebarItems: {
    id: AdminSection;
    label: string;
    sub: string;
    count?: number;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "overview",
      label: "ภาพรวมหลังบ้าน",
      sub: "System Overview",
      icon: LayoutGrid,
    },
    {
      id: "students",
      label: "จัดการทะเบียนนักเรียน",
      sub: "Students Directory",
      count: initialData.students.length,
      icon: Users,
    },
    {
      id: "classrooms",
      label: "จัดการห้องเรียน",
      sub: "Classrooms Setup",
      count: initialData.classrooms.length,
      icon: School,
    },
    {
      id: "users",
      label: "จัดการครู & สิทธิ์ผู้ใช้",
      sub: "Teachers & Admins",
      count: initialData.users.length,
      icon: Shield,
    },
    {
      id: "logs",
      label: "ฐานข้อมูลเช็คชื่อรายวัน",
      sub: "Attendance Logs",
      count: initialData.attendanceDates.length,
      icon: Database,
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
        <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-22">
          <Card className="overflow-hidden border-border/90">
            <div className="border-b border-border/70 bg-muted/50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                เมนูจัดการหลังบ้าน (Back-Office)
              </p>
            </div>
            <div className="p-2 flex lg:flex-col gap-1 overflow-x-auto">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0 lg:w-full",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {item.count !== undefined && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-bold",
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Distinct Front-Office Quick Jump Box */}
          <Card className="border-emerald-500/30 bg-emerald-500/[0.04]">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  ทางลัดไประบบหน้าบ้าน
                </span>
                <Badge variant="success" className="text-[10px]">
                  Front-Office
                </Badge>
              </div>
              <CardDescription className="text-xs">
                สลับไปหน้าปฏิบัติงานรายวันของครู
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-1 space-y-1.5">
              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-medium hover:border-primary/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                  <span>หน้าแดชบอร์ดสถิติ</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/attendance/check"
                className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-medium hover:border-primary/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>หน้าเช็คชื่อเข้าแถวรายวัน</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/attendance/remedial"
                className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-medium hover:border-primary/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                  <span>หน้าระบบแก้แถว (&lt; 80%)</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </aside>

        {/* RIGHT WORKSPACE: Active Back-Office Module */}
        <section className="lg:col-span-9 space-y-6">
          {/* MODULE 1: OVERVIEW */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      ฐานข้อมูลนักเรียน (Students)
                    </CardTitle>
                    <CardDescription>
                      จำนวนนักเรียนทั้งหมดในระบบแยกตามสถานะ
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-bold">
                        {systemStats.totalStudents} คน
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        กำลังศึกษา {systemStats.activeStudents} • พัก/ย้าย{" "}
                        {systemStats.inactiveStudents}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setActiveSection("students")}
                    >
                      ไปที่เมนูจัดการทะเบียนนักเรียน →
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      ครูที่ปรึกษา & ผู้ดูแลระบบ (Users)
                    </CardTitle>
                    <CardDescription>
                      บัญชีผู้มีสิทธิ์เช็คชื่อและอนุมัติกิจกรรมแก้แถว
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-bold">
                        {systemStats.totalUsers} บัญชี
                      </span>
                      <span className="text-xs text-muted-foreground">
                        สิทธิ์ปัจจุบัน: <b>{activeRole}</b>
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setActiveSection("users")}
                    >
                      ไปที่เมนูจัดการครูและสิทธิ์ผู้ใช้ →
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <School className="h-4 w-4 text-primary" />
                      ห้องเรียนทั้งหมด (Classrooms)
                    </CardTitle>
                    <CardDescription>
                      ห้องเรียนที่เปิดให้เช็คชื่อหน้าบ้าน
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-bold">
                        {initialData.classrooms.length} ห้อง
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {initialData.classrooms.join(", ")}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setActiveSection("classrooms")}
                    >
                      ดูรายละเอียดรายห้องเรียน →
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary" />
                      ข้อมูลเช็คชื่อและแก้แถวสะสม
                    </CardTitle>
                    <CardDescription>
                      จำนวนเรคคอร์ดในฐานข้อมูล MySQL
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-bold">
                        {systemStats.totalAttendanceRecords} รายการ
                      </span>
                      <span className="text-xs text-muted-foreground">
                        แก้แถว {systemStats.totalRemedialRecords} รายการ
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setActiveSection("logs")}
                    >
                      จัดการประวัติเช็คชื่อรายวัน →
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* MODULE 2: STUDENT MANAGEMENT CRUD */}
          {activeSection === "students" && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="text-base">
                      จัดการทะเบียนรายชื่อนักเรียน (Student Directory)
                    </CardTitle>
                    <CardDescription>
                      เพิ่ม แก้ไข ย้ายห้องเรียน หรือปรับสถานะการศึกษานักเรียน
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
                      <button
                        type="button"
                        onClick={() => setClassroomFilter("ALL")}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
                          classroomFilter === "ALL"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        ทุกห้อง
                      </button>
                      {initialData.classrooms.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setClassroomFilter(c)}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
                            classroomFilter === c
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(
                          e.target.value as "ALL" | "ACTIVE" | "INACTIVE"
                        )
                      }
                      className="h-9 rounded-xl border border-input bg-card px-2.5 text-xs font-medium"
                    >
                      <option value="ALL">ทุกสถานะ</option>
                      <option value="ACTIVE">กำลังศึกษา (ACTIVE)</option>
                      <option value="INACTIVE">พัก/ย้ายออก (INACTIVE)</option>
                    </select>

                    <div className="relative w-full sm:w-52">
                      <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="ค้นหารหัส / ชื่อ-สกุล..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="h-9 pl-8 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัสนักเรียน</TableHead>
                        <TableHead>ชื่อ - นามสกุล</TableHead>
                        <TableHead>ห้องเรียน</TableHead>
                        <TableHead>สถิติเช็คชื่อ / แก้แถว</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead className="text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="h-28 text-center text-muted-foreground"
                          >
                            ไม่พบข้อมูลนักเรียน
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((st) => (
                          <TableRow key={st.id}>
                            <TableCell className="font-mono font-bold text-primary">
                              {st.studentId}
                            </TableCell>
                            <TableCell className="font-medium">
                              {st.fullName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{st.classroom}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">
                                  เช็คชื่อ {st.attendanceCount} วัน
                                </span>
                                {st.absentCount > 0 && (
                                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                    (ขาด {st.absentCount})
                                  </span>
                                )}
                                {st.remedialCount > 0 && (
                                  <Badge variant="info" className="text-[10px]">
                                    แก้แถว {st.remedialCount}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {st.status === "ACTIVE" ? (
                                <Badge variant="success">
                                  <CheckCircle2 className="h-3 w-3" />
                                  ACTIVE
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <XCircle className="h-3 w-3 text-muted-foreground" />
                                  INACTIVE
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenEditStudent(st)}
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  <span>แก้ไข</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="สลับสถานะ ACTIVE / INACTIVE"
                                  onClick={() => handleToggleStudentStatus(st)}
                                  disabled={isPending}
                                >
                                  <Power className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-600"
                                  onClick={() => handleDeleteStudent(st)}
                                  disabled={isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="divide-y divide-border/60 md:hidden">
                  {filteredStudents.map((st) => (
                    <div key={st.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">
                              {st.studentId}
                            </span>
                            <span className="font-semibold text-sm">
                              {st.fullName}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ห้อง {st.classroom} • เช็คชื่อ {st.attendanceCount} วัน (ขาด {st.absentCount})
                          </p>
                        </div>
                        <Badge
                          variant={
                            st.status === "ACTIVE" ? "success" : "outline"
                          }
                        >
                          {st.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleOpenEditStudent(st)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>แก้ไข</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStudentStatus(st)}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteStudent(st)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* MODULE 3: CLASSROOMS MANAGEMENT */}
          {activeSection === "classrooms" && (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base">
                      จัดการห้องเรียนและจำนวนนักเรียนรายห้อง
                    </CardTitle>
                    <CardDescription>
                      สามารถเพิ่มนักเรียนเข้าห้องเรียนเดิม หรือพิมพ์ชื่อห้องเรียนใหม่ (เช่น ม.4/3, ม.5/2) ตอนเพิ่มนักเรียนเพื่อเปิดห้องเรียนใหม่ได้ทันที
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenAddStudent("")}>
                    <Plus className="h-4 w-4" />
                    <span>เปิดห้องเรียนใหม่ / เพิ่มนักเรียน</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {classroomBreakdown.map((item) => (
                  <div
                    key={item.classroom}
                    className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                          <School className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-base">
                            ห้อง {item.classroom}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            นักเรียนทั้งหมด {item.total} คน
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        กำลังศึกษา {item.activeCount} คน
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setClassroomFilter(item.classroom);
                          setActiveSection("students");
                        }}
                      >
                        ดูรายชื่อในห้องนี้
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleOpenAddStudent(item.classroom)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>เพิ่มนักเรียนเข้าห้อง</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* MODULE 4: USERS & ROLES */}
          {activeSection === "users" && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base">
                      จัดการบัญชีครูที่ปรึกษา (TEACHER) และผู้ดูแลระบบฝ่ายปกครอง (ADMIN)
                    </CardTitle>
                    <CardDescription>
                      กำหนดสิทธิ์ผู้ใช้งานระบบสำหรับบันทึกการเช็คชื่อและอนุมัติกิจกรรมแก้แถว
                    </CardDescription>
                  </div>
                  <Button onClick={handleOpenAddUser}>
                    <Plus className="h-4 w-4" />
                    <span>เพิ่มบัญชีครู / แอดมิน</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {initialData.users.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm">{u.name}</span>
                        {u.role === "ADMIN" ? (
                          <Badge variant="default" className="gap-1">
                            <Shield className="h-3 w-3" />
                            ADMIN (ฝ่ายปกครอง)
                          </Badge>
                        ) : (
                          <Badge variant="success" className="gap-1">
                            <UserCheck className="h-3 w-3" />
                            TEACHER (ครูที่ปรึกษา)
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        ประวัติการบันทึกเช็คชื่อ: <b>{u.recordedCount}</b> รายการ • อนุมัติแก้แถว: <b>{u.approvedCount}</b> รายการ
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setActiveRole(u.role);
                          toast.success(
                            `สลับสิทธิ์การใช้งานปัจจุบันเป็น ${u.name} (${u.role}) แล้ว`
                          );
                        }}
                      >
                        ใช้งานด้วยสิทธิ์นี้
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditUser(u)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>แก้ไข</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-500/10"
                        onClick={() => handleDeleteUser(u)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* MODULE 5: ATTENDANCE LOGS */}
          {activeSection === "logs" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  จัดการประวัติการเช็คชื่อรายวัน (Attendance Date Logs)
                </CardTitle>
                <CardDescription>
                  ตรวจสอบสรุปยอดเช็คชื่อย้อนหลังแต่ละวัน หรือลบข้อมูลวันที่เช็คชื่อผิดพลาด
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {initialData.attendanceDates.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    ยังไม่มีประวัติการเช็คชื่อในฐานข้อมูล
                  </div>
                ) : (
                  initialData.attendanceDates.map((d) => (
                    <div
                      key={d.dateIso}
                      className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-primary" />
                          <span className="font-bold text-sm">
                            {format(
                              new Date(d.dateIso),
                              "วันEEEEที่ d MMMM yyyy",
                              {
                                locale: th,
                              }
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({d.dateIso})
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                          <Badge variant="outline">
                            รวม {d.totalRecords} รายการ
                          </Badge>
                          <Badge variant="success">มา {d.presentCount}</Badge>
                          <Badge variant="warning">สาย {d.lateCount}</Badge>
                          <Badge variant="destructive">
                            ขาด {d.absentCount}
                          </Badge>
                          <Badge variant="info">ลา {d.leaveCount}</Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isPending}
                          onClick={() =>
                            handleDeleteDateLogs(d.dateIso, d.totalRecords)
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>ล้างข้อมูลวันนี้</span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      {/* ADD / EDIT STUDENT MODAL */}
      <Dialog open={isStudentModalOpen} onOpenChange={setIsStudentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {studentForm.id
                ? "แก้ไขข้อมูลนักเรียน"
                : "เพิ่มนักเรียนใหม่เข้าสู่ระบบ"}
            </DialogTitle>
            <DialogDescription>
              กรอกรหัสนักเรียน ชื่อ-นามสกุล และห้องเรียนเพื่อใช้ในการเช็คชื่อเข้าแถว
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveStudent} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="st-id">รหัสนักเรียน</Label>
                <Input
                  id="st-id"
                  required
                  placeholder="เช่น 66025"
                  value={studentForm.studentId}
                  onChange={(e) =>
                    setStudentForm((p) => ({ ...p, studentId: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="st-classroom">ห้องเรียน</Label>
                <Input
                  id="st-classroom"
                  required
                  placeholder="เช่น ม.4/1"
                  value={studentForm.classroom}
                  onChange={(e) =>
                    setStudentForm((p) => ({ ...p, classroom: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="st-title">คำนำหน้า</Label>
                <select
                  id="st-title"
                  value={studentForm.title}
                  onChange={(e) =>
                    setStudentForm((p) => ({ ...p, title: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                >
                  <option value="นาย">นาย</option>
                  <option value="นางสาว">นางสาว</option>
                  <option value="เด็กชาย">เด็กชาย</option>
                  <option value="เด็กหญิง">เด็กหญิง</option>
                </select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="st-first">ชื่อจริง</Label>
                <Input
                  id="st-first"
                  required
                  placeholder="ชื่อจริง..."
                  value={studentForm.firstName}
                  onChange={(e) =>
                    setStudentForm((p) => ({ ...p, firstName: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="st-last">นามสกุล</Label>
                <Input
                  id="st-last"
                  required
                  placeholder="นามสกุล..."
                  value={studentForm.lastName}
                  onChange={(e) =>
                    setStudentForm((p) => ({ ...p, lastName: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="st-status">สถานะการศึกษา</Label>
                <select
                  id="st-status"
                  value={studentForm.status}
                  onChange={(e) =>
                    setStudentForm((p) => ({
                      ...p,
                      status: e.target.value as "ACTIVE" | "INACTIVE",
                    }))
                  }
                  className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                >
                  <option value="ACTIVE">กำลังศึกษา (ACTIVE)</option>
                  <option value="INACTIVE">พัก/ย้ายออก (INACTIVE)</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStudentModalOpen(false)}
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
                  <span>บันทึกข้อมูลนักเรียน</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD / EDIT USER MODAL */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {userForm.id
                ? "แก้ไขบัญชีครู / ผู้ดูแลระบบ"
                : "เพิ่มบัญชีครูที่ปรึกษา / ผู้ดูแลระบบ"}
            </DialogTitle>
            <DialogDescription>
              กำหนดชื่อ อีเมล และระดับสิทธิ์การใช้งาน (TEACHER หรือ ADMIN)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUser} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">ชื่อ - นามสกุล / ตำแหน่ง</Label>
              <Input
                id="u-name"
                required
                placeholder="เช่น ครูสมชาย ที่ปรึกษา ม.4/1"
                value={userForm.name}
                onChange={(e) =>
                  setUserForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-email">อีเมลเข้าสู่ระบบ</Label>
              <Input
                id="u-email"
                type="email"
                required
                placeholder="teacher2@school.ac.th"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-role">ระดับสิทธิ์ (Role)</Label>
                <select
                  id="u-role"
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm((p) => ({
                      ...p,
                      role: e.target.value as "TEACHER" | "ADMIN",
                    }))
                  }
                  className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                >
                  <option value="TEACHER">TEACHER (ครูที่ปรึกษา)</option>
                  <option value="ADMIN">ADMIN (ฝ่ายปกครอง)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="u-pass">
                  รหัสผ่าน {userForm.id && "(เว้นว่างหากไม่เปลี่ยน)"}
                </Label>
                <Input
                  id="u-pass"
                  type="text"
                  placeholder="password123"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, password: e.target.value }))
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUserModalOpen(false)}
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
                  <span>บันทึกผู้ใช้งาน</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
