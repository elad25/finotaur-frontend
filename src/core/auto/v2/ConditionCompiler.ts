// ============================================================================
// CONDITION COMPILER — walk a StrategyDefinitionV2 condition tree ONCE and
// produce cheap per-bar closures over precomputed causal arrays.
// ============================================================================
//
// DESIGN
// ------
// Every `ConditionNode` (a bounded `and`/`or`/`not` tree over `Condition`
// leaves — see `./types.ts`) is compiled EXACTLY ONCE, at strategy-load time,
// into a `CompiledCondition`:
//
//   { test:            (i, state) => boolean
//     resolveDirection: (i, state) => 'long' | 'short' | null
//     resolveEventLevel:(i, state) => number | null }
//
// `test` is the boolean the phase engine evaluates every bar. The other two
// are ONLY called by the engine AFTER `test` returns true for a phase's
// `when` — never speculatively — because a leaf that individually "fires"
// while the surrounding tree overall does not (e.g. one branch of a failed
// `and`) must not leak a stale direction/level into anchor capture. Bank
// `getSeries()` calls happen HERE, at compile time; per-bar evaluation is
// pure array indexing — O(1) per leaf, no allocation.
//
// DIRECTION RESOLUTION
// ---------------------
// `Condition` leaves carry no explicit per-leaf direction field. Instead,
// direction-sensitive leaf kinds (`levelInteraction` interactions
// break/closeBeyond/reject/retest, `event`, `patternActive`) are tested
// against `directionsToTest(def.direction)`:
//   - def.direction === 'long' | 'short': test ONLY that sense.
//   - def.direction === 'both': test BOTH senses; `test` fires if EITHER
//     fires; `resolveDirection` returns the FIRST ('long' checked before
//     'short') sense that fires, which becomes the phase's/engine's
//     candidate trade direction — see StrategyEngine.ts.
// `compare` and `event:'insideBar'` are direction-AGNOSTIC (no natural
// sense) — their `resolveDirection` always returns null and never
// contributes to direction resolution.
//
// LOOK-AHEAD SAFETY
// ------------------
// Every accessor this module builds is either (a) a LevelBank/EventBank
// causal array (already look-ahead-safe by construction — see those
// modules), (b) a `phaseAnchor` lookup into `RuntimeState.anchors`, which by
// `validateStrategyStructure`'s ordering rule can only ever reference an
// EARLIER phase's already-captured anchor, or (c) a `patternActive` v1
// detector run (already look-ahead-safe — `formedAtIndex` causality — see
// `../detectors/*`), whose active/tap windows this module additionally gates
// to start at `formedAtIndex + 1` (never the formation bar itself).
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import type { Detection, Direction, PatternParams } from '../types';
import { runDetectors } from '../detectors/registry';
import { MarketContext } from '../MarketContext';
import { LevelBank } from './LevelBank';
import { EventBank, wickRejection } from './EventBank';
import { TimeframeSet } from './TimeframeSet';
import { SmtBank } from './SmtBank';
import type {
  AnchorKind,
  AnchorRef,
  CompareOp,
  Condition,
  ConditionNode,
  IndicatorRef,
  LevelRef,
  Operand,
  StrategyDefinitionV2,
  TF,
} from './types';

// ----------------------------------------------------------------------------
// Structural stand-in for IndicatorBank (Increment 2, built concurrently by
// another agent in this same worktree at `./IndicatorBank.ts`). This module
// depends ONLY on this structural shape — never on a real import of that
// file — so every test in this file/PR compiles and passes whether or not
// `./IndicatorBank.ts` has landed yet. `StrategyEngine.ts` is the one place
// that actually imports the concrete class, and only lazily (dynamic
// `import()`, guarded) — see its module doc.
// ----------------------------------------------------------------------------
export interface IndicatorBankLike {
  getSeries(ref: IndicatorRef): Float64Array;
}

/** Banks a compiled strategy reads from. `indicators` is optional — omit it
 *  when the strategy has no `Operand{src:'indicator'}` leaves; the compiler
 *  throws a clear error if one is encountered without a bank supplied. */
export interface ConditionBanks {
  levels: LevelBank;
  events: EventBank;
  indicators?: IndicatorBankLike;
}

/**
 * Per-run multi-timeframe context (Increment 3 — MTF phase sequencing),
 * supplied by `StrategyEngine.ts` ONLY when at least one phase declares a
 * `PhaseV2.timeframe` other than `timeframes.execution`. Absent for every
 * single-timeframe strategy — the Increment 1/2 compile path is completely
 * unaffected (see `compileStrategy`'s branch on `phase.timeframe`).
 */
export interface MtfContext {
  /** Causal alignment between the execution series and every context
   *  timeframe — see `TimeframeSet.ts`. */
  timeframeSet: TimeframeSet;
  /** Banks (LevelBank/EventBank/optionally IndicatorBank) for each CONTEXT
   *  timeframe, instantiated lazily by `StrategyEngine.ts` — only for
   *  timeframes actually referenced by at least one phase. */
  banksByTf: Map<TF, ConditionBanks>;
}

/**
 * One compare-symbol's bank + causal alignment for a single timeframe
 * (Increment 4a — SMT divergence). Built by `StrategyEngine.ts` from the
 * compare candle series the caller supplied (`RunStrategyV2Options.
 * compareSeriesBySymbolTf`), ONLY for timeframes at least one `smt`
 * condition actually references — see `strategyNeedsSmtForTf`/`smtTfsUsed`
 * below.
 */
export interface SmtCompareBank {
  /** The compare symbol's OWN candle series at this timeframe. */
  candles: Candle[];
  /** The compare symbol's OWN causal LevelBank at this timeframe. */
  levels: LevelBank;
  /** `alignCompareSeries(tradedCandlesAtThisTf, candles)` — see
   *  `SmtBank.ts`. Index-aligned to the TRADED series at this same
   *  timeframe (execution candles, or the `TimeframeSet` series for a
   *  context-TF phase). */
  alignment: Int32Array;
}

