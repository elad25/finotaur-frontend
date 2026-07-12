// src/components/charting/orderflow/__tests__/Nt8TradeSource.test.ts
// TradeSource-contract coverage for Nt8TradeSource.ts. nt8Bridge.ts itself
// is mocked here (see nt8Bridge.test.ts for the wire-protocol-level tests)
// so these tests isolate Nt8TradeSource's adapter behavior: status mapping,
// tick-size caching from onSubOk, and the backfill chunk-accumulation +
// graceful-degradation contract shared with BinanceTradeSource/
// DatabentoTradeSource.

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FlowTrade, TradeSourceStatus } from '../types';

const nt8SubscribeMock = vi.fn();
const nt8BackfillMock = vi.fn();
const onNt8BridgeStatusMock = vi.fn();
const getNt8BridgeStatusMock = vi.fn();

vi.mock('../nt8Bridge', () => ({
  nt8Subscribe: (...args: unknown[]) => nt8SubscribeMock(...args),
  nt8Backfill: (...args: unknown[]) => nt8BackfillMock(...args),
  onNt8BridgeStatus: (...args: unknown[]) => onNt8BridgeStatusMock(...args),
  getNt8BridgeStatus: () => getNt8BridgeStatusMock(),
}));

// Imported AFTER the mock is registered (vi.mock is hoisted, so this is safe).
import { Nt8TradeSource, getNt8TickSize, refineNt8TickSize } from '../Nt8TradeSource';

afterEach(() => {
  vi.clearAllMocks();
});

describe('Nt8TradeSource.subscribe', () => {
  it('subscribes trades-only ({trades:true, depth:false}) and forwards trades to onTrades', () => {
    getNt8BridgeStatusMock.mockReturnValue('live');
    onNt8BridgeStatusMock.mockReturnValue(() => {});
    let capturedHandlers: { onTrades?: (t: FlowTrade[]) => void } = {};
    nt8SubscribeMock.mockImplementation((_sym, _opts, handlers) => {
      capturedHandlers = handlers;
      return vi.fn(); // unsubscribe fn
    });

    const onTrades = vi.fn();
    const unsubscribe = Nt8TradeSource.subscribe('NQ 09-26', onTrades);

    expect(nt8SubscribeMock).toHaveBeenCalledWith(
      'NQ 09-26',
      { trades: true, depth: false },
      expect.objectContaining({ onTrades }),
    );

    const trades: FlowTrade[] = [{ time: 1, price: 2, qty: 3, buyerAggressor: true }];
    capturedHandlers.onTrades?.(trades);
    expect(onTrades).toHaveBeenCalledWith(trades);

    unsubscribe();
  });

  it('maps BridgeStatus -> TradeSourceStatus for the onStatus callback', () => {
    getNt8BridgeStatusMock.mockReturnValue('idle');
    let bridgeStatusCb: ((s: string) => void) | undefined;
    onNt8BridgeStatusMock.mockImplementation((cb: (s: string) => void) => {
      bridgeStatusCb = cb;
      return vi.fn();
    });
    nt8SubscribeMock.mockReturnValue(vi.fn());

    const onStatus = vi.fn();
    Nt8TradeSource.subscribe('NQ 09-26', () => {}, onStatus);

    expect(onStatus).toHaveBeenCalledWith('connecting'); // idle -> connecting

    bridgeStatusCb?.('live');
    expect(onStatus).toHaveBeenLastCalledWith('live');

    bridgeStatusCb?.('agent-not-running');
    expect(onStatus).toHaveBeenLastCalledWith('reconnecting');

    bridgeStatusCb?.('auth-failed');
    expect(onStatus).toHaveBeenLastCalledWith('error');

    bridgeStatusCb?.('unsupported-browser');
    expect(onStatus).toHaveBeenLastCalledWith('error');

    bridgeStatusCb?.('awaiting-permission');
    expect(onStatus).toHaveBeenLastCalledWith('connecting');
  });

  it('unsubscribe() tears down both the symbol subscription and the status listener', () => {
    getNt8BridgeStatusMock.mockReturnValue('live');
    const unsubStatus = vi.fn();
    const unsubSymbol = vi.fn();
    onNt8BridgeStatusMock.mockReturnValue(unsubStatus);
    nt8SubscribeMock.mockReturnValue(unsubSymbol);

    const unsubscribe = Nt8TradeSource.subscribe('NQ 09-26', () => {});
    unsubscribe();

    expect(unsubSymbol).toHaveBeenCalledTimes(1);
    expect(unsubStatus).toHaveBeenCalledTimes(1);
  });

  it('records tick size from onSubOk, readable via getNt8TickSize', () => {
    getNt8BridgeStatusMock.mockReturnValue('live');
    onNt8BridgeStatusMock.mockReturnValue(vi.fn());
    let capturedHandlers: { onSubOk?: (tickSize: number) => void } = {};
    nt8SubscribeMock.mockImplementation((_sym, _opts, handlers) => {
      capturedHandlers = handlers;
      return vi.fn();
    });

    Nt8TradeSource.subscribe('MNQ 09-26', () => {});
    expect(getNt8TickSize('MNQ 09-26')).toBeNull();

    capturedHandlers.onSubOk?.(0.25);
    expect(getNt8TickSize('MNQ 09-26')).toBe(0.25);
  });
});

