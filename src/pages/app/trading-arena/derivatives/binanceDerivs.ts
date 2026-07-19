/**
 * binanceDerivs.ts — Trading Arena "Crypto Derivatives" panel v1 data client.
 *
 * Public Binance USDⓈ-M futures (fapi/fstream) data only — no API keys, no
 * backend. Symbol mapping is 1:1: an Arena crypto symbol (e.g. "BTCUSDT")
 * is used verbatim as the perp symbol. Not every Arena crypto symbol has a
 * perp market (many altcoins are spot-only), so availability is probed once
 * per symbol and the negative result is cached at module scope — remounting
 * this panel (tab switch, symbol re-select) never re-probes a symbol already
 * known to have no perp.
 *
 * Three independent data feeds, composed by `subscribeDerivatives`:
 *   - REST `premiumIndex`      — mark price + last funding rate + next
 *                                 funding time. Polled every 30s.
 *   - REST `openInterest`      — current open interest (base units), polled
 *                                 every 30s, converted to USD via mark price.
 *   - REST `openInterestHist`  — 4h of 5m-bucketed OI history (48 points),
 *                                 refreshed every 5 minutes, feeds the
 *                                 panel's sparkline.
 *   - WS   `<symbol>@forceOrder` — live liquidation events. Reconnects with
 *                                 the same capped-backoff convention as
 *                                 BinanceTradeSource.ts (see RECONNECT_DELAYS
 *                                 below). Bursts of same-side liquidations
 *                                 landing within 1s of each other are merged
 *                                 into a single row (mirrors real
 *                                 Coinglass-style liquidation feeds, which
 *                                 rarely show every individual partial fill).
 *
 * Every REST call and the WS connection fail gracefully: no throw ever
 * escapes this module. A failed probe or fetch just leaves the previous
 * state untouched (or, for the initial probe, flips `status` to
 * 'unavailable') — the panel never crashes and never retries in a tight
 * loop, since polling is interval-driven (30s / 5m) rather than
 * retry-on-failure.
 */

// ── Endpoints + cadence constants ───────────────────────────────────────────

const FAPI_REST_BASE = 'https://fapi.binance.com';
const FSTREAM_WS_BASE = 'wss://fstream.binance.com/ws';

const MARK_FUNDING_POLL_MS = 30_000;
const OPEN_INTEREST_POLL_MS = 30_000;
const OI_HISTORY_POLL_MS = 5 * 60_000;
const OI_HISTORY_LIMIT = 48; // 48 * 5m = 4h of history

// Liquidation WS reconnect backoff — same capped-backoff shape as
// BinanceTradeSource.ts's RECONNECT_DELAYS, extended with two longer steps
// since a dead forceOrder stream is lower-urgency than the trade tape (the
// REST feeds keep the rest of the panel alive regardless).
const RECONNECT_DELAYS = [1_000, 2_000, 5_000, 15_000, 30_000];

// Liquidation events of the same side landing within this window are merged
// into one aggregated row (task spec: "merge events of same side within 1s").
const LIQ_AGGREGATION_WINDOW_MS = 1_000;
const LIQ_RING_BUFFER_SIZE = 100;

// ── Public types ─────────────────────────────────────────────────────────

export type DerivativesStatus = 'connecting' | 'live' | 'unavailable';
export type LiquidationStreamStatus = 'connecting' | 'live' | 'reconnecting';
export type LiquidationSide = 'LONG_LIQ' | 'SHORT_LIQ';

export interface LiquidationRow {
  id: string;
  /** Time (ms) of the most recent event merged into this row. */
  time: number;
  side: LiquidationSide;
  /** Price of the most recent event merged into this row. */
  price: number;
  /** Summed base-asset quantity across all merged events. */
  qty: number;
  /** Summed USD notional across all merged events. */
  notionalUsd: number;
}

export interface OiHistoryPoint {
  time: number;
  openInterest: number;
}

export interface DerivativesState {
  status: DerivativesStatus;
  liqStatus: LiquidationStreamStatus;
  markPrice: number | null;
  fundingRate: number | null;
  nextFundingTimeMs: number | null;
  openInterestBase: number | null;
  openInterestUsd: number | null;
  oiHistory: OiHistoryPoint[];
  /** Ring buffer, oldest → newest, capped at LIQ_RING_BUFFER_SIZE. */
  liquidations: LiquidationRow[];
}

export const INITIAL_DERIVATIVES_STATE: DerivativesState = {
  status: 'connecting',
  liqStatus: 'connecting',
  markPrice: null,
  fundingRate: null,
  nextFundingTimeMs: null,
  openInterestBase: null,
  openInterestUsd: null,
  oiHistory: [],
  liquidations: [],
};

// ── Perp-symbol probe (once, cached) ────────────────────────────────────────

const perpAvailabilityCache = new Map<string, boolean>();

/**
 * Resolves whether `symbol` has a Binance USDⓈ-M perp market. Cached at
 * module scope — a definitive answer (HTTP responded, ok or not) is cached;
 * a network-level failure (fetch threw) is treated as transient and NOT
 * cached, so a later subscribe on the same symbol gets a fresh chance.
 */
