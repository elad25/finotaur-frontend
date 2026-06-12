// src/pages/app/ai/copilot/components/MarketComparisonChart.tsx
// =====================================================
// PERFORMANCE card — Portfolio vs S&P 500.
// Hand-rolled SVG chart (no recharts) in the style of PerformanceChart.tsx:
//   - Portfolio: gold gradient area + line, end-dot badge
//   - S&P 500:   gray area + line, index-aligned & dollar-scaled
//   - Right-side Y-axis ticks in full dollars
//   - Hover crosshair + floating tooltip
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

// SVG coordinate space
const CHART_W  = 760;
const CHART_H  = 300;
const PAD = { top: 16, right: 96, bottom: 32, left: 12 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a dollar amount with commas and 2 decimal places: "$240,500.66" */
function fmtDollarFull(value: number): string {
  return `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Short dollar for compact display (badge): "$248.5K" */
function fmtDollarShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000)    return `$${(abs / 1_000).toFixed(1)}K`;
  if (abs >= 1_000)     return `$${(abs / 1_000).toFixed(2)}K`;
  if (abs >= 1)         return `$${abs.toFixed(2)}`;
  return '$0.00';
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
  ticks: { value: number; y: number }[];
  minV: number;
  maxV: number;
}

/** Build SVG path + area path + coordinate array for a value series. */
function buildCoords(values: number[], minV: number, maxV: number): ChartCoords {
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const range  = maxV - minV || 1;

  const coords: [number, number][] = values.map((v, i) => {
    const x = PAD.left + (i / Math.max(values.length - 1, 1)) * innerW;
    const clamped = Math.max(minV, Math.min(maxV, v));
    const y = PAD.top + (1 - (clamped - minV) / range) * innerH;
    return [x, y];
  });

  const path = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');

  const first = coords[0];
  const last  = coords[coords.length - 1];
  const baseline = CHART_H - PAD.bottom;
  const areaPath = `${path} L${last[0].toFixed(1)} ${baseline} L${first[0].toFixed(1)} ${baseline} Z`;

  // 5 evenly-spaced tick values (bottom to top)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = minV + ratio * range;
    const y = PAD.top + (1 - ratio) * innerH;
    return { value, y };
  });

  return { path, areaPath, coords, ticks, minV, maxV };
}

// ─── Tooltip component ────────────────────────────────────────────────────────

interface HoverTooltipProps {
  portfolioDate: string;
  portfolioValue: number;
  spValue: number | null;
  hideValues: boolean;
  svgX: number;
  svgY: number;
}

function HoverTooltip({
  portfolioDate,
  portfolioValue,
  spValue,
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
          {hideValues ? '*****' : fmtDollarShort(portfolioValue)}
        </span>
      </div>
      {spValue !== null && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="inline-block h-[2px] w-4 rounded" style={{ background: SP_LINE }} />
          <span className="text-[11px] text-ink-tertiary font-medium">S&amp;P 500</span>
          <span className="ml-auto font-mono text-[11px] text-ink-tertiary tabular-nums">
            {hideValues ? '*****' : fmtDollarShort(spValue)}
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

  // Scale S&P series to portfolio's starting value so both lines share the same
  // dollar axis. Guard division by zero on sp[0].value.
  const spScaled = useMemo<(number | null)[]>(() => {
    if (portfolioSeries.length === 0 || sp500.length === 0) return [];
    const portfolioStart = portfolioSeries[0].value;
    const spStart = sp500[0].value;
    if (spStart === 0) return portfolioSeries.map(() => null);
    return portfolioSeries.map((_, i) => {
      if (i >= sp500.length) return null;
      return (sp500[i].value / spStart) * portfolioStart;
    });
  }, [portfolioSeries, sp500]);

  const hasSpData = spScaled.some((v) => v !== null);

  // Compute combined min/max across both series for shared Y axis.
  const { minV, maxV } = useMemo(() => {
    const allValues: number[] = portfolioSeries.map((p) => p.value);
    if (hasSpData) {
      spScaled.forEach((v) => { if (v !== null) allValues.push(v); });
    }
    if (allValues.length === 0) return { minV: 0, maxV: 1 };
    const raw_min = Math.min(...allValues);
    const raw_max = Math.max(...allValues);
    const pad = (raw_max - raw_min) * 0.06;
    return { minV: raw_min - pad, maxV: raw_max + pad };
  }, [portfolioSeries, spScaled, hasSpData]);

  const portfolioChart = useMemo(() => {
    if (portfolioSeries.length === 0) return null;
    if (portfolioSeries.length === 1) {
      // Flat line for single-point edge case
      const v = portfolioSeries[0].value;
      return buildCoords([v, v], minV, maxV);
    }
    return buildCoords(portfolioSeries.map((p) => p.value), minV, maxV);
  }, [portfolioSeries, minV, maxV]);

  const spChart = useMemo(() => {
    if (!hasSpData || spScaled.length === 0) return null;
    const validValues = spScaled.filter((v): v is number => v !== null);
    if (validValues.length < 2) return null;
    // Only build path for the contiguous valid range
    return buildCoords(validValues, minV, maxV);
  }, [spScaled, hasSpData, minV, maxV]);

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

  // Last portfolio value for the badge
  const lastPortfolioValue =
    portfolioSeries.length > 0 ? portfolioSeries[portfolioSeries.length - 1].value : null;

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
            PORTFOLIO PERFORMANCE
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

  // For S&P hover dot: get the scaled SP value at hover index, then compute its y
  const hoverSpValue =
    hoverIdx !== null && spScaled.length > hoverIdx ? spScaled[hoverIdx] : null;

  const hoverSpY = hoverSpValue !== null && portfolioChart
    ? (() => {
        const innerH = CHART_H - PAD.top - PAD.bottom;
        const vRange  = maxV - minV || 1;
        const clamped = Math.max(minV, Math.min(maxV, hoverSpValue));
        return PAD.top + (1 - (clamped - minV) / vRange) * innerH;
      })()
    : null;

  const hoverPortfolioValue =
    hoverIdx !== null ? (portfolioSeries[hoverIdx]?.value ?? null) : null;
  const hoverDate =
    hoverIdx !== null ? (portfolioSeries[hoverIdx]?.date ?? '') : '';

  return (
    <Card className={cn(cardShell, className)}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(244,217,123,0.065),transparent_32%,rgba(201,166,70,0.025))]" />
      <div className="relative p-5">
        {/* Row 1: eyebrow title */}
        <p className="text-[10px] uppercase tracking-[0.13em] font-semibold text-gold-primary mb-2">
          PORTFOLIO PERFORMANCE
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
              {/* S&P gray area fill */}
              <linearGradient id="mccSpArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="rgba(255,255,255,0.10)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
              </linearGradient>
            </defs>

            {/* Horizontal gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = PAD.top + ratio * (CHART_H - PAD.top - PAD.bottom);
              return (
                <line
                  key={`hg-${ratio}`}
                  x1={PAD.left}
                  x2={CHART_W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth={1}
                />
              );
            })}

            {/* S&P 500 series (rendered UNDER portfolio) */}
            {spChart && (
              <>
                <path d={spChart.areaPath} fill="url(#mccSpArea)" />
                <path
                  d={spChart.path}
                  fill="none"
                  stroke={SP_LINE}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Portfolio series (rendered ON TOP) */}
            {portfolioChart && (
              <>
                <path d={portfolioChart.areaPath} fill="url(#mccPortfolioArea)" />
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
            {portfolioChart && portfolioChart.ticks.filter(({ y }) => {
              if (portfolioChart.coords.length === 0) return true;
              const [, lastY] = portfolioChart.coords[portfolioChart.coords.length - 1];
              return Math.abs(y - lastY) > 14;
            }).map(({ value, y }) => (
              <text
                key={`yt-${value.toFixed(0)}`}
                x={CHART_W - PAD.right + 8}
                y={y + 4}
                textAnchor="start"
                fill="rgba(255,255,255,0.45)"
                fontSize={10}
              >
                {hideValues ? '*****' : fmtDollarFull(value)}
              </text>
            ))}

            {/* Gold value badge at last portfolio value y-position */}
            {lastPortfolioValue !== null && portfolioChart && (() => {
              const [, lastY] = portfolioChart.coords[portfolioChart.coords.length - 1];
              const badgeText = hideValues ? '*****' : fmtDollarShort(lastPortfolioValue);
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
                {hoverSpValue !== null && hoverSpY !== null && (
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
          {hoverIdx !== null && hoverPortfolioCoords && hoverPortfolioValue !== null && (
            <HoverTooltip
              portfolioDate={hoverDate}
              portfolioValue={hoverPortfolioValue}
              spValue={hoverSpValue}
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
