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
import type { ShadowTradeInput, ShadowEngineResult, OrderModification } from '@/lib/shadow/types';
import type { PlannedResult, AggregateResult } from '@/lib/journal/plannedScenarios';
import type { Trade } from '@/hooks/useTradesData';

// ─── Multiplier resolution (mirrors plannedScenarios.ts) ─────────────────────

const ASSET_MULTIPLIERS: Record<string, number> = {
  ES: 50, MES: 5, NQ: 20, MNQ: 2, YM: 5,
  RTY: 50, CL: 1000, GC: 100, SI: 5000, ZB: 1000, ZN: 1000,
};

function resolveMultiplier(trade: Trade): number {
  if (trade.multiplier != null && trade.multiplier > 0) return trade.multiplier;
  const sym = (trade.symbol ?? '').toUpperCase().trim().replace(/\d+$/, '');
  return ASSET_MULTIPLIERS[sym] ?? 1;
}

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

    const mult = resolveMultiplier(trade);
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

export function useShadowAggregate(trades: Trade[]): ShadowAggregateResult {
  // Closed trades only.
  const closed = useMemo(
    () =>
      trades.filter(
        (t) => t.exit_price != null && t.exit_price > 0 && t.close_at != null,
      ),
    [trades],
  );

  const planned = useMemo(() => buildAggregate(closed), [closed]);

  // tracked count: we use locked_profit_usd as a proxy for "has excursion data"
  // because the server-side reconcile RPC populates it when bars exist.
  // This is a best-effort estimate — actual bar-existence requires per-trade queries.
  const tracked = useMemo(
    () => closed.filter((t) => t.locked_profit_usd != null).length,
    [closed],
  );

  return {
    planned,
    tracked,
    total: closed.length,
  };
}
