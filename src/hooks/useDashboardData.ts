// ================================================
// OPTIMIZED FOR 5000+ USERS - Ultra Performance + Impersonation Support
// File: src/hooks/useDashboardData.ts
// 🔥 FIXED: Added admin client support for impersonation
// ✅ ENHANCED: Added profitFactor, avgWin, avgLoss calculations
// ✅ NEW: Added trades array for chart data
// ================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useAuth } from '@/providers/AuthProvider';
import dayjs from 'dayjs';

// ================================================
// TYPES & INTERFACES
// ================================================

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
  
  // ✅ NEW FIELDS - Added for enhanced KPI cards
  profitFactor: number;  // Gross profit / Gross loss (>1 = profitable)
  avgWin: number;        // Average winning trade P&L
  avgLoss: number;       // Average losing trade P&L (negative number)
  
  bestTrade: {
    pnl: number;
    rr: number | null;
    symbol: string;
    open_at: string;
  } | null;
  worstTrade: {
    pnl: number;
    rr: number | null;
    symbol: string;
    open_at: string;
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
  
  // ✅ NEW: Array of trades for charts
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
    this.cache.set(key, value); // Move to end (most recent)
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
  // Priority 1: Use existing RR fields
  if (trade.rr != null && !isNaN(trade.rr) && trade.rr > 0) return trade.rr;
  if (trade.actual_r != null && !isNaN(trade.actual_r) && trade.actual_r > 0) return trade.actual_r;
  
  // Priority 2: Calculate from P&L and risk
  if (trade.pnl != null && trade.risk_usd && trade.risk_usd > 0) {
    return Math.abs(trade.pnl) / trade.risk_usd;
  }
  
  // Priority 3: Calculate from trade parameters
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
  // Check cache first
  const tradeIds = trades.map(t => t.id).join(',');
  const cached = statsCache.get(tradeIds);
  if (cached && cached.trades === trades) {
    console.log('📦 Using cached stats computation');
    return cached.result;
  }

  // Initialize accumulators
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
  
  // ✅ NEW: Accumulators for profit factor and avg win/loss
  let totalWinPnl = 0;
  let totalLossPnl = 0;
  let winCount = 0;
  let lossCount = 0;

  const tradesByDate = new Map<string, any[]>();

  // Sort trades chronologically
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.close_at || a.open_at).getTime() - new Date(b.close_at || b.open_at).getTime()
  );

  // Single-pass computation
  for (const trade of sortedTrades) {
    const pnl = trade.pnl || 0;
    netPnl += pnl;

    // Win/Loss/Breakeven tracking
    if (pnl > 0) {
      wins++;
      // ✅ NEW: Track winning trades for profit factor
      totalWinPnl += pnl;
      winCount++;
    } else if (pnl < 0) {
      losses++;
      // ✅ NEW: Track losing trades for profit factor
      totalLossPnl += Math.abs(pnl);
      lossCount++;
    } else {
      breakeven++;
    }

    // RR calculation
    const calculatedRR = calculateRR(trade);
    if (calculatedRR != null && !isNaN(calculatedRR) && isFinite(calculatedRR)) {
      totalRR += calculatedRR;
      rrCount++;
    }

    // Best/Worst trade tracking
    if (!bestTrade || pnl > bestTrade.pnl) {
      bestTrade = {
        pnl,
        rr: calculatedRR,
        symbol: trade.symbol || 'N/A',
        open_at: trade.open_at || trade.close_at || '',
      };
    }
    if (!worstTrade || pnl < worstTrade.pnl) {
      worstTrade = {
        pnl,
        rr: calculatedRR,
        symbol: trade.symbol || 'N/A',
        open_at: trade.open_at || trade.close_at || '',
      };
    }

    // Group by date for equity series
    const date = dayjs(trade.close_at || trade.open_at).format('MMM DD');
    if (!tradesByDate.has(date)) {
      tradesByDate.set(date, []);
    }
    tradesByDate.get(date)!.push(trade);
  }

  // Equity series computation with caching
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
      
      // Drawdown calculation
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

  // ✅ NEW: Calculate Profit Factor and Avg Win/Loss
  const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : 0;
  const avgWin = winCount > 0 ? totalWinPnl / winCount : 0;
  const avgLoss = lossCount > 0 ? -(totalLossPnl / lossCount) : 0; // Negative number

  // Final calculations
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
    // ✅ NEW: Add profit factor and avg win/loss
    profitFactor: isFinite(profitFactor) ? profitFactor : 0,
    avgWin: isFinite(avgWin) ? avgWin : 0,
    avgLoss: isFinite(avgLoss) ? avgLoss : 0,
    bestTrade: bestTrade && bestTrade.pnl > 0 ? bestTrade : null,
    worstTrade: worstTrade && worstTrade.pnl < 0 ? worstTrade : null,
    equitySeries,
    // ✅ NEW: Include sorted trades array for charts
    trades: sortedTrades,
  };

  const result = {
    ...baseStats,
    tier: calculateTier(baseStats),
  };

  // Cache the result
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
    avgWin: avgWin.toFixed(2),
    avgLoss: avgLoss.toFixed(2),
  });

  return result;
}

