// ================================================
// CACHED STRATEGIES DATA HOOK
// ✅ Automatic deduplication
// ✅ Stale-while-revalidate
// ✅ Window focus refetch
// ================================================

import { useQuery } from '@tanstack/react-query';
import { getStrategies } from '@/routes/strategies';

export function useStrategiesData() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['strategies'],
    queryFn: async () => {
      const result = await getStrategies();
      if (result.ok && result.data) {
        return result.data.map((s: any) => ({
          id: s.id,
          name: s.name,
        }));
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return {
    strategies: data ?? [],
    isLoading,
    error,
    refetch,
  };
}