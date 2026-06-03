// src/pages/app/etfs/tabs/VerdictTab.tsx
// =====================================================
// ETF ANALYZER — Fino AI Verdict Tab
// =====================================================
// Lazy-fetches GET /api/etf/:ticker/verdict only when
// the tab becomes active for the first time (or the
// ticker changes). Never fetches on initial page load.
// =====================================================

import { useEffect, useState } from 'react';
import { Card } from '@/components/ds/Card';
import {
  fetchETFVerdict,
  EtfVerdictUnavailableError,
} from '@/services/etf-analyzer.api';
import type { EtfData, EtfVerdict } from '@/types/etf.types';
import { cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data: EtfData;
  active: boolean;
}

// ─── Date formatter ───────────────────────────────────────────────────────────

function fmtAsOf(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function VerdictSkeleton() {
  return (
    <Card padding="spacious" className="animate-pulse space-y-ds-5">
      <div className="space-y-ds-2">
        <div className="h-3 w-24 rounded bg-surface-2" />
        <div className="h-4 w-full rounded bg-surface-2" />
        <div className="h-4 w-5/6 rounded bg-surface-2" />
        <div className="h-4 w-4/6 rounded bg-surface-2" />
      </div>
      <div className="grid grid-cols-1 gap-ds-4 sm:grid-cols-2">
        <div className="space-y-ds-2">
          <div className="h-3 w-20 rounded bg-surface-2" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 w-full rounded bg-surface-2" />
          ))}
        </div>
        <div className="space-y-ds-2">
          <div className="h-3 w-20 rounded bg-surface-2" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 w-full rounded bg-surface-2" />
          ))}
        </div>
      </div>
      <div className="h-3 w-2/3 rounded bg-surface-2" />
    </Card>
  );
}

// ─── Unavailable state ────────────────────────────────────────────────────────

function VerdictUnavailable() {
  return (
    <Card padding="spacious">
      <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-2">
        Fino AI Verdict
      </p>
      <p className="text-ink-tertiary text-small">
        AI verdict is currently unavailable. Please try again later.
      </p>
    </Card>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function VerdictError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card padding="spacious">
      <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-2">
        Fino AI Verdict
      </p>
      <p className="text-ink-tertiary text-small mb-ds-4">
        Could not load the AI verdict. Please check your connection and try again.
      </p>
      <button
        onClick={onRetry}
        className={cn(
          'rounded-[8px] px-ds-4 py-ds-2 text-sm font-medium transition-colors duration-150',
          'bg-surface-2 text-ink-secondary hover:bg-surface-3 hover:text-ink-primary',
        )}
      >
        Retry
      </button>
    </Card>
  );
}

// ─── Pro/Con items ────────────────────────────────────────────────────────────

function ProItem({ text }: { text: string }) {
  return (
    <li className="flex gap-ds-2 items-start">
      {/* Positive semantic accent — matches status-success token (#10b981) */}
      <span
        className="mt-[3px] flex-shrink-0 h-[6px] w-[6px] rounded-full bg-[#10b981]"
        aria-hidden="true"
      />
      <span className="text-sm text-ink-secondary leading-relaxed">{text}</span>
    </li>
  );
}

function ConItem({ text }: { text: string }) {
  return (
    <li className="flex gap-ds-2 items-start">
      {/* Negative semantic accent — matches num-negative / status-error token (#E24B4A) */}
      <span
        className="mt-[3px] flex-shrink-0 h-[6px] w-[6px] rounded-full bg-[#E24B4A]"
        aria-hidden="true"
      />
      <span className="text-sm text-ink-secondary leading-relaxed">{text}</span>
    </li>
  );
}

// ─── Success layout ───────────────────────────────────────────────────────────

