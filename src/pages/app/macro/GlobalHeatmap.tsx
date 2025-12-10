// src/pages/app/macro/GlobalHeatmap.tsx
import { useState, useMemo, useEffect } from 'react';
import { 
  Globe, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  ChevronRight,
  Activity,
  Clock,
  X,
  BarChart3,
  DollarSign,
  Percent,
  LineChart,
  Minus,
  Scale,
  ChevronDown,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useMacroData, { 
  MacroAsset, 
  useMarketSentiment,
  formatPrice,
  formatChange,
  getTimeSince 
} from '@/hooks/useMacroData';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type TimeRange = '1D' | '5D' | 'MTD' | 'YTD';
type ViewMode = 'grid' | 'list';
type SortBy = 'change' | 'name' | 'value' | 'volume';
type ComparisonMode = 'china-vs-rest' | 'developed-vs-em' | 'large-vs-small' | 'japan-vs-rest' | 'india-vs-china' | 'us-vs-europe' | 'us-vs-asia';

interface MarketIndex {
  name: string;
  fullName: string;
  country: string;
  countryCode: string;
  change: number;
  change5D: number;
  changeMTD: number;
  changeYTD: number;
  value: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  avgVolume: number;
  marketCap?: number;
  status: 'open' | 'closed' | 'pre-market' | 'after-hours';
  localTime: string;
  type: 'large' | 'mid' | 'small' | 'broad';
  category: 'developed' | 'emerging';
  region: 'us' | 'europe' | 'asia';
  sparkline: number[];
}

interface Sector {
  name: string;
  change: number;
  weight: number;
  topGainers: string[];
  topLosers: string[];
}

interface BreadthData {
  advances: number;
  declines: number;
  unchanged: number;
  newHighs: number;
  newLows: number;
  above50DMA: number;
  above200DMA: number;
  upVolume: number;
  downVolume: number;
}

interface VolatilityData {
  vix: number;
  vixChange: number;
  vvix?: number;
  vstoxx?: number;
  level: 'low' | 'normal' | 'elevated' | 'stress';
  percentile: number;
}

interface RatesData {
  twoYear: number;
  twoYearChange: number;
  tenYear: number;
  tenYearChange: number;
  spread: number;
}

interface FXPair {
  pair: string;
  value: number;
  change: number;
}

interface FuturesData {
  name: string;
  symbol: string;
  value: number;
  change: number;
  overnightChange: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════

const usIndices: MarketIndex[] = [
  { 
    name: 'S&P 500', fullName: 'S&P 500 Index', country: 'United States', countryCode: 'US',
    change: 1.24, change5D: 2.15, changeMTD: 3.42, changeYTD: 24.8,
    value: 6052, prevClose: 5978, open: 5985, high: 6065, low: 5970,
    volume: 2.8, avgVolume: 2.4, marketCap: 45.2,
    status: 'open', localTime: '14:32 EST', type: 'large', category: 'developed', region: 'us',
    sparkline: [5920, 5945, 5960, 5978, 5985, 6010, 6035, 6052]
  },
  { 
    name: 'Nasdaq 100', fullName: 'Nasdaq 100 Index', country: 'United States', countryCode: 'US',
    change: 1.85, change5D: 3.25, changeMTD: 4.80, changeYTD: 32.5,
    value: 21350, prevClose: 20962, open: 20985, high: 21420, low: 20950,
    volume: 4.2, avgVolume: 3.8, marketCap: 22.8,
    status: 'open', localTime: '14:32 EST', type: 'large', category: 'developed', region: 'us',
    sparkline: [20700, 20820, 20900, 20962, 21050, 21180, 21290, 21350]
  },
  { 
    name: 'Dow Jones', fullName: 'Dow Jones Industrial Average', country: 'United States', countryCode: 'US',
    change: 0.82, change5D: 1.45, changeMTD: 2.15, changeYTD: 18.2,
    value: 44650, prevClose: 44285, open: 44310, high: 44720, low: 44250,
    volume: 320, avgVolume: 285, marketCap: 14.5,
    status: 'open', localTime: '14:32 EST', type: 'large', category: 'developed', region: 'us',
    sparkline: [44100, 44180, 44220, 44285, 44380, 44480, 44580, 44650]
  },
  { 
    name: 'Russell 2000', fullName: 'Russell 2000 Small Cap', country: 'United States', countryCode: 'US',
    change: 2.15, change5D: 4.20, changeMTD: 5.85, changeYTD: 15.4,
    value: 2385, prevClose: 2335, open: 2342, high: 2395, low: 2330,
    volume: 1.8, avgVolume: 1.5, marketCap: 3.2,
    status: 'open', localTime: '14:32 EST', type: 'small', category: 'developed', region: 'us',
    sparkline: [2280, 2295, 2310, 2335, 2350, 2365, 2375, 2385]
  },
  { 
    name: 'S&P 400', fullName: 'S&P 400 MidCap Index', country: 'United States', countryCode: 'US',
    change: 1.45, change5D: 2.85, changeMTD: 3.95, changeYTD: 16.8,
    value: 3125, prevClose: 3080, open: 3088, high: 3138, low: 3075,
    volume: 680, avgVolume: 620, marketCap: 5.8,
    status: 'open', localTime: '14:32 EST', type: 'mid', category: 'developed', region: 'us',
    sparkline: [3020, 3045, 3060, 3080, 3095, 3108, 3118, 3125]
  },
  { 
    name: 'S&P 600', fullName: 'S&P 600 SmallCap Index', country: 'United States', countryCode: 'US',
    change: 1.92, change5D: 3.65, changeMTD: 4.80, changeYTD: 12.5,
    value: 1485, prevClose: 1457, open: 1462, high: 1492, low: 1455,
    volume: 420, avgVolume: 380, marketCap: 1.8,
    status: 'open', localTime: '14:32 EST', type: 'small', category: 'developed', region: 'us',
    sparkline: [1420, 1435, 1445, 1457, 1468, 1475, 1480, 1485]
  },
];

const europeIndices: MarketIndex[] = [
  { 
    name: 'STOXX 600', fullName: 'STOXX Europe 600', country: 'Europe', countryCode: 'EU',
    change: 0.78, change5D: 1.85, changeMTD: 2.45, changeYTD: 12.4,
    value: 520, prevClose: 516, open: 517, high: 522, low: 515,
    volume: 2.1, avgVolume: 1.9, status: 'closed', localTime: '17:30 CET', type: 'broad', category: 'developed', region: 'europe',
    sparkline: [510, 512, 514, 516, 517, 518, 519, 520]
  },
  { 
    name: 'Euro Stoxx 50', fullName: 'Euro STOXX 50', country: 'Eurozone', countryCode: 'EU',
    change: 0.92, change5D: 2.15, changeMTD: 2.85, changeYTD: 14.2,
    value: 5085, prevClose: 5038, open: 5045, high: 5095, low: 5032,
    volume: 1.8, avgVolume: 1.6, status: 'closed', localTime: '17:30 CET', type: 'large', category: 'developed', region: 'europe',
    sparkline: [4980, 5000, 5015, 5038, 5055, 5068, 5078, 5085]
  },
  { 
    name: 'DAX', fullName: 'DAX 40', country: 'Germany', countryCode: 'DE',
    change: 0.95, change5D: 2.35, changeMTD: 3.15, changeYTD: 18.5,
    value: 20250, prevClose: 20059, open: 20085, high: 20295, low: 20045,
    volume: 85, avgVolume: 78, status: 'closed', localTime: '17:30 CET', type: 'large', category: 'developed', region: 'europe',
    sparkline: [19850, 19920, 19980, 20059, 20120, 20175, 20215, 20250]
  },
  { 
    name: 'CAC 40', fullName: 'CAC 40 Index', country: 'France', countryCode: 'FR',
    change: 1.15, change5D: 2.45, changeMTD: 3.25, changeYTD: 8.2,
    value: 7580, prevClose: 7494, open: 7505, high: 7598, low: 7488,
    volume: 3.2, avgVolume: 2.9, status: 'closed', localTime: '17:30 CET', type: 'large', category: 'developed', region: 'europe',
    sparkline: [7420, 7445, 7468, 7494, 7520, 7548, 7565, 7580]
  },
  { 
    name: 'FTSE 100', fullName: 'FTSE 100 Index', country: 'United Kingdom', countryCode: 'UK',
    change: 0.42, change5D: 1.15, changeMTD: 1.85, changeYTD: 6.8,
    value: 8320, prevClose: 8285, open: 8290, high: 8335, low: 8275,
    volume: 680, avgVolume: 620, status: 'closed', localTime: '16:30 GMT', type: 'large', category: 'developed', region: 'europe',
    sparkline: [8240, 8255, 8268, 8285, 8295, 8305, 8312, 8320]
  },
  { 
    name: 'IBEX 35', fullName: 'IBEX 35 Index', country: 'Spain', countryCode: 'ES',
    change: 0.68, change5D: 1.42, changeMTD: 2.15, changeYTD: 14.5,
    value: 11850, prevClose: 11770, open: 11785, high: 11880, low: 11755,
    volume: 1.2, avgVolume: 1.1, status: 'closed', localTime: '17:30 CET', type: 'large', category: 'developed', region: 'europe',
    sparkline: [11680, 11710, 11738, 11770, 11795, 11815, 11835, 11850]
  },
  { 
    name: 'FTSE MIB', fullName: 'FTSE MIB Index', country: 'Italy', countryCode: 'IT',
    change: 0.85, change5D: 1.95, changeMTD: 2.65, changeYTD: 16.2,
    value: 34520, prevClose: 34228, open: 34280, high: 34580, low: 34195,
    volume: 2.4, avgVolume: 2.2, status: 'closed', localTime: '17:30 CET', type: 'large', category: 'developed', region: 'europe',
    sparkline: [33980, 34050, 34120, 34228, 34320, 34395, 34460, 34520]
  },
  { 
    name: 'SMI', fullName: 'Swiss Market Index', country: 'Switzerland', countryCode: 'CH',
    change: 0.32, change5D: 0.85, changeMTD: 1.45, changeYTD: 5.8,
    value: 11850, prevClose: 11812, open: 11820, high: 11868, low: 11805,
    volume: 42, avgVolume: 38, status: 'closed', localTime: '17:30 CET', type: 'large', category: 'developed', region: 'europe',
    sparkline: [11750, 11770, 11790, 11812, 11825, 11838, 11845, 11850]
  },
  { 
    name: 'AEX', fullName: 'AEX Amsterdam', country: 'Netherlands', countryCode: 'NL',
    change: 1.05, change5D: 2.25, changeMTD: 3.05, changeYTD: 15.2,
    value: 895, prevClose: 886, open: 888, high: 898, low: 884,
    volume: 95, avgVolume: 88, status: 'closed', localTime: '17:30 CET', type: 'large', category: 'developed', region: 'europe',
    sparkline: [875, 878, 882, 886, 889, 891, 893, 895]
  },
];

const asiaIndices: MarketIndex[] = [
  { 
    name: 'Nikkei 225', fullName: 'Nikkei 225 Index', country: 'Japan', countryCode: 'JP',
    change: -0.45, change5D: 0.85, changeMTD: 1.25, changeYTD: 16.5,
    value: 39250, prevClose: 39428, open: 39380, high: 39520, low: 39180,
    volume: 1.2, avgVolume: 1.1, status: 'closed', localTime: '15:00 JST', type: 'large', category: 'developed', region: 'asia',
    sparkline: [39600, 39550, 39480, 39428, 39350, 39300, 39270, 39250]
  },
  { 
    name: 'TOPIX', fullName: 'Tokyo Stock Price Index', country: 'Japan', countryCode: 'JP',
    change: -0.32, change5D: 0.95, changeMTD: 1.45, changeYTD: 14.2,
    value: 2745, prevClose: 2754, open: 2750, high: 2762, low: 2738,
    volume: 890, avgVolume: 820, status: 'closed', localTime: '15:00 JST', type: 'broad', category: 'developed', region: 'asia',
    sparkline: [2780, 2772, 2765, 2754, 2750, 2748, 2746, 2745]
  },
  { 
    name: 'Hang Seng', fullName: 'Hang Seng Index', country: 'Hong Kong', countryCode: 'HK',
    change: -1.82, change5D: -3.45, changeMTD: -5.25, changeYTD: -8.5,
    value: 19450, prevClose: 19812, open: 19750, high: 19820, low: 19380,
    volume: 1.8, avgVolume: 1.5, status: 'closed', localTime: '16:00 HKT', type: 'large', category: 'developed', region: 'asia',
    sparkline: [20100, 20020, 19920, 19812, 19680, 19580, 19510, 19450]
  },
  { 
    name: 'CSI 300', fullName: 'CSI 300 Index', country: 'China', countryCode: 'CN',
    change: -0.92, change5D: -2.15, changeMTD: -3.45, changeYTD: -5.2,
    value: 3850, prevClose: 3886, open: 3875, high: 3895, low: 3835,
    volume: 4.5, avgVolume: 4.2, status: 'closed', localTime: '15:00 CST', type: 'large', category: 'emerging', region: 'asia',
    sparkline: [3950, 3930, 3910, 3886, 3870, 3858, 3852, 3850]
  },
  { 
    name: 'Shanghai', fullName: 'Shanghai Composite', country: 'China', countryCode: 'CN',
    change: -0.65, change5D: -1.85, changeMTD: -2.95, changeYTD: -3.8,
    value: 3380, prevClose: 3402, open: 3395, high: 3412, low: 3365,
    volume: 3.8, avgVolume: 3.5, status: 'closed', localTime: '15:00 CST', type: 'broad', category: 'emerging', region: 'asia',
    sparkline: [3450, 3435, 3418, 3402, 3392, 3385, 3382, 3380]
  },
  { 
    name: 'KOSPI', fullName: 'Korea Composite', country: 'South Korea', countryCode: 'KR',
    change: 0.92, change5D: 2.15, changeMTD: 3.25, changeYTD: 8.5,
    value: 2485, prevClose: 2462, open: 2468, high: 2495, low: 2458,
    volume: 8.2, avgVolume: 7.5, status: 'closed', localTime: '15:30 KST', type: 'large', category: 'developed', region: 'asia',
    sparkline: [2420, 2435, 2448, 2462, 2470, 2478, 2482, 2485]
  },
  { 
    name: 'ASX 200', fullName: 'S&P/ASX 200', country: 'Australia', countryCode: 'AU',
    change: 0.58, change5D: 1.45, changeMTD: 2.15, changeYTD: 9.8,
    value: 8420, prevClose: 8371, open: 8380, high: 8438, low: 8365,
    volume: 4.2, avgVolume: 3.8, status: 'closed', localTime: '16:00 AEST', type: 'large', category: 'developed', region: 'asia',
    sparkline: [8320, 8340, 8355, 8371, 8388, 8400, 8412, 8420]
  },
  { 
    name: 'Nifty 50', fullName: 'NIFTY 50 Index', country: 'India', countryCode: 'IN',
    change: 1.25, change5D: 2.85, changeMTD: 4.15, changeYTD: 14.5,
    value: 24850, prevClose: 24542, open: 24580, high: 24920, low: 24520,
    volume: 2.8, avgVolume: 2.4, status: 'closed', localTime: '15:30 IST', type: 'large', category: 'emerging', region: 'asia',
    sparkline: [24280, 24350, 24420, 24542, 24650, 24720, 24790, 24850]
  },
  { 
    name: 'TAIEX', fullName: 'Taiwan Weighted', country: 'Taiwan', countryCode: 'TW',
    change: 0.72, change5D: 1.95, changeMTD: 2.85, changeYTD: 28.5,
    value: 22850, prevClose: 22686, open: 22720, high: 22920, low: 22680,
    volume: 3.5, avgVolume: 3.2, status: 'closed', localTime: '13:30 TST', type: 'large', category: 'emerging', region: 'asia',
    sparkline: [22450, 22520, 22585, 22686, 22750, 22790, 22820, 22850]
  },
  { 
    name: 'Sensex', fullName: 'BSE SENSEX 30', country: 'India', countryCode: 'IN',
    change: 1.18, change5D: 2.65, changeMTD: 3.95, changeYTD: 13.8,
    value: 81250, prevClose: 80305, open: 80420, high: 81380, low: 80280,
    volume: 1.5, avgVolume: 1.3, status: 'closed', localTime: '15:30 IST', type: 'large', category: 'emerging', region: 'asia',
    sparkline: [79800, 79950, 80120, 80305, 80580, 80820, 81050, 81250]
  },
];

const usSectors: Sector[] = [
  { name: 'Technology', change: 2.15, weight: 28.5, topGainers: ['NVDA', 'MSFT', 'AAPL'], topLosers: ['INTC', 'IBM'] },
  { name: 'Communication', change: 1.85, weight: 8.8, topGainers: ['META', 'GOOG', 'NFLX'], topLosers: ['VZ', 'T'] },
  { name: 'Consumer Disc.', change: 1.65, weight: 10.2, topGainers: ['AMZN', 'TSLA', 'HD'], topLosers: ['NKE', 'SBUX'] },
  { name: 'Financials', change: 1.42, weight: 13.1, topGainers: ['JPM', 'GS', 'MS'], topLosers: ['WFC', 'C'] },
  { name: 'Industrials', change: 0.95, weight: 8.5, topGainers: ['CAT', 'BA', 'UPS'], topLosers: ['MMM', 'GE'] },
  { name: 'Healthcare', change: 0.72, weight: 12.8, topGainers: ['UNH', 'JNJ', 'LLY'], topLosers: ['PFE', 'CVS'] },
  { name: 'Materials', change: 0.55, weight: 2.5, topGainers: ['LIN', 'APD', 'ECL'], topLosers: ['NEM', 'FCX'] },
  { name: 'Consumer Staples', change: 0.32, weight: 6.2, topGainers: ['COST', 'PG', 'KO'], topLosers: ['WMT', 'PEP'] },
  { name: 'Real Estate', change: -0.15, weight: 2.5, topGainers: ['PLD', 'AMT'], topLosers: ['SPG', 'O'] },
  { name: 'Utilities', change: -0.42, weight: 2.4, topGainers: ['NEE', 'DUK'], topLosers: ['SO', 'D'] },
  { name: 'Energy', change: -0.85, weight: 4.2, topGainers: ['XOM'], topLosers: ['CVX', 'COP', 'SLB'] },
];

const europeSectors: Sector[] = [
  { name: 'Financials', change: 1.45, weight: 18.5, topGainers: ['HSBA', 'BNP', 'SAN'], topLosers: ['UBS'] },
  { name: 'Industrials', change: 1.25, weight: 15.2, topGainers: ['SIE', 'ABB', 'AIR'], topLosers: ['VOW'] },
  { name: 'Luxury', change: 1.15, weight: 8.5, topGainers: ['MC', 'RMS', 'KER'], topLosers: [] },
  { name: 'Technology', change: 0.95, weight: 8.2, topGainers: ['ASML', 'SAP'], topLosers: ['STM'] },
  { name: 'Healthcare', change: 0.75, weight: 14.8, topGainers: ['ROG', 'NVS', 'AZN'], topLosers: ['BAYN'] },
  { name: 'Consumer', change: 0.55, weight: 12.5, topGainers: ['NESN', 'OR'], topLosers: ['DGE'] },
  { name: 'Energy', change: -0.25, weight: 6.8, topGainers: ['SHEL'], topLosers: ['BP', 'TTE'] },
  { name: 'Utilities', change: -0.45, weight: 4.2, topGainers: ['IBE'], topLosers: ['ENEL', 'EDF'] },
];

const usBreadth: BreadthData = { advances: 312, declines: 185, unchanged: 6, newHighs: 48, newLows: 12, above50DMA: 62, above200DMA: 58, upVolume: 2.4, downVolume: 0.8 };
const europeBreadth: BreadthData = { advances: 410, declines: 185, unchanged: 5, newHighs: 32, newLows: 8, above50DMA: 58, above200DMA: 54, upVolume: 1.6, downVolume: 0.5 };
const usVolatility: VolatilityData = { vix: 14.25, vixChange: -0.85, vvix: 82.5, level: 'low', percentile: 28 };
const europeVolatility: VolatilityData = { vstoxx: 15.80, vix: 15.80, vixChange: -0.42, level: 'low', percentile: 32 };
const usRates: RatesData = { twoYear: 4.28, twoYearChange: 0.02, tenYear: 4.42, tenYearChange: -0.03, spread: 0.14 };
const europeRates: RatesData = { twoYear: 2.15, twoYearChange: 0.01, tenYear: 2.28, tenYearChange: -0.02, spread: 0.13 };

const usFX: FXPair[] = [
  { pair: 'DXY', value: 104.25, change: 0.15 },
  { pair: 'EUR/USD', value: 1.0825, change: -0.12 },
  { pair: 'USD/JPY', value: 149.85, change: 0.28 },
  { pair: 'USD/CNY', value: 7.24, change: 0.08 },
];

const europeFX: FXPair[] = [
  { pair: 'EUR/USD', value: 1.0825, change: -0.12 },
  { pair: 'GBP/USD', value: 1.2685, change: 0.08 },
  { pair: 'EUR/CHF', value: 0.9385, change: -0.05 },
  { pair: 'EUR/GBP', value: 0.8535, change: -0.18 },
];

const asiaFX: FXPair[] = [
  { pair: 'USD/JPY', value: 149.85, change: 0.28 },
  { pair: 'USD/CNY', value: 7.24, change: 0.08 },
  { pair: 'AUD/USD', value: 0.6585, change: -0.15 },
  { pair: 'USD/INR', value: 83.42, change: 0.05 },
];

const usFutures: FuturesData[] = [
  { name: 'S&P 500', symbol: 'ES', value: 6055, change: 1.28, overnightChange: 0.35 },
  { name: 'Nasdaq', symbol: 'NQ', value: 21380, change: 1.92, overnightChange: 0.48 },
  { name: 'Russell', symbol: 'RTY', value: 2388, change: 2.18, overnightChange: 0.55 },
  { name: 'Dow', symbol: 'YM', value: 44680, change: 0.85, overnightChange: 0.22 },
];

const globalNarrative = [
  { type: 'bullish', text: 'US leads global risk-on with Tech outperforming (+2.15%)' },
  { type: 'neutral', text: 'Europe steady, led by Industrials and Financials' },
  { type: 'bearish', text: 'Asia dragged lower by China weakness and JPY pressure' },
  { type: 'neutral', text: 'Cross-asset volatility remains muted; yields stable' },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const getChangeByRange = (index: MarketIndex, range: TimeRange): number => {
  switch (range) {
    case '1D': return index.change;
    case '5D': return index.change5D;
    case 'MTD': return index.changeMTD;
    case 'YTD': return index.changeYTD;
  }
};

// Premium institutional colors - Bloomberg/Goldman style
const COLORS = {
  // Premium greens (muted, professional)
  greenStrong: '#2ECC71',
  greenMedium: '#27AE60',
  greenLight: '#1E824C',
  greenTint: 'rgba(46, 204, 113, 0.12)',
  greenTintHover: 'rgba(46, 204, 113, 0.18)',
  // Premium reds (muted, professional)
  redStrong: '#E74C3C',
  redMedium: '#C0392B',
  redLight: '#922B21',
  redTint: 'rgba(231, 76, 60, 0.12)',
  redTintHover: 'rgba(231, 76, 60, 0.18)',
  // Neutrals
  cardBg: '#141414',
  cardBorder: '#1F1F1F',
};

// Returns border color based on change intensity
const getBorderColor = (change: number): string => {
  if (change >= 2) return COLORS.greenStrong;
  if (change >= 1) return COLORS.greenMedium;
  if (change >= 0) return COLORS.greenLight;
  if (change >= -1) return COLORS.redLight;
  if (change >= -2) return COLORS.redMedium;
  return COLORS.redStrong;
};

// Returns tint background for cards
const getTintBg = (change: number): string => {
  return change >= 0 ? COLORS.greenTint : COLORS.redTint;
};

const getTintHoverBg = (change: number): string => {
  return change >= 0 ? COLORS.greenTintHover : COLORS.redTintHover;
};

// Premium text colors - less saturated
const getTextColor = (change: number): string => {
  return change >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]';
};

// For sparklines - muted colors
const getSparklineColor = (positive: boolean): string => {
  return positive ? '#27AE60' : '#C0392B';
};

const calculateGlobalScore = (): number => {
  const allIndices = [...usIndices, ...europeIndices, ...asiaIndices];
  const avgChange = allIndices.reduce((sum, i) => sum + i.change, 0) / allIndices.length;
  return Math.max(-3, Math.min(3, avgChange * 1.5));
};

const getRegimeLabel = (score: number): { label: string; color: string } => {
  if (score >= 2) return { label: 'Strong Risk-On', color: 'text-[#2ECC71]' };
  if (score >= 1) return { label: 'Moderate Risk-On', color: 'text-[#27AE60]' };
  if (score >= 0.3) return { label: 'Mild Risk-On', color: 'text-[#1E824C]' };
  if (score >= -0.3) return { label: 'Neutral', color: 'text-gray-400' };
  if (score >= -1) return { label: 'Mild Risk-Off', color: 'text-[#922B21]' };
  if (score >= -2) return { label: 'Moderate Risk-Off', color: 'text-[#C0392B]' };
  return { label: 'Strong Risk-Off', color: 'text-[#E74C3C]' };
};

const getVolatilityLevel = (level: string): { label: string; color: string } => {
  switch (level) {
    case 'low': return { label: 'Low', color: 'text-[#2ECC71]' };
    case 'normal': return { label: 'Normal', color: 'text-amber-400' };
    case 'elevated': return { label: 'Elevated', color: 'text-orange-400' };
    case 'stress': return { label: 'Stress', color: 'text-[#E74C3C]' };
    default: return { label: 'Normal', color: 'text-gray-400' };
  }
};

const calculateWeightedReturn = (indices: MarketIndex[], range: TimeRange): number => {
  const totalCap = indices.reduce((sum, i) => sum + (i.marketCap || 1), 0);
  return indices.reduce((sum, i) => sum + getChangeByRange(i, range) * ((i.marketCap || 1) / totalCap), 0);
};

const calculateEqualReturn = (indices: MarketIndex[], range: TimeRange): number => {
  return indices.reduce((sum, i) => sum + getChangeByRange(i, range), 0) / indices.length;
};

// Parse volume string like "2.8B" or "320M" to number
const parseVolumeString = (vol: string): number | null => {
  if (!vol || vol === '—') return null;
  const match = vol.match(/^([\d.]+)([BMK])?$/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();
  if (suffix === 'B') return num * 1e9;
  if (suffix === 'M') return num * 1e6;
  if (suffix === 'K') return num * 1e3;
  return num;
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const MiniSparkline = ({ data, positive }: { data: number[]; positive: boolean }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 60},${24 - ((v - min) / range) * 24}`).join(' ');
  return (
    <svg width={60} height={24} className="overflow-visible opacity-70">
      <polyline points={points} fill="none" stroke={getSparklineColor(positive)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const VIXGauge = ({ value, level, percentile }: { value: number; level: string; percentile: number }) => {
  const { color } = getVolatilityLevel(level);
  const angle = Math.min(180, (value / 50) * 180) - 90;
  const getGaugeColor = () => {
    if (value < 15) return '#10b981';
    if (value < 20) return '#f59e0b';
    if (value < 30) return '#f97316';
    return '#ef4444';
  };
  
  return (
    <div className="relative">
      <div className="relative w-28 h-14 overflow-hidden">
        <div className="absolute inset-0 border-t-[8px] border-l-[8px] border-r-[8px] rounded-t-full border-[#2A2A2A]" />
        <div 
          className="absolute inset-0 border-t-[8px] border-l-[8px] border-r-[8px] rounded-t-full border-transparent"
          style={{ borderTopColor: getGaugeColor(), clipPath: `polygon(0 100%, 50% 50%, ${50 + Math.cos((angle - 90) * Math.PI / 180) * 50}% ${50 + Math.sin((angle - 90) * Math.PI / 180) * 50}%, 0 0)` }}
        />
        <div className={`absolute bottom-0 left-1/2 w-0.5 h-12 origin-bottom ${color.replace('text-', 'bg-')}`} style={{ transform: `translateX(-50%) rotate(${angle}deg)` }} />
        <div className="absolute bottom-0 left-1/2 w-3 h-3 -translate-x-1/2 bg-white rounded-full shadow-lg" />
      </div>
      <div className="text-center mt-2">
        <span className="text-[10px] text-gray-500">Percentile: {percentile}% (1Y)</span>
      </div>
    </div>
  );
};

const SessionTimeline = () => {
  const sessions = [{ name: 'Asia', status: 'closed' }, { name: 'Europe', status: 'closed' }, { name: 'US', status: 'open' }];
  return (
    <div className="flex items-center gap-3">
      {sessions.map((session, idx) => (
        <div key={session.name} className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${session.status === 'open' ? 'bg-[#2ECC71] animate-pulse' : 'bg-gray-600'}`} />
          <span className={`text-xs font-medium ${session.status === 'open' ? 'text-white' : 'text-gray-500'}`}>{session.name}</span>
          {session.status === 'closed' && <span className="text-[10px] text-gray-600">Done</span>}
          {idx < sessions.length - 1 && <ChevronRight className="w-3 h-3 text-gray-600" />}
        </div>
      ))}
    </div>
  );
};

