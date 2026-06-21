// src/hooks/useSpaceAnalytics.ts
// React Query hooks for space leaderboard + analytics RPCs.
//
// All three hooks follow the exact same pattern as useMentorshipSpaces:
//   - staleTime 30_000
//   - enabled: !!spaceId
//   - query key includes period so different periods are cached separately
//   - arrays for RETURNS TABLE RPCs (leaderboard, member_performance)
//   - [0] for single-summary RPC (analytics_summary)

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  LeaderboardRow,
  AnalyticsSummary,
  MemberPerformanceRow,
  RoomPeriod,
} from '@/types/mentorship';

// Re-export so callers don't need to import from two places.
export { mapSpaceError } from '@/hooks/useMentorshipSpaces';

// ================================================
// QUERY KEYS
// ================================================

const analyticsKeys = {
  leaderboard: (spaceId: string, period: RoomPeriod) =>
    ['spaces', 'leaderboard', spaceId, period] as const,
  summary: (spaceId: string, period: RoomPeriod) =>
    ['spaces', 'analytics-summary', spaceId, period] as const,
  memberPerformance: (spaceId: string, period: RoomPeriod) =>
    ['spaces', 'member-performance', spaceId, period] as const,
};

// ================================================
// HOOKS
// ================================================

/**
 * Ranked leaderboard for a space over a given period.
 * Calls `space_leaderboard(p_space, p_period)` → LeaderboardRow[].
 */
export function useSpaceLeaderboard(
  spaceId?: string,
  period: RoomPeriod = 'this_year',
): {
  rows: LeaderboardRow[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data = [], isLoading, isError, error, refetch } = useQuery<
    LeaderboardRow[],
    Error
  >({
    queryKey: analyticsKeys.leaderboard(spaceId ?? '', period),
    enabled: !!spaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('space_leaderboard', {
        p_space: spaceId,
        p_period: period,
      });
      if (error) throw error;
      return (data ?? []) as LeaderboardRow[];
    },
  });
  return { rows: data, isLoading, isError, error, refetch };
}

/**
 * Aggregate summary for a space over a given period.
 * Calls `space_analytics_summary(p_space, p_period)` → takes row [0].
 */
export function useSpaceAnalyticsSummary(
  spaceId?: string,
  period: RoomPeriod = 'this_month',
): {
  summary: AnalyticsSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data, isLoading, isError, error, refetch } = useQuery<
    AnalyticsSummary | undefined,
    Error
  >({
    queryKey: analyticsKeys.summary(spaceId ?? '', period),
    enabled: !!spaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('space_analytics_summary', {
        p_space: spaceId,
        p_period: period,
      });
      if (error) throw error;
      // RETURNS TABLE → array; take first row.
      return ((data ?? []) as AnalyticsSummary[])[0];
    },
  });
  return { summary: data, isLoading, isError, error, refetch };
}

/**
 * Per-member performance breakdown for a space over a given period.
 * Calls `space_member_performance(p_space, p_period)` → MemberPerformanceRow[].
 */
export function useSpaceMemberPerformance(
  spaceId?: string,
  period: RoomPeriod = 'this_month',
): {
  rows: MemberPerformanceRow[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data = [], isLoading, isError, error, refetch } = useQuery<
    MemberPerformanceRow[],
    Error
  >({
    queryKey: analyticsKeys.memberPerformance(spaceId ?? '', period),
    enabled: !!spaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('space_member_performance', {
        p_space: spaceId,
        p_period: period,
      });
      if (error) throw error;
      return (data ?? []) as MemberPerformanceRow[];
    },
  });
  return { rows: data, isLoading, isError, error, refetch };
}
