// src/components/charting/orderflow/__tests__/nt8Bridge.test.ts
// Coverage for nt8Bridge.ts's connection state machine: hello/welcome
// handshake, auth failure (no auto-reconnect), resubscribe-on-reconnect,
// trades-tuple → FlowTrade mapping (including the time-unit contract —
// FlowTrade.time is epoch ms, same as the wire tuple's timeMs, no /1000),
// and progressive backfill chunk streaming. Uses a hand-rolled mock
// WebSocket (no such util exists elsewhere in this repo for browser-side
// WS — BinanceTradeSource's tests only mock `fetch`).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  connectNt8Bridge,
  getNt8BridgeStatus,
  nt8Backfill,
  nt8Subscribe,
  onNt8BridgeStatus,
  resetNt8BridgeForTests,
} from '../nt8Bridge';
import type { FlowTrade } from '../types';

// ── Mock WebSocket ──────────────────────────────────────────────────────

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.CONNECTING;
  url: string;
  sent: unknown[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((evt: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }

  close(): void {
    if (this.readyState === MockWebSocket.CLOSED) return;
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  // ── test helpers ──────────────────────────────────────────────────────
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(payload: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  simulateAbruptClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

function latestSocket(): MockWebSocket {
  const s = MockWebSocket.instances[MockWebSocket.instances.length - 1];
  if (!s) throw new Error('no MockWebSocket instance created yet');
  return s;
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket);
});

afterEach(() => {
  resetNt8BridgeForTests();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('nt8Bridge — hello/welcome handshake', () => {
  it('sends hello on open and reaches "live" after welcome', async () => {
    const connectPromise = connectNt8Bridge({ port: 24888, token: 'abc' });
    const socket = latestSocket();

    expect(socket.url).toBe('ws://127.0.0.1:24888');

    socket.simulateOpen();
    expect(socket.sent).toEqual([{ t: 'hello', v: 1, token: 'abc', client: 'finotaur-web' }]);

    socket.simulateMessage({ t: 'welcome', v: 1, agent: 'ninjatrader', feed: 'connected', allow: [] });
    await connectPromise;

    expect(getNt8BridgeStatus()).toBe('live');
  });

  it('responds to ping with pong echoing ts', () => {
    connectNt8Bridge({ port: 24888, token: 'abc' });
    const socket = latestSocket();
    socket.simulateOpen();
    socket.simulateMessage({ t: 'welcome', v: 1, agent: 'nt', feed: 'connected', allow: [] });

    socket.simulateMessage({ t: 'ping', ts: 12345 });

    expect(socket.sent).toContainEqual({ t: 'pong', ts: 12345 });
  });
});

describe('nt8Bridge — auth failure', () => {
  it('sets status "auth-failed" and does not auto-reconnect', async () => {
    vi.useFakeTimers();
    const connectPromise = connectNt8Bridge({ port: 24888, token: 'bad-token' });
    const socket = latestSocket();
    socket.simulateOpen();
    socket.simulateMessage({ t: 'error', code: 'auth_failed', msg: 'invalid token' });
    await connectPromise;

    expect(getNt8BridgeStatus()).toBe('auth-failed');

    const countBefore = MockWebSocket.instances.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(MockWebSocket.instances.length).toBe(countBefore); // no reconnect attempt fired
  });
});

describe('nt8Bridge — resubscribe on reconnect', () => {
  it('re-sends subscribe for active subs after a fresh welcome on the new socket', async () => {
    vi.useFakeTimers();
    const connectPromise = connectNt8Bridge({ port: 24888, token: 'abc' });
    const socket1 = latestSocket();
    socket1.simulateOpen();
    socket1.simulateMessage({ t: 'welcome', v: 1, agent: 'nt', feed: 'connected', allow: [] });
    await connectPromise;

    const onTrades = vi.fn();
    nt8Subscribe('NQ 09-26', { trades: true, depth: false }, { onTrades });

    expect(socket1.sent).toContainEqual({ t: 'subscribe', sym: 'NQ 09-26', trades: true, depth: false });

    // Simulate an abrupt disconnect (agent restart) — the bridge should
    // schedule a reconnect at the first backoff delay (1s).
    socket1.simulateAbruptClose();
    await vi.advanceTimersByTimeAsync(1_000);

    const socket2 = latestSocket();
    expect(socket2).not.toBe(socket1);

    socket2.simulateOpen();
    socket2.simulateMessage({ t: 'welcome', v: 1, agent: 'nt', feed: 'connected', allow: [] });

    expect(socket2.sent).toContainEqual({ t: 'subscribe', sym: 'NQ 09-26', trades: true, depth: false });

    // And live trades on the new connection still reach the same handler.
    socket2.simulateMessage({ t: 'trades', sym: 'NQ 09-26', d: [[1_700_000_000_000, 18500.25, 2, 1]] });
    expect(onTrades).toHaveBeenCalledWith([
      { time: 1_700_000_000_000, price: 18500.25, qty: 2, buyerAggressor: true },
    ]);
  });
});

describe('nt8Bridge — trades tuple → FlowTrade mapping', () => {
  it('maps [timeMs,price,qty,side] with NO time unit conversion (FlowTrade.time is epoch ms) and side 1|-1 -> buyerAggressor', async () => {
    const connectPromise = connectNt8Bridge({ port: 24888, token: 'abc' });
    const socket = latestSocket();
    socket.simulateOpen();
    socket.simulateMessage({ t: 'welcome', v: 1, agent: 'nt', feed: 'connected', allow: [] });
    await connectPromise;

    const onTrades = vi.fn();
    nt8Subscribe('ES H6', { trades: true, depth: false }, { onTrades });

    socket.simulateMessage({
      t: 'trades',
      sym: 'ES H6',
      d: [
        [1_700_000_000_000, 5000.5, 1, 1],
        [1_700_000_000_500, 5000.25, 3, -1],
      ],
    });

    const delivered = onTrades.mock.calls[0][0] as FlowTrade[];
    expect(delivered).toEqual([
      { time: 1_700_000_000_000, price: 5000.5, qty: 1, buyerAggressor: true },
      { time: 1_700_000_000_500, price: 5000.25, qty: 3, buyerAggressor: false },
    ]);
  });

  it('ignores trades for symbols with no active subscription', async () => {
    const connectPromise = connectNt8Bridge({ port: 24888, token: 'abc' });
    const socket = latestSocket();
    socket.simulateOpen();
    socket.simulateMessage({ t: 'welcome', v: 1, agent: 'nt', feed: 'connected', allow: [] });
    await connectPromise;

    // No throw, no crash — message for an unsubscribed symbol is a silent no-op.
    expect(() =>
      socket.simulateMessage({ t: 'trades', sym: 'UNKNOWN', d: [[1, 2, 3, 1]] }),
    ).not.toThrow();
  });
});

describe('nt8Bridge — backfill chunk streaming', () => {
  it('delivers bf_chunk progressively via onChunk and resolves on bf_done', async () => {
    const connectPromise = connectNt8Bridge({ port: 24888, token: 'abc' });
    const socket = latestSocket();
    socket.simulateOpen();
    socket.simulateMessage({ t: 'welcome', v: 1, agent: 'nt', feed: 'connected', allow: [] });
    await connectPromise;

    const chunks: FlowTrade[][] = [];
    const backfillPromise = nt8Backfill('NQ 09-26', 1_000, 5_000, (chunk) => chunks.push(chunk));

    expect(socket.sent).toContainEqual({ t: 'backfill', id: 1, sym: 'NQ 09-26', fromMs: 1_000, toMs: 5_000 });

    socket.simulateMessage({ t: 'bf_chunk', id: 1, d: [[2_000, 100, 1, 1]] });
    socket.simulateMessage({ t: 'bf_chunk', id: 1, d: [[3_000, 101, 2, -1]] });
    socket.simulateMessage({ t: 'bf_done', id: 1, coveredFromMs: 1_000, estimatedAggressor: true });

    const result = await backfillPromise;

    expect(chunks).toEqual([
      [{ time: 2_000, price: 100, qty: 1, buyerAggressor: true }],
      [{ time: 3_000, price: 101, qty: 2, buyerAggressor: false }],
    ]);
    expect(result).toEqual({ coveredFromMs: 1_000, estimatedAggressor: true });
  });

  it('rejects a concurrent backfill call while one is already in flight', async () => {
    const connectPromise = connectNt8Bridge({ port: 24888, token: 'abc' });
    const socket = latestSocket();
    socket.simulateOpen();
    socket.simulateMessage({ t: 'welcome', v: 1, agent: 'nt', feed: 'connected', allow: [] });
    await connectPromise;

    const first = nt8Backfill('NQ 09-26', 0, 1_000, () => {});
    await expect(nt8Backfill('NQ 09-26', 0, 1_000, () => {})).rejects.toThrow(/already in flight/);

    // Clean up the first pending backfill so it doesn't dangle across tests.
    socket.simulateMessage({ t: 'bf_done', id: 1, coveredFromMs: 0, estimatedAggressor: false });
    await first;
  });
});

describe('nt8Bridge — instant connection failure', () => {
  it('sets status "agent-not-running" when the socket closes before ever opening', async () => {
    const connectPromise = connectNt8Bridge({ port: 24888, token: 'abc' });
    const socket = latestSocket();
    socket.simulateAbruptClose(); // never called simulateOpen()
    await connectPromise;

    expect(getNt8BridgeStatus()).toBe('agent-not-running');
  });
});

describe('nt8Bridge — status listeners', () => {
  it('onNt8BridgeStatus fires for every transition and unsubscribes cleanly', async () => {
    const seen: string[] = [];
    const unsub = onNt8BridgeStatus((s) => seen.push(s));

    const connectPromise = connectNt8Bridge({ port: 24888, token: 'abc' });
    const socket = latestSocket();
    socket.simulateOpen();
    socket.simulateMessage({ t: 'welcome', v: 1, agent: 'nt', feed: 'connected', allow: [] });
    await connectPromise;

    expect(seen).toContain('awaiting-permission');
    expect(seen).toContain('live');

    unsub();
    const countBefore = seen.length;
    socket.simulateMessage({ t: 'error', code: 'auth_failed', msg: 'x' });
    expect(seen.length).toBe(countBefore); // no more events delivered after unsubscribe
  });
});
