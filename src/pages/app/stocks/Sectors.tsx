// src/pages/app/stocks/Sectors.tsx
// Sector ETF overview — live snapshots from /api/sectors (cached Polygon proxy).
// Mirrors the macro/Liquidity page pattern: TanStack Query + GlassUI primitives.

import { memo, useState } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { MarketStatusBadge } from '@/components/ai-arena/MarketStatusBadge';
import {
  GlassCard,
  GlassStatSkeleton,
  SectionHeader,
} from '../crypto/_shared/GlassUI';
import { useSectors, type SectorItem } from '@/hooks/stocks/useSectors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pctColor(n: number): string {
  return n >= 0 ? 'text-emerald-400' : 'text-red-400';
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function fmtPrice(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtVolume(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ─── Sector Card ─────────────────────────────────────────────────────────────

const SectorCard = memo(function SectorCard({ sector }: { sector: SectorItem }) {
  const isPositive = sector.changePercent >= 0;
  const barWidth = Math.min(Math.abs(sector.changePercent) * 12, 100);

  return (
    <GlassCard hover className="min-w-0">
      {/* Header row: name + symbol */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/90 truncate leading-tight">
            {sector.name}
          </p>
          <p className="text-[11px] uppercase tracking-wider text-white/30 font-mono mt-0.5">
            {sector.symbol}
          </p>
        </div>
        {/* Change badge */}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
            isPositive
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/15 text-red-400 border border-red-500/20'
          }`}
        >
          {fmtPct(sector.changePercent)}
        </span>
      </div>

      {/* Price row */}
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <p className="text-2xl font-bold font-mono tabular-nums text-white/90">
          {fmtPrice(sector.price)}
        </p>
        <p className={`text-sm font-mono tabular-nums ${pctColor(sector.changePercent)}`}>
          {sector.change >= 0 ? '+' : ''}{sector.change.toFixed(2)}
        </p>
      </div>

      {/* Change bar */}
      <div className="h-1.5 w-full rounded-full bg-white/[0.06] mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isPositive ? 'bg-emerald-400/60' : 'bg-red-400/60'
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Volume</p>
          <p className="text-xs font-mono tabular-nums text-white/60">
            {fmtVolume(sector.volume)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Prev Close</p>
          <p className="text-xs font-mono tabular-nums text-white/60">
            {fmtPrice(sector.previousClose)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Low</p>
          <p className="text-xs font-mono tabular-nums text-white/60">
            {fmtPrice(sector.low)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider">High</p>
          <p className="text-xs font-mono tabular-nums text-white/60">
            {fmtPrice(sector.high)}
          </p>
        </div>
      </div>
    </GlassCard>
  );
});

// ─── Skeleton grid ────────────────────────────────────────────────────────────

const SectorsSkeleton = memo(function SectorsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 11 }).map((_, i) => (
        <GlassStatSkeleton key={i} />
      ))}
    </div>
  );
});

// ─── Sortable grid ────────────────────────────────────────────────────────────

type SortKey = 'changePercent' | 'price' | 'volume' | 'name';
type SortDir = 'asc' | 'desc';

const SectorsGrid = memo(function SectorsGrid() {
  const { data, isLoading, error, refetch } = useSectors();
  const [sortKey, setSortKey] = useState<SortKey>('changePercent');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  if (isLoading) return <SectorsSkeleton />;

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-ink-tertiary">Sector data unavailable</p>
        <Button variant="goldOutline" size="compact" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!data || data.sectors.length === 0) {
    return (
      <Card>
        <p className="text-sm text-ink-tertiary">No sector data available</p>
      </Card>
    );
  }

  const sorted = [...data.sectors].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    const an = av as number;
    const bn = bv as number;
    return sortDir === 'asc' ? an - bn : bn - an;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sortLabel: Record<SortKey, string> = {
    changePercent: '% Change',
    price: 'Price',
    volume: 'Volume',
    name: 'Name',
  };

  return (
    <div>
      {/* Sort controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-white/30 uppercase tracking-wider">Sort by:</span>
        {(['changePercent', 'price', 'volume', 'name'] as const).map((key) => (
          <button
            key={key}
            onClick={() => toggleSort(key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              sortKey === key
                ? 'bg-white/10 text-white/90'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
            }`}
          >
            {sortLabel[key]}
            {sortKey === key && (
              <span className="ml-1 opacity-60">{sortDir === 'desc' ? '↓' : '↑'}</span>
            )}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map((sector) => (
          <SectorCard key={sector.symbol} sector={sector} />
        ))}
      </div>
    </div>
  );
});

// ─── Leader / Laggard bar ─────────────────────────────────────────────────────

const PerformanceBar = memo(function PerformanceBar() {
  const { data, isLoading } = useSectors();

  if (isLoading || !data) return null;

  const sorted = [...data.sectors].sort(
    (a, b) => b.changePercent - a.changePercent
  );
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Leader */}
      <GlassCard glow="emerald" padding="sm">
        <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">
          Top Performer
        </p>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-white/90">{best.name}</p>
          <p className="text-lg font-bold font-mono text-emerald-400">
            {fmtPct(best.changePercent)}
          </p>
        </div>
        <p className="text-xs font-mono text-white/40 mt-0.5">{best.symbol}</p>
      </GlassCard>

      {/* Laggard */}
      <GlassCard glow="red" padding="sm">
        <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">
          Weakest Sector
        </p>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-white/90">{worst.name}</p>
          <p className="text-lg font-bold font-mono text-red-400">
            {fmtPct(worst.changePercent)}
          </p>
        </div>
        <p className="text-xs font-mono text-white/40 mt-0.5">{worst.symbol}</p>
      </GlassCard>
    </div>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

const StocksSectors = memo(function StocksSectors() {
  return (
    <PageTemplate
      title="Sector Analysis"
      description="Performance and trends across market sectors via SPDR ETFs."
    >
      {/* Market status badge — sector ETFs are US equity */}
      <MarketStatusBadge hideWhenOpen className="mb-4" />

      <div className="space-y-6 pb-8">
        {/* Leader / laggard summary */}
        <section>
          <SectionHeader
            title="Today's Leaders"
            subtitle="Best and worst performing sectors this session"
          />
          <PerformanceBar />
        </section>

        {/* Full sector grid */}
        <section>
          <SectionHeader
            title="All Sectors"
            subtitle="SPDR sector ETFs — live session data"
          />
          <SectorsGrid />
        </section>

        {/* Attribution */}
        <p className="text-[11px] text-white/20 text-center pt-2">
          Market data may be delayed · Powered by Polygon.io
        </p>
      </div>
    </PageTemplate>
  );
});

export default StocksSectors;
