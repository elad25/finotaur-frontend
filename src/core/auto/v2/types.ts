// ============================================================================
// STRATEGY ENGINE v2 — GENERIC RULES-ENGINE SCHEMA (Increment 1)
// ============================================================================
//
// This file is the CONTRACT for the v2 generic rules engine: a phase state
// machine (<= MAX_PHASES phases) whose triggers are bounded condition trees
// (depth <= MAX_DEPTH, <= MAX_CHILDREN children per and/or node) over a
// CLOSED primitive vocabulary (Operand / Condition / LevelRef / IndicatorRef
// / event names). Everything here is PLAIN, JSON-serializable data — no
// functions, no classes, no Date objects — so a StrategyDefinitionV2 can
// round-trip through JSON.stringify / structuredClone and be persisted or
// posted into a Web Worker without loss, exactly like v1's SetupDefinition.
//
// v1 (`../types.ts` — SetupDefinition + AutoBacktestEngine) is FROZEN and
// UNTOUCHED. v2 lives beside it. Where a v1 concept is identical in shape
// (SessionFilter, RiskConfig, Direction, PatternParams), v2 imports it
// READ-ONLY rather than redefining it, so the two schemas never drift apart
// by accident.
//
// LOOK-AHEAD SAFETY lives in the engine/banks that CONSUME this schema
// (LevelBank, EventBank, and the future PhaseEngine/compiler), not in these
// type definitions. This file only describes shape + structural bounds.
// ============================================================================

import type {
  Direction,
  PatternParams,
  RiskConfig,
  SessionFilter,
} from '../types';
import type { Timeframe } from '../../../components/ReplayChart/types';

// ----------------------------------------------------------------------------
// Structural caps — the "bounded condition tree" contract.
// ----------------------------------------------------------------------------

/** Maximum number of phases a StrategyDefinitionV2 may declare (1..4). */
export const MAX_PHASES = 4;

/**
 * Maximum condition-tree depth. A leaf `Condition` has depth 1; each `and`/
 * `or`/`not` wrapper adds 1. Depth 3 allows e.g. `and(or(a,b), not(c))`.
 */
export const MAX_DEPTH = 3;

/** Maximum children an `and`/`or` node may have. */
export const MAX_CHILDREN = 5;

/**
 * Timeframe label. Re-exported from the chart layer's `Timeframe` union
 * (`'1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1w' |
 * '1M'`) so v2 never invents a second, incompatible timeframe vocabulary.
 */
export type TF = Timeframe;

// ----------------------------------------------------------------------------
// Instrument / timeframes
// ----------------------------------------------------------------------------

/** Instrument selector. `timeframe` is NOT here — see `timeframes` below. */
export interface InstrumentRefV2 {
  symbol: string;
  source: 'binance' | 'databento';
}

/**
 * Timeframe configuration for a strategy. Only `execution` is consumed by
 * Increment 1/2 (the phase engine and the banks operate on a single candle
 * series). `context` (higher-timeframe confirmation series) is modeled now
 * so the schema doesn't need a breaking change later, but no engine code
 * reads it until Increment 3 — it is accepted and round-trips, nothing more.
 */
export interface TimeframesV2 {
  execution: TF;
  /** Reserved for Increment 3 (multi-timeframe context). Ignored until then. */
  context?: TF[];
}

// ----------------------------------------------------------------------------
// Anchors — named reference points captured during phase execution.
// ----------------------------------------------------------------------------

/**
 * A price anchor a phase can CAPTURE when it completes, and that later rules
 * (stop/target/other phases' `phaseAnchor` LevelRefs) can reference by name.
 *
 * - `triggerPrice`   : the price that satisfied the phase's `when` condition
 *                       (e.g. the compare's right-hand series value).
 * - `triggerBarHigh` / `triggerBarLow` : high/low of the bar the phase
 *                       completed on.
 * - `wickExtreme`    : the most extreme wick price touched during the phase
 *                       (direction-dependent — high for short-side phases,
 *                       low for long-side phases; resolved by the engine).
 * - `eventLevel`     : the level associated with the qualifying `event`
 *                       condition (e.g. a sweep's swept price), when the
 *                       phase's `when` resolved via a `kind:'event'` leaf.
 * - `counterSwing`   : the nearest confirmed swing AGAINST the phase's
 *                       expected direction, captured at completion (a
 *                       convenient invalidation/stop reference).
 */
