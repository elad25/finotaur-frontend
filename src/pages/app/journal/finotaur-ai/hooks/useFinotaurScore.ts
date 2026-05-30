// src/pages/app/journal/finotaur-ai/hooks/useFinotaurScore.ts

import { useQuery } from '@tanstack/react-query';
import { fetchFinotaurScore } from '../services/finotaurAIApi';
import { supabase } from '@/lib/supabase';
import type { FinotaurScore } from '../types';

export function useFinotaurScore(windowDays = 30, enabled = true, overrideUserId?: string) {
  return useQuery({
    queryKey: ['finotaur-score', windowDays, overrideUserId ?? null],
    queryFn: async (): Promise<FinotaurScore> => {
      if (overrideUserId) {
        // Mentor view: call the RPC directly from the client using the student's id.
        // RLS grants accepted mentors SELECT on this RPC.
        const { data, error } = await supabase.rpc('get_finotaur_score', {
          p_user_id: overrideUserId,
          p_window_days: windowDays,
        });
        if (error) throw new Error(error.message);
        // RPC returns jsonb — cast directly to FinotaurScore.
        return data as FinotaurScore;
      }
      return fetchFinotaurScore(windowDays);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled,
  });
}
