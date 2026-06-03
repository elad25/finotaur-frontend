/**
 * BacktestReplayChart — time-travel paper-trading chart.
 *
 * Phase 4 of the backtest sprint. Pre-fetches a window of historical bars
 * ending around `replayStartTime`, hides everything after the cursor, and
 * advances the cursor on PLAY / STEP. Each cursor advance:
 *   1. Reveals the next bar via series.update() (cheap — no full rebuild)
 *   2. Calls onBarReveal(bar) so the parent can check SL/TP against active
 *      position and auto-close if hit
 *
 * Calls `createChart()` directly instead of going through FinotaurChart.
 * Replay needs incremental updates via series.update(); FinotaurChart fetches
 * + setData()s in one shot. Re-using the primitive would require adding a
 * "controlled" mode to it — out of scope for Phase 4. The visual signature is
 * copied from FinotaurChart's FINOTAUR_DARK_THEME so the two look identical.
 *
 * The window:
 *   - replayStartTime is the "now" point the trader picks (e.g. 2024-09-15 09:30 ET).
 *   - We fetch [start − 200 bars, start + 500 bars] worth of seconds.
 *   - At cursor = -1, only the 200 historical bars are visible. Each advance
 *     reveals one of the 500 "future" bars.
 *   - When cursor reaches 500, we're at the end and pause.
 *
 * Drawing integration (additive — does not change existing behaviour):
 *   - Exposes chart + series + container via forwardRef / useImperativeHandle
 *     so BacktestChart can mount DrawingLayer as an overlay.
 *   - Fires onViewChange whenever the user pans or zooms so the parent can
 *     force DrawingLayer to repaint (DrawingLayer repaints via useEffect deps;
 *     a stable chart ref won't retrigger it on scroll — we need a fresh signal).
 *   - Fires onChartReady(chart, series, container) once after createChart()
 *     so the parent knows the chart is available and can mount the overlay.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type MouseEventParams,
  type UTCTimestamp,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts';

import type { Bar, ChartDataSource, Interval } from '@/components/charting/types';
import type { PaperPosition, PendingOrder } from '@/hooks/useBacktestSession';
import { useReplayPlayback } from '@/hooks/useReplayPlayback';
import { ReplayControls } from './ReplayControls';

// ─── Theme tokens — kept in sync with FinotaurChart ─────────────
const THEME = {
  background: '#08080a',
  grid: '#1f1f23',
  text: '#a1a1aa',
  textAxis: '#71717a',
  candleUp: '#22c55e',
  candleDown: '#dc2626',
  candleWickUp: '#16a34a',
  candleWickDown: '#b91c1c',
  brandGold: '#eab308',
} as const;

// Bars to pre-fetch on each side of the replay-start moment. ~700 total
// at 5m bars = ~58 hours of replay — enough for a multi-day session
// while keeping payload modest. Tweak if you need more "future" runway.
const BARS_BEFORE_START = 200;
const BARS_AFTER_START = 500;

/** Seconds per bar for the given interval. Used to pick the fetch window. */
function intervalSeconds(iv: Interval): number {
  switch (iv) {
    case '1m': return 60;
    case '2m': return 120;
    case '5m': return 300;
    case '15m': return 900;
    case '30m': return 1800;
    case '60m':
    case '1h': return 3600;
    case '4h': return 14400;
    case '1d': return 86400;
    case '1wk': return 7 * 86400;
    case '1mo': return 30 * 86400;
  }
}

export interface ContextMenuPriceInfo {
  /** Price the user right-clicked at (computed from screen Y via priceScale). */
  price: number;
  /** Current cursor bar's close — for above/below decision in the menu. */
  currentPrice: number;
  /** Screen coordinates so the parent can position a popover. */
  x: number;
  y: number;
}

/**
 * Ref handle exposed to BacktestChart so it can wire DrawingLayer without
 * accessing internal refs directly.
 */
export interface BacktestReplayChartHandle {
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick'> | null;
  container: HTMLDivElement | null;
}

