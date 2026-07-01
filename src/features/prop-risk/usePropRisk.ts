// src/features/prop-risk/usePropRisk.ts
// ═══════════════════════════════════════════════════════════════════
// Per-account prop-firm risk hook.
// Gathers accounts from portfolios + agent snapshots, matches them
// to saved configs in prop_account_configs/prop_account_equity_state,
// and runs computePropStatus for every mapped account.
// ═══════════════════════════════════════════════════════════════════

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePortfolios } from '@/hooks/usePortfolios';
import { useAgentAccountSnapshots } from '@/features/automation/hooks/useAgentAccountSnapshots';
import { detectFirmGroup } from '@/components/journal/accountGrouping';
import {
  firmFromDetectKey,
  getPlanByKey,
  PROP_FIRM_CATALOG,
} from './propFirmCatalog';
import {
  computePropStatus,
  ruleSetFromConfig,
  ruleSetFromPlan,
} from './computePropStatus';
import type { PropComputed } from './computePropStatus';
import { resolvePlan, type ResolvedPlan } from './resolvePlan';

// ── DB row shapes ─────────────────────────────────────────────────

interface PropConfigRow {
  account_name: string;
  firm_key: string;
  plan_key: string;
  starting_balance: number;
  drawdown_type: string;
  trailing_amount: number;
  profit_target: number;
  daily_loss_limit: number | null;
  lock_type: string;
  lock_value: number;
  phase: string;
}

interface PropEquityRow {
  account_name: string;
  hwm_equity: number | null;
  last_equity: number | null;
  last_balance: number | null;
  last_source: string | null;
  day_start_equity: number | null;
  day_anchor: string | null;
}

interface BrokerAccountRow {
  account_name: string;
  balance_snapshot: { cash_balance?: number | null; open_pnl?: number | null } | null;
}

interface PropBrokerRiskRow {
  account_name: string;
  trailing_amount: number | null;
  daily_loss_limit: number | null;
  drawdown_floor: number | null;
  drawdown_mode: string | null;
  parsed_ok: boolean;
}

// ── Public row type ───────────────────────────────────────────────

export interface PropRiskRow {
  accountName: string;
  portfolioId: string | null;
  env: 'live' | 'demo' | null;
  detectedFirmLabel: string;
  /** Catalog firm key (e.g. 'apex') — empty string if not in catalog. */
  detectedFirmKey: string;
  planLabel: string;
  config: PropConfigRow | null;
  computed: PropComputed | null;
  online: boolean;
  hasLive: boolean;
  lastSource: string | null;
  /** How the current plan/status was determined — drives the "auto-detected" UI hint. */
  resolvedSource: 'manual' | 'broker' | 'balance' | 'default' | null;
}

// ── Query keys ────────────────────────────────────────────────────

const configKey = (userId: string) => ['prop-risk', 'configs', userId] as const;
const equityKey = (userId: string) => ['prop-risk', 'equity', userId] as const;
const brokerKey = (userId: string) => ['prop-risk', 'broker', userId] as const;
const brokerRiskKey = (userId: string) => ['prop-risk', 'broker-risk', userId] as const;

// ── Fetchers ──────────────────────────────────────────────────────

async function fetchConfigs(userId: string): Promise<PropConfigRow[]> {
  const { data, error } = await supabase
    .from('prop_account_configs')
    .select(
      'account_name,firm_key,plan_key,starting_balance,drawdown_type,trailing_amount,profit_target,daily_loss_limit,lock_type,lock_value,phase',
    )
    .eq('user_id', userId);
  if (error?.code === '42P01') return [];
  if (error) throw error;
  return (data ?? []) as PropConfigRow[];
}

async function fetchEquityState(userId: string): Promise<PropEquityRow[]> {
  const { data, error } = await supabase
    .from('prop_account_equity_state')
    .select(
      'account_name,hwm_equity,last_equity,last_balance,last_source,day_start_equity,day_anchor',
    )
    .eq('user_id', userId);
  if (error?.code === '42P01') return [];
  if (error) throw error;
  return (data ?? []) as PropEquityRow[];
}

