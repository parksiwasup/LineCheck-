"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { logoutAction, updateUserProfileImageAction } from "@/actions/auth-actions";
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP) เท่านั้น");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert("ขนาดรูปภาพต้องไม่เกิน 8MB");
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
      alert(message);
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
            "group inline-flex items-center gap-2 rounded-2xl border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs whitespace-nowrap",
            isAdmin
              ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:border-primary/50"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/50"
          )}
        >
          {/* Avatar thumbnail */}
          <div className="relative h-7 w-7 rounded-xl overflow-hidden bg-background border border-border/80 flex items-center justify-center shrink-0 shadow-2xs">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.name || "User Avatar"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[11px] font-bold text-foreground">
                {userInitials}
              </span>
            )}
            <span
              className={cn(
                "absolute bottom-0 right-0 h-2 w-2 rounded-full border border-card",
                isAdmin ? "bg-primary" : "bg-emerald-500"
              )}
            />
          </div>

          <div className="flex flex-col items-start text-left leading-tight">
            <span className="font-bold text-xs max-w-[120px] truncate text-foreground group-hover:text-primary transition-colors">
              {user.name?.split(" ")[0] || (isAdmin ? "ฝ่ายปกครอง" : "ครูที่ปรึกษา")}
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {isAdmin ? "ADMIN" : user.classrooms || "ครูที่ปรึกษา"}
            </span>
          </div>

          <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0 group-hover:opacity-100 transition-opacity" />
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-84 sm:w-88 p-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl bg-card"
        >
          {/* Top Banner with gradient background */}
          <div
            className={cn(
              "relative h-22 w-full p-4 flex items-start justify-between bg-gradient-to-tr",
              isAdmin
                ? "from-slate-900 via-indigo-950 to-primary text-white"
                : "from-emerald-700 via-teal-700 to-cyan-700 text-white"
            )}
          >
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium tracking-wide uppercase opacity-80 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                LineCheck+ Account
              </span>
              <p className="text-sm font-bold">ข้อมูลโปรไฟล์ผู้ใช้งาน</p>
            </div>

            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-xs border",
                isAdmin
                  ? "bg-white/15 text-white border-white/20"
                  : "bg-white/15 text-white border-white/20"
              )}
            >
              {isAdmin ? "ADMIN ฝ่ายปกครอง" : "TEACHER ครูที่ปรึกษา"}
            </span>

            {/* Decorative background circle */}
            <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          </div>

          {/* Profile Card Body */}
          <div className="px-5 pb-5 pt-0 space-y-4">
            {/* Avatar with Camera Upload Button */}
            <div className="relative -mt-11 flex flex-col items-center">
              <div className="group relative h-20 w-20 rounded-2xl p-1 bg-card shadow-lg border border-border/80">
                <div className="h-full w-full rounded-xl overflow-hidden bg-muted flex items-center justify-center relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user.name || "Profile"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-extrabold text-muted-foreground">
                      {userInitials}
                    </span>
                  )}

                  {/* Upload overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Camera Click Button */}
                <button
                  type="button"
                  title="คลิกเพื่ออัปโหลดหรือเปลี่ยนรูปโปรไฟล์"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-primary text-primary-foreground shadow-md border-2 border-card flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
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

              {/* User Name & Email */}
              <div className="text-center mt-2 space-y-0.5">
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  {user.name}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Classroom Responsibilities */}
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span>ห้องเรียนที่รับผิดชอบ</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {isAdmin
                    ? "ทั้งโรงเรียน"
                    : `${classroomList.length || 1} ห้อง`}
                </span>
              </div>

              {isAdmin ? (
                <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2 text-xs font-semibold text-primary">
                  <Shield className="h-4 w-4 shrink-0" />
                  <span>สิทธิ์ฝ่ายปกครอง: จัดการและอนุมัติได้ทุกห้องเรียน</span>
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

            {/* Quick Actions */}
            <div className="space-y-1.5 pt-1 border-t border-border/70">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => router.push("/admin")}
                  className="flex w-full items-center justify-between rounded-xl bg-slate-900 dark:bg-primary px-3.5 py-2.5 text-xs font-semibold text-white dark:text-primary-foreground shadow-sm hover:opacity-95 transition-all cursor-pointer group"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-sky-400 dark:text-current" />
                    <span>ระบบจัดการหลังบ้าน (Backoffice)</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              <Link
                href="/login"
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
              >
                <span className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>สลับบัญชีใช้งาน (Switch Account)</span>
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>

              <button
                type="button"
                disabled={isSigningOut}
                onClick={handleSignOut}
                className="flex w-full items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {isSigningOut ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
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
