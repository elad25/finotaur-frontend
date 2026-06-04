// src/pages/app/macro/Liquidity.tsx
// Howell Net Liquidity tab — WALCL − WTREGEN − RRPONTSYD via FRED.
//
// MarketStatusBadge is shown because FRED data is US-equity-linked (weekly Fed
// releases, Wednesday cadence) — "weekend stale" context is useful for traders.
//
// No chart library dependency: sparkline is rendered via SVG (Sparkline from GlassUI).
// SPX overlay deferred — TODO(wave-1): add dual-axis chart when spxOverlay is wired.

import { memo } from 'react';
import { DataFreshness } from '@/components/macro/DataFreshness';
import { PageTemplate } from '@/components/PageTemplate';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { MarketStatusBadge } from '@/components/ai-arena/MarketStatusBadge';
import { AiSummaryCard } from '@/components/ai-summary/AiSummaryCard';
import { MetricChart } from '@/components/macro/MetricChart';
import {
  useLiquiditySnapshot,
  useLiquiditySeries,
  type LiquidityPoint,
} from '@/hooks/macro/useLiquidity';
import {
  GlassCard,
  GlassStat,
  GlassStatSkeleton,
  SectionHeader,
  Sparkline,
} from '../crypto/_shared/GlassUI';
import { formatCompact } from '../crypto/_shared/formatters';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pctColor(n: number): string {
  return n >= 0 ? 'text-emerald-400' : 'text-red-400';
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function fmtCompactNoSign(n: number): string {
  // Same as formatCompact but strips $ — components are in billions of USD
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(2)}`;
}

function deltaPct(current: number, prev: number): number {
  if (prev === 0) return 0;
  return ((current - prev) / Math.abs(prev)) * 100;
}


// ─── Hero: Net Liquidity stat + MoM/YoY pills ────────────────────────────────

const LiquidityHero = memo(function LiquidityHero() {
  const { data: snapshot, isLoading } = useLiquiditySnapshot();

  if (isLoading) {
    return (
      <div className="animate-pulse mb-6">
        <div className="h-4 w-32 bg-white/10 rounded mb-2" />
        <div className="h-10 w-56 bg-white/10 rounded mb-3" />
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-white/10 rounded-full" />
          <div className="h-6 w-24 bg-white/10 rounded-full" />
        </div>
      </div>
    );
  }

  const net = snapshot?.latest?.netLiquidity;
  const mom = snapshot?.deltaMoMPct;
  const yoy = snapshot?.deltaYoYPct;
  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-1">
        Howell Net Liquidity
      </p>
      <p className="text-3xl sm:text-4xl font-bold tabular-nums text-white/90 font-mono">
        {net != null ? fmtCompactNoSign(net) : '—'}
      </p>
      <DataFreshness asOf={snapshot?.latest?.date ?? snapshot?.ts} ttlHours={36} className="mt-0.5" />
      <div className="flex flex-wrap gap-2 mt-3">
        {mom != null && (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 ${pctColor(mom)}`}>
            MoM {fmtPct(mom)}
          </span>
        )}
        {yoy != null && (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 ${pctColor(yoy)}`}>
            YoY {fmtPct(yoy)}
          </span>
        )}
      </div>
    </div>
  );
});

// ─── Component Breakdown: WALCL / WTREGEN / RRPONTSYD ────────────────────────

const ComponentCards = memo(function ComponentCards() {
  const { data: snapshot, isLoading, error, refetch } = useLiquiditySnapshot();

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
        <p className="text-sm text-ink-tertiary">Component data unavailable</p>
        <Button variant="goldOutline" size="compact" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card>
        <p className="text-sm text-ink-tertiary">Liquidity data temporarily unavailable</p>
      </Card>
    );
  }

  const { latest, oneMonthAgo } = snapshot;

  const components: Array<{
    label: string;
    ticker: string;
    value: number;
    prev: number;
    description: string;
  }> = [
    {
      label: 'Fed Total Assets',
      ticker: 'WALCL',
      value: latest.walcl,
      prev: oneMonthAgo.walcl,
      description: 'Balance sheet (+)',
    },
    {
      label: 'Treasury General Acct',
      ticker: 'WTREGEN',
      value: latest.wtregen,
      prev: oneMonthAgo.wtregen,
      description: 'TGA drain (−)',
    },
    {
      label: 'Overnight Repo',
      ticker: 'RRPONTSYD',
      value: latest.rrpontsyd,
      prev: oneMonthAgo.rrpontsyd,
      description: 'RRP drain (−)',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {components.map((c) => (
        <GlassStat
          key={c.ticker}
          label={c.label}
          value={fmtCompactNoSign(c.value)}
          subValue={c.description}
          change={deltaPct(c.value, c.prev)}
        />
      ))}
    </div>
  );
});

// ─── Interactive MetricChart (recharts) ──────────────────────────────────────

const LiquidityMetricChart = memo(function LiquidityMetricChart() {
  const { data: seriesResp, isLoading } = useLiquiditySeries(365 * 5); // fetch 5Y for range pills

  const chartData = (seriesResp?.data ?? []).map((p: LiquidityPoint) => ({
    date: p.date,
    netLiquidity: p.netLiquidity / 1e9,
    walcl: p.walcl / 1e9,
    wtregen: p.wtregen / 1e9,
    rrpontsyd: p.rrpontsyd / 1e9,
  }));

  return (
    <Card className="w-full mb-6 p-4">
      <MetricChart
        title="Net Liquidity vs Components"
        data={chartData}
        lines={[
          { dataKey: 'netLiquidity', label: 'Net Liquidity', color: '#C9A646',               format: 'compactUSD' },
          { dataKey: 'walcl',        label: 'Fed Balance',   color: 'rgba(255,255,255,0.65)', format: 'compactUSD', strokeDasharray: '4 4' },
          { dataKey: 'wtregen',      label: 'TGA',           color: 'rgba(255,255,255,0.45)', format: 'compactUSD', strokeDasharray: '2 3' },
          { dataKey: 'rrpontsyd',    label: 'RRP',           color: 'rgba(255,255,255,0.45)', format: 'compactUSD', strokeDasharray: '6 2' },
        ]}
        showNBER
        showFOMC
        defaultRange="1Y"
        isLoading={isLoading}
      />
    </Card>
  );
});

// ─── Time Series Chart (SVG sparkline) ───────────────────────────────────────

const LiquidityChart = memo(function LiquidityChart() {
  const { data: seriesResp, isLoading, error, refetch } = useLiquiditySeries(365);

  if (isLoading) {
    return (
      <GlassCard className="animate-pulse">
        <div className="h-32 bg-white/[0.03] rounded-xl" />
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
        <p className="text-sm text-ink-tertiary">Liquidity data temporarily unavailable</p>
      </Card>
    );
  }

  const netValues = series.map((p: LiquidityPoint) => p.netLiquidity);
  const firstDate = series[0].date;
  const lastDate = series[series.length - 1].date;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">Net Liquidity — 12mo</p>
        </div>
        <p className="text-[11px] text-white/30">
          {firstDate} — {lastDate}
        </p>
      </div>
      <Sparkline
        data={netValues}
        width={600}
        height={64}
        className="w-full h-16"
      />
      <div className="flex justify-between mt-2">
        <span className="text-[11px] text-white/30 tabular-nums">
          {fmtCompactNoSign(netValues[0])}
        </span>
        <span className="text-[11px] text-white/30 tabular-nums">
          {fmtCompactNoSign(netValues[netValues.length - 1])}
        </span>
      </div>
    </GlassCard>
  );
});

// ─── Monthly Snapshot Table (fallback for series context) ─────────────────────

const MonthlyTable = memo(function MonthlyTable() {
  const { data: seriesResp, isLoading } = useLiquiditySeries(365);

  if (isLoading) return null;

  const series = seriesResp?.data ?? [];
  if (series.length === 0) return null;

  // Downsample to ~monthly (every 4th weekly point)
  const monthly = series.filter((_: LiquidityPoint, i: number) => i % 4 === 0).slice(-12);

  return (
    <Card padding="compact">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[540px]">
          <thead>
            <tr className="text-left border-b border-white/[0.06]">
              <th className="pb-2 pr-3 text-white/40 font-medium">Date</th>
              <th className="pb-2 pr-3 text-white/40 font-medium text-right">WALCL</th>
              <th className="pb-2 pr-3 text-white/40 font-medium text-right">WTREGEN</th>
              <th className="pb-2 pr-3 text-white/40 font-medium text-right">RRPONTSYD</th>
              <th className="pb-2 text-white/40 font-medium text-right">Net Liquidity</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((pt: LiquidityPoint) => (
              <tr
                key={pt.date}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-2 pr-3 text-white/60 tabular-nums">{pt.date}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-white/70">
                  {fmtCompactNoSign(pt.walcl)}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-red-400/70">
                  {fmtCompactNoSign(pt.wtregen)}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-red-400/70">
                  {fmtCompactNoSign(pt.rrpontsyd)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums font-semibold text-white/90">
                  {fmtCompactNoSign(pt.netLiquidity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

const Liquidity = memo(function Liquidity() {
  return (
    <PageTemplate
      title="Net Liquidity"
      description="Howell Net Liquidity = Fed Assets (WALCL) − Treasury General Account (WTREGEN) − Overnight Repo (RRPONTSYD)"
    >
      {/* MarketStatusBadge: FRED data is US-equity-linked (weekly Fed releases) */}
      <MarketStatusBadge hideWhenOpen className="mb-4" />

      <div className="space-y-6 pb-8">
        {/* AI Summary Card — top, full width */}
        <AiSummaryCard feature="liquidity" />

        {/* Interactive recharts MetricChart — Net Liquidity + components */}
        <LiquidityMetricChart />

        {/* Hero stat: Net Liquidity + MoM/YoY pills */}
        <LiquidityHero />

        {/* Section 1: Component breakdown */}
        <section>
          <SectionHeader
            title="Component Breakdown"
            subtitle="WALCL adds to liquidity; WTREGEN and RRPONTSYD drain it"
          />
          <ComponentCards />
        </section>

        {/* Section 2: Time series sparkline chart */}
        <section>
          <SectionHeader
            title="12-Month Trend"
            subtitle="Net Liquidity time series — weekly cadence (WALCL spine)"
          />
          <LiquidityChart />
        </section>

        {/* Section 3: Monthly snapshot table */}
        <section>
          <SectionHeader
            title="Monthly Snapshots"
            subtitle="Downsampled to ~monthly for readability"
          />
          <MonthlyTable />
        </section>
      </div>
    </PageTemplate>
  );
});

export default Liquidity;
