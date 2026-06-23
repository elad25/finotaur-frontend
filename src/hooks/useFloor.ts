// src/hooks/useFloor.ts
// =====================================================
// THE FLOOR — growth-engine hooks
// Covers: active competition, leaderboards, badges,
//         participation state, and join mutation.
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// =====================================================
// Types
// =====================================================

export interface FloorCompetition {
  id: string;
  type: 'monthly';
  title: string;
  period_start: string; // ISO date string
  period_end: string;   // ISO date string
  status: 'active';
  min_trades: number;
}

export interface FloorLeaderboardRow {
  user_id: string;
  display_name: string;
  discipline_score: number | null;
  trade_count: number;
  rank: number | null;
  qualified: boolean;
  is_champion: boolean;
}

export interface FloorParticipation {
  id: string;
  competition_id: string;
  user_id: string;
  opted_in_at: string;
  is_public: boolean;
  status: string;
}

export interface UserBadges {
  is_verified: boolean;
  is_champion: boolean;
  champion_count: number;
  last_win_label: string | null;
}

// Human-readable error messages keyed by Postgres error message codes
// returned by floor_join_competition().
const JOIN_ERROR_MESSAGES: Record<string, string> = {
  broker_required: 'Connect a broker to compete on The Floor.',
  competition_not_open: 'This competition is closed for new entries.',
  not_authenticated: 'You must be signed in to join.',
  competition_not_found: 'This competition no longer exists.',
};

function translateJoinError(raw: string): string {
  const match = JOIN_ERROR_MESSAGES[raw.trim().toLowerCase()];
  return match ?? `Could not join: ${raw}`;
}

// =====================================================
// Query keys (centralised to allow precise invalidation)
// =====================================================
const KEYS = {
  activeCompetition: ['floor', 'active-competition'] as const,
  leaderboard: (scope: string, id?: string) =>
    ['floor', 'leaderboard', scope, id ?? 'all'] as const,
  badges: (userId?: string) => ['floor', 'badges', userId ?? 'self'] as const,
  participation: (competitionId?: string) =>
    ['floor', 'participation', competitionId ?? 'none'] as const,
};

// =====================================================
// useActiveCompetition
// =====================================================
export function useActiveCompetition() {
  return useQuery<FloorCompetition | null>({
    queryKey: KEYS.activeCompetition,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('floor_active_competition');
      if (error) throw error;
      const rows = data as FloorCompetition[] | null;
      return rows && rows.length > 0 ? rows[0] : null;
    },
    staleTime: 60_000,  // 1 minute — competition doesn't change mid-page visit
    gcTime: 5 * 60_000,
  });
}

// =====================================================
// useFloorLeaderboard
// scope: 'monthly' uses floor_leaderboard(competitionId)
//        'seasonal' | 'all_time' uses floor_leaderboard_cumulative
// =====================================================
export function useFloorLeaderboard(
  scope: 'monthly' | 'seasonal' | 'all_time',
  competitionId?: string,
) {
  return useQuery<FloorLeaderboardRow[]>({
    queryKey: KEYS.leaderboard(scope, competitionId),
    queryFn: async () => {
      if (scope === 'monthly') {
        if (!competitionId) return [];
        const { data, error } = await supabase.rpc('floor_leaderboard', {
          p_competition_id: competitionId,
        });
        if (error) throw error;
        return (data as FloorLeaderboardRow[]) ?? [];
      }
      // seasonal or all_time
      const { data, error } = await supabase.rpc('floor_leaderboard_cumulative', {
        p_scope: scope,
      });
      if (error) throw error;
      return (data as FloorLeaderboardRow[]) ?? [];
    },
    enabled: scope !== 'monthly' || !!competitionId,
    staleTime: 30_000,
    gcTime: 2 * 60_000,
  });
}

// =====================================================
// useUserBadges
// Omit p_user to query for the currently-authenticated user.
// =====================================================
export function useUserBadges(userId?: string) {
  return useQuery<UserBadges | null>({
    queryKey: KEYS.badges(userId),
    queryFn: async () => {
      const params = userId ? { p_user: userId } : {};
      const { data, error } = await supabase.rpc('get_user_badges', params);
      if (error) throw error;
      const rows = data as UserBadges[] | null;
      return rows && rows.length > 0 ? rows[0] : null;
    },
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
}

// =====================================================
// useMyFloorParticipation
// Uses RLS — Supabase returns only the current user's row.
// =====================================================
export function useMyFloorParticipation(competitionId?: string) {
  return useQuery<FloorParticipation | null>({
    queryKey: KEYS.participation(competitionId),
    queryFn: async () => {
      if (!competitionId) return null;
      const { data, error } = await supabase
        .from('floor_participants')
        .select('*')
        .eq('competition_id', competitionId)
        .maybeSingle();
      if (error) throw error;
      return (data as FloorParticipation | null) ?? null;
    },
    enabled: !!competitionId,
    staleTime: 30_000,
    gcTime: 2 * 60_000,
  });
}

// =====================================================
// useJoinFloor
// Mutation to opt in to a competition.
// Translates Postgres error codes to friendly messages.
// =====================================================
export function useJoinFloor() {
  const queryClient = useQueryClient();

  return useMutation<FloorParticipation, Error, { competitionId: string }>({
    mutationFn: async ({ competitionId }) => {
      const { data, error } = await supabase.rpc('floor_join_competition', {
        p_competition_id: competitionId,
      });
      if (error) {
        // Postgres raises error with the code as the message
        throw new Error(translateJoinError(error.message));
      }
      return data as FloorParticipation;
    },
    onSuccess: (_data, { competitionId }) => {
      // Refresh participation state and leaderboard
      void queryClient.invalidateQueries({
        queryKey: KEYS.participation(competitionId),
      });
      void queryClient.invalidateQueries({
        queryKey: KEYS.leaderboard('monthly', competitionId),
      });
    },
  });
}
