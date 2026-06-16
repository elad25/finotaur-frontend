// src/pages/app/crypto/Heatmap.tsx
// Crypto Heatmap — top 100 coins, tile sized by market cap, colored by 24h change.
// Crypto is 24/7 — NO MarketStatusBadge.
// No external treemap library — plain CSS flex-wrap with computed flex-grow.

import { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTemplate } from '@/components/PageTemplate';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { useHeatmap, type HeatmapCoin } from '@/hooks/crypto/useHeatmap';
import { formatCompact } from './_shared/formatters';
import { SectionHeader } from './_shared/GlassUI';
import { AiSummaryCard } from '@/components/ai-summary/AiSummaryCard';
import { Skeleton } from '@/components/ds/Skeleton';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map a 24h price change to a background color class. */
function tileColor(change: number | null): string {
  if (change == null) return 'bg-white/[0.06]';
  const abs = Math.abs(change);
  if (change > 0) {
    if (abs >= 10) return 'bg-emerald-500/70';
    if (abs >= 5)  return 'bg-emerald-500/50';
    if (abs >= 2)  return 'bg-emerald-500/30';
    if (abs >= 1)  return 'bg-emerald-500/20';
    return 'bg-emerald-500/10';
  } else {
    if (abs >= 10) return 'bg-red-500/70';
    if (abs >= 5)  return 'bg-red-500/50';
    if (abs >= 2)  return 'bg-red-500/30';
    if (abs >= 1)  return 'bg-red-500/20';
    return 'bg-red-500/10';
  }
}

function fmtPct(n: number | null): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function pctTextColor(n: number | null): string {
  if (n == null) return 'text-white/40';
  return n >= 0 ? 'text-emerald-300' : 'text-red-300';
}

// ─── Category Filter ─────────────────────────────────────────────────────────
// TODO(wave-2): wire real category filtering once category field is present in
// coin data returned by /api/crypto/overview. For now only "All" is active.

type Category = 'All';
const CATEGORIES: Category[] = ['All'];


// ─── Top Stats Bar ────────────────────────────────────────────────────────────

const TopStatsBar = memo(function TopStatsBar({
  totalMcap,
  gainers,
  losers,
  isLoading,
}: {
  totalMcap: number;
  gainers: number;
  losers: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-52" />
        <div className="flex gap-2 pt-1">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-6 w-24 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-1">
        Total Crypto Market Cap
      </p>
      <p className="text-3xl sm:text-4xl font-bold tabular-nums text-white/90 font-mono">
        {formatCompact(totalMcap)}
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          {gainers} gainers
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
          {losers} losers
        </span>
      </div>
    </div>
  );
});

// ─── Heatmap Tile ─────────────────────────────────────────────────────────────

interface TileProps {
  coin: HeatmapCoin;
  totalMcap: number;
  onClick: (id: string) => void;
}

const HeatmapTile = memo(function HeatmapTile({ coin, totalMcap, onClick }: TileProps) {
  // flex-grow proportional to market cap — clamp so smallest coins remain visible
  const share = totalMcap > 0 ? (coin.market_cap / totalMcap) * 10000 : 1;
  const flexGrow = Math.max(share, 8); // min 8 so tiny coins still show

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(coin.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(coin.id); }}
      className={[
        'flex flex-col items-center justify-center',
        'rounded-xl border border-white/[0.06]',
        'cursor-pointer select-none',
        'transition-all duration-150',
        'hover:brightness-125 hover:border-white/[0.15] hover:scale-[1.02]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/30',
        'min-w-[56px] min-h-[48px] p-1.5 sm:p-2',
        tileColor(coin.price_change_percentage_24h),
      ].join(' ')}
      style={{ flexGrow }}
      title={`${coin.name} — ${fmtPct(coin.price_change_percentage_24h)}`}
    >
      <span className="text-[11px] sm:text-xs font-bold text-white/90 uppercase leading-tight tracking-wide truncate max-w-full">
        {coin.symbol.toUpperCase()}
      </span>
      <span className={`text-[9px] sm:text-[10px] font-mono leading-tight ${pctTextColor(coin.price_change_percentage_24h)}`}>
        {fmtPct(coin.price_change_percentage_24h)}
      </span>
    </div>
  );
});

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

