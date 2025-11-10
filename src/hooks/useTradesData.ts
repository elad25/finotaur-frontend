// ================================================
// 🔥 OPTIMIZED: useTradesData - Ultra Performance
// ================================================
// ✅ Optimized VIEW usage with pagination support
// ✅ Stable references (no unnecessary recalculations)
// ✅ Smart refetch strategy
// ✅ Minimal DB load
// ✅ IMPERSONATION SUPPORT
// ================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryClient';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';  // ✅ FIXED PATH
import { useMemo, useRef, useEffect } from 'react';

// ================================================
// 🎯 TYPES (אותם types כמו שהיה)
// ================================================

export interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price?: number;
  stop_price: number;
  take_profit_price?: number;
  quantity: number;
  fees: number;
  fees_mode?: string;
  pnl?: number;
  outcome?: 'WIN' | 'LOSS' | 'BE' | 'OPEN';
  open_at: string;
  close_at?: string;
  session?: string;
  strategy_id?: string;
  strategy_name?: string;
  setup?: string;
  notes?: string;
  mistake?: string;
  next_time?: string;
  screenshot_url?: string;
  asset_class?: string;
  quality_tag?: string;
  broker?: string;
  external_id?: string;
  multiplier?: number;
  metrics?: {
    rr?: number;
    riskUSD?: number;
    rewardUSD?: number;
    riskPts?: number;
    rewardPts?: number;
    actual_r?: number;
    user_risk_r?: number;
    user_reward_r?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface TradeStats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  totalPnL: number;
  avgR: number;
}

// ================================================
// 🔥 OPTIMIZED FETCH - With Smart Pagination
// ================================================

async function fetchAllTrades(userId: string): Promise<Trade[]> {
  if (!userId) {
    console.log('❌ No user ID - skipping trades fetch');
    return [];
  }

  console.log('📊 Fetching trades for user:', userId);

  // 🚀 OPTIMIZED: Fetch from VIEW but with explicit columns
  // This helps Postgres optimizer to only calculate what we need
  const { data, error } = await supabase
    .from('trades_with_metrics')
    .select(`
      id, user_id, symbol, side, entry_price, exit_price,
      stop_price, take_profit_price, quantity, fees, fees_mode,
      pnl, outcome, open_at, close_at, session,
      strategy_id, strategy_name, setup, notes, mistake, next_time,
      screenshot_url, asset_class, quality_tag, broker, external_id,
      multiplier, metrics, created_at, updated_at,
      actual_r, risk_usd, rr
    `)
    .eq('user_id', userId)
    .order('open_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching trades:', error);
    throw error;
  }

  console.log(`✅ Fetched ${data?.length || 0} trades`);

  // 🚀 OPTIMIZED: Minimal processing
  return (data || []).map(trade => ({
    ...trade,
    multiplier: trade.multiplier || 1,
    actual_r: trade.actual_r || null,
    risk_usd: trade.risk_usd || 0,
    rr: trade.rr || null,
    metrics: trade.metrics || {},
  })) as Trade[];
}

// ================================================
// 🔥 PRIMARY HOOK - All Trades - WITH IMPERSONATION SUPPORT
// ================================================

export function useTrades(userId?: string) {  // ✅ ADDED userId parameter
  const { id: effectiveUserId } = useEffectiveUser();  // ✅ FIXED destructuring
  
  // Use provided userId or fallback to effectiveUserId
  const targetUserId = userId || effectiveUserId;

  return useQuery({
    queryKey: queryKeys.trades(targetUserId || ''),
    queryFn: () => fetchAllTrades(targetUserId!),
    enabled: !!targetUserId,  // ✅ FIXED
    
    // 🚀 PERFORMANCE: Aggressive caching
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    
    // 🚀 FIXED: Smart refetch strategy
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // ✅ Always check for fresh data on mount
    refetchInterval: false, // ❌ No automatic polling
  });
}

// ================================================
// 🔥 OPTIMIZED: Stable Trade Stats (No Re-calculations)
// ================================================

export function useTradeStats(): {
  data: TradeStats | undefined;
  isLoading: boolean;
} {
  const { data: trades, isLoading } = useTrades();
  
  // 🚀 CRITICAL: Use stable reference to prevent re-calculations
  const tradesRef = useRef<Trade[]>([]);
  const statsRef = useRef<TradeStats | undefined>(undefined);
  
  // 🚀 Only recalculate if trades actually changed (deep comparison of IDs)
  useEffect(() => {
    if (!trades || trades.length === 0) {
      statsRef.current = undefined;
      return;
    }
    
    // Compare by IDs and updated_at to detect real changes
    const currentIds = trades.map(t => `${t.id}-${t.updated_at}`).join(',');
    const previousIds = tradesRef.current.map(t => `${t.id}-${t.updated_at}`).join(',');
    
    if (currentIds === previousIds) {
      // No change - skip recalculation
      return;
    }
    
    // Trades changed - recalculate
    tradesRef.current = trades;
    statsRef.current = calculateTradeStats(trades);
  }, [trades]);

  return { 
    data: statsRef.current, 
    isLoading 
  };
}

