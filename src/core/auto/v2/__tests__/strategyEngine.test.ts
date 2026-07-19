// ============================================================================
// STRATEGY ENGINE V2 — golden fixtures + v1 equivalence + causality audit
// ============================================================================
// Hand-built candle series with the expected outcome derived in comments.
// All prices/P&L are asserted with `toBeCloseTo` (floating point) except
// where an exact whole number is mathematically guaranteed.
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Candle } from '../../../../components/ReplayChart/types';
import type { StrategyDefinitionV2 } from '../types';
import { validateStrategyStructure } from '../types';
import { runStrategyV2 } from '../StrategyEngine';
import { runAutoBacktest } from '../../AutoBacktestEngine';
import type { SetupDefinition, FVGParams } from '../../types';

/** Candle factory. `time` in SECONDS (journal/UTCTimestamp convention). */
function c(i: number, open: number, high: number, low: number, close: number, baseSec = 1_700_000_000): Candle {
  return { time: baseSec + i * 900, open, high, low, close, volume: 1 };
}

const HOUR = 3600;
/** Midnight-UTC base so `+N*HOUR` never crosses a calendar day earlier than
 *  intended (an arbitrary epoch constant can straddle a day boundary). */
const DAY1_00 = Date.UTC(2024, 0, 1, 0, 0, 0) / 1000;

function baseRisk(overrides: Partial<StrategyDefinitionV2['risk']> = {}): StrategyDefinitionV2['risk'] {
  return {
    riskPerTradePct: 1,
    maxConcurrent: 1,
    initialBalance: 10000,
    commissionPct: 0,
    slippagePct: 0,
    sizingMode: 'risk-pct',
    ...overrides,
  };
}

// ============================================================================
// FLAGSHIP: short rejection off prevDayHigh, stop above the wick, 3R target
// ============================================================================

describe('StrategyEngine v2 — FLAGSHIP (reject prevDayHigh, wick stop, 3R target)', () => {
  // Day1 (bars 0-2): high peaks at 115 (bar1) -> prevDayHigh for day2 = 115.
  // Day2 bar0 (bar3): wick pierces 118 (>115) but closes back at 111 (<115)
  //   -> bearish rejection of prevDayHigh. wickExtreme (short) = bar3.high = 118.
  // Day2 bar1 (bar4): market SELL fills at this bar's OPEN = 112.
  //   stop = wickExtreme (118, no buffer) ; risk = 118-112 = 6 ; target = 112-3*6 = 94.
  // Day2 bar2 (bar5): low 90 <= target(94) -> take-profit hit at 94 exactly.
  const candles: Candle[] = [
    c(0, 100, 110, 99, 105, DAY1_00),
    c(1, 105, 115, 104, 110, DAY1_00), // day1 high = 115
    c(2, 110, 112, 108, 109, DAY1_00),
    c(3, 110, 118, 109, 112, DAY1_00 + 24 * HOUR), // reject bar (close == next bar's open, so the
    // signal's REFERENCE entry price for stop/target math exactly matches the actual fill price)
    c(4, 112, 113, 108, 109, DAY1_00 + 25 * HOUR), // fill bar (market sell @ open=112)
    c(5, 109, 110, 90, 92, DAY1_00 + 26 * HOUR), // TP hit @94
    c(6, 93, 94, 91, 92, DAY1_00 + 27 * HOUR), // trailing filler (unused by the trade)
  ];

  function flagshipDef(): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'flagship',
      name: 'Reject prevDayHigh short',
      direction: 'short',
      instrument: { symbol: 'TESTUSD', source: 'binance' },
      timeframes: { execution: '1h' },
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

  it('produces exactly one short trade with the exact expected geometry and P&L', async () => {
    const result = await runStrategyV2(flagshipDef(), candles);
    expect(result.trades).toHaveLength(1);
    const t = result.trades[0];
    expect(t.type).toBe('short');
    expect(t.entryPrice).toBeCloseTo(112, 9);
    expect(t.stopLoss).toBeCloseTo(118, 9);
    expect(t.takeProfit).toBeCloseTo(94, 9);
    expect(t.exitReason).toBe('take_profit');
    expect(t.exitPrice).toBeCloseTo(94, 9);
    // size = riskBudget(100) / risk(6); pnl = (entry-exit)*size = 18 * (100/6) = 300.
    expect(t.realizedPnl).toBeCloseTo(300, 6);
  });

  // ---- Truncated-prefix causality audit ------------------------------------
  it('is reproducible from the candles up to the exit bar, and produces NO trade from an earlier prefix', async () => {
    const full = await runStrategyV2(flagshipDef(), candles);
    expect(full.trades).toHaveLength(1);

    // Truncating right at the exit bar (dropping the irrelevant bar6 filler)
    // must reproduce the IDENTICAL trade.
    const truncatedAtExit = await runStrategyV2(flagshipDef(), candles.slice(0, 6));
    expect(truncatedAtExit.trades).toHaveLength(1);
    expect(truncatedAtExit.trades[0].entryPrice).toBeCloseTo(full.trades[0].entryPrice, 9);
    expect(truncatedAtExit.trades[0].exitPrice).toBeCloseTo(full.trades[0].exitPrice, 9);
    expect(truncatedAtExit.trades[0].realizedPnl).toBeCloseTo(full.trades[0].realizedPnl!, 6);

    // Truncating one bar before the exit (position still open) -> no CLOSED
    // trade yet (proves the close wasn't decided using bar5's future data).
    const truncatedBeforeExit = await runStrategyV2(flagshipDef(), candles.slice(0, 5));
    expect(truncatedBeforeExit.trades).toHaveLength(0);

    // Truncating before the fill bar (signal armed but not yet fillable) ->
    // no trade at all.
    const truncatedBeforeFill = await runStrategyV2(flagshipDef(), candles.slice(0, 4));
    expect(truncatedBeforeFill.trades).toHaveLength(0);
  });
});

