/**
 * Trading Arena — Cumulative Volume Delta (CVD) tab
 *
 * CVD measures the net aggressor pressure over time:
 *   per-bar delta  = takerBuyVolume − takerSellVolume
 *                  = takerBuyVolume − (totalVolume − takerBuyVolume)
 *                  = 2 × takerBuyVolume − totalVolume
 *   CVD series     = running cumulative sum of per-bar delta
 *
 * Taker-buy volume comes from Binance REST klines index 9
 * ("taker buy base asset volume"). The existing BinanceSource only reads
 * indices 0-5, so the fetch + computation live in the shared `useKlineDelta`
 * hook (Phase 3 extraction — see hooks/useKlineDelta.ts), reused here and by
 * ChartTab's compact CVD/Delta sub-panes.
 *
 * Host: https://api.binance.com/api/v3/klines
 *   — same public host BinanceSource already uses (CORS-friendly, no geo-block
 *   at our scale, Binance vision mirror not needed for REST).
 *
 * Layout: two stacked lightweight-charts v4 instances (CVD line above,
 * per-bar delta histogram below). A single ResizeObserver drives both charts;
 * crosshair time is synced so hovering one pane aligns the other.
 *
 * Divergence: SKIPPED. A reliable divergence detector needs a rolling
 * swing-high/low algorithm that is prone to false positives and adds visual
 * clutter if tuned wrong. Left as a // TODO for a dedicated future session.
 *
 * Availability (restored to the tab bar 2026-07-19 — see ../types.ts):
 * crypto-only, same gating LiquidityTab.tsx/DomTab.tsx use for their own
 * live-feed-only surfaces — non-crypto symbols get the shared
 * TickDataRequiredState empty state instead of a broken fetch. Within
 * crypto, useKlineDelta only understands Binance's fixed native kline
 * intervals (1m/5m/15m/30m/1h/4h/1d) — an Arena custom/aggregated interval
 * (e.g. '45m') has no native Binance kline, so `resolveKlineInterval` below
 * mirrors FootprintTab.tsx's KLINE_DELTA_NATIVE gating for its CVD/Delta
 * sub-panes and shows an inline "switch timeframe" notice instead of
 * fetching a mismatched interval.
 */

import { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type DeepPartial,
  type ChartOptions,
} from 'lightweight-charts';
import type { Interval } from '@/components/charting/types';
import type { AssetClass } from '@/components/backtest/symbolUniverse';
import { useKlineDelta } from '../hooks/useKlineDelta';
import { resolveIntervalPlan, type ArenaInterval } from '../utils/intervals';
import { TickDataRequiredState } from '../components/TickDataRequiredState';
import { buildViewSyncKey, readViewState, writeViewState } from '../hooks/arenaViewState';

// ---------------------------------------------------------------------------
// Palette — FINOTAUR dark arena theme
// ---------------------------------------------------------------------------
const PALETTE = {
  background:      '#08080a',
  grid:            '#1f1f23',
  border:          '#3f3f46',
  text:            '#a1a1aa',
  textAxis:        '#71717a',
  crosshair:       '#9ca3af',
  fontFamily:      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  // CVD line — gold, matches arena brand accent
  cvdLine:         '#C9A646',
  cvdLinePos:      '#C9A646',
  // Delta histogram
  deltaPos:        '#22c55e',  // green-500 — buy pressure
  deltaNeg:        '#dc2626',  // red-600  — sell pressure
  // Zero reference line
  zero:            '#505050',
} as const;

// ---------------------------------------------------------------------------
// Chart factory helpers
// ---------------------------------------------------------------------------

