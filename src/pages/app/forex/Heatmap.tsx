// ============================================================
// src/pages/app/forex/Heatmap.tsx
// FOREX Currency Heatmap — 8×8 base/quote grid showing %chg
// Emerald-400 (positive) → red-400 (negative) by intensity.
// ============================================================

import { memo, useMemo, useState } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { useForexHeatmap } from './_shared/hooks';
import { GlassCard, GlassTableSkeleton, EmptyState } from '@/pages/app/crypto/_shared/GlassUI';
import type { ForexStrengthPair } from './_shared/types';
import { cn } from '@/lib/utils';

const MAJORS = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'NZD'] as const;
type Major = typeof MAJORS[number];

// ── Build a lookup: "BASE/QUOTE" → chp ──────────────────────
function buildMatrix(pairs: ForexStrengthPair[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const p of pairs) {
    const base = p.base.toUpperCase();
    const quote = p.quote.toUpperCase();
    map[`${base}/${quote}`] = p.chp;
    // Also store the inverse so any base×quote lookup works
    map[`${quote}/${base}`] = -p.chp;
  }
  return map;
}

// ── Cell background — opacity scaled by |chp| up to 2 % ─────
function cellBg(chp: number): string {
  const intensity = Math.min(1, Math.abs(chp) / 2);
  const alpha = Math.round(intensity * 220); // 0–220 range
  const hex = alpha.toString(16).padStart(2, '0');
  return chp > 0
    ? `rgba(52,211,153,${(alpha / 255).toFixed(2)})`   // emerald-400
    : `rgba(248,113,113,${(alpha / 255).toFixed(2)})`; // red-400
}

// ── Format a chp value for the cell label ───────────────────
function fmt(chp: number): string {
  const abs = Math.abs(chp).toFixed(2);
  return chp >= 0 ? `+${abs}` : `−${abs}`;
}

// ── Single cell ──────────────────────────────────────────────
const Cell = memo(function Cell({
  base,
  quote,
  chp,
  diagonal,
}: {
  base: Major;
  quote: Major;
  chp: number | null;
  diagonal: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  if (diagonal) {
    return (
      <div
        className="flex items-center justify-center text-[10px] font-bold text-white/20 bg-white/[0.03] rounded"
        style={{ minHeight: 36 }}
      >
        {base}
      </div>
    );
  }

  if (chp === null) {
    return (
      <div
        className="flex items-center justify-center text-[10px] text-white/15 bg-white/[0.02] rounded"
        style={{ minHeight: 36 }}
      >
        —
      </div>
    );
  }

  const bg = cellBg(chp);
  const textColor = chp > 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded cursor-default transition-all duration-150',
        'text-[10px] font-mono font-semibold select-none',
        hovered && 'ring-1 ring-white/30 z-10 scale-105',
        textColor,
      )}
      style={{ backgroundColor: bg, minHeight: 36 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${base}/${quote}: ${fmt(chp)}%`}
    >
      <span>{fmt(chp)}</span>
      {hovered && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-white/80 pointer-events-none z-20">
          {base}/{quote} {fmt(chp)}%
        </span>
      )}
    </div>
  );
});

// ── Main page ────────────────────────────────────────────────
export default function ForexHeatmap() {
  const { data, loading } = useForexHeatmap();

  const matrix = useMemo(
    () => (data?.pairs ? buildMatrix(data.pairs) : {}),
    [data],
  );

  const hasData = !loading && data && data.pairs.length > 0;

  return (
    <PageTemplate
      title="Currency Heatmap"
      description="28-pair strength grid across the 8 majors."
    >
      <GlassCard padding="lg" className="overflow-x-auto">
        {loading && <GlassTableSkeleton rows={8} />}

        {!loading && !hasData && (
          <EmptyState
            icon="🌐"
            title="No heatmap data"
            description="Market data is unavailable right now. Please try again shortly."
          />
        )}

        {hasData && (
          <>
            {/* Column header row */}
            <div
              className="grid mb-1"
              style={{ gridTemplateColumns: `48px repeat(${MAJORS.length}, minmax(44px, 1fr))` }}
            >
              <div /> {/* top-left corner spacer */}
              {MAJORS.map((q) => (
                <div
                  key={q}
                  className="text-center text-[10px] font-bold text-white/35 uppercase tracking-wider pb-1"
                >
                  {q}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            <div className="space-y-1">
              {MAJORS.map((base) => (
                <div
                  key={base}
                  className="grid items-center gap-1"
                  style={{ gridTemplateColumns: `48px repeat(${MAJORS.length}, minmax(44px, 1fr))` }}
                >
                  {/* Row label */}
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-wider pr-2 text-right">
                    {base}
                  </div>

                  {/* Cells */}
                  {MAJORS.map((quote) => {
                    const diagonal = base === quote;
                    const chp = diagonal ? null : (matrix[`${base}/${quote}`] ?? null);
                    return (
                      <Cell
                        key={quote}
                        base={base}
                        quote={quote}
                        chp={chp}
                        diagonal={diagonal}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-3 text-[10px] text-white/30">
              <span>Values: daily % change</span>
              <span className="text-emerald-400">■ Positive (base stronger)</span>
              <span className="text-red-400">■ Negative (base weaker)</span>
              {data.ts > 0 && (
                <span className="ml-auto">
                  Updated {new Date(data.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </>
        )}
      </GlassCard>
    </PageTemplate>
  );
}
