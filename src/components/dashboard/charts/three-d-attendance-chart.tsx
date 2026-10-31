"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  UserX,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
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
import type { WeeklyTrendItem } from "@/actions/dashboard";

interface ThreeDAttendanceChartProps {
  data: WeeklyTrendItem[];
  totalStudents?: number;
}

export function ThreeDAttendanceChart({ data, totalStudents: totalStudentsProp }: ThreeDAttendanceChartProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [selectedDay, setSelectedDay] = React.useState<WeeklyTrendItem | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [replayKey, setReplayKey] = React.useState<number>(0);
  const [isAnimating, setIsAnimating] = React.useState<boolean>(false);

  // SVG Dimension & Coordinate setup: compact height to eliminate vertical empty dead space
  const svgWidth = 760;
  const svgHeight = 265;
  const groundY = 225;
  const maxBarHeight = 165;

  const effectiveTotal = Math.max(
    totalStudentsProp || 0,
    ...data.map((d) => (d.present || 0) + (d.absent || 0) + (d.late || 0) + (d.leave || 0)),
    24
  );

  const leftPad = 58;
  const rightPad = 68; // Increased padding to avoid Y-axis label collision
  const usableWidth = svgWidth - leftPad - rightPad;
  const n = data.length;

  // Horizontal position of each pillar:
  // When n >= 5: distribute evenly across usable width
  // When n < 5: keep a natural, comfortable step and CENTER the group
  // This eliminates the giant empty whitespace on the right while keeping bars sequential!
  const getXCenter = React.useCallback(
    (i: number) => {
      if (n >= 5) {
        const slotWidth = usableWidth / n;
        return leftPad + (i + 0.5) * slotWidth;
      }
      const naturalStep = n <= 1 ? 0 : n === 2 ? 140 : n === 3 ? 120 : 105;
      const groupWidth = (n - 1) * naturalStep;
      const groupStartX = leftPad + (usableWidth - groupWidth) / 2;
      return groupStartX + i * naturalStep;
    },
    [n, leftPad, usableWidth]
  );

  // 3D Isometric Offsets & Dimensions
  const barWidth = 36;
  const dx = 12; // 3D depth to the right
  const dy = -8; // 3D depth upwards

  // Calculate points for the 3D Trend Line
  const linePoints = data.map((item, i) => {
    const xCenter = getXCenter(i);
    const rate = Math.min(Math.max(item.attendanceRate, 0), 100);
    const yCenter = groundY - (rate / 100) * maxBarHeight + dy / 2;
    return {
      x: xCenter + dx / 2,
      y: yCenter,
      rate,
      item,
    };
  });

  // SVG Smooth Bezier Path for Line
  const createSmoothLinePath = (pts: { x: number; y: number }[]) => {
    if (pts.length <= 1) return "";
    if (pts.length === 2) {
      return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    }
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const linePathD = createSmoothLinePath(linePoints);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success(`คัดลอกรหัสประจำตัว ${id} แล้ว`);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleTriggerReplay = () => {
    setIsAnimating(true);
    setReplayKey((k) => k + 1);
    setTimeout(() => setIsAnimating(false), 900);
  };

  return (
    <div className="relative w-full overflow-hidden select-none">
      {/* Control Bar: Replay & Interactive Guidance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2 px-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium min-w-0">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0 animate-pulse" />
          <span className="truncate sm:whitespace-normal">คลิกที่เสาหรือจุด 3D เพื่อเปิดดูรายชื่อคนขาดของวันนั้น</span>
        </div>
        <button
          type="button"
          onClick={handleTriggerReplay}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap self-start sm:self-auto"
          title="เล่นแอนิเมชันเสา 3D ดันตัวขึ้นใหม่"
        >
          <RotateCcw className={`h-3 w-3 shrink-0 ${isAnimating ? "animate-spin text-primary" : ""}`} />
          <span>เล่นแอนิเมชัน 3D</span>
        </button>
      </div>

      <svg
        key={replayKey}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto drop-shadow-sm transition-all"
      >
        <defs>
          {/* Filters for 3D Lighting & Shadows */}
          <filter id="threed-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
          <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#6366f1" floodOpacity="0.6" />
          </filter>
          <filter id="orb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#818cf8" floodOpacity="0.8" />
          </filter>
          <filter id="column-glow" x="-40%" y="-20%" width="180%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#22c55e" floodOpacity="0.65" />
          </filter>

          {/* Gradients for 3D Faces: Present (Vibrant Modern Apple / Spring Green) */}
          <linearGradient id="present-front" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="35%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id="present-side" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <linearGradient id="present-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>

          {/* Gradients for 3D Faces: Absent (Rose) */}
          <linearGradient id="absent-front" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="35%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
          <linearGradient id="absent-side" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#be123c" />
            <stop offset="100%" stopColor="#881337" />
          </linearGradient>
          <linearGradient id="absent-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fecdd3" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>

          {/* 3D Sphere Highlight */}
          <radialGradient id="sphere-glow" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#a5b4fc" />
            <stop offset="70%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4338ca" />
          </radialGradient>
        </defs>

        {/* 3D Isometric Background Grid Lines & Floor */}
        <g opacity="0.45">
          {/* Axis Unit Labels */}
          <text
            x={leftPad - 14}
            y={groundY - maxBarHeight - 10}
            textAnchor="end"
            className="fill-muted-foreground font-bold text-[9px]"
          >
            (คน)
          </text>
          <text
            x={svgWidth - rightPad + 22}
            y={groundY - maxBarHeight - 10}
            textAnchor="start"
            className="fill-indigo-600 dark:fill-indigo-400 font-bold text-[9px]"
          >
            (%)
          </text>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const val = Math.round(ratio * effectiveTotal);
            const y = groundY - ratio * maxBarHeight;
            const pct = Math.round(ratio * 100);
            return (
              <g key={ratio}>
                <line
                  x1={leftPad - 15}
                  y1={y}
                  x2={svgWidth - rightPad + 15}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                {/* Left Y-axis count: clearly labeled as คน (Students) */}
                <text
                  x={leftPad - 14}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] font-semibold"
                >
                  {val} คน
                </text>
                {/* Right Y-axis percentage */}
                <text
                  x={svgWidth - rightPad + 22}
                  y={y + 4}
                  textAnchor="start"
                  className="fill-muted-foreground text-[10px] font-bold"
                >
                  {pct}%
                </text>
              </g>
            );
          })}
        </g>

        {/* 3D Ground Shadow & Hover Light Aura Under Each Pillar */}
        {data.map((_, i) => {
          const cx = getXCenter(i);
          const isHovered = hoveredIndex === i;
          return (
            <g key={`shadow-group-${i}`}>
              <ellipse
                cx={cx + dx / 2}
                cy={groundY + 3}
                rx={isHovered ? barWidth * 0.9 : barWidth * 0.75}
                ry={isHovered ? 8 : 6}
                fill={isHovered ? "rgba(99, 102, 241, 0.45)" : "rgba(0, 0, 0, 0.28)"}
                filter="url(#threed-blur)"
                className="transition-all duration-200"
              />
              {isHovered && (
                <ellipse
                  cx={cx + dx / 2}
                  cy={groundY + 2}
                  rx={barWidth * 0.95}
                  ry={7}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  opacity="0.8"
                />
              )}
            </g>
          );
        })}

        {/* 3D Stacked Columns */}
        {data.map((item, i) => {
          const x = getXCenter(i) - barWidth / 2;
          const isHovered = hoveredIndex === i;

          // Segment calculations from bottom to top
          let currentY = groundY;

          const segments: {
            id: string;
            count: number;
            frontFill: string;
            sideFill: string;
            topFill: string;
            yBottom: number;
            yTop: number;
            height: number;
          }[] = [];

          // 1. มา (Present)
          if (item.present > 0) {
            const h = (item.present / effectiveTotal) * maxBarHeight;
            const yTop = currentY - h;
            segments.push({
              id: "present",
              count: item.present,
              frontFill: "url(#present-front)",
              sideFill: "url(#present-side)",
              topFill: "url(#present-top)",
              yBottom: currentY,
              yTop,
              height: h,
            });
            currentY = yTop;
          }

          // 2. ขาด (Absent)
          if (item.absent > 0) {
            const h = (item.absent / effectiveTotal) * maxBarHeight;
            const yTop = currentY - h;
            segments.push({
              id: "absent",
              count: item.absent,
              frontFill: "url(#absent-front)",
              sideFill: "url(#absent-side)",
              topFill: "url(#absent-top)",
              yBottom: currentY,
              yTop,
              height: h,
            });
            currentY = yTop;
          }

          const topSegment = segments[segments.length - 1];

          return (
            <motion.g
              key={`bar-${i}`}
              initial={{ scaleY: 0, opacity: 0.4 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{
                duration: 0.55,
                delay: i * 0.08,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              style={{
                transformOrigin: `${x + barWidth / 2}px ${groundY}px`,
              }}
            >
              <g
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setSelectedDay(item)}
                style={{
                  transform: isHovered ? "translateY(-6px)" : "none",
                  transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                {/* Stacked 3D Segments */}
                {segments.map((seg) => {
                  const { frontFill, sideFill, yBottom, yTop } = seg;

                  return (
                    <g key={seg.id}>
                      {/* Front Face of Segment */}
                      <polygon
                        points={`${x},${yTop} ${x + barWidth},${yTop} ${x + barWidth},${yBottom} ${x},${yBottom}`}
                        fill={frontFill}
                        stroke={isHovered ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}
                        strokeWidth={isHovered ? "1" : "0.5"}
                      />

                      {/* Right Side 3D Depth Face */}
                      <polygon
                        points={`${x + barWidth},${yTop} ${x + barWidth + dx},${yTop + dy} ${x + barWidth + dx},${yBottom + dy} ${x + barWidth},${yBottom}`}
                        fill={sideFill}
                        stroke="rgba(0,0,0,0.15)"
                        strokeWidth="0.5"
                      />
                    </g>
                  );
                })}

                {/* Top Cap Face for the highest segment in the pillar */}
                {topSegment && (
                  <polygon
                    points={`${x},${topSegment.yTop} ${x + dx},${topSegment.yTop + dy} ${x + barWidth + dx},${topSegment.yTop + dy} ${x + barWidth},${topSegment.yTop}`}
                    fill={topSegment.topFill}
                    stroke={isHovered ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)"}
                    strokeWidth={isHovered ? "1.5" : "0.75"}
                  />
                )}

                {/* X-axis Date Label & Click Indicator */}
                <text
                  x={x + barWidth / 2 + dx / 2}
                  y={groundY + 22}
                  textAnchor="middle"
                  className={`text-[11px] transition-all ${
                    isHovered
                      ? "fill-primary font-extrabold text-[12px]"
                      : "fill-muted-foreground font-medium"
                  }`}
                >
                  {item.dateLabel}
                </text>

                {isHovered && (
                  <text
                    x={x + barWidth / 2 + dx / 2}
                    y={groundY + 35}
                    textAnchor="middle"
                    className="fill-indigo-600 dark:fill-indigo-400 text-[9px] font-bold"
                  >
                    คลิกดูชื่อ
                  </text>
                )}
              </g>
            </motion.g>
          );
        })}

        {/* 3D Glowing Neon Trend Wire */}
        <motion.path
          d={linePathD}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.25"
          filter="url(#neon-glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <motion.path
          d={linePathD}
          fill="none"
          stroke="#6366f1"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#neon-glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <motion.path
          d={linePathD}
          fill="none"
          stroke="#e0e7ff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* 3D Floating Glowing Spheres at each data point */}
        {linePoints.map((pt, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <motion.g
              key={`point-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.3 }}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => setSelectedDay(pt.item)}
            >
              {/* Drop Shadow of sphere */}
              <circle
                cx={pt.x}
                cy={pt.y + 2}
                r={isHovered ? 8 : 5}
                fill="rgba(0,0,0,0.35)"
              />
              {/* 3D Sphere Body */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 9 : 6}
                fill="url(#sphere-glow)"
                filter="url(#orb-glow)"
                stroke="#ffffff"
                strokeWidth={isHovered ? 2.5 : 1.5}
                className="transition-all duration-200"
              />
              {/* Specular White Dot */}
              <circle
                cx={pt.x - (isHovered ? 2.5 : 2)}
                cy={pt.y - (isHovered ? 2.5 : 2)}
                r={isHovered ? 2.5 : 1.5}
                fill="#ffffff"
              />
            </motion.g>
          );
        })}
      </svg>

      {/* Floating 3D Glass Tooltip */}
      <AnimatePresence>
        {hoveredIndex !== null && data[hoveredIndex] && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              left: `${Math.min(
                Math.max(
                  (getXCenter(hoveredIndex) / svgWidth) * 100,
                  20
                ),
                80
              )}%`,
              top: "16px",
            }}
            className="pointer-events-none absolute -translate-x-1/2 z-20 rounded-2xl border border-white/20 bg-card/95 px-4 py-3 shadow-xl backdrop-blur-md min-w-[210px]"
          >
            {/* Tooltip Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5 mb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>วันที่ {data[hoveredIndex].dateLabel}</span>
              </span>
              <span className="rounded-lg bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                เข้าแถว {data[hoveredIndex].attendanceRate}%
              </span>
            </div>

            {/* Attendance breakdown */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-2">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" />
                <span>มา:</span>
                <span className="font-bold">{data[hoveredIndex].present} คน</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500 shadow-xs" />
                <span>ขาด:</span>
                <span className="font-bold">{data[hoveredIndex].absent} คน</span>
              </div>
            </div>

            {/* Comparison vs Previous Day */}
            {hoveredIndex > 0 && (
              <div className="border-t border-border/50 pt-1.5 text-[10px] flex items-center justify-between font-medium">
                <span className="text-muted-foreground">เทียบกับวันก่อนหน้า:</span>
                {(() => {
                  const prevRate = data[hoveredIndex - 1].attendanceRate;
                  const diff = Math.round((data[hoveredIndex].attendanceRate - prevRate) * 10) / 10;
                  if (diff > 0) {
                    return (
                      <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" /> +{diff}%
                      </span>
                    );
                  }
                  if (diff < 0) {
                    return (
                      <span className="text-rose-600 font-bold flex items-center gap-0.5">
                        <TrendingDown className="h-3 w-3" /> {diff}%
                      </span>
                    );
                  }
                  return <span className="text-muted-foreground font-semibold">เท่าเดิม</span>;
                })()}
              </div>
            )}

            {/* Hint to click */}
            <div className="mt-1.5 rounded-md bg-primary/5 border border-primary/10 px-2 py-0.5 text-[10px] text-primary/80 font-semibold text-center">
              👆 คลิกเพื่อดูรายชื่อนักเรียน
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Legend Bar */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-6 border-t border-border/50 pt-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-3 w-5 rounded-sm bg-gradient-to-r from-green-400 via-green-500 to-green-600 shadow-2xs border border-green-300" />
          <span className="font-medium">มาเข้าแถว (คน)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-5 rounded-sm bg-gradient-to-r from-rose-400 to-rose-600 shadow-2xs border border-rose-300" />
          <span className="font-medium">ขาดแถว (คน)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center h-3 w-5">
            <span className="h-1 w-full bg-indigo-500 rounded-full" />
            <span className="absolute h-2.5 w-2.5 rounded-full bg-indigo-400 ring-2 ring-white shadow-xs" />
          </span>
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            อัตราเข้าแถว (%)
          </span>
        </div>
      </div>

      {/* Drill-down Modal on Pillar Click */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-md sm:max-w-lg">
          {selectedDay && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base sm:text-lg">
                      สรุปการเข้าแถววันที่ {selectedDay.dateLabel}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      รหัสวัน {selectedDay.dateIso} • นักเรียนทั้งหมด {effectiveTotal} คน
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Quick Stats Pill */}
              <div className="grid grid-cols-3 gap-2.5 rounded-2xl border border-border/80 bg-muted/30 p-3 text-center">
                <div className="space-y-0.5">
                  <p className="text-[11px] text-muted-foreground font-medium">อัตราเข้าแถว</p>
                  <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                    {selectedDay.attendanceRate}%
                  </p>
                </div>
                <div className="space-y-0.5 border-x border-border/60">
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">มาแถว</p>
                  <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                    {selectedDay.present} คน
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">ขาดแถว</p>
                  <p className="text-lg font-extrabold text-rose-600 dark:text-rose-400">
                    {selectedDay.absent} คน
                  </p>
                </div>
              </div>

              {/* Absent Students List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <UserX className="h-4 w-4 text-rose-500" />
                    <span>รายชื่อนักเรียนที่ขาดแถว ({selectedDay.absent} คน)</span>
                  </h4>
                  {selectedDay.absent > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      คลิกปุ่มสีฟ้าเพื่อคัดลอกรหัส
                    </span>
                  )}
                </div>

                {selectedDay.absentStudents && selectedDay.absentStudents.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40 rounded-xl border border-border/70 p-2 bg-card">
                    {selectedDay.absentStudents.map((s, idx) => (
                      <div
                        key={s.studentId + idx}
                        className="flex items-center justify-between pt-1.5 first:pt-0"
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
                        <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                          {s.classroom}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : selectedDay.absent === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-1.5">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      ยอดเยี่ยมมาก! วันนี้มาเข้าแถวครบ 100%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ไม่มีนักเรียนขาดแถวแม้แต่คนเดียว
                    </p>
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-muted-foreground rounded-xl border border-border/60">
                    มีผู้ขาดแถว {selectedDay.absent} คน (บันทึกภาพรวม)
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedDay(null)}
                  className="rounded-xl text-xs h-9 cursor-pointer"
                >
                  ปิดหน้าต่าง
                </Button>
                <Button
                  asChild
                  className="rounded-xl text-xs h-9 font-semibold gap-1.5 shadow-sm"
                >
                  <Link href={`/attendance/check?date=${selectedDay.dateIso}`}>
                    <span>เปิดใบเช็คชื่อประจำวันนี้</span>
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
