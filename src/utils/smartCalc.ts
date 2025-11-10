// src/utils/smartCalc.ts
// 🚀 UPDATED: Pure utility functions - no hooks!

export type Direction = "LONG" | "SHORT" | "UNKNOWN";
export type AssetClass = "stocks"|"futures"|"forex"|"crypto"|"options";

// 🚀 OPTIMIZATION 1: Cache formatNumber results
const formatCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

export function formatNumber(n: number, fractionDigits=2): string {
  if (!isFinite(n)) return "—";
  
  const cacheKey = `${n}-${fractionDigits}`;
  
  if (formatCache.has(cacheKey)) {
    return formatCache.get(cacheKey)!;
  }
  
  const formatted = n.toLocaleString(undefined, { 
    minimumFractionDigits: fractionDigits, 
    maximumFractionDigits: fractionDigits 
  });
  
  if (formatCache.size < MAX_CACHE_SIZE) {
    formatCache.set(cacheKey, formatted);
  }
  
  return formatted;
}

// 🔥 NEW: Format R value with optional dollar amount
export function formatR(rValue: number, dollarAmount?: number): string {
  const rFormatted = rValue >= 0 ? `+${rValue.toFixed(2)}R` : `${rValue.toFixed(2)}R`;
  if (dollarAmount !== undefined) {
    const dollarFormatted = dollarAmount >= 0 
      ? `+$${formatNumber(Math.abs(dollarAmount), 0)}` 
      : `-$${formatNumber(Math.abs(dollarAmount), 0)}`;
    return `${rFormatted} (${dollarFormatted})`;
  }
  return rFormatted;
}

// 🔥 NEW: Convert dollars to R
// ✅ Now requires oneR to be passed as parameter
export function dollarsToR(dollarAmount: number, oneRValue: number): number {
  if (oneRValue === 0) return 0;
  return dollarAmount / oneRValue;
}

// 🔥 NEW: Get risk zone based on user's R
export function getRiskZone(userRiskR: number): {
  zone: 'green' | 'yellow' | 'orange' | 'red';
  label: string;
  color: string;
} {
  if (userRiskR <= 1) {
    return { zone: 'green', label: 'Conservative', color: 'text-emerald-400' };
  } else if (userRiskR <= 2) {
    return { zone: 'yellow', label: 'Moderate', color: 'text-yellow-400' };
  } else if (userRiskR <= 3) {
    return { zone: 'orange', label: 'Aggressive', color: 'text-orange-400' };
  } else {
    return { zone: 'red', label: 'Dangerous', color: 'text-red-400' };
  }
}

// 🚀 OPTIMIZATION 2: Simplified debounce
export function debounce<T extends (...args:any[])=>void>(fn:T, ms=150){
  let t: NodeJS.Timeout;
  return (...args:any[]) => {
    clearTimeout(t);
    t = setTimeout(()=>fn(...args), ms);
  };
}

// 🚀 OPTIMIZATION 3: Pure function for direction inference
export function inferDirection(entry?: number, sl?: number, tp?: number): Direction {
  if (entry==null || sl==null || tp==null || isNaN(entry) || isNaN(sl) || isNaN(tp)) {
    return "UNKNOWN";
  }
  
  if (tp > entry && sl < entry) return "LONG";
  if (tp < entry && sl > entry) return "SHORT";
  
  return "UNKNOWN";
}

// 🚀 OPTIMIZATION 4: Compile regexes once
const FOREX_REGEX = /([A-Z]{6})$/;
const CRYPTO_REGEX = /(USDT|USDC|BTC|ETH)$/;
const FUTURES_REGEX = /\b(ES|NQ|YM|CL|GC|SI|ZN|ZB|6E|6J|6B|MES|MNQ|M2K|MGC)\b/;
const OPTIONS_REGEX = /\b(C|P)\b\d+|\b\d{1,2}[CP]\b/i;

