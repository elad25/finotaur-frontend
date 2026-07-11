/**
 * Trading Arena — Chart tab
 *
 * Layout: two-pane flex row.
 *   Left  — FinotaurChart, routed through the shared data-source router
 *            (`pickDataSource` in src/components/charting/dataSources) —
 *            crypto → BinanceSource, our 14 cached futures roots →
 *            DatabentoCacheSource, everything else (stocks/forex/uncached
 *            futures) → YahooFinanceSource. Order Flow controls above it and
 *            optional CVD/Delta sub-panes below it (crypto only — see below).
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
 * Order Flow (Phase 3 integration): zoom-driven progressive disclosure on
 * THIS chart — not a separate mode. One BinanceTradeSource + useOrderFlow
 * hook per mount; rowSize auto-suggested from recently loaded bars and
 * adjustable via the row-density control (×2/×4 widen the suggested rowSize).
 * See src/components/charting/orderflow/ for the underlying engine.
 * Order flow, CVD/Delta and the depth heatmap are crypto-only (no live trades
 * feed for other asset classes) — useOrderFlow is fed a NOOP_TRADE_SOURCE for
 * non-crypto symbols so no Binance WebSocket ever opens for a non-crypto
 * ticker (the OrderFlowControls cluster itself is disabled with a tooltip for
 * non-crypto — see ArenaToolbar.tsx's `chartControlsDisabled` prop).
 *
 * Non-crypto data (Databento cache / Yahoo) may be delayed relative to a live
 * tick feed — a small "Delayed data" badge is shown near the top of the chart
 * pane whenever the active symbol isn't crypto.
 *
 * Heatmap toggle (Bookmap-style liquidity heatmap, Phase 4): reuses
 * DepthMatrixLayer + useDepthSlices EXACTLY as wired in MarketScanner.tsx —
 * not rebuilt. The Arena hardcodes the scanner's floor/size-filter defaults
 * (no floor/size-filter UI here; the scanner owns that control surface) and
 * does NOT seed 72h wall history (fetchWallsHistory) — that seeds the
 * WallHeatLayer wall-stripe feature, which the Arena doesn't use. See the
 * TODOs below for what was intentionally left out.
 *
 * Layer z-order (heatmap + footprint + volume profile can all be on at once):
 *   DepthMatrixLayer (heatmap)   z-index  5  — BELOW candles (as in the scanner)
 *   candlestick series           (base chart canvas, paints above z-index 5)
 *   VolumeProfileLayer           z-index 14  — above candles
 *   FootprintLayer               z-index 15  — above candles, above the profile
 *   marker icons                 z-index 20  — topmost
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { Indicator, Interval } from '@/components/charting/types';
import { useBinanceOrderBook } from '@/pages/app/crypto/scanner/useBinanceOrderBook';
import { useDepthSlices } from '@/pages/app/crypto/scanner/useDepthSlices';
import { BinanceTradeSource } from '@/components/charting/orderflow/BinanceTradeSource';
import { useOrderFlow } from '@/components/charting/orderflow/useOrderFlow';
import { FlowBinStore } from '@/components/charting/orderflow/flowBinStore';
import { DEFAULT_FOOTPRINT_CONFIG, type TradeSource } from '@/components/charting/orderflow/types';
import { resolveImbalancePreset, type FootprintDetailLevel } from '@/components/charting/orderflow/footprintRender';
import { PaperTradeRail } from '../components/PaperTradeRail';
import {
  type OrderFlowControlsState,
  type RowDensity,
} from '../components/OrderFlowControls';
import { CvdSubPane, DeltaSubPane } from '../components/CvdDeltaSubPanes';
import {
  intervalToSeconds,
  resolveIntervalPlan,
  type ArenaInterval,
  type CandleSourceKind,
} from '../utils/intervals';

interface ChartTabProps {
  symbol: string;
  interval: ArenaInterval;
  /** Detected asset class for the current symbol. Controls chart source and rail enabled state. */
  assetClass: string;
  /** Order Flow controls — lifted up to TradingArena (rendered in the Arena
   *  toolbar's "Chart ▾" dropdown), passed down here as a controlled prop. */
  controls: OrderFlowControlsState;
  onControlsChange: (next: OrderFlowControlsState) => void;
}

// Non-crypto symbols have no live trades feed — this inert TradeSource
// satisfies useOrderFlow's unconditional hook call (rules of hooks) without
// ever opening a Binance WebSocket for a non-crypto ticker.
const NOOP_TRADE_SOURCE: TradeSource = {
  subscribe: () => () => {},
  backfill: async () => ({ trades: [], coveredFromMs: 0 }),
};

// Default indicators rendered in the arena chart.
const DEFAULT_INDICATORS: Indicator[] = [
  { type: 'EMA', period: 50 },
  { type: 'RSI', period: 14 },
];

// Rolling 24-hour window for the chart (from = now − 24h, to = now).
function nowWindow(): { from: number; to: number } {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 24 * 60 * 60;
  return { from, to };
}

