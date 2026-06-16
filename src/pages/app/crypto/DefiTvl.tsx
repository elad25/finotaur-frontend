// src/pages/app/crypto/DefiTvl.tsx
// DeFi TVL tab — chains, top protocols, and yields screener via DeFiLlama.
// Crypto is 24/7 — NO MarketStatusBadge.

import { memo } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { AiSummaryCard } from '@/components/ai-summary/AiSummaryCard';
import {
  useDefiSummary,
  useDefiProtocols,
  useDefiYields,
} from '@/hooks/crypto/useDefiTvl';
import {
  GlassStat,
  SectionHeader,
  GlassStatSkeleton,
  GlassTableSkeleton,
} from './_shared/GlassUI';
import { Skeleton } from '@/components/ds/Skeleton';
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


// ─── TVL by Chain Grid ────────────────────────────────────────────────────────

const ChainGrid = memo(function ChainGrid() {
  const { data: summary, isLoading, error, refetch } = useDefiSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <GlassStatSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-ink-tertiary">Chain data unavailable</p>
        <Button variant="goldOutline" size="compact" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!summary?.chains?.length) {
    return (
      <Card>
        <p className="text-sm text-ink-tertiary">DeFi data unavailable — try again shortly</p>
      </Card>
    );
  }

  const top10 = summary.chains.slice(0, 10);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {top10.map((chain) => (
        <GlassStat
          key={chain.name}
          label={chain.name}
          value={formatCompact(chain.tvl)}
        />
      ))}
    </div>
  );
});

// ─── Top Protocols Table ──────────────────────────────────────────────────────

