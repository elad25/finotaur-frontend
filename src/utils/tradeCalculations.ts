// ================================================================
// CENTRALIZED TRADE CALCULATIONS - SINGLE SOURCE OF TRUTH
// ================================================================
// This file contains ALL trade calculation logic used across the app
// DO NOT duplicate these calculations elsewhere

// 🎯 ASSET MULTIPLIERS - SINGLE SOURCE OF TRUTH
export const ASSET_MULTIPLIERS: Record<string, { class: string; mult: number }> = {
  // E-mini Futures
  NQ: { class: "futures", mult: 20 },
  MNQ: { class: "futures", mult: 2 },
  ES: { class: "futures", mult: 50 },
  MES: { class: "futures", mult: 5 },
  YM: { class: "futures", mult: 5 },
  MYM: { class: "futures", mult: 0.5 },
  RTY: { class: "futures", mult: 50 },
  M2K: { class: "futures", mult: 5 },
  
  // Energy
  CL: { class: "futures", mult: 1000 },
  MCL: { class: "futures", mult: 100 },
  QM: { class: "futures", mult: 500 },
  NG: { class: "futures", mult: 10000 },
  QG: { class: "futures", mult: 2500 },
  
  // Metals
  GC: { class: "futures", mult: 100 },
  MGC: { class: "futures", mult: 10 },
  SI: { class: "futures", mult: 5000 },
  SIL: { class: "futures", mult: 1000 },
  
  // Bonds
  ZB: { class: "futures", mult: 1000 },
  ZN: { class: "futures", mult: 1000 },
  ZF: { class: "futures", mult: 1000 },
  ZT: { class: "futures", mult: 2000 },
  
  // Currencies
  "6E": { class: "futures", mult: 12.5 },
  M6E: { class: "futures", mult: 6.25 },
  "6B": { class: "futures", mult: 62500 },
  "6J": { class: "futures", mult: 12500000 },
  "6A": { class: "futures", mult: 100000 },

  // Metals (extended) / Grains (Agricultural)
  HG: { class: "futures", mult: 25000 },
  ZC: { class: "futures", mult: 50 },
  ZW: { class: "futures", mult: 50 },
  ZS: { class: "futures", mult: 50 },

  // Crypto
  BTC: { class: "futures", mult: 5 },
  MBT: { class: "futures", mult: 0.1 },
} as const;

import { normalizeSymbol } from './normalizeSymbol';
import { normalizeAssetClass } from './assetClass';

// Helper: Get multiplier for symbol.
// Tries the exact symbol first, then falls back to the futures root
// (e.g. "MNQM6" → "MNQ") so contracts with expiry suffixes resolve correctly.
//
// Optional assetClass param: if the caller knows the asset class and it is NOT
// "futures", AND the symbol has no expiry suffix (bare root like "BTC" or "AAPL"),
// return 1 immediately — spot stocks/crypto/forex carry no contract multiplier.
// All existing call sites omit assetClass and get identical behavior (backward compatible).
export function getAssetMultiplier(symbol: string, assetClass?: string): number {
  if (!symbol) return 1;
  const symbolUpper = symbol.toUpperCase().trim();

  // Spot-asset guard: if caller declares a non-futures class AND the symbol is
  // already normalized (no expiry suffix), skip the futures multiplier table.
  if (assetClass && assetClass !== 'futures' && normalizeSymbol(symbolUpper) === symbolUpper) {
    return 1;
  }

  if (ASSET_MULTIPLIERS[symbolUpper]) return ASSET_MULTIPLIERS[symbolUpper].mult;
  const root = normalizeSymbol(symbolUpper);
  if (root && root !== symbolUpper && ASSET_MULTIPLIERS[root]) return ASSET_MULTIPLIERS[root].mult;
  return 1;
}

// Helper: Get asset class for symbol (with futures-root fallback).
// Returns a canonical asset-class token via normalizeAssetClass; unknown symbols → 'stock'.
export function getAssetClass(symbol: string): string {
  if (!symbol) return 'stock';
  const symbolUpper = symbol.toUpperCase().trim();
  const rawClass = ASSET_MULTIPLIERS[symbolUpper]?.class
    ?? ((() => { const root = normalizeSymbol(symbolUpper); return root && root !== symbolUpper ? ASSET_MULTIPLIERS[root]?.class : null; })())
    ?? 'stock';
  return normalizeAssetClass(rawClass) ?? 'stock';
}

// Helper: Detect asset class from symbol (auto-detection, with root fallback).
// Returns a canonical asset-class token, or null when the symbol is not recognised.
export function detectAssetClass(symbol: string): string | null {
  if (!symbol) return null;
  const symbolUpper = symbol.toUpperCase().trim();
  const rawClass = ASSET_MULTIPLIERS[symbolUpper]?.class
    ?? ((() => { const root = normalizeSymbol(symbolUpper); return root && root !== symbolUpper ? ASSET_MULTIPLIERS[root]?.class : null; })())
    ?? null;
  if (!rawClass) return null;
  return normalizeAssetClass(rawClass);
}

// ================================================================
// FOREX / CRYPTO HELPERS — SINGLE SOURCE OF TRUTH
// ================================================================