const IndexCard = ({ index, range, onClick }: { index: MarketIndex; range: TimeRange; onClick: () => void }) => {
  const change = getChangeByRange(index, range);
  const isPositive = change >= 0;
  const volumeRatio = ((index.volume / index.avgVolume) * 100).toFixed(0);
  const borderColor = getBorderColor(change);
  
  return (
    <div 
      onClick={onClick} 
      className={`rounded-lg p-3 cursor-pointer transition-all duration-200 ${index.status === 'closed' ? 'opacity-80' : ''}`}
      style={{
        background: getTintBg(change),
        borderLeft: `3px solid ${borderColor}`,
        boxShadow: '0px 1px 3px rgba(0,0,0,0.35)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = getTintHoverBg(change);
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = getTintBg(change);
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {/* Header - neutral colors */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 font-medium">{index.countryCode}</span>
          <span className="text-white font-semibold text-sm truncate">{index.name}</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          index.status === 'open' 
            ? 'bg-[#2ECC71]/20 text-[#2ECC71]' 
            : 'bg-gray-700/30 text-gray-500'
        }`}>
          {index.status === 'open' ? 'Live' : 'Closed'}
        </span>
      </div>

      {/* Main Change - ONLY this is colored */}
      <div className={`font-bold text-xl ${getTextColor(change)}`}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </div>

      {/* Value - neutral */}
      <div className="text-gray-400 text-xs mb-2">
        {index.value.toLocaleString()}
      </div>

      {/* Bottom Row - neutral with colored sparkline */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <MiniSparkline data={index.sparkline} positive={isPositive} />
        <div className="text-right">
          <div className="text-[10px] text-gray-600">Vol</div>
          <div className={`text-xs font-medium ${
            parseInt(volumeRatio) > 100 ? 'text-gray-300' : 'text-gray-500'
          }`}>
            {volumeRatio}%
          </div>
        </div>
      </div>
    </div>
  );
};

const SectorHeatmap = ({ sectors, title }: { sectors: Sector[]; title: string }) => {
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-400">{title}</h4>
      <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
        {sectors.map((sector) => {
          const borderColor = getBorderColor(sector.change);
          return (
            <div 
              key={sector.name} 
              className="rounded-lg p-2 cursor-pointer transition-all relative group"
              style={{
                background: getTintBg(sector.change),
                borderLeft: `3px solid ${borderColor}`,
                boxShadow: '0px 1px 3px rgba(0,0,0,0.25)',
                minHeight: `${40 + sector.weight * 1.5}px`
              }}
              onMouseEnter={() => setHoveredSector(sector.name)} 
              onMouseLeave={() => setHoveredSector(null)}
            >
              <div className="text-gray-300 text-xs font-medium truncate">{sector.name}</div>
              <div className={`text-sm font-bold ${getTextColor(sector.change)}`}>
                {sector.change >= 0 ? '+' : ''}{sector.change.toFixed(2)}%
              </div>
              
              {hoveredSector === sector.name && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1A1A1A] border border-[#3A3A3A] rounded-lg p-3 min-w-[180px] shadow-xl">
                  <div className="text-white font-medium mb-2">{sector.name}</div>
                  <div className="text-xs text-gray-400 mb-1">Weight: {sector.weight}%</div>
                  <div className="text-xs mb-2">
                    <span className="text-[#2ECC71]">Top: </span>
                    <span className="text-gray-300">{sector.topGainers.join(', ')}</span>
                  </div>
                  {sector.topLosers.length > 0 && (
                    <div className="text-xs">
                      <span className="text-[#E74C3C]">Bottom: </span>
                      <span className="text-gray-300">{sector.topLosers.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BreadthPanel = ({ data, title }: { data: BreadthData; title: string }) => {
  const total = data.advances + data.declines + data.unchanged;
  const advancePercent = (data.advances / total) * 100;
  return (
    <div className="bg-[#141414] rounded-lg p-4 space-y-3" style={{ boxShadow: '0px 1px 3px rgba(0,0,0,0.35)' }}>
      <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2"><BarChart3 className="w-4 h-4" />{title}</h4>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[#2ECC71]">{data.advances} Advances</span>
          <span className="text-[#E74C3C]">{data.declines} Declines</span>
        </div>
        <div className="h-2 bg-[#C0392B]/40 rounded-full overflow-hidden">
          <div className="h-full bg-[#2ECC71] rounded-l-full" style={{ width: `${advancePercent}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div><span className="text-gray-500">New Highs</span><div className="text-[#2ECC71] font-medium">{data.newHighs}</div></div>
        <div><span className="text-gray-500">New Lows</span><div className="text-[#E74C3C] font-medium">{data.newLows}</div></div>
        <div><span className="text-gray-500">Above 50 DMA</span><div className="text-gray-300 font-medium">{data.above50DMA}%</div></div>
        <div><span className="text-gray-500">Above 200 DMA</span><div className="text-gray-300 font-medium">{data.above200DMA}%</div></div>
      </div>
      <div className="pt-2 border-t border-[#2A2A2A]">
        <div className="flex justify-between text-xs"><span className="text-gray-500">Up Volume</span><span className="text-[#2ECC71] font-medium">{data.upVolume}B</span></div>
        <div className="flex justify-between text-xs mt-1"><span className="text-gray-500">Down Volume</span><span className="text-[#E74C3C] font-medium">{data.downVolume}B</span></div>
      </div>
    </div>
  );
};

const VolRatesPanel = ({ vol, rates, region }: { vol: VolatilityData; rates: RatesData; region: 'us' | 'europe' }) => {
  const volLabel = region === 'us' ? 'VIX' : 'VSTOXX';
  const volValue = region === 'us' ? vol.vix : vol.vstoxx || vol.vix;
  const { label: levelLabel, color: levelColor } = getVolatilityLevel(vol.level);
  return (
    <div className="bg-[#141414] rounded-lg p-4 space-y-4" style={{ boxShadow: '0px 1px 3px rgba(0,0,0,0.35)' }}>
      <div>
        <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-3"><Activity className="w-4 h-4" />Volatility</h4>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-gray-100">{volValue.toFixed(2)}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm ${getTextColor(-vol.vixChange)}`}>{vol.vixChange >= 0 ? '+' : ''}{vol.vixChange.toFixed(2)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${levelColor} bg-current/10 border border-current/20`}>{levelLabel}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">{volLabel}</div>
          </div>
          <VIXGauge value={volValue} level={vol.level} percentile={vol.percentile} />
        </div>
        {region === 'us' && vol.vvix && <div className="mt-3 pt-3 border-t border-[#2A2A2A] text-xs flex justify-between"><span className="text-gray-500">VVIX (Vol of Vol)</span><span className="text-gray-300 font-medium">{vol.vvix.toFixed(1)}</span></div>}
      </div>
      <div className="pt-4 border-t border-[#2A2A2A]">
        <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-3"><Percent className="w-4 h-4" />{region === 'us' ? 'Treasury Yields' : 'Bund Yields'}</h4>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-[#0D0D0D] rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">2Y</div><div className="text-gray-200 font-medium">{rates.twoYear.toFixed(2)}%</div><div className={`text-[10px] ${getTextColor(rates.twoYearChange)}`}>{rates.twoYearChange >= 0 ? '+' : ''}{(rates.twoYearChange * 100).toFixed(0)}bp</div></div>
          <div className="bg-[#0D0D0D] rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">10Y</div><div className="text-gray-200 font-medium">{rates.tenYear.toFixed(2)}%</div><div className={`text-[10px] ${getTextColor(rates.tenYearChange)}`}>{rates.tenYearChange >= 0 ? '+' : ''}{(rates.tenYearChange * 100).toFixed(0)}bp</div></div>
          <div className="bg-[#0D0D0D] rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">2s10s</div><div className={`font-medium ${rates.spread >= 0 ? 'text-gray-200' : 'text-[#E74C3C]'}`}>{rates.spread >= 0 ? '+' : ''}{(rates.spread * 100).toFixed(0)}bp</div></div>
        </div>
      </div>
    </div>
  );
};

const FXPanel = ({ pairs, title }: { pairs: FXPair[]; title: string }) => (
  <div className="bg-[#141414] rounded-lg p-4" style={{ boxShadow: '0px 1px 3px rgba(0,0,0,0.35)' }}>
    <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-3"><DollarSign className="w-4 h-4" />{title}</h4>
    <div className="grid grid-cols-2 gap-3">
      {pairs.map((pair) => (
        <div key={pair.pair} className="flex justify-between items-center bg-[#0D0D0D] rounded-lg p-2">
          <span className="text-xs text-gray-400">{pair.pair}</span>
          <div className="text-right">
            <div className="text-gray-200 text-sm font-medium">{pair.value.toFixed(4)}</div>
            <div className={`text-[10px] ${getTextColor(pair.change)}`}>{pair.change >= 0 ? '+' : ''}{pair.change.toFixed(2)}%</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const FuturesPanel = ({ futures }: { futures: FuturesData[] }) => (
  <div className="bg-[#141414] rounded-lg p-4" style={{ boxShadow: '0px 1px 3px rgba(0,0,0,0.35)' }}>
    <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-3"><LineChart className="w-4 h-4" />Futures</h4>
    <div className="space-y-2">
      {futures.map((f) => (
        <div key={f.symbol} className="flex items-center justify-between bg-[#0D0D0D] rounded-lg p-2">
          <div><span className="text-gray-200 text-sm font-medium">{f.symbol}</span><span className="text-gray-500 text-xs ml-2">{f.name}</span></div>
          <div className="text-right">
            <div className="text-gray-300 text-sm">{f.value.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className={getTextColor(f.change)}>{f.change >= 0 ? '+' : ''}{f.change.toFixed(2)}%</span>
              <span className="text-gray-500">ON: {f.overnightChange >= 0 ? '+' : ''}{f.overnightChange.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Narrative Panel - No emojis
const NarrativePanel = ({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) => (
  <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl overflow-hidden">
    <button onClick={onToggle} className="w-full p-4 flex items-center justify-between hover:bg-amber-500/5 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg"><Sparkles className="w-5 h-5 text-amber-400" /></div>
        <div className="text-left"><h3 className="text-white font-semibold">Global Narrative Summary</h3><p className="text-gray-400 text-sm">AI-powered market analysis</p></div>
      </div>
      <ChevronDown className={`w-5 h-5 text-amber-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && (
      <div className="px-4 pb-4 space-y-3">
        {globalNarrative.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 bg-[#0D0D0D]/50 rounded-lg">
            <div className={`mt-0.5 ${item.type === 'bullish' ? 'text-[#2ECC71]' : item.type === 'bearish' ? 'text-[#E74C3C]' : 'text-gray-400'}`}>
              {item.type === 'bullish' ? <ArrowUp className="w-4 h-4" /> : item.type === 'bearish' ? <ArrowDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </div>
            <p className="text-gray-300 text-sm">{item.text}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);

const WeightingPanel = ({ indices, range }: { indices: MarketIndex[]; range: TimeRange }) => {
  const capWeighted = calculateWeightedReturn(indices, range);
  const equalWeighted = calculateEqualReturn(indices, range);
  const spread = capWeighted - equalWeighted;
  return (
    <div className="bg-[#141414] rounded-lg p-4" style={{ boxShadow: '0px 1px 3px rgba(0,0,0,0.35)' }}>
      <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-3"><Scale className="w-4 h-4" />Market Weighting</h4>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-[#0D0D0D] rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Cap-Weighted</div><div className={`text-lg font-bold ${getTextColor(capWeighted)}`}>{capWeighted >= 0 ? '+' : ''}{capWeighted.toFixed(2)}%</div></div>
        <div className="bg-[#0D0D0D] rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Equal-Weight</div><div className={`text-lg font-bold ${getTextColor(equalWeighted)}`}>{equalWeighted >= 0 ? '+' : ''}{equalWeighted.toFixed(2)}%</div></div>
        <div className="bg-[#0D0D0D] rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Spread</div><div className={`text-lg font-bold ${getTextColor(spread)}`}>{spread >= 0 ? '+' : ''}{spread.toFixed(2)}%</div></div>
      </div>
      <p className="text-xs text-gray-500 mt-3 text-center">{spread > 0.3 ? 'Mega caps leading the rally' : spread < -0.3 ? 'Broad participation, small caps outperforming' : 'Balanced participation across market caps'}</p>
    </div>
  );
};

// Custom Comparison Panel - PROPER TABLE with user selection
const ComparisonPanel = ({ range }: { range: TimeRange }) => {
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('china-vs-rest');
  const allIndices = [...usIndices, ...europeIndices, ...asiaIndices];

  const comparisonModes: { id: ComparisonMode; label: string }[] = [
    { id: 'china-vs-rest', label: 'China vs Rest of Asia' },
    { id: 'japan-vs-rest', label: 'Japan vs Rest of Asia' },
    { id: 'india-vs-china', label: 'India vs China' },
    { id: 'developed-vs-em', label: 'Developed vs Emerging' },
    { id: 'large-vs-small', label: 'Large Cap vs Small/Mid Cap' },
    { id: 'us-vs-europe', label: 'US vs Europe' },
    { id: 'us-vs-asia', label: 'US vs Asia' },
  ];

  const getComparisonData = () => {
    switch (comparisonMode) {
      case 'china-vs-rest':
        const asiaOnly = allIndices.filter(i => i.region === 'asia');
        return {
          left: asiaOnly.filter(i => ['CN', 'HK'].includes(i.countryCode)),
          right: asiaOnly.filter(i => !['CN', 'HK'].includes(i.countryCode)),
          leftLabel: 'Greater China (CN, HK)',
          rightLabel: 'Rest of Asia'
        };
      case 'japan-vs-rest':
        const asiaOnly2 = allIndices.filter(i => i.region === 'asia');
        return {
          left: asiaOnly2.filter(i => i.countryCode === 'JP'),
          right: asiaOnly2.filter(i => i.countryCode !== 'JP'),
          leftLabel: 'Japan',
          rightLabel: 'Rest of Asia'
        };
      case 'india-vs-china':
        return {
          left: allIndices.filter(i => i.countryCode === 'IN'),
          right: allIndices.filter(i => ['CN', 'HK'].includes(i.countryCode)),
          leftLabel: 'India',
          rightLabel: 'Greater China'
        };
      case 'developed-vs-em':
        return {
          left: allIndices.filter(i => i.category === 'developed'),
          right: allIndices.filter(i => i.category === 'emerging'),
          leftLabel: 'Developed Markets',
          rightLabel: 'Emerging Markets'
        };
      case 'large-vs-small':
        return {
          left: allIndices.filter(i => i.type === 'large'),
          right: allIndices.filter(i => ['small', 'mid'].includes(i.type)),
          leftLabel: 'Large Cap',
          rightLabel: 'Mid & Small Cap'
        };
      case 'us-vs-europe':
        return {
          left: usIndices,
          right: europeIndices,
          leftLabel: 'United States',
          rightLabel: 'Europe'
        };
      case 'us-vs-asia':
        return {
          left: usIndices,
          right: asiaIndices,
          leftLabel: 'United States',
          rightLabel: 'Asia Pacific'
        };
      default:
        return { left: [], right: [], leftLabel: '', rightLabel: '' };
    }
  };

  const { left, right, leftLabel, rightLabel } = getComparisonData();
  const leftAvg = left.length > 0 ? left.reduce((s, i) => s + getChangeByRange(i, range), 0) / left.length : 0;
  const rightAvg = right.length > 0 ? right.reduce((s, i) => s + getChangeByRange(i, range), 0) / right.length : 0;
  const spreadVal = leftAvg - rightAvg;

  return (
    <Card className="bg-[#141414] border-[#1F1F1F]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-white text-base">Market Comparison</CardTitle>
          <select 
            value={comparisonMode} 
            onChange={(e) => setComparisonMode(e.target.value as ComparisonMode)}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
          >
            {comparisonModes.map((mode) => (
              <option key={mode.id} value={mode.id}>{mode.label}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#1A1A1A] rounded-lg p-4 text-center">
            <div className="text-sm text-gray-400 mb-2">{leftLabel}</div>
            <div className={`text-2xl font-bold ${getTextColor(leftAvg)}`}>
              {leftAvg >= 0 ? '+' : ''}{leftAvg.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">{left.length} indices</div>
          </div>
          
          <div className="flex items-center justify-center">
            <div className="text-center bg-[#0D0D0D] rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Spread</div>
              <div className={`text-xl font-bold ${getTextColor(spreadVal)}`}>
                {spreadVal >= 0 ? '+' : ''}{spreadVal.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {spreadVal > 0 ? `${leftLabel.split(' ')[0]} leads` : spreadVal < 0 ? `${rightLabel.split(' ')[0]} leads` : 'Even'}
              </div>
            </div>
          </div>
          
          <div className="bg-[#1A1A1A] rounded-lg p-4 text-center">
            <div className="text-sm text-gray-400 mb-2">{rightLabel}</div>
            <div className={`text-2xl font-bold ${getTextColor(rightAvg)}`}>
              {rightAvg >= 0 ? '+' : ''}{rightAvg.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">{right.length} indices</div>
          </div>
        </div>

        {/* Detailed Tables - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Table */}
          <div className="bg-[#1A1A1A] rounded-lg overflow-hidden">
            <div className="bg-[#252525] px-4 py-3 border-b border-[#2A2A2A]">
              <span className="text-sm font-medium text-white">{leftLabel}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Country</th>
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Index</th>
                    <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {left.map((idx, i) => (
                    <tr key={idx.name} className={`${i < left.length - 1 ? 'border-b border-[#2A2A2A]/50' : ''} hover:bg-[#252525]/50 transition-colors`}>
                      <td className="px-4 py-3 text-xs text-gray-500 font-medium">{idx.countryCode}</td>
                      <td className="px-4 py-3 text-sm text-white">{idx.name}</td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${getTextColor(getChangeByRange(idx, range))}`}>
                        {getChangeByRange(idx, range) >= 0 ? '+' : ''}{getChangeByRange(idx, range).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Table */}
          <div className="bg-[#1A1A1A] rounded-lg overflow-hidden">
            <div className="bg-[#252525] px-4 py-3 border-b border-[#2A2A2A]">
              <span className="text-sm font-medium text-white">{rightLabel}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Country</th>
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Index</th>
                    <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {right.map((idx, i) => (
                    <tr key={idx.name} className={`${i < right.length - 1 ? 'border-b border-[#2A2A2A]/50' : ''} hover:bg-[#252525]/50 transition-colors`}>
                      <td className="px-4 py-3 text-xs text-gray-500 font-medium">{idx.countryCode}</td>
                      <td className="px-4 py-3 text-sm text-white">{idx.name}</td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${getTextColor(getChangeByRange(idx, range))}`}>
                        {getChangeByRange(idx, range) >= 0 ? '+' : ''}{getChangeByRange(idx, range).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CrossRegionMatrix = ({ range }: { range: TimeRange }) => {
  const regions = [{ name: 'US', indices: usIndices }, { name: 'Europe', indices: europeIndices }, { name: 'Asia', indices: asiaIndices }];
  return (
    <div className="bg-[#141414] rounded-lg p-4" style={{ boxShadow: '0px 1px 3px rgba(0,0,0,0.35)' }}>
      <h4 className="text-sm font-medium text-gray-400 mb-4">Global Leadership Matrix</h4>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="text-left text-xs text-gray-500 font-medium pb-3 pr-4">Region</th>
              <th className={`text-center text-xs font-medium pb-3 px-4 ${range === '1D' ? 'text-amber-400' : 'text-gray-500'}`}>1D</th>
              <th className={`text-center text-xs font-medium pb-3 px-4 ${range === '5D' ? 'text-amber-400' : 'text-gray-500'}`}>5D</th>
              <th className={`text-center text-xs font-medium pb-3 px-4 ${range === 'MTD' ? 'text-amber-400' : 'text-gray-500'}`}>MTD</th>
              <th className={`text-center text-xs font-medium pb-3 px-4 ${range === 'YTD' ? 'text-amber-400' : 'text-gray-500'}`}>YTD</th>
            </tr>
          </thead>
          <tbody>
            {regions.map((region) => {
              const avgs = {
                '1D': region.indices.reduce((s, i) => s + i.change, 0) / region.indices.length,
                '5D': region.indices.reduce((s, i) => s + i.change5D, 0) / region.indices.length,
                'MTD': region.indices.reduce((s, i) => s + i.changeMTD, 0) / region.indices.length,
                'YTD': region.indices.reduce((s, i) => s + i.changeYTD, 0) / region.indices.length,
              };
              return (
                <tr key={region.name} className="border-b border-[#2A2A2A]/50 last:border-0">
                  <td className="py-3 pr-4 text-gray-200 text-sm font-medium">{region.name}</td>
                  {(['1D', '5D', 'MTD', 'YTD'] as TimeRange[]).map((r) => (
                    <td key={r} className={`py-3 px-4 text-center text-sm font-medium ${getTextColor(avgs[r])} ${r === range ? 'bg-amber-500/10 rounded' : ''}`}>
                      {avgs[r] >= 0 ? '+' : ''}{avgs[r].toFixed(2)}%
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const GlobalSectorComparison = () => {
  const sectors = ['Technology', 'Financials', 'Energy', 'Healthcare'];
  return (
    <div className="bg-[#141414] rounded-lg p-4" style={{ boxShadow: '0px 1px 3px rgba(0,0,0,0.35)' }}>
      <h4 className="text-sm font-medium text-gray-400 mb-4">Global Sector Performance</h4>
      <div className="space-y-4">
        {sectors.map((sector) => {
          const usSector = usSectors.find(s => s.name.includes(sector.slice(0, 4)));
          const euSector = europeSectors.find(s => s.name.includes(sector.slice(0, 4)));
          return (
            <div key={sector} className="bg-[#0D0D0D] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2 font-medium">{sector}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">US</span>
                    <span className={`font-medium ${getTextColor(usSector?.change || 0)}`}>{(usSector?.change || 0) >= 0 ? '+' : ''}{(usSector?.change || 0).toFixed(2)}%</span>
                  </div>
                  <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full`} style={{ 
                      width: `${Math.min(100, Math.abs(usSector?.change || 0) * 25)}%`,
                      backgroundColor: (usSector?.change || 0) >= 0 ? '#2ECC71' : '#E74C3C'
                    }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">EU</span>
                    <span className={`font-medium ${getTextColor(euSector?.change || 0)}`}>{(euSector?.change || 0) >= 0 ? '+' : ''}{(euSector?.change || 0).toFixed(2)}%</span>
                  </div>
                  <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full`} style={{ 
                      width: `${Math.min(100, Math.abs(euSector?.change || 0) * 25)}%`,
                      backgroundColor: (euSector?.change || 0) >= 0 ? '#2ECC71' : '#E74C3C'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Improved Region Header - Better hierarchy, colored accent
const RegionHeader = ({ region, indices, range, accentColor, sectorLeaders }: { 
  region: string; 
  indices: MarketIndex[]; 
  range: TimeRange; 
  accentColor: string;
  sectorLeaders: { up: string; down: string };
}) => {
  const avg = indices.reduce((s, i) => s + getChangeByRange(i, range), 0) / indices.length;
  const upCount = indices.filter(i => getChangeByRange(i, range) > 0).length;
  const status = avg > 0.5 ? 'Strong' : avg < -0.5 ? 'Weak' : 'Steady';
  
  return (
    <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#1F1F1F]">
      <div className="flex items-center gap-4">
        <div className={`w-1.5 h-14 rounded-full ${accentColor}`} />
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-100">{region}</h2>
            <span className={`text-xs px-2 py-1 rounded-full ${
              status === 'Strong' ? 'bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30' :
              status === 'Weak' ? 'bg-[#E74C3C]/15 text-[#E74C3C] border border-[#E74C3C]/30' :
              'bg-gray-500/15 text-gray-400 border border-gray-500/30'
            }`}>
              {status}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs">
            <span className="text-gray-500">
              <span className="text-[#2ECC71]">{sectorLeaders.up}</span> leading
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">
              <span className="text-[#E74C3C]">{sectorLeaders.down}</span> lagging
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-2xl font-bold ${getTextColor(avg)}`}>
          {avg >= 0 ? '+' : ''}{avg.toFixed(2)}%
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {upCount}/{indices.length} indices positive
        </div>
      </div>
    </div>
  );
};

const IndexDetailDrawer = ({ index, onClose }: { index: MarketIndex | null; onClose: () => void }) => {
  if (!index) return null;
  const isPositive = index.change >= 0;
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#0D0D0D] border-l border-[#2A2A2A] shadow-2xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-[#0D0D0D] border-b border-[#2A2A2A] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded-lg flex items-center justify-center"><span className="text-xs font-bold text-gray-400">{index.countryCode}</span></div>
            <div><h3 className="text-white font-bold">{index.name}</h3><p className="text-gray-500 text-sm">{index.fullName}</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
      </div>
      <div className="p-4 space-y-6">
        <div className="text-center py-4">
          <div className="text-4xl font-bold text-white mb-2">{index.value.toLocaleString()}</div>
          <div className={`text-2xl font-bold ${getTextColor(index.change)}`}>{isPositive ? '+' : ''}{index.change.toFixed(2)}%</div>
          <div className={`text-sm ${getTextColor(index.change)}`}>{isPositive ? '+' : ''}{(index.value - index.prevClose).toFixed(2)} pts</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1A1A1A] rounded-lg p-3"><div className="text-xs text-gray-500">Open</div><div className="text-white font-medium">{index.open.toLocaleString()}</div></div>
          <div className="bg-[#1A1A1A] rounded-lg p-3"><div className="text-xs text-gray-500">Prev Close</div><div className="text-white font-medium">{index.prevClose.toLocaleString()}</div></div>
          <div className="bg-[#1A1A1A] rounded-lg p-3"><div className="text-xs text-gray-500">High</div><div className="text-[#2ECC71] font-medium">{index.high.toLocaleString()}</div></div>
          <div className="bg-[#1A1A1A] rounded-lg p-3"><div className="text-xs text-gray-500">Low</div><div className="text-[#E74C3C] font-medium">{index.low.toLocaleString()}</div></div>
        </div>
        <div className="bg-[#1A1A1A] rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Performance</h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[{ label: '1D', value: index.change }, { label: '5D', value: index.change5D }, { label: 'MTD', value: index.changeMTD }, { label: 'YTD', value: index.changeYTD }].map((p) => (
              <div key={p.label} className="bg-[#141414] rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">{p.label}</div><div className={`text-sm font-medium ${getTextColor(p.value)}`}>{p.value >= 0 ? '+' : ''}{p.value.toFixed(2)}%</div></div>
            ))}
          </div>
        </div>
        <div className="bg-[#1A1A1A] rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Volume</h4>
          <div className="flex justify-between items-end">
            <div><div className="text-2xl font-bold text-white">{index.volume >= 1 ? `${index.volume.toFixed(1)}B` : `${(index.volume * 1000).toFixed(0)}M`}</div><div className="text-xs text-gray-500">Today</div></div>
            <div className="text-right"><div className={`text-lg font-medium ${index.volume > index.avgVolume ? 'text-[#2ECC71]' : 'text-gray-400'}`}>{((index.volume / index.avgVolume) * 100).toFixed(0)}%</div><div className="text-xs text-gray-500">vs 20D Avg</div></div>
          </div>
        </div>
        <div className="bg-[#1A1A1A] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500" /><span className="text-gray-400 text-sm">{index.localTime}</span></div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${index.status === 'open' ? 'bg-[#2ECC71]/15 text-[#2ECC71]' : 'bg-gray-600/20 text-gray-400'}`}>{index.status.charAt(0).toUpperCase() + index.status.slice(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function GlobalHeatmap() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('change');
  const [selectedIndex, setSelectedIndex] = useState<MarketIndex | null>(null);
  const [narrativeOpen, setNarrativeOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real data from API
  const { 
    data: macroData, 
    isLoading, 
    error: macroError, 
    lastUpdated,
    isStale,
    refetch 
  } = useMacroData({ autoRefresh: true, refreshInterval: 60000 });

  const { sentiment, score: sentimentScore } = useMarketSentiment();

  // Merge real API data with mock data for US indices
  const mergedUsIndices = useMemo(() => {
    if (!macroData?.assets) return usIndices;

    return usIndices.map(index => {
      // Map index names to API symbols
      const symbolMap: Record<string, string> = {
        'S&P 500': 'SPX',
        'Nasdaq 100': 'NDX',
        'Dow Jones': 'DJI',
        'Russell 2000': 'RUT',
      };

      const apiSymbol = symbolMap[index.name];
      if (!apiSymbol) return index;

      const apiAsset = macroData.assets.find(a => a.symbol === apiSymbol);
      if (!apiAsset || apiAsset.price === null) return index;

      // Merge real data with mock structure
      return {
        ...index,
        value: apiAsset.price,
        change: apiAsset.dailyChangePercent || 0,
        change5D: apiAsset.weeklyChangePercent || index.change5D,
        // Keep mock data for MTD/YTD since API doesn't provide it
        changeMTD: index.changeMTD,
        changeYTD: index.changeYTD,
        volume: parseVolumeString(apiAsset.volume) || index.volume,
      };
    });
  }, [macroData]);

  // Get VIX data
  const vixData = useMemo((): VolatilityData => {
    if (!macroData?.assets) return usVolatility;
    const vix = macroData.assets.find(a => a.symbol === 'VIX');
    if (!vix || vix.price === null) return usVolatility;

    const level: 'low' | 'normal' | 'elevated' | 'stress' = 
      vix.price < 15 ? 'low' : 
      vix.price < 20 ? 'normal' : 
      vix.price < 30 ? 'elevated' : 'stress';

    return {
      ...usVolatility,
      vix: vix.price,
      vixChange: vix.dailyChange || 0,
      level,
      percentile: Math.min(100, Math.round((vix.price / 40) * 100)),
    };
  }, [macroData]);

  // Get Treasury yield data
  const ratesData = useMemo(() => {
    if (!macroData?.assets) return usRates;
    const tnx = macroData.assets.find(a => a.symbol === 'TNX');
    if (!tnx || tnx.price === null) return usRates;

    return {
      ...usRates,
      tenYear: tnx.price,
      tenYearChange: (tnx.dailyChange || 0) / 100, // Convert to decimal for bp calculation
    };
  }, [macroData]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Calculate global score using real + mock data
  const globalScore = useMemo(() => {
    // If we have real sentiment data, use it
    if (sentimentScore !== 0) return sentimentScore;
    // Fallback to calculating from all indices
    return calculateGlobalScore();
  }, [sentimentScore]);

  const regime = getRegimeLabel(globalScore);
  const allIndices = [...mergedUsIndices, ...europeIndices, ...asiaIndices];
  const greenCount = allIndices.filter(i => getChangeByRange(i, timeRange) > 0).length;
  const totalCount = allIndices.length;
  const globalAvg = (allIndices.reduce((s, i) => s + getChangeByRange(i, timeRange), 0) / totalCount).toFixed(2);

  const sortIndices = (indices: MarketIndex[]) => {
    return [...indices].sort((a, b) => {
      switch (sortBy) {
        case 'change': return getChangeByRange(b, timeRange) - getChangeByRange(a, timeRange);
        case 'name': return a.name.localeCompare(b.name);
        case 'value': return b.value - a.value;
        case 'volume': return (b.volume / b.avgVolume) - (a.volume / a.avgVolume);
        default: return 0;
      }
    });
  };

  // Data source indicator
  const dataSource = macroData?.source || 'offline';
  const isLive = dataSource === 'live' && !isStale;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#1A1A1A]">
        <div className="p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <Globe className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white">Global Heatmap</h1>
                  {/* Live indicator */}
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${
                    isLive ? 'bg-[#2ECC71]/15 text-[#2ECC71]' : 
                    dataSource === 'cache' ? 'bg-amber-500/15 text-amber-400' : 
                    'bg-gray-500/15 text-gray-400'
                  }`}>
                    {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {isLive ? 'Live' : dataSource === 'cache' ? 'Cached' : 'Offline'}
                  </div>
                </div>
                <p className="text-gray-500 text-sm">
                  {lastUpdated ? `Updated ${getTimeSince(lastUpdated)}` : 'Real-time performance across global equity markets'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex bg-[#1A1A1A] rounded-lg p-0.5">
                {(['1D', '5D', 'MTD', 'YTD'] as TimeRange[]).map((r) => (
                  <button key={r} onClick={() => setTimeRange(r)} className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${timeRange === r ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white'}`}>{r}</button>
                ))}
              </div>
              <div className="flex bg-[#1A1A1A] rounded-lg p-0.5">
                <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white'}`}>Grid</button>
                <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white'}`}>List</button>
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                <option value="change">Sort: % Change</option>
                <option value="name">Sort: Name</option>
                <option value="value">Sort: Value</option>
                <option value="volume">Sort: Volume</option>
              </select>
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className={`p-2 rounded-lg bg-[#1A1A1A] text-gray-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : 'hover:rotate-180'} duration-500`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {/* Global Stats Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 bg-[#141414] rounded-xl border border-[#1F1F1F]">
            <div className="flex items-center gap-6">
              <div><div className="text-xs text-gray-500 mb-0.5">Global Regime</div><div className={`text-lg font-bold ${regime.color}`}>{regime.label}</div></div>
              <div className="h-8 w-px bg-[#2A2A2A]" />
              <div><div className="text-xs text-gray-500 mb-0.5">Score</div><div className={`text-lg font-bold ${regime.color}`}>{globalScore >= 0 ? '+' : ''}{globalScore.toFixed(1)}</div></div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center"><div className="text-xs text-gray-500">Markets Up</div><div className="text-[#2ECC71] font-bold">{greenCount}/{totalCount}</div></div>
              <div className="text-center"><div className="text-xs text-gray-500">Global Avg</div><div className={`font-bold ${getTextColor(parseFloat(globalAvg))}`}>{parseFloat(globalAvg) >= 0 ? '+' : ''}{globalAvg}%</div></div>
              <div className="h-8 w-px bg-[#2A2A2A]" />
              <SessionTimeline />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-8">
        {/* Narrative Panel */}
        <NarrativePanel isOpen={narrativeOpen} onToggle={() => setNarrativeOpen(!narrativeOpen)} />

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* UNITED STATES - With Real API Data */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <RegionHeader 
            region="United States" 
            indices={mergedUsIndices} 
            range={timeRange} 
            accentColor="bg-amber-500"
            sectorLeaders={{ up: 'Tech, Discretionary', down: 'Energy, Utilities' }}
          />
          <Card className="bg-[#141414] border-[#1F1F1F]">
            <CardContent className="p-4">
              {isLoading && !macroData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {sortIndices(mergedUsIndices).map((index) => (
                    <IndexCard key={index.name} index={index} range={timeRange} onClick={() => setSelectedIndex(index)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <BreadthPanel data={usBreadth} title="S&P 500 Breadth" />
            <VolRatesPanel vol={vixData} rates={ratesData} region="us" />
            <FXPanel pairs={usFX} title="USD & FX" />
            <FuturesPanel futures={usFutures} />
          </div>
          <WeightingPanel indices={mergedUsIndices} range={timeRange} />
          <Card className="bg-[#141414] border-[#1F1F1F]">
            <CardContent className="p-4">
              <SectorHeatmap sectors={usSectors} title="S&P 500 Sectors (GICS)" />
            </CardContent>
          </Card>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* EUROPE */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <RegionHeader 
            region="Europe" 
            indices={europeIndices} 
            range={timeRange} 
            accentColor="bg-blue-500"
            sectorLeaders={{ up: 'Financials, Industrials', down: 'Utilities, Energy' }}
          />
          <Card className="bg-[#141414] border-[#1F1F1F]">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {sortIndices(europeIndices).map((index) => (
                  <IndexCard key={index.name} index={index} range={timeRange} onClick={() => setSelectedIndex(index)} />
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <BreadthPanel data={europeBreadth} title="STOXX 600 Breadth" />
            <VolRatesPanel vol={europeVolatility} rates={europeRates} region="europe" />
            <FXPanel pairs={europeFX} title="European FX" />
          </div>
          <Card className="bg-[#141414] border-[#1F1F1F]">
            <CardContent className="p-4">
              <SectorHeatmap sectors={europeSectors} title="European Sectors" />
            </CardContent>
          </Card>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* ASIA PACIFIC - Better hierarchy */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <RegionHeader 
            region="Asia Pacific" 
            indices={asiaIndices} 
            range={timeRange} 
            accentColor="bg-rose-500"
            sectorLeaders={{ up: 'India, Korea', down: 'China, Hong Kong' }}
          />
          
          {/* Category Tags */}
          <div className="flex gap-3">
            <span className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs rounded-lg border border-blue-500/20">Developed: JP, AU, HK, KR</span>
            <span className="px-3 py-1.5 bg-amber-500/10 text-amber-400 text-xs rounded-lg border border-amber-500/20">Emerging: CN, IN, TW</span>
          </div>
          
          <Card className="bg-[#141414] border-[#1F1F1F]">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {sortIndices(asiaIndices).map((index) => (
                  <IndexCard key={index.name} index={index} range={timeRange} onClick={() => setSelectedIndex(index)} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comparison Panel - Now with proper table and user selection */}
          <ComparisonPanel range={timeRange} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FXPanel pairs={asiaFX} title="Asian FX" />
            <div className="bg-[#1A1A1A] rounded-lg p-4 shadow-lg shadow-black/10">
              <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-3">
                <Percent className="w-4 h-4" />Key Asian Yields
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { country: 'JP', name: '10Y JGB', value: '0.95%', change: '+2bp', positive: true },
                  { country: 'AU', name: '10Y', value: '4.35%', change: '-3bp', positive: false },
                  { country: 'IN', name: '10Y', value: '7.12%', change: '+1bp', positive: true },
                ].map((bond) => (
                  <div key={bond.country} className="bg-[#141414] rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">{bond.country} {bond.name}</div>
                    <div className="text-white font-medium">{bond.value}</div>
                    <div className={`text-[10px] ${bond.positive ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>{bond.change}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* CROSS-REGION ANALYSIS */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <Globe className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Cross-Region Analysis</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CrossRegionMatrix range={timeRange} />
            <GlobalSectorComparison />
          </div>
        </section>

        {/* Color Legend */}
        <Card className="bg-[#141414] border-[#1F1F1F]">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <span className="text-gray-500 text-xs">Color Scale:</span>
              {[
                { label: '> +2%', color: 'bg-[#2ECC71]' },
                { label: '+1% to +2%', color: 'bg-[#27AE60]' },
                { label: '+0.5% to +1%', color: 'bg-[#1E824C]' },
                { label: '0 to +0.5%', color: 'bg-[#1E824C]/60' },
                { label: '-0.5% to 0', color: 'bg-[#922B21]/60' },
                { label: '-1% to -0.5%', color: 'bg-[#922B21]' },
                { label: '-2% to -1%', color: 'bg-[#C0392B]' },
                { label: '< -2%', color: 'bg-[#E74C3C]' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${item.color}`} />
                  <span className="text-gray-500 text-[10px]">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-gray-600 text-xs">Last update: {new Date().toLocaleTimeString()} UTC | Data for demonstration purposes</p>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedIndex && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedIndex(null)} />
          <IndexDetailDrawer index={selectedIndex} onClose={() => setSelectedIndex(null)} />
        </>
      )}
    </div>
  );
}