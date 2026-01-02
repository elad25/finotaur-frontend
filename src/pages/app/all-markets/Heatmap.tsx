// src/pages/app/all-markets/Heatmap.tsx
// Professional Finviz-style Treemap with Backend API
// Features: 15-min cache, market hours detection (including premarket), fallback to last trading day
// FIXED: Added proper fallback calculations when market is closed

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, Maximize2, Share2, Clock, AlertCircle } from 'lucide-react';

// ============ TYPES ============
interface StockData {
  symbol: string;
  name: string;
  change: number;
  marketCap: number;
  price: number;
  volume: number;
  sector: string;
  industry: string;
}

interface SectorData {
  name: string;
  stocks: StockData[];
  totalMarketCap: number;
  avgChange: number;
}

interface TreemapRect {
  x: number;
  y: number;
  width: number;
  height: number;
  data: StockData | SectorData;
  type: 'stock' | 'sector';
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isMarketOpen: boolean;
}

type MarketKey = 'stocks' | 'sectors' | 'crypto' | 'futures' | 'forex' | 'commodities' | 'indices';
type MarketSession = 'premarket' | 'regular' | 'afterhours' | 'closed';

// ============ CACHE CONFIGURATION ============
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Backend API URL - uses your server instead of direct Polygon calls
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// ============ MARKET HOURS UTILITY ============
function isUSMarketOpen(): { isOpen: boolean; session: MarketSession; nextOpen: Date | null; message: string } {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = nyTime.getDay();
  const hours = nyTime.getHours();
  const minutes = nyTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  
  // Market hours:
  // Pre-market: 4:00 AM - 9:30 AM ET (240-570 minutes)
  // Regular: 9:30 AM - 4:00 PM ET (570-960 minutes)
  // After-hours: 4:00 PM - 8:00 PM ET (960-1200 minutes)
  const premarketOpen = 4 * 60; // 4:00 AM
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM
  const afterHoursClose = 20 * 60; // 8:00 PM
  
  // Weekend check
  if (day === 0 || day === 6) {
    const daysUntilMonday = day === 0 ? 1 : 2;
    const nextOpen = new Date(nyTime);
    nextOpen.setDate(nextOpen.getDate() + daysUntilMonday);
    nextOpen.setHours(4, 0, 0, 0);
    return {
      isOpen: false,
      session: 'closed',
      nextOpen,
      message: `Market closed (Weekend). Pre-market opens Monday 4:00 AM ET`
    };
  }
  
  // Before pre-market (before 4:00 AM)
  if (currentMinutes < premarketOpen) {
    const nextOpen = new Date(nyTime);
    nextOpen.setHours(4, 0, 0, 0);
    return {
      isOpen: false,
      session: 'closed',
      nextOpen,
      message: `Market closed. Pre-market opens at 4:00 AM ET`
    };
  }
  
  // Pre-market hours (4:00 AM - 9:30 AM)
  if (currentMinutes >= premarketOpen && currentMinutes < marketOpen) {
    const regularOpen = new Date(nyTime);
    regularOpen.setHours(9, 30, 0, 0);
    return {
      isOpen: true,
      session: 'premarket',
      nextOpen: regularOpen,
      message: `Regular session opens at 9:30 AM ET`
    };
  }
  
  // Regular market hours (9:30 AM - 4:00 PM)
  if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
    return {
      isOpen: true,
      session: 'regular',
      nextOpen: null,
      message: 'Market is open'
    };
  }
  
  // After-hours (4:00 PM - 8:00 PM)
  if (currentMinutes >= marketClose && currentMinutes < afterHoursClose) {
    const nextOpen = new Date(nyTime);
    if (day === 5) {
      // Friday after close - next pre-market is Monday
      nextOpen.setDate(nextOpen.getDate() + 3);
    } else {
      nextOpen.setDate(nextOpen.getDate() + 1);
    }
    nextOpen.setHours(4, 0, 0, 0);
    return {
      isOpen: true,
      session: 'afterhours',
      nextOpen,
      message: `Next pre-market ${day === 5 ? 'Monday' : 'tomorrow'} 4:00 AM ET`
    };
  }
  
  // After after-hours (after 8:00 PM)
  const nextOpen = new Date(nyTime);
  if (day === 5) {
    // Friday after close - next pre-market is Monday
    nextOpen.setDate(nextOpen.getDate() + 3);
  } else {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }
  nextOpen.setHours(4, 0, 0, 0);
  return {
    isOpen: false,
    session: 'closed',
    nextOpen,
    message: `Market closed. Pre-market opens ${day === 5 ? 'Monday' : 'tomorrow'} 4:00 AM ET`
  };
}

// ============ LOCAL STORAGE CACHE ============
class MarketDataCache {
  private prefix = 'heatmap_cache_';
  
  get<T>(key: string): CacheEntry<T> | null {
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (!stored) return null;
      
      const entry: CacheEntry<T> = JSON.parse(stored);
      const age = Date.now() - entry.timestamp;
      
      // If market is closed, cache is valid indefinitely until next market open
      if (!entry.isMarketOpen) {
        return entry;
      }
      
      // If market is open (including premarket), check if cache is still fresh (15 min)
      if (age < CACHE_DURATION_MS) {
        return entry;
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  set<T>(key: string, data: T, isMarketOpen: boolean): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        isMarketOpen
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (e) {
      console.warn('Cache storage failed:', e);
    }
  }
  
  clear(): void {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));
    keys.forEach(k => localStorage.removeItem(k));
  }
  
  getAge(key: string): number | null {
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (!stored) return null;
      const entry = JSON.parse(stored);
      return Date.now() - entry.timestamp;
    } catch {
      return null;
    }
  }
}

const cache = new MarketDataCache();

