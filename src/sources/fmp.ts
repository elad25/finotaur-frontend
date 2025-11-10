import type { HeatmapItem } from '../types/heatmap';

// Placeholder/mock provider for Stocks/Indices/Commodities using FMP structure.
// Replace with real HTTP calls later.
export async function fetchStocks(): Promise<{ items: HeatmapItem[]; provider: string }> {
  // MOCK data for MVP
  const items: HeatmapItem[] = [
    { symbol: 'AAPL', name: 'Apple', group: 'Technology', price: 226.1, change: -2.3, changePercent: -1.01, weight: 3500000000000 },
    { symbol: 'MSFT', name: 'Microsoft', group: 'Technology', price: 411.2, change: 3.1, changePercent: 0.76, weight: 3200000000000 },
    { symbol: 'XOM',  name: 'Exxon', group: 'Energy', price: 119.4, change: 0.6, changePercent: 0.51, weight: 470000000000 },
    { symbol: 'JPM',  name: 'JPMorgan', group: 'Financials', price: 191.2, change: -1.9, changePercent: -0.98, weight: 560000000000 },
  ];
  return { items, provider: 'mock:FMP' };
}

export async function fetchIndices(): Promise<{ items: HeatmapItem[]; provider: string }> {
  const items: HeatmapItem[] = [
    { symbol: 'SPX', name: 'S&P 500', group: 'US', price: 5440, change: -18, changePercent: -0.33, weight: 1_000_000_000 },
    { symbol: 'NDX', name: 'NASDAQ 100', group: 'US', price: 19210, change: 42, changePercent: 0.22, weight: 800_000_000 },
    { symbol: 'DJI', name: 'Dow Jones', group: 'US', price: 38600, change: -120, changePercent: -0.31, weight: 700_000_000 },
    { symbol: 'DAX', name: 'DAX', group: 'EU', price: 18080, change: 50, changePercent: 0.28, weight: 300_000_000 },
  ];
  return { items, provider: 'mock:FMP' };
}

export async function fetchCommodities(): Promise<{ items: HeatmapItem[]; provider: string }> {
  const items: HeatmapItem[] = [
    { symbol: 'GC', name: 'Gold', group: 'Metals', price: 2380, change: -15, changePercent: -0.63, weight: 100000000 },
    { symbol: 'SI', name: 'Silver', group: 'Metals', price: 28.3, change: 0.12, changePercent: 0.43, weight: 60000000 },
    { symbol: 'CL', name: 'Crude Oil', group: 'Energy', price: 78.4, change: -0.7, changePercent: -0.89, weight: 90000000 },
    { symbol: 'NG', name: 'Nat Gas', group: 'Energy', price: 2.73, change: -0.04, changePercent: -1.45, weight: 40000000 },
  ];
  return { items, provider: 'mock:FMP' };
}
