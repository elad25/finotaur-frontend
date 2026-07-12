/**
 * Trading Arena — Chart tab (plain candlestick chart)
 *
 * Layout: two-pane flex row.
 *   Left  — FinotaurChart, routed through the shared data-source router
 *            (`pickDataSource` in src/components/charting/dataSources) —
 *            crypto → BinanceSource, our 14 cached futures roots →
 *            DatabentoCacheSource, everything else (stocks/forex/uncached
 *            futures) → YahooFinanceSource. Indicators come from the
 *            `indicators` prop — a single source of truth held in
 *            TradingArena.tsx (ArenaToolbar's Indicators ▾ picker), shared
 *            across tabs so switching tabs keeps the same selection.
 *   Right — Resizable (280-560 px, default 320 px) PaperTradeRail
 *            (paper-trading panel driven by live tick price from
 *            useBinanceOrderBook), crypto only. Non-crypto renders the chart
 *            full-width instead. Width is dragged via a handle on its left
 *            border and persisted to localStorage.
 *
 * useBinanceOrderBook is called unconditionally (rules of hooks). For non-crypto
 * symbols it connects to Binance with a malformed pair and will sit in 'error'
 * or 'connecting' state — livePrice stays null, which disables the rail (the
 * rail itself isn't rendered for non-crypto anyway — see the render below).
 *
 * Non-crypto data (Databento cache / Yahoo) may be delayed relative to a live
 * tick feed — a small "Delayed data" badge is shown near the top of the chart
 * pane whenever the active symbol isn't crypto.
 *
 * This tab is intentionally a PLAIN chart (2026-07 restructure) — no order
 * flow / footprint overlay, no CVD/Delta sub-panes, no depth-matrix heatmap,
 * EXCEPT for two opt-in S1 "Arena WOW week" additions (both default OFF /
 * safe no-ops unless the user turns them on via Chart ▾ → Chart Settings):
 *
 *  1. Session Volume Profile (ATAS-style, multi-session, OHLCV-bar-derived —
 *     see sessionVolumeProfile.ts). Reads `chartStyle.volumeProfile` from
 *     ChartStyleContext and threads it into FinotaurChart's
 *     `sessionVolumeProfile` prop. Works for every asset class — it only
 *     needs the OHLCV bars the chart already fetches, no new data feed.
 *
 *  2. `footprintOnZoom` (ATAS "Auto transform candles to footprint"): when
 *     the user turns this on, zooming in far enough reveals footprint cells
 *     over the candles, same auto-transform threshold idea as the Footprint
 *     tab. CRYPTO ONLY in this PR — see ChartTabFootprintOnZoomBody below for
 *     why futures is deliberately deferred rather than half-wired. Off
 *     (default) is a complete no-op: no useOrderFlow hook mounts, no socket
 *     opens, this tab's plain-chart contract is unchanged.
 */

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FinotaurChart } from '@/components/charting/FinotaurChart';
import {
  pickDataSource,
  isCryptoSymbol,
  isDatabentoCachedSymbol,
  toBinanceSymbol,
  toDatabentoCacheSymbol,
  toYahooSymbol,
} from '@/components/charting/dataSources';
import { AggregatingSource } from '@/components/charting/dataSources/AggregatingSource';
import type { ChartDataSource, Indicator, Interval } from '@/components/charting/types';
import { useBinanceOrderBook } from '@/pages/app/crypto/scanner/useBinanceOrderBook';
import { PaperTradeRail } from '../components/PaperTradeRail';
import {
  resolveIntervalPlan,
  intervalToSeconds,
  type ArenaInterval,
  type CandleSourceKind,
} from '../utils/intervals';
import { ChartStyleContext, DEFAULT_CHART_STYLE } from '../components/chartStyleSettings';
import type { SessionVolumeProfileRenderSettings } from '@/components/charting/orderflow/SessionVolumeProfileLayer';
import { resolveTradeSource } from '@/components/charting/orderflow/sourceRegistry';
import { refineCryptoTickSize } from '@/components/charting/orderflow/cryptoTickSizes';
import { useOrderFlow } from '@/components/charting/orderflow/useOrderFlow';
import { footprintSettingsToConfig, DEFAULT_FOOTPRINT_SETTINGS } from '../components/footprintSettings';

interface ChartTabProps {
  symbol: string;
  interval: ArenaInterval;
  /** Detected asset class for the current symbol. Controls chart source and rail enabled state. */
  assetClass: string;
  /** Active indicator overlays — single source of truth lives in TradingArena.tsx. */
  indicators: Indicator[];
}

