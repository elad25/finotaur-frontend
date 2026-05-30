// src/pages/app/journal/finotaur-ai/hooks/useFinotaurScore.ts

import { useQuery } from '@tanstack/react-query';
import { fetchFinotaurScore } from '../services/finotaurAIApi';
import { supabase } from '@/lib/supabase';
import type { FinotaurScore } from '../types';

/**
 * When `overrideUserId` is set (mentor mode), fetches via Supabase RPC instead
 * of the /api/journal-ai/score server endpoint (which is scoped to the authed user).
 * The RPC `get_finotaur_score` returns the identical jsonb shape as the server.
 */
export function useFinotaurScore(windowDays = 30, enabled = true, overrideUserId?: string) {
  const isMentorMode = Boolean(overrideUserId);

  return useQuery({
    // Distinct cache key when overriding so mentor and owner caches don't collide.
    queryKey: isMentorMode
      ? ['finotaur-score-mentor', overrideUserId, windowDays]
      : ['finotaur-score', windowDays],
    queryFn: isMentorMode
      ? async (): Promise<FinotaurScore> => {
          const { data, error } = await supabase.rpc('get_finotaur_score', {
            p_user_id: overrideUserId,
            p_window_days: windowDays,
          });
          if (error) throw new Error(error.message);
          return data as FinotaurScore;
        }
      : () => fetchFinotaurScore(windowDays),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled,
  });
}
