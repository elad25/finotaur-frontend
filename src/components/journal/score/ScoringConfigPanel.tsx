/**
 * ScoringConfigPanel — adjust FINOTAUR Scale weights and recompute trade scores.
 *
 * Uses useScoringConfig() to read/persist weights.
 * Uses useRecomputeScores() to batch-upsert scores for all trades.
 * Accepts trades as a prop (caller fetches via useTrades) to avoid
 * double-fetching in pages that already have them.
 */

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { useScoringConfig, useRecomputeScores } from '@/hooks/useTradeScores';
import { DEFAULT_WEIGHTS } from '@/lib/journal/scoring';
import type { ScoreWeights } from '@/lib/journal/scoring';
import type { Trade } from '@/hooks/useTradesData';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Criterion metadata
// ---------------------------------------------------------------------------

const CRITERIA: Array<{ key: keyof ScoreWeights; label: string; description: string }> = [
  {
    key: 'followedStop',
    label: 'Followed stop',
    description: 'Stop price set and trade is closed',
  },
  {
    key: 'hitTarget',
    label: 'Hit target',
    description: 'Outcome is WIN',
  },
  {
    key: 'positiveR',
    label: 'Positive R',
    description: 'R-multiple above zero',
  },
  {
    key: 'hasNotes',
    label: 'Has notes',
    description: 'Non-empty journal notes',
  },
  {
    key: 'withinSession',
    label: 'Within session',
    description: 'Session field is set (asia / london / newyork)',
  },
];

// ---------------------------------------------------------------------------
// Props & component
// ---------------------------------------------------------------------------

export interface ScoringConfigPanelProps {
  /** Trades to recompute scores for. Pass from parent useTrades() call. */
  trades: Trade[];
}

export default function ScoringConfigPanel({ trades }: ScoringConfigPanelProps) {
  const { weights: savedWeights, isLoading, updateWeights } = useScoringConfig();
  const recompute = useRecomputeScores();

  const [local, setLocal] = useState<ScoreWeights>(savedWeights);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Sync local when saved weights arrive from server
  useEffect(() => {
    setLocal(savedWeights);
  }, [savedWeights]);

  const total = (Object.values(local) as number[]).reduce((s, v) => s + v, 0);
  const totalOk = total === 100;

  function handleChange(key: keyof ScoreWeights, raw: string) {
    const val = Math.max(0, Math.min(100, Number(raw) || 0));
    setLocal(prev => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    setIsSaving(true);
    updateWeights(local);
    // Optimistic feedback — mutation is async via TanStack
    setTimeout(() => {
      setIsSaving(false);
      setSavedAt(Date.now());
    }, 600);
  }

  function handleReset() {
    setLocal({ ...DEFAULT_WEIGHTS });
    setSavedAt(null);
  }

  function handleRecompute() {
    recompute.mutate({ trades, weights: local });
  }

  if (isLoading) {
    return (
      <Card padding="default" className="animate-pulse">
        <div className="h-48 rounded-lg bg-surface-1" />
      </Card>
    );
  }

  return (
    <Card padding="default" className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink-primary">Score weights</h3>
          <p className="mt-0.5 text-xs text-ink-tertiary">
            Adjust how much each criterion contributes to the 0–100 score.
          </p>
        </div>

        {/* Live total pill */}
        <div
          className={cn(
            'shrink-0 rounded-full px-3 py-1 text-xs font-semibold tabular-nums border',
            totalOk
              ? 'bg-gold-primary/10 text-gold-primary border-gold-border'
              : 'bg-red-500/10 text-red-400 border-red-500/30',
          )}
        >
          {total} / 100
        </div>
      </div>

      {/* Warning when sum != 100 (non-blocking) */}
      {!totalOk && (
        <p className="text-xs text-amber-400">
          Weights sum to {total}. Save is disabled until total equals 100 (
          {total > 100 ? `over by ${total - 100}` : `under by ${100 - total}`}).
        </p>
      )}

      {/* Sliders */}
      <div className="space-y-4">
        {CRITERIA.map(({ key, label, description }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-medium text-ink-primary">{label}</span>
                <p className="text-[11px] text-ink-tertiary">{description}</p>
              </div>
              <input
                type="number"
                min={0}
                max={100}
                value={local[key]}
                onChange={e => handleChange(key, e.target.value)}
                className={cn(
                  'w-16 shrink-0 rounded-md border border-border-ds-subtle bg-surface-1',
                  'px-2 py-1 text-center text-xs font-semibold text-ink-primary',
                  'focus:outline-none focus:ring-1 focus:ring-gold-primary',
                  'transition-colors',
                )}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={local[key]}
              onChange={e => handleChange(key, e.target.value)}
              className="w-full h-1.5 cursor-pointer accent-gold-primary"
            />
          </div>
        ))}
      </div>

      {/* Save / Reset */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border-ds-subtle">
        <Button
          variant="gold"
          size="compact"
          showArrow={false}
          disabled={!totalOk || isSaving}
          onClick={handleSave}
        >
          {isSaving ? 'Saving…' : 'Save weights'}
        </Button>
        <Button
          variant="goldOutline"
          size="compact"
          showArrow={false}
          onClick={handleReset}
        >
          Reset to defaults
        </Button>
        {savedAt !== null && !isSaving && (
          <span className="text-[11px] text-ink-tertiary ml-auto">Saved</span>
        )}
      </div>

      {/* Recompute section */}
      <div className="pt-2 border-t border-border-ds-subtle space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-ink-primary">Recompute all trade scores</p>
            <p className="text-[11px] text-ink-tertiary">
              Saves current weights to DB for {trades.length} trade
              {trades.length !== 1 ? 's' : ''}.
            </p>
          </div>
          <Button
            variant="goldOutline"
            size="compact"
            showArrow={false}
            disabled={recompute.isPending || trades.length === 0}
            onClick={handleRecompute}
          >
            <RefreshCw
              size={12}
              className={cn('shrink-0', recompute.isPending && 'animate-spin')}
            />
            {recompute.isPending ? 'Recomputing…' : 'Recompute'}
          </Button>
        </div>

        {recompute.isSuccess && (
          <p className="text-[11px] text-[#10b981]">
            Done — {trades.length} trade{trades.length !== 1 ? 's' : ''} updated.
          </p>
        )}
        {recompute.isError && (
          <p className="text-[11px] text-red-400">Recompute failed — try again.</p>
        )}
      </div>
    </Card>
  );
}
