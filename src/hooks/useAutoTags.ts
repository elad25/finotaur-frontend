import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import type { AutoTagCondition, AutoTagRule } from '@/lib/journal/autotag';

export type { AutoTagCondition, AutoTagRule };

// ============================================================
// DB row → domain type mapper
// ============================================================

function mapRule(row: {
  id: string;
  tag: string;
  conditions: unknown; // jsonb from DB
  is_active: boolean;
  order: number;
  created_at: string;
}): AutoTagRule {
  return {
    id: row.id,
    tag: row.tag,
    conditions: (row.conditions as AutoTagCondition[]) ?? [],
    isActive: row.is_active,
    order: row.order,
    createdAt: row.created_at,
  };
}

// ============================================================
// Hook
// ============================================================

export function useAutoTagRules() {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['journal-autotag-rules', userId],
    queryFn: async (): Promise<AutoTagRule[]> => {
      const { data, error } = await supabase
        .from('journal_autotag_rules')
        .select('id, tag, conditions, is_active, "order", created_at')
        .eq('user_id', userId!)
        .order('"order"', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapRule);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const rules = query.data ?? [];

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['journal-autotag-rules', userId] });

  // ── Mutations ──────────────────────────────────────────────

  const createRuleMutation = useMutation({
    mutationFn: async ({
      tag,
      conditions,
    }: {
      tag: string;
      conditions: AutoTagCondition[];
    }) => {
      if (!userId) throw new Error('No user ID');
      const maxOrder = rules.length > 0 ? Math.max(...rules.map(r => r.order)) : -1;
      const { error } = await supabase.from('journal_autotag_rules').insert({
        user_id: userId,
        tag,
        conditions, // jsonb — Supabase accepts the array directly
        is_active: true,
        order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({
      id,
      partial,
    }: {
      id: string;
      partial: Partial<Pick<AutoTagRule, 'tag' | 'conditions' | 'isActive' | 'order'>>;
    }) => {
      if (!userId) throw new Error('No user ID');
      const payload: Record<string, unknown> = {};
      if (partial.tag !== undefined) payload.tag = partial.tag;
      if (partial.conditions !== undefined) payload.conditions = partial.conditions;
      if (partial.isActive !== undefined) payload.is_active = partial.isActive;
      if (partial.order !== undefined) payload.order = partial.order;
      const { error } = await supabase
        .from('journal_autotag_rules')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('No user ID');
      const { error } = await supabase
        .from('journal_autotag_rules')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('No user ID');
      const rule = rules.find(r => r.id === id);
      const { error } = await supabase
        .from('journal_autotag_rules')
        .update({ is_active: !rule?.isActive })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // ── Public API ─────────────────────────────────────────────

  return {
    rules,
    isLoading: query.isLoading,

    createRule: (tag: string, conditions: AutoTagCondition[]) =>
      createRuleMutation.mutate({ tag, conditions }),
    updateRule: (
      id: string,
      partial: Partial<Pick<AutoTagRule, 'tag' | 'conditions' | 'isActive' | 'order'>>,
    ) => updateRuleMutation.mutate({ id, partial }),
    deleteRule: (id: string) => deleteRuleMutation.mutate(id),
    toggleRule: (id: string) => toggleRuleMutation.mutate(id),
  };
}
