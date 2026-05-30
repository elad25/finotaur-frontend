// src/pages/app/journal/finotaur-ai/hooks/useBriefing.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBriefing, refreshBriefing } from '../services/finotaurAIApi';
import { supabase } from '@/lib/supabase';
import type { BriefingResponse, Briefing, Insight } from '../types';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * When `overrideUserId` is set (mentor mode), reads directly from
 * `journal_ai_briefings` via Supabase instead of the server endpoint.
 * Returns the same `BriefingResponse` shape the components consume.
 */
export function useBriefing(enabled = true, overrideUserId?: string) {
  const isMentorMode = Boolean(overrideUserId);

  return useQuery<BriefingResponse>({
    queryKey: isMentorMode
      ? ['finotaur-briefing-mentor', overrideUserId]
      : ['finotaur-briefing'],
    queryFn: isMentorMode
      ? async (): Promise<BriefingResponse> => {
          const { data, error } = await supabase
            .from('journal_ai_briefings')
            .select('insights, recommendations, generated_at, model')
            .eq('user_id', overrideUserId)
            .maybeSingle();

          if (error) throw new Error(error.message);

          if (!data) {
            return {
              schema_version: 'v1',
              briefing: null,
              stale: false,
              refreshing: false,
              generated_at: null,
              model: null,
            };
          }

          // Supabase returns jsonb columns as unknown — cast safely.
          const insights = (data.insights as Insight[] | null) ?? [];
          const recommendations = (data.recommendations as string[] | null) ?? [];
          const briefing: Briefing = { insights, recommendations };

          const generatedAt: string | null = data.generated_at ?? null;
          const stale = generatedAt
            ? Date.now() - new Date(generatedAt).getTime() > STALE_THRESHOLD_MS
            : false;

          return {
            schema_version: 'v1',
            briefing,
            stale,
            refreshing: false,
            generated_at: generatedAt,
            model: (data.model as string | null) ?? null,
          };
        }
      : fetchBriefing,
    enabled,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useRefreshBriefing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: refreshBriefing,
    onSuccess: (data) => {
      qc.setQueryData<BriefingResponse>(['finotaur-briefing'], data);
    },
  });
}
