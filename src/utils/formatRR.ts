/**
 * Format R:R (Risk-Reward Ratio) utilities
 * All R:R values are rounded to 2 decimal places for consistency
 */

/**
 * Format R:R as a number with 2 decimal places
 * @param rr - Risk-Reward ratio (e.g., 2.456789)
 * @returns Formatted number (e.g., "2.46") or "—" if invalid
 */
export function formatRR(rr: number | undefined | null): string {
  if (rr === undefined || rr === null || rr <= 0 || !isFinite(rr)) {
    return "—";
  }
  return rr.toFixed(2);
}

/**
 * Format R:R with "1:X" ratio format
 * @param rr - Risk-Reward ratio (e.g., 2.456789)
 * @returns Formatted ratio (e.g., "1:2.46") or "—" if invalid
 */
export function formatRRWithRatio(rr: number | undefined | null): string {
  if (rr === undefined || rr === null || rr <= 0 || !isFinite(rr)) {
    return "—";
  }
  return `1:${rr.toFixed(2)}`;
}

/**
 * Get numeric R:R value rounded to 2 decimals
 * Useful for calculations where you need a number, not a string
 * @param rr - Risk-Reward ratio
 * @returns Rounded number or 0 if invalid
 */
export function getRoundedRR(rr: number | undefined | null): number {
  if (rr === undefined || rr === null || rr <= 0 || !isFinite(rr)) {
    return 0;
  }
  return Number(rr.toFixed(2));
}
