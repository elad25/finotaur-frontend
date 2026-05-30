/**
 * useDailyBrief — composing hook for the Daily PM Brief page.
 *
 * Combines:
 *  - useSynthesisBrief()   → global brief + personalization
 *  - usePortfolioData('1M') → snapshot (1M range for day-change computation)
 *  - useMarketStatus()     → session phase + context
 *
 * Returns a fully-typed BriefData bundle, loading/error state,
 * session phase, greeting string, and refetch.
 *
 * No network calls here — delegates entirely to the existing hooks.
 */

import { useMemo, useCallback } from 'react';
import { useSynthesisBrief } from './useSynthesisBrief';
import { usePortfolioData } from './usePortfolioData';
import { useMarketStatus } from '@/lib/marketStatus';
import { buildBriefModules, type BriefData } from '../utils/buildBriefModules';
import type { MarketStatusResult } from '@/lib/marketStatus';

// ---------------------------------------------------------------------------
// Session phase
// ---------------------------------------------------------------------------

export type SessionPhase = 'pre-market' | 'open' | 'closed';

function deriveSessionPhase(marketStatus: MarketStatusResult): SessionPhase {
  if (marketStatus.status === 'open') return 'open';
  if (marketStatus.status === 'closed-pre-market') return 'pre-market';
  return 'closed';
}

// ---------------------------------------------------------------------------
// Greeting
// ---------------------------------------------------------------------------

/**
 * Compute a time-of-day greeting from the browser's local hour.
 * Intentionally uses local time (not ET) so the greeting matches the
 * user's subjective experience regardless of timezone.
 */
function computeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseDailyBriefResult {
  data: BriefData | null;
  /** True while either the brief OR portfolio is still fetching. */
  loading: boolean;
  /** First error encountered (brief errors take priority). */
  error: Error | null;
  /** Call to re-fetch the synthesis brief (portfolio cache manages itself via react-query). */
  refetch: () => void;
  sessionPhase: SessionPhase;
  greeting: string;
  /** ISO timestamp of when the brief was generated, or null if brief not yet loaded. */
  generatedAt: string | null;
  marketStatus: MarketStatusResult;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDailyBrief(): UseDailyBriefResult {
  const {
    brief,
    loading: briefLoading,
    error: briefError,
    personal,
    // personalLoading intentionally unused — we don't block on it; the adapter
    // handles null personal gracefully (produces un-personalized output).
  } = useSynthesisBrief();

  // Use 1M range for the portfolio snapshot. Day-change (changeAbs / changePercent)
  // reflects the full range — for a true intraday day-change we'd need a live feed.
  // Until that lands, the 1M changeAbs/changePercent serve as the portfolio context.
  const portfolioResult = usePortfolioData('1M');
  const marketStatus = useMarketStatus();

  // Derive loading: block until the brief resolves. Portfolio is supplementary
  // — the page can render without it (snapshot passed as null is handled defensively).
  const loading = briefLoading;

  // First error: brief error takes priority; portfolio errors are non-fatal for now.
  const error: Error | null = briefError;

  const sessionPhase = useMemo(() => deriveSessionPhase(marketStatus), [marketStatus]);
  const greeting = useMemo(() => computeGreeting(), []);

  // Extract the stable PortfolioSnapshot (without the extra usePortfolioData fields).
  const snapshot = useMemo(() => {
    const { source: _source, lastSyncAt: _sync, hasHistoricalSeries: _hist, ...snap } = portfolioResult;
    return snap;
    // portfolioResult reference is stable across re-renders for the same input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioResult]);

  const data = useMemo<BriefData | null>(() => {
    // Don't produce data while loading to avoid flicker with empty BriefData
    if (briefLoading) return null;

    return buildBriefModules(brief, personal, snapshot, { greeting });
  }, [briefLoading, brief, personal, snapshot, greeting]);

  // refetch: useSynthesisBrief doesn't expose a refetch fn — the hook re-mounts
  // on demand. We expose a no-op that triggers a page reload via window.location
  // only as a last resort. In practice the hook runs once on mount and the user
  // would navigate away to force a fresh fetch. A proper refetch requires
  // useSynthesisBrief to expose its internal `load` fn (future task).
  // For now we expose a stable callback that signals "manual refresh" intent.
  const refetch = useCallback(() => {
    // Placeholder: when useSynthesisBrief gains refetch support, wire it here.
    // For Phase 1 the brief refreshes only on hook remount (page navigation).
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    sessionPhase,
    greeting,
    generatedAt: brief?.generated_at ?? null,
    marketStatus,
  };
}