export type AnchorKind =
  | 'triggerPrice'
  | 'triggerBarHigh'
  | 'triggerBarLow'
  | 'wickExtreme'
  | 'eventLevel'
  | 'counterSwing';

/** Declares that a phase should capture the given anchor kind on completion. */
export interface AnchorCapture {
  anchor: AnchorKind;
}

/** A reference to an anchor captured by a specific (earlier) phase. */
export interface AnchorRef {
  phaseId: string;
  anchor: AnchorKind;
}

// ----------------------------------------------------------------------------
// Levels — named price references resolvable from precomputed causal arrays.
// ----------------------------------------------------------------------------

/**
 * A reference to a precomputed, causal price level. `LevelBank.getSeries`
 * (Increment 1, this same commit) resolves every variant EXCEPT
 * `phaseAnchor`, which requires live phase-execution state from the
 * PhaseEngine (Increment 3) and is out of scope for a candles-only bank.
 *
 * `orMinutes` is only consulted by `openingRangeHigh`/`openingRangeLow`; it
 * is typed on the shared branch (rather than duplicated per-member) to keep
 * the discriminated union small, but is a no-op for the other members of
 * that branch.
 */
export type LevelRef =
  | {
      type:
        | 'prevDayHigh'
        | 'prevDayLow'
        | 'prevDayClose'
        | 'sessionHigh'
        | 'sessionLow'
        | 'openingRangeHigh'
        | 'openingRangeLow'
        | 'dayOpen';
      /** Opening-range window length in minutes. Default 15. OR-levels only. */
      orMinutes?: number;
    }
  | {
      type: 'swingHigh' | 'swingLow';
      /** Fractal half-width (k). Default 2 — matches v1's swing discipline. */
      lookback?: number;
      /** 1-based recency rank; 1 = most recently confirmed. Default 1. */
      nth?: number;
    }
  | {
      type: 'phaseAnchor';
      /** id of the phase that captured the anchor. Must be an EARLIER phase
       *  when referenced from within a phase's own `when`/`invalidateIf`. */
      phaseId: string;
      anchor: AnchorKind;
    };

// ----------------------------------------------------------------------------
// Indicators (bank arrives in Increment 2 — the `type` vocabulary ships now)
// ----------------------------------------------------------------------------

/** Reference to a precomputed indicator series. Resolved by IndicatorBank
 *  (Increment 2); the `type` closed-vocabulary is fixed here so condition
 *  trees authored in Increment 1 remain valid once the bank lands. */
export interface IndicatorRef {
  type: 'ema' | 'sma' | 'rsi' | 'vwap' | 'macd' | 'atr';
  /** Period/length, where applicable (ignored for 'vwap'). */
  length?: number;
}

// ----------------------------------------------------------------------------
// Operands / Conditions / ConditionNode — the bounded condition tree.
// ----------------------------------------------------------------------------

/** A value a `Condition` compares against — always resolvable from a
 *  precomputed causal array (or a literal constant) at a given bar index. */
export type Operand =
  | { src: 'price'; field: 'open' | 'high' | 'low' | 'close'; offset?: number }
  | { src: 'indicator'; ref: IndicatorRef; offset?: number }
  | { src: 'level'; ref: LevelRef }
  | { src: 'const'; value: number };

/** Closed vocabulary of price-action events resolved by EventBank
 *  (Increment 1, this same commit). `params` is event-specific (e.g.
 *  `wickBodyRatio` for `wickRejection`). */
export type EventName =
  | 'engulfing'
  | 'wickRejection'
  | 'insideBar'
  | 'choch'
  | 'mss'
  | 'sweep';

