/**
 * Pure autotag engine — NO side effects.
 *
 * A rule fires when ALL of its conditions match the trade (AND logic).
 * String comparisons are case-insensitive for symbol, session, side, outcome.
 * Numeric ops (gt/lt) apply to pnl and rr.
 * 'contains' does substring match for string fields.
 */

import type { Trade } from '@/hooks/useTradesData';

export type AutoTagCondition = {
  field: 'session' | 'side' | 'symbol' | 'outcome' | 'pnl' | 'rr';
  op: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
  value: string | number;
};

export type AutoTagRule = {
  id: string;
  tag: string;
  conditions: AutoTagCondition[];
  isActive: boolean;
  order: number;
  createdAt: string;
};

// ── Field extraction ───────────────────────────────────────

function getField(trade: Trade, field: AutoTagCondition['field']): string | number | undefined {
  switch (field) {
    case 'session':
      return trade.session;
    case 'side':
      return trade.side;
    case 'symbol':
      return trade.symbol;
    case 'outcome':
      return trade.outcome;
    case 'pnl':
      return trade.pnl;
    case 'rr': {
      // Use same priority as scoring engine
      const r = trade.actual_user_r ?? trade.actual_r ?? trade.rr;
      return r === undefined || r === null ? undefined : Number(r);
    }
    default:
      return undefined;
  }
}

// ── Condition evaluation ───────────────────────────────────

function evaluateCondition(trade: Trade, cond: AutoTagCondition): boolean {
  const raw = getField(trade, cond.field);

  // Numeric ops
  if (cond.op === 'gt' || cond.op === 'lt') {
    if (raw === undefined || raw === null) return false;
    const numRaw = Number(raw);
    const numVal = Number(cond.value);
    if (!Number.isFinite(numRaw) || !Number.isFinite(numVal)) return false;
    return cond.op === 'gt' ? numRaw > numVal : numRaw < numVal;
  }

  // String ops — case-insensitive
  const strRaw = raw !== undefined && raw !== null ? String(raw).toLowerCase() : '';
  const strVal = String(cond.value).toLowerCase();

  switch (cond.op) {
    case 'eq':
      return strRaw === strVal;
    case 'neq':
      return strRaw !== strVal;
    case 'contains':
      return strRaw.includes(strVal);
    default:
      return false;
  }
}

// ── Public API ─────────────────────────────────────────────

/** Returns true when ALL conditions in the array match the trade (AND logic). */
export function tradeMatchesRule(trade: Trade, conditions: AutoTagCondition[]): boolean {
  if (conditions.length === 0) return false;
  return conditions.every(c => evaluateCondition(trade, c));
}

/**
 * Returns a deduplicated list of tags from all active rules whose
 * conditions all match the trade.
 */
export function computeAutoTags(trade: Trade, rules: AutoTagRule[]): string[] {
  const tags = new Set<string>();
  for (const rule of rules) {
    if (!rule.isActive) continue;
    if (tradeMatchesRule(trade, rule.conditions)) {
      tags.add(rule.tag);
    }
  }
  return Array.from(tags);
}
