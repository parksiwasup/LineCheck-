"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  School,
  Mail,
  Lock,
  User,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { registerUserAction } from "@/actions/auth-actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // ตรวจสอบความถูกต้องเบื้องต้น
    if (!name.trim()) {
      setErrorMsg("กรุณาระบุชื่อ - นามสกุล");
      return;
    }
    if (!email.trim()) {
      setErrorMsg("กรุณาระบุอีเมล");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
      return;
    }

    startTransition(async () => {
      const res = await registerUserAction({
        name: name.trim(),
        email: email.trim(),
        password,
        classrooms: null, // กำหนดห้องเรียนภายหลังในระบบหลังบ้าน (Admin Back-Office)
      });

      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        setSuccessMsg(res.message);
        // ดีเลย์ 1.8 วินาที แล้ว redirect ไปหน้า login พร้อมแนบอีเมลไปกรอกให้อัตโนมัติ
        setTimeout(() => {
          router.push(`/login?registered=1&email=${encodeURIComponent(email.trim().toLowerCase())}`);
        }, 1800);
      }
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-8 px-4 relative overflow-hidden select-none">
      {/* Dynamic Background Auras */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-[36rem] h-[36rem] rounded-full bg-gradient-to-br from-emerald-500/25 via-teal-500/20 to-blue-500/15 blur-3xl animate-pulse" />
        <div className="absolute top-1/4 -right-24 w-[38rem] h-[38rem] rounded-full bg-gradient-to-bl from-indigo-500/25 via-primary/20 to-teal-500/15 blur-3xl" />
        <div className="absolute -bottom-24 left-1/12 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-purple-600/20 via-pink-500/15 to-emerald-500/20 blur-3xl" />
      </div>

      <div className="w-full max-w-lg space-y-5">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="relative inline-flex items-center justify-center group">
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-primary opacity-60 blur-md group-hover:opacity-100 transition-all duration-500" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-primary text-white shadow-xl ring-2 ring-white/40 dark:ring-white/20">
              <School className="h-8 w-8 drop-shadow" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              สร้างบัญชีผู้ใช้ใหม่
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              ระบบเช็คชื่อ LineCheck+ สำหรับคุณครูและบุคลากร
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>ลงทะเบียนสิทธิ์ครูประจำชั้น / ครูที่ปรึกษา (TEACHER)</span>
          </div>
        </div>

        {/* Card Form */}
        <Card className="relative overflow-hidden border border-white/60 dark:border-white/10 bg-card/85 dark:bg-card/70 backdrop-blur-2xl shadow-2xl shadow-primary/10 rounded-3xl ring-1 ring-primary/15">
          <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent pointer-events-none" />

          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
                <span>กรอกข้อมูลเพื่อลงทะเบียน</span>
              </span>
              <Link
                href="/login"
                className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>กลับหน้าเข้าสู่ระบบ</span>
              </Link>
            </CardTitle>
            <CardDescription className="text-xs">
              เมื่อลงทะเบียนเรียบร้อย ระบบจะนำท่านไปหน้าเข้าสู่ระบบเพื่อยืนยันรหัสผ่าน
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="flex flex-col gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span>{successMsg}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-600/90 dark:text-emerald-400/90">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>กำลังพาท่านไปยังหน้าเข้าสู่ระบบใน 2 วินาที...</span>
                </div>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* ชื่อ - นามสกุล */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">
                  ชื่อ - นามสกุล <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="เช่น ครูสมชาย ใจดี"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-10 rounded-xl text-sm bg-background/70 border-border/70 focus:bg-background focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                    disabled={isPending || !!successMsg}
                  />
                </div>
              </div>

              {/* อีเมล */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  อีเมล (Email) <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="เช่น somchai@school.ac.th"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 rounded-xl text-sm bg-background/70 border-border/70 focus:bg-background focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                    disabled={isPending || !!successMsg}
                  />
                </div>
              </div>

              {/* รหัสผ่าน และ ยืนยันรหัสผ่าน */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold">
                    รหัสผ่าน <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-9 h-10 rounded-xl text-sm bg-background/70 border-border/70 focus:bg-background focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                      required
                      disabled={isPending || !!successMsg}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                    ยืนยันรหัสผ่าน <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-9 h-10 rounded-xl text-sm bg-background/70 border-border/70 focus:bg-background focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                      required
                      disabled={isPending || !!successMsg}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isPending || !!successMsg}
                className="relative overflow-hidden w-full h-11 rounded-2xl font-black text-sm tracking-wide shadow-xl shadow-emerald-600/20 bg-gradient-to-r from-emerald-600 via-teal-600 to-primary hover:from-emerald-500 hover:via-teal-500 hover:to-primary/95 text-white transition-all cursor-pointer mt-2"
              >
                {isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>กำลังบันทึกข้อมูล...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span>สมัครสมาชิก (Register)</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-2 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/80" />
              </div>
              <span className="relative bg-card px-2.5 text-[11px] font-semibold text-muted-foreground">
                หรือลงทะเบียนด้วย
              </span>
            </div>

            {/* Google Sign-in Button */}
            <GoogleSignInButton
              label="ลงทะเบียนด้วย Google"
              onError={(msg) => setErrorMsg(msg)}
            />

            {/* Back to Login link */}
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                มีบัญชีผู้ใช้งานอยู่แล้ว?{" "}
                <Link
                  href="/login"
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 ml-1"
                >
                  <span>เข้าสู่ระบบที่นี่</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
