/**
 * useOrderFlowAlerts — Arena-wide, session-scoped order-flow alerts (v1).
 *
 * Owns its OWN dedicated live subscription (via the existing useOrderFlow +
 * FlowBinStore machinery — the exact same aggregation engine the Footprint
 * tab uses, see orderflow/orderFlowAlerts.ts's header comment) so the bell
 * in the Arena toolbar works regardless of which tab is active — a
 * requirement the per-tab stores (each tab's own useOrderFlow instance)
 * can't satisfy on their own, since they only mount while that tab is
 * visible. This does mean a SEPARATE live WebSocket connection from
 * whichever order-flow tab (Footprint/CVD/Liquidity/DOM) happens to be open
 * for the same symbol at the same time — BinanceTradeSource.subscribe()
 * doesn't dedupe connections per symbol (see that file). Accepted v1
 * tradeoff: no shared-store-by-symbol registry exists yet, and building one
 * is out of this task's scope.
 *
 * Crypto-only (Binance live feed) per spec — for a non-crypto asset class
 * this hook stays mounted (Rules of Hooks) but wires an inert TradeSource
 * that never subscribes/backfills, so no network activity and no alerts
 * fire. Futures note: FlowBinStore/onTrades are source-agnostic (every
 * TradeSource — Binance, Databento, NT8 — feeds the store through the exact
 * same applyTrades() path), so this hook WOULD work unmodified for futures
 * simply by resolving a futures TradeSource instead — that plumbing is
 * intentionally NOT built here (spec: "do not build NT8-specific
 * plumbing").
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AssetClass } from '@/components/backtest/symbolUniverse';
import { FlowBinStore } from '@/components/charting/orderflow/flowBinStore';
import { useOrderFlow } from '@/components/charting/orderflow/useOrderFlow';
import { resolveTradeSource } from '@/components/charting/orderflow/sourceRegistry';
import { getCryptoTickSize, refineCryptoTickSize } from '@/components/charting/orderflow/cryptoTickSizes';
import type { FlowCandleView, TradeSource } from '@/components/charting/orderflow/types';
import { intervalToSeconds, type ArenaInterval } from '../utils/intervals';
import { footprintSettingsToConfig, resolveEffectiveRowSize } from '../components/footprintSettings';
import { useFootprintPreferences } from './useFootprintPreferences';
import {
  DEFAULT_ORDER_FLOW_ALERT_SETTINGS,
  FALLBACK_BIG_TRADE_THRESHOLD_USD,
  OrderFlowAlertEngine,
  computeAutoBigTradeThresholdUsd,
  readOrderFlowAlertSettings,
  sanitizeOrderFlowAlertSettings,
  writeOrderFlowAlertSettings,
  type OrderFlowAlertEvent,
  type OrderFlowAlertSettings,
} from '../orderflow/orderFlowAlerts';

const RING_BUFFER_CAP = 50;

// Never subscribes/backfills — used to keep useOrderFlow's Rules-of-Hooks
// call unconditional while remaining a true no-op for non-crypto symbols.
const INERT_SOURCE: TradeSource = {
  venueId: 'inert',
  subscribe: () => () => {},
  backfill: async () => ({ trades: [], coveredFromMs: Date.now() }),
};

/**
 * Cheap proxy for "average bar range" (FlowBinStore.suggestRowSize's input)
 * derived from the alert store's OWN aggregated bins — this dedicated store
 * has no separate OHLC candlestick series to read from (unlike
 * CryptoFootprintBody, which gets `avgBarRange` from FinotaurChart's
 * onBarsLoad). Using the bin-price span (max - min binPrice) per candle as
 * the range proxy is coarser than a true high/low but converges to a
 * reasonable row size for imbalance-zone detection, which is all this store
 * is for.
 */
function estimateAvgBinRange(candles: readonly FlowCandleView[]): number {
  let sum = 0;
  let count = 0;
  for (const candle of candles) {
    if (candle.bins.length === 0) continue;
    let lo = Infinity;
    let hi = -Infinity;
    for (const bin of candle.bins) {
      if (bin.binPrice < lo) lo = bin.binPrice;
      if (bin.binPrice > hi) hi = bin.binPrice;
    }
    sum += hi - lo;
    count += 1;
  }
  return count > 0 ? sum / count : 0;
}

export interface UseOrderFlowAlertsResult {
  events: OrderFlowAlertEvent[];
  unseenCount: number;
  markAllSeen: () => void;
  settings: OrderFlowAlertSettings;
  updateSettings: (patch: Partial<OrderFlowAlertSettings>) => void;
  /** True when alerts are actually able to run for the current symbol (crypto only, v1). */
  active: boolean;
}

