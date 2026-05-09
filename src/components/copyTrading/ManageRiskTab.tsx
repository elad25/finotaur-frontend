// src/components/copyTrading/ManageRiskTab.tsx
// ═══════════════════════════════════════════════════════════════
// Manage Risk tab — per-portfolio risk limits in a compact 2-line
// luxury layout. Row 1: identity + actions. Row 2: 5 inputs grouped
// as Daily | Per-trade. All hints surface as tooltips on hover.
// ═══════════════════════════════════════════════════════════════

import { useState, memo } from 'react';
import { Shield, AlertOctagon, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePortfolios, type Portfolio } from '@/hooks/usePortfolios';
import { toast } from 'sonner';

// ─── Portfolio risk patch shape ───────────────────────────────

interface PortfolioRiskPatch {
  kill_switch_active:      boolean;
  max_daily_loss_usd:      number | null;
  max_position_size:       number | null;
  max_contracts_per_trade: number | null;
  max_loss_per_trade_usd:  number | null;
  daily_stop_loss_usd:     number | null;
}

// ─── Portfolio risk mutation ───────────────────────────────────

function usePortfolioRisk() {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: { id: string; patch: PortfolioRiskPatch }) => {
      const { data, error } = await supabase
        .from('portfolios')
        .update(input.patch)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  });

  return {
    updatePortfolioRisk: mutation.mutateAsync,
    isUpdating:          mutation.isPending,
  };
}

// ─── Main tab component ───────────────────────────────────────

export const ManageRiskTab = memo(function ManageRiskTab() {
  const { portfolios, isLoading } = usePortfolios();
  const { updatePortfolioRisk, isUpdating } = usePortfolioRisk();

  const tradovatePortfolios = portfolios.filter(
    (p) => p.source === 'tradovate' && p.is_active,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-ds-8">
        <p className="text-sm text-ink-secondary">Loading accounts…</p>
      </div>
    );
  }

  if (tradovatePortfolios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-ds-8 gap-ds-3">
        <div className="w-12 h-12 rounded-[12px] bg-gold-primary/10 border border-gold-border flex items-center justify-center">
          <Shield className="w-6 h-6 text-gold-primary" />
        </div>
        <h3 className="text-base font-semibold text-ink-primary">No connected accounts</h3>
        <p className="text-sm text-ink-secondary text-center max-w-md">
          Connect a broker to manage risk limits per account.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-ds-2">
      {tradovatePortfolios.map((p) => (
        <PortfolioRiskCard
          key={p.id}
          portfolio={p}
          onSave={(patch) => updatePortfolioRisk({ id: p.id, patch })}
          isSaving={isUpdating}
        />
      ))}
    </div>
  );
});

// ─── Per-portfolio card ───────────────────────────────────────

interface PortfolioRiskCardProps {
  portfolio: Portfolio;
  onSave:    (patch: PortfolioRiskPatch) => Promise<unknown>;
  isSaving:  boolean;
}

