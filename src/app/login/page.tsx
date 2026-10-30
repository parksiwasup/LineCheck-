"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  GraduationCap,
  ArrowRight,
  School,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  Eye,
  EyeOff,
  Crown,
  Zap,
  Check,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginWithCredentialsAction, getQuickLoginUsersAction, type QuickLoginUser } from "@/actions/auth-actions";
import { cn } from "@/lib/utils";

function getInitials(name: string, role: string): string {
  if (!name) return role === "ADMIN" ? "ปก" : "คร";
  const cleaned = name
    .replace(/^(นาย|นาง|นางสาว|ครู|อ\.ดร\.|ดร\.|อ\.)\s*/, "")
    .replace(/\(.*?\)/g, "")
    .trim();
  return cleaned.slice(0, 2) || (role === "ADMIN" ? "ปก" : "คร");
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("password123");
  const [showPassword, setShowPassword] = React.useState(false);
  const [copiedPass, setCopiedPass] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [quickUsers, setQuickUsers] = React.useState<QuickLoginUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [roleFilter, setRoleFilter] = React.useState<"ALL" | "ADMIN" | "TEACHER">("ALL");
  const [selectedQuickEmail, setSelectedQuickEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    getQuickLoginUsersAction()
      .then((users) => {
        if (active && users && users.length > 0) {
          setQuickUsers(users);
        }
      })
      .catch((err) => {
        console.error("Failed to load quick login users:", err);
      })
      .finally(() => {
        if (active) setIsLoadingUsers(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const fallbackUsers: QuickLoginUser[] = [
    {
      id: "admin",
      name: "นายศิวัทรัพย์ โคตจักร์",
      email: "admin@school.ac.th",
      role: "ADMIN",
      classrooms: null,
    },
    {
      id: "teacher1",
      name: "ครูนิภาพร พิมภู (ดูแล ม.4/1, ม.4/2)",
      email: "teacher1@school.ac.th",
      role: "TEACHER",
      classrooms: "ม.4/1, ม.4/2",
    },
    {
      id: "teacher2",
      name: "ครูวิภาดา ที่ปรึกษา (ดูแล ม.5/1, ม.6/1)",
      email: "teacher2@school.ac.th",
      role: "TEACHER",
      classrooms: "ม.5/1, ม.6/1",
    },
    {
      id: "teacher",
      name: "ครูสมศรี ที่ปรึกษา (ดูแล ม.4/1)",
      email: "teacher@school.ac.th",
      role: "TEACHER",
      classrooms: "ม.4/1",
    },
  ];

  const displayedUsers = quickUsers.length > 0 ? quickUsers : fallbackUsers;
  const adminCount = displayedUsers.filter((u) => u.role === "ADMIN").length;
  const teacherCount = displayedUsers.filter((u) => u.role === "TEACHER").length;

  const filteredUsers = displayedUsers.filter((u) => {
    if (roleFilter === "ADMIN") return u.role === "ADMIN";
    if (roleFilter === "TEACHER") return u.role === "TEACHER";
    return true;
  });

  const handleCopyPassword = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setPassword("password123");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("password123");
    }
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2200);
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setErrorMsg("กรุณากรอกอีเมล");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await loginWithCredentialsAction({
          email,
          password,
          redirectTo: callbackUrl,
        });

        if (!res.success) {
          setErrorMsg(res.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        } else {
          router.push(callbackUrl);
          router.refresh();
        }
      } catch {
        router.push(callbackUrl);
        router.refresh();
      }
    });
  };

  const handleQuickLogin = (targetEmail: string) => {
    setEmail(targetEmail);
    setPassword("password123");
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const res = await loginWithCredentialsAction({
          email: targetEmail,
          password: "password123",
          redirectTo: callbackUrl,
        });

        if (!res.success) {
          setErrorMsg(res.message || "เข้าสู่ระบบไม่สำเร็จ");
        } else {
          router.push(callbackUrl);
          router.refresh();
        }
      } catch {
        router.push(callbackUrl);
        router.refresh();
      }
    });
  };

  return (
    <div className="relative w-full max-w-md my-auto space-y-6">
      {/* ============================================================
          VIBRANT AURORA BACKGROUND ORBS & AMBIENT GLOW
          ============================================================ */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* 1. Top-Left: Indigo/Blue Aura */}
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-gradient-to-tr from-blue-600/35 via-indigo-500/25 to-sky-400/20 blur-3xl animate-pulse" />

        {/* 2. Top-Right: Emerald/Teal Aura */}
        <div className="absolute top-1/12 -right-20 w-[24rem] h-[24rem] rounded-full bg-gradient-to-bl from-emerald-500/30 via-teal-400/25 to-transparent blur-3xl" />

        {/* 3. Bottom-Left: Amber/Orange Aura */}
        <div className="absolute bottom-1/12 -left-20 w-[22rem] h-[22rem] rounded-full bg-gradient-to-tr from-amber-500/25 via-orange-400/20 to-transparent blur-3xl" />

        {/* 4. Bottom-Right: Violet/Rose Aura */}
        <div className="absolute -bottom-24 right-1/12 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tl from-purple-600/30 via-pink-500/25 to-blue-500/20 blur-3xl animate-pulse" />

        {/* 5. Center Subtle Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] rounded-full bg-primary/10 blur-3xl" />

        {/* 6. Subtle Geometric Dot-Matrix Grid */}
        <div
          className="absolute inset-0 opacity-[0.045] dark:opacity-[0.08]"
          style={{
            backgroundImage: `radial-gradient(currentColor 1.5px, transparent 1.5px)`,
            backgroundSize: "26px 26px",
          }}
        />
      </div>

      {/* ============================================================
          HEADER BRANDING WITH 3D GLOW BADGE
          ============================================================ */}
      <div className="text-center space-y-2.5">
        <div className="relative inline-flex items-center justify-center group">
          {/* Pulsing gradient halo behind logo */}
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-blue-500 via-emerald-400 to-indigo-600 opacity-60 blur-md group-hover:opacity-100 transition-all duration-500" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary via-indigo-600 to-emerald-500 text-white shadow-xl ring-2 ring-white/40 dark:ring-white/20 transition-transform duration-300 group-hover:scale-105">
            <School className="h-9 w-9 drop-shadow" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            LineCheck<span className="bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 bg-clip-text text-transparent">+</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            ระบบเช็คชื่อเข้าแถวหน้าเสาธงและกิจกรรมแก้แถวสถานศึกษา
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Multi-Platform Attendance & Remedial System</span>
        </div>
      </div>

      {/* ============================================================
          LOGIN CARD (PREMIUM GLASSMORPHISM)
          ============================================================ */}
      <Card className="relative overflow-hidden border border-white/60 dark:border-white/10 bg-card/85 dark:bg-card/70 backdrop-blur-2xl shadow-2xl shadow-primary/10 rounded-3xl ring-1 ring-primary/15 transition-all">
        {/* Top glossy reflection line */}
        <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none" />

        <CardHeader className="space-y-1.5 pb-4">
          <CardTitle className="text-lg font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span>เข้าสู่ระบบสำหรับครูและบุคลากร</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r from-primary/15 via-indigo-500/15 to-emerald-500/15 text-primary border border-primary/25 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>STAFF ONLY</span>
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบ
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">
                อีเมล (Email)
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="teacher1@school.ac.th"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-10.5 rounded-xl text-sm bg-background/70 border-border/70 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold">
                  รหัสผ่าน (Password)
                </Label>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer shadow-2xs",
                    copiedPass
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 scale-105"
                      : "bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted border-border/80"
                  )}
                  title="คลิกเพื่อกรอกรหัสผ่านอัตโนมัติ"
                >
                  {copiedPass ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span>กรอกรหัสแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-2.5 w-2.5 text-primary" />
                      <span>เติมรหัสอัตโนมัติ</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-10.5 rounded-xl text-sm bg-background/70 border-border/70 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md cursor-pointer"
                  title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center justify-between pt-0.5">
                <span className="flex items-center gap-1">
                  <span>(รหัสผ่านเริ่มต้นสำหรับทดสอบทุกบัญชี:</span>
                  <code className="bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.2 rounded-md font-mono font-bold text-[10px]">
                    password123
                  </code>
                  <span>)</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="text-primary hover:underline text-[10px] font-semibold cursor-pointer"
                >
                  {copiedPass ? "✓ คัดลอกแล้ว" : "คัดลอก"}
                </button>
              </p>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="relative overflow-hidden w-full h-11.5 rounded-2xl font-black text-sm tracking-wide shadow-xl shadow-primary/25 bg-gradient-to-r from-primary via-indigo-600 to-emerald-600 hover:from-primary/95 hover:via-indigo-500 hover:to-emerald-500 text-white transition-all cursor-pointer mt-1 group active:scale-[0.99]"
            >
              {/* Light Sweep Animation */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 pointer-events-none" />

              {isPending && !selectedQuickEmail ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังเข้าสู่ระบบ...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4 fill-white/80" />
                  <span>เข้าสู่ระบบ (Sign In)</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          {/* Quick Demo Accounts with Segmented Category Filter & 3D Cards */}
          <div className="pt-3.5 border-t border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>คลิกเลือกบัญชีทดสอบด่วน (1-Click Login):</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                {displayedUsers.length} บัญชี
              </span>
            </div>

            {/* Interactive Category Segmented Tabs (ลูกเล่นสลับดูสิทธิ์) */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-xl border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setRoleFilter("ALL")}
                className={cn(
                  "py-1 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center truncate",
                  roleFilter === "ALL"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                ทั้งหมด ({displayedUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("ADMIN")}
                className={cn(
                  "py-1 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center truncate flex items-center justify-center gap-1",
                  roleFilter === "ADMIN"
                    ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 shadow-xs border border-amber-500/35 font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                <span>ฝ่ายปกครอง ({adminCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("TEACHER")}
                className={cn(
                  "py-1 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center truncate flex items-center justify-center gap-1",
                  roleFilter === "TEACHER"
                    ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 shadow-xs border border-emerald-500/35 font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <GraduationCap className="h-3 w-3 text-emerald-500 shrink-0" />
                <span>ครูที่ปรึกษา ({teacherCount})</span>
              </button>
            </div>

            {/* User Cards List with 3D Holographic Styling */}
            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-0.5">
              {filteredUsers.map((u, idx) => {
                const isAdmin = u.role === "ADMIN";
                const isSelected = email.toLowerCase() === u.email.toLowerCase();
                const isCurrentLoggingIn = isPending && selectedQuickEmail === u.email;
                const initials = getInitials(u.name, u.role);

                return (
                  <button
                    key={u.id || u.email}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickLogin(u.email)}
                    className={cn(
                      "relative w-full flex items-center justify-between p-2.5 rounded-2xl border text-left transition-all cursor-pointer group overflow-hidden",
                      isCurrentLoggingIn
                        ? "border-primary ring-2 ring-primary/30 bg-primary/10 shadow-md animate-pulse"
                        : isSelected
                        ? "border-primary/80 ring-1 ring-primary/30 bg-primary/10 shadow-sm"
                        : isAdmin
                        ? "border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-purple-500/5 to-primary/10 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/15 hover:translate-x-1"
                        : "border-border/80 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-sky-500/10 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/15 hover:translate-x-1"
                    )}
                  >
                    {/* Active gloss sheen */}
                    <div className="absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Avatar with 3D Multi-Layer Halo */}
                      <div className="relative shrink-0">
                        <div
                          className={cn(
                            "p-[2px] rounded-2xl shadow-xs transition-transform duration-200 group-hover:scale-105",
                            isAdmin
                              ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600"
                              : idx % 2 === 0
                              ? "bg-gradient-to-tr from-emerald-400 via-teal-500 to-sky-500"
                              : "bg-gradient-to-tr from-sky-400 via-indigo-500 to-purple-500"
                          )}
                        >
                          <div className="h-10 w-10 rounded-[14px] overflow-hidden bg-background flex items-center justify-center relative">
                            {u.image ? (
                              <img
                                src={u.image}
                                alt={u.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span
                                className={cn(
                                  "h-full w-full flex items-center justify-center text-xs font-black text-white",
                                  isAdmin
                                    ? "bg-gradient-to-br from-amber-600 via-orange-600 to-purple-700"
                                    : idx % 2 === 0
                                    ? "bg-gradient-to-br from-emerald-600 to-teal-700"
                                    : "bg-gradient-to-br from-sky-600 to-indigo-700"
                                )}
                              >
                                {initials}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Floating Micro Badge */}
                        {isAdmin ? (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-500 text-amber-950 shadow-xs border border-white dark:border-slate-900">
                            <Crown className="h-2.5 w-2.5 fill-amber-950" />
                          </span>
                        ) : (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-300 via-teal-400 to-emerald-500 text-emerald-950 shadow-xs border border-white dark:border-slate-900">
                            <GraduationCap className="h-2.5 w-2.5 fill-emerald-950" />
                          </span>
                        )}
                      </div>

                      {/* Info & Subtitle */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            className={cn(
                              "text-xs font-black transition-colors truncate",
                              isAdmin
                                ? "text-amber-950 dark:text-amber-100 group-hover:text-amber-600 dark:group-hover:text-amber-400"
                                : "text-emerald-950 dark:text-emerald-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                            )}
                          >
                            {u.name}
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[9px] font-black uppercase tracking-wider border shadow-2xs",
                              isAdmin
                                ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40"
                                : "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40"
                            )}
                          >
                            {isAdmin ? "👑 ADMIN ฝ่ายปกครอง" : "🎓 ครูที่ปรึกษา"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                          {isAdmin ? (
                            <span>⚡ สิทธิ์สูงสุด • จัดการระบบและอนุมัติทุกห้องเรียน</span>
                          ) : u.classrooms ? (
                            <span>📋 ดูแลห้อง {u.classrooms} • บันทึกเช็คชื่อและแก้แถว</span>
                          ) : (
                            <span>📋 ครูที่ปรึกษา • บันทึกเช็คชื่อและอนุมัติแก้แถว</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right Action: Pill Button / Arrow with Hover Glow */}
                    <div className="shrink-0 ml-2">
                      {isCurrentLoggingIn ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary text-white text-[10px] font-bold shadow-xs">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="hidden sm:inline">กำลังเข้า...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              "hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2",
                              isAdmin
                                ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                            )}
                          >
                            <span>เข้าใช้งาน</span>
                          </span>
                          <div
                            className={cn(
                              "h-7 w-7 rounded-xl flex items-center justify-center transition-all shadow-2xs",
                              isAdmin
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 group-hover:bg-amber-500 group-hover:text-white group-hover:translate-x-0.5"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:translate-x-0.5"
                            )}
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================
          STUDENT PORTAL LINK WITH COLORFUL CARD
          ============================================================ */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-500/30 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-teal-500/10 backdrop-blur-xl p-4.5 text-center space-y-2 shadow-lg hover:shadow-xl hover:border-sky-500/50 transition-all group">
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium">
          <span>🎒</span>
          <span>สำหรับนักเรียนและผู้ปกครองที่ต้องการเช็คสถิติการเข้าแถว</span>
        </div>
        <div>
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-sky-500/20 transition-all group-hover:scale-102 cursor-pointer"
          >
            <GraduationCap className="h-4 w-4" />
            <span>เข้าสู่ระบบเช็คผลด้วยเลขประจำตัว 5 หลัก (Student Portal)</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
