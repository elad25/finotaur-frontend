// ============================================================================
// FUTURES CONTRACT MATH — sizing, tick slippage, P&L, commission
// ============================================================================
//
// Covers two layers:
//   1. Unit tests on the pure helpers in futuresExecution.ts (sizing math,
//      tick slippage, point-value P&L, round-trip commission) -- these are
//      deterministic and don't need to drive the detector pipeline.
//   2. One end-to-end integration test (MNQ) that proves the wiring inside
//      runAutoBacktest actually uses these helpers when the symbol resolves
//      to a futures ContractSpec, following the same fixture style as
//      engine.integration.test.ts.
//   3. A crypto regression test proving BTCUSDT-style runs are byte-for-byte
//      on the OLD fractional-unit formula (size = riskAmount / priceDiff,
//      no whole-contract flooring).
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Candle } from '../../../components/ReplayChart/types';
import type { FVGParams } from '../types';
import { makeDefaultSetup } from '../types';
import { runAutoBacktest } from '../AutoBacktestEngine';
import { getContractSpec } from '../contractSpecs';
import {
  resolveFuturesContracts,
  applyFuturesTickSlippage,
  futuresPnl,
  futuresCommissionRoundTrip,
} from '../futuresExecution';

// ----------------------------------------------------------------------------
// Layer 1 — pure helper unit tests
// ----------------------------------------------------------------------------

describe('contractSpecs — getContractSpec', () => {
  it('resolves MNQ and ES specs with the correct point value and tick size', () => {
    const mnq = getContractSpec('MNQ');
    expect(mnq).not.toBeNull();
    expect(mnq!.pointValue).toBe(2);
    expect(mnq!.tickSize).toBe(0.25);

    const es = getContractSpec('ES');
    expect(es).not.toBeNull();
    expect(es!.pointValue).toBe(50);
    expect(es!.tickSize).toBe(0.25);
  });

  it('returns null for a non-futures symbol', () => {
    expect(getContractSpec('BTCUSDT')).toBeNull();
  });
});

describe('futuresExecution — MNQ P&L (long, TP)', () => {
  it('2 contracts, entry 21400 -> exit 21450: gross +$200, net = 200 - 4x commission', () => {
    const gross = futuresPnl(21400, 21450, 2 /* MNQ pointValue */, 2 /* contracts */, true);
    expect(gross).toBeCloseTo(200, 6);

    const commissionPerContract = getContractSpec('MNQ')!.defaultCommissionPerSide; // 0.74
    const commission = futuresCommissionRoundTrip(commissionPerContract, 2); // 2 sides x 2 contracts
    expect(commission).toBeCloseTo(0.74 * 4, 6);

    const net = gross - commission;
    expect(net).toBeCloseTo(200 - 0.74 * 4, 6);
  });
});

describe('futuresExecution — ES P&L (short, SL)', () => {
  it('1 contract, entry 5000 -> exit 5010 (short against you): -$500 gross', () => {
    const gross = futuresPnl(5000, 5010, 50 /* ES pointValue */, 1, false);
    expect(gross).toBeCloseTo(-500, 6);
  });
});

describe('futuresExecution — resolveFuturesContracts (risk-pct)', () => {
  it('balance 50000, risk 1% ($500), stop 25 points -> floor(500/(25*2)) = 10 contracts', () => {
    const result = resolveFuturesContracts({
      sizingMode: 'risk-pct',
      riskPerTradePct: 1,
      balance: 50000,
      contractsConfig: undefined,
      stopDistancePoints: 25,
      pointValue: 2, // MNQ
    });
    expect(result).not.toBeNull();
    expect(result!.contracts).toBe(10);
    expect(result!.riskAmount).toBeCloseTo(25 * 2 * 10, 6); // 500
  });

  it('undersized: stop 300 points, risk $500 -> floor(500/600) = 0 -> null (no trade)', () => {
    const result = resolveFuturesContracts({
      sizingMode: 'risk-pct',
      riskPerTradePct: 1,
      balance: 50000,
      contractsConfig: undefined,
      stopDistancePoints: 300,
      pointValue: 2, // MNQ
    });
    expect(result).toBeNull();
  });
});

