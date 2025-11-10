// src/providers/news/newsdata.ts
import { j } from '../../utils/http.js';

const BASE = 'https://newsdata.io/api/1';

export async function searchNews(q: string, category?: string, page?: string, country?: string, language: string = 'en') {
  const key = process.env.NEWSDATA_API_KEY;
  if (!key) throw new Error('Missing NEWSDATA_API_KEY');
  const p = new URLSearchParams({ apikey: key, q });
  if (category) p.set('category', category);
  if (country)  p.set('country', country);
  if (language) p.set('language', language);
  if (page)     p.set('page', page);
  return j(`${BASE}/news?${p.toString()}`);
}

export async function topHeadlines(country: string = 'us', category?: string, page?: string, language: string = 'en') {
  const key = process.env.NEWSDATA_API_KEY;
  if (!key) throw new Error('Missing NEWSDATA_API_KEY');
  const p = new URLSearchParams({ apikey: key, country, language });
  if (category) p.set('category', category);
  if (page)     p.set('page', page);
  return j(`${BASE}/news?${p.toString()}`);
}
