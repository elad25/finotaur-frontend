// src/hooks/useDashboardData.ts
// ================================================
// OPTIMIZED FOR 5000+ USERS - v2.3
// ✅ FIXED: Reduced console logging for production
// ✅ FIXED: Better caching with refetchOnMount: false
// ✅ FIXED: Risk-Only mode trades now included in stats!
// ✅ Calls enable_admin_mode() before queries
// ✅ Impersonation uses real session swap (regular client carries target JWT)
// ✅ Trading session support added
// ================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout, TIMEOUTS, TimeoutError } from '@/lib/withTimeout';
import { logger } from '@/lib/logger';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { isBrokerId, brokerConnId } from '@/hooks/usePortfolios';
import { normalizeSymbol } from '@/utils/normalizeSymbol';
import dayjs from 'dayjs';
import { aggregateCopiedTrades } from '@/lib/tradeAggregation';
import { normalizeTraderTrades, type TraderMode } from '@/lib/journal/traderNormalization';
import { excludeHiddenWhenAllAccounts } from '@/lib/journal/hiddenAccounts';

// ================================================
// TYPES & INTERFACES
// ================================================

export type TradingSession = 'asian' | 'london' | 'new_york' | 'after_hours';

export interface Trade {
  id: string;
  symbol: string;
  pnl: number;
  rr: number | null;
  actual_r: number | null;
  actual_user_r: number | null;
  risk_usd: number | null;
  reward_usd: number | null;
  open_at: string;
  close_at: string | null;
  stop_price: number | null;
  entry_price: number | null;
  quantity: number | null;
  exit_price: number | null;
  multiplier: number | null;
  session?: TradingSession;
  input_mode?: 'summary' | 'risk-only';
  tags?: string[] | null;
  // R-from-frozen-stop fields (populated by DB trigger)
  r_stop_price?: number | null;
  r_locked_at?: string | null;
  r_stop_set_at?: string | null;
  risk_class?: 'risk_defined' | 'risk_free' | 'no_stop' | null;
  locked_profit_usd?: number | null;
  // Strategy + equity fields needed for percent-of-equity 1R calculation
  strategy_id?: string | null;
  account_equity_at_entry?: number | null;
}

export interface DashboardStats {
  netPnl: number;
  winrate: number;
  avgRR: number;
  maxDrawdown: number;
  closedTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: {
    pnl: number;
    rr: number | null;
    symbol: string;
    open_at: string;
    session?: TradingSession;
  } | null;
  worstTrade: {
    pnl: number;
    rr: number | null;
    symbol: string;
    open_at: string;
    session?: TradingSession;
  } | null;
  equitySeries: Array<{
    date: string;
    equity: number;
    pnl: number;
  }>;
  tier: {
    tier: string;
    icon: string;
    color: string;
  };
  trades: Trade[];
}

export interface DailyPnLRow {
  trade_date: string;       // ISO date YYYY-MM-DD from view
  portfolio_id: string | null;
  day_trades: number;
  day_pnl: number;
}

// ================================================
// QUERY KEYS
// ================================================

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (userId: string, days: number) => ['dashboard', 'stats', userId, days] as const,
  connections: (userId: string) => ['dashboard', 'connections', userId] as const,
};

// ================================================
// LRU CACHE IMPLEMENTATION
// ================================================

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

// ================================================
// CACHING LAYERS
// ================================================

const equitySeriesCache = new LRUCache<string, DashboardStats['equitySeries']>(200);
const statsCache = new Map<string, { trades: any[], result: DashboardStats }>();

// ================================================
// DEV LOGGING HELPER
// ================================================

const isDev = import.meta.env.DEV;
const devLog = (...args: any[]) => {
  if (isDev) console.log(...args);
};

// ================================================
// HELPER FUNCTIONS
// ================================================

// 🔥 NEW: Check if trade is closed (supports both modes)
function isTradeClosed(trade: any): boolean {
  if (trade.input_mode === 'risk-only') {
    // Risk-Only mode: closed if pnl exists (not null/undefined)
    return trade.pnl !== null && trade.pnl !== undefined;
  }
  // Summary mode: closed if has exit_price
  return trade.exit_price !== null && trade.exit_price !== undefined;
}

