import type { HeatmapItem } from '../types/heatmap';

export async function fetchCrypto(): Promise<{ items: HeatmapItem[]; provider: string }> {
  const items: HeatmapItem[] = [
    { symbol: 'BTC', name: 'Bitcoin', group: 'L1', price: 115400, change: 3800, changePercent: 3.4, weight: 2200000000000 },
    { symbol: 'ETH', name: 'Ethereum', group: 'L1', price: 4180, change: 350, changePercent: 9.1, weight: 500000000000 },
    { symbol: 'SOL', name: 'Solana', group: 'L1', price: 202, change: 5.2, changePercent: 2.64, weight: 90000000000 },
    { symbol: 'XRP', name: 'XRP', group: 'Payments', price: 0.79, change: 0.01, changePercent: 1.3, weight: 45000000000 },
  ];
  return { items, provider: 'mock:CoinGecko' };
}
