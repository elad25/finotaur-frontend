// src/pages/app/all-markets/Chart.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  CrosshairMode,
  UTCTimestamp,
  Time,
} from 'lightweight-charts';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface StockInfo {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  country?: string;
  exchange?: string;
}

interface OHLCData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SMAValues {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
}

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

// Stock Data Types - Finviz Style
interface StockData {
  index: string;
  marketCap: string;
  enterpriseValue: string;
  income: string;
  sales: string;
  bookPerShare: number;
  cashPerShare: number;
  dividendEst: string;
  dividendTTM: string;
  dividendExDate: string;
  dividendGrowth: string;
  payout: string;
  employees: string;
  ipo: string;
  pe: number;
  forwardPE: number;
  peg: number;
  ps: number;
  pb: number;
  pc: number;
  pfcf: number;
  evEbitda: number;
  evSales: number;
  quickRatio: number;
  currentRatio: number;
  debtEq: number;
  ltDebtEq: number;
  optionShort: string;
  epsTTM: number;
  epsNextY: number;
  epsNextQ: number;
  epsThisY: string;
  epsNextYGrowth: string;
  epsNext5Y: string;
  epsPast3_5Y: string;
  salesPast3_5Y: string;
  epsYoYTTM: string;
  salesYoYTTM: string;
  epsQoQ: string;
  salesQoQ: string;
  earnings: string;
  epsSalesSurprise: string;
  insiderOwn: string;
  insiderTrans: string;
  instOwn: string;
  instTrans: string;
  roa: string;
  roe: string;
  roic: string;
  grossMargin: string;
  operMargin: string;
  profitMargin: string;
  sma20: string;
  sma50: string;
  sma200: string;
  shsOutstand: string;
  shsFloat: string;
  shortFloat: string;
  shortRatio: number;
  shortInterest: string;
  volatility: string;
  atr: number;
  rsi: number;
  beta: number;
  relVolume: number;
  avgVolume: string;
  volume: string;
  week52High: string;
  week52Low: string;
  perfWeek: string;
  perfMonth: string;
  perfQuarter: string;
  perfHalfY: string;
  perfYTD: string;
  perfYear: string;
  perf3Y: string;
  perf5Y: string;
  perf10Y: string;
  recom: number;
  targetPrice: number;
  prevClose: number;
  price: number;
  change: string;
}

type Timeframe = 'D' | 'W' | 'M';
type DataTab = 'fundamental' | 'analytical' | 'technical';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/*
 * REQUIRED BACKEND ENDPOINTS (see marketData.js):
 * 
 * 1. GET /api/market-data/chart/:symbol?from=YYYY-MM-DD&to=YYYY-MM-DD&timespan=day&multiplier=1
 *    Returns: { results: [{ t, o, h, l, c, v }, ...] } from Polygon
 * 
 * 2. GET /api/market-data/quote/:symbol
 *    Returns: { symbol, price, change, changePercent, open, high, low, volume, previousClose, session, ... }
 * 
 * 3. GET /api/market-data/quotes?symbols=AAPL,MSFT,GOOGL
 *    Returns: [{ symbol, price, change, changePercent, ... }, ...]
 */

// Sample stock data - Finviz style
const SAMPLE_STOCK_DATA: StockData = {
  index: 'DJIA, NDX, S&P 500',
  marketCap: '4017.10B',
  enterpriseValue: '4074.78B',
  income: '112.01B',
  sales: '416.16B',
  bookPerShare: 4.99,
  cashPerShare: 3.70,
  dividendEst: '1.08 (0.40%)',
  dividendTTM: '1.03 (0.38%)',
  dividendExDate: 'Nov 10, 2025',
  dividendGrowth: '4.26% 4.98%',
  payout: '13.66%',
  employees: '166000',
  ipo: 'Dec 12, 1980',
  pe: 36.45,
  forwardPE: 29.76,
  peg: 2.84,
  ps: 9.65,
  pb: 54.47,
  pc: 73.44,
  pfcf: 40.67,
  evEbitda: 28.15,
  evSales: 9.79,
  quickRatio: 0.86,
  currentRatio: 0.89,
  debtEq: 1.52,
  ltDebtEq: 1.22,
  optionShort: 'Yes / Yes',
  epsTTM: 7.46,
  epsNextY: 9.14,
  epsNextQ: 2.66,
  epsThisY: '10.38%',
  epsNextYGrowth: '10.95%',
  epsNext5Y: '10.49%',
  epsPast3_5Y: '6.89% 17.91%',
  salesPast3_5Y: '1.81% 8.71%',
  epsYoYTTM: '22.85%',
  salesYoYTTM: '6.43%',
  epsQoQ: '91.14%',
  salesQoQ: '7.94%',
  earnings: 'Oct 30 AMC',
  epsSalesSurprise: '4.10% 0.23%',
  insiderOwn: '0.10%',
  insiderTrans: '-2.33%',
  instOwn: '64.88%',
  instTrans: '-0.22%',
  roa: '30.93%',
  roe: '171.42%',
  roic: '68.44%',
  grossMargin: '46.91%',
  operMargin: '31.97%',
  profitMargin: '26.92%',
  sma20: '-1.31%',
  sma50: '-0.29%',
  sma200: '17.31%',
  shsOutstand: '14.77B',
  shsFloat: '14.76B',
  shortFloat: '0.83%',
  shortRatio: 2.69,
  shortInterest: '122.04M',
  volatility: '0.84% 1.43%',
  atr: 3.97,
  rsi: 45.64,
  beta: 1.09,
  relVolume: 0.60,
  avgVolume: '45.30M',
  volume: '27,293,640',
  week52High: '288.62 -5.81%',
  week52Low: '169.21 60.66%',
  perfWeek: '-0.18%',
  perfMonth: '-3.97%',
  perfQuarter: '6.42%',
  perfHalfY: '27.97%',
  perfYTD: '8.56%',
  perfYear: '6.37%',
  perf3Y: '106.17%',
  perf5Y: '107.59%',
  perf10Y: '914.12%',
  recom: 2.10,
  targetPrice: 292.51,
  prevClose: 273.08,
  price: 271.86,
  change: '-0.45%',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA FALLBACK - Realistic data based on symbol
// ═══════════════════════════════════════════════════════════════════════════════

// Base prices for common symbols (approximate current prices)
const SYMBOL_BASE_PRICES: Record<string, number> = {
  'AAPL': 175, 'MSFT': 380, 'GOOGL': 140, 'GOOG': 142, 'AMZN': 178,
  'META': 500, 'TSLA': 250, 'NVDA': 480, 'AMD': 125, 'NFLX': 480,
  'SPY': 475, 'QQQ': 410, 'DIA': 385, 'IWM': 200, 'VTI': 245,
  'INTC': 45, 'CRM': 270, 'ORCL': 125, 'ADBE': 580, 'CSCO': 52,
  'PYPL': 65, 'SQ': 75, 'SHOP': 75, 'UBER': 70, 'LYFT': 15,
  'BA': 200, 'GE': 135, 'CAT': 340, 'MMM': 105, 'HON': 210,
  'JPM': 175, 'BAC': 35, 'WFC': 55, 'GS': 400, 'MS': 95,
  'JNJ': 155, 'PFE': 28, 'MRK': 105, 'ABBV': 175, 'LLY': 750,
  'XOM': 105, 'CVX': 150, 'COP': 115, 'SLB': 50, 'OXY': 60,
  'DIS': 95, 'CMCSA': 42, 'T': 18, 'VZ': 40, 'TMUS': 165,
  'WMT': 165, 'COST': 750, 'HD': 360, 'TGT': 140, 'LOW': 230,
  'KO': 60, 'PEP': 170, 'MCD': 290, 'SBUX': 95, 'NKE': 105,
  'BTC-USD': 43000, 'ETH-USD': 2300, 'BNB-USD': 310, 'SOL-USD': 100,
};

const generateSampleData = (days: number = 365, symbol: string = 'AAPL'): CandlestickData[] => {
  const data: CandlestickData[] = [];
  const now = new Date();
  
  // Get base price for symbol or generate one
  let basePrice = SYMBOL_BASE_PRICES[symbol.toUpperCase()];
  if (!basePrice) {
    // Generate consistent price based on symbol hash
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
      hash |= 0;
    }
    basePrice = 50 + Math.abs(hash % 300);
  }
  
  // Volatility based on asset type
  const isCrypto = symbol.includes('-USD') || symbol.includes('BTC') || symbol.includes('ETH');
  const volatility = isCrypto ? 0.035 : 0.018;
  
  let price = basePrice;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Skip weekends for stocks (not crypto)
    if (!isCrypto && (date.getDay() === 0 || date.getDay() === 6)) continue;
    
    // Add slight upward bias and randomness
    const dayChange = (Math.random() - 0.47) * volatility;
    const open = price;
    price = price * (1 + dayChange);
    const close = price;
    
    // High/low with realistic wicks
    const range = Math.abs(close - open) + price * volatility * Math.random() * 0.3;
    const high = Math.max(open, close) + range * Math.random();
    const low = Math.min(open, close) - range * Math.random();
    
    // Volume with some variation
    const avgVol = isCrypto ? 5000000000 : 50000000;
    const volume = Math.floor(avgVol * (0.5 + Math.random()));
    
    data.push({
      time: (Math.floor(date.getTime() / 1000)) as UTCTimestamp,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    } as any);
  }
  
  return data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchChartData(symbol: string, days: number = 365): Promise<CandlestickData[]> {
  const now = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  
  const fromStr = from.toISOString().split('T')[0];
  const toStr = now.toISOString().split('T')[0];
  
  try {
    // Use backend's /chart endpoint (proxies to Polygon)
    const chartUrl = `${API_BASE_URL}/market-data/chart/${encodeURIComponent(symbol)}?from=${fromStr}&to=${toStr}&timespan=day&multiplier=1`;
    
    console.log(`[Chart] Fetching ${symbol} from ${fromStr} to ${toStr}...`);
    const response = await fetch(chartUrl);
    
    if (response.ok) {
      const data = await response.json();
      const results = data.results || data;
      
      if (Array.isArray(results) && results.length > 0) {
        const candleData: CandlestickData[] = results.map((bar: any) => ({
          time: Math.floor(bar.t / 1000) as Time, // Polygon returns ms, convert to seconds
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v || 0,
        }));
        
        console.log(`✓ Loaded ${candleData.length} candles for ${symbol} from backend`);
        return candleData;
      }
    } else {
      console.warn(`Chart API returned ${response.status} for ${symbol}`);
    }
    
    // Fallback to sample data
    console.warn(`Using sample data for ${symbol}`);
    return generateSampleData(days, symbol);
    
  } catch (error) {
    console.error('Failed to fetch chart data:', error);
    return generateSampleData(days, symbol);
  }
}

// Fetch stock fundamental data from API
async function fetchStockData(symbol: string): Promise<StockData | null> {
  try {
    // Use backend's /quote endpoint (proxies to Polygon snapshot)
    const quoteUrl = `${API_BASE_URL}/market-data/quote/${encodeURIComponent(symbol)}`;
    
    console.log(`[Quote] Fetching ${symbol}...`);
    const response = await fetch(quoteUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data && (data.price || data.symbol)) {
        console.log(`✓ Loaded quote for ${symbol} from backend`);
        
        const price = data.price || 0;
        const prevClose = data.previousClose || 0;
        const change = data.change || (price - prevClose);
        const changePercent = data.changePercent || (prevClose ? ((price - prevClose) / prevClose) * 100 : 0);
        
        return {
          index: data.session || 'N/A',
          marketCap: 'N/A',
          enterpriseValue: 'N/A',
          income: 'N/A',
          sales: 'N/A',
          bookPerShare: 0,
          cashPerShare: 0,
          dividendEst: 'N/A',
          dividendTTM: 'N/A',
          dividendExDate: 'N/A',
          dividendGrowth: 'N/A',
          payout: 'N/A',
          employees: 'N/A',
          ipo: 'N/A',
          pe: 0,
          forwardPE: 0,
          peg: 0,
          ps: 0,
          pb: 0,
          pc: 0,
          pfcf: 0,
          evEbitda: 0,
          evSales: 0,
          quickRatio: 0,
          currentRatio: 0,
          debtEq: 0,
          ltDebtEq: 0,
          optionShort: 'N/A',
          epsTTM: 0,
          epsNextY: 0,
          epsNextQ: 0,
          epsThisY: 'N/A',
          epsNextYGrowth: 'N/A',
          epsNext5Y: 'N/A',
          epsPast3_5Y: 'N/A',
          salesPast3_5Y: 'N/A',
          epsYoYTTM: 'N/A',
          salesYoYTTM: 'N/A',
          epsQoQ: 'N/A',
          salesQoQ: 'N/A',
          earnings: 'N/A',
          epsSalesSurprise: 'N/A',
          insiderOwn: 'N/A',
          insiderTrans: 'N/A',
          instOwn: 'N/A',
          instTrans: 'N/A',
          roa: 'N/A',
          roe: 'N/A',
          roic: 'N/A',
          grossMargin: 'N/A',
          operMargin: 'N/A',
          profitMargin: 'N/A',
          sma20: 'N/A',
          sma50: 'N/A',
          sma200: 'N/A',
          shsOutstand: 'N/A',
          shsFloat: 'N/A',
          shortFloat: 'N/A',
          shortRatio: 0,
          shortInterest: 'N/A',
          volatility: 'N/A',
          atr: 0,
          rsi: 0,
          beta: 0,
          relVolume: 0,
          avgVolume: 'N/A',
          volume: (data.volume || 0).toLocaleString(),
          week52High: data.high ? `${data.high.toFixed(2)}` : 'N/A',
          week52Low: data.low ? `${data.low.toFixed(2)}` : 'N/A',
          perfWeek: 'N/A',
          perfMonth: 'N/A',
          perfQuarter: 'N/A',
          perfHalfY: 'N/A',
          perfYTD: 'N/A',
          perfYear: 'N/A',
          perf3Y: 'N/A',
          perf5Y: 'N/A',
          perf10Y: 'N/A',
          recom: 0,
          targetPrice: 0,
          prevClose: prevClose,
          price: price,
          change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
        };
      }
    } else {
      console.warn(`Quote API returned ${response.status} for ${symbol}`);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch stock data:', error);
    return null;
  }
}

