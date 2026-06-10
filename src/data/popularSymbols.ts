// src/data/popularSymbols.ts
// Curated "popular" entries shown in the omnibox empty state per category tab.

export type PopularEntry = { symbol: string; name: string };

export const POPULAR_STOCKS: PopularEntry[] = [
  { symbol: 'NVDA',  name: 'NVIDIA' },
  { symbol: 'TSLA',  name: 'Tesla' },
  { symbol: 'AAPL',  name: 'Apple' },
  { symbol: 'MSFT',  name: 'Microsoft' },
  { symbol: 'AMZN',  name: 'Amazon' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'META',  name: 'Meta Platforms' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices' },
];

export const POPULAR_ETFS: PopularEntry[] = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ (Nasdaq-100)' },
  { symbol: 'IWM', name: 'iShares Russell 2000' },
  { symbol: 'DIA', name: 'SPDR Dow Jones' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market' },
  { symbol: 'VOO', name: 'Vanguard S&P 500' },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR' },
  { symbol: 'SMH', name: 'VanEck Semiconductor' },
];
