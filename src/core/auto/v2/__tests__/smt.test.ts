// ============================================================================
// SMT DIVERGENCE — golden fixtures, window semantics, causality, validation,
// and full engine integration (Increment 4a)
// ============================================================================
// Hand-built candle series with the expected outcome derived in comments,
// mirroring the derivation discipline of `strategyEngine.test.ts` /
// `strategyEngineMtf.test.ts`. Most tests exercise `SmtBank` directly (the
// primitive under test); one exercises the full 2-phase engine end-to-end.
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Candle } from '../../../../components/ReplayChart/types';
import { LevelBank } from '../LevelBank';
import { SmtBank, alignCompareSeries, DEFAULT_SMT_WINDOW_BARS } from '../SmtBank';
import { validateStrategyStructure, type StrategyDefinitionV2, type PhaseV2 } from '../types';
import { runStrategyV2 } from '../StrategyEngine';

/** Candle factory. `time` in SECONDS, 15m cadence (`k * 900`). */
function x(k: number, open: number, high: number, low: number, close: number, baseSec = 0): Candle {
  return { time: baseSec + k * 900, open, high, low, close, volume: 1 };
}

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
// 1. GOLDEN BEARISH SMT (swingHigh reference, at highs)
// ============================================================================
//
// TRADED: a confirmed swingHigh pivot at idx2 (high=110, k=2 fractal ->
// confirmedAt idx4: window[0,4]'s highs are 90,95,110,92,91, so idx2 is the
// strict max). idx7 sweeps ABOVE 110 (high=115). idx7 itself ALSO becomes a
// confirmed pivot later (window[5,9]'s highs are 80,78,115,76,77 -> idx7 is
// the strict max -> confirmedAt idx9), which SUPERSEDES 110 with 115 from
// index 9 onward — harmless here because every `refIdx` this fixture's
// assertions exercise (4, 5, 6 — see the `i >= 9 && i <= 11` window below)
// is < 9, so it always reads the ORIGINAL 110, never the superseding 115.
const tradedGolden: Candle[] = [
  x(0, 90, 90, 85, 88),
  x(1, 95, 95, 88, 93),
  x(2, 108, 110, 90, 105), // swingHigh pivot candidate (high=110)
  x(3, 90, 92, 87, 90),
  x(4, 89, 91, 86, 89), // confirms idx2 pivot (confirmedAt=4)
  x(5, 78, 80, 75, 78),
  x(6, 76, 78, 74, 76),
  x(7, 100, 115, 70, 90), // SWEEP: high=115 > 110
  x(8, 74, 76, 72, 74),
  x(9, 75, 77, 73, 75),
  x(10, 77, 79, 74, 77),
  x(11, 79, 81, 76, 79),
  x(12, 80, 82, 77, 80),
  x(13, 81, 83, 78, 81),
  x(14, 82, 84, 79, 82),
];

/** COMPARE: its own swingHigh pivot at idx2 (high=99, confirmedAt=4), but
 *  NEVER sweeps it (all highs stay well under 99 after idx4) — this is the
 *  "compare fails to confirm" half of the divergence. */
function compareNoSweep(): Candle[] {
  return [
    x(0, 88, 88, 83, 86),
    x(1, 90, 90, 85, 88),
    x(2, 96, 99, 88, 95), // swingHigh pivot candidate (high=99)
    x(3, 88, 90, 85, 88),
    x(4, 87, 89, 84, 87), // confirms idx2 pivot (confirmedAt=4)
    x(5, 70, 72, 68, 70),
    x(6, 68, 70, 66, 68),
    x(7, 71, 73, 67, 70), // NO sweep: high=73 < 99
    x(8, 66, 68, 64, 66),
    x(9, 67, 69, 65, 67),
    x(10, 69, 71, 66, 69),
    x(11, 71, 73, 68, 71),
    x(12, 72, 74, 69, 72),
    x(13, 73, 75, 70, 73),
    x(14, 74, 76, 71, 74),
  ];
}

/** Same shape, but idx7's high is bumped ABOVE the compare's own level (99)
 *  -- the compare symbol ALSO sweeps -> no divergence, should NOT fire. */
