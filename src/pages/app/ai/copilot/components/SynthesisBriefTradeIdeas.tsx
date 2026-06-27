// SynthesisBriefTradeIdeas.tsx
// Phase 1: Weekly Synthesis Brief — Trade Ideas table with horizon filter tabs.
// Phase 2: Optional rankedTradeIdeas prop re-sorts by relevance and adds "Why for you" line.

import { useState } from 'react';
import type { TradeIdea, RankedTradeIdea } from '@/services/copilotSynthesisBriefApi';
import { PATTERN_LABELS, toPatternType, type PatternType } from '@/lib/patterns/types';

type HorizonFilter = 'all' | 'short' | 'medium' | 'long';

interface Props {
  tradeIdeas: TradeIdea[] | undefined;
  loading: boolean;
  error: Error | null;
  /** Phase 2: when provided, ideas are re-sorted by relevanceScore DESC */
  rankedTradeIdeas?: RankedTradeIdea[];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HorizonBadge({ horizon }: { horizon: TradeIdea['time_horizon'] }) {
  // DS note: status-info (blue) for long, status-warning (amber) for medium,
  // status-success (emerald) for short — using DS semantic status tokens.
  const map: Record<TradeIdea['time_horizon'], { label: string; className: string }> = {
    short:  { label: 'Short',  className: 'text-status-success border-status-success/30 bg-status-success/[0.07]' },
    medium: { label: 'Medium', className: 'text-status-warning border-status-warning/30 bg-status-warning/[0.07]' },
    long:   { label: 'Long',   className: 'text-status-info   border-status-info/30   bg-status-info/[0.07]'   },
  };
  const { label, className } = map[horizon];
  return (
    <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] ${className}`}>
      {label}
    </span>
  );
}

function SourcePill({ source }: { source: TradeIdea['source'] }) {
  const labels: Record<TradeIdea['source'], string> = {
    war_zone:  'TOP SECRET',
    weekly:    'WEEKLY',
    ism:       'ISM',
    synthesis: 'SYNTHESIS',
  };
  return (
    <span className="inline-flex items-center rounded-sm border border-gold-primary/20 bg-gold-primary/[0.06] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-gold-primary">
      {labels[source]}
    </span>
  );
}

function PatternBadge({ patternType }: { patternType: PatternType | null | undefined }) {
  const safe = toPatternType(patternType);
  const label = PATTERN_LABELS.en[safe];
  // Muted neutral styling — pattern_type is the data, label is the readability.
  return (
    <span
      className="inline-flex items-center rounded-sm border border-ink-tertiary/30 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-ink-secondary"
      title={safe}
    >
      {label}
    </span>
  );
}

function ConvictionDots({ conviction }: { conviction: TradeIdea['conviction'] }) {
  const count = conviction === 'high' ? 3 : conviction === 'medium' ? 2 : 1;
  return (
    <div className="flex gap-1" aria-label={`Conviction: ${conviction}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i < count ? 'bg-gold-primary' : 'bg-white/[0.12]'}`}
        />
      ))}
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {[...Array(4)].map((_, i) => (
        <tr key={i} className="h-[72px] animate-pulse bg-[#050505]">
          {[...Array(8)].map((__, j) => (
            <td key={j} className="border-b border-gold-primary/10 px-2">
              <div className="h-3 rounded bg-white/[0.06]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const HORIZON_TABS: { label: string; value: HorizonFilter }[] = [
  { label: 'All',    value: 'all'    },
  { label: 'Short',  value: 'short'  },
  { label: 'Medium', value: 'medium' },
  { label: 'Long',   value: 'long'   },
];

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function SynthesisBriefTradeIdeas({ tradeIdeas, loading, error, rankedTradeIdeas }: Props) {
  const [filter, setFilter] = useState<HorizonFilter>('all');

  // Silent error fallback — don't blow up the page
  if (error) return null;

  const rawIdeas = tradeIdeas ?? [];

  // Phase 2: build ranked list when personalization is available
  // Map ideaIndex → { relevanceScore, whyForYou } for O(1) lookup in row rendering
  const rankingMap = new Map<number, { relevanceScore: number; whyForYou: string }>();
  let sortedIdeas: TradeIdea[];

  if (rankedTradeIdeas && rankedTradeIdeas.length > 0) {
    for (const r of rankedTradeIdeas) {
      if (typeof r.ideaIndex === 'number') {
        rankingMap.set(r.ideaIndex, { relevanceScore: r.relevanceScore, whyForYou: r.whyForYou });
      }
    }
    // Sort a copy by relevanceScore DESC; unranked ideas fall to the bottom
    sortedIdeas = [...rawIdeas].sort((a, b) => {
      const originalIndexA = rawIdeas.indexOf(a);
      const originalIndexB = rawIdeas.indexOf(b);
      const scoreA = rankingMap.get(originalIndexA)?.relevanceScore ?? -1;
      const scoreB = rankingMap.get(originalIndexB)?.relevanceScore ?? -1;
      return scoreB - scoreA;
    });
  } else {
    sortedIdeas = rawIdeas;
  }

  const filtered = sortedIdeas.filter(
    (idea) => filter === 'all' || idea.time_horizon === filter
  );

  return (
    <section
      aria-label="This Week's Synthesis — Trade Ideas"
      className="overflow-hidden rounded-[8px] border border-gold-primary/16 bg-[#050505]/96 shadow-[0_0_34px_rgba(0,0,0,0.45)]"
    >
      {/* Header */}
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-gold-primary/14 bg-[#050505] px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gold-primary">
          This Week's Synthesis — Trade Ideas
        </p>

        {/* Horizon filter tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {HORIZON_TABS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`flex h-8 items-center gap-2 rounded-[6px] px-3 text-xs transition duration-200 ease-out ${
                filter === value
                  ? 'bg-gold-primary/[0.09] text-gold-primary'
                  : 'text-ink-secondary hover:bg-white/[0.03] hover:text-ink-primary'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full border ${
                  filter === value ? 'border-gold-primary' : 'border-ink-tertiary/60'
                }`}
              />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="h-9 bg-[#060606]">
              {['#', 'Ticker', 'Sector', 'Horizon', 'Source', 'Pattern', 'Thesis', 'R:R', 'Conviction'].map(
                (heading) => (
                  <th
                    key={heading}
                    className="border-b border-gold-primary/12 px-2 text-[9px] font-semibold uppercase tracking-[0.07em] text-ink-tertiary"
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-10 text-center text-[12px] text-ink-tertiary"
                >
                  This week's brief publishes Sunday 17:45 IL
                </td>
              </tr>
            ) : (
              filtered.map((idea, index) => {
                const originalIndex = rawIdeas.indexOf(idea);
                const ranking = rankingMap.get(originalIndex);
                return (
                  <TradeIdeaRow
                    key={`${idea.symbol}-${index}`}
                    idea={idea}
                    rank={index + 1}
                    whyForYou={ranking?.whyForYou}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TradeIdeaRow({ idea, rank, whyForYou }: { idea: TradeIdea; rank: number; whyForYou?: string }) {
  const rrDisplay =
    idea.rr != null
      ? `${idea.rr.toFixed(1)}R`
      : idea.entry != null && idea.stop != null && idea.target != null
        ? (() => {
            const entry  = Number(idea.entry);
            const stop   = Number(idea.stop);
            const target = Number(idea.target);
            const risk   = Math.abs(entry - stop);
            const reward = Math.abs(target - entry);
            return risk > 0 ? `${(reward / risk).toFixed(1)}R` : '—';
          })()
        : '—';

  return (
    <tr className="group min-h-[72px] bg-[#050505] align-middle transition hover:bg-[#060604]">
      {/* Rank */}
      <td className="border-b border-gold-primary/10 px-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-gold-primary/50 bg-gold-primary/[0.07] font-mono text-[11px] font-semibold text-gold-primary">
          {rank}
        </div>
      </td>

      {/* Ticker */}
      <td className="border-b border-gold-primary/10 px-2">
        <p className="font-mono text-sm font-semibold text-ink-primary">{idea.symbol}</p>
      </td>

      {/* Sector */}
      <td className="border-b border-gold-primary/10 px-2">
        <span className="inline-flex rounded-[4px] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-ink-tertiary">
          {idea.sector ?? '—'}
        </span>
      </td>

      {/* Horizon */}
      <td className="border-b border-gold-primary/10 px-2">
        <HorizonBadge horizon={idea.time_horizon} />
      </td>

      {/* Source */}
      <td className="border-b border-gold-primary/10 px-2">
        <SourcePill source={idea.source} />
      </td>

      {/* Pattern */}
      <td className="border-b border-gold-primary/10 px-2">
        <PatternBadge patternType={idea.pattern_type} />
      </td>

      {/* Thesis */}
      <td className="border-b border-gold-primary/10 px-2">
        <p className="max-w-[320px] text-[11px] leading-[1.5] text-ink-secondary">{idea.thesis}</p>
        {whyForYou && (
          <p className="mt-1 max-w-[320px] text-[10px] leading-[1.45] text-gold-primary/70">
            Why for you: {whyForYou}
          </p>
        )}
        {idea.pattern_evidence && (
          <details className="mt-1.5 max-w-[320px] text-[10px] leading-[1.45]">
            <summary className="cursor-pointer text-gold-primary/70 hover:text-gold-primary transition">
              Why this pattern?
            </summary>
            <div className="mt-1 ps-2 border-s border-gold-primary/20">
              <p className="text-ink-secondary">{idea.pattern_evidence}</p>
              {idea.invalidation && (
                <p className="mt-1 text-ink-tertiary">
                  <strong className="text-ink-secondary">Invalidation:</strong>{' '}
                  {idea.invalidation}
                </p>
              )}
            </div>
          </details>
        )}
      </td>

      {/* R:R */}
      <td className="border-b border-gold-primary/10 px-2">
        <p className="font-mono text-[13px] font-semibold text-ink-primary">{rrDisplay}</p>
      </td>

      {/* Conviction */}
      <td className="border-b border-gold-primary/10 px-2">
        <ConvictionDots conviction={idea.conviction} />
      </td>
    </tr>
  );
}
