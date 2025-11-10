import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();
const BASE = 'https://newsdata.io/api/1';

type NewsDataArticle = {
  title?: string;
  link?: string;
  pubDate?: string;
  source_id?: string;
  category?: string[];
  country?: string[];
  language?: string;
  description?: string;
  content?: string;
  image_url?: string;
};

type NewsDataResponse = {
  results?: NewsDataArticle[];
  totalResults?: number;
  nextPage?: string | null;
  status?: string;
  message?: string;
};

function getKeyOrThrow() {
  const key = process.env.NEWSDATA_API_KEY;
  if (!key) throw new Error('Missing NEWSDATA_API_KEY');
  return key.trim();
}

router.get('/search', async (req, res) => {
  try {
    const apiKey = getKeyOrThrow();
    const { q = '', category = '', page = '' } = req.query as Record<string, string>;
    const url = new URL(`${BASE}/news`);
    if (q) url.searchParams.set('q', q);
    if (category) url.searchParams.set('category', category);
    if (page) url.searchParams.set('page', page);
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('language', 'en');
    url.searchParams.set('country', 'us');

    const r = await fetch(url.toString());
    const data = (await r.json()) as NewsDataResponse | Record<string, any>;

    const results = (data as any).results ?? [];
    const totalResults = (data as any).totalResults ?? (Array.isArray(results) ? results.length : 0);
    const nextPage = (data as any).nextPage ?? null;
    return res.json({ results, totalResults, nextPage });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'news.search.failed' });
  }
});

router.get('/headlines', async (req, res) => {
  try {
    const apiKey = getKeyOrThrow();
    const { country = 'us', category = '', page = '' } = req.query as Record<string, string>;
    const url = new URL(`${BASE}/latest`);
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('language', 'en');
    if (country) url.searchParams.set('country', country);
    if (category) url.searchParams.set('category', category);
    if (page) url.searchParams.set('page', page);

    const r = await fetch(url.toString());
    const data = (await r.json()) as NewsDataResponse | Record<string, any>;

    const results = (data as any).results ?? [];
    const totalResults = (data as any).totalResults ?? (Array.isArray(results) ? results.length : 0);
    const nextPage = (data as any).nextPage ?? null;
    return res.json({ results, totalResults, nextPage });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'news.headlines.failed' });
  }
});

export default router;
