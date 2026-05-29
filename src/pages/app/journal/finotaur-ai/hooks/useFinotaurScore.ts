// src/pages/app/journal/finotaur-ai/hooks/useFinotaurScore.ts

import { useQuery } from '@tanstack/react-query';
import { fetchFinotaurScore } from '../services/finotaurAIApi';

export function useFinotaurScore(windowDays = 30, enabled = true) {
  return useQuery({
    queryKey: ['finotaur-score', windowDays],
    queryFn: () => fetchFinotaurScore(windowDays),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled,
  });
}
