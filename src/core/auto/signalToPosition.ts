// ============================================================================
// SIGNAL -> POSITION ADAPTER
// ============================================================================
//
// Builds a canonical journal `Position` (the shape consumed by
// OrderExecutionEngine + StatisticsEngine) from a filled TradeSignal. The
// engines read `position.type` ('long' | 'short'), `entryPrice`, `size`,
// `stopLoss`, `takeProfit`, and later `realizedPnl`, `realizedPnlPercent`,
// `entryTime`, `exitTime`, `exitPrice`, `exitReason`, `riskRewardRatio`,
// `riskAmount`.
//
// CANONICAL Position TYPE — important context
// -------------------------------------------
// The two engines import `Position` from `'../../types'`. In the current tree
// there is NO `src/types` barrel that exports a Position; the legacy journal
// Position whose fields the engines actually use is defined in
// `services/api/supabaseClient.ts` (type:string, entryPrice, size,
// entryTime:number, realizedPnl, ...). The StatisticsEngine additionally reads
// `realizedPnlPercent`, `riskAmount` and `riskRewardRatio`, which that legacy
// interface does not all declare. To stay decoupled from the broken import and
// to satisfy BOTH engines structurally, this module defines `AutoPosition` —
// a self-contained superset of every field the engines touch. It is assignable
// to the engines' parameter types via structural typing.
// ============================================================================

import type { TradeSignal } from './types';

/**
 * Self-contained Position superset covering every field read by
 * OrderExecutionEngine and StatisticsEngine. JSON-safe.
 */
export interface AutoPosition {
  symbol: string;
  /** 'long' | 'short' — OrderExecutionEngine checks `=== 'long'`. */
  type: 'long' | 'short';
  entryPrice: number;
  size: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: number;
  status: 'open' | 'closed';

  // Filled in on close.
  exitPrice?: number;
  exitTime?: number;
  exitReason?: 'stop_loss' | 'take_profit' | 'manual';
  realizedPnl?: number;
  realizedPnlPercent?: number;

  // Risk metrics (read by StatisticsEngine).
  riskRewardRatio?: number;
  riskAmount?: number;
}

/**
 * Construct an AutoPosition from a filled signal.
 *
 * @param signal     the armed signal that just filled
 * @param fillPrice  the actual fill price returned by the execution engine
 * @param size       position size from calculatePositionSize
 * @param entryTime  entry timestamp in SECONDS (journal convention; the
 *                   StatisticsEngine multiplies by 1000 when formatting dates)
 */
export function signalToPosition(
  signal: TradeSignal,
  fillPrice: number,
  size: number,
  entryTime: number,
): AutoPosition {
  const risk = Math.abs(fillPrice - signal.stopLoss);
  const reward = Math.abs(signal.takeProfit - fillPrice);
  const symbol =
    typeof signal.detection.meta?.symbol === 'string'
      ? (signal.detection.meta.symbol as string)
      : 'AUTO';

  return {
    symbol,
    type: signal.direction, // 'long' | 'short'
    entryPrice: fillPrice,
    size,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    entryTime,
    status: 'open',
    riskRewardRatio: risk > 0 ? reward / risk : 0,
    riskAmount: risk * size,
  };
}
