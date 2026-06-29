// src/components/copyTrading/ManageRiskTab.tsx
// Compact Finotaur-branded Loss / Profit per Trade / Day / Week risk panel.

import { memo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  Lock,
  Minus,
  Plus,
  Save,
  Shield,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePortfolios, type Portfolio } from '@/hooks/usePortfolios';
import { toast } from 'sonner';

// ── Patch interface ─────────────────────────────────────────────────────────

interface PortfolioRiskPatch {
  // LOSS limits
  max_loss_per_trade_usd:   number | null;
  max_daily_loss_usd:       number | null;
  max_weekly_loss_usd:      number | null;
  // PROFIT targets
  trade_profit_target_usd:  number | null;
  daily_profit_target_usd:  number | null;
  weekly_profit_target_usd: number | null;
  // CONTROL
  risk_management_enabled:  boolean;
  kill_switch_active:        boolean;
  risk_breach_action:        'pause_copies' | 'stop_copies' | 'close_lock';
  // ADVANCED
  max_contracts_per_trade:  number | null;
  max_position_size:        number | null;
}

// ── Initial values shape for RiskCard ──────────────────────────────────────

interface RiskCardInitial {
  lossPerTrade:    string;
  lossPerDay:      string;
  lossPerWeek:     string;
  profitPerTrade:  string;
  profitPerDay:    string;
  profitPerWeek:   string;
  riskEnabled:     boolean;
  killSwitch:      boolean;
  breachAction:    'pause_copies' | 'stop_copies' | 'close_lock';
  maxContracts:    string;
  maxPositionSize: string;
}

// ── Global defaults for the "All Accounts" broadcast card ──────────────────

const GLOBAL_DEFAULTS: RiskCardInitial = {
  lossPerTrade:    '',
  lossPerDay:      '',
  lossPerWeek:     '',
  profitPerTrade:  '',
  profitPerDay:    '',
  profitPerWeek:   '',
  riskEnabled:     true,
  killSwitch:      false,
  breachAction:    'pause_copies',
  maxContracts:    '',
  maxPositionSize: '',
};

// ── Agent risk-rule RPC (blocking dual-write) ───────────────────────────────

/** Inline params type — mirrors the DB RPC signature. */
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
 * Calls automation_upsert_risk_rule for a single Tradovate account.
 * Returns an error string on failure, null on success.
 * Skips silently (returns null) when tradovate_account_id is null.
 */
async function callAgentRiskRpc(
  tradovateAccountId: number | null,
  accountName: string,
  patch: PortfolioRiskPatch,
): Promise<string | null> {
  if (tradovateAccountId == null) return null; // not a Tradovate account — skip

  const params: AgentRiskRuleParams = {
    p_account_id:              String(tradovateAccountId),
    p_account_name:            accountName,
    p_label:                   accountName,
    p_daily_loss_limit_usd:    patch.max_daily_loss_usd,
    p_max_loss_per_trade_usd:  patch.max_loss_per_trade_usd,
    p_max_weekly_loss_usd:     patch.max_weekly_loss_usd,
    p_trade_profit_target_usd: patch.trade_profit_target_usd,
    p_daily_profit_target_usd: patch.daily_profit_target_usd,
    p_weekly_profit_target_usd:patch.weekly_profit_target_usd,
    p_max_contracts:           patch.max_contracts_per_trade,
    p_max_position_size:       patch.max_position_size,
    p_max_position_usd:        null,
    p_max_trades_per_day:      null,
    p_tilt_loss_streak:        null,
    p_tilt_cooldown_minutes:   null,
    p_risk_breach_action:      patch.risk_breach_action,
    p_enforce:                 patch.risk_management_enabled,
    p_is_active:               patch.risk_management_enabled,
  };

  const { error } = await supabase.rpc('automation_upsert_risk_rule', params);
  if (error) return error.message;
  return null;
}

// ── Mutation ────────────────────────────────────────────────────────────────

