// src/hooks/useDashboardData.ts
// ================================================
// OPTIMIZED FOR 5000+ USERS - v2.2
// ✅ FIXED: Reduced console logging for production
// ✅ FIXED: Better caching with refetchOnMount: false
// ✅ Calls enable_admin_mode() before queries
// ✅ Full admin client support
// ✅ Trading session support added
// ================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import dayjs from 'dayjs';

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
  risk_usd: number | null;
  open_at: string;
  close_at: string | null;
  stop_price: number | null;
  entry_price: number | null;
  quantity: number | null;
  exit_price: number | null;
  multiplier: number | null;
  session?: TradingSession;
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

function calculateRR(trade: any): number | null {
  if (trade.rr != null && !isNaN(trade.rr) && trade.rr > 0) return trade.rr;
  if (trade.actual_r != null && !isNaN(trade.actual_r) && trade.actual_r > 0) return trade.actual_r;
  
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
  const tradeIds = trades.map(t => t.id).join(',');
  const cached = statsCache.get(tradeIds);
  if (cached && cached.trades === trades) {
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

  const sortedTrades = [...trades].sort((a, b) => 
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
        symbol: trade.symbol || 'N/A',
        open_at: trade.open_at || trade.close_at || '',
        session: trade.session,
      };
    }
    if (!worstTrade || pnl < worstTrade.pnl) {
      worstTrade = {
        pnl,
        rr: calculatedRR,
        symbol: trade.symbol || 'N/A',
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

  const cacheKey = trades.length > 0 
    ? `${trades.length}-${trades[0]?.id}-${trades[trades.length - 1]?.id}`
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

  const closedTrades = trades.length;
  const winrate = closedTrades > 0 ? wins / closedTrades : 0;
  const avgRR = rrCount > 0 ? totalRR / rrCount : 0;

  const baseStats = {
    netPnl,
    winrate,
    avgRR: isFinite(avgRR) ? avgRR : 0,
    wins,
    losses,
    breakeven,
    closedTrades,
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
  statsCache.set(tradeIds, { trades, result });

  return result;
}

// ================================================
// REACT HOOKS WITH ADMIN MODE SUPPORT
// ================================================

export function useDashboardStats(daysBack?: number, overrideUserId?: string) {
  const { id: effectiveUserId, isImpersonating } = useEffectiveUser();
  const { enableAdminMode } = useImpersonation();
  const queryClient = useQueryClient();
  
  const userId = overrideUserId || effectiveUserId;
  const shouldUseAdminClient = isImpersonating && !!supabaseAdmin;
  
  // Track if we've prefetched to avoid doing it multiple times
  const hasPrefetched = useRef(false);

  const query = useQuery({
    queryKey: dashboardKeys.stats(userId || '', daysBack || -1),
    queryFn: async () => {
      if (!userId) throw new Error('No user ID available');

      // Enable admin mode if impersonating
      if (isImpersonating && enableAdminMode) {
        devLog('🔓 Enabling admin_mode for impersonation query...');
        await enableAdminMode();
      }

      const cutoffDate = daysBack && daysBack > 0
        ? dayjs().subtract(daysBack, 'days').toISOString()
        : null;

      devLog('🔑 Dashboard query config:', { userId, isImpersonating, cutoffDate });

      if (isImpersonating && !supabaseAdmin) {
        throw new Error('Admin client not configured. Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env file.');
      }

      const client = shouldUseAdminClient ? supabaseAdmin! : supabase;

      let queryBuilder = client
        .from('trades')
        .select('id, symbol, pnl, rr, actual_r, risk_usd, open_at, close_at, stop_price, entry_price, quantity, exit_price, multiplier, session')
        .eq('user_id', userId)
        .not('exit_price', 'is', null)
        .order('open_at', { ascending: true, nullsFirst: false });

      if (cutoffDate) {
        queryBuilder = queryBuilder.gte('close_at', cutoffDate);
      }

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
      
      devLog(`✅ Loaded ${data?.length || 0} trades`);
      
      return computeStats(data || []);
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
  const shouldUseAdminClient = isImpersonating && !!supabaseAdmin;

  return useQuery({
    queryKey: dashboardKeys.connections(userId || ''),
    queryFn: async () => {
      if (!userId) return [];

      if (isImpersonating && enableAdminMode) {
        await enableAdminMode();
      }

      try {
        const client = shouldUseAdminClient ? supabaseAdmin! : supabase;

        const { data, error } = await client
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
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
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