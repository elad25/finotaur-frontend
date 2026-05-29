// src/pages/app/crypto/Stablecoins.tsx
// Stablecoins tab — supply growth, peg health, and top-3 dominance via DeFiLlama.
// Crypto is 24/7 — NO MarketStatusBadge.

import { memo } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { AiSummaryCard } from '@/components/ai-summary/AiSummaryCard';
import { MetricChart } from '@/components/macro/MetricChart';
import {
  useStablecoinsList,
  useStablecoinsHistory,
  type Stablecoin,
  type StablecoinHistoryPoint,
} from '@/hooks/crypto/useStablecoins';
import {
  GlassCard,
  GlassStat,
  SectionHeader,
  GlassStatSkeleton,
  GlassTableSkeleton,
  Sparkline,
} from './_shared/GlassUI';
import {
  formatCompact,
  formatPercent,
} from './_shared/formatters';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pctColor(n: number | null): string {
  if (n == null) return 'text-white/40';
  return n >= 0 ? 'text-emerald-400' : 'text-red-400';
}

function fmtPct(n: number | null): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function PegHealthBadge({ health }: { health: Stablecoin['pegHealth'] }) {
  const map = {
    healthy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    depeg:   'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const label = { healthy: 'Healthy', warning: 'Warning', depeg: 'Depeg' };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[health]}`}
    >
      {label[health]}
    </span>
  );
}


// ─── Hero: Total Cap Header ───────────────────────────────────────────────────

