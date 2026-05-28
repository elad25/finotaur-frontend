/**
 * useBacktestStats — aggregate stats across all saved backtest sessions.
 *
 * Phase 7 — mirror of useDashboardStats but sourced from backtest_sessions_v2
 * + backtest_trades_v2 instead of `trades`. The Backtest "Dashboard" and
 * "My Trades" pages both consume this.
 *
 * Returns the same SessionStats shape used by the in-memory replay session
 * (computed via computeStats), plus the flat trade list + per-session
 * metadata so the My Trades table can show symbol/interval per row.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import type { PaperPosition, SessionStats } from '@/hooks/useBacktestSession';
import { computeStatsByStrategy } from '@/hooks/useBacktestSession';
import dayjs from 'dayjs';

// Raw row shape from backtest_trades_v2 joined with session.
interface BacktestTradeRow {
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
  // Joined columns from backtest_sessions_v2:
  session: {
    id: string;
    name: string | null;
    symbol: string;
    interval: string;
    asset_class: string | null;
    created_at: string;
  };
}

export interface BacktestTrade {
  id: string;
  sessionId: string;
  sessionName: string | null;
  symbol: string;
  interval: string;
  assetClass: string | null;
  side: 'LONG' | 'SHORT';
  entryTime: number;       // unix seconds
  entryPrice: number;
  exitTime: number | null;
  exitPrice: number | null;
  size: number;
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number;
  pnlPercent: number;
  exitReason: 'manual' | 'sl' | 'tp' | null;
  savedAt: string;         // ISO from session.created_at
  outcome: 'WIN' | 'LOSS' | 'BE';
}

export interface EquityPoint {
  date: string;            // 'MMM DD'
  equity: number;          // cumulative P&L from 0
  pnl: number;             // day's P&L
}

export interface BacktestStatsResult {
  stats: SessionStats;
  trades: BacktestTrade[];
  equitySeries: EquityPoint[];
  /** Per-strategy breakdown: key = strategy id or 'manual'. */
  byStrategy: Map<string, SessionStats>;
  /** Number of distinct saved sessions feeding the stats. */
  sessionCount: number;
}

const EMPTY_STATS: SessionStats = {
  totalTrades: 0,
  winners: 0,
  losers: 0,
  breakeven: 0,
  winRate: 0,
  netPnl: 0,
  netPnlPercent: 0,
  grossProfit: 0,
  grossLoss: 0,
  profitFactor: 0,
  avgWin: 0,
  avgLoss: 0,
  largestWin: 0,
  largestLoss: 0,
  avgRR: 0,
  longestWinStreak: 0,
  longestLossStreak: 0,
};

function rowToTrade(row: BacktestTradeRow): BacktestTrade {
  const pnl = row.pnl ?? 0;
  const outcome: 'WIN' | 'LOSS' | 'BE' = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE';
  return {
    id: row.id,
    sessionId: row.session_id,
    sessionName: row.session?.name ?? null,
    symbol: row.session?.symbol ?? '?',
    interval: row.session?.interval ?? '?',
    assetClass: row.session?.asset_class ?? null,
    side: row.side,
    entryTime: Math.floor(new Date(row.entry_time).getTime() / 1000),
    entryPrice: row.entry_price,
    exitTime: row.exit_time ? Math.floor(new Date(row.exit_time).getTime() / 1000) : null,
    exitPrice: row.exit_price,
    size: row.size,
    stopLoss: row.stop_loss,
    takeProfit: row.take_profit,
    pnl,
    pnlPercent: row.pnl_percent ?? 0,
    exitReason: row.exit_reason,
    savedAt: row.session?.created_at ?? row.exit_time ?? row.entry_time,
    outcome,
  };
}

function tradesToPaperPositions(trades: BacktestTrade[]): PaperPosition[] {
  return trades.map((t) => ({
    id: t.id,
    side: t.side,
    entryTime: t.entryTime,
    entryPrice: t.entryPrice,
    size: t.size,
    stopLoss: t.stopLoss ?? undefined,
    takeProfit: t.takeProfit ?? undefined,
    exitTime: t.exitTime ?? undefined,
    exitPrice: t.exitPrice ?? undefined,
    pnl: t.pnl,
    pnlPercent: t.pnlPercent,
    exitReason: t.exitReason ?? undefined,
  }));
}