function buildChartOptions(): DeepPartial<ChartOptions> {
  return {
    layout: {
      background: { type: ColorType.Solid, color: PALETTE.background },
      textColor:   PALETTE.text,
      fontFamily:  PALETTE.fontFamily,
      fontSize:    11,
      // Removes the TradingView wordmark — this is our own branded chart
      // primitive, not an embedded TV widget (matches FinotaurChart.tsx).
      attributionLogo: false,
    },
    grid: {
      vertLines: { color: PALETTE.grid, style: LineStyle.Dotted, visible: true },
      horzLines: { color: PALETTE.grid, style: LineStyle.Dotted, visible: true },
    },
    rightPriceScale: {
      borderColor: PALETTE.border,
      textColor:   PALETTE.textAxis,
    },
    timeScale: {
      borderColor:    PALETTE.border,
      timeVisible:    true,
      secondsVisible: false,
      rightOffset:    4,
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color:                PALETTE.crosshair,
        width:                1,
        style:                LineStyle.Dashed,
        labelBackgroundColor: PALETTE.crosshair,
      },
      horzLine: {
        color:                PALETTE.crosshair,
        width:                1,
        style:                LineStyle.Dashed,
        labelBackgroundColor: PALETTE.crosshair,
      },
    },
    handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
    autoSize:     false,
  };
}

// ---------------------------------------------------------------------------
// Number formatting helpers
// ---------------------------------------------------------------------------

