/**
 * JournalReportsScores — FINOTAUR Scale reports hub page.
 *
 * Layout:
 *  - Heading + summary bar (avg score, grade distribution)
 *  - ScoringConfigPanel (weights + recompute)
 *  - Trade table with live scoreTrade preview, expandable ScoreBreakdownCard per row
 *
 * Live scoring uses scoreTrade() directly — no DB round-trip required for viewing.
 * The DB persistence layer (useRecomputeScores) lives inside ScoringConfigPanel.
 *
 * ReportsTabsNav is rendered by the parent route — this page does NOT mount it.
 */

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { useTrades } from '@/hooks/useTradesData';
import { useScoringConfig } from '@/hooks/useTradeScores';
import { scoreTrade } from '@/lib/journal/scoring';
import type { Trade } from '@/hooks/useTradesData';
import type { ScoreBreakdown } from '@/lib/journal/scoring';
import { Card } from '@/components/ds/Card';
import ScoreBadge from '@/components/journal/score/ScoreBadge';
import ScoreBreakdownCard from '@/components/journal/score/ScoreBreakdownCard';
import ScoringConfigPanel from '@/components/journal/score/ScoringConfigPanel';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Grade helpers (mirrors ScoreBadge thresholds)
// ---------------------------------------------------------------------------

type Grade = 'A+' | 'A' | 'B' | 'C' | 'D';