// ============================================================================
// Partials: 2-leg (50% at 1R + moveStopToBE, rest at 2R)
// ============================================================================

describe('StrategyEngine v2 — partials (2-leg scale-out)', () => {
  // Long, fixedPct 5% stop. entry=102, risk=5.1.
  // Leg1 (1R=107.1, 50%): realizes (107.1-102)*halfSize = 50.
  // Leg2 (2R=112.2, 50% of ORIGINAL): realizes (112.2-102)*halfSize = 100.
  // Total realizedPnl = 150; position fully exhausted by partials alone.
  const candles: Candle[] = [
    c(0, 99, 100, 98, 99),
    c(1, 99, 101, 98, 102), // close > 100 -> phase fires (close == next bar's open)
    c(2, 102, 103, 101, 102), // fill bar: market buy @ open=102
    c(3, 103, 108, 103, 104), // high 108 >= 107.1 -> leg1 (50%) @107.1, stop -> BE(102)
    c(4, 105, 106, 104, 105), // filler, no trigger
    c(5, 107, 113, 108, 110), // high 113 >= 112.2 -> leg2 (remaining 50%) @112.2 -> exhausted
  ];

  function partialsDef(): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'partials',
      name: 'Partials 2-leg',
      direction: 'long',
      instrument: { symbol: 'TESTUSD', source: 'binance' },
      timeframes: { execution: '15m' },
      phases: [
        {
          id: 'p1',
          when: { kind: 'compare', left: { src: 'price', field: 'close' }, cmp: 'gt', right: { src: 'const', value: 100 } },
        },
      ],
      entry: { orderType: 'market', validForBars: 5 },
      stop: { basis: 'fixedPct', bufferPct: 5 },
      exits: {
        target: { basis: 'rMultiple', value: 10 }, // far away -> never hit; partials close it first
        partials: [
          { atR: 1, sizePct: 50, moveStopToBE: true },
          { atR: 2, sizePct: 50 },
        ],
      },
      filters: {},
      risk: baseRisk(),
    };
  }

  it('realizes leg1 + leg2 P&L and fully exits once partials exhaust the position', async () => {
    const result = await runStrategyV2(partialsDef(), candles);
    expect(result.trades).toHaveLength(1);
    const t = result.trades[0];
    expect(t.entryPrice).toBeCloseTo(102, 9);
    expect(t.exitReason).toBe('take_profit'); // partial-exhaustion closes are tagged take_profit
    // 50 (leg1) + 100 (leg2) = 150.
    expect(t.realizedPnl).toBeCloseTo(150, 4);
  });
});

// ============================================================================
// timeStopBars: forced exit at close after N bars in trade
// ============================================================================