// Helper to format market cap
const formatMarketCap = (value: number): string => {
  if (!value) return 'N/A';
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
};

const formatVolumeLarge = (value: number): string => {
  if (!value) return 'N/A';
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toString();
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATA HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const generateVolumeData = (candleData: CandlestickData[]): HistogramData[] => {
  return candleData.map((candle: any) => ({
    time: candle.time,
    value: candle.volume || 0,
    color: candle.close >= candle.open ? 'rgba(38, 166, 154, 0.6)' : 'rgba(239, 83, 80, 0.6)',
  }));
};

const calculateSMA = (data: CandlestickData[], period: number): LineData[] => {
  const smaData: LineData[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    smaData.push({ time: data[i].time, value: parseFloat((sum / period).toFixed(2)) });
  }
  return smaData;
};

const calculateEMA = (data: CandlestickData[], period: number): LineData[] => {
  const emaData: LineData[] = [];
  if (data.length < period) return emaData;
  
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let ema = sum / period;
  emaData.push({ time: data[period - 1].time, value: parseFloat(ema.toFixed(2)) });
  
  // Calculate rest of EMA
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    emaData.push({ time: data[i].time, value: parseFloat(ema.toFixed(2)) });
  }
  return emaData;
};

const calculateBollingerBands = (data: CandlestickData[], period: number = 20, stdDev: number = 2): { upper: LineData[], middle: LineData[], lower: LineData[] } => {
  const upper: LineData[] = [];
  const middle: LineData[] = [];
  const lower: LineData[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    const sma = sum / period;
    
    let squaredSum = 0;
    for (let j = 0; j < period; j++) {
      squaredSum += Math.pow(data[i - j].close - sma, 2);
    }
    const std = Math.sqrt(squaredSum / period);
    
    middle.push({ time: data[i].time, value: parseFloat(sma.toFixed(2)) });
    upper.push({ time: data[i].time, value: parseFloat((sma + stdDev * std).toFixed(2)) });
    lower.push({ time: data[i].time, value: parseFloat((sma - stdDev * std).toFixed(2)) });
  }
  
  return { upper, middle, lower };
};

const calculateVWAP = (data: CandlestickData[]): LineData[] => {
  const vwapData: LineData[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  
  for (let i = 0; i < data.length; i++) {
    const candle = data[i] as any;
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const volume = candle.volume || 0;
    
    cumulativeTPV += typicalPrice * volume;
    cumulativeVolume += volume;
    
    if (cumulativeVolume > 0) {
      vwapData.push({ 
        time: candle.time, 
        value: parseFloat((cumulativeTPV / cumulativeVolume).toFixed(2)) 
      });
    }
  }
  return vwapData;
};

// Helper function for point-to-line distance
const pointToLineDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) param = dot / lenSq;
  
  let xx, yy;
  
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

const convertToWeekly = (dailyData: CandlestickData[]): CandlestickData[] => {
  const weeklyData: CandlestickData[] = [];
  let weekCandle: CandlestickData | null = null;
  
  dailyData.forEach((candle: any) => {
    const date = new Date((candle.time as number) * 1000);
    if (date.getDay() === 1 || !weekCandle) {
      if (weekCandle) weeklyData.push(weekCandle);
      weekCandle = { ...candle };
    } else {
      weekCandle.high = Math.max(weekCandle.high, candle.high);
      weekCandle.low = Math.min(weekCandle.low, candle.low);
      weekCandle.close = candle.close;
    }
  });
  if (weekCandle) weeklyData.push(weekCandle);
  return weeklyData;
};

const convertToMonthly = (dailyData: CandlestickData[]): CandlestickData[] => {
  const monthlyData: CandlestickData[] = [];
  let monthCandle: CandlestickData | null = null;
  let currentMonth = -1;
  
  dailyData.forEach((candle: any) => {
    const date = new Date((candle.time as number) * 1000);
    const month = date.getMonth();
    if (month !== currentMonth || !monthCandle) {
      if (monthCandle) monthlyData.push(monthCandle);
      monthCandle = { ...candle };
      currentMonth = month;
    } else {
      monthCandle.high = Math.max(monthCandle.high, candle.high);
      monthCandle.low = Math.min(monthCandle.low, candle.low);
      monthCandle.close = candle.close;
    }
  });
  if (monthCandle) monthlyData.push(monthCandle);
  return monthlyData;
};

const formatVolume = (vol: number): string => {
  if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
  if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
  if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K';
  return vol.toString();
};

// Format value with color based on positive/negative
const formatValue = (value: string | number, colorize: boolean = true): { text: string; color: string } => {
  const strValue = String(value);
  let color = '#b2b5be';
  if (colorize) {
    if (strValue.includes('-')) color = '#ef5350';
    else if (strValue.includes('%') && !strValue.startsWith('-') && parseFloat(strValue) > 0) color = '#26a69a';
  }
  return { text: strValue, color };
};

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK SYMBOLS FOR AUTOCOMPLETE
// ═══════════════════════════════════════════════════════════════════════════════