// ============ S&P 500 STOCK DATA BY SECTOR (Top ~200 by market cap) ============
const SP500_STOCKS: StockData[] = [
  // Technology - Software Infrastructure
  { symbol: 'MSFT', name: 'Microsoft', change: 0, marketCap: 3100, price: 0, volume: 0, sector: 'Technology', industry: 'Software - Infrastructure' },
  { symbol: 'ORCL', name: 'Oracle', change: 0, marketCap: 380, price: 0, volume: 0, sector: 'Technology', industry: 'Software - Infrastructure' },
  { symbol: 'PLTR', name: 'Palantir', change: 0, marketCap: 150, price: 0, volume: 0, sector: 'Technology', industry: 'Software - Infrastructure' },
  { symbol: 'CRWD', name: 'CrowdStrike', change: 0, marketCap: 85, price: 0, volume: 0, sector: 'Technology', industry: 'Software - Infrastructure' },
  { symbol: 'SNPS', name: 'Synopsys', change: 0, marketCap: 75, price: 0, volume: 0, sector: 'Technology', industry: 'Software - Infrastructure' },
  { symbol: 'FTNT', name: 'Fortinet', change: 0, marketCap: 72, price: 0, volume: 0, sector: 'Technology', industry: 'Software - Infrastructure' },
  
  // Technology - Consumer Electronics
  { symbol: 'AAPL', name: 'Apple', change: 0, marketCap: 3400, price: 0, volume: 0, sector: 'Technology', industry: 'Consumer Electronics' },
  
  // Technology - Semiconductors
  { symbol: 'NVDA', name: 'NVIDIA', change: 0, marketCap: 3200, price: 0, volume: 0, sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'AVGO', name: 'Broadcom', change: 0, marketCap: 800, price: 0, volume: 0, sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'AMD', name: 'AMD', change: 0, marketCap: 220, price: 0, volume: 0, sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'QCOM', name: 'Qualcomm', change: 0, marketCap: 185, price: 0, volume: 0, sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'TXN', name: 'Texas Instruments', change: 0, marketCap: 175, price: 0, volume: 0, sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'MU', name: 'Micron', change: 0, marketCap: 105, price: 0, volume: 0, sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'INTC', name: 'Intel', change: 0, marketCap: 95, price: 0, volume: 0, sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'ADI', name: 'Analog Devices', change: 0, marketCap: 90, price: 0, volume: 0, sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'LRCX', name: 'Lam Research', change: 0, marketCap: 85, price: 0, volume: 0, sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'AMAT', name: 'Applied Materials', change: 0, marketCap: 130, price: 0, volume: 0, sector: 'Technology', industry: 'Semiconductors' },
  
  // Technology - Software Application
  { symbol: 'CRM', name: 'Salesforce', change: 0, marketCap: 280, price: 0, volume: 0, sector: 'Technology', industry: 'Software - Application' },
  { symbol: 'ADBE', name: 'Adobe', change: 0, marketCap: 200, price: 0, volume: 0, sector: 'Technology', industry: 'Software - Application' },
  { symbol: 'NOW', name: 'ServiceNow', change: 0, marketCap: 185, price: 0, volume: 0, sector: 'Technology', industry: 'Software - Application' },
  { symbol: 'INTU', name: 'Intuit', change: 0, marketCap: 170, price: 0, volume: 0, sector: 'Technology', industry: 'Software - Application' },
  { symbol: 'UBER', name: 'Uber', change: 0, marketCap: 145, price: 0, volume: 0, sector: 'Technology', industry: 'Software - Application' },
  { symbol: 'WDAY', name: 'Workday', change: 0, marketCap: 60, price: 0, volume: 0, sector: 'Technology', industry: 'Software - Application' },
  { symbol: 'ADP', name: 'ADP', change: 0, marketCap: 115, price: 0, volume: 0, sector: 'Technology', industry: 'Software - Application' },
  
  // Technology - IT Services
  { symbol: 'IBM', name: 'IBM', change: 0, marketCap: 195, price: 0, volume: 0, sector: 'Technology', industry: 'IT Services' },
  { symbol: 'ACN', name: 'Accenture', change: 0, marketCap: 195, price: 0, volume: 0, sector: 'Technology', industry: 'IT Services' },
  { symbol: 'CSCO', name: 'Cisco', change: 0, marketCap: 235, price: 0, volume: 0, sector: 'Technology', industry: 'IT Services' },
  
  // Communication Services
  { symbol: 'GOOGL', name: 'Alphabet', change: 0, marketCap: 2100, price: 0, volume: 0, sector: 'Communication Services', industry: 'Internet Content' },
  { symbol: 'META', name: 'Meta', change: 0, marketCap: 1400, price: 0, volume: 0, sector: 'Communication Services', industry: 'Internet Content' },
  { symbol: 'NFLX', name: 'Netflix', change: 0, marketCap: 380, price: 0, volume: 0, sector: 'Communication Services', industry: 'Entertainment' },
  { symbol: 'DIS', name: 'Disney', change: 0, marketCap: 195, price: 0, volume: 0, sector: 'Communication Services', industry: 'Entertainment' },
  { symbol: 'CMCSA', name: 'Comcast', change: 0, marketCap: 145, price: 0, volume: 0, sector: 'Communication Services', industry: 'Telecom' },
  { symbol: 'TMUS', name: 'T-Mobile', change: 0, marketCap: 260, price: 0, volume: 0, sector: 'Communication Services', industry: 'Telecom' },
  { symbol: 'VZ', name: 'Verizon', change: 0, marketCap: 175, price: 0, volume: 0, sector: 'Communication Services', industry: 'Telecom' },
  { symbol: 'T', name: 'AT&T', change: 0, marketCap: 165, price: 0, volume: 0, sector: 'Communication Services', industry: 'Telecom' },
  
  // Consumer Cyclical
  { symbol: 'AMZN', name: 'Amazon', change: 0, marketCap: 2200, price: 0, volume: 0, sector: 'Consumer Cyclical', industry: 'Internet Retail' },
  { symbol: 'TSLA', name: 'Tesla', change: 0, marketCap: 850, price: 0, volume: 0, sector: 'Consumer Cyclical', industry: 'Auto Manufacturers' },
  { symbol: 'HD', name: 'Home Depot', change: 0, marketCap: 380, price: 0, volume: 0, sector: 'Consumer Cyclical', industry: 'Home Improvement' },
  { symbol: 'MCD', name: "McDonald's", change: 0, marketCap: 210, price: 0, volume: 0, sector: 'Consumer Cyclical', industry: 'Restaurants' },
  { symbol: 'NKE', name: 'Nike', change: 0, marketCap: 115, price: 0, volume: 0, sector: 'Consumer Cyclical', industry: 'Apparel' },
  { symbol: 'LOW', name: "Lowe's", change: 0, marketCap: 145, price: 0, volume: 0, sector: 'Consumer Cyclical', industry: 'Home Improvement' },
  { symbol: 'SBUX', name: 'Starbucks', change: 0, marketCap: 105, price: 0, volume: 0, sector: 'Consumer Cyclical', industry: 'Restaurants' },
  { symbol: 'TJX', name: 'TJX Companies', change: 0, marketCap: 130, price: 0, volume: 0, sector: 'Consumer Cyclical', industry: 'Apparel Retail' },
  { symbol: 'BKNG', name: 'Booking', change: 0, marketCap: 155, price: 0, volume: 0, sector: 'Consumer Cyclical', industry: 'Travel' },
  { symbol: 'F', name: 'Ford', change: 0, marketCap: 42, price: 0, volume: 0, sector: 'Consumer Cyclical', industry: 'Auto Manufacturers' },
  { symbol: 'GM', name: 'General Motors', change: 0, marketCap: 52, price: 0, volume: 0, sector: 'Consumer Cyclical', industry: 'Auto Manufacturers' },
  { symbol: 'MAR', name: 'Marriott', change: 0, marketCap: 75, price: 0, volume: 0, sector: 'Consumer Cyclical', industry: 'Lodging' },
  { symbol: 'HLT', name: 'Hilton', change: 0, marketCap: 58, price: 0, volume: 0, sector: 'Consumer Cyclical', industry: 'Lodging' },
  
  // Consumer Defensive
  { symbol: 'WMT', name: 'Walmart', change: 0, marketCap: 680, price: 0, volume: 0, sector: 'Consumer Defensive', industry: 'Discount Stores' },
  { symbol: 'COST', name: 'Costco', change: 0, marketCap: 400, price: 0, volume: 0, sector: 'Consumer Defensive', industry: 'Discount Stores' },
  { symbol: 'PG', name: 'Procter & Gamble', change: 0, marketCap: 380, price: 0, volume: 0, sector: 'Consumer Defensive', industry: 'Household Products' },
  { symbol: 'KO', name: 'Coca-Cola', change: 0, marketCap: 265, price: 0, volume: 0, sector: 'Consumer Defensive', industry: 'Beverages' },
  { symbol: 'PEP', name: 'PepsiCo', change: 0, marketCap: 220, price: 0, volume: 0, sector: 'Consumer Defensive', industry: 'Beverages' },
  { symbol: 'PM', name: 'Philip Morris', change: 0, marketCap: 195, price: 0, volume: 0, sector: 'Consumer Defensive', industry: 'Tobacco' },
  { symbol: 'MO', name: 'Altria', change: 0, marketCap: 90, price: 0, volume: 0, sector: 'Consumer Defensive', industry: 'Tobacco' },
  { symbol: 'TGT', name: 'Target', change: 0, marketCap: 55, price: 0, volume: 0, sector: 'Consumer Defensive', industry: 'Discount Stores' },
  { symbol: 'KR', name: 'Kroger', change: 0, marketCap: 42, price: 0, volume: 0, sector: 'Consumer Defensive', industry: 'Grocery Stores' },
  
  // Healthcare
  { symbol: 'LLY', name: 'Eli Lilly', change: 0, marketCap: 750, price: 0, volume: 0, sector: 'Healthcare', industry: 'Drug Manufacturers' },
  { symbol: 'UNH', name: 'UnitedHealth', change: 0, marketCap: 480, price: 0, volume: 0, sector: 'Healthcare', industry: 'Healthcare Plans' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', change: 0, marketCap: 360, price: 0, volume: 0, sector: 'Healthcare', industry: 'Drug Manufacturers' },
  { symbol: 'ABBV', name: 'AbbVie', change: 0, marketCap: 310, price: 0, volume: 0, sector: 'Healthcare', industry: 'Drug Manufacturers' },
  { symbol: 'MRK', name: 'Merck', change: 0, marketCap: 255, price: 0, volume: 0, sector: 'Healthcare', industry: 'Drug Manufacturers' },
  { symbol: 'PFE', name: 'Pfizer', change: 0, marketCap: 145, price: 0, volume: 0, sector: 'Healthcare', industry: 'Drug Manufacturers' },
  { symbol: 'TMO', name: 'Thermo Fisher', change: 0, marketCap: 195, price: 0, volume: 0, sector: 'Healthcare', industry: 'Diagnostics & Research' },
  { symbol: 'ABT', name: 'Abbott Labs', change: 0, marketCap: 200, price: 0, volume: 0, sector: 'Healthcare', industry: 'Medical Devices' },
  { symbol: 'DHR', name: 'Danaher', change: 0, marketCap: 165, price: 0, volume: 0, sector: 'Healthcare', industry: 'Diagnostics & Research' },
  { symbol: 'AMGN', name: 'Amgen', change: 0, marketCap: 155, price: 0, volume: 0, sector: 'Healthcare', industry: 'Drug Manufacturers' },
  { symbol: 'BMY', name: 'Bristol-Myers', change: 0, marketCap: 105, price: 0, volume: 0, sector: 'Healthcare', industry: 'Drug Manufacturers' },
  { symbol: 'ISRG', name: 'Intuitive Surgical', change: 0, marketCap: 175, price: 0, volume: 0, sector: 'Healthcare', industry: 'Medical Devices' },
  { symbol: 'GILD', name: 'Gilead', change: 0, marketCap: 115, price: 0, volume: 0, sector: 'Healthcare', industry: 'Drug Manufacturers' },
  { symbol: 'SYK', name: 'Stryker', change: 0, marketCap: 135, price: 0, volume: 0, sector: 'Healthcare', industry: 'Medical Devices' },
  { symbol: 'BSX', name: 'Boston Scientific', change: 0, marketCap: 125, price: 0, volume: 0, sector: 'Healthcare', industry: 'Medical Devices' },
  { symbol: 'CVS', name: 'CVS Health', change: 0, marketCap: 70, price: 0, volume: 0, sector: 'Healthcare', industry: 'Healthcare Plans' },
  
  // Financials
  { symbol: 'BRK-B', name: 'Berkshire Hathaway', change: 0, marketCap: 980, price: 0, volume: 0, sector: 'Financial', industry: 'Insurance - Diversified' },
  { symbol: 'JPM', name: 'JPMorgan Chase', change: 0, marketCap: 680, price: 0, volume: 0, sector: 'Financial', industry: 'Banks - Diversified' },
  { symbol: 'V', name: 'Visa', change: 0, marketCap: 580, price: 0, volume: 0, sector: 'Financial', industry: 'Credit Services' },
  { symbol: 'MA', name: 'Mastercard', change: 0, marketCap: 450, price: 0, volume: 0, sector: 'Financial', industry: 'Credit Services' },
  { symbol: 'BAC', name: 'Bank of America', change: 0, marketCap: 330, price: 0, volume: 0, sector: 'Financial', industry: 'Banks - Diversified' },
  { symbol: 'WFC', name: 'Wells Fargo', change: 0, marketCap: 235, price: 0, volume: 0, sector: 'Financial', industry: 'Banks - Diversified' },
  { symbol: 'GS', name: 'Goldman Sachs', change: 0, marketCap: 175, price: 0, volume: 0, sector: 'Financial', industry: 'Capital Markets' },
  { symbol: 'MS', name: 'Morgan Stanley', change: 0, marketCap: 195, price: 0, volume: 0, sector: 'Financial', industry: 'Capital Markets' },
  { symbol: 'SPGI', name: 'S&P Global', change: 0, marketCap: 155, price: 0, volume: 0, sector: 'Financial', industry: 'Financial Data' },
  { symbol: 'BLK', name: 'BlackRock', change: 0, marketCap: 145, price: 0, volume: 0, sector: 'Financial', industry: 'Asset Management' },
  { symbol: 'SCHW', name: 'Charles Schwab', change: 0, marketCap: 135, price: 0, volume: 0, sector: 'Financial', industry: 'Capital Markets' },
  { symbol: 'C', name: 'Citigroup', change: 0, marketCap: 135, price: 0, volume: 0, sector: 'Financial', industry: 'Banks - Diversified' },
  { symbol: 'AXP', name: 'American Express', change: 0, marketCap: 185, price: 0, volume: 0, sector: 'Financial', industry: 'Credit Services' },
  { symbol: 'CB', name: 'Chubb', change: 0, marketCap: 115, price: 0, volume: 0, sector: 'Financial', industry: 'Insurance' },
  { symbol: 'PGR', name: 'Progressive', change: 0, marketCap: 145, price: 0, volume: 0, sector: 'Financial', industry: 'Insurance' },
  { symbol: 'COF', name: 'Capital One', change: 0, marketCap: 68, price: 0, volume: 0, sector: 'Financial', industry: 'Credit Services' },
  
  // Industrials
  { symbol: 'GE', name: 'GE Aerospace', change: 0, marketCap: 195, price: 0, volume: 0, sector: 'Industrials', industry: 'Aerospace & Defense' },
  { symbol: 'CAT', name: 'Caterpillar', change: 0, marketCap: 175, price: 0, volume: 0, sector: 'Industrials', industry: 'Farm & Heavy Machinery' },
  { symbol: 'RTX', name: 'RTX Corp', change: 0, marketCap: 155, price: 0, volume: 0, sector: 'Industrials', industry: 'Aerospace & Defense' },
  { symbol: 'HON', name: 'Honeywell', change: 0, marketCap: 135, price: 0, volume: 0, sector: 'Industrials', industry: 'Conglomerates' },
  { symbol: 'UNP', name: 'Union Pacific', change: 0, marketCap: 140, price: 0, volume: 0, sector: 'Industrials', industry: 'Railroads' },
  { symbol: 'BA', name: 'Boeing', change: 0, marketCap: 115, price: 0, volume: 0, sector: 'Industrials', industry: 'Aerospace & Defense' },
  { symbol: 'LMT', name: 'Lockheed Martin', change: 0, marketCap: 115, price: 0, volume: 0, sector: 'Industrials', industry: 'Aerospace & Defense' },
  { symbol: 'DE', name: 'Deere & Co', change: 0, marketCap: 115, price: 0, volume: 0, sector: 'Industrials', industry: 'Farm & Heavy Machinery' },
  { symbol: 'UPS', name: 'UPS', change: 0, marketCap: 95, price: 0, volume: 0, sector: 'Industrials', industry: 'Integrated Freight' },
  { symbol: 'ETN', name: 'Eaton Corp', change: 0, marketCap: 125, price: 0, volume: 0, sector: 'Industrials', industry: 'Specialty Industrial' },
  { symbol: 'WM', name: 'Waste Management', change: 0, marketCap: 88, price: 0, volume: 0, sector: 'Industrials', industry: 'Waste Management' },
  { symbol: 'NOC', name: 'Northrop Grumman', change: 0, marketCap: 68, price: 0, volume: 0, sector: 'Industrials', industry: 'Aerospace & Defense' },
  { symbol: 'GD', name: 'General Dynamics', change: 0, marketCap: 75, price: 0, volume: 0, sector: 'Industrials', industry: 'Aerospace & Defense' },
  { symbol: 'CSX', name: 'CSX Corp', change: 0, marketCap: 65, price: 0, volume: 0, sector: 'Industrials', industry: 'Railroads' },
  { symbol: 'FDX', name: 'FedEx', change: 0, marketCap: 62, price: 0, volume: 0, sector: 'Industrials', industry: 'Integrated Freight' },
  { symbol: 'CTAS', name: 'Cintas', change: 0, marketCap: 78, price: 0, volume: 0, sector: 'Industrials', industry: 'Business Services' },
  { symbol: 'FAST', name: 'Fastenal', change: 0, marketCap: 42, price: 0, volume: 0, sector: 'Industrials', industry: 'Industrial Distribution' },
  { symbol: 'GWW', name: 'W.W. Grainger', change: 0, marketCap: 52, price: 0, volume: 0, sector: 'Industrials', industry: 'Industrial Distribution' },
  
  // Energy
  { symbol: 'XOM', name: 'Exxon Mobil', change: 0, marketCap: 475, price: 0, volume: 0, sector: 'Energy', industry: 'Oil & Gas Integrated' },
  { symbol: 'CVX', name: 'Chevron', change: 0, marketCap: 275, price: 0, volume: 0, sector: 'Energy', industry: 'Oil & Gas Integrated' },
  { symbol: 'COP', name: 'ConocoPhillips', change: 0, marketCap: 125, price: 0, volume: 0, sector: 'Energy', industry: 'Oil & Gas E&P' },
  { symbol: 'SLB', name: 'Schlumberger', change: 0, marketCap: 62, price: 0, volume: 0, sector: 'Energy', industry: 'Oil & Gas Equipment' },
  { symbol: 'EOG', name: 'EOG Resources', change: 0, marketCap: 72, price: 0, volume: 0, sector: 'Energy', industry: 'Oil & Gas E&P' },
  { symbol: 'MPC', name: 'Marathon Petroleum', change: 0, marketCap: 55, price: 0, volume: 0, sector: 'Energy', industry: 'Oil & Gas Refining' },
  { symbol: 'PSX', name: 'Phillips 66', change: 0, marketCap: 52, price: 0, volume: 0, sector: 'Energy', industry: 'Oil & Gas Refining' },
  { symbol: 'VLO', name: 'Valero Energy', change: 0, marketCap: 42, price: 0, volume: 0, sector: 'Energy', industry: 'Oil & Gas Refining' },
  { symbol: 'OXY', name: 'Occidental Petroleum', change: 0, marketCap: 48, price: 0, volume: 0, sector: 'Energy', industry: 'Oil & Gas E&P' },
  { symbol: 'WMB', name: 'Williams Companies', change: 0, marketCap: 62, price: 0, volume: 0, sector: 'Energy', industry: 'Oil & Gas Midstream' },
  { symbol: 'KMI', name: 'Kinder Morgan', change: 0, marketCap: 48, price: 0, volume: 0, sector: 'Energy', industry: 'Oil & Gas Midstream' },
  { symbol: 'HAL', name: 'Halliburton', change: 0, marketCap: 25, price: 0, volume: 0, sector: 'Energy', industry: 'Oil & Gas Equipment' },
  
  // Utilities
  { symbol: 'NEE', name: 'NextEra Energy', change: 0, marketCap: 155, price: 0, volume: 0, sector: 'Utilities', industry: 'Utilities - Regulated' },
  { symbol: 'SO', name: 'Southern Company', change: 0, marketCap: 95, price: 0, volume: 0, sector: 'Utilities', industry: 'Utilities - Regulated' },
  { symbol: 'DUK', name: 'Duke Energy', change: 0, marketCap: 85, price: 0, volume: 0, sector: 'Utilities', industry: 'Utilities - Regulated' },
  { symbol: 'CEG', name: 'Constellation Energy', change: 0, marketCap: 72, price: 0, volume: 0, sector: 'Utilities', industry: 'Utilities - Independent' },
  { symbol: 'SRE', name: 'Sempra', change: 0, marketCap: 52, price: 0, volume: 0, sector: 'Utilities', industry: 'Utilities - Diversified' },
  { symbol: 'AEP', name: 'American Electric Power', change: 0, marketCap: 52, price: 0, volume: 0, sector: 'Utilities', industry: 'Utilities - Regulated' },
  { symbol: 'D', name: 'Dominion Energy', change: 0, marketCap: 45, price: 0, volume: 0, sector: 'Utilities', industry: 'Utilities - Regulated' },
  { symbol: 'EXC', name: 'Exelon', change: 0, marketCap: 42, price: 0, volume: 0, sector: 'Utilities', industry: 'Utilities - Regulated' },
  { symbol: 'XEL', name: 'Xcel Energy', change: 0, marketCap: 35, price: 0, volume: 0, sector: 'Utilities', industry: 'Utilities - Regulated' },
  
  // Real Estate
  { symbol: 'PLD', name: 'Prologis', change: 0, marketCap: 105, price: 0, volume: 0, sector: 'Real Estate', industry: 'REIT - Industrial' },
  { symbol: 'AMT', name: 'American Tower', change: 0, marketCap: 95, price: 0, volume: 0, sector: 'Real Estate', industry: 'REIT - Specialty' },
  { symbol: 'EQIX', name: 'Equinix', change: 0, marketCap: 82, price: 0, volume: 0, sector: 'Real Estate', industry: 'REIT - Specialty' },
  { symbol: 'CCI', name: 'Crown Castle', change: 0, marketCap: 42, price: 0, volume: 0, sector: 'Real Estate', industry: 'REIT - Specialty' },
  { symbol: 'SPG', name: 'Simon Property', change: 0, marketCap: 58, price: 0, volume: 0, sector: 'Real Estate', industry: 'REIT - Retail' },
  { symbol: 'PSA', name: 'Public Storage', change: 0, marketCap: 52, price: 0, volume: 0, sector: 'Real Estate', industry: 'REIT - Industrial' },
  { symbol: 'WELL', name: 'Welltower', change: 0, marketCap: 65, price: 0, volume: 0, sector: 'Real Estate', industry: 'REIT - Healthcare' },
  { symbol: 'DLR', name: 'Digital Realty', change: 0, marketCap: 52, price: 0, volume: 0, sector: 'Real Estate', industry: 'REIT - Specialty' },
  { symbol: 'O', name: 'Realty Income', change: 0, marketCap: 48, price: 0, volume: 0, sector: 'Real Estate', industry: 'REIT - Retail' },
  
  // Basic Materials
  { symbol: 'LIN', name: 'Linde', change: 0, marketCap: 210, price: 0, volume: 0, sector: 'Basic Materials', industry: 'Specialty Chemicals' },
  { symbol: 'SHW', name: 'Sherwin-Williams', change: 0, marketCap: 85, price: 0, volume: 0, sector: 'Basic Materials', industry: 'Specialty Chemicals' },
  { symbol: 'APD', name: 'Air Products', change: 0, marketCap: 68, price: 0, volume: 0, sector: 'Basic Materials', industry: 'Specialty Chemicals' },
  { symbol: 'FCX', name: 'Freeport-McMoRan', change: 0, marketCap: 58, price: 0, volume: 0, sector: 'Basic Materials', industry: 'Copper' },
  { symbol: 'ECL', name: 'Ecolab', change: 0, marketCap: 62, price: 0, volume: 0, sector: 'Basic Materials', industry: 'Specialty Chemicals' },
  { symbol: 'NUE', name: 'Nucor', change: 0, marketCap: 35, price: 0, volume: 0, sector: 'Basic Materials', industry: 'Steel' },
  { symbol: 'NEM', name: 'Newmont', change: 0, marketCap: 52, price: 0, volume: 0, sector: 'Basic Materials', industry: 'Gold' },
  { symbol: 'DOW', name: 'Dow Inc', change: 0, marketCap: 32, price: 0, volume: 0, sector: 'Basic Materials', industry: 'Chemicals' },
];

// ============ OTHER MARKET DATA ============
const CRYPTO_DATA: StockData[] = [
  { symbol: 'BTC', name: 'Bitcoin', change: 0, marketCap: 1900, price: 0, volume: 0, sector: 'Crypto', industry: 'Currency' },
  { symbol: 'ETH', name: 'Ethereum', change: 0, marketCap: 450, price: 0, volume: 0, sector: 'Crypto', industry: 'Smart Contracts' },
  { symbol: 'BNB', name: 'BNB', change: 0, marketCap: 95, price: 0, volume: 0, sector: 'Crypto', industry: 'Exchange' },
  { symbol: 'SOL', name: 'Solana', change: 0, marketCap: 85, price: 0, volume: 0, sector: 'Crypto', industry: 'Smart Contracts' },
  { symbol: 'XRP', name: 'XRP', change: 0, marketCap: 75, price: 0, volume: 0, sector: 'Crypto', industry: 'Payments' },
  { symbol: 'ADA', name: 'Cardano', change: 0, marketCap: 25, price: 0, volume: 0, sector: 'Crypto', industry: 'Smart Contracts' },
  { symbol: 'DOGE', name: 'Dogecoin', change: 0, marketCap: 25, price: 0, volume: 0, sector: 'Crypto', industry: 'Meme' },
  { symbol: 'AVAX', name: 'Avalanche', change: 0, marketCap: 18, price: 0, volume: 0, sector: 'Crypto', industry: 'Smart Contracts' },
  { symbol: 'DOT', name: 'Polkadot', change: 0, marketCap: 10, price: 0, volume: 0, sector: 'Crypto', industry: 'Infrastructure' },
  { symbol: 'LINK', name: 'Chainlink', change: 0, marketCap: 12, price: 0, volume: 0, sector: 'Crypto', industry: 'Oracle' },
  { symbol: 'MATIC', name: 'Polygon', change: 0, marketCap: 8, price: 0, volume: 0, sector: 'Crypto', industry: 'Layer 2' },
  { symbol: 'UNI', name: 'Uniswap', change: 0, marketCap: 8, price: 0, volume: 0, sector: 'Crypto', industry: 'DeFi' },
];

const SECTORS_DATA: StockData[] = [
  { symbol: 'XLK', name: 'Technology', change: 0, marketCap: 70, price: 0, volume: 0, sector: 'Sectors', industry: 'Technology' },
  { symbol: 'XLF', name: 'Financials', change: 0, marketCap: 45, price: 0, volume: 0, sector: 'Sectors', industry: 'Financials' },
  { symbol: 'XLV', name: 'Healthcare', change: 0, marketCap: 42, price: 0, volume: 0, sector: 'Sectors', industry: 'Healthcare' },
  { symbol: 'XLY', name: 'Consumer Discretionary', change: 0, marketCap: 22, price: 0, volume: 0, sector: 'Sectors', industry: 'Consumer Discretionary' },
  { symbol: 'XLC', name: 'Communication Services', change: 0, marketCap: 18, price: 0, volume: 0, sector: 'Sectors', industry: 'Communication Services' },
  { symbol: 'XLI', name: 'Industrials', change: 0, marketCap: 20, price: 0, volume: 0, sector: 'Sectors', industry: 'Industrials' },
  { symbol: 'XLP', name: 'Consumer Staples', change: 0, marketCap: 17, price: 0, volume: 0, sector: 'Sectors', industry: 'Consumer Staples' },
  { symbol: 'XLE', name: 'Energy', change: 0, marketCap: 38, price: 0, volume: 0, sector: 'Sectors', industry: 'Energy' },
  { symbol: 'XLU', name: 'Utilities', change: 0, marketCap: 17, price: 0, volume: 0, sector: 'Sectors', industry: 'Utilities' },
  { symbol: 'XLRE', name: 'Real Estate', change: 0, marketCap: 7, price: 0, volume: 0, sector: 'Sectors', industry: 'Real Estate' },
  { symbol: 'XLB', name: 'Materials', change: 0, marketCap: 9, price: 0, volume: 0, sector: 'Sectors', industry: 'Materials' },
];

const INDICES_DATA: StockData[] = [
  { symbol: 'SPY', name: 'S&P 500 ETF', change: 0, marketCap: 1000, price: 0, volume: 0, sector: 'Index', industry: 'US Large Cap' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', change: 0, marketCap: 800, price: 0, volume: 0, sector: 'Index', industry: 'US Tech' },
  { symbol: 'DIA', name: 'Dow Jones ETF', change: 0, marketCap: 600, price: 0, volume: 0, sector: 'Index', industry: 'US Blue Chip' },
  { symbol: 'IWM', name: 'Russell 2000 ETF', change: 0, marketCap: 400, price: 0, volume: 0, sector: 'Index', industry: 'US Small Cap' },
  { symbol: 'VXX', name: 'Volatility ETF', change: 0, marketCap: 200, price: 0, volume: 0, sector: 'Index', industry: 'Volatility' },
  { symbol: 'EFA', name: 'International ETF', change: 0, marketCap: 300, price: 0, volume: 0, sector: 'Index', industry: 'International' },
  { symbol: 'EEM', name: 'Emerging Markets ETF', change: 0, marketCap: 250, price: 0, volume: 0, sector: 'Index', industry: 'Emerging' },
  { symbol: 'VTI', name: 'Total Market ETF', change: 0, marketCap: 350, price: 0, volume: 0, sector: 'Index', industry: 'US Total' },
];

const FUTURES_DATA: StockData[] = [
  { symbol: 'ES', name: 'E-mini S&P 500', change: 0, marketCap: 500, price: 0, volume: 0, sector: 'Futures', industry: 'Index' },
  { symbol: 'NQ', name: 'E-mini Nasdaq', change: 0, marketCap: 450, price: 0, volume: 0, sector: 'Futures', industry: 'Index' },
  { symbol: 'YM', name: 'E-mini Dow', change: 0, marketCap: 300, price: 0, volume: 0, sector: 'Futures', industry: 'Index' },
  { symbol: 'RTY', name: 'E-mini Russell', change: 0, marketCap: 200, price: 0, volume: 0, sector: 'Futures', industry: 'Index' },
  { symbol: 'CL', name: 'Crude Oil WTI', change: 0, marketCap: 400, price: 0, volume: 0, sector: 'Futures', industry: 'Energy' },
  { symbol: 'GC', name: 'Gold', change: 0, marketCap: 350, price: 0, volume: 0, sector: 'Futures', industry: 'Metals' },
  { symbol: 'SI', name: 'Silver', change: 0, marketCap: 150, price: 0, volume: 0, sector: 'Futures', industry: 'Metals' },
  { symbol: 'NG', name: 'Natural Gas', change: 0, marketCap: 200, price: 0, volume: 0, sector: 'Futures', industry: 'Energy' },
  { symbol: 'ZB', name: '30Y T-Bond', change: 0, marketCap: 250, price: 0, volume: 0, sector: 'Futures', industry: 'Bonds' },
  { symbol: 'HG', name: 'Copper', change: 0, marketCap: 180, price: 0, volume: 0, sector: 'Futures', industry: 'Metals' },
  { symbol: 'ZC', name: 'Corn', change: 0, marketCap: 120, price: 0, volume: 0, sector: 'Futures', industry: 'Agriculture' },
  { symbol: 'ZW', name: 'Wheat', change: 0, marketCap: 100, price: 0, volume: 0, sector: 'Futures', industry: 'Agriculture' },
];

const FOREX_DATA: StockData[] = [
  { symbol: 'FXE', name: 'EUR/USD', change: 0, marketCap: 500, price: 0, volume: 0, sector: 'Forex', industry: 'Major' },
  { symbol: 'FXB', name: 'GBP/USD', change: 0, marketCap: 400, price: 0, volume: 0, sector: 'Forex', industry: 'Major' },
  { symbol: 'FXY', name: 'USD/JPY', change: 0, marketCap: 450, price: 0, volume: 0, sector: 'Forex', industry: 'Major' },
  { symbol: 'FXF', name: 'USD/CHF', change: 0, marketCap: 250, price: 0, volume: 0, sector: 'Forex', industry: 'Major' },
  { symbol: 'FXA', name: 'AUD/USD', change: 0, marketCap: 300, price: 0, volume: 0, sector: 'Forex', industry: 'Major' },
  { symbol: 'FXC', name: 'USD/CAD', change: 0, marketCap: 280, price: 0, volume: 0, sector: 'Forex', industry: 'Major' },
  { symbol: 'UUP', name: 'DXY', change: 0, marketCap: 350, price: 0, volume: 0, sector: 'Forex', industry: 'Index' },
];

const COMMODITIES_DATA: StockData[] = [
  { symbol: 'GLD', name: 'Gold ETF', change: 0, marketCap: 500, price: 0, volume: 0, sector: 'Commodities', industry: 'Precious Metals' },
  { symbol: 'SLV', name: 'Silver ETF', change: 0, marketCap: 200, price: 0, volume: 0, sector: 'Commodities', industry: 'Precious Metals' },
  { symbol: 'USO', name: 'Oil ETF', change: 0, marketCap: 450, price: 0, volume: 0, sector: 'Commodities', industry: 'Energy' },
  { symbol: 'UNG', name: 'Natural Gas ETF', change: 0, marketCap: 250, price: 0, volume: 0, sector: 'Commodities', industry: 'Energy' },
  { symbol: 'CPER', name: 'Copper ETF', change: 0, marketCap: 300, price: 0, volume: 0, sector: 'Commodities', industry: 'Industrial Metals' },
  { symbol: 'WEAT', name: 'Wheat ETF', change: 0, marketCap: 120, price: 0, volume: 0, sector: 'Commodities', industry: 'Agriculture' },
  { symbol: 'CORN', name: 'Corn ETF', change: 0, marketCap: 130, price: 0, volume: 0, sector: 'Commodities', industry: 'Agriculture' },
  { symbol: 'DBA', name: 'Agriculture ETF', change: 0, marketCap: 80, price: 0, volume: 0, sector: 'Commodities', industry: 'Agriculture' },
];

// ============ COLOR UTILITIES ============
const getChangeColor = (change: number): string => {
  if (change <= -3) return '#6B1C23';
  if (change <= -2) return '#8B2A32';
  if (change <= -1) return '#B33B42';
  if (change < 0) return '#D4555D';
  if (change === 0) return '#4A4A4A';
  if (change < 1) return '#3D7A4A';
  if (change < 2) return '#2D6B3A';
  if (change < 3) return '#1D5C2A';
  return '#0D4D1A';
};

const getTextColor = (change: number): string => {
  return Math.abs(change) > 0.5 ? '#FFFFFF' : '#E0E0E0';
};

// ============ SQUARIFY ALGORITHM ============
function squarify(
  children: { value: number; data: StockData | SectorData; type: 'stock' | 'sector' }[],
  x: number,
  y: number,
  width: number,
  height: number
): TreemapRect[] {
  if (children.length === 0 || width <= 0 || height <= 0) return [];
  
  const totalValue = children.reduce((sum, c) => sum + c.value, 0);
  if (totalValue === 0) return [];
  
  const results: TreemapRect[] = [];
  let currentX = x;
  let currentY = y;
  let remainingWidth = width;
  let remainingHeight = height;
  let remaining = [...children].sort((a, b) => b.value - a.value);
  
  while (remaining.length > 0) {
    const isVertical = remainingWidth >= remainingHeight;
    const side = isVertical ? remainingHeight : remainingWidth;
    
    let row: typeof remaining = [];
    let rowValue = 0;
    let worstRatio = Infinity;
    
    for (const child of remaining) {
      const testRow = [...row, child];
      const testValue = rowValue + child.value;
      const remainingValue = remaining.reduce((s, c) => s + c.value, 0);
      const areaForRow = (testValue / remainingValue) * remainingWidth * remainingHeight;
      const rowWidth = areaForRow / side;
      
      let testWorst = 0;
      for (const c of testRow) {
        const childArea = (c.value / testValue) * areaForRow;
        const childHeight = childArea / rowWidth;
        const ratio = Math.max(rowWidth / childHeight, childHeight / rowWidth);
        testWorst = Math.max(testWorst, ratio);
      }
      
      if (testWorst <= worstRatio || row.length === 0) {
        row = testRow;
        rowValue = testValue;
        worstRatio = testWorst;
      } else {
        break;
      }
    }
    
    const remainingValue = remaining.reduce((s, c) => s + c.value, 0);
    const areaForRow = (rowValue / remainingValue) * remainingWidth * remainingHeight;
    const rowSize = areaForRow / side;
    
    let offset = 0;
    for (const child of row) {
      const childSize = (child.value / rowValue) * side;
      
      if (isVertical) {
        results.push({
          x: currentX,
          y: currentY + offset,
          width: rowSize,
          height: childSize,
          data: child.data,
          type: child.type
        });
      } else {
        results.push({
          x: currentX + offset,
          y: currentY,
          width: childSize,
          height: rowSize,
          data: child.data,
          type: child.type
        });
      }
      offset += childSize;
    }
    
    if (isVertical) {
      currentX += rowSize;
      remainingWidth -= rowSize;
    } else {
      currentY += rowSize;
      remainingHeight -= rowSize;
    }
    
    remaining = remaining.slice(row.length);
  }
  
  return results;
}

// ============ HELPER: Calculate change from price and previousClose ============
function calculateChange(price: number, previousClose: number): { change: number; changePercent: number } {
  if (!previousClose || previousClose === 0 || !price || price === 0) {
    return { change: 0, changePercent: 0 };
  }
  const change = price - previousClose;
  const changePercent = (change / previousClose) * 100;
  return { 
    change: +change.toFixed(2), 
    changePercent: +changePercent.toFixed(2) 
  };
}

// ============ BACKEND API FETCH FUNCTIONS ============
// FIXED: Added proper fallback calculations when changePercent is 0

async function fetchHeatmapFromBackend(session: MarketSession = 'regular'): Promise<Map<string, { change: number; price: number; volume: number }>> {
  const results = new Map<string, { change: number; price: number; volume: number }>();
  
  try {
    const url = session === 'premarket' 
      ? `${API_BASE_URL}/api/heatmap?session=premarket`
      : `${API_BASE_URL}/api/heatmap`;
    
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.tickers) {
        for (const [symbol, ticker] of Object.entries(data.tickers)) {
          const t = ticker as any;
          const prevClose = t.previousClose || 0;
          const currentPrice = session === 'premarket'
            ? (t.premarketPrice ?? t.extendedHoursPrice ?? t.price ?? t.lastPrice ?? 0)
            : (t.price ?? t.lastPrice ?? 0);
          
          // FIXED: Get changePercent from API, but calculate if it's 0 and we have valid prices
          let changePercent = session === 'premarket' 
            ? (t.premarketChangePercent ?? t.extendedHoursChangePercent ?? t.changePercent ?? t.todaysChangePerc ?? 0)
            : (t.changePercent ?? t.todaysChangePerc ?? 0);
          
          // If changePercent is 0 but we have price data, calculate it ourselves
          if (changePercent === 0 && prevClose > 0 && currentPrice > 0 && currentPrice !== prevClose) {
            const calculated = calculateChange(currentPrice, prevClose);
            changePercent = calculated.changePercent;
          }
          
          results.set(symbol, {
            change: changePercent,
            price: currentPrice,
            volume: t.volume || 0
          });
        }
        return results;
      }
    }
  } catch (e) {
    console.warn('Heatmap endpoint failed, trying fallback:', e);
  }
  
  // Fallback to main market-data endpoint
  try {
    const url = session === 'premarket'
      ? `${API_BASE_URL}/api/fetch-market-data?session=premarket`
      : `${API_BASE_URL}/api/fetch-market-data`;
    
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      
      // Extract from heatmapData if present
      if (data.heatmapData?.tickers) {
        for (const [symbol, ticker] of Object.entries(data.heatmapData.tickers)) {
          const t = ticker as any;
          const prevClose = t.previousClose || 0;
          const currentPrice = session === 'premarket'
            ? (t.premarketPrice ?? t.extendedHoursPrice ?? t.price ?? t.lastPrice ?? 0)
            : (t.price ?? t.lastPrice ?? 0);
          
          let changePercent = session === 'premarket' 
            ? (t.premarketChangePercent ?? t.extendedHoursChangePercent ?? t.changePercent ?? t.todaysChangePerc ?? 0)
            : (t.changePercent ?? t.todaysChangePerc ?? 0);
          
          // Calculate if needed
          if (changePercent === 0 && prevClose > 0 && currentPrice > 0 && currentPrice !== prevClose) {
            const calculated = calculateChange(currentPrice, prevClose);
            changePercent = calculated.changePercent;
          }
          
          results.set(symbol, {
            change: changePercent,
            price: currentPrice,
            volume: t.volume || 0
          });
        }
      }
    }
  } catch (e) {
    console.error('All backend endpoints failed:', e);
    throw e;
  }
  
  return results;
}

