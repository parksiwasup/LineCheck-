"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  RotateCw,
  Users,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ThreeDDonutStudent {
  id: string;
  studentId: string;
  fullName: string;
  classroom: string;
  effectiveRate: number;
  deficitDays: number;
  isCompliant: boolean;
}

interface ComplianceItem {
  name: string;
  value: number;
  color: string;
}

interface ThreeDDonutChartProps {
  data: ComplianceItem[];
  totalStudents: number;
  students?: ThreeDDonutStudent[];
}

export function ThreeDDonutChart({ data, totalStudents, students = [] }: ThreeDDonutChartProps) {
  const [hoveredSlice, setHoveredSlice] = React.useState<"compliant" | "deficit" | null>(null);
  const [selectedSliceModal, setSelectedSliceModal] = React.useState<"compliant" | "deficit" | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [isRotated, setIsRotated] = React.useState<boolean>(false);
  const [spinDegree, setSpinDegree] = React.useState<number>(0);

  // SVG Geometry for Extruded 3D Donut
  const cx = 170;
  const cy = 110;
  const rxOuter = 95;
  const ryOuter = 56; // Tilted isometric ratio ~0.59
  const rxInner = 56;
  const ryInner = 33;
  const depth = 28; // 3D Extrusion Height

  // Total sum
  const sum = data.reduce((acc, curr) => acc + curr.value, 0) || totalStudents || 1;
  const compliantItem = data.find((d) => d.name.includes("ผ่าน")) || data[0];
  const deficitItem = data.find((d) => d.name.includes("ต้องแก้")) || data[1];

  const compliantVal = compliantItem?.value || 0;
  const deficitVal = deficitItem?.value || 0;

  const compliantPct = Math.round((compliantVal / sum) * 100);
  const deficitPct = Math.round((deficitVal / sum) * 100);

  // Filter students based on status
  const deficitStudents = React.useMemo(
    () => students.filter((s) => !s.isCompliant || s.deficitDays > 0),
    [students]
  );
  const compliantStudents = React.useMemo(
    () => students.filter((s) => s.isCompliant && s.deficitDays === 0),
    [students]
  );

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success(`คัดลอกรหัสประจำตัว ${id} แล้ว`);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleToggleSpin = () => {
    setSpinDegree((d) => d + 180);
    setIsRotated((r) => !r);
  };

  return (
    <div className="relative flex flex-col items-center justify-between w-full select-none">
      {/* Top Controls: 3D Spin Button & Instruction */}
      <div className="w-full flex items-center justify-between px-1 mb-2">
        <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
          <span>คลิกชิ้นโดนัทเพื่อดูรายชื่อ</span>
        </span>
        <button
          type="button"
          onClick={handleToggleSpin}
          className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted/70 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
          title="หมุนสลับมุมมอง 3D 180 องศา"
        >
          <RotateCw className="h-3 w-3" />
          <span>หมุน 3D</span>
        </button>
      </div>

      {/* 3D Canvas */}
      <div className="relative w-full flex items-center justify-center">
        <svg
          viewBox="0 0 340 240"
          className="w-full max-w-[320px] h-auto drop-shadow-md transition-transform duration-700 ease-out"
          style={{
            overflow: "visible",
            transform: `rotate(${spinDegree}deg)`,
          }}
        >
          <defs>
            {/* Soft Shadow on Floor */}
            <filter id="donut-shadow-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>
            <filter id="slice-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#f43f5e" floodOpacity="0.45" />
            </filter>
            <filter id="slice-glow-green" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#10b981" floodOpacity="0.45" />
            </filter>

            {/* Depth Gradients for 3D Front Wall */}
            {/* Green (Compliant) */}
            <linearGradient id="wall-emerald" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>
            <linearGradient id="top-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Rose (Deficit) */}
            <linearGradient id="wall-rose" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#be123c" />
              <stop offset="50%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#9f1239" />
            </linearGradient>
            <linearGradient id="top-rose" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="60%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>

            {/* Inner Cylinder Shadow */}
            <linearGradient id="inner-wall-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(15, 23, 42, 0.75)" />
              <stop offset="100%" stopColor="rgba(15, 23, 42, 0.2)" />
            </linearGradient>
          </defs>

          {/* 1. Ground Drop Shadow under 3D Donut */}
          <ellipse
            cx={cx}
            cy={cy + depth + 14}
            rx={rxOuter + 14}
            ry={ryOuter * 0.75}
            fill="rgba(0, 0, 0, 0.32)"
            filter="url(#donut-shadow-blur)"
          />

          {/* 2. 3D Outer Cylinder Extrusion Wall: Deficit (Rose) */}
          <g
            className="cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredSlice("deficit")}
            onMouseLeave={() => setHoveredSlice(null)}
            onClick={() => setSelectedSliceModal("deficit")}
            style={{
              // 3D Explode Effect: translates outward to bottom-right
              transform:
                hoveredSlice === "deficit"
                  ? "translate(14px, 10px) scale(1.05)"
                  : "none",
              transformOrigin: `${cx}px ${cy}px`,
              transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <path
              d={`
                M ${cx + rxOuter * 0.2},${cy + ryOuter * 0.98}
                A ${rxOuter} ${ryOuter} 0 0 1 ${cx + rxOuter * 0.96},${cy + ryOuter * 0.28}
                l 0,${depth}
                A ${rxOuter} ${ryOuter} 0 0 0 ${cx + rxOuter * 0.2},${cy + ryOuter * 0.98 + depth}
                Z
              `}
              fill="url(#wall-rose)"
              stroke="rgba(0,0,0,0.15)"
              strokeWidth="0.5"
            />
          </g>

          {/* 3. 3D Outer Cylinder Extrusion Wall: Compliant (Emerald) */}
          <g
            className="cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredSlice("compliant")}
            onMouseLeave={() => setHoveredSlice(null)}
            onClick={() => setSelectedSliceModal("compliant")}
            style={{
              // 3D Explode Effect: translates outward to top-left
              transform:
                hoveredSlice === "compliant"
                  ? "translate(-12px, -8px) scale(1.03)"
                  : "none",
              transformOrigin: `${cx}px ${cy}px`,
              transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <path
              d={`
                M ${cx - rxOuter * 0.98},${cy + ryOuter * 0.18}
                A ${rxOuter} ${ryOuter} 0 0 0 ${cx + rxOuter * 0.12},${cy + ryOuter * 0.99}
                l 0,${depth}
                A ${rxOuter} ${ryOuter} 0 0 1 ${cx - rxOuter * 0.98},${cy + ryOuter * 0.18 + depth}
                Z
              `}
              fill="url(#wall-emerald)"
              stroke="rgba(0,0,0,0.15)"
              strokeWidth="0.5"
            />
          </g>

          {/* 4. Inner Hole Cylinder Wall (Ambient Shadow inside hole) */}
          <ellipse
            cx={cx}
            cy={cy + depth * 0.4}
            rx={rxInner}
            ry={ryInner}
            fill="url(#inner-wall-shadow)"
          />

          {/* 5. Top Surface Slices: Compliant (71% Green) */}
          <g
            className="cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredSlice("compliant")}
            onMouseLeave={() => setHoveredSlice(null)}
            onClick={() => setSelectedSliceModal("compliant")}
            style={{
              transform:
                hoveredSlice === "compliant"
                  ? "translate(-12px, -8px) scale(1.03)"
                  : "none",
              transformOrigin: `${cx}px ${cy}px`,
              transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <path
              d={`
                M ${cx + rxOuter * 0.96},${cy - ryOuter * 0.28}
                A ${rxOuter} ${ryOuter} 0 1 0 ${cx + rxOuter * 0.22},${cy + ryOuter * 0.97}
                L ${cx + rxInner * 0.22},${cy + ryInner * 0.97}
                A ${rxInner} ${ryInner} 0 1 1 ${cx + rxInner * 0.96},${cy - ryInner * 0.28}
                Z
              `}
              fill="url(#top-emerald)"
              stroke={hoveredSlice === "compliant" ? "#ffffff" : "rgba(255, 255, 255, 0.4)"}
              strokeWidth={hoveredSlice === "compliant" ? "1.5" : "1"}
            />
          </g>

          {/* 6. Top Surface Slices: Deficit (29% Red/Rose) */}
          <g
            className="cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredSlice("deficit")}
            onMouseLeave={() => setHoveredSlice(null)}
            onClick={() => setSelectedSliceModal("deficit")}
            style={{
              transform:
                hoveredSlice === "deficit"
                  ? "translate(14px, 10px) scale(1.05)"
                  : "none",
              transformOrigin: `${cx}px ${cy}px`,
              transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <path
              d={`
                M ${cx + rxOuter * 0.25},${cy + ryOuter * 0.96}
                A ${rxOuter} ${ryOuter} 0 0 0 ${cx + rxOuter * 0.95},${cy - ryOuter * 0.3}
                L ${cx + rxInner * 0.95},${cy - ryInner * 0.3}
                A ${rxInner} ${ryInner} 0 0 1 ${cx + rxInner * 0.25},${cy + ryInner * 0.96}
                Z
              `}
              fill="url(#top-rose)"
              stroke={hoveredSlice === "deficit" ? "#ffffff" : "rgba(255, 255, 255, 0.4)"}
              strokeWidth={hoveredSlice === "deficit" ? "1.5" : "1"}
            />
          </g>

          {/* 7. Central 3D Floating Plaque with Metric */}
          <g className="cursor-default pointer-events-none">
            <ellipse
              cx={cx}
              cy={cy + 3}
              rx={rxInner * 0.72}
              ry={ryInner * 0.72}
              fill="rgba(0,0,0,0.18)"
              filter="url(#donut-shadow-blur)"
            />
            <ellipse
              cx={cx}
              cy={cy}
              rx={rxInner * 0.7}
              ry={ryInner * 0.7}
              className="fill-card stroke-border/80"
              strokeWidth="2"
            />
            {/* 3D Metric Typography: Counter-rotate text so it stays upright if SVG spins */}
            <g style={{ transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${-spinDegree}deg)` }}>
              <text
                x={cx}
                y={cy + 1}
                textAnchor="middle"
                className="text-base font-extrabold fill-foreground tracking-tight"
                style={{ fontWeight: 800 }}
              >
                {compliantPct}%
              </text>
              <text
                x={cx}
                y={cy + 13}
                textAnchor="middle"
                className="text-[9px] font-bold fill-emerald-600 dark:text-emerald-400"
              >
                ผ่านเกณฑ์
              </text>
            </g>
          </g>
        </svg>

        {/* 3D Floating Interactive Tooltip Card */}
        <AnimatePresence>
          {hoveredSlice && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute top-2 right-2 z-20 rounded-xl border border-white/20 bg-card/95 px-3 py-2 shadow-lg backdrop-blur-md text-xs min-w-[150px]"
            >
              {hoveredSlice === "compliant" ? (
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" />
                    <span>ผ่านเกณฑ์ (≥ 80%)</span>
                  </div>
                  <p className="mt-1 font-semibold text-foreground">
                    {compliantVal} คน ({compliantPct}%)
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    👆 คลิกดูรายชื่อ {compliantVal} คน
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                    <span className="h-2 w-2 rounded-full bg-rose-500 shadow-xs" />
                    <span>ต้องแก้แถว (&lt; 80%)</span>
                  </div>
                  <p className="mt-1 font-semibold text-foreground">
                    {deficitVal} คน ({deficitPct}%)
                  </p>
                  <p className="text-[10px] text-rose-500 mt-0.5">
                    👆 คลิกดูรายชื่อ {deficitVal} คน
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Breakdown Legend Cards (Clickable to open Drilldown) */}
      <div className="w-full space-y-2 border-t border-border/60 pt-3 mt-1">
        <div
          onMouseEnter={() => setHoveredSlice("compliant")}
          onMouseLeave={() => setHoveredSlice(null)}
          onClick={() => setSelectedSliceModal("compliant")}
          className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
            hoveredSlice === "compliant"
              ? "bg-emerald-500/15 border-emerald-500/50 shadow-xs font-semibold scale-[1.02]"
              : "border-border/60 bg-muted/20 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-xs" />
            <span className="text-xs font-medium">ผ่านเกณฑ์ปกติ (≥ 80%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {compliantVal} คน
            </span>
            <span className="text-muted-foreground">({compliantPct}%)</span>
          </div>
        </div>

        <div
          onMouseEnter={() => setHoveredSlice("deficit")}
          onMouseLeave={() => setHoveredSlice(null)}
          onClick={() => setSelectedSliceModal("deficit")}
          className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
            hoveredSlice === "deficit"
              ? "bg-rose-500/15 border-rose-500/50 shadow-xs font-semibold scale-[1.02]"
              : "border-border/60 bg-muted/20 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-gradient-to-r from-rose-400 to-rose-600 shadow-xs" />
            <span className="text-xs font-medium">ต้องแก้แถว (&lt; 80%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {deficitVal} คน
            </span>
            <span className="text-muted-foreground">({deficitPct}%)</span>
          </div>
        </div>
      </div>

      {/* Drill-down Modal on Donut Slice Click */}
      <Dialog
        open={!!selectedSliceModal}
        onOpenChange={(open) => !open && setSelectedSliceModal(null)}
      >
        <DialogContent className="max-w-md sm:max-w-lg">
          {selectedSliceModal === "deficit" ? (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base sm:text-lg">
                      รายชื่อนักเรียนที่ต้องแก้แถว ({deficitVal} คน)
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      อัตราการเข้าแถวต่ำกว่าเกณฑ์ 80% ต้องเข้าคลินิกแก้แถวหรือส่งจิตอาสา
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Student list */}
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40 rounded-xl border border-rose-500/20 p-2.5 bg-card">
                {deficitStudents.length > 0 ? (
                  deficitStudents.map((s) => (
                    <div
                      key={s.studentId}
                      className="flex items-center justify-between pt-2 first:pt-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {s.studentId}
                        </span>
                        {/* Circular blue copy button */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyId(e, s.studentId)}
                          title="คัดลอกรหัสประจำตัว"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-blue-400/80 bg-blue-50/80 text-blue-600 transition-all hover:border-blue-500 hover:bg-blue-100 hover:scale-110 active:scale-95 shadow-2xs cursor-pointer"
                        >
                          {copiedId === s.studentId ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        <span className="text-xs font-medium text-foreground">
                          {s.fullName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {s.classroom}
                        </Badge>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                          {s.effectiveRate.toFixed(1)}%
                        </span>
                        {s.deficitDays > 0 && (
                          <span className="text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md">
                            ขาด {s.deficitDays} วัน
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    พบนักเรียนที่ต้องแก้แถวตามสถิติ {deficitVal} คน
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedSliceModal(null)}
                  className="rounded-xl text-xs h-9 cursor-pointer"
                >
                  ปิด
                </Button>
                <Button
                  asChild
                  className="rounded-xl text-xs h-9 font-semibold gap-1.5 shadow-sm bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <Link href="/attendance/remedial">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>ไปหน้าจัดการแก้แถว</span>
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base sm:text-lg">
                      รายชื่อนักเรียนที่ผ่านเกณฑ์ ({compliantVal} คน)
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      อัตราการเข้าแถวตั้งแต่ 80% ขึ้นไป รักษาเกณฑ์ได้ดีเยี่ยม
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Compliant student list */}
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40 rounded-xl border border-emerald-500/20 p-2.5 bg-card">
                {compliantStudents.length > 0 ? (
                  compliantStudents.map((s) => (
                    <div
                      key={s.studentId}
                      className="flex items-center justify-between pt-2 first:pt-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {s.studentId}
                        </span>
                        {/* Circular blue copy button */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyId(e, s.studentId)}
                          title="คัดลอกรหัสประจำตัว"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-blue-400/80 bg-blue-50/80 text-blue-600 transition-all hover:border-blue-500 hover:bg-blue-100 hover:scale-110 active:scale-95 shadow-2xs cursor-pointer"
                        >
                          {copiedId === s.studentId ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        <span className="text-xs font-medium text-foreground">
                          {s.fullName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {s.classroom}
                        </Badge>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {s.effectiveRate.toFixed(1)}%
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                          ผ่านเกณฑ์
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    พบนักเรียนผ่านเกณฑ์ตามสถิติ {compliantVal} คน
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedSliceModal(null)}
                  className="rounded-xl text-xs h-9 cursor-pointer"
                >
                  ปิด
                </Button>
                <Button
                  asChild
                  className="rounded-xl text-xs h-9 font-semibold gap-1.5 shadow-sm"
                >
                  <Link href="/attendance/calendar">
                    <span>เปิดปฏิทินรายเดือน</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
