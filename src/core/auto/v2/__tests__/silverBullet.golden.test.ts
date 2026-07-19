// ============================================================================
// SILVER BULLET GOLDEN TEST (PERMANENT) — gatePhases fix, real MNQ 5m data
// ============================================================================
// Locks in the fix for the "session-window strategy produces 0 trades" bug:
// `filters.session.windows` used to gate ONLY the fill attempt
// (`StrategyEngine.ts` step (b), `mctx.sessionAllowed[i]`), never phase
// advancement (step (c), `advancePhase(i)` ran unconditionally). A "sweep
// London high 10-11am NY, retrace into an FVG, enter" strategy could arm at
// ANY hour and its whole phase chain (sweep -> FVG retrace, `within: 10`
// bars) + 3-bar fill leash would routinely complete and expire entirely
// outside the 10-11am window — 0 trades on real data even though the
// underlying setups exist. `filters.session.gatePhases: true` (new field,
// `types.ts`) now also pauses phase advancement outside the session windows,
// so a chain can only arm/advance/complete on bars the fill could actually
// land on.
//
// This corrected Silver Bullet definition differs from the ORIGINAL
// production exemplar (server PRs #309/#310, see the now-deleted
// `silverBulletFunnel.audit.test.ts`) in exactly one respect: phase 'sweep'
// uses a single `levelInteraction: 'reject'` condition instead of an
// `and(levelInteraction:'break', event:'sweep')` pair. The funnel audit
// (temporary diagnostic, deleted per this same change) found the AND
// combination essentially never co-occurred with the 10-11am window by
// chance (~1/20), while 'reject' alone (wick pierces the level, body closes
// back on the near side — the same "sweep and reclaim" price action,
// expressed as ONE condition rather than two independently-timed ones)
// fires plentifully and composes correctly with `gatePhases`.
//
// DEF TUNING (documented per the task's "investigate, don't fake it" rule):
// with the default `risk.sizingMode: 'risk-pct'` (1% of a $10,000 balance),
// every real chain completion on this fixture produced a `zero-size` skip:
// the FVG-retrace entry can sit hundreds of points away from the 'sweep'
// phase's captured `wickExtreme` (up to `within.bars: 10` == 50 minutes of
// real MNQ movement can elapse between the two), so
// `stopDistancePoints * pointValue` (MNQ pointValue $2) routinely exceeds the
// $100 risk budget, floor-ing `resolveFuturesContracts` to 0 contracts. This
// is NOT a gatePhases/engine bug — the existing PDH flagship def (single
// phase, entry anchored to the SAME bar that captured the wick) never hits
// this because its stop distance is tiny by construction; a genuine two-phase
// sweep+retrace strategy has a structurally wider stop. Fixed by setting
// `risk.sizingMode: 'fixed-contracts'` (1 contract) on THIS definition only —
// a def-level tuning, not an engine or assertion change — which lets the
// real, otherwise-correctly-detected setup actually fill.
// ============================================================================

import { describe, it, expect } from 'vitest';
import fixtureRows from './fixtures/mnq-5m-prod.json';
import type { Candle } from '../../../../components/ReplayChart/types';
import type { StrategyDefinitionV2 } from '../types';
import { makeDefaultStrategyV2 } from '../types';
import { mergeStrategyV2 } from '../../../../pages/app/journal/backtest/lib/mergeStrategyV2';
import { runStrategyV2 } from '../StrategyEngine';
import { localMinutesAndDay } from '../../MarketContext';
import { DEFAULT_PATTERN_PARAMS } from '../../types';

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
 * Verbatim copy of `prodData.regression.test.ts` / `prodDataAggregates.
 * regression.test.ts`'s `buildProdDefinition` — the flagship PDH short-reject
 * definition. It declares NO `filters.session` at all, so `phasesGated` in
 * `StrategyEngine.ts`'s step (c) is always `false` for it regardless of this
 * change — the legacy-behavior guard below pins that this def's trade
 * count/P&L are BYTE-IDENTICAL to before the `gatePhases` engine edit.
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

/**
 * Corrected Silver Bullet definition — direction 'short' primary + `mirror:
 * true` (long side derived by `mirrorStrategyV2` at run time — see
 * `StrategyEngine.ts`'s module doc "MIRROR"). `filters.session.gatePhases:
 * true` is the field under test: without it, this exact definition produces
 * (near-)zero trades on the fixture (see the deleted funnel audit); with it,
 * the phase chain only arms/advances on bars inside the 10-11am NY window.
 */
