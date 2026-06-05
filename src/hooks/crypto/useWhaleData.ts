// src/hooks/crypto/useWhaleData.ts
// React Query history hook for whale trades — mirrors useHeatmap.ts shape.

import { useQuery } from '@tanstack/react-query';
import { QUERY_TTL } from '@/lib/queryClient';
import { fetchWhaleTrades } from '@/pages/app/crypto/_shared/api';
import type { WhaleTrade } from '@/pages/app/crypto/_shared/types';

export function useWhaleTradesHistory(
  opts: { minUsd?: number; symbol?: string; side?: string; limit?: number } = {},
) {
  const query = useQuery<WhaleTrade[], Error>({
    queryKey: ['whale-trades', opts],
    queryFn: () => fetchWhaleTrades(opts),
    ...QUERY_TTL.spot, // 10s stale, 15s refetch — whale data is near-real-time
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}
