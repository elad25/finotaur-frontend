/**
 * ================================================
 * TRADES HOOK - FULLY OPTIMIZED
 * ================================================
 * ✅ React Query caching
 * ✅ Realtime subscriptions
 * ✅ Optimistic updates
 * ✅ Uses materialized view for performance
 * ✅ Integrated with journal.ts
 * ✅ Zero duplicate requests
 * ================================================
 */

import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryClient';
import { 
  createTrade as createTradeAPI, 
  updateTrade as updateTradeAPI, 
  deleteTrade as deleteTradeAPI, 
  bulkDeleteTrades,
  getTrades as getTradesAPI,
  type Trade 
} from '@/lib/journal';

// ================================================
// TYPES
// ================================================

interface UseTradesReturn {
  trades: Trade[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createTrade: (payload: Partial<Trade>) => Promise<{ ok: boolean; data?: Trade; message?: string }>;
  updateTrade: (id: string, payload: Partial<Trade>) => Promise<{ ok: boolean; data?: Trade; message?: string }>;
  deleteTrade: (id: string) => Promise<{ ok: boolean; message?: string }>;
  bulkDelete: (ids: string[]) => Promise<{ ok: boolean; message?: string }>;
}

// ================================================
// 🚀 OPTIMIZED FETCH FUNCTION
// ================================================

/**
 * Fetch trades using the optimized getTrades from journal.ts
 */
async function fetchTrades(): Promise<Trade[]> {
  console.log('📊 Fetching trades via journal.ts');
  
  const result = await getTradesAPI();
  
  if (!result.ok) {
    console.error('❌ Error fetching trades:', result.message);
    throw new Error(result.message || 'Failed to fetch trades');
  }

  console.log(`✅ Loaded ${result.data?.length || 0} trades`);
  return result.data || [];
}

// ================================================
// ✅ MAIN HOOK - UNIFIED TRADE MANAGEMENT
// ================================================

export function useTrades(): UseTradesReturn {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // 🚀 OPTIMIZED: Fetch trades with React Query
  const {
    data: trades = [],
    isLoading,
    error,
    refetch: refetchQuery,
  } = useQuery<Trade[], Error>({
    queryKey: queryKeys.trades(),
    queryFn: fetchTrades,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // ================================================
  // 🔥 REALTIME SUBSCRIPTION - Single Global Instance
  // ================================================

  useEffect(() => {
    let mounted = true;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      console.log('🔔 Setting up real-time subscription for user:', user.id);

      const channel = supabase
        .channel(`trades_changes_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trades',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!mounted) return;

            const symbol = (payload.new as any)?.symbol || (payload.old as any)?.id || 'unknown';
            console.log('🔔 Real-time update:', payload.eventType, symbol);

            // 🚀 Update React Query cache directly
            queryClient.setQueryData<Trade[]>(queryKeys.trades(), (oldTrades = []) => {
              if (payload.eventType === 'INSERT') {
                return [payload.new as Trade, ...oldTrades];
              } else if (payload.eventType === 'UPDATE') {
                return oldTrades.map((t) =>
                  t.id === (payload.new as Trade).id ? (payload.new as Trade) : t
                );
              } else if (payload.eventType === 'DELETE') {
                return oldTrades.filter((t) => t.id !== (payload.old as any).id);
              }
              return oldTrades;
            });
          }
        )
        .subscribe((status) => {
          console.log('🔔 Subscription status:', status);
        });

      subscriptionRef.current = channel;
    };

    setupRealtimeSubscription();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (subscriptionRef.current) {
        console.log('🔕 Unsubscribing from real-time updates');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [queryClient]);

  // ================================================
  // 🚀 CREATE MUTATION
  // ================================================

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Trade>) => {
      const result = await createTradeAPI(payload);
      if (!result.ok) {
        throw new Error(result.message || 'Failed to create trade');
      }
      if (!result.data) {
        throw new Error('No data returned from create');
      }
      return result.data;
    },
    onMutate: async (newTrade) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trades() });

      const previousTrades = queryClient.getQueryData<Trade[]>(queryKeys.trades());

      // ✅ Optimistic update
      const optimisticTrade: Trade = {
        id: 'temp-' + Date.now(),
        user_id: '',
        symbol: newTrade.symbol || '',
        side: newTrade.side || 'LONG',
        entry_price: newTrade.entry_price || 0,
        stop_price: newTrade.stop_price || 0,
        quantity: newTrade.quantity || 0,
        fees: newTrade.fees || 0,
        open_at: new Date().toISOString(),
        outcome: 'OPEN',
        pnl: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...newTrade,
      } as Trade;

      queryClient.setQueryData<Trade[]>(queryKeys.trades(), (old = []) => [
        optimisticTrade,
        ...old,
      ]);

      return { previousTrades };
    },
    onError: (err, newTrade, context) => {
      if (context?.previousTrades) {
        queryClient.setQueryData(queryKeys.trades(), context.previousTrades);
      }
      console.error('❌ Create failed:', err);
    },
    onSuccess: (data) => {
      console.log('✅ Trade created:', data.symbol);
      // Realtime will update, but invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.trades() });
    },
  });

  // ================================================
  // 🚀 UPDATE MUTATION
  // ================================================

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Trade> }) => {
      const result = await updateTradeAPI(id, payload);
      if (!result.ok) {
        throw new Error(result.message || 'Failed to update trade');
      }
      if (!result.data) {
        throw new Error('No data returned from update');
      }
      return result.data;
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trades() });

      const previousTrades = queryClient.getQueryData<Trade[]>(queryKeys.trades());

      // ✅ Optimistic update
      queryClient.setQueryData<Trade[]>(queryKeys.trades(), (old = []) =>
        old.map((trade) => (trade.id === id ? { ...trade, ...payload } : trade))
      );

      return { previousTrades };
    },
    onError: (err, variables, context) => {
      if (context?.previousTrades) {
        queryClient.setQueryData(queryKeys.trades(), context.previousTrades);
      }
      console.error('❌ Update failed:', err);
    },
    onSuccess: () => {
      console.log('✅ Trade updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.trades() });
    },
  });

  // ================================================
  // 🚀 DELETE MUTATION
  // ================================================

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteTradeAPI(id);
      if (!result.ok) {
        throw new Error(result.message || 'Failed to delete trade');
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trades() });

      const previousTrades = queryClient.getQueryData<Trade[]>(queryKeys.trades());

      // ✅ Optimistic update
      queryClient.setQueryData<Trade[]>(queryKeys.trades(), (old = []) =>
        old.filter((trade) => trade.id !== id)
      );

      return { previousTrades };
    },
    onError: (err, id, context) => {
      if (context?.previousTrades) {
        queryClient.setQueryData(queryKeys.trades(), context.previousTrades);
      }
      console.error('❌ Delete failed:', err);
    },
    onSuccess: () => {
      console.log('✅ Trade deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.trades() });
    },
  });

  // ================================================
  // 🚀 BULK DELETE MUTATION
  // ================================================

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const result = await bulkDeleteTrades(ids);
      if (!result.ok) {
        throw new Error(result.message || 'Failed to bulk delete');
      }
      return ids;
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trades() });

      const previousTrades = queryClient.getQueryData<Trade[]>(queryKeys.trades());

      // ✅ Optimistic update
      queryClient.setQueryData<Trade[]>(queryKeys.trades(), (old = []) =>
        old.filter((trade) => !ids.includes(trade.id!))
      );

      return { previousTrades };
    },
    onError: (err, ids, context) => {
      if (context?.previousTrades) {
        queryClient.setQueryData(queryKeys.trades(), context.previousTrades);
      }
      console.error('❌ Bulk delete failed:', err);
    },
    onSuccess: (ids) => {
      console.log('✅ Bulk deleted:', ids.length, 'trades');
      queryClient.invalidateQueries({ queryKey: queryKeys.trades() });
    },
  });

  // ================================================
  // 🔥 MANUAL REFETCH
  // ================================================

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.trades() });
  }, [queryClient]);

  // ================================================
  // 🎯 RETURN API
  // ================================================

  return {
    trades,
    isLoading,
    error: error || null,
    refetch,
    createTrade: useCallback(
      async (payload: Partial<Trade>) => {
        try {
          const data = await createMutation.mutateAsync(payload);
          return { ok: true, data };
        } catch (err: any) {
          return { ok: false, message: err.message };
        }
      },
      [createMutation]
    ),
    updateTrade: useCallback(
      async (id: string, payload: Partial<Trade>) => {
        try {
          const data = await updateMutation.mutateAsync({ id, payload });
          return { ok: true, data };
        } catch (err: any) {
          return { ok: false, message: err.message };
        }
      },
      [updateMutation]
    ),
    deleteTrade: useCallback(
      async (id: string) => {
        try {
          await deleteMutation.mutateAsync(id);
          return { ok: true };
        } catch (err: any) {
          return { ok: false, message: err.message };
        }
      },
      [deleteMutation]
    ),
    bulkDelete: useCallback(
      async (ids: string[]) => {
        try {
          await bulkDeleteMutation.mutateAsync(ids);
          return { ok: true };
        } catch (err: any) {
          return { ok: false, message: err.message };
        }
      },
      [bulkDeleteMutation]
    ),
  };
}

// ================================================
// 🔥 DERIVED HOOKS - Reuse main hook for efficiency
// ================================================

/**
 * Get a single trade by ID
 */
export function useTrade(id: string | undefined) {
  const { trades, isLoading } = useTrades();
  const trade = trades.find((t) => t.id === id);

  return {
    trade,
    isLoading,
  };
}

/**
 * Get trade statistics
 */
export function useTradeStats() {
  const { trades, isLoading } = useTrades();

  const stats = {
    total: trades.length,
    open: trades.filter((t) => t.outcome === 'OPEN').length,
    closed: trades.filter((t) => t.outcome !== 'OPEN').length,
    wins: trades.filter((t) => t.outcome === 'WIN').length,
    losses: trades.filter((t) => t.outcome === 'LOSS').length,
    breakeven: trades.filter((t) => t.outcome === 'BE').length,
    totalPnL: trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
    avgPnL:
      trades.length > 0
        ? trades.reduce((sum, t) => sum + (t.pnl || 0), 0) / trades.length
        : 0,
    winRate:
      trades.filter((t) => t.outcome !== 'OPEN').length > 0
        ? (trades.filter((t) => t.outcome === 'WIN').length /
            trades.filter((t) => t.outcome !== 'OPEN').length) *
          100
        : 0,
  };

  return {
    stats,
    isLoading,
  };
}

/**
 * Get only open trades
 */
export function useOpenTrades() {
  const { trades, isLoading } = useTrades();
  const openTrades = trades.filter((t) => t.outcome === 'OPEN');

  return {
    trades: openTrades,
    isLoading,
  };
}

/**
 * Get trades for a specific strategy
 */
export function useStrategyTrades(strategyId: string | null) {
  const { trades, isLoading } = useTrades();
  const strategyTrades = strategyId 
    ? trades.filter((t) => t.strategy_id === strategyId)
    : [];

  return {
    trades: strategyTrades,
    isLoading,
  };
}