describe('futuresExecution — resolveFuturesContracts (fixed-contracts)', () => {
  it('always returns the configured contract count, regardless of risk budget', () => {
    const result = resolveFuturesContracts({
      sizingMode: 'fixed-contracts',
      riskPerTradePct: 1,
      balance: 50000,
      contractsConfig: 5,
      stopDistancePoints: 300, // would floor to 0 under risk-pct
      pointValue: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.contracts).toBe(5);
    expect(result!.riskAmount).toBeCloseTo(300 * 2 * 5, 6);
  });

  it('defaults to 1 contract when contractsConfig is unset', () => {
    const result = resolveFuturesContracts({
      sizingMode: 'fixed-contracts',
      riskPerTradePct: 1,
      balance: 50000,
      contractsConfig: undefined,
      stopDistancePoints: 25,
      pointValue: 2,
    });
    expect(result!.contracts).toBe(1);
  });
});

describe('futuresExecution — applyFuturesTickSlippage', () => {
  it('MNQ 1 tick slippage, long entry (buy): fill = signal price + 0.25', () => {
    const fill = applyFuturesTickSlippage(21400, 0.25 /* MNQ tick */, 1, 'buy');
    expect(fill).toBeCloseTo(21400.25, 6);
  });

  it('sell fills lower by the same tick offset', () => {
    const fill = applyFuturesTickSlippage(21400, 0.25, 1, 'sell');
    expect(fill).toBeCloseTo(21399.75, 6);
  });

  it('zero slippageTicks is a no-op', () => {
    expect(applyFuturesTickSlippage(21400, 0.25, 0, 'buy')).toBe(21400);
  });
});

// ----------------------------------------------------------------------------
// Layer 2 — end-to-end engine wiring (MNQ)
// ----------------------------------------------------------------------------

function c(i: number, open: number, high: number, low: number, close: number): Candle {
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

describe('runAutoBacktest — MNQ futures trade uses whole-contract, point-value math', () => {
  it('sizes in whole contracts and carries a dollar-scaled realizedPnl (point value applied)', () => {
    // Identical fixture shape/values to engine.integration.test.ts's winning
    // FVG case (small, tight gap so the risk-pct floor comfortably clears
    // 1 contract at MNQ's pointValue -- the engine is price-scale-agnostic,
    // what matters here is the pointValue multiplier applied on top).
    // Bullish FVG forms at i2, zone [104,110]; fills at zone-50 (107) on i4;
    // stop = zone-far-edge (bottom) = 104 -> risk = 3 points; rips to TP on i5.
    const candles: Candle[] = [
      c(0, 100, 104, 99, 103),
      c(1, 103, 112, 102, 111),
      c(2, 111, 115, 110, 114), // FVG forms, zone [104, 110]
      c(3, 114, 116, 112, 113), // stays above zone -> no fill
      c(4, 113, 114, 106, 108), // low 106 <= zone-50 (107) -> fills
      c(5, 108, 130, 107, 129), // rips to TP
    ];

    const setup = makeDefaultSetup('MNQ', '5m');
    setup.direction = 'both';
    setup.patterns = [looseFvgParams()];
    setup.entry = { trigger: 'zone-50', orderType: 'limit', validForBars: 20 };
    setup.stop = { basis: 'zone-far-edge', bufferPct: 0 };
    setup.target = { basis: 'r-multiple', rMultiple: 2 };
    setup.risk.initialBalance = 50000;
    setup.risk.riskPerTradePct = 1;
    setup.risk.sizingMode = 'risk-pct';
    setup.risk.slippageTicks = undefined; // isolate the P&L math from slippage in this test

    const result = runAutoBacktest(setup, candles);

    expect(result.trades).toHaveLength(1);
    const trade = result.trades[0];
    expect(trade.type).toBe('long');
    expect(trade.exitReason).toBe('take_profit');

    // Contract count must be a whole number (floored), never fractional.
    expect(Number.isInteger(trade.size)).toBe(true);
    expect(trade.size).toBeGreaterThan(0);

    // realizedPnl must be point-value-scaled: with MNQ pointValue=2, a trade
    // exiting well above entry with N contracts nets a $ magnitude that is
    // (exit - entry) * 2 * N, not (exit - entry) * N (the old fractional
    // formula would produce a ~50x-too-small number here since pointValue
    // was never applied).
    const priceDiff = trade.exitPrice! - trade.entryPrice;
    const expectedGross = priceDiff * 2 * trade.size; // MNQ pointValue = 2
    // Net = gross - round-trip commission (default MNQ commission 0.74/side).
    const expectedCommission = 0.74 * trade.size * 2;
    expect(trade.realizedPnl!).toBeCloseTo(expectedGross - expectedCommission, 6);
  });
});

// ----------------------------------------------------------------------------
// Layer 3 — crypto regression: fractional sizing unchanged
// ----------------------------------------------------------------------------

describe('runAutoBacktest — BTCUSDT (crypto) keeps the old fractional-unit sizing', () => {
  it('sizes fractionally (size = riskAmount / priceDiff), not floored to whole units', () => {
    const candles: Candle[] = [
      c(0, 100, 104, 99, 103),
      c(1, 103, 112, 102, 111),
      c(2, 111, 115, 110, 114), // FVG forms, zone [104, 110]
      c(3, 114, 116, 112, 113),
      c(4, 113, 114, 106, 108), // fills at zone-50 (107)
      c(5, 108, 130, 107, 129), // TP
    ];

    const setup = makeDefaultSetup('BTCUSDT', '15m');
    setup.direction = 'both';
    setup.patterns = [looseFvgParams()];
    setup.entry = { trigger: 'zone-50', orderType: 'limit', validForBars: 20 };
    setup.stop = { basis: 'zone-far-edge', bufferPct: 0 };
    setup.target = { basis: 'r-multiple', rMultiple: 2 };
    setup.risk.initialBalance = 10000;
    setup.risk.riskPerTradePct = 1;

    const result = runAutoBacktest(setup, candles);

    expect(result.trades).toHaveLength(1);
    const trade = result.trades[0];

    // Expected size via the OLD formula: riskAmount / |entry - stop|.
    // entry = zone-50 = 107, stop = zone-far-edge (bottom) = 104 -> risk = 3.
    const riskAmount = 10000 * 0.01; // 100
    const expectedSize = riskAmount / Math.abs(trade.entryPrice - trade.stopLoss);
    expect(trade.size).toBeCloseTo(expectedSize, 6);
    expect(Number.isFinite(trade.size)).toBe(true);
  });
});
