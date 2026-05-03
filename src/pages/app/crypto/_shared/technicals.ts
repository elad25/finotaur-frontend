// ============================================================
// TECHNICAL ANALYSIS — Client-side indicator calculations
// Computed from Kline data to avoid extra server calls
// ============================================================

import type { KlineData, TechnicalSignal } from './types';
type SignalStrength = TechnicalSignal['signal'];

// ── Simple Moving Average ────────────────────────────────────
export function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(sum / period);
  }
  return result;
}

// ── Exponential Moving Average ───────────────────────────────
export function ema(data: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    if (prev === null) {
      // First EMA = SMA
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j];
      prev = sum / period;
    } else {
      prev = data[i] * k + prev * (1 - k);
    }
    result.push(prev);
  }
  return result;
}

// ── RSI (Relative Strength Index) ────────────────────────────
export function rsi(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (closes.length < period + 1) return closes.map(() => null);

  let avgGain = 0;
  let avgLoss = 0;

  // First average
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
    result.push(null);
  }
  avgGain /= period;
  avgLoss /= period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs));

  // Subsequent values (smoothed)
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const r = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + r));
  }
  return result;
}

// ── MACD ─────────────────────────────────────────────────────
export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function macd(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDResult {
  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);
  const macdLine: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (fastEma[i] != null && slowEma[i] != null) {
      macdLine.push(fastEma[i]! - slowEma[i]!);
    } else {
      macdLine.push(null);
    }
  }

  const validMacd = macdLine.filter((v): v is number => v != null);
  const signalLine = ema(validMacd, signalPeriod);

  // Align signal back to full array
  const fullSignal: (number | null)[] = [];
  let si = 0;
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] != null) {
      fullSignal.push(signalLine[si] ?? null);
      si++;
    } else {
      fullSignal.push(null);
    }
  }

  const histogram: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] != null && fullSignal[i] != null) {
      histogram.push(macdLine[i]! - fullSignal[i]!);
    } else {
      histogram.push(null);
    }
  }

  return { macd: macdLine, signal: fullSignal, histogram };
}

// ── Bollinger Bands ──────────────────────────────────────────
export interface BollingerResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
  width: (number | null)[];
}

export function bollingerBands(closes: number[], period = 20, stdDev = 2): BollingerResult {
  const mid = sma(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const width: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (mid[i] == null || i < period - 1) {
      upper.push(null);
      lower.push(null);
      width.push(null);
      continue;
    }
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      variance += Math.pow(closes[j] - mid[i]!, 2);
    }
    const sd = Math.sqrt(variance / period);
    upper.push(mid[i]! + stdDev * sd);
    lower.push(mid[i]! - stdDev * sd);
    width.push(mid[i]! > 0 ? ((stdDev * sd * 2) / mid[i]!) * 100 : null);
  }

  return { upper, middle: mid, lower, width };
}

// ── Volume Analysis ──────────────────────────────────────────
export function volumeSpike(volumes: number[], lookback = 7): {
  current: number;
  average: number;
  ratio: number;
  isSpike: boolean;
} {
  if (volumes.length < lookback + 1) {
    return { current: 0, average: 0, ratio: 0, isSpike: false };
  }
  const current = volumes[volumes.length - 1];
  const recent = volumes.slice(-lookback - 1, -1);
  const average = recent.reduce((a, b) => a + b, 0) / recent.length;
  const ratio = average > 0 ? current / average : 0;
  return { current, average, ratio, isSpike: ratio > 2.0 };
}

// ── Pivot Points (Support/Resistance) ────────────────────────
export function pivotPoints(high: number, low: number, close: number) {
  const pp = (high + low + close) / 3;
  return {
    pp,
    r1: 2 * pp - low,
    r2: pp + (high - low),
    r3: high + 2 * (pp - low),
    s1: 2 * pp - high,
    s2: pp - (high - low),
    s3: low - 2 * (high - pp),
  };
}

