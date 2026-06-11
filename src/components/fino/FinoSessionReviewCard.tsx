// src/components/fino/FinoSessionReviewCard.tsx
// =====================================================
// FINO Session Review Card — shown below FinoBriefingCard in the chat drawer.
// Fetched once per day per session; cached in sessionStorage keyed by date.
// All states (loading, locked, ready, none, error) are handled internally
// — this component never throws.
// locked → null (no upsell in v1); none/error → null.
// Default collapsed; persisted in sessionStorage.
// =====================================================

import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
import {
  fetchFinoSessionReview,
  type FinoSessionReviewResult,
  type SessionReviewStats,
} from '@/services/aiCopilotApi';

// ── Helpers ────────────────────────────────────────────────────────────────

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatReviewDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function pnlClass(pnl: number): string {
  return pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-red-400' : 'text-ink-secondary';
}

function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded bg-[#C9A646]/10 animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

function ReviewSkeleton() {
  return (
    <div className="p-3 space-y-2">
      <SkeletonLine className="h-3 w-2/5" />
      <SkeletonLine className="h-2.5 w-full" />
      <SkeletonLine className="h-2.5 w-3/5" />
    </div>
  );
}

function StatsRow({ stats }: { stats: SessionReviewStats }) {
  const wl = `${stats.wins}W-${stats.losses}L`;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
      {/* Summary pill */}
      <span className="inline-flex items-center gap-1 rounded-full border border-[#C9A646]/15 bg-[#C9A646]/5 px-2 py-0.5 text-[10px] leading-none text-ink-secondary">
        {stats.trades} trade{stats.trades !== 1 ? 's' : ''}
        <span className="text-ink-tertiary">·</span>
        {wl}
        <span className="text-ink-tertiary">·</span>
        <span className={pnlClass(stats.netPnl)}>{formatPnl(stats.netPnl)}</span>
      </span>

      {/* Best chip */}
      {stats.best && (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[10px] leading-none">
          <span className="text-ink-tertiary">Best</span>
          <span className="font-medium text-ink-secondary">{stats.best.symbol}</span>
          <span className="text-emerald-400">{formatPnl(stats.best.pnl)}</span>
        </span>
      )}

      {/* Worst chip */}
      {stats.worst && (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/5 px-2 py-0.5 text-[10px] leading-none">
          <span className="text-ink-tertiary">Worst</span>
          <span className="font-medium text-ink-secondary">{stats.worst.symbol}</span>
          <span className="text-red-400">{formatPnl(stats.worst.pnl)}</span>
        </span>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; result: Extract<FinoSessionReviewResult, { status: 'ready' }> }
  | { phase: 'hidden' }; // locked, none, or network error — render nothing

const COLLAPSED_KEY = 'fino_review_collapsed';

export default function FinoSessionReviewCard() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      // Default collapsed = true; only expand if explicitly set to 'false'
      const stored = sessionStorage.getItem(COLLAPSED_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(COLLAPSED_KEY, String(next));
      } catch {
        // sessionStorage unavailable — ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const today = getTodayKey();
    const cacheKey = `fino_review_cache_${today}`;

    // Try sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed: FinoSessionReviewResult = JSON.parse(cached);
        if (!cancelled) applyResult(parsed);
        return;
      }
    } catch {
      // ignore parse/storage errors
    }

    fetchFinoSessionReview()
      .then((result) => {
        if (cancelled) return;
        // Cache all results (including none/locked so we don't refetch)
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {
          // storage full or unavailable — ignore
        }
        applyResult(result);
      })
      .catch(() => {
        if (!cancelled) setState({ phase: 'hidden' });
      });

    function applyResult(result: FinoSessionReviewResult) {
      switch (result.status) {
        case 'ready':
          setState({ phase: 'ready', result });
          break;
        case 'locked':
        case 'none':
          setState({ phase: 'hidden' });
          break;
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  if (state.phase === 'hidden') return null;

  return (
    <div className="mx-3 mt-1 mb-1 rounded-xl border border-[#C9A646]/20 bg-[#0D0C0A]">
      {state.phase === 'loading' && <ReviewSkeleton />}

      {state.phase === 'ready' && (() => {
        const { date, review, stats } = state.result;
        return (
          <>
            {/* Card header */}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex w-full items-center justify-between px-3 pt-2.5 pb-2 text-left"
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5 text-[#C9A646]" />
                <span className="text-[11px] font-bold text-ink-primary">Session Review</span>
                <span className="text-[10px] text-ink-tertiary">{formatReviewDate(date)}</span>
              </div>
              {collapsed
                ? <ChevronDown className="h-3.5 w-3.5 text-ink-tertiary" />
                : <ChevronUp className="h-3.5 w-3.5 text-ink-tertiary" />}
            </button>

            {!collapsed && (
              <div className="px-3 pb-3 space-y-2">
                {/* Review text */}
                <p className="text-[11px] text-ink-tertiary leading-relaxed">
                  {review}
                </p>

                {/* Stats row */}
                <StatsRow stats={stats} />
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
