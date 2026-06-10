// src/pages/app/ai/copilot/components/TopMoversPanel.tsx
// =====================================================
// TOP MOVERS — shows user's own holdings ranked by intraday day %
// Data: holdings from PortfolioSnapshot + live quotes from
// usePortfolioQuotes (same /api/market-data/watchlist-quotes endpoint).
// =====================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PremiumFrame } from '../brief/PremiumFrame';
import { TickerLogo } from './TickerLogo';
import { usePortfolioQuotes } from '@/hooks/usePortfolioQuotes';
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

/** Exclude asset classes that are not meaningful to rank by day % */
function isRankable(assetClass: string | undefined): boolean {
  const c = (assetClass ?? '').toUpperCase();
  // Skip CASH and FOREX rows — they don't have a meaningful day change
  return c !== 'CASH' && c !== 'FOREX';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  snapshot: PortfolioSnapshot;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TopMoversPanel({ snapshot, className }: Props) {
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers');

  // Collect equity/options/futures symbols (excludes CASH/FOREX)
  const symbols = useMemo(
    () =>
      snapshot.holdings
        .filter((h) => isRankable(h.assetClass) && h.quantity !== 0)
        .map((h) => h.symbol.toUpperCase()),
    [snapshot.holdings],
  );

  const { priceMap } = usePortfolioQuotes(symbols);

  // Build ranked list: join holding with live quote, sort by |day %|
  const rankedHoldings = useMemo(() => {
    return snapshot.holdings
      .filter((h) => isRankable(h.assetClass) && h.quantity !== 0)
      .map((h) => {
        const quote = priceMap.get(h.symbol.toUpperCase());
        const dayPct = quote?.changePercent ?? null;
        const lastPrice = quote?.price ?? h.marketPrice;
        return { ...h, dayPct, lastPrice };
      })
      .filter((h) => h.dayPct !== null) as Array<{
        symbol: string;
        name: string;
        quantity: number;
        avgCost: number;
        marketPrice: number;
        marketValue: number;
        unrealizedPnl: number;
        unrealizedPnlPercent: number;
        assetClass?: string;
        dayPct: number;
        lastPrice: number;
      }>;
  }, [snapshot.holdings, priceMap]);

  const gainers = useMemo(
    () =>
      [...rankedHoldings]
        .filter((h) => h.dayPct > 0)
        .sort((a, b) => b.dayPct - a.dayPct)
        .slice(0, 5),
    [rankedHoldings],
  );

  const losers = useMemo(
    () =>
      [...rankedHoldings]
        .filter((h) => h.dayPct < 0)
        .sort((a, b) => a.dayPct - b.dayPct) // most negative first
        .slice(0, 5),
    [rankedHoldings],
  );

  const items = tab === 'gainers' ? gainers : losers;

  return (
    <PremiumFrame className={`min-h-[260px] ${className ?? ''}`}>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <PanelHeader title="TOP MOVERS" />
          <div className="flex items-center gap-1">
            {(['gainers', 'losers'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-[4px] px-3 py-1 text-[9px] uppercase transition-colors ${
                  tab === t
                    ? 'border border-gold-primary/28 bg-gold-primary/10 text-gold-primary'
                    : 'border border-transparent text-ink-tertiary hover:text-gold-primary hover:border-gold-primary/15'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Link
            to="/app/ai/copilot/holdings"
            className="rounded-[5px] border border-gold-primary/22 bg-black/30 px-3 py-1 text-[9px] uppercase text-gold-primary hover:bg-gold-primary/10"
          >
            VIEW ALL
          </Link>
        </div>

        <div className="mt-4 space-y-1">
          {items.length === 0 ? (
            <p className="py-8 text-center text-[11px] leading-relaxed text-ink-tertiary">
              {symbols.length === 0
                ? 'No positions to rank yet — movers appear once your holdings sync.'
                : 'No movers available — live quotes load during market hours.'}
            </p>
          ) : (
            items.map((h) => {
              const isPositive = h.dayPct >= 0;
              const pctClass = isPositive ? 'text-gold-primary' : 'text-num-negative';
              const pctStr = `${isPositive ? '+' : ''}${h.dayPct.toFixed(2)}%`;

              return (
                <div
                  key={h.symbol}
                  className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-3 rounded-[6px] px-2 py-2 hover:bg-gold-primary/[0.045]"
                >
                  <TickerLogo ticker={h.symbol} size={32} className="h-8 w-8 rounded-[3px]" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-white">{h.symbol}</p>
                    <p className="truncate text-[10px] text-ink-tertiary">{h.name}</p>
                  </div>
                  <span className="font-mono text-[11px] text-ink-primary">
                    ${h.lastPrice.toFixed(2)}
                  </span>
                  <span className={`font-mono text-[11px] ${pctClass}`}>{pctStr}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PremiumFrame>
  );
}
