// ============================================================================
// SIGNAL BUILDER V2 — turn a completed phase attempt into a priced TradeSignalV2
// ============================================================================
//
// Mirrors `../SignalBuilder.ts` (v1) in spirit: resolve entry/stop/target to
// concrete prices, reject (return null) if the resulting geometry is invalid
// (stop on the wrong side of entry, ~zero risk distance). v2 has no
// `Detection`/`Zone` — instead every price comes from `CompiledStrategy`'s
// shared LevelRef/AnchorRef accessors (`resolveLevel` / `resolveAnchor`,
// built once by `ConditionCompiler.compileStrategy`) plus the ATR series
// (reused from v1's `MarketContext`, per the StrategyEngine module doc) and
// the anchors the phase state machine captured during this attempt.
//
// LOOK-AHEAD GUARANTEE
// ---------------------
// Called exactly once, at the bar `i` where the strategy's LAST phase
// completes (`armIndex = i`). Every value read — LevelBank/EventBank series,
// ATR, captured anchors — is only ever derived from candles `<= i` (same
// causal discipline as every bank in this module).
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import type { CompiledStrategy, RuntimeState } from './ConditionCompiler';
import type { AnchorKind, EntryRuleV2, ExitRuleV2, StopRuleV2 } from './types';

const EPS = 1e-9;

export interface TradeSignalV2 {
  direction: 'long' | 'short';
  /** Earliest bar the signal can be filled (== the bar the last phase fired). */
  armIndex: number;
  /** Reference price only for 'market' orders (engine fills at next open);
   *  the actual limit price for 'limit' orders. */
  entryPrice: number;
  orderType: 'market' | 'limit';
  stopLoss: number;
  takeProfit: number;
  validForBars: number;
}

/**
 * Build a priced `TradeSignalV2` from a just-completed attempt, or `null` if
 * the geometry is invalid (unresolvable reference, stop on the wrong side of
 * entry, near-zero risk).
 *
 * @param compiled compiled strategy (shared LevelRef/AnchorRef resolvers)
 * @param candles  full candle series
 * @param i        bar index the last phase completed on
 * @param state    the attempt's RuntimeState (anchors already captured for
 *                 THIS phase before calling — see StrategyEngine.ts)
 * @param dir      resolved trade direction for this attempt
 * @param atr      causal ATR series (index-aligned to `candles`), reused
 *                 from v1's `MarketContext.atr` — see StrategyEngine.ts
 */
export function buildSignalV2(
  compiled: CompiledStrategy,
  candles: Candle[],
  i: number,
  state: RuntimeState,
  dir: 'long' | 'short',
  atr: number[],
): TradeSignalV2 | null {
  const def = compiled.def;
  if (i < 0 || i >= candles.length) return null;

  const entryPrice = resolveEntry(def.entry, compiled, candles, i, state);
  if (entryPrice === null || !Number.isFinite(entryPrice) || entryPrice <= 0) return null;

  const stopLoss = resolveStop(def.stop, compiled, candles, i, state, dir, entryPrice, atr);
  if (stopLoss === null || !Number.isFinite(stopLoss) || stopLoss <= 0) return null;

  if (dir === 'long' && stopLoss >= entryPrice - EPS) return null;
  if (dir === 'short' && stopLoss <= entryPrice + EPS) return null;

  const takeProfit = resolveTarget(def.exits.target, compiled, i, state, dir, entryPrice, stopLoss);
  if (takeProfit === null || !Number.isFinite(takeProfit) || takeProfit <= 0) return null;

  if (dir === 'long' && takeProfit <= entryPrice + EPS) return null;
  if (dir === 'short' && takeProfit >= entryPrice - EPS) return null;

  return {
    direction: dir,
    armIndex: i,
    entryPrice,
    orderType: def.entry.orderType,
    stopLoss,
    takeProfit,
    validForBars: def.entry.validForBars,
  };
}

// ----------------------------------------------------------------------------
// Entry
// ----------------------------------------------------------------------------

function resolveEntry(
  rule: EntryRuleV2,
  compiled: CompiledStrategy,
  candles: Candle[],
  i: number,
  state: RuntimeState,
): number | null {
  if (rule.orderType === 'market') {
    // Reference price only — the engine's OrderExecutionEngine fills market
    // orders at the NEXT bar's open (earliest fill i+1), same as v1.
    return candles[i].close;
  }
  // 'limit': the priceAnchor IS the limit price. Required by
  // validateStrategyStructure when orderType === 'limit'.
  if (!rule.priceAnchor) return null;
  const v = compiled.resolveAnchor(rule.priceAnchor)(i, state);
  return Number.isNaN(v) ? null : v;
}