describe('Nt8TradeSource.backfill', () => {
  it('accumulates chunks internally AND forwards them to the caller-supplied onChunk, resolving sorted ascending', async () => {
    nt8BackfillMock.mockImplementation(async (_sym, _from, _to, onChunk) => {
      onChunk([{ time: 3_000, price: 1, qty: 1, buyerAggressor: true }]);
      onChunk([{ time: 1_000, price: 2, qty: 1, buyerAggressor: false }]);
      return { coveredFromMs: 1_000, estimatedAggressor: false };
    });

    const forwarded: FlowTrade[][] = [];
    const result = await Nt8TradeSource.backfill('NQ 09-26', 1_000, 5_000, {
      onChunk: (chunk) => forwarded.push(chunk),
    });

    expect(forwarded).toHaveLength(2); // caller's onChunk saw both raw chunks, in delivery order
    expect(result.trades.map((t) => t.time)).toEqual([1_000, 3_000]); // internal accumulation sorted ascending
    expect(result.coveredFromMs).toBe(1_000);
  });

  it('works without an onChunk option — still returns the fully accumulated, sorted trades', async () => {
    nt8BackfillMock.mockImplementation(async (_sym, _from, _to, onChunk) => {
      onChunk([{ time: 200, price: 1, qty: 1, buyerAggressor: true }]);
      return { coveredFromMs: 200, estimatedAggressor: true };
    });

    const result = await Nt8TradeSource.backfill('NQ 09-26', 0, 1_000);
    expect(result.trades).toEqual([{ time: 200, price: 1, qty: 1, buyerAggressor: true }]);
  });

  it('never throws — on rejection (e.g. concurrent-backfill / disconnect), resolves with whatever was collected before the failure', async () => {
    nt8BackfillMock.mockImplementation(async (_sym, _from, _to, onChunk) => {
      onChunk([{ time: 500, price: 1, qty: 1, buyerAggressor: true }]);
      throw new Error('nt8Backfill: connection closed');
    });

    const result = await Nt8TradeSource.backfill('NQ 09-26', 0, 1_000);
    expect(result.trades).toEqual([{ time: 500, price: 1, qty: 1, buyerAggressor: true }]);
    expect(result.coveredFromMs).toBe(500);
  });

  it('reports coveredFromMs = toMs when a rejection happens before any chunk arrived', async () => {
    nt8BackfillMock.mockImplementation(async () => {
      throw new Error('nt8Backfill: bridge is not live');
    });

    const result = await Nt8TradeSource.backfill('NQ 09-26', 0, 1_000);
    expect(result.trades).toEqual([]);
    expect(result.coveredFromMs).toBe(1_000);
  });
});

describe('refineNt8TickSize', () => {
  it('resolves immediately with the cached value when already known', async () => {
    getNt8BridgeStatusMock.mockReturnValue('live');
    onNt8BridgeStatusMock.mockReturnValue(vi.fn());
    let capturedHandlers: { onSubOk?: (tickSize: number) => void } = {};
    nt8SubscribeMock.mockImplementation((_sym, _opts, handlers) => {
      capturedHandlers = handlers;
      return vi.fn();
    });

    Nt8TradeSource.subscribe('ES H6', () => {});
    capturedHandlers.onSubOk?.(0.25);

    await expect(refineNt8TickSize('ES H6', 1)).resolves.toBe(0.25);
  });

  it('falls back to the provided default after the timeout when no sub_ok ever arrives', async () => {
    vi.useFakeTimers();
    const promise = refineNt8TickSize('UNSEEN-SYMBOL', 0.5, 50);
    await vi.advanceTimersByTimeAsync(60);
    await expect(promise).resolves.toBe(0.5);
    vi.useRealTimers();
  });
});
