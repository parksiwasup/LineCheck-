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
  ShieldCheck,
  Palette,
  CheckCircle2,
  CalendarCheck,
  Zap,
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
    badge: "LIVE",
    badgePulse: true,
    accent: {
      activeGradient: "from-blue-600 via-indigo-600 to-blue-700",
      activeShadow: "shadow-blue-500/25",
      borderActive: "border-blue-400/40",
      iconInactive:
        "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-blue-500/30",
      badgeInactive:
        "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20",
    },
  },
  {
    href: "/attendance/check",
    label: "เช็คชื่อประจำวัน",
    sublabel: "บันทึกเวลาเข้าแถวหน้าเสาธง",
    icon: ClipboardCheck,
    badge: "วันนี้",
    badgePulse: false,
    accent: {
      activeGradient: "from-emerald-600 via-teal-600 to-emerald-700",
      activeShadow: "shadow-emerald-500/25",
      borderActive: "border-emerald-400/40",
      iconInactive:
        "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-emerald-500/30",
      badgeInactive:
        "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20",
    },
  },
  {
    href: "/attendance/remedial",
    label: "ระบบแก้แถว (< 80%)",
    sublabel: "อนุมัติกิจกรรมจิตอาสาชดเชย",
    icon: ShieldAlert,
    badge: "< 80%",
    badgePulse: false,
    accent: {
      activeGradient: "from-amber-600 via-orange-600 to-amber-700",
      activeShadow: "shadow-amber-500/25",
      borderActive: "border-amber-400/40",
      iconInactive:
        "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white group-hover:shadow-amber-500/30",
      badgeInactive:
        "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20",
    },
  },
  {
    href: "/grades",
    label: "ตัดเกรด (ผ./มผ.)",
    sublabel: "สรุปผลส่งฝ่ายทะเบียนวัดผล",
    icon: Award,
    badge: "ผ./มผ.",
    badgePulse: false,
    accent: {
      activeGradient: "from-purple-600 via-violet-600 to-purple-700",
      activeShadow: "shadow-purple-500/25",
      borderActive: "border-purple-400/40",
      iconInactive:
        "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white group-hover:shadow-purple-500/30",
      badgeInactive:
        "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/20",
    },
  },
  {
    href: "/portal",
    label: "นักเรียนเช็คผล",
    sublabel: "สถิติรายบุคคล (Student Portal)",
    icon: GraduationCap,
    badge: "Portal",
    badgePulse: false,
    accent: {
      activeGradient: "from-sky-600 via-blue-600 to-cyan-600",
      activeShadow: "shadow-sky-500/25",
      borderActive: "border-sky-400/40",
      iconInactive:
        "bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 group-hover:bg-sky-600 group-hover:text-white group-hover:shadow-sky-500/30",
      badgeInactive:
        "bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 border-sky-500/20",
    },
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

  return (
    <aside className="h-full w-full flex flex-col bg-card border-r border-border/80 shadow-xs">
      {/* 1. Brand Logo Header - Comfortable 72px height aligned with top Navbar */}
      <div className="h-[72px] px-4 sm:px-5 flex items-center border-b border-border/80 shrink-0">
        <Link
          href="/dashboard"
          onClick={onCloseMobile}
          className="group flex items-center gap-3 w-full select-none"
        >
          {/* 3D Multi-Layer School Icon */}
          <div className="relative shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary via-indigo-600 to-emerald-500 p-[1.5px] shadow-md shadow-primary/25 transition-all duration-300 group-hover:scale-105 group-hover:shadow-primary/40">
              <div className="h-full w-full rounded-[14px] bg-gradient-to-br from-primary via-indigo-700 to-blue-800 flex items-center justify-center text-white">
                <School className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 drop-shadow-xs" />
              </div>
            </div>
            {/* Micro Sparkle Accent on Logo */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-tr from-amber-300 to-yellow-400 text-amber-950 shadow-2xs border border-white dark:border-slate-900">
              <Sparkles className="h-2 w-2 fill-amber-950" />
            </span>
          </div>

          {/* Brand Titles & EDU Tag */}
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-tight text-foreground">
                LineCheck<span className="text-emerald-500 dark:text-emerald-400 font-black drop-shadow-xs">+</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                <GraduationCap className="h-2.5 w-2.5" />
                <span>EDU</span>
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate font-medium flex items-center gap-1.5 mt-1">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="truncate">ระบบเช็คชื่อเข้าแถวสถานศึกษา</span>
            </p>
          </div>
        </Link>
      </div>

      {/* 2. Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div className="space-y-1.5">
          {/* Section Header with glowing dot and counter */}
          <div className="flex items-center justify-between px-3 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                เมนูการใช้งานหลัก (MAIN MENU)
              </p>
            </div>
            <span className="rounded-md bg-muted/60 border border-border/60 px-1.5 py-0.5 text-[9px] font-mono font-bold text-muted-foreground">
              5 โมดูล
            </span>
          </div>

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
                  "relative group flex items-center justify-between rounded-2xl p-2.5 sm:px-3 sm:py-2.5 text-xs font-semibold transition-all duration-200 select-none",
                  isActive
                    ? cn(
                        "bg-gradient-to-r text-white shadow-lg",
                        item.accent.activeGradient,
                        item.accent.activeShadow,
                        "ring-1 ring-white/20 translate-x-0.5"
                      )
                    : "text-muted-foreground border border-transparent hover:border-border/60 hover:bg-muted/45 hover:text-foreground hover:translate-x-1"
                )}
              >
                {/* Active indicator top sheen & left pill */}
                {isActive && (
                  <>
                    <div className="absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full bg-white shadow-xs" />
                  </>
                )}

                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pl-1.5">
                  {/* Icon Container with interactive 3D bounce on hover */}
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 shrink-0 shadow-2xs",
                      isActive
                        ? "bg-white/20 text-white backdrop-blur-md shadow-inner border border-white/20"
                        : cn(
                            item.accent.iconInactive,
                            "group-hover:scale-110 group-hover:rotate-2 group-hover:shadow-md"
                          )
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Labels */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "truncate block text-xs",
                          isActive
                            ? "font-bold text-white tracking-tight"
                            : "font-semibold text-foreground"
                        )}
                      >
                        {item.label}
                      </span>
                      {/* Dynamic Badge */}
                      {item.badge && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[9px] font-bold border transition-colors",
                            isActive
                              ? "bg-white/25 text-white border-white/30 backdrop-blur-xs"
                              : cn(
                                  item.accent.badgeInactive,
                                  "group-hover:border-transparent group-hover:bg-foreground/10"
                                )
                          )}
                        >
                          {item.badgePulse && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span
                                className={cn(
                                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                  isActive ? "bg-white" : "bg-blue-400"
                                )}
                              />
                              <span
                                className={cn(
                                  "relative inline-flex rounded-full h-1.5 w-1.5",
                                  isActive ? "bg-white" : "bg-blue-500"
                                )}
                              />
                            </span>
                          )}
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-normal truncate block mt-0.5",
                        isActive
                          ? "text-white/80"
                          : "text-muted-foreground/75 group-hover:text-muted-foreground"
                      )}
                    >
                      {item.sublabel}
                    </span>
                  </div>
                </div>

                {/* Chevron Right with hover animation */}
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-lg transition-all duration-200 shrink-0 ml-1.5",
                    isActive
                      ? "bg-white/20 text-white"
                      : "opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-foreground"
                  )}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Admin Back-Office Section */}
        {isAdmin && (
          <div className="space-y-1.5 pt-3 border-t border-border/70">
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                <span>ระบบหลังบ้าน (Admin Zone)</span>
              </p>
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                เจ้าหน้าที่
              </span>
            </div>

            <Link
              href="/admin"
              onClick={onCloseMobile}
              className={cn(
                "group relative flex items-center justify-between rounded-2xl p-2.5 text-xs font-semibold transition-all duration-200 border select-none",
                pathname.startsWith("/admin")
                  ? "bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white border-amber-400/40 shadow-lg shadow-amber-500/25 ring-1 ring-white/20 translate-x-0.5"
                  : "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 hover:border-amber-500/40 hover:translate-x-1"
              )}
            >
              {pathname.startsWith("/admin") && (
                <>
                  <div className="absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full bg-white shadow-xs" />
                </>
              )}

              <div className="flex items-center gap-2.5 min-w-0 pl-1.5">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 shrink-0 shadow-2xs",
                    pathname.startsWith("/admin")
                      ? "bg-white/20 text-white backdrop-blur-md shadow-inner border border-white/20"
                      : "bg-amber-500/20 text-amber-700 dark:text-amber-300 group-hover:bg-amber-500 group-hover:text-white group-hover:scale-110 group-hover:rotate-2 group-hover:shadow-md"
                  )}
                >
                  <Settings className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block font-bold text-xs",
                      pathname.startsWith("/admin")
                        ? "text-white"
                        : "text-amber-900 dark:text-amber-100"
                    )}
                  >
                    จัดการหลังบ้าน (Back-Office)
                  </span>
                  <span
                    className={cn(
                      "block text-[10px] truncate",
                      pathname.startsWith("/admin")
                        ? "text-white/80"
                        : "text-muted-foreground"
                    )}
                  >
                    ทะเบียนนักเรียน • สิทธิ์ครู
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-lg transition-all duration-200 shrink-0 ml-1.5",
                  pathname.startsWith("/admin")
                    ? "bg-white/20 text-white"
                    : "opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5"
                )}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
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
