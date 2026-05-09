// src/components/copyTrading/ManageRiskTab.tsx
// ═══════════════════════════════════════════════════════════════
// Manage Risk tab — per-portfolio risk limits (kill switch, max
// contracts, max daily loss, max position size) with dirty-state
// save button. Works for ALL accounts, including a lone leader.
// ═══════════════════════════════════════════════════════════════

import { useState, memo } from 'react';
import { Shield, Save, AlertOctagon } from 'lucide-react';
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
        <div className="w-12 h-12 rounded-lg bg-gold-primary/10 border border-gold-border flex items-center justify-center">
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
    <div className="space-y-ds-3">
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

  const dirty =
    (maxContractsPerTrade || null) !== (portfolio.max_contracts_per_trade?.toString() ?? null) ||
    (maxDailyLossUsd      || null) !== (portfolio.max_daily_loss_usd?.toString()      ?? null) ||
    (maxPositionSize      || null) !== (portfolio.max_position_size?.toString()        ?? null) ||
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
    };
    try {
      await onSave(patch);
      toast.success('Risk limits saved');
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Title: account name + environment badge
  const accountTitle =
    portfolio.tradovate_account_spec ??
    portfolio.name ??
    portfolio.id.slice(0, 8);
  const envLabel = portfolio.environment ?? 'unknown';

  return (
    <div
      className={`rounded-lg bg-surface-1 border p-ds-4 ${
        killSwitch ? 'border-num-negative/40' : 'border-border-ds-subtle'
      }`}
    >
      {/* ── Card header: account label + kill switch ── */}
      <div className="flex items-center justify-between mb-ds-3 gap-ds-3">
        <div className="min-w-0">
          <div className="flex items-center gap-ds-2">
            <span className="text-sm font-semibold text-ink-primary truncate">
              {accountTitle}
            </span>
            <span
              className={`text-[9px] uppercase px-1.5 py-0.5 rounded-sm border ${
                envLabel === 'live'
                  ? 'bg-status-success/10 border-status-success/30 text-status-success'
                  : 'bg-surface-base border-border-ds-default text-ink-tertiary'
              }`}
            >
              {envLabel}
            </span>
          </div>
          {portfolio.connection_label && (
            <div className="text-[11px] text-ink-secondary mt-0.5">
              {portfolio.connection_label}
            </div>
          )}
        </div>

        <button
          onClick={() => setKillSwitch((v) => !v)}
          className={`flex items-center gap-1.5 px-ds-3 py-1.5 rounded-md border transition-colors duration-base ${
            killSwitch
              ? 'bg-num-negative/10 border-num-negative/40 text-num-negative'
              : 'bg-surface-base border-border-ds-default text-ink-secondary hover:text-ink-primary'
          }`}
          aria-label="Toggle kill switch"
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">
            {killSwitch ? 'Kill switch ON' : 'Kill switch'}
          </span>
        </button>
      </div>

      {/* ── Risk fields ── */}
      <div className="grid grid-cols-3 gap-ds-3 mb-ds-3">
        <NumericField
          label="Max contracts/trade"
          hint="Per-trade hard cap"
          value={maxContractsPerTrade}
          onChange={setMaxContractsPerTrade}
        />
        <NumericField
          label="Max daily loss ($)"
          hint="Pauses copies if hit"
          value={maxDailyLossUsd}
          onChange={setMaxDailyLossUsd}
        />
        <NumericField
          label="Max position size"
          hint="Total open contracts"
          value={maxPositionSize}
          onChange={setMaxPositionSize}
        />
      </div>

      {/* ── Save button ── */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!dirty || isSaving}
          className="inline-flex items-center gap-1.5 rounded-md bg-gold-primary hover:bg-[var(--gold-hover)] text-ink-on-gold px-ds-3 py-1.5 text-xs font-medium transition-colors duration-base disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
});

// ─── Numeric input field ──────────────────────────────────────

const NumericField = memo(function NumericField({
  label,
  hint,
  value,
  onChange,
}: {
  label:    string;
  hint:     string;
  value:    string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-ink-secondary mb-1">
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="—"
        className="w-full px-ds-3 py-ds-2 rounded-md bg-surface-base border border-border-ds-subtle text-sm font-mono tabular-nums text-ink-primary placeholder:text-ink-tertiary focus:border-gold-border outline-none transition-colors duration-base"
      />
      <div className="text-[10px] text-ink-tertiary mt-1">{hint}</div>
    </div>
  );
});
