// src/hooks/useShadow.ts
// =====================================================
// Shadow v2 — data hooks that wire the scenario engine.
// =====================================================
// useShadowTrade(trade): reads bars + order mods → runs runScenarios when
//   bars exist; falls back to planned-level scenarios when no path data.
// useShadowAggregate(trades): planned aggregate + counts for distribution tab.
// =====================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTradeBars } from '@/hooks/useTradeBars';
import { runScenarios } from '@/lib/shadow/scenarioEngine';
import { computePlannedScenarios, buildAggregate } from '@/lib/journal/plannedScenarios';
import { resolveMultiplier } from '@/lib/journal/assetMultipliers';
import type { ShadowTradeInput, ShadowEngineResult, OrderModification } from '@/lib/shadow/types';
import type { PlannedResult, AggregateResult } from '@/lib/journal/plannedScenarios';
import type { Trade } from '@/hooks/useTradesData';

// ─── DB row type for shadow_order_modifications ───────────────────────────────

interface ShadowModRow {
  kind: 'stop' | 'target';
  price: number;
  event_time: string;
}

// ─── useShadowTrade ───────────────────────────────────────────────────────────

export interface ShadowTradeResult {
  /** Engine result — populated only when bars exist. */
  engine: ShadowEngineResult | null;
  /** Planned-level scenarios — always populated (fallback). */
  planned: PlannedResult;
  /** true when trade_price_bars exist for this trade. */
  hasPath: boolean;
  /** true when shadow_order_modifications exist for this trade. */
  hasMods: boolean;
  /** true while either bars or mods are still loading. */
  isLoading: boolean;
}

