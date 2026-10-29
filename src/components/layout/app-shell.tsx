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
    root.classList.remove("theme-ocean", "theme-emerald", "theme-violet", "theme-rose", "theme-amber", "theme-teal");
    root.classList.add(`theme-${colorTheme}`);
    localStorage.setItem("linecheck-color-theme", colorTheme);
  }, [colorTheme, mounted]);

  React.useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
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
        {/* Top Utility Header */}
        <header className="sticky top-0 z-30 h-16 w-full border-b border-border/80 bg-card/85 backdrop-blur-md px-3 sm:px-6 lg:px-8 xl:px-10 flex items-center justify-between gap-2 sm:gap-3">
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

      {/* Mobile Bottom Navigation Bar (< md) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-40 flex lg:hidden border-t border-border/80 bg-card/95 backdrop-blur-lg px-2 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] justify-around shadow-lg"
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-all",
            pathname === "/dashboard" ? "bg-primary/15 text-primary" : "text-muted-foreground"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>แดชบอร์ด</span>
        </Link>
        <Link
          href="/attendance/check"
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-all",
            pathname.startsWith("/attendance/check") ? "bg-primary/15 text-primary" : "text-muted-foreground"
          )}
        >
          <ClipboardCheck className="h-4 w-4" />
          <span>เช็คชื่อ</span>
        </Link>
        <Link
          href="/attendance/remedial"
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-all",
            pathname.startsWith("/attendance/remedial") ? "bg-primary/15 text-primary" : "text-muted-foreground"
          )}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>แก้แถว</span>
        </Link>
        <Link
          href="/grades"
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-all",
            pathname.startsWith("/grades") ? "bg-primary/15 text-primary" : "text-muted-foreground"
          )}
        >
          <Award className="h-4 w-4" />
          <span>ตัดเกรด</span>
        </Link>
        <Link
          href="/portal"
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-all",
            pathname.startsWith("/portal") ? "bg-primary/15 text-primary" : "text-muted-foreground"
          )}
        >
          <GraduationCap className="h-4 w-4" />
          <span>เช็คผล</span>
        </Link>
      </nav>
    </div>
  );
}
