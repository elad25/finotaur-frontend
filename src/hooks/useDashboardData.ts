// src/hooks/useDashboardData.ts
// ================================================
// OPTIMIZED FOR 5000+ USERS - v2.1 WITH SESSION SUPPORT
// ✅ Calls enable_admin_mode() before queries
// ✅ Full admin client support
// ✅ Trading session support added
// ================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useAuth } from '@/providers/AuthProvider';
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
  session?: TradingSession; // ✅ NEW: Trading session
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
    session?: TradingSession; // ✅ NEW: Added session support
  } | null;
  worstTrade: {
    pnl: number;
    rr: number | null;
    symbol: string;
    open_at: string;
    session?: TradingSession; // ✅ NEW: Added session support
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
  stats: (userId: string, days: number) => [...dashboardKeys.all, 'stats', userId, days] as const,
  connections: (userId: string) => [...dashboardKeys.all, 'connections', userId] as const,
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
      this.cache.delete(firstKey);
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
    console.log('📦 Using cached stats computation');
    return cached.result;
  }

  let netPnl = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let totalRR = 0;
  let rrCount = 0;
  let bestTrade = null;
  let worstTrade = null;
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

    // ✅ UPDATED: Include session in best/worst trade tracking
    if (!bestTrade || pnl > bestTrade.pnl) {
      bestTrade = {
        pnl,
        rr: calculatedRR,
        symbol: trade.symbol || 'N/A',
        open_at: trade.open_at || trade.close_at || '',
        session: trade.session, // ✅ NEW
      };
    }
    if (!worstTrade || pnl < worstTrade.pnl) {
      worstTrade = {
        pnl,
        rr: calculatedRR,
        symbol: trade.symbol || 'N/A',
        open_at: trade.open_at || trade.close_at || '',
        session: trade.session, // ✅ NEW
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

  if (statsCache.size > 50) {
    const firstKey = statsCache.keys().next().value;
    statsCache.delete(firstKey);
  }
  statsCache.set(tradeIds, { trades, result });

  console.log('📊 Dashboard stats calculated:', {
    netPnl,
    wins,
    losses,
    winrate: (winrate * 100).toFixed(1) + '%',
    profitFactor: profitFactor.toFixed(2),
  });

  return result;
}

// ================================================
// REACT HOOKS WITH ADMIN MODE SUPPORT
// ================================================

export function useDashboardStats(daysBack?: number, overrideUserId?: string) {
  const { id: effectiveUserId, isImpersonating } = useEffectiveUser();
  const { user } = useAuth();
  const { enableAdminMode } = useImpersonation();
  const queryClient = useQueryClient();
  
  const userId = overrideUserId || effectiveUserId;
  const shouldUseAdminClient = isImpersonating && !!supabaseAdmin;

  const query = useQuery({
    queryKey: dashboardKeys.stats(userId || '', daysBack || -1),
    queryFn: async () => {
      if (!userId) throw new Error('No user ID available');

      // 🔥 CRITICAL: Enable admin mode BEFORE query if impersonating
      if (isImpersonating && enableAdminMode) {
        console.log('🔓 Enabling admin_mode for impersonation query...');
        const enabled = await enableAdminMode();
        if (!enabled) {
          console.warn('⚠️ Failed to enable admin_mode - query may fail');
        } else {
          console.log('✅ admin_mode enabled - RLS bypassed');
        }
      }

      const cutoffDate = daysBack && daysBack > 0
        ? dayjs().subtract(daysBack, 'days').toISOString()
        : null;

      console.log('🔑 Dashboard query config:', {
        userId,
        effectiveUserId,
        isImpersonating,
        shouldUseAdminClient,
        adminModeEnabled: isImpersonating,
        cutoffDate,
      });

      if (isImpersonating && !supabaseAdmin) {
        console.error('❌ CRITICAL: Impersonating but supabaseAdmin is null!');
        throw new Error(
          'Admin client not configured. Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env file.'
        );
      }

      const client = shouldUseAdminClient ? supabaseAdmin! : supabase;
      
      console.log('📡 Query using:', shouldUseAdminClient ? '🔓 ADMIN CLIENT' : '🔒 REGULAR CLIENT');

      // ✅ UPDATED: Added session to the select query
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
        console.error('❌ Dashboard query error:', {
          error,
          userId,
          client: shouldUseAdminClient ? 'ADMIN' : 'REGULAR',
          message: error.message,
          code: error.code,
        });
        
        if (error.code === 'PGRST116' || error.message?.includes('row-level security')) {
          throw new Error(
            `Access denied. ${isImpersonating ? 'Admin mode required.' : 'You can only view your own data.'}`
          );
        }
        
        throw error;
      }
      
      console.log(`✅ Successfully loaded ${data?.length || 0} trades for user ${userId}`);
      
      if (data && data.length > 0) {
        console.log('📊 Sample trade:', {
          id: data[0].id,
          symbol: data[0].symbol,
          pnl: data[0].pnl,
          session: data[0].session, // ✅ NEW
        });
      }
      
      return computeStats(data || []);
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (userId && query.isSuccess) {
      const ranges = [7, 30, 90];
      ranges.forEach(days => {
        queryClient.prefetchQuery({
          queryKey: dashboardKeys.stats(userId, days),
          staleTime: 5 * 60 * 1000,
        });
      });
    }
  }, [userId, query.isSuccess, queryClient]);

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

      // 🔥 Enable admin mode if impersonating
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
          console.warn('⚠️ broker_connections query failed:', error.message);
          return [];
        }

        console.log(`✅ Loaded ${data?.length || 0} connections for user ${userId}`);
        return data || [];
      } catch (err) {
        console.warn('⚠️ Error loading connections:', err);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
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
  console.log('🧹 Dashboard cache cleared');
}