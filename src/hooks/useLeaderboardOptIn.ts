// src/hooks/useLeaderboardOptIn.ts
// Read + toggle the current user's global_leaderboard_opt_in flag.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const OPT_IN_KEY = (userId: string | undefined) =>
  ['leaderboard-opt-in', userId] as const;

export function useLeaderboardOptIn(): {
  optIn: boolean;
  isLoading: boolean;
  toggle: () => void;
  isSaving: boolean;
} {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: optIn = false, isLoading } = useQuery<boolean>({
    queryKey: OPT_IN_KEY(user?.id),
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('global_leaderboard_opt_in')
        .eq('id', user!.id)
        .maybeSingle();
      return data?.global_leaderboard_opt_in ?? false;
    },
  });

  const { mutate, isPending: isSaving } = useMutation<void, Error, boolean>({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase
        .from('profiles')
        .update({ global_leaderboard_opt_in: next })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: (_, next) => {
      queryClient.setQueryData(OPT_IN_KEY(user?.id), next);
      // Invalidate leaderboard queries so the table refreshes immediately.
      queryClient.invalidateQueries({ queryKey: ['global-leaderboard'] });
    },
  });

  return {
    optIn,
    isLoading,
    toggle: () => mutate(!optIn),
    isSaving,
  };
}
