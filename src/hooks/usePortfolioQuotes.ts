// src/hooks/usePortfolioQuotes.ts
// ═══════════════════════════════════════════════════════════════
// Fetches current price + changePercent per symbol from the
// working single-symbol endpoint: /api/market-data/quote-extended/{SYMBOL}
// Replaces the broken batch endpoint /api/market-data/quotes.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useRef } from 'react';

export interface QuoteLite {
  price: number | null;
  changePercent: number | null;
}

interface QuoteExtendedResponse {
  symbol?: string;
  price?: number | null;
  changePercent?: number | null;
  [key: string]: unknown;
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
      const results = await Promise.all(
        stableSymbols.map(async (sym) => {
          try {
            const res = await fetch(
              `/api/market-data/quote-extended/${encodeURIComponent(sym)}`,
            );
            if (!res.ok) {
              return [sym, { price: null, changePercent: null }] as const;
            }
            const json = (await res.json()) as QuoteExtendedResponse;
            const price =
              typeof json.price === 'number' ? json.price : null;
            const changePercent =
              typeof json.changePercent === 'number' ? json.changePercent : null;
            return [sym, { price, changePercent }] as const;
          } catch {
            return [sym, { price: null, changePercent: null }] as const;
          }
        }),
      );

      // Discard if a newer symbol set was requested while we were fetching
      if (currentKeyRef.current !== key) return;

      setPriceMap(new Map(results));
      setLoading(false);
    };

    fetchAll();
  }, [stableKey, stableSymbols]);

  return { priceMap, loading };
}
