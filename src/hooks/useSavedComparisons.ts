import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import type { TradeFilter } from '@/lib/journal/tradeFilter';

export type { TradeFilter };

// ============================================================
// Types
// ============================================================

export type SavedComparison = {
  id: string;
  name: string;
  groupA: TradeFilter;
  groupB: TradeFilter;
  createdAt: string;
};

// ============================================================
// DB row → domain type mapper
// ============================================================

function mapComparison(row: {
  id: string;
  name: string;
  group_a: unknown; // jsonb
  group_b: unknown; // jsonb
  created_at: string;
}): SavedComparison {
  return {
    id: row.id,
    name: row.name,
    groupA: (row.group_a as TradeFilter) ?? {},
    groupB: (row.group_b as TradeFilter) ?? {},
    createdAt: row.created_at,
  };
}

// ============================================================
// Hook
// ============================================================

export function useSavedComparisons() {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['journal-saved-comparisons', userId],
    queryFn: async (): Promise<SavedComparison[]> => {
      const { data, error } = await supabase
        .from('journal_saved_comparisons')
        .select('id, name, group_a, group_b, created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapComparison);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['journal-saved-comparisons', userId] });

  const saveComparisonMutation = useMutation({
    mutationFn: async ({
      name,
      groupA,
      groupB,
    }: {
      name: string;
      groupA: TradeFilter;
      groupB: TradeFilter;
    }) => {
      if (!userId) throw new Error('No user ID');
      const { error } = await supabase.from('journal_saved_comparisons').insert({
        user_id: userId,
        name,
        group_a: groupA,
        group_b: groupB,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteComparisonMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('No user ID');
      const { error } = await supabase
        .from('journal_saved_comparisons')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    comparisons: query.data ?? [],
    isLoading: query.isLoading,

    saveComparison: (name: string, groupA: TradeFilter, groupB: TradeFilter) =>
      saveComparisonMutation.mutate({ name, groupA, groupB }),
    deleteComparison: (id: string) => deleteComparisonMutation.mutate(id),
  };
}
