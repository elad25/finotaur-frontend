// src/providers/fundamentals/fmp.ts
import { j } from '../../utils/http.js';

const BASE = 'https://financialmodelingprep.com/api';

function key() {
  const k = process.env.FMP_API_KEY;
  if (!k) throw new Error('Missing FMP_API_KEY');
  return k;
}

export async function ratios(symbol: string) {
  return j(`${BASE}/v3/ratios/${encodeURIComponent(symbol)}?apikey=${key()}`);
}
export async function income(symbol: string, limit = 4) {
  return j(`${BASE}/v3/income-statement/${encodeURIComponent(symbol)}?period=annual&limit=${limit}&apikey=${key()}`);
}
export async function balance(symbol: string, limit = 4) {
  return j(`${BASE}/v3/balance-sheet-statement/${encodeURIComponent(symbol)}?period=annual&limit=${limit}&apikey=${key()}`);
}
export async function cashflow(symbol: string, limit = 4) {
  return j(`${BASE}/v3/cash-flow-statement/${encodeURIComponent(symbol)}?period=annual&limit=${limit}&apikey=${key()}`);
}
