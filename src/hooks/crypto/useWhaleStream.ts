// src/hooks/crypto/useWhaleStream.ts
// SSE hook for live whale trades — buffers at 250ms, reconnects with backoff,
// pauses on hidden tab, guards setState with alive ref (mirrors _shared/hooks.ts pattern).

import { useState, useEffect, useRef, useCallback } from 'react';
import { whaleStreamUrl } from '@/pages/app/crypto/_shared/api';
import type { WhaleTrade } from '@/pages/app/crypto/_shared/types';

export type WhaleStreamStatus = 'connecting' | 'live' | 'reconnecting' | 'error' | 'paused';

interface UseWhaleStreamOpts {
  symbols?: string[];
  enabled?: boolean;
  minUsd?: number;
  maxTrades?: number;
}

interface WhaleStreamState {
  trades: WhaleTrade[];
  status: WhaleStreamStatus;
  lastEventTs: number | null;
}

export function useWhaleStream(opts?: UseWhaleStreamOpts): WhaleStreamState {
  const { symbols, enabled = true, minUsd, maxTrades = 200 } = opts ?? {};

  const alive = useRef(true);
  const [state, setState] = useState<WhaleStreamState>({
    trades: [],
    status: enabled ? 'connecting' : 'paused',
    lastEventTs: null,
  });

  // Buffer for incoming trades — flushed to state every 250ms
  const buffer = useRef<WhaleTrade[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptRef = useRef(0);
  const lastEventTsRef = useRef<number | null>(null);
  const statusRef = useRef<WhaleStreamStatus>(enabled ? 'connecting' : 'paused');

  const setStatus = useCallback((s: WhaleStreamStatus) => {
    statusRef.current = s;
    if (alive.current) setState(prev => ({ ...prev, status: s }));
  }, []);

  const closeES = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  const stopFlush = useCallback(() => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const stopWatchdog = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearInterval(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  const stopReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!alive.current) return;
    closeES();
    stopFlush();
    stopWatchdog();

    setStatus('connecting');

    const url = whaleStreamUrl({ symbols, minUsd });
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      if (!alive.current) return;
      attemptRef.current = 0;
      setStatus('live');

      // Flush buffer every 250ms — cap at ~4 re-renders/s
      flushTimerRef.current = setInterval(() => {
        if (!alive.current) return;
        const incoming = buffer.current.splice(0);
        if (incoming.length === 0) return;
        setState(prev => {
          const merged = [...incoming, ...prev.trades];
          // Dedupe by id
          const seen = new Set<string>();
          const deduped: WhaleTrade[] = [];
          for (const t of merged) {
            if (!seen.has(t.id)) { seen.add(t.id); deduped.push(t); }
          }
          return {
            ...prev,
            trades: deduped.slice(0, maxTrades),
            lastEventTs: lastEventTsRef.current,
          };
        });
      }, 250);

      // Stale watchdog: reconnect if 20s without an event
      watchdogTimerRef.current = setInterval(() => {
        if (!alive.current) return;
        const ts = lastEventTsRef.current;
        if (statusRef.current === 'live' && ts !== null && Date.now() - ts > 20_000) {
          scheduleReconnect();
        }
      }, 5_000);
    };

    es.addEventListener('trade', (e: MessageEvent) => {
      if (!alive.current) return;
      try {
        const d = JSON.parse(e.data);
        const trade: WhaleTrade = {
          ...d,
          id: d.id ?? `${d.market}:${d.symbol}:${d.aggTradeId}`,
        };
        buffer.current.push(trade);
        lastEventTsRef.current = Date.now();
      } catch {
        // Ignore parse errors and keepalive comments
      }
    });

    es.onerror = () => {
      if (!alive.current) return;
      closeES();
      stopFlush();
      stopWatchdog();
      scheduleReconnect();
    };
  }, [symbols, minUsd, maxTrades]); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleReconnect = useCallback(() => {
    if (!alive.current) return;
    setStatus('reconnecting');
    stopReconnect();
    const delay = Math.min(1_000 * 2 ** attemptRef.current, 30_000);
    const jitter = delay * 0.1 * (Math.random() * 2 - 1); // ±10%
    attemptRef.current += 1;
    reconnectTimerRef.current = setTimeout(() => {
      if (alive.current && !document.hidden) connect();
    }, delay + jitter);
  }, [connect, stopReconnect, setStatus]);

  // Visibility change — pause when hidden, reconnect when visible
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        closeES();
        stopFlush();
        stopWatchdog();
        stopReconnect();
        setStatus('paused');
      } else if (enabled) {
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [enabled, connect, closeES, stopFlush, stopWatchdog, stopReconnect, setStatus]);

  // Main effect — open / close based on enabled + deps change
  useEffect(() => {
    alive.current = true;
    buffer.current = [];

    if (!enabled || document.hidden) {
      setStatus('paused');
      return;
    }

    connect();

    return () => {
      alive.current = false;
      closeES();
      stopFlush();
      stopWatchdog();
      stopReconnect();
    };
  }, [enabled, ...(symbols ?? []), minUsd]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
