// ==========================================
// BACKTEST → JOURNAL BRIDGE (Phase 2)
// ==========================================
// Persists trades placed during a backtest session into the existing `trades`
// table, carrying the session's linked strategy_id and a backtest marker so the
// journal/analytics can distinguish + compare backtest vs live (TradeZella parity:
// "automatic journaling + strategy link").
//
// No schema change: reuses columns already present on `trades`
// (strategy_id, setup, tags, source/broker markers, notes).

import { supabase } from '@/lib/supabase';
import type { BacktestSession } from '@/types/backtestSession';

/** Minimal shape we consume from the ReplayChart trading engine's positions. */
export interface BacktestPositionLike {
  positionId?: string;
  id?: string;
  symbol?: string;
  side: string; // 'long' | 'short' | 'buy' | 'sell'
  entryPrice: number;
  exitPrice?: number;
  size: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  realizedPnL?: number;
  realizedPnl?: number;
  entryTime?: number;
  exitTime?: number;
  isClosed?: boolean;
  status?: string;
}

export interface SaveResult {
  saved: number;
  skipped: number;
  errors: number;
}

function toIso(t?: number): string | null {
  if (!t) return null;
  // Replay timestamps are unix seconds; convert to ms for Date.
  const ms = t < 1e12 ? t * 1000 : t;
  return new Date(ms).toISOString();
}

function normalizeSide(side: string): 'LONG' | 'SHORT' {
  return side === 'long' || side === 'buy' ? 'LONG' : 'SHORT';
}

function realizedPnl(p: BacktestPositionLike): number | null {
  const v = p.realizedPnL ?? p.realizedPnl;
  return typeof v === 'number' ? v : null;
}

/**
 * Save closed backtest positions to the journal.
 * Only closed positions are persisted (open ones have no outcome yet).
 * Each row is tagged `backtest` and linked to the session's strategy when set.
 */
export async function saveBacktestTradesToJournal(
  positions: BacktestPositionLike[],
  session: BacktestSession,
  userId: string
): Promise<SaveResult> {
  const result: SaveResult = { saved: 0, skipped: 0, errors: 0 };
  if (!userId) {
    result.skipped = positions.length;
    return result;
  }

  const closed = positions.filter((p) => p.isClosed || p.status === 'closed' || p.exitPrice != null);
  if (closed.length === 0) return result;

  const rows = closed.map((p) => {
    const pnl = realizedPnl(p);
    return {
      user_id: userId,
      symbol: p.symbol || session.symbol,
      side: normalizeSide(p.side),
      quantity: p.size,
      entry_price: p.entryPrice,
      stop_price: p.stopLoss ?? null,
      take_profit_price: p.takeProfit ?? null,
      exit_price: p.exitPrice ?? null,
      pnl,
      outcome: pnl == null ? 'OPEN' : pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE',
      strategy_id: session.strategyId ?? null,
      setup: session.strategyName ?? null,
      tags: ['backtest', `session:${session.name}`],
      notes: `Backtest session "${session.name}" (${session.symbol})`,
      broker: 'backtest',
      external_id: `bt:${session.id}:${p.positionId || p.id || ''}`,
      session: null as string | null,
      created_at: toIso(p.entryTime) ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  // Upsert on external_id so re-saving the same session updates rather than duplicates.
  const { error } = await supabase
    .from('trades')
    .upsert(rows, { onConflict: 'external_id', ignoreDuplicates: false });

  if (error) {
    console.error('❌ saveBacktestTradesToJournal error:', error);
    result.errors = rows.length;
    return result;
  }

  result.saved = rows.length;
  return result;
}