function calculateRR(trade: any): number | null {
  // 🔥 UPDATED: Check actual_user_r first (user's custom R)
  if (trade.actual_user_r != null && !isNaN(trade.actual_user_r)) {
    return trade.actual_user_r;
  }
  if (trade.actual_r != null && !isNaN(trade.actual_r)) {
    return trade.actual_r;
  }
  if (trade.rr != null && !isNaN(trade.rr) && trade.rr > 0) {
    return trade.rr;
  }
  
  // 🔥 Risk-Only mode calculation
  if (trade.input_mode === 'risk-only') {
    if (trade.pnl != null && trade.risk_usd && trade.risk_usd > 0) {
      return trade.pnl / trade.risk_usd;
    }
    return null;
  }
  
  // Summary mode calculation
  if (trade.pnl != null && trade.risk_usd && trade.risk_usd > 0) {
    return Math.abs(trade.pnl) / trade.risk_usd;
  }
  
  if (trade.stop_price && trade.entry_price && trade.quantity) {
    const risk = Math.abs(trade.entry_price - trade.stop_price);
    if (risk > 0 && trade.pnl != null) {
      const rewardPerShare = Math.abs(trade.pnl / trade.quantity);
      return rewardPerShare / risk;
    }
  }
  
  return null;
}

function calculateTier(stats: Omit<DashboardStats, 'tier'>): DashboardStats['tier'] {
  const { closedTrades, winrate, avgRR } = stats;
  
  if (closedTrades >= 100 && winrate >= 0.6 && avgRR >= 2) {
    return { tier: 'Elite Trader', icon: '🥇', color: 'text-[#C9A646]' };
  }
  if (closedTrades >= 50 && winrate >= 0.55) {
    return { tier: 'Advanced', icon: '🥈', color: 'text-[#A0A0A0]' };
  }
  if (closedTrades >= 20) {
    return { tier: 'Intermediate', icon: '🥉', color: 'text-[#CD7F32]' };
  }
  return { tier: 'Beginner', icon: '📊', color: 'text-[#4A9EFF]' };
}

// ================================================
// CORE COMPUTATION ENGINE
// ================================================

function computeStats(trades: any[]): DashboardStats {
  // 🔥 CRITICAL: Filter to only closed trades using unified logic
  const closedTrades = trades.filter(isTradeClosed);
  
  const tradeIds = closedTrades.map(t => t.id).join(',');
  const cached = statsCache.get(tradeIds);
  if (cached && cached.trades === closedTrades) {
    return cached.result;
  }

  let netPnl = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let totalRR = 0;
  let rrCount = 0;
  let bestTrade: DashboardStats['bestTrade'] = null;
  let worstTrade: DashboardStats['worstTrade'] = null;
  let runningPnl = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let totalWinPnl = 0;
  let totalLossPnl = 0;
  let winCount = 0;
  let lossCount = 0;

  const tradesByDate = new Map<string, any[]>();

  const sortedTrades = [...closedTrades].sort((a, b) => 
    new Date(a.close_at || a.open_at).getTime() - new Date(b.close_at || b.open_at).getTime()
  );

  for (const trade of sortedTrades) {
    const pnl = trade.pnl || 0;
    netPnl += pnl;

    if (pnl > 0) {
      wins++;
      totalWinPnl += pnl;
      winCount++;
    } else if (pnl < 0) {
      losses++;
      totalLossPnl += Math.abs(pnl);
      lossCount++;
    } else {
      breakeven++;
    }

    const calculatedRR = calculateRR(trade);
    if (calculatedRR != null && !isNaN(calculatedRR) && isFinite(calculatedRR)) {
      totalRR += calculatedRR;
      rrCount++;
    }

    if (!bestTrade || pnl > bestTrade.pnl) {
      bestTrade = {
        pnl,
        rr: calculatedRR,
        symbol: normalizeSymbol(trade.symbol) || 'N/A',
        open_at: trade.open_at || trade.close_at || '',
        session: trade.session,
      };
    }
    if (!worstTrade || pnl < worstTrade.pnl) {
      worstTrade = {
        pnl,
        rr: calculatedRR,
        symbol: normalizeSymbol(trade.symbol) || 'N/A',
        open_at: trade.open_at || trade.close_at || '',
        session: trade.session,
      };
    }

    const date = dayjs(trade.close_at || trade.open_at).format('MMM DD');
    if (!tradesByDate.has(date)) {
      tradesByDate.set(date, []);
    }
    tradesByDate.get(date)!.push(trade);
  }

  const cacheKey = closedTrades.length > 0 
    ? `${closedTrades.length}-${closedTrades[0]?.id}-${closedTrades[closedTrades.length - 1]?.id}`
    : 'empty';

  let equitySeries = equitySeriesCache.get(cacheKey);

  if (!equitySeries) {
    equitySeries = [];
    runningPnl = 0;
    peak = 0;

    tradesByDate.forEach((dayTrades, date) => {
      const dayPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      runningPnl += dayPnl;
      
      if (runningPnl > peak) peak = runningPnl;
      const drawdown = peak - runningPnl;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      
      equitySeries!.push({
        date,
        equity: runningPnl,
        pnl: dayPnl,
      });
    });

    equitySeriesCache.set(cacheKey, equitySeries);
  }

  const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : 0;
  const avgWin = winCount > 0 ? totalWinPnl / winCount : 0;
  const avgLoss = lossCount > 0 ? -(totalLossPnl / lossCount) : 0;

  const totalClosedTrades = closedTrades.length;
  const winrate = totalClosedTrades > 0 ? wins / totalClosedTrades : 0;
  const avgRR = rrCount > 0 ? totalRR / rrCount : 0;

  const baseStats = {
    netPnl,
    winrate,
    avgRR: isFinite(avgRR) ? avgRR : 0,
    wins,
    losses,
    breakeven,
    closedTrades: totalClosedTrades,
    maxDrawdown,
    profitFactor: isFinite(profitFactor) ? profitFactor : 0,
    avgWin: isFinite(avgWin) ? avgWin : 0,
    avgLoss: isFinite(avgLoss) ? avgLoss : 0,
    bestTrade: bestTrade && bestTrade.pnl > 0 ? bestTrade : null,
    worstTrade: worstTrade && worstTrade.pnl < 0 ? worstTrade : null,
    equitySeries,
    trades: sortedTrades,
  };

  const result = {
    ...baseStats,
    tier: calculateTier(baseStats),
  };

  // Limit cache size
  if (statsCache.size > 50) {
    const firstKey = statsCache.keys().next().value;
    if (firstKey) statsCache.delete(firstKey);
  }
  statsCache.set(tradeIds, { trades: closedTrades, result });

  return result;
}

