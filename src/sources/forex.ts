import type { HeatmapItem } from '../types/heatmap';

export async function fetchForex(): Promise<{ items: HeatmapItem[]; provider: string }> {
  const items: HeatmapItem[] = [
    { symbol: 'EURUSD', name: 'EUR/USD', group: 'Majors', price: 1.091, change: -0.0015, changePercent: -0.14, weight: 1_000_000 },
    { symbol: 'GBPUSD', name: 'GBP/USD', group: 'Majors', price: 1.287, change: 0.0007, changePercent: 0.05, weight: 900_000 },
    { symbol: 'USDJPY', name: 'USD/JPY', group: 'Majors', price: 145.8, change: 0.21, changePercent: 0.14, weight: 800_000 },
    { symbol: 'DXY', name: 'DXY', group: 'Index', price: 103.4, change: 0.12, changePercent: 0.12, weight: 700_000 },
  ];
  return { items, provider: 'mock:TwelveData' };
}
