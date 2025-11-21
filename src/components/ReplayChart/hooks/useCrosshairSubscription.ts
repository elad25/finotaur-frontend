// hooks/useCrosshairSubscription.ts
import { useEffect } from 'react';
import { 
  IChartApi, 
  ISeriesApi, 
  MouseEventParams, 
  CandlestickData as LWCandlestickData,
  Time 
} from 'lightweight-charts';
import { CandlestickData } from '../types';

export const useCrosshairSubscription = (
  chart: IChartApi | null,
  series: ISeriesApi<'Candlestick'> | null,
  onCrosshairMove: (candle: CandlestickData | null) => void
) => {
  useEffect(() => {
    if (!chart || !series) return;

    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.time) {
        onCrosshairMove(null);
        return;
      }

      const data = param.seriesData.get(series) as LWCandlestickData | undefined;
      
      if (data) {
        const candle: CandlestickData = {
          time: param.time as Time,  // ✅ FIX: Cast to Time type
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: (data as any).volume || 0,
        };
        onCrosshairMove(candle);
      } else {
        onCrosshairMove(null);
      }
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
    };
  }, [chart, series, onCrosshairMove]);
};