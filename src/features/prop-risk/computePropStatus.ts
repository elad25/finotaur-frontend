/**
 * Pure computation of a prop-firm account's live status from its rules + live equity.
 *
 * No React, no I/O — fully testable. Given a normalized rule set (from the catalog or a
 * saved config) and the latest equity readings (+ persisted high-water-mark), it returns
 * drawdown buffer, target progress, daily-loss room, an overall status, and a per-account
 * recommendation (how much is left to target + a suggested max risk per trade).
 */

import type { DrawdownType, LockType, PropPlan } from './propFirmCatalog';

export interface PropRuleSet {
  startingBalance: number;
  profitTarget: number;
  trailingAmount: number;
  drawdownType: DrawdownType;
  dailyLossLimit: number | null;
  lockType: LockType;
  lockValue: number;
  phase: 'evaluation' | 'funded';
}

export interface PropLiveInput {
  balance: number | null; // cash balance
  openPnl: number | null; // unrealized P&L
  dayPnl?: number | null; // session P&L if directly known (the agent reports this)
  hwmEquity?: number | null; // persisted equity high-water-mark
  dayStartEquity?: number | null; // session baseline for daily loss
  enforcedFloor?: number | null; // exact auto-liq threshold from broker (overrides HWM-derived floor)
  enforcedTrailing?: number | null; // broker trailing amount, for the buffer % denominator
}

export type PropStatus =
  | 'on_track'
  | 'at_risk'
  | 'breached'
  | 'target_hit' // evaluation profit target reached
  | 'funded' // funded phase, healthy
  | 'no_data';

export interface PropRecommendation {
  remainingToTarget: number; // $ profit still needed (evaluation)
  recommendedRiskPerTrade: number; // $ suggested max risk per trade
  losersSurvivable: number; // consecutive full-risk losers the DD buffer absorbs
  rationale: string;
}

export interface PropComputed {
  hasData: boolean;
  status: PropStatus;
  currentEquity: number;
  hwmEquity: number;
  drawdownFloor: number;
  ddBufferUsd: number; // equity − floor (dollars before breach)
  ddBufferPct: number; // share of the trailing cushion still available (0..1+)
  breached: boolean;
  targetEquity: number;
  profitMade: number;
  targetProgressPct: number; // 0..1
  passed: boolean;
  dailyLossLimit: number | null;
  dayPnl: number | null;
  dailyRemaining: number | null;
  dailyBreached: boolean;
  recommendation: PropRecommendation;
  /** 'broker' when drawdownFloor came from the exact enforced value pulled from the broker; 'computed' when derived from HWM/lock rules. */
  floorSource: 'broker' | 'computed';
}

const AT_RISK_THRESHOLD = 0.25; // buffer ≤ 25% of the trailing amount → flag "at risk"
const TARGET_LOSERS = 10; // size risk so the buffer survives ~10 consecutive losers

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Normalize a catalog plan into the rule set the compute layer consumes. */
export function ruleSetFromPlan(plan: PropPlan, phase: 'evaluation' | 'funded' = 'evaluation'): PropRuleSet {
  return {
    startingBalance: plan.accountSize,
    profitTarget: plan.profitTarget,
    trailingAmount: plan.trailingAmount,
    drawdownType: plan.drawdownType,
    dailyLossLimit: plan.dailyLossLimit,
    lockType: plan.lockType,
    lockValue: plan.lockValue,
    phase,
  };
}

/** Normalize a saved prop_account_configs row into a rule set. */
export function ruleSetFromConfig(row: {
  starting_balance: number | string;
  profit_target: number | string;
  trailing_amount: number | string;
  drawdown_type: string;
  daily_loss_limit: number | string | null;
  lock_type: string;
  lock_value: number | string;
  phase: string;
}): PropRuleSet {
  const num = (v: number | string | null): number => (v == null ? 0 : typeof v === 'string' ? parseFloat(v) : v);
  return {
    startingBalance: num(row.starting_balance),
    profitTarget: num(row.profit_target),
    trailingAmount: num(row.trailing_amount),
    drawdownType: row.drawdown_type as DrawdownType,
    dailyLossLimit: row.daily_loss_limit == null ? null : num(row.daily_loss_limit),
    lockType: row.lock_type as LockType,
    lockValue: num(row.lock_value),
    phase: row.phase === 'funded' ? 'funded' : 'evaluation',
  };
}

