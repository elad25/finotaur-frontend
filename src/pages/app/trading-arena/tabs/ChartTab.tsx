/**
 * Trading Arena — Chart tab (plain candlestick chart)
 *
 * Layout: two-pane flex row.
 *   Left  — FinotaurChart, routed through the shared data-source router
 *            (`pickDataSource` in src/components/charting/dataSources) —
 *            crypto → BinanceSource, our 14 cached futures roots →
 *            DatabentoCacheSource wrapped in DatabentoYahooFallbackSource
 *            (the cache never covers the last ~24-30h under the CME
 *            license, and this tab always requests a rolling now-24h→now
 *            window — the wrapper falls back to Yahoo for that gap, same
 *            as TradeChart.tsx), everything else (stocks/forex/uncached
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
 * EXCEPT for two S1 "Arena WOW week" additions (Volume Profile default ON,
 * footprint-on-zoom default ON but only visible after zoom-in /
 * safe no-ops unless the user turns them on via Chart ▾ → Chart Settings):
 *
 *  1. Session Volume Profile (ATAS-style, multi-session, OHLCV-bar-derived —
 *     see sessionVolumeProfile.ts). Its detail params (period/custom
 *     session/vPOC/VAH-VAL/width/opacity) still read `chartStyle.volumeProfile`
 *     from ChartStyleContext, but VISIBILITY is now the `volumeProfileEnabled`
 *     prop (single source of truth: TradingArena's
 *     `indicatorsEnabled.volumeProfile`, edited from the Indicators popup —
 *     see indicatorsSettings.ts). Works for every asset class — it only
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
import { Info } from 'lucide-react';
import { FinotaurChart } from '@/components/charting/FinotaurChart';
import {
  pickDataSource,
  isCryptoSymbol,
  isDatabentoCachedSymbol,
  toBinanceSymbol,
  toDatabentoCacheSymbol,
  toYahooSymbol,
  DatabentoYahooFallbackSource,
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
import type { FootprintDetailLevel } from '@/components/charting/orderflow/footprintRender';

interface ChartTabProps {
  symbol: string;
  interval: ArenaInterval;
  /** Detected asset class for the current symbol. Controls chart source and rail enabled state. */
  assetClass: string;
  /** Active indicator overlays — single source of truth lives in TradingArena.tsx. */
  indicators: Indicator[];
  /**
   * Session Volume Profile is now modeled as an "indicator" toggle (see
   * indicatorsSettings.ts's ArenaIndicatorEnabled.volumeProfile), edited
   * from the Indicators popup rather than Chart ▾ → Chart Settings. This
   * replaces the old `chartStyle.volumeProfile.enabled` gate — that field
   * still exists on ChartStyleSettings but is no longer read for visibility.
   */
  volumeProfileEnabled: boolean;
  onOpenSettings?: () => void;
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

