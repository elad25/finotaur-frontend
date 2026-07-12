// src/components/charting/orderflow/nt8Bridge.ts
//
// Browser-side connection manager for the NinjaTrader (NT8) desktop agent's
// local market-data WebSocket bridge (ws://127.0.0.1:<port>, agent-owned —
// NOT a FINOTAUR server endpoint; the agent runs on the user's own machine
// and their market data never leaves it). Module singleton (mirrors the
// stateless-singleton convention BinanceTradeSource/DatabentoTradeSource
// already use in this directory) — one bridge connection per browser tab,
// multiplexed per-symbol via `nt8Subscribe`.
//
// Wire protocol (agreed contract with the parallel NT8 agent build):
//   browser→agent: hello{t:'hello',v:1,token,client} ·
//                   subscribe{t:'subscribe',sym,trades,depth} ·
//                   unsubscribe{t:'unsubscribe',sym} ·
//                   backfill{t:'backfill',id,sym,fromMs,toMs} ·
//                   pong{t:'pong',ts}
//   agent→browser: welcome{t:'welcome',v,agent,feed,allow[]} ·
//                   error{t:'error',code,msg} ·
//                   sub_ok{t:'sub_ok',sym,tickSize} ·
//                   trades{t:'trades',sym,d:[[timeMs,price,qty,side]]} (side 1|-1) ·
//                   depth_snapshot{t:'depth_snapshot',sym,ts,bids,asks} ·
//                   depth_delta{t:'depth_delta',sym,ts,bids,asks} ·
//                   bf_chunk{t:'bf_chunk',id,d:[[timeMs,price,qty,sideEst]]} ·
//                   bf_done{t:'bf_done',id,coveredFromMs,estimatedAggressor} ·
//                   ping{t:'ping',ts} · status{t:'status',feed}
//
// DEVIATION FLAG: the task's protocol summary shows explicit `t:` literals
// only on hello/subscribe/backfill (browser side); `unsubscribe{sym}` and
// `pong{ts}` are written without one. This module sends `t:'unsubscribe'`
// and `t:'pong'` anyway for a consistent discriminated-union wire format —
// assumed shorthand in the spec, not a deliberate "no `t` field" contract.
// Coordinate with the agent build if this assumption is wrong.
//
// FlowTrade.time is epoch MS (see types.ts's doc comment) — trade tuples
// ([timeMs, price, qty, side]) map straight across with no unit conversion.

import type { DepthDelta, DepthSnapshot, FlowTrade } from './types';

// ── Public types ─────────────────────────────────────────────────────────

export type BridgeStatus =
  | 'idle'
  | 'connecting'
  | 'awaiting-permission'
  | 'live'
  | 'agent-not-running'
  | 'auth-failed'
  | 'unsupported-browser'
  | 'error';

export interface Nt8BridgeConfig {
  port: number;
  token: string;
}

export interface Nt8SubscribeOpts {
  trades: boolean;
  depth: boolean;
}

export interface Nt8SubscribeHandlers {
  onTrades?: (trades: FlowTrade[]) => void;
  onDepthSnapshot?: (snapshot: DepthSnapshot) => void;
  onDepthDelta?: (delta: DepthDelta) => void;
  onSubOk?: (tickSize: number) => void;
}

export interface Nt8BackfillResult {
  coveredFromMs: number;
  estimatedAggressor: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────

const RECONNECT_DELAYS = [1_000, 2_000, 5_000]; // ms, backoff, caps at 5s

// Combined guidance — an instant connection failure (agent not running,
// port unreachable) looks identical, over a plain WS handshake, to Chrome
// denying the connection outright for Local Network Access — so the
// message covers both without guessing which one actually happened.
export const NT8_AGENT_NOT_RUNNING_MESSAGE =
  'Could not reach the FINOTAUR agent on this computer. Make sure NinjaTrader and the FINOTAUR desktop agent are both running — and if Chrome asked to allow local network access, click Allow and try again.';

// ── Module singleton state ──────────────────────────────────────────────

let ws: WebSocket | null = null;
let status: BridgeStatus = 'idle';
let errorMessage: string | undefined;
let cfg: Nt8BridgeConfig | null = null;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const statusListeners = new Set<(status: BridgeStatus) => void>();

interface SubEntry {
  trades: boolean;
  depth: boolean;
  handlers: Nt8SubscribeHandlers;
}
const subs = new Map<string, SubEntry>();

let backfillSeq = 0;
interface PendingBackfill {
  id: number;
  onChunk: (trades: FlowTrade[]) => void;
  resolve: (result: Nt8BackfillResult) => void;
  reject: (err: Error) => void;
}
let pendingBackfill: PendingBackfill | null = null;

// ── Browser detection ───────────────────────────────────────────────────

/**
 * Safari (desktop + iOS) cannot be trusted to reach a local WebSocket agent
 * from an https page the way Chrome/Edge (with the Local Network Access
 * permission prompt) can — detected upfront so the UI never shows a
 * "Connect" button that's guaranteed to hang.
 */
export function isNt8BridgeUnsupportedBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /^((?!chrome|chromium|crios|edg|android).)*safari/i.test(ua);
}

