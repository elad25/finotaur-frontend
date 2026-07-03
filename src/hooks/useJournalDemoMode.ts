import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

/** Cheap head-count: does the effective user have ANY (non-deleted) trade? */
export function useHasAnyTrades() {
  const { id: userId } = useEffectiveUser();
  return useQuery({
    queryKey: ['has-any-trades', userId ?? ''],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('trades')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId!)
        .is('deleted_at', null);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

/**
 * Demo mode = a logged-in user with ZERO real trades. Consumers fill the
 * journal with sample data so a brand-new user can see how everything works.
 * Flips off automatically the moment their first real trade lands.
 */
export function useJournalDemoMode(): { isDemo: boolean; isLoading: boolean } {
  const { data: hasAny, isLoading } = useHasAnyTrades();
  return { isDemo: !isLoading && hasAny === false, isLoading };
}