describe('StrategyEngine v2 — timeStopBars', () => {
  const candles: Candle[] = [
    c(0, 99, 100, 98, 99),
    c(1, 99, 101, 98, 102), // fires (close>100, close == next bar's open)
    c(2, 102, 103, 101, 102), // fill @ open=102 (entryBarIndex=2)
    c(3, 102, 104, 101, 103), // 1 bar in trade -> not yet
    c(4, 103, 105, 102, 104), // 2 bars in trade -> timeStopBars(2) reached -> force close @ close=104
  ];

  function timeStopDef(): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'time-stop',
      name: 'Time stop',
      direction: 'long',
      instrument: { symbol: 'TESTUSD', source: 'binance' },
      timeframes: { execution: '15m' },
      phases: [
        {
          id: 'p1',
          when: { kind: 'compare', left: { src: 'price', field: 'close' }, cmp: 'gt', right: { src: 'const', value: 100 } },
        },
      ],
      entry: { orderType: 'market', validForBars: 5 },
      stop: { basis: 'fixedPct', bufferPct: 5 },
      exits: { target: { basis: 'rMultiple', value: 10 }, timeStopBars: 2 },
      filters: {},
      risk: baseRisk(),
    };
  }

  it('force-closes at the close of the bar the time budget is reached, tagged "manual"', async () => {
    const result = await runStrategyV2(timeStopDef(), candles);
    expect(result.trades).toHaveLength(1);
    const t = result.trades[0];
    expect(t.entryPrice).toBeCloseTo(102, 9);
    expect(t.exitReason).toBe('manual');
    expect(t.exitPrice).toBeCloseTo(104, 9);
    // risk = 102*0.05 = 5.1; size = 100/5.1; pnl = (104-102)*size.
    const size = 100 / 5.1;
    expect(t.realizedPnl).toBeCloseTo(2 * size, 6);
  });
});

// ============================================================================
// Trailing rStep: ratchets to entry+(k-1)R once kR is reached, tighten-only
// ============================================================================

describe('StrategyEngine v2 — trailing rStep', () => {
  // entry=102, risk=5.1. bar3 high=108 -> 1.17R -> k=1 -> stop -> BE(102).
  // bar5 high=116 -> 2.75R -> k=2 -> stop -> 1R (107.1). bar6 pulls back,
  // low=106 <= 107.1 -> stop hit @107.1 (a +1R winning trade via the trail).
  const candles: Candle[] = [
    c(0, 99, 100, 98, 99),
    c(1, 99, 101, 98, 102), // fires (close == next bar's open)
    c(2, 102, 103, 101, 102), // fill @102
    c(3, 103, 108, 103, 104), // k=1 -> stop -> 102 (BE); low 103 > 102, no hit
    c(4, 104, 110, 103, 105), // k=1 still -> stop stays 102; low 103 > 102
    c(5, 105, 116, 108, 110), // k=2 -> stop -> 107.1; low 108 > 107.1, no hit yet
    c(6, 109, 111, 106, 108), // k recomputed=1 (this bar's own high) -> stays 107.1 (tighten-only); low 106 <= 107.1 -> HIT
  ];

  function trailingDef(): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'trailing-rstep',
      name: 'Trailing rStep',
      direction: 'long',
      instrument: { symbol: 'TESTUSD', source: 'binance' },
      timeframes: { execution: '15m' },
      phases: [
        {
          id: 'p1',
          when: { kind: 'compare', left: { src: 'price', field: 'close' }, cmp: 'gt', right: { src: 'const', value: 100 } },
        },
      ],
      entry: { orderType: 'market', validForBars: 5 },
      stop: { basis: 'fixedPct', bufferPct: 5 },
      exits: { target: { basis: 'rMultiple', value: 10 }, trailing: { mode: 'rStep' } },
      filters: {},
      risk: baseRisk(),
    };
  }

  it('ratchets the stop up in R-steps and only ever tightens it', async () => {
    const result = await runStrategyV2(trailingDef(), candles);
    expect(result.trades).toHaveLength(1);
    const t = result.trades[0];
    expect(t.entryPrice).toBeCloseTo(102, 9);
    expect(t.exitReason).toBe('stop_loss');
    expect(t.exitPrice).toBeCloseTo(107.1, 6); // entry + 1R
    // 1R win: pnl = risk(5.1) * size(100/5.1) = 100.
    expect(t.realizedPnl).toBeCloseTo(100, 4);
  });
});

// ============================================================================
// within / invalidateIf: a timed-out attempt resets to phase 0 and requires
// a FRESH phase-1 firing (proven via a phaseAnchor that changes between the
// stale and fresh attempts).
// ============================================================================

