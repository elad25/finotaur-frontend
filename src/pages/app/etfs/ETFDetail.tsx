// src/pages/app/etfs/ETFDetail.tsx
// =====================================================
// ETF ANALYZER — Detail Page
// =====================================================
// Route: /app/etfs/:symbol
// Mirrors StockAnalyzer.tsx: useParams, loadETF on
// mount/change, hero, TabNav, tab components.
// =====================================================

import { useEffect, memo, type ElementType } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, BarChart3, TrendingUp, ShieldAlert,
  DollarSign, Layers, Sparkles, Lock, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useETFAnalyzer } from '@/hooks/useETFAnalyzer';
import { useMarketStatus } from '@/lib/marketStatus';
import type { EtfTabId, EtfData } from '@/types/etf.types';
import { FinoScoreBadge } from '@/components/etf/FinoScoreBadge';
import { OverviewTab }    from './tabs/OverviewTab';
import { HoldingsTab }    from './tabs/HoldingsTab';
import { PerformanceTab } from './tabs/PerformanceTab';
import { RiskTab }        from './tabs/RiskTab';
import { DividendsTab }   from './tabs/DividendsTab';
import { CostTab }        from './tabs/CostTab';
import { VerdictTab }     from './tabs/VerdictTab';

// ─── Tab config ───────────────────────────────────────────────────────────────

const TAB_CONFIG: { id: EtfTabId; label: string; icon: ElementType }[] = [
  { id: 'overview',     label: 'Overview',          icon: LayoutDashboard },
  { id: 'holdings',     label: 'Holdings',           icon: Layers },
  { id: 'performance',  label: 'Performance',        icon: TrendingUp },
  { id: 'risk',         label: 'Risk',               icon: ShieldAlert },
  { id: 'dividends',    label: 'Dividends',          icon: DollarSign },
  { id: 'cost',         label: 'Cost & Efficiency',  icon: BarChart3 },
  { id: 'verdict',      label: 'Fino AI Verdict',    icon: Sparkles },
];

// ─── ETFTabNav ─────────────────────────────────────────────────────────────────

const ETFTabNav = memo(function ETFTabNav({
  activeTab,
  onTabChange,
}: {
  activeTab: EtfTabId;
  onTabChange: (t: EtfTabId) => void;
}) {
  return (
    <div className="flex w-full items-center gap-6 overflow-x-auto border-b border-white/[0.075] px-4 scrollbar-none">
      {TAB_CONFIG.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 whitespace-nowrap px-2 py-4 text-sm font-medium transition-colors duration-200',
              isActive
                ? 'text-ink-primary'
                : 'text-ink-tertiary hover:text-ink-secondary',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4',
                isActive ? 'text-ink-primary' : 'text-ink-tertiary',
              )}
            />
            <span className="hidden sm:inline">{tab.label}</span>
            {isActive && (
              <span
                className="absolute inset-x-0 bottom-[-1px] h-px rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(232,199,102,0.92), transparent)',
                }}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
});

// ─── ETFMarketStatusBadge — inline (non-fixed) hero badge ────────────────────
// Mirrors MarketStatusBadge.tsx logic but renders inline inside the hero row.
// Hidden when market is open (data is live/same-day). Only ETF/equity pages.

function ETFMarketStatusBadge() {
  const ms = useMarketStatus();
  if (ms.isOpen) return null;

  const Icon =
    ms.status === 'closed-weekend' || ms.status === 'closed-holiday' ? Lock : Clock;

  const headline =
    ms.status === 'closed-weekend'   ? 'Market Closed' :
    ms.status === 'closed-holiday'   ? `Closed — ${ms.holidayName ?? 'Holiday'}` :
    ms.status === 'closed-after-hours' ? 'After Hours' :
    'Pre-Market';

  return (
    <span
      role="status"
      aria-live="polite"
      title={`${ms.reason}. Showing ${ms.lastTradingDayLabel}.`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-medium',
        'border border-[color:var(--gold-eyebrow-hairline,rgba(201,166,70,0.35))]',
        'bg-[rgba(201,166,70,0.08)]',
        'text-[color:var(--gold-primary,#C9A646)]',
      )}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>{headline}</span>
      <span className="opacity-60">·</span>
      <span className="text-ink-secondary font-normal">
        Showing <span className="font-semibold">{ms.lastTradingDayLabel}</span>
      </span>
    </span>
  );
}

// ─── ETFHero ──────────────────────────────────────────────────────────────────

