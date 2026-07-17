// ============================================================================
// CME FUTURES CONTRACT SPECS — core-level, engine-facing.
// ============================================================================
//
// The auto-backtest engine (src/core/auto/) must not import from
// src/components/ (core -> UI is a one-way dependency), so this module is a
// standalone, core-level mirror of the point-value/tick-size facts already
// established in src/components/charting/orderflow/futuresContracts.ts for
// the 4 symbols that file covers (NQ/ES/MNQ/MES) -- verified identical
// (pointValue + tickSize match exactly, see PLAN discrepancy note). This
// module additionally covers the other 10 CME roots the auto-backtest engine
// serves (see FUTURES_SYMBOLS in services/backtest/candleSource.ts) that the
// UI-facing file does not yet model (front-month resolution is out of scope
// here -- the engine works off historical candles keyed by root symbol, not
// a specific expiry).
// ============================================================================

export interface ContractSpec {
  /** Futures root, e.g. 'MNQ', 'ES'. */
  root: string;
  /** Dollar value of one full point move, per contract. */
  pointValue: number;
  /** Minimum price increment. */
  tickSize: number;
  /** Default commission per side, per contract ($). Round-trip = 2x this. */
  defaultCommissionPerSide: number;
}

const MICRO_COMMISSION_PER_SIDE = 0.74;
const MINI_FULL_COMMISSION_PER_SIDE = 1.29;

export const CONTRACT_SPECS: Record<string, ContractSpec> = {
  // --- Nasdaq-100 ---
  MNQ: { root: 'MNQ', pointValue: 2, tickSize: 0.25, defaultCommissionPerSide: MICRO_COMMISSION_PER_SIDE },
  NQ: { root: 'NQ', pointValue: 20, tickSize: 0.25, defaultCommissionPerSide: MINI_FULL_COMMISSION_PER_SIDE },
  // --- S&P 500 ---
  MES: { root: 'MES', pointValue: 5, tickSize: 0.25, defaultCommissionPerSide: MICRO_COMMISSION_PER_SIDE },
  ES: { root: 'ES', pointValue: 50, tickSize: 0.25, defaultCommissionPerSide: MINI_FULL_COMMISSION_PER_SIDE },
  // --- Dow ---
  MYM: { root: 'MYM', pointValue: 0.5, tickSize: 1.0, defaultCommissionPerSide: MICRO_COMMISSION_PER_SIDE },
  YM: { root: 'YM', pointValue: 5, tickSize: 1.0, defaultCommissionPerSide: MINI_FULL_COMMISSION_PER_SIDE },
  // --- Russell 2000 ---
  M2K: { root: 'M2K', pointValue: 5, tickSize: 0.1, defaultCommissionPerSide: MICRO_COMMISSION_PER_SIDE },
  RTY: { root: 'RTY', pointValue: 50, tickSize: 0.1, defaultCommissionPerSide: MINI_FULL_COMMISSION_PER_SIDE },
  // --- Gold ---
  MGC: { root: 'MGC', pointValue: 10, tickSize: 0.1, defaultCommissionPerSide: MICRO_COMMISSION_PER_SIDE },
  GC: { root: 'GC', pointValue: 100, tickSize: 0.1, defaultCommissionPerSide: MINI_FULL_COMMISSION_PER_SIDE },
  // --- Silver ---
  SIL: { root: 'SIL', pointValue: 1000, tickSize: 0.005, defaultCommissionPerSide: MICRO_COMMISSION_PER_SIDE },
  SI: { root: 'SI', pointValue: 5000, tickSize: 0.005, defaultCommissionPerSide: MINI_FULL_COMMISSION_PER_SIDE },
  // --- Crude Oil ---
  MCL: { root: 'MCL', pointValue: 100, tickSize: 0.01, defaultCommissionPerSide: MICRO_COMMISSION_PER_SIDE },
  CL: { root: 'CL', pointValue: 1000, tickSize: 0.01, defaultCommissionPerSide: MINI_FULL_COMMISSION_PER_SIDE },
};

/**
 * Resolve the contract spec for a symbol. The auto-backtest engine addresses
 * futures by bare root (e.g. "MNQ", not "MNQU6"), so this is a direct
 * case-insensitive lookup -- no front-month parsing. Returns null for any
 * symbol not in the table (crypto pairs like "BTCUSDT" and anything else),
 * which callers use as the "treat as fractional" signal.
 */
export function getContractSpec(symbol: string): ContractSpec | null {
  if (!symbol) return null;
  return CONTRACT_SPECS[symbol.toUpperCase()] ?? null;
}