describe('StrategyEngine v2 — within.bars reset', () => {
  // p1 fires whenever close>100, capturing triggerBarHigh. p2 fires when
  // close drops BELOW that captured high, within 2 bars.
  //
  // Attempt 1 (bar0): p1 fires, triggerBarHigh=102. p2's window is bars 1-2;
  //   neither bar's close (150,160) drops below 102, so bar3 times out (3-0=3>2)
  //   and resets to phase 0 -- discarding the stale anchor (102).
  // Bar4: close=95, p1's own condition (95>100) is false -> stays at phase 0.
  // Attempt 2 (bar5): p1 fires again, capturing a MUCH HIGHER triggerBarHigh=140.
  //   Bar6's close (130) drops below 140 -> p2 fires within budget (6-5=1<=2).
  //
  // If the reset did NOT happen, the engine would still be evaluating p2
  // against the STALE anchor (102) from bar0 onward, and bar4's close (95)
  // would ALREADY satisfy "close < 102" -- producing a signal armed at bar4
  // instead of bar6. Asserting the fill lands one bar after bar6 (not bar4)
  // is the discriminating proof that the reset actually occurred.
  const candles: Candle[] = [
    c(0, 100, 102, 99, 101), // p1 fires; triggerBarHigh = 102
    c(1, 101, 152, 100, 150), // p2: 150 < 102? no
    c(2, 150, 162, 149, 160), // p2: 160 < 102? no
    c(3, 160, 172, 159, 170), // within timeout (3-0=3>2) -> RESET here, before evaluating p2
    c(4, 170, 171, 94, 95), // p1: 95>100? no (stays at phase0); [if reset were broken: 95<102 would fire p2 here]
    c(5, 95, 141, 94, 105), // p1 fires again; triggerBarHigh = 140 (bar high, NOT close)
    c(6, 105, 131, 104, 130), // p2: 130 < 140? yes -> fires (1 bar after re-arming, within budget)
    c(7, 131, 132, 129, 130), // fill bar: market buy @ open=131
    c(8, 130, 131, 120, 122), // stop hit
  ];

  function resetDef(): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'within-reset',
      name: 'Within/invalidateIf reset',
      direction: 'long',
      instrument: { symbol: 'TESTUSD', source: 'binance' },
      timeframes: { execution: '15m' },
      phases: [
        {
          id: 'p1',
          when: { kind: 'compare', left: { src: 'price', field: 'close' }, cmp: 'gt', right: { src: 'const', value: 100 } },
          capture: [{ anchor: 'triggerBarHigh' }],
        },
        {
          id: 'p2',
          within: { bars: 2 },
          when: {
            kind: 'compare',
            left: { src: 'price', field: 'close' },
            cmp: 'lt',
            right: { src: 'level', ref: { type: 'phaseAnchor', phaseId: 'p1', anchor: 'triggerBarHigh' } },
          },
        },
      ],
      entry: { orderType: 'market', validForBars: 5 },
      stop: { basis: 'fixedPct', bufferPct: 5 },
      exits: { target: { basis: 'rMultiple', value: 10 } },
      filters: {},
      risk: baseRisk(),
    };
  }

  it('discards the stale attempt at the within.bars deadline and only fires from a fresh phase-1 anchor', async () => {
    const result = await runStrategyV2(resetDef(), candles);
    expect(result.trades).toHaveLength(1);
    const t = result.trades[0];
    // Fill bar is bar7 (bar6 + 1) -- proves the SECOND attempt (fresh
    // anchor=140) drove the signal, not a stale-anchor false-fire at bar4.
    expect(t.entryTime).toBe(candles[7].time);
    expect(t.entryPrice).toBeCloseTo(131, 9);
    expect(t.exitReason).toBe('stop_loss');
  });
});

// ============================================================================
// dailyLossStopPct: blocks new fills once day-realized loss reaches the
// threshold; resets automatically at the next calendar day.
// ============================================================================