// Inlined version of computeStats from useBacktestSession (so the hook
// doesn't have to import a non-exported helper). Keep in sync if the
// canonical formula changes there.
function computeStats(closed: PaperPosition[], startingBalance: number): SessionStats {
  if (closed.length === 0) return EMPTY_STATS;
  let winners = 0, losers = 0, breakeven = 0;
  let grossProfit = 0, grossLoss = 0;
  let largestWin = 0, largestLoss = 0;
  let currentWinStreak = 0, currentLossStreak = 0;
  let longestWinStreak = 0, longestLossStreak = 0;
  for (const p of closed) {
    const pnl = p.pnl ?? 0;
    if (pnl > 0) {
      winners++; grossProfit += pnl;
      if (pnl > largestWin) largestWin = pnl;
      currentWinStreak++; currentLossStreak = 0;
      if (currentWinStreak > longestWinStreak) longestWinStreak = currentWinStreak;
    } else if (pnl < 0) {
      losers++; grossLoss += Math.abs(pnl);
      if (Math.abs(pnl) > largestLoss) largestLoss = Math.abs(pnl);
      currentLossStreak++; currentWinStreak = 0;
      if (currentLossStreak > longestLossStreak) longestLossStreak = currentLossStreak;
    } else {
      breakeven++; currentWinStreak = 0; currentLossStreak = 0;
    }
  }
  const totalTrades = closed.length;
  const netPnl = grossProfit - grossLoss;
  const avgWin = winners > 0 ? grossProfit / winners : 0;
  const avgLoss = losers > 0 ? grossLoss / losers : 0;
  return {
    totalTrades, winners, losers, breakeven,
    winRate: (winners / totalTrades) * 100,
    netPnl,
    netPnlPercent: startingBalance > 0 ? (netPnl / startingBalance) * 100 : 0,
    grossProfit, grossLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    avgWin, avgLoss, largestWin, largestLoss,
    avgRR: avgLoss > 0 ? avgWin / avgLoss : 0,
    longestWinStreak, longestLossStreak,
  };
}

function buildEquitySeries(trades: BacktestTrade[]): EquityPoint[] {
  const sorted = [...trades].sort((a, b) => {
    const ta = a.exitTime ?? a.entryTime;
    const tb = b.exitTime ?? b.entryTime;
    return ta - tb;
  });
  const byDate = new Map<string, number>();
  for (const t of sorted) {
    const tsSec = t.exitTime ?? t.entryTime;
    const date = dayjs(tsSec * 1000).format('MMM DD');
    byDate.set(date, (byDate.get(date) ?? 0) + (t.pnl ?? 0));
  }
  const out: EquityPoint[] = [];
  let running = 0;
  for (const [date, dayPnl] of byDate) {
    running += dayPnl;
    out.push({ date, equity: running, pnl: dayPnl });
  }
  return out;
}

export const backtestStatsKeys = {
  all: ['backtest-stats'] as const,
  byUser: (userId: string) => ['backtest-stats', userId] as const,
};

export function useBacktestStats() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery<BacktestStatsResult>({
    queryKey: backtestStatsKeys.byUser(userId ?? 'anon'),
    enabled: !!userId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!userId) {
        return {
          stats: EMPTY_STATS,
          trades: [],
          equitySeries: [],
          byStrategy: new Map(),
          sessionCount: 0,
        };
      }

      // Fetch all trades joined to their session (so we get symbol/interval/name
      // per row). RLS on backtest_sessions_v2 enforces user ownership transitively.
      const { data, error } = await supabase
        .from('backtest_trades_v2')
        .select(`
          id, session_id, side, entry_time, entry_price, exit_time, exit_price,
          size, stop_loss, take_profit, pnl, pnl_percent, exit_reason,
          session:backtest_sessions_v2!inner(id, name, symbol, interval, asset_class, created_at, user_id)
        `)
        .eq('session.user_id', userId)
        .not('exit_time', 'is', null)   // closed trades only
        .order('exit_time', { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as unknown as BacktestTradeRow[];
      const trades = rows.map(rowToTrade);
      const paperPositions = tradesToPaperPositions(trades);
      const stats = computeStats(paperPositions, 10000);  // 10k baseline for pct
      const byStrategy = computeStatsByStrategy(paperPositions, 10000);
      const equitySeries = buildEquitySeries(trades);
      const sessionCount = new Set(trades.map((t) => t.sessionId)).size;

      return { stats, trades, equitySeries, byStrategy, sessionCount };
    },
  });
}
