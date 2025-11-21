// constants/timeframes.ts - UNIFIED VERSION
import { TimeframeConfig } from '../types';

/**
 * ✅ SINGLE SOURCE OF TRUTH for timeframes
 * Uses TimeframeConfig from types/index.ts
 */
export const TIMEFRAMES: TimeframeConfig[] = [
  { 
    value: '1m', 
    label: '1 minute', 
    seconds: 60, 
    minutes: 1, 
    limit: 1000, 
    binanceInterval: '1m' 
  },
  { 
    value: '3m', 
    label: '3 minutes', 
    seconds: 180, 
    minutes: 3, 
    limit: 1000, 
    binanceInterval: '3m' 
  },
  { 
    value: '5m', 
    label: '5 minutes', 
    seconds: 300, 
    minutes: 5, 
    limit: 1000, 
    binanceInterval: '5m' 
  },
  { 
    value: '15m', 
    label: '15 minutes', 
    seconds: 900, 
    minutes: 15, 
    limit: 1000, 
    binanceInterval: '15m' 
  },
  { 
    value: '30m', 
    label: '30 minutes', 
    seconds: 1800, 
    minutes: 30, 
    limit: 1000, 
    binanceInterval: '30m' 
  },
  { 
    value: '1h', 
    label: '1 hour', 
    seconds: 3600, 
    minutes: 60, 
    limit: 1000, 
    binanceInterval: '1h' 
  },
  { 
    value: '2h', 
    label: '2 hours', 
    seconds: 7200, 
    minutes: 120, 
    limit: 1000, 
    binanceInterval: '2h' 
  },
  { 
    value: '4h', 
    label: '4 hours', 
    seconds: 14400, 
    minutes: 240, 
    limit: 1000, 
    binanceInterval: '4h' 
  },
  { 
    value: '1d', 
    label: '1 day', 
    seconds: 86400, 
    minutes: 1440, 
    limit: 1000, 
    binanceInterval: '1d' 
  },
  { 
    value: '1w', 
    label: '1 week', 
    seconds: 604800, 
    minutes: 10080, 
    limit: 1000, 
    binanceInterval: '1w' 
  },
  { 
    value: '1M', 
    label: '1 month', 
    seconds: 2592000, 
    minutes: 43200, 
    limit: 1000, 
    binanceInterval: '1M' 
  },
];

/**
 * Helper to find timeframe by value
 */
export const getTimeframeConfig = (value: string): TimeframeConfig | undefined => {
  return TIMEFRAMES.find(tf => tf.value === value);
};

/**
 * Helper to get Binance interval string
 */
export const getBinanceInterval = (value: string): string | undefined => {
  return getTimeframeConfig(value)?.binanceInterval;
};