async function fetchBrokerAccounts(userId: string): Promise<BrokerAccountRow[]> {
  // broker_accounts may not exist yet — degrade gracefully
  const { data, error } = await supabase
    .from('broker_accounts')
    .select('account_name,balance_snapshot')
    .eq('user_id', userId);
  if (error?.code === '42P01') return [];
  if (error) {
    // Non-fatal — broker_accounts is optional data source
    return [];
  }
  return (data ?? []) as BrokerAccountRow[];
}

async function fetchBrokerRisk(userId: string): Promise<PropBrokerRiskRow[]> {
  const { data, error } = await supabase
    .from('prop_account_broker_risk')
    .select('account_name,trailing_amount,daily_loss_limit,drawdown_floor,drawdown_mode,parsed_ok')
    .eq('user_id', userId);
  if (error?.code === '42P01') return [];
  if (error) throw error;
  return (data ?? []) as PropBrokerRiskRow[];
}

// ── Hook ──────────────────────────────────────────────────────────

export interface UsePropRiskResult {
  rows: PropRiskRow[];
  isLoading: boolean;
  refetch: () => void;
  assignPlan: (
    accountName: string,
    firmKey: string,
    planKey: string,
    phase: 'evaluation' | 'funded',
  ) => Promise<void>;
  removePlan: (accountName: string) => Promise<void>;
}

