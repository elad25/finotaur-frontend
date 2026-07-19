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
import { timeframeToMs } from '../MarketContext';

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
 * Maximum number of HIGHER-timeframe context series a strategy may declare
 * in `timeframes.context` (Increment 3 — MTF phase sequencing).
 */
export const MAX_CONTEXT_TIMEFRAMES = 2;

/**
 * Maximum number of DISTINCT timeframes a strategy may reference in total —
 * `execution` plus every entry in `timeframes.context`.
 */
export const MAX_TOTAL_TIMEFRAMES = 3;

/**
 * Maximum number of correlated compare-instruments a strategy may declare in
 * `StrategyDefinitionV2.compareSymbols` (Increment 4a — SMT divergence).
 * Capped at 1 this increment; every `Condition{kind:'smt'}.compareSymbol`
 * must be one of these entries — see {@link validateStrategyStructure}.
 */
export const MAX_COMPARE_SYMBOLS = 1;

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
 * Timeframe configuration for a strategy. `execution` is the primary series
 * the phase engine advances bar-by-bar and the ONLY series entry/stop/exit
 * management ever reads (positions are always managed at execution
 * granularity — see `StrategyEngine.ts` module doc).
 *
 * `context` (Increment 3 — MTF phase sequencing) lists every HIGHER
 * timeframe a `PhaseV2.timeframe` references — e.g. `['4h']` for a strategy
 * whose phase 1 evaluates on the 4-hour series while later phases and
 * entry/stop/exits stay on `execution`. Constraints (enforced by
 * {@link validateStrategyStructure}):
 *  - at most {@link MAX_CONTEXT_TIMEFRAMES} entries;
 *  - each entry's duration must be STRICTLY HIGHER than `execution`'s;
 *  - every `PhaseV2.timeframe` that isn't `execution` must appear here;
 *  - `execution` + `context` together may name at most
 *    {@link MAX_TOTAL_TIMEFRAMES} distinct timeframes.
 * Absent/empty `context` (the Increment 1/2 shape) means every phase runs on
 * `execution` — unchanged, byte-identical behavior.
 */