function compareAlsoSweeps(): Candle[] {
  const base = compareNoSweep();
  base[7] = x(7, 71, 105, 67, 70); // now sweeps (105 > 99)
  return base;
}

function buildSmtBank(traded: Candle[], compare: Candle[]): SmtBank {
  const tradedLevels = new LevelBank(traded, { timezone: 'UTC' });
  const compareLevels = new LevelBank(compare, { timezone: 'UTC' });
  const alignment = alignCompareSeries(traded, compare);
  return new SmtBank(traded, tradedLevels, compare, compareLevels, alignment);
}

describe('SmtBank — golden bearish divergence (swingHigh, at highs)', () => {
  it('fires exactly while the sweep bar (idx7) is inside the DEFAULT_SMT_WINDOW_BARS window, and nowhere else', () => {
    const bank = buildSmtBank(tradedGolden, compareNoSweep());
    const { fires, level } = bank.getSeries({ type: 'swingHigh' }, 'bearish');

    // refIdx = i - DEFAULT_SMT_WINDOW_BARS (5) needs refIdx >= 4 (pivot
    // confirmedAt) -> i >= 9. The sweep bar (idx7) is inside the window
    // [i-4, i] for i in [7, 11]. Intersection: i in [9, 11].
    for (let i = 0; i < tradedGolden.length; i++) {
      const expected = i >= 9 && i <= 11 ? 1 : 0;
      expect(fires[i]).toBe(expected);
    }
    expect(level[9]).toBeCloseTo(110, 9);
    expect(level[10]).toBeCloseTo(110, 9);
    expect(level[11]).toBeCloseTo(110, 9);
  });

  it('does NOT fire when the compare symbol ALSO sweeps its own level in the same window (no divergence)', () => {
    const bank = buildSmtBank(tradedGolden, compareAlsoSweeps());
    const { fires } = bank.getSeries({ type: 'swingHigh' }, 'bearish');
    for (let i = 0; i < tradedGolden.length; i++) {
      expect(fires[i]).toBe(0);
    }
  });
});

// ============================================================================
// 2. BULLISH VARIANT AT LOWS (swingLow reference, mirror of the above)
// ============================================================================
const tradedGoldenLows: Candle[] = [
  x(0, 90, 95, 91, 92),
  x(1, 93, 98, 93, 95),
  x(2, 92, 110, 90, 105), // swingLow pivot candidate (low=90)
  x(3, 108, 113, 108, 110),
  x(4, 109, 114, 109, 111), // confirms idx2 pivot (confirmedAt=4)
  x(5, 120, 125, 120, 122),
  x(6, 122, 127, 122, 124),
  x(7, 100, 130, 85, 90), // SWEEP: low=85 < 90
  x(8, 124, 129, 124, 126),
  x(9, 125, 130, 125, 127),
  x(10, 127, 132, 127, 129),
  x(11, 129, 134, 129, 131),
  x(12, 130, 135, 130, 132),
  x(13, 131, 136, 131, 133),
  x(14, 132, 137, 132, 134),
];

function compareLowsNoSweep(): Candle[] {
  return [
    x(0, 88, 93, 89, 90),
    x(1, 91, 96, 91, 93),
    x(2, 90, 99, 88, 95), // swingLow pivot candidate (low=88)
    x(3, 97, 102, 97, 99),
    x(4, 98, 103, 98, 100), // confirms idx2 pivot (confirmedAt=4)
    x(5, 108, 113, 108, 110),
    x(6, 110, 115, 110, 112),
    x(7, 105, 118, 95, 108), // NO sweep: low=95 > 88
    x(8, 112, 117, 112, 114),
    x(9, 113, 118, 113, 115),
    x(10, 115, 120, 115, 117),
    x(11, 117, 122, 117, 119),
    x(12, 118, 123, 118, 120),
    x(13, 119, 124, 119, 121),
    x(14, 120, 125, 120, 122),
  ];
}

