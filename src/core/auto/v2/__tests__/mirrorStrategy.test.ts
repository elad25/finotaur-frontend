// ============================================================================
// MIRROR STRATEGY — construct-by-construct golden fixtures + involution
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Condition, StrategyDefinitionV2 } from '../types';
import { mirrorStrategyV2 } from '../mirrorStrategy';

function baseRisk(): StrategyDefinitionV2['risk'] {
  return {
    riskPerTradePct: 1,
    maxConcurrent: 1,
    initialBalance: 10000,
    commissionPct: 0,
    slippagePct: 0,
    sizingMode: 'risk-pct',
  };
}

// ============================================================================
// 1. PDH-reject short -> PDL-reject long (full mirrored JSON asserted)
// ============================================================================

describe('mirrorStrategyV2 — short PDH-reject mirrors to long PDL-reject', () => {
  function pdhRejectDef(): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'pdh-reject',
      name: 'Reject prevDayHigh short',
      direction: 'short',
      mirror: true,
      instrument: { symbol: 'MNQ', source: 'databento' },
      timeframes: { execution: '5m' },
      phases: [
        {
          id: 'p1',
          when: { kind: 'levelInteraction', level: { type: 'prevDayHigh' }, interaction: 'reject' },
          capture: [{ anchor: 'wickExtreme' }],
        },
      ],
      entry: { orderType: 'market', validForBars: 5 },
      stop: { basis: 'wick' },
      exits: { target: { basis: 'rMultiple', value: 3 } },
      filters: {},
      risk: baseRisk(),
    };
  }

  it('produces the exact mirrored definition', () => {
    const mirrored = mirrorStrategyV2(pdhRejectDef());
    expect(mirrored).toEqual({
      schemaVersion: 2,
      id: 'pdh-reject (mirrored)',
      name: 'Reject prevDayHigh short (mirrored)',
      direction: 'long',
      mirror: false,
      instrument: { symbol: 'MNQ', source: 'databento' },
      timeframes: { execution: '5m' },
      phases: [
        {
          id: 'p1',
          when: { kind: 'levelInteraction', level: { type: 'prevDayLow' }, interaction: 'reject' },
          capture: [{ anchor: 'wickExtreme' }],
        },
      ],
      entry: { orderType: 'market', validForBars: 5 },
      stop: { basis: 'wick' },
      exits: { target: { basis: 'rMultiple', value: 3 } },
      filters: {},
      risk: baseRisk(),
    });
  });
});

// ============================================================================
// 2. EMA-cross compare flips cmp (indicator-vs-indicator)
// ============================================================================

describe('mirrorStrategyV2 — indicator-vs-indicator compare flips cmp', () => {
  function emaCrossDef(): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'ema-cross',
      name: 'EMA9/21 cross long',
      direction: 'long',
      mirror: true,
      instrument: { symbol: 'MNQ', source: 'databento' },
      timeframes: { execution: '5m' },
      phases: [
        {
          id: 'p1',
          when: {
            kind: 'compare',
            left: { src: 'indicator', ref: { type: 'ema', length: 9 } },
            cmp: 'crossesAbove',
            right: { src: 'indicator', ref: { type: 'ema', length: 21 } },
          },
        },
      ],
      entry: { orderType: 'market', validForBars: 5 },
      stop: { basis: 'fixedPct', bufferPct: 1 },
      exits: { target: { basis: 'rMultiple', value: 2 } },
      filters: {},
      risk: baseRisk(),
    };
  }

  it('flips crossesAbove -> crossesBelow (correct mirror of "go long when 9>21")', () => {
    const mirrored = mirrorStrategyV2(emaCrossDef());
    expect(mirrored.direction).toBe('short');
    const when = mirrored.phases[0].when;
    if ('op' in when) throw new Error('test assumption broken: expected a leaf compare condition');
    expect(when).toEqual({
      kind: 'compare',
      left: { src: 'indicator', ref: { type: 'ema', length: 9 } },
      cmp: 'crossesBelow',
      right: { src: 'indicator', ref: { type: 'ema', length: 21 } },
    });
  });

  it('does NOT flip a bare-const compare (no well-defined mirror point)', () => {
    const def: StrategyDefinitionV2 = emaCrossDef();
    def.phases[0].when = {
      kind: 'compare',
      left: { src: 'price', field: 'close' },
      cmp: 'gt',
      right: { src: 'const', value: 100 },
    };
    const mirrored = mirrorStrategyV2(def);
    const when = mirrored.phases[0].when;
    if ('op' in when) throw new Error('test assumption broken');
    expect(when.kind === 'compare' && when.cmp).toBe('gt');
  });
});

// ============================================================================
// 3. SMT divergence flips
// ============================================================================

describe('mirrorStrategyV2 — smt divergence + reference flip', () => {
  function smtDef(): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'smt-short',
      name: 'SMT bearish divergence short',
      direction: 'short',
      mirror: true,
      instrument: { symbol: 'MNQ', source: 'databento' },
      timeframes: { execution: '5m' },
      compareSymbols: ['MES'],
      phases: [
        {
          id: 'p1',
          when: {
            kind: 'smt',
            compareSymbol: 'MES',
            reference: { type: 'swingHigh' },
            divergence: 'bearish',
          },
        },
      ],
      entry: { orderType: 'market', validForBars: 5 },
      stop: { basis: 'fixedPct', bufferPct: 1 },
      exits: { target: { basis: 'rMultiple', value: 2 } },
      filters: {},
      risk: baseRisk(),
    };
  }

  it('flips bearish/swingHigh -> bullish/swingLow, keeps compareSymbol', () => {
    const mirrored = mirrorStrategyV2(smtDef());
    const when = mirrored.phases[0].when;
    if ('op' in when) throw new Error('test assumption broken');
    const smt = when as Extract<Condition, { kind: 'smt' }>;
    expect(smt.kind).toBe('smt');
    expect(smt.compareSymbol).toBe('MES');
    expect(smt.divergence).toBe('bullish');
    expect(smt.reference.type).toBe('swingLow');
  });
});

// ============================================================================
// 4. Involution sanity: mirror(mirror(x)).direction === x.direction
// ============================================================================

describe('mirrorStrategyV2 — involution', () => {
  function def(direction: 'long' | 'short'): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'involution',
      name: 'Involution check',
      direction,
      instrument: { symbol: 'MNQ', source: 'databento' },
      timeframes: { execution: '5m' },
      phases: [
        {
          id: 'p1',
          when: { kind: 'levelInteraction', level: { type: 'sessionHigh' }, interaction: 'break' },
        },
      ],
      entry: { orderType: 'market', validForBars: 5 },
      stop: { basis: 'fixedPct', bufferPct: 1 },
      exits: { target: { basis: 'rMultiple', value: 2 } },
      filters: {},
      risk: baseRisk(),
    };
  }

  it('mirroring twice restores the original direction', () => {
    for (const dir of ['long', 'short'] as const) {
      const once = mirrorStrategyV2(def(dir));
      const twice = mirrorStrategyV2(once);
      expect(twice.direction).toBe(dir);
    }
  });

  it('throws for direction "both" (no primary direction to mirror)', () => {
    expect(() => mirrorStrategyV2(def('long' as const) && { ...def('long'), direction: 'both' })).toThrow(
      /primary direction/,
    );
  });
});
