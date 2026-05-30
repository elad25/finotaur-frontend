// src/pages/app/journal/finotaur-ai/hooks/useTradeScorecard.ts

import { useQuery } from '@tanstack/react-query';
import { BriefingApiError, fetchTradeScorecard } from '../services/finotaurAIApi';

export function useTradeScorecard(tradeId: string, enabled = true) {
  return useQuery({
    queryKey: ['trade-scorecard', tradeId],
    queryFn: () => fetchTradeScorecard(tradeId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: enabled && !!tradeId,
    retry: (failCount, err) =>
      err instanceof BriefingApiError && err.status >= 500 ? failCount < 1 : false,
  });
}