/**
 * Per-run SMT divergence context (Increment 4a), supplied by
 * `StrategyEngine.ts` ONLY when at least one phase's condition tree
 * contains an `smt` leaf. Keyed by TF only (not by symbol) because this
 * increment caps `StrategyDefinitionV2.compareSymbols` at 1 entry — see
 * `types.ts`'s `MAX_COMPARE_SYMBOLS`. Absent for every strategy without an
 * `smt` condition — the Increment 1-3 compile path is completely
 * unaffected (see `compileStrategy`'s `smtBank` construction below, which
 * is `undefined` whenever `smt` is not supplied).
 */
export interface SmtContext {
  banksByTf: Map<TF, SmtCompareBank>;
}

/**
 * Per-setup-attempt state threaded through every compiled closure.
 * Constructed/owned by the engine (`StrategyEngine.ts`); the compiler only
 * reads/writes through this narrow interface.
 */
export interface RuntimeState {
  /** Anchors captured by phases EARLIER in the current attempt, keyed by
   *  phase id. Cleared by the engine whenever the state machine resets to
   *  phase 0 (a fresh attempt starts with no anchors). */
  anchors: Map<string, Partial<Record<AnchorKind, number>>>;
  /** Free-form per-leaf scratch space for STATEFUL primitives (currently
   *  only `levelInteraction: 'retest'`), keyed by a compiler-assigned stable
   *  path string + direction. Cleared by the engine on every attempt reset,
   *  same lifecycle as `anchors`. */
  scratch: Map<string, unknown>;
}

/** A compiled boolean-combinator tree node (leaf or `and`/`or`/`not`). */
export interface CompiledCondition {
  /** The boolean the engine evaluates every bar. */
  test: (i: number, state: RuntimeState) => boolean;
  /**
   * Resolve the direction this tree fired as, IF it fired directionally.
   * Only meaningful to call once `test(i, state)` is known true for the
   * SAME `(i, state)` — calling it standalone re-evaluates the relevant
   * leaves (cheap; no memoization needed at this tree size).
   */
  resolveDirection: (i: number, state: RuntimeState) => 'long' | 'short' | null;
  /**
   * Resolve the concrete price level this tree fired against, IF one
   * exists (populated for `levelInteraction` leaves; null otherwise — see
   * module doc "eventLevel" fallback in StrategyEngine.ts). Same
   * call-only-after-test discipline as `resolveDirection`.
   */
  resolveEventLevel: (i: number, state: RuntimeState) => number | null;
}

/** One compiled phase — everything the engine needs to run it. */
export interface CompiledPhase {
  id: string;
  when: CompiledCondition;
  invalidateIf?: CompiledCondition;
  withinBars?: number;
  capture: AnchorKind[];
  /** The timeframe this phase's `when`/`invalidateIf` evaluate on — the
   *  strategy's execution timeframe unless `PhaseV2.timeframe` names a
   *  context timeframe (Increment 3 — MTF). `StrategyEngine.ts`'s anchor
   *  capture reads THIS field to decide which candle (execution vs the
   *  phase's own context-TF bar) price-based anchors should use. */
  timeframe: TF;
}

/** Compile-time manifest — informational, consumed by the runner/UI. */
export interface CompiledManifest {
  needsIndicators: boolean;
  indicatorRefs: IndicatorRef[];
  levelRefs: LevelRef[];
  patterns: PatternParams[];
}

/** A generic value accessor: given a bar index + runtime state, a number
 *  (possibly NaN). Used both internally and re-exported for SignalBuilderV2
 *  to resolve `stop.level` / `stop.phaseRef` / `exits.target.level` /
 *  `entry.priceAnchor` with the EXACT same LevelRef/AnchorRef semantics used
 *  inside condition trees — one implementation, no drift. */
export type ValueAccessor = (i: number, state: RuntimeState) => number;

export interface CompiledStrategy {
  def: StrategyDefinitionV2;
  phases: CompiledPhase[];
  manifest: CompiledManifest;
  /** Resolve any LevelRef (including `phaseAnchor`) the same way condition
   *  trees do. Shared with SignalBuilderV2. */
  resolveLevel: (ref: LevelRef) => ValueAccessor;
  /** Resolve an AnchorRef (`state.anchors.get(phaseId)?.[anchor]`, NaN if
   *  absent). Shared with SignalBuilderV2. */
  resolveAnchor: (ref: AnchorRef) => ValueAccessor;
}

// ----------------------------------------------------------------------------
// Public: static scan (no candles/banks needed) — used by StrategyEngine to
// decide, BEFORE building any banks, whether it must lazily import
// IndicatorBank at all.
// ----------------------------------------------------------------------------

/** True iff any phase's `when`/`invalidateIf` tree contains an
 *  `Operand{src:'indicator'}` leaf. Pure structural scan of the definition —
 *  no candles, no banks. */
export function strategyNeedsIndicators(def: StrategyDefinitionV2): boolean {
  for (const phase of def.phases) {
    if (nodeNeedsIndicators(phase.when)) return true;
    if (phase.invalidateIf && nodeNeedsIndicators(phase.invalidateIf)) return true;
  }
  return false;
}

function nodeNeedsIndicators(node: ConditionNode): boolean {
  if ('op' in node) {
    if (node.op === 'not') return nodeNeedsIndicators(node.child);
    return node.children.some(nodeNeedsIndicators);
  }
  if (node.kind === 'compare') {
    return node.left.src === 'indicator' || node.right.src === 'indicator';
  }
  return false;
}

/**
 * True iff any phase whose EFFECTIVE timeframe (`phase.timeframe ??
 * def.timeframes.execution`) equals `tf` contains an `Operand{src:'indicator'}`
 * leaf. TF-scoped counterpart of {@link strategyNeedsIndicators}, used by
 * `StrategyEngine.ts` to decide, PER TIMEFRAME, whether that timeframe's
 * IndicatorBank is worth building (Increment 3 — MTF). For a single-TF
 * strategy (no phase declares `timeframe`), `strategyNeedsIndicatorsForTf(def,
 * def.timeframes.execution)` is EXACTLY equivalent to `strategyNeedsIndicators(def)`
 * — every phase's effective timeframe is `execution` by definition.
 */
