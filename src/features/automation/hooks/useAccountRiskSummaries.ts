// src/features/automation/hooks/useAccountRiskSummaries.ts
// ─────────────────────────────────────────────────────────────────────────────
// Fetches the user's active automation_risk_rules and maps them by Tradovate
// account id, so the copy-trading table can show a compact per-account risk
// summary (e.g. "DL $500 · MC 3"). Mirrors the raw-table query pattern
// ManageRiskTab.tsx uses for its per-account risk-rule fetch (account_id is
// not on the typed AutomationRiskRule interface, so this queries the columns
// directly — same approach, read-only).
// ─────────────────────────────────────────────────────────────────────────────

import { useTimedQuery } from '@/hooks/useTimedQuery';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

export interface AccountRiskSummary {
  dailyLossLimitUsd: number | null;
  maxContracts: number | null;
}

async function fetchRiskSummaries(userId: string): Promise<Map<string, AccountRiskSummary>> {
  const { data, error } = await supabase
    .from('automation_risk_rules')
    .select('account_id, daily_loss_limit_usd, max_contracts')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error?.code === '42P01') return new Map();
  if (error) throw error;

  const map = new Map<string, AccountRiskSummary>();
  for (const row of data ?? []) {
    // Defensive: account_id isn't on the typed schema elsewhere in this repo
    // (see ManageRiskTab.tsx's raw query for the same reason).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw select, no generated type for this table shape
    const r = row as any;
    if (r.account_id == null) continue;
    map.set(String(r.account_id), {
      dailyLossLimitUsd: r.daily_loss_limit_usd ?? null,
      maxContracts: r.max_contracts ?? null,
    });
  }
  return map;
}

export function useAccountRiskSummaries() {
  const { id: userId } = useEffectiveUser();

  const { data, isLoading } = useTimedQuery({
    queryKey: ['automation', 'risk_rule_summaries', userId ?? ''],
    queryFn: () => fetchRiskSummaries(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return {
    summaryByAccountId: data ?? new Map<string, AccountRiskSummary>(),
    isLoading,
  };
}