async function fetchQuotesFromBackend(
  symbols: string[],
  session: MarketSession = 'regular'
): Promise<Map<string, { change: number; price: number; volume: number }>> {
  const results = new Map<string, { change: number; price: number; volume: number }>();
  
  try {
    const url = session === 'premarket'
      ? `${API_BASE_URL}/api/quotes?symbols=${symbols.join(',')}&session=premarket`
      : `${API_BASE_URL}/api/quotes?symbols=${symbols.join(',')}`;
    
    const response = await fetch(url);
    
    if (response.ok) {
      const quotes = await response.json();
      
      for (const quote of (Array.isArray(quotes) ? quotes : [])) {
        if (quote && quote.symbol) {
          const prevClose = quote.previousClose || 0;
          const currentPrice = session === 'premarket'
            ? (quote.premarketPrice ?? quote.extendedHoursPrice ?? quote.price ?? quote.lastPrice ?? 0)
            : (quote.price ?? quote.lastPrice ?? 0);
          
          // Get changePercent from API
          let changePercent = session === 'premarket'
            ? (quote.premarketChangePercent ?? quote.extendedHoursChangePercent ?? quote.changePercent ?? quote.todaysChangePerc ?? 0)
            : (quote.changePercent ?? quote.todaysChangePerc ?? 0);
          
          // FIXED: Calculate change ourselves if API returns 0 but we have valid price data
          if (changePercent === 0 && prevClose > 0 && currentPrice > 0 && currentPrice !== prevClose) {
            const calculated = calculateChange(currentPrice, prevClose);
            changePercent = calculated.changePercent;
          }
          
          results.set(quote.symbol, {
            change: changePercent,
            price: currentPrice,
            volume: quote.volume || 0
          });
        }
      }
    }
  } catch (e) {
    console.error('Quotes fetch failed:', e);
  }
  
  return results;
}

