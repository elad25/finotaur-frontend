// src/pages/app/journal/backtest/components/NLSetupInput.tsx
// ============================================================================
// NL SETUP INPUT — natural-language strategy description → AI-parsed setup.
// The user writes a plain-English description of their strategy; clicking
// "Generate Setup" calls the backend parse endpoint and merges the result
// into the Zustand store via applyAISetup. The user then reviews/edits the
// populated builder before hitting Run.
// ============================================================================

import { useState } from 'react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { useAutoBacktestStore } from '@/store/useAutoBacktestStore';
import { parseSetupFromText, type ParseSetupResponse } from '@/services/backtest/aiSetupService';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NLSetupInput() {
  const applyAISetup = useAutoBacktestStore((s) => s.applyAISetup);

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseSetupResponse | null>(null);

  async function handleGenerate() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsed = await parseSetupFromText(trimmed);
      applyAISetup(parsed.definition);
      setResult(parsed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="default">
      {/* Header row */}
      <div className="mb-3 flex items-center gap-2">
        {/* FINO head avatar — matches the pattern used in HeatMapTab/TradeCompare */}
        <img
          src="/fino/fino-idle-long-poster.png"
          alt=""
          aria-hidden="true"
          className="h-7 w-7 rounded-full object-cover"
        />
        <h3 className="text-sm font-semibold text-gold-primary">
          Describe Your Strategy
        </h3>
      </div>

      <p className="mb-3 text-xs text-ink-tertiary">
        Tell FINO what your setup looks like in plain English and it will populate the builder for you. Review the fields below before running.
      </p>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={loading}
        rows={3}
        placeholder={`e.g. "Long BTC on a 15m bullish FVG during the London session, stop below the swing low, target 2R"`}
        className="w-full resize-none rounded-lg border-[0.5px] border-border-ds-default bg-surface-1 px-3 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary transition-colors focus:border-gold-primary focus:outline-none disabled:opacity-50"
      />

      {/* Action row */}
      <div className="mt-3 flex items-center justify-end gap-3">
        {loading && (
          <span className="text-xs text-ink-tertiary animate-pulse">
            Parsing your strategy…
          </span>
        )}
        <Button
          variant="gold"
          size="sm"
          showArrow={false}
          disabled={loading || !text.trim()}
          onClick={() => void handleGenerate()}
        >
          {loading ? 'Generating…' : 'Generate Setup'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Result banners */}
      {result && (
        <div className="mt-3 flex flex-col gap-2">
          {/* Success confirmation */}
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-400">
            Setup fields populated. Review the builder below before running.
          </div>

          {/* Assumptions */}
          {result.assumptions.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
              <p className="mb-1 font-semibold">Assumptions made:</p>
              <ul className="list-inside list-disc space-y-0.5">
                {result.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Unsupported features */}
          {result.unsupported.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              <p className="mb-1 font-semibold">Not supported (ignored):</p>
              <ul className="list-inside list-disc space-y-0.5">
                {result.unsupported.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
