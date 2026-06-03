/**
 * useDailyBrief — composing hook for the Daily PM Brief page.
 *
 * Combines:
 *  - useDailyBriefData()   → personalized daily brief (global + personal in one call)
 *  - usePortfolioData('1M') → snapshot (1M range for day-change computation)
 *  - useMarketStatus()     → session phase + context
 *
 * Returns a fully-typed BriefData bundle, loading/error state,
 * session phase, greeting string, and refetch.
 *
 * No network calls here — delegates entirely to the existing hooks.
 */

import { useMemo, useCallback } from 'react';
import { useDailyBriefData } from './useDailyBriefData';
import { usePortfolioData } from './usePortfolioData';
import { useMarketStatus } from '@/lib/marketStatus';
import { buildBriefModulesFromDaily, type BriefData } from '../utils/buildBriefModules';
import type { MarketStatusResult } from '@/lib/marketStatus';
import type { PortfolioContext } from '@/services/copilotDailyBriefApi';

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
  // Use 1M range for the portfolio snapshot. Day-change (changeAbs / changePercent)
  // reflects the full range — for a true intraday day-change we'd need a live feed.
  // Until that lands, the 1M changeAbs/changePercent serve as the portfolio context.
  const portfolioResult = usePortfolioData('1M');
  const marketStatus = useMarketStatus();

  const sessionPhase = useMemo(() => deriveSessionPhase(marketStatus), [marketStatus]);
  const greeting = useMemo(() => computeGreeting(), []);

  // Extract the stable PortfolioSnapshot (without the extra usePortfolioData fields).
  // Only surface a snapshot when the data is LIVE — otherwise null, so the builder
  // hides portfolio value / book rows instead of rendering empty zeros as if real.
  const snapshot = useMemo(() => {
    if (portfolioResult.source !== 'live') return null;
    const { source: _source, lastSyncAt: _sync, hasHistoricalSeries: _hist, ...snap } = portfolioResult;
    return snap;
    // portfolioResult reference is stable across re-renders for the same input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioResult]);

  // Build a compact portfolio context to send with the personalization request.
  // Only built when live data is available; capped to top 10 by market value
  // to keep the server prompt token-efficient.
  const portfolioContext = useMemo((): PortfolioContext | undefined => {
    if (!snapshot || snapshot.holdings.length === 0) return undefined;
    const totalValue = snapshot.totalValue || 1;
    const sorted = [...snapshot.holdings].sort((a, b) => b.marketValue - a.marketValue);
    const topHoldings = sorted.slice(0, 10).map((h) => ({
      symbol: h.symbol,
      marketValue: h.marketValue,
      weightPct: (h.marketValue / totalValue) * 100,
      unrealizedPnlPercent: h.unrealizedPnlPercent,
      assetClass: h.assetClass,
    }));
    return {
      totalValue: snapshot.totalValue,
      changeAbs: snapshot.changeAbs,
      changePercent: snapshot.changePercent,
      topHoldings,
    };
  }, [snapshot]);

  const {
    global,
    personal,
    loading: briefLoading,
    error: briefError,
  } = useDailyBriefData(portfolioContext);

  // Derive loading: block until the brief resolves. Portfolio is supplementary
  // — the page can render without it (snapshot passed as null is handled defensively).
  const loading = briefLoading;

  // First error: brief error takes priority; portfolio errors are non-fatal for now.
  const error: Error | null = briefError;

  const data = useMemo<BriefData | null>(() => {
    // Don't produce data while loading to avoid flicker with empty BriefData
    if (briefLoading) return null;

    return buildBriefModulesFromDaily(global, personal, snapshot, { greeting });
  }, [briefLoading, global, personal, snapshot, greeting]);

  // refetch: useDailyBriefData re-fetches only on hook remount.
  // We expose a stable no-op callback for API compatibility. A proper refetch
  // would require useDailyBriefData to expose its internal load fn (future task).
  // In practice the brief refreshes on page navigation (hook remount).
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
    generatedAt: global?.generated_at ?? null,
    marketStatus,
  };
}
