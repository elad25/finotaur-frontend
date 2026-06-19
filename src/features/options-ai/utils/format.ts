// src/features/options-ai/utils/format.ts
// Shared null-safe price formatters for the Options Intelligence feature.
// Used wherever a RAW spot/quote field may arrive as null for non-admin users
// (Polygon Individual license: raw prices stripped server-side for paying customers).

/**
 * Format a nullable price value.
 * Returns a plain em-dash when the value is null/undefined/NaN — never "$null" or "$NaN".
 * Passes pre-formatted strings through unchanged.
 */
export function fmtPriceOrDash(v: number | null | undefined): string {
  if (v == null || (typeof v === 'number' && isNaN(v))) return '—';
  if (typeof v === 'number') return `$${v.toFixed(2)}`;
  return String(v);
}

/**
 * Format a nullable percentage change.
 * Returns '—' for null/undefined/NaN.
 */
export function fmtPctOrDash(v: number | null | undefined): string {
  if (v == null || (typeof v === 'number' && isNaN(v))) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}
