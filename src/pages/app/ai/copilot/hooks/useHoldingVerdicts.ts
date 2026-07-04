// src/pages/app/ai/copilot/hooks/useHoldingVerdicts.ts
// Fetches per-holding verdicts (BUY_MORE / HOLD / TRIM / EXIT / HEDGE) for
// the current user's portfolio. Gated on authentication, same pattern as
// usePortfolioData's broker-data queries (enabled: !!userId).

import { useQuery } from '@tanstack/react-query';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { fetchHoldingVerdicts, type HoldingVerdictsResponse } from '@/services/copilotVerdictsApi';

export interface UseHoldingVerdictsResult {
  generatedAt: string | null;
  verdicts: HoldingVerdictsResponse['verdicts'];
  loading: boolean;
}

export function useHoldingVerdicts(): UseHoldingVerdictsResult {
  const { id: userId } = useEffectiveUser();

  const { data, isLoading } = useQuery({
    queryKey: ['copilot-holding-verdicts', userId ?? ''],
    queryFn: fetchHoldingVerdicts,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  return {
    generatedAt: data?.generatedAt ?? null,
    verdicts: data?.verdicts ?? [],
    loading: isLoading,
  };
}
