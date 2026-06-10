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

import { useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import type { PaperPosition, PendingOrder, SessionStats } from './useBacktestSession';

// ─── Wire types — match Edge Function payloads ─────────────────
export interface SaveSessionInput {
  name?: string;
  symbol: string;
  interval: string;
  asset_class?: 'futures' | 'stocks' | 'forex' | 'crypto';
  startDate: Date | string;
  endDate: Date | string;
  initialBalance: number;
  finalBalance?: number;
  statistics: SessionStats;
  trades: PaperPosition[];
  pendingOrders: PendingOrder[];
  notes?: string;
  /** Optional link to the active strategy at save time. Used by AI Phase F
   *  compare_live_vs_backtest. Populated from activeStrategyId in BacktestChart. */
  strategyId?: string;
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
    pending_orders: Array<{
      id: string;
      side: 'LONG' | 'SHORT';
      type: 'LIMIT' | 'STOP';
      trigger_price: number;
      size: number;
      stop_loss: number | null;
      take_profit: number | null;
      strategy_id: string | null;
      created_at: number;
    }>;
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
    strategy_id: string | null;
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
    strategy_id: p.strategyId ?? null,
  };
}

function pendingToWire(o: PendingOrder) {
  return {
    id: o.id,
    side: o.side,
    type: o.type,
    trigger_price: o.triggerPrice,
    size: o.size,
    stop_loss: o.stopLoss,
    take_profit: o.takeProfit,
    strategy_id: o.strategyId,
    created_at: o.createdAt,
  };
}

// ─── Hook ──────────────────────────────────────────────────────
export interface ListSessionsOptions {
  limit?: number;
  before?: string; // ISO timestamp cursor
}

export interface ListSessionsResult {
  sessions: SavedSessionSummary[];
  nextCursor: string | null;
}

export interface UseBacktestPersistenceReturn {
  saveSession: (input: SaveSessionInput) => Promise<{ id: string; created_at: string }>;
  listSessions: (options?: ListSessionsOptions) => Promise<ListSessionsResult>;
  loadSession: (id: string) => Promise<SavedSessionDetail>;
  deleteSession: (id: string) => Promise<void>;
}

export function useBacktestPersistence(): UseBacktestPersistenceReturn {
  // The saved-sessions edge function is JWT-scoped to the caller. In Mentor View
  // the caller is the mentor, so the edge function would return the MENTOR's own
  // sessions. Instead we read the STUDENT's sessions directly from Supabase
  // (RLS grants accepted mentors read on backtest_sessions_v2 / _trades_v2),
  // read-only. Writes (save/delete) stay on the edge function and are DB-blocked
  // for the mentor anyway (owner-only policies) + hidden in the UI.
  const { isMentorView, id: effectiveUserId } = useEffectiveUser();

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
      strategy_id: input.strategyId ?? null,
      trades: input.trades.map(paperToWire),
      pending_orders: input.pendingOrders.map(pendingToWire),
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

  const listSessions = useCallback(async (options?: ListSessionsOptions): Promise<ListSessionsResult> => {
    // Mentor View: read the student's sessions directly from Supabase (RLS-scoped),
    // not the mentor's own via the edge function.
    if (isMentorView) {
      if (!effectiveUserId) return { sessions: [], nextCursor: null };
      const pageSize = options?.limit ?? 20;
      let q = supabase
        .from('backtest_sessions_v2')
        .select('id,name,symbol,interval,asset_class,total_trades,win_rate,net_pnl,profit_factor,created_at')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(pageSize + 1);
      if (options?.before) q = q.lt('created_at', options.before);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as SavedSessionSummary[];
      const hasMore = rows.length > pageSize;
      const sessions = hasMore ? rows.slice(0, pageSize) : rows;
      return {
        sessions,
        nextCursor: hasMore ? sessions[sessions.length - 1]?.created_at ?? null : null,
      };
    }
    // Build query string mirroring the loadSession pattern (append to function name).
    const qs = new URLSearchParams();
    if (options?.limit != null) qs.set('limit', String(options.limit));
    if (options?.before != null) qs.set('before', options.before);
    const qsStr = qs.toString();
    const fnPath = qsStr ? `backtest-sessions?${qsStr}` : 'backtest-sessions';

    // Wire type includes next_cursor (snake_case) as returned by the edge function.
    const { data, error } = await supabase.functions.invoke<{
      sessions: SavedSessionSummary[];
      next_cursor?: string | null;
    }>(fnPath, { method: 'GET' });
    if (error) throw error;
    return {
      sessions: data?.sessions ?? [],
      // Defensive: coerce missing next_cursor (pre-deploy edge fn) to null.
      nextCursor: data?.next_cursor ?? null,
    };
  }, [isMentorView, effectiveUserId]);

  const loadSession = useCallback(async (id: string): Promise<SavedSessionDetail> => {
    // Mentor View: load the student's session directly from Supabase (RLS-scoped).
    if (isMentorView) {
      const [{ data: session, error: sErr }, { data: trades, error: tErr }] = await Promise.all([
        supabase.from('backtest_sessions_v2').select('*').eq('id', id).single(),
        supabase
          .from('backtest_trades_v2')
          .select('id,session_id,side,entry_time,entry_price,exit_time,exit_price,size,stop_loss,take_profit,pnl,pnl_percent,exit_reason,strategy_id')
          .eq('session_id', id)
          .order('entry_time', { ascending: true }),
      ]);
      if (sErr) throw sErr;
      if (tErr) throw tErr;
      if (!session) throw new Error('Session not found');
      return { session, trades: trades ?? [] } as unknown as SavedSessionDetail;
    }
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
  }, [isMentorView]);

  const deleteSession = useCallback(async (id: string) => {
    const { error } = await supabase.functions.invoke<{ ok: boolean }>(
      `backtest-sessions?id=${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
    if (error) throw error;
  }, []);

  // Return a stable object reference so callers can safely list this in
  // useEffect/useCallback dependency arrays without triggering refetch loops.
  return useMemo(
    () => ({ saveSession, listSessions, loadSession, deleteSession }),
    [saveSession, listSessions, loadSession, deleteSession],
  );
}