// ── "Delayed data" badge (non-crypto only) ──────────────────────────────
// Clickable badge that opens a small anchored info popover explaining the
// delayed-data model and how to get real-time data (NT8 desktop bridge,
// DOM/Footprint tabs → Connect). Outside-click/Escape idiom mirrors
// LiquiditySettingsMenu.tsx / ToolbarTrigger.tsx elsewhere in the Arena — no
// new deps, no portal.
function DelayedDataBadge() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="absolute left-2 top-2 z-30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors"
        style={{
          color: '#C9A646',
          background: 'rgba(201,166,70,0.12)',
          border: '1px solid rgba(201,166,70,0.28)',
        }}
      >
        Delayed data
        <Info className="h-2.5 w-2.5" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-[calc(100%+6px)] w-[320px] rounded-lg p-3 text-[11px] leading-relaxed text-[#C0C0C0] shadow-lg"
          style={{ background: '#0D0D0F', border: '1px solid rgba(201,166,70,0.25)' }}
        >
          <p className="mb-1.5 text-[12px] font-semibold text-[#E8E8E8]">Delayed market data</p>
          <p className="mb-2">
            FINOTAUR futures charts use delayed exchange data (intraday via a delayed continuous
            feed; full history up to the prior session).
          </p>
          <p className="mb-1.5 font-semibold text-[#E8E8E8]">Want real-time?</p>
          <p className="mb-2">
            Real-time futures data requires your own market-data subscription — exchanges bill this
            per user, so it can&apos;t be included in the platform.
          </p>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              Connect your NinjaTrader desktop feed (DOM &amp; Footprint tabs → Connect) — your data
              stays on your machine.
            </li>
            <li>Make sure a live market-data subscription is active in your broker account.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export function ChartTab({ symbol, interval, assetClass, indicators, volumeProfileEnabled, onOpenSettings }: ChartTabProps) {
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
    let resolvedSymbol: string;
    let kind: CandleSourceKind;
    let source: ChartDataSource;
    if (isCryptoSymbol(symbol)) {
      resolvedSymbol = toBinanceSymbol(symbol) ?? symbol;
      kind = 'binance';
      source = pickDataSource(symbol);
    } else if (isDatabentoCachedSymbol(symbol)) {
      resolvedSymbol = toDatabentoCacheSymbol(symbol) ?? symbol;
      kind = 'databento';
      // Databento's CME license only ever serves bars whose end is >=24h old
      // (daily ingest can lag further), so this tab's rolling "now-24h → now"
      // window NEVER has cache coverage for the newest bars — the RPC would
      // return [] and the chart would show "No bars in window". Wrap in the
      // same Yahoo fallback TradeChart.tsx uses so recent bars still render
      // via Yahoo's near-real-time continuous-front feed; historical/covered
      // ranges keep using the Databento cache transparently.
      const yahooFallback = toYahooSymbol(symbol, assetClass);
      source = yahooFallback
        ? new DatabentoYahooFallbackSource(yahooFallback, Math.floor(Date.now() / 1000))
        : pickDataSource(symbol);
    } else {
      resolvedSymbol = toYahooSymbol(symbol, assetClass) ?? symbol;
      kind = 'yahoo';
      source = pickDataSource(symbol);
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
    <div className="flex flex-1 min-h-0 w-full" onDoubleClick={onOpenSettings}>
      {/* Chart pane */}
      <div className="relative flex flex-1 min-w-0 flex-col">
        <div className="relative flex-1 min-h-0">
          {!isCrypto && <DelayedDataBadge />}
          {footprintOnZoomActive ? (
            <ChartTabFootprintOnZoomBody
              chartSymbol={chartSymbol}
              chartInterval={chartInterval}
              intervalSec={intervalToSeconds(interval)}
              from={from}
              to={to}
              chartDataSource={chartDataSource}
              indicators={indicators}
              sessionVolumeProfile={{ settings: sessionVolumeProfileSettings, visible: volumeProfileEnabled }}
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
              showRefocusButton
              sessionVolumeProfile={{ settings: sessionVolumeProfileSettings, visible: volumeProfileEnabled }}
            />
          )}
        </div>
      </div>

      {/* Drag handle — keeps the paper-trading rail visible in every symbol mode. */}
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
          disabledTitle="Live order entry unavailable"
          disabledDescription="Switch to a crypto symbol to enable paper trading on the chart."
        />
      </div>
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

  // Candle dimming: mirror FuturesChartTab.tsx's zoom-driven stage — the
  // footprint's own zoom-gated auto-transform (hidden → shaded → full) is
  // what drives this here (no forceFullDetail on this bridge), so at wide
  // zoom the candles stay full and only reduce to the thin ATAS skeleton
  // once cells are actually showing.
  const [footprintStage, setFootprintStage] = useState<FootprintDetailLevel>('hidden');
  const mutedCandles = footprintStage === 'full' || footprintStage === 'shaded';

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
      showRefocusButton
      footprint={{
        store,
        config: CHART_TAB_FOOTPRINT_ON_ZOOM_CONFIG,
        visible: true,
        onStageChange: setFootprintStage,
      }}
      sessionVolumeProfile={sessionVolumeProfile}
      mutedCandles={mutedCandles}
    />
  );
}