function usePortfolioRisk() {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: {
      id: string;
      patch: PortfolioRiskPatch;
      /** Tradovate numeric account id — null for manual/broker portfolios. */
      tradovateAccountId: number | null;
      /** Human-readable account name used as the agent rule label. */
      accountName: string;
    }) => {
      // 1. Primary write — portfolios table (existing behaviour, unchanged).
      const { data, error } = await supabase
        .from('portfolios')
        .update(input.patch)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;

      // 2. Agent rule sync — BLOCKING and failure = hard error.
      //    The NT8 agent enforces risk limits exclusively from
      //    automation_risk_rules (NOT from portfolios). If this mirror fails,
      //    the user's accounts are silently unprotected even though the UI
      //    would otherwise show "saved". Throwing here makes the mutation
      //    reject and routes to onError so the user is told loudly to retry.
      //    callAgentRiskRpc returns null (no error) when tradovateAccountId is
      //    null — non-Tradovate accounts are not copier-traded, so there is no
      //    agent rule to write; that is NOT treated as a failure.
      //
      // TODO: kill_switch_active is written to portfolios above but is NOT
      //    propagated to automation_upsert_risk_rule — the per-account kill
      //    switch is not enforced by the agent yet (out of scope here).
      const agentErr = await callAgentRiskRpc(
        input.tradovateAccountId,
        input.accountName,
        input.patch,
      );
      if (agentErr != null) {
        throw new Error(
          `Risk saved to your journal, but the trading agent did NOT receive it — your accounts are not protected by this limit yet. (agent sync: ${agentErr})`,
        );
      }

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : String(err));
    },
  });

  return {
    updatePortfolioRisk: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}

// ── ManageRiskTab (container) ───────────────────────────────────────────────

export const ManageRiskTab = memo(function ManageRiskTab() {
  const { portfolios, isLoading } = usePortfolios();
  const { updatePortfolioRisk, isUpdating } = usePortfolioRisk();

  const tradovatePortfolios = portfolios.filter(
    (p) => p.source === 'tradovate' && p.is_active,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-ds-8">
        <p className="text-sm text-ink-secondary">Loading accounts...</p>
      </div>
    );
  }

  if (tradovatePortfolios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-ds-3 py-ds-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gold-border bg-gold-primary/10">
          <Shield className="h-6 w-6 text-gold-primary" />
        </div>
        <h3 className="text-base font-semibold text-ink-primary">No connected accounts</h3>
        <p className="max-w-md text-center text-sm text-ink-secondary">
          Connect a broker to manage risk limits per account.
        </p>
      </div>
    );
  }

  // Broadcast handler: applies the same patch to every Tradovate account.
  const handleBroadcast = async (patch: PortfolioRiskPatch) => {
    await Promise.all(
      tradovatePortfolios.map((p) =>
        updatePortfolioRisk({
          id: p.id,
          patch,
          tradovateAccountId: p.tradovate_account_id,
          accountName: p.name,
        }),
      ),
    );
  };

  const accountCount = tradovatePortfolios.length;

  return (
    <div className="space-y-ds-3">
      {/* ── Global "All Accounts" card ──────────────────────────── */}
      <RiskCard
        mode="global"
        initial={GLOBAL_DEFAULTS}
        headerTitle="All Accounts"
        headerBadge={null}
        headerSubtitle="Apply settings to every connected account"
        onSave={handleBroadcast}
        isSaving={isUpdating}
        saveLabel="Apply to all accounts"
        successMessage={`Applied to ${accountCount} account${accountCount === 1 ? '' : 's'}`}
      />

      {/* ── Per-account section divider ─────────────────────────── */}
      <div className="flex items-center gap-ds-3 pt-ds-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary whitespace-nowrap">
          Per-account overrides
        </span>
        <div className="flex-1 border-t border-[rgba(255,255,255,0.06)]" />
      </div>

      {/* ── Per-account cards ────────────────────────────────────── */}
      {tradovatePortfolios.map((p) => (
        <PortfolioRiskCard
          key={`${p.id}:${p.max_loss_per_trade_usd}:${p.max_daily_loss_usd}:${p.max_weekly_loss_usd}:${p.trade_profit_target_usd}:${p.daily_profit_target_usd}:${p.weekly_profit_target_usd}:${p.risk_management_enabled}:${p.kill_switch_active}:${p.risk_breach_action}:${p.max_contracts_per_trade}:${p.max_position_size}`}
          portfolio={p}
          onSave={(patch) =>
            updatePortfolioRisk({
              id: p.id,
              patch,
              tradovateAccountId: p.tradovate_account_id,
              accountName: p.name,
            })
          }
          isSaving={isUpdating}
        />
      ))}
    </div>
  );
});