export function useOrderFlowAlerts(
  symbol: string,
  assetClass: AssetClass,
  interval: ArenaInterval,
): UseOrderFlowAlertsResult {
  const isCrypto = assetClass === 'crypto';

  const [settings, setSettings] = useState<OrderFlowAlertSettings>(() => readOrderFlowAlertSettings());
  const [events, setEvents] = useState<OrderFlowAlertEvent[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);

  const updateSettings = useCallback((patch: Partial<OrderFlowAlertSettings>) => {
    setSettings((prev) => {
      const next = sanitizeOrderFlowAlertSettings({ ...prev, ...patch });
      writeOrderFlowAlertSettings(next);
      return next;
    });
  }, []);

  const markAllSeen = useCallback(() => setUnseenCount(0), []);

  // Reuses the SAME persisted imbalance settings the Footprint tab's
  // FootprintSettingsDialog reads/writes for this symbol — "the user's
  // existing imbalance settings" per spec, not a second copy of the
  // ratio/stackedMin thresholds.
  const { settings: footprintSettings } = useFootprintPreferences(symbol);
  const footprintConfig = useMemo(() => footprintSettingsToConfig(footprintSettings), [footprintSettings]);

  const [tickSize, setTickSize] = useState<number>(() => getCryptoTickSize(symbol));
  useEffect(() => {
    if (!isCrypto) return;
    setTickSize(getCryptoTickSize(symbol));
    let cancelled = false;
    refineCryptoTickSize(symbol).then((refined) => {
      if (!cancelled) setTickSize(refined);
    });
    return () => {
      cancelled = true;
    };
  }, [symbol, isCrypto]);

  // One-shot-per-symbol row-size auto-suggestion — see estimateAvgBinRange's
  // doc comment for why this store derives it from its own bins instead of a
  // real OHLC series.
  const [suggestedRowSize, setSuggestedRowSize] = useState<number>(tickSize);
  const hasSuggestedRef = useRef(false);
  useEffect(() => {
    setSuggestedRowSize(tickSize);
    hasSuggestedRef.current = false;
  }, [symbol, tickSize]);

  const rowSize = resolveEffectiveRowSize(footprintSettings, tickSize, suggestedRowSize);
  const intervalSec = intervalToSeconds(interval);

  const source = useMemo<TradeSource>(() => {
    if (!isCrypto) return INERT_SOURCE;
    // resolveTradeSource('crypto', ...) never returns null (see its doc comment).
    return resolveTradeSource('crypto', symbol, { isAdmin: false })!.source;
  }, [isCrypto, symbol]);

  const { store } = useOrderFlow({
    symbol,
    intervalSec,
    rowSize,
    source,
    backfillBars: 40,
  });

  const engineRef = useRef(new OrderFlowAlertEngine());
  const autoThresholdRef = useRef(0);

  // Reset all per-symbol state (cooldowns, ring buffer, auto threshold) on
  // symbol change — alerts are scoped to "the currently-viewed crypto
  // symbol" per spec, never bleed across a symbol switch.
  useEffect(() => {
    engineRef.current.reset();
    autoThresholdRef.current = 0;
    setEvents([]);
    setUnseenCount(0);
  }, [symbol]);

  const pushEvents = useCallback((newEvents: OrderFlowAlertEvent[]) => {
    if (newEvents.length === 0) return;
    setEvents((prev) => [...newEvents, ...prev].slice(0, RING_BUFFER_CAP));
    setUnseenCount((n) => Math.min(RING_BUFFER_CAP, n + newEvents.length));
  }, []);

  // Store-change handler: row-size auto-suggestion refresh, auto big-trade
  // threshold refresh, and STACKED_IMBALANCE detection on the forming +
  // just-completed bar — all driven by the same store.onChange() signal
  // (fires once per applyTrades() batch, see flowBinStore.ts).
  useEffect(() => {
    if (!isCrypto) return;
    const unsub = store.onChange(() => {
      const range = store.getRange(0, Math.floor(Date.now() / 1000) + intervalSec);
      if (range.length === 0) return;

      if (!hasSuggestedRef.current && range.length >= 3) {
        const avg = estimateAvgBinRange(range);
        if (avg > 0) {
          hasSuggestedRef.current = true;
          const next = FlowBinStore.suggestRowSize([{ high: avg, low: 0 }], tickSize);
          setSuggestedRowSize((prev) => (next === prev ? prev : next));
        }
      }

      const latest = range[range.length - 1];
      const representativePrice = latest.poc ?? latest.bins[latest.bins.length - 1]?.binPrice ?? 0;
      const autoThreshold = computeAutoBigTradeThresholdUsd(range, representativePrice);
      if (autoThreshold > 0) autoThresholdRef.current = autoThreshold;

      if (!settings.enabled || !settings.stackedImbalanceEnabled) return;
      // Forming bar + the one just before it — "completed or forming bar" per spec.
      const toCheck = range.slice(-2);
      const newEvents = toCheck.flatMap((candle) =>
        engineRef.current.processCandle(symbol, candle, rowSize, footprintConfig),
      );
      pushEvents(newEvents);
    });
    return unsub;
  }, [
    store,
    isCrypto,
    settings.enabled,
    settings.stackedImbalanceEnabled,
    symbol,
    rowSize,
    footprintConfig,
    intervalSec,
    tickSize,
    pushEvents,
  ]);

  // Raw-trade-batch handler — BIG_TRADE detection, gated separately from the
  // onChange handler above since it needs per-trade data (see
  // flowBinStore.ts's onTrades doc comment for why this seam exists).
  useEffect(() => {
    if (!isCrypto || !settings.enabled || !settings.bigTradeEnabled) return;
    const unsub = store.onTrades((trades) => {
      const threshold =
        settings.bigTradeThresholdUsd ?? (autoThresholdRef.current > 0 ? autoThresholdRef.current : FALLBACK_BIG_TRADE_THRESHOLD_USD);
      const newEvents = engineRef.current.processTradeBatch(symbol, trades, threshold, intervalSec);
      pushEvents(newEvents);
    });
    return unsub;
  }, [store, isCrypto, settings.enabled, settings.bigTradeEnabled, settings.bigTradeThresholdUsd, symbol, intervalSec, pushEvents]);

  return { events, unseenCount, markAllSeen, settings, updateSettings, active: isCrypto };
}
