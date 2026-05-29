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
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts';
import { Scissors } from 'lucide-react';
import dayjs from 'dayjs';

import type { Bar, ChartDataSource, Interval } from '@/components/charting/types';
import type { PaperPosition, PendingOrder } from '@/hooks/useBacktestSession';
import { useReplayPlayback } from '@/hooks/useReplayPlayback';
import { ReplayControls } from './ReplayControls';

// Height of the time-axis row (lightweight-charts default is ~28px).
const TIMESCALE_HEIGHT = 28;

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
const BARS_BEFORE_START = 1000;
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
   * TV-style replay: when the user left-clicks on the chart, jump playback to
   * that timestamp. The parent resets replayStart + the playback cursor.
   * When provided, click-to-jump takes precedence over click-to-trade.
   */
  onJumpToTime?: (date: Date) => void;
  /** Show the TV-style replay cursor (vertical line, scissors, gray overlay, date label).
   *  Should be true when chartMode === 'replay'. */
  showReplayCursor?: boolean;
  /** Height in px (or any CSS height string). */
  height?: string | number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; bars: Bar[]; startIndex: number };

export function BacktestReplayChart({
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
  onJumpToTime,
  showReplayCursor = false,
  height = '100%',
}: BacktestReplayChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const onBarClickRef = useRef(onBarClick);
  const onBarRevealRef = useRef(onBarReveal);
  const onContextMenuRef = useRef(onContextMenu);
  const onJumpToTimeRef = useRef(onJumpToTime);
  const showReplayCursorRef = useRef(showReplayCursor);
  // Ref so the chart lifecycle closure (subscribeClick) always calls the
  // latest setCursor from the playback engine, even after bars reload.
  const setCursorRef = useRef<((c: number) => void) | null>(null);
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  const jumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Replay cursor overlay state ─────────────────────────────
  // X pixel position of the vertical cut line (null = hidden / out of range).
  const [cursorX, setCursorX] = useState<number | null>(null);
  // Width of the chart container (for gray-overlay right-side calc).
  const [chartWidth, setChartWidth] = useState(0);
  // Mouse hover position — when set, preview takes over from playback cursor.
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  // Pixel coordinates for the active-position TP/SL zones overlay (#4).
  const [posZones, setPosZones] = useState<{
    entryY: number | null;
    tpY: number | null;
    slY: number | null;
    entryX: number;
  } | null>(null);

  // Replay-rewind ("REPLAY" button) armed state. Default OFF (Elad 2026-05-29):
  // the chart opens in normal mode — a click trades, no surprise jump. The
  // trader arms rewind via the toolbar REPLAY button, then ONE click jumps the
  // cursor to that bar and it auto-disarms back to normal crosshair.
  const [scissorsArmed, setScissorsArmed] = useState(false);
  const scissorsArmedRef = useRef(scissorsArmed);

  useEffect(() => { onBarClickRef.current = onBarClick; }, [onBarClick]);
  useEffect(() => { onBarRevealRef.current = onBarReveal; }, [onBarReveal]);
  useEffect(() => { onContextMenuRef.current = onContextMenu; }, [onContextMenu]);
  useEffect(() => { onJumpToTimeRef.current = onJumpToTime; }, [onJumpToTime]);
  useEffect(() => { showReplayCursorRef.current = showReplayCursor; }, [showReplayCursor]);
  useEffect(() => { scissorsArmedRef.current = scissorsArmed; }, [scissorsArmed]);

  const [load, setLoad] = useState<LoadState>({ kind: 'loading' });

  // ─── Fetch the replay window ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoad({ kind: 'loading' });

    const secPerBar = intervalSeconds(interval);
    const from = (replayStartTime - BARS_BEFORE_START * secPerBar) as UTCTimestamp;
    const nowSec = Math.floor(Date.now() / 1000);
    const to = Math.min(replayStartTime + BARS_AFTER_START * secPerBar, nowSec) as UTCTimestamp;

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
  }, [bars, startIndex]);

  const playback = useReplayPlayback({
    maxIndex,
    initialCursor: startIndex,
    onAdvance: handleAdvance,
  });

  // Keep setCursorRef in sync so the chart lifecycle closure can always call
  // the latest setCursor without needing playback in its deps array.
  useEffect(() => { setCursorRef.current = playback.setCursor; }, [playback.setCursor]);

  // ─── Chart lifecycle ─────────────────────────────────────────
  useEffect(() => {
    // Guard: only create the chart once bars are ready.
    // Using `bars` directly in deps (not the ternary) so React sees a stable
    // reference identity change rather than null→array flips on rapid re-picks.
    let cancelled = false;
    if (!containerRef.current) return;
    if (load.kind !== 'ready') return;
    if (cancelled) return;

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
    // Show a stable window of the most recent ~150 bars near the cursor
    // instead of fitContent() (which zooms out to fit all ~1000 history bars
    // and causes the viewport to jump on every re-seed / LIVE->REPLAY toggle).
    const seededCount = startIndex + 1;
    const VISIBLE_WINDOW = 150;
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, seededCount - VISIBLE_WINDOW),
      to: seededCount + 2,
    });

    // Click handler: jump-to-time (TV replay UX) takes priority when wired;
    // falls back to click-to-trade. Right-click is handled separately via the
    // DOM contextmenu listener below — this only fires on left-click.
    chart.subscribeClick((param) => {
      if (!param.time) return;
      const clickedTime = param.time as number;
      // Scissors armed → this click is a time-rewind (jump). Disarm right after
      // so the next click trades normally and the scissors cursor disappears.
      // Disarmed → fall through to click-to-trade (onBarClick).
      if (scissorsArmedRef.current && onJumpToTimeRef.current) {
        setScissorsArmed(false);
        const targetIdx = bars.findIndex((b) => (b.time as number) === clickedTime);

        // Animate scroll toward the clicked bar regardless of path taken.
        const currentRange = chart.timeScale().getVisibleLogicalRange();
        if (currentRange && targetIdx >= 0) {
          const center = (currentRange.from + currentRange.to) / 2;
          const delta = targetIdx - center;
          chart.timeScale().scrollToPosition(
            chart.timeScale().scrollPosition() + delta,
            true, // animated
          );
        }

        // If the bar is already within the loaded window, jump directly via
        // setCursor — no re-fetch, no loading state. The redraw effect below
        // handles resetting the series for backward and forward moves.
        // Use the ref so we always call the latest setCursor even though this
        // closure is captured once per bars mount.
        if (targetIdx >= 0 && targetIdx < bars.length) {
          setCursorRef.current?.(targetIdx);
          return;
        }

        // Clicked outside the loaded window — delegate to the parent so it
        // can re-fetch a new window around the target date.
        if (jumpTimerRef.current !== null) clearTimeout(jumpTimerRef.current);
        jumpTimerRef.current = setTimeout(() => {
          jumpTimerRef.current = null;
          onJumpToTimeRef.current?.(new Date(clickedTime * 1000));
        }, 280);
        return;
      }
      if (!onBarClickRef.current) return;
      const found = bars.find((b) => (b.time as number) === clickedTime);
      if (found) onBarClickRef.current(found);
    });

    // TV-style preview: crosshair moves → update hover state so the scissors
    // + gray overlay + date label follow the mouse. param.time is undefined
    // when the crosshair leaves the plot area.
    // handleCrosshairMove — param type inferred from chart.subscribeCrosshairMove signature.
    const handleCrosshairMove: Parameters<typeof chart.subscribeCrosshairMove>[0] = (param) => {
      // Only follow the mouse while the scissors tool is armed. Once disarmed
      // (after a rewind), clear the preview so a normal crosshair takes over.
      if (!showReplayCursorRef.current || !scissorsArmedRef.current) {
        setHoverX(null);
        setHoverTime(null);
        return;
      }
      if (!param.time) {
        setHoverX(null);
        setHoverTime(null);
        return;
      }
      const x = chart.timeScale().timeToCoordinate(param.time);
      if (x === null) {
        setHoverX(null);
        setHoverTime(null);
        return;
      }
      setHoverX(x);
      setHoverTime(param.time as number);
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    // Fallback: clear preview when the pointer physically leaves the container
    // (subscribeCrosshairMove may not fire on rapid exits).
    const handleMouseLeave = () => {
      setHoverX(null);
      setHoverTime(null);
    };
    container.addEventListener('mouseleave', handleMouseLeave);

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

    // Responsive resize.
    const ro = new ResizeObserver(() => {
      if (!container || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
      setChartWidth(container.clientWidth);
    });
    ro.observe(container);
    // Initialise width immediately.
    setChartWidth(container.clientWidth);

    // Recompute the cut-line X position whenever the visible range pans/zooms.
    const updateCursorX = () => {
      if (!chartRef.current || !containerRef.current) return;
      const cursorBar = bars[lastUpdatedIdxRef.current];
      if (!cursorBar) { setCursorX(null); return; }
      const x = chartRef.current.timeScale().timeToCoordinate(cursorBar.time);
      if (x === null) { setCursorX(null); return; }
      const w = containerRef.current.clientWidth;
      if (x < 0 || x > w) { setCursorX(null); return; }
      setCursorX(x);
    };

    chart.timeScale().subscribeVisibleTimeRangeChange(updateCursorX);

    return () => {
      cancelled = true;
      ro.disconnect();
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('mouseleave', handleMouseLeave);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.timeScale().unsubscribeVisibleTimeRangeChange(updateCursorX);
      if (jumpTimerRef.current !== null) {
        clearTimeout(jumpTimerRef.current);
        jumpTimerRef.current = null;
      }
      priceLinesRef.current.clear();
      // chart.remove() is idempotent in lightweight-charts — safe to call
      // even if the container was already detached by concurrent mode.
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setCursorX(null);
      setHoverX(null);
      setHoverTime(null);
    };
    // We intentionally re-mount the chart only on window changes (bars
    // identity). Cursor changes are handled via series.update() above,
    // which doesn't need a full re-mount. `bars` is used directly (not the
    // ternary `load.kind === 'ready' ? bars : null`) so the dep is a stable
    // array reference; the early-return on `load.kind !== 'ready'` above
    // guards against running before data is available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars]);

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

  // Cursor-change redraw. lightweight-charts' series.update() is monotonic-
  // forward only, so any cursor move that isn't a single-step forward needs
  // a full re-seed via setData(). This covers:
  //   - Backward moves (step-back chevron, setCursor to earlier bar)
  //   - Forward jumps that skip bars (setCursor from click-to-jump on an
  //     in-window bar — those bars were never handed to series.update())
  // We re-seed whenever cursor changes AND the new cursor differs from the
  // series' current high-water mark (lastUpdatedIdxRef). Single-step forward
  // advances are handled exclusively by handleAdvance → series.update(); we
  // skip them here to avoid an unnecessary full setData on normal playback.
  const prevCursorRef = useRef(playback.cursor);
  useEffect(() => {
    const prev = prevCursorRef.current;
    prevCursorRef.current = playback.cursor;
    if (!seriesRef.current) return;
    if (bars.length === 0) return;
    // Re-seed if cursor moved backward OR jumped forward past the last update.
    const needsReseed =
      playback.cursor < prev ||
      (playback.cursor > prev && playback.cursor !== lastUpdatedIdxRef.current);
    if (needsReseed && playback.cursor >= 0) {
      const visible = bars.slice(0, playback.cursor + 1).map((b) => ({
        time: b.time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }));
      seriesRef.current.setData(visible);
      lastUpdatedIdxRef.current = playback.cursor;
    }
  }, [playback.cursor, bars]);

  // Phase 6: sync price lines for pending orders. Each order gets a single
  // horizontal line at its trigger price, colored by side (BUY=green,
  // SELL=red) and dashed to distinguish from any future SL/TP overlay.
  useEffect(() => {
    if (!seriesRef.current) return;
    const series = seriesRef.current;
    const existing = priceLinesRef.current;

    // Remove lines whose order is no longer in the active set.
    const liveIds = new Set(pendingOrders.map((o) => o.id));
    for (const [id, line] of existing) {
      if (!liveIds.has(id)) {
        series.removePriceLine(line);
        existing.delete(id);
      }
    }

    // Add or update lines for current pending orders.
    for (const o of pendingOrders) {
      const color = o.side === 'LONG' ? THEME.candleUp : THEME.candleDown;
      const title = `${o.side === 'LONG' ? 'BUY' : 'SELL'} ${o.type} ${o.size}× @ ${o.triggerPrice.toFixed(2)}`;
      const cached = existing.get(o.id);
      if (cached) {
        cached.applyOptions({ price: o.triggerPrice, color, title });
      } else {
        const line = series.createPriceLine({
          price: o.triggerPrice,
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title,
        });
        existing.set(o.id, line);
      }
    }
  }, [pendingOrders]);

  // ─── Replay cursor X: recompute on every cursor/bar advance ─
  useEffect(() => {
    if (!chartRef.current || !containerRef.current || !showReplayCursor) {
      setCursorX(null);
      return;
    }
    const cursorBar = bars[lastUpdatedIdxRef.current];
    if (!cursorBar) { setCursorX(null); return; }
    const x = chartRef.current.timeScale().timeToCoordinate(cursorBar.time);
    if (x === null) { setCursorX(null); return; }
    const w = containerRef.current.clientWidth;
    if (x < 0 || x > w) { setCursorX(null); return; }
    setCursorX(x);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback.cursor, bars, showReplayCursor]);

  // ─── Active-position TP/SL zone coordinates (#4) ─────────────
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || !activePosition) { setPosZones(null); return; }
    const entryY = series.priceToCoordinate(activePosition.entryPrice);
    if (entryY === null) { setPosZones(null); return; }
    const tpY = activePosition.takeProfit != null ? series.priceToCoordinate(activePosition.takeProfit) : null;
    const slY = activePosition.stopLoss != null ? series.priceToCoordinate(activePosition.stopLoss) : null;
    const rawX = chart.timeScale().timeToCoordinate(activePosition.entryTime as UTCTimestamp);
    const entryX = rawX != null && rawX > 0 ? rawX : 0;
    setPosZones({ entryY, tpY, slY, entryX });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePosition, playback.cursor, bars, chartWidth]);

  // Active display X and time: hover preview when available, else playback cursor.
  const activeX = hoverX ?? cursorX;
  // Current playback bar — used as fallback for the date label.
  const currentBar = bars[lastUpdatedIdxRef.current] ?? null;
  const activeTime: number | null = hoverTime ?? (currentBar ? (currentBar.time as number) : null);
  const replayDateLabel = activeTime
    ? dayjs(activeTime * 1000).format("ddd DD MMM 'YY HH:mm")
    : null;

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
        onSeek={playback.setCursor}
        showScissors={showReplayCursor}
        scissorsArmed={scissorsArmed}
        onToggleScissors={() => setScissorsArmed((v) => !v)}
      />
      <div className="relative flex-1" style={{ minHeight: 0 }}>
        {/* cursor-none on container + [&_*]:cursor-none propagates to
            lightweight-charts' inner <canvas> (which sets cursor:crosshair
            itself, otherwise winning over the parent). */}
        <div
          ref={containerRef}
          className={`absolute inset-0${showReplayCursor && scissorsArmed ? ' cursor-none [&_*]:cursor-none' : ''}`}
          style={{ height }}
        />

        {/* ── Active-position TP/SL zones (#4): green entry->TP, red entry->SL ── */}
        {posZones && posZones.entryY !== null && (
          <>
            {posZones.tpY !== null && (
              <div
                className="pointer-events-none absolute z-[5] border-y border-emerald-500/40 bg-emerald-500/15"
                style={{
                  left: `${posZones.entryX}px`,
                  right: 0,
                  top: `${Math.min(posZones.entryY, posZones.tpY)}px`,
                  height: `${Math.abs(posZones.entryY - posZones.tpY)}px`,
                }}
              />
            )}
            {posZones.slY !== null && (
              <div
                className="pointer-events-none absolute z-[5] border-y border-rose-500/40 bg-rose-500/15"
                style={{
                  left: `${posZones.entryX}px`,
                  right: 0,
                  top: `${Math.min(posZones.entryY, posZones.slY)}px`,
                  height: `${Math.abs(posZones.entryY - posZones.slY)}px`,
                }}
              />
            )}
            {/* Entry line */}
            <div
              className="pointer-events-none absolute z-[6] h-px bg-zinc-100"
              style={{ left: `${posZones.entryX}px`, right: 0, top: `${posZones.entryY}px` }}
            />
            {/* TP price tag */}
            {posZones.tpY !== null && activePosition?.takeProfit != null && (
              <div
                className="pointer-events-none absolute right-0 z-[7] -translate-y-1/2 rounded-l bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ top: `${posZones.tpY}px` }}
              >
                TP {activePosition.takeProfit.toFixed(2)}
              </div>
            )}
            {/* SL price tag */}
            {posZones.slY !== null && activePosition?.stopLoss != null && (
              <div
                className="pointer-events-none absolute right-0 z-[7] -translate-y-1/2 rounded-l bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ top: `${posZones.slY}px` }}
              >
                SL {activePosition.stopLoss.toFixed(2)}
              </div>
            )}
          </>
        )}

        {/* ── TV-style replay cursor overlays — only while the scissors tool
            is armed; after a rewind it disarms and a normal crosshair returns. ── */}
        {showReplayCursor && scissorsArmed && activeX !== null && (
          <>
            {/* Vertical cut line */}
            <div
              className="pointer-events-none absolute inset-y-0 z-10 w-px bg-[#7AB6F4]"
              style={{ left: `${activeX}px`, bottom: `${TIMESCALE_HEIGHT}px`, top: 0 }}
            />

            {/* Scissors icon at top of the cut line */}
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2"
              style={{ left: `${activeX}px`, top: '4px' }}
            >
              <Scissors className="h-4 w-4 text-[#7AB6F4]" />
            </div>

            {/* Gray overlay for "future" bars (right of cut line) */}
            {activeX < chartWidth && (
              <div
                className="pointer-events-none absolute z-10 bg-black/40 backdrop-grayscale"
                style={{
                  left: `${activeX + 1}px`,
                  top: 0,
                  right: 0,
                  bottom: `${TIMESCALE_HEIGHT}px`,
                }}
              />
            )}

            {/* Date label at bottom of the cut line */}
            {replayDateLabel && (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-md bg-[#7AB6F4] px-2 py-0.5 text-[11px] font-semibold text-black shadow-md"
                style={{ left: `${activeX}px`, bottom: `${TIMESCALE_HEIGHT + 2}px` }}
              >
                Re: {replayDateLabel}
              </div>
            )}
          </>
        )}

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
}

/** Compute the current cursor bar's time (UTC seconds) for the given playback + bars. */
export function cursorBarTime(bars: Bar[], cursor: number): number | null {
  const b = bars[cursor];
  return b ? (b.time as number) : null;
}
