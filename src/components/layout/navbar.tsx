"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  ClipboardCheck,
  CalendarDays,
  ShieldAlert,
  Sun,
  Moon,
  Monitor,
  Palette,
  Sparkles,
  Check,
  GraduationCap,
  UserCheck,
  Shield,
  Settings,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Award,
  LogIn,
  LogOut,
  User,
  Users,
} from "lucide-react";
import { logoutAction } from "@/actions/auth-actions";
import { UserProfilePopover } from "@/components/layout/user-profile-popover";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  useAttendanceStore,
  type ColorTheme,
  type BackgroundStyle,
} from "@/store/use-attendance-store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const frontOfficeNavItems = [
  {
    href: "/dashboard",
    label: "แดชบอร์ดสถิติ",
    mobileLabel: "แดชบอร์ด",
    icon: LayoutDashboard,
  },
  {
    href: "/attendance/check",
    label: "เช็คชื่อเข้าแถว",
    mobileLabel: "เช็คชื่อ",
    icon: ClipboardCheck,
  },
  {
    href: "/attendance/calendar",
    label: "ปฏิทินรายบุคคล",
    mobileLabel: "ปฏิทิน",
    icon: CalendarDays,
  },
  {
    href: "/attendance/remedial",
    label: "ระบบแก้แถว",
    mobileLabel: "แก้แถว",
    icon: ShieldAlert,
  },
  {
    href: "/grades",
    label: "ตัดเกรด (ผ./มผ.)",
    mobileLabel: "ตัดเกรด",
    icon: Award,
  },
  {
    href: "/portal",
    label: "นักเรียนเช็คผล",
    mobileLabel: "เช็คผล",
    icon: GraduationCap,
  },
];

const COLOR_THEMES: {
  id: ColorTheme;
  name: string;
  swatch: string;
  ring: string;
}[] = [
  {
    id: "ocean",
    name: "ฟ้าคราม (Ocean)",
    swatch: "bg-blue-600",
    ring: "ring-blue-500/40",
  },
  {
    id: "emerald",
    name: "เขียวมรกต (Emerald)",
    swatch: "bg-emerald-600",
    ring: "ring-emerald-500/40",
  },
  {
    id: "violet",
    name: "ม่วงอเมทิสต์ (Violet)",
    swatch: "bg-violet-600",
    ring: "ring-violet-500/40",
  },
  {
    id: "rose",
    name: "ชมพูซากุระ (Rose)",
    swatch: "bg-rose-500",
    ring: "ring-rose-500/40",
  },
  {
    id: "amber",
    name: "ส้มอำพัน (Amber)",
    swatch: "bg-amber-500",
    ring: "ring-amber-500/40",
  },
  {
    id: "teal",
    name: "ฟ้าน้ำทะเล (Teal)",
    swatch: "bg-teal-600",
    ring: "ring-teal-500/40",
  },
];

const BG_STYLES: {
  id: BackgroundStyle;
  label: string;
  desc: string;
}[] = [
  {
    id: "gradient",
    label: "ไล่เฉดสีออร่า",
    desc: "พื้นหลังเรืองแสงตามโทนสี",
  },
  {
    id: "dots",
    label: "ลายจุดตาราง",
    desc: "พื้นหลัง Dot Matrix โมเดิร์น",
  },
  {
    id: "solid",
    label: "สีพื้นเรียบ",
    desc: "พื้นหลังสีล้วนสบายตา",
  },
];

interface NavbarProps {
  session?: {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: Role;
      classrooms?: string | null;
    };
  } | null;
}