describe('StrategyEngine v2 — dailyLossStopPct', () => {
  // dailyLossStopPct=1 on a 10,000 initialBalance -> threshold = -100.
  // Day1: one trade fills and immediately stops out for -100 (exactly the
  //   threshold) -> dailyLossStopHit for the REST of day1. A second signal
  //   arms on day1 but is blocked from filling until the day rolls over.
  // Day2: the still-pending signal fills on the first day2 bar (block lifted).
  const candles: Candle[] = [
    c(0, 99, 100, 98, 99, DAY1_00),
    c(1, 99, 101, 98, 101, DAY1_00), // p1 fires (close>100) -> signal#1 armed
    c(2, 102, 103, 101, 102, DAY1_00), // fill#1 @102 (stop=96.9, risk=5.1, size~19.608)
    c(3, 101, 102, 90, 95, DAY1_00), // SL hit @96.9 -> loss ~ -100 -> dailyLossStopHit=true
    c(4, 99, 101, 98, 101, DAY1_00), // p1 fires again -> signal#2 armed (still day1)
    c(5, 102, 103, 101, 102, DAY1_00), // would-be fill bar, but BLOCKED (dailyLossStopHit)
    c(6, 102, 103, 101, 103, DAY1_00), // day1 filler; signal#2 still pending, still blocked
    // Day2 (24h later): the block resets; signal#2 (still within validForBars) fills here.
    c(7, 103, 104, 102, 103, DAY1_00 + 24 * HOUR), // fill#2 @103
    c(8, 102, 103, 90, 95, DAY1_00 + 24 * HOUR), // SL hit again -> closes trade#2
  ];

  function dailyStopDef(): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'daily-loss-stop',
      name: 'Daily loss stop',
      direction: 'long',
      instrument: { symbol: 'TESTUSD', source: 'binance' },
      timeframes: { execution: '15m' },
      phases: [
        {
          id: 'p1',
          when: { kind: 'compare', left: { src: 'price', field: 'close' }, cmp: 'gt', right: { src: 'const', value: 100 } },
        },
      ],
      entry: { orderType: 'market', validForBars: 10 },
      stop: { basis: 'fixedPct', bufferPct: 5 },
      exits: { target: { basis: 'rMultiple', value: 10 } },
      filters: { dailyLossStopPct: 1 },
      risk: baseRisk(),
    };
  }

  it('blocks the second fill on the SAME day after the loss threshold is hit, then allows it the next day', async () => {
    const result = await runStrategyV2(dailyStopDef(), candles);
    expect(result.trades).toHaveLength(2);

    const [first, second] = result.trades;
    expect(first.entryTime).toBe(candles[2].time);
    expect(first.exitReason).toBe('stop_loss');
    expect(first.realizedPnl).toBeCloseTo(-100, 4);

    // The second trade's entry is on DAY2 (bar7), never on day1 (bar5/6) --
    // proving the block held for the rest of day1 and lifted on the new day.
    expect(second.entryTime).toBe(candles[7].time);
    expect(second.entryTime).toBeGreaterThanOrEqual(DAY1_00 + 24 * HOUR);
  });
});

// ============================================================================
// v1 <-> v2 equivalence: patternActive 'tap' vs v1 FVG zone-tap limit entry
// ============================================================================

describe('StrategyEngine v2 — v1<->v2 equivalence (FVG tap)', () => {
  // Same bullish FVG fixture as detectors.test.ts's canonical case: zone
  // [104,110] formed at bar2. Bar4 is the first bar price touches the zone
  // (low 108 <= zone.top 110).
  const candles: Candle[] = [
    c(0, 100, 104, 99, 103),
    c(1, 103, 112, 102, 111), // impulse
    c(2, 111, 115, 110, 114), // FVG forms: zone [104,110]
    c(3, 114, 116, 111, 115), // still above the zone
    c(4, 113, 114, 108, 109), // FIRST touch of zone.top(110)
    c(5, 109, 110, 100, 102), // v1: already open @110, low 100 <= stop(104) -> SL hit here
    c(6, 102, 103, 90, 95), // v2: manages here (opened mid-bar5) -> SL hit here
  ];

  const fvgParams: FVGParams = {
    type: 'FVG',
    minGapPct: 0,
    requireDisplacement: false,
    displacementBodyMult: 0,
    mitigation: 'none',
    maxAgeBars: 50,
  };

  function v1Setup(): SetupDefinition {
    const now = Date.now();
    return {
      id: 'v1-fvg-tap',
      schemaVersion: 1,
      name: 'v1 FVG zone-tap',
      direction: 'long',
      patterns: [fvgParams],
      entry: { trigger: 'zone-tap', orderType: 'limit', validForBars: 10 },
      stop: { basis: 'zone-far-edge', bufferPct: 0 },
      target: { basis: 'r-multiple', rMultiple: 2 },
      session: { enabled: false, timezone: 'UTC', windows: [] },
      bias: { enabled: false, htfTimeframe: '4h', method: 'ema' },
      risk: baseRisk(),
      instrument: { symbol: 'TESTUSD', timeframe: '15m', source: 'binance' },
      createdAt: now,
      updatedAt: now,
    };
  }

  function v2Strategy(): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'v2-fvg-tap',
      name: 'v2 FVG tap',
      direction: 'long',
      instrument: { symbol: 'TESTUSD', source: 'binance' },
      timeframes: { execution: '15m' },
      phases: [{ id: 'p1', when: { kind: 'patternActive', pattern: fvgParams, interaction: 'tap' } }],
      entry: { orderType: 'market', validForBars: 10 },
      stop: { basis: 'fixedPct', bufferPct: 5 },
      exits: { target: { basis: 'rMultiple', value: 5 } },
      filters: {},
      risk: baseRisk(),
    };
  }

  it('both engines trade the SAME zone in the SAME direction; v2 fills exactly one bar after v1', () => {
    const v1Result = runAutoBacktest(v1Setup(), candles);
    expect(v1Result.trades).toHaveLength(1);
    const v1Trade = v1Result.trades[0];
    expect(v1Trade.type).toBe('long');
    // v1: limit order sits at zone.top(110) from formation (bar2); first
    // testable at bar3 (111 low, no fill), fills at bar4 (low 108 <= 110).
    expect(v1Trade.entryTime).toBe(candles[4].time);
    expect(v1Trade.entryPrice).toBeCloseTo(110, 9);

    return runStrategyV2(v2Strategy(), candles).then((v2Result) => {
      expect(v2Result.trades).toHaveLength(1);
      const v2Trade = v2Result.trades[0];
      expect(v2Trade.type).toBe('long');

      // DOCUMENTED SEMANTIC DIFFERENCE: v1's 'zone-tap' is a STANDING LIMIT
      // ORDER placed at formation and filled the instant price reaches it
      // (bar4). v2's patternActive 'tap' is a PHASE CONDITION that itself
      // only becomes true AT bar4 (first touch) -- the phase then completes
      // and arms a fresh entry signal, fillable earliest at bar4+1 (bar5),
      // exactly mirroring v2's own universal "earliest fill is armIndex+1"
      // rule applied to the phase-completion bar. This is an EXTRA bar of
      // latency inherent to modeling "touch" as a phase-firing CONDITION
      // rather than a standing order -- not a bug, a documented consequence
      // of the schemas' different mechanics. The closest invariant we CAN
      // assert exactly: same direction, and v2's fill bar is v1's fill bar
      // + exactly one bar (900s @ 15m).
      expect(v2Trade.entryTime).toBe(v1Trade.entryTime + 900);
      // Price proximity: v1 fills at the zone edge (110); v2 fills at
      // bar5's market open (109) -- both within the same tight range the
      // pullback was moving through.
      expect(Math.abs(v2Trade.entryPrice - v1Trade.entryPrice)).toBeLessThanOrEqual(2);
    });
  });
});

