/**
 * breakdownKit.ts
 *
 * Shared primitives for performance-breakdown tables across the journal reports.
 * Extracted from Breakdowns.tsx so that StrategyAdherenceAnalytics and future
 * report pages can reuse the same accumulation logic without duplication.
 *
 * No React imports — pure TypeScript, safe in any context.
 */

import type { Trade } from '@/hooks/useTradesData';

// ---------------------------------------------------------------------------
// Row shape
// ---------------------------------------------------------------------------

export interface BreakdownRow {
  label: string;
  count: number;
  wins: number;
  netPnl: number;
  /** Sum of R values for averaging */
  totalR: number;
  rCount: number;
}

// ---------------------------------------------------------------------------
// Factory + accumulator
// ---------------------------------------------------------------------------

export function emptyRow(label: string): BreakdownRow {
  return { label, count: 0, wins: 0, netPnl: 0, totalR: 0, rCount: 0 };
}

export function accumulateTrade(row: BreakdownRow, t: Trade): void {
  row.count += 1;
  if ((t.pnl ?? 0) > 0) row.wins += 1;
  row.netPnl += t.pnl ?? 0;
  const r = t.actual_user_r ?? t.actual_r ?? t.rr;
  if (r != null) { row.totalR += r; row.rCount += 1; }
}