export function usePropRisk(): UsePropRiskResult {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();
  const { tradovatePortfolios, brokerPortfolios, isLoading: portfoliosLoading } = usePortfolios();
  const { snapshotByAccountName, isLoading: snapshotLoading } = useAgentAccountSnapshots();

  const configQuery = useQuery({
    queryKey: configKey(userId ?? ''),
    queryFn: () => fetchConfigs(userId!),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 15_000,
    gcTime: 5 * 60 * 1000,
  });

  const equityQuery = useQuery({
    queryKey: equityKey(userId ?? ''),
    queryFn: () => fetchEquityState(userId!),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 15_000,
    gcTime: 5 * 60 * 1000,
  });

  const brokerQuery = useQuery({
    queryKey: brokerKey(userId ?? ''),
    queryFn: () => fetchBrokerAccounts(userId!),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 15_000,
    gcTime: 5 * 60 * 1000,
  });

  const brokerRiskQuery = useQuery({
    queryKey: brokerRiskKey(userId ?? ''),
    queryFn: () => fetchBrokerRisk(userId!),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 15_000,
    gcTime: 5 * 60 * 1000,
  });

  // Build case-insensitive maps
  const configMap = new Map<string, PropConfigRow>();
  for (const c of configQuery.data ?? []) {
    configMap.set(c.account_name.trim().toLowerCase(), c);
  }

  const equityMap = new Map<string, PropEquityRow>();
  for (const e of equityQuery.data ?? []) {
    equityMap.set(e.account_name.trim().toLowerCase(), e);
  }

  const brokerMap = new Map<string, BrokerAccountRow>();
  for (const b of brokerQuery.data ?? []) {
    brokerMap.set(b.account_name.trim().toLowerCase(), b);
  }

  const brokerRiskMap = new Map<string, PropBrokerRiskRow>();
  for (const r of brokerRiskQuery.data ?? []) {
    brokerRiskMap.set(r.account_name.trim().toLowerCase(), r);
  }

  // Collect all account names from portfolios (tradovate/broker, is_active)
  const accountSet = new Map<string, { portfolioId: string | null; env: 'live' | 'demo' | null }>();

  // Source of truth = exactly the accounts the Connections tab shows: active
  // portfolios whose broker connection is active. usePortfolios already applies
  // is_active + credential-match filtering, so tradovatePortfolios/brokerPortfolios
  // are the real, active accounts (~the Connections list). Agent snapshots are a
  // LIVE-DATA source ONLY — never an account-enumeration source (the NT8 agent
  // reports hundreds of demo accounts that are not real/active).
  for (const p of [...tradovatePortfolios, ...brokerPortfolios]) {
    const key = (p.name ?? '').trim();
    if (!key) continue;
    if (!accountSet.has(key)) {
      accountSet.set(key, { portfolioId: p.id, env: p.environment ?? null });
    }
  }

  const rows: PropRiskRow[] = [];

  for (const [accountName, { portfolioId, env }] of accountSet) {
    const lower = accountName.toLowerCase();

    // Show only Tradovate-confirmed accounts: a matched broker_risk row means the
    // account appears in Tradovate's /account/list; a manual config is an explicit
    // user opt-in. Everything else is a stale/duplicate portfolio record — hide it.
    const hasBrokerRisk = brokerRiskMap.has(lower);
    const hasConfig = configMap.has(lower);
    if (!hasBrokerRisk && !hasConfig) {
      continue;
    }

    const detected = detectFirmGroup(accountName);
    const catalogFirm = firmFromDetectKey(detected.key);
    const detectedFirmKey = catalogFirm?.key ?? '';
    const detectedFirmLabel = catalogFirm?.label ?? detected.label;

    // Live data: agent snapshot → broker_accounts fallback
    const snap = snapshotByAccountName(accountName);
    let balance: number | null = null;
    let openPnl: number | null = null;
    let dayPnl: number | null = null;
    let online = false;
    let hasLive = false;
    let lastSource: string | null = null;

    if (snap) {
      balance = snap.balance ?? null;
      openPnl = snap.openPnl ?? null;
      dayPnl = snap.dayPnl ?? null;
      online = snap.online;
      hasLive = balance !== null;
      lastSource = 'agent';
    } else {
      const broker = brokerMap.get(lower);
      const eq = equityMap.get(lower);
      if (broker?.balance_snapshot && broker.balance_snapshot.cash_balance != null) {
        balance = broker.balance_snapshot.cash_balance;
        openPnl = broker.balance_snapshot.open_pnl ?? null;
        hasLive = true;
        lastSource = 'broker_accounts';
      } else if (eq && eq.last_balance != null) {
        // Non-agent Tradovate accounts: the tradovate-sync edge fn persists each
        // account's latest cash balance into prop_account_equity_state (via
        // prop_touch_equity). Derive open PnL from the stored equity − balance.
        balance = eq.last_balance;
        openPnl = eq.last_equity != null ? eq.last_equity - eq.last_balance : null;
        hasLive = true;
        lastSource = eq.last_source ?? 'tradovate';
      }
    }

    const config = configMap.get(lower) ?? null;
    const state = equityMap.get(lower) ?? null;

    let computed: PropComputed | null = null;
    let planLabel = '';
    let resolvedSource: 'manual' | 'broker' | 'balance' | 'default' | null = null;

    const brokerRisk = brokerRiskMap.get(lower) ?? null;

    // The broker-reported drawdown_floor is only an absolute $ threshold for EOD
    // (end-of-day trailing) accounts. RealTime/Intraday-mode accounts report a
    // small relative value there (e.g. 100), not a dollar floor — using it as an
    // absolute floor would be wrong. Guard with a sanity check against balance.
    const useExactFloor =
      brokerRisk?.drawdown_mode === 'EOD' &&
      brokerRisk.drawdown_floor != null &&
      balance != null &&
      brokerRisk.drawdown_floor > balance * 0.5;
    const enforcedFloor = useExactFloor ? brokerRisk!.drawdown_floor : null;
    const enforcedTrailing = brokerRisk?.trailing_amount ?? null;
    // We pulled real broker data whenever trailing_amount is present, even if the
    // absolute floor itself wasn't usable (RealTime mode) — still 'broker'-sourced.
    const brokerDataPulled = brokerRisk?.trailing_amount != null;

    if (config) {
      // Manual override — user explicitly assigned a plan via the settings gear.
      // Still benefits from the exact broker-enforced floor when available.
      const rules = ruleSetFromConfig(config);
      computed = computePropStatus(rules, {
        balance,
        openPnl,
        dayPnl,
        hwmEquity: state?.hwm_equity ?? null,
        dayStartEquity: state?.day_start_equity ?? null,
        enforcedFloor,
        enforcedTrailing,
      });

      // Resolve plan label from catalog or config key
      const planEntry = getPlanByKey(config.plan_key);
      planLabel = planEntry?.plan.label ?? config.plan_key;
      resolvedSource = 'manual';
    } else {
      // No manual override — auto-resolve firm + size + drawdown/target rules.
      const resolved: ResolvedPlan | null = detectedFirmKey
        ? resolvePlan(detectedFirmKey, balance, brokerRisk)
        : null;

      if (resolved) {
        const rules = ruleSetFromPlan(resolved.plan); // phase defaults to 'evaluation'
        rules.trailingAmount = resolved.trailingAmount; // broker-pulled override
        rules.dailyLossLimit = resolved.dailyLossLimit; // broker-pulled override
        computed = computePropStatus(rules, {
          balance,
          openPnl,
          dayPnl,
          hwmEquity: state?.hwm_equity ?? null,
          dayStartEquity: state?.day_start_equity ?? null,
          enforcedFloor,
          enforcedTrailing,
        });
        planLabel = resolved.plan.label;
        resolvedSource = brokerDataPulled ? 'broker' : resolved.source; // 'broker' | 'balance' | 'default'
      }
    }

    rows.push({
      accountName,
      portfolioId,
      env,
      detectedFirmLabel,
      detectedFirmKey,
      planLabel,
      config,
      computed,
      online,
      hasLive,
      lastSource,
      resolvedSource,
    });
  }

  const refetch = useCallback(() => {
    if (!userId) return;
    void qc.invalidateQueries({ queryKey: configKey(userId) });
    void qc.invalidateQueries({ queryKey: equityKey(userId) });
    void qc.invalidateQueries({ queryKey: brokerKey(userId) });
    void qc.invalidateQueries({ queryKey: brokerRiskKey(userId) });
  }, [userId, qc]);

  const assignPlan = useCallback(
    async (
      accountName: string,
      firmKey: string,
      planKey: string,
      phase: 'evaluation' | 'funded',
    ) => {
      if (!userId) throw new Error('Not authenticated');

      const entry = getPlanByKey(planKey);
      if (!entry) throw new Error(`Unknown plan key: ${planKey}`);
      const { plan } = entry;

      const { error } = await supabase.from('prop_account_configs').upsert(
        {
          user_id: userId,
          account_name: accountName,
          firm_key: firmKey,
          plan_key: planKey,
          starting_balance: plan.accountSize,
          drawdown_type: plan.drawdownType,
          trailing_amount: plan.trailingAmount,
          profit_target: plan.profitTarget,
          daily_loss_limit: plan.dailyLossLimit,
          lock_type: plan.lockType,
          lock_value: plan.lockValue,
          phase,
        },
        { onConflict: 'user_id,account_name' },
      );
      if (error) throw error;
      refetch();
    },
    [userId, refetch],
  );

  const removePlan = useCallback(
    async (accountName: string) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('prop_account_configs')
        .delete()
        .eq('user_id', userId)
        .eq('account_name', accountName);
      if (error) throw error;
      refetch();
    },
    [userId, refetch],
  );

  const isLoading =
    portfoliosLoading ||
    snapshotLoading ||
    configQuery.isLoading ||
    equityQuery.isLoading;

  return { rows, isLoading, refetch, assignPlan, removePlan };
}