function formatVolume(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${(v / 1_000).toFixed(2)}K`;
  return v.toFixed(2);
}

// ---------------------------------------------------------------------------
// Native-interval resolution — CVD/Delta only exist for Binance's fixed
// native kline intervals (mirrors FootprintTab.tsx's KLINE_DELTA_NATIVE).
// ---------------------------------------------------------------------------

const KLINE_DELTA_NATIVE: Interval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

/** Resolves an Arena (arbitrary) interval to a native Binance kline Interval useKlineDelta can fetch, or null if the current interval has no native match. */
function resolveKlineInterval(interval: ArenaInterval): Interval | null {
  const plan = resolveIntervalPlan('binance', interval);
  if (plan.kind === 'native' && KLINE_DELTA_NATIVE.includes(plan.interval)) return plan.interval;
  return null;
}

// ---------------------------------------------------------------------------
// CvdTab — public entry point (crypto-only gating + native-interval check)
// ---------------------------------------------------------------------------

export interface CvdTabProps {
  symbol:     string;
  interval:   ArenaInterval;
  assetClass: AssetClass;
  /** Wired to the Arena's symbol setter — powers the non-crypto empty state's quick-switch chips. */
  onSelectSymbol?: (symbol: string) => void;
}

export function CvdTab({ symbol, interval, assetClass, onSelectSymbol }: CvdTabProps) {
  if (assetClass !== 'crypto') {
    return <TickDataRequiredState variant="footprint" onSelectSymbol={onSelectSymbol} />;
  }

  const klineInterval = resolveKlineInterval(interval);
  if (!klineInterval) {
    return (
      <div className="flex h-full w-full items-center justify-center px-6">
        <p className="max-w-sm text-center text-[13px] text-[#909090]">
          CVD requires a standard interval (1m, 5m, 15m, 30m, 1h, 4h, or 1d). Switch timeframe to view.
        </p>
      </div>
    );
  }

  // Keyed by symbol — clean remount (fresh chart instances + fresh fetch) on
  // symbol change, same technique LiquidityTab.tsx/DomTab.tsx use.
  return (
    <CvdChart
      key={symbol}
      symbol={symbol}
      interval={klineInterval}
      viewSyncKey={buildViewSyncKey(assetClass, symbol, interval)}
    />
  );
}

// ---------------------------------------------------------------------------
// CvdChart — the actual two-pane chart, unchanged from the original CvdTab
// (still takes the native `Interval`, not the Arena's arbitrary interval).
// ---------------------------------------------------------------------------

interface CvdChartProps {
  symbol:   string;
  interval: Interval;
  /**
   * ATAS-parity "synced price scale" (arenaViewState.ts) — see
   * FinotaurChart.tsx's `viewSyncKey` prop doc comment for the full
   * contract. CvdChart wires it directly (it doesn't use FinotaurChart) and
   * TIME-only: the CVD/delta panes have no real "price" axis (their y-axis
   * is cumulative volume delta, not price), so only the visible time
   * window is restored/captured here. The delta pane needs no separate
   * wiring — it already mirrors the CVD pane's visible range via the
   * existing subscribeVisibleLogicalRangeChange sync below.
   */
  viewSyncKey: string;
}

function CvdChart({ symbol, interval, viewSyncKey }: CvdChartProps) {
  // DOM containers for the two chart panes
  const cvdContainerRef   = useRef<HTMLDivElement | null>(null);
  const deltaContainerRef = useRef<HTMLDivElement | null>(null);

  // lightweight-charts instances
  const cvdChartRef    = useRef<IChartApi | null>(null);
  const deltaChartRef  = useRef<IChartApi | null>(null);

  // Series refs
  const cvdSeriesRef   = useRef<ISeriesApi<'Line'>      | null>(null);
  const deltaSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Data + summary stats — shared fetch/compute hook (Phase 3 extraction).
  const { cvd, delta, latestCvd, latestDelta, loadState, errorMsg } = useKlineDelta(symbol, interval);

  // ---------------------------------------------------------------------------
  // Mount / unmount the two chart instances
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const cvdEl   = cvdContainerRef.current;
    const deltaEl = deltaContainerRef.current;
    if (!cvdEl || !deltaEl) return;

    // CVD pane
    const cvdChart = createChart(cvdEl, {
      ...buildChartOptions(),
      width:  cvdEl.clientWidth,
      height: cvdEl.clientHeight,
    });

    const cvdSeries = cvdChart.addLineSeries({
      color:                 PALETTE.cvdLine,
      lineWidth:             2,
      priceLineVisible:      false,
      lastValueVisible:      true,
      crosshairMarkerVisible: true,
    });

    // Zero reference line on CVD pane
    cvdSeries.createPriceLine({
      price:              0,
      color:              PALETTE.zero,
      lineWidth:          1,
      lineStyle:          LineStyle.Dashed,
      axisLabelVisible:   false,
      title:              '',
    });

    // Delta pane
    const deltaChart = createChart(deltaEl, {
      ...buildChartOptions(),
      width:  deltaEl.clientWidth,
      height: deltaEl.clientHeight,
      // Hide time axis on delta pane — CVD pane above shows it
      timeScale: {
        ...buildChartOptions().timeScale,
        visible: false,
      },
    });

    const deltaSeries = deltaChart.addHistogramSeries({
      priceLineVisible:  false,
      lastValueVisible:  false,
      base:              0,
    });

    // Zero reference line on delta pane
    deltaSeries.createPriceLine({
      price:            0,
      color:            PALETTE.zero,
      lineWidth:        1,
      lineStyle:        LineStyle.Dashed,
      axisLabelVisible: false,
      title:            '',
    });

    cvdChartRef.current   = cvdChart;
    deltaChartRef.current = deltaChart;
    cvdSeriesRef.current   = cvdSeries;
    deltaSeriesRef.current = deltaSeries;

    // Sync scrolling: mirror the CVD pane's visible logical range onto the delta
    // pane (and vice-versa) so both panes pan/zoom together as one unit.
    // lightweight-charts v4 `subscribeVisibleLogicalRangeChange` returns void,
    // so unsubscribing must happen via the corresponding `unsubscribe*` call.
    // In practice, `chart.remove()` already tears down all subscriptions, but
    // we hold explicit handler references so the cleanup is explicit.
    const onCvdRangeChange = (range: { from: number; to: number } | null) => {
      if (!range) return;
      try {
        deltaChart.timeScale().setVisibleLogicalRange(range);
      } catch { /* chart may be mid-teardown */ }
    };

    const onDeltaRangeChange = (range: { from: number; to: number } | null) => {
      if (!range) return;
      try {
        cvdChart.timeScale().setVisibleLogicalRange(range);
      } catch { /* chart may be mid-teardown */ }
    };

    cvdChart.timeScale().subscribeVisibleLogicalRangeChange(onCvdRangeChange);
    deltaChart.timeScale().subscribeVisibleLogicalRangeChange(onDeltaRangeChange);

    return () => {
      try {
        cvdChart.timeScale().unsubscribeVisibleLogicalRangeChange(onCvdRangeChange);
        deltaChart.timeScale().unsubscribeVisibleLogicalRangeChange(onDeltaRangeChange);
      } catch { /* ignore */ }
      try { cvdChart.remove();   } catch { /* ignore */ }
      try { deltaChart.remove(); } catch { /* ignore */ }
      cvdChartRef.current    = null;
      deltaChartRef.current  = null;
      cvdSeriesRef.current   = null;
      deltaSeriesRef.current = null;
    };
  }, []); // mount once — data is pushed via the hook-consuming effect below

  // ---------------------------------------------------------------------------
  // View-sync (viewSyncKey) CAPTURE — TIME only, see CvdChartProps' doc
  // comment. Writes the CVD pane's visible time window to arenaViewState.ts
  // (throttled 300ms) whenever the user pans/zooms, so switching to
  // Chart/Footprint/Liquidity for the same symbol+interval reopens on the
  // same window. Preserves whatever PRICE range those views already saved
  // (this pane has no real "price" axis to contribute) by reading the
  // existing entry first instead of overwriting it with null.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const cvdChart = cvdChartRef.current;
    if (!cvdChart) return;

    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingRange: { from: number; to: number } | null = null;

    const flush = () => {
      throttleTimer = null;
      if (!pendingRange) return;
      const range = pendingRange;
      pendingRange = null;
      const existing = readViewState(viewSyncKey);
      writeViewState(viewSyncKey, { timeRange: range, priceRange: existing?.priceRange ?? null });
    };

    const handleVisibleTimeRangeChange = (range: { from: unknown; to: unknown } | null) => {
      if (!range) return;
      pendingRange = { from: range.from as unknown as number, to: range.to as unknown as number };
      if (throttleTimer) return;
      throttleTimer = setTimeout(flush, 300);
    };

    cvdChart.timeScale().subscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange);

    return () => {
      if (throttleTimer) clearTimeout(throttleTimer);
      try {
        cvdChart.timeScale().unsubscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange);
      } catch { /* chart may already be torn down */ }
    };
  }, [viewSyncKey]);

  // ---------------------------------------------------------------------------
  // ResizeObserver — keep both charts fitting the outer container
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const cvdEl   = cvdContainerRef.current;
    const deltaEl = deltaContainerRef.current;
    if (!cvdEl || !deltaEl) return;

    const ro = new ResizeObserver(() => {
      const cvdChart   = cvdChartRef.current;
      const deltaChart = deltaChartRef.current;
      if (cvdChart) {
        const w = cvdEl.clientWidth;
        const h = cvdEl.clientHeight;
        if (w > 0 && h > 0) cvdChart.applyOptions({ width: w, height: h });
      }
      if (deltaChart) {
        const w = deltaEl.clientWidth;
        const h = deltaEl.clientHeight;
        if (w > 0 && h > 0) deltaChart.applyOptions({ width: w, height: h });
      }
    });
    ro.observe(cvdEl);
    ro.observe(deltaEl);
    return () => ro.disconnect();
  }, []);

  // ---------------------------------------------------------------------------
  // Push hook data into the series whenever it changes (initial load + 20s refresh)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (loadState !== 'loaded') return;

    const cvdSeries   = cvdSeriesRef.current;
    const deltaSeries = deltaSeriesRef.current;
    const cvdChart    = cvdChartRef.current;
    if (!cvdSeries || !deltaSeries || !cvdChart) return;

    cvdSeries.setData(cvd);
    deltaSeries.setData(
      delta.map((d) => ({
        time: d.time,
        value: d.value,
        color: d.isPositive ? PALETTE.deltaPos : PALETTE.deltaNeg,
      })),
    );

    // View-sync (viewSyncKey) RESTORE — TIME only, see CvdChartProps' doc
    // comment. Falls back to the original fitContent() when there's no
    // fresh saved state. Setting the CVD pane's visible range also fires
    // its own subscribeVisibleLogicalRangeChange listener (mount effect
    // above), which mirrors onto the delta pane automatically — no
    // separate wiring needed there.
    const saved = readViewState(viewSyncKey);
    if (saved) {
      cvdChart.timeScale().setVisibleRange({
        from: saved.timeRange.from as never,
        to: saved.timeRange.to as never,
      });
    } else {
      cvdChart.timeScale().fitContent();
    }
  }, [cvd, delta, loadState, viewSyncKey]);

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------
  const cvdColor =
    latestCvd === null  ? PALETTE.textAxis :
    latestCvd >= 0      ? PALETTE.deltaPos  :
                          PALETTE.deltaNeg;

  const deltaColor =
    latestDelta === null ? PALETTE.textAxis :
    latestDelta >= 0     ? PALETTE.deltaPos  :
                           PALETTE.deltaNeg;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  // Outer row: chart content (flex-1) + Crypto Derivatives panel as a right
  // rail — this tab has no existing side panel to nest under, so the panel
  // is mounted as its own collapsible rail (task's fallback option) rather
  // than squeezed into the stacked CVD/Delta chart area below.
  return (
    <div className="flex flex-1 min-h-0 w-full">
      <div className="flex flex-col flex-1 min-w-0 h-full min-h-0 bg-[#08080a]">

      {/* ── Controls / info bar ──────────────────────────────────── */}
      <div
        className="flex flex-shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 border-b"
        style={{ borderColor: 'rgba(201,166,70,0.10)' }}
      >
        {/* Title */}
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C9A646]">
          <Activity className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Cumulative Volume Delta</span>
          <span className="text-[#505050] font-normal ml-1">{symbol}</span>
        </div>

        {/* Divider */}
        <span className="hidden sm:block w-px h-4 bg-[rgba(255,255,255,0.08)]" aria-hidden="true" />

        {/* CVD stat */}
        {loadState === 'loaded' && latestCvd !== null && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-[#606060]">CVD:</span>
            <span style={{ color: cvdColor }} className="font-mono font-semibold">
              {latestCvd >= 0 ? '+' : ''}{formatVolume(latestCvd)}
            </span>
          </div>
        )}

        {/* Last bar delta stat */}
        {loadState === 'loaded' && latestDelta !== null && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-[#606060]">Last Δ:</span>
            <span style={{ color: deltaColor }} className="font-mono font-semibold">
              {latestDelta >= 0 ? '+' : ''}{formatVolume(latestDelta)}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* Legend chips */}
        <div className="flex items-center gap-3 text-[10px] text-[#606060]">
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-0.5 w-4 rounded"
              style={{ backgroundColor: PALETTE.cvdLine }}
            />
            CVD line
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2 rounded-sm"
              style={{ backgroundColor: PALETTE.deltaPos }}
            />
            Buy Δ
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2 rounded-sm"
              style={{ backgroundColor: PALETTE.deltaNeg }}
            />
            Sell Δ
          </span>
        </div>

        {/* Refresh indicator */}
        {loadState === 'loading' && (
          <span className="text-[10px] text-[#505050] ml-1">Fetching…</span>
        )}
      </div>

      {/* ── Chart area ───────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-h-0 relative">

        {/* Error overlay */}
        {loadState === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#08080a]">
            <span className="text-[13px] text-[#ef4444] font-medium">Failed to load CVD data</span>
            <span className="text-[11px] text-[#606060] mt-1 max-w-xs text-center">{errorMsg}</span>
          </div>
        )}

        {/* Loading overlay — shown only before the first successful fetch */}
        {loadState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#08080a]">
            <span className="text-[12px] text-[#505050]">Loading CVD…</span>
          </div>
        )}

        {/* CVD line pane — top 65% */}
        <div
          ref={cvdContainerRef}
          className="w-full"
          style={{ flex: '0 0 65%', minHeight: 0 }}
          aria-label="Cumulative Volume Delta chart"
        />

        {/* Pane divider */}
        <div
          className="flex-shrink-0 h-px"
          style={{ backgroundColor: 'rgba(201,166,70,0.12)' }}
          aria-hidden="true"
        />

        {/* Delta histogram pane — bottom 35% */}
        <div
          ref={deltaContainerRef}
          className="w-full"
          style={{ flex: '0 0 35%', minHeight: 0 }}
          aria-label="Per-bar volume delta histogram"
        />
      </div>
      </div>
    </div>
  );
}
