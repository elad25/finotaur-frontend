/**
 * PortfolioValuePanel — headline portfolio value card.
 *
 * Displays the mark-to-market total portfolio value (intraday when market is
 * open), the selected-range return, the real intraday day-change, available
 * cash, a LIVE/Delayed/Closed freshness indicator, and a mini sparkline.
 *
 * Honesty rules enforced here:
 *  - Range-return label reflects the actual selected range ("1M RETURN"), not "ALL TIME RETURN".
 *  - Day change is real (Σ qty × quote.change) or "—" when unavailable.
 *  - When <2 snapshots exist, range-return is hidden with an explanatory message.
 *  - LIVE dot shows "as of HH:MM" when quotes are fresh; "Delayed" or "Market closed" otherwise.
 */

import type { ReactNode } from 'react';
import { Eye } from 'lucide-react';
import { Change, Price } from '@/components/ds/NumberDisplay';
import { useMarketStatus } from '@/lib/marketStatus';
import { robustExtent, clampToRange } from '@/lib/portfolio/metrics';
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

// ─── PortfolioSparkline ───────────────────────────────────────────────────────

function PortfolioSparkline({ series }: { series: PerformancePoint[] }) {
  if (series.length < 2) {
    return <div className="h-7 w-28" aria-hidden="true" />;
  }
  const recent = series.slice(-30);
  const values = recent.map((p) => p.value);
  const { min, max } = robustExtent(values);
  const valueRange = max - min || 1;
  const W = 120;
  const H = 28;

  const points = recent.map((p, i) => {
    const x = (i / Math.max(recent.length - 1, 1)) * W;
    const clampedValue = clampToRange(p.value, min, max);
    const y = H - ((clampedValue - min) / valueRange) * H;
    return [x, y] as const;
  });
  const line = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-28 text-gold-primary" aria-hidden="true">
      <path d={area} fill="currentColor" opacity="0.12" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── PortfolioValuePanel (exported) ──────────────────────────────────────────

export interface PortfolioValuePanelProps {
  className?: string;
  range: TimeRange;
  /** Full PortfolioDataResult — includes live-quote fields from usePortfolioData. */
  snapshot: PortfolioDataResult;
}

/**
 * Headline portfolio-value panel.
 *
 * Accepts the full `PortfolioDataResult` from `usePortfolioData` so it can
 * display live-quote freshness, real day change, and honest range-return labels.
 * The old `PortfolioSnapshot` narrowing is intentionally avoided here — this
 * panel needs the extended fields.
 */
export function PortfolioValuePanel({ className, range, snapshot }: PortfolioValuePanelProps) {
  // Sum all CASH-class holdings to derive cash balance.
  const cashBalance = snapshot.holdings
    .filter((h) => h.assetClass === 'CASH')
    .reduce((sum, h) => sum + h.marketValue, 0);

  // Range label: "1M RETURN", "YTD RETURN", etc. (not "ALL TIME RETURN").
  const rangeLabel = `${range} RETURN`;

  const { isLive, quotesStale, liveAsOf, dayChangeAbs, dayChangePercent, hasHistoricalSeries } = snapshot;

  return (
    <PremiumFrame className={`min-h-[260px] ${className ?? ''}`}>
      <div className="p-5 h-full grid grid-rows-[1fr_auto]">
        <div>
          {/* Header row: label + live indicator */}
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

          {/* Stats row: range return (left) + sparkline (right) */}
          <div className="mt-6 grid grid-cols-[1fr_auto] gap-5 items-end">
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
            <PortfolioSparkline series={snapshot.series} />
          </div>

          {/* Day change row */}
          <div className="mt-4">
            <Stat
              label="TODAY'S CHANGE"
              value={
                dayChangeAbs !== null && dayChangePercent !== null ? (
                  <Change value={dayChangePercent} />
                ) : (
                  <span className="font-mono text-sm text-ink-tertiary">—</span>
                )
              }
              sub={
                dayChangeAbs !== null ? (
                  <Change value={dayChangeAbs} format="currency" />
                ) : null
              }
            />
          </div>
        </div>

        {/* Footer: available cash */}
        <div className="border-t border-gold-primary/12 mt-6 pt-5">
          <Stat label="AVAILABLE CASH" value={<Price value={cashBalance} size="small" />} />
        </div>
      </div>
    </PremiumFrame>
  );
}
