// ============================================================================
// MIRROR STRATEGY — pure, deterministic long<->short mirror of a
// StrategyDefinitionV2 (Increment 5 — auto-mirrored split-run / `mirror: true`)
// ============================================================================
//
// WHY THIS EXISTS
// -----------------
// Real prompts are frequently bidirectional by nature ("sweeps the prior
// session high or low", "go long on a close above the range high, short
// below the low", "mirror for longs"). Authoring a v2 definition with
// `direction: 'both'` does NOT express this correctly: the phase state
// machine resolves ONE candidate direction per attempt (the first
// direction-coded leaf to fire — see `StrategyEngine.ts`'s module doc), so a
// naive `'both'` strategy built from asymmetric long/short phases produces
// degenerate sequential phases and effectively 0 trades on real data.
//
// The fix: author the definition as its PRIMARY direction only
// (`direction: 'long' | 'short'`, NEVER `'both'`), set `mirror: true`, and
// let `StrategyEngine.ts`'s `runStrategyV2` run BOTH this function's output
// AND the original over the same series, merging the trades chronologically
// — see that module's doc for the merge semantics.
//
// MIRROR RULES (construct -> mirror)
// -------------------------------------
//   direction                    long <-> short
//   LevelRef.type                prevDayHigh<->prevDayLow,
//                                 sessionHigh<->sessionLow (sessionName kept),
//                                 openingRangeHigh<->openingRangeLow (orMinutes kept),
//                                 swingHigh<->swingLow (lookback/nth kept);
//                                 dayOpen / prevDayClose / phaseAnchor UNCHANGED
//                                 (no natural pair, or already direction-agnostic —
//                                 see types.ts's LevelRef doc)
//   levelInteraction              `interaction` UNCHANGED (touch/reject/break/
//                                 closeBeyond/retest are direction-neutral in the
//                                 schema — direction is resolved by the compiler's
//                                 `directionsToTest(def.direction)`, which this
//                                 module already flips via the top-level
//                                 `direction` field); `level` mirrored per above.
//   event / patternActive         UNCHANGED — direction is resolved the same
//                                 `directionsToTest(def.direction)` way, no
//                                 per-leaf direction field to flip.
//   compare (cmp)                 gt<->lt, gte<->lte, crossesAbove<->crossesBelow,
//                                 ONLY when either operand is a MIRRORED-PAIR
//                                 LevelRef (prevDayHigh/Low, sessionHigh/Low,
//                                 openingRangeHigh/Low, swingHigh/Low) OR both
//                                 operands are `indicator` (an indicator-vs-
//                                 indicator cross, e.g. "EMA9 crossesAbove
//                                 EMA21" -> "EMA9 crossesBelow EMA21" is the
//                                 correct mirror of "go long when 9>21").
//                                 A `const` comparison (e.g. `close > 100`) has
//                                 no well-defined mirror point and is left
//                                 UNCHANGED — see `mirrorCompareCondition` doc.
//                                 Operand LevelRefs are ALWAYS mirrored
//                                 (independent of the cmp-flip decision).
//   smt                           divergence bullish<->bearish; reference.type
//                                 swingHigh<->swingLow, prevDayHigh<->prevDayLow;
//                                 compareSymbol UNCHANGED.
//   anchors (capture/AnchorRef)   UNCHANGED — `wickExtreme`/`counterSwing`
//                                 already resolve directionally at RUNTIME from
//                                 the resolved trade direction (see
//                                 `StrategyEngine.ts`'s `captureAnchors`), not
//                                 from anything baked into the schema.
//   entry / stop.basis / bufferPct/AtrMult / exits.target.basis / value /
//   partials / trailing / timeStopBars / flatAt / filters / risk
//                                 UNCHANGED — direction-agnostic by
//                                 construction (already flip correctly at
//                                 runtime via `isLong` in StrategyEngine.ts).
//   stop.level / exits.target.level  mirrored per the LevelRef rule above.
//   exits.exitWhen                 mirrored the SAME way `phase.when` is
//                                 (full recursive ConditionNode mirror).
//   phase.id / .timeframe / .within / .capture   UNCHANGED (ids must stay
//                                 identical so AnchorRef/phaseAnchor
//                                 references elsewhere in the mirrored
//                                 definition keep resolving to the SAME
//                                 phase).
//   id / name                     suffixed ' (mirrored)'.
//   mirror                        forced `false` on the OUTPUT (the mirrored
//                                 variant is a plain single-direction
//                                 definition — mirroring it again would flip
//                                 back to the original direction, which is a
//                                 legitimate pure-function property but NOT
//                                 what a second engine pass should do).
// ============================================================================

