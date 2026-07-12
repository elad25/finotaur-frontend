// src/pages/app/trading-arena/hooks/useNt8OrderBook.ts
// NT8-bridge-backed local order book — mirrors
// src/pages/app/crypto/scanner/useBinanceOrderBook.ts's OrderBookHandle
// contract EXACTLY (same return shape, same ref-held-book/no-per-message-
// re-render design, same ~1/s throttled lastPrice) so LiquidityTab's NT8
// futures branch can reuse useDepthSlices-adjacent consumers
// (useLiveDepthColumns) without a second, divergent book-handle shape.
//
// Book state is applied straight from the bridge's depth_snapshot/
// depth_delta messages (nt8Bridge.ts already normalizes those into
// DepthSnapshot/DepthDelta — [price, qty] tuples, qty===0 removes a level)
// — no local sequence-gap/backward-fill logic is needed here the way
// useBinanceOrderBook needs it for Binance's diff-stream protocol: the NT8
// agent is the single source of truth and always sends a fresh snapshot on
// (re)subscribe.

import { useCallback, useEffect, useRef, useState } from 'react';
import { nt8Subscribe, onNt8BridgeStatus, getNt8BridgeStatus, type BridgeStatus } from '@/components/charting/orderflow/nt8Bridge';
import type { BookStatus, OrderBookHandle, Trade } from '@/pages/app/crypto/scanner/useBinanceOrderBook';

const TRADE_RING_SIZE = 500;

function mapBridgeStatusToBook(s: BridgeStatus): BookStatus {
  switch (s) {
    case 'live':
      return 'live';
    case 'auth-failed':
    case 'unsupported-browser':
    case 'error':
      return 'error';
    case 'idle':
    case 'connecting':
    case 'awaiting-permission':
    case 'agent-not-running':
    default:
      return 'connecting';
  }
}

export function useNt8OrderBook(symbol: string): OrderBookHandle {
  const bidsRef = useRef<Map<number, number>>(new Map());
  const asksRef = useRef<Map<number, number>>(new Map());
  const tradeRingRef = useRef<Trade[]>([]);
  const tradeHeadRef = useRef<number>(0);
  const lastPriceThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<BookStatus>(() => mapBridgeStatusToBook(getNt8BridgeStatus()));
  const [lastPrice, setLastPrice] = useState<number | null>(null);

  const updateLastPrice = useCallback((price: number) => {
    if (lastPriceThrottleRef.current !== null) return;
    setLastPrice(price);
    lastPriceThrottleRef.current = setTimeout(() => {
      lastPriceThrottleRef.current = null;
    }, 1_000);
  }, []);

  const pushTrade = useCallback((t: Trade) => {
    const ring = tradeRingRef.current;
    if (ring.length < TRADE_RING_SIZE) {
      ring.push(t);
    } else {
      ring[tradeHeadRef.current % TRADE_RING_SIZE] = t;
      tradeHeadRef.current += 1;
    }
  }, []);

  const getBook = useCallback(
    () => ({ bids: bidsRef.current, asks: asksRef.current }),
    [],
  );

  const drainTrades = useCallback((): Trade[] => {
    const ring = tradeRingRef.current;
    const head = tradeHeadRef.current;
    let ordered: Trade[];

    if (ring.length < TRADE_RING_SIZE) {
      ordered = ring.slice();
    } else {
      const oldest = head % TRADE_RING_SIZE;
      ordered = [...ring.slice(oldest), ...ring.slice(0, oldest)];
    }

    tradeRingRef.current = [];
    tradeHeadRef.current = 0;
    return ordered;
  }, []);

  useEffect(() => {
    bidsRef.current = new Map();
    asksRef.current = new Map();
    tradeRingRef.current = [];
    tradeHeadRef.current = 0;
    setStatus(mapBridgeStatusToBook(getNt8BridgeStatus()));
    setLastPrice(null);

    const unsubStatus = onNt8BridgeStatus((s) => setStatus(mapBridgeStatusToBook(s)));

    const unsubscribe = nt8Subscribe(
      symbol,
      { trades: true, depth: true },
      {
        onDepthSnapshot: (snapshot) => {
          bidsRef.current = new Map(snapshot.bids);
          asksRef.current = new Map(snapshot.asks);
        },
        onDepthDelta: (delta) => {
          for (const [price, qty] of delta.bids) {
            if (qty === 0) bidsRef.current.delete(price);
            else bidsRef.current.set(price, qty);
          }
          for (const [price, qty] of delta.asks) {
            if (qty === 0) asksRef.current.delete(price);
            else asksRef.current.set(price, qty);
          }
        },
        onTrades: (trades) => {
          for (const t of trades) {
            pushTrade({ time: t.time, price: t.price, qty: t.qty, isBuyerMaker: !t.buyerAggressor });
            updateLastPrice(t.price);
          }
        },
      },
    );

    return () => {
      unsubscribe();
      unsubStatus();
      if (lastPriceThrottleRef.current !== null) {
        clearTimeout(lastPriceThrottleRef.current);
        lastPriceThrottleRef.current = null;
      }
      bidsRef.current = new Map();
      asksRef.current = new Map();
      tradeRingRef.current = [];
      tradeHeadRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return { status, lastPrice, getBook, drainTrades };
}
