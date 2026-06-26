// src/features/automation/lib/riskEvaluation.ts
// ─────────────────────────────────────────────────────────────────────────────
// PURE function: evaluateRisk(trades, rule) => RiskAlert[]
//
// NOTIFY-ONLY. Zero side effects, zero execution, zero broker writes.
// This file computes alerts from already-fetched trade data.
//
// Thresholds:
//   status 'warning' when current >= 80% of limit
//   status 'breach'  when current >= 100% of limit
// ─────────────────────────────────────────────────────────────────────────────

import type { AutomationRiskRule, RiskAlert, RiskAlertStatus, RiskAlertType } from './automationTypes';

// The minimal trade shape we need — matches fields from useTradesData's Trade type.
// Using a minimal interface avoids importing the full Trade type (which carries
// many fields we don't need here) and keeps this file dependency-light.
export interface TradeSummary {
  /** ISO timestamp of trade open. Used to filter to today. */
  open_at: string;
  /** ISO timestamp of trade close. Undefined = open position. */
  close_at?: string;
  /** Realized P&L in USD. Present on closed trades; absent on open ones. */
  pnl?: number;
  /** Number of contracts / shares traded. */
  quantity?: number;
  /** Outcome field: 'OPEN' signals an unclosed position. */
  outcome?: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Returns true when the trade was opened today (in the user's local timezone). */
function isToday(isoTimestamp: string): boolean {
  const tradeDate = new Date(isoTimestamp);
  const now = new Date();
  return (
    tradeDate.getFullYear() === now.getFullYear() &&
    tradeDate.getMonth() === now.getMonth() &&
    tradeDate.getDate() === now.getDate()
  );
}

function computeStatus(current: number, limit: number): RiskAlertStatus {
  const ratio = Math.abs(current) / Math.abs(limit);
  if (ratio >= 1) return 'breach';
  if (ratio >= 0.8) return 'warning';
  return 'ok';
}

function makeAlert(
  type: RiskAlertType,
  current: number,
  limit: number,
  message: string,
  ruleId: string,
  ruleLabel: string,
): RiskAlert {
  return {
    type,
    status: computeStatus(current, limit),
    current,
    limit,
    message,
    ruleId,
    ruleLabel,
  };
}

// ── main export ───────────────────────────────────────────────────────────────

/**
 * Evaluate risk alerts for a single rule against today's trade data.
 *
 * Returns one RiskAlert per configured limit (skips limits that are null/zero).
 * All returned alerts have status 'ok', 'warning', or 'breach'.
 *
 * @param trades  Full trade array from the journal hook (all dates). The fn
 *                filters internally to today's trades.
 * @param rule    An automation_risk_rules row with is_active=true.
 */
export function evaluateRisk(trades: TradeSummary[], rule: AutomationRiskRule): RiskAlert[] {
  const todayTrades = trades.filter((t) => isToday(t.open_at));
  const alerts: RiskAlert[] = [];

  // ── 1. Daily realized P&L vs daily_loss_limit_usd ─────────────────────────
  // Only closed trades contribute to realized P&L (outcome !== 'OPEN' and
  // close_at is set). We treat the limit as a LOSS limit (positive number),
  // so we measure how much of the loss budget has been consumed.
  if (rule.daily_loss_limit_usd != null && rule.daily_loss_limit_usd > 0) {
    const realizedPnl = todayTrades
      .filter((t) => t.outcome !== 'OPEN' && t.close_at)
      .reduce((sum, t) => sum + (t.pnl ?? 0), 0);

    // realizedPnl is negative when losing. We compare its absolute value
    // against the loss limit (positive), but only when we're actually losing.
    const lossAmount = Math.max(0, -realizedPnl); // 0 if profitable
    const pnlFormatted = realizedPnl.toFixed(2);
    const limitFormatted = rule.daily_loss_limit_usd.toFixed(2);

    alerts.push(
      makeAlert(
        'daily_loss',
        lossAmount,
        rule.daily_loss_limit_usd,
        `Daily loss: $${pnlFormatted} vs -$${limitFormatted} limit`,
        rule.id,
        rule.label,
      ),
    );
  }

  // ── 2. Open contracts vs max_contracts ────────────────────────────────────
  // Count the total quantity of open (OPEN outcome) trades today.
  if (rule.max_contracts != null && rule.max_contracts > 0) {
    const openContracts = todayTrades
      .filter((t) => t.outcome === 'OPEN' || !t.close_at)
      .reduce((sum, t) => sum + (t.quantity ?? 0), 0);

    alerts.push(
      makeAlert(
        'max_contracts',
        openContracts,
        rule.max_contracts,
        `Open contracts: ${openContracts} / ${rule.max_contracts} max`,
        rule.id,
        rule.label,
      ),
    );
  }

  // ── 3. Trade count vs max_trades_per_day ──────────────────────────────────
  if (rule.max_trades_per_day != null && rule.max_trades_per_day > 0) {
    const tradeCount = todayTrades.length;
    alerts.push(
      makeAlert(
        'max_trades',
        tradeCount,
        rule.max_trades_per_day,
        `Trades today: ${tradeCount} / ${rule.max_trades_per_day} max`,
        rule.id,
        rule.label,
      ),
    );
  }

  // ── 4. Consecutive loss streak vs tilt_loss_streak ────────────────────────
  // Walk today's closed trades in chronological order and count the current
  // tail of consecutive losses.
  if (rule.tilt_loss_streak != null && rule.tilt_loss_streak > 0) {
    const closedToday = todayTrades
      .filter((t) => t.outcome !== 'OPEN' && t.close_at)
      .slice() // avoid mutating
      .sort((a, b) => new Date(a.open_at).getTime() - new Date(b.open_at).getTime());

    let streak = 0;
    for (let i = closedToday.length - 1; i >= 0; i--) {
      const pnl = closedToday[i].pnl ?? 0;
      if (pnl < 0) {
        streak++;
      } else {
        break; // streak broken by a non-loss
      }
    }

    alerts.push(
      makeAlert(
        'tilt_streak',
        streak,
        rule.tilt_loss_streak,
        `Loss streak: ${streak} / ${rule.tilt_loss_streak} consecutive losses`,
        rule.id,
        rule.label,
      ),
    );
  }

  return alerts;
}