// ── PortfolioRiskCard (thin wrapper around RiskCard) ────────────────────────

interface PortfolioRiskCardProps {
  portfolio: Portfolio;
  onSave: (patch: PortfolioRiskPatch) => Promise<unknown>;
  isSaving: boolean;
}

const PortfolioRiskCard = memo(function PortfolioRiskCard({
  portfolio,
  onSave,
  isSaving,
}: PortfolioRiskCardProps) {
  const initial: RiskCardInitial = {
    lossPerTrade:    portfolio.max_loss_per_trade_usd?.toString() ?? '',
    lossPerDay:      portfolio.max_daily_loss_usd?.toString() ?? '',
    lossPerWeek:     portfolio.max_weekly_loss_usd?.toString() ?? '',
    profitPerTrade:  portfolio.trade_profit_target_usd?.toString() ?? '',
    profitPerDay:    portfolio.daily_profit_target_usd?.toString() ?? '',
    profitPerWeek:   portfolio.weekly_profit_target_usd?.toString() ?? '',
    riskEnabled:     portfolio.risk_management_enabled ?? true,
    killSwitch:      portfolio.kill_switch_active ?? false,
    breachAction:    (portfolio.risk_breach_action as 'pause_copies' | 'stop_copies' | 'close_lock') ?? 'pause_copies',
    maxContracts:    portfolio.max_contracts_per_trade?.toString() ?? '',
    maxPositionSize: portfolio.max_position_size?.toString() ?? '',
  };

  return (
    <RiskCard
      mode="account"
      initial={initial}
      headerTitle={portfolio.tradovate_account_spec ?? portfolio.name ?? portfolio.id.slice(0, 8)}
      headerBadge={portfolio.environment ?? 'unknown'}
      headerSubtitle="Risk management"
      onSave={onSave}
      isSaving={isSaving}
      saveLabel="Save changes"
      successMessage="Risk limits saved"
    />
  );
});

// ── RiskCard (shared card — renders both per-account and global modes) ───────

interface RiskCardProps {
  mode: 'account' | 'global';
  initial: RiskCardInitial;
  headerTitle: string;
  headerBadge: string | null;
  headerSubtitle: string;
  onSave: (patch: PortfolioRiskPatch) => Promise<unknown>;
  isSaving: boolean;
  saveLabel: string;
  successMessage: string;
}

