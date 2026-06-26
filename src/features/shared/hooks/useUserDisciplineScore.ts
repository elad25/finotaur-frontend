// src/features/shared/hooks/useUserDisciplineScore.ts
// Read-only behavioral scores via the SECURITY DEFINER RPC user_discipline_score.
// Callable for ANY user_id (used for feed authors + room members).
// Lives in shared/ so both floor (SharedTradeCard) and mentor (RoomAnalytics)
// can import it without creating a cross-feature cycle.

import { useQueries, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UserDisciplineScore } from '@/features/shared/types/discipline';

const DISCIPLINE_STALE = 5 * 60_000; // behavioral profile changes slowly

async function fetchScore(userId: string, period: string): Promise<UserDisciplineScore | undefined> {
  const { data, error } = await supabase.rpc('user_discipline_score', {
    p_user: userId,
    p_period: period,
  });
  if (error) throw error;
  return ((data ?? []) as UserDisciplineScore[])[0];
}

/** Single user's discipline score. */
export function useUserDisciplineScore(userId?: string, period: string = 'all') {
  const { data, isLoading, isError, error } = useQuery<UserDisciplineScore | undefined, Error>({
    queryKey: ['discipline-score', userId ?? '', period],
    enabled: !!userId,
    staleTime: DISCIPLINE_STALE,
    queryFn: () => fetchScore(userId as string, period),
  });
  return { score: data, isLoading, isError, error };
}

/** Many users at once (room analytics). Returns a Map keyed by user_id. */
export function useUserDisciplineScores(userIds: string[], period: string = 'all') {
  const results = useQueries({
    queries: userIds.map((uid) => ({
      queryKey: ['discipline-score', uid, period],
      enabled: !!uid,
      staleTime: DISCIPLINE_STALE,
      queryFn: () => fetchScore(uid, period),
    })),
  });
  const byUser = new Map<string, UserDisciplineScore>();
  userIds.forEach((uid, i) => {
    const r = results[i]?.data;
    if (r) byUser.set(uid, r);
  });
  return { byUser, isLoading: results.some((r) => r.isLoading) };
}
