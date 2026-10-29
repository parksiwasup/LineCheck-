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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginWithCredentialsAction } from "@/actions/auth-actions";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("password123");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

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
        // Next.js redirect mechanism throws, meaning login succeeded
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
    <div className="min-h-[88vh] flex flex-col justify-center items-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-emerald-500 shadow-md text-white mb-2">
            <School className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            LineCheck<span className="text-primary">+</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            ระบบเช็คชื่อเข้าแถวหน้าเสาธงและกิจกรรมแก้แถวสถานศึกษา
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/80 shadow-lg backdrop-blur-sm bg-card/90">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-bold">เข้าสู่ระบบสำหรับครูและบุคลากร</CardTitle>
            <CardDescription className="text-xs">
              กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
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
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="teacher1@school.ac.th"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-10 rounded-xl text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">
                  รหัสผ่าน (Password)
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 h-10 rounded-xl text-sm"
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  (รหัสผ่านเริ่มต้นสำหรับทดสอบทุกบัญชี: <code className="bg-muted px-1.5 py-0.5 rounded font-mono">password123</code>)
                </p>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-10 rounded-xl font-semibold shadow-md mt-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  "เข้าสู่ระบบ (Sign In)"
                )}
              </Button>
            </form>

            {/* Quick Demo Accounts */}
            <div className="pt-3 border-t border-border/80 space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                คลิกเลือกบัญชีทดสอบด่วน (1-Click Login):
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleQuickLogin("teacher1@school.ac.th")}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/40 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                        ครูสมชาย (ครูที่ปรึกษา ม.4/1 และ ม.4/2)
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        ดูแล 2 ห้อง • อนุมัติงานแก้แถวห้องตัวเองได้ทันที
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleQuickLogin("teacher@school.ac.th")}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/40 hover:bg-sky-500/10 hover:border-sky-500/40 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-sky-600 transition-colors">
                        ครูสมศรี (ครูที่ปรึกษา ม.4/1)
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        ดูแล 1 ห้อง • อนุมัติงานแก้แถว ม.4/1
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleQuickLogin("admin@school.ac.th")}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        อ.ดร.เกรียงไกร (ADMIN ฝ่ายปกครอง)
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        ดูแลทุกห้อง • อนุมัติได้ทั้งโรงเรียน + จัดการหลังบ้าน
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Portal Link */}
        <div className="rounded-2xl border border-border bg-card p-4 text-center space-y-1.5 shadow-xs">
          <p className="text-xs text-muted-foreground">
            สำหรับนักเรียนและผู้ปกครองที่ต้องการเช็คสถิติการเข้าแถว
          </p>
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <GraduationCap className="h-4 w-4" />
            <span>เข้าสู่ระบบเช็คผลด้วยเลขประจำตัว 5 หลัก (Student Portal)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
