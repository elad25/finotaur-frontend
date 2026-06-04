// ============================================================
// src/pages/app/forex/Correlation.tsx
// Correlation Matrix — PREMIUM page.
// ============================================================

import { useState } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import {
  GlassCard,
  GlassTabs,
  EmptyState,
} from '@/pages/app/crypto/_shared/GlassUI';
import { useForexCorrelation } from './_shared/hooks';
import { useSubscription } from '@/hooks/useSubscription';
import ForexUpsellGate from './components/ForexUpsellGate';

// ── Helpers ───────────────────────────────────────────────────

/** Format "EURUSD" → "EUR/USD". */
function fmtPair(sym: string): string {
  if (sym.length === 6) return `${sym.slice(0, 3)}/${sym.slice(3)}`;
  return sym;
}

/**
 * Map correlation value (−1 to +1) to a Tailwind-friendly inline color.
 * Positive → emerald-400, Negative → red-400, neutral → white/20.
 */
function corrColor(val: number, isDiagonal: boolean): string {
  if (isDiagonal) return 'rgba(255,255,255,0.15)';
  const abs = Math.abs(val);
  if (val > 0) {
    // 0 → transparent, 1 → emerald
    return `rgba(52,211,153,${(abs * 0.7).toFixed(2)})`;
  }
  // 0 → transparent, -1 → red
  return `rgba(248,113,113,${(abs * 0.7).toFixed(2)})`;
}

function corrTextClass(val: number, isDiagonal: boolean): string {
  if (isDiagonal) return 'text-white/30';
  if (val >= 0.5) return 'text-emerald-400 font-semibold';
  if (val <= -0.5) return 'text-red-400 font-semibold';
  if (val > 0) return 'text-emerald-400/60';
  if (val < 0) return 'text-red-400/60';
  return 'text-white/30';
}

// ── Skeleton ──────────────────────────────────────────────────

function MatrixSkeleton({ size = 7 }: { size?: number }) {
  return (
    <div className="animate-pulse overflow-x-auto">
      <div className="inline-flex flex-col gap-1.5 min-w-[480px]">
        {Array.from({ length: size + 1 }).map((_, r) => (
          <div key={r} className="flex gap-1.5">
            {Array.from({ length: size + 1 }).map((_, c) => (
              <div
                key={c}
                className="h-10 rounded bg-white/[0.05]"
                style={{ width: r === 0 || c === 0 ? '72px' : '64px' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

type WindowOption = '30d' | '90d';

export default function ForexCorrelation() {
  const { isPremium, isAdmin, isLifetimeUser, isLoading: subLoading } = useSubscription();
  const entitled = isPremium || isAdmin || isLifetimeUser;

  const [window, setWindow] = useState<WindowOption>('30d');
  const { data, loading } = useForexCorrelation(window);

  if (!subLoading && !entitled) {
    return (
      <PageTemplate
        title="Correlation Matrix"
        description="Rolling correlation across the major pairs."
      >
        <ForexUpsellGate feature="Correlation Matrix" />
      </PageTemplate>
    );
  }

  const unavailable =
    !loading &&
    (!data || data.source === 'unavailable' || !data.symbols.length || !data.matrix.length);

  return (
    <PageTemplate
      title="Correlation Matrix"
      description="Rolling correlation across the major pairs."
    >
      <GlassCard padding="md">
        {/* Window toggle */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-white/30">
            Pair-to-pair rolling correlation ({window})
          </p>
          <GlassTabs
            tabs={[
              { id: '30d', label: '30D' },
              { id: '90d', label: '90D' },
            ]}
            active={window}
            onChange={(id) => setWindow(id as WindowOption)}
          />
        </div>

        {loading || subLoading ? (
          <MatrixSkeleton />
        ) : unavailable ? (
          <EmptyState
            icon="📐"
            title="Correlation data is temporarily unavailable."
            description="Matrix refreshes hourly."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-1 min-w-[480px]">
              <thead>
                <tr>
                  {/* Top-left empty corner */}
                  <th className="w-[72px]" />
                  {data!.symbols.map((sym) => (
                    <th
                      key={sym}
                      className="text-[10px] text-white/40 font-medium px-1 pb-1 text-center w-16"
                    >
                      {fmtPair(sym)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data!.matrix.map((row, r) => (
                  <tr key={data!.symbols[r]}>
                    {/* Row label */}
                    <td className="text-[10px] text-white/40 font-medium pr-2 text-right whitespace-nowrap">
                      {fmtPair(data!.symbols[r])}
                    </td>
                    {row.map((val, c) => {
                      const isDiag = r === c;
                      const display = isDiag ? '1.00' : val.toFixed(2);
                      return (
                        <td
                          key={c}
                          className="rounded text-center"
                          style={{
                            backgroundColor: corrColor(val, isDiag),
                            width: '64px',
                            height: '40px',
                            minWidth: '48px',
                          }}
                        >
                          <span className={`text-[11px] font-mono ${corrTextClass(val, isDiag)}`}>
                            {display}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        {!loading && !subLoading && !unavailable && (
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(52,211,153,0.7)' }} />
              <span className="text-[10px] text-white/30">Strong positive</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(248,113,113,0.7)' }} />
              <span className="text-[10px] text-white/30">Strong negative</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-white/5" />
              <span className="text-[10px] text-white/30">Neutral</span>
            </div>
          </div>
        )}

        {data && data.source !== 'unavailable' && (
          <p className="mt-3 text-[10px] text-white/20 text-right">
            Source: {data.source} &middot; {window} window
          </p>
        )}
      </GlassCard>
    </PageTemplate>
  );
}
