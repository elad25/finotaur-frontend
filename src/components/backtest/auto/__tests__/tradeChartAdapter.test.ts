import { describe, expect, it } from 'vitest';
import { autoPositionToTradeChartTrade, mapTimeframeToInterval } from '../tradeChartAdapter';
import type { AutoPosition } from '@/core/auto/signalToPosition';

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
