// ============================================================
// src/pages/app/stocks/_insiders/ManagersGrid.tsx
// Grid of institutional manager cards
// ============================================================

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@/pages/app/crypto/_shared/GlassUI';
import { SectionSpinner } from '@/components/ds/Spinner';
import { formatCompact } from '@/pages/app/crypto/_shared/formatters';
import type { Manager } from './hooks';
import { cn } from '@/lib/utils';

// ── ManagerCard ───────────────────────────────────────────────
const ManagerCard = memo(function ManagerCard({ manager }: { manager: Manager }) {
  const navigate = useNavigate();

  function handleClick() {
    navigate(`/app/stocks/insiders/${manager.slug}`);
  }

  return (
    <GlassCard
      padding="sm"
      hover
      onClick={handleClick}
      className="cursor-pointer transition-all duration-150 hover:border-white/[0.12]"
    >
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white/90 leading-tight truncate">
              {manager.name}
            </p>
            <p className="text-[10px] text-white/30 truncate mt-0.5">
              {manager.fundName}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-mono text-white/70 font-semibold">
              {formatCompact(manager.portfolioValueUsd)}
            </p>
            <p className="text-[10px] text-white/25 mt-0.5">
              {manager.holdingsCount} holdings
            </p>
          </div>
        </div>
      </div>

      {/* Top 3 holdings */}
      {manager.topHoldings.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {manager.topHoldings.slice(0, 3).map(h => (
            <span
              key={h.ticker}
              className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5"
            >
              <span className="text-[10px] font-semibold text-white/80">{h.ticker}</span>
              <span className="text-[10px] text-white/30 font-mono">
                {h.pctOfPortfolio.toFixed(1)}%
              </span>
            </span>
          ))}
        </div>
      )}

      {/* New buys / exits footer */}
      <div className="flex items-center gap-3 border-t border-white/[0.04] pt-2">
        {manager.newBuysCount > 0 && (
          <span className="text-[10px] text-emerald-400">
            +{manager.newBuysCount} new
          </span>
        )}
        {manager.soldOutCount > 0 && (
          <span className="text-[10px] text-red-400">
            -{manager.soldOutCount} exits
          </span>
        )}
        {manager.newBuysCount === 0 && manager.soldOutCount === 0 && (
          <span className="text-[10px] text-white/20">No changes</span>
        )}
      </div>
    </GlassCard>
  );
});

// ── ManagersGrid ───────────────────────────────────────────────
interface ManagersGridProps {
  managers: Manager[];
  loading: boolean;
  error: string | null;
}

export const ManagersGrid = memo(function ManagersGrid({
  managers,
  loading,
  error,
}: ManagersGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <SectionSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-[11px] text-white/25">Failed to load managers</p>
        <button
          onClick={() => window.location.reload()}
          className="text-[11px] text-white/40 border border-white/[0.08] rounded-lg px-3 py-1.5 hover:text-white/60 hover:border-white/[0.15] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!managers.length) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-[11px] text-white/25">
          Institutional data is being prepared. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-3',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      )}
    >
      {managers.map(m => (
        <ManagerCard key={m.cik} manager={m} />
      ))}
    </div>
  );
});