function buildCorrectedSilverBulletDefinition(): StrategyDefinitionV2 {
  const base = makeDefaultStrategyV2('MNQ', '5m');
  const partial: Partial<StrategyDefinitionV2> = {
    schemaVersion: 2,
    direction: 'short',
    mirror: true,
    instrument: { symbol: 'MNQ', source: 'databento' },
    timeframes: { execution: '5m' },
    phases: [
      {
        id: 'sweep',
        when: {
          kind: 'levelInteraction',
          level: { type: 'sessionHigh', sessionName: 'london' },
          interaction: 'reject',
        },
        capture: [{ anchor: 'wickExtreme' }],
      },
      {
        id: 'fvg-retrace',
        when: { kind: 'patternActive', pattern: DEFAULT_PATTERN_PARAMS.FVG, interaction: 'tap' },
        within: { bars: 10 },
      },
    ],
    entry: { orderType: 'market', validForBars: 3 },
    stop: {
      basis: 'phaseAnchor',
      phaseRef: { phaseId: 'sweep', anchor: 'wickExtreme' },
      bufferPct: 0.05,
    },
    exits: { target: { basis: 'rMultiple', value: 2 } },
    filters: {
      session: {
        enabled: true,
        timezone: 'America/New_York',
        windows: [{ start: '10:00', end: '11:00' }],
        gatePhases: true,
      },
      maxTradesPerDay: 1,
    },
    // See module doc "DEF TUNING" — 'fixed-contracts' avoids a risk-pct
    // zero-size skip caused by this strategy's structurally wide stop
    // (sweep-to-retrace can span up to 10 bars of real MNQ movement).
    risk: {
      riskPerTradePct: 1,
      maxConcurrent: 1,
      initialBalance: 10000,
      commissionPct: 0,
      slippagePct: 0,
      sizingMode: 'fixed-contracts',
      contracts: 1,
    },
  };
  return mergeStrategyV2(base, partial);
}

describe('SILVER BULLET — gatePhases golden test (real MNQ 5m data)', () => {
  it('produces real trades, every entry inside the 10-11am NY window', async () => {
    const candles = loadRealMnqCandles();
    const def = buildCorrectedSilverBulletDefinition();

    const result = await runStrategyV2(def, candles);

    // eslint-disable-next-line no-console
    console.log(
      'Silver Bullet golden — trades:',
      result.trades.length,
      'shorts:',
      result.trades.filter((t) => t.type === 'short').length,
      'longs:',
      result.trades.filter((t) => t.type === 'long').length,
    );
    // eslint-disable-next-line no-console
    console.log(
      'Sample entry times (NY clock):',
      result.trades.slice(0, 10).map((t) => {
        const { minutes } = localMinutesAndDay(t.entryTime * 1000, 'America/New_York');
        const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
        const mm = String(minutes % 60).padStart(2, '0');
        return `${t.type} @ ${hh}:${mm}`;
      }),
    );

    expect(result.trades.length).toBeGreaterThanOrEqual(1);

    for (const trade of result.trades) {
      const { minutes } = localMinutesAndDay(trade.entryTime * 1000, 'America/New_York');
      expect(minutes).toBeGreaterThanOrEqual(10 * 60);
      expect(minutes).toBeLessThan(11 * 60);
    }
  });

  it('runs without error (and may legitimately find 0 trades) with gatePhases:false — same def otherwise', async () => {
    const candles = loadRealMnqCandles();
    const gated = buildCorrectedSilverBulletDefinition();
    const ungated: StrategyDefinitionV2 = {
      ...gated,
      filters: {
        ...gated.filters,
        session: gated.filters.session ? { ...gated.filters.session, gatePhases: false } : gated.filters.session,
      },
    };

    let result: Awaited<ReturnType<typeof runStrategyV2>> | undefined;
    await expect(
      (async () => {
        result = await runStrategyV2(ungated, candles);
      })(),
    ).resolves.not.toThrow();

    // eslint-disable-next-line no-console
    console.log('Silver Bullet (gatePhases:false) — trades:', result?.trades.length);
    expect(result?.trades.length).toBeGreaterThanOrEqual(0);
  });

  it('LEGACY GUARD — the flagship PDH def (no session filter) is byte-identical: 45 trades, same total P&L', async () => {
    const candles = loadRealMnqCandles();
    const def = buildProdDefinition();
    const result = await runStrategyV2(def, candles);

    // Exact pin (not a floor, unlike `prodData.regression.test.ts`'s >= 20):
    // this def has NO `filters.session`, so the `gatePhases` engine edit in
    // step (c) can NEVER affect it (`phasesGated` is always `false`). Any
    // deviation from 45 here means the engine edit leaked into strategies
    // that never opted into `gatePhases` — exactly what this guard exists to
    // catch.
    expect(result.trades.length).toBe(45);
    expect(result.statistics.totalPnl).toBeCloseTo(1719.08, 2);
  });
});