/**
 * Native-vs-aggregate resolution for the candlestick series moved to
 * ../utils/intervals.ts's `resolveIntervalPlan` — supports the full
 * arbitrary ArenaInterval space (custom timeframes included), replacing the
 * old fixed-ARENA_INTERVALS `nearestSupportedInterval` snap-to-nearest guard.
 * `intervalToMs` stays local — only DepthMatrixLayer's candle-width mapping
 * needs milliseconds.
 */
function intervalToMs(interval: ArenaInterval): number {
  return intervalToSeconds(interval) * 1000;
}

// Binance klines used by useKlineDelta (CVD/Delta sub-panes) only understand
// a small fixed set of native intervals — custom/aggregated timeframes hide
// those sub-panes rather than erroring (see `klineDeltaInterval` below).
const KLINE_DELTA_NATIVE: Interval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

// ── Heatmap defaults (Task 2) ────────────────────────────────────────────
// MarketScanner exposes floor/size-filter as user-adjustable controls (its
// own dedicated toolbar). The Arena's Chart tab does NOT rebuild that UI —
// per the task scope, these are hardcoded to the scanner's own defaults.
// TODO(heatmap-controls): if traders ask for floor/size-filter adjustment
// in the Arena, add a compact control here rather than porting the
// scanner's full toolbar.
const HEATMAP_FLOOR_USD = 1_000;
const HEATMAP_SIZE_FILTER_PCT = 5 as const;
// Conservative default bar-spacing estimate — DepthMatrixLayer/useDepthSlices
// only uses this to pick the 5s vs 1m resolution tier; the scanner passes the
// same conservative constant (see MarketScanner.tsx APPROX_BAR_SPACING_PX).
const HEATMAP_APPROX_BAR_SPACING_PX = 8;

/** Row-density multiplier applied on top of FlowBinStore.suggestRowSize(). */
function densityMultiplier(density: RowDensity): number {
  if (density === 'x2') return 2;
  if (density === 'x4') return 4;
  return 1;
}

// Fallback tick size when no bars are loaded yet — matches FlowBinStore's
// own minimum-tick floor so suggestRowSize never divides by zero.
const FALLBACK_TICK_SIZE = 0.01;

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

