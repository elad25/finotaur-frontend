// src/components/charting/orderflow/FootprintLayer.tsx
//
// Canvas overlay that renders ATAS/dxFeed/Motivewave-style footprint clusters
// over FinotaurChart's candles, fed by a FlowBinStore (see flowBinStore.ts).
//
// UX model: progressive disclosure driven by ZOOM, not a separate chart mode
// the user switches to. Zoomed out, this layer draws nothing (plain candles).
// Zooming in past a threshold reveals delta-shaded cells over/around candles.
// Zooming in further reveals full bid×ask numbers. computeDetailLevel (in
// footprintRender.ts) is the primary mechanism for this, not a degradation
// fallback — see its hysteresis doc comment for why enter/exit thresholds
// differ (prevents flicker while pinch/scroll-zooming near a boundary).
// `onStageChange` reports transitions so a future consumer (Phase 3) can dim
// the candlestick series to a thin skeleton while clusters are showing.
//
// Structure mirrors DepthMatrixLayer.tsx / WallHeatLayer.tsx:
//   - Absolutely-positioned, DPR-aware, pointer-events:none canvas.
//   - rAF loop with a dirty flag (store.onChange + config change) PLUS a
//     per-frame coordinate fingerprint (lw-charts v4 fires no event for a
//     price-scale drag — the fingerprint is the only way to detect it).
//   - Per-candle draw structures (sorted/merged bins, imbalance flags) are
//     rebuilt ONLY when data or config is dirty — never on pan/zoom frames.
//     Pan/zoom frames only re-project coordinates and redraw from the
//     already-prepared structures (footprintRender.ts).
//   - try/finally with ctx.setTransform(1,0,0,1,0,0) restoration — a
//     mid-frame throw must never corrupt the transform stack.
//   - Clipped at timeScale().width() so nothing paints over the price axis.

import { useEffect, useRef, useState } from 'react';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import type { FlowBinStore } from './flowBinStore';
import type { FootprintConfig, FlowCandleView } from './types';
import type { Bar } from '@/components/charting/types';
import {
  computeDetailLevel,
  computeFootprintBandHeightPx,
  computeRowMergeFactor,
  drawCandleFootprint,
  drawTotalsRowAt,
  drawStatsBandAt,
  buildClusterStatsRow,
  getEnabledStatsRowDefs,
  prepareCandleDraw,
  resolveAutoTransformDetail,
  FOOTPRINT_TOTALS_BAND_HEIGHT,
  type ClusterStatsRow,
  type ClusterStatsRowMaxima,
  type StatsBarColumn,
  type FootprintDetailLevel,
  type PreparedCandleDraw,
} from './footprintRender';
import {
  FOOTPRINT_STATS_LEGEND_GUTTER_WIDTH,
  FOOTPRINT_TOTALS_FONT_SIZE,
  FOOTPRINT_FONT_FAMILY,
} from './footprintTheme';
import { MagnifierPopup } from './MagnifierPopup';
import { getRequestHistoryForStore } from './useOrderFlow';

/** Dwell time (ms) the cursor must stay over a candle before the Magnifier popup appears. */
const MAGNIFIER_HOVER_DELAY_MS = 150;
/** Horizontal offset (px) from the cursor so the popup never covers the hovered candle. */
const MAGNIFIER_CURSOR_OFFSET_X = 16;

/** Minimum spacing (ms) between onHistoryNeeded/requestHistory firings from the draw loop — a pan gesture redraws every frame, but the underlying REST walk (useOrderFlow.ts) is already debounced/single-flight, so this is just a cheap guard against calling into that machinery 60x/sec. */
const HISTORY_NEEDED_MIN_INTERVAL_MS = 1000;