const TotalCapHeader = memo(function TotalCapHeader() {
  const { data: listResp, isLoading } = useStablecoinsList();

  const stablecoins = listResp?.data ?? [];
  const totalCirculating = stablecoins.reduce((sum, s) => sum + s.circulating, 0);

  // Aggregate weighted changes from top 20
  const totalPrev24h = stablecoins.reduce((sum, s) => {
    if (s.change24h == null) return sum;
    return sum + s.circulating / (1 + s.change24h / 100);
  }, 0);
  const totalPrev7d = stablecoins.reduce((sum, s) => {
    if (s.change7d == null) return sum;
    return sum + s.circulating / (1 + s.change7d / 100);
  }, 0);
  const totalPrev30d = stablecoins.reduce((sum, s) => {
    if (s.change30d == null) return sum;
    return sum + s.circulating / (1 + s.change30d / 100);
  }, 0);

  const change24h = totalPrev24h > 0 ? ((totalCirculating - totalPrev24h) / totalPrev24h) * 100 : null;
  const change7d  = totalPrev7d > 0  ? ((totalCirculating - totalPrev7d)  / totalPrev7d)  * 100 : null;
  const change30d = totalPrev30d > 0 ? ((totalCirculating - totalPrev30d) / totalPrev30d) * 100 : null;

  if (isLoading) {
    return (
      <div className="animate-pulse mb-6">
        <div className="h-4 w-40 bg-white/10 rounded mb-2" />
        <div className="h-10 w-52 bg-white/10 rounded mb-3" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-6 w-20 bg-white/10 rounded-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-1">
        Total Stablecoin Market Cap
      </p>
      <p className="text-3xl sm:text-4xl font-bold tabular-nums text-white/90 font-mono">
        {formatCompact(totalCirculating)}
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        {[
          { label: '24h', value: change24h },
          { label: '7d',  value: change7d  },
          { label: '30d', value: change30d  },
        ].map(({ label, value }) => (
          <span
            key={label}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/[0.06] border border-white/[0.08] ${pctColor(value)}`}
          >
            <span className="text-white/30">{label}</span>
            {fmtPct(value)}
          </span>
        ))}
      </div>
    </div>
  );
});

// ─── Interactive MetricChart — Total Supply time series ───────────────────────

const StablecoinMetricChart = memo(function StablecoinMetricChart() {
  const { data: histResp, isLoading, error } = useStablecoinsHistory(365 * 2); // 2Y for range pills

  // Map history points to MetricChart's expected data shape (values in billions)
  const chartData = (histResp?.data ?? []).map((pt: StablecoinHistoryPoint) => ({
    date: pt.date,
    totalCirculating: pt.totalCirculating / 1e9,
    usdt: pt.top3.usdt / 1e9,
    usdc: pt.top3.usdc / 1e9,
    dai:  pt.top3.dai  / 1e9,
  }));

  return (
    <Card className="w-full mb-6 p-4">
      <MetricChart
        title="Stablecoin Total Supply"
        data={chartData}
        lines={[
          { dataKey: 'totalCirculating', label: 'Total Supply', color: '#C9A646',                format: 'compactUSD' },
          { dataKey: 'usdt',             label: 'USDT',         color: 'rgba(255,255,255,0.7)',   format: 'compactUSD', strokeDasharray: '4 4' },
          { dataKey: 'usdc',             label: 'USDC',         color: 'rgba(255,255,255,0.5)',   format: 'compactUSD', strokeDasharray: '2 3' },
          { dataKey: 'dai',              label: 'DAI',          color: 'rgba(255,255,255,0.35)',  format: 'compactUSD', strokeDasharray: '6 2' },
        ]}
        showNBER={false}
        showFOMC={false}
        defaultRange="1Y"
        isLoading={isLoading || (error != null && chartData.length === 0)}
        height={320}
      />
    </Card>
  );
});

// ─── Section 1: History Sparkline ─────────────────────────────────────────────

const HistorySparkline = memo(function HistorySparkline() {
  const { data: histResp, isLoading, error, refetch } = useStablecoinsHistory(365);

  if (isLoading) {
    return (
      <GlassCard>
        <div className="animate-pulse">
          <div className="h-4 w-32 bg-white/10 rounded mb-4" />
          <div className="h-16 bg-white/[0.04] rounded" />
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-ink-tertiary">History data unavailable</p>
        <Button variant="goldOutline" size="compact" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const history: StablecoinHistoryPoint[] = histResp?.data ?? [];

  if (!history.length) {
    return (
      <Card>
        <p className="text-sm text-ink-tertiary">History data unavailable — try again shortly</p>
      </Card>
    );
  }

  const totals = history.map((pt) => pt.totalCirculating);
  const latest = totals[totals.length - 1] ?? 0;
  const oldest = totals[0] ?? 0;
  const ytdChange = oldest > 0 ? ((latest - oldest) / oldest) * 100 : null;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">365-day supply growth</p>
          {ytdChange != null && (
            <p className={`text-sm font-semibold mt-0.5 ${pctColor(ytdChange)}`}>
              {fmtPct(ytdChange)} year-over-year
            </p>
          )}
        </div>
        <p className="text-sm font-mono text-white/60">{formatCompact(latest)}</p>
      </div>
      {/* Full-width sparkline */}
      <Sparkline
        data={totals}
        width={600}
        height={60}
        className="w-full h-auto"
      />
    </GlassCard>
  );
});

// ─── Section 2: Top 20 Stablecoins Table ─────────────────────────────────────

const StablecoinsTable = memo(function StablecoinsTable() {
  const { data: listResp, isLoading, error, refetch } = useStablecoinsList();

  if (isLoading) {
    return (
      <Card>
        <GlassTableSkeleton rows={10} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-ink-tertiary">Stablecoin data unavailable</p>
        <Button variant="goldOutline" size="compact" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const stablecoins: Stablecoin[] = listResp?.data ?? [];

  if (!stablecoins.length) {
    return (
      <Card>
        <p className="text-sm text-ink-tertiary">Stablecoin data unavailable — try again shortly</p>
      </Card>
    );
  }

  return (
    <Card padding="compact">
      {/* Horizontally scrollable on mobile */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="text-left border-b border-white/[0.06]">
              <th className="pb-2 pr-3 text-white/40 font-medium w-8">#</th>
              <th className="pb-2 pr-3 text-white/40 font-medium">Symbol</th>
              <th className="pb-2 pr-3 text-white/40 font-medium">Name</th>
              <th className="pb-2 pr-3 text-white/40 font-medium">Peg Type</th>
              <th className="pb-2 pr-3 text-white/40 font-medium">Mechanism</th>
              <th className="pb-2 pr-3 text-white/40 font-medium text-right">Circulating</th>
              <th className="pb-2 pr-3 text-white/40 font-medium text-right">24h</th>
              <th className="pb-2 pr-3 text-white/40 font-medium text-right">7d</th>
              <th className="pb-2 pr-3 text-white/40 font-medium text-right">30d</th>
              <th className="pb-2 text-white/40 font-medium text-center">Peg Health</th>
            </tr>
          </thead>
          <tbody>
            {stablecoins.map((s, i) => (
              <tr
                key={s.id || s.symbol}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-2 pr-3 text-white/30 tabular-nums">{i + 1}</td>
                <td className="py-2 pr-3 font-mono font-semibold text-white/90 uppercase">
                  {s.symbol}
                </td>
                <td className="py-2 pr-3 text-white/70 truncate max-w-[120px]">{s.name}</td>
                <td className="py-2 pr-3 text-white/50 truncate max-w-[80px]">
                  {s.pegType || '—'}
                </td>
                <td className="py-2 pr-3 text-white/50 truncate max-w-[100px]">
                  {s.pegMechanism || '—'}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-white/80">
                  {formatCompact(s.circulating)}
                </td>
                <td className={`py-2 pr-3 text-right tabular-nums font-mono ${pctColor(s.change24h)}`}>
                  {fmtPct(s.change24h)}
                </td>
                <td className={`py-2 pr-3 text-right tabular-nums font-mono ${pctColor(s.change7d)}`}>
                  {fmtPct(s.change7d)}
                </td>
                <td className={`py-2 pr-3 text-right tabular-nums font-mono ${pctColor(s.change30d)}`}>
                  {fmtPct(s.change30d)}
                </td>
                <td className="py-2 text-center">
                  <PegHealthBadge health={s.pegHealth} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
});

// ─── Section 3: Top 3 Dominance ──────────────────────────────────────────────

const DominanceChart = memo(function DominanceChart() {
  const { data: listResp, isLoading, error } = useStablecoinsList();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => <GlassStatSkeleton key={i} />)}
      </div>
    );
  }

  if (error || !listResp?.data?.length) {
    return (
      <Card>
        <p className="text-sm text-ink-tertiary">Dominance data unavailable — try again shortly</p>
      </Card>
    );
  }

  const stablecoins: Stablecoin[] = listResp.data;
  const totalCirculating = stablecoins.reduce((sum, s) => sum + s.circulating, 0);

  // Find USDT, USDC, DAI by symbol (case-insensitive)
  const find = (sym: string) =>
    stablecoins.find((s) => s.symbol.toUpperCase() === sym) ?? null;

  const usdt = find('USDT');
  const usdc = find('USDC');
  const dai  = find('DAI');

  const entries = [
    { label: 'USDT',  coin: usdt,  color: 'text-emerald-400' },
    { label: 'USDC',  coin: usdc,  color: 'text-cyan-400'    },
    { label: 'DAI',   coin: dai,   color: 'text-amber-400'   },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {entries.map(({ label, coin, color }) => {
        const circ = coin?.circulating ?? 0;
        const share = totalCirculating > 0 ? (circ / totalCirculating) * 100 : 0;
        return (
          <GlassStat
            key={label}
            label={label}
            value={formatCompact(circ)}
            subValue={`${share.toFixed(1)}% of total`}
          />
        );
      })}
    </div>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

const Stablecoins = memo(function Stablecoins() {
  return (
    <PageTemplate
      title="Stablecoins"
      description="Circulating supply, peg health, and market dominance across top stablecoins"
    >
      <div className="space-y-6 pb-8">
        {/* AI Summary Card — top, full width */}
        <AiSummaryCard feature="stablecoins" />

        {/* Hero: Total stablecoin cap + change pills */}
        <TotalCapHeader />

        {/* Interactive MetricChart — total supply + top-3 breakdown over time */}
        <StablecoinMetricChart />

        {/* Section 1: Supply growth sparkline */}
        <section>
          <SectionHeader
            title="Supply Growth"
            subtitle="Total stablecoin circulating supply — last 365 days"
          />
          <HistorySparkline />
        </section>

        {/* Section 2: Top 20 table */}
        <section>
          <SectionHeader
            title="Top 20 Stablecoins"
            subtitle="Ranked by circulating supply — peg health computed from live price"
          />
          <StablecoinsTable />
        </section>

        {/* Section 3: Top 3 dominance */}
        <section>
          <SectionHeader
            title="Top 3 Dominance"
            subtitle="USDT vs USDC vs DAI — relative share of total stablecoin supply"
          />
          <DominanceChart />
        </section>
      </div>
    </PageTemplate>
  );
});

export default Stablecoins;