async function fetchCryptoFromBackend(): Promise<Map<string, { change: number; price: number }>> {
  const results = new Map<string, { change: number; price: number }>();
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/crypto`);
    
    if (response.ok) {
      const data = await response.json();
      
      for (const [symbol, ticker] of Object.entries(data.tickers || data || {})) {
        const t = ticker as any;
        const prevClose = t.previousClose || 0;
        const currentPrice = t.price || t.lastPrice || 0;
        
        let changePercent = t.changePercent || t.todaysChangePerc || 0;
        
        // Calculate if needed
        if (changePercent === 0 && prevClose > 0 && currentPrice > 0 && currentPrice !== prevClose) {
          const calculated = calculateChange(currentPrice, prevClose);
          changePercent = calculated.changePercent;
        }
        
        results.set(symbol, {
          change: changePercent,
          price: currentPrice
        });
      }
    }
  } catch (e) {
    console.warn('Crypto endpoint failed:', e);
  }
  
  return results;
}

async function fetchFuturesFromBackend(session: MarketSession = 'regular'): Promise<Map<string, { change: number; price: number; volume: number }>> {
  const results = new Map<string, { change: number; price: number; volume: number }>();
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/futures`);
    
    if (response.ok) {
      const data = await response.json();
      
      for (const [symbol, ticker] of Object.entries(data.tickers || {})) {
        const t = ticker as any;
        const prevClose = t.previousClose || 0;
        const currentPrice = t.price || 0;
        
        let changePercent = t.changePercent || 0;
        
        // Calculate if needed
        if (changePercent === 0 && prevClose > 0 && currentPrice > 0 && currentPrice !== prevClose) {
          const calculated = calculateChange(currentPrice, prevClose);
          changePercent = calculated.changePercent;
        }
        
        results.set(symbol, {
          change: changePercent,
          price: currentPrice,
          volume: t.volume || 0
        });
      }
    }
  } catch (e) {
    console.warn('Futures endpoint failed, using ETF fallback:', e);
  }
  
  return results;
}

