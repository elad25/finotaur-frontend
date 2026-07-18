import { describe, expect, it } from 'vitest';
import { autoPositionToTradeChartTrade, mapTimeframeToInterval, resolveRunEntryDefaults } from '../tradeChartAdapter';
import type { AutoPosition } from '@/core/auto/signalToPosition';
import { makeDefaultSetup } from '@/core/auto/types';
import { makeDefaultStrategyV2 } from '@/core/auto/v2/types';

function makePosition(overrides: Partial<AutoPosition> = {}): AutoPosition {
  return {
    symbol: 'AUTO',
    type: 'long',
    entryPrice: 100,
    size: 1,
    stopLoss: 95,
    takeProfit: 115,
    entryTime: 1_700_000_000,
    status: 'closed',
    exitPrice: 115,
    exitTime: 1_700_003_600,
    exitReason: 'take_profit',
    realizedPnl: 15,
    realizedPnlPercent: 15,
    riskRewardRatio: 3,
    riskAmount: 5,
    ...overrides,
  };
}

describe('autoPositionToTradeChartTrade', () => {
  it('maps a closed long WIN trade', () => {
    const out = autoPositionToTradeChartTrade(makePosition(), 'MNQ=F');
    expect(out.symbol).toBe('MNQ=F');
    expect(out.side).toBe('LONG');
    expect(out.entry_price).toBe(100);
    expect(out.exit_price).toBe(115);
    expect(out.stopLoss).toBe(95);
    expect(out.takeProfit).toBe(115);
    expect(out.pnl).toBe(15);
    expect(out.outcome).toBe('WIN');
    expect(out.open_at).toBe(new Date(1_700_000_000 * 1000).toISOString());
    expect(out.close_at).toBe(new Date(1_700_003_600 * 1000).toISOString());
  });

  it('maps a short trade direction', () => {
    const out = autoPositionToTradeChartTrade(makePosition({ type: 'short' }), 'ES=F');
    expect(out.side).toBe('SHORT');
  });

  it('maps a LOSS trade (negative realizedPnl)', () => {
    const out = autoPositionToTradeChartTrade(
      makePosition({ realizedPnl: -10, exitReason: 'stop_loss' }),
      'ES=F',
    );
    expect(out.outcome).toBe('LOSS');
    expect(out.pnl).toBe(-10);
  });

  it('maps a break-even trade (realizedPnl === 0)', () => {
    const out = autoPositionToTradeChartTrade(makePosition({ realizedPnl: 0 }), 'ES=F');
    expect(out.outcome).toBe('BE');
  });

  it('maps an OPEN (still-running) trade regardless of realizedPnl', () => {
    const out = autoPositionToTradeChartTrade(
      makePosition({ status: 'open', exitPrice: undefined, exitTime: undefined, realizedPnl: undefined }),
      'BTCUSDT',
    );
    expect(out.outcome).toBe('OPEN');
    expect(out.exit_price).toBeNull();
    expect(out.close_at).toBeNull();
  });

  it('maps outcome to null when closed but realizedPnl is missing', () => {
    const out = autoPositionToTradeChartTrade(makePosition({ realizedPnl: undefined }), 'ES=F');
    expect(out.outcome).toBeNull();
  });
});

describe('mapTimeframeToInterval', () => {
  it('passes through known interval strings', () => {
    expect(mapTimeframeToInterval('15m')).toBe('15m');
    expect(mapTimeframeToInterval('1h')).toBe('1h');
    expect(mapTimeframeToInterval('4h')).toBe('4h');
    expect(mapTimeframeToInterval('1d')).toBe('1d');
  });

  it('returns undefined for unrecognized or empty input', () => {
    expect(mapTimeframeToInterval('bogus')).toBeUndefined();
    expect(mapTimeframeToInterval('')).toBeUndefined();
    expect(mapTimeframeToInterval(undefined)).toBeUndefined();
    expect(mapTimeframeToInterval(null)).toBeUndefined();
  });
});

describe('resolveRunEntryDefaults', () => {
  it('reads the v1 setup when engine is "v1", regardless of any loaded strategyV2', () => {
    const setup = makeDefaultSetup('BTCUSDT', '15m'); // entry: { orderType: 'limit', validForBars: 20 }
    const v2Def = makeDefaultStrategyV2('MNQ', '5m'); // entry: { orderType: 'market', validForBars: 5 }

    const out = resolveRunEntryDefaults('v1', setup, v2Def);

    expect(out.orderType).toBe('limit');
    expect(out.validForBars).toBe(20);
    expect(out.initialBalance).toBe(setup.risk.initialBalance);
  });

  it('reads strategyV2 when engine is "v2" and a v2 definition is loaded — the reported bug', () => {
    const setup = makeDefaultSetup('BTCUSDT', '15m');
    const v2Def = makeDefaultStrategyV2('MNQ', '5m');

    const out = resolveRunEntryDefaults('v2', setup, v2Def);

    expect(out.orderType).toBe('market');
    expect(out.validForBars).toBe(5);
    expect(out.initialBalance).toBe(v2Def.risk.initialBalance);
    // Must NOT be the v1 setup's values.
    expect(out.orderType).not.toBe(setup.entry.orderType);
  });

  it('falls back to the v1 setup when engine is "v2" but strategyV2 is null (defensive)', () => {
    const setup = makeDefaultSetup('BTCUSDT', '15m');
    const out = resolveRunEntryDefaults('v2', setup, null);
    expect(out.orderType).toBe(setup.entry.orderType);
    expect(out.validForBars).toBe(setup.entry.validForBars);
    expect(out.initialBalance).toBe(setup.risk.initialBalance);
  });
});
