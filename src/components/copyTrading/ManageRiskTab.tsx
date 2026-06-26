// src/components/copyTrading/ManageRiskTab.tsx
// Manage Risk tab - per-portfolio risk limits.

import { memo, useState } from 'react';
import { ChevronUp, Info, Save, Shield } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePortfolios, type Portfolio } from '@/hooks/usePortfolios';
import { toast } from 'sonner';

interface PortfolioRiskPatch {
  kill_switch_active: boolean;
  max_daily_loss_usd: number | null;
  max_position_size: number | null;
  max_contracts_per_trade: number | null;
  max_loss_per_trade_usd: number | null;
  daily_stop_loss_usd: number | null;
}

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
    isUpdating: mutation.isPending,
  };
}

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
  const [maxContractsPerTrade, setMaxContractsPerTrade] = useState<string>(
    portfolio.max_contracts_per_trade?.toString() ?? '10',
  );
  const [maxDailyLossUsd, setMaxDailyLossUsd] = useState<string>(
    portfolio.max_daily_loss_usd?.toString() ?? '1000',
  );
  const [maxPositionSize, setMaxPositionSize] = useState<string>(
    portfolio.max_position_size?.toString() ?? '50',
  );
  const [maxLossPerTradeUsd, setMaxLossPerTradeUsd] = useState<string>(
    portfolio.max_loss_per_trade_usd?.toString() ?? '500',
  );
  const [dailyStopLossUsd, setDailyStopLossUsd] = useState<string>(
    portfolio.daily_stop_loss_usd?.toString() ?? '1000',
  );
  const dirty =
    (maxContractsPerTrade || null) !==
      (portfolio.max_contracts_per_trade?.toString() ?? null) ||
    (maxDailyLossUsd || null) !== (portfolio.max_daily_loss_usd?.toString() ?? null) ||
    (maxPositionSize || null) !== (portfolio.max_position_size?.toString() ?? null) ||
    (maxLossPerTradeUsd || null) !==
      (portfolio.max_loss_per_trade_usd?.toString() ?? null) ||
    (dailyStopLossUsd || null) !== (portfolio.daily_stop_loss_usd?.toString() ?? null);

  const parseNum = (s: string): number | null => {
    const v = s.trim();
    if (!v) return null;
    const n = Number(v);
    if (Number.isNaN(n) || n < 0) return null;
    return n;
  };

  const handleSave = async () => {
    const patch: PortfolioRiskPatch = {
      kill_switch_active: portfolio.kill_switch_active ?? false,
      max_daily_loss_usd: parseNum(maxDailyLossUsd),
      max_position_size: parseNum(maxPositionSize),
      max_contracts_per_trade: parseNum(maxContractsPerTrade),
      max_loss_per_trade_usd: parseNum(maxLossPerTradeUsd),
      daily_stop_loss_usd: parseNum(dailyStopLossUsd),
    };

    try {
      await onSave(patch);
      toast.success('Risk limits saved');
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const accountTitle =
    portfolio.tradovate_account_spec ?? portfolio.name ?? portfolio.id.slice(0, 8);
  const envLabel = portfolio.environment ?? 'unknown';

  return (
    <div className="overflow-hidden rounded-lg border border-gold-border/60 bg-[#050505] p-ds-4 shadow-[0_0_32px_rgba(201,166,70,0.08)]">
      <div className="mb-ds-4 flex items-start justify-between gap-ds-3">
        <div className="flex min-w-0 items-center gap-ds-3">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-gold-primary/80 bg-black shadow-[inset_0_0_18px_rgba(201,166,70,0.10)]">
            <img
              src="/BULL ONLY.png"
              alt="Finotaur"
              className="h-auto w-[96px] max-w-none translate-y-[2px] object-contain"
              draggable={false}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-ds-2">
              <span className="truncate text-base font-semibold text-ink-primary">
                {accountTitle}
              </span>
              <span
                className={`rounded-sm border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                  envLabel === 'live'
                    ? 'border-status-success/30 bg-status-success/10 text-status-success'
                    : 'border-border-ds-default bg-surface-base text-ink-tertiary'
                }`}
              >
                {envLabel}
              </span>
            </div>
            {portfolio.connection_label && (
              <div className="mt-0.5 text-xs text-ink-secondary">
                {portfolio.connection_label}
              </div>
            )}
          </div>
        </div>

        <ChevronUp className="h-5 w-5 text-ink-secondary" />
      </div>

      <div className="mb-ds-3 grid grid-cols-1 gap-ds-3 lg:grid-cols-2">
        <CompactLimitPanel
          index="1"
          title="Daily Loss Limit"
          subtitle="Max total loss allowed per day (resets at midnight)"
          fields={[
            {
              label: 'Pause new copies at',
              value: maxDailyLossUsd,
              onChange: setMaxDailyLossUsd,
            },
            {
              label: 'Stop all copies at',
              value: dailyStopLossUsd,
              onChange: setDailyStopLossUsd,
            },
          ]}
        />

        <CompactLimitPanel
          index="2"
          title="Per-Trade Loss Limit"
          subtitle="Max loss allowed per copied trade"
          fields={[
            {
              label: 'Stop copy at',
              value: maxLossPerTradeUsd,
              onChange: setMaxLossPerTradeUsd,
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-ds-2 sm:grid-cols-3">
        <StepperPanel
          title="Max contracts / trade"
          subtitle="Quantity cap per copy"
          value={maxContractsPerTrade}
          onChange={setMaxContractsPerTrade}
        />
        <StepperPanel
          title="Max position size"
          subtitle="Total open contracts"
          value={maxPositionSize}
          onChange={setMaxPositionSize}
        />
        <StepperPanel
          title="Max loss per trade"
          subtitle="Auto-flattens on loss"
          value={maxLossPerTradeUsd}
          onChange={setMaxLossPerTradeUsd}
          prefix="$"
        />
      </div>

      <div className="mt-ds-3 flex justify-end">
        <button
          onClick={handleSave}
          disabled={!dirty || isSaving}
          className="inline-flex h-10 items-center gap-ds-2 rounded-md bg-gold-primary px-ds-4 text-xs font-semibold text-ink-on-gold shadow-[0_0_18px_rgba(201,166,70,0.22)] transition-colors duration-base hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  );
});

interface LimitField {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const CompactLimitPanel = memo(function CompactLimitPanel({
  index,
  title,
  subtitle,
  fields,
}: {
  index: string;
  title: string;
  subtitle: string;
  fields: LimitField[];
}) {
  return (
    <section className="rounded-md border border-border-ds-subtle bg-[#080808] p-ds-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mb-ds-3 flex items-start gap-ds-2">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-gold-border bg-gold-primary/10 text-xs font-semibold text-gold-primary">
          {index}
        </span>
        <div>
          <div className="flex items-center gap-ds-1">
            <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
            <Info className="h-3.5 w-3.5 text-ink-tertiary" />
          </div>
          <p className="mt-1 text-[11px] text-ink-tertiary">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-ds-2">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex items-center justify-between gap-ds-3 rounded-md border border-border-ds-subtle bg-[#0b0b0b] px-ds-3 py-ds-2"
          >
            <span className="text-xs font-medium text-ink-secondary">{field.label}</span>
            <div className="flex items-center rounded-md border border-border-ds-subtle bg-[#101010] px-ds-2">
              <span className="text-sm font-semibold text-ink-tertiary">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value.replace(/[^0-9.]/g, ''))}
                className="h-8 w-16 bg-transparent px-1 text-center text-sm font-semibold text-gold-primary outline-none"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

const StepperPanel = memo(function StepperPanel({
  title,
  subtitle,
  value,
  onChange,
  prefix = '',
}: {
  title: string;
  subtitle: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
}) {
  return (
    <section className="flex items-center justify-between gap-ds-3 rounded-md border border-border-ds-subtle bg-[#080808] px-ds-3 py-ds-2">
      <div className="min-w-0">
        <div className="flex items-center gap-ds-1">
          <h3 className="truncate text-sm font-semibold text-ink-primary">{title}</h3>
          <Info className="h-3.5 w-3.5 flex-shrink-0 text-ink-tertiary" />
        </div>
        <p className="mt-0.5 text-[11px] text-ink-tertiary">{subtitle}</p>
      </div>
      <input
        type="text"
        inputMode="numeric"
        value={`${prefix}${value}`}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        className="h-9 w-20 flex-shrink-0 rounded-md border border-border-ds-subtle bg-[#101010] px-ds-2 text-center text-sm text-ink-primary outline-none focus:border-gold-border"
      />
    </section>
  );
});