export function strategyNeedsIndicatorsForTf(def: StrategyDefinitionV2, tf: TF): boolean {
  for (const phase of def.phases) {
    const effectiveTf = phase.timeframe ?? def.timeframes.execution;
    if (effectiveTf !== tf) continue;
    if (nodeNeedsIndicators(phase.when)) return true;
    if (phase.invalidateIf && nodeNeedsIndicators(phase.invalidateIf)) return true;
  }
  return false;
}

function nodeHasSmt(node: ConditionNode): boolean {
  if ('op' in node) {
    if (node.op === 'not') return nodeHasSmt(node.child);
    return node.children.some(nodeHasSmt);
  }
  return node.kind === 'smt';
}

/**
 * True iff any phase whose EFFECTIVE timeframe (`phase.timeframe ??
 * def.timeframes.execution`) equals `tf` contains a `Condition{kind:'smt'}`
 * leaf (Increment 4a — SMT divergence). TF-scoped, mirrors
 * `strategyNeedsIndicatorsForTf` exactly — used by `StrategyEngine.ts` to
 * decide, PER TIMEFRAME, whether that timeframe needs a compare-symbol
 * `LevelBank` + causal alignment built at all.
 */
export function strategyNeedsSmtForTf(def: StrategyDefinitionV2, tf: TF): boolean {
  for (const phase of def.phases) {
    const effectiveTf = phase.timeframe ?? def.timeframes.execution;
    if (effectiveTf !== tf) continue;
    if (nodeHasSmt(phase.when)) return true;
    if (phase.invalidateIf && nodeHasSmt(phase.invalidateIf)) return true;
  }
  return false;
}

/**
 * Every timeframe (execution, plus any `timeframes.context` entries) that
 * has at least one `smt` condition somewhere in its phases — the exact set
 * `StrategyEngine.ts` needs to build a compare-symbol `LevelBank` + causal
 * alignment for. Empty for every strategy without an `smt` condition.
 */
export function smtTfsUsed(def: StrategyDefinitionV2): TF[] {
  const tfs = new Set<TF>();
  if (strategyNeedsSmtForTf(def, def.timeframes.execution)) tfs.add(def.timeframes.execution);
  for (const tf of def.timeframes.context ?? []) {
    if (strategyNeedsSmtForTf(def, tf)) tfs.add(tf);
  }
  return Array.from(tfs);
}

// ----------------------------------------------------------------------------
// Required-anchor safety net
// ----------------------------------------------------------------------------

/**
 * PRODUCTION BUG FIX (2026-07-18): `PhaseV2.capture` is how a phase declares
 * "compute this AnchorKind when I complete" — but nothing previously forced
 * that declaration to actually cover what `entry`/`stop`/`exits` go on to
 * reference. A definition with e.g. `entry: { orderType: 'limit',
 * priceAnchor: { phaseId: 'p1', anchor: 'triggerPrice' } }` and `stop: {
 * basis: 'wick' }` but NO `capture` on phase `p1` compiled and ran without
 * error — `state.anchors` simply never got an entry, `resolveEntry`/
 * `resolveStop` read NaN, `buildSignalV2` returned null on every single
 * completed attempt, and the strategy silently produced ZERO trades despite
 * its `when` condition firing on real, tradeable setups (see
 * `prodData.regression.test.ts`: 51 phase completions on the real MNQ 5m
 * fixture, 0 trades, before this fix). This is exactly the shape an
 * AI-authored StrategyDefinitionV2 partial can omit.
 *
 * This function computes, PER PHASE ID, the AnchorKinds that are
 * STRUCTURALLY required for the strategy to be resolvable at all, so
 * `compileStrategy` can union them into that phase's effective `capture`
 * list regardless of what the author explicitly declared. Two categories:
 *
 *  1. UNAMBIGUOUS (always safe to inject): any `AnchorRef` in
 *     `entry.priceAnchor` / `stop.phaseRef` (basis 'phaseAnchor') /
 *     `exits.target.level` (a `phaseAnchor` LevelRef) names an EXACT
 *     `phaseId` + `anchor` — inject `anchor` into exactly that phase's
 *     required set. There is no author intent this could contradict: the
 *     reference already commits to that specific phase.
 *
 *  2. AMBIGUOUS-BUT-DEFAULTABLE (`stop.basis: 'wick' | 'structure'`): these
 *     bases resolve via `findAnchorAcrossPhases`, which searches EVERY
 *     phase's captured anchors from LAST to FIRST — the definition never
 *     names which phase should supply 'wickExtreme'/'counterSwing'. To
 *     avoid overriding a strategy that DELIBERATELY captures the anchor on
 *     an earlier phase (and deliberately omits it from the last phase), we
 *     only inject onto the LAST phase when NO phase anywhere already
 *     declares that anchor kind — i.e. only when the omission would
 *     otherwise be a guaranteed dead end. This mirrors the convention every
 *     existing strategy in this codebase already follows (e.g.
 *     `strategyEngine.test.ts`'s `flagshipDef`, which captures
 *     `wickExtreme` on its one-and-only, last phase).
 */
function requiredAnchorsByPhase(def: StrategyDefinitionV2): Map<string, Set<AnchorKind>> {
  const required = new Map<string, Set<AnchorKind>>();
  const add = (phaseId: string, anchor: AnchorKind): void => {
    let set = required.get(phaseId);
    if (!set) {
      set = new Set<AnchorKind>();
      required.set(phaseId, set);
    }
    set.add(anchor);
  };

  // Category 1 — unambiguous, phaseId-qualified AnchorRefs.
  if (def.entry.orderType === 'limit' && def.entry.priceAnchor) {
    add(def.entry.priceAnchor.phaseId, def.entry.priceAnchor.anchor);
  }
  if (def.stop.basis === 'phaseAnchor' && def.stop.phaseRef) {
    add(def.stop.phaseRef.phaseId, def.stop.phaseRef.anchor);
  }
  if (def.exits.target.basis === 'level' && def.exits.target.level?.type === 'phaseAnchor') {
    add(def.exits.target.level.phaseId, def.exits.target.level.anchor);
  }

  // Category 2 — basis-only anchors resolved via findAnchorAcrossPhases
  // (last-phase-to-first search); default onto the LAST phase ONLY if no
  // phase anywhere already declares the anchor.
  if (def.phases.length > 0) {
    const lastPhaseId = def.phases[def.phases.length - 1].id;
    const anyPhaseDeclares = (anchor: AnchorKind): boolean =>
      def.phases.some((p) => (p.capture ?? []).some((c) => c.anchor === anchor));

    if (def.stop.basis === 'wick' && !anyPhaseDeclares('wickExtreme')) {
      add(lastPhaseId, 'wickExtreme');
    }
    if (def.stop.basis === 'structure' && !anyPhaseDeclares('counterSwing')) {
      add(lastPhaseId, 'counterSwing');
    }
  }

  return required;
}