// ----------------------------------------------------------------------------
// Stop
// ----------------------------------------------------------------------------

function resolveStop(
  rule: StopRuleV2,
  compiled: CompiledStrategy,
  candles: Candle[],
  i: number,
  state: RuntimeState,
  dir: 'long' | 'short',
  entry: number,
  atr: number[],
): number | null {
  switch (rule.basis) {
    case 'atr': {
      const a = atr[i] || 0;
      const mult = rule.bufferAtrMult ?? 1.5;
      if (a <= 0) return null;
      // Dual-use field: bufferAtrMult IS the stop distance for this basis
      // (see StopRuleV2 doc) — no separate buffer applied on top.
      return dir === 'long' ? entry - mult * a : entry + mult * a;
    }
    case 'fixedPct': {
      // Dual-use field: bufferPct IS the stop distance for this basis.
      const pct = (rule.bufferPct ?? 1) / 100;
      return dir === 'long' ? entry * (1 - pct) : entry * (1 + pct);
    }
    case 'wick':
    case 'structure':
    case 'level':
    case 'phaseAnchor': {
      const raw = resolveStopRawAnchor(rule, compiled, candles, i, state, dir);
      if (raw === null) return null;
      const bufferPct = (rule.bufferPct ?? 0) / 100;
      return dir === 'long' ? raw * (1 - bufferPct) : raw * (1 + bufferPct);
    }
    /* istanbul ignore next -- exhaustiveness guard */
    default: {
      const _exhaustive: never = rule.basis;
      throw new Error(`SignalBuilderV2.resolveStop: unknown basis ${JSON.stringify(_exhaustive)}`);
    }
  }
}

function resolveStopRawAnchor(
  rule: StopRuleV2,
  compiled: CompiledStrategy,
  candles: Candle[],
  i: number,
  state: RuntimeState,
  dir: 'long' | 'short',
): number | null {
  switch (rule.basis) {
    case 'wick':
      // Just beyond the triggering phase's captured wick extreme.
      return findAnchorAcrossPhases(compiled, state, 'wickExtreme');
    case 'structure':
      // Just beyond the reference structure — the counterSwing anchor
      // (nearest confirmed swing AGAINST the trade direction).
      return findAnchorAcrossPhases(compiled, state, 'counterSwing');
    case 'level': {
      if (!rule.level) return null;
      const v = compiled.resolveLevel(rule.level)(i, state);
      return Number.isNaN(v) ? null : v;
    }
    case 'phaseAnchor': {
      if (!rule.phaseRef) return null;
      const v = compiled.resolveAnchor(rule.phaseRef)(i, state);
      return Number.isNaN(v) ? null : v;
    }
    default:
      return null;
  }
}

/**
 * Scan captured anchors from the LAST phase backward to phase 0 and return
 * the first defined value for `anchor`. Strategies declare WHICH phase
 * captures a given AnchorKind via `PhaseV2.capture`; stop/target resolution
 * doesn't know (or need to know) which one ahead of time — it uses whichever
 * phase in this attempt actually captured it, preferring the most recent.
 */
function findAnchorAcrossPhases(
  compiled: CompiledStrategy,
  state: RuntimeState,
  anchor: AnchorKind,
): number | null {
  for (let idx = compiled.phases.length - 1; idx >= 0; idx--) {
    const captured = state.anchors.get(compiled.phases[idx].id);
    const v = captured?.[anchor];
    if (v !== undefined && !Number.isNaN(v)) return v;
  }
  return null;
}

// ----------------------------------------------------------------------------
// Target
// ----------------------------------------------------------------------------

function resolveTarget(
  rule: ExitRuleV2['target'],
  compiled: CompiledStrategy,
  i: number,
  state: RuntimeState,
  dir: 'long' | 'short',
  entry: number,
  stop: number,
): number | null {
  const risk = Math.abs(entry - stop);
  if (risk <= EPS) return null;

  switch (rule.basis) {
    case 'rMultiple': {
      const r = rule.value ?? 2;
      return dir === 'long' ? entry + r * risk : entry - r * risk;
    }
    case 'fixedPct': {
      const pct = (rule.value ?? 2) / 100;
      return dir === 'long' ? entry * (1 + pct) : entry * (1 - pct);
    }
    case 'level': {
      if (!rule.level) return null;
      const v = compiled.resolveLevel(rule.level)(i, state);
      return Number.isNaN(v) ? null : v;
    }
    /* istanbul ignore next -- exhaustiveness guard */
    default: {
      const _exhaustive: never = rule.basis;
      throw new Error(`SignalBuilderV2.resolveTarget: unknown basis ${JSON.stringify(_exhaustive)}`);
    }
  }
}