describe('SmtBank — golden bullish divergence (swingLow, at lows)', () => {
  it('fires exactly while the sweep bar (idx7) is inside the window, and nowhere else', () => {
    const bank = buildSmtBank(tradedGoldenLows, compareLowsNoSweep());
    const { fires, level } = bank.getSeries({ type: 'swingLow' }, 'bullish');
    for (let i = 0; i < tradedGoldenLows.length; i++) {
      const expected = i >= 9 && i <= 11 ? 1 : 0;
      expect(fires[i]).toBe(expected);
    }
    expect(level[9]).toBeCloseTo(90, 9);
  });

  it('does NOT fire when the compare symbol also sweeps its own low in the same window', () => {
    const compareSweeps = compareLowsNoSweep();
    compareSweeps[7] = x(7, 105, 118, 80, 108); // now sweeps (80 < 88)
    const bank = buildSmtBank(tradedGoldenLows, compareSweeps);
    const { fires } = bank.getSeries({ type: 'swingLow' }, 'bullish');
    for (let i = 0; i < tradedGoldenLows.length; i++) {
      expect(fires[i]).toBe(0);
    }
  });
});

// ============================================================================
// 3. prevDayHigh REFERENCE ACROSS A MIDNIGHT BOUNDARY
// ============================================================================
// Day1 (indices 0-3, seconds 0..2700): high peaks at 100 (idx1) -> prevDayHigh
// for day2 = 100 (NaN throughout day1 itself — no prior day exists yet).
// Day2 (indices 4-9, seconds 86400..91500): idx6 sweeps ABOVE 100 (high=112).
describe('SmtBank — prevDayHigh reference across a midnight boundary', () => {
  const tradedDayFixture: Candle[] = [
    x(0, 90, 95, 88, 92),
    x(1, 96, 100, 94, 98), // day1 high = 100
    x(2, 97, 99, 93, 96),
    x(3, 95, 98, 92, 94),
    x(4, 90, 91, 87, 89, 86400), // day2 bar0
    x(5, 88, 90, 86, 88, 86400), // day2 bar1
    x(6, 90, 112, 85, 95, 86400), // day2 bar2 -- SWEEP (112 > 100)
    x(7, 88, 91, 86, 89, 86400), // day2 bar3
    x(8, 87, 92, 85, 88, 86400), // day2 bar4
    x(9, 86, 93, 84, 87, 86400), // day2 bar5
  ];

  function compareDayFixture(sweepsToo: boolean): Candle[] {
    return [
      x(0, 80, 84, 79, 82),
      x(1, 85, 88, 83, 86), // day1 high = 88
      x(2, 83, 86, 81, 84),
      x(3, 82, 85, 80, 83),
      x(4, 78, 80, 76, 78, 86400),
      x(5, 77, 79, 75, 77, 86400),
      x(6, 79, sweepsToo ? 95 : 80, 74, 78, 86400), // sweeps its own 88 only if requested
      x(7, 76, 78, 74, 76, 86400),
      x(8, 75, 79, 73, 75, 86400),
      x(9, 74, 80, 72, 74, 86400),
    ];
  }

  it('does NOT fire on day1 (prevDayHigh is NaN — no prior day yet), fires once day2 has a valid prevDayHigh AND the sweep is inside the window', () => {
    const bank = buildSmtBank(tradedDayFixture, compareDayFixture(false));
    const { fires, level } = bank.getSeries({ type: 'prevDayHigh' }, 'bearish');

    // refIdx = i - 5 must land on a DAY2 bar (index >= 4) for the level to be
    // non-NaN -> i >= 9. The sweep (idx6) must be inside [i-4, i] -> i <= 10.
    // Only i === 9 satisfies both within this fixture's 10 bars.
    for (let i = 0; i < tradedDayFixture.length; i++) {
      expect(fires[i]).toBe(i === 9 ? 1 : 0);
    }
    expect(level[9]).toBeCloseTo(100, 9);
  });

  it('does NOT fire when the compare symbol also sweeps its own prevDayHigh on day2', () => {
    const bank = buildSmtBank(tradedDayFixture, compareDayFixture(true));
    const { fires } = bank.getSeries({ type: 'prevDayHigh' }, 'bearish');
    for (let i = 0; i < tradedDayFixture.length; i++) {
      expect(fires[i]).toBe(0);
    }
  });
});

