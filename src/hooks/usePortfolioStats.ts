// src/hooks/usePortfolioStats.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from './useAuth';

interface PortfolioStats {
  initialPortfolio: number;
  currentPortfolio: number;
  totalPnL: number;
  growth: number; // באחוזים
  tradeCount: number;
}

// ============================================
// 🔥 SERVER-SIDE aggregation - Postgres עושה את החישוב
// ============================================
async function fetchPortfolioStats(userId: string): Promise<PortfolioStats> {
  // קריאה אחת ל-RPC function במקום 2 queries + client-side aggregation
  const { data, error } = await supabase.rpc('get_portfolio_stats', {
    p_user_id: userId
  });

  if (error) {
    console.error('Error loading portfolio stats:', error);
    throw error;
  }
  
  // ה-function מוגדרת RETURNS TABLE — PostgREST מחזיר מערך של שורה אחת
  const row = (Array.isArray(data) ? data[0] : data) ?? {};
  return {
    initialPortfolio: row.initial_portfolio || 10000,
    currentPortfolio: row.current_portfolio || 10000,
    totalPnL: row.total_pnl || 0,
    growth: row.growth || 0,
    tradeCount: row.trade_count || 0,
  };
}

export function usePortfolioStats() {
  const queryClient = useQueryClient();
  const { getEffectiveUserId, isLoading: authLoading } = useAuth();
  
  const effectiveUserId = useMemo(() => getEffectiveUserId(), [getEffectiveUserId]);

  const query = useQuery({
    queryKey: ['portfolio-stats', effectiveUserId],
    queryFn: () => fetchPortfolioStats(effectiveUserId!),
    enabled: !!effectiveUserId && !authLoading, // רק אם יש user
    staleTime: 2 * 60 * 1000, // 2 דקות - יותר טרי מ-profile אבל לא real-time
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });

  // ============================================
  // 🔥 Real-time מותאם: invalidate cache במקום refetch מלא
  // ============================================
  useEffect(() => {
    if (!effectiveUserId) return;

    const channel = supabase
      .channel(`portfolio_stats_${effectiveUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // insert, update, delete
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${effectiveUserId}`, // 🔥 רק trades של המשתמש הזה!
        },
        () => {
          // Invalidate - React Query תעשה refetch ברקע
          queryClient.invalidateQueries({ 
            queryKey: ['portfolio-stats', effectiveUserId] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveUserId, queryClient]);

  return {
    stats: query.data,
    loading: query.isLoading,
    refresh: () => queryClient.invalidateQueries({ 
      queryKey: ['portfolio-stats', effectiveUserId] 
    }),
  };
}