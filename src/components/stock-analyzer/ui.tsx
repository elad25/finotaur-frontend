// src/components/stock-analyzer/ui.tsx
// =====================================================
// 🧩 STOCK ANALYZER — Shared UI Primitives
// =====================================================
// Memoized components for maximum render performance.
// Used across all 8 tabs.
// =====================================================

import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { C } from '@/constants/stock-analyzer.constants';

// =====================================================
// 💀 SKELETON — Loading placeholder
// =====================================================

interface SkeletonProps {
  className?: string;
}

export const Skeleton = memo<SkeletonProps>(({ className }) => (
  <div
    className={cn('animate-pulse rounded-[8px]', className)}
    style={{
      background:
        'linear-gradient(90deg, rgba(255,255,255,0.035), rgba(255,255,255,0.07), rgba(255,255,255,0.035))',
    }}
  />
));
Skeleton.displayName = 'Skeleton';

// =====================================================
// 📦 CARD — Section container
// =====================================================

interface CardProps {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
  gold?: boolean;
}

export const Card = memo<CardProps>(({ children, className, highlight = false, gold = false }) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-[12px] border border-white/[0.075] bg-white/[0.026]',
      'shadow-[0_18px_52px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.045)]',
      'transition-colors duration-200 ease-out hover:border-white/[0.11] hover:bg-white/[0.032]',
      className,
    )}
    style={{
      background: highlight || gold
        ? 'linear-gradient(145deg, rgba(255,255,255,0.044) 0%, rgba(255,255,255,0.024) 58%, rgba(201,166,70,0.018) 100%)'
        : 'linear-gradient(145deg, rgba(255,255,255,0.033) 0%, rgba(255,255,255,0.018) 62%, rgba(0,0,0,0.10) 100%)',
    }}
  >
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      aria-hidden="true"
    />
    {children}
  </div>
));
Card.displayName = 'Card';

// =====================================================
// 📊 METRIC BOX — Compact stat display
// =====================================================

interface MetricBoxProps {
  label: string;
  value: string | number;
  color?: string;
  subtitle?: string;
}

export const MetricBox = memo<MetricBoxProps>(({ label, value, color, subtitle }) => (
  <div
    className="rounded-[8px] border border-white/[0.055] bg-white/[0.022] p-5 shadow-[0_10px_28px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors duration-200 hover:bg-white/[0.032]"
  >
    <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-ink-tertiary">{label}</p>
    <p className={cn('font-mono text-[20px] font-medium tabular-nums text-white', color)}>{value}</p>
    {subtitle && <p className="mt-1 text-[11px] text-ink-muted">{subtitle}</p>}
  </div>
));
MetricBox.displayName = 'MetricBox';

// =====================================================
// 🏷️ SECTION HEADER — Title bar for card sections
// =====================================================

interface SectionHeaderProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  badge?: string;
}

