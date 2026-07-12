// src/components/charting/orderflow/Nt8TradeSource.ts
// TradeSource implementation backed by the local NT8 desktop-agent bridge
// (nt8Bridge.ts) — mirrors BinanceTradeSource.ts's shape (stateless
// singleton, `symbol` passed per-call) so sourceRegistry.ts and
// useOrderFlow.ts can consume it identically regardless of venue.
//
// Unlike Binance/Databento, the underlying connection (WebSocket to the
// user's own machine) is owned by nt8Bridge.ts, not this file — this class
// is a thin per-symbol multiplexing adapter over that shared connection.

import { nt8Backfill, nt8Subscribe, onNt8BridgeStatus, getNt8BridgeStatus, type BridgeStatus } from './nt8Bridge';
import type { FlowTrade, TradeSource, TradeSourceStatus } from './types';

function mapBridgeStatus(s: BridgeStatus): TradeSourceStatus {
  switch (s) {
    case 'live':
      return 'live';
    case 'agent-not-running':
      // The bridge keeps retrying in the background (see nt8Bridge.ts's
      // reconnect backoff) — 'reconnecting' communicates "still trying",
      // not a terminal failure.
      return 'reconnecting';
    case 'auth-failed':
    case 'unsupported-browser':
    case 'error':
      return 'error';
    case 'idle':
    case 'connecting':
    case 'awaiting-permission':
    default:
      return 'connecting';
  }
}

// ── Per-symbol tick-size cache, populated from `sub_ok` ─────────────────
// Exposed so callers (the NT8 futures Footprint/Liquidity bodies) can
// mirror the SAME async-refine pattern cryptoTickSizes.ts's
// refineCryptoTickSize already established for CryptoFootprintBody: start
// from a synchronous default (FUTURES_CONTRACTS[root].tickSize), then
// upgrade to the agent-confirmed value once `sub_ok` arrives.

const tickSizeCache = new Map<string, number>();
const tickSizeListeners = new Map<string, Set<(tickSize: number) => void>>();

function recordTickSize(symbol: string, tickSize: number): void {
  tickSizeCache.set(symbol, tickSize);
  const set = tickSizeListeners.get(symbol);
  if (set) {
    for (const cb of set) cb(tickSize);
  }
}

/** Last agent-confirmed tick size for `symbol`, or null if `sub_ok` hasn't arrived yet. */
export function getNt8TickSize(symbol: string): number | null {
  return tickSizeCache.get(symbol) ?? null;
}

/** Subscribes to tick-size updates for `symbol`; fires immediately if already cached. */
export function onNt8TickSize(symbol: string, cb: (tickSize: number) => void): () => void {
  let set = tickSizeListeners.get(symbol);
  if (!set) {
    set = new Set();
    tickSizeListeners.set(symbol, set);
  }
  set.add(cb);
  const cached = tickSizeCache.get(symbol);
  if (cached !== undefined) cb(cached);
  return () => {
    tickSizeListeners.get(symbol)?.delete(cb);
  };
}

/**
 * Async tick-size resolver mirroring cryptoTickSizes.ts's
 * `refineCryptoTickSize` contract exactly: resolves with the
 * agent-confirmed tick size if/when it arrives (or immediately if already
 * cached), else falls back to `fallback` after `timeoutMs` — NEVER
 * rejects, so it's always safe to `await` from a render effect.
 */
export function refineNt8TickSize(symbol: string, fallback: number, timeoutMs = 4_000): Promise<number> {
  const cached = getNt8TickSize(symbol);
  if (cached !== null) return Promise.resolve(cached);

  return new Promise((resolve) => {
    let settled = false;
    const unsub = onNt8TickSize(symbol, (tickSize) => {
      if (settled) return;
      settled = true;
      unsub();
      resolve(tickSize);
    });
    setTimeout(() => {
      if (settled) return;
      settled = true;
      unsub();
      resolve(fallback);
    }, timeoutMs);
  });
}

// ── TradeSource implementation ──────────────────────────────────────────

class Nt8TradeSourceImpl implements TradeSource {
  readonly venueId = 'nt8';

  subscribe(
    symbol: string,
    onTrades: (trades: FlowTrade[]) => void,
    onStatus?: (status: TradeSourceStatus) => void,
  ): () => void {
    onStatus?.(mapBridgeStatus(getNt8BridgeStatus()));
    const unsubStatus = onNt8BridgeStatus((s) => onStatus?.(mapBridgeStatus(s)));

    const unsubscribeSymbol = nt8Subscribe(
      symbol,
      { trades: true, depth: false },
      {
        onTrades,
        onSubOk: (tickSize) => recordTickSize(symbol, tickSize),
      },
    );

    return () => {
      unsubscribeSymbol();
      unsubStatus();
    };
  }

  async backfill(
    symbol: string,
    fromMs: number,
    toMs: number,
    opts?: { maxRequests?: number; signal?: AbortSignal; onChunk?: (trades: FlowTrade[]) => void },
  ): Promise<{ trades: FlowTrade[]; coveredFromMs: number }> {
    const collected: FlowTrade[] = [];
    const handleChunk = (chunk: FlowTrade[]) => {
      if (opts?.signal?.aborted) return;
      collected.push(...chunk);
      opts?.onChunk?.(chunk);
    };

    try {
      const { coveredFromMs } = await nt8Backfill(symbol, fromMs, toMs, handleChunk);
      collected.sort((a, b) => a.time - b.time);
      return { trades: collected, coveredFromMs };
    } catch {
      // Never throw — same graceful-degradation contract as
      // BinanceTradeSource/DatabentoTradeSource: report whatever we
      // actually collected before the failure (concurrent-backfill
      // rejection, bridge disconnect mid-walk, etc.).
      collected.sort((a, b) => a.time - b.time);
      const coveredFromMs = collected.length > 0 ? collected[0].time : toMs;
      return { trades: collected, coveredFromMs };
    }
  }
}

/** Singleton instance — stateless aside from per-call closures, safe to share. */
export const Nt8TradeSource: TradeSource = new Nt8TradeSourceImpl();