// ============================================================================
// mirror: true — split-run merge (Increment 5)
// ============================================================================

describe('StrategyEngine v2 — mirror split-run merge', () => {
  // Combines the FLAGSHIP short (reject prevDayHigh) fixture with a mirror-
  // image bullish reject of prevDayLow LATER in the same series. Each pass
  // only fires on its own direction's candles (direction-gated at compile
  // time), so the SHORT (original) pass produces exactly the flagship's 1
  // trade, and the LONG (mirrored: reject prevDayLow) pass produces exactly
  // 1 trade of its own — proving the merge sees BOTH.
  //
  // Day1 (bars 0-2): high peaks 115 (bar1) -> prevDayHigh(day2)=115;
  //   low bottoms 99 (bar0) -> prevDayLow(day2)=99.
  // SHORT leg (bars 3-5, identical to the FLAGSHIP fixture): bar3 bearish
  //   rejects 115 (wickExtreme=118); bar4 fills @112 (market sell);
  //   bar5 TP hits @94. risk=6, size=100/6, pnl=18*100/6=300.
  // LONG leg (bars 6-8): bar6 bullish rejects 99 (wick pierces 90, body
  //   stays above 99, wickExtreme=90); bar7 fills @102 (market buy);
  //   bar8 TP hits @138. risk=12, size=100/12, pnl=36*100/12=300.
  const candles: Candle[] = [
    c(0, 100, 110, 99, 105, DAY1_00), // day1: low=99 -> prevDayLow(day2)
    c(1, 105, 115, 104, 110, DAY1_00), // day1: high=115 -> prevDayHigh(day2)
    c(2, 110, 112, 108, 109, DAY1_00),
    c(3, 110, 118, 109, 112, DAY1_00 + 24 * HOUR), // SHORT: bearish reject of 115
    c(4, 112, 113, 108, 109, DAY1_00 + 25 * HOUR), // SHORT: fill @112
    c(5, 109, 110, 90, 92, DAY1_00 + 26 * HOUR), // SHORT: TP hit @94
    c(6, 101, 103, 90, 102, DAY1_00 + 27 * HOUR), // LONG: bullish reject of 99
    c(7, 102, 104, 101, 103, DAY1_00 + 28 * HOUR), // LONG: fill @102
    c(8, 102, 140, 101, 135, DAY1_00 + 29 * HOUR), // LONG: TP hit @138
  ];

  function splitRunDef(): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'split-run',
      name: 'Reject prevDayHigh short, mirrored for longs',
      direction: 'short',
      mirror: true,
      instrument: { symbol: 'TESTUSD', source: 'binance' },
      timeframes: { execution: '1h' },
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

  it('merges both directions into 2 chronological trades with recomputed statistics', async () => {
    const result = await runStrategyV2(splitRunDef(), candles);
    expect(result.trades).toHaveLength(2);

    const [first, second] = result.trades;
    // Chronological: SHORT (entry bar4, 25h) fires before LONG (entry bar7, 28h).
    expect(first.type).toBe('short');
    expect(first.entryTime).toBe(candles[4].time);
    expect(first.entryPrice).toBeCloseTo(112, 9);
    expect(first.stopLoss).toBeCloseTo(118, 9);
    expect(first.takeProfit).toBeCloseTo(94, 9);
    expect(first.exitReason).toBe('take_profit');
    expect(first.realizedPnl).toBeCloseTo(300, 6);

    expect(second.type).toBe('long');
    expect(second.entryTime).toBe(candles[7].time);
    expect(second.entryPrice).toBeCloseTo(102, 9);
    expect(second.stopLoss).toBeCloseTo(90, 9);
    expect(second.takeProfit).toBeCloseTo(138, 9);
    expect(second.exitReason).toBe('take_profit');
    expect(second.realizedPnl).toBeCloseTo(300, 6);

    // Statistics recomputed over the MERGED set with the run's real risk params.
    expect(result.statistics.totalTrades).toBe(2);
    expect(result.statistics.winningTrades).toBe(2);
    expect(result.statistics.totalPnl).toBeCloseTo(600, 6);
    expect(result.statistics.netProfit).toBeCloseTo(600, 6);

    // Equity curve: seed + one point per merged trade, in chronological order.
    expect(result.equityCurve).toHaveLength(3);
    expect(result.equityCurve[0].time).toBe(candles[4].time);
    expect(result.equityCurve[0].balance).toBeCloseTo(10000, 6);
    expect(result.equityCurve[1].balance).toBeCloseTo(10300, 6);
    expect(result.equityCurve[2].balance).toBeCloseTo(10600, 6);

    // skippedSignals summed across both passes (none skipped here).
    expect(result.skippedSignals).toEqual({ zeroSize: 0, expired: 0 });
  });

  it('a non-mirrored run of the SAME base definition (mirror:false) produces only the short leg', async () => {
    const def = splitRunDef();
    def.mirror = false;
    const result = await runStrategyV2(def, candles);
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].type).toBe('short');
  });
});

