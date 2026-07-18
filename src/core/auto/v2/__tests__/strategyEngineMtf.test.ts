// ============================================================================
// STRATEGY ENGINE V2 — MTF (multi-timeframe) phase sequencing golden fixtures
// ============================================================================
// Covers Increment 3: `PhaseV2.timeframe`, `TimeframeSet`, and
// `ConditionCompiler`'s `wrapContextCondition` — phases evaluated on a
// DIFFERENT (higher) timeframe than the strategy's execution series, wired
// together causally through `StrategyEngine.ts`.
//
// FLAGSHIP SCENARIO (the TradeZella-parity capability from the task):
// "Use the 4-hour FVG as the HTF POI. After price reaches it, wait for an
//  opposite-direction CHoCH on the 5m. Enter on the retest of the CHoCH
//  level. Stop at the counter-swing."
//
// The fixture below uses a 15m CONTEXT / 5m EXECUTION pair rather than
// literal 4h/5m to keep the candle count in this file small and the
// hand-derived expected values easy to audit (a 4h/5m pair has a 48:1 bar
// ratio — dozens of filler bars just to reach the interesting window). The
// GENERAL alignment mechanism this scenario depends on (closed-bar
// visibility, ±1 bar boundaries) is separately, exhaustively proven at the
// literal 4h/5m 48:1 ratio in `timeframeSet.test.ts`'s golden table — this
// file focuses on the PHASE-SEQUENCING + cross-TF anchor-capture pipeline,
// which is TF-ratio-agnostic by construction (`TimeframeSet.alignedIndex` is
// the only place ratio matters, and it's covered there).
//
// All fixture numbers below were derived BY HAND (fractal pivots, mss/choch
// regime tracking, FVG gap detection, retest arm/touch) and then verified to
// match the engine's actual output bit-for-bit before being written into
// these assertions — see the module-level comments for the derivation.
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Candle } from '../../../../components/ReplayChart/types';
import type { StrategyDefinitionV2 } from '../types';
import { makeDefaultStrategyV2 } from '../types';
import { runStrategyV2 } from '../StrategyEngine';
import { compileStrategy } from '../ConditionCompiler';
import { LevelBank } from '../LevelBank';
import { EventBank } from '../EventBank';
import { TimeframeSet } from '../TimeframeSet';

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
// FLAGSHIP: 15m FVG POI (context) -> 5m bullish CHoCH (execution, opposite
// direction of the move that tapped the POI) -> retest entry -> stop at
// counter-swing.
// ============================================================================

/** 5m execution candle at index `i` (open = i * 300s). */
function e(i: number, open: number, high: number, low: number, close: number): Candle {
  return { time: i * 300, open, high, low, close, volume: 1 };
}

/** 15m context candle at bucket `k` (open = k * 900s). */
function x(k: number, open: number, high: number, low: number, close: number): Candle {
  return { time: k * 900, open, high, low, close, volume: 1 };
}