// ============================================================================
// 4. WINDOW SEMANTICS — a sweep 6+ bars in the past never fires, even though
// the traded symbol clearly took out the level.
// ============================================================================
describe('SmtBank — window semantics (sweep outside DEFAULT_SMT_WINDOW_BARS never fires)', () => {
  it('the sweep at idx7 stops contributing once it falls out of the trailing window (bar 12 onward)', () => {
    const bank = buildSmtBank(tradedGolden, compareNoSweep());
    const { fires } = bank.getSeries({ type: 'swingHigh' }, 'bearish');
    expect(DEFAULT_SMT_WINDOW_BARS).toBe(5);
    // Last bar the window still contains idx7: i = 7 + (windowBars - 1) = 11.
    expect(fires[11]).toBe(1);
    // From bar 12 onward the window [8,12] no longer reaches back to idx7.
    expect(fires[12]).toBe(0);
    expect(fires[13]).toBe(0);
    expect(fires[14]).toBe(0);
  });
});

// ============================================================================
// 5. TRUNCATED-PREFIX CAUSALITY — identical decisions on the surviving
// prefix when BOTH symbol series are truncated consistently.
// ============================================================================
describe('SmtBank — truncated-prefix causality (both series truncated together)', () => {
  it('reproduces byte-identical fires/level for every surviving bar', () => {
    const fullBank = buildSmtBank(tradedGolden, compareNoSweep());
    const full = fullBank.getSeries({ type: 'swingHigh' }, 'bearish');

    const cut = 12; // keep bars 0..11 -- covers the entire golden firing window (9,10,11)
    const truncatedTraded = tradedGolden.slice(0, cut);
    const truncatedCompare = compareNoSweep().slice(0, cut);
    const truncatedBank = buildSmtBank(truncatedTraded, truncatedCompare);
    const truncated = truncatedBank.getSeries({ type: 'swingHigh' }, 'bearish');

    for (let i = 0; i < cut; i++) {
      expect(truncated.fires[i]).toBe(full.fires[i]);
      if (full.fires[i] === 1) {
        expect(truncated.level[i]).toBeCloseTo(full.level[i], 9);
      }
    }
  });
});

// ============================================================================
// 6. validateStrategyStructure — each new rule violated once
// ============================================================================
function smtPhase(overrides: {
  compareSymbol?: string;
  reference?: { type: 'swingHigh' | 'swingLow' | 'prevDayHigh' | 'prevDayLow' };
  divergence?: 'bullish' | 'bearish';
} = {}): PhaseV2 {
  return {
    id: 'p1',
    when: {
      kind: 'smt',
      compareSymbol: overrides.compareSymbol ?? 'MES',
      reference: overrides.reference ?? { type: 'swingHigh' },
      divergence: overrides.divergence ?? 'bearish',
    },
  };
}

function smtDef(phase: PhaseV2, compareSymbols: string[] | undefined, instrumentSymbol = 'MNQ'): StrategyDefinitionV2 {
  return {
    schemaVersion: 2,
    id: 'smt-validation',
    name: 'SMT validation fixture',
    direction: 'short',
    instrument: { symbol: instrumentSymbol, source: 'binance' },
    timeframes: { execution: '5m' },
    phases: [phase],
    entry: { orderType: 'market', validForBars: 5 },
    stop: { basis: 'fixedPct', bufferPct: 1 },
    exits: { target: { basis: 'rMultiple', value: 1 } },
    filters: {},
    risk: baseRisk(),
    compareSymbols,
  };
}

