// ============================================================================
// FUTURES EXECUTION HELPERS — whole-contract sizing, tick-based slippage, and
// point-value P&L/commission math for CME futures roots.
// ============================================================================
//
// Pulled out of AutoBacktestEngine.ts so this math is unit-testable in
// isolation (see __tests__/futuresMath.test.ts) without having to drive the
// full detector/fill pipeline. Pure functions only — no engine state, no
// side effects. AutoBacktestEngine.ts wires these in only when the run's
// symbol resolves to a ContractSpec (getContractSpec); crypto/other symbols
// keep using OrderExecutionEngine's existing fractional-unit math unchanged.
// ============================================================================

export interface FuturesSizingParams {
  sizingMode: 'risk-pct' | 'fixed-contracts';
  riskPerTradePct: number;
  balance: number;
  /** Configured contract count for 'fixed-contracts' mode. Defaults to 1 if unset/invalid. */
  contractsConfig: number | undefined;
  /** |entry - stop| in raw points (not ticks). */
  stopDistancePoints: number;
  pointValue: number;
}

export interface FuturesSizingResult {
  contracts: number;
  /** Dollar risk actually taken by this trade (stopDistancePoints * pointValue * contracts). */
  riskAmount: number;
}

/**
 * Resolve whole-contract position size for a futures trade.
 * - 'fixed-contracts': always returns the configured (floored, >= 1) contract
 *   count — never null.
 * - 'risk-pct': floor(riskBudget / (stopDistancePoints * pointValue)).
 *   Returns null when that floors to 0 — the stop is too wide for the risk
 *   budget at 1 contract. Caller should skip the trade (leave the signal
 *   pending so it can still fill on a later, tighter setup), mirroring the
 *   existing fractional-size skip path in the crypto branch.
 */
export function resolveFuturesContracts(params: FuturesSizingParams): FuturesSizingResult | null {
  const { sizingMode, riskPerTradePct, balance, contractsConfig, stopDistancePoints, pointValue } = params;

  if (stopDistancePoints <= 0) return null;

  if (sizingMode === 'fixed-contracts') {
    const contracts = Math.max(1, Math.floor(contractsConfig ?? 1));
    return { contracts, riskAmount: stopDistancePoints * pointValue * contracts };
  }

  const riskBudget = balance * (riskPerTradePct / 100);
  const contracts = Math.floor(riskBudget / (stopDistancePoints * pointValue));
  if (contracts <= 0) return null;

  return { contracts, riskAmount: stopDistancePoints * pointValue * contracts };
}

/**
 * Apply tick-based slippage against the trade: a buy fills `slippageTicks`
 * ticks higher, a sell fills `slippageTicks` ticks lower — mirrors
 * OrderExecutionEngine.applySlippage's "slippage works against you"
 * convention, just in ticks instead of percent.
 */
export function applyFuturesTickSlippage(
  price: number,
  tickSize: number,
  slippageTicks: number,
  side: 'buy' | 'sell',
): number {
  if (!slippageTicks) return price;
  const offset = slippageTicks * tickSize;
  return side === 'buy' ? price + offset : price - offset;
}

/** Gross P&L in dollars: (exit - entry) * pointValue * contracts, signed for direction. */
export function futuresPnl(
  entryPrice: number,
  exitPrice: number,
  pointValue: number,
  contracts: number,
  isLong: boolean,
): number {
  const priceDiff = isLong ? exitPrice - entryPrice : entryPrice - exitPrice;
  return priceDiff * pointValue * contracts;
}

/** Round-trip commission: commissionPerContract charged on both the entry and exit fills. */
export function futuresCommissionRoundTrip(commissionPerContract: number, contracts: number): number {
  return commissionPerContract * contracts * 2;
}

/**
 * Price-move percent, direction-adjusted — same semantics as
 * OrderExecutionEngine.calculateRealizedPnL's pnlPercent (a raw price %
 * move, independent of contract count/pointValue).
 */
export function priceMovePercent(entryPrice: number, exitPrice: number, isLong: boolean): number {
  if (entryPrice === 0) return 0;
  const priceDiff = isLong ? exitPrice - entryPrice : entryPrice - exitPrice;
  return (priceDiff / entryPrice) * 100;
}
