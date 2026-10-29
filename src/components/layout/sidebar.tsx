"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  ShieldAlert,
  Award,
  GraduationCap,
  Settings,
  LogOut,
  Sparkles,
  School,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Users,
  Shield,
  Palette,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth-actions";
import { useAttendanceStore, type ColorTheme } from "@/store/use-attendance-store";
import type { Role } from "@prisma/client";

interface SidebarProps {
  session?: {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      classrooms?: string | null;
    };
  } | null;
  onCloseMobile?: () => void;
}

const navItems = [
  {
    href: "/dashboard",
    label: "แดชบอร์ดสถิติ",
    sublabel: "ภาพรวมการเข้าแถวทั้งโรงเรียน",
    icon: LayoutDashboard,
  },
  {
    href: "/attendance/check",
    label: "เช็คชื่อประจำวัน",
    sublabel: "บันทึกเวลาเข้าแถวหน้าเสาธง",
    icon: ClipboardCheck,
  },
  {
    href: "/attendance/remedial",
    label: "ระบบแก้แถว (< 80%)",
    sublabel: "อนุมัติกิจกรรมจิตอาสาชดเชย",
    icon: ShieldAlert,
  },
  {
    href: "/grades",
    label: "ตัดเกรด (ผ./มผ.)",
    sublabel: "สรุปผลส่งฝ่ายทะเบียนวัดผล",
    icon: Award,
  },
  {
    href: "/portal",
    label: "นักเรียนเช็คผล",
    sublabel: "สถิติรายบุคคล (Student Portal)",
    icon: GraduationCap,
  },
];

export function Sidebar({ session, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useAttendanceStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";

  const classroomList = React.useMemo(() => {
    if (!user?.classrooms) return [];
    return user.classrooms
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  }, [user?.classrooms]);

  const userInitials = user?.name ? user.name.slice(0, 2) : isAdmin ? "ผด" : "คร";

  return (
    <aside className="h-full w-full flex flex-col bg-card border-r border-border/80 shadow-xs">
      {/* 1. Brand Logo Header */}
      <div className="p-4 sm:p-5 pb-3 border-b border-border/70">
        <Link
          href="/dashboard"
          onClick={onCloseMobile}
          className="flex items-center gap-3 group"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-emerald-500 text-white shadow-md transition-transform group-hover:scale-105 shrink-0">
            <School className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                LineCheck<span className="text-primary">+</span>
              </span>
              <span className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary uppercase">
                Pro
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              ระบบเช็คชื่อเข้าแถวสถานศึกษา
            </p>
          </div>
        </Link>
      </div>

      {/* 2. User Profile Card (Mini) */}
      {user && (
        <div className="p-3 mx-3 my-3 rounded-2xl border border-border/70 bg-muted/30 flex items-center gap-2.5">
          <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-background border border-border/80 flex items-center justify-center shrink-0 shadow-2xs">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-foreground">
                {userInitials}
              </span>
            )}
            <span
              className={cn(
                "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-card",
                isAdmin ? "bg-primary" : "bg-emerald-500"
              )}
            />
          </div>

          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-xs font-bold text-foreground truncate">
              {user.name}
            </p>
            <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">
              {isAdmin ? "ฝ่ายปกครอง (ADMIN)" : user.classrooms ? `ดูแลห้อง: ${user.classrooms}` : "ครูที่ปรึกษา"}
            </p>
          </div>
        </div>
      )}

      {/* 3. Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
            เมนูการใช้งานหลัก (Main Menu)
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors shrink-0",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:bg-card group-hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="truncate block">{item.label}</span>
                    <span
                      className={cn(
                        "text-[10px] font-normal truncate block",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground/70"
                      )}
                    >
                      {item.sublabel}
                    </span>
                  </div>
                </div>

                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100 shrink-0",
                    isActive && "opacity-80 translate-x-0.5"
                  )}
                />
              </Link>
            );
          })}
        </div>

        {/* Admin Back-Office Section */}
        {isAdmin && (
          <div className="space-y-1 pt-2 border-t border-border/70">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              <span>ระบบหลังบ้าน (Admin Zone)</span>
            </p>

            <Link
              href="/admin"
              onClick={onCloseMobile}
              className={cn(
                "group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20",
                pathname.startsWith("/admin") && "ring-2 ring-amber-500"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <span className="block font-bold">จัดการหลังบ้าน (Back-Office)</span>
                  <span className="block text-[10px] text-muted-foreground">
                    ทะเบียนนักเรียน • สิทธิ์ครู
                  </span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </Link>
          </div>
        )}
      </div>

      {/* 4. Footer Controls & Logout */}
      <div className="p-3 border-t border-border/70 space-y-2 bg-muted/20">
        {/* Quick Theme Switcher */}
        <div className="flex items-center justify-between rounded-xl bg-background border border-border/70 p-1 text-xs">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
              mounted && theme === "light"
                ? "bg-amber-500 text-white shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sun className="h-3.5 w-3.5" />
            <span>สว่าง</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
              mounted && theme === "dark"
                ? "bg-slate-800 text-white shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Moon className="h-3.5 w-3.5" />
            <span>มืด</span>
          </button>
        </div>

        {/* Sign Out Button */}
        {user ? (
          <button
            type="button"
            onClick={async () => {
              await logoutAction();
            }}
            className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <LogOut className="h-3.5 w-3.5" />
              <span>ออกจากระบบ (Sign Out)</span>
            </span>
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
          >
            เข้าสู่ระบบ (Sign In)
          </Link>
        )}
      </div>
    </aside>
  );
}
