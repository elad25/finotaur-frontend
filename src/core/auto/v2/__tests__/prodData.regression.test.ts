// ============================================================================
// PRODUCTION-DATA REGRESSION — "0 trades on real data" (fixed 2026-07-18)
// ============================================================================
// Locks in the fix for a real production bug: a StrategyDefinitionV2 whose
// `entry.priceAnchor` / `stop.basis: 'wick'` referenced anchors that the
// phase never declared in `capture` compiled and ran WITHOUT error, but
// silently produced ZERO trades on every candle series — including real
// production MNQ 5m data where 51 bars satisfy the strategy's own
// `levelInteraction: 'reject'` condition (cross-checked against a raw-SQL
// equivalent of the same rule run directly against the production DB: 54/55
// bars over the same window). Root cause + fix: `ConditionCompiler.
// compileStrategy`'s `requiredAnchorsByPhase` now unions the anchors
// `entry`/`stop`/`exits` structurally require into each phase's effective
// `capture` list, so an omitted `capture` declaration can no longer produce
// an unresolvable (NaN) entry/stop and a silently-dropped signal.
//
// This test uses the EXACT same production data + UI construction path as
// the original bug report:
//   makeDefaultStrategyV2('MNQ', '5m') + mergeStrategyV2(base, partial)
// against `fixtures/mnq-5m-prod.json` — 11,659 REAL MNQ 5m bars
// (2026-05-01 -> 2026-07-01), captured verbatim from the production
// `get_backtest_candles` RPC, mapped exactly like
// `SupabaseCandleSource.getCandles` (src/services/backtest/candleSource.ts).
// KEEP the fixture file — this test is meaningless without it.
// ============================================================================

import { describe, it, expect } from 'vitest';
import fixtureRows from './fixtures/mnq-5m-prod.json';
import type { Candle } from '../../../../components/ReplayChart/types';
import type { StrategyDefinitionV2 } from '../types';
import { makeDefaultStrategyV2 } from '../types';
import { runStrategyV2 } from '../StrategyEngine';
import { LevelBank } from '../LevelBank';
import { mergeStrategyV2 } from '../../../../pages/app/journal/backtest/lib/mergeStrategyV2';

function loadRealMnqCandles(): Candle[] {
  const rows = fixtureRows as unknown as number[][];
  return rows.map((row) => ({
    time: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }));
}

/**
 * The EXACT production bug report, reproduced verbatim: "Short when price
 * rejects the previous day high, stop above the wick, 3R target." Note the
 * phase deliberately does NOT declare `capture` — that omission is exactly
 * what production hit (an AI-authored/patched definition can omit it just
 * as easily as this hand-written one does), and is exactly what
 * `requiredAnchorsByPhase` now compensates for.
 */
function buildProdDefinition(): StrategyDefinitionV2 {
  const base = makeDefaultStrategyV2('MNQ', '5m');
  const partial: Partial<StrategyDefinitionV2> = {
    schemaVersion: 2,
    direction: 'short',
    instrument: { symbol: 'MNQ', source: 'databento' },
    timeframes: { execution: '5m' },
    phases: [
      {
        id: 'pdh-reject',
        when: {
          kind: 'levelInteraction',
          level: { type: 'prevDayHigh' },
          interaction: 'reject',
          wickBodyRatio: 2,
        },
      },
    ],
    entry: {
      orderType: 'limit',
      priceAnchor: { phaseId: 'pdh-reject', anchor: 'triggerPrice' },
      validForBars: 5,
    },
    stop: { basis: 'wick' },
    exits: { target: { basis: 'rMultiple', value: 3 } },
    filters: {},
  };
  return mergeStrategyV2(base, partial);
}

describe('StrategyEngine v2 — production-data regression (0-trades bug)', () => {
  it('produces real trades on real MNQ 5m data via the exact UI construction path', async () => {
    const candles = loadRealMnqCandles();
    expect(candles.length).toBe(11659);

    const def = buildProdDefinition();
    // The bug-report partial declares no `capture` — assert that stays true,
    // so this test keeps testing the omission, not a since-"fixed" fixture.
    expect(def.phases[0].capture ?? []).toHaveLength(0);

    const result = await runStrategyV2(def, candles);

    // Floor, not an exact pin: fill mechanics (limit-touch within
    // validForBars, one-position-at-a-time) legitimately vary the final
    // count a little if engine internals are tuned later. The bug produced
    // EXACTLY 0; a healthy run on this fixture currently produces 45. 20 is
    // a comfortable floor that still fails hard if the "0 trades" class of
    // bug reappears (e.g. someone reverts the requiredAnchorsByPhase fix, or
    // a future capture-shaped change reintroduces silent-NaN signals).
    expect(result.trades.length).toBeGreaterThanOrEqual(20);

    // Every produced trade must have valid, causally-sane geometry — a
    // second, independent check that the anchors resolved correctly. A
    // regression that silently degrades to `entryPrice`/`stopLoss`
    // resolving via some accidental non-NaN path would print `>0` trades
    // while getting the actual geometry wrong.
    for (const trade of result.trades) {
      expect(trade.type).toBe('short');
      expect(trade.stopLoss).toBeGreaterThan(trade.entryPrice);
      expect(Number.isFinite(trade.entryPrice)).toBe(true);
      expect(Number.isFinite(trade.stopLoss)).toBe(true);
    }

    // skippedSignals is additive diagnostics (see AutoBacktestEngine.ts) —
    // sanity-check the shape is present and non-negative, not exact counts
    // (those are as fill-mechanics-sensitive as trades.length itself).
    expect(result.skippedSignals).toBeDefined();
    expect(result.skippedSignals!.zeroSize).toBeGreaterThanOrEqual(0);
    expect(result.skippedSignals!.expired).toBeGreaterThanOrEqual(0);
  });

  it('the phase actually fires on real, tradeable setups (cross-checked against the SQL ground truth)', () => {
    // Independent of the engine's signal-building/fill machinery: just the
    // raw levelInteraction:'reject' rule, evaluated directly against the
    // fixture's prevDayHigh series — the same arithmetic the Lead verified
    // via SQL against the production DB (54 bars over this window using
    // UTC calendar days). This pins the "detection" half of the funnel
    // separately from the "signal geometry" half above.
    const candles = loadRealMnqCandles();

    // Reuse LevelBank directly for the causal prevDayHigh series (that part
    // is not under test here — LevelBank has its own unit suite) but keep
    // the 'reject' arithmetic inlined and independent of
    // ConditionCompiler/EventBank's wickRejection implementation, so this
    // assertion doesn't share a bug with the code it's checking.
    const levels = new LevelBank(candles, { timezone: 'UTC' });
    const pdh = levels.getSeries({ type: 'prevDayHigh' });
    let count = 0;
    for (let i = 1; i < candles.length; i++) {
      const level = pdh[i];
      if (!Number.isFinite(level)) continue;
      const c = candles[i];
      const body = Math.abs(c.close - c.open);
      const upperWick = c.high - Math.max(c.open, c.close);
      if (c.high > level && c.close < level && upperWick >= 2 * body) count++;
    }
    // Ground truth from the Lead's SQL: 54 bars. Allow a small tolerance for
    // the exact prevDayHigh-completion boundary convention (this reimplements
    // the SQL rule directly, not through LevelBank/EventBank).
    expect(count).toBeGreaterThanOrEqual(50);
    expect(count).toBeLessThanOrEqual(60);
  });
});