export interface TimeframesV2 {
  execution: TF;
  /** Higher timeframes referenced by `PhaseV2.timeframe` — see above. */
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
 * MTF NOTE (Increment 3): a `phaseAnchor` captured by a phase running on a
 * CONTEXT timeframe (`PhaseV2.timeframe` set to a non-execution TF) still
 * resolves to a plain PRICE — anchors are TF-AGNOSTIC by construction (see
 * `AnchorCapture`/`RuntimeState.anchors`, a bare `phaseId -> price` map with
 * no timeframe tag). A later phase referencing that anchor via `phaseAnchor`
 * (on execution or on another context TF) reads the SAME price value
 * regardless of which timeframe originally captured it.
 *
 * `orMinutes` is only consulted by `openingRangeHigh`/`openingRangeLow`; it
 * is typed on the shared branch (rather than duplicated per-member) to keep
 * the discriminated union small, but is a no-op for the other members of
 * that branch.
 */

/**
 * Named intraday session windows (Increment 5 — named-session levels).
 * ALWAYS anchored to `America/New_York`, regardless of the strategy's own
 * `filters.session.timezone` — "the Asian session" etc. are universally
 * quoted in ET. Exact minute windows live in `LevelBank.ts`'s
 * `NAMED_SESSION_WINDOWS` (mirrors the presets already offered in
 * `SetupInputForm.tsx`'s `SESSION_PRESETS`: asia 18:00-00:00 ET, london
 * 02:00-05:00 ET, newyork 08:00-16:00 ET).
 */
export type NamedSession = 'asia' | 'london' | 'newyork';

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
      /**
       * Named session window (Increment 5) — consulted by `sessionHigh`/
       * `sessionLow` ONLY (no-op for every other member of this branch).
       * Absent (default): the CURRENT-day running high/low described above.
       * Present: the high/low of the most recently COMPLETED window of the
       * named session, held constant until the NEXT occurrence of that
       * window closes (see `LevelBank.ts`'s `namedSession()`).
       */
      sessionName?: NamedSession;
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
  | { src: 'const'; value: number }
  | {
      /**
       * Percent difference (Increment 5): `(a - b) / b * 100`, NaN-safe (NaN
       * if either side is NaN, or if `b` resolves to 0). E.g. "the 9:30am
       * open gaps at least 0.5% from the prior day's close" ==
       * `{ src:'pctDiff', a:{src:'level',ref:{type:'dayOpen'}},
       *    b:{src:'level',ref:{type:'prevDayClose'}} } gte 0.5`.
       * `a`/`b` must NOT themselves be `pctDiff` — no nesting (enforced by
       * `validateStrategyStructure`).
       */
      src: 'pctDiff';
      a: Operand;
      b: Operand;
    };

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
    }
  | {
      kind: 'smt';
      /**
       * The correlated instrument to compare against (e.g. `'MES'` when the
       * strategy trades `'MNQ'`). MUST appear in
       * `StrategyDefinitionV2.compareSymbols` and MUST differ from
       * `instrument.symbol` — see {@link validateStrategyStructure}.
       */
      compareSymbol: string;
      /**
       * The structural reference level BOTH symbols are tested against, on
       * the SAME timeframe as this condition's phase. `swingHigh`/
       * `prevDayHigh` pair with `divergence: 'bearish'` (a sweep at highs);
       * `swingLow`/`prevDayLow` pair with `divergence: 'bullish'` (a sweep
       * at lows) — {@link validateStrategyStructure} rejects any other
       * pairing. Resolved via `LevelBank` (the same causal level series
       * `Operand{src:'level'}`/`levelInteraction` use) on each symbol's own
       * series — see `SmtBank.ts`.
       */
      reference: { type: 'swingHigh' | 'swingLow' | 'prevDayHigh' | 'prevDayLow' };
      /**
       * `'bearish'`: the TRADED symbol sweeps a HIGH (reference) while the
       * compare symbol FAILS to sweep its own corresponding high — a
       * classic smart-money divergence that arms SHORT candidates only.
       * `'bullish'`: the mirror image at LOWS — arms LONG candidates only.
       * See `SmtBank.ts` for the exact per-bar window/firing semantics.
       */
      divergence: 'bullish' | 'bearish';
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
  /**
   * The timeframe this phase's `when`/`invalidateIf` evaluate on (Increment 3
   * — MTF phase sequencing). Absent (default) means the strategy's
   * `timeframes.execution` — byte-identical to Increment 1/2 behavior. When
   * set to a HIGHER timeframe, it MUST appear in `timeframes.context` (see
   * {@link validateStrategyStructure}); the compiler then evaluates this
   * phase's condition tree against THAT timeframe's own candle series,
   * fired-once per newly-CLOSED context bar — see `ConditionCompiler.ts`
   * (`wrapContextCondition`) and `TimeframeSet.ts` for the exact causal
   * closed-bar semantics. `within.bars` still counts EXECUTION bars
   * regardless of this field (see `StrategyEngine.ts` module doc).
   */
  timeframe?: TF;
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
  /**
   * A fixed price target. OPTIONAL (Increment 5): a strategy may manage
   * exits purely via `exitWhen`/`timeStopBars`/`trailing` instead (pure
   * cross-to-cross, no fixed take-profit level at all) — see
   * `validateStrategyStructure`, which requires at least ONE of
   * target/exitWhen/timeStopBars/trailing to be present so a position can
   * always eventually close. When absent, `SignalBuilderV2` skips target
   * resolution entirely and the built signal's `takeProfit` is `0` —
   * `OrderExecutionEngine.checkTakeProfit` treats a falsy `takeProfit` as
   * "disabled" by construction, so the SL-before-TP fill-check never fires
   * a take-profit hit for these positions.
   */
  target?: {
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
  /**
   * Clock-time flat exit (Increment 5): "HH:MM" in LOCAL time
   * (`filters.session.timezone ?? 'America/New_York'`). At the first bar
   * whose local time is `>= flatAt` — on ANY day the position is still
   * open, not just the entry day — `StrategyEngine.ts` force-closes it at
   * that bar's close (`exitReason: 'flat_time'`) and cancels any PENDING
   * unfilled signal at/after `flatAt` each day (never fills into a
   * post-flat window).
   */
  flatAt?: string;
  /**
   * Condition-based exit (Increment 5): evaluated every bar a position is
   * open (execution timeframe ONLY this increment — `validateStrategyStructure`
   * has no context-TF concept to reject here since `ExitRuleV2` carries no
   * `.timeframe` field the way `PhaseV2` does, so it is structurally
   * impossible to author a context-TF ref inside `exitWhen`). Fires -> close
   * at that bar's close (`exitReason: 'condition'`). Bounded by the same
   * `MAX_DEPTH`/`MAX_CHILDREN` caps as any other condition tree.
   *
   * LIMITATION: evaluated against a FRESH, per-position `RuntimeState` (its
   * own empty `anchors`/`scratch`, reset on every fill) — the entry
   * attempt's captured anchors are already gone by the time a position is
   * open (`StrategyEngine.ts` resets the attempt right after building the
   * signal). A `phaseAnchor` LevelRef inside `exitWhen` therefore always
   * resolves to NaN (never fires that branch) — use `exitWhen` for
   * indicator/price/level conditions, not phase-captured anchors.
   * `smt` leaves are NOT wired inside `exitWhen` this increment (SmtContext
   * is only built from phase conditions) — compiling one throws a clear
   * "no SmtContext bank" error rather than silently misbehaving.
   */
  exitWhen?: ConditionNode;
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
  /**
   * Correlated instruments referenced by `Condition{kind:'smt'}` leaves
   * (Increment 4a — SMT divergence). At most {@link MAX_COMPARE_SYMBOLS}
   * entries this increment. Absent/empty for every strategy without an
   * `smt` condition — byte-identical behavior: no compare-series fetch, no
   * compare-symbol `LevelBank`, no `SmtContext` construction (see
   * `StrategyEngine.ts` / `useAutoBacktestStore.ts`).
   */
  compareSymbols?: string[];
  /**
   * Auto-mirrored split-run (Increment 5 — bidirectional strategies). The
   * definition is authored as its PRIMARY direction (`direction: 'long' |
   * 'short'`, NEVER `'both'` — see `validateStrategyStructure`). When
   * `true`, `StrategyEngine.ts`'s `runStrategyV2` ALSO runs the mirrored
   * variant (`mirrorStrategy.ts`'s `mirrorStrategyV2`) over the same
   * series and merges both variants' trades into one chronological result
   * — see `runStrategyV2`'s module doc for the exact merge semantics.
   * Absent/false: byte-identical single-pass behavior, unchanged from
   * every earlier increment.
   */
  mirror?: boolean;
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
 *  6. (Increment 4a — SMT divergence) Every `Condition{kind:'smt'}` leaf:
 *     `compareSymbols` is non-empty and has at most {@link MAX_COMPARE_SYMBOLS}
 *     entries; the leaf's `compareSymbol` is one of `compareSymbols`; the
 *     leaf's `compareSymbol` differs from `instrument.symbol`; and
 *     `divergence` is coherent with `reference.type` (`'bearish'` requires
 *     `'swingHigh'`/`'prevDayHigh'`, `'bullish'` requires `'swingLow'`/
 *     `'prevDayLow'`).
 */
export function validateStrategyStructure(def: StrategyDefinitionV2): string[] {
  const errors: string[] = [];

  if (!def.id || def.id.trim().length === 0) {
    errors.push('id must be a non-empty string');
  }
  if (!def.name || def.name.trim().length === 0) {
    errors.push('name must be a non-empty string');
  }

  // ---------------------------------------------------------------------
  // mirror (Increment 5 — auto-mirrored split-run).
  // ---------------------------------------------------------------------
  if (def.mirror && def.direction === 'both') {
    errors.push(
      "mirror requires direction to be 'long' or 'short' (a primary direction to mirror) — " +
        "'both' already covers both senses, mirroring it is undefined",
    );
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

  // ---------------------------------------------------------------------
  // Timeframe validation (Increment 3 — MTF phase sequencing).
  // ---------------------------------------------------------------------
  const executionTf = def.timeframes.execution;
  const contextTfs = def.timeframes.context ?? [];
  if (contextTfs.length > MAX_CONTEXT_TIMEFRAMES) {
    errors.push(
      `timeframes.context has ${contextTfs.length} entries (max ${MAX_CONTEXT_TIMEFRAMES})`,
    );
  }
  const distinctTfs = new Set<TF>([executionTf, ...contextTfs]);
  if (distinctTfs.size > MAX_TOTAL_TIMEFRAMES) {
    errors.push(
      `strategy references ${distinctTfs.size} distinct timeframes (execution + context, ` +
        `max ${MAX_TOTAL_TIMEFRAMES})`,
    );
  }
  const executionTfMs = timeframeToMs(executionTf);
  for (const ctxTf of contextTfs) {
    const ctxTfMs = timeframeToMs(ctxTf);
    if (executionTfMs === undefined || ctxTfMs === undefined) {
      errors.push(
        `timeframes: cannot compare durations for execution "${executionTf}" vs context ` +
          `"${ctxTf}" (unrecognized timeframe label)`,
      );
    } else if (ctxTfMs <= executionTfMs) {
      errors.push(
        `timeframes.context "${ctxTf}" must be a STRICTLY HIGHER timeframe than ` +
          `execution "${executionTf}"`,
      );
    }
  }
  const contextTfSet = new Set<TF>(contextTfs);
  def.phases.forEach((phase, idx) => {
    if (phase.timeframe === undefined || phase.timeframe === executionTf) return;
    if (!contextTfSet.has(phase.timeframe)) {
      errors.push(
        `phases[${idx}].timeframe "${phase.timeframe}" is neither the execution timeframe ` +
          `("${executionTf}") nor declared in timeframes.context`,
      );
    }
  });

  // ---------------------------------------------------------------------
  // SMT divergence validation (Increment 4a).
  // ---------------------------------------------------------------------
  const compareSymbols = def.compareSymbols ?? [];
  if (compareSymbols.length > MAX_COMPARE_SYMBOLS) {
    errors.push(
      `compareSymbols has ${compareSymbols.length} entries (max ${MAX_COMPARE_SYMBOLS} this increment)`,
    );
  }
  const compareSymbolSet = new Set(compareSymbols);
  const smtLeaves: Array<{ path: string; cond: Extract<Condition, { kind: 'smt' }> }> = [];
  def.phases.forEach((phase, idx) => {
    collectConditionSmtLeaves(phase.when, `phases[${idx}].when`, smtLeaves);
    if (phase.invalidateIf) {
      collectConditionSmtLeaves(phase.invalidateIf, `phases[${idx}].invalidateIf`, smtLeaves);
    }
  });
  for (const { path, cond } of smtLeaves) {
    if (compareSymbols.length === 0) {
      errors.push(`${path}: 'smt' condition requires a non-empty compareSymbols on the strategy`);
    } else if (!compareSymbolSet.has(cond.compareSymbol)) {
      errors.push(
        `${path}: compareSymbol "${cond.compareSymbol}" is not declared in compareSymbols ` +
          `(${compareSymbols.join(', ') || '<empty>'})`,
      );
    }
    if (cond.compareSymbol === def.instrument.symbol) {
      errors.push(
        `${path}: compareSymbol "${cond.compareSymbol}" must differ from instrument.symbol ` +
          `("${def.instrument.symbol}")`,
      );
    }
    const isHighRef = cond.reference.type === 'swingHigh' || cond.reference.type === 'prevDayHigh';
    const isLowRef = cond.reference.type === 'swingLow' || cond.reference.type === 'prevDayLow';
    if (cond.divergence === 'bearish' && !isHighRef) {
      errors.push(
        `${path}: divergence 'bearish' requires reference.type 'swingHigh' or 'prevDayHigh' ` +
          `(got "${cond.reference.type}")`,
      );
    }
    if (cond.divergence === 'bullish' && !isLowRef) {
      errors.push(
        `${path}: divergence 'bullish' requires reference.type 'swingLow' or 'prevDayLow' ` +
          `(got "${cond.reference.type}")`,
      );
    }
  }

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
    { path: 'exits.target.level', ref: def.exits.target?.level },
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
  if (def.exits.target?.basis === 'level' && !def.exits.target.level) {
    errors.push('exits.target.level is required when exits.target.basis === "level"');
  }
  if (def.entry.orderType === 'limit' && !def.entry.priceAnchor) {
    errors.push('entry.priceAnchor is required when entry.orderType === "limit"');
  }
  if (def.entry.validForBars <= 0) {
    errors.push('entry.validForBars must be > 0');
  }

  // ---------------------------------------------------------------------
  // exits.exitWhen (Increment 5 — condition-based exit) + the "at least one
  // exit mechanism" requirement (target is now OPTIONAL — see ExitRuleV2).
  // ---------------------------------------------------------------------
  if (
    !def.exits.target &&
    !def.exits.exitWhen &&
    def.exits.timeStopBars === undefined &&
    !def.exits.trailing
  ) {
    errors.push(
      'exits: at least one of target, exitWhen, timeStopBars, or trailing is required so a ' +
        'position can eventually close',
    );
  }
  if (def.exits.exitWhen) {
    validateConditionTree(def.exits.exitWhen, 'exits.exitWhen', errors);
    // Strategy-level, like entry.priceAnchor/stop.level/exits.target.level:
    // phaseAnchor refs must name an EXISTING phase, but ordering is not
    // required (exitWhen only ever evaluates once every phase has already
    // completed and a position has filled).
    const exitWhenLevelRefs: Array<{ ref: LevelRef; subPath: string }> = [];
    collectConditionLevelRefs(def.exits.exitWhen, 'exits.exitWhen', exitWhenLevelRefs);
    for (const { ref, subPath } of exitWhenLevelRefs) {
      if (ref.type === 'phaseAnchor' && !phaseIndexById.has(ref.phaseId)) {
        errors.push(`${subPath} references unknown phase id "${ref.phaseId}"`);
      }
    }
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
    validateOperandNoNestedPctDiff(node.left, `${path}.left`, errors);
    validateOperandNoNestedPctDiff(node.right, `${path}.right`, errors);
  }
  return 1;
}

/** pctDiff (Increment 5) must not nest another pctDiff in its own `a`/`b`. */
function validateOperandNoNestedPctDiff(op: Operand, path: string, errors: string[]): void {
  if (op.src !== 'pctDiff') return;
  if (op.a.src === 'pctDiff' || op.b.src === 'pctDiff') {
    errors.push(`${path}: 'pctDiff' operand's 'a'/'b' must not themselves be 'pctDiff' (no nesting)`);
  }
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
    collectOperandLevelRefs(node.left, `${path}.left`, out);
    collectOperandLevelRefs(node.right, `${path}.right`, out);
  } else if (node.kind === 'levelInteraction') {
    out.push({ ref: node.level, subPath: `${path}.level` });
  }
  // 'event', 'patternActive' and 'smt' leaves carry no LevelRef.
}

/** Collect every LevelRef reachable from an Operand — recurses into `pctDiff`'s
 *  `a`/`b` (Increment 5) so a `phaseAnchor` nested inside a pctDiff operand
 *  is still caught by the phaseAnchor-ordering/existence validators. */
function collectOperandLevelRefs(
  op: Operand,
  path: string,
  out: Array<{ ref: LevelRef; subPath: string }>,
): void {
  if (op.src === 'level') {
    out.push({ ref: op.ref, subPath: path });
  } else if (op.src === 'pctDiff') {
    collectOperandLevelRefs(op.a, `${path}.a`, out);
    collectOperandLevelRefs(op.b, `${path}.b`, out);
  }
}

/** Collect every `Condition{kind:'smt'}` leaf reachable from a ConditionNode,
 *  with its path — used by {@link validateStrategyStructure} (Increment 4a). */
function collectConditionSmtLeaves(
  node: ConditionNode,
  path: string,
  out: Array<{ path: string; cond: Extract<Condition, { kind: 'smt' }> }>,
): void {
  if ('op' in node) {
    if (node.op === 'not') {
      collectConditionSmtLeaves(node.child, `${path}.child`, out);
    } else {
      node.children.forEach((child, i) =>
        collectConditionSmtLeaves(child, `${path}.children[${i}]`, out),
      );
    }
    return;
  }
  if (node.kind === 'smt') {
    out.push({ path, cond: node });
  }
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
