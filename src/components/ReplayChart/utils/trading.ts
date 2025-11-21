// utils/trading.ts - SIMPLE HELPER FUNCTIONS ONLY
import { Side } from '../types';

/**
 * ===================================
 * TRADING UTILITY FUNCTIONS
 * Simple calculation helpers
 * ===================================
 */

/**
 * Calculate P&L for a position
 */
export function calculatePnL(
  side: Side,
  entryPrice: number,
  exitPrice: number,
  size: number
): {
  pnl: number;
  pnlPercent: number;
  pips: number;
} {
  let pnl: number;
  let pnlPercent: number;
  let pips: number;

  if (side === Side.BUY) {
    // Long position
    pnl = (exitPrice - entryPrice) * size;
    pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
    pips = exitPrice - entryPrice;
  } else {
    // Short position
    pnl = (entryPrice - exitPrice) * size;
    pnlPercent = ((entryPrice - exitPrice) / entryPrice) * 100;
    pips = entryPrice - exitPrice;
  }

  return {
    pnl,
    pnlPercent,
    pips,
  };
}

/**
 * Calculate R-Multiple
 * R-Multiple = Actual P&L / Initial Risk
 */
export function calculateRMultiple(pnl: number, initialRisk: number): number {
  if (initialRisk === 0 || !initialRisk) {
    return 0;
  }
  return pnl / initialRisk;
}

/**
 * Apply slippage to price
 */
export function applySlippage(
  price: number,
  side: Side,
  slippageRate: number
): number {
  if (side === Side.BUY) {
    return price * (1 + slippageRate); // Buy higher
  } else {
    return price * (1 - slippageRate); // Sell lower
  }
}

/**
 * Calculate commission cost
 */
export function calculateCommission(
  size: number,
  price: number,
  commissionRate: number
): number {
  return size * price * commissionRate;
}

/**
 * Calculate position size based on risk
 */
export function calculatePositionSize(
  accountBalance: number,
  riskPercentage: number,
  entryPrice: number,
  stopLoss: number
): number {
  const riskAmount = accountBalance * (riskPercentage / 100);
  const priceRisk = Math.abs(entryPrice - stopLoss);
  
  if (priceRisk === 0) {
    return 0;
  }
  
  return riskAmount / priceRisk;
}

/**
 * Calculate stop loss price based on percentage
 */
export function calculateStopLoss(
  entryPrice: number,
  side: Side,
  stopLossPercent: number
): number {
  if (side === Side.BUY) {
    return entryPrice * (1 - stopLossPercent / 100);
  } else {
    return entryPrice * (1 + stopLossPercent / 100);
  }
}

/**
 * Calculate take profit price based on R-multiple
 */
export function calculateTakeProfit(
  entryPrice: number,
  stopLoss: number,
  side: Side,
  rMultiple: number
): number {
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = risk * rMultiple;
  
  if (side === Side.BUY) {
    return entryPrice + reward;
  } else {
    return entryPrice - reward;
  }
}

/**
 * Format price with proper decimals
 */
export function formatPrice(price: number, decimals: number = 2): string {
  return price.toFixed(decimals);
}

/**
 * Format P&L with color
 */
export function formatPnL(pnl: number, decimals: number = 2): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}${pnl.toFixed(decimals)}`;
}

/**
 * Format percentage
 */
export function formatPercent(percent: number, decimals: number = 2): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(decimals)}%`;
}