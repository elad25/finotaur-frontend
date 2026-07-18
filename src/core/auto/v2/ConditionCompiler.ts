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

// ----------------------------------------------------------------------------
// Public: compileStrategy
// ----------------------------------------------------------------------------

export function compileStrategy(
  def: StrategyDefinitionV2,
  candles: Candle[],
  banks: ConditionBanks,
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

  const ctx: CompileCtx = {
    def,
    candles,
    banks,
    recordIndicator: (ref) => {
      const key = indicatorRefKey(ref);
      if (!seenIndicatorKeys.has(key)) {
        seenIndicatorKeys.add(key);
        manifest.needsIndicators = true;
        manifest.indicatorRefs.push(ref);
      }
    },
    recordLevel: (ref) => {
      const key = levelRefKeyLocal(ref);
      if (!seenLevelKeys.has(key)) {
        seenLevelKeys.add(key);
        manifest.levelRefs.push(ref);
      }
    },
    getPatternDetections: (pattern) => {
      const key = JSON.stringify(pattern);
      let dets = patternDetectionCache.get(key);
      if (!dets) {
        if (!seenPatternKeys.has(key)) {
          seenPatternKeys.add(key);
          manifest.patterns.push(pattern);
        }
        const lookback = patternSwingLookback(pattern);
        const mctx = MarketContext.build(candles, { swingLookback: lookback, atrPeriod: 14 });
        dets = runDetectors([pattern], candles, mctx);
        patternDetectionCache.set(key, dets);
      }
      return dets;
    },
  };

  const phases: CompiledPhase[] = def.phases.map((phase, idx) => ({
    id: phase.id,
    when: compileNode(phase.when, ctx, `phases[${idx}].when`),
    invalidateIf: phase.invalidateIf
      ? compileNode(phase.invalidateIf, ctx, `phases[${idx}].invalidateIf`)
      : undefined,
    withinBars: phase.within?.bars,
    capture: (phase.capture ?? []).map((c) => c.anchor),
  }));

  const resolveLevel = (ref: LevelRef): ValueAccessor => buildLevelAccessor(ref, ctx);
  const resolveAnchor = (ref: AnchorRef): ValueAccessor => buildAnchorAccessor(ref);

  return { def, phases, manifest, resolveLevel, resolveAnchor };
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