describe('validateStrategyStructure — SMT divergence rules (Increment 4a)', () => {
  it('rejects an smt condition with no compareSymbols declared', () => {
    const errors = validateStrategyStructure(smtDef(smtPhase(), undefined));
    expect(errors.some((e) => e.includes("requires a non-empty compareSymbols"))).toBe(true);
  });

  it('rejects a compareSymbol not present in compareSymbols', () => {
    const errors = validateStrategyStructure(smtDef(smtPhase({ compareSymbol: 'ES' }), ['MES']));
    expect(errors.some((e) => e.includes('is not declared in compareSymbols'))).toBe(true);
  });

  it('rejects a compareSymbol equal to instrument.symbol', () => {
    const errors = validateStrategyStructure(smtDef(smtPhase({ compareSymbol: 'MNQ' }), ['MNQ'], 'MNQ'));
    expect(errors.some((e) => e.includes('must differ from instrument.symbol'))).toBe(true);
  });

  it("rejects divergence 'bearish' paired with a low-side reference (swingLow)", () => {
    const errors = validateStrategyStructure(
      smtDef(smtPhase({ reference: { type: 'swingLow' }, divergence: 'bearish' }), ['MES']),
    );
    expect(errors.some((e) => e.includes("divergence 'bearish' requires reference.type"))).toBe(true);
  });

  it("rejects divergence 'bullish' paired with a high-side reference (prevDayHigh)", () => {
    const errors = validateStrategyStructure(
      smtDef(smtPhase({ reference: { type: 'prevDayHigh' }, divergence: 'bullish' }), ['MES']),
    );
    expect(errors.some((e) => e.includes("divergence 'bullish' requires reference.type"))).toBe(true);
  });

  it('rejects compareSymbols beyond MAX_COMPARE_SYMBOLS (1 this increment)', () => {
    const errors = validateStrategyStructure(smtDef(smtPhase({ compareSymbol: 'MES' }), ['MES', 'ES']));
    expect(errors.some((e) => e.includes('compareSymbols has 2 entries'))).toBe(true);
  });

  it('accepts a coherent, well-formed smt condition (no errors)', () => {
    const errors = validateStrategyStructure(smtDef(smtPhase(), ['MES']));
    expect(errors).toEqual([]);
  });
});

