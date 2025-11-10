export type AssetType = 'stock' | 'futures' | 'forex' | 'crypto' | 'options' | 'unknown';

export type FuturesMeta = {
  symbol: string;
  tickSize: number;
  tickValue: number;
};

export const FUTURES_META: Record<string, FuturesMeta> = {
  ES: { symbol: 'ES', tickSize: 0.25, tickValue: 12.5 },
  MES:{ symbol: 'MES', tickSize: 0.25, tickValue: 1.25 },
  NQ: { symbol: 'NQ', tickSize: 0.25, tickValue: 5 },
  MNQ:{ symbol: 'MNQ', tickSize: 0.25, tickValue: 0.5 },
  YM: { symbol: 'YM', tickSize: 1,    tickValue: 5 },
  CL: { symbol: 'CL', tickSize: 0.01, tickValue: 10 },
  GC: { symbol: 'GC', tickSize: 0.1,  tickValue: 10 },
  RTY:{ symbol: 'RTY',tickSize: 0.1,  tickValue: 5 },
  ZN: { symbol: 'ZN', tickSize: 0.015625, tickValue: 15.625 },
};

const FX_MAJORS = [
  'EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD','NZDUSD','EURJPY','EURGBP','GBPJPY'
];

function isForex(s: string) {
  const clean = s.replace('/', '').toUpperCase();
  return (clean.length === 6 && /^[A-Z]{6}$/.test(clean)) || FX_MAJORS.includes(clean);
}

function isCrypto(s: string) {
  const u = s.toUpperCase();
  return /-?USD(T)?$/.test(u) || ['BTC','ETH','SOL','ADA','BNB','XRP'].some(x => u.startsWith(x));
}

function isFutures(s: string) {
  const u = s.toUpperCase().replace(/[^A-Z]/g,'');
  const roots = Object.keys(FUTURES_META);
  return roots.some(r => u.startsWith(r));
}

export function classifyAsset(symbolRaw: string): AssetType {
  const s = (symbolRaw || '').toUpperCase().trim();
  if (!s) return 'unknown';
  if (/\b(\d{6,8}).*[CP]\b/.test(s) || /\b(C|P)\b/.test(s)) return 'options';
  if (isForex(s)) return 'forex';
  if (isCrypto(s)) return 'crypto';
  if (isFutures(s)) return 'futures';
  return 'stock';
}

export function futuresMetaFor(symbolRaw: string): FuturesMeta | null {
  const u = (symbolRaw || '').toUpperCase().replace(/[^A-Z]/g,'');
  const roots = Object.keys(FUTURES_META);
  const r = roots.find(r => u.startsWith(r));
  return r ? FUTURES_META[r] : null;
}