import type {
  Condition,
  ConditionNode,
  CompareOp,
  EntryRuleV2,
  ExitRuleV2,
  LevelRef,
  Operand,
  PhaseV2,
  StopRuleV2,
  StrategyDefinitionV2,
} from './types';
import type { Direction } from '../types';

const CMP_FLIP: Record<CompareOp, CompareOp> = {
  gt: 'lt',
  lt: 'gt',
  gte: 'lte',
  lte: 'gte',
  crossesAbove: 'crossesBelow',
  crossesBelow: 'crossesAbove',
};

/** LevelRef.type members that have a natural directional pair. */
function isMirroredLevelType(t: LevelRef['type']): boolean {
  return (
    t === 'prevDayHigh' ||
    t === 'prevDayLow' ||
    t === 'sessionHigh' ||
    t === 'sessionLow' ||
    t === 'openingRangeHigh' ||
    t === 'openingRangeLow' ||
    t === 'swingHigh' ||
    t === 'swingLow'
  );
}

/** Mirror a LevelRef's `type` to its directional pair (branch-preserving —
 *  every pair lives within the SAME discriminated-union branch, so spreading
 *  the original ref with an overridden `type` stays a valid `LevelRef`).
 *  `dayOpen`/`prevDayClose`/`phaseAnchor` have no pair and pass through
 *  unchanged (structurally cloned). */
function mirrorLevelRef(ref: LevelRef): LevelRef {
  switch (ref.type) {
    case 'prevDayHigh':
      return { ...structuredClone(ref), type: 'prevDayLow' };
    case 'prevDayLow':
      return { ...structuredClone(ref), type: 'prevDayHigh' };
    case 'sessionHigh':
      return { ...structuredClone(ref), type: 'sessionLow' };
    case 'sessionLow':
      return { ...structuredClone(ref), type: 'sessionHigh' };
    case 'openingRangeHigh':
      return { ...structuredClone(ref), type: 'openingRangeLow' };
    case 'openingRangeLow':
      return { ...structuredClone(ref), type: 'openingRangeHigh' };
    case 'swingHigh':
      return { ...structuredClone(ref), type: 'swingLow' };
    case 'swingLow':
      return { ...structuredClone(ref), type: 'swingHigh' };
    case 'dayOpen':
    case 'prevDayClose':
    case 'phaseAnchor':
      return structuredClone(ref);
    /* istanbul ignore next -- exhaustiveness guard */
    default: {
      const _exhaustive: never = ref;
      throw new Error(`mirrorStrategyV2: unknown LevelRef ${JSON.stringify(_exhaustive)}`);
    }
  }
}

function isMirroredLevelOperand(op: Operand): boolean {
  return op.src === 'level' && isMirroredLevelType(op.ref.type);
}

/** Mirror an Operand: recurse into `level` (mirrors the LevelRef) and
 *  `pctDiff` (mirrors `a`/`b`); every other src is structurally cloned,
 *  unchanged. */
function mirrorOperand(op: Operand): Operand {
  if (op.src === 'level') {
    return { ...structuredClone(op), ref: mirrorLevelRef(op.ref) };
  }
  if (op.src === 'pctDiff') {
    return { src: 'pctDiff', a: mirrorOperand(op.a), b: mirrorOperand(op.b) };
  }
  return structuredClone(op);
}

/**
 * cmp flips ONLY when either operand is a mirrored-pair LevelRef, OR both
 * operands are `indicator` (indicator-vs-indicator cross) — see module doc
 * "compare (cmp)" for the full rationale, including why a bare `const`
 * comparison is deliberately left unflipped.
 */
function mirrorCompareCondition(cond: Extract<Condition, { kind: 'compare' }>): Condition {
  const shouldFlip =
    isMirroredLevelOperand(cond.left) ||
    isMirroredLevelOperand(cond.right) ||
    (cond.left.src === 'indicator' && cond.right.src === 'indicator');
  return {
    kind: 'compare',
    left: mirrorOperand(cond.left),
    right: mirrorOperand(cond.right),
    cmp: shouldFlip ? CMP_FLIP[cond.cmp] : cond.cmp,
  };
}

