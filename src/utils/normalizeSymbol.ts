/**
 * Symbol normalization for futures contracts.
 *
 * Tradovate (and most futures brokers) emit full contract names like
 * "MNQM6" (Micro NASDAQ June 2026) or "ESZ5" (E-mini S&P December 2025).
 * For statistics, multiplier lookup, and groupings we want the ROOT
 * symbol — "MNQ", "ES" — so that all expiries roll up together.
 *
 * Mirror of `extractBaseSymbol()` in `supabase/functions/tradovate-sync/index.ts`.
 * Keep both in sync if the regex changes.
 */

const ROOT_SYMBOL_REGEX = /^([A-Z][A-Z0-9]*?)(?=[FGHJKMNQUVXZ]\d{1,2}$)/;

/**
 * Extract the root symbol from a futures contract.
 *  - "MNQM6"  → "MNQ"
 *  - "ESZ5"   → "ES"
 *  - "6EZ5"   → "6E"
 *  - "MNQ"    → "MNQ" (already root, no expiry suffix)
 *  - "AAPL"   → "AAPL" (equity, no match)
 *  - ""       → ""
 *
 * Falls back to the input unchanged when the trailing month-code +
 * year-digit pattern is not found, so equities and already-normalized
 * symbols pass through untouched.
 */
export function normalizeSymbol(symbol: string | null | undefined): string {
  if (!symbol) return '';
  const upper = symbol.toUpperCase().trim();
  const match = upper.match(ROOT_SYMBOL_REGEX);
  return match ? match[1] : upper;
}
