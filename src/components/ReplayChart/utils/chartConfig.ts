// utils/chartConfig.ts
import { DeepPartial, ChartOptions, CrosshairMode } from 'lightweight-charts';
import { Theme } from '../types';

export const createChartOptions = (theme: Theme): DeepPartial<ChartOptions> => {
  const isDark = theme === 'dark';

  return {
    layout: {
      background: { color: isDark ? '#0A0A0A' : '#FFFFFF' },
      textColor: isDark ? '#C9A646' : '#333333',
    },
    grid: {
      vertLines: { color: isDark ? 'rgba(201, 166, 70, 0.1)' : '#E5E5E5' },
      horzLines: { color: isDark ? 'rgba(201, 166, 70, 0.1)' : '#E5E5E5' },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: isDark ? '#C9A646' : '#666666',
        labelBackgroundColor: isDark ? '#C9A646' : '#666666',
      },
      horzLine: {
        color: isDark ? '#C9A646' : '#666666',
        labelBackgroundColor: isDark ? '#C9A646' : '#666666',
      },
    },
    timeScale: {
      borderColor: isDark ? 'rgba(201, 166, 70, 0.2)' : '#CCCCCC',
      timeVisible: true,
      secondsVisible: false,
      // ✅ REMOVED localization from here - not supported in timeScale
    },
    localization: {
      // ✅ KEEP localization at root level only
      locale: 'en-US',
      priceFormatter: (price: number) => {
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(price);
      },
      timeFormatter: (time: number) => {
        return new Date(time * 1000).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
  };
};