export const SectionHeader = memo<SectionHeaderProps>(({ icon: Icon, title, subtitle, badge }) => (
  <div className="mb-6 flex items-center gap-4">
    {Icon && (
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-gold-border/55 bg-gold-primary/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]"
      >
        <Icon className="h-[18px] w-[18px] text-gold-primary" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h3 className="truncate text-[18px] font-semibold leading-tight text-ink-primary">{title}</h3>
        {badge && (
          <span
            className="shrink-0 rounded-[4px] px-2 py-0.5 text-[10px] font-medium"
            style={{ background: 'rgba(201,166,70,0.07)', color: C.gold, border: '1px solid rgba(201,166,70,0.13)' }}
          >
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-[13px] leading-relaxed text-ink-tertiary">{subtitle}</p>}
    </div>
  </div>
));
SectionHeader.displayName = 'SectionHeader';

// =====================================================
// 📋 FACT ROW — Label / value row
// =====================================================

interface FactRowProps {
  label: string;
  value: string | number;
  color?: string;
}

export const FactRow = memo<FactRowProps>(({ label, value, color }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-white/[0.045] last:border-0">
    <span className="text-sm text-ink-tertiary">{label}</span>
    <span className={cn('text-sm font-medium text-white', color)}>{value}</span>
  </div>
));
FactRow.displayName = 'FactRow';

// =====================================================
// 📊 BAR METER — Horizontal fill bar with label
// =====================================================

interface BarMeterProps {
  value: number;
  color: string;
  label: string;
}

export const BarMeter = memo<BarMeterProps>(({ value, color, label }) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#8B8B8B] min-w-[110px]">{label}</span>
      <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-xs font-semibold min-w-[40px] text-right" style={{ color }}>
        {value.toFixed(1)}%
      </span>
    </div>
  );
});
BarMeter.displayName = 'BarMeter';

// =====================================================
// 🎯 ROC CIRCLE — Return on Capital Semi-Arc Gauge
// =====================================================
// Premium semi-circular gauge with luxury feel.
//
// FIX LOG (v2.1) — Glitch fixes:
//   ✅ BUG: scaleMin was -20, causing 1.3% ROA to appear at ~30% of arc
//      FIX: scaleMin = 0 — ROC metrics are percentages starting from 0
//   ✅ BUG: N/A gauge showed ghost needle/endpoint dot
//      FIX: All visual elements (arc, endpoint, glow) gated on hasValue
//   ✅ BUG: Very low values (< 2%) had invisible arc
//      FIX: Minimum 1.5% arc visibility for any positive value
//   ✅ BUG: Endpoint dot rendered even with pct near 0
//      FIX: Endpoint dot threshold lowered to match arc threshold
// =====================================================

interface ROCCircleProps {
  label: string;
  value: number | null | undefined;
  benchmark: number;
}

const polar = (cx: number, cy: number, r: number, angle: number) => ({
  x: cx + r * Math.cos(angle),
  y: cy + r * Math.sin(angle),
});

export const ROCCircle = memo<ROCCircleProps>(({ label, value, benchmark }) => {
  const [displayPct, setDisplayPct] = useState(0);
  const hasValue = value != null && isFinite(value);
  const v = hasValue ? value! : 0;

  // Status logic
  const isGood = hasValue && v >= benchmark;
  const isNegative = hasValue && v < 0;
  const statusColor = !hasValue ? '#555' : isGood ? C.green : isNegative ? C.red : C.amber;
  const statusLabel = !hasValue ? '—' : isGood ? 'Above Benchmark' : isNegative ? 'Negative' : 'Below Benchmark';
  const glowColor = !hasValue ? 'transparent' : statusColor;

  // ── FIX: Scale normalisation ──
  // scaleMin = 0 (was -20). ROC metrics are 0-based percentages.
  // The old -20 minimum caused low values like 1.3% to appear inflated
  // because ((1.3 - (-20)) / 70) = 30.4% of arc, when it should be ~2.6%.
  const scaleMin = 0;
  // Cap scale at benchmark * 3 so extreme values (e.g. ROE 159%) pin the arc to 100%
  const scaleMax = Math.max(benchmark * 3, 50);
  const range = scaleMax - scaleMin;

  // Value percentage (0–100) along the arc
  const rawPct = hasValue
    ? Math.max(0, Math.min(100, ((Math.abs(v) - scaleMin) / range) * 100))
    : 0;

  // ── FIX: Minimum arc visibility ──
  // Ensure very small but valid values (e.g., 1.3% ROA) still show
  // a visible arc. Minimum 1.5% of sweep for any positive value.
  const valuePct = hasValue && v > 0 && rawPct < 1.5 ? 1.5 : rawPct;

  // Benchmark position (always positive scale)
  const benchmarkPct = Math.max(0, Math.min(100, ((benchmark - scaleMin) / range) * 100));

  // ── KEY FIX: Re-trigger animation whenever the value changes ──
// Using value as dependency ensures the gauge always ends at the correct position,
// even if data arrives after mount or the stock changes.
useEffect(() => {
  setDisplayPct(0); // reset to zero first
  if (!hasValue) return;
  const t = setTimeout(() => setDisplayPct(valuePct), 50);
  return () => clearTimeout(t);
}, [value, benchmark]); // eslint-disable-line react-hooks/exhaustive-deps

const pct = displayPct;

  // SVG geometry
  const W = 200;
  const PAD = 14;
  const cx = W / 2;
  const cy = 92;
  const R = 68;
  const SW = 10;

  // Main background arc (full semicircle)
  const bgStart = polar(cx, cy, R, -Math.PI);
  const bgEnd = polar(cx, cy, R, 0);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 1 1 ${bgEnd.x} ${bgEnd.y}`;

  // Inner decorative ring
  const innerR = R - 16;
  const innerStart = polar(cx, cy, innerR, -Math.PI);
  const innerEnd = polar(cx, cy, innerR, 0);
  const innerPath = `M ${innerStart.x} ${innerStart.y} A ${innerR} ${innerR} 0 1 1 ${innerEnd.x} ${innerEnd.y}`;

  // Value arc endpoint
  const valAngle = -Math.PI + (pct / 100) * Math.PI;
  const valEnd = polar(cx, cy, R, valAngle);
  // Value arc is always a portion of the 180deg semi-circle. largeArc=1
  // makes SVG choose the long complementary arc and causes visual clipping.
  const valueLargeArc = 0;

  // ── FIX: Only create arc path when hasValue and pct is meaningful ──
  const valPath = hasValue && pct > 0.1
    ? `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 ${valueLargeArc} 1 ${valEnd.x} ${valEnd.y}`
    : '';

  // Benchmark tick position
  const bAngle = -Math.PI + (benchmarkPct / 100) * Math.PI;
  const bInner = polar(cx, cy, R - SW / 2 - 6, bAngle);
  const bOuter = polar(cx, cy, R + SW / 2 + 6, bAngle);

  // Unique SVG def IDs (safe for ROE/ROA/ROIC labels)
  const gradId = `roc-g-${label}`;
  const glowId = `roc-f-${label}`;
  const goldGradId = `roc-gold-${label}`;

  return (
    <div className="flex w-full min-w-0 flex-col items-center">
      <div className="relative w-full overflow-hidden" style={{ maxWidth: W + PAD * 2, height: 116 }}>

        {/* Ambient radial glow — only when there's a value */}
        {hasValue && (
          <div
            className="absolute pointer-events-none"
            style={{
              width: 120,
              height: 60,
              left: '50%',
              top: '38%',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(ellipse at center, ${glowColor}20 0%, ${glowColor}0A 45%, transparent 70%)`,
              filter: 'blur(14px)',
            }}
          />
        )}

