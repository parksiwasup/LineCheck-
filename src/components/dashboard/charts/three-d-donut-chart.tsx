"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ComplianceItem {
  name: string;
  value: number;
  color: string;
}

interface ThreeDDonutChartProps {
  data: ComplianceItem[];
  totalStudents: number;
}

export function ThreeDDonutChart({ data, totalStudents }: ThreeDDonutChartProps) {
  const [hoveredSlice, setHoveredSlice] = React.useState<string | null>(null);

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

  // Angles in degrees:
  // Let compliant slice start from top-right and sweep counter-clockwise or clockwise
  // In standard donut, compliant is ~71% = ~255 degrees, deficit is ~29% = ~105 degrees.
  // Let start at angle -10 deg and sweep 255 deg for compliant, then 105 deg for deficit.
  // For front-facing 3D cylinder wall: angles between 0° (right) and 180° (left) in bottom half of ellipse.

  // Arc path generator on an ellipse (rx, ry)
  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radiusX * Math.cos(angleInRadians),
      y: centerY + radiusY * Math.sin(angleInRadians),
    };
  };

  return (
    <div className="relative flex flex-col items-center justify-between w-full select-none">
      {/* 3D Canvas */}
      <div className="relative w-full flex items-center justify-center">
        <svg
          viewBox="0 0 340 240"
          className="w-full max-w-[320px] h-auto drop-shadow-md"
          style={{ overflow: "visible" }}
        >
          <defs>
            {/* Soft Shadow on Floor */}
            <filter id="donut-shadow-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
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

            {/* Inner Cylinder Shadow (Ambient Occlusion) */}
            <linearGradient id="inner-wall-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(15, 23, 42, 0.75)" />
              <stop offset="100%" stopColor="rgba(15, 23, 42, 0.2)" />
            </linearGradient>

            {/* Central Plaque Radial 3D Sphere */}
            <radialGradient id="center-disc" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#f8fafc" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.9" />
            </radialGradient>
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

          {/* 2. 3D Outer Cylinder Extrusion Wall (The 3D Thickness Side) */}
          {/* Deficit Wall (Front Right/Bottom Arc) */}
          <g
            className="cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredSlice("deficit")}
            onMouseLeave={() => setHoveredSlice(null)}
            style={{
              transform: hoveredSlice === "deficit" ? "translateY(-6px) scale(1.02)" : "none",
              transformOrigin: `${cx}px ${cy}px`,
            }}
          >
            {/* Curved ribbon wall for Deficit slice (Angle approx 80° to 175°) */}
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

          {/* Compliant Wall (Front Left/Bottom Arc) */}
          <g
            className="cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredSlice("compliant")}
            onMouseLeave={() => setHoveredSlice(null)}
            style={{
              transform: hoveredSlice === "compliant" ? "translateY(-6px) scale(1.02)" : "none",
              transformOrigin: `${cx}px ${cy}px`,
            }}
          >
            {/* Curved ribbon wall for Compliant slice (Angle approx 180° to 280°) */}
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

          {/* 3. Inner Hole Cylinder Wall (Ambient Shadow inside hole) */}
          <ellipse
            cx={cx}
            cy={cy + depth * 0.4}
            rx={rxInner}
            ry={ryInner}
            fill="url(#inner-wall-shadow)"
          />

          {/* 4. Top Surface Slices (The Tilted Elliptical Ring) */}
          {/* Compliant Slice (71% Green) */}
          <g
            className="cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredSlice("compliant")}
            onMouseLeave={() => setHoveredSlice(null)}
            style={{
              transform: hoveredSlice === "compliant" ? "translateY(-6px) scale(1.02)" : "none",
              transformOrigin: `${cx}px ${cy}px`,
            }}
          >
            {/* Sliced Top Donut Arc for Compliant: 255 degrees */}
            <path
              d={`
                M ${cx + rxOuter * 0.96},${cy - ryOuter * 0.28}
                A ${rxOuter} ${ryOuter} 0 1 0 ${cx + rxOuter * 0.22},${cy + ryOuter * 0.97}
                L ${cx + rxInner * 0.22},${cy + ryInner * 0.97}
                A ${rxInner} ${ryInner} 0 1 1 ${cx + rxInner * 0.96},${cy - ryInner * 0.28}
                Z
              `}
              fill="url(#top-emerald)"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="1"
            />
          </g>

          {/* Deficit Slice (29% Red/Rose) */}
          <g
            className="cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredSlice("deficit")}
            onMouseLeave={() => setHoveredSlice(null)}
            style={{
              transform: hoveredSlice === "deficit" ? "translateY(-6px) scale(1.02)" : "none",
              transformOrigin: `${cx}px ${cy}px`,
            }}
          >
            {/* Sliced Top Donut Arc for Deficit: 105 degrees */}
            <path
              d={`
                M ${cx + rxOuter * 0.25},${cy + ryOuter * 0.96}
                A ${rxOuter} ${ryOuter} 0 0 0 ${cx + rxOuter * 0.95},${cy - ryOuter * 0.3}
                L ${cx + rxInner * 0.95},${cy - ryInner * 0.3}
                A ${rxInner} ${ryInner} 0 0 1 ${cx + rxInner * 0.25},${cy + ryInner * 0.96}
                Z
              `}
              fill="url(#top-rose)"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="1"
            />
          </g>

          {/* 5. Central 3D Floating Plaque with Metric */}
          <g className="cursor-default pointer-events-none">
            {/* Outer ring */}
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
            {/* 3D Metric Typography */}
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
        </svg>

        {/* 3D Floating Interactive Tooltip Card */}
        <AnimatePresence>
          {hoveredSlice && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute top-2 right-2 z-20 rounded-xl border border-white/20 bg-card/95 px-3 py-2 shadow-lg backdrop-blur-md text-xs"
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
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Breakdown Legend Cards */}
      <div className="w-full space-y-2.5 border-t border-border/60 pt-3 mt-1">
        <div
          onMouseEnter={() => setHoveredSlice("compliant")}
          onMouseLeave={() => setHoveredSlice(null)}
          className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
            hoveredSlice === "compliant"
              ? "bg-emerald-500/15 border-emerald-500/50 shadow-xs font-semibold"
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
          className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
            hoveredSlice === "deficit"
              ? "bg-rose-500/15 border-rose-500/50 shadow-xs font-semibold"
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
    </div>
  );
}