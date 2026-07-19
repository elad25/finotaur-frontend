/**
 * Trading Arena — Order-flow alerts v1 (client-side only, session-scoped).
 *
 * Pure detection engine + settings model. No React, no DOM — mirrors the
 * "pure engine" style of flowBinStore.ts/footprintRender.ts so the logic is
 * trivially unit-testable and reusable outside a hook. `useOrderFlowAlerts`
 * (../hooks/useOrderFlowAlerts.ts) owns the React glue (store subscription,
 * ring buffer, localStorage persistence wiring).
 *
 * Two alert types:
 *  - STACKED_IMBALANCE: reuses footprintRender.ts's `prepareCandleDraw` —
 *    the EXACT same stacked-imbalance-zone detection the Footprint tab
 *    renders — against the user's own persisted imbalance settings
 *    (useFootprintPreferences). Nothing is re-derived; this only reads
 *    `prepared.stackedZones`, which prepareCandleDraw always computes
 *    regardless of the `imbalanceStackedOnly` render toggle.
 *  - BIG_TRADE: single-print or 250ms-batch (same-price/same-side, matching
 *    BinanceTradeSource's own live-flush cadence) notional threshold, akin
 *    to volumeBubbles.ts's percentile-based "stands out" default but
 *    expressed as a $ notional so it's comparable across symbols of wildly
 *    different unit prices.
 *
 * Noise control (the #1 churn driver per the Arena order-flow research —
 * see FINOTAUR-KB) is enforced by OrderFlowAlertEngine: at most ONE alert
 * per (type, side) per bar, AND at least 15s between successive alerts of
 * the same (type, side) regardless of bar boundaries.
 */

import type { FlowCandleView, FlowTrade } from '@/components/charting/orderflow/types';
import type { FootprintConfig } from '@/components/charting/orderflow/types';
import { prepareCandleDraw } from '@/components/charting/orderflow/footprintRender';
import { computeBubbleThreshold } from '@/components/charting/orderflow/volumeBubbles';

// ─── Settings model (persisted to localStorage) ────────────────────────────

export const ORDER_FLOW_ALERTS_STORAGE_KEY = 'finotaur:arena:alerts:v1';

export interface OrderFlowAlertSettings {
  /** Master toggle — when false, no alerts are detected/emitted at all. */
  enabled: boolean;
  stackedImbalanceEnabled: boolean;
  bigTradeEnabled: boolean;
  /**
   * $ notional threshold for BIG_TRADE. `null` = 'auto' — derived per-symbol
   * from volumeBubbles' percentile-based threshold (see
   * computeAutoBigTradeThresholdUsd below). A finite positive number is a
   * user-fixed override.
   */
  bigTradeThresholdUsd: number | null;
}

export const DEFAULT_ORDER_FLOW_ALERT_SETTINGS: OrderFlowAlertSettings = {
  enabled: true,
  stackedImbalanceEnabled: true,
  bigTradeEnabled: true,
  bigTradeThresholdUsd: null,
};

/** Used only until enough live data exists to compute an auto threshold (see computeAutoBigTradeThresholdUsd). */
export const FALLBACK_BIG_TRADE_THRESHOLD_USD = 50_000;

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/**
 * Validates an arbitrary parsed-JSON value field-by-field against
 * `fallback` — never trusts the shape of `raw` (corrupt/partial/foreign
 * JSON degrades gracefully per field, never throws). Mirrors
 * useFootprintPreferences.ts's sanitizeFootprintSettings pattern.
 */
export function sanitizeOrderFlowAlertSettings(
  raw: unknown,
  fallback: OrderFlowAlertSettings = DEFAULT_ORDER_FLOW_ALERT_SETTINGS,
): OrderFlowAlertSettings {
  if (!raw || typeof raw !== 'object') return fallback;
  const p = raw as Partial<OrderFlowAlertSettings>;

  const threshold =
    p.bigTradeThresholdUsd === null
      ? null
      : typeof p.bigTradeThresholdUsd === 'number' && Number.isFinite(p.bigTradeThresholdUsd) && p.bigTradeThresholdUsd > 0
        ? p.bigTradeThresholdUsd
        : fallback.bigTradeThresholdUsd;

  return {
    enabled: asBool(p.enabled, fallback.enabled),
    stackedImbalanceEnabled: asBool(p.stackedImbalanceEnabled, fallback.stackedImbalanceEnabled),
    bigTradeEnabled: asBool(p.bigTradeEnabled, fallback.bigTradeEnabled),
    bigTradeThresholdUsd: threshold,
  };
}

export function readOrderFlowAlertSettings(): OrderFlowAlertSettings {
  if (typeof window === 'undefined') return DEFAULT_ORDER_FLOW_ALERT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(ORDER_FLOW_ALERTS_STORAGE_KEY);
    if (!raw) return DEFAULT_ORDER_FLOW_ALERT_SETTINGS;
    return sanitizeOrderFlowAlertSettings(JSON.parse(raw));
  } catch {
    // Corrupt JSON / blocked storage — fall back silently.
    return DEFAULT_ORDER_FLOW_ALERT_SETTINGS;
  }
}