<svg
  width="100%"
  height={110}
  viewBox={`${-PAD} -12 ${W + PAD * 2} 116`}
  className="relative"
  preserveAspectRatio="xMidYMid meet"
  style={{ overflow: 'hidden' }}
>
          <defs>
            {/* Clip to viewBox bounds */}
            <clipPath id={`roc-clip-${label}`}>
              <rect x={-PAD} y="-8" width={W + PAD * 2} height="108" />
            </clipPath>
            {/* Value arc gradient */}
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              {isNegative ? (
                <>
                  <stop offset="0%" stopColor="#7F1D1D" stopOpacity={0.6} />
                  <stop offset="40%" stopColor={C.red} stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#FCA5A5" stopOpacity={0.7} />
                </>
              ) : isGood ? (
                <>
                  <stop offset="0%" stopColor="#065F46" stopOpacity={0.5} />
                  <stop offset="35%" stopColor={C.green} />
                  <stop offset="70%" stopColor="#4ADE80" />
                  <stop offset="100%" stopColor="#86EFAC" stopOpacity={0.8} />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#78350F" stopOpacity={0.5} />
                  <stop offset="50%" stopColor={C.amber} />
                  <stop offset="100%" stopColor="#FDE68A" stopOpacity={0.7} />
                </>
              )}
            </linearGradient>

            {/* Glow filter */}
            <filter id={glowId} x="0%" y="0%" width="100%" height="100%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor={statusColor} floodOpacity="0.4" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gold gradient for benchmark tick */}
            <linearGradient id={goldGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F4D97B" />
              <stop offset="50%" stopColor="#C9A646" />
              <stop offset="100%" stopColor="#B8963F" />
            </linearGradient>
          </defs>

          {/* Layer 1: Outer halo ring */}
          <path
            d={bgPath}
            fill="none"
            stroke="rgba(201,166,70,0.04)"
            strokeWidth={SW + 8}
            strokeLinecap="round"
          />

          {/* Layer 2: Inner dashed decorative arc */}
          <path
            d={innerPath}
            fill="none"
            stroke="rgba(255,255,255,0.025)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="4 6"
          />

          {/* Layer 3: Scale ticks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const a = -Math.PI + (tick / 100) * Math.PI;
            const major = tick === 0 || tick === 50 || tick === 100;
            return (
              <line
                key={tick}
                x1={cx + (R - SW / 2 - (major ? 3 : 1)) * Math.cos(a)}
                y1={cy + (R - SW / 2 - (major ? 3 : 1)) * Math.sin(a)}
                x2={cx + (R + SW / 2 + (major ? 3 : 1)) * Math.cos(a)}
                y2={cy + (R + SW / 2 + (major ? 3 : 1)) * Math.sin(a)}
                stroke={major ? 'rgba(201,166,70,0.12)' : 'rgba(255,255,255,0.04)'}
                strokeWidth={major ? 1.5 : 1}
              />
            );
          })}

          {/* Layer 4: Background arc */}
          <path
            d={bgPath}
            fill="none"
            stroke="rgba(201,166,70,0.08)"
            strokeWidth={SW}
            strokeLinecap="round"
          />

          {/* Layer 5: VALUE ARC — gradient + soft glow behind */}
          <g clipPath={`url(#roc-clip-${label})`}>
            {valPath && (
              <>
                {/* Soft glow behind (no filter, just thicker transparent stroke) */}
                <path
  d={valPath}
  fill="none"
  stroke={statusColor}
  strokeWidth={SW + 8}
  strokeLinecap="round"
  opacity={0.15}
/>
{/* Main arc */}
<path
  d={valPath}
  fill="none"
  stroke={`url(#${gradId})`}
  strokeWidth={SW}
  strokeLinecap="round"
/>
              </>
            )}
          </g>

          {/* Layer 6: Benchmark tick — gold line + diamond */}
          {hasValue && (
            <>
              <line
                x1={bInner.x} y1={bInner.y}
                x2={bOuter.x} y2={bOuter.y}
                stroke={`url(#${goldGradId})`}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <g transform={`translate(${bOuter.x},${bOuter.y}) rotate(45)`}>
                <rect
                  x={-2.5} y={-2.5} width={5} height={5}
                  fill={C.gold}
                  rx={0.5}
                  opacity={0.85}
                />
              </g>
            </>
          )}

          {/* Layer 7: Endpoint dot — triple ring (only with valid value) */}
          {hasValue && pct > 0.1 && (
            <g clipPath={`url(#roc-clip-${label})`}>
              <circle cx={valEnd.x} cy={valEnd.y} r="7" fill="none" stroke={statusColor} strokeWidth="1" opacity={0.2} />
              <circle cx={valEnd.x} cy={valEnd.y} r="4.5" fill="#0d0b08" stroke={statusColor} strokeWidth="2" />
              <circle cx={valEnd.x} cy={valEnd.y} r="1.5" fill={statusColor} opacity={0.6} />
            </g>
          )}
        </svg>

        {/* Center value display */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 8, textAlign: 'center' }}>
          <span
            className="font-mono font-black leading-none"
            style={{
              fontSize: 20,
              color: hasValue ? statusColor : '#4A4A4A',
              textShadow: hasValue
                ? `0 0 20px ${statusColor}35, 0 0 40px ${statusColor}15`
                : 'none',
            }}
          >
            {hasValue ? `${v.toFixed(1)}%` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Label & meta */}
      <div className="text-center" style={{ marginTop: -1 }}>
        <p
          className="text-[13px] font-bold uppercase"
          style={{
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.88)',
            textShadow: '0 0 20px rgba(201,166,70,0.1)',
          }}
        >
          {label}
        </p>

        {/* Benchmark with gold diamond */}
        {hasValue && (
          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            <span
              className="inline-block w-[5px] h-[5px] rounded-sm rotate-45"
              style={{
                background: `linear-gradient(135deg, #F4D97B, ${C.gold})`,
                boxShadow: `0 0 4px ${C.gold}40`,
              }}
            />
            <span className="text-[10px] font-medium" style={{ color: 'rgba(201,166,70,0.55)' }}>
              Benchmark: {benchmark}%
            </span>
          </div>
        )}

        {/* Status badge — only when there's a value */}
        {hasValue && (
          <span
            className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
            style={{
              background: `linear-gradient(135deg, ${statusColor}15, ${statusColor}08)`,
              color: statusColor,
              border: `1px solid ${statusColor}30`,
              boxShadow: `0 0 12px ${statusColor}10, inset 0 1px 0 ${statusColor}08`,
            }}
          >
            <span
              className="inline-block w-[5px] h-[5px] rounded-full"
              style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}60` }}
            />
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
});
ROCCircle.displayName = 'ROCCircle';

// =====================================================
// 🔘 STATUS BADGE — Colored status label
// =====================================================

interface StatusBadgeProps {
  label: string;
  color?: string;
  variant?: 'positive' | 'negative' | 'neutral' | 'warning' | 'info';
}

const VARIANT_COLORS: Record<string, string> = {
  positive: C.green,
  negative: C.red,
  neutral: '#8B8B8B',
  warning: C.amber,
  info: C.blue,
};

export const StatusBadge = memo<StatusBadgeProps>(({ label, color, variant = 'neutral' }) => {
  const c = color || VARIANT_COLORS[variant] || VARIANT_COLORS.neutral;
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full"
      style={{ background: `${c}15`, color: c, border: `1px solid ${c}25` }}
    >
      {label}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';
