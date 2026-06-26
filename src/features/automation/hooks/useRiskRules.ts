// src/features/automation/hooks/useRiskRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// CRUD for automation_risk_rules. Direct Supabase, RLS-guarded.
// Follows the canonical useTimedQuery + mutation + toast pattern.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTimedQuery } from '@/hooks/useTimedQuery';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';
import type { AutomationRiskRule } from '../lib/automationTypes';

const queryKey = (userId: string) => ['automation', 'risk_rules', userId] as const;

async function fetchRules(userId: string): Promise<AutomationRiskRule[]> {
  const { data, error } = await supabase
    .from('automation_risk_rules')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error?.code === '42P01') return [];
  if (error) throw error;
  return (data ?? []) as AutomationRiskRule[];
}

export function useRiskRules() {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();

  const { data: rules = [], isLoading, isError, error, refetch } = useTimedQuery({
    queryKey: queryKey(userId ?? ''),
    queryFn: () => fetchRules(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const invalidate = useCallback(() => {
    if (!userId) return;
    qc.invalidateQueries({ queryKey: ['automation', 'risk_rules', userId] });
  }, [userId, qc]);

  /** Create or update a rule. Pass `id` to update, omit to insert. */
  const upsertRule = useCallback(
    async (
      ruleData: Omit<AutomationRiskRule, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { id?: string },
    ) => {
      if (!userId) return { success: false };

      const now = new Date().toISOString();
      const payload = {
        ...ruleData,
        user_id: userId,
        updated_at: now,
        ...(ruleData.id ? {} : { created_at: now }),
      };

      const { error: e } = ruleData.id
        ? await supabase
            .from('automation_risk_rules')
            .update(payload)
            .eq('id', ruleData.id)
            .eq('user_id', userId)
        : await supabase.from('automation_risk_rules').insert(payload);

      if (e) {
        toast.error('Failed to save rule');
        return { success: false, error: e.message };
      }
      invalidate();
      toast.success(ruleData.id ? 'Rule updated' : 'Rule created');
      return { success: true };
    },
    [userId, invalidate],
  );

  const deleteRule = useCallback(
    async (id: string) => {
      if (!userId) return { success: false };

      const { error: e } = await supabase
        .from('automation_risk_rules')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (e) {
        toast.error('Failed to delete rule');
        return { success: false, error: e.message };
      }
      invalidate();
      toast.success('Rule deleted');
      return { success: true };
    },
    [userId, invalidate],
  );

  return {
    rules,
    isLoading,
    isError,
    error,
    refetch,
    upsertRule,
    deleteRule,
    invalidate,
  };
}