export function writeOrderFlowAlertSettings(settings: OrderFlowAlertSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ORDER_FLOW_ALERTS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full / blocked — non-fatal, in-memory state still works this session.
  }
}

// ─── Event model ────────────────────────────────────────────────────────────

export type AlertSide = 'buy' | 'sell';
export type OrderFlowAlertType = 'STACKED_IMBALANCE' | 'BIG_TRADE';

interface BaseAlertEvent {
  id: string;
  type: OrderFlowAlertType;
  side: AlertSide;
  symbol: string;
  /** Epoch ms — when the alert was generated (Date.now()), not the trade/bar time. */
  time: number;
  /** Pre-formatted, English-only display string — see the header comment for the two exact formats. */
  message: string;
}

export interface StackedImbalanceAlertEvent extends BaseAlertEvent {
  type: 'STACKED_IMBALANCE';
  /** Footprint candle (bar) time, unix seconds. */
  barTime: number;
  priceFrom: number;
  priceTo: number;
}

export interface BigTradeAlertEvent extends BaseAlertEvent {
  type: 'BIG_TRADE';
  price: number;
  qty: number;
  notional: number;
}

export type OrderFlowAlertEvent = StackedImbalanceAlertEvent | BigTradeAlertEvent;

// ─── Formatting helpers ─────────────────────────────────────────────────────

