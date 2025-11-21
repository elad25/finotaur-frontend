// core/ChartCore.tsx - FIXED & COMPLETE
// ✅ Fixed: CHART_COLORS import
// ✅ Fixed: Crosshair mode from Magnet (1) to Normal (0)
// ✅ All functionality preserved

import { useRef, useEffect, useCallback, memo } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi,
  MouseEventParams,
  Time,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';
import { Theme, ChartClickEvent, CrosshairMoveEvent } from '../types';
import { throttleRAF } from '../utils/performance';

// ✅ Chart colors definition (since CHART_COLORS is not exported from constants)
const CHART_COLORS = {
  dark: {
    background: '#0A0A0A',
    text: '#FFFFFF',
    grid: '#2A2A2A',
    border: '#2A2A2A',
    crosshair: '#C9A646',
    upCandle: '#4CAF50',
    downCandle: '#F44336',
  },
  light: {
    background: '#FFFFFF',
    text: '#000000',
    grid: '#E0E0E0',
    border: '#E0E0E0',
    crosshair: '#1976D2',
    upCandle: '#4CAF50',
    downCandle: '#F44336',
  },
} as const;

export interface ChartCoreProps {
  theme: Theme;
  onChartReady?: (chart: IChartApi, series: ISeriesApi<'Candlestick'>) => void;
  onCrosshairMove?: (event: CrosshairMoveEvent) => void;
  onClick?: (event: ChartClickEvent) => void;
  onVisibleRangeChange?: (range: { from: number; to: number }) => void;
  className?: string;
}

export const ChartCore = memo<ChartCoreProps>(({ 
  theme, 
  onChartReady,
  onCrosshairMove,
  onClick,
  onVisibleRangeChange,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const isDark = theme === 'dark';
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      // 🔥 FIX: Changed from mode: 1 (Magnet) to mode: 0 (Normal)
      crosshair: {
        mode: CrosshairMode.Normal, // ✅ This is the critical fix! (0 = Normal, 1 = Magnet)
        vertLine: {
          color: colors.crosshair,
          width: 1,
          style: LineStyle.LargeDashed,
          labelBackgroundColor: colors.crosshair,
          visible: true,
          labelVisible: true,
        },
        horzLine: {
          color: colors.crosshair,
          width: 1,
          style: LineStyle.LargeDashed,
          labelBackgroundColor: colors.crosshair,
          visible: true,
          labelVisible: true,
        },
      },
      rightPriceScale: {
        borderColor: colors.border,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: colors.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 6,
        minBarSpacing: 2,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        rightBarStaysOnScroll: true,
        borderVisible: true,
        visible: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: colors.upCandle,
      downColor: colors.downCandle,
      borderVisible: false,
      wickUpColor: colors.upCandle,
      wickDownColor: colors.downCandle,
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // 🎯 Crosshair Move Handler
    const handleCrosshairMove = throttleRAF((param: MouseEventParams) => {
      if (!onCrosshairMove) return;

      const event: CrosshairMoveEvent = {
        time: param.time as number | null,
        price: param.point?.y ? candlestickSeries.coordinateToPrice(param.point.y) : null,
        seriesData: param.seriesData as any,
        point: param.point ? { x: param.point.x, y: param.point.y } : undefined,
      };

      onCrosshairMove(event);
    });

    // 🎯 Click Handler
    const handleClick = throttleRAF((param: MouseEventParams) => {
      if (!onClick || !param.time || !param.point) return;

      const price = candlestickSeries.coordinateToPrice(param.point.y);
      if (price === null) return;

      const event: ChartClickEvent = {
        time: param.time as number,
        price,
        x: param.point.x,
        y: param.point.y,
        seriesData: param.seriesData.size > 0 ? param.seriesData : undefined,
      };

      onClick(event);
    });

    // 🎯 Visible Range Change Handler
    const handleVisibleRangeChange = throttleRAF(() => {
      if (!onVisibleRangeChange) return;

      const timeScale = chart.timeScale();
      const range = timeScale.getVisibleLogicalRange();

      if (range) {
        onVisibleRangeChange({
          from: Math.floor(range.from),
          to: Math.floor(range.to),
        });
      }
    });

    // Subscribe to events
    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.subscribeClick(handleClick);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    // Setup resize observer
    resizeObserverRef.current = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        chart.applyOptions({ width, height });
      }
    });

    resizeObserverRef.current.observe(containerRef.current);

    // Notify parent that chart is ready
    if (onChartReady) {
      setTimeout(() => {
        onChartReady(chart, candlestickSeries);
      }, 0);
    }

    // Cleanup
    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.unsubscribeClick(handleClick);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []); // ✅ Empty deps - only create chart once

  // 🎨 Update theme dynamically
  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.applyOptions({
      layout: {
        background: { color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      // 🔥 FIX: Ensure mode stays Normal even when updating theme
      crosshair: {
        mode: CrosshairMode.Normal, // ✅ Keep Normal mode
        vertLine: {
          color: colors.crosshair,
          labelBackgroundColor: colors.crosshair,
        },
        horzLine: {
          color: colors.crosshair,
          labelBackgroundColor: colors.crosshair,
        },
      },
      rightPriceScale: {
        borderColor: colors.border,
      },
      timeScale: {
        borderColor: colors.border,
      },
    });

    if (seriesRef.current) {
      seriesRef.current.applyOptions({
        upColor: colors.upCandle,
        downColor: colors.downCandle,
        wickUpColor: colors.upCandle,
        wickDownColor: colors.downCandle,
      });
    }
  }, [theme, colors]);

  return (
    <div 
      ref={containerRef} 
      className={`h-full w-full ${className}`}
      style={{ position: 'relative' }}
    />
  );
});

ChartCore.displayName = 'ChartCore';