function mirrorSmtReferenceType(
  t: 'swingHigh' | 'swingLow' | 'prevDayHigh' | 'prevDayLow',
): 'swingHigh' | 'swingLow' | 'prevDayHigh' | 'prevDayLow' {
  switch (t) {
    case 'swingHigh':
      return 'swingLow';
    case 'swingLow':
      return 'swingHigh';
    case 'prevDayHigh':
      return 'prevDayLow';
    case 'prevDayLow':
      return 'prevDayHigh';
    /* istanbul ignore next -- exhaustiveness guard */
    default: {
      const _exhaustive: never = t;
      throw new Error(`mirrorStrategyV2: unknown smt reference type ${JSON.stringify(_exhaustive)}`);
    }
  }
}

function mirrorSmtCondition(cond: Extract<Condition, { kind: 'smt' }>): Condition {
  return {
    kind: 'smt',
    compareSymbol: cond.compareSymbol,
    reference: { type: mirrorSmtReferenceType(cond.reference.type) },
    divergence: cond.divergence === 'bullish' ? 'bearish' : 'bullish',
  };
}

function mirrorLeafCondition(cond: Condition): Condition {
  switch (cond.kind) {
    case 'compare':
      return mirrorCompareCondition(cond);
    case 'levelInteraction':
      return { ...structuredClone(cond), level: mirrorLevelRef(cond.level) };
    case 'event':
    case 'patternActive':
      // Direction is resolved via directionsToTest(def.direction) at compile
      // time (see ConditionCompiler.ts) — no per-leaf field to flip here.
      return structuredClone(cond);
    case 'smt':
      return mirrorSmtCondition(cond);
    /* istanbul ignore next -- exhaustiveness guard */
    default: {
      const _exhaustive: never = cond;
      throw new Error(`mirrorStrategyV2: unknown Condition ${JSON.stringify(_exhaustive)}`);
    }
  }
}

function mirrorConditionNode(node: ConditionNode): ConditionNode {
  if ('op' in node) {
    if (node.op === 'not') return { op: 'not', child: mirrorConditionNode(node.child) };
    return { op: node.op, children: node.children.map(mirrorConditionNode) };
  }
  return mirrorLeafCondition(node);
}

function mirrorPhase(phase: PhaseV2): PhaseV2 {
  return {
    ...structuredClone(phase),
    when: mirrorConditionNode(phase.when),
    invalidateIf: phase.invalidateIf ? mirrorConditionNode(phase.invalidateIf) : undefined,
  };
}

function mirrorEntry(entry: EntryRuleV2): EntryRuleV2 {
  // priceAnchor (AnchorRef: phaseId + AnchorKind) is TF/direction-agnostic —
  // unchanged, structurally cloned.
  return structuredClone(entry);
}

function mirrorStop(stop: StopRuleV2): StopRuleV2 {
  const cloned = structuredClone(stop);
  if (stop.basis === 'level' && stop.level) {
    cloned.level = mirrorLevelRef(stop.level);
  }
  return cloned;
}

function mirrorExits(exits: ExitRuleV2): ExitRuleV2 {
  const cloned = structuredClone(exits);
  if (exits.target?.basis === 'level' && exits.target.level && cloned.target) {
    cloned.target.level = mirrorLevelRef(exits.target.level);
  }
  if (exits.exitWhen) {
    cloned.exitWhen = mirrorConditionNode(exits.exitWhen);
  }
  return cloned;
}

/**
 * Pure, deterministic mirror of a StrategyDefinitionV2 — see module doc for
 * the full construct -> mirror table. Throws if `def.direction === 'both'`
 * (mirror requires a primary direction; `validateStrategyStructure` also
 * rejects `mirror: true` with `direction: 'both'` for definitions that flow
 * through the engine, but this function is also usable standalone).
 */
export function mirrorStrategyV2(def: StrategyDefinitionV2): StrategyDefinitionV2 {
  if (def.direction === 'both') {
    throw new Error(
      `mirrorStrategyV2: strategy "${def.id}" has direction 'both' — mirroring requires a ` +
        "primary direction ('long' or 'short'); a 'both' strategy already covers both senses.",
    );
  }
  const mirroredDirection: Direction = def.direction === 'long' ? 'short' : 'long';

  return {
    ...structuredClone(def),
    id: `${def.id} (mirrored)`,
    name: `${def.name} (mirrored)`,
    direction: mirroredDirection,
    mirror: false,
    phases: def.phases.map(mirrorPhase),
    entry: mirrorEntry(def.entry),
    stop: mirrorStop(def.stop),
    exits: mirrorExits(def.exits),
  };
}
