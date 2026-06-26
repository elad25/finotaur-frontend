// src/components/copyTrading/ManageRiskTab.tsx
// Manage Risk tab - per-portfolio risk limits.

import { memo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  AlertOctagon,
  ChevronUp,
  FileText,
  Info,
  Layers,
  Minus,
  Plus,
  Save,
  Shield,
} from 'lucide-react';
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
  const [dailyMode, setDailyMode] = useState<'soft' | 'hard'>(
    portfolio.daily_stop_loss_usd ? 'hard' : 'soft',
  );
  const [tradeMode, setTradeMode] = useState<'soft' | 'hard'>('soft');

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

  const formatMoney = (value: string) => {
    const parsed = parseNum(value);
    if (parsed == null) return '$0';
    return `$${parsed.toLocaleString('en-US')}`;
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
  const dailyValue = dailyMode === 'hard' ? dailyStopLossUsd : maxDailyLossUsd;
  const setDailyValue = dailyMode === 'hard' ? setDailyStopLossUsd : setMaxDailyLossUsd;

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
        <RiskSliderPanel
          index="1"
          title="Daily Loss Limit"
          subtitle="Max total loss allowed per day (resets at midnight)"
          mode={dailyMode}
          onModeChange={setDailyMode}
          value={dailyValue}
          onValueChange={setDailyValue}
          valueLabel={dailyMode === 'hard' ? 'Daily stop loss (Hard)' : 'Max daily loss (Soft)'}
          min={100}
          max={10000}
          step={50}
          ticks={['$100', '$250', '$500', '$1,000', '$2,500', '$5,000', '$10,000']}
          tickValues={[100, 250, 500, 1000, 2500, 5000, 10000]}
          displayValue={formatMoney(dailyValue)}
        />

        <RiskSliderPanel
          index="2"
          title="Per-Trade Loss Limit"
          subtitle="Max loss allowed per copied trade"
          mode={tradeMode}
          onModeChange={setTradeMode}
          value={maxLossPerTradeUsd}
          onValueChange={setMaxLossPerTradeUsd}
          valueLabel="Max loss per trade (Hard)"
          min={20}
          max={2000}
          step={20}
          ticks={['$20', '$50', '$100', '$200', '$500', '$1,000', '$2,000']}
          tickValues={[20, 50, 100, 200, 500, 1000, 2000]}
          displayValue={formatMoney(maxLossPerTradeUsd)}
        />
      </div>

      <div className="grid grid-cols-1 gap-ds-3 lg:grid-cols-3">
        <StepperPanel
          icon={<FileText className="h-5 w-5" />}
          title="Max contracts / trade"
          subtitle="Quantity cap per copy"
          value={maxContractsPerTrade}
          onChange={setMaxContractsPerTrade}
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
        <StepperPanel
          icon={<Shield className="h-5 w-5" />}
          title="Max loss per trade"
          subtitle="Auto-flattens on loss"
          value={maxLossPerTradeUsd}
          onChange={setMaxLossPerTradeUsd}
          step={50}
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

const RiskSliderPanel = memo(function RiskSliderPanel({
  index,
  title,
  subtitle,
  mode,
  onModeChange,
  value,
  onValueChange,
  valueLabel,
  min,
  max,
  step,
  ticks,
  tickValues,
  displayValue,
}: {
  index: string;
  title: string;
  subtitle: string;
  mode: 'soft' | 'hard';
  onModeChange: (mode: 'soft' | 'hard') => void;
  value: string;
  onValueChange: (value: string) => void;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  ticks: string[];
  tickValues: number[];
  displayValue: string;
}) {
  const numericValue = Number(value) || min;
  const clampedValue = Math.min(max, Math.max(min, numericValue));
  const valueToPercent = (currentValue: number) => {
    const lastIndex = tickValues.length - 1;
    if (currentValue <= tickValues[0]) return 0;
    if (currentValue >= tickValues[lastIndex]) return 100;

    const segmentIndex = tickValues.findIndex(
      (tick, index) => index < lastIndex && currentValue >= tick && currentValue <= tickValues[index + 1],
    );
    const safeIndex = Math.max(0, segmentIndex);
    const start = tickValues[safeIndex];
    const end = tickValues[safeIndex + 1];
    const segmentProgress = (currentValue - start) / (end - start);

    return ((safeIndex + segmentProgress) / lastIndex) * 100;
  };
  const percentToValue = (percent: number) => {
    const lastIndex = tickValues.length - 1;
    const scaled = (Math.min(100, Math.max(0, percent)) / 100) * lastIndex;
    const startIndex = Math.min(lastIndex - 1, Math.floor(scaled));
    const segmentProgress = scaled - startIndex;
    const rawValue =
      tickValues[startIndex] +
      (tickValues[startIndex + 1] - tickValues[startIndex]) * segmentProgress;

    return Math.round(rawValue / step) * step;
  };
  const sliderPercent = valueToPercent(clampedValue);

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

      <div className="mb-ds-4 grid grid-cols-2 overflow-hidden rounded-md border border-border-ds-subtle bg-[#0b0b0b]">
        <ModeButton mode="soft" activeMode={mode} onClick={() => onModeChange('soft')} />
        <ModeButton mode="hard" activeMode={mode} onClick={() => onModeChange('hard')} />
      </div>

      <div className="mb-ds-2 text-xs font-medium text-ink-primary">{valueLabel}</div>
      <div className="mb-ds-2 text-center text-xl font-semibold text-gold-primary">
        {displayValue}
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={sliderPercent}
        onChange={(e) => onValueChange(String(percentToValue(Number(e.target.value))))}
        className="risk-range h-2 w-full"
        style={{ '--risk-fill': `${sliderPercent}%` } as CSSProperties}
      />
      <div className="mt-ds-2 grid grid-cols-7 text-center text-[11px] font-medium text-ink-tertiary">
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </section>
  );
});

const ModeButton = memo(function ModeButton({
  mode,
  activeMode,
  onClick,
}: {
  mode: 'soft' | 'hard';
  activeMode: 'soft' | 'hard';
  onClick: () => void;
}) {
  const active = mode === activeMode;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 flex-col items-center justify-center gap-0.5 border transition-colors duration-base ${
        active
          ? 'border-gold-border bg-gold-primary/10 text-gold-primary'
          : 'border-transparent text-ink-secondary hover:bg-surface-2 hover:text-ink-primary'
      }`}
    >
      <div className="flex items-center gap-ds-1 text-xs font-semibold">
        <Shield className="h-3.5 w-3.5" />
        <span>{mode === 'soft' ? 'Soft' : 'Hard'}</span>
      </div>
      <span className="text-[11px] text-current opacity-80">
        {mode === 'soft' ? 'Pause new copies' : 'Stop all copies'}
      </span>
    </button>
  );
});

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
          <div className="flex items-center gap-ds-1">
            <h3 className="truncate text-sm font-semibold text-ink-primary">{title}</h3>
            <Info className="h-3.5 w-3.5 flex-shrink-0 text-ink-tertiary" />
          </div>
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
