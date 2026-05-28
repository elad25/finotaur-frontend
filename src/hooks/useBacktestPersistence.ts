/**
 * useBacktestPersistence — save / list / load / delete backtest sessions.
 *
 * Phase 2 of the backtest marketing-ready sprint. Thin client wrapper around
 * the `backtest-sessions` Edge Function (CRUD on backtest_sessions +
 * backtest_trades tables). All calls authenticate via the current Supabase
 * session JWT; RLS enforces ownership server-side.
 *
 * No global state — callers manage loading/error UI themselves. Returns
 * stable function references via useCallback so they can sit in dependency
 * arrays without re-running effects.
 */

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PaperPosition, SessionStats } from './useBacktestSession';

// ─── Wire types — match Edge Function payloads ─────────────────
export interface SaveSessionInput {
  name?: string;
  symbol: string;
  interval: string;
  asset_class?: 'futures' | 'stocks' | 'crypto';
  startDate: Date | string;
  endDate: Date | string;
  initialBalance: number;
  finalBalance?: number;
  statistics: SessionStats;
  trades: PaperPosition[];
  notes?: string;
}

export interface SavedSessionSummary {
  id: string;
  name: string | null;
  symbol: string;
  interval: string;
  asset_class: string | null;
  total_trades: number;
  win_rate: number;
  net_pnl: number;
  profit_factor: number;
  created_at: string;
}

export interface SavedSessionDetail {
  session: SavedSessionSummary & {
    user_id: string;
    start_date: string;
    end_date: string;
    initial_balance: number;
    final_balance: number | null;
    statistics: SessionStats;
    notes: string | null;
    config: Record<string, unknown> | null;
    updated_at: string;
  };
  trades: Array<{
    id: string;
    session_id: string;
    side: 'LONG' | 'SHORT';
    entry_time: string;
    entry_price: number;
    exit_time: string | null;
    exit_price: number | null;
    size: number;
    stop_loss: number | null;
    take_profit: number | null;
    pnl: number | null;
    pnl_percent: number | null;
    exit_reason: 'manual' | 'sl' | 'tp' | null;
  }>;
}

// ─── Helpers ───────────────────────────────────────────────────
function toIso(d: Date | string): string {
  return typeof d === 'string' ? d : d.toISOString();
}

function unixToIso(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

function paperToWire(p: PaperPosition) {
  return {
    side: p.side,
    entry_time: unixToIso(p.entryTime),
    entry_price: p.entryPrice,
    exit_time: p.exitTime != null ? unixToIso(p.exitTime) : undefined,
    exit_price: p.exitPrice,
    size: p.size,
    stop_loss: p.stopLoss,
    take_profit: p.takeProfit,
    pnl: p.pnl,
    pnl_percent: p.pnlPercent,
    exit_reason: p.exitReason,
  };
}

// ─── Hook ──────────────────────────────────────────────────────
export interface UseBacktestPersistenceReturn {
  saveSession: (input: SaveSessionInput) => Promise<{ id: string; created_at: string }>;
  listSessions: () => Promise<SavedSessionSummary[]>;
  loadSession: (id: string) => Promise<SavedSessionDetail>;
  deleteSession: (id: string) => Promise<void>;
}

export function useBacktestPersistence(): UseBacktestPersistenceReturn {
  const saveSession = useCallback(async (input: SaveSessionInput) => {
    const body = {
      name: input.name,
      symbol: input.symbol,
      interval: input.interval,
      asset_class: input.asset_class,
      start_date: toIso(input.startDate),
      end_date: toIso(input.endDate),
      initial_balance: input.initialBalance,
      final_balance: input.finalBalance,
      statistics: input.statistics,
      total_trades: input.statistics.totalTrades,
      win_rate: input.statistics.winRate,
      net_pnl: input.statistics.netPnl,
      // profit_factor can be Infinity in JS — clamp for numeric column.
      profit_factor: Number.isFinite(input.statistics.profitFactor)
        ? input.statistics.profitFactor
        : 9999,
      notes: input.notes,
      trades: input.trades.map(paperToWire),
    };

    const { data, error } = await supabase.functions.invoke<{
      id: string;
      created_at: string;
    }>('backtest-sessions', {
      method: 'POST',
      body,
    });
    if (error) throw error;
    if (!data) throw new Error('Edge Function returned no data');
    return data;
  }, []);

  const listSessions = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke<{ sessions: SavedSessionSummary[] }>(
      'backtest-sessions',
      { method: 'GET' },
    );
    if (error) throw error;
    return data?.sessions ?? [];
  }, []);

  const loadSession = useCallback(async (id: string) => {
    // supabase.functions.invoke doesn't accept query strings directly — pass
    // via headers as a workaround? Actually invoke serializes query params
    // when you append them to the function name. Use the second arg pattern.
    const { data, error } = await supabase.functions.invoke<SavedSessionDetail>(
      `backtest-sessions?id=${encodeURIComponent(id)}`,
      { method: 'GET' },
    );
    if (error) throw error;
    if (!data) throw new Error('Edge Function returned no data');
    return data;
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    const { error } = await supabase.functions.invoke<{ ok: boolean }>(
      `backtest-sessions?id=${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
    if (error) throw error;
  }, []);

  return { saveSession, listSessions, loadSession, deleteSession };
}
