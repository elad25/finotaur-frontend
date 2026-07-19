// ============================================================================
// CONDITION COMPILER — unit tests for individual primitive compilation
// ============================================================================
// Focused, direct tests of `compileStrategy` against hand-built LevelBank/
// EventBank instances — proving each primitive kind (compare, levelInteraction,
// event, patternActive) and the and/or/direction-resolution machinery in
// isolation, ahead of the full end-to-end fixtures in `strategyEngine.test.ts`.
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Candle } from '../../../../components/ReplayChart/types';
import { LevelBank } from '../LevelBank';
import { EventBank } from '../EventBank';
import { compileStrategy, strategyNeedsIndicators, type RuntimeState } from '../ConditionCompiler';
import type { StrategyDefinitionV2, PhaseV2, ConditionNode } from '../types';
import { makeDefaultStrategyV2, validateStrategyStructure } from '../types';

function c(i: number, open: number, high: number, low: number, close: number): Candle {
  return { time: 1_700_000_000 + i * 900, open, high, low, close, volume: 1 };
}

function freshState(): RuntimeState {
  return { anchors: new Map(), scratch: new Map() };
}

/** Build a minimal, structurally-plain StrategyDefinitionV2 wrapping a single
 *  phase `when` condition, for direct compiler testing. */
function defWith(when: ConditionNode, direction: StrategyDefinitionV2['direction'] = 'long'): StrategyDefinitionV2 {
  const base = makeDefaultStrategyV2('TESTUSD', '15m');
  const phase: PhaseV2 = { id: 'p1', when };
  return { ...base, direction, phases: [phase] };
}

describe('ConditionCompiler — compare', () => {
  it('gt fires when close > const, NaN-safe', () => {
    const candles = [c(0, 100, 101, 99, 100), c(1, 100, 106, 99, 105)];
    const def = defWith({
      kind: 'compare',
      left: { src: 'price', field: 'close' },
      cmp: 'gt',
      right: { src: 'const', value: 102 },
    });
    const compiled = compileStrategy(def, candles, {
      levels: new LevelBank(candles, { timezone: 'UTC' }),
      events: new EventBank(candles, {}),
    });
    const state = freshState();
    expect(compiled.phases[0].when.test(0, state)).toBe(false); // 100 > 102? no
    expect(compiled.phases[0].when.test(1, state)).toBe(true); // 105 > 102? yes
  });

  it('crossesAbove fires only on the exact crossing bar', () => {
    const candles = [
      c(0, 100, 101, 99, 98), // close 98 < 100
      c(1, 98, 106, 97, 105), // close 105 > 100 -> crosses here
      c(2, 105, 110, 104, 108), // still above -> no re-fire (already crossed)
    ];
    const def = defWith({
      kind: 'compare',
      left: { src: 'price', field: 'close' },
      cmp: 'crossesAbove',
      right: { src: 'const', value: 100 },
    });
    const compiled = compileStrategy(def, candles, {
      levels: new LevelBank(candles, { timezone: 'UTC' }),
      events: new EventBank(candles, {}),
    });
    const state = freshState();
    expect(compiled.phases[0].when.test(0, state)).toBe(false);
    expect(compiled.phases[0].when.test(1, state)).toBe(true);
    expect(compiled.phases[0].when.test(2, state)).toBe(false); // both bars > 100 -> not a crossing
  });

  it('compare leaves are direction-agnostic (resolveDirection always null)', () => {
    const candles = [c(0, 100, 101, 99, 100), c(1, 100, 106, 99, 105)];
    const def = defWith(
      { kind: 'compare', left: { src: 'price', field: 'close' }, cmp: 'gt', right: { src: 'const', value: 102 } },
      'both',
    );
    const compiled = compileStrategy(def, candles, {
      levels: new LevelBank(candles, { timezone: 'UTC' }),
      events: new EventBank(candles, {}),
    });
    const state = freshState();
    expect(compiled.phases[0].when.resolveDirection(1, state)).toBeNull();
  });
});