// ================================================
// BROKER-ID PARTITION HELPER
// ================================================

/**
 * Splits a mixed array of portfolio ids and broker portfolio ids into two
 * separate lists so callers can apply the correct Supabase filter per id type.
 *
 * portfolioUUIDs → plain UUIDs that go into .in('portfolio_id', ...)
 * brokerConnIds  → the UUID part of "broker_<uuid>" that goes into
 *                  .in('broker_connection_id', ...)
 */
function partitionPortfolioIds(ids: string[] | null): {
  portfolioUUIDs: string[] | null;
  brokerConnIds: string[] | null;
} {
  if (!ids || ids.length === 0) return { portfolioUUIDs: null, brokerConnIds: null };
  const portfolioUUIDs = ids.filter(id => !isBrokerId(id));
  const brokerConnIds = ids.filter(isBrokerId).map(brokerConnId);
  return {
    portfolioUUIDs: portfolioUUIDs.length > 0 ? portfolioUUIDs : null,
    brokerConnIds: brokerConnIds.length > 0 ? brokerConnIds : null,
  };
}

// ================================================
// AGGREGATED-PATH HELPERS (CHUNK 3 B.4 phase 2.A.bis/B/C)
// ================================================

async function fetchAggregatedStats(
  client: typeof supabase,
  userId: string,
  portfolioIds: string[] | null,
  excludePortfolioIds?: string[],
): Promise<{
  user_id: string;
  total_closed: number;
  wins: number;
  losses: number;
  breakeven: number;
  net_pnl: number;
  sum_win_pnl: number;
  sum_loss_pnl: number;
  avg_win: number;
  avg_loss: number;
  avg_rr: number;
} | null> {
  let data: unknown;
  let error: unknown;
  try {
    const result = await withTimeout(
      client.rpc('get_user_portfolio_stats', {
        p_user_id: userId,
        p_portfolio_ids: portfolioIds && portfolioIds.length > 0 ? portfolioIds : null,
        p_exclude_portfolio_ids: excludePortfolioIds && excludePortfolioIds.length > 0 ? excludePortfolioIds : null,
      }),
      TIMEOUTS.SUPABASE_RPC,
      'useDashboardData.fetchAggregatedStats'
    );
    data = result.data;
    error = result.error;
  } catch (err) {
    if (err instanceof TimeoutError) {
      logger.error('useDashboardData.fetchAggregatedStats timed out', err, { userId });
    } else {
      logger.error('useDashboardData.fetchAggregatedStats failed', err, { userId });
    }
    throw err;
  }
  if (error) {
    logger.error('get_user_portfolio_stats RPC error', error, { userId });
    throw error;
  }
  if (!Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as any;
  return {
    user_id: row.user_id,
    total_closed: Number(row.total_closed) || 0,
    wins: Number(row.wins) || 0,
    losses: Number(row.losses) || 0,
    breakeven: Number(row.breakeven) || 0,
    net_pnl: Number(row.net_pnl) || 0,
    sum_win_pnl: Number(row.sum_win_pnl) || 0,
    sum_loss_pnl: Number(row.sum_loss_pnl) || 0,
    avg_win: Number(row.avg_win) || 0,
    avg_loss: Number(row.avg_loss) || 0,
    avg_rr: Number(row.avg_rr) || 0,
  };
}

async function fetchBestWorst(
  client: typeof supabase,
  userId: string,
  cutoffDate: string,
  portfolioIds: string[] | null,
  excludePortfolioIds?: string[],
): Promise<{
  best: DashboardStats['bestTrade'];
  worst: DashboardStats['worstTrade'];
}> {
  const baseSelect = 'id, pnl, open_at, close_at, symbol, session, rr, actual_r, actual_user_r, risk_usd, input_mode, stop_price, entry_price, quantity';
  const isAllAccounts = !portfolioIds || portfolioIds.length === 0;
  const buildBase = () => {
    let q = client
      .from('trades')
      .select(baseSelect)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .in('outcome', ['WIN', 'LOSS', 'BE'])
      .not('pnl', 'is', null)
      .gte('open_at', cutoffDate);
    if (portfolioIds && portfolioIds.length > 0) {
      const { portfolioUUIDs, brokerConnIds } = partitionPortfolioIds(portfolioIds);
      if (portfolioUUIDs && brokerConnIds) {
        // Mixed: use .or() to cover both column types
        q = q.or(
          `portfolio_id.in.(${portfolioUUIDs.join(',')}),broker_connection_id.in.(${brokerConnIds.join(',')})`,
        );
      } else if (brokerConnIds) {
        q = q.in('broker_connection_id', brokerConnIds);
      } else if (portfolioUUIDs) {
        q = q.in('portfolio_id', portfolioUUIDs);
      }
    }
    q = excludeHiddenWhenAllAccounts(q, isAllAccounts, excludePortfolioIds ?? []);
    return q;
  };
  const [bestRes, worstRes] = await Promise.all([
    buildBase().order('pnl', { ascending: false }).limit(1).maybeSingle(),
    buildBase().order('pnl', { ascending: true }).limit(1).maybeSingle(),
  ]);
  if (bestRes.error) console.error('fetchBestWorst best error:', bestRes.error.message);
  if (worstRes.error) console.error('fetchBestWorst worst error:', worstRes.error.message);
  const bestRow = bestRes.data as any;
  const worstRow = worstRes.data as any;
  const best = bestRow && Number(bestRow.pnl) > 0
    ? {
        pnl: Number(bestRow.pnl),
        rr: calculateRR(bestRow),
        symbol: normalizeSymbol(bestRow.symbol) || 'N/A',
        open_at: bestRow.open_at || bestRow.close_at || '',
        session: bestRow.session as TradingSession | undefined,
      }
    : null;
  const worst = worstRow && Number(worstRow.pnl) < 0
    ? {
        pnl: Number(worstRow.pnl),
        rr: calculateRR(worstRow),
        symbol: normalizeSymbol(worstRow.symbol) || 'N/A',
        open_at: worstRow.open_at || worstRow.close_at || '',
        session: worstRow.session as TradingSession | undefined,
      }
    : null;
  return { best, worst };
}

async function fetchDailyPnL(
  client: typeof supabase,
  userId: string,
  cutoffDate: string,
  portfolioIds: string[] | null,
  excludePortfolioIds?: string[],
): Promise<DailyPnLRow[]> {
  const isAllAccounts = !portfolioIds || portfolioIds.length === 0;
  let q = client
    .from('user_daily_pnl_v')
    .select('trade_date, portfolio_id, day_trades, day_pnl')
    .eq('user_id', userId)
    .gte('trade_date', cutoffDate);
  // user_daily_pnl_v only has portfolio_id — broker rows are excluded from this view.
  // Only apply the filter when there are actual portfolio UUIDs in the selection.
  if (portfolioIds && portfolioIds.length > 0) {
    const { portfolioUUIDs } = partitionPortfolioIds(portfolioIds);
    if (portfolioUUIDs) q = q.in('portfolio_id', portfolioUUIDs);
    // If selection is broker-only, filter to nothing (no portfolio_id match possible).
    else q = q.in('portfolio_id', [] as string[]);
  }
  q = excludeHiddenWhenAllAccounts(q, isAllAccounts, excludePortfolioIds ?? []);
  const { data, error } = await q.order('trade_date', { ascending: true });
  if (error) {
    console.error('user_daily_pnl_v query error:', error.message);
    throw error;
  }
  return (data ?? []).map((row: any) => ({
    trade_date: row.trade_date,
    portfolio_id: row.portfolio_id,
    day_trades: Number(row.day_trades) || 0,
    day_pnl: Number(row.day_pnl) || 0,
  }));
}

async function fetchTradesForOverview(
  client: typeof supabase,
  userId: string,
  cutoffDate: string,
  portfolioIds: string[] | null,
  excludePortfolioIds?: string[],
): Promise<Trade[]> {
  const isAllAccounts = !portfolioIds || portfolioIds.length === 0;
  let q = client
    .from('trades')
    .select(`
      id, symbol, pnl, rr, actual_r, actual_user_r, risk_usd, reward_usd,
      open_at, close_at, stop_price, entry_price, quantity, exit_price,
      multiplier, session, input_mode, tags, strategy_id, account_equity_at_entry
    `)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('open_at', cutoffDate)
    .order('open_at', { ascending: true, nullsFirst: false });
  if (portfolioIds && portfolioIds.length > 0) {
    const { portfolioUUIDs, brokerConnIds } = partitionPortfolioIds(portfolioIds);
    if (portfolioUUIDs && brokerConnIds) {
      q = q.or(
        `portfolio_id.in.(${portfolioUUIDs.join(',')}),broker_connection_id.in.(${brokerConnIds.join(',')})`,
      );
    } else if (brokerConnIds) {
      q = q.in('broker_connection_id', brokerConnIds);
    } else if (portfolioUUIDs) {
      q = q.in('portfolio_id', portfolioUUIDs);
    }
  }
  q = excludeHiddenWhenAllAccounts(q, isAllAccounts, excludePortfolioIds ?? []);
  const { data, error } = await q;
  if (error) {
    console.error('fetchTradesForOverview error:', error.message);
    throw error;
  }
  // Match the existing JS path: filter to closed trades + sort by close_at||open_at.
  const closed = (data ?? []).filter(isTradeClosed);
  return [...closed].sort(
    (a: any, b: any) =>
      new Date(a.close_at || a.open_at).getTime() -
      new Date(b.close_at || b.open_at).getTime(),
  ) as Trade[];
}

function composeAggregatedStats(
  agg: Awaited<ReturnType<typeof fetchAggregatedStats>>,
  bestWorst: Awaited<ReturnType<typeof fetchBestWorst>>,
  dailyRows: DailyPnLRow[],
  trades: Trade[],
): DashboardStats {
  if (!agg || agg.total_closed === 0) {
    const zeroBase = {
      netPnl: 0, winrate: 0, avgRR: 0, wins: 0, losses: 0, breakeven: 0,
      closedTrades: 0, maxDrawdown: 0, profitFactor: 0, avgWin: 0, avgLoss: 0,
      bestTrade: null, worstTrade: null, equitySeries: [], trades: [],
    };
    return { ...zeroBase, tier: calculateTier(zeroBase) };
  }

  const byDate = new Map<string, number>();
  for (const row of dailyRows) {
    byDate.set(row.trade_date, (byDate.get(row.trade_date) ?? 0) + row.day_pnl);
  }
  const sortedDates = [...byDate.keys()].sort();

  const cacheKey = `agg-${sortedDates.length}-${sortedDates[0] ?? ''}-${sortedDates[sortedDates.length - 1] ?? ''}-${agg.net_pnl}`;
  let equitySeries = equitySeriesCache.get(cacheKey);
  let maxDrawdown = 0;

  if (!equitySeries) {
    equitySeries = [];
    let running = 0;
    let peak = 0;
    for (const date of sortedDates) {
      const dayPnl = byDate.get(date) ?? 0;
      running += dayPnl;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDrawdown) maxDrawdown = dd;
      equitySeries.push({
        date: dayjs(date).format('MMM DD'),
        equity: running,
        pnl: dayPnl,
      });
    }
    equitySeriesCache.set(cacheKey, equitySeries);
  } else {
    let peak = 0;
    for (const pt of equitySeries) {
      if (pt.equity > peak) peak = pt.equity;
      const dd = peak - pt.equity;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
  }

  const winrate = agg.total_closed > 0 ? agg.wins / agg.total_closed : 0;
  const profitFactor = agg.sum_loss_pnl > 0 ? agg.sum_win_pnl / agg.sum_loss_pnl : 0;

  const baseStats = {
    netPnl: agg.net_pnl,
    winrate,
    avgRR: isFinite(agg.avg_rr) ? agg.avg_rr : 0,
    wins: agg.wins,
    losses: agg.losses,
    breakeven: agg.breakeven,
    closedTrades: agg.total_closed,
    maxDrawdown,
    profitFactor: isFinite(profitFactor) ? profitFactor : 0,
    avgWin: isFinite(agg.avg_win) ? agg.avg_win : 0,
    avgLoss: isFinite(agg.avg_loss) ? agg.avg_loss : 0,
    bestTrade: bestWorst.best,
    worstTrade: bestWorst.worst,
    equitySeries,
    trades,
  };

  return { ...baseStats, tier: calculateTier(baseStats) };
}

// ================================================
// TRADER MODE — paginated all-time fetch
// ================================================

const TRADER_PAGE_SIZE = 1000;
const TRADER_MAX_PAGES = 50; // hard safety cap: 50k rows

/**
 * Fetches ALL trades (no date cutoff) for a given user, paginating through
 * Supabase's 1000-row limit. Used only when isTraderMode + all-time view.
 * Respects portfolio scoping identical to the standard overview fetch.
 */
async function fetchAllTradesForTrader(
  client: typeof supabase,
  userId: string,
  portfolioIds: string[] | null,
  excludePortfolioIds?: string[],
): Promise<Trade[]> {
  const select = `
    id, symbol, pnl, rr, actual_r, actual_user_r, risk_usd, reward_usd,
    open_at, close_at, stop_price, entry_price, quantity, exit_price,
    multiplier, session, input_mode, tags, strategy_id, account_equity_at_entry,
    portfolio_id, broker_connection_id, side
  `;

  const isAllAccounts = !portfolioIds || portfolioIds.length === 0;
  const buildQuery = (from: number) => {
    let q = client
      .from('trades')
      .select(select)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('open_at', { ascending: true, nullsFirst: false })
      .range(from, from + TRADER_PAGE_SIZE - 1); // ← pagination loop anchor

    if (portfolioIds && portfolioIds.length > 0) {
      const { portfolioUUIDs, brokerConnIds } = partitionPortfolioIds(portfolioIds);
      if (portfolioUUIDs && brokerConnIds) {
        q = q.or(
          `portfolio_id.in.(${portfolioUUIDs.join(',')}),broker_connection_id.in.(${brokerConnIds.join(',')})`,
        );
      } else if (brokerConnIds) {
        q = q.in('broker_connection_id', brokerConnIds);
      } else if (portfolioUUIDs) {
        q = q.in('portfolio_id', portfolioUUIDs);
      }
    }
    q = excludeHiddenWhenAllAccounts(q, isAllAccounts, excludePortfolioIds ?? []);
    return q;
  };

  const allRows: Trade[] = [];
  let page = 0;

  while (page < TRADER_MAX_PAGES) {
    const { data, error } = await buildQuery(page * TRADER_PAGE_SIZE);
    if (error) {
      console.error('fetchAllTradesForTrader page error:', error.message);
      throw error;
    }
    const rows = (data ?? []) as Trade[];
    allRows.push(...rows);
    if (rows.length < TRADER_PAGE_SIZE) break; // last page
    page++;
  }

  if (page >= TRADER_MAX_PAGES) {
    console.warn(
      `fetchAllTradesForTrader: hit safety cap of ${TRADER_MAX_PAGES} pages (${allRows.length} rows). Some trades may be excluded.`,
    );
  }

  return allRows;
}

// ================================================
// REACT HOOKS WITH ADMIN MODE SUPPORT
// ================================================

export function useDashboardStats(
  daysBack?: number,
  overrideUserId?: string,
  portfolioId?: string | null,
  portfolioIds?: string[] | null,
  isTraderMode?: boolean,
  traderMode?: TraderMode,
  excludePortfolioIds?: string[],
) {
  const { id: effectiveUserId, isImpersonating } = useEffectiveUser();
  const { enableAdminMode } = useImpersonation();
  const queryClient = useQueryClient();
  
  const userId = overrideUserId || effectiveUserId;
  const dashboardPortfolioId = portfolioId ?? null;
  const dashboardPortfolioIds = portfolioIds ?? null;

  // Track if we've prefetched to avoid doing it multiple times
  const hasPrefetched = useRef(false);

  const query = useQuery({
    queryKey: [
      ...dashboardKeys.stats(userId || '', daysBack || -1),
      dashboardPortfolioIds && dashboardPortfolioIds.length > 0
        ? dashboardPortfolioIds.join(',')
        : (dashboardPortfolioId ?? 'all'),
      isTraderMode ? `trader:${traderMode ?? 'per-contract'}` : 'normal',
      excludePortfolioIds && excludePortfolioIds.length > 0 ? `excl:${excludePortfolioIds.join(',')}` : 'excl:none',
    ],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID available');

      // Enable admin mode if impersonating
      if (isImpersonating && enableAdminMode) {
        devLog('🔓 Enabling admin_mode for impersonation query...');
        await enableAdminMode();
      }

      // SAFETY BACKSTOP — caller passes `daysBack=null` for "all time".
      // We still cap lookback at MAX_LOOKBACK_DAYS to prevent unbounded
      // SELECT on `trades` (CHUNK 3 B.4 phase-1 frontend hardening).
      // Older trades require explicit dateStart/dateEnd in the UI.
      const MAX_LOOKBACK_DAYS = 365;
      const effectiveLookbackDays = daysBack && daysBack > 0 ? daysBack : MAX_LOOKBACK_DAYS;
      const cutoffDate = dayjs().subtract(effectiveLookbackDays, 'days').toISOString();

      devLog('🔑 Dashboard query config:', { userId, isImpersonating, cutoffDate, effectiveLookbackDays });

      const client = supabase;

      // CHUNK 3 B.4 phase 2.D — for "all-time" view (no daysBack or >= MAX_LOOKBACK_DAYS),
      // use server-side aggregated path: RPC + view + 2 small SELECTs. Eliminates the
      // unbounded trades fetch. JS path below remains for short lookbacks.
      const isAllTimeView = !daysBack || daysBack >= MAX_LOOKBACK_DAYS;
      // All-accounts scope = no specific portfolio selected. Copier trades span
      // multiple portfolios, so dedup is required and the RPC aggregate path
      // (which counts raw rows) must be bypassed in favour of the raw-trades path.
      const isAllAccounts =
        !dashboardPortfolioId &&
        (!dashboardPortfolioIds || dashboardPortfolioIds.length === 0);
      // ── TRADER all-time path: paginated fetch + client-side normalization ──
      // Bypasses the RPC aggregate entirely (it counts raw rows, not decisions).
      if (isTraderMode && isAllTimeView) {
        const effectivePortfolioIds = dashboardPortfolioIds && dashboardPortfolioIds.length > 0
          ? dashboardPortfolioIds
          : (dashboardPortfolioId ? [dashboardPortfolioId] : null);
        devLog('🔄 TRADER all-time path: paginated fetch');
        const allRows = await fetchAllTradesForTrader(client, userId, effectivePortfolioIds, excludePortfolioIds);
        const normalized = normalizeTraderTrades(allRows, traderMode ?? 'per-contract');
        devLog(`✅ TRADER: ${allRows.length} raw → ${normalized.length} decisions`);
        return computeStats(normalized);
      }

      if (isAllTimeView && !isAllAccounts) {
        const effectivePortfolioIds = dashboardPortfolioIds && dashboardPortfolioIds.length > 0
          ? dashboardPortfolioIds
          : (dashboardPortfolioId ? [dashboardPortfolioId] : null);
        // RPC get_user_portfolio_stats only understands portfolio_id — pass only plain UUIDs.
        const { portfolioUUIDs: rpcPortfolioIds } = partitionPortfolioIds(effectivePortfolioIds);
        const [agg, bestWorst, dailyRows, tradesForOverview] = await Promise.all([
          fetchAggregatedStats(client, userId, rpcPortfolioIds, excludePortfolioIds),
          fetchBestWorst(client, userId, cutoffDate, effectivePortfolioIds, excludePortfolioIds),
          fetchDailyPnL(client, userId, cutoffDate, effectivePortfolioIds, excludePortfolioIds),
          fetchTradesForOverview(client, userId, cutoffDate, effectivePortfolioIds, excludePortfolioIds),
        ]);
        devLog('✅ Aggregated path: RPC + view scalars + trades for Overview (2.D-2 will drop trades)');
        return composeAggregatedStats(agg, bestWorst, dailyRows, tradesForOverview);
      }

      // 🔥 CRITICAL FIX: Fetch ALL trades, then filter closed ones in computeStats
      // This supports both Summary mode (exit_price) and Risk-Only mode (pnl without exit_price)
      let queryBuilder = client
        .from('trades')
        .select(`
          id, symbol, pnl, rr, actual_r, actual_user_r, risk_usd, reward_usd,
          open_at, close_at, stop_price, entry_price, quantity, exit_price,
          multiplier, session, input_mode, tags, side, fees, portfolio_id,
          strategy_id, account_equity_at_entry
        `)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('open_at', { ascending: true, nullsFirst: false });

      // 🔥 Portfolio filter: null = all accounts, string[] = multi-select, string = single
      // broker_ prefix → filter by broker_connection_id instead of portfolio_id
      if (dashboardPortfolioIds && dashboardPortfolioIds.length > 0) {
        const { portfolioUUIDs, brokerConnIds } = partitionPortfolioIds(dashboardPortfolioIds);
        if (portfolioUUIDs && brokerConnIds) {
          queryBuilder = queryBuilder.or(
            `portfolio_id.in.(${portfolioUUIDs.join(',')}),broker_connection_id.in.(${brokerConnIds.join(',')})`,
          );
        } else if (brokerConnIds) {
          queryBuilder = queryBuilder.in('broker_connection_id', brokerConnIds);
        } else if (portfolioUUIDs) {
          queryBuilder = queryBuilder.in('portfolio_id', portfolioUUIDs);
        }
      } else if (dashboardPortfolioId) {
        if (isBrokerId(dashboardPortfolioId)) {
          queryBuilder = queryBuilder.eq('broker_connection_id', brokerConnId(dashboardPortfolioId));
        } else {
          queryBuilder = queryBuilder.eq('portfolio_id', dashboardPortfolioId);
        }
      }

      // Cutoff is always set (defaults to MAX_LOOKBACK_DAYS for "all time").
      // 🔥 Use open_at for date filtering (works for both modes).
      queryBuilder = queryBuilder.gte('open_at', cutoffDate);
      // Exclude hidden portfolios when showing all accounts.
      queryBuilder = excludeHiddenWhenAllAccounts(queryBuilder, isAllAccounts, excludePortfolioIds ?? []);

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('❌ Dashboard query error:', error.message);
        
        if (error.code === 'PGRST116' || error.message?.includes('row-level security')) {
          throw new Error(
            `Access denied. ${isImpersonating ? 'Admin mode required.' : 'You can only view your own data.'}`
          );
        }
        
        throw error;
      }
      
      devLog(`✅ Loaded ${data?.length || 0} trades (will filter closed in computeStats)`);

      // De-duplicate copier trades for the "all accounts" scope so Overview
      // counts match My Trades (single shared aggregation logic).
      let rows = isAllAccounts
        ? aggregateCopiedTrades(data || [], 'all-accounts')
        : (data || []);

      // TRADER short-lookback path: normalize before the existing pipeline.
      if (isTraderMode) {
        rows = normalizeTraderTrades(rows, traderMode ?? 'per-contract');
      }

      return computeStats(rows);
    },
    enabled: !!userId,
    // ✅ OPTIMIZED: Longer stale time, no refetch on mount
    staleTime: 5 * 60 * 1000,      // 5 minutes
    gcTime: 15 * 60 * 1000,         // 15 minutes
    refetchOnMount: false,          // ✅ KEY FIX
    refetchOnWindowFocus: false,    // ✅ KEY FIX
    retry: false,
  });

  // Prefetch other ranges only once when data loads successfully
  useEffect(() => {
    if (userId && query.isSuccess && !hasPrefetched.current) {
      hasPrefetched.current = true;
      
      const ranges = [7, 30, 90];
      ranges.forEach(days => {
        if (days !== daysBack) {
          queryClient.prefetchQuery({
            queryKey: dashboardKeys.stats(userId, days),
            staleTime: 5 * 60 * 1000,
          });
        }
      });
    }
  }, [userId, query.isSuccess, queryClient, daysBack]);

  return query;
}