// ----------------------------------------------------------------------------
// Public: compileStrategy
// ----------------------------------------------------------------------------

export function compileStrategy(
  def: StrategyDefinitionV2,
  candles: Candle[],
  banks: ConditionBanks,
  /**
   * Multi-timeframe context (Increment 3), supplied by `StrategyEngine.ts`
   * ONLY when at least one phase declares `timeframe` naming a CONTEXT
   * timeframe. Omitted (or `undefined`) for every single-timeframe
   * strategy — that path is 100% unchanged from Increment 1/2 (see the
   * `isContextPhase` branch below, which is never taken when no phase
   * declares a non-execution `timeframe`).
   */
  mtf?: MtfContext,
  /**
   * SMT divergence context (Increment 4a), supplied by `StrategyEngine.ts`
   * ONLY when at least one phase's condition tree contains an `smt` leaf.
   * Omitted (or `undefined`) for every strategy without one — that path is
   * 100% unchanged from Increments 1-3 (see `makeCompileCtx`'s `smtBank`
   * construction below, which stays `undefined` when `smt` is omitted).
   */
  smt?: SmtContext,
): CompiledStrategy {
  const manifest: CompiledManifest = {
    needsIndicators: false,
    indicatorRefs: [],
    levelRefs: [],
    patterns: [],
  };
  const seenIndicatorKeys = new Set<string>();
  const seenLevelKeys = new Set<string>();
  const seenPatternKeys = new Set<string>();
  const patternDetectionCache = new Map<string, Detection[]>();

  /**
   * Build a fresh CompileCtx scoped to one timeframe's own candle series +
   * banks. `tfTag` namespaces the dedupe/cache keys below so the SAME
   * pattern/level/indicator config compiled against DIFFERENT timeframes
   * (e.g. a 4h FVG `patternActive` vs a 5m one) never collides in the
   * shared caches — each timeframe gets its own detection run, over its
   * own candles. The `manifest` itself stays a single shared accumulator
   * (informational only — callers don't need it split per TF).
   */
  function makeCompileCtx(
    tfCandles: Candle[],
    tfBanks: ConditionBanks,
    tfTag: string,
    /** The ACTUAL timeframe label `tfCandles` belongs to — used ONLY to
     *  look up `smt.banksByTf` (Increment 4a); `tfTag` above stays the
     *  dedupe-key namespace string it always was ('exec' for the
     *  execution context, unchanged). */
    tf: TF,
  ): CompileCtx {
    const smtCompareBank = smt?.banksByTf.get(tf);
    const smtBank = smtCompareBank
      ? new SmtBank(tfCandles, tfBanks.levels, smtCompareBank.candles, smtCompareBank.levels, smtCompareBank.alignment)
      : undefined;
    return {
      def,
      candles: tfCandles,
      banks: tfBanks,
      smtBank,
      recordIndicator: (ref) => {
        const key = `${tfTag}::${indicatorRefKey(ref)}`;
        if (!seenIndicatorKeys.has(key)) {
          seenIndicatorKeys.add(key);
          manifest.needsIndicators = true;
          manifest.indicatorRefs.push(ref);
        }
      },
      recordLevel: (ref) => {
        const key = `${tfTag}::${levelRefKeyLocal(ref)}`;
        if (!seenLevelKeys.has(key)) {
          seenLevelKeys.add(key);
          manifest.levelRefs.push(ref);
        }
      },
      getPatternDetections: (pattern) => {
        const key = `${tfTag}::${JSON.stringify(pattern)}`;
        let dets = patternDetectionCache.get(key);
        if (!dets) {
          if (!seenPatternKeys.has(key)) {
            seenPatternKeys.add(key);
            manifest.patterns.push(pattern);
          }
          const lookback = patternSwingLookback(pattern);
          const mctx = MarketContext.build(tfCandles, { swingLookback: lookback, atrPeriod: 14 });
          dets = runDetectors([pattern], tfCandles, mctx);
          patternDetectionCache.set(key, dets);
        }
        return dets;
      },
    };
  }

  // Execution-timeframe compile context — IDENTICAL construction to
  // Increment 1/2 (only namespaced under the 'exec' tag internally, which
  // is invisible to callers — dedupe keys are never observed externally).
  const executionTf = def.timeframes.execution;
  const executionCtx = makeCompileCtx(candles, banks, 'exec', executionTf);

  // Required-anchor safety net (fixes the "0 trades on real data" class of
  // bug — see requiredAnchorsByPhase doc below): a phase's declared
  // `capture` list is UNIONED with whatever entry/stop/exits structurally
  // need from that phase, so an author (human or AI-generated definition)
  // that wires up `entry.priceAnchor`/`stop.basis:'wick'`/etc. WITHOUT also
  // remembering to declare the matching `capture` entry still gets a
  // resolvable anchor instead of a silently-null signal on every attempt.
  const requiredAnchors = requiredAnchorsByPhase(def);
  const captureFor = (phase: (typeof def.phases)[number]): AnchorKind[] => {
    const declared = new Set<AnchorKind>((phase.capture ?? []).map((c) => c.anchor));
    for (const kind of requiredAnchors.get(phase.id) ?? []) declared.add(kind);
    return Array.from(declared);
  };

  const phases: CompiledPhase[] = def.phases.map((phase, idx) => {
    const phaseTf = phase.timeframe;
    const isContextPhase = phaseTf !== undefined && phaseTf !== executionTf;

    if (!isContextPhase) {
      // Byte-identical Increment 1/2 codepath: compile directly against the
      // execution series/banks, no timeframe-index translation.
      return {
        id: phase.id,
        when: compileNode(phase.when, executionCtx, `phases[${idx}].when`),
        invalidateIf: phase.invalidateIf
          ? compileNode(phase.invalidateIf, executionCtx, `phases[${idx}].invalidateIf`)
          : undefined,
        withinBars: phase.within?.bars,
        capture: captureFor(phase),
        timeframe: executionTf,
      };
    }

    // Context-timeframe phase (Increment 3 — MTF).
    if (!mtf) {
      throw new Error(
        `compileStrategy: phases[${idx}] ("${phase.id}") declares timeframe "${phaseTf}" but no ` +
          'MTF context was supplied. StrategyEngine.ts must build a TimeframeSet + per-TF banks ' +
          'for every context timeframe a phase references — see ./TimeframeSet.ts.',
      );
    }
    const ctxBanks = mtf.banksByTf.get(phaseTf!);
    if (!ctxBanks) {
      throw new Error(
        `compileStrategy: phases[${idx}] ("${phase.id}") declares timeframe "${phaseTf}" but no ` +
          'banks were registered for it in MtfContext.banksByTf.',
      );
    }
    const ctxCandles = mtf.timeframeSet.series(phaseTf!);
    const ctxCtx = makeCompileCtx(ctxCandles, ctxBanks, phaseTf!, phaseTf!);

    // Compile the tree in the context TF's OWN index space (exactly like
    // any other compile — `compileNode` has no TF awareness), THEN wrap it
    // so the engine (which only ever passes EXECUTION bar indices) gets a
    // condition that transparently translates `i -> j` and single-fires on
    // the execution bar where `j` first becomes visible — see
    // `wrapContextCondition` below.
    const nativeWhen = compileNode(phase.when, ctxCtx, `phases[${idx}].when`);
    const nativeInvalidateIf = phase.invalidateIf
      ? compileNode(phase.invalidateIf, ctxCtx, `phases[${idx}].invalidateIf`)
      : undefined;

    return {
      id: phase.id,
      when: wrapContextCondition(nativeWhen, phaseTf!, mtf.timeframeSet),
      invalidateIf: nativeInvalidateIf
        ? wrapContextCondition(nativeInvalidateIf, phaseTf!, mtf.timeframeSet)
        : undefined,
      withinBars: phase.within?.bars,
      capture: captureFor(phase),
      timeframe: phaseTf!,
    };
  });

  // Strategy-level LevelRef/AnchorRef resolution (entry.priceAnchor,
  // stop.level/phaseRef, exits.target.level) ALWAYS resolves against the
  // EXECUTION context — entry/stop/exit management stays purely on the
  // execution series regardless of which timeframe(s) the phases fired on
  // (see StrategyEngine.ts module doc). `phaseAnchor` refs are TF-agnostic
  // prices either way (see types.ts LevelRef doc) — this only matters for
  // bank-backed LevelRefs (e.g. `stop.level: {type:'swingHigh'}`).
  const resolveLevel = (ref: LevelRef): ValueAccessor => buildLevelAccessor(ref, executionCtx);
  const resolveAnchor = (ref: AnchorRef): ValueAccessor => buildAnchorAccessor(ref);

  return { def, phases, manifest, resolveLevel, resolveAnchor };
}

