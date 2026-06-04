// ============================================================
// src/pages/app/forex/Strength.tsx
// FOREX Currency Strength — visual meter + ranked table
// ============================================================

import { useMemo } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { useForexHeatmap } from './_shared/hooks';
import { GlassCard, GlassTableSkeleton, SectionHeader, EmptyState } from '@/pages/app/crypto/_shared/GlassUI';
import CurrencyStrengthMeter from './components/CurrencyStrengthMeter';
import type { ForexStrengthPair } from './_shared/types';

const MAJORS = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'NZD'] as const;

interface CurrencyScore {
  currency: string;
  score: number;
  pairs: number;
  bullish: number;
  bearish: number;
}

function computeStrengthTable(pairs: ForexStrengthPair[]): CurrencyScore[] {
  const sum: Record<string, number> = {};
  const count: Record<string, number> = {};
  const pos: Record<string, number> = {};
  const neg: Record<string, number> = {};

  for (const c of MAJORS) {
    sum[c] = 0; count[c] = 0; pos[c] = 0; neg[c] = 0;
  }

  for (const pair of pairs) {
    const base = pair.base.toUpperCase();
    const quote = pair.quote.toUpperCase();

    if (base in sum) {
      sum[base] += pair.chp;
      count[base] += 1;
      if (pair.chp > 0) pos[base] += 1; else neg[base] += 1;
    }
    if (quote in sum) {
      sum[quote] += -pair.chp;
      count[quote] += 1;
      if (pair.chp < 0) pos[quote] += 1; else neg[quote] += 1;
    }
  }

  return MAJORS
    .map((c) => ({
      currency: c,
      score: count[c] > 0 ? sum[c] / count[c] : 0,
      pairs: count[c],
      bullish: pos[c],
      bearish: neg[c],
    }))
    .sort((a, b) => b.score - a.score);
}

function fmtScore(n: number): string {
  const abs = Math.abs(n).toFixed(3);
  return n >= 0 ? `+${abs}%` : `−${abs}%`;
}

export default function ForexStrength() {
  const { data, loading } = useForexHeatmap();

  const ranked = useMemo(
    () => (data?.pairs ? computeStrengthTable(data.pairs) : []),
    [data],
  );

  const maxAbs = useMemo(
    () => Math.max(0.01, ...ranked.map((r) => Math.abs(r.score))),
    [ranked],
  );

  return (
    <PageTemplate
      title="Currency Strength"
      description="Relative strength of the 8 major currencies, ranked."
    >
      <div className="space-y-4">
        {/* Visual bars meter */}
        <CurrencyStrengthMeter pairs={data?.pairs} loading={loading} />

        {/* Ranked stats table */}
        <GlassCard padding="md">
          <SectionHeader
            title="Strength Rankings"
            subtitle="Sorted strongest → weakest — based on average cross-pair daily move"
          />

          {loading && <GlassTableSkeleton rows={8} />}

          {!loading && ranked.length === 0 && (
            <EmptyState
              icon="📊"
              title="No data available"
              description="Currency strength data could not be loaded."
            />
          )}

          {!loading && ranked.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[420px]">
                <thead>
                  <tr className="text-white/30 uppercase tracking-wider border-b border-white/[0.06]">
                    <th className="pb-2 text-left font-medium w-6">#</th>
                    <th className="pb-2 text-left font-medium">Currency</th>
                    <th className="pb-2 text-right font-medium">Avg Score</th>
                    <th className="pb-2 text-right font-medium hidden sm:table-cell">Pairs</th>
                    <th className="pb-2 text-right font-medium hidden sm:table-cell">Bull</th>
                    <th className="pb-2 text-right font-medium hidden sm:table-cell">Bear</th>
                    <th className="pb-2 w-32 hidden md:table-cell" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {ranked.map((row, idx) => {
                    const isUp = row.score >= 0;
                    const scoreColor = isUp ? 'text-emerald-400' : 'text-red-400';
                    const barColor = isUp ? 'bg-emerald-400' : 'bg-red-400';
                    const pct = Math.abs(row.score) / maxAbs;

                    return (
                      <tr key={row.currency} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 pr-2 font-mono text-white/25">{idx + 1}</td>
                        <td className="py-2.5">
                          <span className="font-bold font-mono text-white/85">{row.currency}</span>
                        </td>
                        <td className={`py-2.5 text-right font-mono font-semibold ${scoreColor}`}>
                          {fmtScore(row.score)}
                        </td>
                        <td className="py-2.5 text-right text-white/35 hidden sm:table-cell">
                          {row.pairs}
                        </td>
                        <td className="py-2.5 text-right text-emerald-400 hidden sm:table-cell">
                          {row.bullish}
                        </td>
                        <td className="py-2.5 text-right text-red-400 hidden sm:table-cell">
                          {row.bearish}
                        </td>
                        <td className="py-2.5 pl-4 hidden md:table-cell">
                          <div className="h-1.5 w-full rounded-full bg-white/[0.07] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${Math.max(2, pct * 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </PageTemplate>
  );
}
