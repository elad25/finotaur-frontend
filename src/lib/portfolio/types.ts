// src/lib/portfolio/types.ts
// ═══════════════════════════════════════════════════════════════
// Domain model for the My Portfolio (Koyfin-style manual builder).
// Camel-case here; DB columns are snake_case. Mapping happens in
// the useMyPortfolio hook.
// ═══════════════════════════════════════════════════════════════

// ── Lot: one portfolio_positions row ────────────────────────────
export interface Lot {
  /** Present when loaded from DB; absent on a freshly-created UI row. */
  id?: string;
  ticker: string;
  quantity: number;
  /** Nullable — user may omit cost basis. */
  costPerShare: number | null;
  /** ISO 'YYYY-MM-DD' or null when user did not supply a date. */
  purchaseDate: string | null;
}

// ── PortfolioAccount: one portfolio_accounts row ─────────────────
export interface PortfolioAccount {
  /** Present when loaded from DB. */
  id?: string;
  name: string;
  cashPosition: number;
  cashCurrency: string;
  /** All lots for this account, in sort_order sequence. */
  positions: Lot[];
}

// ── MyPortfolio: top-level domain object ────────────────────────
export interface MyPortfolio {
  /** Present when loaded from DB. */
  id?: string;
  name: string;
  currency: string;
  benchmarkEnabled: boolean;
  benchmarkSymbol: string | null;
  accounts: PortfolioAccount[];
}

// ── Factory helpers ──────────────────────────────────────────────

/**
 * Create a fresh, empty Lot (optionally pre-filled with a ticker).
 */
export function emptyLot(ticker = ''): Lot {
  return {
    ticker,
    quantity: 0,
    costPerShare: null,
    purchaseDate: null,
  };
}

/**
 * Create a fresh PortfolioAccount with one empty lot inside.
 */
export function emptyAccount(name = 'Account 1'): PortfolioAccount {
  return {
    name,
    cashPosition: 0,
    cashCurrency: 'USD',
    positions: [emptyLot()],
  };
}

/**
 * Create a fresh MyPortfolio with defaults:
 *   name 'My Portfolio', USD, benchmark off, one empty account named 'Account 1'.
 */
export function emptyPortfolio(): MyPortfolio {
  return {
    name: 'My Portfolio',
    currency: 'USD',
    benchmarkEnabled: false,
    benchmarkSymbol: null,
    accounts: [emptyAccount('Account 1')],
  };
}