/** A single (non-boolean-combinator) leaf test. */
export type Condition =
  | { kind: 'compare'; left: Operand; cmp: CompareOp; right: Operand }
  | {
      kind: 'levelInteraction';
      level: LevelRef;
      interaction: 'touch' | 'reject' | 'break' | 'closeBeyond' | 'retest';
      /** Required wick:body ratio for 'reject' interactions. */
      wickBodyRatio?: number;
      /** For 'retest': how many bars after the initial break to allow. */
      withinBars?: number;
    }
  | { kind: 'event'; event: EventName; params?: Record<string, number> }
  | {
      kind: 'patternActive';
      /** Reuses v1's PatternParams (FVG/IFVG/BREAKER/OB/LIQUIDITY) so v2 can
       *  gate on "is an ICT zone currently active" without reinventing the
       *  pattern-detector vocabulary. */
      pattern: PatternParams;
      interaction: 'priceInZone' | 'tap' | 'closeInside';
    };

export type CompareOp = 'gt' | 'lt' | 'gte' | 'lte' | 'crossesAbove' | 'crossesBelow';

/** A bounded boolean-combinator tree over `Condition` leaves. Depth and
 *  fan-out are capped by {@link MAX_DEPTH} / {@link MAX_CHILDREN} — see
 *  {@link validateStrategyStructure}. */
export type ConditionNode =
  | { op: 'and' | 'or'; children: ConditionNode[] }
  | { op: 'not'; child: ConditionNode }
  | Condition;

// ----------------------------------------------------------------------------
// Phases
// ----------------------------------------------------------------------------

/**
 * One state in the phase state machine. Phases are evaluated in array order;
 * the LAST phase completing is the strategy's entry signal. A phase's `when`
 * condition is evaluated only once the previous phase (if any) has already
 * completed for the current setup attempt.
 */
export interface PhaseV2 {
  /** Unique (within the strategy) phase id, referenced by later phases'
   *  `phaseAnchor` LevelRefs/AnchorRefs and by entry/stop/exits. */
  id: string;
  /** Condition tree that must evaluate true for this phase to complete. */
  when: ConditionNode;
  /** Optional bar budget: if the phase hasn't completed within this many
   *  bars of becoming active, the setup attempt is abandoned. */
  within?: { bars: number };
  /** Optional condition tree that, if it becomes true FIRST, cancels the
   *  in-progress setup attempt (e.g. price closes back through an origin
   *  level before the next phase triggers). */
  invalidateIf?: ConditionNode;
  /** Anchor kinds this phase should capture on completion, for later
   *  reference by `AnchorRef`/`phaseAnchor` LevelRefs. */
  capture?: AnchorCapture[];
}

// ----------------------------------------------------------------------------
// Entry / Stop / Exits / Filters
// ----------------------------------------------------------------------------

export interface EntryRuleV2 {
  orderType: 'market' | 'limit';
  /** Required when `orderType === 'limit'`: where the limit order sits. */
  priceAnchor?: AnchorRef;
  /** How many bars the armed signal stays valid before it expires. */
  validForBars: number;
}

export interface StopRuleV2 {
  /**
   * - 'structure'   : just beyond the reference structure (nearest confirmed
   *                    swing against the trade direction).
   * - 'wick'        : just beyond the triggering phase's captured wick
   *                    extreme (`AnchorKind: 'wickExtreme'`).
   * - 'atr'         : entry ∓ `bufferAtrMult` * ATR (the multiple IS the
   *                    stop distance for this basis, not extra padding).
   * - 'fixedPct'    : entry ∓ `bufferPct`% (the percent IS the stop distance
   *                    for this basis, not extra padding).
   * - 'level'       : just beyond `level` (a LevelRef).
   * - 'phaseAnchor' : just beyond the price captured by `phaseRef`.
   */
  basis: 'structure' | 'wick' | 'atr' | 'fixedPct' | 'level' | 'phaseAnchor';
  /**
   * Extra padding, in percent of price, added beyond the computed stop.
   * For `basis === 'fixedPct'` this field IS the stop distance itself
   * (dual-use, documented above) rather than additional padding.
   */
  bufferPct?: number;
  /**
   * Extra padding, in ATR multiples, added beyond the computed stop.
   * For `basis === 'atr'` this field IS the stop distance itself (dual-use,
   * documented above) rather than additional padding.
   */
  bufferAtrMult?: number;
  /** Required when `basis === 'level'`. */
  level?: LevelRef;
  /** Required when `basis === 'phaseAnchor'`. */
  phaseRef?: AnchorRef;
}