/**
 * Compute estimated liquidation price for a leveraged crypto position.
 * Formula: simplified isolated-margin estimate that ignores maintenance
 * margin and exchange-specific fees — show as an estimate only.
 *
 * LONG  → entryPrice * (1 - 1 / leverage)
 * SHORT → entryPrice * (1 + 1 / leverage)
 *
 * Returns null when inputs are insufficient or invalid.
 */
export function computeLiquidationPrice(args: {
  entryPrice?: number;
  leverage?: number;
  side?: 'LONG' | 'SHORT';
}): number | null {
  const { entryPrice, leverage, side } = args;
  if (
    !entryPrice || !Number.isFinite(entryPrice) || entryPrice <= 0 ||
    !leverage || !Number.isFinite(leverage) || leverage <= 1 ||
    (side !== 'LONG' && side !== 'SHORT')
  ) {
    return null;
  }
  if (side === 'LONG') {
    return entryPrice * (1 - 1 / leverage);
  }
  return entryPrice * (1 + 1 / leverage);
}

/**
 * Returns the pip size for a forex symbol.
 * Single source of truth — currently duplicated inline in useRiskRR.tsx.
 *
 * Rules: uppercase, strip non-letters.
 *   - Ends with 'JPY' → 0.01
 *   - Otherwise       → 0.0001
 */
