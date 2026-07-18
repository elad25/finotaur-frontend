// src/pages/app/ai/copilot/components/MarketComparisonChart.tsx
// =====================================================
// PERFORMANCE OVER TIME card — Portfolio vs S&P 500.
// Hand-rolled SVG chart (no recharts) in the style of PerformanceChart.tsx:
//   - Both series normalized to % return from the first point of the range
//     so they share one directly-comparable percent axis.
//   - Portfolio: gold gradient area + glowing gold line, end-of-line % chip
//   - S&P 500:   thin gray line, no glow, no area fill
//   - Right-side Y-axis in "nice" percent ticks (always includes 0%)
//   - Hover crosshair + floating tooltip (both series shown as signed %)
//   - Top row: inline legend (left) + time-range tabs (right)
// =====================================================

import { useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Card } from '@/components/ds/Card';
import { cn } from '@/lib/utils';
import { useBenchmarkSeries } from '../hooks/useBenchmarkSeries';
import { useValuePrivacy } from '../hooks/useValuePrivacy';
import type { PerformancePoint, TimeRange } from '../hooks/usePortfolioData';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  portfolioSeries: PerformancePoint[];
  range: TimeRange;
  onRangeChange?: (r: TimeRange) => void;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const RANGES: TimeRange[] = ['1M', '3M', '6M', 'YTD', '1Y', 'ALL'];

const GOLD_LINE   = '#E8C766';
const GOLD_DARK   = '#C9A646';
const SP_LINE     = 'rgba(255,255,255,0.45)';
// Design-system tokens (ink.secondary / ink.tertiary from tailwind.config.ts) —
// used as raw rgba here because SVG <text fill> can't consume Tailwind classes.
const TICK_LABEL_COLOR = 'rgba(255,255,255,0.65)'; // text-ink-secondary
const ZERO_LINE_COLOR  = 'rgba(255,255,255,0.14)';
const GRID_LINE_COLOR  = 'rgba(255,255,255,0.05)';

// SVG coordinate space
const CHART_W  = 760;
const CHART_H  = 300;
const PAD = { top: 16, right: 96, bottom: 32, left: 12 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Compute "nice" round tick values (like d3.ticks) spanning [min, max] with
 * ~targetCount steps. Because every series here is normalized so its first
 * point is always exactly 0, the 0% line is guaranteed to land on a tick.
 */
function computeNiceTicks(min: number, max: number, targetCount = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [0];
  }
  const span = max - min;
  const rawStep = span / Math.max(targetCount - 1, 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  let niceResidual: number;
  if (residual >= 7.5)      niceResidual = 10;
  else if (residual >= 3.5) niceResidual = 5;
  else if (residual >= 1.5) niceResidual = 2;
  else                       niceResidual = 1;
  const step = niceResidual * magnitude;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let v = start; v <= end + step * 1e-9; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6); // clean up floating-point noise
  }
  return ticks;
}

/** Percent tick label — no leading "+", U+2212 (real minus) for negatives. */
function fmtPctTick(value: number): string {
  const abs = Math.abs(value);
  const decimals = Math.abs(abs % 1) > 0.001 ? 1 : 0;
  const sign = value < -0.001 ? '−' : '';
  return `${sign}${abs.toFixed(decimals)}%`;
}

