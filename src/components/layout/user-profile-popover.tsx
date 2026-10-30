"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  ShieldCheck,
  GraduationCap,
  BookOpenCheck,
  UserCheck,
  ChevronDown,
  Camera,
  Loader2,
  Settings,
  ArrowRight,
  User,
  LogOut,
  Users,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  Award,
  School,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { logoutAction, updateUserProfileImageAction } from "@/actions/auth-actions";
import { toast } from "sonner";
import type { Role } from "@prisma/client";

interface UserProfilePopoverProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: Role;
    classrooms?: string | null;
  };
}

export function UserProfilePopover({ user }: UserProfilePopoverProps) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(user.image ?? null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [showSuccessToast, setShowSuccessToast] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [copiedEmail, setCopiedEmail] = React.useState(false);

  // Sync avatarUrl if user prop changes
  React.useEffect(() => {
    if (user.image) {
      setAvatarUrl(user.image);
    }
  }, [user.image]);

  const classroomList = React.useMemo(() => {
    if (!user.classrooms) return [];
    return user.classrooms
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  }, [user.classrooms]);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user.email) return;
    navigator.clipboard.writeText(user.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP) เท่านั้น");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("ขนาดรูปภาพต้องไม่เกิน 8MB");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "avatars");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการอัปโหลด");
      }

      setAvatarUrl(data.url);
      const updateRes = await updateUserProfileImageAction(data.url);

      if (updateRes.success) {
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ไม่สามารถบันทึกรูปโปรไฟล์ได้";
      toast.error(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await logoutAction();
    } catch {
      setIsSigningOut(false);
    }
  };

  const isAdmin = user.role === "ADMIN";
  const userInitials = user.name
    ? user.name.slice(0, 2)
    : isAdmin
    ? "ผด"
    : "คร";

  return (
    <>
      <Popover>
        <PopoverTrigger
          title="ข้อมูลบัญชีผู้ใช้งาน และตั้งค่าโปรไฟล์"
          className={cn(
            "group relative inline-flex items-center gap-2 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap overflow-hidden select-none",
            "hover:shadow-xs hover:border-border",
            isAdmin
              ? "bg-card border-border/80 text-foreground hover:bg-accent/60"
              : "bg-card border-border/80 text-foreground hover:bg-accent/60"
          )}
        >
          {/* Avatar thumbnail with 3D gradient ring & floating badge */}
          <div className="relative shrink-0">
            <div
              className={cn(
                "p-[1.5px] rounded-lg shadow-2xs transition-transform duration-200 group-hover:scale-105",
                isAdmin
                  ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600"
                  : "bg-gradient-to-tr from-emerald-400 via-teal-500 to-sky-500"
              )}
            >
              <div className="h-7 w-7 rounded-[7px] overflow-hidden bg-background flex items-center justify-center relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user.name || "User Avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className={cn(
                      "h-full w-full flex items-center justify-center text-[11px] font-extrabold text-white",
                      isAdmin
                        ? "bg-gradient-to-br from-indigo-600 to-purple-700"
                        : "bg-gradient-to-br from-emerald-600 to-teal-700"
                    )}
                  >
                    {userInitials}
                  </span>
                )}
              </div>
            </div>

            {/* Floating Academic / Teacher Badge */}
            {isAdmin ? (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 text-amber-950 shadow-2xs border border-white dark:border-slate-900">
                <GraduationCap className="h-2 w-2" />
              </span>
            ) : (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-400 via-teal-300 to-emerald-200 text-emerald-950 shadow-2xs border border-white dark:border-slate-900">
                <BookOpenCheck className="h-2 w-2" />
              </span>
            )}
          </div>

          <div className="hidden sm:flex flex-col items-start text-left leading-tight">
            <span className="font-bold text-xs max-w-[120px] truncate text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
              {user.name?.split(" ")[0] || (isAdmin ? "ฝ่ายปกครอง" : "ครูที่ปรึกษา")}
            </span>
            <span
              className={cn(
                "text-[9px] font-bold uppercase tracking-wide",
                isAdmin ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {isAdmin ? "ADMIN ฝ่ายปกครอง" : user.classrooms ? `ห้อง: ${user.classrooms}` : "ครูที่ปรึกษา"}
            </span>
          </div>

          <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all ml-0.5" />
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-88 sm:w-[380px] p-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl bg-card z-50 animate-in fade-in zoom-in-95"
        >
          {/* 1. Dynamic Luxury Academic Top Banner - Extra vertical clearance */}
          <div
            className={cn(
              "relative h-28 w-full p-4 flex items-start justify-between bg-gradient-to-tr text-white overflow-hidden select-none",
              isAdmin
                ? "from-slate-950 via-indigo-950 to-primary"
                : "from-emerald-950 via-teal-900 to-cyan-800"
            )}
          >
            {/* Shimmer light sweep */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

            {/* Glowing background aura orbs */}
            <div className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
            <div className="pointer-events-none absolute -top-4 -left-4 h-20 w-20 rounded-full bg-primary/30 blur-xl" />

            {/* Brand Title - Compact to ensure zero collision with center avatar */}
            <div className="relative space-y-0.5 z-10 max-w-[55%]">
              <span className="text-[10.5px] font-extrabold tracking-wider uppercase text-amber-300 dark:text-amber-200 flex items-center gap-1.5 drop-shadow-xs truncate">
                <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-spin shrink-0" style={{ animationDuration: "8s" }} />
                <span className="truncate">LineCheck+ Academic</span>
              </span>
              <p className="text-sm font-black tracking-tight text-white flex items-center gap-1.5 truncate">
                <School className="h-3.5 w-3.5 opacity-80 shrink-0" />
                <span className="truncate">โปรไฟล์บุคลากร</span>
              </p>
            </div>

            {/* Semester Tag */}
            <div className="relative z-10 flex items-center shrink-0">
              <span className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider backdrop-blur-md bg-white/15 border border-white/25 text-white shadow-xs flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>ภาคเรียนที่ 1 / 2569</span>
              </span>
            </div>
          </div>

          {/* 2. Profile Card Body */}
          <div className="px-5 pb-5 pt-0 space-y-3.5">
            {/* Center Avatar with 3D Aura Halo & Badges */}
            <div className="relative -mt-12 flex flex-col items-center">
              <div
                className={cn(
                  "group relative h-22 w-22 rounded-2xl p-[3px] shadow-2xl transition-all duration-300 hover:scale-105",
                  isAdmin
                    ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600"
                    : "bg-gradient-to-tr from-emerald-400 via-teal-500 to-sky-500"
                )}
              >
                <div className="h-full w-full rounded-[13px] overflow-hidden bg-card flex items-center justify-center relative shadow-inner">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user.name || "Profile"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={cn(
                        "h-full w-full flex items-center justify-center font-black text-2xl text-white shadow-inner",
                        isAdmin
                          ? "bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800"
                          : "bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-800"
                      )}
                    >
                      {userInitials}
                    </div>
                  )}

                  {/* Upload overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white backdrop-blur-xs">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>

                {/* Floating Academic Badge (Top-Right) */}
                <div
                  className={cn(
                    "absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full shadow-md border-2 border-card animate-bounce select-none",
                    isAdmin
                      ? "bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-400 text-amber-950"
                      : "bg-gradient-to-tr from-emerald-300 via-teal-200 to-emerald-400 text-emerald-950"
                  )}
                  style={{ animationDuration: "2.5s" }}
                  title={isAdmin ? "อาจารย์ฝ่ายปกครอง" : "ครูประจำชั้น"}
                >
                  <GraduationCap className="h-3 w-3" />
                </div>

                {/* Floating Online Status Indicator (Bottom-Left) */}
                <div
                  className="absolute -bottom-1 -left-1 flex h-4.5 w-4.5 items-center justify-center bg-card rounded-full p-0.5 shadow-md border border-border"
                  title="สถานะ: ออนไลน์ กำลังปฏิบัติหน้าที่"
                >
                  <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </div>

                {/* Floating Camera Button (Bottom-Right) */}
                <button
                  type="button"
                  title="คลิกเพื่ออัปโหลดหรือเปลี่ยนรูปโปรไฟล์ (สูงสุด 8MB)"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-md border-2 border-card flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />

              {/* Success Notification */}
              {showSuccessToast && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in zoom-in-95 duration-200">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>บันทึกรูปโปรไฟล์เรียบร้อยแล้ว</span>
                </div>
              )}

              {/* User Name, Role Pill & Click-to-Copy Email Capsule */}
              <div className="text-center mt-2.5 space-y-1.5 flex flex-col items-center">
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-black text-foreground tracking-tight">
                    {user.name}
                  </h3>
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-400/40 shrink-0" />
                </div>

                {/* Distinctive Centered Role Badge */}
                <div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-black uppercase tracking-wide border shadow-2xs",
                      isAdmin
                        ? "bg-amber-500/15 border-amber-500/35 text-amber-800 dark:text-amber-300"
                        : "bg-emerald-500/15 border-emerald-500/35 text-emerald-800 dark:text-emerald-300"
                    )}
                  >
                    <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                    <span>{isAdmin ? "ADMIN ฝ่ายปกครอง" : "ครูที่ปรึกษา"}</span>
                  </span>
                </div>

                {/* Interactive Click-to-Copy Email Capsule */}
                <div>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    title="คลิกเพื่อคัดลอกอีเมล"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 hover:bg-muted border border-border/70 text-xs font-mono text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs group"
                  >
                    {copiedEmail ? (
                      <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100 shrink-0 transition-opacity" />
                    )}
                    <span>{user.email || "staff@school.ac.th"}</span>
                    <span className="text-[10px] font-sans font-bold text-primary ml-0.5">
                      {copiedEmail ? "คัดลอกแล้ว!" : "คัดลอก"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Staff ID & Duty Badges Micro-Row (ลูกเล่นใหม่!) */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/40 border border-border/60 text-center">
                <span className="text-[9px] font-bold uppercase text-muted-foreground">รหัสบุคลากร</span>
                <span className="text-xs font-black font-mono text-foreground mt-0.5">
                  {isAdmin ? "LC-ADM01" : "LC-TEA08"}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-center">
                <span className="text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  สถานะ
                </span>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                  ปฏิบัติหน้าที่
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-center">
                <span className="text-[9px] font-bold uppercase text-amber-700 dark:text-amber-400">ระดับสิทธิ์</span>
                <span className="text-xs font-black text-amber-800 dark:text-amber-300 mt-0.5 truncate max-w-full">
                  {isAdmin ? "Full Access" : "Classroom"}
                </span>
              </div>
            </div>

            {/* 4. Classroom Responsibilities Card */}
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span>ขอบเขตความรับผิดชอบ</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-bold bg-muted px-2 py-0.5 rounded-md border border-border/60">
                  {isAdmin ? "ควบคุมทั้งโรงเรียน" : `${classroomList.length || 1} ห้องเรียน`}
                </span>
              </div>

              {isAdmin ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-200 shadow-2xs">
                    <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>สิทธิ์ฝ่ายปกครอง: อนุมัติและจัดการได้ทุกห้องเรียน</span>
                  </div>
                  {/* Micro metric pill tags - Perfectly balanced 3-column grid */}
                  <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-[10.5px] font-bold text-muted-foreground w-full">
                    <div className="flex items-center justify-center gap-1.5 bg-card/85 border border-border/70 py-1.5 px-2 rounded-xl shadow-2xs text-center truncate">
                      <span>🏫</span>
                      <span className="truncate">4 ห้องเรียน</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 bg-card/85 border border-border/70 py-1.5 px-2 rounded-xl shadow-2xs text-center truncate">
                      <span>👨‍🎓</span>
                      <span className="truncate">24 นักเรียน</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 bg-card/85 border border-border/70 py-1.5 px-2 rounded-xl shadow-2xs text-center text-emerald-600 dark:text-emerald-400 font-extrabold truncate">
                      <span>⚡</span>
                      <span className="truncate">สิทธิ์เต็ม 100%</span>
                    </div>
                  </div>
                </div>
              ) : classroomList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {classroomList.map((room) => (
                    <span
                      key={room}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/30"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {room}
                    </span>
                  ))}
                  <span className="text-[11px] text-muted-foreground self-center ml-1">
                    (อนุมัติงานแก้แถวได้เอง)
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  ยังไม่ได้กำหนดห้องเรียนประจำ
                </p>
              )}
            </div>

            {/* 5. Quick Actions with 3D Glide on Hover */}
            <div className="space-y-1.5 pt-1 border-t border-border/70">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => router.push("/admin")}
                  className="group relative flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-primary hover:from-indigo-900 hover:to-primary px-3.5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer overflow-hidden"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-sky-400 group-hover:rotate-45 transition-transform duration-300" />
                    <span>ระบบจัดการหลังบ้าน (Backoffice)</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              <Link
                href="/login"
                className="group flex w-full items-center justify-between rounded-xl border border-border/80 bg-card hover:bg-muted/60 px-3.5 py-2 text-xs font-bold text-foreground transition-all shadow-2xs"
              >
                <span className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>สลับบัญชีใช้งาน (Switch Account)</span>
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <button
                type="button"
                disabled={isSigningOut}
                onClick={handleSignOut}
                className="group flex w-full items-center justify-between rounded-xl border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 transition-all cursor-pointer shadow-2xs"
              >
                <span className="flex items-center gap-2">
                  {isSigningOut ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  )}
                  <span>{isSigningOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ (Sign Out)"}</span>
                </span>
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
