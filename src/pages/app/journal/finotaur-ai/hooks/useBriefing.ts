// src/pages/app/journal/finotaur-ai/hooks/useBriefing.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBriefing, refreshBriefing } from '../services/finotaurAIApi';
import { supabase } from '@/lib/supabase';
import type { BriefingResponse } from '../types';
import dayjs from 'dayjs';

export function useBriefing(enabled = true, overrideUserId?: string) {
  return useQuery({
    queryKey: ['finotaur-briefing', overrideUserId ?? null],
    queryFn: async (): Promise<BriefingResponse> => {
      if (overrideUserId) {
        // Mentor view: read directly from Supabase. RLS grants accepted mentors SELECT.
        const { data, error } = await supabase
          .from('journal_ai_briefings')
          .select('insights,recommendations,generated_at,model')
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

        const generatedAt: string | null = data.generated_at ?? null;
        const stale = generatedAt
          ? dayjs().diff(dayjs(generatedAt), 'hour') >= 24
          : false;

        return {
          schema_version: 'v1',
          briefing: {
            // insights / recommendations are jsonb columns stored as arrays
            // matching the Insight[] and string[] shapes from types.ts.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            insights: (data.insights as any[]) ?? [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recommendations: (data.recommendations as any[]) ?? [],
          },
          stale,
          refreshing: false,
          generated_at: generatedAt,
          model: data.model ?? null,
        };
      }
      return fetchBriefing();
    },
    enabled,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    // First-visit auto-poll. When no briefing row exists, the GET endpoint kicks
    // background generation (server PR #83). Poll so the first briefing surfaces
    // without a manual refresh. We key off `briefing === null` (NOT `refreshing`):
    // the server only returns refreshing:true on the request that STARTS generation;
    // subsequent in-flight polls return refreshing:false, so keying off it would
    // stop the poll one tick too early. Bounded to ~8 fetches (~35s) so a premium
    // user with no eligible (closed) trades — generation yields nothing — doesn't
    // poll forever.
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.briefing !== null) return false; // have a briefing → stop
      if (overrideUserId) return false; // mentor view is read-only; nothing generates
      return query.state.dataUpdateCount < 8 ? 5000 : false;
    },
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