describe('ConditionCompiler — pctDiff operand', () => {
  // Day1 (bars 0-1): last bar (bar1) close=100 -> prevDayClose(day2) = 100.
  // Day2 (bars 2-3): first bar (bar2) open=100.6 -> dayOpen = 100.6, constant
  // through the day (bar3 too). pctDiff = (100.6-100)/100*100 = 0.6%.
  const DAY1 = Date.UTC(2024, 0, 1, 0, 0, 0) / 1000;
  const HOUR = 3600;
  const candles: Candle[] = [
    { time: DAY1, open: 97, high: 99, low: 96, close: 98, volume: 1 },
    { time: DAY1 + HOUR, open: 98, high: 101, low: 97, close: 100, volume: 1 },
    { time: DAY1 + 24 * HOUR, open: 100.6, high: 101, low: 100, close: 100.8, volume: 1 },
    { time: DAY1 + 25 * HOUR, open: 100.9, high: 101.5, low: 100.5, close: 101, volume: 1 },
  ];

  function levelBank() {
    return new LevelBank(candles, { timezone: 'UTC' });
  }

  const gapCondition: ConditionNode = {
    kind: 'compare',
    left: {
      src: 'pctDiff',
      a: { src: 'level', ref: { type: 'dayOpen' } },
      b: { src: 'level', ref: { type: 'prevDayClose' } },
    },
    cmp: 'gte',
    right: { src: 'const', value: 0.5 },
  };

  it('resolves (a-b)/b*100 exactly on day2, NaN-safe (false, never throws) on day1', () => {
    const def = defWith(gapCondition);
    const compiled = compileStrategy(def, candles, {
      levels: levelBank(),
      events: new EventBank(candles, {}),
    });
    const state = freshState();
    // Day1: prevDayClose is NaN (no completed prior day yet) -> pctDiff NaN
    // -> compare is NaN-safe-false, not a throw.
    expect(compiled.phases[0].when.test(0, state)).toBe(false);
    expect(compiled.phases[0].when.test(1, state)).toBe(false);
    // Day2: dayOpen=100.6, prevDayClose=100 -> +0.6% >= 0.5% -> true, both
    // day2 bars (dayOpen is constant through the day).
    expect(compiled.phases[0].when.test(2, state)).toBe(true);
    expect(compiled.phases[0].when.test(3, state)).toBe(true);
  });

  it('resolves to NaN (never throws / divides-by-zero) when b is 0', () => {
    const def = defWith({
      kind: 'compare',
      left: { src: 'pctDiff', a: { src: 'const', value: 5 }, b: { src: 'const', value: 0 } },
      cmp: 'gt',
      right: { src: 'const', value: -999 },
    });
    const compiled = compileStrategy(def, candles, {
      levels: levelBank(),
      events: new EventBank(candles, {}),
    });
    const state = freshState();
    expect(compiled.phases[0].when.test(0, state)).toBe(false);
  });

  it('validateStrategyStructure rejects a nested pctDiff (a/b must not themselves be pctDiff)', () => {
    const nested: ConditionNode = {
      kind: 'compare',
      left: {
        src: 'pctDiff',
        a: { src: 'pctDiff', a: { src: 'const', value: 1 }, b: { src: 'const', value: 2 } },
        b: { src: 'const', value: 3 },
      },
      cmp: 'gt',
      right: { src: 'const', value: 0 },
    };
    const def = defWith(nested);
    const errors = validateStrategyStructure(def);
    expect(errors.some((e) => e.includes("must not themselves be 'pctDiff'"))).toBe(true);
  });
});