const HeatmapSkeleton = memo(function HeatmapSkeleton() {
  return (
    <div className="flex flex-wrap gap-1.5 animate-pulse" aria-label="Loading heatmap">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-white/[0.05] min-w-[56px] min-h-[48px]"
          style={{ flexGrow: Math.max(1, Math.random() * 20) }}
        />
      ))}
    </div>
  );
});

// ─── Main Heatmap Grid ────────────────────────────────────────────────────────

const HeatmapGrid = memo(function HeatmapGrid() {
  const navigate = useNavigate();
  const { coins, totalMcap, gainers, losers, isLoading, isError, refetch } = useHeatmap(100);

  // TODO(wave-2): wire category filter when CoinGecko categories field available
  const [_activeCategory] = useState<Category>('All');

  const visibleCoins = useMemo(() => {
    // Currently all categories map to full list — category field not yet in API response
    return coins;
  }, [coins]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <TopStatsBar totalMcap={0} gainers={0} losers={0} isLoading />
        <Card>
          <HeatmapSkeleton />
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-ink-tertiary">Heatmap data unavailable</p>
        <Button variant="goldOutline" size="compact" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!visibleCoins.length) {
    return (
      <Card>
        <p className="text-sm text-ink-tertiary">No coin data available — try again shortly</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <TopStatsBar
        totalMcap={totalMcap}
        gainers={gainers}
        losers={losers}
        isLoading={false}
      />

      {/* Category filter pills */}
      {/* TODO(wave-2): enable multi-category when CoinGecko categories field wired */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <span
            key={cat}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gold-primary/20 border border-gold-primary/30 text-gold-primary cursor-default"
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Treemap — flex-wrap with flex-grow proportional to market cap */}
      <Card padding="compact">
        <div
          className="flex flex-wrap gap-1 sm:gap-1.5 content-start"
          role="grid"
          aria-label="Crypto heatmap — top 100 coins by market cap"
        >
          {visibleCoins.map((coin) => (
            <HeatmapTile
              key={coin.id}
              coin={coin}
              totalMcap={totalMcap}
              onClick={(id) => navigate(`/app/crypto/coin/${id}`)}
            />
          ))}
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/40 px-1">
        <span className="font-medium text-white/50">Change:</span>
        {[
          { label: '>+10%',  cls: 'bg-emerald-500/70' },
          { label: '+5%',    cls: 'bg-emerald-500/40' },
          { label: '+1%',    cls: 'bg-emerald-500/20' },
          { label: 'Flat',   cls: 'bg-white/[0.06]'   },
          { label: '-1%',    cls: 'bg-red-500/20'     },
          { label: '-5%',    cls: 'bg-red-500/40'     },
          { label: '>-10%',  cls: 'bg-red-500/70'     },
        ].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={`inline-block w-3 h-3 rounded ${cls} border border-white/[0.06]`} />
            {label}
          </span>
        ))}
        <span className="ml-auto">Tile size = market cap. Click tile to open coin page.</span>
      </div>
    </div>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

const Heatmap = memo(function Heatmap() {
  return (
    <PageTemplate
      title="Crypto Heatmap"
      description="Top 100 cryptocurrencies — tile size proportional to market cap, color by 24h change"
      centered
    >
      <div className="space-y-6 pb-8">
        {/* AI Summary Card — top, full width */}
        <AiSummaryCard feature="heatmap" />

        {/* Main treemap section */}
        <section>
          <SectionHeader
            title="Market Heatmap"
            subtitle="Top 100 coins by market cap — color intensity reflects 24h price change magnitude"
          />
          <HeatmapGrid />
        </section>
      </div>
    </PageTemplate>
  );
});

export default Heatmap;
