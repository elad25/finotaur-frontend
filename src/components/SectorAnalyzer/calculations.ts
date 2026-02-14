// =====================================================
// 🧮 CALCULATIONS - Financial & Technical Calculations
// src/components/SectorAnalyzer/calculations.ts
// =====================================================

import type { Company, FinancialMetrics, TechnicalData, ValuationModel, GrowthEstimates } from './companyTypes';

// =====================================================
// 💰 VALUATION CALCULATIONS
// =====================================================

/**
 * Calculate Discounted Cash Flow (DCF) Value
 */
export function calculateDCF(
  freeCashFlow: number,
  growthRate: number,
  terminalGrowthRate: number,
  wacc: number,
  yearsToProject: number = 10,
  sharesOutstanding: number
): { intrinsicValue: number; perShareValue: number; breakdown: { year: number; fcf: number; discountedFcf: number }[] } {
  const breakdown: { year: number; fcf: number; discountedFcf: number }[] = [];
  let totalPV = 0;
  let currentFCF = freeCashFlow;

  // Project FCF for each year
  for (let year = 1; year <= yearsToProject; year++) {
    currentFCF = currentFCF * (1 + growthRate);
    const discountFactor = Math.pow(1 + wacc, year);
    const discountedFCF = currentFCF / discountFactor;
    totalPV += discountedFCF;
    
    breakdown.push({
      year,
      fcf: currentFCF,
      discountedFcf: discountedFCF,
    });
  }

  // Calculate Terminal Value
  const terminalFCF = currentFCF * (1 + terminalGrowthRate);
  const terminalValue = terminalFCF / (wacc - terminalGrowthRate);
  const discountedTerminalValue = terminalValue / Math.pow(1 + wacc, yearsToProject);
  
  const intrinsicValue = totalPV + discountedTerminalValue;
  const perShareValue = intrinsicValue / sharesOutstanding;

  return { intrinsicValue, perShareValue, breakdown };
}

/**
 * Calculate Comparable Valuation (using multiples)
 */
export function calculateComparableValuation(
  company: Company,
  peerAverages: { pe: number; evEbitda: number; ps: number }
): { peBasedValue: number; evEbitdaBasedValue: number; psBasedValue: number; averageValue: number } {
  const peBasedValue = company.eps * peerAverages.pe;
  const evEbitdaBasedValue = (company.enterpriseValue / company.evToEbitda) * peerAverages.evEbitda / (company.marketCap / company.price);
  const psBasedValue = (company.marketCap / company.priceToSales) * peerAverages.ps / (company.marketCap / company.price);
  
  const averageValue = (peBasedValue + evEbitdaBasedValue + psBasedValue) / 3;

  return { peBasedValue, evEbitdaBasedValue, psBasedValue, averageValue };
}

/**
 * Calculate PEG Ratio
 */
export function calculatePEG(peRatio: number, earningsGrowthRate: number): number {
  if (earningsGrowthRate <= 0) return Infinity;
  return peRatio / earningsGrowthRate;
}

/**
 * Calculate Enterprise Value
 */
export function calculateEnterpriseValue(
  marketCap: number,
  totalDebt: number,
  cash: number,
  preferredStock: number = 0,
  minorityInterest: number = 0
): number {
  return marketCap + totalDebt - cash + preferredStock + minorityInterest;
}

/**
 * Calculate WACC (Weighted Average Cost of Capital)
 */
export function calculateWACC(
  marketCapEquity: number,
  totalDebt: number,
  costOfEquity: number,
  costOfDebt: number,
  taxRate: number
): number {
  const totalCapital = marketCapEquity + totalDebt;
  const weightEquity = marketCapEquity / totalCapital;
  const weightDebt = totalDebt / totalCapital;
  
  return (weightEquity * costOfEquity) + (weightDebt * costOfDebt * (1 - taxRate));
}

/**
 * Calculate Cost of Equity using CAPM
 */
export function calculateCostOfEquity(
  riskFreeRate: number,
  beta: number,
  marketRiskPremium: number
): number {
  return riskFreeRate + (beta * marketRiskPremium);
}

// =====================================================
// 📊 PROFITABILITY RATIOS
// =====================================================

/**
 * Calculate Return on Equity (ROE)
 */