export function detectAssetClass(symbol?: string): AssetClass | undefined {
  if (!symbol) return undefined;
  
  const s = symbol.toUpperCase().replace(/\s+/g,'');
  
  if (FUTURES_REGEX.test(s)) return "futures";
  if (CRYPTO_REGEX.test(s)) return "crypto";
  if (FOREX_REGEX.test(s) && s.length === 6) return "forex";
  if (OPTIONS_REGEX.test(s)) return "options";
  
  return "stocks";
}

// 🚀 OPTIMIZATION 5: Efficient R:R computation
// ✅ IMPORTANT: oneRValue must be passed as parameter!
export function computeRR(params: {
  entry?: number; 
  sl?: number; 
  tp?: number;
  qty?: number; 
  multiplier?: number;
  fees?: number;
  side?: Direction;
  assetClass?: AssetClass;
  pipSize?: number;
  tickValue?: number;
  cryptoPricePerCoin?: number;
  oneRValue?: number; // ✅ Pass this from useRiskSettings().oneR
}) {
  const entry = Number(params.entry || 0);
  const sl = Number(params.sl || 0);
  const tp = Number(params.tp || 0);
  const qty = Number(params.qty || 0);
  const mult = Number(params.multiplier ?? 1);
  const fees = Number(params.fees || 0);
  const oneR = Number(params.oneRValue || 0);
  
  const side = (params.side && params.side !== "UNKNOWN") 
    ? params.side 
    : inferDirection(entry, sl, tp);
  
  const cls = params.assetClass;

  let riskPts = 0, rewardPts = 0, conflict = false;
  
  if (side === "LONG") {
    riskPts = entry - sl;
    rewardPts = tp - entry;
    conflict = !(tp > entry && sl < entry);
  } else if (side === "SHORT") {
    riskPts = sl - entry;
    rewardPts = entry - tp;
    conflict = !(tp < entry && sl > entry);
  } else {
    conflict = true;
  }

  const rr = riskPts > 0 ? (rewardPts / riskPts) : 0;

  let riskUSD = 0, rewardUSD = 0;

  if (cls === "stocks" || cls === "crypto") {
    riskUSD = Math.max(0, riskPts) * qty * mult;
    rewardUSD = Math.max(0, rewardPts) * qty * mult;
  } else if (cls === "futures") {
    const tickValue = params.tickValue || mult || 12.5;
    riskUSD = Math.max(0, riskPts) * qty * tickValue;
    rewardUSD = Math.max(0, rewardPts) * qty * tickValue;
  } else if (cls === "forex") {
    const pipSize = params.pipSize || 0.0001;
    const pipValuePerLot = mult || 10;
    const pipsRisk = Math.max(0, riskPts / pipSize);
    const pipsReward = Math.max(0, rewardPts / pipSize);
    riskUSD = pipsRisk * pipValuePerLot * qty;
    rewardUSD = pipsReward * pipValuePerLot * qty;
  } else if (cls === "options") {
    riskUSD = Math.max(0, riskPts) * 100 * qty;
    rewardUSD = Math.max(0, rewardPts) * 100 * qty;
  }

  riskUSD += fees;

  let user_risk_r: number | undefined;
  let user_reward_r: number | undefined;
  
  if (oneR && oneR > 0) {
    user_risk_r = riskUSD / oneR;
    user_reward_r = rewardUSD / oneR;
  }

  return {
    side,
    rr,
    riskPts,
    rewardPts,
    riskUSD,
    rewardUSD,
    conflict,
    user_risk_r,
    user_reward_r,
  };
}

// 🚀 OPTIMIZATION 6: Inline color determination
export function rrColor(rr:number): string {
  if (rr <= 0 || !isFinite(rr)) return "text-red-400";
  if (rr < 1) return "text-red-400";
  if (rr < 2) return "text-amber-300";
  return "text-emerald-400";
}

export function getRRColorClass(rr: number): string {
  if (rr < 1) return "text-red-400";
  if (rr < 1.5) return "text-orange-400";
  if (rr < 2) return "text-yellow-400";
  return "text-emerald-400";
}