// src/hooks/useCopyRules.ts
// ═══════════════════════════════════════════════════════════════
// Fetches and mutates portfolio_copy_rules including risk fields.
// ═══════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface CopyRule {
  id:                   string;
  user_id:              string;
  source_portfolio_id:  string;
  target_portfolio_id:  string;
  ratio:                number;
  is_active:            boolean;
  copy_opens:           boolean;
  copy_closes:          boolean;
  max_contracts:        number | null;
  max_daily_loss_usd:   number | null;
  max_position_size:    number | null;
  kill_switch_active:   boolean;
  cross_to_micro:       boolean;
  created_at:           string;
}

async function fetchCopyRules(): Promise<CopyRule[]> {
  const { data, error } = await supabase
    .from('portfolio_copy_rules')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CopyRule[];
}

export function useCopyRules() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<CopyRule[], Error>({
    queryKey: ['portfolio-copy-rules'],
    queryFn: fetchCopyRules,
    staleTime: 10_000,
  });

  const updateRule = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<CopyRule> }) => {
      const { data, error } = await supabase
        .from('portfolio_copy_rules')
        .update(input.patch)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as CopyRule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio-copy-rules'] }),
  });

  // I.4 (2026-05-10): create a new copy rule. Used by the follow toggle when
  // no rule exists for a (leader → follower) pair yet. user_id is left out:
  // RLS + the table default fill it from auth.uid().
  const createRule = useMutation({
    mutationFn: async (input: {
      source_portfolio_id: string;
      target_portfolio_id: string;
      ratio?:              number;
      is_active?:          boolean;
    }) => {
      const { data, error } = await supabase
        .from('portfolio_copy_rules')
        .insert({
          source_portfolio_id: input.source_portfolio_id,
          target_portfolio_id: input.target_portfolio_id,
          ratio:               input.ratio     ?? 1,
          is_active:           input.is_active ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CopyRule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio-copy-rules'] }),
  });

  return {
    rules:      data ?? [],
    isLoading,
    error,
    updateRule: updateRule.mutateAsync,
    isUpdating: updateRule.isPending,
    createRule: createRule.mutateAsync,
    isCreating: createRule.isPending,
  };
}