/**
 * Wrap a CompiledCondition that was compiled against a CONTEXT timeframe's
 * OWN candle series (native index space) so it can be called by the engine
 * with EXECUTION bar indices, exactly like an execution-TF condition.
 *
 * SEMANTICS (Increment 3 — MTF phase sequencing):
 *  - `test(i, state)`: translate `i -> j = timeframeSet.alignedIndex(tf, i)`.
 *    If no context bar has closed yet (`j === -1`), false. Otherwise,
 *    SINGLE-FIRE: only true on the EXECUTION bar where `j` FIRST becomes
 *    visible (`j !== alignedIndex(tf, i - 1)`) — a 4h CHoCH (or any other
 *    context-TF condition) does not keep re-firing on every 5m bar for the
 *    whole 4h window, it fires exactly once, on the bar the new context bar
 *    closes. `crossesAbove`/`crossesBelow` inside the wrapped tree naturally
 *    compare `j` vs `j - 1` (both context-TF bar indices) because the
 *    wrapper calls the native tree with `j`, and `compileCompare`'s own
 *    crossing logic always looks at `index - 1` in whatever index space
 *    it's given.
 *  - `resolveDirection`/`resolveEventLevel`: same `i -> j` translation, no
 *    single-fire gating needed (per the module doc in this file, these are
 *    only ever called AFTER `test` is known true for the same `(i, state)`).
 */
function wrapContextCondition(
  native: CompiledCondition,
  tf: TF,
  timeframeSet: TimeframeSet,
): CompiledCondition {
  const jFor = (i: number): number => timeframeSet.alignedIndex(tf, i);

  return {
    test: (i, state) => {
      const j = jFor(i);
      if (j === -1) return false;
      const jPrev = i > 0 ? jFor(i - 1) : -1;
      if (j === jPrev) return false; // already fired for this context bar
      return native.test(j, state);
    },
    resolveDirection: (i, state) => {
      const j = jFor(i);
      if (j === -1) return null;
      return native.resolveDirection(j, state);
    },
    resolveEventLevel: (i, state) => {
      const j = jFor(i);
      if (j === -1) return null;
      return native.resolveEventLevel(j, state);
    },
  };
}

// ----------------------------------------------------------------------------
// Internal compile context
// ----------------------------------------------------------------------------