async function fetchCommoditiesFromBackend(session: MarketSession = 'regular'): Promise<Map<string, { change: number; price: number; volume: number }>> {
  const results = new Map<string, { change: number; price: number; volume: number }>();
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/commodities`);
    
    if (response.ok) {
      const data = await response.json();
      
      for (const [symbol, ticker] of Object.entries(data.tickers || {})) {
        const t = ticker as any;
        const prevClose = t.previousClose || 0;
        const currentPrice = t.price || 0;
        
        let changePercent = t.changePercent || 0;
        
        // Calculate if needed
        if (changePercent === 0 && prevClose > 0 && currentPrice > 0 && currentPrice !== prevClose) {
          const calculated = calculateChange(currentPrice, prevClose);
          changePercent = calculated.changePercent;
        }
        
        results.set(symbol, {
          change: changePercent,
          price: currentPrice,
          volume: t.volume || 0
        });
      }
    }
  } catch (e) {
    console.warn('Commodities endpoint failed:', e);
  }
  
  return results;
}

// ============ SESSION BADGE COMPONENT ============
function SessionBadge({ session }: { session: MarketSession }) {
  const config = {
    premarket: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Pre-Market' },
    regular: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Market Open' },
    afterhours: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', label: 'After-Hours' },
    closed: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', label: 'Closed' },
  };
  
  const { bg, text, border, label } = config[session];
  
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${bg} ${text} ${border}`}>
      {label}
    </span>
  );
}