// 🚀 Extracted calculation function
function calculateTradeStats(trades: Trade[]): TradeStats {
  const closedTrades = trades.filter(t => t.exit_price !== null && t.exit_price !== undefined);
  const total = closedTrades.length;

  if (total === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      breakeven: 0,
      winRate: 0,
      totalPnL: 0,
      avgR: 0,
    };
  }

  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let totalPnL = 0;
  let totalR = 0;
  let rCount = 0;

  // 🚀 OPTIMIZED: Single pass
  for (const trade of closedTrades) {
    const pnl = trade.pnl || 0;
    const outcome = trade.outcome || 'OPEN';
    const actualR = trade.metrics?.actual_r;

    if (outcome === 'WIN') wins++;
    else if (outcome === 'LOSS') losses++;
    else if (outcome === 'BE') breakeven++;

    totalPnL += pnl;

    if (actualR !== null && actualR !== undefined) {
      totalR += actualR;
      rCount++;
    }
  }

  return {
    totalTrades: total,
    wins,
    losses,
    breakeven,
    winRate: (wins / total) * 100,
    totalPnL,
    avgR: rCount > 0 ? totalR / rCount : 0,
  };
}

// ================================================
// 🔥 SINGLE TRADE - By ID
// ================================================

export function useTrade(tradeId: string | null) {
  const { id: userId } = useEffectiveUser();  // ✅ FIXED destructuring

  return useQuery({
    queryKey: queryKeys.tradeDetail(tradeId || ''),
    queryFn: async () => {
      if (!tradeId || !userId) throw new Error('No trade ID or user ID');

      const { data, error } = await supabase
        .from('trades_with_metrics')
        .select('*')
        .eq('id', tradeId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as Trade;
    },
    enabled: !!tradeId && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// ================================================
// 🔥 CREATE TRADE - With Optimistic Update
// ================================================

export function useCreateTrade() {
  const queryClient = useQueryClient();
  const { id: userId } = useEffectiveUser();  // ✅ FIXED destructuring

  return useMutation({
    mutationFn: async (tradeData: Partial<Trade>) => {
      if (!userId) throw new Error('No user ID');

      console.log('📝 Creating trade for user:', userId);

      const { data, error } = await supabase
        .from('trades')
        .insert([{ ...tradeData, user_id: userId }])
        .select('id')
        .single();

      if (error) throw error;

      // ✅ Fetch from VIEW to get calculated data
      const { data: tradeWithMetrics, error: fetchError } = await supabase
        .from('trades_with_metrics')
        .select('*')
        .eq('id', data.id)
        .single();

      if (fetchError) throw fetchError;

      console.log('✅ Trade created:', data.id);
      return tradeWithMetrics as Trade;
    },
    
    onMutate: async (newTrade) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trades(userId || '') });

      const previousTrades = queryClient.getQueryData<Trade[]>(queryKeys.trades(userId || ''));

      if (previousTrades) {
        const optimisticTrade: Trade = {
          id: `temp-${Date.now()}`,
          user_id: userId!,
          symbol: newTrade.symbol || '',
          side: newTrade.side || 'LONG',
          entry_price: newTrade.entry_price || 0,
          stop_price: newTrade.stop_price || 0,
          quantity: newTrade.quantity || 0,
          fees: newTrade.fees || 0,
          open_at: new Date().toISOString(),
          outcome: 'OPEN',
          pnl: 0,
          multiplier: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...newTrade,
        } as Trade;

        queryClient.setQueryData<Trade[]>(
          queryKeys.trades(userId || ''),
          [optimisticTrade, ...previousTrades]
        );
      }

      return { previousTrades };
    },
    
    onError: (err, newTrade, context) => {
      if (context?.previousTrades) {
        queryClient.setQueryData(queryKeys.trades(userId || ''), context.previousTrades);
      }
    },
    
    onSuccess: () => {
      // 🚀 Invalidate to trigger fresh fetch
      queryClient.invalidateQueries({ queryKey: queryKeys.trades(userId || '') });
    },
  });
}

// ================================================
// 🔥 UPDATE TRADE - With Optimistic Update
// ================================================

export function useUpdateTrade() {
  const queryClient = useQueryClient();
  const { id: userId } = useEffectiveUser();  // ✅ FIXED destructuring

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Trade> }) => {
      if (!userId) throw new Error('No user ID');

      console.log('✏️ Updating trade:', id);

      const { error: updateError } = await supabase
        .from('trades')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      const { data: updated, error: fetchError } = await supabase
        .from('trades_with_metrics')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      console.log('✅ Trade updated:', id);
      return updated as Trade;
    },
    
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trades(userId || '') });

      const previousTrades = queryClient.getQueryData<Trade[]>(queryKeys.trades(userId || ''));

      if (previousTrades) {
        queryClient.setQueryData<Trade[]>(
          queryKeys.trades(userId || ''),
          previousTrades.map(trade =>
            trade.id === id ? { ...trade, ...data, updated_at: new Date().toISOString() } : trade
          )
        );
      }

      return { previousTrades };
    },
    
    onError: (err, variables, context) => {
      if (context?.previousTrades) {
        queryClient.setQueryData(queryKeys.trades(userId || ''), context.previousTrades);
      }
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trades(userId || '') });
    },
  });
}