export interface BacktestReplayChartProps {
  symbol: string;
  interval: Interval;
  dataSource: ChartDataSource;
  /** The "now" moment in the replay. UTC seconds. */
  replayStartTime: number;
  /** Currently open position — used to check SL/TP on each bar advance + paint live entry marker. */
  activePosition?: PaperPosition;
  /** Closed positions — painted as historical markers. */
  closedPositions: PaperPosition[];
  /** Phase 6: pending orders — painted as horizontal price lines on the chart. */
  pendingOrders?: PendingOrder[];
  /** Called when a bar is revealed (after cursor advance). Parent uses this to fire SL/TP + pending order fills. */
  onBarReveal?: (bar: Bar) => void;
  /** Called when the user clicks a candle. Parent uses this to open a position at that bar's close. */
  onBarClick?: (bar: Bar) => void;
  /** Phase 6: right-click — parent renders the order-type context menu at given screen coords. */
  onContextMenu?: (info: ContextMenuPriceInfo) => void;
  /**
   * Fired on every bar reveal (cursor advance) with that bar's close price.
   * Parent uses this to keep the "current price" input in sync with the replay
   * cursor so market-order entry defaults to the live last price.
   */
  onPriceUpdate?: (price: number) => void;
  /**
   * Drawing integration: fired once after createChart() with the live
   * chart + series + container refs. Parent mounts DrawingLayer at this point.
   */
  onChartReady?: (
    chart: IChartApi,
    series: ISeriesApi<'Candlestick'>,
    container: HTMLDivElement,
  ) => void;
  /**
   * Drawing integration: fired on every pan / zoom so the parent can force
   * DrawingLayer to repaint (DrawingLayer's useEffect only triggers on prop
   * changes — stable chart ref won't retrigger on scroll alone).
   */
  onViewChange?: () => void;
  /**
   * Drawing integration: fired on every chart left-click with the converted
   * { time, price } coordinate. Parent uses this to drive the drawing state
   * machine (startDrawing / updateDrawing / finishDrawing). Fired on EVERY
   * click; parent is responsible for gating on current tool. The existing
   * onBarClick (trade entry) continues to fire independently — BacktestChart
   * gates it to cursor mode only.
   */
  onChartClick?: (point: { time: number; price: number }) => void;
  /**
   * Drawing integration: fired on every crosshair move with the converted
   * { time, price } coordinate. Parent uses this to feed the live preview
   * point into updateDrawing() while a drawing is in progress.
   */
  onCrosshairMove?: (point: { time: number; price: number } | null) => void;
  /** Height in px (or any CSS height string). */
  height?: string | number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; bars: Bar[]; startIndex: number };