export function useSnapTradeConnections(overrideUserId?: string) {
  const { id: effectiveUserId, isImpersonating } = useEffectiveUser();
  const { enableAdminMode } = useImpersonation();
  
  const userId = overrideUserId || effectiveUserId;

  return useQuery({
    queryKey: dashboardKeys.connections(userId || ''),
    queryFn: async () => {
      if (!userId) return [];

      if (isImpersonating && enableAdminMode) {
        await enableAdminMode();
      }

      try {
        const { data, error } = await supabase
          .from('broker_connections')
          .select('id, status, broker, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (error) {
          devLog('⚠️ broker_connections query failed:', error.message);
          return [];
        }

        return data || [];
      } catch (err) {
        devLog('⚠️ Error loading connections:', err);
        return [];
      }
    },
    enabled: !!userId,
    // ✅ OPTIMIZED caching
    staleTime: 10 * 60 * 1000,      // 10 minutes - connections don't change often
    gcTime: 30 * 60 * 1000,          // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

export function formatCurrency(value: number): string {
  // Negatives must show an explicit minus sign (not just red color), e.g. "−$14,440.00".
  const sign = value >= 0 ? '+' : '−';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function getPnLColor(pnl: number): string {
  if (pnl > 0) return 'text-[#4AD295]';
  if (pnl < 0) return 'text-[#E36363]';
  return 'text-[#A0A0A0]';
}

export function clearDashboardCache() {
  equitySeriesCache.clear();
  statsCache.clear();
  devLog('🧹 Dashboard cache cleared');
}