describe('ConditionCompiler — levelInteraction', () => {
  // Day1: bars 0-2, high max = 115 (bar1). Day2 starts at bar3 -> prevDayHigh = 115.
  // DAY1 is midnight UTC exactly, so +N hours never accidentally crosses a
  // calendar-day boundary before intended (unlike an arbitrary epoch value).
  const DAY1 = Date.UTC(2024, 0, 1, 0, 0, 0) / 1000;
  const HOUR = 3600;
  const candles: Candle[] = [
    { time: DAY1, open: 100, high: 110, low: 99, close: 105, volume: 1 },
    { time: DAY1 + HOUR, open: 105, high: 115, low: 104, close: 110, volume: 1 },
    { time: DAY1 + 2 * HOUR, open: 110, high: 112, low: 108, close: 109, volume: 1 },
    // Day2 (24h later so it's a new calendar day in UTC).
    { time: DAY1 + 24 * HOUR, open: 110, high: 118, low: 109, close: 111, volume: 1 }, // reject bar
    { time: DAY1 + 25 * HOUR, open: 111, high: 120, low: 110, close: 116, volume: 1 }, // break bar (close > 115... wait see test)
    { time: DAY1 + 26 * HOUR, open: 116, high: 117, low: 114, close: 115.5, volume: 1 },
  ];

  function levelBank() {
    return new LevelBank(candles, { timezone: 'UTC' });
  }

  it('touch: bar range contains the level, direction-agnostic', () => {
    const def = defWith(
      { kind: 'levelInteraction', level: { type: 'prevDayHigh' }, interaction: 'touch' },
      'both',
    );
    const compiled = compileStrategy(def, candles, { levels: levelBank(), events: new EventBank(candles, {}) });
    const state = freshState();
    // bar3: high 118 >= 115, low 109 <= 115 -> touches.
    expect(compiled.phases[0].when.test(3, state)).toBe(true);
    expect(compiled.phases[0].when.resolveDirection(3, state)).toBeNull();
  });

  it('reject: wick pierces the level, body closes back on the near side (short sense)', () => {
    const def = defWith(
      { kind: 'levelInteraction', level: { type: 'prevDayHigh' }, interaction: 'reject' },
      'short',
    );
    const compiled = compileStrategy(def, candles, { levels: levelBank(), events: new EventBank(candles, {}) });
    const state = freshState();
    // bar3: high 118 >= 115 (pierced), bodyTop = max(110,111) = 111 < 115 (closed back below) -> reject.
    expect(compiled.phases[0].when.test(3, state)).toBe(true);
    expect(compiled.phases[0].when.resolveDirection(3, state)).toBe('short');
    expect(compiled.phases[0].when.resolveEventLevel(3, state)).toBeCloseTo(115, 9);
  });

  it('break: close crosses beyond the level in the trade direction (long sense)', () => {
    const def = defWith(
      { kind: 'levelInteraction', level: { type: 'prevDayHigh' }, interaction: 'break' },
      'long',
    );
    const compiled = compileStrategy(def, candles, { levels: levelBank(), events: new EventBank(candles, {}) });
    const state = freshState();
    // bar3 close 111 < 115 -> no break yet. bar4 close 116 > 115 while bar3 close(111) was not > 115 -> break.
    expect(compiled.phases[0].when.test(3, state)).toBe(false);
    expect(compiled.phases[0].when.test(4, state)).toBe(true);
    expect(compiled.phases[0].when.resolveDirection(4, state)).toBe('long');
  });

  it('retest: fires when price returns to touch the level within withinBars after a break', () => {
    const def = defWith(
      {
        kind: 'levelInteraction',
        level: { type: 'prevDayHigh' },
        interaction: 'retest',
        withinBars: 3,
      },
      'long',
    );
    const compiled = compileStrategy(def, candles, { levels: levelBank(), events: new EventBank(candles, {}) });
    const state = freshState();
    // Break occurs at bar4 (close 116 > 115, prior close 111 wasn't). Bar5's range
    // [114,117] contains 115 -> retest fires at bar5 (1 bar after the break, within budget).
    expect(compiled.phases[0].when.test(3, state)).toBe(false);
    expect(compiled.phases[0].when.test(4, state)).toBe(false); // the break bar itself is not a retest
    expect(compiled.phases[0].when.test(5, state)).toBe(true);
  });
});

describe('ConditionCompiler — event', () => {
  it('engulfing fires direction-coded per EventBank, insideBar is direction-agnostic', () => {
    const candles = [
      c(0, 105, 106, 99, 100), // bearish body [100,105]
      c(1, 99, 108, 98, 107), // bullish, engulfs bar0's body -> +1 bullish engulfing
      c(2, 107, 107.5, 106, 107.2), // inside bar1's range -> insideBar
    ];
    const events = new EventBank(candles, {});
    const engulfDef = defWith({ kind: 'event', event: 'engulfing' }, 'long');
    const compiledEngulf = compileStrategy(engulfDef, candles, {
      levels: new LevelBank(candles, { timezone: 'UTC' }),
      events,
    });
    const state1 = freshState();
    expect(compiledEngulf.phases[0].when.test(1, state1)).toBe(true);
    expect(compiledEngulf.phases[0].when.resolveDirection(1, state1)).toBe('long');

    const insideDef = defWith({ kind: 'event', event: 'insideBar' }, 'both');
    const compiledInside = compileStrategy(insideDef, candles, {
      levels: new LevelBank(candles, { timezone: 'UTC' }),
      events,
    });
    const state2 = freshState();
    expect(compiledInside.phases[0].when.test(2, state2)).toBe(true);
    expect(compiledInside.phases[0].when.resolveDirection(2, state2)).toBeNull();
  });
});

