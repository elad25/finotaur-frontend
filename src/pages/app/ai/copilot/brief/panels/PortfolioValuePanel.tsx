/**
 * PortfolioValuePanel — headline portfolio value card.
 *
 * Displays the mark-to-market total portfolio value (intraday when market is
 * open), the selected-range return, a LIVE/Delayed/Closed freshness indicator,
 * and a full-width area performance chart with range selector.
 *
 * Honesty rules enforced here:
 *  - Range-return label reflects the actual selected range ("1M RETURN"), not "ALL TIME RETURN".
 *  - When <2 snapshots exist, range-return is hidden with an explanatory message.
 *  - LIVE dot shows "as of HH:MM" when quotes are fresh; "Delayed" or "Market closed" otherwise.
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Eye } from 'lucide-react';
import { Change, Price } from '@/components/ds/NumberDisplay';
import { useMarketStatus } from '@/lib/marketStatus';
import { robustExtent, clampToRange } from '@/lib/portfolio/metrics';
import { cn } from '@/lib/utils';
import type { TimeRange, PerformancePoint } from '../../hooks/usePortfolioData';
import type { PortfolioDataResult } from '../../hooks/usePortfolioData';

// ─── PremiumFrame (local — mirrors the dashboard's version) ──────────────────

function PremiumFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`relative overflow-hidden rounded-[7px] border border-gold-primary/20 bg-[#070604]/92 shadow-[0_24px_70px_rgba(0,0,0,0.48)] ${className}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/65 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(244,217,123,0.075),transparent_30%,rgba(201,166,70,0.025))]" />
      <div className="relative h-full">{children}</div>
    </section>
  );
}

// ─── Stat ─────────────────────────────────────────────────────────────────────

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">{label}</p>
      <div className="mt-2 text-sm leading-none">{value}</div>
      {sub && <div className="mt-1 text-xs leading-none">{sub}</div>}
    </div>
  );
}

// ─── LiveIndicator ────────────────────────────────────────────────────────────

/**
 * Small freshness badge shown near the total-value headline.
 * - LIVE green dot + "as of HH:MM" when quotes are fresh.
 * - "Delayed" amber dot when backend returned stale quotes.
 * - "Market closed — as of {lastTradingDayLabel}" grey when market is shut.
 */
function LiveIndicator({
  isLive,
  quotesStale,
  liveAsOf,
}: {
  isLive: boolean;
  quotesStale: boolean;
  liveAsOf: string | null;
}) {
  const ms = useMarketStatus();

  if (isLive && liveAsOf) {
    // Format liveAsOf (ISO string) to HH:MM in local time.
    const timeLabel = (() => {
      try {
        const d = new Date(liveAsOf);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      } catch {
        return liveAsOf;
      }
    })();
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-status-success">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-success animate-pulse" />
        LIVE · {timeLabel}
      </span>
    );
  }

  if (quotesStale) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-gold-primary/70">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-primary/70" />
        Delayed
      </span>
    );
  }

  // Market closed (or quotes not fetched yet).
  return (
    <span className="text-[10px] text-ink-tertiary">
      Market closed · {ms.lastTradingDayLabel}
    </span>
  );
}

// ─── PortfolioAreaChart ───────────────────────────────────────────────────────

const AREA_W = 320;
const AREA_H = 150;
const AREA_PAD = { top: 8, right: 4, bottom: 20, left: 4 };

/**
 * Full-width gold area chart rendered from the portfolio performance series.
 * Shows up to the last ~120 data points; falls back to a placeholder if <2
 * points are available.
 */