// F7 (grid-continuity) — empty-bar stats-cell placeholder colors. Same
// zinc-400 hue as FOOTPRINT_NEUTRAL_TEXT but low-opacity, so a bar with no
// footprint data yet reads as "no data" rather than a real (zero-value) row.
const FOOTPRINT_EMPTY_CELL_BORDER = 'rgba(161, 161, 170, 0.18)';
const FOOTPRINT_EMPTY_CELL_TEXT = 'rgba(161, 161, 170, 0.35)';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface FootprintLayerProps {
  /** The lightweight-charts chart instance (for timeToCoordinate). */
  chart: IChartApi;
  /**
   * The candle series (for priceToCoordinate). Typed as ISeriesApi<any> to
   * match the pattern in WallHeatLayer/DepthMatrixLayer — only
   * priceToCoordinate is called, which exists on any series type.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: ISeriesApi<any>;
  /** Source of truth for footprint data — pure aggregation engine, no React. */
  store: FlowBinStore;
  config: FootprintConfig;
  visible: boolean;
  /** Container CSS width in px. */
  width: number;
  /** Container CSS height in px. */
  height: number;
  /**
   * Fired whenever the zoom-driven detail stage changes (hidden/shaded/full —
   * see computeDetailLevel's hysteresis). Phase 3 uses this to dim the
   * candlestick series to a thin skeleton while clusters are showing. Not
   * called on every frame — only on an actual stage transition.
   */
  onStageChange?: (stage: FootprintDetailLevel) => void;
  /**
   * The underlying candlestick series' own OHLC bars (FinotaurChart's
   * `barsRef.current`) — source of the actual open/high/low/close used to
   * draw the per-candle skeleton strip (see drawCandleFootprint's `ohlc`
   * extra). FlowBinStore has no OHLC concept of its own (it only aggregates
   * buy/sell volume per price bin), so this is threaded in from the
   * candlestick series data FinotaurChart already holds. Optional — omitting
   * it simply skips the skeleton (no behavior change for other callers).
   */
  bars?: Bar[];
  /**
   * Fired when the visible window's left edge extends earlier than the
   * history the store currently has loaded — i.e. the user panned left past
   * the backfilled edge. `fromMs` is the requested epoch-ms edge (see the
   * draw loop's `fromSec*1000` call site). Throttled to at most once per
   * second and only re-fired when the requested edge moves earlier.
   *
   * Optional — when omitted (every current caller, since FinotaurChart.tsx
   * instantiates this layer without wiring a new prop), the layer still
   * calls into useOrderFlow.ts's `requestHistory` directly via
   * `getRequestHistoryForStore(store)`, a side-channel keyed by the same
   * `store` instance this component already receives (see useOrderFlow.ts's
   * registry doc comment for why: it avoids threading a new callback prop
   * through FinotaurChart.tsx). This prop exists for callers/tests that want
   * to observe or override that lookup directly.
   */
  onHistoryNeeded?: (fromMs: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FootprintLayer({
  chart,
  series,
  store,
  config,
  visible,
  width,
  height,
  onStageChange,
  bars,
  onHistoryNeeded,
}: FootprintLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const dirtyRef = useRef<boolean>(true);
  const lastFingerprintRef = useRef<string>('');

  // Latest props/state kept in refs so the rAF loop always reads current
  // values without re-registering subscriptions every render.
  const configRef = useRef<FootprintConfig>(config);
  const visibleRef = useRef<boolean>(visible);
  const widthRef = useRef<number>(width);
  const heightRef = useRef<number>(height);
  const storeRef = useRef<FlowBinStore>(store);
  const onStageChangeRef = useRef<((stage: FootprintDetailLevel) => void) | undefined>(onStageChange);
  const barsRef = useRef<Bar[] | undefined>(bars);
  const onHistoryNeededRef = useRef<((fromMs: number) => void) | undefined>(onHistoryNeeded);

  configRef.current = config;
  visibleRef.current = visible;
  widthRef.current = width;
  heightRef.current = height;
  storeRef.current = store;
  onStageChangeRef.current = onStageChange;
  barsRef.current = bars;
  onHistoryNeededRef.current = onHistoryNeeded;

  // ── Pan-triggered history-request throttle state (F7) ───────────────────
  // Last fromMs actually fired (null = never fired this store lifetime) and
  // the wall-clock time it fired at — the draw loop only re-fires when the
  // requested edge moves EARLIER than the last one AND at least
  // HISTORY_NEEDED_MIN_INTERVAL_MS has elapsed (see maybeRequestHistory
  // below). Reset whenever the store identity changes (below), since a new
  // store means a fresh coverage state.
  const lastHistoryRequestFromMsRef = useRef<number | null>(null);
  const lastHistoryRequestFireAtRef = useRef<number>(0);

  // ── Magnifier hover state ────────────────────────────────────────────────
  // React state (NOT rAF-driven) — the popup only repaints when the hovered
  // candle actually changes, never per-frame. currentStageRef (below) is
  // read at crosshair-move time to decide whether the magnifier should even
  // be eligible (disabled entirely at 'full' — numbers are already visible).
  const [hoveredCandle, setHoveredCandle] = useState<{ candle: FlowCandleView; x: number; y: number } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last candle time the hover timer was armed for — lets the timeout callback
  // bail out if the cursor moved to a different candle (or off it) before the
  // dwell elapsed, without needing to clear/re-set a fresh timer on every
  // micro-move within the SAME candle (cheap early-exit instead).
  const pendingHoverKeyRef = useRef<number | null>(null);

  // Prepared per-candle draw cache, rebuilt on data/config dirty OR when the
  // Auto row-merge factor for that candle changes (see mergeFactorCacheRef
  // below) — merging/imbalance-detection is O(bins), cheap enough to redo
  // for the handful of visible candles when zoom crosses a merge-factor
  // boundary, and this is what makes Auto density actually track zoom (a
  // frozen mergeFactor from first-cache-time would never re-tighten rows
  // after zooming in). Keyed by candle time (seconds).
  const preparedCacheRef = useRef<Map<number, PreparedCandleDraw>>(new Map());
  // Last computeRowMergeFactor() result per candle time — feeds hysteresis
  // (previousFactor) so a per-row height hovering at a band edge across
  // consecutive frames doesn't oscillate the factor (and thus rebuild
  // `prepared`) every frame. Cleared alongside preparedCacheRef.
  const mergeFactorCacheRef = useRef<Map<number, 1 | 2 | 4>>(new Map());
  // Cluster-Statistics per-candle cache (Volume/Delta/Max Δ/Min Δ) — depends
  // only on the candle's own data (never on cellMode/imbalance thresholds),
  // so it's invalidated by the same data-dirty path as preparedCacheRef but
  // NOT by imbalance-config changes (see the two invalidation effects below).
  // sessionDelta is intentionally NOT baked in here — it depends on the
  // whole visible window's running CVD, recomputed once per dirty frame via
  // store.getCvdSeries() (see the draw loop), not per-candle.
  const statsCacheRef = useRef<Map<number, Omit<ClusterStatsRow, 'sessionDelta'>>>(new Map());
  // Row size the cache was built with — a rowSize change invalidates everything.
  const cachedRowSizeRef = useRef<number>(-1);
  // Current detail stage — feeds computeDetailLevel's hysteresis (previousStage)
  // and gates onStageChange to fire only on actual transitions.
  const currentStageRef = useRef<FootprintDetailLevel>('hidden');

  // OHLC-by-time lookup cache (see the draw loop's ohlcByTime build below) —
  // rebuilt only when barsRef.current's IDENTITY changes (a new bars array
  // reference — FinotaurChart replaces the whole array on each bar-load, it
  // never mutates in place), not on every dirty/pan/zoom frame. Iterating
  // ALL bars every frame scaled with total loaded history even though the
  // footprint only ever looks up a handful of visible candle times per
  // frame. ohlcByTimeBarsRef holds the exact `bars` reference the cached Map
  // was built from, so a plain `!==` identity check is enough to detect
  // "bars actually changed" without a deep comparison.
  const ohlcByTimeCacheRef = useRef<Map<number, { open: number; high: number; low: number; close: number }>>(new Map());
  const ohlcByTimeBarsRef = useRef<Bar[] | undefined>(undefined);

  // F6 (stacked-zone first-revisit kill) — suffix hi/lo range structure over
  // the FULL loaded `bars` array: for the candle at time T, `suffixLowByTimeRef
  // .get(T)`/`suffixHighByTimeRef.get(T)` give the combined [low, high] range
  // touched by ANY candle STRICTLY AFTER T. Built once per bars-identity
  // change (data-dirty), same `!==` pattern as ohlcByTimeBarsRef above, but
  // INDEPENDENT of detail stage — stacked zones render at both 'shaded' and
  // 'full' (see drawCandleFootprint), unlike the OHLC skeleton which only
  // draws at 'full'.
  const suffixLowByTimeRef = useRef<Map<number, number>>(new Map());
  const suffixHighByTimeRef = useRef<Map<number, number>>(new Map());
  const suffixRangeBarsRef = useRef<Bar[] | undefined>(undefined);

  // ── Mark dirty when the store emits new data ─────────────────────────────
  useEffect(() => {
    const unsubscribe = store.onChange(() => {
      dirtyRef.current = true;
    });
    dirtyRef.current = true; // store identity changed (symbol/interval swap) — force rebuild
    preparedCacheRef.current.clear();
    mergeFactorCacheRef.current.clear();
    statsCacheRef.current.clear();
    // New store = fresh coverage state — forget the last-requested edge so a
    // history request isn't wrongly suppressed as "hasn't moved earlier".
    lastHistoryRequestFromMsRef.current = null;
    lastHistoryRequestFireAtRef.current = 0;
    return unsubscribe;
  }, [store]);

  // ── Mark dirty on config change ──────────────────────────────────────────
  // cellMode/showTotals/showPoc/showStats/layout/colorScheme/statsRows are
  // read fresh at draw time in footprintRender.ts (never baked into
  // PreparedCandleDraw), so switching between them is render-only and does
  // NOT require a cache rebuild — this is what lets Phase 3's mode-strip UI
  // flip cellMode without any store or prep-cache cost; PR 3's layout/
  // colorScheme/statsRows toggles are the same shape. Only
  // imbalanceRatio/imbalanceMinVolPct/stackedMin/imbalanceStackedOnly and
  // (PR 3) showValueArea are baked into the prepared structure (the former
  // drive detectImbalances/detectStackedZones/applyStackedOnlyFilter,
  // showValueArea drives the per-candle VAH/VAL computation) and require a
  // rebuild when they change.
  useEffect(() => {
    dirtyRef.current = true;
  }, [
    config.cellMode,
    config.showTotals,
    config.showPoc,
    config.showStats,
    config.layout,
    config.colorScheme,
    config.statsRows,
  ]);

  useEffect(() => {
    dirtyRef.current = true;
    preparedCacheRef.current.clear();
    mergeFactorCacheRef.current.clear();
  }, [config.imbalanceRatio, config.imbalanceMinVolPct, config.stackedMin, config.imbalanceStackedOnly, config.showValueArea, config.imbalanceMinDiff, config.imbalanceIgnoreZeros, config.proportionUpperPercentile]);

  // ── Mark dirty on size/visibility change ─────────────────────────────────
  useEffect(() => {
    dirtyRef.current = true;
  }, [width, height, visible]);

  // ── Subscriptions that mark dirty (pan/zoom safety net, same as WallHeatLayer) ──
  useEffect(() => {
    const timeScale = chart.timeScale();
    const markDirty = () => { dirtyRef.current = true; };
    timeScale.subscribeVisibleLogicalRangeChange(markDirty);
    timeScale.subscribeVisibleTimeRangeChange(markDirty);
    const safetyInterval = setInterval(markDirty, 500);
    return () => {
      try { timeScale.unsubscribeVisibleLogicalRangeChange(markDirty); } catch { /* chart gone */ }
      try { timeScale.unsubscribeVisibleTimeRangeChange(markDirty); } catch { /* chart gone */ }
      clearInterval(safetyInterval);
    };
  }, [chart]);

  // ── Magnifier hover detection ────────────────────────────────────────────
  // Maps the crosshair's bar time → the footprint candle at that time, shows
  // the popup after a MAGNIFIER_HOVER_DELAY_MS dwell (debounced — hovering
  // across several candles in quick succession never flashes the popup),
  // and hides it IMMEDIATELY on move-away (no debounce on hide). Only
  // eligible when the config toggle is on AND the current zoom stage is NOT
  // 'full' (numbers already visible on-chart at 'full' — magnifier would be
  // redundant there), AND the cursor's Y position is physically over the
  // candle's own price range (not merely anywhere in its time column — see
  // the y-axis hit-test inside the handler below). Runs on every crosshair
  // move — no per-frame data scans, no rAF: this is purely event-driven.
  useEffect(() => {
    const clearHoverTimer = () => {
      if (hoverTimerRef.current !== null) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      pendingHoverKeyRef.current = null;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (param: { point?: { x: number; y: number }; time?: any }) => {
      const cfg = configRef.current;
      const stage = currentStageRef.current;

      // Disabled entirely: toggle off, chart hidden, or already at 'full'
      // (numbers are already legible on the candles themselves).
      if (!cfg.magnifierEnabled || !visibleRef.current || stage === 'full') {
        clearHoverTimer();
        if (hoveredCandle !== null) setHoveredCandle(null);
        return;
      }

      if (!param.point || param.time === undefined) {
        // Crosshair left the chart area (or a non-bar time) — hide immediately.
        clearHoverTimer();
        if (hoveredCandle !== null) setHoveredCandle(null);
        return;
      }

      const timeSec = param.time as number;
      const candle = storeRef.current.getCandle(timeSec);
      if (!candle || candle.bins.length === 0) {
        clearHoverTimer();
        if (hoveredCandle !== null) setHoveredCandle(null);
        return;
      }

      const point = param.point;

      // Y-axis hit-test: only eligible when the cursor is physically over the
      // candle's own price range, not merely in its time column (the bug —
      // the magnifier used to fire anywhere above/below the candle at that
      // bar's time). Prefer the candlestick series' real OHLC high/low
      // (threaded in via the `bars` prop / barsRef — see FootprintLayerProps'
      // `bars` doc comment) since it's exact; fall back to an explicit
      // min/max scan over `candle.bins` — considering only bins with actual
      // traded volume (see computeTradedBinExtent's doc comment for why: a
      // sorted-array bins[0]/bins[last] shortcut would trust ordering that
      // isn't defensive against a future zero-volume/placeholder bin) — for
      // the rare case OHLC isn't loaded for this bar yet (observed
      // specifically on the LAST/still-forming candle: its footprint-store
      // candle can exist a frame or more before the candlestick series' own
      // `bars` array has the corresponding live bar — see barsRef's doc
      // comment in FinotaurChart.tsx and useOrderFlow.ts's independent
      // trade-stream vs kline-stream subscriptions). If NEITHER source
      // yields a reliable extent, fail closed (no magnifier) rather than
      // guess. A small tolerance (half a price-bin, or 0.1% of price,
      // whichever is larger) keeps wick-edge hovers registering.
      const ohlcBar = barsRef.current?.find((b) => (b.time as unknown as number) === timeSec);
      const rowSize = storeRef.current.getConfig().rowSize;
      const extent = ohlcBar
        ? { low: ohlcBar.low, high: ohlcBar.high }
        : computeTradedBinExtent(candle, rowSize);
      if (!extent) {
        clearHoverTimer();
        if (hoveredCandle !== null) setHoveredCandle(null);
        return;
      }
      const { low, high } = extent;
      const tolerance = Math.max(rowSize / 2, Math.abs(high) * 0.001);
      const cursorPrice = series.coordinateToPrice(point.y);
      if (cursorPrice === null || cursorPrice < low - tolerance || cursorPrice > high + tolerance) {
        clearHoverTimer();
        if (hoveredCandle !== null) setHoveredCandle(null);
        return;
      }

      // X-axis containment check (defense-in-depth) — independent of the
      // Y-extent test above. Re-derives the candle's own x-coordinate from
      // the chart's OWN time scale and rejects the hover if the cursor's
      // actual x isn't within (roughly) half a bar-width of it. This exists
      // because the Y-test alone can't distinguish "extent is right, wrong
      // time column" from "right column, right extent" — and the reported
      // bug (magnifier firing for the last/developing candle even when the
      // cursor is nowhere near its time column) is exactly that shape of
      // failure. Bar spacing is measured from two adjacent bar coordinates
      // when possible (accurate at any zoom) and only falls back to the
      // time scale's own `barSpacing` option (which can lag mid-kinetic-zoom
      // — see DepthMatrixLayer.tsx's note on the same option) when adjacent
      // coordinates aren't resolvable (e.g. this candle sits at the very
      // edge of loaded history). Both null-guarded — never throws.
      const candleX = chart.timeScale().timeToCoordinate(timeSec as unknown as UTCTimestamp);
      if (candleX !== null) {
        const intervalSec = storeRef.current.getConfig().intervalSec;
        let barSpacingPx: number | null = null;
        if (intervalSec > 0) {
          const xNext = chart.timeScale().timeToCoordinate((timeSec + intervalSec) as unknown as UTCTimestamp);
          const xPrev = chart.timeScale().timeToCoordinate((timeSec - intervalSec) as unknown as UTCTimestamp);
          if (xNext !== null) barSpacingPx = Math.abs((xNext as number) - (candleX as number));
          else if (xPrev !== null) barSpacingPx = Math.abs((candleX as number) - (xPrev as number));
        }
        if (barSpacingPx === null) {
          const optSpacing = chart.timeScale().options().barSpacing;
          barSpacingPx = typeof optSpacing === 'number' && optSpacing > 0 ? optSpacing : null;
        }
        if (barSpacingPx !== null && Math.abs(point.x - (candleX as number)) > barSpacingPx * 0.6) {
          clearHoverTimer();
          if (hoveredCandle !== null) setHoveredCandle(null);
          return;
        }
      }

      // Already hovering (or already timing) the SAME candle — just refresh
      // the cursor-anchored position, no need to re-arm the dwell timer.
      if (pendingHoverKeyRef.current === timeSec) {
        if (hoveredCandle !== null && hoveredCandle.candle.time === timeSec) {
          setHoveredCandle({ candle, x: point.x, y: point.y });
        }
        return;
      }

      // Moved to a different candle — reset dwell timer, hide any existing popup.
      clearHoverTimer();
      if (hoveredCandle !== null) setHoveredCandle(null);
      pendingHoverKeyRef.current = timeSec;
      hoverTimerRef.current = setTimeout(() => {
        // Re-validate eligibility at fire time — zoom/toggle may have changed
        // during the dwell window.
        if (
          pendingHoverKeyRef.current === timeSec &&
          configRef.current.magnifierEnabled &&
          currentStageRef.current !== 'full'
        ) {
          setHoveredCandle({ candle, x: point.x, y: point.y });
        }
      }, MAGNIFIER_HOVER_DELAY_MS);
    };

    chart.subscribeCrosshairMove(handler);
    return () => {
      try { chart.unsubscribeCrosshairMove(handler); } catch { /* chart may be gone */ }
      clearHoverTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, series, hoveredCandle]);

  // ── rAF draw loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const chartInstance = chart;
    const seriesInstance = series;
    let running = true;

    // F7 (pan-left backfill trigger): asks for more history when the
    // visible window's left edge outruns what's currently loaded. Throttled
    // to at most once/sec and only re-fires when `fromMs` moves EARLIER than
    // the last fired value — a pan that stays within already-requested
    // territory (or pans back right) is a no-op here (useOrderFlow.ts's
    // requestHistory is itself debounced/single-flight/coverage-checked too,
    // this is just a cheap guard against calling into it on every dirty
    // frame). Reaches the actual backfill via BOTH the optional
    // `onHistoryNeeded` prop (if a caller supplied one) and the store-keyed
    // registry lookup (getRequestHistoryForStore) — see FootprintLayerProps'
    // onHistoryNeeded doc comment for why both paths exist.
    function maybeRequestHistory(fromMs: number) {
      const lastRequested = lastHistoryRequestFromMsRef.current;
      if (lastRequested !== null && fromMs >= lastRequested) return; // hasn't moved earlier
      const now = Date.now();
      if (now - lastHistoryRequestFireAtRef.current < HISTORY_NEEDED_MIN_INTERVAL_MS) return;

      lastHistoryRequestFromMsRef.current = fromMs;
      lastHistoryRequestFireAtRef.current = now;

      onHistoryNeededRef.current?.(fromMs);
      getRequestHistoryForStore(storeRef.current)?.(fromMs);
    }

    function drawFrame() {
      if (!running) return;
      rafRef.current = requestAnimationFrame(drawFrame);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const cssW = widthRef.current;
      const cssH = heightRef.current;
      if (cssW <= 0 || cssH <= 0) return;

      // ── DPR / resize — every frame, before clear ────────────────────────
      const dpr = window.devicePixelRatio || 1;
      const pixW = Math.round(cssW * dpr);
      const pixH = Math.round(cssH * dpr);
      if (canvas.width !== pixW || canvas.height !== pixH) {
        canvas.width = pixW;
        canvas.height = pixH;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!visibleRef.current) {
        // Still clear (in case visibility just toggled off) then bail —
        // cheap enough to do unconditionally rather than tracking a
        // separate "was visible last frame" flag.
        try {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, cssW, cssH);
        } finally {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        // The feature toggled off entirely (distinct from the zoom-driven
        // stage machine) — report 'hidden' once so a Phase 3 consumer that
        // dimmed the candle series based on stage un-dims it.
        if (currentStageRef.current !== 'hidden') {
          currentStageRef.current = 'hidden';
          onStageChangeRef.current?.('hidden');
        }
        return;
      }

      // ── Per-frame coordinate fingerprint (detects price-axis rescale) ───
      const rawPaneW = chartInstance.timeScale().width();
      const paneW = (typeof rawPaneW === 'number' && rawPaneW > 0) ? rawPaneW : cssW;
      const logRange = chartInstance.timeScale().getVisibleLogicalRange();
      const fpFrom = logRange ? logRange.from : NaN;
      const fpTo = logRange ? logRange.to : NaN;
      const fpY0 = seriesInstance.priceToCoordinate(0) ?? NaN;
      const fpY1 = seriesInstance.priceToCoordinate(1) ?? NaN;
      const fingerprint = `${paneW}|${cssW}|${cssH}|${fpFrom}|${fpTo}|${fpY0}|${fpY1}`;
      const fingerprintChanged = fingerprint !== lastFingerprintRef.current;

      if (!dirtyRef.current && !fingerprintChanged) return;
      dirtyRef.current = false;

      try {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        if (!logRange) return;

        const config = configRef.current;
        const activeStore = storeRef.current;

        // ── Determine candle interval + row size from the store's config
        // (FlowBinStore.getConfig() — see below), falling back to inference
        // from loaded candle data only when the config is unset/invalid.
        // Visible time range → candle times to fetch from the store.
        const visRange = chartInstance.timeScale().getVisibleRange();
        if (!visRange) return;
        const fromSec = Math.floor(visRange.from as unknown as number) - 3600;
        const toSec = Math.ceil(visRange.to as unknown as number) + 3600;
        const candles = activeStore.getRange(fromSec, toSec);
        if (candles.length === 0) {
          // The store returned NOTHING for this window at all — always worth
          // asking for more history regardless of zoom (there's nothing to
          // show at any detail level either way; see the `detail`-gated
          // request further below for the "partially loaded" case).
          maybeRequestHistory(fromSec * 1000);
          return;
        }

        // Prefer the store's own config (authoritative, set by useOrderFlow /
        // OrderFlowControls) over inference from loaded data. Inference
        // remains as a fallback only for the rare case where the config is
        // unset/invalid (e.g. rowSize 0 before the first suggestRowSize call).
        const storeConfig = activeStore.getConfig();
        const rowSize = storeConfig.rowSize > 0 ? storeConfig.rowSize : inferRowSize(candles);
        if (rowSize <= 0) return;

        if (cachedRowSizeRef.current !== rowSize) {
          cachedRowSizeRef.current = rowSize;
          preparedCacheRef.current.clear();
          mergeFactorCacheRef.current.clear();
          statsCacheRef.current.clear();
        }

        // ── Resolve bar-snapped anchors for time→x extrapolation ───────────
        // lw-charts v4 timeToCoordinate() returns null for any non-bar time.
        // Resolve two bar coordinates from the candle series itself, derive
        // px-per-second, then extrapolate every candle's x from that.
        const ivSec = storeConfig.intervalSec > 0 ? storeConfig.intervalSec : inferIntervalSec(candles);
        if (ivSec <= 0) return;

        const midSec = Math.floor(((visRange.from as unknown as number) + (visRange.to as unknown as number)) / 2);
        const snapDown = (t: number) => Math.floor(t / ivSec) * ivSec;

        function resolveBarX(startSec: number, stepSec: number): { tSec: number; x: number } | null {
          for (let i = 0; i < 10; i++) {
            const t = (snapDown(startSec) + i * stepSec) as UTCTimestamp;
            const x = chartInstance.timeScale().timeToCoordinate(t);
            if (x !== null) return { tSec: t as unknown as number, x: x as number };
          }
          return null;
        }

        const ref1 = resolveBarX(midSec, -ivSec);
        if (ref1 === null) return;
        // Prefer a bar AHEAD of ref1 to derive px-per-second. This fails
        // whenever ref1 lands on (or near) the last real bar — e.g. the user
        // is zoomed into the live edge, where no bar exists yet at
        // ref1.tSec + ivSec. lw-charts' timeToCoordinate() returns null for
        // any non-bar time (see resolveBarX's doc comment), so at the live
        // edge every forward probe fails and the layer used to bail out here
        // on every frame — the reason nothing ever painted while zoomed into
        // the newest candles. Fall back to a bar BEHIND ref1 in that case;
        // the resulting px-per-second is identical (same bar spacing), only
        // the sign of the delta differs, which the slope math below handles.
        let ref2 = resolveBarX(ref1.tSec + ivSec, ivSec);
        if (ref2 === null) {
          ref2 = resolveBarX(ref1.tSec - ivSec, -ivSec);
        }
        if (ref2 === null) return;

        const actualPxPerBar = ref2.x - ref1.x;
        const actualTimeDelta = ref2.tSec - ref1.tSec;
        const pxPerSec = actualTimeDelta !== 0 ? actualPxPerBar / actualTimeDelta : 1;
        const candleWidthPx = Math.abs(pxPerSec) * ivSec;

        const timeToX = (tSec: number): number => ref1.x + (tSec - ref1.tSec) * pxPerSec;

        // ── Row height (px) — derived from priceToCoordinate over one rowSize ──
        const yAt0 = seriesInstance.priceToCoordinate(0);
        const yAt1 = seriesInstance.priceToCoordinate(rowSize);
        const rowHeightPx = yAt0 !== null && yAt1 !== null ? Math.abs((yAt0 as number) - (yAt1 as number)) : 0;

        // autoTransformMinPx (Trading Arena, opt-in on both the Footprint tab
        // and ChartTab's footprintOnZoom bridge) takes priority over
        // forceFullDetail — a simple binary full/hidden gate, no hysteresis.
        // Falls through to forceFullDetail (Trading Arena Footprint tab's
        // default: always 'full') or the zoom-driven 3-stage hysteresis
        // (every other caller, unaffected) when unset — see FootprintConfig's
        // doc comments on both fields.
        const detail = config.autoTransformMinPx != null
          ? resolveAutoTransformDetail(candleWidthPx, config.autoTransformMinPx, rowHeightPx, config.minCellPxForText)
          : config.forceFullDetail
            ? 'full'
            : computeDetailLevel(candleWidthPx, rowHeightPx, currentStageRef.current);
        if (detail !== currentStageRef.current) {
          currentStageRef.current = detail;
          onStageChangeRef.current?.(detail);
        }
        if (detail === 'hidden') return;

        // F7 (pan-left backfill trigger, "partially loaded" case): the store
        // DID return candles for this window, but the earliest one is later
        // than the window's own left edge — the user panned into a region
        // that isn't backfilled yet. `candles` is ascending by time (see
        // FlowBinStore.getRange), so candles[0] is the earliest.
        if (fromSec < candles[0].time) {
          maybeRequestHistory(fromSec * 1000);
        }

        // Live edge = x of the last visible logical bar (right edge of the pane
        // when the chart is scrolled to "now", else the rightmost resolvable bar).
        const liveEdgeX = paneW;
        const latestCandle = candles[candles.length - 1];
        const latestRange = computeCandleRange(latestCandle, rowSize);

        // Session Δ (running cumulative delta from the oldest LOADED candle,
        // not a global CVD) — computed ONCE per dirty frame via
        // getCvdSeries(), never per-candle/per-frame-scan. Only needed when
        // the stats strip is actually going to render (showStats + 'full').
        // F5: also gated on at least one enabled stats row — if all 6 are
        // toggled off, the band renders nothing (see computeFootprintBandHeightPx),
        // so computing CVD for it would be wasted work.
        const enabledStatsRowCount = getEnabledStatsRowDefs(config.statsRows).length;
        const needsStats = config.showStats && enabledStatsRowCount > 0 && detail === 'full';
        const cvdByTime = new Map<number, number>();
        if (needsStats && candles.length > 0) {
          const cvdSeries = activeStore.getCvdSeries(candles[0].time, candles[candles.length - 1].time);
          for (const point of cvdSeries) cvdByTime.set(point.time, point.cvd);
        }

        // OHLC lookup for the candle skeleton strip (task: FootprintLayer has
        // no OHLC of its own — FlowBinStore only tracks buy/sell volume per
        // price bin — so this reads from the candlestick series' own bars,
        // threaded in via the `bars` prop). Memoized against barsRef.current's
        // IDENTITY (see ohlcByTimeCacheRef's doc comment above) — this used to
        // rebuild by iterating ALL bars on every dirty frame, which scaled
        // with total loaded history even though bars only change on an actual
        // bar-load event, not on every pan/zoom/dirty redraw.
        const currentBars = detail === 'full' ? barsRef.current : undefined;
        if (currentBars !== ohlcByTimeBarsRef.current) {
          const rebuilt = new Map<number, { open: number; high: number; low: number; close: number }>();
          if (currentBars) {
            for (const bar of currentBars) {
              rebuilt.set(bar.time as unknown as number, { open: bar.open, high: bar.high, low: bar.low, close: bar.close });
            }
          }
          ohlcByTimeCacheRef.current = rebuilt;
          ohlcByTimeBarsRef.current = currentBars;
        }
        const ohlcByTime = ohlcByTimeCacheRef.current;

        // F6: suffix hi/lo range structure, rebuilt once per bars-identity
        // change (data-dirty) — independent of `detail`, unlike ohlcByTime
        // above, since stacked zones render at 'shaded' too.
        const allBars = barsRef.current;
        if (allBars !== suffixRangeBarsRef.current) {
          const lowMap = new Map<number, number>();
          const highMap = new Map<number, number>();
          if (allBars && allBars.length > 0) {
            let runningLow = Infinity;
            let runningHigh = -Infinity;
            for (let i = allBars.length - 1; i >= 0; i--) {
              const t = allBars[i].time as unknown as number;
              // Store the suffix EXCLUDING this bar — i.e. the range touched
              // by candles strictly AFTER index i — before folding this bar's
              // own low/high into the running accumulator for the next
              // (earlier) iteration.
              lowMap.set(t, runningLow);
              highMap.set(t, runningHigh);
              runningLow = Math.min(runningLow, allBars[i].low);
              runningHigh = Math.max(runningHigh, allBars[i].high);
            }
          }
          suffixLowByTimeRef.current = lowMap;
          suffixHighByTimeRef.current = highMap;
          suffixRangeBarsRef.current = allBars;
        }
        // Only attach `touchedRangeSince` when suffix data actually exists —
        // callers/configurations without a `bars` prop must keep falling back
        // to `latestCandleRange` inside drawStackedZones (see its extras.touchedRangeSince
        // fallback), not silently get an always-null override.
        const hasSuffixRangeData = allBars !== undefined && allBars.length > 0;
        const touchedRangeSince = (formationTimeSec: number): { low: number; high: number } | null => {
          const low = suffixLowByTimeRef.current.get(formationTimeSec);
          const high = suffixHighByTimeRef.current.get(formationTimeSec);
          if (low === undefined || high === undefined || !isFinite(low) || !isFinite(high)) return null;
          return { low, high };
        };

        // Bar columns collected for a single batched stats-band draw call
        // after the per-candle footprint loop (drawStatsBandAt computes
        // heat-shading row maxima once across all visible bars).
        const statsBars: StatsBarColumn[] = [];
        const totalsBars: { prepared: PreparedCandleDraw; leftX: number; rightX: number }[] = [];

        for (const candle of candles) {
          const x = timeToX(candle.time);
          if (x + candleWidthPx / 2 < 0 || x - candleWidthPx / 2 > paneW) continue; // cull

          // Auto row-merge factor is recomputed EVERY frame (cheap — O(1) per
          // candle, just a threshold comparison against the zoom-derived
          // rowHeightPx) so it actually tracks zoom, with hysteresis against
          // this candle's own last factor to avoid flicker at a band edge.
          // The expensive part (merging bins + imbalance detection) only
          // reruns when the factor actually changes or the candle isn't
          // cached yet — data/config dirty already clears both caches above.
          // undefined (not a default of 1) for a candle seen for the first
          // time — computeRowMergeFactor treats "no held factor" as a cold
          // start using the plain threshold, distinct from "held at 1".
          const previousFactor = mergeFactorCacheRef.current.get(candle.time);
          const mergeFactor: 1 | 2 | 4 = detail === 'full'
            ? computeRowMergeFactor(rowHeightPx, candle.bins.length, previousFactor)
            : 1;

          let prepared = preparedCacheRef.current.get(candle.time);
          if (!prepared || mergeFactorCacheRef.current.get(candle.time) !== mergeFactor) {
            prepared = prepareCandleDraw(candle, rowSize, mergeFactor, config);
            preparedCacheRef.current.set(candle.time, prepared);
            mergeFactorCacheRef.current.set(candle.time, mergeFactor);
          }

          const priceToY = (price: number): number | null => {
            const y = seriesInstance.priceToCoordinate(price);
            return y === null ? null : (y as number);
          };

          drawCandleFootprint(
            ctx,
            prepared,
            {
              centerX: x,
              candleWidthPx,
              priceToY,
              rowHeightPx,
              rowSize,
            },
            detail,
            config,
            {
              liveEdgeX,
              latestCandleRange: latestRange,
              clipRightX: paneW,
              ohlc: ohlcByTime.get(candle.time),
              touchedRangeSince: hasSuffixRangeData ? touchedRangeSince : undefined,
            },
          );

          if (detail === 'full') {
            const barLeftX = Math.max(0, x - candleWidthPx / 2);
            const barRightX = Math.min(paneW, x + candleWidthPx / 2);
            if (config.showStats && enabledStatsRowCount > 0) {
              let cached = statsCacheRef.current.get(candle.time);
              if (!cached) {
                const built = buildClusterStatsRow(candle, 0);
                cached = { volume: built.volume, delta: built.delta, deltaPct: built.deltaPct, deltaPctLabel: built.deltaPctLabel, maxDelta: built.maxDelta, minDelta: built.minDelta };
                statsCacheRef.current.set(candle.time, cached);
              }
              const sessionDelta = cvdByTime.get(candle.time) ?? 0;
              statsBars.push({
                prepared,
                stats: { ...cached, sessionDelta },
                leftX: barLeftX,
                rightX: barRightX,
              });
            } else if (config.showTotals) {
              totalsBars.push({ prepared, leftX: barLeftX, rightX: barRightX });
            }
          }
        }

        // F7 (grid-continuity): placeholder cells for visible OHLC bars that
        // have NO footprint data loaded yet (the requestHistory backfill
        // triggered above hasn't landed for them). Without this the stats
        // strip visually stops partway through the visible window instead
        // of reading as a continuous grid. Built from `bars` (the
        // candlestick series' own OHLC array — loaded independently of
        // footprint/trade data, so it's the authoritative "which bar times
        // exist on screen" source) rather than `candles`, since a bar with
        // no footprint data never appears in `candles` at all (see
        // FlowBinStore.getRange — it only returns candles with landed
        // trades). Only meaningful when the stats strip itself would render
        // (needsStats) and there's an OHLC bars source to know which times
        // SHOULD have a column.
        const emptyStatsBars: { leftX: number; rightX: number }[] = [];
        if (needsStats && allBars && allBars.length > 0) {
          const presentTimes = new Set(candles.map((c) => c.time));
          for (const bar of allBars) {
            const t = bar.time as unknown as number;
            if (t < fromSec || t > toSec) continue;
            if (presentTimes.has(t)) continue; // has real footprint data — drawn above
            const x = timeToX(t);
            if (x + candleWidthPx / 2 < 0 || x - candleWidthPx / 2 > paneW) continue; // cull
            const barLeftX = Math.max(0, x - candleWidthPx / 2);
            const barRightX = Math.min(paneW, x + candleWidthPx / 2);
            if (barRightX <= barLeftX) continue;
            emptyStatsBars.push({ leftX: barLeftX, rightX: barRightX });
          }
        }

        if (needsStats && (statsBars.length > 0 || emptyStatsBars.length > 0)) {
          const rowMaxima: ClusterStatsRowMaxima = {
            volume: 0,
            delta: 0,
            deltaPct: 0,
            maxDelta: 0,
            minDelta: 0,
            sessionDelta: 0,
          };
          for (const bar of statsBars) {
            rowMaxima.volume = Math.max(rowMaxima.volume, Math.abs(bar.stats.volume));
            rowMaxima.delta = Math.max(rowMaxima.delta, Math.abs(bar.stats.delta));
            rowMaxima.deltaPct = Math.max(rowMaxima.deltaPct, Math.abs(bar.stats.deltaPct));
            rowMaxima.maxDelta = Math.max(rowMaxima.maxDelta, Math.abs(bar.stats.maxDelta));
            rowMaxima.minDelta = Math.max(rowMaxima.minDelta, Math.abs(bar.stats.minDelta));
            rowMaxima.sessionDelta = Math.max(rowMaxima.sessionDelta, Math.abs(bar.stats.sessionDelta));
          }
          const statsBandHeight = computeFootprintBandHeightPx(config, detail);
          drawStatsBandAt(ctx, statsBars, {
            top: cssH - statsBandHeight,
            labelGutterWidth: FOOTPRINT_STATS_LEGEND_GUTTER_WIDTH,
            rowMaxima,
            statsRows: config.statsRows,
          });
          if (emptyStatsBars.length > 0) {
            drawEmptyStatsPlaceholders(ctx, emptyStatsBars, {
              top: cssH - statsBandHeight,
              rowHeightPx: enabledStatsRowCount > 0 ? statsBandHeight / enabledStatsRowCount : 0,
              rowCount: enabledStatsRowCount,
            });
          }
        } else if (totalsBars.length > 0) {
          const totalsTop = cssH - FOOTPRINT_TOTALS_BAND_HEIGHT;
          for (const bar of totalsBars) {
            drawTotalsRowAt(ctx, bar.prepared, {
              leftX: bar.leftX,
              rightX: bar.rightX,
              top: totalsTop,
            });
          }
        }
      } finally {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        lastFingerprintRef.current = fingerprint;
      }
    }

    rafRef.current = requestAnimationFrame(drawFrame);

    return () => {
      running = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, series]);

  // Row size for the magnifier popup — same source-of-truth as the draw loop
  // (store's own config, falling back to the row-size of the hovered
  // candle's own bins is not needed here since the store always has a valid
  // config by the time a candle can be hovered).
  const magnifierRowSize = store.getConfig().rowSize;

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${width}px`,
          height: `${height}px`,
          pointerEvents: 'none',
          // Above candles (which paint on the base lw-charts canvas) so the
          // footprint clusters are legible; below marker-icons (z-index 20).
          zIndex: 15,
        }}
        aria-hidden="true"
      />
      {hoveredCandle && magnifierRowSize > 0 && (() => {
        // Clamp the popup within [0, width] / [0, height] and offset from the
        // cursor so it never covers the hovered candle. Actual popup size is
        // computed inside MagnifierPopup via computeMagnifierLayout — we use
        // a conservative estimate here purely for the clamp (the popup itself
        // measures its own canvas after mount; a few px of slack is harmless
        // for a floating overlay).
        const ESTIMATED_POPUP_W = 180;
        const ESTIMATED_POPUP_H = 220;
        let left = hoveredCandle.x + MAGNIFIER_CURSOR_OFFSET_X;
        if (left + ESTIMATED_POPUP_W > width) {
          left = hoveredCandle.x - MAGNIFIER_CURSOR_OFFSET_X - ESTIMATED_POPUP_W;
        }
        left = Math.max(0, Math.min(left, Math.max(0, width - ESTIMATED_POPUP_W)));

        let top = hoveredCandle.y - ESTIMATED_POPUP_H / 2;
        top = Math.max(0, Math.min(top, Math.max(0, height - ESTIMATED_POPUP_H)));

        return (
          <MagnifierPopup
            candle={hoveredCandle.candle}
            rowSize={magnifierRowSize}
            config={config}
            left={left}
            top={top}
          />
        );
      })()}
    </>
  );
}

// ─── Local helpers (frame-cheap; no heavy scans) ────────────────────────────

/**
 * F7 (grid-continuity): draws a placeholder stats-cell frame (subtle border
 * + centered em-dash, low opacity) for a visible OHLC bar that has no
 * footprint data loaded yet — keeps the Cluster Statistics strip reading as
 * a CONTINUOUS grid across the visible window instead of visually stopping
 * at the backfilled edge (see the draw loop's emptyStatsBars build). Kept
 * local to this file (rather than added to footprintRender.ts) since this
 * task's scope is limited to useOrderFlow.ts + FootprintLayer.tsx.
 * Deliberately minimal — no heat-chip tinting, no per-row values, just
 * enough visual structure that the strip doesn't look broken while
 * requestHistory's incremental backfill (useOrderFlow.ts) is still landing.
 */
function drawEmptyStatsPlaceholders(
  ctx: CanvasRenderingContext2D,
  bars: { leftX: number; rightX: number }[],
  bounds: { top: number; rowHeightPx: number; rowCount: number },
): void {
  const { top, rowHeightPx, rowCount } = bounds;
  if (rowHeightPx <= 0 || rowCount <= 0) return;

  ctx.font = `${FOOTPRINT_TOTALS_FONT_SIZE}px ${FOOTPRINT_FONT_FAMILY}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  for (const bar of bars) {
    const width = bar.rightX - bar.leftX;
    if (width <= 0) continue;

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const rowTop = top + rowIdx * rowHeightPx;
      const rowMid = rowTop + rowHeightPx / 2;

      // Subtle cell border — same row height as real cells, low-opacity so
      // it reads as "no data" rather than a real (zero-value) row.
      ctx.strokeStyle = FOOTPRINT_EMPTY_CELL_BORDER;
      ctx.lineWidth = 1;
      ctx.strokeRect(bar.leftX + 0.5, rowTop + 0.5, Math.max(0, width - 1), Math.max(0, rowHeightPx - 1));

      ctx.fillStyle = FOOTPRINT_EMPTY_CELL_TEXT;
      ctx.fillText('—', bar.leftX + width / 2, rowMid);
    }
  }

  ctx.textAlign = 'left'; // restore canvas default, mirrors drawStatsBandAt
}

// FALLBACK ONLY — the primary source of rowSize/intervalSec is now
// store.getConfig() (see the draw loop above). These infer from loaded data
// and are used only when the store's config is unset or invalid (rowSize/
// intervalSec <= 0), e.g. before the first suggestRowSize() call resolves.

/** Infer the store's rowSize from the smallest positive gap between adjacent bins. */
function inferRowSize(candles: FlowCandleView[]): number {
  for (const candle of candles) {
    if (candle.bins.length >= 2) {
      const gap = candle.bins[1].binPrice - candle.bins[0].binPrice;
      if (gap > 0) return gap;
    }
  }
  // Single-bin candles only (thin data) — fall back to a value derived from
  // the one bin present so callers don't divide by zero; not exact but safe.
  for (const candle of candles) {
    if (candle.bins.length === 1) return Math.max(candle.bins[0].binPrice * 1e-6, 1e-8);
  }
  return 0;
}

/** Infer the store's intervalSec from the smallest positive gap between adjacent candle times. */
function inferIntervalSec(candles: FlowCandleView[]): number {
  for (let i = 1; i < candles.length; i++) {
    const gap = candles[i].time - candles[i - 1].time;
    if (gap > 0) return gap;
  }
  return 60; // single-candle window fallback — matches flowBinStore's minimum granularity
}

function computeCandleRange(candle: FlowCandleView, rowSize: number): { low: number; high: number } | null {
  if (candle.bins.length === 0) return null;
  let low = Infinity;
  let high = -Infinity;
  for (const bin of candle.bins) {
    if (bin.binPrice < low) low = bin.binPrice;
    if (bin.binPrice + rowSize > high) high = bin.binPrice + rowSize;
  }
  return isFinite(low) && isFinite(high) ? { low, high } : null;
}

/**
 * Magnifier hover fallback (used only when the candlestick series' own OHLC
 * bar can't be matched for this candle's time — see the crosshair handler's
 * doc comment above). Explicit min/max scan over `candle.bins`, skipping any
 * bin with zero traded volume, rather than trusting `bins[0]`/`bins[last]`
 * under the "sorted ascending by binPrice" assumption (FlowCandleView's own
 * doc comment) — today's FlowBinStore never creates a zero-volume bin (see
 * flowBinStore.ts's applySingleTrade, the only bin-creation path — a bin
 * only exists once a real trade lands in it), but scanning defensively means
 * this fallback stays correct even if a future store/hydrate/replay path
 * ever seeds a placeholder bin, instead of silently inheriting a stale/wide
 * ordering assumption. Distinct from computeCandleRange above (which is used
 * for drawing and intentionally includes every bin) — the magnifier's hit
 * test specifically wants "the range actually traded", not "every bin that
 * exists for any reason".
 */
function computeTradedBinExtent(candle: FlowCandleView, rowSize: number): { low: number; high: number } | null {
  let low = Infinity;
  let high = -Infinity;
  for (const bin of candle.bins) {
    if (bin.buyVol <= 0 && bin.sellVol <= 0) continue; // skip zero-volume/placeholder bins
    if (bin.binPrice < low) low = bin.binPrice;
    if (bin.binPrice + rowSize > high) high = bin.binPrice + rowSize;
  }
  return isFinite(low) && isFinite(high) ? { low, high } : null;
}

export default FootprintLayer;
