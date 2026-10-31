"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  School,
  Sparkles,
  LayoutDashboard,
  ClipboardCheck,
  ShieldAlert,
  Award,
  GraduationCap,
  Settings,
  ChevronRight,
  Sun,
  Moon,
  Palette,
  Check,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { UserProfilePopover } from "@/components/layout/user-profile-popover";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useAttendanceStore,
  type ColorTheme,
  type BackgroundStyle,
} from "@/store/use-attendance-store";
import type { Role } from "@prisma/client";

interface AppShellProps {
  children: React.ReactNode;
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
}

const COLOR_THEMES: {
  id: ColorTheme;
  name: string;
  swatch: string;
  ring: string;
}[] = [
  { id: "ocean", name: "ฟ้าคราม (Ocean)", swatch: "bg-blue-600", ring: "ring-blue-500/40" },
  { id: "emerald", name: "เขียวมรกต (Emerald)", swatch: "bg-emerald-600", ring: "ring-emerald-500/40" },
  { id: "violet", name: "ม่วงอเมทิสต์ (Violet)", swatch: "bg-violet-600", ring: "ring-violet-500/40" },
  { id: "rose", name: "ชมพูซากุระ (Rose)", swatch: "bg-rose-500", ring: "ring-rose-500/40" },
  { id: "amber", name: "ทองอำพัน (Amber)", swatch: "bg-amber-500", ring: "ring-amber-500/40" },
  { id: "teal", name: "ฟ้าน้ำทะเล (Teal)", swatch: "bg-teal-600", ring: "ring-teal-500/40" },
];

const BACKGROUND_STYLES: {
  id: BackgroundStyle;
  label: string;
  desc: string;
}[] = [
  { id: "gradient", label: "ไล่เฉดสีออร่า", desc: "พื้นหลังเรืองแสงตามโทนสี" },
  { id: "dots", label: "ลายจุดตาราง", desc: "พื้นหลัง Dot Matrix โมเดิร์น" },
  { id: "solid", label: "สีพื้นเรียบ", desc: "พื้นหลังสีล้วนสบายตา" },
];

