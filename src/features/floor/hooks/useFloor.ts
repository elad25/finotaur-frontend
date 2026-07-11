// src/hooks/useFloor.ts
// =====================================================
// THE FLOOR — growth-engine hooks
// Covers: active competition, leaderboards, badges,
//         participation state, and join mutation.
// =====================================================

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// =====================================================
// Types
// =====================================================

export interface FloorCompetition {
  id: string;
  type: 'monthly';
  title: string;
  registration_opens_at: string | null; // ISO date string; null = always open
  period_start: string; // ISO date string
  period_end: string;   // ISO date string
  status: 'active';
  min_trades: number;
  // Optional until the backend migration ships — undefined-safe on the old RPC.
  prize_summary?: string | null;
}

export interface FloorLeaderboardRow {
  user_id: string;
  display_name: string;
  floor_username: string | null;
  avatar_url: string | null;
  discipline_score: number | null;
  net_pnl: number | null;
  trade_count: number;
  rank: number | null;
  qualified: boolean;
  is_champion: boolean;
  // Extended stats — all nullable until the backend RPC populates them
  win_rate: number | null;
  avg_win: number | null;
  avg_loss: number | null;
  profit_factor: number | null;
  best_trade: number | null;
  worst_trade: number | null;
  win_streak: number | null;
  // Optional until the backend migration ships — undefined-safe on the old RPC.
  // rr falls back to a client-side computation from avg_win/avg_loss when absent.
  rr?: number | null;
  active_days?: number | null;
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
  broker_required: 'Connect a broker first to compete.',
  competition_not_open: 'This competition is closed for new entries.',
  registration_not_open: 'Registration has not opened yet.',
  profile_required: 'Set up your Floor profile first.',
  not_authenticated: 'You must be signed in to join.',
  competition_not_found: 'This competition no longer exists.',
  competition_closed: 'This competition is closed for new entries.',
  subscription_required: 'The Championship is open to Trader members.',
  period_not_started: 'The challenge has not started yet.',
};

/**
 * RR (realized avg-win / avg-loss ratio). Prefers the backend-computed
 * value (post 20260710 migration); falls back to a client-side computation
 * from avg_win/avg_loss so the table renders correctly against the OLD RPC.
 */
export function getRowRR(
  row: Pick<FloorLeaderboardRow, 'rr' | 'avg_win' | 'avg_loss'>,
): number | null {
  if (row.rr !== undefined && row.rr !== null) return row.rr;
  if (row.avg_win === null || row.avg_loss === null || row.avg_loss === 0) return null;
  return Math.abs(row.avg_win / row.avg_loss);
}

function translateJoinError(raw: string): string {
  // Check if the raw message matches any known key
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_');
  const byKey = JOIN_ERROR_MESSAGES[key];
  if (byKey) return byKey;
  // Also pass through readable messages from the server as-is if they look human-readable
  // (they may already be formatted e.g. 'Registration has not opened yet.')
  if (raw.length < 120 && !raw.includes('\n')) return raw;
  return `Could not join: ${raw}`;
}

// Human-readable leave errors
function translateLeaveError(raw: string): string {
  if (raw.toLowerCase().includes('locked') || raw.toLowerCase().includes('started')) {
    return 'The competition has started — your entry is locked until it ends.';
  }
  return raw;
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
// scope: 'monthly'   → floor_leaderboard(competitionId)
//        'this_year' → floor_leaderboard_cumulative({ p_scope: 'this_year' })
//        'all_time'  → floor_leaderboard_cumulative({ p_scope: 'all_time' })
// Note: 'seasonal' is mapped to 'this_year' for backward compat.
// =====================================================
export function useFloorLeaderboard(
  scope: 'monthly' | 'this_year' | 'all_time',
  competitionId?: string,
) {
  return useQuery<FloorLeaderboardRow[]>({
    queryKey: KEYS.leaderboard(scope, competitionId),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (scope === 'monthly') {
        if (!competitionId) return [];
        // Prefer the once-a-day snapshot; fall back to the live RPC until the
        // backend migration (floor_leaderboard_daily) is deployed.
        let res = await supabase.rpc('floor_leaderboard_daily', { p_competition_id: competitionId });
        if (res.error) {
          res = await supabase.rpc('floor_leaderboard', { p_competition_id: competitionId });
        }
        if (res.error) throw res.error;
        return (res.data as FloorLeaderboardRow[]) ?? [];
      }
      // this_year or all_time
      const { data, error } = await supabase.rpc('floor_leaderboard_cumulative', {
        p_scope: scope,
      });
      if (error) throw error;
      return (data as FloorLeaderboardRow[]) ?? [];
    },
    enabled: scope !== 'monthly' || !!competitionId,
    staleTime: scope === 'monthly' ? 30 * 60_000 : 30_000,
    gcTime: 2 * 60_000,
  });
}

// =====================================================
// useFloorLeaderboardLastUpdated
// =====================================================
// Timestamp of the last daily snapshot (for the "Updated daily" label).
// Returns null if the snapshot RPC isn't deployed yet.
export function useFloorLeaderboardLastUpdated(competitionId?: string) {
  return useQuery<string | null>({
    queryKey: ['floor', 'leaderboard-updated', competitionId ?? 'none'] as const,
    enabled: !!competitionId,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('floor_leaderboard_last_updated', {
        p_competition_id: competitionId,
      });
      if (error) return null; // backward-compat: RPC not deployed yet
      return (data as string | null) ?? null;
    },
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

// =====================================================
// useLeaveFloor
// Mutation to leave a competition (only allowed during
// registration window, before period_start).
// Translates 'locked' error to a friendly message.
// =====================================================
export function useLeaveFloor() {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, { competitionId: string }>({
    mutationFn: async ({ competitionId }) => {
      const { data, error } = await supabase.rpc('floor_leave_competition', {
        p_competition_id: competitionId,
      });
      if (error) {
        throw new Error(translateLeaveError(error.message));
      }
      return data as boolean;
    },
    onSuccess: (_data, { competitionId }) => {
      void queryClient.invalidateQueries({
        queryKey: KEYS.participation(competitionId),
      });
      void queryClient.invalidateQueries({
        queryKey: KEYS.leaderboard('monthly', competitionId),
      });
    },
  });
}