describe('ConditionCompiler — patternActive', () => {
  it('tap fires on the FIRST bar price touches the zone after formation, not before/after', () => {
    const candles = [
      c(0, 100, 104, 99, 103),
      c(1, 103, 112, 102, 111),
      c(2, 111, 115, 110, 114), // bullish FVG forms here: zone [104,110]
      c(3, 114, 116, 111, 115), // still above the zone -> no tap
      c(4, 113, 114, 108, 109), // low 108 <= 110 -> FIRST tap
      c(5, 109, 110, 105, 106), // still overlapping, but NOT the first touch -> tap array stays 0 here
    ];
    const def = defWith(
      {
        kind: 'patternActive',
        pattern: {
          type: 'FVG',
          minGapPct: 0,
          requireDisplacement: false,
          displacementBodyMult: 0,
          mitigation: 'none',
          maxAgeBars: 50,
        },
        interaction: 'tap',
      },
      'long',
    );
    const compiled = compileStrategy(def, candles, {
      levels: new LevelBank(candles, { timezone: 'UTC' }),
      events: new EventBank(candles, {}),
    });
    const state = freshState();
    expect(compiled.phases[0].when.test(2, state)).toBe(false); // formation bar itself never counts
    expect(compiled.phases[0].when.test(3, state)).toBe(false);
    expect(compiled.phases[0].when.test(4, state)).toBe(true);
    expect(compiled.phases[0].when.test(5, state)).toBe(false); // already tapped once
  });
});

describe('ConditionCompiler — and/or direction resolution', () => {
  it('and: fires only when all children fire; direction is the first non-null in tree order', () => {
    const candles = [
      c(0, 105, 106, 99, 100),
      c(1, 99, 108, 98, 107), // bullish engulfing here
    ];
    const def = defWith(
      {
        op: 'and',
        children: [
          { kind: 'event', event: 'engulfing' },
          { kind: 'compare', left: { src: 'price', field: 'close' }, cmp: 'gt', right: { src: 'const', value: 100 } },
        ],
      },
      'both',
    );
    const compiled = compileStrategy(def, candles, {
      levels: new LevelBank(candles, { timezone: 'UTC' }),
      events: new EventBank(candles, {}),
    });
    const state = freshState();
    expect(compiled.phases[0].when.test(1, state)).toBe(true);
    expect(compiled.phases[0].when.resolveDirection(1, state)).toBe('long');
  });
});

describe('strategyNeedsIndicators', () => {
  it('is false for a strategy with no indicator Operand', () => {
    const def = defWith({ kind: 'compare', left: { src: 'price', field: 'close' }, cmp: 'gt', right: { src: 'const', value: 1 } });
    expect(strategyNeedsIndicators(def)).toBe(false);
  });

  it('is true when any phase references Operand{src:"indicator"}', () => {
    const def = defWith({
      kind: 'compare',
      left: { src: 'price', field: 'close' },
      cmp: 'crossesAbove',
      right: { src: 'indicator', ref: { type: 'ema', length: 20 } },
    });
    expect(strategyNeedsIndicators(def)).toBe(true);
  });

  it('compileStrategy throws a clear error for an indicator Operand with no IndicatorBank supplied', () => {
    const candles = [c(0, 100, 101, 99, 100), c(1, 100, 106, 99, 105)];
    const def = defWith({
      kind: 'compare',
      left: { src: 'price', field: 'close' },
      cmp: 'crossesAbove',
      right: { src: 'indicator', ref: { type: 'ema', length: 20 } },
    });
    expect(() =>
      compileStrategy(def, candles, {
        levels: new LevelBank(candles, { timezone: 'UTC' }),
        events: new EventBank(candles, {}),
      }),
    ).toThrow(/indicators not available/);
  });
});
