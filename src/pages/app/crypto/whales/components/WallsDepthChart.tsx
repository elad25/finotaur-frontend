// src/pages/app/crypto/whales/components/WallsDepthChart.tsx
// Daily candlestick chart (lightweight-charts) with horizontal price-lines at
// each wall level — green lines for bids (support), red for asks (resistance).

import { useEffect, useRef, memo } from 'react';
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
import { useKlines } from '../../_shared/hooks';

interface WallsDepthChartProps {
  symbol: string;
  walls: { bids: OrderWall[]; asks: OrderWall[] };
  midPrice: number | null;
}

// Max wall lines to overlay (to avoid visual clutter)
const MAX_WALL_LINES = 8;

// Map Binance-style symbol (e.g. BTCUSDT) to the interval the kline API expects.
// The fetchKlines endpoint at /api/crypto/klines accepts Binance-style symbols directly.
function symbolToKlineSymbol(symbol: string): string {
  return symbol; // API accepts BTCUSDT, ETHUSDT, etc. directly
}

export const WallsDepthChart = memo(function WallsDepthChart({
  symbol,
  walls,
  midPrice,
}: WallsDepthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Fetch 90 daily candles via the shared klines hook (same source as CoinDetail)
  const { data: klines, loading: klinesLoading } = useKlines(
    symbolToKlineSymbol(symbol),
    '1d',
    90,
  );

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

  // Update candle data when klines arrive
  useEffect(() => {
    if (!seriesRef.current || !klines || klines.length === 0) return;

    const candleData: CandlestickData[] = klines
      .filter(k => k.time && k.open && k.high && k.low && k.close)
      .map(k => ({
        // KlineData.time is a Unix timestamp in seconds (from /api/crypto/klines)
        time: k.time as UTCTimestamp,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    try {
      seriesRef.current.setData(candleData);
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch { /* data race on unmount */ }
  }, [klines]);

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

  const isLoading = klinesLoading && !klines;

  return (
    <div className="relative rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.05]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-xs text-white/30">Loading chart...</div>
        </div>
      )}
      {!klinesLoading && (!klines || klines.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-xs text-white/30">Chart unavailable — wall levels shown in table below</div>
        </div>
      )}
      <div ref={containerRef} className="w-full" style={{ height: 280 }} />
      {midPrice != null && (
        <div className="absolute top-2 right-3 text-[10px] text-white/30 font-mono">
          mid {midPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
});