interface CompileCtx {
  def: StrategyDefinitionV2;
  candles: Candle[];
  banks: ConditionBanks;
  recordIndicator: (ref: IndicatorRef) => void;
  recordLevel: (ref: LevelRef) => void;
  getPatternDetections: (pattern: PatternParams) => Detection[];
  /** Present only when `SmtContext.banksByTf` has an entry for THIS
   *  compile context's own timeframe (Increment 4a — SMT divergence);
   *  `undefined` for every timeframe with no `smt` condition. */
  smtBank?: SmtBank;
}

function directionsToTest(direction: Direction): Array<'long' | 'short'> {
  return direction === 'both' ? ['long', 'short'] : [direction];
}

function patternSwingLookback(p: PatternParams): number {
  if (p.type === 'OB' || p.type === 'BREAKER' || p.type === 'LIQUIDITY') {
    return p.swing.lookback;
  }
  return 2;
}

function indicatorRefKey(ref: IndicatorRef): string {
  return `${ref.type}:${ref.length ?? 'default'}`;
}

/** Mirrors LevelBank's private `levelRefKey` — duplicated here since that
 *  one is not exported (avoids a two-way coupling for a 6-line function). */
function levelRefKeyLocal(ref: LevelRef): string {
  switch (ref.type) {
    case 'prevDayHigh':
    case 'prevDayLow':
    case 'prevDayClose':
    case 'sessionHigh':
    case 'sessionLow':
    case 'dayOpen':
      return ref.type;
    case 'openingRangeHigh':
    case 'openingRangeLow':
      return `${ref.type}:${ref.orMinutes ?? 'default'}`;
    case 'swingHigh':
    case 'swingLow':
      return `${ref.type}:${ref.lookback ?? 'default'}:${ref.nth ?? 1}`;
    case 'phaseAnchor':
      return `phaseAnchor:${ref.phaseId}:${ref.anchor}`;
  }
}

// ----------------------------------------------------------------------------
// Level / anchor accessors (shared by Operand{src:'level'}, levelInteraction,
// and SignalBuilderV2 via CompiledStrategy.resolveLevel/resolveAnchor).
// ----------------------------------------------------------------------------

function buildLevelAccessor(ref: LevelRef, ctx: CompileCtx): ValueAccessor {
  if (ref.type === 'phaseAnchor') {
    // No bank series to record/precompute — resolved live from RuntimeState.
    return buildAnchorAccessor({ phaseId: ref.phaseId, anchor: ref.anchor });
  }
  ctx.recordLevel(ref);
  const series = ctx.banks.levels.getSeries(ref);
  return (i: number) => (i >= 0 && i < series.length ? series[i] : NaN);
}

function buildAnchorAccessor(ref: AnchorRef): ValueAccessor {
  return (_i: number, state: RuntimeState) => {
    const captured = state.anchors.get(ref.phaseId);
    const value = captured?.[ref.anchor];
    return value === undefined ? NaN : value;
  };
}

function buildOperandAccessor(op: Operand, ctx: CompileCtx): ValueAccessor {
  switch (op.src) {
    case 'price': {
      const offset = op.offset ?? 0;
      const field = op.field;
      return (i: number) => {
        const idx = i - offset;
        if (idx < 0 || idx >= ctx.candles.length) return NaN;
        return ctx.candles[idx][field];
      };
    }
    case 'indicator': {
      if (!ctx.banks.indicators) {
        throw new Error(
          'ConditionCompiler.compileStrategy: strategy references an ' +
            `indicator Operand (${op.ref.type}) but no IndicatorBank was ` +
            'supplied in `banks.indicators`. indicators not available.',
        );
      }
      ctx.recordIndicator(op.ref);
      const series = ctx.banks.indicators.getSeries(op.ref);
      const offset = op.offset ?? 0;
      return (i: number) => {
        const idx = i - offset;
        if (idx < 0 || idx >= series.length) return NaN;
        return series[idx];
      };
    }
    case 'level':
      return buildLevelAccessor(op.ref, ctx);
    case 'const': {
      const value = op.value;
      return () => value;
    }
    /* istanbul ignore next -- exhaustiveness guard */
    default: {
      const _exhaustive: never = op;
      throw new Error(`ConditionCompiler: unknown Operand ${JSON.stringify(_exhaustive)}`);
    }
  }
}

// ----------------------------------------------------------------------------
// Tree compilation (and/or/not + leaves)
// ----------------------------------------------------------------------------

const NULL_DIRECTION = (): null => null;
const NULL_LEVEL = (): null => null;

function compileNode(node: ConditionNode, ctx: CompileCtx, path: string): CompiledCondition {
  if ('op' in node) {
    if (node.op === 'not') {
      const child = compileNode(node.child, ctx, `${path}.child`);
      return {
        test: (i, state) => !child.test(i, state),
        // Negation carries no directional/level information — see module doc.
        resolveDirection: NULL_DIRECTION,
        resolveEventLevel: NULL_LEVEL,
      };
    }
    const children = node.children.map((c, idx) => compileNode(c, ctx, `${path}.children[${idx}]`));
    if (node.op === 'and') {
      return {
        test: (i, state) => children.every((c) => c.test(i, state)),
        resolveDirection: (i, state) => {
          for (const c of children) {
            const d = c.resolveDirection(i, state);
            if (d) return d;
          }
          return null;
        },
        resolveEventLevel: (i, state) => {
          for (const c of children) {
            const lvl = c.resolveEventLevel(i, state);
            if (lvl !== null && !Number.isNaN(lvl)) return lvl;
          }
          return null;
        },
      };
    }
    // 'or'
    return {
      test: (i, state) => children.some((c) => c.test(i, state)),
      resolveDirection: (i, state) => {
        for (const c of children) {
          if (c.test(i, state)) {
            const d = c.resolveDirection(i, state);
            if (d) return d;
          }
        }
        return null;
      },
      resolveEventLevel: (i, state) => {
        for (const c of children) {
          if (c.test(i, state)) {
            const lvl = c.resolveEventLevel(i, state);
            if (lvl !== null && !Number.isNaN(lvl)) return lvl;
          }
        }
        return null;
      },
    };
  }
  return compileLeaf(node, ctx, path);
}

