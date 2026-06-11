// src/pages/app/crypto/scanner/useBinanceOrderBook.ts
// Binance local order-book sync — official algorithm:
//   https://binance-docs.github.io/apidocs/spot/en/#how-to-manage-a-local-order-book-correctly
//
// Key design decision: book and trade ring-buffer are kept in plain refs so
// that 10x/sec WS messages never trigger React re-renders. Only `status` and
// a 1-per-second `lastPrice` are state — everything else is pulled via the
// exposed accessor functions.

import { useEffect, useRef, useCallback, useState } from 'react';

// ── Public types ─────────────────────────────────────────────────────────────

export interface Trade {
  time: number;   // Unix ms
  price: number;
  qty: number;
  isBuyerMaker: boolean; // true = seller aggressed (sell trade), false = buy trade
}

export type BookStatus = 'connecting' | 'live' | 'error';

export interface OrderBookHandle {
  status: BookStatus;
  lastPrice: number | null;
  /** Snapshot of current bids+asks. Callers must NOT mutate the returned maps. */
  getBook: () => { bids: Map<number, number>; asks: Map<number, number> };
  /** Drains and returns all accumulated trades since the last call (empties the buffer). */
  drainTrades: () => Trade[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const WS_BASE = 'wss://stream.binance.com:9443/stream';
const REST_BASE = 'https://api.binance.com/api/v3/depth';
// 5000 = Binance max; deep snapshot so far walls (e.g. BTC bids at -20%)
// exist in the local book from the first second, not only after their
// levels happen to change and arrive via the diff stream.
const SNAPSHOT_LIMIT = 5000;
const TRADE_RING_SIZE = 500;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAYS = [1_000, 3_000, 8_000]; // ms, backoff

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useBinanceOrderBook(symbol: string): OrderBookHandle {
  // ── Mutable book state (NOT React state — avoids re-render per message) ──
  const bidsRef = useRef<Map<number, number>>(new Map());
  const asksRef = useRef<Map<number, number>>(new Map());
  const tradeRingRef = useRef<Trade[]>([]);
  const tradeHeadRef = useRef<number>(0); // ring-buffer write head

  // Sync state
  const lastUpdateIdRef = useRef<number>(0);
  const bufferedEventsRef = useRef<DepthDiffEvent[]>([]);
  const snapshotFetchedRef = useRef<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPriceThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef<boolean>(false);

  // ── React state (minimal — only drives re-renders) ─────────────────────
  const [status, setStatus] = useState<BookStatus>('connecting');
  const [lastPrice, setLastPrice] = useState<number | null>(null);

  // ── Throttled price update (max 1/sec) ─────────────────────────────────
  const updateLastPrice = useCallback((price: number) => {
    if (lastPriceThrottleRef.current !== null) return;
    setLastPrice(price);
    lastPriceThrottleRef.current = setTimeout(() => {
      lastPriceThrottleRef.current = null;
    }, 1_000);
  }, []);

  // ── Book mutation helpers ───────────────────────────────────────────────
  function applyLevels(
    map: Map<number, number>,
    levels: [string, string][],
  ): void {
    for (const [priceStr, qtyStr] of levels) {
      const price = parseFloat(priceStr);
      const qty = parseFloat(qtyStr);
      if (qty === 0) {
        map.delete(price);
      } else {
        map.set(price, qty);
      }
    }
  }

  function applyEvent(event: DepthDiffEvent): void {
    applyLevels(bidsRef.current, event.b);
    applyLevels(asksRef.current, event.a);
  }

  // ── Snapshot fetch ──────────────────────────────────────────────────────
  async function fetchSnapshot(sym: string): Promise<void> {
    const url = `${REST_BASE}?symbol=${sym}&limit=${SNAPSHOT_LIMIT}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Snapshot HTTP ${res.status}`);
    const data = (await res.json()) as SnapshotResponse;

    if (unmountedRef.current) return;

    // Initialise the book
    bidsRef.current = new Map();
    asksRef.current = new Map();
    applyLevels(bidsRef.current, data.bids as [string, string][]);
    applyLevels(asksRef.current, data.asks as [string, string][]);
    lastUpdateIdRef.current = data.lastUpdateId;

    // Apply any buffered events that arrived while we were fetching.
    // Per spec: discard events where u <= lastUpdateId; for the first kept
    // event, validate U <= lastUpdateId+1 <= u.
    const pending = bufferedEventsRef.current;
    bufferedEventsRef.current = [];
    let firstKept = true;
    for (const ev of pending) {
      if (ev.u <= lastUpdateIdRef.current) continue;
      if (firstKept) {
        if (ev.U > lastUpdateIdRef.current + 1) {
          // Gap detected — restart
          scheduleReconnect(sym, true);
          return;
        }
        firstKept = false;
      }
      applyEvent(ev);
      lastUpdateIdRef.current = ev.u;
    }

    snapshotFetchedRef.current = true;
    if (!unmountedRef.current) setStatus('live');
  }

  // ── Reconnect logic ─────────────────────────────────────────────────────
  function scheduleReconnect(sym: string, immediate = false): void {
    const attempt = reconnectAttemptsRef.current;
    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      if (!unmountedRef.current) setStatus('error');
      return;
    }
    reconnectAttemptsRef.current += 1;
    const delay = immediate ? 0 : (RECONNECT_DELAYS[attempt] ?? 8_000);
    if (!unmountedRef.current) setStatus('connecting');
    reconnectTimerRef.current = setTimeout(() => {
      if (!unmountedRef.current) connect(sym);
    }, delay);
  }