export function getPipSize(symbol?: string): number {
  const s = (symbol ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  return s.endsWith('JPY') ? 0.01 : 0.0001;
}

/**
 * Parse a forex pair string into { base, quote }.
 * Accepts formats: 'EURUSD', 'EUR/USD', 'eurusd'.
 * Strips non-letters, uppercases, then expects exactly 6 letters.
 * Returns { base: null, quote: null } for anything that doesn't match.
 */
export function parseForexPair(symbol?: string): { base: string | null; quote: string | null } {
  const s = (symbol ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 6) {
    return { base: s.slice(0, 3), quote: s.slice(3, 6) };
  }
  return { base: null, quote: null };
}

/**
 * Derive the effective quote rate for a forex trade.
 *
 * Deterministic case: if the pair's quote currency matches the account
 * currency, the rate is exactly 1 (no conversion needed).
 *
 * Otherwise: returns `current` if it is a finite number > 0 (preserves
 * any manual entry), or 1 as a safe fallback.
 *
 * NOTE: cross-currency live quote-rate fetch is deferred to a server-side
 * FX endpoint (not implemented here).
 */
export function computeQuoteRate(args: {
  symbol?: string;
  accountCurrency?: string;
  current?: number;
}): number {
  const { symbol, accountCurrency, current } = args;
  const { quote } = parseForexPair(symbol);
  if (quote && accountCurrency && quote === accountCurrency.toUpperCase()) {
    return 1;
  }
  if (current !== undefined && Number.isFinite(current) && current > 0) {
    return current;
  }
  return 1;
}

// ================================================================
// CORE CALCULATION FUNCTIONS
// ================================================================

export interface TradeMetrics {
  riskPts: number;
  rewardPts: number;
  riskUSD: number;
  rewardUSD: number;
  rr: number; // Planned R:R (e.g., 1:2.5)
  actual_r?: number; // Actual R achieved (e.g., +1.8R)
  // 🔥 User's personal R multiples
  user_risk_r?: number; // How many R's the user is risking (based on their 1R setting)
  user_reward_r?: number; // How many R's the user can make (based on their 1R setting)
  user_actual_r?: number; // How many R's the user actually made (based on their 1R setting)
}

export interface Trade {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entry_price: number;
  stop_price: number;
  take_profit_price?: number;
  exit_price?: number;
  quantity: number;
  fees: number;
  pnl?: number;
  outcome?: "WIN" | "LOSS" | "BE" | "OPEN";
  metrics?: TradeMetrics;
  // Additional fields
  rr?: number;
  risk_usd?: number;
  reward_usd?: number;
  risk_pts?: number;
  reward_pts?: number;
  actual_r?: number;
  user_risk_r?: number;
  user_reward_r?: number;
  user_actual_r?: number;
  strategy_id?: string;
  strategy_name?: string;
  open_at: string;
  close_at?: string;
  // Asset-class-aware fields (all optional — no existing call sites break)
  asset_class?: string;
  multiplier?: number;
  funding_paid?: number;
  quote_rate?: number;
  lot_size?: number;
  leverage?: number;
  option_type?: "CALL" | "PUT";
  strike_price?: number;
  expiration_date?: string;
  underlying_symbol?: string;
  option_outcome?: string | null;
  position_type?: string;
  strategy_type?: string | null;
}

// ================================================================
// ASSET-CLASS-AWARE HELPERS
// ================================================================

/**
 * Returns the effective contract multiplier for a trade.
 * - Options: always 100 (standard US equity option contract, 100 shares/contract).
 *   We do NOT rely on the symbol appearing in ASSET_MULTIPLIERS for options.
 * - All other classes: delegates to getAssetMultiplier(symbol, assetClass) unchanged,
 *   preserving existing behavior for futures, stocks, crypto, and forex.
 */
export function getEffectiveMultiplier(trade: Pick<Trade, 'symbol' | 'asset_class'>): number {
  const assetClass = normalizeAssetClass(trade.asset_class ?? getAssetClass(trade.symbol));
  if (assetClass === 'options') return 100;
  return getAssetMultiplier(trade.symbol, assetClass ?? undefined);
}

/**
 * Converts a price-difference in points to a USD value for a given trade.
 * This is the single "points → USD" conversion shared by calculatePnL,
 * calculateActualR, and calculateTradeMetrics so the three stay in sync.
 *
 * Asset-class rules:
 *   options : points * quantity * 100
 *   forex   : units (quantity * lot_size, or quantity if no lot_size) * points * quote_rate
 *   crypto  : points * quantity * getAssetMultiplier(symbol, 'crypto')
 *             NOTE: leverage does NOT change realized P&L — it affects margin only.
 *   futures / stocks / default : points * quantity * getAssetMultiplier(symbol, assetClass)
 *             Byte-identical to the pre-existing formula for these two classes.
 */
export function pointsToUsd(trade: Trade, points: number): number {
  const assetClass = normalizeAssetClass(trade.asset_class ?? getAssetClass(trade.symbol));

  if (assetClass === 'options') {
    // Standard US equity option: 100 shares per contract
    return points * trade.quantity * 100;
  }

  if (assetClass === 'forex') {
    // lot_size converts lots → units (e.g. standard lot = 100,000 units).
    // quote_rate converts quote-currency P&L to account currency (usually USD).
    const units = trade.lot_size ? trade.quantity * trade.lot_size : trade.quantity;
    return points * units * (trade.quote_rate ?? 1);
  }

  if (assetClass === 'crypto') {
    // Leverage does NOT change realized P&L — it only affects margin/risk sizing.
    // funding_paid is subtracted separately in calculatePnL (not here).
    return points * trade.quantity * getAssetMultiplier(trade.symbol, 'crypto');
  }

  // futures / stocks / default — identical to pre-existing formula
  return points * trade.quantity * getAssetMultiplier(trade.symbol, assetClass);
}

/**
 * Calculate planned R:R ratio based on entry, stop, and take profit
 * This is the PLAN before trade execution
 */
export function calculatePlannedRR(
  entryPrice: number,
  stopPrice: number,
  takeProfitPrice: number | undefined,
  side: "LONG" | "SHORT"
): number {
  if (!takeProfitPrice || takeProfitPrice <= 0) return 0;
  if (entryPrice <= 0 || stopPrice <= 0) return 0;
  
  const riskPts = Math.abs(entryPrice - stopPrice);
  const rewardPts = Math.abs(entryPrice - takeProfitPrice);
  
  // Validate direction
  if (side === "LONG") {
    if (stopPrice >= entryPrice || takeProfitPrice <= entryPrice) return 0;
  } else {
    if (stopPrice <= entryPrice || takeProfitPrice >= entryPrice) return 0;
  }
  
  return riskPts > 0 ? rewardPts / riskPts : 0;
}

/**
 * Calculate actual R based on REAL exit price.
 * This is what ACTUALLY happened.
 *
 * Asset-class awareness is handled by pointsToUsd(): options use 100x,
 * forex uses units*quote_rate, crypto uses the crypto multiplier, and
 * futures/stocks use the existing ASSET_MULTIPLIERS table — identical to before.
 *
 * The optional `trade` parameter lets callers pass the full Trade object so
 * pointsToUsd() can use lot_size / quote_rate / etc.  When omitted the function
 * falls back to a synthetic Trade with only symbol and side set (backward-compat
 * for all existing call sites that pass individual scalar arguments).
 */
export function calculateActualR(
  entryPrice: number,
  stopPrice: number,
  exitPrice: number,
  quantity: number,
  symbol: string,
  side: "LONG" | "SHORT",
  fees: number = 0,
  trade?: Partial<Trade>
): number {
  if (!exitPrice || exitPrice <= 0) return 0;

  // Build a minimal Trade-like object so pointsToUsd can apply asset-class logic.
  // Any extra fields (lot_size, quote_rate, etc.) come from the optional `trade` param.
  const tradeCtx = {
    symbol,
    side,
    quantity,
    fees,
    entry_price: entryPrice,
    stop_price: stopPrice,
    exit_price: exitPrice,
    ...trade,
  } as Trade;

  // Calculate risk in USD (what you could have lost)
  const riskPts = Math.abs(entryPrice - stopPrice);
  const riskUSD = pointsToUsd(tradeCtx, riskPts);

  if (riskUSD === 0) return 0;

  // Calculate actual net P&L
  const priceDiff = side === "LONG"
    ? exitPrice - entryPrice
    : entryPrice - exitPrice;

  const grossPnL = pointsToUsd(tradeCtx, priceDiff);
  // For crypto, also subtract funding_paid if present
  const fundingAdj = normalizeAssetClass(tradeCtx.asset_class ?? getAssetClass(symbol)) === 'crypto'
    ? (tradeCtx.funding_paid ?? 0)
    : 0;
  const netPnL = grossPnL - fees - fundingAdj;

  // Actual R = (What you made or lost) / (What you risked)
  return netPnL / riskUSD;
}

/**
 * Calculate P&L from trade data.
 * Returns NET P&L after fees (and funding for crypto).
 *
 * Short-circuit: if trade.pnl is already set (stored in DB), return it as-is —
 * behavior UNCHANGED from before.
 *
 * When recomputing from prices, asset-class dispatch via pointsToUsd():
 *   OPTIONS : grossPnL = priceDiff * quantity * 100
 *   FOREX   : grossPnL = priceDiff * units * quote_rate
 *   CRYPTO  : grossPnL = priceDiff * quantity * cryptoMultiplier
 *             netPnL   = grossPnL - fees - funding_paid
 *             NOTE: leverage does NOT change realized P&L — it affects margin only.
 *   FUTURES / STOCKS / default : priceDiff * quantity * ASSET_MULTIPLIERS[symbol] - fees
 *             Byte-identical to the pre-existing formula for these two classes.
 */
export function calculatePnL(trade: Trade): number {
  // Use stored PnL if available — unchanged short-circuit
  if (trade.pnl !== undefined && trade.pnl !== null) {
    return trade.pnl;
  }

  // If no exit, P&L is 0
  if (!trade.exit_price || trade.exit_price <= 0) {
    return 0;
  }

  // Price direction: positive means trade moved in our favor
  const priceDiff = trade.side === "LONG"
    ? trade.exit_price - trade.entry_price
    : trade.entry_price - trade.exit_price;

  const grossPnL = pointsToUsd(trade, priceDiff);

  // Crypto: also subtract funding_paid (perp/perpetual swap carry cost).
  // For all other classes funding_paid is undefined/0, so this is a no-op.
  const assetClass = normalizeAssetClass(trade.asset_class ?? getAssetClass(trade.symbol));
  const fundingAdj = assetClass === 'crypto' ? (trade.funding_paid ?? 0) : 0;

  const netPnL = grossPnL - trade.fees - fundingAdj;
  return netPnL;
}

/**
 * Calculate all trade metrics for display.
 * @param oneRValue - User's configured 1R value (from risk settings). If provided, calculates user_risk_r and user_reward_r.
 * @param trade     - Optional full Trade object. When supplied, pointsToUsd() uses asset-class fields
 *                    (lot_size, quote_rate, funding_paid, etc.) for correct USD scaling.
 *                    When omitted the function behaves exactly as before (backward-compatible).
 *
 * Asset-class-aware USD scaling is handled entirely by pointsToUsd():
 *   - options  : 100x multiplier
 *   - forex    : units * quote_rate
 *   - crypto   : crypto multiplier (leverage excluded — affects margin only)
 *   - futures/stocks/default : ASSET_MULTIPLIERS table — byte-identical to pre-existing behavior
 */
export function calculateTradeMetrics(
  entryPrice: number,
  stopPrice: number,
  takeProfitPrice: number | undefined,
  exitPrice: number | undefined,
  quantity: number,
  symbol: string,
  side: "LONG" | "SHORT",
  fees: number = 0,
  oneRValue?: number, // 🔥 User's 1R setting
  trade?: Partial<Trade> // optional full trade for asset-class-aware USD scaling
): TradeMetrics {
  // Build a minimal Trade context so pointsToUsd can apply asset-class logic.
  const tradeCtx = {
    symbol,
    side,
    quantity,
    fees,
    entry_price: entryPrice,
    stop_price: stopPrice,
    exit_price: exitPrice,
    ...trade,
  } as Trade;

  // Risk calculation (points and USD)
  const riskPts = Math.abs(entryPrice - stopPrice);
  const riskUSD = pointsToUsd(tradeCtx, riskPts);

  // Reward calculation (points and USD)
  const rewardPts = takeProfitPrice ? Math.abs(entryPrice - takeProfitPrice) : 0;
  const rewardUSD = rewardPts > 0 ? pointsToUsd(tradeCtx, rewardPts) : 0;

  // Planned R:R (traditional calculation — unchanged)
  const rr = calculatePlannedRR(entryPrice, stopPrice, takeProfitPrice, side);

  // Actual R (only if trade is closed) — pass full trade context for asset-class-aware scaling
  const actual_r = exitPrice
    ? calculateActualR(entryPrice, stopPrice, exitPrice, quantity, symbol, side, fees, tradeCtx)
    : undefined;

  // 🔥 User's personal R multiples (based on their 1R setting)
  let user_risk_r: number | undefined;
  let user_reward_r: number | undefined;
  let user_actual_r: number | undefined;

  if (oneRValue && oneRValue > 0) {
    // Calculate how many R's the user is risking
    user_risk_r = riskUSD / oneRValue;

    // Calculate how many R's the user can potentially make
    user_reward_r = rewardUSD / oneRValue;

    // Calculate how many R's the user actually made (if trade closed)
    if (exitPrice && actual_r !== undefined) {
      const actualPnL = calculatePnL({
        ...tradeCtx,
        entry_price: entryPrice,
        exit_price: exitPrice,
        stop_price: stopPrice,
        quantity,
        symbol,
        side,
        fees,
      } as Trade);

      user_actual_r = actualPnL / oneRValue;
    }
  }

  return {
    riskPts,
    rewardPts,
    riskUSD,
    rewardUSD,
    rr,
    actual_r,
    user_risk_r,
    user_reward_r,
    user_actual_r,
  };
}

/**
 * Determine trade outcome
 */
export function getTradeOutcome(pnl: number, hasExit: boolean): "WIN" | "LOSS" | "BE" | "OPEN" {
  if (!hasExit) return "OPEN";
  if (pnl > 0) return "WIN";
  if (pnl < 0) return "LOSS";
  return "BE";
}

/**
 * Calculate outcome from trade
 */
export function calculateOutcome(pnl: number): "WIN" | "LOSS" | "BE" | "OPEN" {
  if (pnl === 0) return "OPEN";
  if (pnl > 0) return "WIN";
  if (pnl < 0) return "LOSS";
  return "BE";
}

/**
 * Auto-detect trade side from prices
 */
export function autoDetectSide(params: {
  entryPrice: number;
  stopPrice: number;
  takeProfitPrice?: number;
}): "LONG" | "SHORT" | null {
  const { entryPrice, stopPrice, takeProfitPrice } = params;
  
  if (!entryPrice || !stopPrice || !takeProfitPrice) return null;
  
  if (takeProfitPrice > entryPrice && stopPrice < entryPrice) return "LONG";
  if (takeProfitPrice < entryPrice && stopPrice > entryPrice) return "SHORT";
  
  return null;
}

/**
 * Get R:R color class for UI
 */
export function getRRColorClass(rr: number): string {
  if (rr < 1) return "text-red-400";
  if (rr < 1.5) return "text-orange-400";
  if (rr < 2) return "text-yellow-400";
  return "text-emerald-400";
}

/**
 * Get quantity label based on asset class
 */
export function getQuantityLabel(assetClass: string): string {
  switch (assetClass) {
    case "futures": return "Contracts";
    case "forex": return "Lots";
    case "crypto": return "Units";
    default: return "Shares";
  }
}

/**
 * Calculate duration between two timestamps
 */
export function calculateDuration(openAt: string, closeAt?: string): string {
  const start = new Date(openAt);
  const end = closeAt ? new Date(closeAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

// ================================================================
// OPTIONS-SPECIFIC HELPERS (single-leg)
// ================================================================
//
// All helpers below are options-only: they return null / no-op for any
// trade whose asset_class is not 'options', or when the required option
// fields (strike_price, expiration_date, option_type) are missing. They
// never touch the stock / future / forex / crypto code paths.
//
// Premium convention: entry_price / exit_price hold the option PREMIUM
// per share. One US equity option contract = 100 shares, so dollar
// figures multiply by quantity * 100 (consistent with pointsToUsd()).

/** Bounded/unbounded dollar figure for option max-loss / max-profit. */
export interface OptionExtremum {
  /** Dollar value when bounded; null when theoretically unbounded. */
  value: number | null;
  /** True when the figure is theoretically unlimited (e.g. long call upside). */
  unlimited: boolean;
}

/** True when this trade is a single-leg option with the fields we need. */
function isOptionTrade(trade: Pick<Trade, 'asset_class'>): boolean {
  return normalizeAssetClass(trade.asset_class) === 'options';
}

/** Strip time-of-day so DTE is measured in whole calendar days (local). */
function toDayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Days to expiration from `asOf` (default: now) to `expirationDate`.
 * Returns null when no expiration date is provided / parseable.
 * Can be negative for an already-expired contract.
 */
export function getDTE(expirationDate?: string, asOf?: string): number | null {
  if (!expirationDate) return null;
  const exp = new Date(expirationDate);
  if (Number.isNaN(exp.getTime())) return null;
  const from = asOf ? new Date(asOf) : new Date();
  if (Number.isNaN(from.getTime())) return null;
  return Math.round((toDayStart(exp) - toDayStart(from)) / 86400000);
}

/**
 * Days to expiration measured at the moment the position was opened
 * (open_at → expiration_date). Useful for DTE-bucket analytics.
 */
export function getDTEAtEntry(trade: Pick<Trade, 'asset_class' | 'expiration_date' | 'open_at'>): number | null {
  if (!isOptionTrade(trade)) return null;
  return getDTE(trade.expiration_date, trade.open_at);
}

/**
 * Option breakeven at expiration (excludes fees/commissions for clarity):
 *   CALL → strike + premium paid
 *   PUT  → strike − premium paid
 * Returns null for non-options or when strike/premium/type are missing.
 */
export function getOptionBreakeven(
  trade: Pick<Trade, 'asset_class' | 'option_type' | 'strike_price' | 'entry_price'>
): number | null {
  if (!isOptionTrade(trade)) return null;
  const { option_type, strike_price, entry_price } = trade;
  if (!option_type || strike_price == null || entry_price == null) return null;
  return option_type === 'CALL' ? strike_price + entry_price : strike_price - entry_price;
}

/**
 * Maximum theoretical loss in account currency.
 *   LONG option  → premium paid (entry_price * qty * 100) + fees. Bounded.
 *   SHORT option → naked downside is large/undefined → reported as unlimited.
 * (Defined spreads are out of scope for single-leg; SHORT is conservatively
 *  flagged unlimited rather than guessing a bound.)
 */
export function getOptionMaxLoss(
  trade: Pick<Trade, 'asset_class' | 'side' | 'entry_price' | 'quantity'> & { fees?: number }
): OptionExtremum {
  if (!isOptionTrade(trade) || trade.entry_price == null || trade.quantity == null) {
    return { value: null, unlimited: false };
  }
  if (trade.side === 'LONG') {
    const premium = trade.entry_price * trade.quantity * 100;
    return { value: premium + (trade.fees ?? 0), unlimited: false };
  }
  // SHORT (naked) — undefined / very large downside.
  return { value: null, unlimited: true };
}

/**
 * Maximum theoretical profit in account currency.
 *   LONG CALL  → unlimited upside.
 *   LONG PUT   → (strike − premium) * qty * 100, floored at 0. Bounded.
 *   SHORT      → premium received (entry_price * qty * 100). Bounded.
 */
export function getOptionMaxProfit(
  trade: Pick<Trade, 'asset_class' | 'side' | 'option_type' | 'strike_price' | 'entry_price' | 'quantity'>
): OptionExtremum {
  if (!isOptionTrade(trade) || trade.entry_price == null || trade.quantity == null) {
    return { value: null, unlimited: false };
  }
  if (trade.side === 'SHORT') {
    return { value: trade.entry_price * trade.quantity * 100, unlimited: false };
  }
  // LONG
  if (trade.option_type === 'CALL') {
    return { value: null, unlimited: true };
  }
  if (trade.option_type === 'PUT' && trade.strike_price != null) {
    const maxProfit = Math.max(0, (trade.strike_price - trade.entry_price) * trade.quantity * 100);
    return { value: maxProfit, unlimited: false };
  }
  return { value: null, unlimited: false };
}

/**
 * Compact contract label for list/detail display, e.g. "AAPL 150C 06/20".
 * Falls back to the plain symbol for non-options or incomplete data.
 */
export function getOptionContractLabel(
  trade: Pick<Trade, 'asset_class' | 'symbol' | 'option_type' | 'strike_price' | 'expiration_date'>
): string {
  if (!isOptionTrade(trade)) return trade.symbol;
  const parts: string[] = [trade.symbol];
  if (trade.strike_price != null && trade.option_type) {
    parts.push(`${trade.strike_price}${trade.option_type === 'CALL' ? 'C' : 'P'}`);
  }
  if (trade.expiration_date) {
    const exp = new Date(trade.expiration_date);
    if (!Number.isNaN(exp.getTime())) {
      const mm = String(exp.getMonth() + 1).padStart(2, '0');
      const dd = String(exp.getDate()).padStart(2, '0');
      parts.push(`${mm}/${dd}`);
    }
  }
  return parts.join(' ');
}

// ================================================================
// MULTI-LEG OPTIONS HELPERS
// ================================================================
//
// A multi-leg options trade (vertical, iron condor, straddle, etc.) is one
// parent trades row + N legs. Premium is per share; 1 contract = 100 shares.
// Net P&L is the signed sum of each leg's P&L (computed here, written to the
// parent row by the app). These helpers are pure and options-only.

/** One option leg of a multi-leg trade. Mirrors the trade_legs table shape. */
export interface TradeLeg {
  option_type: 'CALL' | 'PUT';
  strike_price: number;
  expiration_date?: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entry_price: number;     // premium per share at entry
  exit_price?: number;     // premium per share at close (undefined = open)
  fees?: number;
}

/** Canonical options strategy archetypes (app-validated; no DB enum). */
export const OPTION_STRATEGY_TYPES = [
  { value: 'vertical',     label: 'Vertical Spread' },
  { value: 'iron_condor',  label: 'Iron Condor' },
  { value: 'iron_butterfly', label: 'Iron Butterfly' },
  { value: 'straddle',     label: 'Straddle' },
  { value: 'strangle',     label: 'Strangle' },
  { value: 'calendar',     label: 'Calendar Spread' },
  { value: 'butterfly',    label: 'Butterfly' },
  { value: 'ratio',        label: 'Ratio Spread' },
  { value: 'custom',       label: 'Custom / Other' },
] as const;

export function getStrategyLabel(value?: string | null): string | null {
  if (!value) return null;
  return OPTION_STRATEGY_TYPES.find(s => s.value === value)?.label ?? value;
}

/**
 * Signed dollar P&L for a single leg (per-share premium × qty × 100, net fees).
 * LONG  → (exit - entry) * qty * 100 - fees
 * SHORT → (entry - exit) * qty * 100 - fees
 * Returns null when the leg has no exit_price (still open).
 */
export function legSignedPnl(leg: TradeLeg): number | null {
  if (leg.exit_price == null) return null;
  const dir = leg.side === 'LONG' ? 1 : -1;
  const gross = dir * (leg.exit_price - leg.entry_price) * leg.quantity * 100;
  return gross - (leg.fees ?? 0);
}

/**
 * Net entry premium per spread, per share, signed:
 *   LONG leg adds debit (+entry), SHORT leg adds credit (-entry).
 * Positive total = net DEBIT paid; negative = net CREDIT received.
 */
export function netPremiumPerShare(legs: TradeLeg[]): number {
  return legs.reduce((sum, l) => sum + (l.side === 'LONG' ? l.entry_price : -l.entry_price), 0);
}

/** Net premium in dollars across all legs (per-share net × qty × 100, summed by leg). */
export function netPremiumUsd(legs: TradeLeg[]): number {
  return legs.reduce(
    (sum, l) => sum + (l.side === 'LONG' ? 1 : -1) * l.entry_price * l.quantity * 100,
    0,
  );
}

/**
 * Net realized P&L for the whole spread = sum of each leg's signed P&L.
 * Returns null if NO leg is closed; partially-closed spreads sum only the
 * closed legs (open legs contribute 0) — caller decides whether that is final.
 */
export function netMultiLegPnl(legs: TradeLeg[]): number | null {
  const closed = legs.filter(l => l.exit_price != null);
  if (closed.length === 0) return null;
  return closed.reduce((sum, l) => sum + (legSignedPnl(l) ?? 0), 0);
}

/** True when every leg has an exit price (the spread is fully closed). */
export function isMultiLegClosed(legs: TradeLeg[]): boolean {
  return legs.length > 0 && legs.every(l => l.exit_price != null);
}

/** Human label for net premium: "Net Debit $1.20" / "Net Credit $0.80" (per share). */
export function netDebitCreditLabel(legs: TradeLeg[]): string {
  const net = netPremiumPerShare(legs);
  if (net > 0) return `Net Debit $${net.toFixed(2)}`;
  if (net < 0) return `Net Credit $${Math.abs(net).toFixed(2)}`;
  return 'Even';
}

// ================================================================
// OPTIONS PAYOFF (at expiration) — pure math, no external data
// ================================================================
//
// Payoff at expiration is deterministic: the underlying's value at expiry
// fully determines each leg's intrinsic value. Net P&L is the signed sum
// across legs. No Greeks, no IV, no time value — strictly the terminal
// payoff diagram. 1 contract = 100 shares.

/**
 * Signed dollar P&L for ONE leg if the underlying settles at price `S` at
 * expiration. Intrinsic value: CALL → max(0, S − strike); PUT → max(0, strike − S).
 *   LONG  → (intrinsic − entry) * qty * 100 − fees
 *   SHORT → (entry − intrinsic) * qty * 100 − fees
 */
export function legPayoffAtPrice(leg: TradeLeg, S: number): number {
  const intrinsic =
    leg.option_type === 'CALL'
      ? Math.max(0, S - leg.strike_price)
      : Math.max(0, leg.strike_price - S);
  const dir = leg.side === 'LONG' ? 1 : -1;
  return dir * (intrinsic - leg.entry_price) * leg.quantity * 100 - (leg.fees ?? 0);
}

/** Net payoff across all legs at underlying price `S`. */
export function netPayoffAtPrice(legs: TradeLeg[], S: number): number {
  return legs.reduce((sum, l) => sum + legPayoffAtPrice(l, S), 0);
}

/**
 * Sample the net payoff curve across [priceMin, priceMax] in `steps`
 * intervals (inclusive of both endpoints → steps+1 points).
 * Returns points usable directly by a recharts LineChart.
 */
export function payoffCurve(
  legs: TradeLeg[],
  priceMin: number,
  priceMax: number,
  steps = 80,
): { price: number; pnl: number }[] {
  if (!legs.length || !(priceMax > priceMin) || steps < 1) return [];
  const out: { price: number; pnl: number }[] = [];
  const stepSize = (priceMax - priceMin) / steps;
  for (let i = 0; i <= steps; i++) {
    const price = priceMin + stepSize * i;
    out.push({ price, pnl: netPayoffAtPrice(legs, price) });
  }
  return out;
}

/**
 * Adapt a single-leg options trade (fields on the parent row, not in
 * trade_legs) into a TradeLeg so the same payoff math serves both paths.
 * Returns null if the trade lacks the option fields.
 */
export function singleLegFromTrade(
  trade: Pick<Trade, 'side' | 'option_type' | 'strike_price' | 'entry_price' | 'quantity' | 'exit_price'> & { fees?: number },
): TradeLeg | null {
  if (!trade.option_type || trade.strike_price == null || trade.entry_price == null) return null;
  return {
    option_type: trade.option_type,
    strike_price: trade.strike_price,
    side: trade.side ?? 'LONG',
    quantity: trade.quantity ?? 1,
    entry_price: trade.entry_price,
    exit_price: trade.exit_price ?? undefined,
    fees: trade.fees ?? undefined,
  };
}

/**
 * Sensible price domain for a payoff chart: spans the strikes with padding,
 * so breakevens and the kink points are comfortably visible. Falls back to
 * ±25% around a single strike.
 */
export function payoffPriceDomain(legs: TradeLeg[], padPct = 0.25): { min: number; max: number } | null {
  const strikes = legs.map((l) => l.strike_price).filter((s) => Number.isFinite(s));
  if (!strikes.length) return null;
  const lo = Math.min(...strikes);
  const hi = Math.max(...strikes);
  const center = (lo + hi) / 2;
  const span = Math.max(hi - lo, center * padPct * 2);
  return { min: Math.max(0, center - span), max: center + span };
}

// ================================================================
// AGGREGATE STATISTICS
// ================================================================

export interface AggregateStats {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  totalPnL: number;
  avgPnL: number;
  avgR: number;
  avgWinR: number;
  avgLossR: number;
  bestTrade: number;
  worstTrade: number;
  expectancy: number;
  profitFactor: number;
  maxDrawdown: number;
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
}

/**
 * Calculate aggregate statistics from array of trades
 * This is optimized for large datasets
 */
export function calculateStats(trades: Trade[]): AggregateStats {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      closedTrades: 0,
      openTrades: 0,
      wins: 0,
      losses: 0,
      breakeven: 0,
      winRate: 0,
      totalPnL: 0,
      avgPnL: 0,
      avgR: 0,
      avgWinR: 0,
      avgLossR: 0,
      bestTrade: 0,
      worstTrade: 0,
      expectancy: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      currentStreak: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
    };
  }
  
  let wins = 0, losses = 0, breakeven = 0;
  let totalPnL = 0;
  let totalR = 0, totalWinR = 0, totalLossR = 0;
  let rCount = 0, winRCount = 0, lossRCount = 0;
  let bestTrade = 0, worstTrade = 0;
  let totalWinAmount = 0, totalLossAmount = 0;
  
  // Drawdown tracking
  let peak = 0, maxDD = 0;
  let runningPnL = 0;
  
  // Streak tracking
  let currentStreak = 0, longestWinStreak = 0, longestLossStreak = 0;
  let lastOutcome: string | null = null;
  let currentWinStreak = 0, currentLossStreak = 0;
  
  const closedTrades = trades.filter(t => t.exit_price && t.exit_price > 0);
  const openTrades = trades.length - closedTrades.length;
  
  // Process each closed trade
  for (const trade of closedTrades) {
    const pnl = calculatePnL(trade);
    const outcome = getTradeOutcome(pnl, true);
    
    // Count outcomes
    if (outcome === "WIN") wins++;
    else if (outcome === "LOSS") losses++;
    else if (outcome === "BE") breakeven++;
    
    // Accumulate P&L
    totalPnL += pnl;
    runningPnL += pnl;
    
    // Track best/worst
    if (pnl > bestTrade) bestTrade = pnl;
    if (pnl < worstTrade) worstTrade = pnl;
    
    // 🔥 FIXED: Use actual_r from top level OR metrics OR calculate
    const actualR = trade.actual_r ?? 
                    trade.metrics?.actual_r ?? 
                    calculateActualR(
                      trade.entry_price,
                      trade.stop_price,
                      trade.exit_price!,
                      trade.quantity,
                      trade.symbol,
                      trade.side,
                      trade.fees
                    );
    
    if (actualR !== 0) {
      totalR += actualR;
      rCount++;
      
      if (actualR > 0) {
        totalWinR += actualR;
        winRCount++;
        totalWinAmount += pnl;
      } else if (actualR < 0) {
        totalLossR += Math.abs(actualR);
        lossRCount++;
        totalLossAmount += Math.abs(pnl);
      }
    }
    
    // Track drawdown
    if (runningPnL > peak) peak = runningPnL;
    const currentDD = peak - runningPnL;
    if (currentDD > maxDD) maxDD = currentDD;
    
    // Track streaks
    if (outcome === lastOutcome && outcome !== "BE") {
      currentStreak++;
    } else {
      if (lastOutcome === "WIN" && currentWinStreak < currentStreak) {
        longestWinStreak = currentStreak;
      }
      if (lastOutcome === "LOSS" && currentLossStreak < currentStreak) {
        longestLossStreak = currentStreak;
      }
      currentStreak = 1;
    }
    
    lastOutcome = outcome;
    if (outcome === "WIN") currentWinStreak = currentStreak;
    if (outcome === "LOSS") currentLossStreak = currentStreak;
  }
  
  // Final streak check
  if (lastOutcome === "WIN" && currentStreak > longestWinStreak) {
    longestWinStreak = currentStreak;
  }
  if (lastOutcome === "LOSS" && currentStreak > longestLossStreak) {
    longestLossStreak = currentStreak;
  }
  
  const totalClosed = closedTrades.length;
  const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;
  const avgPnL = totalClosed > 0 ? totalPnL / totalClosed : 0;
  const avgR = rCount > 0 ? totalR / rCount : 0;
  const avgWinR = winRCount > 0 ? totalWinR / winRCount : 0;
  const avgLossR = lossRCount > 0 ? totalLossR / lossRCount : 0;
  
  // Expectancy = (Win% × AvgWin) - (Loss% × AvgLoss)
  const expectancy = (winRate / 100) * avgWinR - ((100 - winRate) / 100) * avgLossR;
  
  // Profit Factor = Total Wins / Total Losses
  const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;
  
  return {
    totalTrades: trades.length,
    closedTrades: totalClosed,
    openTrades,
    wins,
    losses,
    breakeven,
    winRate,
    totalPnL,
    avgPnL,
    avgR,
    avgWinR,
    avgLossR,
    bestTrade,
    worstTrade,
    expectancy,
    profitFactor,
    maxDrawdown: maxDD,
    currentStreak: lastOutcome === "WIN" ? currentStreak : (lastOutcome === "LOSS" ? -currentStreak : 0),
    longestWinStreak,
    longestLossStreak,
  };
}