// ── Status plumbing ──────────────────────────────────────────────────────

function setStatus(next: BridgeStatus, message?: string): void {
  status = next;
  errorMessage = message;
  for (const cb of statusListeners) cb(next);
}

export function getNt8BridgeStatus(): BridgeStatus {
  return status;
}

export function getNt8BridgeErrorMessage(): string | undefined {
  return errorMessage;
}

export function onNt8BridgeStatus(cb: (status: BridgeStatus) => void): () => void {
  statusListeners.add(cb);
  return () => {
    statusListeners.delete(cb);
  };
}

// ── Wire helpers ─────────────────────────────────────────────────────────

function send(payload: Record<string, unknown>): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function failPendingBackfill(reason: string): void {
  if (pendingBackfill) {
    const { reject } = pendingBackfill;
    pendingBackfill = null;
    reject(new Error(reason));
  }
}

function resubscribeAll(): void {
  for (const [sym, entry] of subs) {
    send({ t: 'subscribe', sym, trades: entry.trades, depth: entry.depth });
  }
}

function mapTradeTuples(tuples: unknown): FlowTrade[] {
  if (!Array.isArray(tuples)) return [];
  const out: FlowTrade[] = [];
  for (const row of tuples) {
    if (!Array.isArray(row) || row.length < 4) continue;
    const [timeMs, price, qty, side] = row as [number, number, number, number];
    out.push({ time: timeMs, price, qty, buyerAggressor: side === 1 });
  }
  return out;
}

function handleMessage(raw: string): void {
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return; // malformed message — ignore, matches BinanceTradeSource convention
  }

  const t = msg.t as string | undefined;

  switch (t) {
    case 'welcome': {
      reconnectAttempt = 0;
      setStatus('live');
      resubscribeAll();
      break;
    }

    case 'error': {
      const code = msg.code as string | undefined;
      const text = typeof msg.msg === 'string' ? msg.msg : undefined;
      if (code === 'auth_failed') {
        failPendingBackfill('nt8Bridge: auth failed');
        setStatus('auth-failed', text);
        cfg = null; // require a fresh connect() with a new token before retrying
        const socket = ws;
        ws = null;
        if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
      } else if (import.meta.env?.DEV) {
        // Per-subscription errors (not_allowed / no_instrument / feed_disconnected
        // / busy) don't necessarily invalidate the whole bridge — logged for
        // now rather than surfaced as a global status.
        console.warn('[nt8Bridge] error', code, text);
      }
      break;
    }

    case 'sub_ok': {
      const sym = msg.sym as string | undefined;
      const tickSize = msg.tickSize as number | undefined;
      if (sym && typeof tickSize === 'number') {
        subs.get(sym)?.handlers.onSubOk?.(tickSize);
      }
      break;
    }

    case 'trades': {
      const sym = msg.sym as string | undefined;
      if (!sym) break;
      const entry = subs.get(sym);
      if (!entry?.handlers.onTrades) break;
      const trades = mapTradeTuples(msg.d);
      if (trades.length > 0) entry.handlers.onTrades(trades);
      break;
    }

    case 'depth_snapshot': {
      const sym = msg.sym as string | undefined;
      if (!sym) break;
      const entry = subs.get(sym);
      entry?.handlers.onDepthSnapshot?.({
        ts: msg.ts as number,
        bids: (msg.bids as DepthSnapshot['bids']) ?? [],
        asks: (msg.asks as DepthSnapshot['asks']) ?? [],
      });
      break;
    }

    case 'depth_delta': {
      const sym = msg.sym as string | undefined;
      if (!sym) break;
      const entry = subs.get(sym);
      entry?.handlers.onDepthDelta?.({
        ts: msg.ts as number,
        bids: (msg.bids as DepthDelta['bids']) ?? [],
        asks: (msg.asks as DepthDelta['asks']) ?? [],
      });
      break;
    }

    case 'bf_chunk': {
      const id = msg.id as number | undefined;
      if (pendingBackfill && pendingBackfill.id === id) {
        const trades = mapTradeTuples(msg.d);
        if (trades.length > 0) pendingBackfill.onChunk(trades);
      }
      break;
    }

    case 'bf_done': {
      const id = msg.id as number | undefined;
      if (pendingBackfill && pendingBackfill.id === id) {
        const { resolve } = pendingBackfill;
        pendingBackfill = null;
        resolve({
          coveredFromMs: msg.coveredFromMs as number,
          estimatedAggressor: !!msg.estimatedAggressor,
        });
      }
      break;
    }

    case 'ping': {
      send({ t: 'pong', ts: msg.ts });
      break;
    }

    case 'status': {
      if (msg.feed === 'disconnected' && import.meta.env?.DEV) {
        console.warn('[nt8Bridge] agent reports upstream NT8 feed disconnected');
      }
      break;
    }

    default:
      break; // unknown message type — ignore, forward-compatible
  }
}

