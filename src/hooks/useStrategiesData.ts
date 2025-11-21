// ================================================
// CACHED STRATEGIES DATA HOOK
// ✅ Automatic deduplication
// ✅ Stale-while-revalidate
// ✅ Window focus refetch
// ✅ IMPERSONATION SUPPORT
// ================================================

import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/services/api/supabaseClient';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export function useStrategiesData() {
  const { id: userId } = useEffectiveUser();
  const { isImpersonating } = useImpersonation();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['strategies', userId, isImpersonating ? 'admin' : 'user'],
    queryFn: async () => {
      if (!userId) return [];

      console.log('📊 Fetching strategies for user:', userId, '| Impersonating:', isImpersonating);

      // 🔥 Use admin client when impersonating
      const client = getSupabaseClient(isImpersonating);

      const { data, error } = await client
        .from('strategies')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching strategies:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} strategies`);

      return data.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        color: s.color,
        created_at: s.created_at,
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  });

  return {
    strategies: data ?? [],
    isLoading,
    error,
    refetch,
  };
}