function compileLeaf(cond: Condition, ctx: CompileCtx, path: string): CompiledCondition {
  switch (cond.kind) {
    case 'compare':
      return compileCompare(cond, ctx);
    case 'levelInteraction':
      return compileLevelInteraction(cond, ctx, path);
    case 'event':
      return compileEvent(cond, ctx);
    case 'patternActive':
      return compilePatternActive(cond, ctx);
    case 'smt':
      return compileSmt(cond, ctx);
    /* istanbul ignore next -- exhaustiveness guard */
    default: {
      const _exhaustive: never = cond;
      throw new Error(`ConditionCompiler: unknown Condition ${JSON.stringify(_exhaustive)}`);
    }
  }
}

// ----- compare ---------------------------------------------------------------

function compileCompare(
  cond: Extract<Condition, { kind: 'compare' }>,
  ctx: CompileCtx,
): CompiledCondition {
  const left = buildOperandAccessor(cond.left, ctx);
  const right = buildOperandAccessor(cond.right, ctx);
  const cmp: CompareOp = cond.cmp;

  const test = (i: number, state: RuntimeState): boolean => {
    const l = left(i, state);
    const r = right(i, state);
    if (Number.isNaN(l) || Number.isNaN(r)) return false;
    switch (cmp) {
      case 'gt':
        return l > r;
      case 'lt':
        return l < r;
      case 'gte':
        return l >= r;
      case 'lte':
        return l <= r;
      case 'crossesAbove':
      case 'crossesBelow': {
        if (i <= 0) return false;
        const lp = left(i - 1, state);
        const rp = right(i - 1, state);
        if (Number.isNaN(lp) || Number.isNaN(rp)) return false;
        return cmp === 'crossesAbove' ? lp <= rp && l > r : lp >= rp && l < r;
      }
      /* istanbul ignore next -- exhaustiveness guard */
      default: {
        const _exhaustive: never = cmp;
        throw new Error(`compileCompare: unknown CompareOp ${JSON.stringify(_exhaustive)}`);
      }
    }
  };

  // compare is direction-agnostic — no natural long/short sense.
  return { test, resolveDirection: NULL_DIRECTION, resolveEventLevel: NULL_LEVEL };
}

// ----- levelInteraction --------------------------------------------------

function compileLevelInteraction(
  cond: Extract<Condition, { kind: 'levelInteraction' }>,
  ctx: CompileCtx,
  path: string,
): CompiledCondition {
  const levelAt = buildLevelAccessor(cond.level, ctx);
  const dirs = directionsToTest(ctx.def.direction);
  const withinBars = cond.withinBars ?? 5;
  const wickBodyRatio = cond.wickBodyRatio;

  /**
   * 'break': close beyond `level` in `dir` while the PREVIOUS close was not
   * (a genuine crossing, not "already beyond"). long = close crosses ABOVE
   * the level; short = close crosses BELOW it.
   */
  function brokeAt(i: number, state: RuntimeState, dir: 'long' | 'short'): boolean {
    if (i <= 0) return false;
    const level = levelAt(i, state);
    const prevLevel = levelAt(i - 1, state);
    if (Number.isNaN(level) || Number.isNaN(prevLevel)) return false;
    const close = ctx.candles[i].close;
    const prevClose = ctx.candles[i - 1].close;
    return dir === 'long'
      ? close > level && !(prevClose > prevLevel)
      : close < level && !(prevClose < prevLevel);
  }

  function testOne(i: number, state: RuntimeState, dir: 'long' | 'short'): boolean {
    const level = levelAt(i, state);
    if (Number.isNaN(level)) return false;
    const candle = ctx.candles[i];
    switch (cond.interaction) {
      case 'touch':
        return candle.low <= level && candle.high >= level;
      case 'closeBeyond':
        return dir === 'long' ? candle.close > level : candle.close < level;
      case 'break':
        return brokeAt(i, state, dir);
      case 'reject':
        return wickRejection(ctx.candles, i, {
          direction: dir === 'long' ? 1 : -1,
          wickBodyRatio,
          level,
        });
      case 'retest':
        return testRetest(i, state, dir, level);
      /* istanbul ignore next -- exhaustiveness guard */
      default: {
        const _exhaustive: never = cond.interaction;
        throw new Error(`compileLevelInteraction: unknown interaction ${JSON.stringify(_exhaustive)}`);
      }
    }
  }

  /**
   * 'retest': price returns to TOUCH the level within `withinBars` bars
   * AFTER a 'break' (see `brokeAt`) was observed in the same direction.
   * Stateful — tracked in `state.scratch` keyed by `${path}:${dir}`, an
   * object `{ brokeAtBar: number }`. On every bar: (1) if a pending break is
   * still within its window and this bar touches the level, fire true and
   * consume the entry; if the window expired, drop it. (2) independently,
   * detect a FRESH break at this bar and (re)arm the scratch entry — a new
   * break always restarts the retest window, even in the same bar a prior
   * one just fired.
   */
  function testRetest(i: number, state: RuntimeState, dir: 'long' | 'short', level: number): boolean {
    const key = `${path}:${dir}:retest`;
    const entry = state.scratch.get(key) as { brokeAtBar: number } | undefined;
    let fired = false;
    if (entry) {
      if (i - entry.brokeAtBar <= withinBars) {
        const candle = ctx.candles[i];
        if (candle.low <= level && candle.high >= level) {
          fired = true;
          state.scratch.delete(key);
        }
      } else {
        state.scratch.delete(key);
      }
    }
    if (brokeAt(i, state, dir)) {
      state.scratch.set(key, { brokeAtBar: i });
    }
    return fired;
  }

  const test = (i: number, state: RuntimeState): boolean => dirs.some((dir) => testOne(i, state, dir));

  const resolveDirection = (i: number, state: RuntimeState): 'long' | 'short' | null => {
    if (cond.interaction === 'touch') return null; // structural, not directional
    for (const dir of dirs) {
      if (testOne(i, state, dir)) return dir;
    }
    return null;
  };

  const resolveEventLevel = (i: number, state: RuntimeState): number | null => {
    const level = levelAt(i, state);
    return Number.isNaN(level) ? null : level;
  };

  return { test, resolveDirection, resolveEventLevel };
}