function VerdictSuccess({ verdict }: { verdict: EtfVerdict }) {
  return (
    <Card padding="spacious" className="space-y-ds-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-ds-2">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
          Fino AI Verdict
        </p>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-medium',
            'border border-[color:var(--gold-eyebrow-hairline,rgba(201,166,70,0.35))]',
            'bg-[rgba(201,166,70,0.08)] text-[color:var(--gold-primary,#C9A646)]',
          )}
        >
          Powered by Fino AI
        </span>
      </div>

      {/* Summary paragraph */}
      <p className="text-sm text-ink-secondary leading-relaxed">{verdict.summary}</p>

      {/* Pros / Cons columns */}
      <div className="grid grid-cols-1 gap-ds-5 sm:grid-cols-2">
        {/* Strengths */}
        {verdict.pros.length > 0 && (
          <div className="space-y-ds-3">
            <p className="text-[11px] font-semibold tracking-[1.2px] uppercase text-[#10b981]">
              Strengths
            </p>
            <ul className="space-y-ds-2">
              {verdict.pros.map((pro, i) => (
                <ProItem key={i} text={pro} />
              ))}
            </ul>
          </div>
        )}

        {/* Considerations */}
        {verdict.cons.length > 0 && (
          <div className="space-y-ds-3">
            <p className="text-[11px] font-semibold tracking-[1.2px] uppercase text-[#E24B4A]">
              Considerations
            </p>
            <ul className="space-y-ds-2">
              {verdict.cons.map((con, i) => (
                <ConItem key={i} text={con} />
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer: disclaimer + model tag + asOf */}
      <div className="border-t border-border-ds-subtle pt-ds-3 space-y-ds-1">
        <p className="text-[11px] text-ink-tertiary leading-relaxed">{verdict.disclaimer}</p>
        <p className="text-[11px] text-ink-muted">
          AI-generated · {verdict.model} · as of {fmtAsOf(verdict.asOf)}
        </p>
      </div>
    </Card>
  );
}

// ─── VerdictTab ───────────────────────────────────────────────────────────────

export function VerdictTab({ data, active }: Props) {
  // `fetchKey` encodes the combination of ticker + retry attempt. Incrementing
  // it is the single mechanism that triggers a fresh fetch.
  const [fetchKey, setFetchKey] = useState<string>(`${data.ticker}:0`);
  const [retrySeq, setRetrySeq] = useState(0);

  const [verdict, setVerdict]       = useState<EtfVerdict | null>(null);
  const [loading, setLoading]       = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError]           = useState(false);
  // Track the ticker for which we last started a fetch so we don't re-fire.
  const [fetchedTicker, setFetchedTicker] = useState<string | null>(null);

  // Reset all state when the ticker changes (user navigated to a different ETF).
  useEffect(() => {
    setVerdict(null);
    setLoading(false);
    setUnavailable(false);
    setError(false);
    setFetchedTicker(null);
    setRetrySeq(0);
    setFetchKey(`${data.ticker}:0`);
  }, [data.ticker]);

  // Lazy fetch: fires only when the tab is active AND we haven't already
  // fetched (or started fetching) for the current ticker + retrySeq combo.
  useEffect(() => {
    if (!active) return;
    // `fetchKey` captures ticker + retry sequence; if it matches the last
    // ticker we fetched, skip. This prevents double-fire on every re-render.
    if (fetchedTicker === fetchKey) return;

    setFetchedTicker(fetchKey);
    setVerdict(null);
    setUnavailable(false);
    setError(false);
    setLoading(true);

    let cancelled = false;

    fetchETFVerdict(data.ticker)
      .then((v) => {
        if (!cancelled) {
          setVerdict(v);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoading(false);
        if (err instanceof EtfVerdictUnavailableError) {
          setUnavailable(true);
        } else {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active, data.ticker, fetchKey, fetchedTicker]);

  function handleRetry() {
    const next = retrySeq + 1;
    setRetrySeq(next);
    setFetchKey(`${data.ticker}:${next}`);
    // fetchedTicker is now stale vs new fetchKey → effect will re-run
  }

  if (loading) {
    return (
      <div>
        <p className="text-[11px] text-ink-tertiary mb-ds-3">Generating AI verdict…</p>
        <VerdictSkeleton />
      </div>
    );
  }

  if (unavailable) return <VerdictUnavailable />;
  if (error) return <VerdictError onRetry={handleRetry} />;
  if (verdict) return <VerdictSuccess verdict={verdict} />;

  // Idle state: tab has never been opened (active has never been true for
  // this ticker). Render a minimal placeholder.
  return (
    <Card padding="spacious">
      <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-2">
        Fino AI Verdict
      </p>
      <p className="text-ink-tertiary text-small">Open this tab to generate the AI verdict.</p>
    </Card>
  );
}
