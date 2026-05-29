// src/pages/app/journal/finotaur-ai/hooks/useUsage.ts
// Phase 5b — daily usage for DailyLimitBanner. Light polling: refetch on focus only.

import { useQuery } from '@tanstack/react-query';
import { fetchUsage } from '../services/finotaurAIApi';
import type { UsageResponse } from '../types';

export function useUsage(enabled: boolean = true) {
  return useQuery<UsageResponse>({
    queryKey: ['finotaur-usage'],
    queryFn: fetchUsage,
    enabled,
    // 60s — usage doesn't change often, but should refresh when user takes action
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