function toGrade(score: number): Grade {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

const GRADE_ORDER: Grade[] = ['A+', 'A', 'B', 'C', 'D'];

const GRADE_STYLES: Record<Grade, string> = {
  'A+': 'text-gold-primary',
  'A':  'text-gold-primary',
  'B':  'text-amber-400',
  'C':  'text-ink-tertiary',
  'D':  'text-red-400',
};

// ---------------------------------------------------------------------------
// SummaryBar — avg score + grade distribution
// ---------------------------------------------------------------------------

interface ScoredTrade {
  trade: Trade;
  score: number;
  breakdown: ScoreBreakdown;
}

function SummaryBar({ scored }: { scored: ScoredTrade[] }) {
  const avg = scored.length
    ? Math.round(scored.reduce((s, t) => s + t.score, 0) / scored.length)
    : 0;

  const distribution = useMemo(() => {
    const map: Record<Grade, number> = { 'A+': 0, A: 0, B: 0, C: 0, D: 0 };
    for (const { score } of scored) {
      map[toGrade(score)] += 1;
    }
    return GRADE_ORDER.map(g => ({ grade: g, count: map[g] }));
  }, [scored]);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {/* Avg score */}
      <Card padding="compact" className="col-span-2 sm:col-span-1 flex items-center gap-4">
        <ScoreBadge score={avg} size="lg" showLabel />
        <div>
          <p className="text-xs text-ink-tertiary uppercase tracking-wide">Average score</p>
          <p className="text-2xl font-bold text-ink-primary tabular-nums">{avg}</p>
          <p className="text-[11px] text-ink-tertiary">{scored.length} trades</p>
        </div>
      </Card>

      {/* Grade distribution */}
      {distribution.map(({ grade, count }) => (
        <Card key={grade} padding="compact" className="flex flex-col items-center justify-center gap-1">
          <span className={cn('text-xl font-bold', GRADE_STYLES[grade])}>{grade}</span>
          <span className="text-2xl font-bold text-ink-primary tabular-nums">{count}</span>
          <span className="text-[11px] text-ink-tertiary">
            {scored.length > 0 ? Math.round((count / scored.length) * 100) : 0}%
          </span>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TradeRow — single table row with expandable breakdown
// ---------------------------------------------------------------------------

interface TradeRowProps {
  item: ScoredTrade;
  isExpanded: boolean;
  onToggle: () => void;
}

function TradeRow({ item, isExpanded, onToggle }: TradeRowProps) {
  const { trade, score, breakdown } = item;

  const outcomeColor =
    trade.outcome === 'WIN'
      ? 'text-[#10b981]'
      : trade.outcome === 'LOSS'
        ? 'text-red-400'
        : 'text-ink-tertiary';

  return (
    <>
      <tr
        className={cn(
          'border-b border-border-ds-subtle cursor-pointer select-none',
          'hover:bg-surface-1/50 transition-colors',
          isExpanded && 'bg-surface-1/30',
        )}
        onClick={onToggle}
      >
        {/* Score badge */}
        <td className="py-2.5 pl-4 pr-2 w-16">
          <ScoreBadge score={score} size="sm" showLabel />
        </td>

        {/* Symbol */}
        <td className="py-2.5 px-2">
          <span className="text-xs font-semibold text-ink-primary">{trade.symbol}</span>
        </td>

        {/* Date */}
        <td className="py-2.5 px-2 hidden sm:table-cell">
          <span className="text-xs text-ink-secondary tabular-nums">
            {dayjs(trade.open_at).format('MMM D, YYYY')}
          </span>
        </td>

        {/* Side */}
        <td className="py-2.5 px-2 hidden md:table-cell">
          <span className="text-xs text-ink-tertiary">{trade.side}</span>
        </td>

        {/* Outcome */}
        <td className="py-2.5 px-2">
          <span className={cn('text-xs font-medium', outcomeColor)}>
            {trade.outcome ?? '—'}
          </span>
        </td>

        {/* Expand toggle */}
        <td className="py-2.5 pr-4 text-right w-8">
          {isExpanded ? (
            <ChevronUp size={14} className="ml-auto text-ink-tertiary" />
          ) : (
            <ChevronDown size={14} className="ml-auto text-ink-tertiary" />
          )}
        </td>
      </tr>

      {/* Expanded breakdown */}
      {isExpanded && (
        <tr className="border-b border-border-ds-subtle">
          <td colSpan={6} className="px-4 pt-3 pb-4">
            <div className="max-w-sm">
              <ScoreBreakdownCard breakdown={breakdown} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <BarChart2 size={40} className="text-ink-tertiary opacity-40" />
      <p className="text-sm font-medium text-ink-secondary">No trades to score yet</p>
      <p className="text-xs text-ink-tertiary max-w-xs">
        Add trades to your journal and the FINOTAUR Scale will score each one automatically.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function JournalReportsScores() {
  const { data: trades = [], isLoading: tradesLoading } = useTrades();
  const { weights } = useScoringConfig();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Live-compute scores for all trades using current weights (no DB round-trip for preview)
  const scored: ScoredTrade[] = useMemo(
    () =>
      trades.map(trade => {
        const { score, breakdown } = scoreTrade(trade, weights);
        return { trade, score, breakdown };
      }),
    [trades, weights],
  );

  function toggleRow(id: string) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  const isEmpty = !tradesLoading && trades.length === 0;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-bold text-ink-primary">FINOTAUR Scale</h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          Score every trade on 5 discipline criteria — live preview uses current weights.
        </p>
      </div>

      {/* Summary bar */}
      {!isEmpty && <SummaryBar scored={scored} />}

      {/* Config panel */}
      <ScoringConfigPanel trades={trades} />

      {/* Trade table */}
      <Card padding="compact" className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-4">
          <p className="text-xs font-medium text-ink-tertiary uppercase tracking-wide">
            All trades — live score preview
          </p>
          {scored.length > 0 && (
            <span className="text-[11px] text-ink-tertiary tabular-nums">
              {scored.length} trade{scored.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {tradesLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 rounded bg-surface-1" />
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto -mx-ds-5">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-ds-subtle">
                  <th className="py-2 pl-4 pr-2 text-[10px] font-medium text-ink-tertiary uppercase tracking-wide w-16">
                    Score
                  </th>
                  <th className="py-2 px-2 text-[10px] font-medium text-ink-tertiary uppercase tracking-wide">
                    Symbol
                  </th>
                  <th className="py-2 px-2 text-[10px] font-medium text-ink-tertiary uppercase tracking-wide hidden sm:table-cell">
                    Date
                  </th>
                  <th className="py-2 px-2 text-[10px] font-medium text-ink-tertiary uppercase tracking-wide hidden md:table-cell">
                    Side
                  </th>
                  <th className="py-2 px-2 text-[10px] font-medium text-ink-tertiary uppercase tracking-wide">
                    Outcome
                  </th>
                  <th className="py-2 pr-4 w-8" />
                </tr>
              </thead>
              <tbody>
                {scored.map(item => (
                  <TradeRow
                    key={item.trade.id}
                    item={item}
                    isExpanded={expandedId === item.trade.id}
                    onToggle={() => toggleRow(item.trade.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
