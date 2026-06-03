/**
 * groupStats — pure, well-typed helper for computing comparison metrics
 * on a filtered slice of trades.
 *
 * No side effects. No imports from React. No async.
 */

import type { Trade } from '@/hooks/useTradesData';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GroupStats {
  count: number;
  winRate: number;       // 0–100
  netPnl: number;
  avgWin: number;        // average P&L of winning trades
  avgLoss: number;       // average P&L of losing trades (negative)
  profitFactor: number;  // gross wins / |gross losses|; Infinity when no losses
  avgR: number | null;   // null when no R data available
  largestWin: number;
  largestLoss: number;   // the most negative P&L in the set (negative number)
  expectancy: number;    // winRate/100 * avgWin + (1 - winRate/100) * avgLoss
}

// ---------------------------------------------------------------------------
// computeGroupStats
// ---------------------------------------------------------------------------

export function computeGroupStats(trades: Trade[]): GroupStats {
  if (trades.length === 0) {
    return {
      count: 0,
      winRate: 0,
      netPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      avgR: null,
      largestWin: 0,
      largestLoss: 0,
      expectancy: 0,
    };
  }

  let wins = 0;
  let grossWins = 0;
  let grossLosses = 0; // stored as positive magnitude
  let netPnl = 0;
  let largestWin = -Infinity;
  let largestLoss = Infinity; // tracks most-negative value
  let totalR = 0;
  let rCount = 0;

  for (const t of trades) {
    const pnl = t.pnl ?? 0;
    netPnl += pnl;

    if (pnl > 0) {
      wins += 1;
      grossWins += pnl;
      if (pnl > largestWin) largestWin = pnl;
    } else if (pnl < 0) {
      grossLosses += Math.abs(pnl);
      if (pnl < largestLoss) largestLoss = pnl;
    }

    // R-multiple: prefer actual_user_r → actual_r → rr
    const r = t.actual_user_r ?? t.actual_r ?? t.rr;
    if (r != null) {
      totalR += r;
      rCount += 1;
    }
  }

  const count = trades.length;
  const winRate = (wins / count) * 100;
  const lossCount = count - wins;

  const avgWin = wins > 0 ? grossWins / wins : 0;
  const avgLoss = lossCount > 0 ? -(grossLosses / lossCount) : 0;

  const profitFactor =
    grossLosses === 0
      ? grossWins > 0
        ? Infinity
        : 0
      : grossWins / grossLosses;

  const avgR = rCount > 0 ? totalR / rCount : null;

  const wr = winRate / 100;
  const expectancy = wr * avgWin + (1 - wr) * avgLoss;

  return {
    count,
    winRate,
    netPnl,
    avgWin,
    avgLoss,
    profitFactor,
    avgR,
    largestWin: largestWin === -Infinity ? 0 : largestWin,
    largestLoss: largestLoss === Infinity ? 0 : largestLoss,
    expectancy,
  };
}
