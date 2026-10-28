"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WeeklyTrendItem } from "@/actions/dashboard";

interface ThreeDAttendanceChartProps {
  data: WeeklyTrendItem[];
}

export function ThreeDAttendanceChart({ data }: ThreeDAttendanceChartProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  // SVG Dimension & Coordinate setup
  const svgWidth = 740;
  const svgHeight = 330;
  const groundY = 245;
  const maxBarHeight = 175;
  const totalStudents = 24;

  const leftPad = 48;
  const rightPad = 48;
  const usableWidth = svgWidth - leftPad - rightPad;
  const n = data.length || 7;
  const step = usableWidth / Math.max(n - 1, 1);

  // 3D Isometric Offsets
  const barWidth = 32;
  const dx = 12; // 3D depth to the right
  const dy = -8; // 3D depth upwards

  // Calculate points for the 3D Trend Line
  const linePoints = data.map((item, i) => {
    const xCenter = leftPad + i * step;
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
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
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

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto drop-shadow-sm transition-all"
        style={{ minHeight: "300px" }}
      >
        <defs>
          {/* Filters for 3D Lighting & Shadows */}
          <filter id="threed-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
          <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.5" />
          </filter>
          <filter id="orb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#818cf8" floodOpacity="0.7" />
          </filter>

          {/* Gradients for 3D Faces: Present (Green) */}
          <linearGradient id="present-front" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="35%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="present-side" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
          <linearGradient id="present-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Gradients for 3D Faces: Late (Amber) */}
          <linearGradient id="late-front" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="late-side" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <linearGradient id="late-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          {/* Gradients for 3D Faces: Leave (Sky) */}
          <linearGradient id="leave-front" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="35%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="leave-side" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>
          <linearGradient id="leave-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#0ea5e9" />
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
        <g opacity="0.35">
          {[0, 6, 12, 18, 24].map((val) => {
            const y = groundY - (val / totalStudents) * maxBarHeight;
            const pct = Math.round((val / totalStudents) * 100);
            return (
              <g key={val}>
                <line
                  x1={leftPad - 15}
                  y1={y}
                  x2={svgWidth - rightPad + 15}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                {/* Left Y-axis count */}
                <text
                  x={leftPad - 20}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] font-semibold"
                >
                  {val}
                </text>
                {/* Right Y-axis percentage */}
                <text
                  x={svgWidth - rightPad + 22}
                  y={y + 4}
                  textAnchor="start"
                  className="fill-muted-foreground text-[10px] font-semibold"
                >
                  {pct}%
                </text>
              </g>
            );
          })}
        </g>

        {/* 3D Ground Shadow Under Each Pillar */}
        {data.map((_, i) => {
          const cx = leftPad + i * step;
          return (
            <ellipse
              key={`shadow-${i}`}
              cx={cx + barWidth / 2 + dx / 2}
              cy={groundY + 3}
              rx={barWidth * 0.75}
              ry={6}
              fill="rgba(0, 0, 0, 0.28)"
              filter="url(#threed-blur)"
            />
          );
        })}

        {/* 3D Stacked Columns */}
        {data.map((item, i) => {
          const x = leftPad + i * step - barWidth / 2;
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
            const h = (item.present / totalStudents) * maxBarHeight;
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

          // 2. สาย (Late)
          if (item.late > 0) {
            const h = (item.late / totalStudents) * maxBarHeight;
            const yTop = currentY - h;
            segments.push({
              id: "late",
              count: item.late,
              frontFill: "url(#late-front)",
              sideFill: "url(#late-side)",
              topFill: "url(#late-top)",
              yBottom: currentY,
              yTop,
              height: h,
            });
            currentY = yTop;
          }

          // 3. ลา (Leave)
          if (item.leave > 0) {
            const h = (item.leave / totalStudents) * maxBarHeight;
            const yTop = currentY - h;
            segments.push({
              id: "leave",
              count: item.leave,
              frontFill: "url(#leave-front)",
              sideFill: "url(#leave-side)",
              topFill: "url(#leave-top)",
              yBottom: currentY,
              yTop,
              height: h,
            });
            currentY = yTop;
          }

          // 4. ขาด (Absent)
          if (item.absent > 0) {
            const h = (item.absent / totalStudents) * maxBarHeight;
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
            <g
              key={`bar-${i}`}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                transform: isHovered ? "translateY(-4px)" : "none",
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
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="0.5"
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
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="0.75"
                />
              )}

              {/* X-axis Date Label */}
              <text
                x={x + barWidth / 2 + dx / 2}
                y={groundY + 22}
                textAnchor="middle"
                className={`text-[11px] transition-all ${
                  isHovered
                    ? "fill-primary font-bold text-[12px]"
                    : "fill-muted-foreground font-medium"
                }`}
              >
                {item.dateLabel}
              </text>
            </g>
          );
        })}

        {/* 3D Glowing Neon Trend Wire */}
        <path
          d={linePathD}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.25"
          filter="url(#neon-glow)"
        />
        <path
          d={linePathD}
          fill="none"
          stroke="#6366f1"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#neon-glow)"
        />
        <path
          d={linePathD}
          fill="none"
          stroke="#e0e7ff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* 3D Floating Glowing Spheres at each data point */}
        {linePoints.map((pt, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <g
              key={`point-${i}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Drop Shadow of sphere */}
              <circle
                cx={pt.x}
                cy={pt.y + 2}
                r={isHovered ? 7 : 5}
                fill="rgba(0,0,0,0.35)"
              />
              {/* 3D Sphere Body */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 8 : 6}
                fill="url(#sphere-glow)"
                filter="url(#orb-glow)"
                stroke="#ffffff"
                strokeWidth={isHovered ? 2 : 1.5}
                className="transition-all duration-200"
              />
              {/* Specular White Dot */}
              <circle
                cx={pt.x - (isHovered ? 2.5 : 2)}
                cy={pt.y - (isHovered ? 2.5 : 2)}
                r={isHovered ? 2 : 1.5}
                fill="#ffffff"
              />
            </g>
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
                  ((leftPad + hoveredIndex * step) / svgWidth) * 100,
                  18
                ),
                82
              )}%`,
              top: "12px",
            }}
            className="pointer-events-none absolute -translate-x-1/2 z-20 rounded-2xl border border-white/20 bg-card/90 px-4 py-3 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5 mb-2">
              <span className="text-xs font-bold text-foreground">
                วันที่ {data[hoveredIndex].dateLabel}
              </span>
              <span className="rounded-lg bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                เข้าแถว {data[hoveredIndex].attendanceRate}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" />
                <span>มา:</span>
                <span className="font-bold">{data[hoveredIndex].present} คน</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500 shadow-xs" />
                <span>สาย:</span>
                <span className="font-bold">{data[hoveredIndex].late} คน</span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                <span className="h-2 w-2 rounded-full bg-sky-500 shadow-xs" />
                <span>ลา:</span>
                <span className="font-bold">{data[hoveredIndex].leave} คน</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500 shadow-xs" />
                <span>ขาด:</span>
                <span className="font-bold">{data[hoveredIndex].absent} คน</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Legend Bar */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:gap-6 border-t border-border/50 pt-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-3 w-5 rounded-sm bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-2xs border border-emerald-300" />
          <span className="font-medium">มา (คน)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-5 rounded-sm bg-gradient-to-r from-amber-400 to-amber-600 shadow-2xs border border-amber-300" />
          <span className="font-medium">สาย (คน)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-5 rounded-sm bg-gradient-to-r from-sky-400 to-sky-600 shadow-2xs border border-sky-300" />
          <span className="font-medium">ลา (คน)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-5 rounded-sm bg-gradient-to-r from-rose-400 to-rose-600 shadow-2xs border border-rose-300" />
          <span className="font-medium">ขาด (คน)</span>
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
    </div>
  );
}