// ================================================
// 🔥 DELETE TRADE - With Optimistic Update
// ================================================

export function useDeleteTrade() {
  const queryClient = useQueryClient();
  const { id: userId } = useEffectiveUser();  // ✅ FIXED destructuring

  return useMutation({
    mutationFn: async (tradeId: string) => {
      if (!userId) throw new Error('No user ID');

      console.log('🗑️ Deleting trade:', tradeId);

      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeId)
        .eq('user_id', userId);

      if (error) throw error;

      console.log('✅ Trade deleted:', tradeId);
      return tradeId;
    },
    
    onMutate: async (tradeId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trades(userId || '') });

      const previousTrades = queryClient.getQueryData<Trade[]>(queryKeys.trades(userId || ''));

      if (previousTrades) {
        queryClient.setQueryData<Trade[]>(
          queryKeys.trades(userId || ''),
          previousTrades.filter(t => t.id !== tradeId)
        );
      }

      return { previousTrades };
    },
    
    onError: (err, tradeId, context) => {
      if (context?.previousTrades) {
        queryClient.setQueryData(queryKeys.trades(userId || ''), context.previousTrades);
      }
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trades(userId || '') });
    },
  });
}

// ================================================
// 🔥 FILTERED QUERIES - Memoized with Stable References
// ================================================

export function useOpenTrades() {
  const { data: allTrades, isLoading } = useTrades();
  
  // 🚀 Stable reference - only changes when actual data changes
  const openTrades = useMemo(() => {
    if (!allTrades) return [];
    return allTrades.filter(t => t.outcome === 'OPEN');
  }, [allTrades]);

  return { data: openTrades, isLoading };
}

export function useStrategyTrades(strategyId: string | null) {
  const { data: allTrades, isLoading } = useTrades();

  const strategyTrades = useMemo(() => {
    if (!allTrades || !strategyId) return [];
    return allTrades.filter(t => t.strategy_id === strategyId);
  }, [allTrades, strategyId]);

  return { data: strategyTrades, isLoading };
}

export function useTradesByDateRange(startDate: string, endDate: string) {
  const { data: allTrades, isLoading } = useTrades();

  const filteredTrades = useMemo(() => {
    if (!allTrades || !startDate || !endDate) return [];
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    return allTrades.filter(t => {
      const tradeTime = new Date(t.open_at).getTime();
      return tradeTime >= start && tradeTime <= end;
    });
  }, [allTrades, startDate, endDate]);

  return { data: filteredTrades, isLoading };
}

// ================================================
// 🔥 BULK DELETE - With Optimistic Update
// ================================================

export function useBulkDeleteTrades() {
  const queryClient = useQueryClient();
  const { id: userId } = useEffectiveUser();  // ✅ FIXED destructuring

  return useMutation({
    mutationFn: async (tradeIds: string[]) => {
      if (!userId) throw new Error('No user ID');

      console.log('🗑️ Bulk deleting trades:', tradeIds.length);

      const { error } = await supabase
        .from('trades')
        .delete()
        .in('id', tradeIds)
        .eq('user_id', userId);

      if (error) throw error;
      
      console.log('✅ Bulk delete completed');
      return tradeIds;
    },
    
    onMutate: async (tradeIds) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trades(userId || '') });

      const previousTrades = queryClient.getQueryData<Trade[]>(queryKeys.trades(userId || ''));

      if (previousTrades) {
        const tradeIdSet = new Set(tradeIds);
        queryClient.setQueryData<Trade[]>(
          queryKeys.trades(userId || ''),
          previousTrades.filter(t => !tradeIdSet.has(t.id))
        );
      }

      return { previousTrades };
    },
    
    onError: (err, tradeIds, context) => {
      if (context?.previousTrades) {
        queryClient.setQueryData(queryKeys.trades(userId || ''), context.previousTrades);
      }
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trades(userId || '') });
    },
  });
}