const RiskCard = memo(function RiskCard({
  mode,
  initial,
  headerTitle,
  headerBadge,
  headerSubtitle,
  onSave,
  isSaving,
  saveLabel,
  successMessage,
}: RiskCardProps) {
  // ── Loss limits ──────────────────────────────────────────────
  const [lossPerTrade, setLossPerTrade] = useState<string>(initial.lossPerTrade);
  const [lossPerDay,   setLossPerDay]   = useState<string>(initial.lossPerDay);
  const [lossPerWeek,  setLossPerWeek]  = useState<string>(initial.lossPerWeek);
  // ── Profit targets ───────────────────────────────────────────
  const [profitPerTrade, setProfitPerTrade] = useState<string>(initial.profitPerTrade);
  const [profitPerDay,   setProfitPerDay]   = useState<string>(initial.profitPerDay);
  const [profitPerWeek,  setProfitPerWeek]  = useState<string>(initial.profitPerWeek);
  // ── Control ──────────────────────────────────────────────────
  const [riskEnabled, setRiskEnabled] = useState<boolean>(initial.riskEnabled);
  const [killSwitch,  setKillSwitch]  = useState<boolean>(initial.killSwitch);
  const [breachAction, setBreachAction] = useState<'pause_copies' | 'stop_copies' | 'close_lock'>(
    initial.breachAction,
  );
  // ── Advanced ─────────────────────────────────────────────────
  const [maxContracts,    setMaxContracts]    = useState<string>(initial.maxContracts);
  const [maxPositionSize, setMaxPositionSize] = useState<string>(initial.maxPositionSize);
  const [advancedOpen,    setAdvancedOpen]    = useState(false);

  // ── Helpers ──────────────────────────────────────────────────
  const parseNum = (s: string): number | null => {
    const v = s.trim();
    if (!v) return null;
    const n = Number(v);
    if (Number.isNaN(n) || n < 0) return null;
    return n;
  };

  // ── Dirty detection (compare against initial prop values) ────
  const dirty =
    lossPerTrade    !== initial.lossPerTrade    ||
    lossPerDay      !== initial.lossPerDay      ||
    lossPerWeek     !== initial.lossPerWeek     ||
    profitPerTrade  !== initial.profitPerTrade  ||
    profitPerDay    !== initial.profitPerDay    ||
    profitPerWeek   !== initial.profitPerWeek   ||
    riskEnabled     !== initial.riskEnabled     ||
    killSwitch      !== initial.killSwitch      ||
    breachAction    !== initial.breachAction    ||
    maxContracts    !== initial.maxContracts    ||
    maxPositionSize !== initial.maxPositionSize;

  // ── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    const patch: PortfolioRiskPatch = {
      max_loss_per_trade_usd:   parseNum(lossPerTrade),
      max_daily_loss_usd:       parseNum(lossPerDay),
      max_weekly_loss_usd:      parseNum(lossPerWeek),
      trade_profit_target_usd:  parseNum(profitPerTrade),
      daily_profit_target_usd:  parseNum(profitPerDay),
      weekly_profit_target_usd: parseNum(profitPerWeek),
      risk_management_enabled:  riskEnabled,
      kill_switch_active:       killSwitch,
      risk_breach_action:       breachAction,
      max_contracts_per_trade:  parseNum(maxContracts),
      max_position_size:        parseNum(maxPositionSize),
    };
    try {
      await onSave(patch);
      toast.success(successMessage);
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Header badge for global mode: gold "ALL" pill
  const isLive = headerBadge === 'live';

  return (
    <div
      className={
        mode === 'global'
          ? // Emphasized gray glass panel — set apart from the per-account cards below
            'overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.05] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)]'
          : 'overflow-hidden rounded-[14px] border border-[rgba(201,166,70,0.22)] bg-[#0b0b0b] shadow-[0_0_24px_rgba(201,166,70,0.06)]'
      }
    >

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-ds-3 px-ds-4 py-ds-3">
        {/* Left: logo + account info */}
        <div className="flex min-w-0 items-center gap-ds-2">
          {/* Small round bull logo */}
          <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-gold-primary/70 bg-black">
            <img
              src="/BULL ONLY.png"
              alt="Finotaur"
              className="h-auto w-[46px] max-w-none translate-y-[1px] object-contain"
              draggable={false}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-ink-primary">
                {headerTitle}
              </span>
              {/* Badge: env label for account mode, gold "ALL" pill for global mode */}
              {mode === 'global' ? (
                <span className="rounded-sm border border-gold-primary/40 bg-gold-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-gold-primary">
                  ALL
                </span>
              ) : headerBadge != null ? (
                <span
                  className={`rounded-sm border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                    isLive
                      ? 'border-status-success/30 bg-status-success/10 text-status-success'
                      : 'border-border-ds-default bg-surface-base text-ink-tertiary'
                  }`}
                >
                  {headerBadge}
                </span>
              ) : null}
            </div>
            <div className="text-[11px] text-ink-tertiary">{headerSubtitle}</div>
          </div>
        </div>

        {/* Right: Active toggle + Lock button */}
        <div className="flex flex-shrink-0 items-center gap-ds-2">
          {/* Active pill toggle */}
          <label className="flex cursor-pointer items-center gap-1.5 select-none">
            <span className="text-[11px] font-medium text-ink-secondary">Active</span>
            <button
              type="button"
              role="switch"
              aria-checked={riskEnabled}
              onClick={() => setRiskEnabled((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors duration-base ${
                riskEnabled
                  ? 'border-gold-primary/60 bg-gold-primary/20'
                  : 'border-border-ds-subtle bg-surface-1'
              }`}
            >
              <span
                className={`absolute left-0.5 h-3.5 w-3.5 rounded-full transition-transform duration-base ${
                  riskEnabled
                    ? 'translate-x-4 bg-gold-primary'
                    : 'translate-x-0 bg-ink-tertiary'
                }`}
              />
            </button>
          </label>

          {/* Lock button — red outline when active */}
          <button
            type="button"
            onClick={() => setKillSwitch((v) => !v)}
            title={killSwitch ? 'Account locked — click to unlock' : 'Lock account'}
            className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors duration-base ${
              killSwitch
                ? 'border-status-danger/60 bg-status-danger/10 text-status-danger'
                : 'border-border-ds-subtle text-ink-secondary hover:border-border-ds-default hover:text-ink-primary'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── GRID: Loss / Profit per Trade / Day / Week ──────────── */}
      <div
        className={`px-ds-4 pb-ds-3 transition-opacity duration-base ${
          riskEnabled ? 'opacity-100' : 'pointer-events-none opacity-30'
        }`}
      >
        {/* Column headers */}
        <div className="mb-ds-2 grid grid-cols-[120px_1fr_1fr] gap-x-ds-2">
          <div /> {/* label column spacer */}
          <div className="flex items-center gap-1 text-[11px] font-semibold text-status-danger">
            <TrendingDown className="h-3.5 w-3.5" />
            Loss limit
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-status-success">
            <TrendingUp className="h-3.5 w-3.5" />
            Profit target
            <span className="font-normal text-ink-tertiary">· optional</span>
          </div>
        </div>

        {/* Rows */}
        {(
          [
            { label: 'Per trade', lossVal: lossPerTrade, setLoss: setLossPerTrade, profitVal: profitPerTrade, setProfit: setProfitPerTrade },
            { label: 'Per day',   lossVal: lossPerDay,   setLoss: setLossPerDay,   profitVal: profitPerDay,   setProfit: setProfitPerDay   },
            { label: 'Per week',  lossVal: lossPerWeek,  setLoss: setLossPerWeek,  profitVal: profitPerWeek,  setProfit: setProfitPerWeek  },
          ] as const
        ).map(({ label, lossVal, setLoss, profitVal, setProfit }) => (
          <div
            key={label}
            className="mb-ds-2 grid grid-cols-[120px_1fr_1fr] items-center gap-x-ds-2"
          >
            <span className="text-xs font-medium text-ink-secondary">{label}</span>

            {/* Loss input — red-tinted border */}
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-xs text-ink-tertiary">
                $
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="No limit"
                value={lossVal}
                onChange={(e) => setLoss(e.target.value)}
                className="h-8 w-full rounded-md border border-status-danger/25 bg-[#0f0b0b] pl-5 pr-2 text-xs text-ink-primary placeholder-ink-tertiary outline-none transition-colors focus:border-status-danger/50 focus:ring-0"
              />
            </div>

            {/* Profit input — neutral border */}
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-xs text-ink-tertiary">
                $
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="No limit"
                value={profitVal}
                onChange={(e) => setProfit(e.target.value)}
                className="h-8 w-full rounded-md border border-border-ds-subtle bg-[#0b0b0b] pl-5 pr-2 text-xs text-ink-primary placeholder-ink-tertiary outline-none transition-colors focus:border-border-ds-default focus:ring-0"
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-ds-3 border-t border-[rgba(201,166,70,0.10)] px-ds-4 py-ds-3">
        {/* On breach select */}
        <div className="flex items-center gap-ds-2">
          <span className="text-[11px] text-ink-tertiary">On breach:</span>
          <select
            value={breachAction}
            onChange={(e) =>
              setBreachAction(e.target.value as typeof breachAction)
            }
            className="h-7 rounded-md border border-border-ds-subtle bg-[#0f0f0f] px-ds-2 text-[11px] text-ink-primary outline-none transition-colors focus:border-gold-primary/40 focus:ring-0"
          >
            <option value="pause_copies">Pause new copies</option>
            <option value="stop_copies">Stop all copies</option>
            <option value="close_lock">Close trades &amp; lock account</option>
          </select>
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          // Per-account cards: gate on dirty (don't save an unchanged form).
          // Global "Apply to all accounts" is an explicit broadcast — it must
          // stay enabled even when nothing looks "dirty" (e.g. broadcasting
          // "No limit" to clear risk on every account).
          disabled={isSaving || (mode === 'account' && !dirty)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-gold-primary px-ds-3 text-xs font-semibold text-ink-on-gold shadow-[0_0_14px_rgba(201,166,70,0.20)] transition-colors duration-base hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? 'Saving...' : saveLabel}
        </button>
      </div>

      {/* ── ADVANCED (collapsible) ───────────────────────────────── */}
      <div className="border-t border-[rgba(255,255,255,0.05)]">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 px-ds-4 py-ds-2 text-[11px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary"
        >
          {advancedOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          Advanced
        </button>

        {advancedOpen && (
          <div className="grid grid-cols-1 gap-ds-3 px-ds-4 pb-ds-4 lg:grid-cols-2">
            <StepperPanel
              icon={<FileText className="h-5 w-5" />}
              title="Max contracts / trade"
              subtitle="Quantity cap per copy"
              value={maxContracts}
              onChange={setMaxContracts}
              step={1}
            />
            <StepperPanel
              icon={<Layers className="h-5 w-5" />}
              title="Max position size"
              subtitle="Total open contracts"
              value={maxPositionSize}
              onChange={setMaxPositionSize}
              step={1}
            />
          </div>
        )}
      </div>
    </div>
  );
});

// ── StepperPanel (reused in Advanced) ──────────────────────────────────────

const StepperPanel = memo(function StepperPanel({
  icon,
  title,
  subtitle,
  value,
  onChange,
  step,
  prefix = '',
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  value: string;
  onChange: (value: string) => void;
  step: number;
  prefix?: string;
}) {
  const numericValue = Number(value) || 0;
  const update = (next: number) => onChange(String(Math.max(0, next)));

  return (
    <section className="rounded-md border border-border-ds-subtle bg-[#080808] p-ds-3">
      <div className="flex items-start gap-ds-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md border border-border-ds-subtle bg-[#101010] text-gold-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-ink-primary">{title}</h3>
          <p className="mt-1 text-xs text-ink-secondary">{subtitle}</p>
          <div className="mt-ds-3 grid h-9 grid-cols-[48px_1fr_48px] overflow-hidden rounded-md border border-border-ds-subtle bg-[#101010]">
            <button
              type="button"
              onClick={() => update(numericValue - step)}
              className="flex items-center justify-center border-r border-border-ds-subtle text-gold-primary transition-colors hover:bg-gold-primary/10"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={`${prefix}${value}`}
              onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
              className="min-w-0 bg-transparent px-ds-2 text-center text-sm text-ink-primary outline-none"
            />
            <button
              type="button"
              onClick={() => update(numericValue + step)}
              className="flex items-center justify-center border-l border-border-ds-subtle text-gold-primary transition-colors hover:bg-gold-primary/10"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});
