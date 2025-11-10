export const FMP_BASE = process.env.FMP_BASE || 'https://financialmodelingprep.com';
export const FMP_API_KEY = process.env.FMP_API_KEY || '';

export function fmpUrl(path: string, params: Record<string, string | number | undefined> = {}) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    usp.set(k, String(v));
  }
  if (FMP_API_KEY) usp.set('apikey', FMP_API_KEY);
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${FMP_BASE}${p}?${usp.toString()}`;
}
