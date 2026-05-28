/**
 * runStrategy — pure simulation of a Strategy against a Bar[] window.
 *
 * Phase 3 of the backtest marketing-ready sprint. Given a historical bar
 * window and a Strategy (a list of Rules with Conditions), simulate the
 * trades the rules would have produced and return them in the same shape as
 * `useBacktestSession.PaperPosition` so the existing chart/markers/stats UI
 * can consume them without translation.
 *
 * Execution model (kept simple — Phase 3 MVP):
 *   - Iterate bars in chronological order. Conditions evaluate on each
 *     bar's CLOSE. Entry/exit fills happen at the NEXT bar's OPEN — this
 *     avoids look-ahead bias and matches how real-time alerts trigger.
 *   - One position at a time (no pyramiding, no scaling in/out).
 *   - On each bar after entry, check SL/TP using that bar's HIGH/LOW. SL
 *     wins ties (worst-case execution assumption).
 *   - Rules with action=CLOSE only fire while a position is open. Their
 *     condition is evaluated against the current bar — close fills at the
 *     next bar's OPEN, same no-look-ahead policy.
 *   - If a strategy has multiple OPEN rules, the FIRST that fires wins
 *     (top-to-bottom). User orders rules by priority in the Builder.
 *   - Final open position at the end of the window is closed at the last
 *     bar's CLOSE with exit_reason='manual' so stats include it.
 */

import type { Bar } from '@/components/charting/types';
import {
  computeEMA,
  computeRSI,
  computeSMA,
  computeVWAP,
  type LineDataPoint,
} from '@/components/charting/indicators';
import type { PaperPosition } from '@/hooks/useBacktestSession';
import type {
  Comparator,
  Condition,
  IndicatorRef,
  Operand,
  PriceField,
  Rule,
  Strategy,
} from '@/types/backtest-strategy';

// ─── Indicator cache ────────────────────────────────────────────
// Indicators are recomputed once per (type, period) combination, then
// served by time-keyed lookup. Two-bar history (curr + prev) is preserved
// so crossing comparators work.
type IndicatorMap = Map<number, number>;   // bar.time → value

function indicatorKey(ref: IndicatorRef): string {
  return ref.type === 'VWAP' ? 'VWAP' : `${ref.type}:${ref.period}`;
}

function pointsToMap(points: LineDataPoint[]): IndicatorMap {
  const m: IndicatorMap = new Map();
  for (const p of points) m.set(p.time as number, p.value);
  return m;
}

function computeIndicator(ref: IndicatorRef, bars: Bar[]): IndicatorMap {
  switch (ref.type) {
    case 'SMA':  return pointsToMap(computeSMA(bars, ref.period));
    case 'EMA':  return pointsToMap(computeEMA(bars, ref.period));
    case 'RSI':  return pointsToMap(computeRSI(bars, ref.period));
    case 'VWAP': return pointsToMap(computeVWAP(bars));
  }
}

// ─── Operand evaluation ─────────────────────────────────────────
function evalOperand(
  operand: Operand,
  bar: Bar,
  indicators: Map<string, IndicatorMap>,
): number | null {
  switch (operand.kind) {
    case 'literal':
      return operand.value;
    case 'price':
      return bar[operand.field as PriceField];
    case 'indicator': {
      const map = indicators.get(indicatorKey(operand.ref));
      if (!map) return null;
      const v = map.get(bar.time as number);
      return v == null ? null : v;
    }
  }
}

// ─── Condition evaluation ───────────────────────────────────────
function evalCondition(
  condition: Condition,
  bar: Bar,
  prevBar: Bar | undefined,
  indicators: Map<string, IndicatorMap>,
): boolean {
  const left = evalOperand(condition.left, bar, indicators);
  const right = evalOperand(condition.right, bar, indicators);
  if (left == null || right == null) return false;

  switch (condition.operator) {
    case 'gt':  return left >  right;
    case 'lt':  return left <  right;
    case 'gte': return left >= right;
    case 'lte': return left <= right;
    case 'crosses_above':
    case 'crosses_below': {
      if (!prevBar) return false;
      const prevLeft = evalOperand(condition.left, prevBar, indicators);
      const prevRight = evalOperand(condition.right, prevBar, indicators);
      if (prevLeft == null || prevRight == null) return false;
      return condition.operator === 'crosses_above'
        ? prevLeft <= prevRight && left > right
        : prevLeft >= prevRight && left < right;
    }
  }
}

// ─── Position math ──────────────────────────────────────────────
function applySLTP(
  pos: PaperPosition,
  bar: Bar,
): { exitPrice: number; reason: 'sl' | 'tp' } | null {
  // SL wins ties (worst-case execution).
  if (pos.side === 'LONG') {
    if (pos.stopLoss != null && bar.low <= pos.stopLoss) {
      return { exitPrice: pos.stopLoss, reason: 'sl' };
    }
    if (pos.takeProfit != null && bar.high >= pos.takeProfit) {
      return { exitPrice: pos.takeProfit, reason: 'tp' };
    }
  } else {
    if (pos.stopLoss != null && bar.high >= pos.stopLoss) {
      return { exitPrice: pos.stopLoss, reason: 'sl' };
    }
    if (pos.takeProfit != null && bar.low <= pos.takeProfit) {
      return { exitPrice: pos.takeProfit, reason: 'tp' };
    }
  }
  return null;
}

function computePnL(pos: PaperPosition, exitPrice: number): {
  pnl: number;
  pnlPercent: number;
} {
  const direction = pos.side === 'LONG' ? 1 : -1;
  const pnl = (exitPrice - pos.entryPrice) * direction * pos.size;
  const pnlPercent = (((exitPrice - pos.entryPrice) * direction) / pos.entryPrice) * 100;
  return { pnl, pnlPercent };
}

