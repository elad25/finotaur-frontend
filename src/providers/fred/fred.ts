// src/providers/fred/fred.ts
import { j } from '../../utils/http.js';

const BASE = 'https://api.stlouisfed.org/fred';

export async function seriesObservations(series_id: string) {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error('Missing FRED_API_KEY');
  const p = new URLSearchParams({ api_key: key, series_id, file_type: 'json' });
  return j(`${BASE}/series/observations?${p.toString()}`);
}