// ── Generate Market Signals ──────────────────────────────────
export function generateSignals(klines: KlineData[]): TechnicalSignal[] {
  if (klines.length < 50) return [];

  const closes = klines.map(k => k.close);
  const volumes = klines.map(k => k.volume);
  const signals: TechnicalSignal[] = [];

  // 1. Trend Direction (EMA 20 vs EMA 50)
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const lastEma20 = ema20[ema20.length - 1];
  const lastEma50 = ema50[ema50.length - 1];
  if (lastEma20 != null && lastEma50 != null) {
    const bullish = lastEma20 > lastEma50;
    signals.push({
      id: 'trend',
      label: 'Trend Direction',
      value: bullish ? 'Bullish' : 'Bearish',
      signal: bullish ? 'bullish' : 'bearish',
      description: bullish
        ? 'EMA 20 above EMA 50 — uptrend in progress'
        : 'EMA 20 below EMA 50 — downtrend active',
      icon: bullish ? '📈' : '📉',
    });
  }

  // 2. RSI Status
  const rsiValues = rsi(closes, 14);
  const lastRsi = rsiValues[rsiValues.length - 1];
  if (lastRsi != null) {
    let signal: SignalStrength = 'neutral';
    let value = `${lastRsi.toFixed(1)}`;
    let desc = 'RSI in neutral zone';
    if (lastRsi < 30) { signal = 'strong_bullish'; desc = 'Oversold — potential bounce zone'; }
    else if (lastRsi < 40) { signal = 'bullish'; desc = 'Approaching oversold territory'; }
    else if (lastRsi > 70) { signal = 'strong_bearish'; desc = 'Overbought — caution advised'; }
    else if (lastRsi > 60) { signal = 'bearish'; desc = 'Approaching overbought territory'; }
    signals.push({ id: 'rsi', label: 'RSI (14)', value, signal, description: desc, icon: '⚡' });
  }

  // 3. MACD Crossover
  const macdResult = macd(closes);
  const macdLen = macdResult.histogram.length;
  if (macdLen >= 2) {
    const curr = macdResult.histogram[macdLen - 1];
    const prev = macdResult.histogram[macdLen - 2];
    if (curr != null && prev != null) {
      const crossedBullish = prev < 0 && curr >= 0;
      const crossedBearish = prev > 0 && curr <= 0;
      if (crossedBullish || crossedBearish) {
        signals.push({
          id: 'macd',
          label: 'MACD Crossover',
          value: crossedBullish ? 'Bullish' : 'Bearish',
          signal: crossedBullish ? 'bullish' : 'bearish',
          description: crossedBullish
            ? 'Bullish MACD crossover detected'
            : 'Bearish MACD crossover detected',
          icon: '🔀',
        });
      } else {
        signals.push({
          id: 'macd',
          label: 'MACD',
          value: curr > 0 ? 'Positive' : 'Negative',
          signal: curr > 0 ? 'bullish' : 'bearish',
          description: `MACD histogram at ${curr.toFixed(4)}`,
          icon: '🔀',
        });
      }
    }
  }

  // 4. Volume Anomaly
  const volData = volumeSpike(volumes, 7);
  if (volData.ratio > 0) {
    const isSpike = volData.ratio > 2.0;
    signals.push({
      id: 'volume',
      label: 'Volume Anomaly',
      value: `${(volData.ratio * 100).toFixed(0)}% of avg`,
      signal: isSpike ? 'strong_bullish' : 'neutral',
      description: isSpike
        ? `Volume ${(volData.ratio * 100).toFixed(0)}% above 7-day average — significant activity`
        : 'Volume within normal range',
      icon: '📊',
    });
  }

  // 5. Bollinger Squeeze
  const bb = bollingerBands(closes, 20, 2);
  const widths = bb.width.filter((w): w is number => w != null);
  if (widths.length > 10) {
    const avgWidth = widths.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, widths.length);
    const currWidth = widths[widths.length - 1];
    const isSqueeze = currWidth < avgWidth * 0.6;
    signals.push({
      id: 'bollinger',
      label: 'Bollinger Bands',
      value: isSqueeze ? 'Squeeze' : 'Normal',
      signal: isSqueeze ? 'bullish' : 'neutral',
      description: isSqueeze
        ? 'Bands narrowing — breakout expected soon'
        : 'Bands at normal width',
      icon: '🎯',
    });
  }

  // 6. Price vs Major MAs
  const ema200 = ema(closes, 200);
  const lastPrice = closes[closes.length - 1];
  const lastEma200 = ema200[ema200.length - 1];
  if (lastEma200 != null) {
    const aboveAll = lastPrice > (lastEma20 || 0) && lastPrice > (lastEma50 || 0) && lastPrice > lastEma200;
    const belowAll = lastPrice < (lastEma20 || Infinity) && lastPrice < (lastEma50 || Infinity) && lastPrice < lastEma200;
    signals.push({
      id: 'price_vs_ma',
      label: 'Price vs MAs',
      value: aboveAll ? 'Strong Uptrend' : belowAll ? 'Strong Downtrend' : 'Mixed',
      signal: aboveAll ? 'strong_bullish' : belowAll ? 'strong_bearish' : 'neutral',
      description: aboveAll
        ? 'Price above all major MAs — strong uptrend'
        : belowAll
        ? 'Price below all major MAs — strong downtrend'
        : 'Price between moving averages — consolidation',
      icon: aboveAll ? '🚀' : belowAll ? '⚠️' : '↔️',
    });
  }

  return signals;
}
