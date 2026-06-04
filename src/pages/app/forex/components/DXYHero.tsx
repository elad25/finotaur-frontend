// ============================================================
// DXYHero.tsx
// Hero card for the U.S. Dollar Index (DXY).
// Calls useDXYSeries('1m') internally; renders latest close
// value + a sparkline of the full series.
// ============================================================

import { memo, useMemo } from 'react';
import { useDXYSeries } from '@/pages/app/forex/_shared/hooks';
import {
  GlassCard,
  Sparkline,
  EmptyState,
  GlassStatSkeleton,
} from '@/pages/app/crypto/_shared/GlassUI';

/** Format a DXY value to 3 decimal places. */
function formatDXY(value: number): string {
  return value.toFixed(3);
}

/** Signed change from series first to last close, formatted with U+2212 for negatives. */
function seriesChange(points: { c: number }[]): { abs: string; pct: string; up: boolean } | null {
  if (points.length < 2) return null;
  const first = points[0].c;
  const last = points[points.length - 1].c;
  const diff = last - first;
  const pct = (diff / first) * 100;
  const up = diff >= 0;
  const sign = up ? '+' : '−';
  return {
    abs: `${sign}${Math.abs(diff).toFixed(3)}`,
    pct: `${sign}${Math.abs(pct).toFixed(2)}%`,
    up,
  };
}

const DXYHero = memo(function DXYHero() {
  const { data, loading } = useDXYSeries('1m');

  const sparkData = useMemo(
    () => data?.points.map((p) => p.c) ?? [],
    [data],
  );

  const latest = data?.points.at(-1)?.c;
  const change = data ? seriesChange(data.points) : null;

  if (loading) {
    return (
      <GlassCard
        padding="lg"
        glow="amber"
        className="shadow-[0_0_60px_rgba(251,191,36,0.08)]"
      >
        <GlassStatSkeleton />
      </GlassCard>
    );
  }

  if (!data || data.points.length === 0) {
    return (
      <GlassCard padding="lg" glow="amber">
        <EmptyState
          icon="📊"
          title="DXY data unavailable"
          description="The U.S. Dollar Index series could not be loaded."
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard
      padding="lg"
      glow="amber"
      className="shadow-[0_0_60px_rgba(251,191,36,0.1)]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: label + value + change */}
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-widest text-amber-400/70 font-medium">
            U.S. Dollar Index
          </p>
          <p className="text-[11px] uppercase tracking-wider text-white/30 font-medium -mt-0.5">
            DXY — 1-Month Series
          </p>

          {latest !== undefined && (
            <p className="text-4xl sm:text-5xl font-bold font-mono text-white/95 leading-none mt-2">
              {formatDXY(latest)}
            </p>
          )}

          {change && (
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-sm font-mono font-semibold ${
                  change.up ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {change.abs}
              </span>
              <span
                className={`text-sm font-mono font-semibold ${
                  change.up ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                ({change.pct})
              </span>
              <span className="text-[11px] text-white/30">vs. 1 month ago</span>
            </div>
          )}
        </div>

        {/* Right: sparkline */}
        {sparkData.length >= 2 && (
          <div className="flex-shrink-0">
            <Sparkline
              data={sparkData}
              width={220}
              height={60}
              color={change?.up ? '#34d399' : '#f87171'}
            />
          </div>
        )}
      </div>
    </GlassCard>
  );
});

export default DXYHero;
