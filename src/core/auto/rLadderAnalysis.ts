// ============================================================================
// FILL-ANCHORED R-LADDER ANALYSIS
// ============================================================================
//
// The engine's own "take profit" outcome can be misleading: OrderExecutionEngine
// fills market/limit orders at (or after) the NEXT bar's open, which can gap
// past the take-profit level that was priced off the signal's reference entry
// -- producing a recorded "win" whose actual fill sat on the losing side of
// the real market path. To give an honest read, this module re-simulates each
// REAL trade's outcome directly against the REAL candles, anchored to the
// trade's ACTUAL fill (entryPrice, stopLoss, entryTime) rather than the
// signal's pre-fill reference levels. For a fixed list of reward:risk ratios
// (e.g. 1,2,3,4,5) it walks forward from the fill bar and asks: "did price
// reach a target R*risk away before it reached the stop?"
//
// This does NOT change the engine's actual fill/exit logic -- it is a
// post-hoc, informational re-scoring of the same trades, used to drive the
// "honest results" R:R what-if UI.
// ============================================================================

import type { AutoPosition } from './signalToPosition';
import type { Candle } from '../../components/ReplayChart/types';

export type RLadderOutcome = 'win' | 'loss' | 'open';

/**
 * Compute, for a single trade, whether each requested reward:risk level
 * would have resolved as a win, a loss, or is still 'open' (never resolved
 * within the available candle history).
 *
 * Model (fixed-risk, fill-anchored):
 *   entry = trade.entryPrice; stop = trade.stopLoss; isLong = type === 'long'
 *   risk  = |entry - stop|
 *   target(R) = isLong ? entry + R*risk : entry - R*risk
 *
 * Walk forward bar-by-bar from the fill. Per bar, a target is "hit" once its
 * price level is touched (high/low), and the stop is "hit" once its level is
 * touched. Same-candle ambiguity (both stop and an unresolved target touched
 * within the same bar) is resolved CONSERVATIVELY as a loss for that target,
 * matching real-world worst-case fill uncertainty (we cannot know intrabar
 * sequencing from OHLC alone). Once the stop is hit, every R not yet resolved
 * is marked 'loss' and the walk stops (a stopped-out trade cannot still be
 * open at a further, unreached target).
 */
export function computeTradeRLadder(
  trade: AutoPosition,
  candles: Candle[],
  rLevels: number[],
): Record<number, RLadderOutcome> {
  const result: Record<number, RLadderOutcome> = {};

  const entry = trade.entryPrice;
  const stop = trade.stopLoss;
  const isLong = trade.type === 'long';
  const risk = Math.abs(entry - stop);

  if (risk <= 0) {
    for (const r of rLevels) result[r] = 'open';
    return result;
  }

  const entryIdx = findEntryIndex(candles, trade.entryTime);
  if (entryIdx === -1) {
    for (const r of rLevels) result[r] = 'open';
    return result;
  }

  const targets = new Map<number, number>();
  for (const r of rLevels) {
    targets.set(r, isLong ? entry + r * risk : entry - r * risk);
  }

  const unresolved = new Set<number>(rLevels);

  for (let idx = entryIdx + 1; idx < candles.length && unresolved.size > 0; idx++) {
    const c = candles[idx];
    const stopHit = isLong ? c.low <= stop : c.high >= stop;

    if (stopHit) {
      // Resolve every remaining R as 'loss'. This covers both branches per
      // spec: same-candle ambiguity (target also touched this bar) counts as
      // stop-first ('loss'), and a target never reached before the stop is
      // trivially a 'loss' too -- both converge on the same outcome.
      for (const r of unresolved) {
        result[r] = 'loss';
      }
      unresolved.clear();
      break;
    }

    for (const r of Array.from(unresolved)) {
      const target = targets.get(r) as number;
      const targetHit = isLong ? c.high >= target : c.low <= target;
      if (targetHit) {
        result[r] = 'win';
        unresolved.delete(r);
      }
    }
  }

  for (const r of unresolved) {
    result[r] = 'open';
  }

  return result;
}

/** First candle index at/after the trade's entryTime (both in seconds). */
function findEntryIndex(candles: Candle[], entryTimeSec: number): number {
  for (let i = 0; i < candles.length; i++) {
    if ((candles[i].time as number) >= entryTimeSec) return i;
  }
  return -1;
}

export interface RLadderAgg {
  r: number;
  trades: number;
  wins: number;
  losses: number;
  open: number;
  winRate: number;
  netR: number;
}

/**
 * Compute each trade's R-ladder and aggregate wins/losses/open per R level.
 * Order-independent (aggregation does not care about trade sequence; the
 * caller sorts by entryTime when building an equity curve).
 */
export function computeRLadderAggregate(
  trades: AutoPosition[],
  candles: Candle[],
  rLevels: number[],
): { perR: RLadderAgg[]; perTrade: Record<number, RLadderOutcome>[] } {
  const perTrade = trades.map((t) => computeTradeRLadder(t, candles, rLevels));

  const perR: RLadderAgg[] = rLevels.map((r) => {
    let wins = 0;
    let losses = 0;
    let open = 0;
    for (const outcomes of perTrade) {
      const outcome = outcomes[r];
      if (outcome === 'win') wins++;
      else if (outcome === 'loss') losses++;
      else open++;
    }
    const resolved = wins + losses;
    const netR = wins * r - losses * 1;
    return {
      r,
      trades: trades.length,
      wins,
      losses,
      open,
      winRate: resolved > 0 ? (wins / resolved) * 100 : 0,
      netR,
    };
  });

  return { perR, perTrade };
}