export interface ExitRuleV2 {
  target: {
    basis: 'rMultiple' | 'fixedPct' | 'level';
    /** R-multiple (basis 'rMultiple') or percent (basis 'fixedPct'). */
    value?: number;
    /** Required when `basis === 'level'`. */
    level?: LevelRef;
  };
  /** Optional scale-out plan. */
  partials?: Array<{ atR: number; sizePct: number; moveStopToBE?: boolean }>;
  trailing?: {
    mode: 'atr' | 'swing' | 'rStep';
    value?: number;
  };
  /** Force-close the position after this many bars in the trade. */
  timeStopBars?: number;
}

export interface FiltersV2 {
  /** Reuses v1's SessionFilter verbatim (IANA tz + intraday windows + days). */
  session?: SessionFilter;
  maxTradesPerDay?: number;
  /** Stop taking new trades for the day once realized loss reaches this %
   *  of the day's starting balance. */
  dailyLossStopPct?: number;
}

// ----------------------------------------------------------------------------
// Top-level strategy definition
// ----------------------------------------------------------------------------

export interface StrategyDefinitionV2 {
  schemaVersion: 2;
  id: string;
  name: string;
  description?: string;
  direction: Direction;
  instrument: InstrumentRefV2;
  timeframes: TimeframesV2;
  /** 1..MAX_PHASES ordered phases; the last one completing == entry signal. */
  phases: PhaseV2[];
  entry: EntryRuleV2;
  stop: StopRuleV2;
  exits: ExitRuleV2;
  filters: FiltersV2;
  /** Reuses v1's RiskConfig verbatim (sizing, commission, slippage, ...). */
  risk: RiskConfig;
}

// ============================================================================
// Structural validator
// ============================================================================

/**
 * Pure structural validator for a StrategyDefinitionV2. Does NOT touch
 * candles/banks — it only checks the shape/bounds contract described above.
 * Returns a list of human-readable error strings; an empty array means the
 * definition is structurally valid (semantic validity — e.g. whether a
 * `phaseAnchor` engine can actually resolve at runtime — is the compiler's
 * job in a later increment).
 *
 * Checks performed:
 *  1. `phases.length` is between 1 and {@link MAX_PHASES} inclusive.
 *  2. Phase ids are unique; `id`/`name` are non-empty.
 *  3. Every condition tree (`phase.when`, `phase.invalidateIf`) respects
 *     {@link MAX_DEPTH} and {@link MAX_CHILDREN}.
 *  4. Every `phaseAnchor` LevelRef/AnchorRef found inside a phase's OWN
 *     `when`/`invalidateIf` refers to an EARLIER phase (lower array index).
 *     `phaseAnchor` refs found in `entry.priceAnchor` / `stop.level` /
 *     `stop.phaseRef` / `exits.target.level` (strategy-level, evaluated
 *     only once all phases have completed) must refer to ANY existing
 *     phase id — ordering is not required there.
 *  5. `crossesAbove`/`crossesBelow` compares reject an operand pair that is
 *     `const` vs `const` (two constants can never cross).
 */
