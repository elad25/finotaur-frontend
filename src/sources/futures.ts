import type { HeatmapItem } from '../types/heatmap';

export async function fetchFutures(): Promise<{ items: HeatmapItem[]; provider: string }> {
  const items: HeatmapItem[] = [
    { symbol: 'ES', name: 'S&P 500 (E-mini)', group: 'Equity', price: 5440, change: -18, changePercent: -0.33, weight: 2000000, meta: { oi: 230000 } },
    { symbol: 'NQ', name: 'NASDAQ 100 (E-mini)', group: 'Equity', price: 19210, change: 42, changePercent: 0.22, weight: 1800000, meta: { oi: 190000 } },
    { symbol: 'CL', name: 'Crude Oil', group: 'Energy', price: 78.4, change: -0.7, changePercent: -0.89, weight: 1500000, meta: { oi: 320000 } },
    { symbol: 'GC', name: 'Gold', group: 'Metals', price: 2380, change: -15, changePercent: -0.63, weight: 1400000, meta: { oi: 270000 } },
  ];
  return { items, provider: 'mock:Futures' };
}
