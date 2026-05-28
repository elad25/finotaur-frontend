/**
 * Backtest strategy DSL — Phase 3 of the backtest marketing-ready sprint.
 *
 * Intentionally narrow: enough expressive power for the most common
 * trader-described rules ("buy when RSI < 30, exit when RSI > 70", "buy
 * when price crosses above SMA 50") without becoming a programming
 * language. Bigger DSL = more bugs and worse UX.
 *
 * Evaluation rules:
 *   - Conditions evaluate on the CLOSE of each bar.
 *   - Entry/exit ALWAYS at next-bar OPEN (no look-ahead bias).
 *   - One position at a time (no pyramiding in Phase 3).
 *   - SL/TP are checked using each bar's HIGH/LOW (intra-bar fills).
 *   - SL takes precedence over TP if both touched in the same bar
 *     (conservative — assumes worst execution).
 */

// ─── Operands ───────────────────────────────────────────────────
export type PriceField = 'open' | 'high' | 'low' | 'close';

export type IndicatorRef =
  | { type: 'SMA'; period: number }
  | { type: 'EMA'; period: number }
  | { type: 'RSI'; period: number }
  | { type: 'VWAP' };

export type Operand =
  | { kind: 'price'; field: PriceField }
  | { kind: 'indicator'; ref: IndicatorRef }
  | { kind: 'literal'; value: number };

// ─── Comparators ────────────────────────────────────────────────
// Plain comparators (gt/lt/gte/lte) evaluate the current bar only.
// Crossing comparators need the previous bar's values too — handled by
// the engine, which keeps a 1-bar history of computed indicators.
export type Comparator =
  | 'gt'             // left > right
  | 'lt'             // left < right
  | 'gte'            // left >= right
  | 'lte'            // left <= right
  | 'crosses_above'  // left was <= right last bar AND left > right now
  | 'crosses_below'; // left was >= right last bar AND left < right now

export interface Condition {
  left: Operand;
  operator: Comparator;
  right: Operand;
}

// ─── Rules ──────────────────────────────────────────────────────
export type RuleAction = 'OPEN_LONG' | 'OPEN_SHORT' | 'CLOSE';

export interface Rule {
  id: string;
  when: Condition;
  action: RuleAction;
  /** Number of contracts/units. Only used for OPEN_LONG/OPEN_SHORT. */
  size: number;
  /** Stop loss as % of entry price (e.g. 1 = 1%). LONG → entry × (1 − pct/100). */
  stopLossPct?: number;
  /** Take profit as % of entry price (e.g. 2 = 2%). */
  takeProfitPct?: number;
}

// ─── Strategy ───────────────────────────────────────────────────
export interface Strategy {
  id: string;
  name: string;
  /** Human description shown in the picker. */
  notes?: string;
  rules: Rule[];
  /** Unix milliseconds. */
  createdAt: number;
  updatedAt: number;
}

// ─── Builder helpers ────────────────────────────────────────────
export function makeEmptyStrategy(name = 'New Strategy'): Strategy {
  const now = Date.now();
  return {
    id: `strat_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    rules: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function makeRule(action: RuleAction, when: Condition, size: number): Rule {
  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    when,
    action,
    size,
  };
}

// ─── Pretty-print (for UI display) ──────────────────────────────
export function operandLabel(o: Operand): string {
  switch (o.kind) {
    case 'price': return o.field.toUpperCase();
    case 'indicator':
      return o.ref.type === 'VWAP' ? 'VWAP' : `${o.ref.type}(${o.ref.period})`;
    case 'literal': return o.value.toString();
  }
}

export function comparatorLabel(c: Comparator): string {
  switch (c) {
    case 'gt':            return '>';
    case 'lt':            return '<';
    case 'gte':           return '≥';
    case 'lte':           return '≤';
    case 'crosses_above': return 'crosses above';
    case 'crosses_below': return 'crosses below';
  }
}

export function conditionLabel(c: Condition): string {
  return `${operandLabel(c.left)} ${comparatorLabel(c.operator)} ${operandLabel(c.right)}`;
}

export function actionLabel(a: RuleAction): string {
  return a === 'OPEN_LONG' ? 'BUY' : a === 'OPEN_SHORT' ? 'SELL' : 'CLOSE';
}