export function validateStrategyStructure(def: StrategyDefinitionV2): string[] {
  const errors: string[] = [];

  if (!def.id || def.id.trim().length === 0) {
    errors.push('id must be a non-empty string');
  }
  if (!def.name || def.name.trim().length === 0) {
    errors.push('name must be a non-empty string');
  }

  if (def.phases.length < 1 || def.phases.length > MAX_PHASES) {
    errors.push(
      `phases.length (${def.phases.length}) must be between 1 and ${MAX_PHASES}`,
    );
  }

  const seenIds = new Set<string>();
  const phaseIndexById = new Map<string, number>();
  def.phases.forEach((p, idx) => {
    if (seenIds.has(p.id)) {
      errors.push(`duplicate phase id "${p.id}" at index ${idx}`);
    }
    seenIds.add(p.id);
    phaseIndexById.set(p.id, idx);
  });

  def.phases.forEach((phase, idx) => {
    validateConditionTree(phase.when, `phases[${idx}].when`, errors);
    validatePhaseAnchorOrdering(phase.when, idx, phaseIndexById, `phases[${idx}].when`, errors);
    if (phase.invalidateIf) {
      validateConditionTree(phase.invalidateIf, `phases[${idx}].invalidateIf`, errors);
      validatePhaseAnchorOrdering(
        phase.invalidateIf,
        idx,
        phaseIndexById,
        `phases[${idx}].invalidateIf`,
        errors,
      );
    }
    if (phase.within && phase.within.bars <= 0) {
      errors.push(`phases[${idx}].within.bars must be > 0`);
    }
  });

  // Strategy-level phaseAnchor references: must exist, ordering not required.
  const globalAnchorRefs: Array<{ path: string; ref: AnchorRef | undefined }> = [
    { path: 'entry.priceAnchor', ref: def.entry.priceAnchor },
    { path: 'stop.phaseRef', ref: def.stop.phaseRef },
  ];
  for (const { path, ref } of globalAnchorRefs) {
    if (ref && !phaseIndexById.has(ref.phaseId)) {
      errors.push(`${path} references unknown phase id "${ref.phaseId}"`);
    }
  }
  const globalLevelRefs: Array<{ path: string; ref: LevelRef | undefined }> = [
    { path: 'stop.level', ref: def.stop.level },
    { path: 'exits.target.level', ref: def.exits.target.level },
  ];
  for (const { path, ref } of globalLevelRefs) {
    if (ref && ref.type === 'phaseAnchor' && !phaseIndexById.has(ref.phaseId)) {
      errors.push(`${path} references unknown phase id "${ref.phaseId}"`);
    }
  }

  if (def.stop.basis === 'level' && !def.stop.level) {
    errors.push('stop.level is required when stop.basis === "level"');
  }
  if (def.stop.basis === 'phaseAnchor' && !def.stop.phaseRef) {
    errors.push('stop.phaseRef is required when stop.basis === "phaseAnchor"');
  }
  if (def.exits.target.basis === 'level' && !def.exits.target.level) {
    errors.push('exits.target.level is required when exits.target.basis === "level"');
  }
  if (def.entry.orderType === 'limit' && !def.entry.priceAnchor) {
    errors.push('entry.priceAnchor is required when entry.orderType === "limit"');
  }
  if (def.entry.validForBars <= 0) {
    errors.push('entry.validForBars must be > 0');
  }

  return errors;
}

/** Recursively check depth/fan-out caps on a ConditionNode. */
function validateConditionTree(node: ConditionNode, path: string, errors: string[]): number {
  if ('op' in node) {
    if (node.op === 'not') {
      const childDepth = validateConditionTree(node.child, `${path}.child`, errors);
      return 1 + childDepth;
    }
    if (node.children.length === 0) {
      errors.push(`${path}: '${node.op}' node has 0 children`);
      return 1;
    }
    if (node.children.length > MAX_CHILDREN) {
      errors.push(
        `${path}: '${node.op}' node has ${node.children.length} children (max ${MAX_CHILDREN})`,
      );
    }
    let maxChildDepth = 0;
    node.children.forEach((child, i) => {
      const d = validateConditionTree(child, `${path}.children[${i}]`, errors);
      if (d > maxChildDepth) maxChildDepth = d;
    });
    const depth = 1 + maxChildDepth;
    if (depth > MAX_DEPTH) {
      errors.push(`${path}: tree depth ${depth} exceeds max ${MAX_DEPTH}`);
    }
    return depth;
  }

  // Leaf Condition.
  if (node.kind === 'compare') {
    if (
      (node.cmp === 'crossesAbove' || node.cmp === 'crossesBelow') &&
      node.left.src === 'const' &&
      node.right.src === 'const'
    ) {
      errors.push(
        `${path}: '${node.cmp}' requires at least one series operand (both sides are 'const')`,
      );
    }
  }
  return 1;
}

