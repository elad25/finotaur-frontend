// src/pages/app/ai/copilot/components/MarketOverviewPanel.tsx
// =====================================================
// MARKET OVERVIEW — S&P 500, NASDAQ, DOW JONES, VIX.
// Uses the ungated /api/market-data/watchlist-quotes endpoint
// via usePortfolioQuotes (same helper the watchlist uses).
// Refreshes every 5 minutes; degrades gracefully on failure.
// =====================================================

import { useMemo, useEffect, useState, useRef } from 'react';
import { PremiumFrame } from '../brief/PremiumFrame';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MarketQuote {
  symbol: string;
  label: string;
  price: number | null;
  changePercent: number | null;
}

interface WatchlistItem {
  symbol: string;
  price: number | null;
  changePercent: number | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MARKET_SYMBOLS: Array<{ symbol: string; label: string }> = [
  { symbol: '^GSPC',  label: 'S&P 500'   },
  { symbol: '^IXIC',  label: 'NASDAQ'    },
  { symbol: '^DJI',   label: 'DOW JONES' },
  { symbol: '^VIX',   label: 'VIX'       },
];

const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

// ─── Hook ────────────────────────────────────────────────────────────────────

function useMarketIndexQuotes(): { quotes: MarketQuote[]; error: boolean } {
  const [quotes, setQuotes] = useState<MarketQuote[]>(
    MARKET_SYMBOLS.map(({ symbol, label }) => ({ symbol, label, price: null, changePercent: null })),
  );
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const encoded = encodeURIComponent(MARKET_SYMBOLS.map((m) => m.symbol).join(','));
        const res = await fetch(`/api/market-data/watchlist-quotes?symbols=${encoded}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { quotes: WatchlistItem[] };
        if (cancelled) return;

        const map = new Map<string, WatchlistItem>();
        for (const item of json.quotes ?? []) {
          if (item.symbol) map.set(item.symbol.toUpperCase(), item);
        }

        setQuotes(
          MARKET_SYMBOLS.map(({ symbol, label }) => {
            const q = map.get(symbol.toUpperCase());
            return {
              symbol,
              label,
              price: q?.price ?? null,
              changePercent: q?.changePercent ?? null,
            };
          }),
        );
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      }
    };

    void load();

    // Set up 5-minute refresh
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        void load();
        schedule();
      }, REFRESH_MS);
    };
    schedule();

    return () => {
      cancelled = true;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return { quotes, error };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  className?: string;
}

export function MarketOverviewPanel({ className }: Props) {
  const { quotes, error } = useMarketIndexQuotes();

  const formatted = useMemo(
    () =>
      quotes.map((q) => {
        const pct = q.changePercent;
        const isPos = pct !== null && pct >= 0;
        const pctStr =
          pct !== null
            ? `${isPos ? '+' : ''}${pct.toFixed(2)}%`
            : '—';
        const priceStr =
          q.price !== null
            ? q.symbol === '^VIX'
              ? q.price.toFixed(2)          // VIX no dollar sign
              : q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '—';
        const pctClass =
          pct === null
            ? 'text-ink-tertiary'
            : isPos
            ? 'text-gold-primary'
            : 'text-num-negative';

        return { ...q, priceStr, pctStr, pctClass };
      }),
    [quotes],
  );

  return (
    <PremiumFrame className={`min-h-[210px] ${className ?? ''}`}>
      <div className="p-5">
        <p className="text-[13px] uppercase text-gold-primary">MARKET OVERVIEW</p>

        {error ? (
          <p className="mt-4 text-[11px] text-ink-tertiary">Market data unavailable.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {formatted.map((q) => (
              <div
                key={q.symbol}
                className="flex items-center justify-between gap-2 border-b border-gold-primary/8 pb-3 last:border-b-0 last:pb-0"
              >
                <p className="text-[11px] uppercase text-ink-secondary">{q.label}</p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[12px] text-ink-primary tabular-nums">
                    {q.priceStr}
                  </span>
                  <span className={`font-mono text-[11px] tabular-nums ${q.pctClass}`}>
                    {q.pctStr}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PremiumFrame>
  );
}