  // ── WebSocket connection ────────────────────────────────────────────────
  function connect(sym: string): void {
    const symLower = sym.toLowerCase();
    const url = `${WS_BASE}?streams=${symLower}@depth@100ms/${symLower}@aggTrade`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    // Reset state for fresh connection
    snapshotFetchedRef.current = false;
    bufferedEventsRef.current = [];
    lastUpdateIdRef.current = 0;

    ws.onopen = () => {
      if (unmountedRef.current || ws !== wsRef.current) return;
      reconnectAttemptsRef.current = 0;
      // Snapshot fetch happens async while we buffer incoming depth events
      fetchSnapshot(sym).catch(() => {
        if (!unmountedRef.current && ws === wsRef.current) {
          scheduleReconnect(sym);
        }
      });
    };

    ws.onmessage = (evt: MessageEvent) => {
      if (unmountedRef.current || ws !== wsRef.current) return;
      try {
        const wrapper = JSON.parse(evt.data as string) as CombinedStreamMessage;
        const stream = wrapper.stream ?? '';

        if (stream.endsWith('@aggTrade')) {
          const t = wrapper.data as AggTradeData;
          pushTrade({
            time: t.T,
            price: parseFloat(t.p),
            qty: parseFloat(t.q),
            isBuyerMaker: t.m,
          });
          updateLastPrice(parseFloat(t.p));
          return;
        }

        // depth event
        const ev = wrapper.data as DepthDiffEvent;
        if (!snapshotFetchedRef.current) {
          // Buffer until snapshot is ready
          bufferedEventsRef.current.push(ev);
          return;
        }

        // Sequence gap check
        if (ev.U > lastUpdateIdRef.current + 1) {
          // Gap — need a fresh snapshot
          snapshotFetchedRef.current = false;
          bufferedEventsRef.current = [ev];
          fetchSnapshot(sym).catch(() => {
            if (!unmountedRef.current && ws === wsRef.current) {
              scheduleReconnect(sym);
            }
          });
          return;
        }

        // Normal apply
        if (ev.u > lastUpdateIdRef.current) {
          applyEvent(ev);
          lastUpdateIdRef.current = ev.u;
        }
      } catch {
        // malformed message — ignore
      }
    };

    ws.onerror = () => {
      if (unmountedRef.current || ws !== wsRef.current) return;
      ws.close();
    };

    ws.onclose = () => {
      if (unmountedRef.current || ws !== wsRef.current) return;
      scheduleReconnect(sym);
    };
  }

  // ── Ring buffer for trades ──────────────────────────────────────────────
  function pushTrade(t: Trade): void {
    const ring = tradeRingRef.current;
    if (ring.length < TRADE_RING_SIZE) {
      ring.push(t);
    } else {
      ring[tradeHeadRef.current % TRADE_RING_SIZE] = t;
      tradeHeadRef.current += 1;
    }
  }

  // ── Public accessors (stable refs, safe to pass as deps) ───────────────
  const getBook = useCallback(
    () => ({ bids: bidsRef.current, asks: asksRef.current }),
    [],
  );

  const drainTrades = useCallback((): Trade[] => {
    const ring = tradeRingRef.current;
    const head = tradeHeadRef.current;
    let ordered: Trade[];

    if (ring.length < TRADE_RING_SIZE) {
      // Ring not yet full — items are in order
      ordered = ring.slice();
    } else {
      // Ring is full; data wraps. head % SIZE is the oldest slot.
      const oldest = head % TRADE_RING_SIZE;
      ordered = [...ring.slice(oldest), ...ring.slice(0, oldest)];
    }

    // Empty the ring
    tradeRingRef.current = [];
    tradeHeadRef.current = 0;
    return ordered;
  }, []);

  // ── Lifecycle: connect/reconnect on symbol change ──────────────────────
  useEffect(() => {
    unmountedRef.current = false;
    reconnectAttemptsRef.current = 0;
    setStatus('connecting');
    setLastPrice(null);

    connect(symbol);

    return () => {
      unmountedRef.current = true;

      // Clear timers
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (lastPriceThrottleRef.current !== null) {
        clearTimeout(lastPriceThrottleRef.current);
        lastPriceThrottleRef.current = null;
      }

      // Close WebSocket
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && ws.readyState < WebSocket.CLOSING) {
        ws.close();
      }

      // Clear buffers
      bufferedEventsRef.current = [];
      bidsRef.current = new Map();
      asksRef.current = new Map();
      tradeRingRef.current = [];
      tradeHeadRef.current = 0;
      snapshotFetchedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return { status, lastPrice, getBook, drainTrades };
}

// ── Internal Binance message shapes (not exported) ────────────────────────

interface SnapshotResponse {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

interface DepthDiffEvent {
  /** First update ID in event */
  U: number;
  /** Final update ID in event */
  u: number;
  b: [string, string][]; // bids
  a: [string, string][]; // asks
}

interface AggTradeData {
  T: number;  // trade time (ms)
  p: string;  // price
  q: string;  // quantity
  m: boolean; // isBuyerMaker
}

interface CombinedStreamMessage {
  stream: string;
  data: DepthDiffEvent | AggTradeData;
}
