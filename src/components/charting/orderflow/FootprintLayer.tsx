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
  computeRowMergeFactor,
  drawCandleFootprint,
  drawTotalsRowAt,
  drawStatsBandAt,
  buildClusterStatsRow,
  prepareCandleDraw,
  FOOTPRINT_TOTALS_BAND_HEIGHT,
  FOOTPRINT_STATS_BAND_HEIGHT,
  type ClusterStatsRow,
  type ClusterStatsRowMaxima,
  type StatsBarColumn,
  type FootprintDetailLevel,
  type PreparedCandleDraw,
} from './footprintRender';
import { FOOTPRINT_STATS_LEGEND_GUTTER_WIDTH } from './footprintTheme';
import { MagnifierPopup } from './MagnifierPopup';

/** Dwell time (ms) the cursor must stay over a candle before the Magnifier popup appears. */
const MAGNIFIER_HOVER_DELAY_MS = 150;
/** Horizontal offset (px) from the cursor so the popup never covers the hovered candle. */
const MAGNIFIER_CURSOR_OFFSET_X = 16;

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

  configRef.current = config;
  visibleRef.current = visible;
  widthRef.current = width;
  heightRef.current = height;
  storeRef.current = store;
  onStageChangeRef.current = onStageChange;
  barsRef.current = bars;

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

  // ── Mark dirty when the store emits new data ─────────────────────────────
  useEffect(() => {
    const unsubscribe = store.onChange(() => {
      dirtyRef.current = true;
    });
    dirtyRef.current = true; // store identity changed (symbol/interval swap) — force rebuild
    preparedCacheRef.current.clear();
    mergeFactorCacheRef.current.clear();
    statsCacheRef.current.clear();
    return unsubscribe;
  }, [store]);

  // ── Mark dirty on config change ──────────────────────────────────────────
  // cellMode/showTotals/showPoc/showStats are read fresh at draw time in
  // footprintRender.ts (never baked into PreparedCandleDraw), so switching
  // between them is render-only and does NOT require a cache rebuild — this
  // is what lets Phase 3's mode-strip UI flip cellMode without any store or
  // prep-cache cost. Only imbalanceRatio/imbalanceMinVolPct/stackedMin/
  // imbalanceStackedOnly are baked into the prepared structure (they drive
  // detectImbalances/detectStackedZones/applyStackedOnlyFilter at prep time)
  // and require a rebuild when they change.
  useEffect(() => {
    dirtyRef.current = true;
  }, [config.cellMode, config.showTotals, config.showPoc, config.showStats]);

  useEffect(() => {
    dirtyRef.current = true;
    preparedCacheRef.current.clear();
    mergeFactorCacheRef.current.clear();
  }, [config.imbalanceRatio, config.imbalanceMinVolPct, config.stackedMin, config.imbalanceStackedOnly]);

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
  // redundant there). Runs on every crosshair move — no per-frame data scans,
  // no rAF: this is purely event-driven.
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
  }, [chart, hoveredCandle]);

  // ── rAF draw loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const chartInstance = chart;
    const seriesInstance = series;
    let running = true;

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
        if (candles.length === 0) return;

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

        // forceFullDetail (Trading Arena Footprint tab): skip the zoom-driven
        // gate entirely and always render at 'full' — see FootprintConfig's
        // doc comment. Every other caller leaves this undefined/false, so
        // computeDetailLevel's existing hysteresis behavior is unaffected.
        const detail = config.forceFullDetail ? 'full' : computeDetailLevel(candleWidthPx, rowHeightPx, currentStageRef.current);
        if (detail !== currentStageRef.current) {
          currentStageRef.current = detail;
          onStageChangeRef.current?.(detail);
        }
        if (detail === 'hidden') return;

        // Live edge = x of the last visible logical bar (right edge of the pane
        // when the chart is scrolled to "now", else the rightmost resolvable bar).
        const liveEdgeX = paneW;
        const latestCandle = candles[candles.length - 1];
        const latestRange = computeCandleRange(latestCandle, rowSize);

        // Session Δ (running cumulative delta from the oldest LOADED candle,
        // not a global CVD) — computed ONCE per dirty frame via
        // getCvdSeries(), never per-candle/per-frame-scan. Only needed when
        // the stats strip is actually going to render (showStats + 'full').
        const needsStats = config.showStats && detail === 'full';
        const cvdByTime = new Map<number, number>();
        if (needsStats && candles.length > 0) {
          const cvdSeries = activeStore.getCvdSeries(candles[0].time, candles[candles.length - 1].time);
          for (const point of cvdSeries) cvdByTime.set(point.time, point.cvd);
        }

        // OHLC lookup for the candle skeleton strip (task: FootprintLayer has
        // no OHLC of its own — FlowBinStore only tracks buy/sell volume per
        // price bin — so this reads from the candlestick series' own bars,
        // threaded in via the `bars` prop). Built once per dirty frame, same
        // cost class as cvdByTime above, never per pan/zoom frame.
        const ohlcByTime = new Map<number, { open: number; high: number; low: number; close: number }>();
        if (detail === 'full' && barsRef.current) {
          for (const bar of barsRef.current) {
            ohlcByTime.set(bar.time as unknown as number, { open: bar.open, high: bar.high, low: bar.low, close: bar.close });
          }
        }

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
            },
          );

          if (detail === 'full') {
            const barLeftX = Math.max(0, x - candleWidthPx / 2);
            const barRightX = Math.min(paneW, x + candleWidthPx / 2);
            if (config.showStats) {
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

        if (statsBars.length > 0) {
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
          drawStatsBandAt(ctx, statsBars, {
            top: cssH - FOOTPRINT_STATS_BAND_HEIGHT,
            labelGutterWidth: FOOTPRINT_STATS_LEGEND_GUTTER_WIDTH,
            rowMaxima,
          });
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

export default FootprintLayer;
