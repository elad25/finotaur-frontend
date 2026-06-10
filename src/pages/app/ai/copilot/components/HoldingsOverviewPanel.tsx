// src/pages/app/ai/copilot/components/HoldingsOverviewPanel.tsx
// =====================================================
// HOLDINGS OVERVIEW — count, top position, largest class, long/short/cash bar.
// All data derived from PortfolioSnapshot (no new endpoints).
// =====================================================

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PremiumFrame } from '../brief/PremiumFrame';
import type { PortfolioSnapshot } from '../hooks/usePortfolioData';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function PanelHeader({ title, action, actionTo }: { title: string; action?: string; actionTo?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[13px] uppercase text-gold-primary">{title}</p>
      {action && actionTo && (
        <Link
          to={actionTo}
          className="rounded-[5px] border border-gold-primary/22 bg-black/30 px-3 py-1 text-[9px] uppercase text-gold-primary hover:bg-gold-primary/10"
        >
          {action}
        </Link>
      )}
    </div>
  );
}

/** Map IB AssetClass codes to display label — mirrors FinotaurCopilotDashboard */
function bucketAssetClass(cls: string | undefined): string {
  const c = (cls ?? '').toUpperCase();
  if (c === 'STK' || c === 'WAR' || c === 'EQUITIES') return 'EQUITIES';
  if (c === 'OPT' || c === 'FOP' || c === 'OPTIONS')   return 'OPTIONS';
  if (c === 'FUT' || c === 'FUTURES')                   return 'FUTURES';
  if (c === 'BOND' || c === 'BONDS')                    return 'BONDS';
  if (c === 'CASH' || c === 'FOREX')                    return 'CASH';
  if (c === 'CMDTY' || c === 'COMMODITIES')             return 'COMMODITIES';
  return 'OTHER';
}

function isCash(cls: string | undefined): boolean {
  return bucketAssetClass(cls) === 'CASH';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  snapshot: PortfolioSnapshot;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function HoldingsOverviewPanel({ snapshot, className }: Props) {
  const { holdings, totalValue } = snapshot;

  const stats = useMemo(() => {
    const gross = totalValue || 1;

    // Non-CASH positions
    const positions = holdings.filter((h) => !isCash(h.assetClass) && h.quantity !== 0);
    const positionCount = positions.length;

    // Top position by absolute market value
    const topPos = positions.reduce(
      (best, h) => (!best || Math.abs(h.marketValue) > Math.abs(best.marketValue) ? h : best),
      null as (typeof positions)[0] | null,
    );
    const topPosWeight = topPos ? (Math.abs(topPos.marketValue) / gross) * 100 : 0;

    // Largest asset class bucket (by market value, excluding CASH)
    const classBuckets = new Map<string, number>();
    for (const h of positions) {
      const label = bucketAssetClass(h.assetClass);
      classBuckets.set(label, (classBuckets.get(label) ?? 0) + Math.abs(h.marketValue));
    }
    let largestClass = '';
    let largestClassPct = 0;
    for (const [label, val] of classBuckets) {
      const pct = (val / gross) * 100;
      if (pct > largestClassPct) {
        largestClassPct = pct;
        largestClass = label;
      }
    }

    // Long / Short / Cash bar
    let longVal = 0;
    let shortVal = 0;
    let cashVal = 0;
    for (const h of holdings) {
      if (isCash(h.assetClass)) {
        cashVal += Math.abs(h.marketValue);
      } else if (h.marketValue >= 0) {
        longVal += h.marketValue;
      } else {
        shortVal += Math.abs(h.marketValue);
      }
    }
    const barTotal = longVal + shortVal + cashVal || 1;
    const longPct  = (longVal  / barTotal) * 100;
    const shortPct = (shortVal / barTotal) * 100;
    const cashPct  = (cashVal  / barTotal) * 100;

    return {
      positionCount,
      topPos,
      topPosWeight,
      largestClass,
      largestClassPct,
      longPct,
      shortPct,
      cashPct,
    };
  }, [holdings, totalValue]);

  const isEmpty = stats.positionCount === 0 && snapshot.totalValue === 0;

  return (
    <PremiumFrame className={`min-h-[210px] ${className ?? ''}`}>
      <div className="p-5">
        <PanelHeader title="HOLDINGS OVERVIEW" action="VIEW ALL" actionTo="/app/ai/copilot/holdings" />

        {isEmpty ? (
          <p className="mt-4 text-xs text-ink-tertiary">
            No positions yet — connect a broker and sync your holdings.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Big count + two stats */}
            <div className="flex items-start gap-4">
              {/* Total positions */}
              <div className="flex-none">
                <p className="font-mono text-4xl leading-none text-gold-primary">
                  {stats.positionCount}
                </p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-ink-tertiary">
                  TOTAL POSITIONS
                </p>
              </div>

              {/* Separator */}
              <div className="mx-1 h-12 w-px bg-gold-primary/14 self-center" />

              {/* Top position */}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] uppercase tracking-[0.12em] text-ink-tertiary">TOP POSITION</p>
                <p className="mt-1 font-mono text-sm text-gold-primary">
                  {stats.topPos ? stats.topPos.symbol : '—'}
                </p>
                <p className="text-[10px] text-ink-secondary">
                  {stats.topPos ? `${stats.topPosWeight.toFixed(1)}% of portfolio` : '—'}
                </p>
              </div>

              {/* Separator */}
              <div className="mx-1 h-12 w-px bg-gold-primary/14 self-center" />

              {/* Largest class */}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] uppercase tracking-[0.12em] text-ink-tertiary">LARGEST CLASS</p>
                <p className="mt-1 text-sm text-gold-primary">
                  {stats.largestClass || '—'}
                </p>
                <p className="text-[10px] text-ink-secondary">
                  {stats.largestClass ? `${stats.largestClassPct.toFixed(1)}% of portfolio` : '—'}
                </p>
              </div>
            </div>

            {/* Segmented bar — Long / Short / Cash */}
            <div>
              <div className="h-2.5 w-full overflow-hidden rounded-full flex">
                {stats.longPct > 0 && (
                  <div
                    className="h-full bg-[#c9a646]"
                    style={{ width: `${stats.longPct}%` }}
                  />
                )}
                {stats.shortPct > 0 && (
                  <div
                    className="h-full bg-[#7a5e16]"
                    style={{ width: `${stats.shortPct}%` }}
                  />
                )}
                {stats.cashPct > 0 && (
                  <div
                    className="h-full bg-white/15"
                    style={{ width: `${stats.cashPct}%` }}
                  />
                )}
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-[2px] bg-[#c9a646]" />
                  <span className="text-ink-secondary">Long</span>
                  <span className="font-mono text-ink-primary ml-1">
                    {stats.longPct.toFixed(0)}%
                  </span>
                </div>
                {stats.shortPct > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-[2px] bg-[#7a5e16]" />
                    <span className="text-ink-secondary">Short</span>
                    <span className="font-mono text-ink-primary ml-1">
                      {stats.shortPct.toFixed(0)}%
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-[2px] bg-white/15" />
                  <span className="text-ink-secondary">Cash</span>
                  <span className="font-mono text-ink-primary ml-1">
                    {stats.cashPct.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PremiumFrame>
  );
}