const ProtocolsTable = memo(function ProtocolsTable() {
  const { data: protocols, isLoading, error, refetch } = useDefiProtocols(50);

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
        <p className="text-sm text-ink-tertiary">Protocol data unavailable</p>
        <Button variant="goldOutline" size="compact" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!protocols?.length) {
    return (
      <Card>
        <p className="text-sm text-ink-tertiary">DeFi data unavailable — try again shortly</p>
      </Card>
    );
  }

  return (
    <Card padding="compact">
      {/* Horizontally scrollable on mobile */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="text-left border-b border-white/[0.06]">
              <th className="pb-2 pr-3 text-white/40 font-medium w-8">#</th>
              <th className="pb-2 pr-3 text-white/40 font-medium">Name</th>
              <th className="pb-2 pr-3 text-white/40 font-medium">Chain</th>
              <th className="pb-2 pr-3 text-white/40 font-medium">Category</th>
              <th className="pb-2 pr-3 text-white/40 font-medium text-right">TVL</th>
              <th className="pb-2 pr-3 text-white/40 font-medium text-right">1d %</th>
              <th className="pb-2 text-white/40 font-medium text-right">7d %</th>
            </tr>
          </thead>
          <tbody>
            {protocols.map((p, i) => (
              <tr
                key={p.slug || p.name}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-2 pr-3 text-white/30 tabular-nums">{i + 1}</td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    {p.logo && (
                      <img
                        src={p.logo}
                        alt=""
                        className="w-5 h-5 rounded-full flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <span className="text-white/90 font-medium truncate max-w-[120px]">
                      {p.name}
                    </span>
                  </div>
                </td>
                <td className="py-2 pr-3 text-white/50 truncate max-w-[80px]">{p.chain || '—'}</td>
                <td className="py-2 pr-3 text-white/50 truncate max-w-[100px]">
                  {p.category || '—'}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-white/80">
                  {formatCompact(p.tvl)}
                </td>
                <td className={`py-2 pr-3 text-right tabular-nums font-mono ${pctColor(p.change_1d)}`}>
                  {fmtPct(p.change_1d)}
                </td>
                <td className={`py-2 text-right tabular-nums font-mono ${pctColor(p.change_7d)}`}>
                  {fmtPct(p.change_7d)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
});

// ─── Yields Screener ──────────────────────────────────────────────────────────

const YieldsTable = memo(function YieldsTable() {
  const { data: pools, isLoading, error, refetch } = useDefiYields(50);

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
        <p className="text-sm text-ink-tertiary">Yield data unavailable</p>
        <Button variant="goldOutline" size="compact" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!pools?.length) {
    return (
      <Card>
        <p className="text-sm text-ink-tertiary">DeFi data unavailable — try again shortly</p>
      </Card>
    );
  }

  return (
    <Card padding="compact">
      {/* Horizontally scrollable on mobile */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[680px]">
          <thead>
            <tr className="text-left border-b border-white/[0.06]">
              <th className="pb-2 pr-3 text-white/40 font-medium">Project</th>
              <th className="pb-2 pr-3 text-white/40 font-medium">Chain</th>
              <th className="pb-2 pr-3 text-white/40 font-medium">Symbol</th>
              <th className="pb-2 pr-3 text-white/40 font-medium text-right">TVL</th>
              <th className="pb-2 pr-3 text-white/40 font-medium text-right">APY base</th>
              <th className="pb-2 pr-3 text-white/40 font-medium text-right">APY reward</th>
              <th className="pb-2 text-white/40 font-medium text-right">APY total</th>
            </tr>
          </thead>
          <tbody>
            {pools.map((p) => (
              <tr
                key={p.pool}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-2 pr-3 text-white/90 font-medium truncate max-w-[120px]">
                  {p.project}
                </td>
                <td className="py-2 pr-3 text-white/50 truncate max-w-[80px]">{p.chain}</td>
                <td className="py-2 pr-3 text-white/70 font-mono uppercase truncate max-w-[80px]">
                  {p.symbol}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-white/80">
                  {formatCompact(p.tvlUsd)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums font-mono text-white/70">
                  {p.apyBase != null ? formatPercent(p.apyBase) : '—'}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums font-mono text-emerald-400">
                  {p.apyReward != null ? formatPercent(p.apyReward) : '—'}
                </td>
                <td className="py-2 text-right tabular-nums font-mono font-semibold text-white/90">
                  {formatPercent(p.apy)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
});

// ─── Total TVL Header ─────────────────────────────────────────────────────────

const TvlHeader = memo(function TvlHeader() {
  const { data: summary, isLoading } = useDefiSummary();

  if (isLoading) {
    return (
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-1">
        Total DeFi TVL
      </p>
      <p className="text-3xl sm:text-4xl font-bold tabular-nums text-white/90 font-mono">
        {formatCompact(summary?.totalTvl)}
      </p>
      {summary?.dominantChain && (
        <p className="text-sm text-white/50 mt-1">
          {summary.dominantChain.name} leads —{' '}
          {formatCompact(summary.dominantChain.tvl)}
        </p>
      )}
    </div>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

const DefiTvl = memo(function DefiTvl() {
  return (
    <PageTemplate
      title="DeFi TVL"
      description="Total value locked across chains, protocols, and yield opportunities"
      centered
    >
      <div className="space-y-6 pb-8">
        {/* AI Summary Card — top, full width */}
        <AiSummaryCard feature="defi-tvl" />

        {/* Total TVL Header */}
        <TvlHeader />

        {/* Section 1: TVL by Chain */}
        <section>
          <SectionHeader
            title="TVL by Chain"
            subtitle="Top 10 chains by total value locked"
          />
          <ChainGrid />
        </section>

        {/* Section 2: Top 50 Protocols */}
        <section>
          <SectionHeader
            title="Top Protocols"
            subtitle="Top 50 DeFi protocols by TVL"
          />
          <ProtocolsTable />
        </section>

        {/* Section 3: Yields Screener */}
        <section>
          <SectionHeader
            title="Yields Screener"
            subtitle="Top pools by TVL — APY < 100% filter applied"
          />
          <YieldsTable />
        </section>
      </div>
    </PageTemplate>
  );
});

export default DefiTvl;