/** Walk a ConditionNode and verify every phaseAnchor ref points EARLIER. */
function validatePhaseAnchorOrdering(
  node: ConditionNode,
  currentPhaseIndex: number,
  phaseIndexById: Map<string, number>,
  path: string,
  errors: string[],
): void {
  const refs: Array<{ ref: LevelRef; subPath: string }> = [];
  collectConditionLevelRefs(node, path, refs);
  for (const { ref, subPath } of refs) {
    if (ref.type !== 'phaseAnchor') continue;
    const refIdx = phaseIndexById.get(ref.phaseId);
    if (refIdx === undefined) {
      errors.push(`${subPath}: phaseAnchor references unknown phase id "${ref.phaseId}"`);
    } else if (refIdx >= currentPhaseIndex) {
      errors.push(
        `${subPath}: phaseAnchor references phase "${ref.phaseId}" (index ${refIdx}), ` +
          `which is not EARLIER than the referencing phase (index ${currentPhaseIndex})`,
      );
    }
  }
}

/** Collect every LevelRef reachable from a ConditionNode, with its path. */
function collectConditionLevelRefs(
  node: ConditionNode,
  path: string,
  out: Array<{ ref: LevelRef; subPath: string }>,
): void {
  if ('op' in node) {
    if (node.op === 'not') {
      collectConditionLevelRefs(node.child, `${path}.child`, out);
    } else {
      node.children.forEach((child, i) =>
        collectConditionLevelRefs(child, `${path}.children[${i}]`, out),
      );
    }
    return;
  }
  if (node.kind === 'compare') {
    if (node.left.src === 'level') out.push({ ref: node.left.ref, subPath: `${path}.left` });
    if (node.right.src === 'level') out.push({ ref: node.right.ref, subPath: `${path}.right` });
  } else if (node.kind === 'levelInteraction') {
    out.push({ ref: node.level, subPath: `${path}.level` });
  }
  // 'event' and 'patternActive' leaves carry no LevelRef.
}

// ============================================================================
// Default factory
// ============================================================================

/**
 * Build a ready-to-run, structurally-valid default strategy for a
 * symbol/timeframe: a single phase ("close crosses above EMA(20)"), market
 * entry, ATR stop, 2R target. The caller can mutate the returned object
 * freely (it is a fresh object, not shared).
 */
export function makeDefaultStrategyV2(symbol: string, timeframe: TF): StrategyDefinitionV2 {
  const now = Date.now();
  return {
    schemaVersion: 2,
    id: `strategy_v2_${now.toString(36)}`,
    name: `${symbol} ${timeframe} EMA cross (v2 default)`,
    description: 'Auto-generated default v2 strategy: close crosses above EMA(20).',
    direction: 'both',
    instrument: { symbol, source: 'binance' },
    timeframes: { execution: timeframe },
    phases: [
      {
        id: 'p1',
        when: {
          kind: 'compare',
          left: { src: 'price', field: 'close' },
          cmp: 'crossesAbove',
          right: { src: 'indicator', ref: { type: 'ema', length: 20 } },
        },
        capture: [{ anchor: 'triggerPrice' }, { anchor: 'counterSwing' }],
      },
    ],
    entry: { orderType: 'market', validForBars: 5 },
    stop: { basis: 'atr', bufferAtrMult: 1.5 },
    exits: { target: { basis: 'rMultiple', value: 2 } },
    filters: {},
    risk: {
      riskPerTradePct: 1,
      maxConcurrent: 1,
      initialBalance: 10000,
      commissionPct: 0,
      slippagePct: 0,
      sizingMode: 'risk-pct',
    },
  };
}
