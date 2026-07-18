// src/pages/app/journal/backtest/lib/describeCondition.ts
// ============================================================================
// Pure, recursive English formatters for a StrategyDefinitionV2's condition
// trees, phases, stop, exits, and filters — powers the read-only
// StrategyV2Summary review panel. No React/store imports; safe to unit-test
// in isolation. Kept compact on purpose (this is a review aid, not a full
// natural-language generator).
// ============================================================================

import type {
  AnchorKind,
  CompareOp,
  Condition,
  ConditionNode,
  EventName,
  ExitRuleV2,
  FiltersV2,
  IndicatorRef,
  LevelRef,
  Operand,
  PhaseV2,
  StopRuleV2,
} from '@/core/auto/v2/types';

// ---------------------------------------------------------------------------
// Anchors / levels / indicators / operands
// ---------------------------------------------------------------------------

function describeAnchorKind(kind: AnchorKind): string {
  switch (kind) {
    case 'triggerPrice':
      return 'trigger price';
    case 'triggerBarHigh':
      return 'trigger bar high';
    case 'triggerBarLow':
      return 'trigger bar low';
    case 'wickExtreme':
      return 'wick extreme';
    case 'eventLevel':
      return 'event level';
    case 'counterSwing':
      return 'counter swing';
    default:
      return kind;
  }
}