export function useShadowTrade(trade: Trade): ShadowTradeResult {
  // 1. Real price bars from trade_price_bars (existing hook).
  const { bars, isLoading: barsLoading } = useTradeBars(trade.id);

  // 2. Order modifications from shadow_order_modifications.
  const { data: modRows, isLoading: modsLoading } = useQuery<OrderModification[]>({
    queryKey: ['shadow-order-mods', trade.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shadow_order_modifications')
        .select('kind, price, event_time')
        .eq('trade_id', trade.id)
        .order('event_time', { ascending: true });

      if (error) throw error;

      return (data as ShadowModRow[]).map((row) => ({
        kind: row.kind,
        price: Number(row.price),
        time: new Date(row.event_time).getTime(),
      }));
    },
    enabled: !!trade.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const modifications: OrderModification[] = modRows ?? [];
  const hasPath = bars.length > 0;
  const hasMods = modifications.length > 0;

  // 3. Always compute planned scenarios (no bars required).
  const planned = useMemo(
    () => computePlannedScenarios(trade),
    [trade],
  );

  // 4. Engine result — only when bars are available.
  const engine = useMemo<ShadowEngineResult | null>(() => {
    if (!hasPath) return null;
    if (!trade.exit_price || !trade.close_at) return null;

    const mult = resolveMultiplier(trade.symbol, trade.multiplier);
    const input: ShadowTradeInput = {
      side: trade.side as 'LONG' | 'SHORT',
      entryPrice: trade.entry_price,
      entryTime: new Date(trade.open_at).getTime(),
      qty: trade.quantity,
      multiplier: mult,
      actualExits: [
        {
          price: trade.exit_price,
          qty: trade.quantity,
          time: new Date(trade.close_at).getTime(),
        },
      ],
      originalStop: trade.stop_price ?? null,
      originalTarget: trade.take_profit_price ?? null,
      modifications,
      pricePath: bars.map((b) => ({
        t: b.t,
        o: b.o,
        h: b.h,
        l: b.l,
        c: b.c,
      })),
      granularity: '1m',
      strategyRules: trade.strategy_id
        ? {
            stopPrice: trade.stop_price ?? null,
            targetPrice: trade.take_profit_price ?? null,
          }
        : null,
      // Real net P&L — lets the engine normalize every hypothetical scenario
      // onto the same net-of-fees basis as the actual trade (see fees.ts).
      netPnlUsd: trade.pnl ?? null,
    };

    return runScenarios(input);
  }, [hasPath, trade, bars, modifications]);

  return {
    engine,
    planned,
    hasPath,
    hasMods,
    isLoading: barsLoading || modsLoading,
  };
}

// ─── useShadowAggregate ───────────────────────────────────────────────────────

export interface ShadowAggregateResult {
  /** Planned-level aggregate (always available — no bars required). */
  planned: AggregateResult;
  /** Number of closed trades that have price bars captured. */
  tracked: number;
  /** Total closed trades. */
  total: number;
}

/**
 * @param trades           All trades (filtered to closed internally).
 * @param trackedTradeIds  Optional real set of trade ids that have captured
 *                         price bars (e.g. from useTrackedTradeIds in
 *                         useTradeBars.ts). When provided, `tracked` is an
 *                         exact count. When omitted, falls back to the
 *                         locked_profit_usd proxy (best-effort — the
 *                         server-side reconcile RPC populates it when bars
 *                         exist, but it is not a direct bar-existence check).
 */
export function useShadowAggregate(
  trades: Trade[],
  trackedTradeIds?: Set<string>,
): ShadowAggregateResult {
  // Closed trades only.
  const closed = useMemo(
    () =>
      trades.filter(
        (t) => t.exit_price != null && t.exit_price > 0 && t.close_at != null,
      ),
    [trades],
  );

  const planned = useMemo(() => buildAggregate(closed), [closed]);

  const tracked = useMemo(() => {
    if (trackedTradeIds) {
      return closed.filter((t) => trackedTradeIds.has(t.id)).length;
    }
    // Fallback proxy: locked_profit_usd as a best-effort estimate of
    // "has excursion bars" when the real tracked-id set isn't available.
    return closed.filter((t) => t.locked_profit_usd != null).length;
  }, [closed, trackedTradeIds]);

  return {
    planned,
    tracked,
    total: closed.length,
  };
}

// ─── useAllTradeModifications ──────────────────────────────────────────────────
// Batched fetch of shadow_order_modifications for MANY trades in a single
// React-Query entry, grouped by trade_id. Mirrors useAllTradeBars' query/key/
// staleTime style (see useTradeBars.ts) and pages through Supabase's 1000-row
// default cap the same way fetchAllTradesForTrader does in useDashboardData.ts.

const MODS_PAGE_SIZE = 1000;
const MODS_MAX_PAGES = 50; // hard safety cap: 50k rows

interface MultiShadowModRow {
  trade_id: string;
  kind: 'stop' | 'target';
  price: number;
  event_time: string;
}

export function useAllTradeModifications(tradeIds: string[]): {
  modsByTrade: Map<string, OrderModification[]>;
  isLoading: boolean;
} {
  // Stable query key: sort ids so insertion order doesn't cause cache misses.
  const sortedIds = [...tradeIds].sort();
  const queryKey = ['shadow-order-mods-multi', sortedIds.join(',')];

  const { data, isLoading } = useQuery<Map<string, OrderModification[]>>({
    queryKey,
    queryFn: async () => {
      const allRows: MultiShadowModRow[] = [];
      let page = 0;

      while (page < MODS_MAX_PAGES) {
        const from = page * MODS_PAGE_SIZE;
        const { data: rows, error } = await supabase
          .from('shadow_order_modifications')
          .select('trade_id, kind, price, event_time')
          .in('trade_id', sortedIds)
          .order('event_time', { ascending: true })
          .range(from, from + MODS_PAGE_SIZE - 1);

        if (error) throw error;

        const pageRows = (rows ?? []) as MultiShadowModRow[];
        allRows.push(...pageRows);
        if (pageRows.length < MODS_PAGE_SIZE) break; // last page
        page++;
      }

      const map = new Map<string, OrderModification[]>();
      for (const row of allRows) {
        const mod: OrderModification = {
          kind: row.kind,
          price: Number(row.price),
          time: new Date(row.event_time).getTime(),
        };
        const existing = map.get(row.trade_id);
        if (existing) {
          existing.push(mod);
        } else {
          map.set(row.trade_id, [mod]);
        }
      }
      return map;
    },
    enabled: tradeIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    modsByTrade: data ?? new Map(),
    isLoading,
  };
}
