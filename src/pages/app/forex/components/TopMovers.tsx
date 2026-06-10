// ============================================================
// TopMovers.tsx
// Two-column display of today's top FX gainers and losers.
// Pair symbols formatted as "EUR/USD". Negative %change uses
// U+2212 (−) instead of a hyphen.
// ============================================================

import { memo } from 'react';
import type { ForexMoversResponse, ForexMover } from '@/pages/app/forex/_shared/types';
import { GlassCard, SectionHeader, GlassTableSkeleton } from '@/pages/app/crypto/_shared/GlassUI';

interface TopMoversProps {
  data: ForexMoversResponse | undefined;
  loading: boolean;
}

/** Format "EURUSD" → "EUR/USD". Falls back to the raw symbol if format is unexpected. */
function formatPairSymbol(symbol: string): string {
  // Standard 6-char FX symbols
  if (symbol.length === 6 && !symbol.includes('/')) {
    return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  }
  return symbol;
}

/** Format a percent change with U+2212 for negatives and 2 decimal places. */
function formatChp(chp: number): string {
  const abs = Math.abs(chp).toFixed(2);
  return chp >= 0 ? `+${abs}%` : `−${abs}%`;
}

/** Format a price to a reasonable number of decimal places for FX. */
function formatFxPrice(price: number): string {
  if (price >= 100) return price.toFixed(2);
  if (price >= 1)   return price.toFixed(4);
  return price.toFixed(5);
}

interface MoverRowProps {
  mover: ForexMover;
}

const MoverRow = memo(function MoverRow({ mover }: MoverRowProps) {
  const isUp = mover.chp >= 0;
  const changeColor = isUp ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
      <span className="text-xs text-white/80 font-mono font-medium">
        {formatPairSymbol(mover.symbol)}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-white/50 font-mono hidden sm:inline">
          {formatFxPrice(mover.price)}
        </span>
        <span className={`text-xs font-mono font-semibold ${changeColor}`}>
          {formatChp(mover.chp)}
        </span>
      </div>
    </div>
  );
});

const MoverColumn = memo(function MoverColumn({
  title,
  glow,
  movers,
}: {
  title: string;
  glow: 'emerald' | 'red';
  movers: ForexMover[];
}) {
  return (
    <GlassCard padding="sm" glow={glow}>
      <SectionHeader title={title} />
      {movers.length === 0 ? (
        <p className="text-xs text-white/30 text-center py-4">No data</p>
      ) : (
        <div>
          {movers.map((m) => (
            <MoverRow key={m.symbol} mover={m} />
          ))}
        </div>
      )}
    </GlassCard>
  );
});

const TopMovers = memo(function TopMovers({ data, loading }: TopMoversProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <GlassCard padding="sm">
          <SectionHeader title="Top Gainers" />
          <GlassTableSkeleton rows={5} />
        </GlassCard>
        <GlassCard padding="sm">
          <SectionHeader title="Top Losers" />
          <GlassTableSkeleton rows={5} />
        </GlassCard>
      </div>
    );
  }

  const gainers = data?.gainers ?? [];
  const losers = data?.losers ?? [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <MoverColumn title="Top Gainers" glow="emerald" movers={gainers} />
      <MoverColumn title="Top Losers"  glow="red"     movers={losers}  />
    </div>
  );
});

export default TopMovers;
