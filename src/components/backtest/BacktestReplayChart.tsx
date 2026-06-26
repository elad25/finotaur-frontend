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
import { Scissors, X } from 'lucide-react';
import { OrderLinesOverlay } from './OrderLinesOverlay';
import dayjs from 'dayjs';

import type { Bar, ChartDataSource, Interval } from '@/components/charting/types';
import type { PaperPosition, PendingOrder } from '@/hooks/useBacktestSession';
import { useReplayPlayback } from '@/hooks/useReplayPlayback';
import { PositionBox, type PositionBoxModel } from '@/components/charting/PositionBox';
import { ReplayControls } from './ReplayControls';
import { DrawingController } from '@/components/ReplayChart/drawings2/DrawingController';
import { DrawingToolbar2 } from '@/components/ReplayChart/drawings2/DrawingToolbar2';
import type { ToolId } from '@/components/ReplayChart/drawings2/base';

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

// Forward "future" runway revealed by PLAY after the replay-start moment.
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

// Maximum history (seconds) to pull BEFORE the replay-start moment, tuned to
// Yahoo's per-interval intraday limits (1m→7d, 5m→60d, 15m→60d, 1h→2y, 1d→max).
// We deliberately request the largest window each interval allows so the chart
// has as many bars as possible. The chart-bars edge fn caches immutable history
// (chart_bars_cache + CDN), so a wide window is fetched once and reused — no
// per-call cost (Yahoo is free).
function maxLookbackSeconds(iv: Interval): number {
  const DAY = 86400;
  switch (iv) {
    case '1m':
    case '2m': return 7 * DAY;
    case '5m':
    case '15m':
    case '30m': return 60 * DAY;
    case '60m':
    case '1h': return 180 * DAY;          // Yahoo 1h is flaky near its 730d ceiling — cap to a fast, reliable window
    case '4h': return 365 * DAY;          // 4h tolerates a longer window; still well under Yahoo's limit
    case '1d':
    case '1wk':
    case '1mo': return 20 * 365 * DAY;    // effectively all available
    default: return 60 * DAY;
  }
}

/**
 * Position the latest (cursor) bar at the horizontal CENTER of the viewport,
 * leaving open "future" room to the right that fills in as the trader PLAYs —
 * TradingView-style replay framing. The series only holds bars up to the
 * cursor, so the cursor is the last bar; we scroll it left from the right edge
 * by half a viewport-worth of bars.
 */
