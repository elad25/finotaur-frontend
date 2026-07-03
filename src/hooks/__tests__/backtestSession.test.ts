// src/hooks/__tests__/backtestSession.test.ts
// Vitest suite for the useBacktestSession reducer (exercised directly via
// _sessionReducerForTests, no React mounting) + the pure persisted-session
// sanitizer/migration helper. No window/DOM access.

import { describe, it, expect, vi } from 'vitest';

// useBacktestSession.ts transitively imports useEffectiveUser -> AuthProvider
// -> lib/supabase.ts, which throws at module-init time when VITE_SUPABASE_URL
// isn't set (by design — see lib/supabase.ts). This suite only exercises the
// pure reducer + sanitizer (no React mounting, no auth needed), so stub the
// hook rather than requiring real Supabase env vars in the test environment.
vi.mock('@/hooks/useEffectiveUser', () => ({
  useEffectiveUser: () => ({ id: 'test-user', isMentorView: false }),
}));

import {
  _sessionReducerForTests as reducer,
  computeStats,
  sanitizePersistedSession,
  type SessionState,
  type PendingOrder,
  type PaperPosition,
} from '../useBacktestSession';
import { DEFAULT_COMMISSION_CONFIG } from '@/lib/backtest/orderEngine';

const EMPTY_STATS = computeStats([], 10000);

function baseState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    startingBalance: 10000,
    activePosition: undefined,
    closedPositions: [],
    pendingOrders: [],
    stats: EMPTY_STATS,
    commissionConfig: { ...DEFAULT_COMMISSION_CONFIG },
    ...overrides,
  };
}

describe('reducer — ADD_PENDING with limitPrice', () => {
  it('carries limitPrice through onto the created order', () => {
    const state = baseState();
    const next = reducer(state, {
      type: 'ADD_PENDING',
      payload: {
        side: 'LONG',
        type: 'STOP_LIMIT',
        triggerPrice: 100,
        limitPrice: 103,
        size: 1,
        time: 1000,
      },
    });
    expect(next.pendingOrders).toHaveLength(1);
    expect(next.pendingOrders[0]).toMatchObject({
      side: 'LONG',
      type: 'STOP_LIMIT',
      triggerPrice: 100,
      limitPrice: 103,
      size: 1,
    });
  });

  it('leaves limitPrice undefined when omitted (non-STOP_LIMIT orders)', () => {
    const state = baseState();
    const next = reducer(state, {
      type: 'ADD_PENDING',
      payload: { side: 'LONG', type: 'LIMIT', triggerPrice: 100, size: 1, time: 1000 },
    });
    expect(next.pendingOrders[0].limitPrice).toBeUndefined();
  });
});

describe('reducer — UPDATE_PENDING shifts STOP_LIMIT limit with trigger', () => {
  it('moves limitPrice by the same delta as triggerPrice (offset preserved)', () => {
    let state = baseState();
    state = reducer(state, {
      type: 'ADD_PENDING',
      payload: { side: 'SHORT', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 99, size: 1, time: 1000 },
    });
    const id = state.pendingOrders[0].id;
    const next = reducer(state, {
      type: 'UPDATE_PENDING',
      payload: { orderId: id, triggerPrice: 95 },
    });
    expect(next.pendingOrders[0].triggerPrice).toBe(95);
    // Offset was -1 → limit follows to 94.
    expect(next.pendingOrders[0].limitPrice).toBe(94);
  });

  it('does not touch limitPrice on non-STOP_LIMIT orders', () => {
    let state = baseState();
    state = reducer(state, {
      type: 'ADD_PENDING',
      payload: { side: 'LONG', type: 'LIMIT', triggerPrice: 100, size: 1, time: 1000 },
    });
    const id = state.pendingOrders[0].id;
    const next = reducer(state, {
      type: 'UPDATE_PENDING',
      payload: { orderId: id, triggerPrice: 98 },
    });
    expect(next.pendingOrders[0].triggerPrice).toBe(98);
    expect(next.pendingOrders[0].limitPrice).toBeUndefined();
  });
});

describe('reducer — TRIGGER_PENDING', () => {
  it('sets triggeredAt on the matching order only', () => {
    const order1: PendingOrder = {
      id: 'ord_1', side: 'LONG', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 103, size: 1, createdAt: 0,
    };
    const order2: PendingOrder = {
      id: 'ord_2', side: 'SHORT', type: 'LIMIT', triggerPrice: 90, size: 1, createdAt: 0,
    };
    const state = baseState({ pendingOrders: [order1, order2] });
    const next = reducer(state, { type: 'TRIGGER_PENDING', payload: { orderId: 'ord_1', time: 5000 } });
    expect(next.pendingOrders.find((o) => o.id === 'ord_1')?.triggeredAt).toBe(5000);
    expect(next.pendingOrders.find((o) => o.id === 'ord_2')?.triggeredAt).toBeUndefined();
  });

  it('no-op when orderId does not match any pending order', () => {
    const order1: PendingOrder = {
      id: 'ord_1', side: 'LONG', type: 'STOP_LIMIT', triggerPrice: 100, size: 1, createdAt: 0,
    };
    const state = baseState({ pendingOrders: [order1] });
    const next = reducer(state, { type: 'TRIGGER_PENDING', payload: { orderId: 'nonexistent', time: 5000 } });
    expect(next.pendingOrders).toEqual([order1]);
  });
});

