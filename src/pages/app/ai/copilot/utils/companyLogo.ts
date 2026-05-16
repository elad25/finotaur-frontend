// src/pages/app/ai/copilot/utils/companyLogo.ts
const TICKER_TO_DOMAIN: Record<string, string> = {
  AAPL: 'apple.com',
  NVDA: 'nvidia.com',
  MSFT: 'microsoft.com',
  TSLA: 'tesla.com',
  AMZN: 'amazon.com',
  META: 'meta.com',
  GOOGL: 'abc.xyz',
  GOOG: 'abc.xyz',
  NFLX: 'netflix.com',
  AMD: 'amd.com',
  CRM: 'salesforce.com',
  ORCL: 'oracle.com',
  INTC: 'intel.com',
  CSCO: 'cisco.com',
  ADBE: 'adobe.com',
  PYPL: 'paypal.com',
  // ETFs
  XLE: 'ssga.com',
  TLT: 'ishares.com',
  SPY: 'ssga.com',
  QQQ: 'invesco.com',
  SOXS: 'direxion.com',
};

export function getCompanyLogo(ticker: string): string | null {
  const domain = TICKER_TO_DOMAIN[ticker.toUpperCase()];
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}