function ETFHero({ data }: { data: EtfData }) {
  const { profile, quote, finoScore } = data;
  const name = profile?.name ?? data.ticker;
  const price = quote?.closePrice;
  const changeAbs = quote?.changeAbs;
  const changePct = quote?.changePercent;
  const isNeg = changeAbs !== undefined && changeAbs !== null && changeAbs < 0;

  return (
    <div className="flex flex-col gap-ds-4 sm:flex-row sm:items-start sm:justify-between">
      {/* Left: name + price */}
      <div className="flex flex-col gap-ds-1">
        <div className="flex items-center gap-ds-2 flex-wrap">
          <span className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
            {data.ticker}
          </span>
          {/* EOD / Delayed pill */}
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            EOD · Delayed
          </span>
          {/* Market status — shown when closed */}
          <ETFMarketStatusBadge />
        </div>
        <h1 className="text-h3 font-medium text-ink-primary leading-tight">{name}</h1>
        {price !== undefined && price !== null && (
          <div className="flex items-baseline gap-ds-2 mt-ds-1">
            <span className="font-data text-2xl font-semibold text-ink-primary">
              ${price.toFixed(2)}
            </span>
            {changeAbs !== undefined && changeAbs !== null && (
              <span
                className={cn(
                  'font-data text-sm',
                  isNeg ? 'text-[#E24B4A]' : 'text-ink-primary',
                )}
              >
                {changeAbs >= 0 ? '+' : ''}
                {changeAbs.toFixed(2)}{' '}
                ({changePct !== undefined && changePct !== null
                  ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
                  : '—'})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: FINO Score compact badge */}
      <FinoScoreBadge finoScore={finoScore} size="compact" className="sm:mt-ds-1" />
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ETFLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1240px] space-y-ds-5 animate-pulse px-ds-4">
      {/* Hero skeleton */}
      <div className="h-20 rounded-[12px] bg-surface-1" />
      {/* Tab bar skeleton */}
      <div className="h-12 rounded-[12px] bg-surface-1" />
      {/* Content skeleton */}
      <div className="space-y-ds-4">
        <div className="h-36 rounded-[12px] bg-surface-1" />
        <div className="h-28 rounded-[12px] bg-surface-1" />
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ETFErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-ds-8 max-w-[480px] rounded-[12px] border border-[#E24B4A]/30 bg-surface-1 p-ds-6 text-center">
      <p className="text-sm font-medium text-[#E24B4A] mb-ds-1">Could not load ETF data</p>
      <p className="text-small text-ink-tertiary">{message}</p>
    </div>
  );
}

// ─── ETFDetail page ───────────────────────────────────────────────────────────

export default function ETFDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const { activeTab, setActiveTab, data, loading, error, loadETF } = useETFAnalyzer();

  useEffect(() => {
    if (symbol) {
      loadETF(symbol);
    }
  // loadETF is stable (useCallback with no deps that change); symbol from route param.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return (
    <div className="min-h-screen bg-background py-ds-6 px-ds-4">
      {/* Loading */}
      {loading && <ETFLoadingSkeleton />}

      {/* Error */}
      {error && !loading && <ETFErrorState message={error} />}

      {/* Loaded */}
      {data && !loading && (
        <motion.div
          key={`etf-detail-${data.ticker}`}
          className="mx-auto max-w-[1240px] space-y-ds-6"
          initial={{ opacity: 0, x: 52, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Hero */}
          <ETFHero data={data} />

          {/* Tab nav */}
          <div className="overflow-x-auto pb-1">
            <ETFTabNav activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Tab panels — all mount together (like StockAnalyzer) so fetches
              can fire in parallel; CSS hidden keeps inactive ones invisible. */}
          <div className="min-h-[400px]">
            <div hidden={activeTab !== 'overview'}>
              <OverviewTab data={data} />
            </div>
            <div hidden={activeTab !== 'holdings'}>
              <HoldingsTab data={data} />
            </div>
            <div hidden={activeTab !== 'performance'}>
              <PerformanceTab data={data} />
            </div>
            <div hidden={activeTab !== 'risk'}>
              <RiskTab data={data} />
            </div>
            <div hidden={activeTab !== 'dividends'}>
              <DividendsTab data={data} />
            </div>
            <div hidden={activeTab !== 'cost'}>
              <CostTab data={data} />
            </div>
            <div hidden={activeTab !== 'verdict'}>
              <VerdictTab data={data} active={activeTab === 'verdict'} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