// ----- event ---------------------------------------------------------------

function compileEvent(
  cond: Extract<Condition, { kind: 'event' }>,
  ctx: CompileCtx,
): CompiledCondition {
  const dirs = directionsToTest(ctx.def.direction);
  const { events } = ctx.banks;

  if (cond.event === 'insideBar') {
    const arr = events.insideBar;
    return {
      test: (i) => arr[i] === 1,
      // insideBar carries no directional sense.
      resolveDirection: NULL_DIRECTION,
      resolveEventLevel: NULL_LEVEL,
    };
  }

  if (cond.event === 'wickRejection') {
    const wickBodyRatio = cond.params?.wickBodyRatio;
    const level = cond.params?.level;
    const fires = (i: number, dir: 'long' | 'short'): boolean =>
      wickRejection(ctx.candles, i, { direction: dir === 'long' ? 1 : -1, wickBodyRatio, level });
    return {
      test: (i) => dirs.some((dir) => fires(i, dir)),
      resolveDirection: (i) => dirs.find((dir) => fires(i, dir)) ?? null,
      resolveEventLevel: () => (level !== undefined ? level : null),
    };
  }

  // engulfing | mss | choch | sweep — direction-coded Int8Array (-1|0|+1).
  const arr = events[cond.event];
  const matches = (i: number, dir: 'long' | 'short'): boolean =>
    dir === 'long' ? arr[i] === 1 : arr[i] === -1;

  return {
    test: (i) => dirs.some((dir) => matches(i, dir)),
    resolveDirection: (i) => dirs.find((dir) => matches(i, dir)) ?? null,
    // No natural "level" for a pure structure event — StrategyEngine falls
    // back to the phase's `triggerPrice` anchor (bar close) when capturing.
    resolveEventLevel: NULL_LEVEL,
  };
}

// ----- patternActive ---------------------------------------------------------

function compilePatternActive(
  cond: Extract<Condition, { kind: 'patternActive' }>,
  ctx: CompileCtx,
): CompiledCondition {
  const dirs = directionsToTest(ctx.def.direction);
  const detections = ctx.getPatternDetections(cond.pattern);
  const maxAgeBars = 'maxAgeBars' in cond.pattern ? cond.pattern.maxAgeBars : Infinity;
  const n = ctx.candles.length;

  const overlaps = (candle: Candle, zone: { top: number; bottom: number }): boolean =>
    candle.low <= zone.top && candle.high >= zone.bottom;

  const arraysByDir = new Map<'long' | 'short', Uint8Array>();
  for (const dir of dirs) {
    const arr = new Uint8Array(n);
    const zones = detections.filter((d) => d.direction === dir);
    for (const z of zones) {
      // formedAtIndex causality: the zone is only usable from the bar AFTER
      // it formed — never the formation bar itself.
      const start = z.formedAtIndex + 1;
      const end = Number.isFinite(maxAgeBars)
        ? Math.min(n - 1, z.formedAtIndex + (maxAgeBars as number))
        : n - 1;
      if (cond.interaction === 'tap') {
        for (let i = start; i <= end; i++) {
          if (overlaps(ctx.candles[i], z.zone)) {
            arr[i] = 1;
            break; // first touch only, per zone.
          }
        }
      } else if (cond.interaction === 'priceInZone') {
        for (let i = start; i <= end; i++) {
          if (overlaps(ctx.candles[i], z.zone)) arr[i] = 1;
        }
      } else {
        // closeInside
        for (let i = start; i <= end; i++) {
          const c = ctx.candles[i].close;
          if (c >= z.zone.bottom && c <= z.zone.top) arr[i] = 1;
        }
      }
    }
    arraysByDir.set(dir, arr);
  }

  return {
    test: (i) => dirs.some((dir) => arraysByDir.get(dir)![i] === 1),
    resolveDirection: (i) => dirs.find((dir) => arraysByDir.get(dir)![i] === 1) ?? null,
    // Zone edges aren't tracked per-bar (only the 0/1 activity flag is) —
    // no natural single "level" to expose here.
    resolveEventLevel: NULL_LEVEL,
  };
}

// ----- smt (Increment 4a — SMT divergence) -----------------------------------

/**
 * `smt` always resolves a FIXED direction (`divergence: 'bearish'` -> short,
 * `'bullish'` -> long — see `types.ts`'s `Condition{kind:'smt'}` doc). Like
 * every other direction-coded leaf (`event`, `levelInteraction`), it is
 * still gated by `directionsToTest(ctx.def.direction)`: a `'long'`-only
 * strategy with a `'bearish'` (short-only) `smt` leaf can never fire it —
 * the leaf compiles to an always-false condition rather than silently
 * producing a signal the strategy's own `direction` field disallows.
 */
function compileSmt(cond: Extract<Condition, { kind: 'smt' }>, ctx: CompileCtx): CompiledCondition {
  if (!ctx.smtBank) {
    throw new Error(
      "ConditionCompiler.compileStrategy: strategy references an 'smt' condition " +
        `(compareSymbol="${cond.compareSymbol}") but no SmtContext bank was supplied for this ` +
        'timeframe. StrategyEngine.ts must build a compare-symbol LevelBank + causal alignment ' +
        'for every timeframe an smt condition references — see ./SmtBank.ts.',
    );
  }

  const resolvedDir: 'long' | 'short' = cond.divergence === 'bearish' ? 'short' : 'long';
  const dirs = directionsToTest(ctx.def.direction);
  if (!dirs.includes(resolvedDir)) {
    return { test: () => false, resolveDirection: NULL_DIRECTION, resolveEventLevel: NULL_LEVEL };
  }

  const { fires, level } = ctx.smtBank.getSeries(cond.reference, cond.divergence);

  return {
    test: (i) => fires[i] === 1,
    resolveDirection: (i) => (fires[i] === 1 ? resolvedDir : null),
    resolveEventLevel: (i) => (fires[i] === 1 && !Number.isNaN(level[i]) ? level[i] : null),
  };
}