function centerCursorBar(chart: IChartApi, container: HTMLDivElement, animated: boolean): void {
  const w = container.clientWidth;
  if (w <= 0) return;
  const barSpacing = chart.timeScale().options().barSpacing || 8;
  chart.timeScale().scrollToPosition((w / barSpacing) / 2, animated);
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
  /** Reports the current cursor bar (last revealed) so the parent can fill MARKET orders at its close/time. */
  onCurrentBarChange?: (bar: Bar | null) => void;
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
  /**
   * Draggable risk/reward position box. The component injects the live cursor-bar
   * close as `currentPrice` so Open P&L tracks the replay. Replaces the old static
   * TP/SL zones overlay; recomputes coordinates on pan/zoom/resize.
   */
  positionOverlay?: {
    model: PositionBoxModel;
    onStopLossChange: (price: number) => void;
    onTakeProfitChange: (price: number) => void;
    onEntryChange?: (price: number) => void;
  };
  /**
   * When true, the next left-click on the chart places a LIMIT order via
   * onPlaceLimitAtPrice instead of triggering the normal bar-click/jump flow.
   * The parent is responsible for disarming after the order is placed.
   */
  placeOrderArmed?: boolean;
  /** Called with (price, currentPrice) when the user clicks while placeOrderArmed. */
  onPlaceLimitAtPrice?: (price: number, currentPrice: number) => void;
  /**
   * Mount the TradingView-style drawing tools overlay (toolbar + canvas layer).
   * Defaults to true. Set to false to suppress drawing tools entirely.
   */
  enableDrawings?: boolean;
  /** Called when the user clicks the X button next to a pending order price line. */
  onCancelPending?: (orderId: string) => void;
  /**
   * Drag-to-adjust callbacks for the draggable order lines overlay.
   * When provided, SL/TP/pending trigger lines become draggable in cursor mode.
   */
  onUpdateSL?: (price: number) => void;
  onUpdateTP?: (price: number) => void;
  onUpdatePendingPrice?: (orderId: string, price: number) => void;
  /** Phase 7: called when user drags a multi-leg TP line to a new price. */
  onUpdateTpLeg?: (legId: string, price: number) => void;
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
  onCurrentBarChange,
  onJumpToTime,
  showReplayCursor = false,
  height = '100%',
  positionOverlay,
  placeOrderArmed = false,
  onPlaceLimitAtPrice,
  enableDrawings = true,
  onCancelPending,
  onUpdateSL,
  onUpdateTP,
  onUpdatePendingPrice,
  onUpdateTpLeg,
}: BacktestReplayChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const onBarClickRef = useRef(onBarClick);
  const onBarRevealRef = useRef(onBarReveal);
  const onContextMenuRef = useRef(onContextMenu);
  const onCurrentBarChangeRef = useRef(onCurrentBarChange);
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
  // Bumping counter that re-renders the PositionBox overlay on pan/zoom/resize
  // so its pixel coordinates stay glued to price (fixes the old static overlay
  // whose entry line / zones got stuck after zoom).
  const [overlayTick, setOverlayTick] = useState(0);
  // Resize-cursor hint when hovering an axis: 'ns' over the price scale (drag to
  // rescale price), 'ew' over the time scale (drag to rescale time). null = plot.
  const [axisCursor, setAxisCursor] = useState<null | 'ns' | 'ew'>(null);

  // Replay-rewind ("REPLAY" button) armed state. Default OFF (Elad 2026-05-29):
  // the chart opens in normal mode — a click trades, no surprise jump. The
  // trader arms rewind via the toolbar REPLAY button, then ONE click jumps the
  // cursor to that bar and it auto-disarms back to normal crosshair.
  const [scissorsArmed, setScissorsArmed] = useState(false);
  const scissorsArmedRef = useRef(scissorsArmed);

  // Click-to-place LIMIT armed mode. Mirrored as a ref so the DOM mousedown
  // listener (captured once per chart mount) always reads the latest value.
  const placeOrderArmedRef = useRef(placeOrderArmed);
  const onPlaceLimitAtPriceRef = useRef(onPlaceLimitAtPrice);

  useEffect(() => { onBarClickRef.current = onBarClick; }, [onBarClick]);
  useEffect(() => { onBarRevealRef.current = onBarReveal; }, [onBarReveal]);
  useEffect(() => { onContextMenuRef.current = onContextMenu; }, [onContextMenu]);
  useEffect(() => { onCurrentBarChangeRef.current = onCurrentBarChange; }, [onCurrentBarChange]);
  useEffect(() => { onJumpToTimeRef.current = onJumpToTime; }, [onJumpToTime]);
  useEffect(() => { showReplayCursorRef.current = showReplayCursor; }, [showReplayCursor]);
  useEffect(() => { scissorsArmedRef.current = scissorsArmed; }, [scissorsArmed]);
  useEffect(() => { placeOrderArmedRef.current = placeOrderArmed; }, [placeOrderArmed]);
  useEffect(() => { onPlaceLimitAtPriceRef.current = onPlaceLimitAtPrice; }, [onPlaceLimitAtPrice]);

  // ─── Drawing tools (drawings2 — new per-primitive system) ───────────────────
  const drawingControllerRef = useRef<DrawingController | null>(null);
  const [currentTool, setCurrentTool] = useState<ToolId>('cursor');
  const [drawingColor, setDrawingColor] = useState('#C9A646');
  const [drawingWidth, setDrawingWidth] = useState(2);
  const [hasSelection, setHasSelection] = useState(false);

  // Keep a ref for currentTool so chart-lifecycle closures read the latest value.
  const currentToolRef = useRef<ToolId>(currentTool);
  useEffect(() => { currentToolRef.current = currentTool; }, [currentTool]);

  // Delete key binding for selected drawings.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const dc = drawingControllerRef.current;
        if (dc) {
          dc.deleteSelected();
          setHasSelection(false);
          e.preventDefault();
        }
      } else if (e.key === 'Escape') {
        const dc = drawingControllerRef.current;
        if (dc) {
          dc.setActiveTool('cursor');
          setCurrentTool('cursor');
          setHasSelection(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [load, setLoad] = useState<LoadState>({ kind: 'loading' });

  // Tracks the wall-clock timestamp of the most recently visible bar so we
  // can restore the cursor position when only the interval changes.
  const cursorTimestampRef = useRef<number | null>(null);

  // Tracks the {symbol, replayStartTime} combo from the previous fetch so we
  // can distinguish "interval-only change" from "symbol or date change".
  const prevFetchIdentityRef = useRef<{ symbol: string; replayStartTime: number } | null>(null);

  // ─── Fetch the replay window ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoad({ kind: 'loading' });

    const secPerBar = intervalSeconds(interval);
    // Pull the maximum history the interval allows before the start moment.
    const from = (replayStartTime - maxLookbackSeconds(interval)) as UTCTimestamp;
    const nowSec = Math.floor(Date.now() / 1000);
    const to = Math.min(replayStartTime + BARS_AFTER_START * secPerBar, nowSec) as UTCTimestamp;

    // Determine whether this is an interval-only change (symbol + date same)
    // so we can restore the cursor to the previously visible timestamp.
    const prevIdentity = prevFetchIdentityRef.current;
    const isIntervalOnlyChange =
      prevIdentity !== null &&
      prevIdentity.symbol === symbol &&
      prevIdentity.replayStartTime === replayStartTime;
    const preservedTimestamp = isIntervalOnlyChange ? cursorTimestampRef.current : null;

    // Record the new identity for the next fetch comparison.
    prevFetchIdentityRef.current = { symbol, replayStartTime };

    dataSource
      .getBars(symbol, interval, from, to)
      .then((bars) => {
        if (cancelled) return;
        if (!bars || bars.length === 0) {
          setLoad({ kind: 'error', message: `No bars returned for ${symbol} ${interval}. Pick a different date or interval.` });
          return;
        }
        // Find the index closest to the target timestamp:
        //   - On interval-only change: use the preserved cursor timestamp so
        //     playback position is kept across timeframe switches.
        //   - On first load / symbol / date change: fall back to replayStartTime.
        const targetTime = preservedTimestamp ?? replayStartTime;
        let startIndex = 0;
        for (let i = 0; i < bars.length; i++) {
          if ((bars[i].time as number) <= targetTime) startIndex = i;
          else break;
        }
        setLoad({ kind: 'ready', bars, startIndex });
      })
      .catch((err) => {
        if (cancelled) return;
        const raw = err instanceof Error ? err.message : 'Failed to fetch bars';
        const isUpstream = /chart-bars HTTP|upstream|Failed to fetch|malformed/i.test(raw);
        setLoad({
          kind: 'error',
          message: isUpstream
            ? 'Market data is temporarily unavailable for this symbol and timeframe. Please try again, or switch to a shorter timeframe.'
            : raw,
        });
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

  // Keep cursorTimestampRef up to date so interval changes can restore
  // the playback position to the same wall-clock moment.
  useEffect(() => {
    const ts = bars[playback.cursor]?.time;
    if (ts != null) {
      cursorTimestampRef.current = ts as number;
    }
  }, [playback.cursor, bars]);

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
        // Hide the TradingView attribution logo (we show our own FINOTAUR mark).
        attributionLogo: false,
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

    // Create the drawings2 controller — subscribes to click + crosshair,
    // attaches/detaches per-primitive drawings, persists to localStorage.
    const dc = new DrawingController(chart, series as unknown as import('lightweight-charts').ISeriesApi<'Candlestick'>, {
      symbol,
      onChange: () => setOverlayTick((n) => n + 1),
      onSelectionChange: (has) => setHasSelection(has),
      // After a shape is drawn the controller switches back to cursor — keep the
      // React toolbar state in sync so the tool de-highlights (one mark per pick).
      onActiveToolChange: (t) => setCurrentTool(t),
    });
    drawingControllerRef.current = dc;
    // Sync the current tool into the controller (in case it was set before mount).
    dc.setActiveTool(currentToolRef.current);

    // Center the current (cursor) bar on load — history on the left half, open
    // "future" room on the right that reveals as you PLAY (Elad 2026-05-31:
    // "current bar exactly in the middle"). Deferred a frame so the chart has
    // laid out (clientWidth / barSpacing ready) before we scroll.
    requestAnimationFrame(() => { if (!cancelled) centerCursorBar(chart, container, false); });

    // Click handler: jump-to-time (TV replay UX) takes priority when wired;
    // falls back to click-to-trade. Right-click is handled separately via the
    // DOM contextmenu listener below — this only fires on left-click.
    chart.subscribeClick((param) => {
      // Place-order armed: the DOM mousedown listener handled this click already
      // (it fired before subscribeClick). Skip all other click behaviours so we
      // don't also trigger jump/trade on the same click.
      if (placeOrderArmedRef.current) return;

      // ── Drawing tool active: DrawingController owns all drawing clicks ───────
      // When any drawing tool is active (not cursor), skip trade/jump logic.
      const tool = currentToolRef.current;
      if (tool !== 'cursor') {
        // The controller's subscribeClick handler (registered in DrawingController
        // constructor) already processed this click. We just skip trade/jump.
        return;
      }

      // ── Cursor mode: DrawingController handles selection via its own click
      // subscription. We still fall through to trade/jump if the controller
      // did NOT consume the click (i.e. no drawing was hit). Since the
      // controller uses a separate subscribeClick, we can't know here whether
      // it consumed it — so we only skip trade/jump if a drawing tool is active.
      // Selection in cursor mode is fully owned by the controller.

      // For non-drawing clicks we still need param.time (trade / jump).
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
      // Rubber-band preview is handled by DrawingController's subscribeCrosshairMove.

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

    // Axis resize-cursor hint: ns-resize over the right price scale, ew-resize
    // over the bottom time scale (drag to rescale, TradingView-style). Only
    // setState on region change so we don't re-render on every mouse move.
    let prevAxis: null | 'ns' | 'ew' = null;
    const handleAxisCursor = (e: MouseEvent) => {
      const c = chartRef.current;
      if (!c || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const priceW = c.priceScale('right').width();
      const timeH = c.timeScale().height();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let region: null | 'ns' | 'ew' = null;
      if (x >= rect.width - priceW && y < rect.height - timeH) region = 'ns';
      else if (y >= rect.height - timeH) region = 'ew';
      if (region !== prevAxis) {
        prevAxis = region;
        setAxisCursor(region);
      }
    };
    container.addEventListener('mousemove', handleAxisCursor);
    const handleAxisLeave = () => { prevAxis = null; setAxisCursor(null); };
    container.addEventListener('mouseleave', handleAxisLeave);

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

    // Click-to-place LIMIT: left mousedown while placeOrderArmed. We use
    // mousedown (not click) so we can call preventDefault/stopPropagation
    // before lightweight-charts' own pointer-up click fires — otherwise
    // subscribeClick would still fire for the same event.
    const handlePlaceOrderMousedown = (e: MouseEvent) => {
      if (e.button !== 0) return; // left button only
      // Drawing tool active: let the DrawingLayer handle this pointer event.
      if (currentToolRef.current !== 'cursor') return;
      if (!placeOrderArmedRef.current || !onPlaceLimitAtPriceRef.current) return;
      if (!seriesRef.current || !containerRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = containerRef.current.getBoundingClientRect();
      const localY = e.clientY - rect.top;
      const price = seriesRef.current.coordinateToPrice(localY);
      if (price == null || !Number.isFinite(price)) return;
      const currentPrice = bars[lastUpdatedIdxRef.current]?.close;
      if (currentPrice == null) return;
      onPlaceLimitAtPriceRef.current(Number(price), currentPrice);
    };
    container.addEventListener('mousedown', handlePlaceOrderMousedown);

    chartRef.current = chart;
    seriesRef.current = series;

    // Coalesce position-box reposition bumps to one per animation frame.
    // Continuous pan/zoom fires visibleTimeRangeChange dozens of times per
    // second; a synchronous React re-render per event janks (and can lock the
    // main thread). One rAF-batched bump keeps the overlay glued without storm.
    let coalesceRaf = 0;
    const bumpOverlay = () => {
      if (coalesceRaf) return;
      coalesceRaf = requestAnimationFrame(() => {
        coalesceRaf = 0;
        setOverlayTick((n) => n + 1);
      });
    };

    // Responsive resize.
    const ro = new ResizeObserver(() => {
      if (!container || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
      setChartWidth(container.clientWidth);
      bumpOverlay();
    });
    ro.observe(container);
    // Initialise width immediately.
    setChartWidth(container.clientWidth);

    // Recompute the cut-line X position whenever the visible range pans/zooms.
    const updateCursorX = () => {
      bumpOverlay();
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
      if (coalesceRaf) cancelAnimationFrame(coalesceRaf);
      ro.disconnect();
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('mousedown', handlePlaceOrderMousedown);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mousemove', handleAxisCursor);
      container.removeEventListener('mouseleave', handleAxisLeave);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.timeScale().unsubscribeVisibleTimeRangeChange(updateCursorX);
      if (jumpTimerRef.current !== null) {
        clearTimeout(jumpTimerRef.current);
        jumpTimerRef.current = null;
      }
      priceLinesRef.current.clear();
      // Destroy the drawings controller (unsubscribes + detaches all primitives).
      drawingControllerRef.current?.destroy();
      drawingControllerRef.current = null;
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
        // Use 'circle' instead of arrow shapes — the user wants units+price as
        // the label without a directional arrow dominating the marker.
        // lightweight-charts always requires a shape; 'circle' is the least
        // obtrusive option available in the library.
        markers.push({
          time: p.entryTime as UTCTimestamp,
          position: p.side === 'LONG' ? 'belowBar' : 'aboveBar',
          shape: 'circle',
          color: p.side === 'LONG' ? THEME.candleUp : THEME.candleDown,
          text: `${p.size}× @ ${p.entryPrice.toFixed(2)}`,
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
      // Re-center the cursor after a backward/skip jump (smooth).
      const c = chartRef.current;
      const cont = containerRef.current;
      if (c && cont) requestAnimationFrame(() => { if (chartRef.current && containerRef.current) centerCursorBar(chartRef.current, containerRef.current, true); });
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
    // title is intentionally '' — the label is rendered as a custom React pill
    // overlay (below) so the native on-chart text label is suppressed. The
    // dashed line + right-axis price tag (axisLabelVisible:true) are kept.
    for (const o of pendingOrders) {
      const color = o.side === 'LONG' ? THEME.candleUp : THEME.candleDown;
      const cached = existing.get(o.id);
      if (cached) {
        cached.applyOptions({ price: o.triggerPrice, color, title: '' });
      } else {
        const line = series.createPriceLine({
          price: o.triggerPrice,
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: '',
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

  // Report the current cursor bar to the parent (for MARKET-order fills).
  useEffect(() => {
    onCurrentBarChangeRef.current?.(bars[lastUpdatedIdxRef.current] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback.cursor, bars]);

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
          className={`absolute inset-0 ${
            axisCursor === 'ns'
              ? 'cursor-ns-resize [&_*]:cursor-ns-resize'
              : axisCursor === 'ew'
              ? 'cursor-ew-resize [&_*]:cursor-ew-resize'
              : showReplayCursor && scissorsArmed
              ? 'cursor-none [&_*]:cursor-none'
              : 'cursor-chart-cross'
          }`}
          style={{ height }}
        />

        {/* FINOTAUR brand watermark — bottom-LEFT, transparent. The logo PNG has
            a black background, so mix-blend-mode:screen drops the black (black is
            the identity for screen) and only the gold bull + wordmark blend onto
            the dark chart — no opaque box. pointer-events-none; sits above the
            canvas, below the cursor / position-box overlays. */}
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute z-[2] select-none"
          style={{ left: 16, bottom: TIMESCALE_HEIGHT + 12, width: 160, opacity: 0.75, mixBlendMode: 'screen' }}
          draggable={false}
        />

        {/* ── Draggable risk/reward position box — recomputes on overlayTick
            (pan/zoom/resize), so it never gets stuck like the old static overlay.
            currentPrice is injected from the live cursor bar so Open P&L tracks. ── */}
        {positionOverlay && chartRef.current && seriesRef.current && (
          <PositionBox
            chart={chartRef.current}
            series={seriesRef.current}
            model={{
              ...positionOverlay.model,
              currentPrice: bars[playback.cursor]?.close ?? positionOverlay.model.currentPrice,
              // A pending order's createdAt is wall-clock "now" — off the chart's
              // historical data, so its box couldn't anchor and floated at the
              // left edge. Anchor it to the current cursor bar (the replay
              // "now") so it stays glued to the chart.
              entryTime: positionOverlay.model.isPending && bars[playback.cursor]
                ? (bars[playback.cursor].time as number)
                : positionOverlay.model.entryTime,
            }}
            redrawKey={overlayTick}
            onStopLossChange={positionOverlay.onStopLossChange}
            onTakeProfitChange={positionOverlay.onTakeProfitChange}
            onEntryChange={positionOverlay.onEntryChange}
          />
        )}

        {/* ── Pending order label pills — one pill per order, positioned just
            left of the right price axis at the order's trigger price.
            Each pill shows the order label text with a hover-only ✕ cancel
            button on the LEFT side. The outer container is pointer-events-none
            so it never blocks chart pan/zoom; only the pill itself (and the ✕
            button inside it on hover) gets pointer-events. Re-evaluates on
            overlayTick so pills stay glued after pan / zoom / resize. ── */}
        {onCancelPending && seriesRef.current && chartRef.current && pendingOrders.length > 0 && (
          // key={overlayTick} forces React to re-evaluate coordinate math on
          // every pan / zoom / resize — same pattern used by DrawingLayer above.
          <div key={overlayTick} className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
            {pendingOrders.map((o) => {
              const y = seriesRef.current!.priceToCoordinate(o.triggerPrice);
              const containerHeight = containerRef.current?.clientHeight ?? 0;
              if (y == null || y < 0 || y > containerHeight) return null;
              const axisW = chartRef.current!.priceScale('right').width() ?? 60;
              const pillColor = o.side === 'LONG' ? THEME.candleUp : THEME.candleDown;
              const label = `${o.side === 'LONG' ? 'BUY' : 'SELL'} ${o.type} ${o.size}× @ ${o.triggerPrice.toFixed(2)}`;
              return (
                <div
                  key={o.id}
                  className="group pointer-events-auto absolute flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow cursor-grab active:cursor-grabbing"
                  style={{
                    top: y - 10,
                    right: axisW + 4,
                    backgroundColor: pillColor,
                    color: '#fff',
                    userSelect: 'none',
                  }}
                  onPointerDown={(e) => {
                    // Pill drag — move the pending order's trigger price.
                    // Only active in cursor mode (same gate as OrderLinesOverlay).
                    // Propagation is stopped so the chart underneath does not pan.
                    if (currentTool !== 'cursor' || !onUpdatePendingPrice) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const pillEl = e.currentTarget;
                    pillEl.setPointerCapture(e.pointerId);
                    // Store start state in closure-local refs so we can update
                    // position without React state (avoids a re-render loop).
                    let latestPrice = o.triggerPrice;

                    const handleMove = (ev: PointerEvent) => {
                      if (!seriesRef.current || !containerRef.current) return;
                      const rect = containerRef.current.getBoundingClientRect();
                      const localY = ev.clientY - rect.top;
                      const raw = seriesRef.current.coordinateToPrice(localY);
                      if (raw == null || !Number.isFinite(raw)) return;
                      latestPrice = raw;
                      // Visual feedback: move the pill to follow the pointer.
                      pillEl.style.top = `${localY - 10}px`;
                    };

                    const cleanup = () => {
                      pillEl.removeEventListener('pointermove', handleMove);
                      pillEl.removeEventListener('pointerup', handleUp);
                      pillEl.removeEventListener('pointercancel', handleCancel);
                      // Reset visual position — overlayTick re-render will
                      // recompute the correct pixel coord from the new price.
                      pillEl.style.top = '';
                    };

                    const handleUp = (ev: PointerEvent) => {
                      pillEl.releasePointerCapture(ev.pointerId);
                      cleanup();
                      onUpdatePendingPrice(o.id, latestPrice);
                    };

                    // Browser-cancelled gesture: clean up without committing a price.
                    const handleCancel = () => cleanup();

                    pillEl.addEventListener('pointermove', handleMove);
                    pillEl.addEventListener('pointerup', handleUp);
                    pillEl.addEventListener('pointercancel', handleCancel);
                  }}
                >
                  {/* ✕ cancel button — always pointer-receptive (visibility
                      toggled via opacity only); pointerdown stops propagation
                      so it never accidentally starts a pill drag. */}
                  <button
                    type="button"
                    className="-ml-0.5 rounded opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/25"
                    style={{ pointerEvents: 'auto' }}
                    title="Cancel order"
                    aria-label="Cancel order"
                    onPointerDown={(e) => {
                      // Prevent the pill's onPointerDown (drag) from firing.
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onCancelPending(o.id);
                    }}
                  >
                    <X size={11} />
                  </button>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Draggable order-lines overlay — SL/TP/pending trigger lines.
            Active only in cursor mode (draggingEnabled=false when a draw tool
            is selected) so drawing creation is never intercepted.
            Only mounted when at least one callback is wired so legacy callers
            that don't pass onUpdateSL/TP are unaffected. ── */}
        {(onUpdateSL || onUpdateTP || onUpdatePendingPrice) && seriesRef.current && containerRef.current && (
          <OrderLinesOverlay
            key={overlayTick}
            series={seriesRef.current}
            container={containerRef.current}
            activePosition={activePosition}
            pendingOrders={pendingOrders}
            viewVersion={overlayTick}
            draggingEnabled={currentTool === 'cursor'}
            onUpdateSL={onUpdateSL ?? (() => {})}
            onUpdateTP={onUpdateTP ?? (() => {})}
            onUpdatePendingPrice={onUpdatePendingPrice ?? (() => {})}
            onUpdateTpLeg={onUpdateTpLeg}
          />
        )}

        {/* ── Drawing toolbar (drawings2) — vertical strip on the left edge. ── */}
        {enableDrawings && (
          <DrawingToolbar2
            activeTool={currentTool}
            onSelectTool={(t) => {
              setCurrentTool(t);
              drawingControllerRef.current?.setActiveTool(t);
            }}
            hasSelection={hasSelection}
            onDelete={() => {
              drawingControllerRef.current?.deleteSelected();
              setHasSelection(false);
            }}
            onClear={() => {
              drawingControllerRef.current?.clearAll();
              setHasSelection(false);
            }}
            color={drawingColor}
            width={drawingWidth}
            onColorChange={(c) => {
              setDrawingColor(c);
              drawingControllerRef.current?.setOptions({ color: c });
            }}
            onWidthChange={(w) => {
              setDrawingWidth(w);
              drawingControllerRef.current?.setOptions({ width: w });
            }}
            className="absolute left-0 top-0 bottom-0 z-[30]"
          />
        )}

        {/* DrawingStylePopover removed — style is set via the toolbar swatches/width buttons. */}

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
