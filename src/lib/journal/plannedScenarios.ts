// src/lib/journal/plannedScenarios.ts
// =====================================================
// Planned-level what-if scenarios — pure, no React, no I/O.
// Computes four scenarios from a trade's recorded price levels only:
//   actual, stop, target, breakeven.
// Also aggregates across all closed trades for the Total tab.
// =====================================================

import type { Trade } from '@/hooks/useTradesData';
import { resolveMultiplier } from '@/lib/journal/assetMultipliers';
import { estimateFeeUsd } from '@/lib/journal/fees';

function pnlAt(price: number, trade: Trade, mult: number): number {
  const diff =
    trade.side === 'LONG'
      ? price - trade.entry_price
      : trade.entry_price - price;
  return diff * trade.quantity * mult;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlannedKey = 'actual' | 'stop' | 'target' | 'breakeven';

export interface PlannedScenario {
  key: PlannedKey;
  label: string;
  pnl: number | null;           // null when the level is not set
  exitPrice: number | null;
  deltaVsActual: number | null;
  available: boolean;
  detail: string;
}

export interface PlannedResult {
  actualPnl: number;
  scenarios: PlannedScenario[];
}

// ─── Core computation ─────────────────────────────────────────────────────────

export function computePlannedScenarios(trade: Trade): PlannedResult {
  const mult = resolveMultiplier(trade.symbol, trade.multiplier);
  const exitPrice = trade.exit_price ?? trade.entry_price;

  // grossActualUsd is the price-only baseline (no fees) — used both as the
  // fee-estimation baseline and as the actual fallback when trade.pnl is
  // absent. actualPnl prefers the real net trade.pnl when present.
  const grossActualUsd = pnlAt(exitPrice, trade, mult);
  const actualPnl = trade.pnl != null ? trade.pnl : grossActualUsd;
  // Per-trade fee estimate, subtracted from every HYPOTHETICAL scenario below
  // so they're compared on the same net-of-fees basis as actualPnl.
  const feeUsd = estimateFeeUsd(grossActualUsd, trade.pnl, trade.quantity);

  // ── actual ──────────────────────────────────────────────────────────────────
  const actual: PlannedScenario = {
    key: 'actual',
    label: 'Your actual',
    pnl: actualPnl,
    exitPrice,
    deltaVsActual: 0,
    available: true,
    detail: 'What actually happened.',
  };

  // ── stop ─────────────────────────────────────────────────────────────────────
  const hasStop = trade.stop_price != null && trade.stop_price > 0;
  const stopPnl = hasStop ? pnlAt(trade.stop_price!, trade, mult) - feeUsd : null;
  const stop: PlannedScenario = {
    key: 'stop',
    label: 'Exited at original stop',
    pnl: stopPnl,
    exitPrice: hasStop ? trade.stop_price! : null,
    deltaVsActual: stopPnl != null ? stopPnl - actualPnl : null,
    available: hasStop,
    detail: hasStop
      ? 'If the trade had closed at your original stop.'
      : 'No stop recorded for this trade.',
  };

  // ── target ───────────────────────────────────────────────────────────────────
  const hasTarget =
    trade.take_profit_price != null && trade.take_profit_price > 0;
  const targetPnl = hasTarget
    ? pnlAt(trade.take_profit_price!, trade, mult) - feeUsd
    : null;
  const target: PlannedScenario = {
    key: 'target',
    label: 'Held to original target',
    pnl: targetPnl,
    exitPrice: hasTarget ? trade.take_profit_price! : null,
    deltaVsActual: targetPnl != null ? targetPnl - actualPnl : null,
    available: hasTarget,
    detail: hasTarget
      ? 'If the trade had closed at your original target.'
      : 'No target recorded for this trade.',
  };

  // ── breakeven ────────────────────────────────────────────────────────────────
  const breakevenPnl = pnlAt(trade.entry_price, trade, mult) - feeUsd; // ≈ -feeUsd
  const breakeven: PlannedScenario = {
    key: 'breakeven',
    label: 'Closed at break-even',
    pnl: breakevenPnl,
    exitPrice: trade.entry_price,
    deltaVsActual: breakevenPnl - actualPnl,
    available: true,
    detail: 'If you had scratched the trade at your entry.',
  };

  return {
    actualPnl,
    scenarios: [actual, stop, target, breakeven],
  };
}

// ─── Aggregate for Total tab ──────────────────────────────────────────────────

export interface CumulativePoint {
  idx: number;
  label: string;       // e.g. "Jun 18"
  actual: number;      // cumulative $
  stop: number;
  target: number;
  breakeven: number;
}

export interface AggregateResult {
  points: CumulativePoint[];
  totals: { actual: number; stop: number; target: number; breakeven: number };
  coverage: { total: number; withStop: number; withTarget: number };
}

export function buildAggregate(trades: Trade[]): AggregateResult {
  // Filter to closed trades
  const closed = trades.filter(
    (t) => t.exit_price != null && t.exit_price > 0 && t.close_at != null,
  );

  // Sort ascending by close_at (fallback open_at)
  const sorted = [...closed].sort((a, b) => {
    const da = new Date(a.close_at ?? a.open_at).getTime();
    const db = new Date(b.close_at ?? b.open_at).getTime();
    return da - db;
  });

  if (sorted.length === 0) {
    return {
      points: [],
      totals: { actual: 0, stop: 0, target: 0, breakeven: 0 },
      coverage: { total: 0, withStop: 0, withTarget: 0 },
    };
  }

  let cumActual = 0;
  let cumStop = 0;
  let cumTarget = 0;
  let cumBreakeven = 0;
  let withStop = 0;
  let withTarget = 0;

  const points: CumulativePoint[] = sorted.map((t, i) => {
    const result = computePlannedScenarios(t);
    const scenarioMap = Object.fromEntries(result.scenarios.map((s) => [s.key, s]));

    const actualDelta = result.actualPnl;
    // For stop/target: when not available, fall back to actual pnl (carry-forward logic)
    const stopDelta =
      scenarioMap['stop']?.available && scenarioMap['stop']?.pnl != null
        ? scenarioMap['stop'].pnl
        : actualDelta;
    const targetDelta =
      scenarioMap['target']?.available && scenarioMap['target']?.pnl != null
        ? scenarioMap['target'].pnl
        : actualDelta;
    const breakevenDelta =
      scenarioMap['breakeven']?.pnl != null
        ? scenarioMap['breakeven'].pnl
        : 0;

    if (t.stop_price != null && t.stop_price > 0) withStop++;
    if (t.take_profit_price != null && t.take_profit_price > 0) withTarget++;

    cumActual += actualDelta;
    cumStop += stopDelta;
    cumTarget += targetDelta;
    cumBreakeven += breakevenDelta;

    const label = new Date(t.close_at ?? t.open_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    return {
      idx: i,
      label,
      actual: cumActual,
      stop: cumStop,
      target: cumTarget,
      breakeven: cumBreakeven,
    };
  });

  const last = points[points.length - 1];
  return {
    points,
    totals: {
      actual: last.actual,
      stop: last.stop,
      target: last.target,
      breakeven: last.breakeven,
    },
    coverage: {
      total: sorted.length,
      withStop,
      withTarget,
    },
  };
}