export function AppShell({ children, session }: AppShellProps) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const { colorTheme, setColorTheme, bgStyle, setBgStyle } = useAttendanceStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const savedColor = localStorage.getItem("linecheck-color-theme") as ColorTheme | null;
    const savedBg = localStorage.getItem("linecheck-bg-style") as BackgroundStyle | null;
    if (savedColor) setColorTheme(savedColor);
    if (savedBg) setBgStyle(savedBg);
  }, [setColorTheme, setBgStyle]);

  React.useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.setAttribute("data-color-theme", colorTheme);
    root.classList.remove("theme-ocean", "theme-emerald", "theme-violet", "theme-rose", "theme-amber", "theme-teal");
    root.classList.add(`theme-${colorTheme}`);
    localStorage.setItem("linecheck-color-theme", colorTheme);
  }, [colorTheme, mounted]);

  React.useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.setAttribute("data-bg-style", bgStyle);
    root.classList.remove("bg-gradient", "bg-dots", "bg-solid");
    root.classList.add(`bg-${bgStyle}`);
    localStorage.setItem("linecheck-bg-style", bgStyle);
  }, [bgStyle, mounted]);

  // Page title / Breadcrumb resolution
  const { pageTitle, mobileTitle } = React.useMemo(() => {
    if (pathname === "/dashboard") {
      return { pageTitle: "แดชบอร์ดภาพรวมสถิติ", mobileTitle: "แดชบอร์ดสถิติ" };
    }
    if (pathname.startsWith("/attendance/check")) {
      return { pageTitle: "เช็คชื่อเข้าแถวประจำวัน", mobileTitle: "เช็คชื่อเข้าแถว" };
    }
    if (pathname.startsWith("/attendance/calendar")) {
      return { pageTitle: "ปฏิทินรายบุคคลและคลินิกแก้แถว", mobileTitle: "ปฏิทินเข้าแถว" };
    }
    if (pathname.startsWith("/attendance/remedial")) {
      return { pageTitle: "ระบบแก้แถว (< 80%)", mobileTitle: "ระบบแก้แถว" };
    }
    if (pathname.startsWith("/grades")) {
      return { pageTitle: "ระบบตัดเกรดกิจกรรมเข้าแถว (ผ./มผ.)", mobileTitle: "ตัดเกรด" };
    }
    if (pathname.startsWith("/portal")) {
      return { pageTitle: "พอร์ทัลนักเรียน (Student Portal)", mobileTitle: "เช็คผลเข้าแถว" };
    }
    if (pathname.startsWith("/admin")) {
      return { pageTitle: "ระบบจัดการหลังบ้าน (Back-Office Admin)", mobileTitle: "จัดการหลังบ้าน" };
    }
    if (pathname.startsWith("/login")) {
      return { pageTitle: "เข้าสู่ระบบ (Sign In)", mobileTitle: "เข้าสู่ระบบ" };
    }
    return { pageTitle: "LineCheck+", mobileTitle: "LineCheck+" };
  }, [pathname]);

  const { theme, setTheme } = useTheme();
  const isLoginPage = pathname?.startsWith("/login");
  const isPortalPage = pathname?.startsWith("/portal");

  // 1. Dedicated Student Portal Layout (Only for students and parents)
  if (isPortalPage) {
    return (
      <div className="min-h-dvh flex flex-col bg-background relative selection:bg-primary/20 selection:text-primary">
        {/* Top Header specifically for Student & Parent Portal */}
        <header className="sticky top-0 z-30 h-16 sm:h-18 w-full border-b border-border/80 bg-card/85 backdrop-blur-md px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-3 shadow-2xs">
          {/* Left: Brand + Student Portal badge */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/portal"
              className="flex items-center gap-2 sm:gap-2.5 hover:opacity-90 transition-opacity min-w-0"
            >
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-sm shrink-0">
                <School className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm sm:text-base font-black tracking-tight text-foreground flex items-center gap-1.5 truncate">
                  <span>LineCheck+</span>
                  <span className="hidden md:inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20 shrink-0">
                    STUDENT PORTAL
                  </span>
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium hidden sm:inline truncate">
                  ระบบเช็คเวลาเข้าแถวและแก้กิจกรรมสำหรับนักเรียนและผู้ปกครอง
                </span>
              </div>
            </Link>
          </div>

          {/* Right: Theme Controls + Staff Link */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Theme Switcher */}
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer shadow-2xs shrink-0"
              title="เปลี่ยนธีม สว่าง/มืด"
            >
              {mounted && theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </button>

            {/* Palette Popover */}
            <Popover>
              <PopoverTrigger
                title="ปรับแต่งชุดสีและสไตล์พื้นหลัง"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer shadow-2xs shrink-0"
              >
                <Palette className="h-4 w-4 text-primary" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-68 p-4 space-y-3 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    โทนสีหลัก (Accent Color)
                  </span>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {COLOR_THEMES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setColorTheme(t.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-xl border p-1.5 text-xs font-medium transition-all cursor-pointer",
                          colorTheme === t.id
                            ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <span className={cn("h-3.5 w-3.5 rounded-full shrink-0", t.swatch)} />
                        <span className="truncate text-[11px]">{t.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <span className="text-xs font-bold text-foreground block">
                    สไตล์พื้นหลัง (Background Style)
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 mt-2">
                    {BACKGROUND_STYLES.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setBgStyle(bg.id)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-xs text-left transition-all cursor-pointer",
                          bgStyle === bg.id
                            ? "border-primary bg-primary/10 font-bold"
                            : "border-border hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <span className="text-xs">{bg.label}</span>
                        {bgStyle === bg.id && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Staff / Teacher Action Link */}
            {session?.user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-primary transition-all shadow-2xs shrink-0 whitespace-nowrap"
              >
                <span>หน้าครูผู้สอน</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted px-2.5 sm:px-3 py-1.5 text-xs font-bold text-foreground transition-all shadow-2xs shrink-0 whitespace-nowrap"
              >
                <span>เข้าสู่ระบบครู</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </header>

        {/* Main Content (Centered, clean full-width without teacher sidebar) */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
          {children}
        </main>

        <footer className="py-4 text-center text-xs text-muted-foreground/80 border-t border-border/40">
          LineCheck+ • ระบบเช็คชื่อหน้าเสาธงและตรวจสอบเวลาเข้าแถวสำหรับนักเรียนและผู้ปกครอง
        </footer>
      </div>
    );
  }

  // 2. Standalone Login Page Layout
  if (isLoginPage) {
    return (
      <div className="min-h-dvh flex flex-col bg-background relative selection:bg-primary/20 selection:text-primary">
        {/* Top Floating Controls (Theme & Palette) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {/* Quick Theme Switcher */}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer shadow-2xs"
            title="เปลี่ยนธีม สว่าง/มืด"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          {/* Palette Popover */}
          <Popover>
            <PopoverTrigger
              title="ปรับแต่งชุดสีและสไตล์พื้นหลัง"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <Palette className="h-4 w-4 text-primary" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-68 p-4 space-y-3 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-foreground block">
                  โทนสีหลัก (Accent Color)
                </span>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {COLOR_THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setColorTheme(t.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-xl border p-1.5 text-xs font-medium transition-all cursor-pointer",
                        colorTheme === t.id
                          ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <span className={cn("h-3.5 w-3.5 rounded-full shrink-0", t.swatch)} />
                      <span className="truncate text-[11px]">{t.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-xs font-bold text-foreground block">
                  สไตล์พื้นหลัง (Background Style)
                </span>
                <div className="grid grid-cols-1 gap-1.5 mt-2">
                  {BACKGROUND_STYLES.map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => setBgStyle(bg.id)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-xs text-left transition-all cursor-pointer",
                        bgStyle === bg.id
                          ? "border-primary bg-primary/10 font-bold"
                          : "border-border hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <span className="text-xs">{bg.label}</span>
                      {bgStyle === bg.id && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Fullscreen centered content */}
        <main className="flex-1 flex flex-col justify-center items-center w-full px-4 py-8">
          {children}
        </main>

        <footer className="py-4 text-center text-xs text-muted-foreground/80 border-t border-border/40">
          LineCheck+ • ระบบเช็คชื่อหน้าเสาธงและบริหารจัดการกิจกรรมแก้แถวสถานศึกษา
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex bg-background">
      {/* 1. Desktop Left Sidebar (Fixed on Desktop) */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 w-64 xl:w-72 z-40">
        <Sidebar session={session} />
      </div>

      {/* 2. Mobile Sidebar Slide-Over Drawer */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 animate-in slide-in-from-left duration-200">
            <Sidebar
              session={session}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-[-44px] h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground shadow-md"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Content Wrapper (Shifted right on Desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 xl:pl-72">
        {/* Top Utility Header - Comfortable 72px height aligned with Sidebar header */}
        <header className="sticky top-0 z-30 h-[72px] w-full border-b border-border/80 bg-card/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 xl:px-10 flex items-center justify-between gap-3">
          {/* Left: Mobile Toggle & Page Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card text-foreground shadow-2xs hover:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium hidden sm:flex">
                <span>หน้าหลัก</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-semibold truncate">{pageTitle}</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
                <span className="sm:hidden">{mobileTitle}</span>
                <span className="hidden sm:inline">{pageTitle}</span>
              </h2>
            </div>
          </div>

          {/* Right: Theme Palettes + User Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Palette Switcher */}
            <Popover>
              <PopoverTrigger
                title="ปรับแต่งชุดสีและสไตล์พื้นหลัง"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer shadow-2xs"
              >
                <Palette className="h-4 w-4 text-primary" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-68 p-4 space-y-3 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    โทนสีหลัก (Accent Color)
                  </span>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {COLOR_THEMES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setColorTheme(t.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-xl border p-1.5 text-xs font-medium transition-all cursor-pointer",
                          colorTheme === t.id
                            ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <span className={cn("h-3.5 w-3.5 rounded-full shrink-0", t.swatch)} />
                        <span className="truncate text-[11px]">{t.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <span className="text-xs font-bold text-foreground block">
                    สไตล์พื้นหลัง (Background Style)
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 mt-2">
                    {BACKGROUND_STYLES.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setBgStyle(bg.id)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-xs text-left transition-all cursor-pointer",
                          bgStyle === bg.id
                            ? "border-primary bg-primary/10 font-bold"
                            : "border-border hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <span className="text-xs">{bg.label}</span>
                        {bgStyle === bg.id && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* User Profile Popover */}
            {session?.user ? (
              <UserProfilePopover user={session.user} />
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
              >
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}
          </div>
        </header>

        {/* Page Content (Full width across the rest of the screen) */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-6 lg:py-8 pb-28 md:pb-12 w-full max-w-full">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-border/60 bg-card/40 py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground">
          LineCheck+ • ระบบเช็คชื่อหน้าเสาธงและบริหารจัดการกิจกรรมแก้แถวสถานศึกษา
        </footer>
      </div>

      {/* Mobile Bottom Navigation Bar (< lg) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-40 flex lg:hidden border-t border-border/80 bg-card/95 backdrop-blur-xl px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] justify-around shadow-xl"
      >
        {[
          { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard, exact: true, activeBg: "bg-blue-600 text-white shadow-md shadow-blue-500/25" },
          { href: "/attendance/check", label: "เช็คชื่อ", icon: ClipboardCheck, exact: false, activeBg: "bg-emerald-600 text-white shadow-md shadow-emerald-500/25" },
          { href: "/attendance/remedial", label: "แก้แถว", icon: ShieldAlert, exact: false, activeBg: "bg-amber-600 text-white shadow-md shadow-amber-500/25" },
          { href: "/grades", label: "ตัดเกรด", icon: Award, exact: false, activeBg: "bg-purple-600 text-white shadow-md shadow-purple-500/25" },
          { href: "/portal", label: "เช็คผล", icon: GraduationCap, exact: false, activeBg: "bg-sky-600 text-white shadow-md shadow-sky-500/25" },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 px-1 text-[10px] font-semibold transition-all duration-200 select-none",
                isActive
                  ? item.activeBg
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <Icon className={cn("h-4 w-4 transition-transform", isActive ? "scale-110" : "")} />
              <span className={cn("truncate leading-none", isActive ? "font-bold" : "font-medium")}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-3 rounded-full bg-white/70" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
