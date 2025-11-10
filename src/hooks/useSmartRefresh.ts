import { useEffect, useState } from 'react';
import { smartRefresh } from '@/lib/smartRefresh';

export function useSmartRefresh(
  viewName: 'webhook_stats' | 'strategy_stats_view',
  maxAgeMinutes: number = 5
) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      setIsRefreshing(true);
      setError(null);
      
      try {
        const result = await smartRefresh(viewName, maxAgeMinutes);
        
        if (mounted && !result.fromCache) {
          console.log(`✅ View refreshed in ${result.duration}ms`);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setIsRefreshing(false);
        }
      }
    }

    refresh();

    return () => {
      mounted = false;
    };
  }, [viewName, maxAgeMinutes]);

  return { isRefreshing, error };
}