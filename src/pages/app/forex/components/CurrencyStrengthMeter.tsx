// ============================================================
// CurrencyStrengthMeter.tsx
// Ranks the 8 major FX currencies by their average daily
// percent-change across all pairs in which they appear.
//
// Aggregation rule:
//   For each pair (base/quote with chp as daily %change):
//     base  currency += +chp  (base strengthens when pair rises)
//     quote currency += -chp  (quote weakens when pair rises)
//   Final score = sum / count (average across appearances).
// ============================================================

import { memo, useMemo } from 'react';
import type { ForexStrengthPair } from '@/pages/app/forex/_shared/types';
import { GlassCard, SectionHeader, GlassTableSkeleton } from '@/pages/app/crypto/_shared/GlassUI';

const MAJORS = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'NZD'] as const;
type MajorCurrency = typeof MAJORS[number];

interface CurrencyScore {
  currency: MajorCurrency;
  score: number;       // average signed %change
  count: number;       // number of pairs contributing
}

interface CurrencyStrengthMeterProps {
  pairs: ForexStrengthPair[] | undefined;
  loading: boolean;
}

function computeStrength(pairs: ForexStrengthPair[]): CurrencyScore[] {
  const sum: Record<string, number> = {};
  const count: Record<string, number> = {};

  for (const currency of MAJORS) {
    sum[currency] = 0;
    count[currency] = 0;
  }

  for (const pair of pairs) {
    const base = pair.base.toUpperCase();
    const quote = pair.quote.toUpperCase();

    if (base in sum) {
      sum[base] += pair.chp;
      count[base] += 1;
    }
    if (quote in sum) {
      sum[quote] += -pair.chp;
      count[quote] += 1;
    }
  }

  return MAJORS.map((currency) => ({
    currency,
    score: count[currency] > 0 ? sum[currency] / count[currency] : 0,
    count: count[currency],
  })).sort((a, b) => b.score - a.score);
}

/** Format a signed score value using U+2212 for negatives. */
function formatScore(score: number): string {
  const abs = Math.abs(score).toFixed(2);
  return score >= 0 ? `+${abs}%` : `−${abs}%`;
}

const CurrencyStrengthMeter = memo(function CurrencyStrengthMeter({
  pairs,
  loading,
}: CurrencyStrengthMeterProps) {
  const ranked = useMemo(
    () => (pairs ? computeStrength(pairs) : []),
    [pairs],
  );

  const maxAbs = useMemo(
    () => Math.max(0.01, ...ranked.map((r) => Math.abs(r.score))),
    [ranked],
  );

  if (loading) {
    return (
      <GlassCard padding="sm">
        <SectionHeader title="Currency Strength" subtitle="Average daily move across major pairs" />
        <GlassTableSkeleton rows={8} />
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="sm">
      <SectionHeader
        title="Currency Strength"
        subtitle="Average daily move across major pairs — strongest to weakest"
      />
      <div className="space-y-2">
        {ranked.map((item, idx) => {
          const pct = Math.abs(item.score) / maxAbs;
          const isUp = item.score >= 0;
          const barColor = isUp ? 'bg-emerald-400' : 'bg-red-400';
          const scoreColor = isUp ? 'text-emerald-400' : 'text-red-400';

          return (
            <div key={item.currency} className="flex items-center gap-3">
              {/* Rank */}
              <span className="text-[11px] text-white/25 font-mono w-4 text-right flex-shrink-0">
                {idx + 1}
              </span>

              {/* Currency label */}
              <span className="text-xs text-white/80 font-bold font-mono w-10 flex-shrink-0">
                {item.currency}
              </span>

              {/* Bar */}
              <div className="flex-1 h-2 rounded-full bg-white/[0.07] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${Math.max(2, pct * 100)}%` }}
                />
              </div>

              {/* Score */}
              <span className={`text-[11px] font-mono font-semibold w-14 text-right flex-shrink-0 ${scoreColor}`}>
                {formatScore(item.score)}
              </span>

              {/* Pair count */}
              <span className="text-[10px] text-white/20 font-mono w-8 text-right flex-shrink-0 hidden sm:block">
                {item.count}p
              </span>
            </div>
          );
        })}
        {ranked.length === 0 && (
          <p className="text-xs text-white/30 text-center py-4">No pair data available</p>
        )}
      </div>
    </GlassCard>
  );
});

export default CurrencyStrengthMeter;
