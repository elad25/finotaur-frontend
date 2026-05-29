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
import { computeStats, computeStatsByStrategy } from '@/hooks/useBacktestSession';
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
  strategy_id: string | null;
  // Joined columns from backtest_sessions_v2:
  session: {
    id: string;
    name: string | null;
    symbol: string;
    interval: string;
    asset_class: string | null;
    created_at: string;
    initial_balance: number;
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
  strategyId: string | null;
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
  /** Sum of `initial_balance` across all distinct sessions in the result set.
   *  Used as the denominator for percentage-based stats so they reflect actual
   *  capital deployed instead of a flat $10K assumption. Falls back to 10000
   *  when no sessions exist. */
  totalInitialBalance: number;
  /** True when the trade history was clipped at BACKTEST_TRADES_PAGE_SIZE
   *  and additional older trades exist server-side. The UI should hint at
   *  per-session view for older trades. */
  hasMore: boolean;
}

// Cap per-user trade fetch on the Dashboard. Power users with hundreds of
// saved sessions can easily exceed this; bypass via the per-session view.
const BACKTEST_TRADES_PAGE_SIZE = 5000;

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
    strategyId: row.strategy_id ?? null,
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
    strategyId: t.strategyId ?? null,
  }));
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
          totalInitialBalance: 10000,
          hasMore: false,
        };
      }

      // Fetch all trades joined to their session (so we get symbol/interval/name
      // per row). RLS on backtest_sessions_v2 enforces user ownership transitively.
      // Over-fetch by 1 to detect whether more pages exist server-side.
      const { data, error } = await supabase
        .from('backtest_trades_v2')
        .select(`
          id, session_id, side, entry_time, entry_price, exit_time, exit_price,
          size, stop_loss, take_profit, pnl, pnl_percent, exit_reason, strategy_id,
          session:backtest_sessions_v2!inner(id, name, symbol, interval, asset_class, created_at, user_id, initial_balance)
        `)
        .eq('session.user_id', userId)
        .not('exit_time', 'is', null)   // closed trades only
        .order('exit_time', { ascending: false })
        .limit(BACKTEST_TRADES_PAGE_SIZE + 1);

      if (error) throw error;

      const allRows = (data ?? []) as unknown as BacktestTradeRow[];
      const hasMore = allRows.length > BACKTEST_TRADES_PAGE_SIZE;
      const rows = hasMore ? allRows.slice(0, BACKTEST_TRADES_PAGE_SIZE) : allRows;
      const trades = rows.map(rowToTrade);
      const paperPositions = tradesToPaperPositions(trades);

      // Sum initial_balance once per distinct session — same session has the
      // same balance on every row, so dedupe by session_id before summing.
      const balanceBySession = new Map<string, number>();
      for (const row of rows) {
        if (row.session?.id != null && !balanceBySession.has(row.session.id)) {
          balanceBySession.set(row.session.id, Number(row.session.initial_balance) || 10000);
        }
      }
      const totalInitialBalance = balanceBySession.size > 0
        ? Array.from(balanceBySession.values()).reduce((a, b) => a + b, 0)
        : 10000;

      const stats = computeStats(paperPositions, totalInitialBalance);
      const byStrategy = computeStatsByStrategy(paperPositions, totalInitialBalance);
      const equitySeries = buildEquitySeries(trades);
      const sessionCount = balanceBySession.size;

      return { stats, trades, equitySeries, byStrategy, sessionCount, totalInitialBalance, hasMore };
    },
  });
}
