// src/pages/app/ai/copilot/components/PortfolioHealthPanel.tsx
// =====================================================
// PORTFOLIO HEALTH card — semicircular gauge + four metric bars.
// Hand-rolled SVG, no charting library.
// Scores are 0-100 where higher = healthier (inverse of risk score).
// =====================================================

import { useEffect, useRef } from 'react';
import { PremiumFrame } from '../brief/PremiumFrame';
import type { PortfolioSnapshot } from '../hooks/usePortfolioData';
import { computePortfolioHealth } from '../utils/portfolioRisk';
import type { HealthMetric } from '../utils/portfolioRisk';

// ─── SVG gauge constants ──────────────────────────────────────────────────────

/** Gauge spans 240°, opening at the BOTTOM — in SVG y-down coords θ=150° is the
 *  bottom-left end, sweeping clockwise through the top (θ=270°) to θ=390° (bottom-right). */
const GAUGE_ANGLE = 240; // degrees
const GAUGE_RADIUS = 64; // px — controls the arc ring radius
const STROKE_W = 13;     // px — arc stroke width
const CX = 100;          // SVG viewBox centre X
const CY = 85;           // SVG viewBox centre Y (arc midpoint, not geometric centre)

/** Convert polar angle (degrees, 0 = 3 o'clock, positive = clockwise) to SVG [x, y]. */
function polar(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

/**
 * Build an SVG arc-path string for a partial arc.
 * startAngle → endAngle (degrees, clockwise from 3 o'clock).
 */
function arcPath(startDeg: number, endDeg: number, r: number): string {
  if (Math.abs(endDeg - startDeg) >= 360) {
    // Full circle — use two semicircles to avoid degenerate path.
    const [x1, y1] = polar(startDeg, r);
    const [x2, y2] = polar(startDeg + 180, r);
    return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2} A ${r} ${r} 0 1 1 ${x1} ${y1}`;
  }
  const [x1, y1] = polar(startDeg, r);
  const [x2, y2] = polar(endDeg, r);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

/** Total arc circumference for dash calculations. */
const FULL_CIRC = (GAUGE_ANGLE / 360) * 2 * Math.PI * GAUGE_RADIUS;

// The gauge arc starts at 150° (bottom-left end, in SVG y-down coords) and sweeps
// clockwise 240° to 390° (= bottom-right end, passing through the top at 270°).
const START_DEG = 150;
const END_DEG   = START_DEG + GAUGE_ANGLE; // 390

// Static gradient id — one instance per page, no Math.random.
const GRAD_ID      = 'phg-gold-grad';
const GLOW_ID      = 'phg-glow-filter';
const ARC_GLOW_ID  = 'phg-arc-glow';

// ─── Animated gauge arc component ────────────────────────────────────────────

interface GaugeProps {
  overall: number; // 0-100
}

function HealthGauge({ overall }: GaugeProps) {
  // The fill arc uses stroke-dasharray + stroke-dashoffset for the dash-reveal.
  // We animate dashoffset from FULL_CIRC (hidden) → target on mount.
  const fillRef = useRef<SVGPathElement>(null);

  const trackPath = arcPath(START_DEG, END_DEG, GAUGE_RADIUS);
  const fillPath  = arcPath(START_DEG, END_DEG, GAUGE_RADIUS); // same shape, clipped by dash

  const targetOffset = FULL_CIRC - (overall / 100) * FULL_CIRC;

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    // Start fully hidden, then transition to the target offset.
    el.style.strokeDashoffset = String(FULL_CIRC);
    // One rAF ensures the initial hidden state is painted before the transition.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.strokeDashoffset = String(targetOffset);
      });
    });
  }, [overall, targetOffset]);

  // Glowing endpoint dot position.
  const fillAngle = START_DEG + (overall / 100) * GAUGE_ANGLE;
  const [dotX, dotY] = polar(fillAngle, GAUGE_RADIUS);

  // Label positions near the arc ends.
  const [lx0, ly0] = polar(START_DEG, GAUGE_RADIUS);
  const [lx1, ly1] = polar(END_DEG,   GAUGE_RADIUS);

  return (
    // viewBox is 200×150 — the arc sits in the upper portion; centre text below.
    <svg
      viewBox="0 0 200 150"
      width="220"
      height="165"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={GRAD_ID} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#F4D97B" />
          <stop offset="100%" stopColor="#C9A646" />
        </linearGradient>
        <filter id={GLOW_ID} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={ARC_GLOW_ID} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Outer hairline halo ring — delicate gold frame */}
      <path
        d={arcPath(START_DEG, END_DEG, GAUGE_RADIUS + 13)}
        fill="none"
        stroke="rgba(201,166,70,0.16)"
        strokeWidth={1}
        strokeLinecap="round"
      />

      {/* Under-glow ambient — static, behind track */}
      <path
        d={fillPath}
        fill="none"
        stroke="#C9A646"
        strokeWidth={STROKE_W}
        strokeLinecap="round"
        strokeDasharray={`${(overall / 100) * FULL_CIRC} ${FULL_CIRC}`}
        opacity={0.3}
        filter={`url(#${ARC_GLOW_ID})`}
      />

      {/* Track arc */}
      <path
        d={trackPath}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={STROKE_W}
        strokeLinecap="round"
      />

      {/* Fill arc — animated via stroke-dashoffset CSS transition */}
      <path
        ref={fillRef}
        d={fillPath}
        fill="none"
        stroke={`url(#${GRAD_ID})`}
        strokeWidth={STROKE_W}
        strokeLinecap="round"
        strokeDasharray={FULL_CIRC}
        strokeDashoffset={FULL_CIRC}
        style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
      />

      {/* Glowing endpoint dot — only shown when score > 2 to avoid clipping artefact */}
      {overall > 2 && (
        <>
          {/* Outer glow halo */}
          <circle
            cx={dotX}
            cy={dotY}
            r={10}
            fill="rgba(244,217,123,0.18)"
          />
          {/* Bright dot */}
          <circle
            cx={dotX}
            cy={dotY}
            r={6.5}
            fill="#F4D97B"
            filter={`url(#${GLOW_ID})`}
          />
        </>
      )}

      {/* Arc-end labels */}
      <text
        x={lx0}
        y={ly0 + 18}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={9}
        letterSpacing={1}
        fill="rgba(255,255,255,0.32)"
      >0</text>
      <text
        x={lx1}
        y={ly1 + 18}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={9}
        letterSpacing={1}
        fill="rgba(255,255,255,0.32)"
      >100</text>

      {/* Center score text */}
      <text
        x={CX}
        y={CY + 10}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        <tspan fontSize={33} fontWeight={300} fill="rgba(255,255,255,0.95)">{overall}</tspan>
        <tspan
          fontSize={11}
          fontWeight={400}
          fill="rgba(201,166,70,0.6)"
          dx={3}
          style={{ letterSpacing: 0.5 }}
        >/100</tspan>
      </text>
    </svg>
  );
}

// ─── Single metric row ────────────────────────────────────────────────────────

function MetricRow({ metric }: { metric: HealthMetric }) {
  const { label, score } = metric;

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      className="flex items-center"
    >
      {/* Label */}
      <span className="w-[118px] shrink-0 text-[12px] tracking-[0.02em] text-ink-secondary">{label}</span>

      {/* Slider track */}
      <div className="relative mx-3 flex-1 h-[5px] rounded-full bg-white/[0.08]">
        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${score}%`,
            background: 'linear-gradient(90deg, #E8C766 0%, #C9A646 100%)',
          }}
        />
        {/* Knob at fill end */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-[#F4D97B]/50 shadow-[0_0_8px_rgba(244,217,123,0.7)]"
          style={{
            left: `calc(${score}% - 6px)`,
            background: '#F4D97B',
          }}
        />
      </div>

      {/* Value chip */}
      <span
        className="min-w-[38px] text-center text-[12px] font-sans tabular-nums text-ink-primary bg-gold-primary/[0.07] border border-gold-primary/20 rounded-[6px] px-1.5 py-0.5"
      >
        {score}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  snapshot: PortfolioSnapshot;
  className?: string;
}

export function PortfolioHealthPanel({ snapshot, className }: Props) {
  const health = computePortfolioHealth(snapshot.holdings, snapshot.totalValue);
  const isEmpty = !snapshot.holdings.length || snapshot.totalValue <= 0;

  return (
    <PremiumFrame className={`min-h-[380px] ${className ?? ''}`}>
      <div className="p-6">
        {/* Header */}
        <p className="text-[13px] uppercase tracking-[0.08em] text-gold-primary">PORTFOLIO HEALTH</p>

        {isEmpty ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <p className="text-[13px] text-ink-tertiary text-center">
              Connect a broker to see portfolio health.
            </p>
          </div>
        ) : (
          <>
            {/* Gauge — centred */}
            <div className="mt-4 flex justify-center">
              <HealthGauge overall={health.overall} />
            </div>

            {/* Metric rows */}
            <div className="mt-5 flex flex-col gap-[14px]">
              {health.metrics.map((m) => (
                <MetricRow key={m.key} metric={m} />
              ))}
            </div>
          </>
        )}
      </div>
    </PremiumFrame>
  );
}