/** Signed percent for tooltip/chip — explicit "+" for positive, U+2212 for negative. */
function fmtPctSigned(value: number): string {
  const sign = value < 0 ? '−' : '+';
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

/** Format date string to "MMM D" (e.g. "Jan 18"). */
function fmtDateShort(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** Format date string to "MMM D, YYYY" for tooltip. */
function fmtDateTooltip(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

interface ChartCoords {
  path: string;
  areaPath: string;
  coords: [number, number][];
}

/** Map a value in [minV, maxV] to its pixel Y position within the chart. */
function valueToY(value: number, minV: number, maxV: number): number {
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const range = maxV - minV || 1;
  const clamped = Math.max(minV, Math.min(maxV, value));
  return PAD.top + (1 - (clamped - minV) / range) * innerH;
}

/** Build SVG path + area path + coordinate array for a value series. */
function buildCoords(values: number[], minV: number, maxV: number): ChartCoords {
  const innerW = CHART_W - PAD.left - PAD.right;

  const coords: [number, number][] = values.map((v, i) => {
    const x = PAD.left + (i / Math.max(values.length - 1, 1)) * innerW;
    const y = valueToY(v, minV, maxV);
    return [x, y];
  });

  const path = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');

  const first = coords[0];
  const last  = coords[coords.length - 1];
  const baseline = CHART_H - PAD.bottom;
  const areaPath = `${path} L${last[0].toFixed(1)} ${baseline} L${first[0].toFixed(1)} ${baseline} Z`;

  return { path, areaPath, coords };
}

// ─── Tooltip component ────────────────────────────────────────────────────────

interface HoverTooltipProps {
  portfolioDate: string;
  portfolioPct: number;
  spPct: number | null;
  hideValues: boolean;
  svgX: number;
  svgY: number;
}

function HoverTooltip({
  portfolioDate,
  portfolioPct,
  spPct,
  hideValues,
  svgX,
  svgY,
}: HoverTooltipProps) {
  const leftPct = (svgX / CHART_W) * 100;
  const topPct  = (svgY / CHART_H) * 100;
  const flipLeft = svgX > CHART_W * 0.6;

  return (
    <div
      className="pointer-events-none absolute z-20 min-w-[164px] rounded-[7px] border border-gold-primary/35 bg-[#0a0908]/96 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-sm"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: flipLeft
          ? 'translate(calc(-100% - 14px), -50%)'
          : 'translate(14px, -50%)',
      }}
    >
      <p className="text-[9px] uppercase tracking-[0.12em] text-ink-tertiary mb-1">
        {fmtDateTooltip(portfolioDate)}
      </p>
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-[2px] w-4 rounded" style={{ background: GOLD_LINE }} />
        <span className="text-[11px] text-gold-primary font-medium">Portfolio</span>
        <span className="ml-auto font-mono text-[11px] text-gold-primary tabular-nums">
          {hideValues ? '*****' : fmtPctSigned(portfolioPct)}
        </span>
      </div>
      {spPct !== null && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="inline-block h-[2px] w-4 rounded" style={{ background: SP_LINE }} />
          <span className="text-[11px] text-ink-tertiary font-medium">S&amp;P 500</span>
          <span className="ml-auto font-mono text-[11px] text-ink-tertiary tabular-nums">
            {hideValues ? '*****' : fmtPctSigned(spPct)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MarketComparisonChart({
  portfolioSeries,
  range,
  onRangeChange,
  className,
}: Props) {
  const [hideValues] = useValuePrivacy();
  const { sp500 } = useBenchmarkSeries(range);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Normalize the portfolio series to % return from the first point of the
  // selected range. Guard: missing/zero first value → flat 0% line, no NaN.
  const portfolioPct = useMemo<number[]>(() => {
    if (portfolioSeries.length === 0) return [];
    const first = portfolioSeries[0].value;
    if (!first) return portfolioSeries.map(() => 0);
    return portfolioSeries.map((p) => (p.value / first - 1) * 100);
  }, [portfolioSeries]);

  // Normalize S&P 500 to % return from its own first point (same guard).
  // Index-aligned to portfolioSeries (both hooks are driven by the same range).
  const spPct = useMemo<(number | null)[]>(() => {
    if (portfolioSeries.length === 0 || sp500.length === 0) return [];
    const spFirst = sp500[0].value;
    if (!spFirst) return portfolioSeries.map(() => null);
    return portfolioSeries.map((_, i) => {
      if (i >= sp500.length) return null;
      return (sp500[i].value / spFirst - 1) * 100;
    });
  }, [portfolioSeries, sp500]);

  const hasSpData = spPct.some((v) => v !== null);

  // Compute combined % domain across both series, then snap to "nice" ticks
  // so the axis always includes 0% and reads like -10% / 0% / 10% / 20% / 30%.
  const { minV, maxV, yTicks } = useMemo(() => {
    const allValues: number[] = [...portfolioPct];
    if (hasSpData) {
      spPct.forEach((v) => { if (v !== null) allValues.push(v); });
    }
    if (allValues.length === 0) return { minV: -10, maxV: 10, yTicks: [-10, 0, 10] };
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const pad = (rawMax - rawMin) * 0.08 || 5;
    const ticks = computeNiceTicks(rawMin - pad, rawMax + pad, 5);
    return { minV: ticks[0], maxV: ticks[ticks.length - 1], yTicks: ticks };
  }, [portfolioPct, spPct, hasSpData]);

  const portfolioChart = useMemo(() => {
    if (portfolioPct.length === 0) return null;
    if (portfolioPct.length === 1) {
      // Flat line for single-point edge case
      const v = portfolioPct[0];
      return buildCoords([v, v], minV, maxV);
    }
    return buildCoords(portfolioPct, minV, maxV);
  }, [portfolioPct, minV, maxV]);

  const spChart = useMemo(() => {
    if (!hasSpData || spPct.length === 0) return null;
    const validValues = spPct.filter((v): v is number => v !== null);
    if (validValues.length < 2) return null;
    // Only build path for the contiguous valid range
    return buildCoords(validValues, minV, maxV);
  }, [spPct, hasSpData, minV, maxV]);

  // X-axis labels — ~6 evenly-spaced dates
  const xLabels = useMemo(() => {
    if (portfolioSeries.length < 2) return [];
    const count = 6;
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.round((i / (count - 1)) * (portfolioSeries.length - 1));
      const clampedIdx = Math.min(portfolioSeries.length - 1, Math.max(0, idx));
      const innerW = CHART_W - PAD.left - PAD.right;
      const x = PAD.left + (clampedIdx / Math.max(portfolioSeries.length - 1, 1)) * innerW;
      return { x, label: fmtDateShort(portfolioSeries[clampedIdx].date) };
    });
  }, [portfolioSeries]);

  // Mouse hover tracking
  const handleMouseMove = (e: ReactMouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || portfolioSeries.length < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const innerW = CHART_W - PAD.left - PAD.right;
    const ratio = (svgX - PAD.left) / innerW;
    if (ratio < 0 || ratio > 1) { setHoverIdx(null); return; }
    const idx = Math.round(ratio * (portfolioSeries.length - 1));
    setHoverIdx(Math.max(0, Math.min(portfolioSeries.length - 1, idx)));
  };

  const handleMouseLeave = () => setHoverIdx(null);

  // Last portfolio % return for the end-of-line badge
  const lastPortfolioPct =
    portfolioPct.length > 0 ? portfolioPct[portfolioPct.length - 1] : null;

  const cardShell =
    'relative overflow-hidden rounded-[7px] bg-[#070604]/92 border-gold-primary/20 shadow-[0_24px_70px_rgba(0,0,0,0.48)]';

  // ── Range tabs ────────────────────────────────────────────────────────────
  const rangeTabs = (
    <div className="flex items-center gap-0.5 shrink-0">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onRangeChange?.(r)}
          className={cn(
            'rounded-[5px] px-1.5 py-0.5 text-[10px] font-medium transition-colors',
            range === r
              ? 'bg-white/[0.08] text-ink-primary'
              : 'text-ink-tertiary hover:text-ink-secondary',
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );

  // ── Inline legend (left of header sub-row) ────────────────────────────────
  const legendRow = (
    <div className="flex items-center gap-3 whitespace-nowrap">
      {/* Portfolio */}
      <div className="flex items-center gap-1.5">
        <svg width="14" height="2" viewBox="0 0 14 2" aria-hidden="true">
          <line x1="0" y1="1" x2="14" y2="1" stroke={GOLD_LINE} strokeWidth="2" />
        </svg>
        <span className="text-[11px] font-medium" style={{ color: GOLD_LINE }}>
          Portfolio
        </span>
      </div>
      {/* S&P 500 — only shown when data present */}
      {hasSpData && (
        <div className="flex items-center gap-1.5">
          <svg width="14" height="2" viewBox="0 0 14 2" aria-hidden="true">
            <line
              x1="0" y1="1" x2="14" y2="1"
              stroke={SP_LINE}
              strokeWidth="1.8"
              strokeDasharray="4 2"
            />
          </svg>
          <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: SP_LINE }}>
            S&amp;P 500
          </span>
        </div>
      )}
    </div>
  );

  // ── Empty guard ──────────────────────────────────────────────────────────
  if (portfolioSeries.length === 0) {
    return (
      <Card className={cn(cardShell, className)}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(244,217,123,0.065),transparent_32%,rgba(201,166,70,0.025))]" />
        <div className="relative p-5">
          {/* Row 1: eyebrow */}
          <p className="text-[10px] uppercase tracking-[0.13em] font-semibold text-gold-primary mb-2">
            PERFORMANCE OVER TIME
          </p>
          {/* Row 2: legend + tabs, wrapping on narrow widths */}
          <div className="flex flex-wrap items-center justify-between gap-y-1.5 mb-4">
            {legendRow}
            {rangeTabs}
          </div>
          <div className="flex h-[320px] items-center justify-center text-sm text-ink-tertiary">
            Connect a broker to compare performance
          </div>
        </div>
      </Card>
    );
  }

  // ── Full chart ───────────────────────────────────────────────────────────
  const hoverPortfolioCoords = hoverIdx !== null && portfolioChart
    ? portfolioChart.coords[Math.min(hoverIdx, portfolioChart.coords.length - 1)]
    : null;

  // For S&P hover dot: get the normalized SP % at hover index, then compute its y
  const hoverSpPct =
    hoverIdx !== null && spPct.length > hoverIdx ? spPct[hoverIdx] : null;

  const hoverSpY = hoverSpPct !== null
    ? valueToY(hoverSpPct, minV, maxV)
    : null;

  const hoverPortfolioPct =
    hoverIdx !== null ? (portfolioPct[hoverIdx] ?? null) : null;
  const hoverDate =
    hoverIdx !== null ? (portfolioSeries[hoverIdx]?.date ?? '') : '';

  return (
    <Card className={cn(cardShell, className)}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(244,217,123,0.065),transparent_32%,rgba(201,166,70,0.025))]" />
      <div className="relative p-5">
        {/* Row 1: eyebrow title */}
        <p className="text-[10px] uppercase tracking-[0.13em] font-semibold text-gold-primary mb-2">
          PERFORMANCE OVER TIME
        </p>
        {/* Row 2: legend left, tabs right — wraps on narrow widths */}
        <div className="flex flex-wrap items-center justify-between gap-y-1.5 mb-4">
          {legendRow}
          {rangeTabs}
        </div>

        {/* Chart area */}
        <div className="relative">
          <svg
            ref={svgRef}
            className="h-[300px] w-full overflow-visible"
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            role="img"
            aria-label="Portfolio vs S&P 500 performance chart"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {/* Portfolio gold area fill */}
              <linearGradient id="mccPortfolioArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#E8C766" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#E8C766" stopOpacity="0.00" />
              </linearGradient>
              {/* Portfolio gold line gradient */}
              <linearGradient id="mccPortfolioLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#C9A646" />
                <stop offset="100%" stopColor="#E8C766" />
              </linearGradient>
              {/* Glow blur for the portfolio line */}
              <filter id="mccGoldGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4.5" result="blur" />
              </filter>
            </defs>

            {/* Horizontal gridlines — one per Y-axis tick, 0% line more visible */}
            {yTicks.map((tickValue) => {
              const y = valueToY(tickValue, minV, maxV);
              const isZero = Math.abs(tickValue) < 1e-6;
              return (
                <line
                  key={`hg-${tickValue}`}
                  x1={PAD.left}
                  x2={CHART_W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke={isZero ? ZERO_LINE_COLOR : GRID_LINE_COLOR}
                  strokeWidth={1}
                />
              );
            })}

            {/* S&P 500 series (rendered UNDER portfolio) — thin line only, no glow, no area */}
            {spChart && (
              <path
                d={spChart.path}
                fill="none"
                stroke={SP_LINE}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Portfolio series (rendered ON TOP) — glow pass underneath + crisp gold line */}
            {portfolioChart && (
              <>
                <path d={portfolioChart.areaPath} fill="url(#mccPortfolioArea)" />
                <path
                  d={portfolioChart.path}
                  fill="none"
                  stroke={GOLD_LINE}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.45}
                  filter="url(#mccGoldGlow)"
                />
                <path
                  d={portfolioChart.path}
                  fill="none"
                  stroke="url(#mccPortfolioLine)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* End-of-line gold dot (glow + solid) */}
            {portfolioChart && portfolioChart.coords.length > 0 && (() => {
              const [ex, ey] = portfolioChart.coords[portfolioChart.coords.length - 1];
              return (
                <g>
                  <circle cx={ex} cy={ey} r={8} fill="#E8C766" opacity={0.18} />
                  <circle cx={ex} cy={ey} r={4} fill="#E8C766" />
                </g>
              );
            })()}

            {/* Y-axis right-side tick labels — ticks within the badge zone are
                skipped so the gold latest-value badge never overlaps a label */}
            {portfolioChart && yTicks.map((tickValue) => {
              const y = valueToY(tickValue, minV, maxV);
              if (portfolioChart.coords.length > 0) {
                const [, lastY] = portfolioChart.coords[portfolioChart.coords.length - 1];
                if (Math.abs(y - lastY) <= 14) return null;
              }
              return (
                <text
                  key={`yt-${tickValue}`}
                  x={CHART_W - PAD.right + 8}
                  y={y + 4}
                  textAnchor="start"
                  fill={TICK_LABEL_COLOR}
                  fontSize={10}
                  className="font-mono tabular-nums"
                >
                  {hideValues ? '*****' : fmtPctTick(tickValue)}
                </text>
              );
            })}

            {/* Gold value badge at last portfolio value y-position */}
            {lastPortfolioPct !== null && portfolioChart && (() => {
              const [, lastY] = portfolioChart.coords[portfolioChart.coords.length - 1];
              const badgeText = hideValues ? '*****' : fmtPctSigned(lastPortfolioPct);
              const badgeW = badgeText.length * 6.5 + 10;
              return (
                <g>
                  <rect
                    x={CHART_W - PAD.right + 7}
                    y={lastY - 9}
                    width={badgeW}
                    height={18}
                    rx={4}
                    fill={GOLD_DARK}
                  />
                  <text
                    x={CHART_W - PAD.right + 7 + badgeW / 2}
                    y={lastY + 4}
                    textAnchor="middle"
                    fill="#0a0908"
                    fontSize={10}
                    fontWeight="700"
                    className="font-mono tabular-nums"
                  >
                    {badgeText}
                  </text>
                </g>
              );
            })()}

            {/* X-axis date labels */}
            {xLabels.map(({ x, label }, i) => (
              <text
                key={`xl-${i}`}
                x={x}
                y={CHART_H - PAD.bottom + 18}
                textAnchor="middle"
                fill="rgba(255,255,255,0.42)"
                fontSize={10}
              >
                {label}
              </text>
            ))}

            {/* Hover crosshair + dots */}
            {hoverIdx !== null && hoverPortfolioCoords && (
              <g pointerEvents="none">
                {/* Vertical dashed line */}
                <line
                  x1={hoverPortfolioCoords[0]}
                  x2={hoverPortfolioCoords[0]}
                  y1={PAD.top}
                  y2={CHART_H - PAD.bottom}
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                {/* Portfolio dot */}
                <circle
                  cx={hoverPortfolioCoords[0]}
                  cy={hoverPortfolioCoords[1]}
                  r={5}
                  fill={GOLD_LINE}
                  stroke="#070604"
                  strokeWidth={2}
                />
                {/* S&P dot */}
                {hoverSpPct !== null && hoverSpY !== null && (
                  <circle
                    cx={hoverPortfolioCoords[0]}
                    cy={hoverSpY}
                    r={4}
                    fill={SP_LINE}
                    stroke="#070604"
                    strokeWidth={1.5}
                  />
                )}
              </g>
            )}
          </svg>

          {/* HTML tooltip overlay */}
          {hoverIdx !== null && hoverPortfolioCoords && hoverPortfolioPct !== null && (
            <HoverTooltip
              portfolioDate={hoverDate}
              portfolioPct={hoverPortfolioPct}
              spPct={hoverSpPct}
              hideValues={hideValues}
              svgX={hoverPortfolioCoords[0]}
              svgY={hoverPortfolioCoords[1]}
            />
          )}
        </div>
      </div>
    </Card>
  );
}
