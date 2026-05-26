// src/pages/app/ai/copilot/utils/companyLogo.ts
//
// FinancialModelingPrep serves logos by ticker, works for both US equities
// and sector ETFs (XLE, XLI, XLF, etc.), no API key required for the image URL.
// Format: https://financialmodelingprep.com/image-stock/{TICKER}.png
//
// Previously used logo.clearbit.com (sunset by Clearbit in late 2025 — returns
// network errors). All consumers should pair the returned URL with an onError
// handler that falls back to a letter avatar.

const FMP_LOGO_BASE = 'https://financialmodelingprep.com/image-stock';

/**
 * Returns a logo URL for the given ticker, or null if ticker is empty.
 * Callers should wire <img onError> to swap in a letter-avatar fallback
 * if the request fails (rare for major US tickers, but possible for
 * obscure symbols or temporary FMP outages).
 */
export function getCompanyLogo(ticker: string): string | null {
  if (!ticker || typeof ticker !== 'string') return null;
  const symbol = ticker.toUpperCase().trim();
  if (!symbol) return null;
  return `${FMP_LOGO_BASE}/${encodeURIComponent(symbol)}.png`;
}
