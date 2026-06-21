// src/hooks/useGlobalLeaderboard.ts
// TanStack Query hooks for global community leaderboards.
//
// RPCs:
//   - global_leaderboard(p_period, p_metric)     → performance ranking
//   - global_discipline_leaderboard(p_period)    → discipline/emotion ranking

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  GlobalPeriod,
  GlobalLeaderboardMetric,
  GlobalLeaderboardRow,
  DisciplineLeaderboardRow,
} from '@/types/community';

// ================================================
// QUERY KEYS
// ================================================

const keys = {
  performance: (period: GlobalPeriod, metric: GlobalLeaderboardMetric) =>
    ['global-leaderboard', 'performance', period, metric] as const,
  discipline: (period: GlobalPeriod) =>
    ['global-leaderboard', 'discipline', period] as const,
};

// ================================================
// QUERIES
// ================================================

/**
 * Fetches the global performance leaderboard.
 *
 * @param period  'all' | 'this_month' | 'this_year'
 * @param metric  'net_pnl' | 'win_rate' | 'trade_count'
 */
export function useGlobalLeaderboard(
  period: GlobalPeriod = 'this_month',
  metric: GlobalLeaderboardMetric = 'net_pnl',
): {
  rows: GlobalLeaderboardRow[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<GlobalLeaderboardRow[], Error>({
    queryKey: keys.performance(period, metric),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('global_leaderboard', {
        p_period: period,
        p_metric: metric,
      });
      if (error) throw error;
      return (data ?? []) as GlobalLeaderboardRow[];
    },
  });

  return { rows: data, isLoading, isError, error, refetch };
}

/**
 * Fetches the global discipline leaderboard (emotional control / consistency).
 *
 * @param period  'all' | 'this_month' | 'this_year'
 */
export function useGlobalDisciplineLeaderboard(period: GlobalPeriod = 'this_month'): {
  rows: DisciplineLeaderboardRow[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DisciplineLeaderboardRow[], Error>({
    queryKey: keys.discipline(period),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('global_discipline_leaderboard', {
        p_period: period,
      });
      if (error) throw error;
      return (data ?? []) as DisciplineLeaderboardRow[];
    },
  });

  return { rows: data, isLoading, isError, error, refetch };
}
