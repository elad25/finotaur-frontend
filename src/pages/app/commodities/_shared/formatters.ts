// ─── Commodities display formatters ───────────────────────────────────────────
// Pure functions — no side effects, no imports.

/**
 * Format a commodity price with its display unit.
 * Accepts null — returns "—" for missing data.
 * Examples: formatCommodityPrice(82.5, '$/bbl') → '$82.50/bbl'
 *           formatCommodityPrice(365.25, '¢/bu') → '365.25¢/bu'
 *           formatCommodityPrice(null, '$/oz') → '—'
 */
export function formatCommodityPrice(value: number | null, unit: string): string {
  if (value == null) return '—';
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (unit.startsWith('$')) {
    // e.g. '$/bbl' → '$82.50 /bbl'
    return `$${formatted} ${unit.slice(1)}`;
  }
  return `${formatted} ${unit}`;
}

/**
 * Format a percentage change with sign and two decimal places.
 * Examples: formatPercent(1.23) → '+1.23%'
 *           formatPercent(-0.5) → '-0.50%'
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Determine whether a futures curve is in contango, backwardation, or flat.
 * Convention: back > front → market expects higher future prices → Contango.
 *             back < front → market expects lower future prices → Backwardation.
 */
export function regimeLabel(
  frontPrice: number,
  backPrice: number
): 'Contango' | 'Backwardation' | 'Flat' {
  if (backPrice > frontPrice) return 'Contango';
  if (backPrice < frontPrice) return 'Backwardation';
  return 'Flat';
}