async function probePerpSymbol(symbol: string): Promise<boolean> {
  const cached = perpAvailabilityCache.get(symbol);
  if (cached !== undefined) return cached;
  try {
    const res = await fetch(`${FAPI_REST_BASE}/fapi/v1/premiumIndex?symbol=${symbol.toUpperCase()}`);
    perpAvailabilityCache.set(symbol, res.ok);
    return res.ok;
  } catch {
    return false; // transient — not cached
  }
}

// ── REST fetchers ────────────────────────────────────────────────────────

interface PremiumIndexResponse {
  symbol: string;
  markPrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
}

async function fetchMarkAndFunding(
  symbol: string,
  signal: AbortSignal,
): Promise<{ markPrice: number; fundingRate: number; nextFundingTimeMs: number } | null> {
  try {
    const res = await fetch(`${FAPI_REST_BASE}/fapi/v1/premiumIndex?symbol=${symbol.toUpperCase()}`, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as PremiumIndexResponse;
    const markPrice = parseFloat(data.markPrice);
    const fundingRate = parseFloat(data.lastFundingRate);
    if (!Number.isFinite(markPrice) || !Number.isFinite(fundingRate)) return null;
    return { markPrice, fundingRate, nextFundingTimeMs: data.nextFundingTime };
  } catch {
    return null;
  }
}

interface OpenInterestResponse {
  symbol: string;
  openInterest: string;
  time: number;
}

async function fetchOpenInterest(symbol: string, signal: AbortSignal): Promise<number | null> {
  try {
    const res = await fetch(`${FAPI_REST_BASE}/fapi/v1/openInterest?symbol=${symbol.toUpperCase()}`, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as OpenInterestResponse;
    const oi = parseFloat(data.openInterest);
    return Number.isFinite(oi) ? oi : null;
  } catch {
    return null;
  }
}

interface OpenInterestHistItem {
  symbol: string;
  sumOpenInterest: string;
  sumOpenInterestValue: string;
  timestamp: number;
}

async function fetchOpenInterestHistory(symbol: string, signal: AbortSignal): Promise<OiHistoryPoint[]> {
  try {
    const url = `${FAPI_REST_BASE}/futures/data/openInterestHist?symbol=${symbol.toUpperCase()}&period=5m&limit=${OI_HISTORY_LIMIT}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as OpenInterestHistItem[];
    return data
      .map((item) => ({ time: item.timestamp, openInterest: parseFloat(item.sumOpenInterest) }))
      .filter((p) => Number.isFinite(p.openInterest))
      .sort((a, b) => a.time - b.time);
  } catch {
    return [];
  }
}

// ── Liquidation WS (forceOrder) ─────────────────────────────────────────────

interface ForceOrderWsMessage {
  e: 'forceOrder';
  E: number;
  o: {
    s: string;
    S: 'BUY' | 'SELL';
    q: string;
    p: string;
    ap: string;
    T: number;
  };
}

interface MappedForceOrder {
  time: number;
  side: LiquidationSide;
  price: number;
  qty: number;
  notionalUsd: number;
}

function mapForceOrder(msg: ForceOrderWsMessage): MappedForceOrder {
  const o = msg.o;
  // Binance's forceOrder `S` is the side of the FORCED order that closed the
  // position: SELL closes a long (a LONG was liquidated), BUY closes a short
  // (a SHORT was liquidated).
  const side: LiquidationSide = o.S === 'SELL' ? 'LONG_LIQ' : 'SHORT_LIQ';
  const price = parseFloat(o.ap || o.p);
  const qty = parseFloat(o.q);
  return { time: o.T || msg.E, side, price, qty, notionalUsd: price * qty };
}

function mergeLiquidation(buffer: LiquidationRow[], evt: MappedForceOrder): LiquidationRow[] {
  const last = buffer[buffer.length - 1];
  if (last && last.side === evt.side && evt.time - last.time <= LIQ_AGGREGATION_WINDOW_MS) {
    const merged: LiquidationRow = {
      ...last,
      time: evt.time,
      price: evt.price,
      qty: last.qty + evt.qty,
      notionalUsd: last.notionalUsd + evt.notionalUsd,
    };
    return [...buffer.slice(0, -1), merged];
  }
  const row: LiquidationRow = {
    id: `${evt.time}-${evt.side}-${Math.random().toString(36).slice(2, 8)}`,
    time: evt.time,
    side: evt.side,
    price: evt.price,
    qty: evt.qty,
    notionalUsd: evt.notionalUsd,
  };
  const next = [...buffer, row];
  return next.length > LIQ_RING_BUFFER_SIZE ? next.slice(next.length - LIQ_RING_BUFFER_SIZE) : next;
}

/**
 * Subscribes to the live liquidation stream for `symbol`. Reconnects with a
 * capped backoff (mirrors BinanceTradeSource.ts) — never gives up, never
 * spams. Returns an unsubscribe function.
 */
function subscribeLiquidations(
  symbol: string,
  onUpdate: (buffer: LiquidationRow[]) => void,
  onStatus: (status: LiquidationStreamStatus) => void,
): () => void {
  let ws: WebSocket | null = null;
  let unmounted = false;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let buffer: LiquidationRow[] = [];

  const scheduleReconnect = () => {
    if (unmounted) return;
    onStatus('reconnecting');
    const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(connect, delay);
  };

  const connect = () => {
    if (unmounted) return;
    onStatus(reconnectAttempt === 0 ? 'connecting' : 'reconnecting');

    let socket: WebSocket;
    try {
      socket = new WebSocket(`${FSTREAM_WS_BASE}/${symbol.toLowerCase()}@forceOrder`);
    } catch {
      scheduleReconnect();
      return;
    }
    ws = socket;

    socket.onopen = () => {
      if (unmounted || socket !== ws) return;
      reconnectAttempt = 0;
      onStatus('live');
    };

    socket.onmessage = (evt: MessageEvent) => {
      if (unmounted || socket !== ws) return;
      try {
        const msg = JSON.parse(evt.data as string) as ForceOrderWsMessage;
        buffer = mergeLiquidation(buffer, mapForceOrder(msg));
        onUpdate(buffer);
      } catch {
        // malformed message — ignore, matches BinanceTradeSource convention
      }
    };

    socket.onerror = () => {
      if (unmounted || socket !== ws) return;
      socket.close();
    };

    socket.onclose = () => {
      if (unmounted || socket !== ws) return;
      scheduleReconnect();
    };
  };

  connect();

  return () => {
    unmounted = true;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    const socket = ws;
    ws = null;
    if (socket && socket.readyState < WebSocket.CLOSING) {
      socket.close();
    }
    buffer = [];
  };
}

// ── Top-level composition ───────────────────────────────────────────────────

/**
 * Subscribes to every derivatives feed for `symbol` and calls `onUpdate`
 * with the accumulated state on every change. Returns an unsubscribe
 * function that tears down all timers + the WS connection.
 *
 * `status` transitions: 'connecting' → 'live' once the perp probe succeeds
 * and the first REST round-trip completes, or → 'unavailable' if the probe
 * fails (no perp market for this symbol). The liquidation stream's own
 * connectivity is tracked separately via `liqStatus` — a reconnecting liq
 * feed does not downgrade the whole panel, since mark/funding/OI can still
 * be live via REST independent of the WS.
 */
export function subscribeDerivatives(symbol: string, onUpdate: (state: DerivativesState) => void): () => void {
  let unmounted = false;
  let state: DerivativesState = { ...INITIAL_DERIVATIVES_STATE };
  const controller = new AbortController();

  const emit = (patch: Partial<DerivativesState>) => {
    if (unmounted) return;
    state = { ...state, ...patch };
    onUpdate(state);
  };

  let markFundingTimer: ReturnType<typeof setInterval> | null = null;
  let oiTimer: ReturnType<typeof setInterval> | null = null;
  let oiHistTimer: ReturnType<typeof setInterval> | null = null;
  let unsubscribeLiq: (() => void) | null = null;

  const pollMarkFunding = async () => {
    const result = await fetchMarkAndFunding(symbol, controller.signal);
    if (unmounted || !result) return;
    emit({
      markPrice: result.markPrice,
      fundingRate: result.fundingRate,
      nextFundingTimeMs: result.nextFundingTimeMs,
      // Keep OI-in-USD in sync with the freshest mark price.
      openInterestUsd: state.openInterestBase !== null ? state.openInterestBase * result.markPrice : state.openInterestUsd,
    });
  };

  const pollOpenInterest = async () => {
    const oi = await fetchOpenInterest(symbol, controller.signal);
    if (unmounted || oi === null) return;
    emit({
      openInterestBase: oi,
      openInterestUsd: state.markPrice !== null ? oi * state.markPrice : state.openInterestUsd,
    });
  };

  const pollOiHistory = async () => {
    const hist = await fetchOpenInterestHistory(symbol, controller.signal);
    if (unmounted || hist.length === 0) return;
    emit({ oiHistory: hist });
  };

  const start = async () => {
    emit({ status: 'connecting' });

    const available = await probePerpSymbol(symbol);
    if (unmounted) return;
    if (!available) {
      emit({ status: 'unavailable' });
      return;
    }

    await Promise.all([pollMarkFunding(), pollOpenInterest(), pollOiHistory()]);
    if (unmounted) return;

    emit({ status: 'live' });

    markFundingTimer = setInterval(pollMarkFunding, MARK_FUNDING_POLL_MS);
    oiTimer = setInterval(pollOpenInterest, OPEN_INTEREST_POLL_MS);
    oiHistTimer = setInterval(pollOiHistory, OI_HISTORY_POLL_MS);

    unsubscribeLiq = subscribeLiquidations(
      symbol,
      (buffer) => emit({ liquidations: buffer }),
      (liqStatus) => emit({ liqStatus }),
    );
  };

  start();

  return () => {
    unmounted = true;
    controller.abort();
    if (markFundingTimer !== null) clearInterval(markFundingTimer);
    if (oiTimer !== null) clearInterval(oiTimer);
    if (oiHistTimer !== null) clearInterval(oiHistTimer);
    if (unsubscribeLiq) unsubscribeLiq();
  };
}
