// src/pages/app/macro/CreditSpreads.tsx
// Credit Spreads tab — ICE BofA HY/IG/EM OAS + regime classifier via FRED.
//
// MarketStatusBadge is shown because ICE BofA OAS series are business-day data
// derived from US fixed income markets — weekend stale context is useful.
//
// No chart library: sparkline rendered via SVG (Sparkline from GlassUI).
// Regime history bar is rendered as a pure CSS/SVG color band.

import { memo, useMemo } from 'react';
import { DataFreshness } from '@/components/macro/DataFreshness';
import { PageTemplate } from '@/components/PageTemplate';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { MarketStatusBadge } from '@/components/ai-arena/MarketStatusBadge';
import { AiSummaryCard } from '@/components/ai-summary/AiSummaryCard';
import { MetricChart } from '@/components/macro/MetricChart';
import {
  useCreditSpreadsSnapshot,
  useCreditSpreadsSeries,
  type CreditSpreadsPoint,
  type CreditRegime,
} from '@/hooks/macro/useCreditSpreads';
import {
  GlassCard,
  GlassStatSkeleton,
  SectionHeader,
  Sparkline,
} from '../crypto/_shared/GlassUI';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBps(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(0)} bps`;
}

function bpsDelta(current: number, prev: number): number {
  return current - prev;
}

// Regime display config
const REGIME_CONFIG: Record<CreditRegime, { label: string; emoji: string; color: string; pill: string; barColor: string }> = {
  'risk-on': {
    label: 'RISK-ON',
    emoji: '🟢',
    color: 'text-emerald-400',
    pill: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    barColor: '#34d399',
  },
  neutral: {
    label: 'NEUTRAL',
    emoji: '🟡',
    color: 'text-yellow-400',
    pill: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300',
    barColor: '#facc15',
  },
  stress: {
    label: 'STRESS',
    emoji: '🟠',
    color: 'text-orange-400',
    pill: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
    barColor: '#fb923c',
  },
  crisis: {
    label: 'CRISIS',
    emoji: '🔴',
    color: 'text-red-400',
    pill: 'bg-red-500/15 border-red-500/30 text-red-300',
    barColor: '#f87171',
  },
};


// ─── Interactive MetricChart (recharts) ──────────────────────────────────────

const CreditSpreadsMetricChart = memo(function CreditSpreadsMetricChart() {
  const { data: seriesResp, isLoading } = useCreditSpreadsSeries(365 * 5);

  return (
    <Card className="w-full mb-6 p-4">
      <MetricChart
        title="Credit Spreads (OAS) — HY / IG / EM"
        data={seriesResp?.data ?? []}
        lines={[
          { dataKey: 'hy', label: 'High Yield',       color: '#E24B4A',               format: 'percent' },
          { dataKey: 'ig', label: 'Investment Grade', color: '#C9A646',               format: 'percent' },
          { dataKey: 'em', label: 'Emerging Markets', color: 'rgba(255,255,255,0.65)', format: 'percent', strokeDasharray: '4 4' },
        ]}
        showNBER
        showFOMC
        defaultRange="1Y"
        isLoading={isLoading}
      />
    </Card>
  );
});

// ─── Hero: Regime classifier pill + current regime duration ──────────────────

const RegimeHero = memo(function RegimeHero() {
  const { data: snapshot, isLoading } = useCreditSpreadsSnapshot();
  const { data: seriesResp } = useCreditSpreadsSeries(365);

  // Compute how many days the current regime has been active
  const regimeDuration = useMemo(() => {
    const series = seriesResp?.data ?? [];
    const currentRegime = snapshot?.regime;
    if (!currentRegime || series.length === 0) return null;

    let count = 0;
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].regime === currentRegime) count++;
      else break;
    }
    return count;
  }, [seriesResp, snapshot?.regime]);

  if (isLoading) {
    return (
      <div className="animate-pulse mb-6">
        <div className="h-4 w-32 bg-white/10 rounded mb-3" />
        <div className="h-16 w-72 bg-white/10 rounded-2xl mb-3" />
        <div className="h-4 w-40 bg-white/10 rounded" />
      </div>
    );
  }

  const regime = snapshot?.regime ?? 'neutral';
  const cfg = REGIME_CONFIG[regime];

  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-3">
        Current Credit Regime
      </p>
      <div className={`inline-flex items-center gap-3 px-5 py-3.5 rounded-2xl border ${cfg.pill}`}>
        <span className="text-2xl">{cfg.emoji}</span>
        <div>
          <p className="text-xl font-bold tracking-wide">{cfg.label}</p>
          {regimeDuration != null && (
            <p className="text-xs opacity-70 mt-0.5">
              {regimeDuration} trading {regimeDuration === 1 ? 'day' : 'days'} in current regime
            </p>
          )}
        </div>
      </div>
      {/* Daily FRED series (ICE BofA OAS) — business days only, ~1d publish lag; allow long weekends before "stale" */}
      <DataFreshness asOf={snapshot?.ts} ttlHours={96} className="mt-2" />
    </div>
  );
});

// ─── Section 1: Three spread stat cards ─────────────────────────────────────

const SpreadCards = memo(function SpreadCards() {
  const { data: snapshot, isLoading, error, refetch } = useCreditSpreadsSnapshot();
  const { data: seriesResp } = useCreditSpreadsSeries(365);

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
        <p className="text-sm text-ink-tertiary">Spread data unavailable</p>
        <Button variant="goldOutline" size="compact" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card>
        <p className="text-sm text-ink-tertiary">Credit spread data temporarily unavailable</p>
      </Card>
    );
  }

  const series = seriesResp?.data ?? [];
  // Get a point ~30 days back for delta
  const thirtyDayPoint = series.length >= 22 ? series[series.length - 22] : series[0];

  const spreads: Array<{
    label: string;
    ticker: string;
    value: number;
    prevValue: number;
    description: string;
    deltaColor: string;
  }> = [
    {
      label: 'HY OAS',
      ticker: 'BAMLH0A0HYM2',
      value: snapshot.hy,
      prevValue: thirtyDayPoint?.hy ?? snapshot.hy,
      description: 'US High Yield — risk appetite gauge',
      deltaColor: 'text-red-400',
    },
    {
      label: 'IG OAS',
      ticker: 'BAMLC0A0CM',
      value: snapshot.ig,
      prevValue: thirtyDayPoint?.ig ?? snapshot.ig,
      description: 'US Investment Grade — credit quality',
      deltaColor: 'text-orange-400',
    },
    {
      label: 'EM OAS',
      ticker: 'BAMLEMCBPIOAS',
      value: snapshot.em,
      prevValue: thirtyDayPoint?.em ?? snapshot.em,
      description: 'Emerging Markets — global risk proxy',
      deltaColor: 'text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {spreads.map((s) => {
        const delta = bpsDelta(s.value, s.prevValue);
        const deltaStr = `${delta >= 0 ? '+' : ''}${delta.toFixed(0)} bps (30d)`;
        const deltaClr = delta > 0 ? 'text-red-400' : 'text-emerald-400'; // higher spread = worse
        return (
          <GlassCard key={s.ticker}>
            <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium mb-1">
              {s.label}
            </p>
            <p className="text-xl font-bold font-mono tabular-nums text-white/90">
              {fmtBps(s.value)}
            </p>
            <p className="text-xs text-white/30 mt-0.5 truncate">{s.description}</p>
            {series.length > 1 && (
              <span className={`inline-block mt-2 text-[11px] font-semibold ${deltaClr}`}>
                {deltaStr}
              </span>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
});

// ─── Section 2: Combined Sparkline (HY + IG + EM) ───────────────────────────

const SpreadChart = memo(function SpreadChart() {
  const { data: seriesResp, isLoading, error, refetch } = useCreditSpreadsSeries(365);

  if (isLoading) {
    return (
      <GlassCard className="animate-pulse">
        <div className="h-40 bg-white/[0.03] rounded-xl" />
      </GlassCard>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-ink-tertiary">Chart data unavailable</p>
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
        <p className="text-sm text-ink-tertiary">Spread history temporarily unavailable</p>
      </Card>
    );
  }

  const hyValues = series.map((p: CreditSpreadsPoint) => p.hy);
  const igValues = series.map((p: CreditSpreadsPoint) => p.ig);
  const emValues = series.map((p: CreditSpreadsPoint) => p.em);
  const firstDate = series[0].date;
  const lastDate = series[series.length - 1].date;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">OAS Spreads — 12mo</p>
        </div>
        <p className="text-[11px] text-white/30">{firstDate} — {lastDate}</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-red-300/70 uppercase tracking-wider w-8">HY</span>
          <Sparkline
            data={hyValues}
            width={500}
            height={36}
            color="#f87171"
            className="flex-1 h-9"
          />
          <span className="text-[11px] font-mono text-white/50 tabular-nums w-16 text-right">
            {fmtBps(hyValues[hyValues.length - 1])}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-amber-300/70 uppercase tracking-wider w-8">IG</span>
          <Sparkline
            data={igValues}
            width={500}
            height={36}
            color="#fbbf24"
            className="flex-1 h-9"
          />
          <span className="text-[11px] font-mono text-white/50 tabular-nums w-16 text-right">
            {fmtBps(igValues[igValues.length - 1])}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-sky-300/70 uppercase tracking-wider w-8">EM</span>
          <Sparkline
            data={emValues}
            width={500}
            height={36}
            color="#38bdf8"
            className="flex-1 h-9"
          />
          <span className="text-[11px] font-mono text-white/50 tabular-nums w-16 text-right">
            {fmtBps(emValues[emValues.length - 1])}
          </span>
        </div>
      </div>
    </GlassCard>
  );
});

// ─── Section 3: Regime History Bar ───────────────────────────────────────────

const RegimeHistoryBar = memo(function RegimeHistoryBar() {
  const { data: seriesResp, isLoading } = useCreditSpreadsSeries(365);

  if (isLoading) {
    return (
      <GlassCard className="animate-pulse">
        <div className="h-12 bg-white/[0.03] rounded-lg" />
      </GlassCard>
    );
  }

  const series = seriesResp?.data ?? [];
  if (series.length < 2) return null;

  // Build contiguous regime segments for the color band
  const segments: Array<{ regime: CreditRegime; count: number; startDate: string; endDate: string }> = [];
  for (const pt of series) {
    const last = segments[segments.length - 1];
    if (last && last.regime === pt.regime) {
      last.count++;
      last.endDate = pt.date;
    } else {
      segments.push({ regime: pt.regime, count: 1, startDate: pt.date, endDate: pt.date });
    }
  }

  const total = series.length;
  const firstDate = series[0].date;
  const lastDate = series[series.length - 1].date;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/40 uppercase tracking-wider">Regime History — 12mo</p>
        <p className="text-[11px] text-white/30">{firstDate} — {lastDate}</p>
      </div>
      {/* Color band */}
      <div className="flex h-8 rounded-lg overflow-hidden gap-px">
        {segments.map((seg, i) => {
          const pct = (seg.count / total) * 100;
          const cfg = REGIME_CONFIG[seg.regime];
          return (
            <div
              key={i}
              title={`${cfg.emoji} ${cfg.label}: ${seg.startDate} → ${seg.endDate} (${seg.count}d)`}
              style={{ width: `${pct}%`, backgroundColor: cfg.barColor, opacity: 0.7 }}
              className="transition-all duration-300 cursor-default"
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {(Object.entries(REGIME_CONFIG) as Array<[CreditRegime, typeof REGIME_CONFIG.neutral]>).map(
          ([regime, cfg]) => {
            const segCount = segments.filter((s) => s.regime === regime).reduce((a, b) => a + b.count, 0);
            if (segCount === 0) return null;
            const pct = ((segCount / total) * 100).toFixed(0);
            return (
              <div key={regime} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: cfg.barColor, opacity: 0.7 }}
                />
                <span className="text-[11px] text-white/50">
                  {cfg.emoji} {cfg.label} {pct}%
                </span>
              </div>
            );
          }
        )}
      </div>
    </GlassCard>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

const CreditSpreads = memo(function CreditSpreads() {
  return (
    <PageTemplate
      title="Credit Spreads"
      description="ICE BofA OAS spreads — High Yield (BAMLH0A0HYM2), Investment Grade (BAMLC0A0CM), Emerging Markets (BAMLEMCBPIOAS)"
    >
      {/* MarketStatusBadge: ICE BofA OAS data is US fixed income business-day series */}
      <MarketStatusBadge hideWhenOpen className="mb-4" />

      <div className="space-y-6 pb-8">
        {/* AI Summary Card — top, full width */}
        <AiSummaryCard feature="credit-spreads" />

        {/* Interactive recharts MetricChart — HY / IG / EM OAS */}
        <CreditSpreadsMetricChart />

        {/* Hero: Regime classifier pill + duration */}
        <RegimeHero />

        {/* Section 1: HY OAS, IG OAS, EM OAS stat cards with 30d delta */}
        <section>
          <SectionHeader
            title="Current OAS Spreads"
            subtitle="Option-adjusted spreads in basis points — wider = more credit stress"
          />
          <SpreadCards />
        </section>

        {/* Section 2: Combined sparkline of all 3 spreads */}
        <section>
          <SectionHeader
            title="12-Month Spread History"
            subtitle="HY / IG / EM OAS — daily cadence"
          />
          <SpreadChart />
        </section>

        {/* Section 3: Regime history bar — last 365 days */}
        <section>
          <SectionHeader
            title="Regime History"
            subtitle="Credit regime classification over the past 12 months"
          />
          <RegimeHistoryBar />
        </section>
      </div>
    </PageTemplate>
  );
});

export default CreditSpreads;
