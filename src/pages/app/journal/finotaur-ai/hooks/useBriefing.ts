// src/pages/app/journal/finotaur-ai/hooks/useBriefing.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBriefing, refreshBriefing } from '../services/finotaurAIApi';
import type { BriefingResponse } from '../types';

export function useBriefing(enabled = true) {
  return useQuery({
    queryKey: ['finotaur-briefing'],
    queryFn: fetchBriefing,
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