export const BacktestReplayChart = forwardRef<BacktestReplayChartHandle, BacktestReplayChartProps>(function BacktestReplayChart({
  symbol,
  interval,
  dataSource,
  replayStartTime,
  activePosition,
  closedPositions,
  pendingOrders = [],
  onBarReveal,
  onBarClick,
  onContextMenu,
  onPriceUpdate,
  onChartReady,
  onViewChange,
  onChartClick,
  onCrosshairMove,
  height = '100%',
}: BacktestReplayChartProps, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const onBarClickRef = useRef(onBarClick);
  const onBarRevealRef = useRef(onBarReveal);
  const onContextMenuRef = useRef(onContextMenu);
  const onViewChangeRef = useRef(onViewChange);
  const onPriceUpdateRef = useRef(onPriceUpdate);
  const onChartClickRef = useRef(onChartClick);
  const onCrosshairMoveRef = useRef(onCrosshairMove);
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map());

  // Keep callback refs up-to-date without triggering chart remount.
  useEffect(() => { onViewChangeRef.current = onViewChange; }, [onViewChange]);
  useEffect(() => { onPriceUpdateRef.current = onPriceUpdate; }, [onPriceUpdate]);
  useEffect(() => { onChartClickRef.current = onChartClick; }, [onChartClick]);
  useEffect(() => { onCrosshairMoveRef.current = onCrosshairMove; }, [onCrosshairMove]);

  // Expose chart/series/container to BacktestChart via forwardRef so
  // DrawingLayer can be mounted as a sibling overlay.
  useImperativeHandle(ref, () => ({
    get chart() { return chartRef.current; },
    get series() { return seriesRef.current; },
    get container() { return containerRef.current; },
  }));

  useEffect(() => { onBarClickRef.current = onBarClick; }, [onBarClick]);
  useEffect(() => { onBarRevealRef.current = onBarReveal; }, [onBarReveal]);
  useEffect(() => { onContextMenuRef.current = onContextMenu; }, [onContextMenu]);

  // Keep onChartReady stable — called once per chart mount, no need for a ref
  // because the chart lifecycle effect captures it at mount time only.
  const onChartReadyRef = useRef(onChartReady);
  useEffect(() => { onChartReadyRef.current = onChartReady; }, [onChartReady]);

  const [load, setLoad] = useState<LoadState>({ kind: 'loading' });

  // ─── Fetch the replay window ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoad({ kind: 'loading' });

    const secPerBar = intervalSeconds(interval);
    const from = (replayStartTime - BARS_BEFORE_START * secPerBar) as UTCTimestamp;
    const to = (replayStartTime + BARS_AFTER_START * secPerBar) as UTCTimestamp;

    dataSource
      .getBars(symbol, interval, from, to)
      .then((bars) => {
        if (cancelled) return;
        if (!bars || bars.length === 0) {
          setLoad({ kind: 'error', message: `No bars returned for ${symbol} ${interval}. Pick a different date or interval.` });
          return;
        }
        // Find the index closest to the replayStartTime — that's where the
        // cursor starts (last visible bar at "now").
        let startIndex = 0;
        for (let i = 0; i < bars.length; i++) {
          if ((bars[i].time as number) <= replayStartTime) startIndex = i;
          else break;
        }
        setLoad({ kind: 'ready', bars, startIndex });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoad({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to fetch bars' });
      });

    return () => { cancelled = true; };
  }, [symbol, interval, replayStartTime, dataSource]);

  // ─── Playback engine ─────────────────────────────────────────
  const bars = load.kind === 'ready' ? load.bars : [];
  const startIndex = load.kind === 'ready' ? load.startIndex : 0;
  const maxIndex = bars.length - 1;

  // Track the highest cursor index whose bar has been pushed to the series
  // via update(). lightweight-charts throws "Cannot update oldest data" if
  // we hand it a time older than the last data point — which would happen
  // if cursor sync re-fires advance for an already-seeded bar. Guard.
  const lastUpdatedIdxRef = useRef<number>(-1);

  // Whenever bars change (new window loaded), reset the high-water mark to
  // the seeded end (= startIndex). New advances after that are real.
  useEffect(() => {
    lastUpdatedIdxRef.current = startIndex;
  }, [bars, startIndex]);

  const handleAdvance = useCallback((newCursor: number) => {
    const bar = bars[newCursor];
    if (!bar || !seriesRef.current) return;
    // Skip if this bar was already drawn during seeding or a prior advance.
    if (newCursor <= lastUpdatedIdxRef.current) {
      onBarRevealRef.current?.(bar);
      onPriceUpdateRef.current?.(bar.close);
      return;
    }
    lastUpdatedIdxRef.current = newCursor;
    seriesRef.current.update({
      time: bar.time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    });
    onBarRevealRef.current?.(bar);
    onPriceUpdateRef.current?.(bar.close);
  }, [bars, startIndex]);

  const playback = useReplayPlayback({
    maxIndex,
    initialCursor: startIndex,
    onAdvance: handleAdvance,
  });

  // ─── Chart lifecycle ─────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    if (load.kind !== 'ready') return;

    const container = containerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: THEME.background },
        textColor: THEME.text,
        fontSize: 11,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      grid: {
        vertLines: { color: THEME.grid, style: 1 },
        horzLines: { color: THEME.grid, style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: THEME.textAxis, width: 1, style: 3, labelBackgroundColor: '#27272a' },
        horzLine: { color: THEME.textAxis, width: 1, style: 3, labelBackgroundColor: '#27272a' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: THEME.grid,
        rightOffset: 10,
        barSpacing: 8,
      },
      rightPriceScale: {
        borderColor: THEME.grid,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addCandlestickSeries({
      upColor: THEME.candleUp,
      downColor: THEME.candleDown,
      wickUpColor: THEME.candleWickUp,
      wickDownColor: THEME.candleWickDown,
      borderUpColor: THEME.candleUp,
      borderDownColor: THEME.candleDown,
    });

    // Seed with only the bars up to the initial cursor (= startIndex). All
    // "future" bars stay hidden until cursor advances reveal them.
    const visible = bars.slice(0, startIndex + 1).map((b) => ({
      time: b.time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
    series.setData(visible);
    chart.timeScale().fitContent();

    // Click handler: fires onChartClick (drawing engine) and onBarClick (trade entry).
    // onBarClick is gated to cursor mode in BacktestChart via handleReplayBarClick;
    // onChartClick fires on every click so the drawing state machine can decide.
    chart.subscribeClick((param) => {
      // Drawing: convert param → {time, price} and fire onChartClick on every click.
      // Guard: param.point must exist and series must be available for coordinate conversion.
      if (param.time && param.point && seriesRef.current) {
        const price = seriesRef.current.coordinateToPrice(param.point.y);
        if (price !== null) {
          onChartClickRef.current?.({ time: param.time as number, price: Number(price) });
        }
      }

      // Trade entry: map the clicked Time back to the underlying bar.
      if (!param.time || !onBarClickRef.current) return;
      const clickedTime = param.time as number;
      // The clicked time may correspond to any visible bar — find it.
      const found = bars.find((b) => (b.time as number) === clickedTime);
      if (found) onBarClickRef.current(found);
    });

    // Crosshair-move handler: converts param → {time, price} and fires
    // onCrosshairMove so BacktestChart can feed the live-preview point into
    // updateDrawing() while a drawing is in progress. Fires null when the
    // crosshair leaves the chart area (param.point is undefined).
    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!onCrosshairMoveRef.current) return;
      if (!param.point || !param.time || !seriesRef.current) {
        onCrosshairMoveRef.current(null);
        return;
      }
      const price = seriesRef.current.coordinateToPrice(param.point.y);
      if (price === null) {
        onCrosshairMoveRef.current(null);
        return;
      }
      onCrosshairMoveRef.current({ time: param.time as number, price: Number(price) });
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    // Phase 6: right-click → order context menu. Compute the clicked price
    // by converting the local Y coordinate via the candlestick series.
    // lightweight-charts has no native contextmenu hook, so we listen on
    // the container DOM and translate ourselves.
    const handleContextMenu = (e: MouseEvent) => {
      if (!onContextMenuRef.current || !seriesRef.current || !containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const localY = e.clientY - rect.top;
      const price = seriesRef.current.coordinateToPrice(localY);
      if (price == null || !Number.isFinite(price)) return;
      // Current price = last visible bar's close (the cursor bar). Use ref
      // to grab the freshest value at click time.
      const lastBarIdxAtClick = lastUpdatedIdxRef.current;
      const lastBar = bars[lastBarIdxAtClick];
      if (!lastBar) return;
      onContextMenuRef.current({
        price: Number(price),
        currentPrice: lastBar.close,
        x: e.clientX,
        y: e.clientY,
      });
    };
    container.addEventListener('contextmenu', handleContextMenu);

    chartRef.current = chart;
    seriesRef.current = series;

    // Notify parent that chart + series are ready so it can mount DrawingLayer.
    onChartReadyRef.current?.(chart, series, container);

    // Subscribe to pan/zoom so parent can force DrawingLayer to repaint.
    // DrawingLayer uses a useEffect with [drawings, chart, series, ...] deps;
    // since chart/series are stable object refs, scroll alone won't retrigger
    // it. We fire onViewChange on every visible-range change so the parent can
    // spread drawings into a new array ref, which WILL retrigger the effect.
    chart.timeScale().subscribeVisibleTimeRangeChange(() => {
      onViewChangeRef.current?.();
    });

    // Responsive resize.
    const ro = new ResizeObserver(() => {
      if (!container || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      container.removeEventListener('contextmenu', handleContextMenu);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      priceLinesRef.current.clear();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // We intentionally re-mount the chart only on window changes (bars
    // identity). Cursor changes are handled via series.update() above,
    // which doesn't need a full re-mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load.kind === 'ready' ? bars : null]);

  // ─── Markers ────────────────────────────────────────────────
  // Repaint markers whenever positions change. Only include markers up to
  // the current cursor so future entries (if any from a loaded session)
  // don't reveal themselves prematurely.
  useEffect(() => {
    if (!seriesRef.current || load.kind !== 'ready') return;
    const visibleTime = bars[playback.cursor]?.time as number | undefined;
    if (visibleTime == null) {
      seriesRef.current.setMarkers([]);
      return;
    }

    const markers: SeriesMarker<Time>[] = [];

    const pushPosition = (p: PaperPosition) => {
      if (p.entryTime <= visibleTime) {
        markers.push({
          time: p.entryTime as UTCTimestamp,
          position: p.side === 'LONG' ? 'belowBar' : 'aboveBar',
          shape: p.side === 'LONG' ? 'arrowUp' : 'arrowDown',
          color: p.side === 'LONG' ? THEME.candleUp : THEME.candleDown,
          text: `${p.side} ${p.entryPrice.toFixed(2)}`,
        });
      }
      if (p.exitTime != null && p.exitPrice != null && p.exitTime <= visibleTime) {
        markers.push({
          time: p.exitTime as UTCTimestamp,
          position: 'aboveBar',
          shape: 'circle',
          color: (p.pnl ?? 0) >= 0 ? THEME.candleUp : THEME.candleDown,
          text: `${(p.exitReason ?? 'exit').toUpperCase()} ${p.exitPrice.toFixed(2)}`,
        });
      }
    };

    for (const p of closedPositions) pushPosition(p);
    if (activePosition) pushPosition(activePosition);

    markers.sort((a, b) => (a.time as number) - (b.time as number));
    seriesRef.current.setMarkers(markers);
  }, [activePosition, closedPositions, playback.cursor, bars, load.kind]);

  // Phase 7: pending order price lines are now rendered by OrderLinesOverlay
  // (draggable HTML overlay) in BacktestChart.tsx. The static createPriceLine
  // approach here has been removed to avoid double-drawing.
  // priceLinesRef is kept for the cleanup path in the chart lifecycle effect.
  // Clean up any lingering price lines if they somehow exist.
  useEffect(() => {
    if (!seriesRef.current) return;
    const existing = priceLinesRef.current;
    if (existing.size === 0) return;
    const series = seriesRef.current;
    for (const line of existing.values()) {
      series.removePriceLine(line);
    }
    existing.clear();
  }, [pendingOrders]);

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full flex-col">
      <ReplayControls
        isPlaying={playback.isPlaying}
        speed={playback.speed}
        cursor={playback.cursor}
        maxIndex={maxIndex}
        onPlay={playback.play}
        onPause={playback.pause}
        onStep={playback.step}
        onStepBack={playback.stepBack}
        onReset={playback.reset}
        onSpeedChange={playback.setSpeed}
      />
      <div className="relative flex-1" style={{ minHeight: 0 }}>
        <div ref={containerRef} className="absolute inset-0" style={{ height }} />
        {load.kind === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#08080a]/80 text-sm text-zinc-500">
            Loading replay window…
          </div>
        )}
        {load.kind === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#08080a]/80 px-6 text-center text-sm text-rose-400">
            {load.message}
          </div>
        )}
      </div>
    </div>
  );
});

BacktestReplayChart.displayName = 'BacktestReplayChart';

/** Compute the current cursor bar's time (UTC seconds) for the given playback + bars. */
export function cursorBarTime(bars: Bar[], cursor: number): number | null {
  const b = bars[cursor];
  return b ? (b.time as number) : null;
}
