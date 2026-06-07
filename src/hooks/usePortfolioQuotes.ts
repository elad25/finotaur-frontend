// src/hooks/usePortfolioQuotes.ts
// ═══════════════════════════════════════════════════════════════
// Fetches current price + changePercent per symbol from the
// ungated batch endpoint: /api/market-data/watchlist-quotes
// One request for all symbols — no per-user price gate.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useRef } from 'react';

export interface QuoteLite {
  price: number | null;
  changePercent: number | null;
}

interface WatchlistQuoteItem {
  symbol: string;
  price: number | null;
  changePercent: number | null;
}

interface WatchlistQuotesResponse {
  quotes: WatchlistQuoteItem[];
}

export function usePortfolioQuotes(symbols: string[]): {
  priceMap: Map<string, QuoteLite>;
  loading: boolean;
} {
  const [priceMap, setPriceMap] = useState<Map<string, QuoteLite>>(new Map());
  const [loading, setLoading] = useState(false);

  // Stable, sorted, unique, uppercase list — only refetch when the SET changes
  const stableKey = useMemo(() => {
    const unique = Array.from(
      new Set(symbols.map((s) => s.toUpperCase()).filter(Boolean)),
    ).sort();
    return unique.join(',');
  }, [symbols]);

  const stableSymbols = useMemo(
    () => (stableKey ? stableKey.split(',') : []),
    [stableKey],
  );

  // Stale-guard: if the symbol set changes while a fetch is in flight, discard old results
  const currentKeyRef = useRef<string>('');

  useEffect(() => {
    if (stableSymbols.length === 0) {
      setPriceMap(new Map());
      setLoading(false);
      return;
    }

    const key = stableKey;
    currentKeyRef.current = key;
    setLoading(true);

    const fetchAll = async () => {
      try {
        const res = await fetch(
          `/api/market-data/watchlist-quotes?symbols=${encodeURIComponent(stableKey)}`,
        );
        if (!res.ok) {
          // Discard if a newer symbol set was requested while we were fetching
          if (currentKeyRef.current !== key) return;
          setPriceMap(new Map());
          setLoading(false);
          return;
        }
        const json = (await res.json()) as WatchlistQuotesResponse;

        // Discard if a newer symbol set was requested while we were fetching
        if (currentKeyRef.current !== key) return;

        const map = new Map<string, QuoteLite>();
        for (const item of json.quotes ?? []) {
          const sym = item.symbol?.toUpperCase();
          if (!sym) continue;
          map.set(sym, {
            price: typeof item.price === 'number' ? item.price : null,
            changePercent:
              typeof item.changePercent === 'number' ? item.changePercent : null,
          });
        }
        setPriceMap(map);
      } catch {
        if (currentKeyRef.current !== key) return;
        setPriceMap(new Map());
      } finally {
        if (currentKeyRef.current === key) {
          setLoading(false);
        }
      }
    };

    fetchAll();
  }, [stableKey, stableSymbols]);

  return { priceMap, loading };
}