describe('reducer — FILL_PENDING slip type mapping', () => {
  it('STOP_LIMIT fills use LIMIT slip type (no slippage applied to fill price)', () => {
    const order: PendingOrder = {
      id: 'ord_1', side: 'LONG', type: 'STOP_LIMIT', triggerPrice: 100, limitPrice: 103, size: 1, createdAt: 0,
    };
    // Non-zero slippage config would move a STOP/MIT fill price; verify a
    // STOP_LIMIT fill lands EXACTLY at the fillPrice passed in (no slippage).
    const state = baseState({
      pendingOrders: [order],
      commissionConfig: { commissionPerOrder: 0, commissionPercent: 0, slippagePercent: 5 },
    });
    const next = reducer(state, {
      type: 'FILL_PENDING',
      payload: { orderId: 'ord_1', fillPrice: 100, fillTime: 1000 },
    });
    expect(next.activePosition).toBeDefined();
    expect(next.activePosition!.entryPrice).toBe(100); // no slippage — exact fill price
    expect(next.activePosition!.entryOrderType).toBe('LIMIT');
    expect(next.pendingOrders).toHaveLength(0);
  });

  it('STOP fills use STOP slip type (slippage DOES apply to fill price)', () => {
    const order: PendingOrder = {
      id: 'ord_1', side: 'LONG', type: 'STOP', triggerPrice: 100, size: 1, createdAt: 0,
    };
    const state = baseState({
      pendingOrders: [order],
      commissionConfig: { commissionPerOrder: 0, commissionPercent: 0, slippagePercent: 5 },
    });
    const next = reducer(state, {
      type: 'FILL_PENDING',
      payload: { orderId: 'ord_1', fillPrice: 100, fillTime: 1000 },
    });
    expect(next.activePosition).toBeDefined();
    // Slippage worsens a LONG buy fill (entry price moves up from 100).
    expect(next.activePosition!.entryPrice).toBeGreaterThan(100);
    expect(next.activePosition!.entryOrderType).toBe('STOP');
  });
});

describe('reducer — CLOSE reason "manual" regression', () => {
  it('sets closedViaOrder and computeStats counts the trade even without SL/TP', () => {
    const activePosition: PaperPosition = {
      id: 'pos_1',
      side: 'LONG',
      entryTime: 1000,
      entryPrice: 100,
      size: 1,
      originalSize: 1,
      feesPaid: 0,
      grossPnl: 0,
      fills: [{ kind: 'entry', price: 100, qty: 1, grossPnl: 0, fees: 0, netPnl: 0, time: 1000 }],
      // No stopLoss / takeProfit configured — manual-only trade.
    };
    const state = baseState({ activePosition });
    const next = reducer(state, {
      type: 'CLOSE',
      payload: { price: 110, time: 2000, reason: 'manual' },
    });

    expect(next.activePosition).toBeUndefined();
    expect(next.closedPositions).toHaveLength(1);
    const closed = next.closedPositions[0];
    expect(closed.closedViaOrder).toBe(true);
    expect(closed.exitReason).toBe('manual');

    // computeStats must count this trade in headline stats because closedViaOrder=true,
    // even though neither stopLoss nor takeProfit was ever set.
    const stats = computeStats(next.closedPositions, 10000);
    expect(stats.totalTrades).toBe(1);
    expect(stats.winners).toBe(1);
    expect(stats.netPnl).toBeCloseTo(10, 5); // (110-100)*1
  });
});

