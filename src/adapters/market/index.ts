import { env } from '../../env.js';
import * as mock from './mock.provider.js';
import * as binance from './binance.provider.js';
import * as fx from './exchangeratehost.provider.js';
import * as fred from './fred.provider.js';
import * as yahoo from './equities.yahoo.provider.js';

export type ProviderModule = {
  listSymbols: (type: 'crypto' | 'fx') => Promise<any[]>,
  getQuote: (ticker: string) => Promise<any>,
  getCandles: (ticker: string, timeframe: string, limit?: number) => Promise<any[]>
};

export function getProvider(name?: string): ProviderModule {
  const p = (name || env.MARKET_PROVIDER || 'mock').toLowerCase();
  if (p === 'binance') return binance as any;
  if (p === 'exchangerate' || p === 'fx') return fx as any;
  if (p === 'fred' || p === 'macro') return fred as any;
  if (p === 'yahoo' || p === 'equities' || p === 'equity') return yahoo as any;
  return mock as any;
}
