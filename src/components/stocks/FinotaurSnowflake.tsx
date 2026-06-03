/**
 * FinotaurSnowflake — Simply-Wall-St-style radar polygon that summarises a stock's
 * health at a glance across 4 axes: Value, Growth, Profitability, Financial Health.
 *
 * DATA PROVENANCE
 *   All 4 grades come from data.valuation.grades inside /api/fundamentals/all.
 *   They are our own derived analytics computed from SEC EDGAR filings.
 *   No raw FMP / Polygon / Yahoo price values are used or rendered here.
 *
 * Props:
 *   grades   — { valuation, growth, profitability, health } each 0–100 (our own scores)
 *   symbol   — optional ticker label shown in the center
 *   size     — optional SVG width/height (default 200)
 *   showLabels — show axis text labels (default true)
 */

import React from "react";

export type SnowflakeGrades = {
  valuation: number | null;
  growth: number | null;
  profitability: number | null;
  health: number | null;
};

type Props = {
  grades: SnowflakeGrades | null | undefined;
  symbol?: string;
  size?: number;
  showLabels?: boolean;
  className?: string;
};

// Axis order — clockwise from top
const AXES: Array<{ key: keyof SnowflakeGrades; label: string }> = [
  { key: "valuation",    label: "Value" },
  { key: "growth",       label: "Growth" },
  { key: "profitability",label: "Profitability" },
  { key: "health",       label: "Health" },
];

const LEVELS = 4; // concentric grid rings

/** Pick fill/stroke color based on the average score across all axes. */
function overallColor(grades: SnowflakeGrades): { fill: string; stroke: string } {
  const scores = AXES.map((a) => grades[a.key] ?? 0);
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  if (avg >= 70) return { fill: "rgba(16, 185, 129, 0.15)", stroke: "#10b981" }; // emerald
  if (avg >= 45) return { fill: "rgba(234, 179,  8,  0.15)", stroke: "#eab308" }; // amber
  return           { fill: "rgba(239, 68,  68,  0.15)", stroke: "#ef4444" }; // red
}

/** x,y on the unit circle at `angle` radians, scaled to `r`. */
function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export function FinotaurSnowflake({
  grades,
  symbol,
  size = 200,
  showLabels = true,
  className = "",
}: Props) {
  // ── Empty / null state ──────────────────────────────────────────────────────
  if (!grades || AXES.every((a) => grades[a.key] == null)) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-neutral-900/60 border border-neutral-800 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-neutral-500">No grade data</span>
      </div>
    );
  }

  const n = AXES.length;
  const cx = size / 2;
  const cy = size / 2;
  // Reserve space for labels around the outside
  const labelPad = showLabels ? 30 : 8;
  const radius = cx - labelPad;

  // Angles: distribute evenly, starting at top (−π/2)
  const angleOf = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  // ── Grid rings ───────────────────────────────────────────────────────────────
  const gridRings = Array.from({ length: LEVELS }, (_, lvl) => {
    const r = (radius / LEVELS) * (lvl + 1);
    const pts = AXES.map((_, i) => {
      const p = polarToCartesian(cx, cy, r, angleOf(i));
      return `${p.x},${p.y}`;
    }).join(" ");
    return (
      <polygon
        key={lvl}
        points={pts}
        fill="none"
        stroke="#27272a"
        strokeWidth={1}
        opacity={0.7}
      />
    );
  });

  // ── Axis spokes ──────────────────────────────────────────────────────────────
  const spokes = AXES.map((_, i) => {
    const tip = polarToCartesian(cx, cy, radius, angleOf(i));
    return (
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={tip.x}
        y2={tip.y}
        stroke="#27272a"
        strokeWidth={1}
        opacity={0.7}
      />
    );
  });

  // ── Data polygon ─────────────────────────────────────────────────────────────
  const { fill, stroke } = overallColor(grades);
  const dataPoints = AXES.map((axis, i) => {
    const score = Math.max(0, Math.min(100, grades[axis.key] ?? 0));
    return polarToCartesian(cx, cy, (score / 100) * radius, angleOf(i));
  });
  const pathD = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";

  // ── Vertex dots ──────────────────────────────────────────────────────────────
  const dots = dataPoints.map((p, i) => (
    <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={stroke} />
  ));

  // ── Axis labels + score badges ────────────────────────────────────────────────
  const labelRadius = radius + (showLabels ? 18 : 0);
  const labels = showLabels
    ? AXES.map((axis, i) => {
        const score = grades[axis.key] ?? null;
        const pos = polarToCartesian(cx, cy, labelRadius, angleOf(i));
        return (
          <g key={axis.key}>
            <text
              x={pos.x}
              y={pos.y - 5}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fill="#a3a3a3"
              fontFamily="inherit"
            >
              {axis.label}
            </text>
            <text
              x={pos.x}
              y={pos.y + 7}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fontWeight="600"
              fill={score == null ? "#525252" : score >= 70 ? "#10b981" : score >= 45 ? "#eab308" : "#ef4444"}
              fontFamily="inherit"
            >
              {score != null ? score : "—"}
            </text>
          </g>
        );
      })
    : null;

  // ── Center symbol ─────────────────────────────────────────────────────────────
  const centerLabel = symbol ? (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={10}
      fill="#737373"
      fontFamily="inherit"
    >
      {symbol}
    </text>
  ) : null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label={`Finotaur Snowflake for ${symbol ?? "stock"}`}
    >
      {gridRings}
      {spokes}
      <path d={pathD} fill={fill} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      {dots}
      {labels}
      {centerLabel}
    </svg>
  );
}

export default FinotaurSnowflake;
