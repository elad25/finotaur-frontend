import { useQuery } from '@tanstack/react-query';
import type { MarketKey } from '../types/heatmap';
import type { HeatmapResponse } from '../types/heatmap';

export function useHeatmap(market: MarketKey) {
  return useQuery<HeatmapResponse>({
    queryKey: ['heatmap', market],
    queryFn: async () => {
      const res = await fetch(`/api/heatmap/${market}`);
      if (!res.ok) throw new Error('Failed to load heatmap');
      return res.json();
    },
    staleTime: (Number(import.meta.env.VITE_HEATMAP_TTL_MIN ?? 30)) * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 0,
  });
}
