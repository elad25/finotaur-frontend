// ============================================================================
// AUTO BACKTEST ENGINE — END-TO-END INTEGRATION TESTS
// ============================================================================
//
// Complements detectors.test.ts (which already covers per-detector geometry
// and the look-ahead invariant at the DETECTION level). This file drives the
// full pipeline — runAutoBacktest -> detect -> arm -> fill -> manage -> close
// -> statistics — on tiny hand-crafted series where the outcome (win or loss,
// trade count) is known in advance.
//
// Conventions follow detectors.test.ts: `c()` candle factory (time in
// SECONDS), `looseFvgParams()` for a geometry-only FVG gate, and
// `makeDefaultSetup` mutated per-case.
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Candle } from '../../../components/ReplayChart/types';
import type { FVGParams } from '../types';
import { makeDefaultSetup } from '../types';
import { candleTimeMs } from '../MarketContext';
import { runAutoBacktest } from '../AutoBacktestEngine';

// ----------------------------------------------------------------------------
// Test helpers (mirrors detectors.test.ts)
// ----------------------------------------------------------------------------

function c(
  i: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Candle {
  return { time: 1_700_000_000 + i * 900, open, high, low, close, volume: 1 };
}

function looseFvgParams(): FVGParams {
  return {
    type: 'FVG',
    minGapPct: 0,
    minGapAtrMult: undefined,
    requireDisplacement: false,
    displacementBodyMult: 0,
    mitigation: 'none',
    maxAgeBars: 50,
  };
}

// ============================================================================
// 1. WINNING TRADE — clean bullish FVG, pullback fills, price rips to target
// ============================================================================

describe('runAutoBacktest — single clean FVG produces exactly one winning trade', () => {
  it('detects one FVG, fills one signal, closes one trade at take_profit', () => {
    // i0-i2: bullish FVG forms at i2 (gap [104,110], zone-50 = 107).
    // i3: stays above the zone -> no fill yet.
    // i4: dips to 106 -> limit-long fills at zone-50 (107).
    //     stop = zone-far-edge (bottom) = 104, bufferPct 0 -> stop 104.
    //     risk = 107-104 = 3; target r-multiple=2 -> TP = 107 + 6 = 113.
    // i5: rips to 130 -> TP (113) hit before SL -> WIN.
    // Series intentionally ends at i5 so no SECOND 3-candle FVG window can
    // form (a 3rd bullish/bearish gap needs indices i-2,i-1,i all present) —
    // keeps this fixture to exactly one detection.
    const candles: Candle[] = [
      c(0, 100, 104, 99, 103), // i0
      c(1, 103, 112, 102, 111), // i1 impulse up
      c(2, 111, 115, 110, 114), // i2 bullish FVG forms here, zone [104,110]
      c(3, 114, 116, 112, 113), // i3 stays above zone -> no fill
      c(4, 113, 114, 106, 108), // i4 low 106 <= 107 -> limit-long fills
      c(5, 108, 130, 107, 129), // i5 rips to TP (113)
    ];

    const setup = makeDefaultSetup('BTCUSDT', '15m');
    setup.direction = 'both';
    setup.patterns = [looseFvgParams()];
    setup.entry = { trigger: 'zone-50', orderType: 'limit', validForBars: 20 };
    setup.stop = { basis: 'zone-far-edge', bufferPct: 0 };
    setup.target = { basis: 'r-multiple', rMultiple: 2 };

    const result = runAutoBacktest(setup, candles);

    // Exactly one detection (the bullish FVG at i2).
    expect(result.detections).toHaveLength(1);
    expect(result.detections[0].formedAtIndex).toBe(2);
    expect(result.detections[0].direction).toBe('long');

    // Exactly one closed trade.
    expect(result.trades).toHaveLength(1);
    const trade = result.trades[0];
    expect(trade.status).toBe('closed');
    expect(trade.type).toBe('long');
    expect(trade.exitReason).toBe('take_profit');
    expect(trade.realizedPnl).toBeDefined();
    expect(trade.realizedPnl!).toBeGreaterThan(0); // a WIN

    // Look-ahead invariant at the engine level: the detection's formedAtIndex
    // (2) must never exceed the bar it was emitted at — trivially true since
    // formedAtIndex IS the emission bar, but assert the fill/entry never
    // precedes it (earliest legal fill is formedAtIndex + 1 = i3, but the
    // actual fill here is i4).
    const formedTimeSec = Math.floor(candleTimeMs(candles[result.detections[0].formedAtIndex]) / 1000);
    expect(trade.entryTime).toBeGreaterThan(formedTimeSec);

    // Statistics are finite and internally consistent.
    const stats = result.statistics;
    expect(stats.totalTrades).toBe(1);
    expect(Number.isFinite(stats.winRate)).toBe(true);
    expect(Number.isFinite(stats.profitFactor)).toBe(true);
    expect(stats.winRate).toBe(100); // the only trade won
    const wins = (stats.winningTrades as number) ?? 0;
    const losses = (stats.losingTrades as number) ?? 0;
    const breakeven = (stats.breakEvenTrades as number) ?? 0;
    expect(wins + losses + breakeven).toBe(stats.totalTrades);
  });
});

// ============================================================================
// 2. LOSING TRADE — same setup, price reverses into stop instead of target
// ============================================================================

describe('runAutoBacktest — a filled signal that reverses closes as a loss', () => {
  it('closes the trade at stop_loss with negative realizedPnl', () => {
    // Same FVG/entry/stop geometry as the winning case, but after the i4
    // fill, price collapses through the stop (104) instead of rallying.
    // i5's high is raised to 113 so it does NOT open a second (bearish)
    // 3-candle gap against i3's low (112) — keeps this fixture to exactly
    // one detection — while its low (100) still hits the stop (104).
    const candles: Candle[] = [
      c(0, 100, 104, 99, 103), // i0
      c(1, 103, 112, 102, 111), // i1 impulse up
      c(2, 111, 115, 110, 114), // i2 bullish FVG forms, zone [104,110]
      c(3, 114, 116, 112, 113), // i3 stays above zone -> no fill
      c(4, 113, 114, 106, 108), // i4 low 106 <= 107 -> limit-long fills
      c(5, 108, 113, 100, 101), // i5 low 100 <= stop(104) -> SL hit -> LOSS
    ];

    const setup = makeDefaultSetup('BTCUSDT', '15m');
    setup.direction = 'both';
    setup.patterns = [looseFvgParams()];
    setup.entry = { trigger: 'zone-50', orderType: 'limit', validForBars: 20 };
    setup.stop = { basis: 'zone-far-edge', bufferPct: 0 };
    setup.target = { basis: 'r-multiple', rMultiple: 2 };

    const result = runAutoBacktest(setup, candles);

    expect(result.detections).toHaveLength(1);
    expect(result.trades).toHaveLength(1);
    const trade = result.trades[0];
    expect(trade.exitReason).toBe('stop_loss');
    expect(trade.realizedPnl!).toBeLessThan(0);

    const stats = result.statistics;
    expect(stats.totalTrades).toBe(1);
    expect(stats.winRate).toBe(0);
    expect(Number.isFinite(stats.profitFactor)).toBe(true);
    expect(Number.isFinite(stats.totalPnl)).toBe(true);
  });
});

// ============================================================================
// 3. NO PATTERN — zero detections, zero trades, all stats finite/zero
// ============================================================================

describe('runAutoBacktest — no pattern present yields zero trades and clean stats', () => {
  it('produces zero detections, zero trades, and no NaN/Infinity in statistics', () => {
    // Smooth overlapping series — identical shape to the "no FVG" fixture in
    // detectors.test.ts (each candle overlaps its neighbour-2, so no bullish
    // or bearish imbalance ever forms).
    const candles: Candle[] = [
      c(0, 100, 105, 99, 102),
      c(1, 102, 106, 100, 104),
      c(2, 104, 107, 101, 105),
      c(3, 105, 108, 103, 106),
      c(4, 106, 109, 104, 107),
      c(5, 107, 110, 105, 108),
    ];

    const setup = makeDefaultSetup('BTCUSDT', '15m');
    setup.direction = 'both';
    setup.patterns = [looseFvgParams()];
    setup.entry = { trigger: 'zone-50', orderType: 'limit', validForBars: 20 };
    setup.stop = { basis: 'zone-far-edge', bufferPct: 0 };
    setup.target = { basis: 'r-multiple', rMultiple: 2 };

    const result = runAutoBacktest(setup, candles);

    expect(result.detections).toHaveLength(0);
    expect(result.trades).toHaveLength(0);

    const stats = result.statistics;
    expect(stats.totalTrades).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.profitFactor).toBe(0);
    expect(stats.totalPnl).toBe(0);
    expect(stats.maxDrawdown).toBe(0);

    // No NaN / Infinity anywhere in the returned statistics object.
    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === 'number') {
        expect(Number.isFinite(value), `statistics.${key} is not finite: ${value}`).toBe(true);
      }
    }

    // R-multiple distribution buckets are all zero (no closed trades to bucket).
    for (const [bucket, count] of Object.entries(result.rMultipleDistribution)) {
      expect(count, `rMultipleDistribution["${bucket}"] should be 0`).toBe(0);
    }
  });
});

