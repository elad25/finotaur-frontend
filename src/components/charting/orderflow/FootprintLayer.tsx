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

import { useEffect, useRef } from 'react';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import type { FlowBinStore } from './flowBinStore';
import type { FootprintConfig, FlowCandleView } from './types';
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

  configRef.current = config;
  visibleRef.current = visible;
  widthRef.current = width;
  heightRef.current = height;
  storeRef.current = store;
  onStageChangeRef.current = onStageChange;

  // Prepared per-candle draw cache, rebuilt only on data/config dirty.
  // Keyed by candle time (seconds).
  const preparedCacheRef = useRef<Map<number, PreparedCandleDraw>>(new Map());
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

        const detail = computeDetailLevel(candleWidthPx, rowHeightPx, currentStageRef.current);
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

        // Bar columns collected for a single batched stats-band draw call
        // after the per-candle footprint loop (drawStatsBandAt computes
        // heat-shading row maxima once across all visible bars).
        const statsBars: StatsBarColumn[] = [];
        const totalsBars: { prepared: PreparedCandleDraw; leftX: number; rightX: number }[] = [];

        for (const candle of candles) {
          const x = timeToX(candle.time);
          if (x + candleWidthPx / 2 < 0 || x - candleWidthPx / 2 > paneW) continue; // cull

          let prepared = preparedCacheRef.current.get(candle.time);
          if (!prepared) {
            const mergeFactor = detail === 'full'
              ? computeRowMergeFactor(estimateCandleHeightPx(candle, rowSize, rowHeightPx), candle.bins.length)
              : 1;
            prepared = prepareCandleDraw(candle, rowSize, mergeFactor, config);
            preparedCacheRef.current.set(candle.time, prepared);
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
            labelGutterWidth: 0,
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

  return (
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

/** Rough px-height estimate for a candle's full bin range, for row-merge factor decisions. */
function estimateCandleHeightPx(candle: FlowCandleView, rowSize: number, rowHeightPx: number): number {
  if (candle.bins.length === 0 || rowHeightPx <= 0) return 0;
  return candle.bins.length * rowHeightPx;
}

export default FootprintLayer;