// ============================================================================
// 7. ENGINE INTEGRATION — 2-phase def (phase1 event choch + phase2 smt) runs
// end-to-end and produces a trade on the golden fixture.
// ============================================================================
//
// Phase 1 (choch): bars 0-13 are a hand-built bearish market-structure
// sequence — an initial BULLISH mss (regime 0 -> +1) at idx7 (close=119 >
// active high pivot 110, confirmed at idx4), followed by a BEARISH mss at
// idx11 (close=82 < active low pivot... — see EventBank.ts's mss/choch rule)
// that REVERSES the running regime -> a bearish CHOCH at idx11 (direction
// 'short', matching this strategy's `direction: 'short'`).
//
// Phase 2 (smt): prevDayHigh reference (day1 = indices 0-13, day2 = indices
// 14-20). Day1's peak high (121, from idx8/idx9) becomes prevDayHigh for
// every day2 bar. idx17 sweeps ABOVE 121 (high=200) while the COMPARE
// symbol's day2 bars all stay under its own (much lower) day1 peak (100) --
// a clean divergence. The window/refIdx arithmetic (identical to test group
// 3 above) puts the earliest valid fire at i=19.
describe('StrategyEngine v2 — ENGINE INTEGRATION (phase1 choch -> phase2 smt) golden fixture', () => {
  const DAY2 = 86400;

  const tradedCandles: Candle[] = [
    // ---- Day 1 (indices 0-13): bearish choch fixture --------------------
    x(0, 100, 101, 99, 100),
    x(1, 100, 106, 99.5, 105),
    x(2, 105, 110, 104, 109), // swingHigh pivot candidate (high=110, confirmedAt=4)
    x(3, 109, 109.5, 104, 105),
    x(4, 104, 105, 101, 102),
    x(5, 102, 103, 100, 101),
    x(6, 101, 102, 95, 96), // swingLow pivot candidate (low=95)
    x(7, 96, 120, 95.5, 119), // bullish mss: close(119) > active high pivot (110)
    x(8, 119, 121, 117, 120), // day1 high peak = 121
    x(9, 120, 121, 110, 111),
    x(10, 111, 112, 108, 109),
    x(11, 109, 110, 80, 82), // bearish mss + CHOCH (reversal): close(82) < active low pivot
    x(12, 82, 83, 78, 80),
    x(13, 80, 81, 77, 79),
    // ---- Day 2 (indices 14-20): the smt sweep -----------------------------
    x(14, 90, 90, 85, 88, DAY2),
    x(15, 88, 88, 83, 86, DAY2),
    x(16, 91, 91, 86, 89, DAY2),
    x(17, 100, 200, 95, 190, DAY2), // SWEEP: high=200 > prevDayHigh(121)
    x(18, 89, 89, 84, 87, DAY2),
    x(19, 90, 90, 85, 88, DAY2),
    x(20, 91, 91, 86, 89, DAY2), // fill bar (market entry @ open=91)
    // ---- Trailing filler: gives the timeStopBars:2 exit (armed at entry
    // bar + 2 = idx22) somewhere to land within the fixture's range. -------
    x(21, 92, 92, 87, 90, DAY2),
    x(22, 90, 90, 85, 88, DAY2), // timeStopBars:2 force-closes here
    x(23, 89, 89, 84, 87, DAY2),
  ];

  const compareCandles: Candle[] = [
    // ---- Day 1: no structural requirements, just needs a day1 peak -------
    x(0, 80, 80, 78, 79),
    x(1, 82, 85, 81, 84),
    x(2, 88, 90, 87, 89),
    x(3, 92, 95, 91, 94),
    x(4, 98, 100, 96, 99), // day1 high peak = 100
    x(5, 90, 92, 88, 91),
    x(6, 86, 88, 84, 87),
    x(7, 83, 85, 81, 84),
    x(8, 80, 82, 78, 81),
    x(9, 78, 80, 76, 79),
    x(10, 76, 78, 74, 77),
    x(11, 74, 76, 72, 75),
    x(12, 72, 74, 70, 73),
    x(13, 70, 72, 68, 71),
    // ---- Day 2: stays well under its own 100 -- no sweep ------------------
    x(14, 68, 70, 66, 69, DAY2),
    x(15, 67, 71, 65, 68, DAY2),
    x(16, 69, 72, 67, 70, DAY2),
    x(17, 71, 73, 69, 72, DAY2), // NOT a sweep (73 < 100)
    x(18, 70, 74, 68, 71, DAY2),
    x(19, 71, 75, 69, 72, DAY2),
    x(20, 72, 76, 70, 73, DAY2),
    x(21, 73, 77, 71, 74, DAY2),
    x(22, 74, 78, 72, 75, DAY2),
    x(23, 75, 79, 73, 76, DAY2),
  ];

  function integrationDef(): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'smt-integration',
      name: 'choch -> smt (MNQ vs MES)',
      direction: 'short',
      instrument: { symbol: 'MNQ', source: 'binance' },
      timeframes: { execution: '15m' },
      compareSymbols: ['MES'],
      phases: [
        { id: 'p1_choch', when: { kind: 'event', event: 'choch' } },
        {
          id: 'p2_smt',
          when: {
            kind: 'smt',
            compareSymbol: 'MES',
            reference: { type: 'prevDayHigh' },
            divergence: 'bearish',
          },
          capture: [{ anchor: 'eventLevel' }],
        },
      ],
      entry: { orderType: 'market', validForBars: 5 },
      // fixedPct: the buffer IS the stop distance (dual-use, see StopRuleV2
      // doc) — deterministic, no ATR dependency, so this fixture's outcome
      // never depends on the exact volatility of the hand-built candles.
      stop: { basis: 'fixedPct', bufferPct: 1 },
      exits: {
        target: { basis: 'rMultiple', value: 1 },
        // Guarantees the position CLOSES within this fixture's bar range
        // regardless of the exact SL/TP price path -- the test only asserts
        // "produces a trade", not a specific exit reason/geometry.
        timeStopBars: 2,
      },
      filters: {},
      risk: baseRisk(),
    };
  }

  it('structurally validates', () => {
    expect(validateStrategyStructure(integrationDef())).toEqual([]);
  });

  it('produces exactly one SHORT trade', async () => {
    const result = await runStrategyV2(integrationDef(), tradedCandles, {
      compareSeriesBySymbolTf: { MES: { '15m': compareCandles } },
    });
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].type).toBe('short');
  });

  it('produces NO trade when the compare symbol also sweeps its prevDayHigh on day2 (no divergence)', async () => {
    const compareAlsoSweepsDay2 = compareCandles.map((c, i) => (i === 17 ? { ...c, high: 105 } : c));
    const result = await runStrategyV2(integrationDef(), tradedCandles, {
      compareSeriesBySymbolTf: { MES: { '15m': compareAlsoSweepsDay2 } },
    });
    expect(result.trades).toHaveLength(0);
  });

  it('throws a clear error when compareSeriesBySymbolTf is missing entirely', async () => {
    await expect(runStrategyV2(integrationDef(), tradedCandles, {})).rejects.toThrow(/compareSeriesBySymbolTf/);
  });
});
