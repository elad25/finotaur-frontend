// hooks/useChart.ts - COMPLETE FIXED VERSION
import { useState, useCallback, useEffect } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { Theme, CandleStyle } from '../types';
import { ChartRenderer } from '../core/ChartRenderer';

export interface UseChartOptions {
  theme: Theme;
  onChartReady?: (chart: IChartApi, series: ISeriesApi<'Candlestick'>) => void;
}

export interface UseChartReturn {
  chart: IChartApi | null;
  candlestickSeries: ISeriesApi<'Candlestick'> | null;
  renderer: ChartRenderer | null;
  currentChartType: CandleStyle;
  handleChartReady: (chart: IChartApi, series: ISeriesApi<'Candlestick'>) => void;
  setChartType: (type: CandleStyle) => void;
}

/**
 * ===================================
 * USE CHART HOOK
 * Manages chart instance and renderer
 * ===================================
 */
export const useChart = (options: UseChartOptions): UseChartReturn => {
  const { theme, onChartReady } = options;
  
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [candlestickSeries, setCandlestickSeries] = useState<ISeriesApi<'Candlestick'> | null>(null);
  const [renderer, setRenderer] = useState<ChartRenderer | null>(null);
  const [currentChartType, setCurrentChartType] = useState<CandleStyle>('candles');

  const handleChartReady = useCallback((
    chartInstance: IChartApi,
    seriesInstance: ISeriesApi<'Candlestick'>
  ) => {
    console.log('📊 Chart ready');
    setChart(chartInstance);
    setCandlestickSeries(seriesInstance);
    
    // ✅ Pass theme to ChartRenderer
    const rendererInstance = new ChartRenderer(chartInstance, seriesInstance, theme);
    setRenderer(rendererInstance);

    if (onChartReady) {
      onChartReady(chartInstance, seriesInstance);
    }
  }, [theme, onChartReady]);

  const setChartType = useCallback((type: CandleStyle) => {
    console.log(`📊 Chart type change: ${currentChartType} → ${type}`);
    
    if (!renderer) {
      console.warn('⚠️ Renderer not initialized');
      return;
    }

    // ✅ Use ChartRenderer's setCandleStyle
    renderer.setCandleStyle(type, theme);
    setCurrentChartType(type);
  }, [renderer, theme, currentChartType]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (renderer) {
        renderer.destroy();
      }
    };
  }, [renderer]);

  return {
    chart,
    candlestickSeries,
    renderer,
    currentChartType,
    handleChartReady,
    setChartType,
  };
};