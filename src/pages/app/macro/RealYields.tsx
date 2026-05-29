// src/pages/app/macro/RealYields.tsx
// Real Yields & TIPS tab — DFII5/10/30 + T5/10/30YIE breakevens + Gold overlay via FRED.
//
// MarketStatusBadge is shown because FRED data is US-Treasury-derived (daily cadence,
// but releases lag by 1 business day — weekend stale context is useful for traders).
//
// No chart library dependency: sparklines rendered via SVG (Sparkline from GlassUI).

import { memo } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { MarketStatusBadge } from '@/components/ai-arena/MarketStatusBadge';
import { AiSummaryCard } from '@/components/ai-summary/AiSummaryCard';
import {
  useRealYieldsSnapshot,
  useRealYieldsSeries,
  type RealYieldsPoint,
} from '@/hooks/macro/useRealYields';
import {
  GlassCard,
  GlassStat,
  GlassStatSkeleton,
  SectionHeader,
  Sparkline,
} from '../crypto/_shared/GlassUI';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtYield(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(2)}%`;
}

function fmtGold(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pctColor(n: number): string {
  // For yields: higher real yield is contextually bearish for growth (red),
  // lower is more accommodative (green). We use standard sign coloring.
  return n >= 0 ? 'text-emerald-400' : 'text-red-400';
}

function breakevenColor(n: number): string {
  // Breakeven inflation: high = inflation concern (amber), low = deflation risk (blue)
  if (n >= 3.0) return 'text-red-400';
  if (n >= 2.5) return 'text-amber-400';
  if (n >= 1.5) return 'text-emerald-400';
  return 'text-sky-400';
}


// ─── Hero: TIPS 10Y primary + 5Y/30Y secondary ───────────────────────────────

const RealYieldsHero = memo(function RealYieldsHero() {
  const { data: snapshot, isLoading } = useRealYieldsSnapshot();

  if (isLoading) {
    return (
      <div className="animate-pulse mb-6">
        <div className="h-4 w-32 bg-white/10 rounded mb-2" />
        <div className="h-10 w-40 bg-white/10 rounded mb-3" />
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-white/10 rounded-full" />
          <div className="h-6 w-24 bg-white/10 rounded-full" />
        </div>
      </div>
    );
  }

  const tips10 = snapshot?.tips10;
  const tips5 = snapshot?.tips5;
  const tips30 = snapshot?.tips30;
  const asOf = snapshot?.ts ?? '';

  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-1">
        10-Year TIPS Yield (Real)
      </p>
      <p className="text-3xl sm:text-4xl font-bold tabular-nums text-white/90 font-mono">
        {tips10 != null ? fmtYield(tips10) : '—'}
      </p>
      {asOf && (
        <p className="text-xs text-white/30 mt-0.5">as of {asOf}</p>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        {tips5 != null && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/60">
            5Y Real {fmtYield(tips5)}
          </span>
        )}
        {tips30 != null && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/60">
            30Y Real {fmtYield(tips30)}
          </span>
        )}
      </div>
    </div>
  );
});

// ─── Section 1: Real Yields Curve — 3 sparklines side-by-side ────────────────

const RealYieldsCurve = memo(function RealYieldsCurve() {
  const { data: seriesResp, isLoading, error, refetch } = useRealYieldsSeries(365);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <GlassStatSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-ink-tertiary">Yield curve data unavailable</p>
        <Button variant="goldOutline" size="compact" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const series = seriesResp?.data ?? [];
  if (series.length < 2) {
    return (
      <Card>
        <p className="text-sm text-ink-tertiary">Real yield data temporarily unavailable</p>
      </Card>
    );
  }

  const curves: Array<{
    label: string;
    tenor: string;
    values: number[];
    latest: number;
    color: string;
  }> = [
    {
      label: '5Y Real Yield',
      tenor: 'DFII5',
      values: series.map((p: RealYieldsPoint) => p.tips5),
      latest: series[series.length - 1].tips5,
      color: '#818cf8', // indigo
    },
    {
      label: '10Y Real Yield',
      tenor: 'DFII10',
      values: series.map((p: RealYieldsPoint) => p.tips10),
      latest: series[series.length - 1].tips10,
      color: '#a78bfa', // violet
    },
    {
      label: '30Y Real Yield',
      tenor: 'DFII30',
      values: series.map((p: RealYieldsPoint) => p.tips30),
      latest: series[series.length - 1].tips30,
      color: '#c4b5fd', // purple-300
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {curves.map((c) => (
        <GlassCard key={c.tenor}>
          <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium mb-1">
            {c.label}
          </p>
          <p className={`text-xl font-bold font-mono tabular-nums ${pctColor(c.latest)}`}>
            {fmtYield(c.latest)}
          </p>
          <div className="mt-3">
            <Sparkline
              data={c.values}
              width={240}
              height={40}
              color={c.color}
              className="w-full h-10"
            />
          </div>
          <p className="text-[10px] text-white/25 mt-1">{c.tenor} — 12mo</p>
        </GlassCard>
      ))}
    </div>
  );
});

// ─── Section 2: Breakeven Inflation — 3 stat cards ───────────────────────────

const BreakevenCards = memo(function BreakevenCards() {
  const { data: snapshot, isLoading, error, refetch } = useRealYieldsSnapshot();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <GlassStatSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-ink-tertiary">Breakeven data unavailable</p>
        <Button variant="goldOutline" size="compact" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card>
        <p className="text-sm text-ink-tertiary">Breakeven inflation data temporarily unavailable</p>
      </Card>
    );
  }

  const breakevenItems: Array<{
    label: string;
    ticker: string;
    value: number;
    description: string;
  }> = [
    {
      label: '5Y Breakeven',
      ticker: 'T5YIE',
      value: snapshot.breakeven5,
      description: 'Mkt implied 5Y inflation',
    },
    {
      label: '10Y Breakeven',
      ticker: 'T10YIE',
      value: snapshot.breakeven10,
      description: 'Mkt implied 10Y inflation',
    },
    {
      label: '30Y Breakeven',
      ticker: 'T30YIE',
      value: snapshot.breakeven30,
      description: 'Mkt implied 30Y inflation',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {breakevenItems.map((item) => (
        <GlassStat
          key={item.ticker}
          label={item.label}
          value={fmtYield(item.value)}
          subValue={item.description}
          change={null}
        />
      ))}
    </div>
  );
});

// ─── Section 3: TIPS-Gold Overlay Sparkline ──────────────────────────────────

const TipsGoldOverlay = memo(function TipsGoldOverlay() {
  const { data: seriesResp, isLoading } = useRealYieldsSeries(365);

  if (isLoading) {
    return (
      <GlassCard className="animate-pulse">
        <div className="h-32 bg-white/[0.03] rounded-xl" />
      </GlassCard>
    );
  }

  const series = seriesResp?.data ?? [];
  const goldSeries = series.filter((p: RealYieldsPoint) => p.gold != null);

  // Skip section if no gold data available
  if (goldSeries.length < 2) {
    return null;
  }

  const tips10Values = goldSeries.map((p: RealYieldsPoint) => p.tips10);
  const goldValues = goldSeries.map((p: RealYieldsPoint) => p.gold as number);
  const firstDate = goldSeries[0].date;
  const lastDate = goldSeries[goldSeries.length - 1].date;
  const latestGold = goldValues[goldValues.length - 1];

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">TIPS 10Y vs Gold — 12mo</p>
          <p className="text-xs text-white/25 mt-0.5">
            Gold: <span className="text-amber-400 font-mono">{fmtGold(latestGold)}</span>
          </p>
        </div>
        <p className="text-[11px] text-white/30">
          {firstDate} — {lastDate}
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] text-violet-300/60 uppercase tracking-wider mb-1">10Y Real Yield</p>
          <Sparkline
            data={tips10Values}
            width={600}
            height={40}
            color="#a78bfa"
            className="w-full h-10"
          />
        </div>
        <div>
          <p className="text-[10px] text-amber-400/60 uppercase tracking-wider mb-1">Gold (USD/oz)</p>
          <Sparkline
            data={goldValues}
            width={600}
            height={40}
            color="#fbbf24"
            className="w-full h-10"
          />
        </div>
      </div>
    </GlassCard>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

const RealYields = memo(function RealYields() {
  return (
    <PageTemplate
      title="Real Yields & TIPS"
      description="Treasury Inflation-Protected Securities yields (DFII5/10/30) and breakeven inflation rates (T5/10/30YIE) from FRED"
    >
      {/* MarketStatusBadge: FRED TIPS data is US-Treasury-derived (daily releases) */}
      <MarketStatusBadge hideWhenOpen className="mb-4" />

      <div className="space-y-6 pb-8">
        {/* AI Summary Card — top, full width */}
        <AiSummaryCard feature="real-yields" />

        {/* Hero stat: TIPS 10Y + 5Y/30Y secondary pills */}
        <RealYieldsHero />

        {/* Section 1: Real yields curve — 3 sparklines (5Y, 10Y, 30Y) */}
        <section>
          <SectionHeader
            title="Real Yield Curve"
            subtitle="TIPS yields — positive real rates = tighter conditions; negative = accommodative"
          />
          <RealYieldsCurve />
        </section>

        {/* Section 2: Breakeven inflation — 3 stat cards */}
        <section>
          <SectionHeader
            title="Breakeven Inflation"
            subtitle="Market-implied inflation expectations (nominal yield − real yield)"
          />
          <BreakevenCards />
        </section>

        {/* Section 3: TIPS-Gold overlay (only rendered if gold data available) */}
        <section>
          <SectionHeader
            title="TIPS vs Gold Overlay"
            subtitle="Gold historically inversely correlated with real yields"
          />
          <TipsGoldOverlay />
        </section>
      </div>
    </PageTemplate>
  );
});

export default RealYields;
