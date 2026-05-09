// src/components/copyTrading/ManageRiskTab.tsx
// ═══════════════════════════════════════════════════════════════
// Manage Risk tab — per-rule risk limits (kill switch, max contracts,
// max daily loss, max position size) with dirty-state save button.
// ═══════════════════════════════════════════════════════════════

import { useState, memo } from 'react';
import { Shield, Save, AlertOctagon } from 'lucide-react';
import { useCopyRules, type CopyRule } from '@/hooks/useCopyRules';
import { usePortfolios } from '@/hooks/usePortfolios';
import { toast } from 'sonner';

// ─── Main tab component ───────────────────────────────────────

export const ManageRiskTab = memo(function ManageRiskTab() {
  const { rules, isLoading, updateRule, isUpdating } = useCopyRules();
  const { portfolios } = usePortfolios();

  const portfolioName = (id: string): string => {
    const p = portfolios.find(x => x.id === id);
    return p?.account_name ?? p?.tradovate_account_spec ?? id.slice(0, 8);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-ds-8">
        <p className="text-sm text-ink-secondary">Loading rules…</p>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-ds-8 gap-ds-3">
        <div className="w-12 h-12 rounded-lg bg-gold-primary/10 border border-gold-border flex items-center justify-center">
          <Shield className="w-6 h-6 text-gold-primary" />
        </div>
        <h3 className="text-base font-semibold text-ink-primary">No copy rules yet</h3>
        <p className="text-sm text-ink-secondary text-center max-w-md">
          Set up at least one source→target copy rule in the Copy Trading tab, then come back here to configure risk limits.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-ds-3">
      {rules.map(rule => (
        <RiskCard
          key={rule.id}
          rule={rule}
          sourceName={portfolioName(rule.source_portfolio_id)}
          targetName={portfolioName(rule.target_portfolio_id)}
          onSave={(patch) => updateRule({ id: rule.id, patch })}
          isSaving={isUpdating}
        />
      ))}
    </div>
  );
});

// ─── Per-rule card ────────────────────────────────────────────

interface RiskCardProps {
  rule:       CopyRule;
  sourceName: string;
  targetName: string;
  onSave:     (patch: Partial<CopyRule>) => Promise<CopyRule>;
  isSaving:   boolean;
}

const RiskCard = memo(function RiskCard({
  rule,
  sourceName,
  targetName,
  onSave,
  isSaving,
}: RiskCardProps) {
  const [maxContracts,    setMaxContracts]    = useState<string>(rule.max_contracts?.toString()      ?? '');
  const [maxDailyLossUsd, setMaxDailyLossUsd] = useState<string>(rule.max_daily_loss_usd?.toString() ?? '');
  const [maxPositionSize, setMaxPositionSize] = useState<string>(rule.max_position_size?.toString()  ?? '');
  const [killSwitch,      setKillSwitch]      = useState<boolean>(rule.kill_switch_active);

  const dirty =
    (maxContracts    || null) !== (rule.max_contracts?.toString()      ?? null) ||
    (maxDailyLossUsd || null) !== (rule.max_daily_loss_usd?.toString() ?? null) ||
    (maxPositionSize || null) !== (rule.max_position_size?.toString()  ?? null) ||
    killSwitch !== rule.kill_switch_active;

  const handleSave = async () => {
    const parseNum = (s: string): number | null => {
      const v = s.trim();
      if (!v) return null;
      const n = Number(v);
      if (Number.isNaN(n) || n < 0) return null;
      return n;
    };
    const patch: Partial<CopyRule> = {
      max_contracts:      parseNum(maxContracts),
      max_daily_loss_usd: parseNum(maxDailyLossUsd),
      max_position_size:  parseNum(maxPositionSize),
      kill_switch_active: killSwitch,
    };
    try {
      await onSave(patch);
      toast.success('Risk limits saved');
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className={`rounded-lg bg-surface-1 border p-ds-4 ${killSwitch ? 'border-num-negative/40' : 'border-border-ds-subtle'}`}>

      {/* ── Card header: rule label + kill switch ── */}
      <div className="flex items-center justify-between mb-ds-3 gap-ds-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink-primary truncate">
            {sourceName} → {targetName}
          </div>
          <div className="text-[11px] text-ink-secondary mt-0.5">
            Ratio {rule.ratio}× · {rule.is_active ? 'Active' : 'Paused'}
          </div>
        </div>

        <button
          onClick={() => setKillSwitch(v => !v)}
          className={`flex items-center gap-1.5 px-ds-3 py-1.5 rounded-md border transition-colors duration-base ${
            killSwitch
              ? 'bg-num-negative/10 border-num-negative/40 text-num-negative'
              : 'bg-surface-base border-border-ds-default text-ink-secondary hover:text-ink-primary'
          }`}
          aria-label="Toggle kill switch"
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{killSwitch ? 'Kill switch ON' : 'Kill switch'}</span>
        </button>
      </div>

      {/* ── Risk fields ── */}
      <div className="grid grid-cols-3 gap-ds-3 mb-ds-3">
        <NumericField
          label="Max contracts/trade"
          hint="Per-trade hard cap"
          value={maxContracts}
          onChange={setMaxContracts}
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
