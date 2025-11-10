import { polyTickerDetails } from '../providers/polygon';

export async function getContext(symbol: string): Promise<any> {
  const data = await polyTickerDetails(symbol).catch(() => null);
  const r = data || {};
  return {
    sector: r.sic_description || r.sector || '—',
    industry: r.industry || '—',
    sic: String(r.sic_code || '') || '',
  };
}