// src/features/automation/hooks/useRiskMonitor.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pulls today's trades (via the canonical useTrades hook), runs evaluateRisk
// against each active risk rule, and returns the aggregated alert list.
//
// NOTIFY-ONLY. This hook never writes to the DB or executes any broker action.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useTrades } from '@/hooks/useTradesData';
import { useRiskRules } from './useRiskRules';
import { evaluateRisk } from '../lib/riskEvaluation';
import type { RiskAlert } from '../lib/automationTypes';

export interface RiskMonitorResult {
  /** All alerts (ok + warning + breach) from every active rule. */
  alerts: RiskAlert[];
  /** True while either trades or rules are loading. */
  isLoading: boolean;
  /** True if either fetch failed. */
  isError: boolean;
  /** Number of alerts with status 'breach'. */
  breachCount: number;
  /** Number of alerts with status 'warning'. */
  warningCount: number;
}

export function useRiskMonitor(): RiskMonitorResult {
  // Fetch all trades for the current user. We pass null portfolioId (= all
  // accounts) and no skipCopyAggregation so we get the canonical aggregated
  // view, consistent with what the journal Overview shows.
  const {
    data: trades = [],
    isLoading: tradesLoading,
    isError: tradesError,
  } = useTrades();

  const {
    rules,
    isLoading: rulesLoading,
    isError: rulesError,
  } = useRiskRules();

  const alerts = useMemo((): RiskAlert[] => {
    if (!trades.length || !rules.length) return [];

    const activeRules = rules.filter((r) => r.is_active);
    return activeRules.flatMap((rule) => evaluateRisk(trades, rule));
  }, [trades, rules]);

  const breachCount = useMemo(() => alerts.filter((a) => a.status === 'breach').length, [alerts]);
  const warningCount = useMemo(() => alerts.filter((a) => a.status === 'warning').length, [alerts]);

  return {
    alerts,
    isLoading: tradesLoading || rulesLoading,
    isError: tradesError || rulesError,
    breachCount,
    warningCount,
  };
}