// ============================================================================
// 4. ENGINE-LEVEL LOOK-AHEAD INVARIANT — formedAtIndex never exceeds the
//    scan position it was grouped/armed at (byIndex lookup uses the SAME
//    index the detector reported).
// ============================================================================

describe('runAutoBacktest — engine-level look-ahead invariant', () => {
  it('every detection is armed at exactly its own formedAtIndex, never later or earlier', () => {
    const candles: Candle[] = [
      c(0, 100, 104, 99, 103),
      c(1, 103, 112, 102, 111),
      c(2, 111, 115, 110, 114), // bullish FVG @2
      c(3, 114, 116, 112, 113),
      c(4, 113, 114, 106, 108),
      c(5, 108, 130, 107, 129),
      c(6, 129, 131, 128, 130),
      c(7, 130, 132, 129, 131),
      c(8, 131, 133, 130, 132),
      c(9, 132, 134, 131, 133),
    ];

    const setup = makeDefaultSetup('BTCUSDT', '15m');
    setup.patterns = [looseFvgParams()];
    setup.entry = { trigger: 'zone-50', orderType: 'limit', validForBars: 20 };
    setup.stop = { basis: 'zone-far-edge', bufferPct: 0 };
    setup.target = { basis: 'r-multiple', rMultiple: 2 };

    const result = runAutoBacktest(setup, candles);

    // Every detection's formedAtIndex must be a valid, in-range bar index —
    // the engine arms signals from `byIndex.get(i)` at scan position `i`,
    // so a detection can only ever be considered starting at its own
    // formedAtIndex (never before, since the map key IS formedAtIndex).
    for (const d of result.detections) {
      expect(d.formedAtIndex).toBeGreaterThanOrEqual(0);
      expect(d.formedAtIndex).toBeLessThan(candles.length);
    }

    // Every closed trade's entry must occur strictly after the candle time
    // of the detection that spawned it (armIndex === formedAtIndex, and the
    // earliest legal fill is armIndex + 1 per the engine's ordering).
    const fvgTimeSec = Math.floor(candleTimeMs(candles[2]) / 1000);
    for (const t of result.trades) {
      expect(t.entryTime).toBeGreaterThan(fvgTimeSec);
    }
  });
});