export function describeLevel(ref: LevelRef): string {
  switch (ref.type) {
    case 'prevDayHigh':
      return 'Previous Day High';
    case 'prevDayLow':
      return 'Previous Day Low';
    case 'prevDayClose':
      return 'Previous Day Close';
    case 'sessionHigh':
      return 'Session High';
    case 'sessionLow':
      return 'Session Low';
    case 'openingRangeHigh':
      return `${ref.orMinutes ?? 15}min Opening Range High`;
    case 'openingRangeLow':
      return `${ref.orMinutes ?? 15}min Opening Range Low`;
    case 'dayOpen':
      return 'Day Open';
    case 'swingHigh':
      return `Swing High${ref.nth && ref.nth > 1 ? ` (#${ref.nth})` : ''}`;
    case 'swingLow':
      return `Swing Low${ref.nth && ref.nth > 1 ? ` (#${ref.nth})` : ''}`;
    case 'phaseAnchor':
      return `Phase "${ref.phaseId}" ${describeAnchorKind(ref.anchor)}`;
    default:
      return 'level';
  }
}

function describeIndicator(ref: IndicatorRef): string {
  const name = ref.type.toUpperCase();
  return ref.length ? `${name}(${ref.length})` : name;
}

function describeOperand(op: Operand): string {
  switch (op.src) {
    case 'price':
      return op.offset ? `${op.field}[${-op.offset}]` : op.field;
    case 'indicator':
      return op.offset ? `${describeIndicator(op.ref)}[${-op.offset}]` : describeIndicator(op.ref);
    case 'level':
      return describeLevel(op.ref);
    case 'const':
      return String(op.value);
    default:
      return 'value';
  }
}

// ---------------------------------------------------------------------------
// Condition leaves
// ---------------------------------------------------------------------------

const CMP_LABEL: Record<CompareOp, string> = {
  gt: 'is above',
  lt: 'is below',
  gte: 'is at or above',
  lte: 'is at or below',
  crossesAbove: 'crosses above',
  crossesBelow: 'crosses below',
};

function describeEvent(event: EventName): string {
  switch (event) {
    case 'engulfing':
      return 'an engulfing candle';
    case 'wickRejection':
      return 'a wick rejection';
    case 'insideBar':
      return 'an inside bar';
    case 'choch':
      return 'a change of character (CHoCH)';
    case 'mss':
      return 'a market structure shift (MSS)';
    case 'sweep':
      return 'a liquidity sweep';
    default:
      return event;
  }
}

function describeConditionLeaf(c: Condition): string {
  switch (c.kind) {
    case 'compare':
      return `${describeOperand(c.left)} ${CMP_LABEL[c.cmp]} ${describeOperand(c.right)}`;
    case 'levelInteraction': {
      let interactionLabel: string;
      switch (c.interaction) {
        case 'touch':
          interactionLabel = 'touches';
          break;
        case 'reject':
          interactionLabel = 'rejects';
          break;
        case 'break':
          interactionLabel = 'breaks';
          break;
        case 'closeBeyond':
          interactionLabel = 'closes beyond';
          break;
        case 'retest':
          interactionLabel = 'retests';
          break;
        default:
          interactionLabel = 'interacts with';
      }
      const wick =
        c.interaction === 'reject' && c.wickBodyRatio ? ` (wick≥${c.wickBodyRatio}×body)` : '';
      return `price ${interactionLabel} ${describeLevel(c.level)}${wick}`;
    }
    case 'event':
      return `price forms ${describeEvent(c.event)}`;
    case 'patternActive': {
      let interactionLabel: string;
      switch (c.interaction) {
        case 'priceInZone':
          interactionLabel = 'is inside';
          break;
        case 'tap':
          interactionLabel = 'taps';
          break;
        case 'closeInside':
          interactionLabel = 'closes inside';
          break;
        default:
          interactionLabel = 'interacts with';
      }
      return `price ${interactionLabel} a ${c.pattern.type} zone`;
    }
    default:
      return 'condition';
  }
}

// ---------------------------------------------------------------------------
// ConditionNode (and/or/not tree) — recursive
// ---------------------------------------------------------------------------

/** Recursively describe a ConditionNode as a compact English sentence fragment. */
export function describeCondition(node: ConditionNode): string {
  if ('op' in node) {
    if (node.op === 'not') {
      return `NOT (${describeCondition(node.child)})`;
    }
    const joiner = node.op === 'and' ? ' AND ' : ' OR ';
    const parts = node.children.map(describeCondition);
    return parts.length > 1 ? `(${parts.join(joiner)})` : (parts[0] ?? '');
  }
  return describeConditionLeaf(node);
}

// ---------------------------------------------------------------------------
// Phase / stop / exits / filters
// ---------------------------------------------------------------------------

/** Human-readable one-line description of a full phase ("1. WHEN ..."). */
export function describePhase(phase: PhaseV2, index: number): string {
  const cond = describeCondition(phase.when);
  const within = phase.within ? ` within ${phase.within.bars} bars` : '';
  return `${index + 1}. WHEN ${cond}${within}`;
}

function bufferSuffix(bufferPct?: number): string {
  return bufferPct ? ` (+${bufferPct}% buffer)` : '';
}

/** One-line description of the stop rule. */
export function describeStop(stop: StopRuleV2): string {
  switch (stop.basis) {
    case 'structure':
      return `Stop: beyond the nearest opposing structure${bufferSuffix(stop.bufferPct)}`;
    case 'wick':
      return `Stop: beyond the triggering phase's wick extreme${bufferSuffix(stop.bufferPct)}`;
    case 'atr':
      return `Stop: ${stop.bufferAtrMult ?? 1}× ATR from entry`;
    case 'fixedPct':
      return `Stop: ${stop.bufferPct ?? 0}% from entry`;
    case 'level':
      return `Stop: beyond ${stop.level ? describeLevel(stop.level) : 'level'}${bufferSuffix(stop.bufferPct)}`;
    case 'phaseAnchor':
      return `Stop: beyond ${
        stop.phaseRef
          ? describeLevel({ type: 'phaseAnchor', phaseId: stop.phaseRef.phaseId, anchor: stop.phaseRef.anchor })
          : 'phase anchor'
      }`;
    default:
      return 'Stop: not configured';
  }
}

/** One-line description of exits (target + partials + trailing + time-stop). */
export function describeExits(exits: ExitRuleV2): string {
  const { target, partials, trailing, timeStopBars } = exits;
  let targetDesc: string;
  switch (target.basis) {
    case 'rMultiple':
      targetDesc = `${target.value ?? '?'}R target`;
      break;
    case 'fixedPct':
      targetDesc = `${target.value ?? '?'}% target`;
      break;
    case 'level':
      targetDesc = `target at ${target.level ? describeLevel(target.level) : 'level'}`;
      break;
    default:
      targetDesc = 'target not configured';
  }
  const bits = [`Exit: ${targetDesc}`];
  if (partials && partials.length > 0) bits.push(`${partials.length} partial(s)`);
  if (trailing) bits.push(`trailing (${trailing.mode})`);
  if (timeStopBars) bits.push(`time-stop ${timeStopBars} bars`);
  return bits.join(', ');
}

/** One-line description of filters (session + trade caps). */
export function describeFilters(filters: FiltersV2): string {
  const bits: string[] = [];
  if (filters.session?.enabled) {
    const windows = filters.session.windows.map((w) => `${w.start}-${w.end}`).join(', ');
    bits.push(`Session ${windows || 'n/a'} (${filters.session.timezone})`);
  } else {
    bits.push('No session filter (24h)');
  }
  if (filters.maxTradesPerDay) bits.push(`Max ${filters.maxTradesPerDay} trades/day`);
  if (filters.dailyLossStopPct) bits.push(`Daily loss stop ${filters.dailyLossStopPct}%`);
  return bits.join(' · ');
}