// ============================================================================
// exits.flatAt — clock-time flat exit (Increment 5)
// ============================================================================

describe('StrategyEngine v2 — exits.flatAt clock-time flat exit', () => {
  function flatAtDef(overrides: Partial<StrategyDefinitionV2> = {}): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'flat-at',
      name: 'Flat by 16:00 UTC',
      direction: 'long',
      instrument: { symbol: 'TESTUSD', source: 'binance' },
      timeframes: { execution: '1h' },
      phases: [
        {
          id: 'p1',
          when: { kind: 'compare', left: { src: 'price', field: 'close' }, cmp: 'gt', right: { src: 'const', value: 100 } },
        },
      ],
      entry: { orderType: 'market', validForBars: 5 },
      stop: { basis: 'fixedPct', bufferPct: 50 }, // deliberately far -> never hit in these fixtures
      exits: { target: { basis: 'rMultiple', value: 100 }, flatAt: '16:00' }, // far target -> never hit
      filters: { session: { enabled: false, timezone: 'UTC', windows: [] } }, // pins flatAt's timezone to UTC
      risk: baseRisk(),
      ...overrides,
    };
  }

  it('force-closes an open position at the first bar whose local time >= flatAt, tagged flat_time', async () => {
    const candles: Candle[] = [
      c(0, 99, 100, 98, 99, DAY1_00 + 13 * HOUR), // 13:00 UTC baseline
      c(1, 99, 101, 98, 102, DAY1_00 + 14 * HOUR), // 14:00 UTC -> phase fires (close>100)
      c(2, 102, 103, 101, 102, DAY1_00 + 15 * HOUR), // 15:00 UTC -> fill @ open=102 (before flatAt)
      c(3, 103, 104, 101, 103.5, DAY1_00 + 16 * HOUR), // 16:00 UTC -> flatAt reached -> force close @ close=103.5
      c(4, 103, 105, 102, 104, DAY1_00 + 17 * HOUR), // filler, unused
    ];
    const result = await runStrategyV2(flatAtDef(), candles);
    expect(result.trades).toHaveLength(1);
    const t = result.trades[0];
    expect(t.entryPrice).toBeCloseTo(102, 9);
    expect(t.exitReason).toBe('flat_time');
    expect(t.exitPrice).toBeCloseTo(103.5, 9);
    expect(t.exitTime).toBe(candles[3].time);
  });

  it('cancels a pending unfilled signal at/after flatAt instead of filling it', async () => {
    const candles: Candle[] = [
      c(0, 99, 100, 98, 99, DAY1_00 + 15 * HOUR), // 15:00 UTC baseline
      c(1, 99, 101, 98, 102, DAY1_00 + 16 * HOUR), // 16:00 UTC -> phase fires (close>100), armIndex=1
      c(2, 99, 100, 97, 99, DAY1_00 + 17 * HOUR), // 17:00 UTC -> earliest fillable bar, but flatAt(16:00) already passed -> cancelled
      c(3, 98, 99, 97, 99, DAY1_00 + 18 * HOUR), // filler
    ];
    const result = await runStrategyV2(flatAtDef(), candles);
    expect(result.trades).toHaveLength(0);
    expect(result.skippedSignals).toEqual({ zeroSize: 0, expired: 1 });
  });
});

