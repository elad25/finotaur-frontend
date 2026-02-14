// src/types/stock-analyzer.types.ts
// =====================================================
// 🎯 STOCK ANALYZER — Type Definitions
// =====================================================
// UPDATED: TabType now includes 'earnings' instead of 'dividends' | 'news' | 'risks'
// =====================================================

export interface StockSuggestion {
  ticker: string;
  name: string;
  exchange: string;
  sector?: string;
}

export interface StockData {
  // Company profile
  ticker: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  exchange: string;
  website: string | null;
  logo: string | null;
  employees: number | null;
  headquarters: string | null;
  listDate: string | null;
  // Price data
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  week52High: number | null;
  week52Low: number | null;
  beta: number | null;
  marketStatus: string;
  // Financials
  pe: number | null;
  forwardPe: number | null;
  ps: number | null;
  pb: number | null;
  evEbitda: number | null;
  evRevenue: number | null;
  pegRatio: number | null;
  revenue: number | null;
  revenueGrowth: number | null;
  netIncomeGrowth: number | null;
  epsGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  debtToEquity: number | null;
  debtToAssets: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  fcfYield: number | null;
  freeCashFlowPerShare: number | null;
  revenuePerShare: number | null;
  bookValuePerShare: number | null;
  eps: number | null;
  // Dividends
  dividendYield: number | null;
  dividendPerShare: number | null;
  payoutRatio: number | null;
  // Analyst
  analystRating: string | null;
  analystBreakdown: {
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
    total: number;
  } | null;
  priceTarget: number | null;
  priceTargetHigh: number | null;
  priceTargetLow: number | null;
  numberOfAnalysts: number;
  // Meta
  lastUpdated: string;
  nextEarningsDate: string | null;
  dataSources: string[];
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  tickers: string[];
  imageUrl?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export type TabType = 'overview' | 'business' | 'financials' | 'valuation' | 'wallstreet' | 'earnings' | 'options';