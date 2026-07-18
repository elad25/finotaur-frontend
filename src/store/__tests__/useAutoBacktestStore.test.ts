// src/store/__tests__/useAutoBacktestStore.test.ts
// ============================================================================
// Covers `lastRunInstrument` — the field that fixes the production bug where
// a completed v2 (Strategy AI) run's results (chart symbol/timeframe,
// results-page caption) rendered against a STALE v1 `currentSetup.instrument`
// value instead of the instrument the run actually used. Both run paths
// (`runBacktest` for v1, `runStrategyV2Backtest` for v2) must record the
// definition actually being run, independent of the other engine's slot.
//
// All store dependencies (candle fetching, worker execution, persistence)
// are mocked so this test exercises only the store's own state transitions.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const getCandlesMock = vi.fn();
vi.mock('@/services/backtest/candleSource', () => ({
  getCandleSource: vi.fn(() => ({ getCandles: getCandlesMock })),
  sourceForSymbol: vi.fn(() => 'binance'),
}));

const runAutoBacktestInWorkerMock = vi.fn();
const runStrategyV2InWorkerMock = vi.fn();
vi.mock('@/services/backtest/autoBacktestRunner', () => ({
  runAutoBacktestInWorker: (...args: unknown[]) => runAutoBacktestInWorkerMock(...args),
  runStrategyV2InWorker: (...args: unknown[]) => runStrategyV2InWorkerMock(...args),
}));

vi.mock('@/services/backtest/setupRepository', () => ({
  listSetups: vi.fn(async () => []),
  listRuns: vi.fn(async () => []),
  getSetup: vi.fn(async () => null),
  saveSetup: vi.fn(async (s: unknown) => s),
  deleteSetup: vi.fn(async () => {}),
  getRun: vi.fn(async () => null),
  deleteRun: vi.fn(async () => {}),
  saveRun: vi.fn(async () => ({ ok: true, storage: 'supabase' })),
  buildSavedRun: vi.fn(
    (
      setup: unknown,
      result: { statistics: unknown; equityCurve: unknown; detections: unknown; trades: unknown; rMultipleDistribution: unknown },
      meta: { symbol: string; timeframe: string; from: number; to: number },
    ) => ({
      id: 'run-1',
      setupSnapshot: setup,
      symbol: meta.symbol,
      timeframe: meta.timeframe,
      from: meta.from,
      to: meta.to,
      statistics: result.statistics,
      equityCurve: result.equityCurve,
      detections: result.detections,
      trades: result.trades,
      rMultipleDistribution: result.rMultipleDistribution,
      createdAt: Date.now(),
    }),
  ),
  isV2SetupDefinition: (def: { schemaVersion?: number }) => def.schemaVersion === 2,
}));

import { useAutoBacktestStore, selectEffectiveInstrument } from '../useAutoBacktestStore';
import { makeDefaultStrategyV2 } from '@/core/auto/v2/types';
import type { AutoBacktestResult } from '@/core/auto/AutoBacktestEngine';
import type { Candle } from '@/components/ReplayChart/types';

function makeCandle(time: number): Candle {
  return { time, open: 1, high: 1, low: 1, close: 1, volume: 1 };
}

const fakeResult = {
  detections: [],
  trades: [],
  statistics: {},
  equityCurve: [],
  rMultipleDistribution: {
    '< -2R': 0,
    '-2R to -1R': 0,
    '-1R to 0R': 0,
    '0R to 1R': 0,
    '1R to 2R': 0,
    '2R to 3R': 0,
    '> 3R': 0,
  },
} as unknown as AutoBacktestResult;

beforeEach(() => {
  vi.clearAllMocks();
  getCandlesMock.mockResolvedValue([makeCandle(1), makeCandle(2)]);
  runAutoBacktestInWorkerMock.mockResolvedValue(fakeResult);
  runStrategyV2InWorkerMock.mockResolvedValue(fakeResult);
});

describe('useAutoBacktestStore — lastRunInstrument', () => {
  it('runBacktest() records the v1 currentSetup instrument with engine "v1"', async () => {
    useAutoBacktestStore.getState().setInstrument('MNQ', '5m', 'polygon');
    await useAutoBacktestStore.getState().runBacktest();

    expect(useAutoBacktestStore.getState().lastRunInstrument).toEqual({
      symbol: 'MNQ',
      timeframe: '5m',
      source: 'polygon',
      engine: 'v1',
    });
  });

  it('runStrategyV2Backtest() records the v2 definition instrument with engine "v2", independent of currentSetup', async () => {
    // currentSetup still holds an unrelated instrument — simulating a
    // previous classic run (or the module default) that a v2 run must not
    // inherit or overwrite.
    useAutoBacktestStore.getState().setInstrument('BTCUSDT', '15m', 'binance');

    const def = makeDefaultStrategyV2('MNQ', '5m');
    await useAutoBacktestStore.getState().runStrategyV2Backtest(def);

    const state = useAutoBacktestStore.getState();
    expect(state.lastRunInstrument).toEqual({
      symbol: 'MNQ',
      timeframe: '5m',
      source: 'binance',
      engine: 'v2',
    });
    // The v1 setup slot must remain untouched — this is exactly the
    // production bug: components must NOT read `currentSetup.instrument`
    // for a v2 run's results.
    expect(state.currentSetup.instrument.symbol).toBe('BTCUSDT');
  });

  it('selectEffectiveInstrument prefers lastRunInstrument over currentSetup.instrument after a v2 run', async () => {
    useAutoBacktestStore.getState().setInstrument('BTCUSDT', '15m', 'binance');
    const def = makeDefaultStrategyV2('MNQ', '5m');
    await useAutoBacktestStore.getState().runStrategyV2Backtest(def);

    expect(selectEffectiveInstrument(useAutoBacktestStore.getState())).toEqual({
      symbol: 'MNQ',
      timeframe: '5m',
      source: 'binance',
      engine: 'v2',
    });
  });

  it('selectEffectiveInstrument falls back to currentSetup.instrument when no run has completed yet', () => {
    useAutoBacktestStore.setState({ lastRunInstrument: null });
    useAutoBacktestStore.getState().setInstrument('ES', '1h', 'udf');

    expect(selectEffectiveInstrument(useAutoBacktestStore.getState())).toEqual({
      symbol: 'ES',
      timeframe: '1h',
      source: 'udf',
      engine: 'v1',
    });
  });

  it('reset() clears lastRunInstrument', async () => {
    const def = makeDefaultStrategyV2('MNQ', '5m');
    await useAutoBacktestStore.getState().runStrategyV2Backtest(def);
    expect(useAutoBacktestStore.getState().lastRunInstrument).not.toBeNull();

    useAutoBacktestStore.getState().reset();
    expect(useAutoBacktestStore.getState().lastRunInstrument).toBeNull();
  });
});