export function calculateROE(netIncome: number, shareholderEquity: number): number {
  if (shareholderEquity === 0) return 0;
  return (netIncome / shareholderEquity) * 100;
}

/**
 * Calculate Return on Assets (ROA)
 */
export function calculateROA(netIncome: number, totalAssets: number): number {
  if (totalAssets === 0) return 0;
  return (netIncome / totalAssets) * 100;
}

/**
 * Calculate Return on Invested Capital (ROIC)
 */
export function calculateROIC(
  nopat: number,
  investedCapital: number
): number {
  if (investedCapital === 0) return 0;
  return (nopat / investedCapital) * 100;
}

/**
 * Calculate Gross Margin
 */
export function calculateGrossMargin(revenue: number, costOfRevenue: number): number {
  if (revenue === 0) return 0;
  return ((revenue - costOfRevenue) / revenue) * 100;
}

/**
 * Calculate Operating Margin
 */
export function calculateOperatingMargin(operatingIncome: number, revenue: number): number {
  if (revenue === 0) return 0;
  return (operatingIncome / revenue) * 100;
}

/**
 * Calculate Net Margin
 */
export function calculateNetMargin(netIncome: number, revenue: number): number {
  if (revenue === 0) return 0;
  return (netIncome / revenue) * 100;
}

/**
 * Calculate Free Cash Flow Margin
 */
export function calculateFCFMargin(freeCashFlow: number, revenue: number): number {
  if (revenue === 0) return 0;
  return (freeCashFlow / revenue) * 100;
}

// =====================================================
// 💪 FINANCIAL HEALTH RATIOS
// =====================================================

/**
 * Calculate Current Ratio
 */
export function calculateCurrentRatio(currentAssets: number, currentLiabilities: number): number {
  if (currentLiabilities === 0) return Infinity;
  return currentAssets / currentLiabilities;
}

/**
 * Calculate Quick Ratio (Acid Test)
 */
export function calculateQuickRatio(
  currentAssets: number,
  inventory: number,
  currentLiabilities: number
): number {
  if (currentLiabilities === 0) return Infinity;
  return (currentAssets - inventory) / currentLiabilities;
}

/**
 * Calculate Debt to Equity Ratio
 */
export function calculateDebtToEquity(totalDebt: number, shareholderEquity: number): number {
  if (shareholderEquity === 0) return Infinity;
  return totalDebt / shareholderEquity;
}

/**
 * Calculate Interest Coverage Ratio
 */
export function calculateInterestCoverage(ebit: number, interestExpense: number): number {
  if (interestExpense === 0) return Infinity;
  return ebit / interestExpense;
}

/**
 * Calculate Free Cash Flow
 */
export function calculateFreeCashFlow(
  operatingCashFlow: number,
  capitalExpenditures: number
): number {
  return operatingCashFlow - Math.abs(capitalExpenditures);
}

// =====================================================
// 📈 TECHNICAL INDICATORS
// =====================================================

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
}

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  
  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate MACD
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number; signal: number; histogram: number } {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  const macd = fastEMA - slowEMA;
  
  // For signal line, we'd need historical MACD values
  // Simplified version using current MACD
  const signal = macd * 0.9; // Approximation
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number; middle: number; lower: number } {
  const sma = calculateSMA(prices, period);
  const slice = prices.slice(-period);
  
  const squaredDiffs = slice.map(price => Math.pow(price - sma, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: sma + (stdDevMultiplier * stdDev),
    middle: sma,
    lower: sma - (stdDevMultiplier * stdDev),
  };
}

/**
 * Calculate ATR (Average True Range)
 */
export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number {
  if (highs.length < period + 1) return 0;

  const trueRanges: number[] = [];
  
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }

  return calculateSMA(trueRanges, period);
}

/**
 * Calculate Stochastic Oscillator
 */
export function calculateStochastic(
  closes: number[],
  highs: number[],
  lows: number[],
  kPeriod: number = 14,
  dPeriod: number = 3
): { k: number; d: number } {
  if (closes.length < kPeriod) return { k: 50, d: 50 };

  const periodHighs = highs.slice(-kPeriod);
  const periodLows = lows.slice(-kPeriod);
  const currentClose = closes[closes.length - 1];
  
  const highestHigh = Math.max(...periodHighs);
  const lowestLow = Math.min(...periodLows);
  
  const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  const d = k * 0.9; // Simplified - would need historical K values for proper calculation

  return { k, d };
}