describe('reducer — OPEN scale-in preserves existing TP legs', () => {
  it('keeps existing TP legs (including a filled leg) and ignores payload legs', () => {
    const activePosition: PaperPosition = {
      id: 'pos_1',
      side: 'LONG',
      entryTime: 1000,
      entryPrice: 100,
      size: 2,
      originalSize: 2,
      feesPaid: 0,
      grossPnl: 0,
      fills: [{ kind: 'entry', price: 100, qty: 2, grossPnl: 0, fees: 0, netPnl: 0, time: 1000 }],
      takeProfits: [
        { id: 'tp1', price: 105, sizePercent: 50, filled: true },
        { id: 'tp2', price: 110, sizePercent: 50, filled: false },
      ],
    };
    const state = baseState({ activePosition });
    const next = reducer(state, {
      type: 'OPEN',
      payload: {
        side: 'LONG',
        price: 101,
        time: 2000,
        size: 1,
        // Payload supplies its OWN TP legs — these must be ignored because
        // the existing position already has legs.
        takeProfits: [{ id: 'tp_payload', price: 120, sizePercent: 100 }],
      },
    });

    expect(next.activePosition).toBeDefined();
    // Existing legs preserved verbatim, including the filled flag.
    expect(next.activePosition!.takeProfits).toHaveLength(2);
    expect(next.activePosition!.takeProfits).toEqual(activePosition.takeProfits);
    // Scale-in itself still applied (size increased).
    expect(next.activePosition!.size).toBe(3);
  });

  it('applies payload TP legs when the existing position has none', () => {
    const activePosition: PaperPosition = {
      id: 'pos_1',
      side: 'LONG',
      entryTime: 1000,
      entryPrice: 100,
      size: 1,
      originalSize: 1,
      feesPaid: 0,
      grossPnl: 0,
      fills: [{ kind: 'entry', price: 100, qty: 1, grossPnl: 0, fees: 0, netPnl: 0, time: 1000 }],
      takeProfits: [],
    };
    const state = baseState({ activePosition });
    const payloadLegs = [{ id: 'tp_payload', price: 120, sizePercent: 100 }];
    const next = reducer(state, {
      type: 'OPEN',
      payload: {
        side: 'LONG',
        price: 101,
        time: 2000,
        size: 1,
        takeProfits: payloadLegs,
      },
    });

    expect(next.activePosition).toBeDefined();
    expect(next.activePosition!.takeProfits).toEqual(payloadLegs);
  });
});

describe('sanitizePersistedSession — migration + corruption handling', () => {
  it('migrates a STOP_LIMIT pending order missing limitPrice to limitPrice = triggerPrice', () => {
    const parsed = {
      startingBalance: 10000,
      closedPositions: [],
      pendingOrders: [
        {
          id: 'ord_1',
          side: 'LONG',
          type: 'STOP_LIMIT',
          triggerPrice: 100,
          size: 1,
          createdAt: 1000,
          // no limitPrice — legacy persisted row
        },
      ],
    };
    const result = sanitizePersistedSession(parsed, 10000);
    expect(result).not.toBeNull();
    expect(result!.pendingOrders).toHaveLength(1);
    expect(result!.pendingOrders[0].limitPrice).toBe(100);
  });

  it('preserves an explicit limitPrice already present on a STOP_LIMIT row', () => {
    const parsed = {
      startingBalance: 10000,
      closedPositions: [],
      pendingOrders: [
        {
          id: 'ord_1',
          side: 'LONG',
          type: 'STOP_LIMIT',
          triggerPrice: 100,
          limitPrice: 103,
          size: 1,
          createdAt: 1000,
        },
      ],
    };
    const result = sanitizePersistedSession(parsed, 10000);
    expect(result!.pendingOrders[0].limitPrice).toBe(103);
  });

  it('drops corrupt pending order rows (missing required fields)', () => {
    const parsed = {
      startingBalance: 10000,
      closedPositions: [],
      pendingOrders: [
        { id: 'ord_bad', side: 'LONG', type: 'STOP_LIMIT' /* missing triggerPrice/size/createdAt */ },
        { id: 'ord_good', side: 'SHORT', type: 'LIMIT', triggerPrice: 90, size: 1, createdAt: 1000 },
      ],
    };
    const result = sanitizePersistedSession(parsed, 10000);
    expect(result!.pendingOrders).toHaveLength(1);
    expect(result!.pendingOrders[0].id).toBe('ord_good');
  });

  it('drops corrupt closed positions (e.g. entryPrice <= 0) and recomputes stats', () => {
    const parsed = {
      startingBalance: 10000,
      closedPositions: [
        { id: 'p1', side: 'LONG', entryTime: 1000, entryPrice: 0, size: 1 }, // invalid: entryPrice must be > 0
      ],
      pendingOrders: [],
    };
    const result = sanitizePersistedSession(parsed, 10000);
    expect(result!.closedPositions).toHaveLength(0);
    expect(result!.stats).toEqual(computeStats([], 10000));
  });

  it('returns null for a structurally invalid blob (not an object)', () => {
    expect(sanitizePersistedSession(null, 10000)).toBeNull();
    expect(sanitizePersistedSession('garbage', 10000)).toBeNull();
  });

  it('returns null when closedPositions/pendingOrders are not arrays', () => {
    expect(sanitizePersistedSession({ closedPositions: 'nope', pendingOrders: [] }, 10000)).toBeNull();
  });
});
