// src/pages/app/journal/backtest/lib/__tests__/describeCondition.test.ts

import { describe, it, expect } from 'vitest';
import {
  describeCondition,
  describePhase,
  describeStop,
  describeExits,
  describeFilters,
} from '../describeCondition';
import type { ConditionNode, PhaseV2 } from '@/core/auto/v2/types';

describe('describeCondition', () => {
  it('describes the flagship PDH-reject levelInteraction leaf', () => {
    const node: ConditionNode = {
      kind: 'levelInteraction',
      level: { type: 'prevDayHigh' },
      interaction: 'reject',
      wickBodyRatio: 2,
    };
    expect(describeCondition(node)).toBe('price rejects Previous Day High (wick≥2×body)');
  });

  it('describes a compare leaf with a price operand crossing an indicator', () => {
    const node: ConditionNode = {
      kind: 'compare',
      left: { src: 'price', field: 'close' },
      cmp: 'crossesAbove',
      right: { src: 'indicator', ref: { type: 'ema', length: 20 } },
    };
    expect(describeCondition(node)).toBe('close crosses above EMA(20)');
  });

  it('describes an event leaf', () => {
    const node: ConditionNode = { kind: 'event', event: 'mss' };
    expect(describeCondition(node)).toBe('price forms a market structure shift (MSS)');
  });

  it('describes an "and" tree over multiple children with parentheses + joiner', () => {
    const node: ConditionNode = {
      op: 'and',
      children: [
        {
          kind: 'levelInteraction',
          level: { type: 'prevDayHigh' },
          interaction: 'reject',
          wickBodyRatio: 2,
        },
        { kind: 'event', event: 'choch' },
      ],
    };
    expect(describeCondition(node)).toBe(
      '(price rejects Previous Day High (wick≥2×body) AND price forms a change of character (CHoCH))',
    );
  });

  it('describes a "not" wrapper', () => {
    const node: ConditionNode = {
      op: 'not',
      child: { kind: 'event', event: 'insideBar' },
    };
    expect(describeCondition(node)).toBe('NOT (price forms an inside bar)');
  });

  it('describePhase prefixes the 1-based phase index and includes the within-bars budget', () => {
    const phase: PhaseV2 = {
      id: 'p1',
      when: {
        kind: 'levelInteraction',
        level: { type: 'prevDayHigh' },
        interaction: 'reject',
        wickBodyRatio: 2,
      },
      within: { bars: 5 },
    };
    expect(describePhase(phase, 0)).toBe(
      '1. WHEN price rejects Previous Day High (wick≥2×body) within 5 bars',
    );
  });
});

describe('describeStop / describeExits / describeFilters', () => {
  it('describes an ATR-basis stop', () => {
    expect(describeStop({ basis: 'atr', bufferAtrMult: 1.5 })).toBe('Stop: 1.5× ATR from entry');
  });

  it('describes a wick-basis stop with a buffer', () => {
    expect(describeStop({ basis: 'wick', bufferPct: 0.1 })).toBe(
      "Stop: beyond the triggering phase's wick extreme (+0.1% buffer)",
    );
  });

  it('describes an rMultiple exit target', () => {
    expect(describeExits({ target: { basis: 'rMultiple', value: 2 } })).toBe('Exit: 2R target');
  });

  it('describes exits with partials and a time-stop', () => {
    expect(
      describeExits({
        target: { basis: 'rMultiple', value: 2 },
        partials: [{ atR: 1, sizePct: 50 }],
        timeStopBars: 20,
      }),
    ).toBe('Exit: 2R target, 1 partial(s), time-stop 20 bars');
  });

  it('describes an enabled session filter', () => {
    expect(
      describeFilters({
        session: {
          enabled: true,
          timezone: 'America/New_York',
          windows: [{ start: '03:00', end: '16:00' }],
        },
      }),
    ).toBe('Session 03:00-16:00 (America/New_York)');
  });

  it('describes no session filter as 24h', () => {
    expect(describeFilters({})).toBe('No session filter (24h)');
  });
});
