// src/pages/app/crypto/whales/components/WallsDepthChart.tsx
// Daily candlestick chart (lightweight-charts) with horizontal price-lines at
// each wall level — green lines for bids (support), red for asks (resistance).

import { useEffect, useRef, memo, useState } from 'react';
import {
  createChart,
  ColorType,
  LineStyle,
  UTCTimestamp,
  IChartApi,
  ISeriesApi,
  CandlestickData,
} from 'lightweight-charts';
import type { OrderWall } from '../../_shared/types';
import { formatCompact } from '../../_shared/formatters';
import { fetchWallsKlines } from '../../_shared/api';

interface WallsDepthChartProps {
  symbol: string;
  walls: { bids: OrderWall[]; asks: OrderWall[] };
  midPrice: number | null;
}

// Max wall lines to overlay (to avoid visual clutter)
const MAX_WALL_LINES = 8;

export const WallsDepthChart = memo(function WallsDepthChart({
  symbol,
  walls,
  midPrice,
}: WallsDepthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Fetch 90 daily candles from the walls-specific klines endpoint.
  // The new endpoint returns { time (unix seconds), open, high, low, close } directly.
  const [candles, setCandles] = useState<CandlestickData[] | null>(null);
  const [klinesLoading, setKlinesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCandles(null);
    setKlinesLoading(true);
    fetchWallsKlines(symbol, 90)
      .then((raw: { time: number; open: number; high: number; low: number; close: number }[]) => {
        if (cancelled) return;
        const mapped: CandlestickData[] = raw
          .filter(k => k.time && k.open && k.high && k.low && k.close)
          .map(k => ({
            time: k.time as UTCTimestamp,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
          }))
          .sort((a, b) => (a.time as number) - (b.time as number));
        setCandles(mapped);
      })
      .catch(() => { if (!cancelled) setCandles([]); })
      .finally(() => { if (!cancelled) setKlinesLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  // Chart init / cleanup
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 280,
      layout: {
        background: { type: ColorType.Solid, color: 'rgba(0,0,0,0)' },
        textColor: 'rgba(255,255,255,0.5)',
      },
      grid: {
        horzLines: { color: 'rgba(255,255,255,0.04)' },
        vertLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#34d399',
      downColor: '#f87171',
      borderUpColor: '#34d399',
      borderDownColor: '#f87171',
      wickUpColor: '#34d399',
      wickDownColor: '#f87171',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (el && chartRef.current) {
        chartRef.current.applyOptions({ width: el.clientWidth });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      try { chart.remove(); } catch { /* ignore */ }
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol]); // re-init when symbol changes

  // Update candle data when candles arrive
  useEffect(() => {
    if (!seriesRef.current || !candles || candles.length === 0) return;
    try {
      seriesRef.current.setData(candles);
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch { /* data race on unmount */ }
  }, [candles]);

  // Overlay wall lines whenever walls or candle series changes
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    const topBids = walls.bids.slice(0, MAX_WALL_LINES);
    const topAsks = walls.asks.slice(0, MAX_WALL_LINES);

    for (const wall of [...topBids, ...topAsks]) {
      try {
        series.createPriceLine({
          price: wall.price,
          color: wall.side === 'bid' ? '#34d399' : '#f87171',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: formatCompact(wall.notionalUsd),
        });
      } catch { /* ignore if series is disposed */ }
    }
  }, [walls.bids, walls.asks]);

  const isLoading = klinesLoading && candles === null;

  return (
    <div className="relative rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.05]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-xs text-white/30">Loading chart...</div>
        </div>
      )}
      {!klinesLoading && (!candles || candles.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-xs text-white/30">Chart unavailable — wall levels shown in table below</div>
        </div>
      )}
      <div ref={containerRef} className="w-full" style={{ height: 280 }} />
      {midPrice != null && (
        <div className="absolute top-2 right-3 text-[10px] text-white/30 font-mono">
          mid {midPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
});