function computeSLTPLevels(
  side: 'LONG' | 'SHORT',
  entryPrice: number,
  stopLossPct?: number,
  takeProfitPct?: number,
): { stopLoss?: number; takeProfit?: number } {
  if (stopLossPct == null && takeProfitPct == null) return {};
  const slDistance = stopLossPct != null ? entryPrice * (stopLossPct / 100) : null;
  const tpDistance = takeProfitPct != null ? entryPrice * (takeProfitPct / 100) : null;
  if (side === 'LONG') {
    return {
      stopLoss: slDistance != null ? entryPrice - slDistance : undefined,
      takeProfit: tpDistance != null ? entryPrice + tpDistance : undefined,
    };
  }
  return {
    stopLoss: slDistance != null ? entryPrice + slDistance : undefined,
    takeProfit: tpDistance != null ? entryPrice - tpDistance : undefined,
  };
}

// ─── Engine ─────────────────────────────────────────────────────
export interface RunStrategyResult {
  trades: PaperPosition[];
  /** Rules that never fired — surfaced so the UI can warn the user. */
  unusedRuleIds: string[];
  /** Bars scanned. */
  barsScanned: number;
}

export function runStrategy(strategy: Strategy, bars: Bar[]): RunStrategyResult {
  if (bars.length < 2) {
    return { trades: [], unusedRuleIds: strategy.rules.map((r) => r.id), barsScanned: bars.length };
  }

  // ── Pre-compute every distinct indicator the strategy references ──
  const neededIndicators = new Map<string, IndicatorRef>();
  for (const rule of strategy.rules) {
    for (const operand of [rule.when.left, rule.when.right]) {
      if (operand.kind === 'indicator') {
        neededIndicators.set(indicatorKey(operand.ref), operand.ref);
      }
    }
  }
  const indicators = new Map<string, IndicatorMap>();
  for (const [key, ref] of neededIndicators) {
    indicators.set(key, computeIndicator(ref, bars));
  }

  const trades: PaperPosition[] = [];
  const firedRuleIds = new Set<string>();
  let activePos: PaperPosition | null = null;
  // Pending entry/exit actions decided on bar i and executed at bar i+1's open.
  let pendingAction: { kind: 'OPEN'; rule: Rule } | { kind: 'CLOSE'; reason: 'manual' } | null =
    null;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const prevBar = i > 0 ? bars[i - 1] : undefined;

    // 1. Execute pending action at this bar's OPEN.
    // Note: openedThisBar lets us skip the SL/TP check for the same bar a
    // position was entered on — real brokers don't fill SL/TP on the entry
    // bar because the OPEN already used that bar's liquidity, and intra-bar
    // order arrival is undefined without tick data. Without this guard,
    // volatile bars produce phantom same-bar stopouts.
    let openedThisBar = false;
    if (pendingAction) {
      if (pendingAction.kind === 'OPEN' && !activePos) {
        const rule = pendingAction.rule;
        const side = rule.action === 'OPEN_LONG' ? 'LONG' : 'SHORT';
        const sltp = computeSLTPLevels(side, bar.open, rule.stopLossPct, rule.takeProfitPct);
        activePos = {
          id: `strat_pos_${bar.time}_${trades.length}`,
          side,
          entryTime: bar.time as number,
          entryPrice: bar.open,
          size: rule.size,
          stopLoss: sltp.stopLoss,
          takeProfit: sltp.takeProfit,
        };
        openedThisBar = true;
      } else if (pendingAction.kind === 'CLOSE' && activePos) {
        const { pnl, pnlPercent } = computePnL(activePos, bar.open);
        trades.push({
          ...activePos,
          exitTime: bar.time as number,
          exitPrice: bar.open,
          pnl,
          pnlPercent,
          exitReason: pendingAction.reason,
        });
        activePos = null;
      }
      pendingAction = null;
    }

    // 2. Check SL/TP for an active position (intra-bar via high/low).
    if (activePos && !openedThisBar) {
      const hit = applySLTP(activePos, bar);
      if (hit) {
        const { pnl, pnlPercent } = computePnL(activePos, hit.exitPrice);
        trades.push({
          ...activePos,
          exitTime: bar.time as number,
          exitPrice: hit.exitPrice,
          pnl,
          pnlPercent,
          exitReason: hit.reason,
        });
        activePos = null;
      }
    }

    // 3. Evaluate rules on this bar's CLOSE — first match wins.
    for (const rule of strategy.rules) {
      const fires = evalCondition(rule.when, bar, prevBar, indicators);
      if (!fires) continue;
      // CLOSE rules only fire when a position is open; OPEN rules only
      // when none is open. This keeps the priority list intuitive.
      if (rule.action === 'CLOSE' && activePos && !pendingAction) {
        pendingAction = { kind: 'CLOSE', reason: 'manual' };
        firedRuleIds.add(rule.id);
        break;
      }
      if ((rule.action === 'OPEN_LONG' || rule.action === 'OPEN_SHORT') && !activePos && !pendingAction) {
        pendingAction = { kind: 'OPEN', rule };
        firedRuleIds.add(rule.id);
        break;
      }
    }
  }

  // 4. Window ended with an open position — close at last bar's close.
  if (activePos) {
    const lastBar = bars[bars.length - 1];
    const { pnl, pnlPercent } = computePnL(activePos, lastBar.close);
    trades.push({
      ...activePos,
      exitTime: lastBar.time as number,
      exitPrice: lastBar.close,
      pnl,
      pnlPercent,
      exitReason: 'manual',
    });
    activePos = null;
  }

  const unusedRuleIds = strategy.rules.filter((r) => !firedRuleIds.has(r.id)).map((r) => r.id);
  return { trades, unusedRuleIds, barsScanned: bars.length };
}