export function ChartTab({ symbol, interval, assetClass, controls, onControlsChange }: ChartTabProps) {
  const { from, to } = useMemo(nowWindow, [symbol, interval]);

  const isCrypto = assetClass === 'crypto';

  // ── Data-source routing (Task A) — resolves via the shared router
  // (pickDataSource) rather than reimplementing crypto/futures-cache/Yahoo
  // branching here. `symbol` arrives already source-native for its asset
  // class (TradingArena.tsx normalizes crypto to Binance pairs; futures/
  // forex/stocks come pre-resolved from SymbolAutocomplete's SYMBOL_UNIVERSE,
  // e.g. "MNQ=F", "EURUSD=X") — the per-branch mapper calls below are
  // idempotent passthroughs in that case and only do real work for symbols
  // that arrive in a raw/contract-code form.
  const { chartDataSource, chartSymbol, chartInterval, klineDeltaInterval } = useMemo(() => {
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

    // Binance klines (useKlineDelta, the CVD/Delta sub-panes) only understand
    // a small fixed set of native intervals — null hides those sub-panes for
    // custom/aggregated timeframes rather than erroring (see ChartTab render
    // below / KLINE_DELTA_NATIVE above).
    const klineInterval = kind === 'binance' && plan.kind === 'native' && KLINE_DELTA_NATIVE.includes(plan.interval)
      ? plan.interval
      : null;

    return {
      chartDataSource: resolvedDataSource,
      chartSymbol: resolvedSymbol,
      chartInterval: resolvedInterval,
      klineDeltaInterval: klineInterval,
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
  // (1x/sec-throttled) lastPrice ticks — the same trade-off useDepthSlices
  // makes just above for the heatmap feed.
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

  // ── Row size: auto-suggested from the loaded window's average PER-BAR
  // high/low range, refined on each bar load (onBarsLoad below), adjusted by
  // the density multiplier. FinotaurChart's onBarsLoad reports avgBarRange —
  // the average (high - low) across the individual loaded bars — separately
  // from the window-spanning high/low extremes, so suggestRowSize (which
  // expects a PER-BAR range, per its TradingView-convention doc comment)
  // isn't fed one giant synthetic bar spanning the whole window (that
  // produced price bins orders of magnitude too coarse — 1-3 bins per bar).
  const [suggestedRowSize, setSuggestedRowSize] = useState<number>(FALLBACK_TICK_SIZE);

  const handleBarsLoad = useCallback(
    (range: { high: number; low: number; avgBarRange: number } | null) => {
      if (!range) return;
      // suggestRowSize takes a bars array and averages (high - low) across
      // it. Feeding it a single {high: avgBarRange, low: 0} bar reproduces
      // exactly avgRange = avgBarRange without changing suggestRowSize's
      // contract (which real bar arrays elsewhere still rely on).
      const next = FlowBinStore.suggestRowSize(
        [{ high: range.avgBarRange, low: 0 }],
        FALLBACK_TICK_SIZE,
      );
      setSuggestedRowSize(next);
    },
    [],
  );

  const rowSize = Math.max(suggestedRowSize, FALLBACK_TICK_SIZE) * densityMultiplier(controls.rowDensity);
  const intervalSec = intervalToSeconds(interval);

  // ── Order flow data: one BinanceTradeSource + useOrderFlow per mount ────
  // Non-crypto gets NOOP_TRADE_SOURCE — no live trades feed exists for those
  // asset classes, so no Binance WebSocket ever opens for a non-crypto symbol.
  const { store, status, backfillCoveredFromSec } = useOrderFlow({
    symbol,
    intervalSec,
    rowSize,
    source: isCrypto ? BinanceTradeSource : NOOP_TRADE_SOURCE,
    backfillBars: 40,
  });

  const orderFlowActive = isCrypto && controls.enabled;
  const volumeProfileActive = isCrypto && controls.showVolumeProfile;
  const heatmapActive = isCrypto && controls.showHeatmap;

  // ── Heatmap data feed (Task 2) — reuses useDepthSlices exactly as
  // MarketScanner.tsx wires it: same hook, same getBook accessor, same
  // conservative bar-spacing constant. Only fetches/decodes when the toggle
  // is on (isLive gates the 5s live-edge sampler; the fetch effect still
  // runs whenever this hook is mounted, which is unconditional per hooks
  // rules — cost is bounded by the same debounce/fetch-window-cache logic
  // useDepthSlices already has for the scanner).
  const depthMatrix = useDepthSlices({
    symbol,
    fromMs: from * 1000,
    toMs: to * 1000,
    barSpacingPx: HEATMAP_APPROX_BAR_SPACING_PX,
    candleIntervalMs: intervalToMs(interval),
    getBook: book.getBook,
    floorUsd: HEATMAP_FLOOR_USD,
    isLive: heatmapActive && book.status === 'live',
  });

  // ── Candle dimming: mirror the footprint's zoom-driven stage ────────────
  const [footprintStage, setFootprintStage] = useState<FootprintDetailLevel>('hidden');
  const handleStageChange = useCallback((stage: FootprintDetailLevel) => {
    setFootprintStage(stage);
  }, []);
  const mutedCandles = orderFlowActive && (footprintStage === 'full' || footprintStage === 'shaded');

  // ── Backfill indicator note ──────────────────────────────────────────────
  let statusNote: string | undefined;
  let historyLimitedNote: string | undefined;
  if (orderFlowActive) {
    if (status === 'connecting') {
      statusNote = 'Loading order flow…';
    }
    if (backfillCoveredFromSec !== null) {
      const requestedFromSec = Math.floor(Date.now() / 1000) - 40 * intervalSec;
      if (backfillCoveredFromSec > requestedFromSec + intervalSec) {
        historyLimitedNote = 'Order flow history limited to the most recent data';
      }
    }
  }

  // CVD/Delta sub-panes read Binance klines directly (useKlineDelta) — hidden
  // for custom/aggregated timeframes that have no native Binance kline
  // interval (klineDeltaInterval is null in that case; see the resolution
  // block above) rather than erroring.
  const showSubPanes = isCrypto && klineDeltaInterval !== null && (controls.showCvd || controls.showDelta);

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
        {/* Order Flow controls now live in the Arena toolbar's "Chart ▾"
            dropdown (see ArenaToolbar.tsx) — no longer rendered here. */}
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
          <FinotaurChart
            symbol={chartSymbol}
            interval={chartInterval}
            from={from}
            to={to}
            dataSource={chartDataSource}
            indicators={DEFAULT_INDICATORS}
            theme="dark"
            height="100%"
            onBarsLoad={handleBarsLoad}
            footprint={{
              store,
              config: {
                ...DEFAULT_FOOTPRINT_CONFIG,
                cellMode: controls.cellMode,
                imbalancePreset: controls.imbalancePreset,
                ...resolveImbalancePreset(controls.imbalancePreset),
                showStats: controls.showStats,
                magnifierEnabled: controls.magnifierEnabled,
              },
              visible: orderFlowActive,
              onStageChange: handleStageChange,
            }}
            mutedCandles={mutedCandles}
            volumeProfile={{ store, visible: volumeProfileActive }}
            wallRenderMode={heatmapActive ? 'matrix' : 'series'}
            depthMatrixColumns={heatmapActive ? depthMatrix.columns : undefined}
            depthMatrixBinSize={depthMatrix.binSize}
            depthMatrixSizeFilterPct={HEATMAP_SIZE_FILTER_PCT}
            depthMatrixFloorUsd={HEATMAP_FLOOR_USD}
            depthMatrixCandleIntervalMs={intervalToMs(interval)}
          />
        </div>

        {showSubPanes && klineDeltaInterval && (
          <div className="flex-shrink-0 flex flex-col">
            {controls.showCvd && (
              <CvdSubPane symbol={symbol} interval={klineDeltaInterval} showTimeAxis={!controls.showDelta} />
            )}
            {controls.showDelta && (
              <DeltaSubPane symbol={symbol} interval={klineDeltaInterval} showTimeAxis={true} />
            )}
          </div>
        )}
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
