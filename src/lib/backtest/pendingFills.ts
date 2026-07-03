// ==========================================
// PENDING ORDER FILL ENGINE — pure, side-effect-free
// ==========================================
// Extracted from BacktestChart.tsx's handleReplayBarReveal (Phase 6 pending-
// order loop) so the fill logic can be unit-tested without mounting a chart
// or touching `window`. Zero behavior change for LIMIT/MIT on extraction;
// STOP_LIMIT + STOP gap-realism are approved behavior changes (see below).
//
// Order-type vocabulary (NinjaTrader semantics, mirrors useBacktestSession.ts):
//   LIMIT      — touch (buy: low≤T / sell: high≥T), fills limit-or-better, no slippage.
//   MIT        — touch (same as LIMIT), fills at T (market), slippage applies.
//   STOP       — breakout (buy: high≥T / sell: low≤T), fills at T with gap realism
//                (see below), slippage applies.
//   STOP_LIMIT — breakout trigger like STOP, but enforces its OWN limit price L
//                once triggered — it will NOT fill worse than L. Two-phase:
//                untriggered → triggered (waiting at the limit) → filled.

import type { Bar } from '@/components/charting/types';
import type { PendingOrder } from '@/hooks/useBacktestSession';

export type PendingFillAction =
  | { action: 'none' }
  | { action: 'trigger' }
  | { action: 'fill'; fillPrice: number };

/**
 * Evaluate a single pending order against a revealed bar.
 *
 * - 'none'    — order not touched this bar, no state change.
 * - 'trigger' — STOP_LIMIT breakout condition met but the limit price was not
 *               reachable this bar; caller should mark the order `triggeredAt`
 *               and keep scanning (does NOT consume the one-fill-per-bar budget).
 * - 'fill'    — order fills at `fillPrice` this bar; caller dispatches the fill
 *               and stops scanning further orders (one-fill-per-bar budget).
 */
export function evaluatePendingOrder(order: PendingOrder, bar: Bar): PendingFillAction {
  const T = order.triggerPrice;

  if (order.type === 'LIMIT') {
    if (order.side === 'LONG' && bar.low <= T) {
      // Limit-or-better: BUY LIMIT fills at min(triggerPrice, bar.open) so a
      // gap-down open (or a bar that opened well below the limit) doesn't produce
      // a fill price that is WORSE than the current market (the original bug where
      // a LONG LIMIT at 202.72 with market at 200.09 filled at 202.72 instead of
      // 200.09). bar.open is always available on a revealed bar.
      return { action: 'fill', fillPrice: Math.min(T, bar.open) };
    }
    if (order.side === 'SHORT' && bar.high >= T) {
      // SELL LIMIT fills at max(triggerPrice, bar.open) — seller gets limit or better.
      return { action: 'fill', fillPrice: Math.max(T, bar.open) };
    }
    return { action: 'none' };
  }

  if (order.type === 'MIT') {
    // Market-If-Touched: same touch condition as LIMIT, but fills at trigger (market).
    if (order.side === 'LONG' && bar.low <= T) return { action: 'fill', fillPrice: T };
    if (order.side === 'SHORT' && bar.high >= T) return { action: 'fill', fillPrice: T };
    return { action: 'none' };
  }

  if (order.type === 'STOP_LIMIT') {
    const L = order.limitPrice ?? T;

    if (order.triggeredAt != null) {
      // Already triggered — behaves as a working LIMIT resting at L.
      if (order.side === 'LONG' && bar.low <= L) {
        return { action: 'fill', fillPrice: Math.min(L, bar.open) };
      }
      if (order.side === 'SHORT' && bar.high >= L) {
        return { action: 'fill', fillPrice: Math.max(L, bar.open) };
      }
      return { action: 'none' };
    }

    // Untriggered: breakout condition first (same direction as STOP).
    if (order.side === 'LONG') {
      if (bar.high < T) return { action: 'none' };
      // Breakout touched this bar. Activation price = worse of (T, bar.open) —
      // mirrors gap-realism: if the bar opened above T, the market already gapped
      // through the trigger before this bar's action was knowable.
      const A = Math.max(T, bar.open);
      if (A <= L) {
        // Activation price is still marketable at/through the limit → fill now.
        return { action: 'fill', fillPrice: A };
      }
      if (bar.low <= L) {
        // Same-bar pullback: after gapping past T, price pulled back down to
        // reach L within the same bar. One-bar simplification — we can't know
        // the true intra-bar sequencing, so we allow the fill at L.
        return { action: 'fill', fillPrice: L };
      }
      return { action: 'trigger' };
    } else {
      if (bar.low > T) return { action: 'none' };
      const A = Math.min(T, bar.open);
      if (A >= L) {
        return { action: 'fill', fillPrice: A };
      }
      if (bar.high >= L) {
        return { action: 'fill', fillPrice: L };
      }
      return { action: 'trigger' };
    }
  }

  // STOP (Stop Market) — approved gap-realism fix: on gap-through, fill at the
  // worse of (trigger, bar.open) instead of always at the trigger price. A LONG
  // entry stop sits ABOVE market (triggers on bar.high >= T); a SHORT entry stop
  // sits BELOW (triggers on bar.low <= T). Trigger DIRECTION is unchanged — only
  // the fill PRICE reflects that a gap-through open is a worse fill than T.
  if (order.side === 'LONG' && bar.high >= T) {
    return { action: 'fill', fillPrice: Math.max(T, bar.open) };
  }
  if (order.side === 'SHORT' && bar.low <= T) {
    return { action: 'fill', fillPrice: Math.min(T, bar.open) };
  }
  return { action: 'none' };
}