// ============================================================================
// exits.exitWhen — condition-based exit (Increment 5)
// ============================================================================

describe('StrategyEngine v2 — exits.exitWhen condition-based exit', () => {
  // EMA(2) crossesBelow EMA(3) closes an open long, with NO fixed target at
  // all (pure cross-to-cross) -- proves both the wiring (exitWhen fires and
  // force-closes) and that `exits.target` being entirely absent is tolerated.
  // closes = [99, 102, 102, 110, 108, 100].
  // EMA2 (seed=avg(c0,c1)=100.5, k=2/3): [.,100.5,101.5,107.166667,107.722222,102.574074]
  // EMA3 (seed=avg(c0..c2)=101, k=1/2):  [.,.,101,105.5,106.75,103.375]
  // idx2..4: ema2 > ema3 (101.5>101, 107.167>105.5, 107.722>106.75).
  // idx5: ema2(102.574) < ema3(103.375), prev(idx4) ema2>=ema3 -> crossesBelow fires at idx5.
  const candles: Candle[] = [
    c(0, 99, 100, 98, 99),
    c(1, 99, 101, 98, 102), // fires (close>100, close == next bar's open)
    c(2, 102, 103, 101, 102), // fill @ open=102 (entryBarIndex=2)
    c(3, 102, 112, 101, 110),
    c(4, 110, 111, 105, 108),
    c(5, 108, 109, 99, 100), // exitWhen fires HERE -> force close @ close=100 (low=99 stays above the 96.9 stop)
  ];

  function exitWhenDef(): StrategyDefinitionV2 {
    return {
      schemaVersion: 2,
      id: 'exit-when',
      name: 'EMA cross-back exit, no fixed target',
      direction: 'long',
      instrument: { symbol: 'TESTUSD', source: 'binance' },
      timeframes: { execution: '15m' },
      phases: [
        {
          id: 'p1',
          when: { kind: 'compare', left: { src: 'price', field: 'close' }, cmp: 'gt', right: { src: 'const', value: 100 } },
        },
      ],
      entry: { orderType: 'market', validForBars: 5 },
      stop: { basis: 'fixedPct', bufferPct: 5 }, // 102*0.95=96.9 -- never touched in this fixture
      exits: {
        // NO `target` at all -- validateStrategyStructure tolerates this
        // because `exitWhen` is present.
        exitWhen: {
          kind: 'compare',
          left: { src: 'indicator', ref: { type: 'ema', length: 2 } },
          cmp: 'crossesBelow',
          right: { src: 'indicator', ref: { type: 'ema', length: 3 } },
        },
      },
      filters: {},
      risk: baseRisk(),
    };
  }

  it('closes the open long the bar the EMA cross-back fires, tagged "condition", with no target configured', async () => {
    const result = await runStrategyV2(exitWhenDef(), candles);
    expect(result.trades).toHaveLength(1);
    const t = result.trades[0];
    expect(t.entryPrice).toBeCloseTo(102, 9);
    expect(t.exitReason).toBe('condition');
    expect(t.exitPrice).toBeCloseTo(100, 9);
    expect(t.exitTime).toBe(candles[5].time);
    expect(t.takeProfit).toBe(0); // OrderExecutionEngine's "disabled" sentinel
  });

  it('validateStrategyStructure rejects exits with NONE of target/exitWhen/timeStopBars/trailing', () => {
    const def = exitWhenDef();
    delete def.exits.exitWhen;
    const errors = validateStrategyStructure(def);
    expect(errors.some((e) => e.includes('at least one of target, exitWhen, timeStopBars, or trailing'))).toBe(
      true,
    );
  });
});
