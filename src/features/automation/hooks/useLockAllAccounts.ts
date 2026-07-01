// src/features/automation/hooks/useLockAllAccounts.ts
// ─────────────────────────────────────────────────────────────────────────────
// Lock / unlock ALL of the current user's portfolios at once.
// Mirrors ManageRiskTab's single-account kill-switch write exactly:
//   1. portfolios.kill_switch_active (primary write, with updated_at bump so
//      automation_get_config's config_version picks up the change)
//   2. automation_upsert_risk_rule RPC per Tradovate account (BLOCKING — the
//      desktop agent enforces from automation_risk_rules, not portfolios)
// Non-Tradovate portfolios (tradovate_account_id == null) only get the
// portfolios write — same as ManageRiskTab's callAgentRiskRpc, which skips
// silently for those.
// ─────────────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePortfolios, type Portfolio } from '@/hooks/usePortfolios';
import { toast } from 'sonner';

/** Inline RPC params type — mirrors automation_upsert_risk_rule's signature
 * (same shape ManageRiskTab.tsx uses for callAgentRiskRpc). */
interface AgentRiskRuleParams {
  p_account_id:              string;
  p_account_name:            string;
  p_label:                   string;
  p_daily_loss_limit_usd:    number | null;
  p_max_loss_per_trade_usd:  number | null;
  p_max_weekly_loss_usd:     number | null;
  p_trade_profit_target_usd: number | null;
  p_daily_profit_target_usd: number | null;
  p_weekly_profit_target_usd:number | null;
  p_max_contracts:           number | null;
  p_max_position_size:       number | null;
  p_max_position_usd:        number | null;
  p_max_trades_per_day:      number | null;
  p_tilt_loss_streak:        number | null;
  p_tilt_cooldown_minutes:   number | null;
  p_risk_breach_action:      string;
  p_enforce:                 boolean;
  p_is_active:               boolean;
}

/**
 * Syncs the kill switch for one portfolio into automation_risk_rules via the
 * upsert RPC, carrying over the portfolio's existing risk limits unchanged
 * (only kill_switch_active / risk_management_enabled toggle). Skips silently
 * (returns null) for non-Tradovate portfolios — same contract as
 * ManageRiskTab's callAgentRiskRpc.
 */
async function syncKillSwitchToAgent(
  portfolio: Portfolio,
  killSwitchActive: boolean,
): Promise<string | null> {
  if (portfolio.tradovate_account_id == null) return null;

  const params: AgentRiskRuleParams = {
    p_account_id:              String(portfolio.tradovate_account_id),
    p_account_name:            portfolio.name,
    p_label:                   portfolio.name,
    p_daily_loss_limit_usd:    portfolio.max_daily_loss_usd,
    p_max_loss_per_trade_usd:  portfolio.max_loss_per_trade_usd,
    p_max_weekly_loss_usd:     portfolio.max_weekly_loss_usd,
    p_trade_profit_target_usd: portfolio.trade_profit_target_usd,
    p_daily_profit_target_usd: portfolio.daily_profit_target_usd,
    p_weekly_profit_target_usd:portfolio.weekly_profit_target_usd,
    p_max_contracts:           portfolio.max_contracts_per_trade,
    p_max_position_size:       portfolio.max_position_size,
    // Agent-only fields aren't tracked on Portfolio — carry over as null
    // (matches ManageRiskTab behavior when a field was never set).
    p_max_position_usd:        null,
    p_max_trades_per_day:      null,
    p_tilt_loss_streak:        null,
    p_tilt_cooldown_minutes:   null,
    p_risk_breach_action:      portfolio.risk_breach_action ?? 'pause_copies',
    p_enforce:                 portfolio.risk_management_enabled ?? true,
    p_is_active:               portfolio.risk_management_enabled ?? true,
  };

  const { error } = await supabase.rpc('automation_upsert_risk_rule', params);
  if (error) return error.message;
  return null;
}

/** Sets kill_switch_active for every portfolio, mirroring ManageRiskTab's
 * per-account write (portfolios update + blocking agent RPC sync). */
async function setKillSwitchForAllPortfolios(
  portfolios: Portfolio[],
  killSwitchActive: boolean,
): Promise<void> {
  const failures: string[] = [];

  await Promise.all(
    portfolios.map(async (p) => {
      // 1. Primary write — portfolios table (same field + updated_at bump
      //    ManageRiskTab uses so automation_get_config's config_version
      //    picks up the change).
      const { error } = await supabase
        .from('portfolios')
        .update({ kill_switch_active: killSwitchActive, updated_at: new Date().toISOString() })
        .eq('id', p.id);

      if (error) {
        failures.push(`${p.name}: ${error.message}`);
        return;
      }

      // 2. Agent rule sync — BLOCKING, same as ManageRiskTab. If this fails,
      //    the account is not actually protected/unprotected on the agent
      //    even though the portfolios row changed.
      const agentErr = await syncKillSwitchToAgent(p, killSwitchActive);
      if (agentErr != null) {
        failures.push(`${p.name} (agent sync): ${agentErr}`);
      }
    }),
  );

  if (failures.length > 0) {
    throw new Error(
      `Some accounts did not fully sync: ${failures.join('; ')}`,
    );
  }
}

export function useLockAllAccounts() {
  const { id: userId } = useEffectiveUser();
  const { portfolios } = usePortfolios();
  const qc = useQueryClient();

  const tradeablePortfolios = portfolios.filter((p) => p.is_active);

  const mutation = useMutation({
    mutationFn: async (killSwitchActive: boolean) => {
      if (!userId) throw new Error('Not signed in');
      await setKillSwitchForAllPortfolios(tradeablePortfolios, killSwitchActive);
    },
    onSuccess: (_data, killSwitchActive) => {
      qc.invalidateQueries({ queryKey: ['portfolios'] });
      toast.success(killSwitchActive ? 'All accounts locked' : 'All accounts unlocked');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : String(err));
    },
  });

  return {
    lockAll:   () => mutation.mutateAsync(true),
    unlockAll: () => mutation.mutateAsync(false),
    isLocking: mutation.isPending,
  };
}