describe('StrategyEngine v2 — MTF FLAGSHIP (15m FVG POI -> 5m CHoCH -> retest -> counter-swing stop)', () => {
  // ---- Context (15m) series: a 3-bar bullish FVG, tapped on bar 3 --------
  // ctx0/ctx1/ctx2 form a bullish FVG: ctx2.low(105) > ctx0.high(100) ->
  // zone [100,105], formedAtIndex=2 (usable from ctx index 3 onward).
  // ctx3 dips back into the zone (low=102<=105, high=111>=100) -> TAP at
  // ctx index 3 (the first bar >= formedAtIndex+1 that overlaps the zone).
  const ctxCandles: Candle[] = [
    x(0, 95, 100, 94, 98), // ctx0: high=100 (zone top boundary)
    x(1, 98, 115, 97, 114), // ctx1: impulse candle
    x(2, 112, 116, 105, 110), // ctx2: low=105 -> FVG forms, zone [100,105]
    x(3, 110, 111, 102, 104), // ctx3: dips into [100,105] -> TAP
  ];

  // ---- Execution (5m) series: causal alignment + the CHoCH/retest/trade --
  //
  // ALIGNMENT (verified against timeframeSet.test.ts's golden-table logic):
  //   ctx bar2 closes at 15m*3=2700  -> visible (j=2) from exec bar 9  (2700/300).
  //   ctx bar3 closes at 15m*4=3600  -> visible (j=3, the TAP) from exec bar 12.
  // So phase 1 (patternActive tap on 15m) single-fires at EXACTLY exec bar 12
  // — the state machine advances to phase 2 starting exec bar 13.
  //
  // PRICE ACTION (k=2 fractal, matches EventBank's default swingLookback):
  //   idx3 (low=90): confirmed swing LOW, confirmed at idx5.
  //   idx7: close=86 < 90 (active low) -> BEARISH mss (regime 0 -> -1), not
  //     a choch (no prior regime to reverse).
  //   idx8 (low=84): ALSO a confirmed swing low (confirmed at idx10) —
  //     becomes the active low pivot from idx10 onward; this is the pivot
  //     `counterSwing` will read at the end (nearest confirmed swing LOW as
  //     of the entry bar).
  //   idx9 (high=95): confirmed swing HIGH, confirmed at idx11.
  //   idx13: close=99 > 95 (active high) -> BULLISH mss; prior regime was
  //     -1 -> CHoCH (reversal, opposite direction of the down-move that
  //     tapped the 15m demand zone) -> phase 2 completes here, capturing
  //     `eventLevel` = this bar's close = 99 (event leaves carry no natural
  //     price — captureAnchors falls back to the triggering bar's close).
  //   idx14: close=102 > level(99), prevClose(99) was NOT > 99 -> ARMS the
  //     retest window (a genuine 'break' of the phaseAnchor level).
  //   idx15: low=97 <= 99 <= high=103 -> TOUCHES the level within the retest
  //     window -> phase 3 (last phase) completes -> entry signal armed
  //     (armIndex=15), capturing `counterSwing` = nearest confirmed swing
  //     LOW as of bar 15 = idx8's pivot = 84.
  //   idx16: market entry FILLS at this bar's open = 100 (== idx15's close,
  //     by construction, so the signal's reference entryPrice and the
  //     actual fill price coincide exactly — same convention as the v1
  //     flagship fixture in strategyEngine.test.ts).
  //     risk = |100 - 84| = 16; target (1R) = 100 + 16 = 116.
  //   idx17: high=117 >= 116 -> take-profit fills at exactly 116.
  //   idx18: trailing filler, unused by the trade.
  const execCandles: Candle[] = [
    e(0, 100.0, 100.5, 99.5, 100.0), // pre-fixture pad
    e(1, 100.0, 101.0, 99.0, 99.0),
    e(2, 99.0, 100.0, 95.0, 96.0),
    e(3, 96.0, 97.0, 90.0, 91.0), // swing LOW pivot candidate (low=90)
    e(4, 91.0, 93.0, 92.0, 92.0),
    e(5, 92.0, 94.0, 93.0, 92.0), // confirms idx3 pivot
    e(6, 92.0, 93.0, 91.0, 92.0),
    e(7, 92.0, 93.0, 85.0, 86.0), // bearish mss (regime -> -1)
    e(8, 86.0, 90.0, 84.0, 88.0), // swing LOW pivot candidate (low=84)
    e(9, 88.0, 95.0, 87.0, 93.0), // swing HIGH pivot candidate (high=95)
    e(10, 93.0, 94.0, 90.0, 91.0), // confirms idx8 pivot
    e(11, 91.0, 92.0, 89.0, 90.0), // confirms idx9 pivot
    e(12, 90.0, 91.0, 88.0, 89.0), // exec bar where phase1 (15m tap) fires
    e(13, 89.0, 100.0, 88.0, 99.0), // bullish CHoCH (phase 2 completes)
    e(14, 99.0, 103.0, 98.0, 102.0), // arms the retest break
    e(15, 102.0, 103.0, 97.0, 100.0), // retest touch (phase 3 completes)
    e(16, 100.0, 101.0, 99.5, 100.2), // entry fill bar (market @ open=100)
    e(17, 100.0, 117.0, 99.0, 115.0), // take-profit hit @116
    e(18, 116.0, 117.0, 115.0, 116.0), // trailing filler
  ];

  function flagshipMtfDef(): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'flagship-mtf',
      name: '15m FVG POI -> 5m CHoCH -> retest entry (MTF)',
      direction: 'long',
      instrument: { symbol: 'TESTUSD', source: 'binance' },
      timeframes: { execution: '5m', context: ['15m'] },
      phases: [
        {
          id: 'p1_poi',
          timeframe: '15m',
          when: {
            kind: 'patternActive',
            pattern: {
              type: 'FVG',
              minGapPct: 0.01,
              requireDisplacement: false,
              displacementBodyMult: 1,
              mitigation: 'none',
              maxAgeBars: 50,
            },
            interaction: 'tap',
          },
        },
        {
          id: 'p2_choch',
          // No `timeframe` -> defaults to execution (5m), per PhaseV2 doc.
          when: { kind: 'event', event: 'choch' },
          capture: [{ anchor: 'eventLevel' }],
        },
        {
          id: 'p3_retest',
          when: {
            kind: 'levelInteraction',
            level: { type: 'phaseAnchor', phaseId: 'p2_choch', anchor: 'eventLevel' },
            interaction: 'retest',
            withinBars: 5,
          },
          capture: [{ anchor: 'counterSwing' }],
        },
      ],
      entry: { orderType: 'market', validForBars: 5 },
      stop: { basis: 'structure' },
      exits: { target: { basis: 'rMultiple', value: 1 } },
      filters: {},
      risk: baseRisk(),
    };
  }

  it('produces exactly one long trade with the exact expected MTF geometry and P&L', async () => {
    const result = await runStrategyV2(flagshipMtfDef(), { '5m': execCandles, '15m': ctxCandles });
    expect(result.trades).toHaveLength(1);
    const t = result.trades[0];
    expect(t.type).toBe('long');
    expect(t.entryPrice).toBeCloseTo(100, 9);
    expect(t.stopLoss).toBeCloseTo(84, 9); // counterSwing = idx8's confirmed swing low
    expect(t.takeProfit).toBeCloseTo(116, 9); // entry + 1R = 100 + 16
    expect(t.entryTime).toBe(execCandles[16].time); // fills at exec bar 16
    expect(t.exitReason).toBe('take_profit');
    expect(t.exitPrice).toBeCloseTo(116, 9);
    // riskBudget = 1% of 10000 = 100; size = 100/16 = 6.25; pnl = 16*6.25 = 100 (exactly 1R).
    expect(t.realizedPnl).toBeCloseTo(100, 6);
  });

  it('legacy single-series call shape (no context needed) still works for a single-TF strategy', async () => {
    // Sanity: the SAME runStrategyV2 export still accepts a plain Candle[]
    // for a strategy that declares no context timeframe — proves the
    // Array.isArray(candlesInput) normalization branch is exercised.
    const singleTf: StrategyDefinitionV2 = {
      ...makeDefaultStrategyV2('TESTUSD', '5m'),
    };
    const result = await runStrategyV2(singleTf, execCandles.slice(0, 5));
    expect(result).toBeDefined();
    expect(Array.isArray(result.trades)).toBe(true);
  });

  // ---- Truncated-prefix causality audit (BOTH series simultaneously) -----
  describe('truncated-prefix causality (exec AND context truncated together)', () => {
    it('truncating exec right at the exit bar reproduces the IDENTICAL trade', async () => {
      const full = await runStrategyV2(flagshipMtfDef(), { '5m': execCandles, '15m': ctxCandles });
      expect(full.trades).toHaveLength(1);

      const truncated = await runStrategyV2(flagshipMtfDef(), {
        '5m': execCandles.slice(0, 18), // drop only the unused trailing filler bar
        '15m': ctxCandles, // context fully closed by exec bar 17 either way
      });
      expect(truncated.trades).toHaveLength(1);
      expect(truncated.trades[0].entryPrice).toBeCloseTo(full.trades[0].entryPrice, 9);
      expect(truncated.trades[0].exitPrice).toBeCloseTo(full.trades[0].exitPrice, 9);
      expect(truncated.trades[0].realizedPnl).toBeCloseTo(full.trades[0].realizedPnl!, 6);
    });

    it('truncating exec ONE bar before the exit -> position still open, no CLOSED trade', async () => {
      const truncated = await runStrategyV2(flagshipMtfDef(), {
        '5m': execCandles.slice(0, 17), // through idx16 (fill bar) only
        '15m': ctxCandles,
      });
      expect(truncated.trades).toHaveLength(0);
    });

    it('truncating exec BEFORE phase1 ever fires + withholding the tap context bar -> no trade', async () => {
      // Drop the 15m tap bar (ctx index 3) from the CONTEXT series entirely,
      // AND truncate the exec series to end before exec bar 12 (the bar
      // where the tap would have first become visible). Neither series
      // alone withholding is required for correctness (the exec truncation
      // is already sufficient) — this proves BOTH truncations are mutually
      // consistent: the phase-1 condition never fires, so nothing downstream
      // (choch/retest/entry) can happen either.
      const truncated = await runStrategyV2(flagshipMtfDef(), {
        '5m': execCandles.slice(0, 12), // through idx11 — exec bar 12 (tap-visible) excluded
        '15m': ctxCandles.slice(0, 3), // ctx bars 0-2 only — the tap bar (index 3) withheld
      });
      expect(truncated.trades).toHaveLength(0);
    });
  });
});