function formatPrice(n: number): string {
  const abs = Math.abs(n);
  const decimals = abs >= 1000 ? 0 : abs >= 1 ? 2 : 6;
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatQty(n: number): string {
  const abs = Math.abs(n);
  const decimals = abs >= 100 ? 1 : abs >= 1 ? 2 : 4;
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

const QUOTE_SUFFIXES = ['USDT', 'BUSD', 'FDUSD', 'TUSD', 'USDC', 'USD'];

/** 'BTCUSDT' -> 'BTC'. Falls back to the symbol itself if no known quote suffix matches. */
export function baseAssetFromSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  for (const quote of QUOTE_SUFFIXES) {
    if (upper.endsWith(quote) && upper.length > quote.length) return upper.slice(0, -quote.length);
  }
  return upper;
}

// ─── STACKED_IMBALANCE detection (reuses footprintRender.ts verbatim) ──────

export interface StackedImbalanceZoneResult {
  side: AlertSide;
  priceFrom: number;
  priceTo: number;
}

/**
 * Runs the SAME `prepareCandleDraw` the Footprint tab's renderer calls, and
 * reads off `stackedZones` (always populated regardless of the
 * `imbalanceStackedOnly` render toggle — see that field's doc comment in
 * orderflow/types.ts). `mergeFactor` is fixed at 1 (raw rows) — row-merging
 * is a rendering-density choice, not a true price-level imbalance signal.
 */
export function detectStackedImbalanceZones(
  candle: FlowCandleView,
  rowSize: number,
  config: FootprintConfig,
): StackedImbalanceZoneResult[] {
  if (rowSize <= 0 || candle.bins.length === 0) return [];
  const prepared = prepareCandleDraw(candle, rowSize, 1, config);
  return prepared.stackedZones.map((zone) => {
    const fromPrice = prepared.merged[zone.fromIdx].binPrice;
    const toPrice = prepared.merged[zone.toIdx].binPrice + rowSize; // top edge of the highest row in the run
    return { side: zone.side, priceFrom: Math.min(fromPrice, toPrice), priceTo: Math.max(fromPrice, toPrice) };
  });
}

// ─── BIG_TRADE threshold ────────────────────────────────────────────────────

/**
 * Auto $ notional threshold for BIG_TRADE — derives from the SAME
 * percentile-based "stands out" volume threshold volumeBubbles.ts uses for
 * the Liquidity tab's bubbles (top ~2% of visible dominant-side volume),
 * converted to a $ notional via `representativePrice` (e.g. the most recent
 * candle's POC price) so the setting is comparable across symbols with very
 * different unit prices. Returns 0 when there isn't enough data yet
 * (empty/thin candle window) — callers should fall back to
 * FALLBACK_BIG_TRADE_THRESHOLD_USD in that case.
 */
export function computeAutoBigTradeThresholdUsd(
  candles: readonly FlowCandleView[],
  representativePrice: number,
): number {
  if (!(representativePrice > 0)) return 0;
  const qtyThreshold = computeBubbleThreshold(candles);
  if (qtyThreshold <= 0) return 0;
  return qtyThreshold * representativePrice;
}

// ─── Detection engine (noise control) ──────────────────────────────────────

const MIN_ALERT_INTERVAL_MS = 15_000;
/** How recent a trade must be (vs. Date.now()) to be eligible for BIG_TRADE — filters out historical/backfilled batches, which share the same applyTrades()->onTrades() path as genuinely live ones (see flowBinStore.ts's onTrades doc comment). Generous margin over BinanceTradeSource's 250ms live-flush cadence plus network/render latency. */
const BIG_TRADE_RECENCY_MS = 5_000;

let alertSeq = 0;
function nextAlertId(prefix: string): string {
  alertSeq += 1;
  return `${prefix}-${Date.now()}-${alertSeq}`;
}

/**
 * Stateful (per hook-instance) detector — NOT a React hook itself, just a
 * plain class so `useOrderFlowAlerts` can hold one in a ref and call it from
 * plain event-listener callbacks (store.onChange/onTrades) without any of
 * this logic needing to be a React effect. Reset (`reset()`) on symbol
 * change so cooldown state never leaks across symbols.
 */
export class OrderFlowAlertEngine {
  private lastBarByKey = new Map<string, number>();
  private lastAtByKey = new Map<string, number>();

  private canEmit(type: OrderFlowAlertType, side: AlertSide, barTime: number, now: number): boolean {
    const key = `${type}:${side}`;
    if (this.lastBarByKey.get(key) === barTime) return false; // max 1 per type+side per bar
    const lastAt = this.lastAtByKey.get(key);
    if (lastAt !== undefined && now - lastAt < MIN_ALERT_INTERVAL_MS) return false; // min 15s between identical (type+side) alerts
    return true;
  }

  private markEmitted(type: OrderFlowAlertType, side: AlertSide, barTime: number, now: number): void {
    const key = `${type}:${side}`;
    this.lastBarByKey.set(key, barTime);
    this.lastAtByKey.set(key, now);
  }

  /**
   * Checks the given candle (caller passes the forming AND/OR just-completed
   * bar — see useOrderFlowAlerts.ts) for qualifying stacked-imbalance zones
   * and emits at most one alert per (side) subject to the cooldown rules
   * above.
   */
  processCandle(
    symbol: string,
    candle: FlowCandleView,
    rowSize: number,
    config: FootprintConfig,
    now: number = Date.now(),
  ): StackedImbalanceAlertEvent[] {
    const zones = detectStackedImbalanceZones(candle, rowSize, config);
    const out: StackedImbalanceAlertEvent[] = [];
    for (const zone of zones) {
      if (!this.canEmit('STACKED_IMBALANCE', zone.side, candle.time, now)) continue;
      this.markEmitted('STACKED_IMBALANCE', zone.side, candle.time, now);
      out.push({
        id: nextAlertId('si'),
        type: 'STACKED_IMBALANCE',
        side: zone.side,
        symbol,
        time: now,
        barTime: candle.time,
        priceFrom: zone.priceFrom,
        priceTo: zone.priceTo,
        message: `Stacked ${zone.side} imbalance ${formatPrice(zone.priceFrom)}–${formatPrice(zone.priceTo)}`,
      });
    }
    return out;
  }

  /**
   * Processes one raw-trade batch (as delivered by FlowBinStore.onTrades —
   * typically one BinanceTradeSource 250ms live flush, or a backfill/history
   * chunk). Trades older than BIG_TRADE_RECENCY_MS are ignored so historical
   * data replayed through the same ingestion path never fires an alert.
   * Same-price+side trades within the batch are summed (the "or 250ms batch
   * at same price/side" rule from the spec) before the notional comparison.
   */
  processTradeBatch(
    symbol: string,
    trades: readonly FlowTrade[],
    thresholdUsd: number,
    intervalSec: number,
    now: number = Date.now(),
  ): BigTradeAlertEvent[] {
    if (!(thresholdUsd > 0) || intervalSec <= 0) return [];
    const cutoff = now - BIG_TRADE_RECENCY_MS;

    const groups = new Map<string, { price: number; qty: number; side: AlertSide }>();
    for (const trade of trades) {
      if (trade.time < cutoff) continue;
      const side: AlertSide = trade.buyerAggressor ? 'buy' : 'sell';
      const key = `${side}:${trade.price}`;
      const existing = groups.get(key);
      if (existing) {
        existing.qty += trade.qty;
      } else {
        groups.set(key, { price: trade.price, qty: trade.qty, side });
      }
    }
    if (groups.size === 0) return [];

    const barTime = Math.floor(now / 1000 / intervalSec) * intervalSec;
    const out: BigTradeAlertEvent[] = [];
    for (const group of groups.values()) {
      const notional = group.price * group.qty;
      if (notional < thresholdUsd) continue;
      if (!this.canEmit('BIG_TRADE', group.side, barTime, now)) continue;
      this.markEmitted('BIG_TRADE', group.side, barTime, now);
      out.push({
        id: nextAlertId('bt'),
        type: 'BIG_TRADE',
        side: group.side,
        symbol,
        time: now,
        price: group.price,
        qty: group.qty,
        notional,
        message: `Big trade: ${group.side.toUpperCase()} ${formatQty(group.qty)} ${baseAssetFromSymbol(symbol)} @ ${formatPrice(group.price)}`,
      });
    }
    return out;
  }

  /** Clears all cooldown state — call on symbol change so a new symbol starts with a clean slate. */
  reset(): void {
    this.lastBarByKey.clear();
    this.lastAtByKey.clear();
  }
}