const PortfolioRiskCard = memo(function PortfolioRiskCard({
  portfolio,
  onSave,
  isSaving,
}: PortfolioRiskCardProps) {
  const [maxContractsPerTrade, setMaxContractsPerTrade] = useState<string>(
    portfolio.max_contracts_per_trade?.toString() ?? '',
  );
  const [maxDailyLossUsd, setMaxDailyLossUsd] = useState<string>(
    portfolio.max_daily_loss_usd?.toString() ?? '',
  );
  const [maxPositionSize, setMaxPositionSize] = useState<string>(
    portfolio.max_position_size?.toString() ?? '',
  );
  const [killSwitch, setKillSwitch] = useState<boolean>(
    portfolio.kill_switch_active ?? false,
  );
  const [maxLossPerTradeUsd, setMaxLossPerTradeUsd] = useState<string>(
    portfolio.max_loss_per_trade_usd?.toString() ?? '',
  );
  const [dailyStopLossUsd, setDailyStopLossUsd] = useState<string>(
    portfolio.daily_stop_loss_usd?.toString() ?? '',
  );

  const dirty =
    (maxContractsPerTrade || null) !== (portfolio.max_contracts_per_trade?.toString() ?? null) ||
    (maxDailyLossUsd      || null) !== (portfolio.max_daily_loss_usd?.toString()      ?? null) ||
    (maxPositionSize      || null) !== (portfolio.max_position_size?.toString()        ?? null) ||
    (maxLossPerTradeUsd   || null) !== (portfolio.max_loss_per_trade_usd?.toString()  ?? null) ||
    (dailyStopLossUsd     || null) !== (portfolio.daily_stop_loss_usd?.toString()     ?? null) ||
    killSwitch !== (portfolio.kill_switch_active ?? false);

  const handleSave = async () => {
    const parseNum = (s: string): number | null => {
      const v = s.trim();
      if (!v) return null;
      const n = Number(v);
      if (Number.isNaN(n) || n < 0) return null;
      return n;
    };
    const patch: PortfolioRiskPatch = {
      kill_switch_active:      killSwitch,
      max_daily_loss_usd:      parseNum(maxDailyLossUsd),
      max_position_size:       parseNum(maxPositionSize),
      max_contracts_per_trade: parseNum(maxContractsPerTrade),
      max_loss_per_trade_usd:  parseNum(maxLossPerTradeUsd),
      daily_stop_loss_usd:     parseNum(dailyStopLossUsd),
    };
    try {
      await onSave(patch);
      toast.success('Risk limits saved');
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const accountTitle =
    portfolio.tradovate_account_spec ??
    portfolio.name ??
    portfolio.id.slice(0, 8);
  const envLabel = portfolio.environment ?? 'unknown';
  const isLive = envLabel === 'live';

  // Card border: subtle by default, red when kill is on, gold when dirty
  const borderClass = killSwitch
    ? 'border-num-negative/40'
    : dirty
      ? 'border-gold-border'
      : 'border-border-ds-subtle';

  return (
    <div
      className={`rounded-[12px] bg-surface-1 border ${borderClass} px-ds-4 py-ds-3 transition-colors duration-base`}
    >
      {/* ── Row 1: identity + actions ── */}
      <div className="flex items-center justify-between gap-ds-4">
        {/* Left: gold dot + account label + env badge + connection label */}
        <div className="flex items-center gap-ds-3 min-w-0">
          {/* Gold accent dot — luxury detail, denser than a full avatar */}
          <span
            className={`flex-shrink-0 w-1.5 h-6 rounded-sm ${
              isLive ? 'bg-gradient-gold shadow-[0_0_8px_rgba(201,166,70,0.4)]' : 'bg-ink-secondary/30'
            }`}
            aria-hidden
          />

          <span className="text-sm font-mono tabular-nums font-medium text-ink-primary truncate">
            {accountTitle}
          </span>

          <span
            className={`flex-shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${
              isLive
                ? 'bg-gold-primary/10 border-gold-border text-gold-primary'
                : 'bg-surface-base border-border-ds-default text-ink-tertiary'
            }`}
          >
            {envLabel}
          </span>

          {portfolio.connection_label && (
            <span className="text-xs text-ink-tertiary truncate">
              · {portfolio.connection_label}
            </span>
          )}
        </div>

        {/* Right: kill switch + save */}
        <div className="flex items-center gap-ds-2 flex-shrink-0">
          <button
            onClick={() => setKillSwitch((v) => !v)}
            title={killSwitch ? 'Kill switch is ON — copies blocked' : 'Activate kill switch to block all copies'}
            className={`flex items-center gap-1.5 px-ds-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-base ${
              killSwitch
                ? 'bg-num-negative/15 border-num-negative/50 text-num-negative shadow-[0_0_12px_rgba(226,75,74,0.25)]'
                : 'bg-surface-base border-border-ds-default text-ink-secondary hover:border-num-negative/40 hover:text-num-negative'
            }`}
            aria-label="Toggle kill switch"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>{killSwitch ? 'Kill ON' : 'Kill switch'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={!dirty || isSaving}
            title={dirty ? 'Save risk limit changes' : 'No changes to save'}
            className={`inline-flex items-center gap-1.5 rounded-md px-ds-3 py-1.5 text-xs font-medium transition-all duration-base disabled:opacity-30 disabled:cursor-not-allowed ${
              dirty
                ? 'border border-gold-border text-gold-primary hover:bg-gold-primary/10 hover:border-gold-primary'
                : 'border border-border-ds-subtle text-ink-tertiary'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Row 2: 5 inputs in a single horizontal cluster ── */}
      <div className="flex items-center gap-ds-2 mt-ds-3 flex-wrap">
        <GroupLabel>Daily</GroupLabel>
        <RiskInput
          label="Soft"
          prefix="$"
          tooltip="Max daily loss (soft) — pauses new copies when realized loss hits"
          value={maxDailyLossUsd}
          onChange={setMaxDailyLossUsd}
        />
        <RiskInput
          label="Hard"
          prefix="$"
          tooltip="Daily stop loss (hard) — auto-flattens when total daily loss hits"
          value={dailyStopLossUsd}
          onChange={setDailyStopLossUsd}
        />

        <Divider />

        <GroupLabel>Per-trade</GroupLabel>
        <RiskInput
          label="Loss"
          prefix="$"
          tooltip="Max loss per trade (hard) — auto-flattens when open loss hits"
          value={maxLossPerTradeUsd}
          onChange={setMaxLossPerTradeUsd}
        />
        <RiskInput
          label="Cont"
          tooltip="Max contracts per trade — quantity cap per copy"
          value={maxContractsPerTrade}
          onChange={setMaxContractsPerTrade}
        />
        <RiskInput
          label="Pos"
          tooltip="Max position size — total open contracts"
          value={maxPositionSize}
          onChange={setMaxPositionSize}
        />
      </div>
    </div>
  );
});

// ─── Sub-components ───────────────────────────────────────────

const GroupLabel = memo(function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[1.5px] text-gold-muted font-medium flex-shrink-0">
      {children}
    </span>
  );
});

const Divider = memo(function Divider() {
  return <span className="h-5 w-px bg-border-ds-subtle mx-ds-1 flex-shrink-0" aria-hidden />;
});

interface RiskInputProps {
  label:    string;
  prefix?:  string;
  tooltip:  string;
  value:    string;
  onChange: (v: string) => void;
}

const RiskInput = memo(function RiskInput({
  label,
  prefix,
  tooltip,
  value,
  onChange,
}: RiskInputProps) {
  return (
    <label
      title={tooltip}
      className="group flex items-center gap-1.5 pl-ds-2 pr-1 py-1 rounded-md bg-surface-base border border-border-ds-subtle hover:border-border-ds-default focus-within:border-gold-border focus-within:shadow-[0_0_0_3px_rgba(201,166,70,0.08)] transition-all duration-base cursor-text"
    >
      <span className="text-[10px] uppercase tracking-wider text-ink-tertiary font-medium select-none">
        {label}
      </span>
      {prefix && (
        <span className="text-xs font-mono text-ink-tertiary select-none">{prefix}</span>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="—"
        className="w-16 bg-transparent text-sm font-mono tabular-nums text-ink-primary placeholder:text-ink-tertiary outline-none"
      />
    </label>
  );
});
