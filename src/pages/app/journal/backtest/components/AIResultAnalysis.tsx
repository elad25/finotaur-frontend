// src/pages/app/journal/backtest/components/AIResultAnalysis.tsx
// ============================================================================
// AI RESULT ANALYSIS — on-demand Anthropic analysis of a completed backtest.
// The user clicks "Analyze with AI" and gets: a verdict badge, sample-size
// note, strengths/weaknesses, optimization ideas, and a summary paragraph.
// Props come from the parent (AutoBacktest) so this stays pure and testable.
// ============================================================================

import { useState } from 'react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import {
  analyzeBacktestResult,
  type ResultAnalysis,
} from '@/services/backtest/aiSetupService';
import type { BacktestStatisticsLike } from '@/core/auto/AutoBacktestEngine';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AIResultAnalysisProps {
  statistics: BacktestStatisticsLike;
  setupSummary: string;
}

// ---------------------------------------------------------------------------
// Verdict badge
// ---------------------------------------------------------------------------

const VERDICT_STYLES: Record<
  ResultAnalysis['verdict'],
  { label: string; className: string }
> = {
  promising: {
    label: 'Promising',
    className: 'bg-green-500/20 text-green-400 border border-green-500/30',
  },
  marginal: {
    label: 'Marginal',
    className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  },
  weak: {
    label: 'Weak',
    className: 'bg-red-500/20 text-red-400 border border-red-500/30',
  },
  'insufficient-data': {
    label: 'Insufficient Data',
    className: 'bg-zinc-700/60 text-ink-tertiary border border-border-ds-default',
  },
};

function VerdictBadge({ verdict }: { verdict: ResultAnalysis['verdict'] }) {
  const { label, className } = VERDICT_STYLES[verdict];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIResultAnalysis({ statistics, setupSummary }: AIResultAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ResultAnalysis | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);

    try {
      const result = await analyzeBacktestResult(statistics, setupSummary);
      setAnalysis(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Analysis failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="default">
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <img
            src="/fino/fino-idle-long-poster.png"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 rounded-full object-cover"
          />
          <h3 className="text-sm font-semibold text-gold-primary">
            AI Analysis
          </h3>
          {analysis && (
            <VerdictBadge verdict={analysis.verdict} />
          )}
        </div>

        {!analysis && (
          <Button
            variant="gold"
            size="sm"
            showArrow={false}
            disabled={loading}
            onClick={() => void handleAnalyze()}
          >
            {loading ? 'Analyzing…' : 'Analyze with AI'}
          </Button>
        )}

        {analysis && (
          <button
            onClick={() => void handleAnalyze()}
            disabled={loading}
            className="text-xs text-ink-tertiary hover:text-ink-primary transition-colors disabled:opacity-40"
          >
            {loading ? 'Re-analyzing…' : 'Re-analyze'}
          </button>
        )}
      </div>

      {/* Loading pulse while first analysis runs */}
      {loading && !analysis && (
        <div className="space-y-2 py-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-surface-2" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-surface-2" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Analysis result */}
      {analysis && (
        <div className="space-y-4">
          {/* Sample size note */}
          {analysis.sampleSizeNote && (
            <p className="text-xs text-ink-tertiary italic">{analysis.sampleSizeNote}</p>
          )}

          {/* Strengths */}
          {analysis.strengths.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-green-400">Strengths</p>
              <ul className="space-y-1">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink-secondary">
                    <span className="mt-0.5 shrink-0 text-green-500">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {analysis.weaknesses.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-red-400">Weaknesses</p>
              <ul className="space-y-1">
                {analysis.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink-secondary">
                    <span className="mt-0.5 shrink-0 text-red-500">✗</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Optimization ideas */}
          {analysis.optimizationIdeas.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-gold-primary">
                Optimization Ideas
              </p>
              <div className="space-y-2">
                {analysis.optimizationIdeas.map((idea, i) => (
                  <div
                    key={i}
                    className="rounded-lg border-[0.5px] border-border-ds-default bg-surface-1 p-2.5"
                  >
                    <p className="text-xs font-medium text-ink-primary">{idea.change}</p>
                    <p className="mt-0.5 text-xs text-ink-tertiary">{idea.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {analysis.summary && (
            <div className="rounded-lg border-[0.5px] border-gold-primary/20 bg-gold-primary/5 px-3 py-2">
              <p className="text-xs text-ink-secondary leading-relaxed">{analysis.summary}</p>
            </div>
          )}
        </div>
      )}

      {/* Prompt when no analysis yet and not loading */}
      {!analysis && !loading && !error && (
        <p className="text-xs text-ink-tertiary">
          Get an AI-powered read on your backtest — verdict, strengths, weaknesses, and concrete optimization ideas.
        </p>
      )}
    </Card>
  );
}