// ================================================
// REACT HOOKS WITH IMPERSONATION SUPPORT
// ================================================

export function useDashboardStats(daysBack?: number, overrideUserId?: string) {
  const { id: effectiveUserId, isImpersonating } = useEffectiveUser();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Use override if provided, otherwise use effective user
  const userId = overrideUserId || effectiveUserId;
  
  // ✅ ALWAYS use admin client for impersonation, regular client otherwise
  const shouldUseAdminClient = isImpersonating && !!supabaseAdmin;

  const query = useQuery({
    queryKey: dashboardKeys.stats(userId || '', daysBack || -1),
    queryFn: async () => {
      if (!userId) throw new Error('No user ID available');

      const cutoffDate = daysBack && daysBack > 0
        ? dayjs().subtract(daysBack, 'days').toISOString()
        : null;

      // ✅ Choose the right client - admin client bypasses RLS during impersonation
      const client = shouldUseAdminClient ? supabaseAdmin! : supabase;
      
      console.log('🔑 Dashboard query using:', {
        client: shouldUseAdminClient ? 'ADMIN (bypasses RLS)' : 'REGULAR',
        userId,
        isImpersonating,
        cutoffDate,
        supabaseAdminExists: !!supabaseAdmin
      });

      // ✅ Filter by exit_price to get closed trades (NOT NULL)
      let queryBuilder = client
        .from('trades')
        .select('id, symbol, pnl, rr, actual_r, risk_usd, open_at, close_at, stop_price, entry_price, quantity, exit_price, multiplier')
        .eq('user_id', userId)
        .not('exit_price', 'is', null)  // ✅ Only trades with exit price
        .order('open_at', { ascending: true, nullsFirst: false });

      if (cutoffDate) {
        queryBuilder = queryBuilder.gte('close_at', cutoffDate);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('❌ Dashboard query error:', error);
        throw error;
      }
      
      console.log(`✅ Loaded ${data?.length || 0} closed trades for user ${userId}`, data);
      return computeStats(data || []);
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Prefetch common time ranges
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
  const { user } = useAuth();
  
  // Use override if provided, otherwise use effective user
  const userId = overrideUserId || effectiveUserId;
  
  // ✅ ALWAYS use admin client for impersonation
  const shouldUseAdminClient = isImpersonating && !!supabaseAdmin;

  return useQuery({
    queryKey: dashboardKeys.connections(userId || ''),
    queryFn: async () => {
      if (!userId) return [];

      try {
        // ✅ Choose the right client
        const client = shouldUseAdminClient ? supabaseAdmin! : supabase;
        
        console.log('🔑 Connections query using:', {
          client: shouldUseAdminClient ? 'ADMIN' : 'REGULAR',
          supabaseAdminExists: !!supabaseAdmin
        });

        const { data, error } = await client
          .from('broker_connections')
          .select('id, status, broker, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('⚠️ broker_connections table not found');
          return [];
        }

        console.log(`✅ Loaded ${data?.length || 0} broker connections for user ${userId}`);
        return data || [];
      } catch (err) {
        console.warn('⚠️ Error loading broker connections:', err);
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

// ================================================
// CACHE MANAGEMENT
// ================================================

export function clearDashboardCache() {
  equitySeriesCache.clear();
  statsCache.clear();
  console.log('🧹 Dashboard cache cleared');
}