function PortfolioAreaChart({ series }: { series: PerformancePoint[] }) {
  const recent = series.length > 120 ? series.slice(-120) : series;

  const chart = useMemo(() => {
    if (recent.length < 2) return null;

    const values = recent.map((p) => p.value);
    const { min, max } = robustExtent(values);

    // Flat guard: synthesize a band so the line renders mid-chart.
    const isFlat = max - min === 0;
    const adjustedMin = isFlat ? min - Math.max(Math.abs(min) * 0.1, 0.5) : min;
    const adjustedMax = isFlat ? max + Math.max(Math.abs(max) * 0.1, 0.5) : max;
    const valueRange = adjustedMax - adjustedMin || 1;

    const innerW = AREA_W - AREA_PAD.left - AREA_PAD.right;
    const innerH = AREA_H - AREA_PAD.top - AREA_PAD.bottom;

    const coords = recent.map((p, i) => {
      const x = AREA_PAD.left + (i / Math.max(recent.length - 1, 1)) * innerW;
      const clamped = clampToRange(p.value, adjustedMin, adjustedMax);
      const y = AREA_PAD.top + (1 - (clamped - adjustedMin) / valueRange) * innerH;
      return [x, y] as const;
    });

    const linePath = coords
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(' ');

    const baseline = AREA_H - AREA_PAD.bottom;
    const firstX = coords[0][0].toFixed(1);
    const lastX = coords[coords.length - 1][0].toFixed(1);
    const areaPath = `${linePath} L${lastX} ${baseline} L${firstX} ${baseline} Z`;

    // Date labels: start / middle / end
    const labelIndices = [0, Math.floor((recent.length - 1) / 2), recent.length - 1];
    const dateLabels = labelIndices.map((idx) => {
      const d = new Date(recent[idx].date);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const x = coords[idx][0];
      const anchor: 'start' | 'middle' | 'end' =
        idx === 0 ? 'start' : idx === recent.length - 1 ? 'end' : 'middle';
      return { label, x, anchor };
    });

    return { linePath, areaPath, dateLabels };
  }, [recent]);

  if (!chart) {
    return (
      <div className="h-[150px] w-full flex items-center justify-center rounded-[5px] border border-gold-primary/10 bg-black/20">
        <p className="text-[11px] text-ink-tertiary">Building history…</p>
      </div>
    );
  }

  // Horizontal gridlines (4 lines at 0%, 33%, 67%, 100% of inner height)
  const gridRatios = [0, 1 / 3, 2 / 3, 1];

  return (
    <svg
      viewBox={`0 0 ${AREA_W} ${AREA_H}`}
      className="h-[150px] w-full"
      role="img"
      aria-label="Portfolio performance area chart"
    >
      <defs>
        <linearGradient id="pvAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#F4D97B" stopOpacity="0.50" />
          <stop offset="30%"  stopColor="#E8C96A" stopOpacity="0.25" />
          <stop offset="70%"  stopColor="#C9A646" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#C9A646" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="pvAreaLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#B8911F" />
          <stop offset="42%"  stopColor="#F4D97B" />
          <stop offset="100%" stopColor="#D4B04E" />
        </linearGradient>
      </defs>

      {/* Horizontal gridlines */}
      {gridRatios.map((ratio) => {
        const y = AREA_PAD.top + ratio * (AREA_H - AREA_PAD.top - AREA_PAD.bottom);
        return (
          <line
            key={`g-${ratio}`}
            x1={AREA_PAD.left}
            x2={AREA_W - AREA_PAD.right}
            y1={y}
            y2={y}
            stroke="rgba(201,166,70,0.08)"
            strokeDasharray="4 6"
          />
        );
      })}

      {/* Area fill + stroke line */}
      <path d={chart.areaPath} fill="url(#pvAreaFill)" />
      <path
        d={chart.linePath}
        fill="none"
        stroke="url(#pvAreaLine)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* X-axis date labels */}
      {chart.dateLabels.map(({ label, x, anchor }) => (
        <text
          key={label}
          x={x}
          y={AREA_H - AREA_PAD.bottom + 14}
          textAnchor={anchor}
          fill="rgba(255,255,255,0.38)"
          fontSize="9"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

// ─── PortfolioValuePanel (exported) ──────────────────────────────────────────

const RANGES: TimeRange[] = ['1M', '3M', '6M', 'YTD', '1Y', 'ALL'];

export interface PortfolioValuePanelProps {
  className?: string;
  range: TimeRange;
  /** Full PortfolioDataResult — includes live-quote fields from usePortfolioData. */
  snapshot: PortfolioDataResult;
  /** Optional: when provided, renders range-selector tabs under the chart. */
  onRangeChange?: (r: TimeRange) => void;
}

/**
 * Headline portfolio-value panel.
 *
 * Accepts the full `PortfolioDataResult` from `usePortfolioData` so it can
 * display live-quote freshness, real day change, and honest range-return labels.
 * Embeds a full-width area chart (replacing the old mini sparkline) and an
 * optional range-selector row.
 */
export function PortfolioValuePanel({ className, range, snapshot, onRangeChange }: PortfolioValuePanelProps) {
  // Range label: "1M RETURN", "YTD RETURN", etc. (not "ALL TIME RETURN").
  const rangeLabel = `${range} RETURN`;

  const { isLive, quotesStale, liveAsOf, hasHistoricalSeries } = snapshot;

  return (
    <PremiumFrame className={`${className ?? ''}`}>
      <div className="p-5 flex flex-col gap-0">
        {/* Header row: label + eye icon */}
        <div className="flex items-center justify-between">
          <p className="text-eyebrow uppercase text-ink-tertiary">TOTAL PORTFOLIO VALUE</p>
          <Eye className="h-3.5 w-3.5 text-ink-tertiary" />
        </div>

        {/* Freshness badge */}
        <div className="mt-1">
          <LiveIndicator isLive={isLive} quotesStale={quotesStale} liveAsOf={liveAsOf} />
        </div>

        {/* Headline value */}
        <Price
          value={snapshot.totalValue}
          size="display"
          className="mt-4 block whitespace-nowrap bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text text-[48px] font-normal leading-none text-transparent"
        />

        {/* Range return stat (full-width, no sparkline column) */}
        <div className="mt-6">
          {hasHistoricalSeries ? (
            <Stat
              label={rangeLabel}
              value={<Change value={snapshot.changePercent} />}
              sub={<Change value={snapshot.changeAbs} format="currency" />}
            />
          ) : (
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
                {rangeLabel}
              </p>
              <p className="mt-2 text-[11px] leading-snug text-ink-tertiary">
                Building history — full chart after a few daily snapshots
              </p>
            </div>
          )}
        </div>

        {/* Full-width area chart */}
        <div className="mt-5">
          <PortfolioAreaChart series={snapshot.series} />
        </div>

        {/* Range selector tabs — only when a handler is provided */}
        {onRangeChange && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] uppercase text-ink-tertiary">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRangeChange(r)}
                className={cn(
                  'rounded-[4px] px-2 py-1 transition-colors',
                  range === r
                    ? 'border border-gold-primary/28 bg-gold-primary/10 text-gold-primary'
                    : 'border border-transparent text-ink-tertiary hover:text-gold-primary hover:border-gold-primary/15'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
    </PremiumFrame>
  );
}
