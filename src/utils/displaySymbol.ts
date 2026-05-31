/**
 * displaySymbol — strip data-provider suffixes for presentation only.
 *
 * Yahoo uses `=F` for continuous futures (MNQ=F) and `=X` for forex (EURUSD=X).
 * Those suffixes are required for fetching + are what we persist, but they're
 * noise to the trader. This removes them for display. Works on a bare symbol
 * ("MNQ=F" → "MNQ") and on composite labels where the symbol is the first token
 * ("MNQ=F · 5m · 31.5.2026" → "MNQ · 5m · 31.5.2026"). Stocks/crypto pass through
 * unchanged ("AAPL", "BTCUSDT").
 */
export function displaySymbol(value: string): string {
  return value.replace(/=([FX])\b/g, '');
}
