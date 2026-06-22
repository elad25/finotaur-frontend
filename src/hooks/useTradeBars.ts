// src/hooks/useTradeBars.ts
// =====================================================
// Trade excursion data — reconcile RPC + bars query
// =====================================================
// useTradeReconcile(): fires once on mount to ensure any freshly-captured
//   server excursions are linked to trades before the page reads metrics.
//   Best-effort — errors are silently ignored (the RPC is idempotent).
//
// useTradeBars(tradeId?): fetches trade_price_bars for one trade, returns
//   PriceBar[] compatible with analyzeWhatIf() in whatIfEngine.ts.
// =====================================================

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PriceBar } from '@/lib/journal/whatIfEngine';

// ─── useTradeReconcile ────────────────────────────────────────────────────────
// Calls reconcile_trade_excursions(p_user_id := null) once per page mount.
// null means "reconcile for the currently-authenticated user" (the RPC
// uses auth.uid() as the fallback).  Errors are swallowed — the RPC is
// purely additive (fills MFE/MAE columns) and does not affect correctness
// if it fails; the page degrades gracefully to the no-bars path.

export function useTradeReconcile(): void {
  useEffect(() => {
    supabase
      .rpc('reconcile_trade_excursions', { p_user_id: null })
      .then(({ error }) => {
        if (error) {
          // Best-effort — log only in dev, never surface to the user.
          if (import.meta.env.DEV) {
            console.warn('[useTradeBars] reconcile_trade_excursions failed:', error.message);
          }
        }
      });
    // Run once per mount — no dependency on anything that changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ─── Row types returned by Supabase ──────────────────────────────────────────

interface TradePriceBarRow {
  bar_time: string;
  o: number;
  h: number;
  l: number;
  c: number;
  timeframe: string | null;
  source: string | null;
}

interface MultiTradePriceBarRow {
  trade_id: string;
  bar_time: string;
  o: number;
  h: number;
  l: number;
  c: number;
}

// ─── useTradeBars ─────────────────────────────────────────────────────────────

export function useTradeBars(tradeId?: string): {
  bars: PriceBar[];
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery<PriceBar[]>({
    queryKey: ['trade-price-bars', tradeId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('trade_price_bars')
        .select('bar_time, o, h, l, c, timeframe, source')
        .eq('trade_id', tradeId!)
        .order('bar_time', { ascending: true });

      if (error) throw error;

      return (rows as TradePriceBarRow[]).map((row) => ({
        t: new Date(row.bar_time).getTime(),
        o: Number(row.o),
        h: Number(row.h),
        l: Number(row.l),
        c: Number(row.c),
      }));
    },
    enabled: !!tradeId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    bars: data ?? [],
    isLoading,
  };
}

// ─── useAllTradeBars ──────────────────────────────────────────────────────────
// Fetches bars for MANY trades in a single query, grouped by trade_id.
// NOTE: The .in() list is unbounded — safe for typical user trade counts
// (hundreds at most). If this ever scales to thousands of ids, paginate or
// batch into chunks of ~200.

export function useAllTradeBars(tradeIds: string[]): {
  barsByTrade: Map<string, PriceBar[]>;
  isLoading: boolean;
} {
  // Stable query key: sort ids so insertion order doesn't cause cache misses.
  const sortedIds = [...tradeIds].sort();
  const queryKey = ['trade-price-bars-multi', sortedIds.join(',')];

  const { data, isLoading } = useQuery<Map<string, PriceBar[]>>({
    queryKey,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('trade_price_bars')
        .select('trade_id, bar_time, o, h, l, c')
        .in('trade_id', sortedIds)
        .order('bar_time', { ascending: true });

      if (error) throw error;

      const map = new Map<string, PriceBar[]>();
      for (const row of (rows as MultiTradePriceBarRow[])) {
        const bar: PriceBar = {
          t: new Date(row.bar_time).getTime(),
          o: Number(row.o),
          h: Number(row.h),
          l: Number(row.l),
          c: Number(row.c),
        };
        const existing = map.get(row.trade_id);
        if (existing) {
          existing.push(bar);
        } else {
          map.set(row.trade_id, [bar]);
        }
      }
      return map;
    },
    enabled: tradeIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    barsByTrade: data ?? new Map(),
    isLoading,
  };
}
