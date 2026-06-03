// src/pages/app/etfs/ETFLayout.tsx
// =====================================================
// ETF ANALYZER — Per-ticker layout with inline header tabs.
// Mirrors stocks/[symbol]/CompanyLayout.tsx pattern.
//
// Route: /app/etfs/:symbol (→ redirect to /app/etfs/:symbol/overview)
//        /app/etfs/:symbol/:section
//
// The 7 sections are rendered as inline header tabs (not sidebar items).
// Section components live in ./tabs/ and receive the shared EtfData.
// =====================================================

import { useEffect, useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, BarChart3, TrendingUp, ShieldAlert,
  DollarSign, Layers, Sparkles, Lock, Clock, Search,
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

interface TabConfig {
  id: EtfTabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: 'overview',     label: 'Overview',         icon: LayoutDashboard },
  { id: 'holdings',     label: 'Holdings',          icon: Layers },
  { id: 'performance',  label: 'Performance',       icon: TrendingUp },
  { id: 'risk',         label: 'Risk',              icon: ShieldAlert },
  { id: 'dividends',    label: 'Dividends',         icon: DollarSign },
  { id: 'cost',         label: 'Cost & Efficiency', icon: BarChart3 },
  { id: 'verdict',      label: 'Fino AI Verdict',   icon: Sparkles },
];

const VALID_SECTIONS: EtfTabId[] = TABS.map((t) => t.id);

function toSection(raw: string | undefined): EtfTabId {
  if (raw && (VALID_SECTIONS as string[]).includes(raw)) return raw as EtfTabId;
  return 'overview';
}

// ─── ETFMarketStatusBadge ────────────────────────────────────────────────────

function ETFMarketStatusBadge() {
  const ms = useMarketStatus();
  if (ms.isOpen) return null;

  const Icon =
    ms.status === 'closed-weekend' || ms.status === 'closed-holiday' ? Lock : Clock;

  const headline =
    ms.status === 'closed-weekend'     ? 'Market Closed' :
    ms.status === 'closed-holiday'     ? `Closed — ${ms.holidayName ?? 'Holiday'}` :
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
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            EOD · Delayed
          </span>
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

// ─── SwitchTickerBar ──────────────────────────────────────────────────────────

function SwitchTickerBar({ currentSymbol }: { currentSymbol: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function handleSwitch(e: React.FormEvent) {
    e.preventDefault();
    const ticker = query.trim().toUpperCase();
    if (!ticker || ticker === currentSymbol) return;
    navigate(`/app/etfs/${ticker}/overview`);
    setQuery('');
  }

  return (
    <form
      onSubmit={handleSwitch}
      className="flex items-center gap-ds-2"
      aria-label="Switch ETF ticker"
    >
      <div className="relative">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Switch ticker…"
          className="w-40 rounded-[6px] border border-border-ds-subtle bg-surface-1 py-1.5 pl-8 pr-ds-3 text-xs text-ink-primary placeholder:text-ink-muted transition-colors focus:border-border-ds-default focus:outline-none"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </div>
      <button
        type="submit"
        className="rounded-[6px] px-ds-3 py-1.5 text-xs font-semibold text-ink-on-gold"
        style={{
          background: 'var(--gradient-gold)',
          boxShadow: 'var(--glow-gold-resting)',
        }}
      >
        Go
      </button>
    </form>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ETFLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1240px] space-y-ds-5 animate-pulse px-ds-4">
      <div className="h-20 rounded-[12px] bg-surface-1" />
      <div className="h-10 rounded-[12px] bg-surface-1" />
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

// ─── ETFLayout ────────────────────────────────────────────────────────────────

export default function ETFLayout() {
  const { symbol = '', section: rawSection } = useParams<{ symbol: string; section?: string }>();
  const activeSection = toSection(rawSection);
  const { data, loading, error, loadETF } = useETFAnalyzer();

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
          key={`etf-layout-${data.ticker}`}
          className="mx-auto max-w-[1240px] space-y-ds-4"
          initial={{ opacity: 0, x: 52, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Hero + switch-ticker bar */}
          <div className="flex flex-col gap-ds-3 sm:flex-row sm:items-start sm:justify-between">
            <ETFHero data={data} />
            <div className="flex flex-col items-end gap-ds-1">
              <SwitchTickerBar currentSymbol={data.ticker} />
            </div>
          </div>

          {/* Inline tab nav — mirrors CompanyLayout TabLink pattern */}
          <div className="border-b border-[rgba(255,255,255,0.06)] pb-0">
            <div className="flex gap-1 flex-wrap">
              {TABS.map((tab) => {
                const to = `/app/etfs/${data.ticker}/${tab.id}`;
                const isActive = activeSection === tab.id;
                const Icon = tab.icon;
                return (
                  <NavLink
                    key={tab.id}
                    to={to}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[rgba(255,215,0,0.12)] text-amber-300 border-b-2 border-amber-300'
                        : 'text-zinc-300 hover:bg-[rgba(255,255,255,0.06)] hover:text-white',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {tab.label}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Section content — only the active section mounts */}
          <div className="min-h-[400px] pt-ds-2">
            {activeSection === 'overview'    && <OverviewTab    data={data} />}
            {activeSection === 'holdings'    && <HoldingsTab    data={data} />}
            {activeSection === 'performance' && <PerformanceTab data={data} />}
            {activeSection === 'risk'        && <RiskTab        data={data} />}
            {activeSection === 'dividends'   && <DividendsTab   data={data} />}
            {activeSection === 'cost'        && <CostTab        data={data} />}
            {activeSection === 'verdict'     && (
              <VerdictTab data={data} active={true} />
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