const STOCK_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple Inc', sector: 'Technology', industry: 'Consumer Electronics' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software' },
  { symbol: 'GOOGL', name: 'Alphabet Inc', sector: 'Technology', industry: 'Internet Services' },
  { symbol: 'AMZN', name: 'Amazon.com Inc', sector: 'Consumer Cyclical', industry: 'E-Commerce' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'TSLA', name: 'Tesla Inc', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers' },
  { symbol: 'META', name: 'Meta Platforms Inc', sector: 'Technology', industry: 'Internet Services' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', sector: 'ETF', industry: 'Index Fund' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', sector: 'ETF', industry: 'Index Fund' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'NFLX', name: 'Netflix Inc', sector: 'Communication', industry: 'Entertainment' },
  { symbol: 'DIS', name: 'Walt Disney Company', sector: 'Communication', industry: 'Entertainment' },
  { symbol: 'PYPL', name: 'PayPal Holdings', sector: 'Financial', industry: 'Credit Services' },
  { symbol: 'INTC', name: 'Intel Corporation', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'CSCO', name: 'Cisco Systems', sector: 'Technology', industry: 'Networking' },
  { symbol: 'ADBE', name: 'Adobe Inc', sector: 'Technology', industry: 'Software' },
  { symbol: 'CRM', name: 'Salesforce Inc', sector: 'Technology', industry: 'Software' },
  { symbol: 'ORCL', name: 'Oracle Corporation', sector: 'Technology', industry: 'Software' },
  { symbol: 'BA', name: 'Boeing Company', sector: 'Industrial', industry: 'Aerospace' },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financial', industry: 'Banking' },
  { symbol: 'V', name: 'Visa Inc', sector: 'Financial', industry: 'Credit Services' },
  { symbol: 'MA', name: 'Mastercard Inc', sector: 'Financial', industry: 'Credit Services' },
  { symbol: 'WMT', name: 'Walmart Inc', sector: 'Consumer Defensive', industry: 'Retail' },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer Defensive', industry: 'Household Products' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', industry: 'Health Plans' },
  { symbol: 'HD', name: 'Home Depot', sector: 'Consumer Cyclical', industry: 'Home Improvement' },
  { symbol: 'KO', name: 'Coca-Cola Company', sector: 'Consumer Defensive', industry: 'Beverages' },
  { symbol: 'PEP', name: 'PepsiCo Inc', sector: 'Consumer Defensive', industry: 'Beverages' },
  { symbol: 'MCD', name: 'McDonald\'s Corp', sector: 'Consumer Cyclical', industry: 'Restaurants' },
  { symbol: 'NKE', name: 'Nike Inc', sector: 'Consumer Cyclical', industry: 'Footwear' },
  { symbol: 'SBUX', name: 'Starbucks Corp', sector: 'Consumer Cyclical', industry: 'Restaurants' },
  { symbol: 'COST', name: 'Costco Wholesale', sector: 'Consumer Defensive', industry: 'Retail' },
  { symbol: 'T', name: 'AT&T Inc', sector: 'Communication', industry: 'Telecom' },
  { symbol: 'VZ', name: 'Verizon Communications', sector: 'Communication', industry: 'Telecom' },
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', industry: 'Oil & Gas' },
  { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy', industry: 'Oil & Gas' },
  { symbol: 'ABBV', name: 'AbbVie Inc', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'PFE', name: 'Pfizer Inc', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'MRK', name: 'Merck & Co', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific', sector: 'Healthcare', industry: 'Diagnostics' },
  { symbol: 'AVGO', name: 'Broadcom Inc', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'LLY', name: 'Eli Lilly', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'COIN', name: 'Coinbase Global', sector: 'Financial', industry: 'Crypto Exchange' },
  { symbol: 'PLTR', name: 'Palantir Technologies', sector: 'Technology', industry: 'Software' },
  { symbol: 'SNOW', name: 'Snowflake Inc', sector: 'Technology', industry: 'Cloud Computing' },
  { symbol: 'UBER', name: 'Uber Technologies', sector: 'Technology', industry: 'Ride-Sharing' },
  { symbol: 'ABNB', name: 'Airbnb Inc', sector: 'Consumer Cyclical', industry: 'Travel' },
  { symbol: 'SQ', name: 'Block Inc', sector: 'Technology', industry: 'Fintech' },
  { symbol: 'SHOP', name: 'Shopify Inc', sector: 'Technology', industry: 'E-Commerce' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT WATCHLIST
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: 'AAPL', name: 'Apple Inc', price: 0, change: 0, changePercent: 0 },
  { symbol: 'MSFT', name: 'Microsoft', price: 0, change: 0, changePercent: 0 },
  { symbol: 'GOOGL', name: 'Alphabet', price: 0, change: 0, changePercent: 0 },
  { symbol: 'AMZN', name: 'Amazon', price: 0, change: 0, changePercent: 0 },
  { symbol: 'NVDA', name: 'NVIDIA', price: 0, change: 0, changePercent: 0 },
  { symbol: 'TSLA', name: 'Tesla', price: 0, change: 0, changePercent: 0 },
  { symbol: 'META', name: 'Meta', price: 0, change: 0, changePercent: 0 },
  { symbol: 'SPY', name: 'S&P 500 ETF', price: 0, change: 0, changePercent: 0 },
  { symbol: 'QQQ', name: 'Nasdaq ETF', price: 0, change: 0, changePercent: 0 },
  { symbol: 'AMD', name: 'AMD', price: 0, change: 0, changePercent: 0 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DATA TABLE COMPONENT - FINVIZ STYLE
// ═══════════════════════════════════════════════════════════════════════════════

interface DataTableProps {
  data: StockData;
  activeTab: DataTab;
  onTabChange: (tab: DataTab) => void;
}

const DataTable: React.FC<DataTableProps> = ({ data, activeTab, onTabChange }) => {
  const renderCell = (label: string, value: string | number, colorize: boolean = false) => {
    const formatted = formatValue(value, colorize);
    return (
      <div className="flex justify-between py-[3px] px-2 hover:bg-[#1e222d] border-b border-[#1e222d]">
        <span className="text-[#787b86] text-[11px]">{label}</span>
        <span className="text-[11px] font-medium tabular-nums" style={{ color: formatted.color }}>{formatted.text}</span>
      </div>
    );
  };

  return (
    <div className="bg-[#131722] border-t border-[#2a2e39]">
      <div className="flex items-center border-b border-[#2a2e39] bg-[#1a1d29]">
        {[
          { id: 'fundamental' as DataTab, label: 'Fundamental' },
          { id: 'analytical' as DataTab, label: 'Analytical' },
          { id: 'technical' as DataTab, label: 'Technical' },
        ].map((tab) => (
          <button key={tab.id} onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.id ? 'text-[#2962ff] border-[#2962ff] bg-[#131722]' : 'text-[#787b86] border-transparent hover:text-white'
            }`}>{tab.label}</button>
        ))}
      </div>
      <div className="p-2">
        {activeTab === 'fundamental' && (
          <div className="grid grid-cols-8 gap-0">
            <div className="border-r border-[#2a2e39]">
              {renderCell('Index', data.index)}
              {renderCell('Market Cap', data.marketCap)}
              {renderCell('Enterprise Value', data.enterpriseValue)}
              {renderCell('Income', data.income)}
              {renderCell('Sales', data.sales)}
              {renderCell('Book/sh', data.bookPerShare)}
              {renderCell('Cash/sh', data.cashPerShare)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('Dividend Est.', data.dividendEst)}
              {renderCell('Dividend TTM', data.dividendTTM)}
              {renderCell('Dividend Ex-Date', data.dividendExDate)}
              {renderCell('Dividend Gr. 3/5Y', data.dividendGrowth, true)}
              {renderCell('Payout', data.payout)}
              {renderCell('Employees', data.employees)}
              {renderCell('IPO', data.ipo)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('P/E', data.pe)}
              {renderCell('Forward P/E', data.forwardPE)}
              {renderCell('PEG', data.peg, true)}
              {renderCell('P/S', data.ps)}
              {renderCell('P/B', data.pb, true)}
              {renderCell('P/C', data.pc, true)}
              {renderCell('P/FCF', data.pfcf)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('EV/EBITDA', data.evEbitda)}
              {renderCell('EV/Sales', data.evSales)}
              {renderCell('Quick Ratio', data.quickRatio)}
              {renderCell('Current Ratio', data.currentRatio)}
              {renderCell('Debt/Eq', data.debtEq)}
              {renderCell('LT Debt/Eq', data.ltDebtEq)}
              {renderCell('Option/Short', data.optionShort)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('Insider Own', data.insiderOwn)}
              {renderCell('Insider Trans', data.insiderTrans, true)}
              {renderCell('Inst Own', data.instOwn)}
              {renderCell('Inst Trans', data.instTrans, true)}
              {renderCell('ROA', data.roa, true)}
              {renderCell('ROE', data.roe, true)}
              {renderCell('ROIC', data.roic, true)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('Gross Margin', data.grossMargin, true)}
              {renderCell('Oper. Margin', data.operMargin, true)}
              {renderCell('Profit Margin', data.profitMargin, true)}
              {renderCell('Short Float', data.shortFloat)}
              {renderCell('Short Ratio', data.shortRatio)}
              {renderCell('Short Interest', data.shortInterest)}
              {renderCell('Shs Outstand', data.shsOutstand)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('Shs Float', data.shsFloat)}
              {renderCell('Avg Volume', data.avgVolume)}
              {renderCell('Volume', data.volume)}
              {renderCell('52W High', data.week52High, true)}
              {renderCell('52W Low', data.week52Low, true)}
              {renderCell('Prev Close', data.prevClose)}
              {renderCell('Price', data.price)}
            </div>
            <div>
              {renderCell('Perf Week', data.perfWeek, true)}
              {renderCell('Perf Month', data.perfMonth, true)}
              {renderCell('Perf Quarter', data.perfQuarter, true)}
              {renderCell('Perf Half Y', data.perfHalfY, true)}
              {renderCell('Perf YTD', data.perfYTD, true)}
              {renderCell('Perf Year', data.perfYear, true)}
              {renderCell('Change', data.change, true)}
            </div>
          </div>
        )}
        {activeTab === 'analytical' && (
          <div className="grid grid-cols-8 gap-0">
            <div className="border-r border-[#2a2e39]">
              {renderCell('EPS (ttm)', data.epsTTM)}
              {renderCell('EPS next Y', data.epsNextY)}
              {renderCell('EPS next Q', data.epsNextQ)}
              {renderCell('EPS this Y', data.epsThisY, true)}
              {renderCell('EPS next Y %', data.epsNextYGrowth, true)}
              {renderCell('EPS next 5Y', data.epsNext5Y, true)}
              {renderCell('EPS past 3/5Y', data.epsPast3_5Y, true)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('Sales past 3/5Y', data.salesPast3_5Y, true)}
              {renderCell('EPS Y/Y TTM', data.epsYoYTTM, true)}
              {renderCell('Sales Y/Y TTM', data.salesYoYTTM, true)}
              {renderCell('EPS Q/Q', data.epsQoQ, true)}
              {renderCell('Sales Q/Q', data.salesQoQ, true)}
              {renderCell('Earnings', data.earnings)}
              {renderCell('EPS/Sales Surpr.', data.epsSalesSurprise, true)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('Insider Own', data.insiderOwn)}
              {renderCell('Insider Trans', data.insiderTrans, true)}
              {renderCell('Inst Own', data.instOwn)}
              {renderCell('Inst Trans', data.instTrans, true)}
              {renderCell('Short Float', data.shortFloat)}
              {renderCell('Short Ratio', data.shortRatio)}
              {renderCell('Short Interest', data.shortInterest)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('ROA', data.roa, true)}
              {renderCell('ROE', data.roe, true)}
              {renderCell('ROIC', data.roic, true)}
              {renderCell('Gross Margin', data.grossMargin, true)}
              {renderCell('Oper. Margin', data.operMargin, true)}
              {renderCell('Profit Margin', data.profitMargin, true)}
              {renderCell('Payout', data.payout)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('Perf Week', data.perfWeek, true)}
              {renderCell('Perf Month', data.perfMonth, true)}
              {renderCell('Perf Quarter', data.perfQuarter, true)}
              {renderCell('Perf Half Y', data.perfHalfY, true)}
              {renderCell('Perf YTD', data.perfYTD, true)}
              {renderCell('Perf Year', data.perfYear, true)}
              {renderCell('Change', data.change, true)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('Perf 3Y', data.perf3Y, true)}
              {renderCell('Perf 5Y', data.perf5Y, true)}
              {renderCell('Perf 10Y', data.perf10Y, true)}
              {renderCell('Volatility', data.volatility)}
              {renderCell('Beta', data.beta)}
              {renderCell('ATR (14)', data.atr)}
              {renderCell('RSI (14)', data.rsi)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('52W High', data.week52High, true)}
              {renderCell('52W Low', data.week52Low, true)}
              {renderCell('Target Price', data.targetPrice)}
              {renderCell('Recom', data.recom)}
              {renderCell('Prev Close', data.prevClose)}
              {renderCell('Price', data.price)}
              {renderCell('Change', data.change, true)}
            </div>
            <div>
              {renderCell('P/E', data.pe)}
              {renderCell('Forward P/E', data.forwardPE)}
              {renderCell('PEG', data.peg, true)}
              {renderCell('P/S', data.ps)}
              {renderCell('P/B', data.pb, true)}
              {renderCell('EV/EBITDA', data.evEbitda)}
              {renderCell('EV/Sales', data.evSales)}
            </div>
          </div>
        )}
        {activeTab === 'technical' && (
          <div className="grid grid-cols-8 gap-0">
            <div className="border-r border-[#2a2e39]">
              {renderCell('SMA20', data.sma20, true)}
              {renderCell('SMA50', data.sma50, true)}
              {renderCell('SMA200', data.sma200, true)}
              {renderCell('52W High', data.week52High, true)}
              {renderCell('52W Low', data.week52Low, true)}
              {renderCell('ATR (14)', data.atr)}
              {renderCell('RSI (14)', data.rsi)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('Volatility', data.volatility)}
              {renderCell('Beta', data.beta)}
              {renderCell('Rel Volume', data.relVolume)}
              {renderCell('Avg Volume', data.avgVolume)}
              {renderCell('Volume', data.volume)}
              {renderCell('Prev Close', data.prevClose)}
              {renderCell('Price', data.price)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('Shs Outstand', data.shsOutstand)}
              {renderCell('Shs Float', data.shsFloat)}
              {renderCell('Short Float', data.shortFloat)}
              {renderCell('Short Ratio', data.shortRatio)}
              {renderCell('Short Interest', data.shortInterest)}
              {renderCell('Option/Short', data.optionShort)}
              {renderCell('Change', data.change, true)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('Perf Week', data.perfWeek, true)}
              {renderCell('Perf Month', data.perfMonth, true)}
              {renderCell('Perf Quarter', data.perfQuarter, true)}
              {renderCell('Perf Half Y', data.perfHalfY, true)}
              {renderCell('Perf YTD', data.perfYTD, true)}
              {renderCell('Perf Year', data.perfYear, true)}
              {renderCell('Perf 3Y', data.perf3Y, true)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('Perf 5Y', data.perf5Y, true)}
              {renderCell('Perf 10Y', data.perf10Y, true)}
              {renderCell('Target Price', data.targetPrice)}
              {renderCell('Recom', data.recom)}
              {renderCell('P/E', data.pe)}
              {renderCell('Forward P/E', data.forwardPE)}
              {renderCell('PEG', data.peg, true)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('EPS (ttm)', data.epsTTM)}
              {renderCell('EPS next Y', data.epsNextY)}
              {renderCell('EPS next Q', data.epsNextQ)}
              {renderCell('Earnings', data.earnings)}
              {renderCell('EPS this Y', data.epsThisY, true)}
              {renderCell('EPS next Y %', data.epsNextYGrowth, true)}
              {renderCell('EPS Q/Q', data.epsQoQ, true)}
            </div>
            <div className="border-r border-[#2a2e39]">
              {renderCell('Insider Own', data.insiderOwn)}
              {renderCell('Insider Trans', data.insiderTrans, true)}
              {renderCell('Inst Own', data.instOwn)}
              {renderCell('Inst Trans', data.instTrans, true)}
              {renderCell('ROA', data.roa, true)}
              {renderCell('ROE', data.roe, true)}
              {renderCell('ROIC', data.roic, true)}
            </div>
            <div>
              {renderCell('Gross Margin', data.grossMargin, true)}
              {renderCell('Oper. Margin', data.operMargin, true)}
              {renderCell('Profit Margin', data.profitMargin, true)}
              {renderCell('Market Cap', data.marketCap)}
              {renderCell('Enterprise Value', data.enterpriseValue)}
              {renderCell('Income', data.income)}
              {renderCell('Sales', data.sales)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHART PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ChartPage() {
  // Symbol state
  const [symbol, setSymbol] = useState<string>(() => {
    try {
      return localStorage.getItem("finotaur.activeSymbol") || 'AAPL';
    } catch {
      return 'AAPL';
    }
  });

  const [stockInfo, setStockInfo] = useState<StockInfo>(() => {
    const found = STOCK_SYMBOLS.find(s => s.symbol === 'AAPL');
    return found || { symbol: 'AAPL', name: 'Apple Inc' };
  });
  const [isLoading, setIsLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(DEFAULT_WATCHLIST);
  
  // NEW: Data table state
  const [stockData, setStockData] = useState<StockData>(SAMPLE_STOCK_DATA);
  
  // Toolbar menu states
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [lineWidthMenuOpen, setLineWidthMenuOpen] = useState(false);
  const [lineStyleMenuOpen, setLineStyleMenuOpen] = useState(false);
  const [activeDataTab, setActiveDataTab] = useState<DataTab>('fundamental');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<typeof STOCK_SYMBOLS>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Indicator state
  const [indicators, setIndicators] = useState({
    sma20: true,
    sma50: true,
    sma200: false,
    ema12: false,
    ema26: false,
    vwap: false,
    volume: true,
    bollingerBands: false,
  });
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  
  // Drawing state
  const [showDrawingMenu, setShowDrawingMenu] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number; time: any; price: number } | null>(null);
  const [selectedDrawingIndex, setSelectedDrawingIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null); // For resize handles
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null); // For cursor changes
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState('');
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  
  // Helper to get cursor for handle
  const getHandleCursor = (handleId: string | null): string => {
    if (!handleId) return 'default';
    const cursors: Record<string, string> = {
      'nw': 'nwse-resize', 'se': 'nwse-resize',
      'ne': 'nesw-resize', 'sw': 'nesw-resize',
      'n': 'ns-resize', 's': 'ns-resize',
      'e': 'ew-resize', 'w': 'ew-resize',
    };
    return cursors[handleId] || 'move';
  };

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const sma20Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const sma50Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const sma200Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema12Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema26Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);
  const vwapRef = useRef<ISeriesApi<'Line'> | null>(null);
  
  // Chart state
  const [timeframe, setTimeframe] = useState<Timeframe>('D');
  const [currentOHLC, setCurrentOHLC] = useState<OHLCData | null>(null);
  const [smaValues, setSmaValues] = useState<SMAValues>({ sma20: null, sma50: null, sma200: null });
  const [lastPrice, setLastPrice] = useState<{ price: number; change: number; changePercent: number } | null>(null);
  const [lastCloseDate, setLastCloseDate] = useState<string>('');
  const [isChartReady, setIsChartReady] = useState(false);
  
  // Data refs
  const dailyDataRef = useRef<CandlestickData[]>([]);
  const volumeDataRef = useRef<HistogramData[]>([]);
  const sma20DataRef = useRef<LineData[]>([]);
  const sma50DataRef = useRef<LineData[]>([]);
  const sma200DataRef = useRef<LineData[]>([]);

  // Load watchlist prices
  useEffect(() => {
    const fetchWatchlistPrices = async () => {
      try {
        const symbols = DEFAULT_WATCHLIST.map(item => item.symbol).join(',');
        const response = await fetch(`${API_BASE_URL}/market-data/quotes?symbols=${symbols}`);
        if (response.ok) {
          const data = await response.json();
          const quotesArray = Array.isArray(data) ? data : (data.results || data.quotes || []);
          if (Array.isArray(quotesArray)) {
            setWatchlist(prev => prev.map(item => {
              const quote = quotesArray.find((q: any) => q?.symbol === item.symbol || q?.ticker === item.symbol);
              if (quote) {
                return {
                  ...item,
                  price: quote.price || quote.c || quote.lastPrice || 0,
                  change: quote.change || quote.todaysChange || 0,
                  changePercent: quote.changePercent || quote.todaysChangePerc || 0,
                };
              }
              return item;
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch watchlist prices:', error);
      }
    };
    
    fetchWatchlistPrices();
    const interval = setInterval(fetchWatchlistPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load chart data
  const loadChartData = useCallback(async (sym: string) => {
    setIsLoading(true);
    
    try {
      // Fetch both chart data and stock fundamentals in parallel
      const [chartData, fundamentals] = await Promise.all([
        fetchChartData(sym, 365),
        fetchStockData(sym),
      ]);
      
      // Update stock data if we got fundamentals
      if (fundamentals) {
        setStockData(fundamentals);
      } else {
        // Generate basic data from chart data if API fails
        if (chartData.length >= 2) {
          const lastCandle = chartData[chartData.length - 1];
          const prevCandle = chartData[chartData.length - 2];
          const change = ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100;
          
          setStockData(prev => ({
            ...prev,
            price: lastCandle.close,
            prevClose: prevCandle.close,
            change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
            volume: ((chartData[chartData.length - 1] as any).volume || 0).toLocaleString(),
          }));
        }
      }
      
      if (chartData.length === 0) {
        setIsLoading(false);
        return;
      }
      
      dailyDataRef.current = chartData;
      volumeDataRef.current = generateVolumeData(chartData);
      sma20DataRef.current = calculateSMA(chartData, 20);
      sma50DataRef.current = calculateSMA(chartData, 50);
      sma200DataRef.current = calculateSMA(chartData, 200);
      
      const ema12Data = calculateEMA(chartData, 12);
      const ema26Data = calculateEMA(chartData, 26);
      const bbData = calculateBollingerBands(chartData, 20, 2);
      const vwapData = calculateVWAP(chartData);
      
      if (chartData.length >= 2) {
        const lastCandle = chartData[chartData.length - 1];
        const prevCandle = chartData[chartData.length - 2];
        const change = lastCandle.close - prevCandle.close;
        const changePercent = (change / prevCandle.close) * 100;
        
        setLastPrice({ price: lastCandle.close, change, changePercent });
        
        const date = new Date((lastCandle.time as number) * 1000);
        setLastCloseDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · 04:00PM ET');
        
        const lastVolume = volumeDataRef.current[volumeDataRef.current.length - 1];
        setCurrentOHLC({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close,
          volume: lastVolume?.value ?? 0,
        });
        
        setSmaValues({
          sma20: sma20DataRef.current[sma20DataRef.current.length - 1]?.value ?? null,
          sma50: sma50DataRef.current[sma50DataRef.current.length - 1]?.value ?? null,
          sma200: sma200DataRef.current[sma200DataRef.current.length - 1]?.value ?? null,
        });
      }
      
      if (candleSeriesRef.current && volumeSeriesRef.current) {
        candleSeriesRef.current.setData(chartData);
        volumeSeriesRef.current.setData(volumeDataRef.current);
        sma20Ref.current?.setData(sma20DataRef.current);
        sma50Ref.current?.setData(sma50DataRef.current);
        sma200Ref.current?.setData(sma200DataRef.current);
        ema12Ref.current?.setData(ema12Data);
        ema26Ref.current?.setData(ema26Data);
        bbUpperRef.current?.setData(bbData.upper);
        bbMiddleRef.current?.setData(bbData.middle);
        bbLowerRef.current?.setData(bbData.lower);
        vwapRef.current?.setData(vwapData);
        
        chartRef.current?.timeScale().fitContent();
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading chart data:', err);
      setIsLoading(false);
    }
  }, []);

  // Initialize chart - AXIS-ONLY ZOOM/PAN
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Flag to track if effect is still active
    let isActive = true;
    
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    
    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { color: '#131722' },
        textColor: '#b2b5be',
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#758696', width: 1, style: 2, labelBackgroundColor: '#2a2e39' },
        horzLine: { color: '#758696', width: 1, style: 2, labelBackgroundColor: '#2a2e39' },
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 8,
      },
      localization: { locale: 'en-US' },
      // Allow panning by dragging on chart, disable wheel zoom
      handleScroll: {
        mouseWheel: false,        // No scroll zoom
        pressedMouseMove: true,   // Allow drag to pan
        horzTouchDrag: true,      // Allow touch drag horizontal
        vertTouchDrag: false,     // No vertical touch drag
      },
      handleScale: {
        mouseWheel: false,        // No wheel zoom on chart
        pinch: false,             // No pinch zoom
        axisPressedMouseMove: {   // Allow zoom by dragging axes
          time: true,
          price: true,
        },
        axisDoubleClickReset: {
          time: true,
          price: true,
        },
      },
    });
    
    chartRef.current = chart;
    
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350',
      borderUpColor: '#26a69a', borderDownColor: '#ef5350',
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });
    candleSeriesRef.current = candleSeries;
    
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      visible: true,
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volumeSeriesRef.current = volumeSeries;
    
    const sma20Series = chart.addLineSeries({ color: '#e040fb', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, visible: true });
    const sma50Series = chart.addLineSeries({ color: '#00bcd4', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, visible: true });
    const sma200Series = chart.addLineSeries({ color: '#ff9800', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, visible: false });
    sma20Ref.current = sma20Series;
    sma50Ref.current = sma50Series;
    sma200Ref.current = sma200Series;
    
    const ema12Series = chart.addLineSeries({ color: '#9c27b0', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, visible: false });
    const ema26Series = chart.addLineSeries({ color: '#673ab7', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, visible: false });
    ema12Ref.current = ema12Series;
    ema26Ref.current = ema26Series;
    
    const bbUpperSeries = chart.addLineSeries({ color: '#2196f3', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, visible: false, lineStyle: 2 });
    const bbMiddleSeries = chart.addLineSeries({ color: '#2196f3', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, visible: false });
    const bbLowerSeries = chart.addLineSeries({ color: '#2196f3', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, visible: false, lineStyle: 2 });
    bbUpperRef.current = bbUpperSeries;
    bbMiddleRef.current = bbMiddleSeries;
    bbLowerRef.current = bbLowerSeries;
    
    const vwapSeries = chart.addLineSeries({ color: '#4caf50', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, visible: false, lineStyle: 1 });
    vwapRef.current = vwapSeries;
    
    chart.subscribeCrosshairMove((param) => {
      if (!isActive) return;
      
      if (!param.time || !param.seriesData) {
        if (dailyDataRef.current.length > 0) {
          const lastBar = dailyDataRef.current[dailyDataRef.current.length - 1] as any;
          const date = new Date((lastBar.time as number) * 1000);
          setCurrentOHLC({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            open: lastBar.open, high: lastBar.high, low: lastBar.low, close: lastBar.close,
            volume: volumeDataRef.current[volumeDataRef.current.length - 1]?.value ?? 0,
          });
        }
        if (sma20DataRef.current.length > 0) {
          setSmaValues({
            sma20: sma20DataRef.current[sma20DataRef.current.length - 1]?.value ?? null,
            sma50: sma50DataRef.current[sma50DataRef.current.length - 1]?.value ?? null,
            sma200: sma200DataRef.current[sma200DataRef.current.length - 1]?.value ?? null,
          });
        }
        return;
      }
      
      const candleData = param.seriesData.get(candleSeries) as CandlestickData;
      const volumeData = param.seriesData.get(volumeSeries) as HistogramData;
      
      if (candleData) {
        const date = new Date((param.time as number) * 1000);
        setCurrentOHLC({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          open: candleData.open, high: candleData.high, low: candleData.low, close: candleData.close,
          volume: volumeData?.value ?? 0,
        });
      }
      
      setSmaValues({
        sma20: (param.seriesData.get(sma20Series) as LineData)?.value ?? null,
        sma50: (param.seriesData.get(sma50Series) as LineData)?.value ?? null,
        sma200: (param.seriesData.get(sma200Series) as LineData)?.value ?? null,
      });
    });
    
    setIsChartReady(true);
    
    // Load initial data
    const loadInitialData = async () => {
      if (!isActive) return;
      
      setIsLoading(true);
      try {
        const chartData = await fetchChartData(symbol, 365);
        
        // Check if still active after async operation
        if (!isActive) return;
        
        if (chartData.length === 0) {
          setIsLoading(false);
          return;
        }
        
        dailyDataRef.current = chartData;
        volumeDataRef.current = generateVolumeData(chartData);
        sma20DataRef.current = calculateSMA(chartData, 20);
        sma50DataRef.current = calculateSMA(chartData, 50);
        sma200DataRef.current = calculateSMA(chartData, 200);
        
        const ema12Data = calculateEMA(chartData, 12);
        const ema26Data = calculateEMA(chartData, 26);
        const bbData = calculateBollingerBands(chartData, 20, 2);
        const vwapData = calculateVWAP(chartData);
        
        // Check again before setting data
        if (!isActive || !chartRef.current) return;
        
        candleSeries.setData(chartData);
        volumeSeries.setData(volumeDataRef.current);
        sma20Series.setData(sma20DataRef.current);
        sma50Series.setData(sma50DataRef.current);
        sma200Series.setData(sma200DataRef.current);
        ema12Series.setData(ema12Data);
        ema26Series.setData(ema26Data);
        bbUpperSeries.setData(bbData.upper);
        bbMiddleSeries.setData(bbData.middle);
        bbLowerSeries.setData(bbData.lower);
        vwapSeries.setData(vwapData);
        
        if (chartData.length >= 2) {
          const lastCandle = chartData[chartData.length - 1];
          const prevCandle = chartData[chartData.length - 2];
          const change = lastCandle.close - prevCandle.close;
          const changePercent = (change / prevCandle.close) * 100;
          
          setLastPrice({ price: lastCandle.close, change, changePercent });
          
          const date = new Date((lastCandle.time as number) * 1000);
          setLastCloseDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · 04:00PM ET');
          
          setCurrentOHLC({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            open: lastCandle.open,
            high: lastCandle.high,
            low: lastCandle.low,
            close: lastCandle.close,
            volume: volumeDataRef.current[volumeDataRef.current.length - 1]?.value ?? 0,
          });
          
          setSmaValues({
            sma20: sma20DataRef.current[sma20DataRef.current.length - 1]?.value ?? null,
            sma50: sma50DataRef.current[sma50DataRef.current.length - 1]?.value ?? null,
            sma200: sma200DataRef.current[sma200DataRef.current.length - 1]?.value ?? null,
          });
        }
        
        if (isActive && chartRef.current) {
          chart.timeScale().fitContent();
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading chart data:', err);
        if (isActive) setIsLoading(false);
      }
    };
    
    const timeoutId = setTimeout(loadInitialData, 200);
    
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current && isActive) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    
    const resizeTimeout1 = setTimeout(handleResize, 100);
    const resizeTimeout2 = setTimeout(handleResize, 500);
    
    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      clearTimeout(resizeTimeout1);
      clearTimeout(resizeTimeout2);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Prevent wheel zoom on chart container
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;
    
    const preventWheelZoom = (e: WheelEvent) => {
      // Only prevent if we're on the chart area (not on axes)
      const rect = container.getBoundingClientRect();
      const rightAxisWidth = 60; // approximate
      const bottomAxisHeight = 30; // approximate
      
      if (e.clientX < rect.right - rightAxisWidth && e.clientY < rect.bottom - bottomAxisHeight) {
        e.preventDefault();
      }
    };
    
    container.addEventListener('wheel', preventWheelZoom, { passive: false });
    return () => container.removeEventListener('wheel', preventWheelZoom);
  }, []);

  // Load data when symbol changes
  const initialLoadDoneRef = useRef<boolean>(false);
  useEffect(() => {
    if (isChartReady && symbol) {
      if (initialLoadDoneRef.current) {
        loadChartData(symbol);
      } else {
        initialLoadDoneRef.current = true;
      }
    }
  }, [symbol, isChartReady, loadChartData]);

  // Update on timeframe change
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !isChartReady || dailyDataRef.current.length === 0) return;
    
    let data: CandlestickData[];
    switch (timeframe) {
      case 'W': data = convertToWeekly(dailyDataRef.current); break;
      case 'M': data = convertToMonthly(dailyDataRef.current); break;
      default: data = dailyDataRef.current;
    }
    
    const volumeData = generateVolumeData(data);
    candleSeriesRef.current.setData(data);
    volumeSeriesRef.current.setData(volumeData);
    
    sma20Ref.current?.setData(calculateSMA(data, 20));
    sma50Ref.current?.setData(calculateSMA(data, 50));
    sma200Ref.current?.setData(calculateSMA(data, 200));
    ema12Ref.current?.setData(calculateEMA(data, 12));
    ema26Ref.current?.setData(calculateEMA(data, 26));
    
    const bbData = calculateBollingerBands(data, 20, 2);
    bbUpperRef.current?.setData(bbData.upper);
    bbMiddleRef.current?.setData(bbData.middle);
    bbLowerRef.current?.setData(bbData.lower);
    
    vwapRef.current?.setData(calculateVWAP(data));
    
    chartRef.current?.timeScale().fitContent();
  }, [timeframe, isChartReady]);

  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSymbol(newSymbol);
    const found = STOCK_SYMBOLS.find(s => s.symbol === newSymbol);
    if (found) {
      setStockInfo({ symbol: found.symbol, name: found.name, sector: found.sector, industry: found.industry });
    } else {
      setStockInfo({ symbol: newSymbol, name: newSymbol });
    }
    setSearchQuery('');
    setShowSuggestions(false);
    try { localStorage.setItem("finotaur.activeSymbol", newSymbol); } catch {}
  }, []);

  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    if (value.length > 0) {
      const filtered = STOCK_SYMBOLS.filter(
        s => s.symbol.toLowerCase().includes(value.toLowerCase()) ||
             s.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleSymbolChange(searchQuery.toUpperCase().trim());
    }
  }, [searchQuery, handleSymbolChange]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      const target = e.target as HTMLElement;
      if (!target.closest('[data-indicator-menu]')) {
        setShowIndicatorMenu(false);
      }
      if (!target.closest('[data-drawing-menu]')) {
        setShowDrawingMenu(false);
      }
      // Close toolbar menus when clicking outside toolbar
      if (!target.closest('[data-toolbar]')) {
        setColorMenuOpen(false);
        setLineWidthMenuOpen(false);
        setLineStyleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update indicator visibility
  useEffect(() => {
    if (!sma20Ref.current || !sma50Ref.current || !sma200Ref.current || !volumeSeriesRef.current) return;
    
    sma20Ref.current.applyOptions({ visible: indicators.sma20 });
    sma50Ref.current.applyOptions({ visible: indicators.sma50 });
    sma200Ref.current.applyOptions({ visible: indicators.sma200 });
    ema12Ref.current?.applyOptions({ visible: indicators.ema12 });
    ema26Ref.current?.applyOptions({ visible: indicators.ema26 });
    bbUpperRef.current?.applyOptions({ visible: indicators.bollingerBands });
    bbMiddleRef.current?.applyOptions({ visible: indicators.bollingerBands });
    bbLowerRef.current?.applyOptions({ visible: indicators.bollingerBands });
    vwapRef.current?.applyOptions({ visible: indicators.vwap });
    volumeSeriesRef.current.applyOptions({ visible: indicators.volume });
  }, [indicators]);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const drawHandle = (x: number, y: number) => {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#2962ff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    };
    
    drawings.forEach((drawing, index) => {
      const isSelected = selectedDrawingIndex === index;
      ctx.strokeStyle = drawing.color || '#2962ff';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.setLineDash([]);
      
      if (drawing.type === 'horizontal' && chartRef.current && candleSeriesRef.current) {
        const y = candleSeriesRef.current.priceToCoordinate(drawing.price);
        if (y !== null) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
          
          ctx.fillStyle = drawing.color || '#2962ff';
          ctx.fillRect(canvas.width - 60, y - 10, 60, 20);
          ctx.fillStyle = '#fff';
          ctx.font = '10px sans-serif';
          ctx.fillText(drawing.price.toFixed(2), canvas.width - 55, y + 4);
          
          if (isSelected) drawHandle(canvas.width / 2, y);
        }
      } else if (drawing.type === 'vertical') {
        ctx.beginPath();
        ctx.moveTo(drawing.x, 0);
        ctx.lineTo(drawing.x, canvas.height);
        ctx.stroke();
        if (isSelected) drawHandle(drawing.x, canvas.height / 2);
      } else if (drawing.type === 'trendline') {
        ctx.beginPath();
        ctx.moveTo(drawing.startX, drawing.startY);
        ctx.lineTo(drawing.endX, drawing.endY);
        ctx.stroke();
        
        ctx.fillStyle = drawing.color || '#2962ff';
        ctx.beginPath();
        ctx.arc(drawing.startX, drawing.startY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(drawing.endX, drawing.endY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        if (isSelected) drawHandle((drawing.startX + drawing.endX) / 2, (drawing.startY + drawing.endY) / 2);
      } else if (drawing.type === 'rectangle') {
        if (drawing.hidden) return;
        
        const x1 = drawing.startX;
        const y1 = drawing.startY;
        const x2 = drawing.endX;
        const y2 = drawing.endY;
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        
        // Fill
        ctx.fillStyle = (drawing.color || '#2962ff') + '30';
        ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        
        // Border with custom line style
        ctx.strokeStyle = drawing.color || '#2962ff';
        ctx.lineWidth = drawing.lineWidth || (isSelected ? 2 : 1);
        
        if (isSelected) {
          ctx.setLineDash([5, 5]);
        } else if (drawing.lineStyle === 'dashed') {
          ctx.setLineDash([6, 4]);
        } else if (drawing.lineStyle === 'dotted') {
          ctx.setLineDash([2, 2]);
        } else {
          ctx.setLineDash([]);
        }
        
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.setLineDash([]);
        
        // Draw text if exists (always visible)
        if (drawing.text) {
          ctx.fillStyle = drawing.color || '#2962ff';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(drawing.text, midX, midY + 4);
          ctx.textAlign = 'left';
        }
        
        if (isSelected) {
          // 8 resize handles: 4 corners + 4 midpoints
          const handles = [
            { x: minX, y: minY, id: 'nw' },      // top-left
            { x: midX, y: minY, id: 'n' },       // top-center
            { x: maxX, y: minY, id: 'ne' },      // top-right
            { x: maxX, y: midY, id: 'e' },       // right-center
            { x: maxX, y: maxY, id: 'se' },      // bottom-right
            { x: midX, y: maxY, id: 's' },       // bottom-center
            { x: minX, y: maxY, id: 'sw' },      // bottom-left
            { x: minX, y: midY, id: 'w' },       // left-center
          ];
          
          handles.forEach(h => {
            // Square handle
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#2962ff';
            ctx.lineWidth = 1.5;
            ctx.fillRect(h.x - 5, h.y - 5, 10, 10);
            ctx.strokeRect(h.x - 5, h.y - 5, 10, 10);
          });
        }
      } else if (drawing.type === 'fib') {
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const startY = drawing.startY;
        const endY = drawing.endY;
        const height = endY - startY;
        
        levels.forEach((level, i) => {
          const y = startY + height * level;
          ctx.strokeStyle = i === 0 || i === levels.length - 1 ? '#2962ff' : '#787b86';
          ctx.setLineDash(i === 0 || i === levels.length - 1 ? [] : [4, 4]);
          ctx.beginPath();
          ctx.moveTo(drawing.startX, y);
          ctx.lineTo(drawing.endX, y);
          ctx.stroke();
          
          ctx.fillStyle = '#787b86';
          ctx.font = '10px sans-serif';
          ctx.fillText(`${(level * 100).toFixed(1)}%`, drawing.endX + 5, y + 4);
        });
        
        if (isSelected) {
          ctx.setLineDash([]);
          const centerX = (drawing.startX + drawing.endX) / 2;
          const centerY = (drawing.startY + drawing.endY) / 2;
          drawHandle(centerX, centerY);
        }
      } else if (drawing.type === 'longPosition' || drawing.type === 'shortPosition') {
        const isLong = drawing.type === 'longPosition';
        const entryY = candleSeriesRef.current?.priceToCoordinate(drawing.entryPrice);
        const targetY = candleSeriesRef.current?.priceToCoordinate(drawing.targetPrice);
        const stopY = candleSeriesRef.current?.priceToCoordinate(drawing.stopPrice);
        
        if (entryY !== null && targetY !== null && stopY !== null) {
          const boxWidth = drawing.width || 150;
          const x = drawing.x;
          
          const risk = Math.abs(drawing.entryPrice - drawing.stopPrice);
          const reward = Math.abs(drawing.targetPrice - drawing.entryPrice);
          const rr = (reward / risk).toFixed(2);
          const profitPercent = ((reward / drawing.entryPrice) * 100).toFixed(2);
          const lossPercent = ((risk / drawing.entryPrice) * 100).toFixed(2);
          const profitPoints = reward.toFixed(2);
          const lossPoints = risk.toFixed(2);
          
          // Profit zone
          const profitTop = Math.min(entryY, targetY);
          const profitHeight = Math.abs(targetY - entryY);
          ctx.fillStyle = 'rgba(38, 166, 154, 0.25)';
          ctx.fillRect(x, profitTop, boxWidth, profitHeight);
          ctx.strokeStyle = '#26a69a';
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.setLineDash([]);
          ctx.strokeRect(x, profitTop, boxWidth, profitHeight);
          
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, targetY);
          ctx.lineTo(x + boxWidth, targetY);
          ctx.stroke();
          
          ctx.fillStyle = '#26a69a';
          const tpLabelY = isLong ? targetY - 25 : targetY + 5;
          ctx.fillRect(x, tpLabelY, boxWidth, 22);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px Arial';
          ctx.fillText(`${profitPoints} pts (${profitPercent}%)`, x + 5, tpLabelY + 15);
          ctx.fillText(`${drawing.targetPrice.toFixed(2)}`, x + boxWidth - 55, tpLabelY + 15);
          
          // Loss zone
          const lossTop = Math.min(entryY, stopY);
          const lossHeight = Math.abs(stopY - entryY);
          ctx.fillStyle = 'rgba(239, 83, 80, 0.25)';
          ctx.fillRect(x, lossTop, boxWidth, lossHeight);
          ctx.strokeStyle = '#ef5350';
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.strokeRect(x, lossTop, boxWidth, lossHeight);
          
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, stopY);
          ctx.lineTo(x + boxWidth, stopY);
          ctx.stroke();
          
          ctx.fillStyle = '#ef5350';
          const slLabelY = isLong ? stopY + 5 : stopY - 25;
          ctx.fillRect(x, slLabelY, boxWidth, 22);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px Arial';
          ctx.fillText(`-${lossPoints} pts (-${lossPercent}%)`, x + 5, slLabelY + 15);
          ctx.fillText(`${drawing.stopPrice.toFixed(2)}`, x + boxWidth - 55, slLabelY + 15);
          
          // Entry line
          ctx.strokeStyle = '#2962ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, entryY);
          ctx.lineTo(x + boxWidth, entryY);
          ctx.stroke();
          
          ctx.fillStyle = '#2962ff';
          ctx.fillRect(x, entryY - 11, boxWidth, 22);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px Arial';
          const entryText = `Entry: ${drawing.entryPrice.toFixed(2)}`;
          const rrText = `R:R 1:${rr}`;
          ctx.fillText(entryText, x + 5, entryY + 4);
          ctx.fillText(rrText, x + boxWidth - 60, entryY + 4);
          
          if (isSelected) {
            ctx.setLineDash([]);
            drawHandle(x + boxWidth / 2, entryY);
          }
          
          ctx.lineWidth = 1;
        }
      }
    });
    
    // Draw preview
    if (drawingStart && activeTool && mousePos) {
      ctx.strokeStyle = '#2962ff';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      
      if (activeTool === 'trendline') {
        ctx.beginPath();
        ctx.moveTo(drawingStart.x, drawingStart.y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
      } else if (activeTool === 'rectangle') {
        ctx.strokeRect(drawingStart.x, drawingStart.y, mousePos.x - drawingStart.x, mousePos.y - drawingStart.y);
      } else if (activeTool === 'fib') {
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const height = mousePos.y - drawingStart.y;
        levels.forEach((level) => {
          const y = drawingStart.y + height * level;
          ctx.beginPath();
          ctx.moveTo(drawingStart.x, y);
          ctx.lineTo(mousePos.x, y);
          ctx.stroke();
        });
      } else if (activeTool === 'longPosition' || activeTool === 'shortPosition') {
        const isLong = activeTool === 'longPosition';
        const entryY = drawingStart.y;
        const entryPrice = drawingStart.price;
        let targetY = mousePos.y;
        
        if (isLong && targetY >= entryY) targetY = entryY - 10;
        if (!isLong && targetY <= entryY) targetY = entryY + 10;
        
        const diff = Math.abs(targetY - entryY);
        const stopY = isLong ? entryY + diff : entryY - diff;
        const boxWidth = Math.max(Math.abs(mousePos.x - drawingStart.x), 150);
        
        const targetPrice = candleSeriesRef.current?.coordinateToPrice(targetY) || 0;
        const stopPrice = candleSeriesRef.current?.coordinateToPrice(stopY) || 0;
        const risk = Math.abs(entryPrice - stopPrice);
        const reward = Math.abs(targetPrice - entryPrice);
        const rr = risk > 0 ? (reward / risk).toFixed(2) : '0';
        const profitPercent = entryPrice > 0 ? ((reward / entryPrice) * 100).toFixed(2) : '0';
        const lossPercent = entryPrice > 0 ? ((risk / entryPrice) * 100).toFixed(2) : '0';
        
        ctx.fillStyle = 'rgba(38, 166, 154, 0.2)';
        ctx.fillRect(drawingStart.x, Math.min(entryY, targetY), boxWidth, Math.abs(targetY - entryY));
        ctx.strokeStyle = '#26a69a';
        ctx.setLineDash([]);
        ctx.strokeRect(drawingStart.x, Math.min(entryY, targetY), boxWidth, Math.abs(targetY - entryY));
        
        ctx.fillStyle = 'rgba(239, 83, 80, 0.2)';
        ctx.fillRect(drawingStart.x, Math.min(entryY, stopY), boxWidth, diff);
        ctx.strokeStyle = '#ef5350';
        ctx.strokeRect(drawingStart.x, Math.min(entryY, stopY), boxWidth, diff);
        
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(drawingStart.x, entryY);
        ctx.lineTo(drawingStart.x + boxWidth, entryY);
        ctx.stroke();
        
        ctx.fillStyle = '#2962ff';
        ctx.fillRect(drawingStart.x, entryY - 11, boxWidth, 22);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.fillText(`Entry: ${entryPrice.toFixed(2)}`, drawingStart.x + 5, entryY + 4);
        ctx.fillText(`R:R 1:${rr}`, drawingStart.x + boxWidth - 60, entryY + 4);
        
        ctx.fillStyle = '#26a69a';
        const tpLabelY = isLong ? targetY - 25 : targetY + 5;
        ctx.fillRect(drawingStart.x, tpLabelY, boxWidth, 22);
        ctx.fillStyle = '#fff';
        ctx.fillText(`${reward.toFixed(2)} pts (${profitPercent}%)`, drawingStart.x + 5, tpLabelY + 15);
        
        ctx.fillStyle = '#ef5350';
        const slLabelY = isLong ? stopY + 5 : stopY - 25;
        ctx.fillRect(drawingStart.x, slLabelY, boxWidth, 22);
        ctx.fillStyle = '#fff';
        ctx.fillText(`-${risk.toFixed(2)} pts (-${lossPercent}%)`, drawingStart.x + 5, slLabelY + 15);
        
        ctx.lineWidth = 1;
      }
      
      ctx.fillStyle = '#2962ff';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(drawingStart.x, drawingStart.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
  }, [drawings, selectedDrawingIndex, canvasSize, drawingStart, activeTool, mousePos]);

  // Update canvas size
  useEffect(() => {
    const updateCanvasSize = () => {
      if (chartContainerRef.current && canvasRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      resizeObserver.disconnect();
    };
  }, []);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !chartRef.current || !candleSeriesRef.current) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const price = candleSeriesRef.current.coordinateToPrice(y);
    
    if (activeTool) {
      if (activeTool === 'horizontal') {
        if (price !== null) {
          setDrawings(prev => [...prev, { type: 'horizontal', price, color: '#2962ff' }]);
        }
        setActiveTool(null);
      } else if (activeTool === 'vertical') {
        setDrawings(prev => [...prev, { type: 'vertical', x, color: '#2962ff' }]);
        setActiveTool(null);
      } else if (['trendline', 'rectangle', 'fib', 'path'].includes(activeTool)) {
        if (!drawingStart) {
          setDrawingStart({ x, y, time: null, price: price || 0 });
        } else {
          setDrawings(prev => [...prev, { 
            type: activeTool, 
            startX: drawingStart.x, startY: drawingStart.y,
            endX: x, endY: y,
            startPrice: drawingStart.price, endPrice: price || 0,
            color: '#2962ff',
          }]);
          setDrawingStart(null);
          setActiveTool(null);
        }
      } else if (activeTool === 'longPosition' || activeTool === 'shortPosition') {
        if (!drawingStart) {
          setDrawingStart({ x, y, time: null, price: price || 0 });
        } else {
          const entryPrice = drawingStart.price;
          const targetPrice = price || 0;
          const isLong = activeTool === 'longPosition';
          
          if (isLong && targetPrice <= entryPrice) return;
          if (!isLong && targetPrice >= entryPrice) return;
          
          const diff = Math.abs(targetPrice - entryPrice);
          const stopPrice = isLong ? entryPrice - diff : entryPrice + diff;
          
          setDrawings(prev => [...prev, { 
            type: activeTool, 
            entryPrice, targetPrice, stopPrice,
            x: drawingStart.x,
            width: Math.max(Math.abs(x - drawingStart.x), 150),
          }]);
          setDrawingStart(null);
          setActiveTool(null);
        }
      }
      return;
    }
    
    // Check if clicking on existing drawing
    let clickedIndex = -1;
    
    drawings.forEach((drawing, index) => {
      if (drawing.type === 'trendline') {
        const dist = pointToLineDistance(x, y, drawing.startX, drawing.startY, drawing.endX, drawing.endY);
        if (dist < 10) clickedIndex = index;
      } else if (drawing.type === 'rectangle') {
        const minX = Math.min(drawing.startX, drawing.endX);
        const maxX = Math.max(drawing.startX, drawing.endX);
        const minY = Math.min(drawing.startY, drawing.endY);
        const maxY = Math.max(drawing.startY, drawing.endY);
        if (x >= minX - 5 && x <= maxX + 5 && y >= minY - 5 && y <= maxY + 5) {
          const onBorder = Math.abs(x - minX) < 10 || Math.abs(x - maxX) < 10 ||
                          Math.abs(y - minY) < 10 || Math.abs(y - maxY) < 10;
          if (onBorder) clickedIndex = index;
        }
      } else if (drawing.type === 'horizontal' && candleSeriesRef.current) {
        const lineY = candleSeriesRef.current.priceToCoordinate(drawing.price);
        if (lineY !== null && Math.abs(y - lineY) < 10) clickedIndex = index;
      } else if (drawing.type === 'vertical') {
        if (Math.abs(x - drawing.x) < 10) clickedIndex = index;
      } else if (drawing.type === 'fib') {
        if (x >= Math.min(drawing.startX, drawing.endX) - 5 && 
            x <= Math.max(drawing.startX, drawing.endX) + 5) {
          clickedIndex = index;
        }
      } else if (drawing.type === 'longPosition' || drawing.type === 'shortPosition') {
        const entryY = candleSeriesRef.current?.priceToCoordinate(drawing.entryPrice);
        const targetY = candleSeriesRef.current?.priceToCoordinate(drawing.targetPrice);
        const stopY = candleSeriesRef.current?.priceToCoordinate(drawing.stopPrice);
        
        if (entryY !== null && targetY !== null && stopY !== null) {
          const minY = Math.min(targetY, stopY);
          const maxY = Math.max(targetY, stopY);
          const boxWidth = drawing.width || 150;
          
          if (x >= drawing.x - 5 && x <= drawing.x + boxWidth + 5 &&
              y >= minY - 5 && y <= maxY + 5) {
            clickedIndex = index;
          }
        }
      }
    });
    
    setSelectedDrawingIndex(clickedIndex >= 0 ? clickedIndex : null);
  }, [drawings, activeTool, drawingStart]);

  // Delete drawing with Delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawingIndex !== null) {
        setDrawings(prev => prev.filter((_, i) => i !== selectedDrawingIndex));
        setSelectedDrawingIndex(null);
        setToolbarPos(null);
        setColorMenuOpen(false);
        setLineWidthMenuOpen(false);
        setLineStyleMenuOpen(false);
      }
      if (e.key === 'Escape') {
        setActiveTool(null);
        setDrawingStart(null);
        setSelectedDrawingIndex(null);
        setToolbarPos(null);
        setColorMenuOpen(false);
        setLineWidthMenuOpen(false);
        setLineStyleMenuOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawingIndex]);

  // Close toolbar menus when selection changes
  useEffect(() => {
    setColorMenuOpen(false);
    setLineWidthMenuOpen(false);
    setLineStyleMenuOpen(false);
  }, [selectedDrawingIndex]);

  // Update toolbar position when selected drawing changes
  useEffect(() => {
    if (selectedDrawingIndex === null) {
      setToolbarPos(null);
      return;
    }
    
    const drawing = drawings[selectedDrawingIndex];
    if (!drawing) {
      setToolbarPos(null);
      return;
    }
    
    // Calculate toolbar position based on drawing type
    if (drawing.type === 'rectangle' || drawing.type === 'fib') {
      const minX = Math.min(drawing.startX, drawing.endX);
      const maxX = Math.max(drawing.startX, drawing.endX);
      const minY = Math.min(drawing.startY, drawing.endY);
      setToolbarPos({ x: (minX + maxX) / 2, y: minY - 50 });
    } else if (drawing.type === 'trendline') {
      setToolbarPos({ x: (drawing.startX + drawing.endX) / 2, y: Math.min(drawing.startY, drawing.endY) - 50 });
    } else if (drawing.type === 'horizontal' && candleSeriesRef.current) {
      const y = candleSeriesRef.current.priceToCoordinate(drawing.price);
      if (y !== null) setToolbarPos({ x: canvasSize.width / 2, y: y - 50 });
    } else if (drawing.type === 'vertical') {
      setToolbarPos({ x: drawing.x, y: 50 });
    } else if (drawing.type === 'longPosition' || drawing.type === 'shortPosition') {
      const targetY = candleSeriesRef.current?.priceToCoordinate(drawing.targetPrice);
      if (targetY !== null) setToolbarPos({ x: drawing.x + (drawing.width || 150) / 2, y: targetY - 50 });
    }
  }, [selectedDrawingIndex, drawings, canvasSize]);

  const isPositive = lastPrice ? lastPrice.change >= 0 : true;

  return (
    <div className="flex gap-4 w-full p-4 min-h-screen">
      {/* CHART SECTION */}
      <div className="flex-1 flex flex-col bg-[#131722] rounded-lg overflow-hidden border border-[#2a2e39]">
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-[#2a2e39]">
          <div className="flex flex-col">
            <div className="relative" ref={searchInputRef}>
              <div className="flex items-baseline gap-2">
                <form onSubmit={handleSearchSubmit} className="flex items-center">
                  <input
                    type="text"
                    value={isSearchFocused ? searchQuery : ''}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onFocus={() => { setIsSearchFocused(true); if (searchQuery.length > 0) setShowSuggestions(true); }}
                    onBlur={() => { setTimeout(() => { setIsSearchFocused(false); setShowSuggestions(false); }, 200); }}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setSearchQuery(''); setShowSuggestions(false); setIsSearchFocused(false); (e.target as HTMLInputElement).blur(); } }}
                    placeholder={symbol}
                    className="bg-transparent text-2xl font-bold text-white w-20 outline-none placeholder-white focus:placeholder-[#787b86] border-b border-transparent focus:border-[#2962ff] transition-colors"
                  />
                </form>
                <span className="text-base text-white font-medium">{stockInfo.name}</span>
              </div>
              
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-xl z-50 overflow-hidden">
                  {suggestions.map((item) => (
                    <button key={item.symbol} onClick={() => handleSymbolChange(item.symbol)}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#2a2e39] transition-colors text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-xs w-12">{item.symbol}</span>
                        <span className="text-[#787b86] text-xs truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="text-[#787b86] text-[10px]">{item.sector}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#787b86]">
              <span>{stockInfo.sector || 'Technology'}</span>
              <span className="text-[#363a45]">·</span>
              <span>{stockInfo.industry || 'Consumer Electronics'}</span>
              <span className="text-[#363a45]">·</span>
              <span>USA</span>
              <span className="text-[#363a45]">·</span>
              <span>NASD</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] text-[#787b86] uppercase">{lastCloseDate || 'Loading...'}</span>
              <div className="flex items-baseline gap-2">
                {isLoading ? (
                  <span className="text-xl text-[#787b86]">Loading...</span>
                ) : (
                  <>
                    <span className="text-2xl font-semibold text-white tabular-nums">
                      {lastPrice?.price.toFixed(2) ?? '—'}
                    </span>
                    <div className="flex flex-col items-end text-xs">
                      <span className={`font-medium tabular-nums ${isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                        {isPositive ? '+' : ''}{lastPrice?.change.toFixed(2) ?? '—'}
                      </span>
                      <span className={`font-medium tabular-nums ${isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                        {isPositive ? '+' : ''}{lastPrice?.changePercent.toFixed(2) ?? '—'}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2e39] bg-[#1e222d]">
          <div className="flex items-center gap-2">
            {/* Indicators Button */}
            <div className="relative" data-indicator-menu>
              <button onClick={() => { setShowIndicatorMenu(!showIndicatorMenu); setShowDrawingMenu(false); }}
                className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${showIndicatorMenu ? 'bg-[#2962ff] text-white' : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <span>Indicators</span>
              </button>
              
              {showIndicatorMenu && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-[#2a2e39]">
                    <span className="text-[10px] text-[#787b86] uppercase font-medium">Moving Averages</span>
                  </div>
                  {[{ key: 'sma20', label: 'SMA 20' }, { key: 'sma50', label: 'SMA 50' }, { key: 'sma200', label: 'SMA 200' }, { key: 'ema12', label: 'EMA 12' }, { key: 'ema26', label: 'EMA 26' }].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2e39] cursor-pointer">
                      <input type="checkbox" checked={indicators[key as keyof typeof indicators]} onChange={(e) => setIndicators(prev => ({ ...prev, [key]: e.target.checked }))} className="w-3 h-3 rounded" />
                      <span className="text-xs text-white">{label}</span>
                    </label>
                  ))}
                  <div className="p-2 border-t border-[#2a2e39]">
                    <span className="text-[10px] text-[#787b86] uppercase font-medium">Overlays</span>
                  </div>
                  <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2e39] cursor-pointer">
                    <input type="checkbox" checked={indicators.bollingerBands} onChange={(e) => setIndicators(prev => ({ ...prev, bollingerBands: e.target.checked }))} className="w-3 h-3 rounded" />
                    <span className="text-xs text-white">Bollinger Bands</span>
                  </label>
                  <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2e39] cursor-pointer">
                    <input type="checkbox" checked={indicators.vwap} onChange={(e) => setIndicators(prev => ({ ...prev, vwap: e.target.checked }))} className="w-3 h-3 rounded" />
                    <span className="text-xs text-white">VWAP</span>
                  </label>
                  <div className="p-2 border-t border-[#2a2e39]">
                    <span className="text-[10px] text-[#787b86] uppercase font-medium">Volume</span>
                  </div>
                  <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2e39] cursor-pointer">
                    <input type="checkbox" checked={indicators.volume} onChange={(e) => setIndicators(prev => ({ ...prev, volume: e.target.checked }))} className="w-3 h-3 rounded" />
                    <span className="text-xs text-white">Volume</span>
                  </label>
                </div>
              )}
            </div>
            
            {/* Drawing Tools Button */}
            <div className="relative" data-drawing-menu>
              <button onClick={() => { setShowDrawingMenu(!showDrawingMenu); setShowIndicatorMenu(false); }}
                className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${showDrawingMenu || activeTool ? 'bg-[#2962ff] text-white' : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Draw</span>
              </button>
              
              {showDrawingMenu && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-[#2a2e39]">
                    <span className="text-[10px] text-[#787b86] uppercase font-medium">Lines</span>
                  </div>
                  {[{ tool: 'trendline', icon: 'M4 20l16-16', label: 'Trend Line' }, { tool: 'horizontal', icon: 'M4 12h16', label: 'Horizontal Line' }, { tool: 'vertical', icon: 'M12 4v16', label: 'Vertical Line' }].map(({ tool, icon, label }) => (
                    <button key={tool} onClick={() => { setActiveTool(activeTool === tool ? null : tool); setShowDrawingMenu(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2e39] text-left ${activeTool === tool ? 'bg-[#2a2e39]' : ''}`}>
                      <svg className="w-4 h-4 text-[#787b86]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
                      <span className="text-xs text-white">{label}</span>
                    </button>
                  ))}
                  <div className="p-2 border-t border-[#2a2e39]">
                    <span className="text-[10px] text-[#787b86] uppercase font-medium">Shapes</span>
                  </div>
                  <button onClick={() => { setActiveTool(activeTool === 'rectangle' ? null : 'rectangle'); setShowDrawingMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2e39] text-left ${activeTool === 'rectangle' ? 'bg-[#2a2e39]' : ''}`}>
                    <svg className="w-4 h-4 text-[#787b86]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} /></svg>
                    <span className="text-xs text-white">Rectangle</span>
                  </button>
                  <button onClick={() => { setActiveTool(activeTool === 'path' ? null : 'path'); setShowDrawingMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2e39] text-left ${activeTool === 'path' ? 'bg-[#2a2e39]' : ''}`}>
                    <svg className="w-4 h-4 text-[#787b86]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16c4-4 8 4 12-4 2-4 4-8 4-8" /></svg>
                    <span className="text-xs text-white">Path</span>
                  </button>
                  <div className="p-2 border-t border-[#2a2e39]">
                    <span className="text-[10px] text-[#787b86] uppercase font-medium">Positions</span>
                  </div>
                  <button onClick={() => { setActiveTool(activeTool === 'longPosition' ? null : 'longPosition'); setShowDrawingMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2e39] text-left ${activeTool === 'longPosition' ? 'bg-[#2a2e39]' : ''}`}>
                    <svg className="w-4 h-4 text-[#26a69a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    <span className="text-xs text-[#26a69a]">Long Position</span>
                  </button>
                  <button onClick={() => { setActiveTool(activeTool === 'shortPosition' ? null : 'shortPosition'); setShowDrawingMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2e39] text-left ${activeTool === 'shortPosition' ? 'bg-[#2a2e39]' : ''}`}>
                    <svg className="w-4 h-4 text-[#ef5350]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    <span className="text-xs text-[#ef5350]">Short Position</span>
                  </button>
                  <div className="p-2 border-t border-[#2a2e39]">
                    <span className="text-[10px] text-[#787b86] uppercase font-medium">Fibonacci</span>
                  </div>
                  <button onClick={() => { setActiveTool(activeTool === 'fib' ? null : 'fib'); setShowDrawingMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2e39] text-left ${activeTool === 'fib' ? 'bg-[#2a2e39]' : ''}`}>
                    <svg className="w-4 h-4 text-[#787b86]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    <span className="text-xs text-white">Fib Retracement</span>
                  </button>
                  {(activeTool || drawings.length > 0) && (
                    <>
                      <div className="p-2 border-t border-[#2a2e39]">
                        <span className="text-[10px] text-[#787b86] uppercase font-medium">Actions</span>
                      </div>
                      {activeTool && (
                        <button onClick={() => setActiveTool(null)} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2e39] text-left text-[#ef5350]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          <span className="text-xs">Cancel Drawing</span>
                        </button>
                      )}
                      {drawings.length > 0 && (
                        <button onClick={() => { setDrawings([]); setDrawingStart(null); setSelectedDrawingIndex(null); }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2e39] text-left text-[#ef5350]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          <span className="text-xs">Clear All</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="w-px h-5 bg-[#2a2e39]"></div>
            
            {activeTool && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[#2962ff]/20 rounded text-xs text-[#2962ff]">
                <span className="capitalize">{activeTool}</span>
                <button onClick={() => setActiveTool(null)} className="hover:text-white">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {(['D', 'W', 'M'] as Timeframe[]).map((tf) => (
              <button key={tf} onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${timeframe === tf ? 'bg-[#2962ff] text-white' : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'}`}>
                {tf === 'D' ? 'Daily' : tf === 'W' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>

        {/* OHLC Bar */}
        <div className="flex items-center justify-between px-4 py-1.5 text-xs bg-[#131722] border-b border-[#2a2e39]">
          <div className="flex items-center gap-4">
            {currentOHLC && (
              <>
                <span className="text-[#787b86] font-medium">{currentOHLC.date}</span>
                <div className="flex items-center gap-2 text-[#787b86]">
                  <span>O<span className="text-white ml-1 tabular-nums">{currentOHLC.open.toFixed(2)}</span></span>
                  <span>H<span className="text-white ml-1 tabular-nums">{currentOHLC.high.toFixed(2)}</span></span>
                  <span>L<span className="text-white ml-1 tabular-nums">{currentOHLC.low.toFixed(2)}</span></span>
                  <span>C<span className="text-white ml-1 tabular-nums">{currentOHLC.close.toFixed(2)}</span></span>
                  {indicators.volume && <span>Vol<span className="text-white ml-1 tabular-nums">{formatVolume(currentOHLC.volume)}</span></span>}
                </div>
              </>
            )}
          </div>
          <div className="text-[10px] text-[#787b86]">
            {[
              indicators.sma20 && `SMA20: ${smaValues.sma20?.toFixed(2) ?? '—'}`,
              indicators.sma50 && `SMA50: ${smaValues.sma50?.toFixed(2) ?? '—'}`,
              indicators.sma200 && `SMA200: ${smaValues.sma200?.toFixed(2) ?? '—'}`,
              indicators.ema12 && 'EMA12',
              indicators.ema26 && 'EMA26',
              indicators.bollingerBands && 'BB',
              indicators.vwap && 'VWAP',
            ].filter(Boolean).join(' · ')}
          </div>
        </div>

        {/* Chart */}
        <div ref={chartContainerRef} className="w-full relative" 
          style={{ 
            height: '500px',
            cursor: activeTool ? 'crosshair' : activeHandle || hoveredHandle ? getHandleCursor(activeHandle || hoveredHandle) : isDragging && selectedDrawingIndex !== null ? 'grabbing' : 'default'
          }}
          onMouseDown={(e) => {
            if (activeTool) return;
            const canvas = canvasRef.current;
            if (!canvas || !candleSeriesRef.current) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // First check if clicking on a resize handle of selected drawing
            if (selectedDrawingIndex !== null) {
              const drawing = drawings[selectedDrawingIndex];
              if (drawing?.type === 'rectangle' && !drawing.locked) {
                const x1 = drawing.startX;
                const y1 = drawing.startY;
                const x2 = drawing.endX;
                const y2 = drawing.endY;
                const minX = Math.min(x1, x2);
                const maxX = Math.max(x1, x2);
                const minY = Math.min(y1, y2);
                const maxY = Math.max(y1, y2);
                const midX = (minX + maxX) / 2;
                const midY = (minY + maxY) / 2;
                
                const handles = [
                  { x: minX, y: minY, id: 'nw' },
                  { x: midX, y: minY, id: 'n' },
                  { x: maxX, y: minY, id: 'ne' },
                  { x: maxX, y: midY, id: 'e' },
                  { x: maxX, y: maxY, id: 'se' },
                  { x: midX, y: maxY, id: 's' },
                  { x: minX, y: maxY, id: 'sw' },
                  { x: minX, y: midY, id: 'w' },
                ];
                
                for (const h of handles) {
                  if (Math.abs(x - h.x) < 8 && Math.abs(y - h.y) < 8) {
                    setActiveHandle(h.id);
                    setIsDragging(true);
                    dragStartRef.current = { x, y };
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                }
              }
            }
            
            let clickedIndex = -1;
            let detectedHandle: string | null = null;
            
            drawings.forEach((drawing, index) => {
              if (drawing.hidden) return;
              
              if (drawing.type === 'trendline') {
                const dist = pointToLineDistance(x, y, drawing.startX, drawing.startY, drawing.endX, drawing.endY);
                if (dist < 15) clickedIndex = index;
              } else if (drawing.type === 'rectangle') {
                const minX = Math.min(drawing.startX, drawing.endX);
                const maxX = Math.max(drawing.startX, drawing.endX);
                const minY = Math.min(drawing.startY, drawing.endY);
                const maxY = Math.max(drawing.startY, drawing.endY);
                if (x >= minX && x <= maxX && y >= minY && y <= maxY) clickedIndex = index;
              } else if (drawing.type === 'horizontal') {
                const lineY = candleSeriesRef.current?.priceToCoordinate(drawing.price);
                if (lineY !== null && Math.abs(y - lineY) < 15) clickedIndex = index;
              } else if (drawing.type === 'vertical') {
                if (Math.abs(x - drawing.x) < 15) clickedIndex = index;
              } else if (drawing.type === 'fib') {
                const minX = Math.min(drawing.startX, drawing.endX);
                const maxX = Math.max(drawing.startX, drawing.endX);
                const minY = Math.min(drawing.startY, drawing.endY);
                const maxY = Math.max(drawing.startY, drawing.endY);
                if (x >= minX - 10 && x <= maxX + 10 && y >= minY - 10 && y <= maxY + 10) clickedIndex = index;
              } else if (drawing.type === 'longPosition' || drawing.type === 'shortPosition') {
                const entryY = candleSeriesRef.current?.priceToCoordinate(drawing.entryPrice);
                const targetY = candleSeriesRef.current?.priceToCoordinate(drawing.targetPrice);
                const stopY = candleSeriesRef.current?.priceToCoordinate(drawing.stopPrice);
                if (entryY !== null && targetY !== null && stopY !== null) {
                  const minY = Math.min(targetY, stopY);
                  const maxY = Math.max(targetY, stopY);
                  if (x >= drawing.x && x <= drawing.x + (drawing.width || 150) && y >= minY - 30 && y <= maxY + 30) {
                    clickedIndex = index;
                  }
                }
              }
            });
            
            if (clickedIndex >= 0) {
              setSelectedDrawingIndex(clickedIndex);
              setActiveHandle(detectedHandle);
              if (!drawings[clickedIndex]?.locked) {
                setIsDragging(true);
                dragStartRef.current = { x, y };
              }
              e.preventDefault();
              e.stopPropagation();
            } else {
              setSelectedDrawingIndex(null);
              setToolbarPos(null);
            }
          }}
          onMouseMove={(e) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Check for handle hover when not dragging
            if (!isDragging && selectedDrawingIndex !== null) {
              const drawing = drawings[selectedDrawingIndex];
              if (drawing?.type === 'rectangle' && !drawing.locked) {
                const x1 = drawing.startX;
                const y1 = drawing.startY;
                const x2 = drawing.endX;
                const y2 = drawing.endY;
                const minX = Math.min(x1, x2);
                const maxX = Math.max(x1, x2);
                const minY = Math.min(y1, y2);
                const maxY = Math.max(y1, y2);
                const midX = (minX + maxX) / 2;
                const midY = (minY + maxY) / 2;
                
                const handles = [
                  { x: minX, y: minY, id: 'nw' },
                  { x: midX, y: minY, id: 'n' },
                  { x: maxX, y: minY, id: 'ne' },
                  { x: maxX, y: midY, id: 'e' },
                  { x: maxX, y: maxY, id: 'se' },
                  { x: midX, y: maxY, id: 's' },
                  { x: minX, y: maxY, id: 'sw' },
                  { x: minX, y: midY, id: 'w' },
                ];
                
                let foundHandle: string | null = null;
                for (const h of handles) {
                  if (Math.abs(x - h.x) < 8 && Math.abs(y - h.y) < 8) {
                    foundHandle = h.id;
                    break;
                  }
                }
                setHoveredHandle(foundHandle);
              } else {
                setHoveredHandle(null);
              }
            }
            
            // Handle dragging
            if (!isDragging || selectedDrawingIndex === null || !dragStartRef.current || !candleSeriesRef.current) return;
            
            const dx = x - dragStartRef.current.x;
            const dy = y - dragStartRef.current.y;
            
            dragStartRef.current = { x, y };
            
            setDrawings(prev => prev.map((d, i) => {
              if (i !== selectedDrawingIndex || d.locked) return d;
              
              // Handle resize for rectangles
              if (d.type === 'rectangle' && activeHandle) {
                let newStartX = d.startX;
                let newStartY = d.startY;
                let newEndX = d.endX;
                let newEndY = d.endY;
                
                switch (activeHandle) {
                  case 'nw': newStartX = x; newStartY = y; break;
                  case 'n': newStartY = y; break;
                  case 'ne': newEndX = x; newStartY = y; break;
                  case 'e': newEndX = x; break;
                  case 'se': newEndX = x; newEndY = y; break;
                  case 's': newEndY = y; break;
                  case 'sw': newStartX = x; newEndY = y; break;
                  case 'w': newStartX = x; break;
                }
                
                return { ...d, startX: newStartX, startY: newStartY, endX: newEndX, endY: newEndY };
              }
              
              // Regular drag (move entire drawing)
              if (d.type === 'trendline' || d.type === 'rectangle' || d.type === 'fib') {
                return { ...d, startX: d.startX + dx, startY: d.startY + dy, endX: d.endX + dx, endY: d.endY + dy };
              } else if (d.type === 'horizontal') {
                const currentY = candleSeriesRef.current?.priceToCoordinate(d.price);
                if (currentY === null) return d;
                const newPrice = candleSeriesRef.current?.coordinateToPrice(currentY + dy);
                return { ...d, price: newPrice || d.price };
              } else if (d.type === 'vertical') {
                return { ...d, x: d.x + dx };
              } else if (d.type === 'longPosition' || d.type === 'shortPosition') {
                const entryY = candleSeriesRef.current?.priceToCoordinate(d.entryPrice);
                const targetY = candleSeriesRef.current?.priceToCoordinate(d.targetPrice);
                const stopY = candleSeriesRef.current?.priceToCoordinate(d.stopPrice);
                if (entryY === null || targetY === null || stopY === null) return d;
                
                const newEntryPrice = candleSeriesRef.current?.coordinateToPrice(entryY + dy);
                const newTargetPrice = candleSeriesRef.current?.coordinateToPrice(targetY + dy);
                const newStopPrice = candleSeriesRef.current?.coordinateToPrice(stopY + dy);
                
                return { ...d, x: d.x + dx, entryPrice: newEntryPrice || d.entryPrice, targetPrice: newTargetPrice || d.targetPrice, stopPrice: newStopPrice || d.stopPrice };
              }
              return d;
            }));
          }}
          onMouseUp={() => { setIsDragging(false); setActiveHandle(null); dragStartRef.current = null; }}
          onMouseLeave={() => { setIsDragging(false); setActiveHandle(null); setHoveredHandle(null); dragStartRef.current = null; }}
        >
          <canvas ref={canvasRef} onClick={handleCanvasClick}
            onMouseMove={(e) => { if (!drawingStart || !activeTool) return; const canvas = canvasRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect(); setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top }); }}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 20 }} />
          
          {/* Invisible overlay for drawing interactions */}
          {activeTool && (
            <div 
              className="absolute inset-0"
              style={{ zIndex: 25, cursor: 'crosshair' }}
              onClick={handleCanvasClick}
              onMouseMove={(e) => {
                const canvas = canvasRef.current;
                if (!canvas || !drawingStart) return;
                const rect = canvas.getBoundingClientRect();
                setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
            />
          )}
          
          {/* Floating Toolbar for Selected Drawing */}
          {selectedDrawingIndex !== null && toolbarPos && (
            <div 
              data-toolbar
              className="absolute flex items-center gap-1 bg-white rounded-lg shadow-xl border border-gray-200 px-2 py-1.5"
              style={{ 
                left: Math.max(10, Math.min(toolbarPos.x, canvasSize.width - 350)), 
                top: Math.max(10, toolbarPos.y),
                pointerEvents: 'all',
                zIndex: 9999,
              }}
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            >
              {/* Color Picker */}
              <div className="relative">
                <button 
                  type="button"
                  className="p-1.5 hover:bg-gray-100 rounded flex items-center gap-1" 
                  title="Color"
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setColorMenuOpen(!colorMenuOpen);
                    setLineWidthMenuOpen(false);
                    setLineStyleMenuOpen(false);
                  }}>
                  <div className="w-5 h-5 rounded border-2 border-gray-300" style={{ backgroundColor: drawings[selectedDrawingIndex]?.color || '#2962ff' }}></div>
                </button>
                {colorMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 flex flex-wrap gap-1 bg-white border border-gray-200 rounded-lg p-2 shadow-lg w-36" style={{ zIndex: 10000 }}>
                    {['#2962ff', '#ef5350', '#26a69a', '#ff9800', '#9c27b0', '#00bcd4', '#e91e63', '#4caf50', '#ffeb3b', '#795548', '#ffffff', '#000000'].map(color => (
                      <button 
                        type="button"
                        key={color} 
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setDrawings(prev => prev.map((d, i) => i === selectedDrawingIndex ? { ...d, color } : d));
                          setColorMenuOpen(false);
                        }}
                        className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }} 
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Line Width */}
              <div className="relative">
                <button 
                  type="button"
                  className="p-1.5 hover:bg-gray-100 rounded flex items-center gap-1 text-xs text-gray-600" 
                  title="Line Width"
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setLineWidthMenuOpen(!lineWidthMenuOpen);
                    setColorMenuOpen(false);
                    setLineStyleMenuOpen(false);
                  }}>
                  <span className="font-medium">{drawings[selectedDrawingIndex]?.lineWidth || 1}px</span>
                </button>
                {lineWidthMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 flex flex-col bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden" style={{ zIndex: 10000 }}>
                    {[1, 2, 3, 4].map(width => (
                      <button 
                        type="button"
                        key={width} 
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setDrawings(prev => prev.map((d, i) => i === selectedDrawingIndex ? { ...d, lineWidth: width } : d));
                          setLineWidthMenuOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-600 flex items-center gap-2">
                        <div className="w-8 rounded" style={{ height: width, backgroundColor: '#333' }}></div>
                        {width}px
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Divider */}
              <div className="w-px h-6 bg-gray-200"></div>
              
              {/* Line Style */}
              <div className="relative">
                <button 
                  type="button"
                  className="p-1.5 hover:bg-gray-100 rounded" 
                  title="Line Style"
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setLineStyleMenuOpen(!lineStyleMenuOpen);
                    setColorMenuOpen(false);
                    setLineWidthMenuOpen(false);
                  }}>
                  <svg className="w-5 h-4 text-gray-600" viewBox="0 0 24 16">
                    <line x1="2" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth={2} 
                      strokeDasharray={drawings[selectedDrawingIndex]?.lineStyle === 'dashed' ? '6 4' : drawings[selectedDrawingIndex]?.lineStyle === 'dotted' ? '2 2' : '0'} />
                  </svg>
                </button>
                {lineStyleMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 flex flex-col bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden" style={{ zIndex: 10000 }}>
                    {[{ style: 'solid', dash: '', label: 'Solid' }, { style: 'dashed', dash: '6 4', label: 'Dashed' }, { style: 'dotted', dash: '2 2', label: 'Dotted' }].map(({ style, dash, label }) => (
                      <button 
                        type="button"
                        key={style} 
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setDrawings(prev => prev.map((d, i) => i === selectedDrawingIndex ? { ...d, lineStyle: style } : d));
                          setLineStyleMenuOpen(false);
                        }}
                        className="px-3 py-2 hover:bg-gray-100 flex items-center gap-2">
                        <svg className="w-10 h-4" viewBox="0 0 40 16">
                          <line x1="0" y1="8" x2="40" y2="8" stroke="#333" strokeWidth={2} strokeDasharray={dash} />
                        </svg>
                        <span className="text-xs text-gray-600">{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Add Text */}
              <button 
                type="button"
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setColorMenuOpen(false);
                  setLineWidthMenuOpen(false);
                  setLineStyleMenuOpen(false);
                  const text = prompt('Enter text:', drawings[selectedDrawingIndex]?.text || '');
                  if (text !== null) {
                    setDrawings(prev => prev.map((d, i) => i === selectedDrawingIndex ? { ...d, text } : d));
                  }
                }} 
                className="p-1.5 hover:bg-gray-100 rounded" title="Add Text">
                <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                </svg>
              </button>
              
              {/* Divider */}
              <div className="w-px h-6 bg-gray-200"></div>
              
              {/* Lock Toggle */}
              <button 
                type="button"
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setColorMenuOpen(false);
                  setLineWidthMenuOpen(false);
                  setLineStyleMenuOpen(false);
                  setDrawings(prev => prev.map((d, i) => i === selectedDrawingIndex ? { ...d, locked: !d.locked } : d));
                }}
                className={`p-1.5 hover:bg-gray-100 rounded ${drawings[selectedDrawingIndex]?.locked ? 'bg-blue-100' : ''}`} 
                title={drawings[selectedDrawingIndex]?.locked ? "Unlock" : "Lock"}>
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {drawings[selectedDrawingIndex]?.locked ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  )}
                </svg>
              </button>
              
              {/* Duplicate */}
              <button 
                type="button"
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setColorMenuOpen(false);
                  setLineWidthMenuOpen(false);
                  setLineStyleMenuOpen(false);
                  const drawing = drawings[selectedDrawingIndex];
                  if (drawing) {
                    const newDrawing = { ...drawing };
                    if (newDrawing.startX !== undefined) { newDrawing.startX += 20; newDrawing.endX += 20; }
                    if (newDrawing.startY !== undefined) { newDrawing.startY += 20; newDrawing.endY += 20; }
                    if (newDrawing.x !== undefined) newDrawing.x += 20;
                    setDrawings(prev => [...prev, newDrawing]);
                    setSelectedDrawingIndex(drawings.length);
                  }
                }} 
                className="p-1.5 hover:bg-gray-100 rounded" title="Duplicate">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              
              {/* Delete */}
              <button 
                type="button"
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onClick={(e) => { 
                  e.stopPropagation();
                  e.preventDefault();
                  setColorMenuOpen(false);
                  setLineWidthMenuOpen(false);
                  setLineStyleMenuOpen(false);
                  setDrawings(prev => prev.filter((_, i) => i !== selectedDrawingIndex)); 
                  setSelectedDrawingIndex(null); 
                  setToolbarPos(null); 
                }}
                className="p-1.5 hover:bg-red-100 rounded text-red-500" title="Delete">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
          
          {activeTool && (
            <div className="absolute top-2 left-2 z-30 bg-[#2962ff] text-white text-xs px-3 py-1.5 rounded font-medium">
              {drawingStart ? `Click to complete ${activeTool}` : `Click to start ${activeTool}`}
            </div>
          )}
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#131722]/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-[#2962ff] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[#787b86] text-sm">Loading {symbol}...</span>
              </div>
            </div>
          )}
        </div>

        {/* Data Table - Finviz Style */}
        <DataTable data={stockData} activeTab={activeDataTab} onTabChange={setActiveDataTab} />
      </div>

      {/* WATCHLIST SECTION */}
      <div className="w-[240px] min-w-[240px] flex flex-col bg-[#131722] rounded-lg border border-[#2a2e39] overflow-hidden self-start" style={{ maxHeight: '700px' }}>
        <div className="px-3 py-2 border-b border-[#2a2e39] bg-[#1e222d]">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wide">Watchlist</h3>
        </div>
        
        <div className="flex-1 overflow-auto">
          {watchlist.map((item) => {
            const isItemPositive = item.changePercent >= 0;
            const isActive = item.symbol === symbol;
            
            return (
              <button key={item.symbol} onClick={() => handleSymbolChange(item.symbol)}
                className={`w-full flex items-center justify-between px-3 py-2 border-b border-[#1e222d] hover:bg-[#1e222d] transition-colors ${isActive ? 'bg-[#1e222d] border-l-2 border-l-[#2962ff]' : ''}`}>
                <div className="flex flex-col items-start">
                  <span className={`text-xs font-semibold ${isActive ? 'text-[#2962ff]' : 'text-white'}`}>{item.symbol}</span>
                  <span className="text-[10px] text-[#787b86] truncate max-w-[80px]">{item.name}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-medium text-white tabular-nums">{item.price > 0 ? item.price.toFixed(2) : '—'}</span>
                  <span className={`text-[10px] font-medium tabular-nums ${isItemPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                    {item.price > 0 ? `${isItemPositive ? '+' : ''}${item.changePercent.toFixed(2)}%` : '—'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}