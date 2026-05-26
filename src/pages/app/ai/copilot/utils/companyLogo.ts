// src/pages/app/ai/copilot/utils/companyLogo.ts
//
// Primary source: FinancialModelingPrep serves logos by ticker, works for both US equities
// and sector ETFs (XLE, XLI, XLF, etc.), no API key required for the image URL.
// Format: https://financialmodelingprep.com/image-stock/{TICKER}.png
//
// Fallback source: logo.dev (public token, may return 404 for some tickers).
//
// Previously used logo.clearbit.com (sunset by Clearbit in late 2025 — returns
// network errors). All consumers should pair the returned URL with an onError
// handler that falls back to a letter avatar.

const FMP_LOGO_BASE = 'https://financialmodelingprep.com/image-stock';

// logo.dev public token — free tier, may 404 for obscure tickers, letter fallback handles it
const LOGO_DEV_PUBLIC_TOKEN = 'pk_X-1ZO13GSgeOoUrIuJ6GMQ';

/**
 * Returns the primary FMP logo URL for the given ticker, or null if ticker is empty.
 * Callers should try getCompanyLogoFallback on error before showing a letter avatar.
 */
export function getCompanyLogo(ticker: string): string | null {
  if (!ticker || typeof ticker !== 'string') return null;
  const symbol = ticker.toUpperCase().trim();
  if (!symbol) return null;
  return `${FMP_LOGO_BASE}/${encodeURIComponent(symbol)}.png`;
}

/**
 * Returns a secondary logo URL (logo.dev) for the given ticker, or null if ticker is empty.
 * Use as a second attempt when getCompanyLogo's URL fails to load.
 * May return 404 for some tickers — letter avatar fallback will catch that case.
 */
export function getCompanyLogoFallback(ticker: string): string | null {
  if (!ticker || typeof ticker !== 'string') return null;
  const symbol = ticker.toUpperCase().trim();
  if (!symbol) return null;
  return `https://img.logo.dev/ticker/${encodeURIComponent(symbol)}?token=${LOGO_DEV_PUBLIC_TOKEN}`;
}
