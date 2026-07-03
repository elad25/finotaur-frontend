// src/features/automation/hooks/useCopierTrial.ts
// ─────────────────────────────────────────────────────────────────────────────
// Free-tier copier trial: non-premium users get FREE_COPIER_TRADE_LIMIT
// mirrored executions for free, then the copier locks behind Premium.
//
// A "copied trade" = one executed mirror of a leader order — an
// automation_events row with event_type 'copy_executed' (legacy fill-copy
// path) or 'order_copy_executed' (agent order-mirroring path). Modified /
// cancelled / failed / skipped events do NOT consume the trial.
//
// The client-side gate (CopierPremiumGate) is UX only; the hard stop lives in
// the DB trigger that disables automation_settings.master_enabled once the
// trial is exhausted (migration 20260703_copier_free_trial.sql).
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';

export const FREE_COPIER_TRADE_LIMIT = 15;

const COUNTED_EVENT_TYPES = ['copy_executed', 'order_copy_executed'];

export interface CopierTrialState {
  /** Executed mirror events consumed by this user (0 for premium — not counted). */
  used: number;
  limit: number;
  /** True when a non-premium user has consumed the full trial. */
  exhausted: boolean;
  /** Premium / admin / vip — no limit applies. */
  unlimited: boolean;
  isLoading: boolean;
}

export function useCopierTrial(): CopierTrialState {
  const { user } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();

  const query = useQuery({
    queryKey: ['copier-trial', user?.id],
    enabled: Boolean(user?.id) && !subLoading && !isPremium,
    staleTime: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('automation_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .in('event_type', COUNTED_EVENT_TYPES);
      if (error) throw error;
      return count ?? 0;
    },
  });

  if (isPremium) {
    return { used: 0, limit: FREE_COPIER_TRADE_LIMIT, exhausted: false, unlimited: true, isLoading: subLoading };
  }

  const used = query.data ?? 0;
  return {
    used,
    limit: FREE_COPIER_TRADE_LIMIT,
    exhausted: used >= FREE_COPIER_TRADE_LIMIT,
    unlimited: false,
    isLoading: subLoading || query.isLoading,
  };
}