// ── Connection lifecycle ────────────────────────────────────────────────

function scheduleReconnect(): void {
  if (!cfg || reconnectTimer !== null) return;
  const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    openConnection();
  }, delay);
}

function handleConnectFailure(): void {
  failPendingBackfill('nt8Bridge: connection failed');
  setStatus('agent-not-running', NT8_AGENT_NOT_RUNNING_MESSAGE);
  scheduleReconnect();
}

function openConnection(): void {
  if (!cfg) return;

  setStatus(reconnectAttempt === 0 ? 'awaiting-permission' : 'connecting');

  let socket: WebSocket;
  try {
    socket = new WebSocket(`ws://127.0.0.1:${cfg.port}`);
  } catch {
    handleConnectFailure();
    return;
  }
  ws = socket;
  let openedOk = false;

  socket.onopen = () => {
    if (socket !== ws || !cfg) return;
    openedOk = true;
    send({ t: 'hello', v: 1, token: cfg.token, client: 'finotaur-web' });
  };

  socket.onmessage = (evt: MessageEvent) => {
    if (socket !== ws) return;
    handleMessage(evt.data as string);
  };

  socket.onerror = () => {
    if (socket !== ws) return;
    socket.close();
  };

  socket.onclose = () => {
    if (socket !== ws) return;
    ws = null;
    if (status === 'auth-failed' || status === 'unsupported-browser') return; // never auto-retry a bad token
    failPendingBackfill('nt8Bridge: connection closed');
    if (!openedOk) {
      handleConnectFailure();
      return;
    }
    scheduleReconnect();
  };
}

/**
 * Opens (or re-opens with new credentials) the NT8 bridge connection.
 * Resolves once this connection ATTEMPT settles — either 'live' or a
 * determinable failure state (agent-not-running / auth-failed / error /
 * unsupported-browser). Background reconnects that happen afterwards are
 * observed via `onNt8BridgeStatus`, not this promise.
 */
export function connectNt8Bridge(newCfg: Nt8BridgeConfig): Promise<void> {
  if (isNt8BridgeUnsupportedBrowser()) {
    setStatus('unsupported-browser');
    return Promise.resolve();
  }

  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  cfg = newCfg;
  reconnectAttempt = 0;

  return new Promise((resolve) => {
    let settled = false;
    const unsub = onNt8BridgeStatus((s) => {
      if (settled) return;
      if (
        s === 'live' ||
        s === 'agent-not-running' ||
        s === 'auth-failed' ||
        s === 'error' ||
        s === 'unsupported-browser'
      ) {
        settled = true;
        unsub();
        resolve();
      }
    });
    openConnection();
  });
}

// ── Per-symbol subscription multiplexing ────────────────────────────────

export function nt8Subscribe(
  symbol: string,
  opts: Nt8SubscribeOpts,
  handlers: Nt8SubscribeHandlers,
): () => void {
  subs.set(symbol, { trades: opts.trades, depth: opts.depth, handlers });
  if (status === 'live') {
    send({ t: 'subscribe', sym: symbol, trades: opts.trades, depth: opts.depth });
  }

  return () => {
    subs.delete(symbol);
    if (status === 'live') {
      send({ t: 'unsubscribe', sym: symbol });
    }
  };
}

// ── Backfill (single in-flight; concurrent calls are rejected) ─────────

export function nt8Backfill(
  symbol: string,
  fromMs: number,
  toMs: number,
  onChunk: (trades: FlowTrade[]) => void,
): Promise<Nt8BackfillResult> {
  if (pendingBackfill) {
    return Promise.reject(new Error('nt8Backfill: a backfill request is already in flight'));
  }
  if (status !== 'live') {
    return Promise.reject(new Error('nt8Backfill: bridge is not live'));
  }

  const id = (backfillSeq += 1);
  return new Promise<Nt8BackfillResult>((resolve, reject) => {
    pendingBackfill = { id, onChunk, resolve, reject };
    send({ t: 'backfill', id, sym: symbol, fromMs, toMs });
  });
}

// ── Test-only reset ──────────────────────────────────────────────────────
// This module is a singleton by design (one bridge per tab) — tests need an
// explicit way to reset it between cases. Not used by production code.

export function resetNt8BridgeForTests(): void {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  failPendingBackfill('nt8Bridge: reset for tests');
  const socket = ws;
  ws = null;
  if (socket && socket.readyState < WebSocket.CLOSING) {
    try {
      socket.close();
    } catch {
      // ignore
    }
  }
  status = 'idle';
  errorMessage = undefined;
  cfg = null;
  reconnectAttempt = 0;
  subs.clear();
  backfillSeq = 0;
  statusListeners.clear();
}
