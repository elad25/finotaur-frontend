/**
 * DepthProfileGutter — Liquidity tab's right-edge "what's waiting" overlay
 * (Task S2 — ATAS/Bookmap restyle).
 *
 * Absolutely-positioned DOM overlay (same pattern as MarketScanner's own
 * overlay chrome — plain divs, not a canvas raster; the level count here is
 * always small, bounded by the depth matrix's own binSize) showing the
 * CURRENT resting order book aggregated by price bin: bids as green bars
 * extending left below the current price, asks as red bars extending left
 * above it, bar length ∝ USD notional, K/M-formatted size labels on only the
 * top N levels per side (avoids label clutter).
 *
 * Sits just LEFT of the price axis (offset by `chart.priceScale('right').width()`)
 * so it never paints over axis labels. Caller re-renders this on its own 5s
 * live-edge cadence (see LiquidityTab.tsx) — this component does no internal
 * polling; it only re-subscribes to the chart's visible-time-range change so
 * a pan/zoom repositions existing bars without waiting for the next 5s tick.
 */

import { useEffect, useState } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { aggregateRestingBook, topLevelsBySize, formatGutterSize, type RestingLevel } from './depthProfileGutterMath';

const BID_COLOR = 'rgba(34, 197, 94, 0.75)';   // emerald-500
const ASK_COLOR = 'rgba(220, 38, 38, 0.75)';   // red-600
const BAR_HEIGHT_PX = 2;
const GUTTER_MAX_BAR_PX = 64;
const DEFAULT_MAX_LABELS_PER_SIDE = 8;
const DEFAULT_AXIS_WIDTH_FALLBACK = 56;

export interface DepthProfileGutterProps {
  chart: IChartApi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: ISeriesApi<any>;
  /** Raw resting book snapshot — same shape useBinanceOrderBook/useNt8OrderBook's getBook() returns. */
  bids: ReadonlyMap<number, number>;
  asks: ReadonlyMap<number, number>;
  /** Price bin width — reuses the depth matrix's own adaptive binSize so gutter levels line up with heatmap rows. */
  binSize: number;
  visible: boolean;
  maxLabelsPerSide?: number;
}

export function DepthProfileGutter({
  chart,
  series,
  bids,
  asks,
  binSize,
  visible,
  maxLabelsPerSide = DEFAULT_MAX_LABELS_PER_SIDE,
}: DepthProfileGutterProps) {
  // Bumping counter — repositions bars on pan/zoom without re-aggregating
  // the book (aggregation only changes when the caller passes new bids/asks
  // maps, i.e. on its own polling cadence).
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const timeScale = chart.timeScale();
    const bump = () => setTick((t) => t + 1);
    timeScale.subscribeVisibleTimeRangeChange(bump);
    return () => {
      try { timeScale.unsubscribeVisibleTimeRangeChange(bump); } catch { /* chart gone */ }
    };
  }, [chart, visible]);

  if (!visible) return null;

  const { bids: bidLevels, asks: askLevels } = aggregateRestingBook(bids, asks, binSize);
  if (bidLevels.length === 0 && askLevels.length === 0) return null;

  let axisWidth = DEFAULT_AXIS_WIDTH_FALLBACK;
  try {
    const w = chart.priceScale('right').width();
    if (typeof w === 'number' && w > 0) axisWidth = w;
  } catch {
    // priceScale() can throw mid-teardown — fall back to the default.
  }

  const maxBidUsd = bidLevels.reduce((max, l) => Math.max(max, l.usd), 0) || 1;
  const maxAskUsd = askLevels.reduce((max, l) => Math.max(max, l.usd), 0) || 1;
  const bidLabels = topLevelsBySize(bidLevels, maxLabelsPerSide);
  const askLabels = topLevelsBySize(askLevels, maxLabelsPerSide);

  function renderBar(level: RestingLevel, maxUsd: number, color: string, showLabel: boolean, keyPrefix: string) {
    const y = series.priceToCoordinate(level.price);
    if (y === null) return null;
    const barPx = Math.max(1, (level.usd / maxUsd) * GUTTER_MAX_BAR_PX);

    return (
      <div
        key={`${keyPrefix}:${level.price}`}
        style={{
          position: 'absolute',
          top: (y as number) - BAR_HEIGHT_PX / 2,
          right: axisWidth,
          width: barPx,
          height: BAR_HEIGHT_PX,
          background: color,
          borderRadius: 1,
        }}
      >
        {showLabel && (
          <span
            style={{
              position: 'absolute',
              right: barPx + 4,
              top: -6,
              fontSize: 9,
              fontWeight: 600,
              color,
              whiteSpace: 'nowrap',
            }}
          >
            {formatGutterSize(level.usd)}
          </span>
        )}
      </div>
    );
  }

  return (
    // `tick` intentionally unused beyond forcing a re-render on pan/zoom —
    // priceToCoordinate() above is re-evaluated on every render this key drives.
    <div key={tick} className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
      {bidLevels.map((l) => renderBar(l, maxBidUsd, BID_COLOR, bidLabels.has(l.price), 'bid'))}
      {askLevels.map((l) => renderBar(l, maxAskUsd, ASK_COLOR, askLabels.has(l.price), 'ask'))}
    </div>
  );
}

export default DepthProfileGutter;