/**
 * Calculate Volume Ratio
 */
export function calculateVolumeRatio(currentVolume: number, averageVolume: number): number {
  if (averageVolume === 0) return 1;
  return currentVolume / averageVolume;
}

/**
 * Calculate Support and Resistance Levels
 */
export function calculateSupportResistance(
  price: number,
  high: number,
  low: number,
  close: number
): { pivot: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number } {
  const pivot = (high + low + close) / 3;
  
  return {
    pivot,
    r1: (2 * pivot) - low,
    r2: pivot + (high - low),
    r3: high + 2 * (pivot - low),
    s1: (2 * pivot) - high,
    s2: pivot - (high - low),
    s3: low - 2 * (high - pivot),
  };
}

// =====================================================
// 📊 SCORING FUNCTIONS
// =====================================================

/**
 * Calculate Momentum Score (0-100)
 */
export function calculateMomentumScore(
  rsi: number,
  priceVsSMA20: number,
  priceVsSMA50: number,
  priceVsSMA200: number,
  volumeRatio: number
): number {
  let score = 0;
  
  // RSI component (0-25)
  if (rsi >= 30 && rsi <= 70) score += 15;
  else if (rsi > 50 && rsi <= 80) score += 20;
  else if (rsi > 70) score += 25;
  else score += 5;
  
  // Price vs SMAs (0-45)
  if (priceVsSMA20 > 0) score += 15;
  if (priceVsSMA50 > 0) score += 15;
  if (priceVsSMA200 > 0) score += 15;
  
  // Volume component (0-30)
  if (volumeRatio > 1.5) score += 30;
  else if (volumeRatio > 1.2) score += 20;
  else if (volumeRatio > 0.8) score += 10;
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate Value Score (0-100)
 */
export function calculateValueScore(
  peRatio: number,
  pegRatio: number,
  priceToBook: number,
  priceToSales: number,
  evToEbitda: number
): number {
  let score = 0;
  
  // P/E component (0-25)
  if (peRatio < 15) score += 25;
  else if (peRatio < 25) score += 20;
  else if (peRatio < 35) score += 10;
  else score += 0;
  
  // PEG component (0-25)
  if (pegRatio < 1) score += 25;
  else if (pegRatio < 1.5) score += 20;
  else if (pegRatio < 2) score += 10;
  else score += 0;
  
  // P/B component (0-15)
  if (priceToBook < 3) score += 15;
  else if (priceToBook < 5) score += 10;
  else score += 0;
  
  // P/S component (0-15)
  if (priceToSales < 3) score += 15;
  else if (priceToSales < 5) score += 10;
  else score += 0;
  
  // EV/EBITDA component (0-20)
  if (evToEbitda < 10) score += 20;
  else if (evToEbitda < 15) score += 15;
  else if (evToEbitda < 20) score += 10;
  else score += 0;
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate Quality Score (0-100)
 */
export function calculateQualityScore(
  roe: number,
  roa: number,
  grossMargin: number,
  netMargin: number,
  currentRatio: number,
  debtToEquity: number
): number {
  let score = 0;
  
  // ROE component (0-20)
  if (roe > 20) score += 20;
  else if (roe > 15) score += 15;
  else if (roe > 10) score += 10;
  else score += 5;
  
  // ROA component (0-15)
  if (roa > 10) score += 15;
  else if (roa > 5) score += 10;
  else score += 5;
  
  // Margins (0-30)
  if (grossMargin > 50) score += 15;
  else if (grossMargin > 30) score += 10;
  else score += 5;
  
  if (netMargin > 20) score += 15;
  else if (netMargin > 10) score += 10;
  else score += 5;
  
  // Financial health (0-35)
  if (currentRatio > 2) score += 15;
  else if (currentRatio > 1.5) score += 12;
  else if (currentRatio > 1) score += 8;
  else score += 0;
  
  if (debtToEquity < 0.5) score += 20;
  else if (debtToEquity < 1) score += 15;
  else if (debtToEquity < 2) score += 10;
  else score += 0;
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate Growth Score (0-100)
 */
export function calculateGrowthScore(
  revenueGrowthYoy: number,
  earningsGrowthYoy: number,
  revenueGrowth3Y: number,
  earningsGrowth3Y: number
): number {
  let score = 0;
  
  // Revenue growth YoY (0-25)
  if (revenueGrowthYoy > 30) score += 25;
  else if (revenueGrowthYoy > 20) score += 20;
  else if (revenueGrowthYoy > 10) score += 15;
  else if (revenueGrowthYoy > 0) score += 10;
  else score += 0;
  
  // Earnings growth YoY (0-25)
  if (earningsGrowthYoy > 50) score += 25;
  else if (earningsGrowthYoy > 30) score += 20;
  else if (earningsGrowthYoy > 15) score += 15;
  else if (earningsGrowthYoy > 0) score += 10;
  else score += 0;
  
  // Revenue growth 3Y CAGR (0-25)
  if (revenueGrowth3Y > 25) score += 25;
  else if (revenueGrowth3Y > 15) score += 20;
  else if (revenueGrowth3Y > 8) score += 15;
  else if (revenueGrowth3Y > 0) score += 10;
  else score += 0;
  
  // Earnings growth 3Y CAGR (0-25)
  if (earningsGrowth3Y > 30) score += 25;
  else if (earningsGrowth3Y > 20) score += 20;
  else if (earningsGrowth3Y > 10) score += 15;
  else if (earningsGrowth3Y > 0) score += 10;
  else score += 0;
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate Overall FINOTAUR Score
 */
export function calculateFinotaurScore(
  momentumScore: number,
  valueScore: number,
  qualityScore: number,
  growthScore: number,
  weights: { momentum: number; value: number; quality: number; growth: number } = { momentum: 0.25, value: 0.2, quality: 0.3, growth: 0.25 }
): number {
  const weightedScore = (
    momentumScore * weights.momentum +
    valueScore * weights.value +
    qualityScore * weights.quality +
    growthScore * weights.growth
  );
  
  return Math.round(weightedScore);
}

// =====================================================
// 📉 RISK CALCULATIONS
// =====================================================

/**
 * Calculate Beta
 */
export function calculateBeta(
  stockReturns: number[],
  marketReturns: number[]
): number {
  if (stockReturns.length !== marketReturns.length || stockReturns.length < 2) return 1;

  const n = stockReturns.length;
  const avgStock = stockReturns.reduce((sum, r) => sum + r, 0) / n;
  const avgMarket = marketReturns.reduce((sum, r) => sum + r, 0) / n;

  let covariance = 0;
  let marketVariance = 0;

  for (let i = 0; i < n; i++) {
    covariance += (stockReturns[i] - avgStock) * (marketReturns[i] - avgMarket);
    marketVariance += Math.pow(marketReturns[i] - avgMarket, 2);
  }

  if (marketVariance === 0) return 1;
  return covariance / marketVariance;
}

/**
 * Calculate Sharpe Ratio
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number
): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  return (avgReturn - riskFreeRate) / stdDev;
}

/**
 * Calculate Maximum Drawdown
 */
export function calculateMaxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;

  let maxDrawdown = 0;
  let peak = prices[0];

  for (const price of prices) {
    if (price > peak) {
      peak = price;
    }
    const drawdown = (peak - price) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown * 100;
}

/**
 * Calculate Value at Risk (VaR) - Historical Method
 */
export function calculateVaR(
  returns: number[],
  confidenceLevel: number = 0.95
): number {
  if (returns.length === 0) return 0;

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
  
  return Math.abs(sortedReturns[index]) * 100;
}

// =====================================================
// 🔧 UTILITY FUNCTIONS
// =====================================================

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 */
export function calculateCAGR(
  beginningValue: number,
  endingValue: number,
  years: number
): number {
  if (beginningValue <= 0 || years <= 0) return 0;
  return (Math.pow(endingValue / beginningValue, 1 / years) - 1) * 100;
}

/**
 * Calculate Percentage Change
 */
export function calculatePercentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * Format Large Numbers
 */
export function formatLargeNumber(num: number): string {
  if (Math.abs(num) >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
}

/**
 * Calculate Z-Score
 */
export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}