export function Navbar({ session }: NavbarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const isBackoffice = pathname.startsWith("/admin");

  const { theme, resolvedTheme, setTheme } = useTheme();
  const {
    activeRole,
    setActiveRole,
    colorTheme,
    setColorTheme,
    bgStyle,
    setBgStyle,
  } = useAttendanceStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (session?.user?.role) {
      setActiveRole(session.user.role);
    }
  }, [session?.user?.role, setActiveRole]);

  React.useEffect(() => {
    setMounted(true);
    const savedColor = localStorage.getItem(
      "linecheck-color-theme"
    ) as ColorTheme | null;
    const savedBg = localStorage.getItem(
      "linecheck-bg-style"
    ) as BackgroundStyle | null;
    if (savedColor && COLOR_THEMES.some((t) => t.id === savedColor)) {
      setColorTheme(savedColor);
      document.documentElement.setAttribute("data-color-theme", savedColor);
    } else {
      document.documentElement.setAttribute("data-color-theme", "ocean");
    }
    if (savedBg && BG_STYLES.some((b) => b.id === savedBg)) {
      setBgStyle(savedBg);
      document.documentElement.setAttribute("data-bg-style", savedBg);
    } else {
      document.documentElement.setAttribute("data-bg-style", "gradient");
    }
  }, [setColorTheme, setBgStyle]);

  const handleSelectColorTheme = (newColor: ColorTheme) => {
    setColorTheme(newColor);
    localStorage.setItem("linecheck-color-theme", newColor);
    document.documentElement.setAttribute("data-color-theme", newColor);
  };

  const handleSelectBgStyle = (newStyle: BackgroundStyle) => {
    setBgStyle(newStyle);
    localStorage.setItem("linecheck-bg-style", newStyle);
    document.documentElement.setAttribute("data-bg-style", newStyle);
  };

  const activeColorMeta =
    COLOR_THEMES.find((c) => c.id === colorTheme) ?? COLOR_THEMES[0];

  // Shared Theme & Background Controls
  const themeControls = (
    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
      {/* Quick Day / Night Pill Switcher */}
      <div className="inline-flex items-center rounded-xl border border-border bg-muted/60 p-0.5 whitespace-nowrap">
        <button
          type="button"
          onClick={() => setTheme("light")}
          title="โหมดกลางวัน (Day Mode)"
          className={cn(
            "inline-flex items-center justify-center gap-1 rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
            mounted && resolvedTheme === "light"
              ? "bg-card text-amber-600 shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sun className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden 2xl:inline">กลางวัน</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          title="โหมดกลางคืน (Night Mode)"
          className={cn(
            "inline-flex items-center justify-center gap-1 rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
            mounted && resolvedTheme === "dark"
              ? "bg-card text-sky-400 shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Moon className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden 2xl:inline">กลางคืน</span>
        </button>
      </div>

      {/* Color & Background Mode Customizer Popover */}
      <Popover>
        <PopoverTrigger
          title="ตั้งค่าโหมดพื้นหลัง กลางวัน/กลางคืน และโทนสี"
          className="inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 sm:px-3 text-xs font-semibold text-foreground shadow-xs hover:bg-accent transition-colors cursor-pointer whitespace-nowrap"
        >
          <span
            className={cn(
              "h-3.5 w-3.5 rounded-full ring-2 shrink-0",
              activeColorMeta.swatch,
              activeColorMeta.ring
            )}
          />
          <Palette className="h-3.5 w-3.5 text-primary shrink-0 hidden sm:inline" />
          <span className="hidden 2xl:inline">สีพื้นหลัง</span>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-[300px] sm:w-80 p-4 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">โหมดพื้นหลัง & โทนสี</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              บันทึกอัตโนมัติ
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              1. โหมดแสง (กลางวัน / กลางคืน)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium transition-all cursor-pointer",
                  mounted && theme === "light"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border bg-card hover:bg-accent"
                )}
              >
                <Sun className="h-4 w-4 text-amber-500" />
                <span>กลางวัน</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium transition-all cursor-pointer",
                  mounted && theme === "dark"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border bg-card hover:bg-accent"
                )}
              >
                <Moon className="h-4 w-4 text-sky-400" />
                <span>กลางคืน</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium transition-all cursor-pointer",
                  mounted && theme === "system"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border bg-card hover:bg-accent"
                )}
              >
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <span>ตามระบบ</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              2. โทนสีพื้นหลังและปุ่ม (Color Theme)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {COLOR_THEMES.map((item) => {
                const isSelected = colorTheme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectColorTheme(item.id)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-2.5 py-2 text-xs font-medium transition-all cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground font-semibold shadow-2xs"
                        : "border-border bg-card hover:bg-accent"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className={cn(
                          "h-3.5 w-3.5 rounded-full shrink-0",
                          item.swatch
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              3. ลวดลายพื้นหลัง (Background Style)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {BG_STYLES.map((style) => {
                const isSelected = bgStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => handleSelectBgStyle(style.id)}
                    title={style.desc}
                    className={cn(
                      "flex flex-col items-center rounded-xl border p-2 text-center text-xs transition-all cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border bg-card hover:bg-accent"
                    )}
                  >
                    <span>{style.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  // ============================================================================
  // CASE 1: BACKOFFICE HEADER (/admin) - แยกโซนระบบหลังบ้านชัดเจน
  // ============================================================================
  if (isBackoffice) {
    return (
      <header className="sticky top-0 z-40 w-full border-b-2 border-primary/40 bg-slate-900 text-slate-50 shadow-md pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-[1680px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 xl:px-10">
          {/* Left: Backoffice Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
                  LineCheck+ <span className="text-sky-400">BACKOFFICE</span>
                </span>
                <span className="rounded-md bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 whitespace-nowrap">
                  ระบบหลังบ้าน (Admin Zone)
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                ศูนย์ควบคุมข้อมูลนักเรียน ห้องเรียน บุคลากร และประวัติการเช็คชื่อ
              </p>
            </div>
          </div>

          {/* Right: Switch back to Front-Office + Theme Controls */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>กลับสู่ระบบหน้าบ้าน (Front-Office)</span>
            </Link>

            {themeControls}
          </div>
        </div>
      </header>
    );
  }

  // ============================================================================
  // CASE 2: FRONT-OFFICE HEADER (/dashboard, /attendance/check, /attendance/remedial)
  // ============================================================================
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-card/85 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-[1680px] items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 xl:px-10">
          {/* Left: Brand + Front-Office Nav */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0 flex-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 sm:gap-2.5 group shrink-0 min-w-0"
            >
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105 shrink-0">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-sm sm:text-base font-bold tracking-tight text-foreground whitespace-nowrap">
                    LineCheck<span className="text-primary">+</span>
                  </span>
                  <span className="hidden xs:inline-block rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    หน้าบ้าน
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground hidden xl:block whitespace-nowrap">
                  ระบบเช็คชื่อเข้าแถวและแก้กิจกรรม
                </p>
              </div>
            </Link>

            {/* Front-Office Navigation (single-line, responsive: icon -> short label) */}
            <nav className="hidden md:flex items-center gap-0.5 rounded-2xl border border-border/60 bg-muted/40 p-1 min-w-0 overflow-x-auto">
              {frontOfficeNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] font-semibold transition-all whitespace-nowrap shrink-0",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-card hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden lg:inline">{item.mobileLabel}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Zone / Role Switcher + Theme Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {session?.user ? (
              <UserProfilePopover user={session.user} />
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}

            {themeControls}
          </div>
        </div>
      </header>

      {/* Fixed Bottom Navigation Bar for Mobile / Phones (Front-Office) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-40 flex md:hidden border-t border-border/80 bg-card/95 backdrop-blur-lg px-2 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] justify-around shadow-lg"
      >
        {frontOfficeNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-all whitespace-nowrap",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.mobileLabel}</span>
            </Link>
          );
        })}
        <Link
          href="/admin"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400"
        >
          <Settings className="h-4 w-4" />
          <span>หลังบ้าน</span>
        </Link>
      </nav>
    </>
  );
}