// Rolling 24-hour window for the chart (from = now − 24h, to = now).
function nowWindow(): { from: number; to: number } {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 24 * 60 * 60;
  return { from, to };
}

// ── Resizable right rail (Task 1) ────────────────────────────────────────
const RAIL_MIN_WIDTH = 280;
const RAIL_MAX_WIDTH = 560;
const RAIL_DEFAULT_WIDTH = 320;
const RAIL_WIDTH_STORAGE_KEY = 'arena-rail-width';

function clampRailWidth(width: number): number {
  return Math.min(RAIL_MAX_WIDTH, Math.max(RAIL_MIN_WIDTH, width));
}

// Lazy initializer — localStorage access is guarded since it can throw
// (privacy mode, disabled storage, etc.).
function readStoredRailWidth(): number {
  try {
    const stored = localStorage.getItem(RAIL_WIDTH_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed)) return clampRailWidth(parsed);
    }
  } catch {
    // localStorage unavailable — fall back to the default width.
  }
  return RAIL_DEFAULT_WIDTH;
}

export function ChartTab({ symbol, interval, assetClass, indicators }: ChartTabProps) {
  const { from, to } = useMemo(nowWindow, [symbol, interval]);

  const isCrypto = assetClass === 'crypto';

  // Chart ▾ Chart Settings (see chartStyleSettings.ts) — read directly via
  // context (ChartTab sits inside TradingArena.tsx's ChartStyleContext.Provider)
  // rather than threading a prop through TradingArena/ArenaToolbar, mirroring
  // how FinotaurChart itself falls back to this same context. Falls back to
  // DEFAULT_CHART_STYLE outside the provider tree (shouldn't happen in
  // practice — ChartTab only ever renders inside it — but keeps this
  // component safe to unit-test/render in isolation).
  const chartStyle = useContext(ChartStyleContext) ?? DEFAULT_CHART_STYLE;

  // Session Volume Profile render settings — pure derivation, memoized so
  // FinotaurChart/SessionVolumeProfileLayer's recompute-gating (keyed on
  // settings field identity, not object identity) doesn't see a new object
  // every render for no reason.
  const sessionVolumeProfileSettings: SessionVolumeProfileRenderSettings = useMemo(() => ({
    period: chartStyle.volumeProfile.period,
    timezone: chartStyle.timezone,
    customSessionStart: chartStyle.volumeProfile.customSessionStart,
    customSessionEnd: chartStyle.volumeProfile.customSessionEnd,
    showVpoc: chartStyle.volumeProfile.showVpoc,
    showVahVal: chartStyle.volumeProfile.showVahVal,
    profileWidthPct: chartStyle.volumeProfile.profileWidthPct,
    opacity: chartStyle.volumeProfile.opacity,
  }), [chartStyle.volumeProfile, chartStyle.timezone]);

  // footprintOnZoom (Auto-transform to footprint) is CRYPTO-ONLY in this PR —
  // see the file header comment. Disabled for every other asset class even
  // if the setting happens to be on (e.g. user enabled it on a crypto symbol,
  // then switched to a stock) — falls straight back to the plain chart path.
  const footprintOnZoomActive = chartStyle.footprintOnZoom && isCrypto;

  // ── Data-source routing (Task A) — resolves via the shared router
  // (pickDataSource) rather than reimplementing crypto/futures-cache/Yahoo
  // branching here. `symbol` arrives already source-native for its asset
  // class (TradingArena.tsx normalizes crypto to Binance pairs; futures/
  // forex/stocks come pre-resolved from SymbolAutocomplete's SYMBOL_UNIVERSE,
  // e.g. "MNQ=F", "EURUSD=X") — the per-branch mapper calls below are
  // idempotent passthroughs in that case and only do real work for symbols
  // that arrive in a raw/contract-code form.
  const { chartDataSource, chartSymbol, chartInterval } = useMemo(() => {
    const source = pickDataSource(symbol);
    let resolvedSymbol: string;
    let kind: CandleSourceKind;
    if (isCryptoSymbol(symbol)) {
      resolvedSymbol = toBinanceSymbol(symbol) ?? symbol;
      kind = 'binance';
    } else if (isDatabentoCachedSymbol(symbol)) {
      resolvedSymbol = toDatabentoCacheSymbol(symbol) ?? symbol;
      kind = 'databento';
    } else {
      resolvedSymbol = toYahooSymbol(symbol, assetClass) ?? symbol;
      kind = 'yahoo';
    }

    // Native-vs-aggregate resolution (see utils/intervals.ts) — arbitrary
    // ArenaInterval values (custom timeframes included) that the resolved
    // source can't serve directly are wrapped in AggregatingSource, binning
    // client-side from the finest native base.
    const plan = resolveIntervalPlan(kind, interval);
    const resolvedDataSource = plan.kind === 'native'
      ? source
      : new AggregatingSource(source, plan.targetSeconds, plan.baseInterval);
    const resolvedInterval = plan.kind === 'native' ? plan.interval : plan.baseInterval;

    return {
      chartDataSource: resolvedDataSource,
      chartSymbol: resolvedSymbol,
      chartInterval: resolvedInterval,
    };
  }, [symbol, assetClass, interval]);

  // Always called unconditionally (hooks rule). For non-crypto, the symbol
  // won't match a Binance pair — lastPrice will stay null, disabling the rail.
  const book = useBinanceOrderBook(symbol);
  const livePrice = book.lastPrice;

  // Best bid/ask for the order-entry panel's "Buy Bid" / "Sell Ask" limit
  // orders. useBinanceOrderBook keeps the full depth book in a ref (no
  // per-message re-render — see that hook's header comment), so we read the
  // top of book via its getBook() accessor and recompute whenever the
  // (1x/sec-throttled) lastPrice ticks.
  const { bid, ask } = useMemo(() => {
    const { bids, asks } = book.getBook();
    let bestBid: number | null = null;
    for (const p of bids.keys()) {
      if (bestBid === null || p > bestBid) bestBid = p;
    }
    let bestAsk: number | null = null;
    for (const p of asks.keys()) {
      if (bestAsk === null || p < bestAsk) bestAsk = p;
    }
    return { bid: bestBid, ask: bestAsk };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.getBook, livePrice]);

  // ── Resizable right rail (Task 1) ──────────────────────────────────────
  const [railWidth, setRailWidth] = useState<number>(readStoredRailWidth);
  const [isDraggingRail, setIsDraggingRail] = useState(false);
  const dragStartRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const railWidthRef = useRef(railWidth);
  railWidthRef.current = railWidth;

  const handleRailHandleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragStartRef.current = { startX: e.clientX, startWidth: railWidth };
      setIsDraggingRail(true);
    },
    [railWidth],
  );

  useEffect(() => {
    if (!isDraggingRail) return;

    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      // Rail is on the right — dragging the handle LEFT (clientX decreases)
      // should INCREASE the rail width.
      const next = clampRailWidth(start.startWidth + (start.startX - e.clientX));
      setRailWidth(next);
    };

    const handleMouseUp = () => {
      setIsDraggingRail(false);
      try {
        localStorage.setItem(RAIL_WIDTH_STORAGE_KEY, String(railWidthRef.current));
      } catch {
        // localStorage unavailable — width just won't persist across reloads.
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDraggingRail]);

  return (
    <div className="flex flex-1 min-h-0 w-full">
      {/* Chart pane */}
      <div className="relative flex flex-1 min-w-0 flex-col">
        <div className="relative flex-1 min-h-0">
          {!isCrypto && (
            <div
              className="absolute left-2 top-2 z-30 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                color: '#C9A646',
                background: 'rgba(201,166,70,0.12)',
                border: '1px solid rgba(201,166,70,0.28)',
              }}
              title="This symbol's data comes from a cached/delayed feed, not a live tick stream."
            >
              Delayed data
            </div>
          )}
          {footprintOnZoomActive ? (
            <ChartTabFootprintOnZoomBody
              chartSymbol={chartSymbol}
              chartInterval={chartInterval}
              intervalSec={intervalToSeconds(interval)}
              from={from}
              to={to}
              chartDataSource={chartDataSource}
              indicators={indicators}
              sessionVolumeProfile={{ settings: sessionVolumeProfileSettings, visible: chartStyle.volumeProfile.enabled }}
            />
          ) : (
            <FinotaurChart
              symbol={chartSymbol}
              interval={chartInterval}
              from={from}
              to={to}
              dataSource={chartDataSource}
              indicators={indicators}
              theme="dark"
              height="100%"
              sessionVolumeProfile={{ settings: sessionVolumeProfileSettings, visible: chartStyle.volumeProfile.enabled }}
            />
          )}
        </div>
      </div>

      {/* Paper-trading rail (crypto only — driven by useBinanceOrderBook's
          live tick price, which has nothing to feed for non-crypto symbols).
          Non-crypto renders the chart pane full-width instead — no broken
          placeholder rail. */}
      {isCrypto && (
        <>
          {/* Drag handle — resizes the paper-trading rail (280-560 px). */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
            onMouseDown={handleRailHandleMouseDown}
            className={`w-1.5 flex-shrink-0 cursor-col-resize transition-colors ${
              isDraggingRail ? 'bg-[#C9A646]/60' : 'bg-transparent hover:bg-[#C9A646]/30'
            }`}
          />

          <div
            className="flex-shrink-0 border-l border-white/10 bg-[#0A0A0A] overflow-y-auto"
            style={{ width: railWidth }}
          >
            <PaperTradeRail
              key={symbol}
              symbol={symbol}
              livePrice={livePrice}
              bid={bid}
              ask={ask}
              enabled={isCrypto}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Crypto footprintOnZoom bridge (S1 "Arena WOW week") ────────────────────
//
// Lazily wires the order-flow store ONLY while footprintOnZoom is on AND the
// symbol is crypto (mirrors FootprintTab.tsx's CryptoFootprintBody bridging,
// intentionally lighter-weight — no auto-suggested row size, no CVD/Delta
// sub-panes, no per-tab settings persistence; this is a secondary opt-in on
// an otherwise-plain tab, not the dedicated Order Flow surface). Only ever
// MOUNTED by ChartTab when footprintOnZoomActive is true — unmounting tears
// down useOrderFlow's subscription via its own effect cleanup, so turning
// footprintOnZoom off (or switching off crypto) opens zero sockets/fetches,
// per spec. Row size uses the raw (auto-refined) tick size directly — no
// FlowBinStore.suggestRowSize auto-suggestion — a deliberate simplification
// for this secondary bridge; the auto-suggested-row-size machinery lives on
// the dedicated Footprint tab.
//
// FUTURES DEFERRAL (flagged, not silently dropped): the task spec asks for
// "assetClass has tick data (crypto; futures when its flow source is
// available)". ChartTab.tsx has zero existing futures trade-source
// scaffolding — NT8/Databento bridging lives entirely in FootprintTab.tsx's
// FuturesFootprintBody / FuturesNt8FootprintBody, which are considerably
// more involved (contract rollover, admin gating, NT8 bridge connection
// status). Wiring that into this "intentionally plain" tab is materially
// larger scope than this bridge; deferred as a follow-up rather than
// half-implemented here. ChartSettingsMenu.tsx already disables the toggle
// with a "Requires tick data" hint for non-crypto asset classes, so futures
// users see an honest disabled control today, not a broken feature.
const CHART_TAB_FOOTPRINT_ON_ZOOM_CONFIG = footprintSettingsToConfig(DEFAULT_FOOTPRINT_SETTINGS);

interface ChartTabFootprintOnZoomBodyProps {
  chartSymbol: string;
  chartInterval: Interval;
  intervalSec: number;
  from: number;
  to: number;
  chartDataSource: ChartDataSource;
  indicators: Indicator[];
  sessionVolumeProfile: { settings: SessionVolumeProfileRenderSettings; visible: boolean };
}

function ChartTabFootprintOnZoomBody({
  chartSymbol,
  chartInterval,
  intervalSec,
  from,
  to,
  chartDataSource,
  indicators,
  sessionVolumeProfile,
}: ChartTabFootprintOnZoomBodyProps) {
  // resolveTradeSource('crypto', ...) never returns null (see its doc comment).
  const { source: tradeSource, tickSize: staticTickSize } = resolveTradeSource('crypto', chartSymbol, { isAdmin: false })!;

  // Same async-refine pattern as FootprintTab.tsx's CryptoFootprintBody: start
  // from the sync hardcoded-map default, upgrade once Binance's live
  // exchangeInfo resolves.
  const [tickSize, setTickSize] = useState<number>(staticTickSize);
  useEffect(() => {
    setTickSize(staticTickSize);
    let cancelled = false;
    refineCryptoTickSize(chartSymbol).then((refined) => {
      if (!cancelled) setTickSize(refined);
    });
    return () => {
      cancelled = true;
    };
  }, [chartSymbol, staticTickSize]);

  const { store } = useOrderFlow({
    symbol: chartSymbol,
    intervalSec,
    rowSize: tickSize,
    source: tradeSource,
    backfillBars: 40,
  });

  return (
    <FinotaurChart
      symbol={chartSymbol}
      interval={chartInterval}
      from={from}
      to={to}
      dataSource={chartDataSource}
      indicators={indicators}
      theme="dark"
      height="100%"
      footprint={{
        store,
        config: CHART_TAB_FOOTPRINT_ON_ZOOM_CONFIG,
        visible: true,
      }}
      sessionVolumeProfile={sessionVolumeProfile}
    />
  );
}