// ============================================================================
// Single-fire semantics — a context-timeframe condition fires on EXACTLY ONE
// execution bar (the bar its closed-bar index first becomes visible), never
// re-firing for the remainder of that context bar's window.
// ============================================================================

describe('ConditionCompiler — context-TF condition single-fire semantics', () => {
  it('a 15m choch event fires on exactly one 5m execution bar, not every bar until the next context close', () => {
    // Context (15m) series: reuses the exact mss/choch fixture from
    // eventBank.test.ts (`EventBank.mss / .choch` describe block) — a
    // bearish choch fires at ctx index 11 (mss[11] = -1, choch[11] = -1,
    // reversing the bullish mss regime established at ctx index 7).
    const chochCtx: Candle[] = [
      x(0, 100, 101, 99, 100),
      x(1, 100, 106, 99.5, 105),
      x(2, 105, 110, 104, 109),
      x(3, 109, 109.5, 104, 105),
      x(4, 104, 105, 101, 102),
      x(5, 102, 103, 100, 101),
      x(6, 101, 102, 95, 96),
      x(7, 96, 120, 95.5, 119), // bullish mss (regime 0 -> 1), establishes prior regime
      x(8, 119, 121, 117, 120),
      x(9, 120, 121, 110, 111),
      x(10, 111, 112, 108, 109),
      x(11, 109, 110, 80, 82), // bearish mss + CHOCH (reversal)
      x(12, 82, 83, 78, 80),
      x(13, 80, 81, 77, 79),
    ];

    // Flat 5m execution filler — irrelevant to this test (only the
    // context-TF condition's `test()` output over a range of execution bar
    // indices is being audited).
    const execFlat: Candle[] = Array.from({ length: 45 }, (_, i) =>
      e(i, 100, 100.1, 99.9, 100),
    );

    // direction:'short' matches the fixture's bearish choch (-1) directly —
    // this test audits the FIRE-ONCE mechanism, not trade direction.
    const def: StrategyDefinitionV2 = {
      ...makeDefaultStrategyV2('TESTUSD', '5m'),
      direction: 'short',
      timeframes: { execution: '5m', context: ['15m'] },
      phases: [
        { id: 'p1', timeframe: '15m', when: { kind: 'event', event: 'choch' } },
      ],
    };

    const timeframeSet = new TimeframeSet({ '5m': execFlat, '15m': chochCtx }, '5m');
    const banksByTf = new Map([
      ['15m' as const, { levels: new LevelBank(chochCtx, { timezone: 'UTC' }), events: new EventBank(chochCtx, {}) }],
    ]);

    const compiled = compileStrategy(
      def,
      execFlat,
      { levels: new LevelBank(execFlat, { timezone: 'UTC' }), events: new EventBank(execFlat, {}) },
      { timeframeSet, banksByTf },
    );

    // ctx bar 11 closes at 15m*12 = 10800s -> first visible from exec bar
    // 10800/300 = 36. ctx bar 12 doesn't close until 15m*13 = 11700s ->
    // exec bar 39 — so bars 36, 37, 38 all map to the SAME context index
    // (11); without the single-fire gate the condition would test true on
    // all three.
    expect(timeframeSet.alignedIndex('15m', 35)).toBe(10); // not yet visible
    expect(timeframeSet.alignedIndex('15m', 36)).toBe(11); // JUST became visible
    expect(timeframeSet.alignedIndex('15m', 37)).toBe(11); // same context bar — still "current"
    expect(timeframeSet.alignedIndex('15m', 38)).toBe(11); // same context bar — still "current"
    expect(timeframeSet.alignedIndex('15m', 39)).toBe(12); // next context bar closes

    const state = { anchors: new Map(), scratch: new Map() };
    const fireBars: number[] = [];
    for (let i = 0; i < 45; i++) {
      if (compiled.phases[0].when.test(i, state)) fireBars.push(i);
    }

    // Fires on EXACTLY bar 36 — the FIRST execution bar where ctx index 11
    // becomes visible — and nowhere else, even though bars 37/38 map to the
    // identical (still-true) underlying context bar.
    expect(fireBars).toEqual([36]);
  });
});
