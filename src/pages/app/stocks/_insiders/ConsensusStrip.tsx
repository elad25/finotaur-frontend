// ============================================================
// src/pages/app/stocks/_insiders/ConsensusStrip.tsx
// Top consensus strip: Most Bought / Most Sold this quarter
// ============================================================

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@/pages/app/crypto/_shared/GlassUI';
import { SectionSpinner } from '@/components/ds/Spinner';
import { formatCompact } from '@/pages/app/crypto/_shared/formatters';
import { useInstitutionalConsensus } from './hooks';
import type { ConsensusTicker } from './hooks';
import { cn } from '@/lib/utils';

// ── Ticker chip ───────────────────────────────────────────────
const TickerChip = memo(function TickerChip({
  item,
  variant,
}: {
  item: ConsensusTicker;
  variant: 'bought' | 'sold';
}) {
  const navigate = useNavigate();

  function handleClick() {
    navigate(`/app/ai/stock-analyzer?symbol=${item.ticker}`);
  }

  const countLabel = variant === 'bought' ? item.buyersCount : item.sellersCount;

  return (
    <button
      onClick={handleClick}
      className="group flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 hover:border-white/[0.15] hover:bg-white/[0.06] transition-all duration-150"
    >
      <div className="text-left min-w-0">
        <span className="block text-xs font-semibold text-white/90 group-hover:text-white transition-colors">
          {item.ticker}
        </span>
        <span className="block text-[10px] text-white/30 truncate max-w-[90px]">
          {item.issuerName}
        </span>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {countLabel != null && (
          <span
            className={cn(
              'text-[10px] font-mono px-1.5 py-0.5 rounded-md font-semibold',
              variant === 'bought'
                ? 'bg-emerald-400/10 text-emerald-400'
                : 'bg-red-400/10 text-red-400',
            )}
          >
            {countLabel} {variant === 'bought' ? 'buy' : 'sell'}
          </span>
        )}
        <span className="text-[10px] text-white/25 font-mono">
          {formatCompact(item.totalValueUsd)}
        </span>
      </div>
    </button>
  );
});

// ── Panel ─────────────────────────────────────────────────────
const Panel = memo(function Panel({
  title,
  items,
  variant,
}: {
  title: string;
  items: ConsensusTicker[];
  variant: 'bought' | 'sold';
}) {
  return (
    <GlassCard padding="sm" className="flex-1 min-w-0">
      <div className="mb-3">
        <span
          className={cn(
            'text-[10px] uppercase tracking-wider font-medium',
            variant === 'bought' ? 'text-emerald-400' : 'text-red-400',
          )}
        >
          {title}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-white/20 text-center py-4">No data available</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.slice(0, 8).map(item => (
            <TickerChip key={item.ticker} item={item} variant={variant} />
          ))}
        </div>
      )}
    </GlassCard>
  );
});

// ── ConsensusStrip ─────────────────────────────────────────────
export const ConsensusStrip = memo(function ConsensusStrip() {
  const { data, loading, error } = useInstitutionalConsensus();

  if (loading) {
    return (
      <div className="flex gap-3">
        <GlassCard padding="sm" className="flex-1">
          <SectionSpinner />
        </GlassCard>
        <GlassCard padding="sm" className="flex-1">
          <SectionSpinner />
        </GlassCard>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex gap-3">
        <GlassCard padding="sm" className="flex-1">
          <p className="text-[11px] text-white/20 text-center py-4">
            Institutional data is being prepared. Check back soon.
          </p>
        </GlassCard>
        <GlassCard padding="sm" className="flex-1">
          <p className="text-[11px] text-white/20 text-center py-4">
            Institutional data is being prepared. Check back soon.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-3">
      <Panel title="Most Bought This Quarter" items={data.mostBought} variant="bought" />
      <Panel title="Most Sold This Quarter" items={data.mostSold} variant="sold" />
    </div>
  );
});
