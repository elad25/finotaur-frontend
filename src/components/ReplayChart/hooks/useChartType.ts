// hooks/useChartType.ts
import { useState } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { CandleStyle, CandlestickData } from '../types';

export const useChartType = (
  chart: IChartApi | null,
  series: ISeriesApi<'Candlestick'> | null,
  candles: CandlestickData[]
) => {
  const [chartType, setChartType] = useState<CandleStyle>('candles');

  const changeChartType = (newType: CandleStyle) => {
    if (!chart || !series) return;

    chart.removeSeries(series);

    let newSeries: any;
    
    switch (newType) {
      case 'candles':
      case 'hollow':
        newSeries = chart.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
        newSeries.setData(candles);
        break;

      case 'bars':
        newSeries = chart.addBarSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
        });
        newSeries.setData(candles);
        break;

      case 'line':
        newSeries = chart.addLineSeries({
          color: '#C9A646',
          lineWidth: 2,
        });
        const lineData = candles.map(c => ({ time: c.time, value: c.close }));
        newSeries.setData(lineData);
        break;

      case 'area':
        newSeries = chart.addAreaSeries({
          topColor: 'rgba(201, 166, 70, 0.4)',
          bottomColor: 'rgba(201, 166, 70, 0.0)',
          lineColor: '#C9A646',
          lineWidth: 2,
        });
        const areaData = candles.map(c => ({ time: c.time, value: c.close }));
        newSeries.setData(areaData);
        break;
    }

    setChartType(newType);
    return newSeries;
  };

  return { chartType, changeChartType };
};