// ============ MAIN COMPONENT ============
export default function HeatmapPage() {
  const [selectedMarket, setSelectedMarket] = useState<MarketKey>('stocks');
  const [stockData, setStockData] = useState<StockData[]>(SP500_STOCKS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [marketStatus, setMarketStatus] = useState<{ isOpen: boolean; session: MarketSession; message: string }>({ 
    isOpen: true, 
    session: 'regular',
    message: '' 
  });
  const [hoveredStock, setHoveredStock] = useState<StockData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    const marketInfo = isUSMarketOpen();
    setMarketStatus(marketInfo);
    
    // Include session in cache key so premarket/regular/afterhours data are cached separately
    const cacheKey = `market_${selectedMarket}_${marketInfo.session}`;
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = cache.get<StockData[]>(cacheKey);
      if (cached) {
        setStockData(cached.data);
        setLastUpdate(new Date(cached.timestamp));
        setLoading(false);
        setError(null);
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    let baseData: StockData[];
    switch (selectedMarket) {
      case 'stocks': baseData = [...SP500_STOCKS]; break;
      case 'sectors': baseData = [...SECTORS_DATA]; break;
      case 'crypto': baseData = [...CRYPTO_DATA]; break;
      case 'indices': baseData = [...INDICES_DATA]; break;
      case 'futures': baseData = [...FUTURES_DATA]; break;
      case 'forex': baseData = [...FOREX_DATA]; break;
      case 'commodities': baseData = [...COMMODITIES_DATA]; break;
      default: baseData = [...SP500_STOCKS];
    }
    
    try {
      if (selectedMarket === 'stocks') {
        // Use bulk heatmap endpoint for stocks with session info
        const quotes = await fetchHeatmapFromBackend(marketInfo.session);
        
        if (quotes.size > 0) {
          baseData = baseData.map(stock => {
            const quote = quotes.get(stock.symbol) || 
                         quotes.get(stock.symbol.replace('-', '.')) ||
                         quotes.get(stock.symbol.replace('.', '-'));
            return {
              ...stock,
              change: quote?.change ?? 0,
              price: quote?.price ?? 0,
              volume: quote?.volume ?? 0
            };
          });
        }
        
      } else if (selectedMarket === 'crypto') {
        const quotes = await fetchCryptoFromBackend();
        
        baseData = baseData.map(crypto => ({
          ...crypto,
          change: quotes.get(crypto.symbol)?.change ?? 0,
          price: quotes.get(crypto.symbol)?.price ?? 0
        }));
        
      } else if (selectedMarket === 'sectors' || selectedMarket === 'indices' || selectedMarket === 'forex') {
        // These use ETF symbols - fetch from quotes endpoint
        const symbols = baseData.map(s => s.symbol);
        const quotes = await fetchQuotesFromBackend(symbols, marketInfo.session);
        
        baseData = baseData.map(item => {
          const quote = quotes.get(item.symbol);
          return {
            ...item,
            change: quote?.change ?? 0,
            price: quote?.price ?? 0,
            volume: quote?.volume ?? 0
          };
        });
        
      } else if (selectedMarket === 'futures') {
        // Use dedicated futures endpoint
        const quotes = await fetchFuturesFromBackend(marketInfo.session);
        
        if (quotes.size > 0) {
          baseData = baseData.map(future => {
            const quote = quotes.get(future.symbol);
            return {
              ...future,
              change: quote?.change ?? 0,
              price: quote?.price ?? 0,
              volume: quote?.volume ?? 0
            };
          });
        } else {
          // Fallback to ETF proxies via quotes endpoint
          const etfMap: Record<string, string> = {
            'ES': 'SPY', 'NQ': 'QQQ', 'YM': 'DIA', 'RTY': 'IWM',
            'CL': 'USO', 'GC': 'GLD', 'SI': 'SLV', 'NG': 'UNG',
            'ZB': 'TLT', 'HG': 'CPER', 'ZC': 'CORN', 'ZW': 'WEAT'
          };
          
          const etfSymbols = Object.values(etfMap);
          const etfQuotes = await fetchQuotesFromBackend(etfSymbols, marketInfo.session);
          
          baseData = baseData.map(future => {
            const etfSymbol = etfMap[future.symbol];
            const quote = etfSymbol ? etfQuotes.get(etfSymbol) : null;
            return {
              ...future,
              change: quote?.change ?? 0,
              price: quote?.price ?? 0,
              volume: quote?.volume ?? 0
            };
          });
        }
      } else if (selectedMarket === 'commodities') {
        // Use dedicated commodities endpoint
        const quotes = await fetchCommoditiesFromBackend(marketInfo.session);
        
        if (quotes.size > 0) {
          baseData = baseData.map(item => {
            const quote = quotes.get(item.symbol);
            return {
              ...item,
              change: quote?.change ?? 0,
              price: quote?.price ?? 0,
              volume: quote?.volume ?? 0
            };
          });
        } else {
          // Fallback to quotes endpoint
          const symbols = baseData.map(s => s.symbol);
          const fallbackQuotes = await fetchQuotesFromBackend(symbols, marketInfo.session);
          
          baseData = baseData.map(item => {
            const quote = fallbackQuotes.get(item.symbol);
            return {
              ...item,
              change: quote?.change ?? 0,
              price: quote?.price ?? 0,
              volume: quote?.volume ?? 0
            };
          });
        }
      }
      
      // Cache the results (use session-aware key)
      cache.set(cacheKey, baseData, marketInfo.isOpen);
      setStockData(baseData);
      setLastUpdate(new Date());
      setError(null);
      
    } catch (err) {
      console.error('Error fetching market data:', err);
      
      // Try to use cached data on error (session-aware key)
      const cached = cache.get<StockData[]>(cacheKey);
      if (cached) {
        setStockData(cached.data);
        setLastUpdate(new Date(cached.timestamp));
        setError(`API error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } else {
        setError(`Failed to fetch data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        // Use static data as last resort
        setStockData(baseData);
      }
    }
    
    setLoading(false);
  }, [selectedMarket]);

  // Initial fetch and interval setup
  useEffect(() => {
    fetchData();
    
    // Set up refresh interval (15 minutes)
    refreshIntervalRef.current = setInterval(() => {
      const marketInfo = isUSMarketOpen();
      // Auto-refresh if market is open (including premarket/afterhours) or it's crypto (24/7)
      if (marketInfo.isOpen || selectedMarket === 'crypto') {
        fetchData();
      }
    }, CACHE_DURATION_MS);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchData, selectedMarket]);

  const sectorData = useMemo((): SectorData[] => {
    const sectorMap = new Map<string, StockData[]>();
    
    for (const stock of stockData) {
      const existing = sectorMap.get(stock.sector) || [];
      existing.push(stock);
      sectorMap.set(stock.sector, existing);
    }
    
    return Array.from(sectorMap.entries())
      .map(([name, stocks]) => ({
        name,
        stocks: stocks.sort((a, b) => b.marketCap - a.marketCap),
        totalMarketCap: stocks.reduce((sum, s) => sum + s.marketCap, 0),
        avgChange: stocks.reduce((sum, s) => sum + s.change, 0) / stocks.length
      }))
      .sort((a, b) => b.totalMarketCap - a.totalMarketCap);
  }, [stockData]);

  const treemapRects = useMemo((): TreemapRect[] => {
    const containerWidth = 1200;
    const containerHeight = 700;
    
    const sectorChildren = sectorData.map(sector => ({
      value: sector.totalMarketCap,
      data: sector,
      type: 'sector' as const
    }));
    
    const sectorRects = squarify(sectorChildren, 0, 0, containerWidth, containerHeight);
    const allRects: TreemapRect[] = [];
    
    for (const sectorRect of sectorRects) {
      const sector = sectorRect.data as SectorData;
      const padding = 2;
      const headerHeight = 18;
      
      allRects.push({ ...sectorRect, type: 'sector' });
      
      const stockChildren = sector.stocks.map(stock => ({
        value: stock.marketCap,
        data: stock,
        type: 'stock' as const
      }));
      
      const innerX = sectorRect.x + padding;
      const innerY = sectorRect.y + headerHeight;
      const innerWidth = sectorRect.width - padding * 2;
      const innerHeight = sectorRect.height - headerHeight - padding;
      
      if (innerWidth > 0 && innerHeight > 0) {
        const stockRects = squarify(stockChildren, innerX, innerY, innerWidth, innerHeight);
        allRects.push(...stockRects);
      }
    }
    
    return allRects;
  }, [sectorData]);

  const MARKETS: { key: MarketKey; label: string }[] = [
    { key: 'stocks', label: 'Stocks' },
    { key: 'sectors', label: 'Sectors' },
    { key: 'crypto', label: 'Crypto' },
    { key: 'indices', label: 'Indices' },
    { key: 'futures', label: 'Futures' },
    { key: 'forex', label: 'Forex' },
    { key: 'commodities', label: 'Commodities' },
  ];

  const formatTimeSinceUpdate = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-white">
            Standard and Poor's 500 index stocks categorized by sectors and industries. Size represents market cap.
          </h1>
          {/* Market Status Banner */}
          <div className="flex items-center gap-2 mt-1 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              marketStatus.session === 'regular' ? 'bg-green-400 animate-pulse' : 
              marketStatus.session === 'premarket' ? 'bg-blue-400 animate-pulse' :
              marketStatus.session === 'afterhours' ? 'bg-purple-400 animate-pulse' :
              'bg-yellow-400'
            }`} />
            <span className={
              marketStatus.session === 'regular' ? 'text-green-400' : 
              marketStatus.session === 'premarket' ? 'text-blue-400' :
              marketStatus.session === 'afterhours' ? 'text-purple-400' :
              'text-yellow-400'
            }>
              {marketStatus.message}
            </span>
            <SessionBadge session={marketStatus.session} />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>Updated {formatTimeSinceUpdate(lastUpdate)}</span>
            </div>
          )}
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1A1A1A] hover:bg-[#252525] text-gray-400 text-sm transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Fullscreen
          </button>
          
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1A1A1A] hover:bg-[#252525] text-gray-400 text-sm transition-colors">
            <Share2 className="h-3.5 w-3.5" />
            Share Map
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded bg-red-900/30 border border-red-800 text-red-300 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Market Selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {MARKETS.map((market) => (
          <button
            key={market.key}
            onClick={() => setSelectedMarket(market.key)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
              selectedMarket === market.key
                ? 'bg-[#C9A646] text-black'
                : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#252525] hover:text-white'
            }`}
          >
            {market.label}
          </button>
        ))}
      </div>

      {/* Treemap Container */}
      <div 
        className="relative bg-[#0D0D0D] rounded overflow-hidden"
        style={{ height: isFullscreen ? 'calc(100vh - 180px)' : '700px' }}
      >
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="flex items-center gap-2 text-white">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading {marketStatus.session === 'premarket' ? 'pre-market' : 'market'} data...</span>
            </div>
          </div>
        )}
        
        <svg 
          viewBox="0 0 1200 700" 
          className="w-full h-full"
          style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}
        >
          {/* Render stocks first */}
          {treemapRects
            .filter(rect => rect.type === 'stock')
            .map((rect, i) => {
              const stock = rect.data as StockData;
              const isHovered = hoveredStock?.symbol === stock.symbol;
              const showLabel = rect.width > 30 && rect.height > 20;
              const showChange = rect.width > 40 && rect.height > 30;
              const fontSize = Math.min(Math.max(rect.width / 5, 7), 13);
              
              // For Forex show pair name, for Futures show name (without =F)
              const isForex = stock.sector === 'Forex';
              const isFutures = stock.sector === 'Futures';
              const isSectors = stock.sector === 'Sectors';
              const displayLabel = (isForex || isFutures) ? stock.name : stock.symbol;
              
              // For Sectors, add industry header at top of each box
              const showSectorHeader = isSectors && rect.width > 50 && rect.height > 40;
              const headerHeight = showSectorHeader ? 14 : 0;
              
              return (
                <g 
                  key={`stock-${stock.symbol}-${i}`}
                  onMouseEnter={() => setHoveredStock(stock)}
                  onMouseLeave={() => setHoveredStock(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={rect.x + 0.5}
                    y={rect.y + 0.5}
                    width={Math.max(rect.width - 1, 0)}
                    height={Math.max(rect.height - 1, 0)}
                    fill={getChangeColor(stock.change)}
                    stroke="#0A0A0A"
                    strokeWidth={0.5}
                    opacity={isHovered ? 1 : 0.92}
                    className="transition-opacity duration-100"
                  />
                  
                  {/* Sector header for Sectors tab */}
                  {showSectorHeader && (
                    <>
                      <rect
                        x={rect.x + 0.5}
                        y={rect.y + 0.5}
                        width={Math.max(rect.width - 1, 0)}
                        height={headerHeight}
                        fill="rgba(0,0,0,0.6)"
                      />
                      <text
                        x={rect.x + 4}
                        y={rect.y + 10}
                        fill="#FFFFFF"
                        fontSize={8}
                        fontWeight="600"
                        opacity={0.9}
                      >
                        {stock.industry.toUpperCase()}
                      </text>
                    </>
                  )}
                  
                  {showLabel && (
                    <>
                      <text
                        x={rect.x + rect.width / 2}
                        y={rect.y + headerHeight + (rect.height - headerHeight) / 2 - (showChange ? 4 : 0)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={getTextColor(stock.change)}
                        fontSize={fontSize}
                        fontWeight="600"
                      >
                        {displayLabel}
                      </text>
                      
                      {showChange && (
                        <text
                          x={rect.x + rect.width / 2}
                          y={rect.y + headerHeight + (rect.height - headerHeight) / 2 + fontSize - 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={getTextColor(stock.change)}
                          fontSize={Math.max(fontSize - 3, 6)}
                          fontWeight="500"
                          opacity={0.9}
                        >
                          {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)}%
                        </text>
                      )}
                    </>
                  )}
                </g>
              );
            })}
          
          {/* Render sector headers on top */}
          {treemapRects
            .filter(rect => rect.type === 'sector')
            .map((rect, i) => {
              const sector = rect.data as SectorData;
              const showHeader = rect.width > 60;
              
              return (
                <g key={`sector-${sector.name}-${i}`}>
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.width}
                    height={rect.height}
                    fill="none"
                    stroke="#333"
                    strokeWidth={1}
                  />
                  
                  {showHeader && (
                    <>
                      <rect
                        x={rect.x}
                        y={rect.y}
                        width={rect.width}
                        height={16}
                        fill="rgba(0,0,0,0.75)"
                      />
                      
                      <text
                        x={rect.x + 4}
                        y={rect.y + 11}
                        fill="#FFFFFF"
                        fontSize={9}
                        fontWeight="600"
                        style={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}
                      >
                        {sector.name.toUpperCase()}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
        </svg>
        
        {/* Hover Tooltip */}
        {hoveredStock && (
          <div className="absolute top-4 right-4 bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 shadow-xl z-50 min-w-[200px]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white">{hoveredStock.symbol}</span>
              <span className={`font-semibold ${hoveredStock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {hoveredStock.change > 0 ? '+' : ''}{hoveredStock.change.toFixed(2)}%
              </span>
            </div>
            <div className="text-sm text-gray-400">{hoveredStock.name}</div>
            <div className="text-xs text-gray-500 mt-1">
              {hoveredStock.sector} • {hoveredStock.industry}
            </div>
            {marketStatus.session === 'premarket' && (
              <div className="text-xs text-blue-400 mt-1">
                Pre-market data
              </div>
            )}
            {hoveredStock.price > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Price: ${hoveredStock.price.toFixed(2)}
              </div>
            )}
            {hoveredStock.volume > 0 && (
              <div className="text-xs text-gray-500">
                Volume: {(hoveredStock.volume / 1000000).toFixed(2)}M
              </div>
            )}
            <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-700">
              Double-click a ticker to display detailed information in a new window.
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 mt-4">
        {[
          { color: '#6B1C23', label: '-3%' },
          { color: '#8B2A32', label: '-2%' },
          { color: '#B33B42', label: '-1%' },
          { color: '#4A4A4A', label: '0%' },
          { color: '#3D7A4A', label: '+1%' },
          { color: '#2D6B3A', label: '+2%' },
          { color: '#0D4D1A', label: '+3%' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-8 h-4 rounded" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-500 mr-2">{label}</span>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-gray-600">
        <span>Data refreshes every 15 minutes during market hours (including pre-market 4:00 AM - 9:30 AM ET).</span>
        <span>Double-click a ticker to display detailed information in a new window.</span>
      </div>
    </div>
  );
}