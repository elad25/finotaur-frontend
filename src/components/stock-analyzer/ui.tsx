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
import { C, cardStyle } from '@/constants/stock-analyzer.constants';

// =====================================================
// 💀 SKELETON — Loading placeholder
// =====================================================

interface SkeletonProps {
  className?: string;
}

export const Skeleton = memo<SkeletonProps>(({ className }) => (
  <div
    className={cn('animate-pulse rounded-lg', className)}
    style={{ background: 'rgba(201,166,70,0.08)' }}
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
    className={cn('rounded-2xl overflow-hidden', className)}
    style={cardStyle(highlight || gold)}
  >
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
    className="p-4 rounded-xl"
    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.06)' }}
  >
    <p className="text-[10px] text-[#6B6B6B] mb-1 uppercase tracking-wider">{label}</p>
    <p className={cn('text-lg font-semibold text-white', color)}>{value}</p>
    {subtitle && <p className="text-[10px] text-[#6B6B6B] mt-0.5">{subtitle}</p>}
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
  <div className="flex items-center gap-3 mb-5">
    {Icon && (
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(201,166,70,0.12)', border: '1px solid rgba(201,166,70,0.2)' }}
      >
        <Icon className="h-4.5 w-4.5 text-[#C9A646]" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-white truncate">{title}</h3>
        {badge && (
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
            style={{ background: 'rgba(201,166,70,0.12)', color: C.gold, border: '1px solid rgba(201,166,70,0.2)' }}
          >
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-[#6B6B6B] mt-0.5">{subtitle}</p>}
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
  <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
    <span className="text-sm text-[#8B8B8B]">{label}</span>
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
  const [animated, setAnimated] = useState(false);
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
  const scaleMax = Math.max(
    benchmark * 2.5,
    Math.abs(v) * 1.3,
    50
  );
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

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  // ── FIX: Only animate when we have a value ──
  const pct = hasValue && animated ? valuePct : 0;

  // SVG geometry — extra left padding to prevent glow bleed
  const W = 200;
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
  const largeArc = pct > 50 ? 1 : 0;

  // ── FIX: Only create arc path when hasValue and pct is meaningful ──
  const valPath = hasValue && pct > 0.1
    ? `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 ${largeArc} 1 ${valEnd.x} ${valEnd.y}`
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
    <div className="flex flex-col items-center w-full max-w-[200px]">
      <div className="relative w-full" style={{ maxWidth: W, height: 115 }}>

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
  height={115}
  viewBox={`0 0 ${W} 115`}
  className="relative"
  preserveAspectRatio="xMidYMid meet"
>
          <defs>
            {/* Clip to viewBox bounds */}
            <clipPath id={`roc-clip-${label}`}>
              <rect x="0" y="0" width={W} height="115" />
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
            <filter id={glowId} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="3" result="blur" />
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

          {/* Layer 5: VALUE ARC — gradient + glow (clipped to bounds) */}
          <g clipPath={`url(#roc-clip-${label})`}>
            {valPath && (
              <path
                d={valPath}
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={SW}
                strokeLinecap="round"
                filter={`url(#${glowId})`}
                style={{ transition: 'all 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              />
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
            <g clipPath={`url(#roc-clip-${label})`} style={{ transition: 'all 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <circle cx={valEnd.x} cy={valEnd.y} r="7" fill="none" stroke={statusColor} strokeWidth="1" opacity={0.2} />
              <circle cx={valEnd.x} cy={valEnd.y} r="4.5" fill="#0d0b08" stroke={statusColor} strokeWidth="2" filter={`url(#${glowId})`} />
              <circle cx={valEnd.x} cy={valEnd.y} r="1.5" fill={statusColor} opacity={0.6} />
            </g>
          )}
        </svg>

        {/* Center value display */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 8, textAlign: 'center' }}>
          <span
            className="font-mono font-black leading-none"
            style={{
              fontSize: 24,
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