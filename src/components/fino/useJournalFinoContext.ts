// src/components/fino/useJournalFinoContext.ts
// =====================================================
// Registers journal-aware context for FINO: the trader's overall performance
// summary (from useUserJournalStats) plus, optionally, the specific trade/day
// the user is currently looking at. While a journal page using this hook is
// mounted, FINO can ground its answers in the user's real numbers instead of
// giving generic coaching.
// =====================================================

import { useMemo } from 'react';
import { useUserJournalStats } from '@/hooks/useUserJournalStats';
import { useTrades, type Trade } from '@/hooks/useTradesData';
import { buildAggregate } from '@/lib/journal/plannedScenarios';
import { buildShadowInsights } from '@/lib/journal/shadowInsight';
import {
  useRegisterFinoContext,
  type FinoPageData,
} from '@/contexts/FinoChatContext';

/** A compact, already-shaped entity (trade or day) the page is focused on. */
export type JournalFinoEntity = Record<string, unknown>;

function round2(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Call inside a journal page. Registers the performance summary always, and the
 * focused entity when provided. Pass a compact entity object (not the raw row)
 * so we keep the prompt small and free of irrelevant/PII fields.
 */
export function useRegisterJournalFinoContext(entity?: JournalFinoEntity | null): void {
  const { data: stats } = useUserJournalStats();
  const { data: allTrades } = useTrades();

  // SHADOW read — deterministic counterfactual coaching derived from the
  // trader's own recorded decisions (same engine as the Shadow page). Lets
  // FINO ground discipline/what-if answers in real numbers when relevant.
  const shadow = useMemo(() => {
    const closed = (allTrades ?? []).filter(
      (t: Trade) => t.exit_price != null && t.exit_price > 0 && t.close_at != null,
    );
    if (closed.length === 0) return null;

    const agg = buildAggregate(closed);
    const insights = buildShadowInsights(closed).slice(0, 3).map((i) => ({
      angle: i.angle,
      severity: i.severity,
      headline: i.headline,
      detail: i.detail,
    }));

    return {
      // Cumulative $ across all closed trades under each management rule.
      scenarioTotals: {
        actual: round2(agg.totals.actual),
        heldToTarget: round2(agg.totals.target),
        heldToStop: round2(agg.totals.stop),
      },
      coverage: agg.coverage, // { total, withStop, withTarget }
      insights, // ranked, biggest-impact first
    };
  }, [allTrades]);

  const pageData = useMemo<FinoPageData>(() => {
    const summary = stats
      ? {
          closedTrades: stats.total_closed,
          winRatePct: Math.round((stats.win_rate ?? 0) * 100),
          netPnl: round2(stats.net_pnl),
          profitFactor: stats.profit_factor,
          avgRR: round2(stats.avg_rr),
          avgWin: round2(stats.avg_win),
          avgLoss: round2(stats.avg_loss),
          expectancy: round2(stats.expectancy),
          wins: stats.wins,
          losses: stats.losses,
        }
      : null;

    return { kind: 'journal', summary, shadow, entity: entity ?? undefined };
  }, [stats, shadow, entity]);

  useRegisterFinoContext(pageData);
}