function buildRecommendation(
  rules: PropRuleSet,
  ctx: { ddBufferUsd: number; profitMade: number; dailyRemaining: number | null },
): PropRecommendation {
  const remainingToTarget = Math.max(rules.profitTarget - ctx.profitMade, 0);
  const buffer = Math.max(ctx.ddBufferUsd, 0);

  // Base: spread the drawdown buffer across ~10 losing trades so a cold streak
  // does not blow the account.
  let risk = buffer / TARGET_LOSERS;

  // Never stake more than a third of the remaining daily-loss room on one trade.
  if (ctx.dailyRemaining != null && ctx.dailyRemaining > 0) {
    risk = Math.min(risk, ctx.dailyRemaining / 3);
  }
  risk = Math.max(0, Math.floor(risk / 10) * 10); // round down to the nearest $10

  const losersSurvivable = risk > 0 ? Math.floor(buffer / risk) : 0;

  let rationale: string;
  if (buffer <= 0) {
    rationale = 'Account is at or below its drawdown floor — do not add risk.';
  } else if (ctx.dailyRemaining != null && risk > 0 && risk === Math.floor(ctx.dailyRemaining / 3 / 10) * 10) {
    rationale = `Capped by today's daily-loss room. Risking $${risk.toLocaleString()} keeps ~3 trades of daily buffer.`;
  } else {
    rationale = `Risking $${risk.toLocaleString()} per trade lets the drawdown buffer absorb ~${losersSurvivable} losers in a row.`;
  }

  return { remainingToTarget, recommendedRiskPerTrade: risk, losersSurvivable, rationale };
}

export function computePropStatus(rules: PropRuleSet, live: PropLiveInput): PropComputed {
  const balance = live.balance;
  const openPnl = live.openPnl ?? 0;
  const hasData = balance != null;

  const currentEquity = hasData ? balance + openPnl : live.hwmEquity ?? rules.startingBalance;
  const hwmEquity = Math.max(live.hwmEquity ?? currentEquity, currentEquity);

  // ── Drawdown floor ──
  // When the broker reports the exact enforced auto-liq threshold, use it directly —
  // it IS the dollar level the account gets liquidated at, no HWM/lock derivation needed.
  let drawdownFloor: number;
  let floorSource: 'broker' | 'computed';
  if (live.enforcedFloor != null) {
    drawdownFloor = live.enforcedFloor;
    floorSource = 'broker';
  } else if (rules.drawdownType === 'static') {
    drawdownFloor = rules.startingBalance - rules.trailingAmount;
    floorSource = 'computed';
  } else {
    const rawFloor = hwmEquity - rules.trailingAmount;
    if (rules.lockType === 'none') {
      drawdownFloor = rawFloor;
    } else {
      const cap = rules.startingBalance + (rules.lockType === 'start_plus' ? rules.lockValue : 0);
      drawdownFloor = Math.min(rawFloor, cap);
    }
    floorSource = 'computed';
  }

  const ddBufferUsd = currentEquity - drawdownFloor;
  const effTrailing = live.enforcedTrailing ?? rules.trailingAmount;
  const ddBufferPct = effTrailing > 0 ? ddBufferUsd / effTrailing : 0;
  const breached = hasData && currentEquity <= drawdownFloor;

  // ── Target ──
  const targetEquity = rules.startingBalance + rules.profitTarget;
  const profitMade = currentEquity - rules.startingBalance;
  const targetProgressPct = rules.profitTarget > 0 ? clamp(profitMade / rules.profitTarget, 0, 1) : 0;
  const passed = profitMade >= rules.profitTarget;

  // ── Daily loss ──
  let dayPnl: number | null = live.dayPnl ?? null;
  if (dayPnl == null && live.dayStartEquity != null && hasData) {
    dayPnl = currentEquity - live.dayStartEquity;
  }
  let dailyRemaining: number | null = null;
  let dailyBreached = false;
  if (rules.dailyLossLimit != null) {
    const lossToday = dayPnl != null ? Math.max(0, -dayPnl) : 0;
    dailyRemaining = rules.dailyLossLimit - lossToday;
    dailyBreached = dayPnl != null && lossToday >= rules.dailyLossLimit;
  }

  // ── Status ──
  let status: PropStatus;
  if (!hasData) {
    status = 'no_data';
  } else if (breached || dailyBreached) {
    status = 'breached';
  } else if (rules.phase === 'evaluation' && passed) {
    status = 'target_hit';
  } else if (rules.phase === 'funded') {
    status = ddBufferPct <= AT_RISK_THRESHOLD ? 'at_risk' : 'funded';
  } else {
    status = ddBufferPct <= AT_RISK_THRESHOLD ? 'at_risk' : 'on_track';
  }

  const recommendation = buildRecommendation(rules, { ddBufferUsd, profitMade, dailyRemaining });

  return {
    hasData,
    status,
    currentEquity,
    hwmEquity,
    drawdownFloor,
    ddBufferUsd,
    ddBufferPct,
    breached,
    targetEquity,
    profitMade,
    targetProgressPct,
    passed,
    dailyLossLimit: rules.dailyLossLimit,
    dayPnl,
    dailyRemaining,
    dailyBreached,
    recommendation,
    floorSource,
  };
}

export const PROP_STATUS_META: Record<PropStatus, { label: string; tone: 'good' | 'warn' | 'danger' | 'neutral' }> = {
  on_track: { label: 'On Track', tone: 'good' },
  funded: { label: 'Funded', tone: 'good' },
  target_hit: { label: 'Target Hit', tone: 'good' },
  at_risk: { label: 'At Risk', tone: 'warn' },
  breached: { label: 'Breached', tone: 'danger' },
  no_data: { label: 'Awaiting Data', tone: 'neutral' },
};
