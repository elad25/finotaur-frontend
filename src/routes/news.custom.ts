import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();
const BASE = 'https://newsdata.io/api/1';

function getKeyOrThrow() {
  const key = process.env.NEWSDATA_API_KEY;
  if (!key) throw new Error('Missing NEWSDATA_API_KEY');
  return key.trim();
}

function sanitizeToken(raw?: string) {
  if (!raw) return '';
  return raw.trim().replace(/[\s<>"']/g, '');
}

function setCommonParams(url: URL, apiKey: string) {
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('language', 'en');
}

router.get('/headlines', async (req, res) => {
  try {
    const apiKey = getKeyOrThrow();
    const { country = 'us', category = '', page = '' } = req.query as Record<string, string>;
    const url = new URL(`${BASE}/latest`);
    setCommonParams(url, apiKey);
    if (country) url.searchParams.set('country', country);
    if (category) url.searchParams.set('category', category);
    const token = sanitizeToken(page);
    if (token && token !== '1' && token !== '0') url.searchParams.set('page', token);

    const r = await fetch(url.toString());
    const ct = r.headers.get('content-type') || '';
    const text = await r.text();
    let data: any = text;
    if (ct.includes('application/json')) {
      try { data = JSON.parse(text); } catch {}
    }

    if (!r.ok) {
      const msg = (data && (data.message || data.__raw || text.slice(0,200))) || `news.headlines.failed ${r.status}`;
      return res.status(400).json({ error: msg, status: r.status, items: data });
    }

    const results = (data as any).results ?? [];
    const totalResults = (data as any).totalResults ?? (Array.isArray(results) ? results.length : 0);
    const nextPage = (data as any).nextPage ?? null;
    return res.json({ results, totalResults, nextPage, ts: Date.now() });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'news.headlines.failed' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const apiKey = getKeyOrThrow();
    const { q = '', category = '', page = '' } = req.query as Record<string, string>;
    const url = new URL(`${BASE}/news`);
    setCommonParams(url, apiKey);
    if (q) url.searchParams.set('q', q);
    if (category) url.searchParams.set('category', category);
    const token = sanitizeToken(page);
    if (token && token !== '1' && token !== '0') url.searchParams.set('page', token);

    const r = await fetch(url.toString());
    const ct = r.headers.get('content-type') || '';
    const text = await r.text();
    let data: any = text;
    if (ct.includes('application/json')) {
      try { data = JSON.parse(text); } catch {}
    }

    if (!r.ok) {
      const msg = (data && (data.message || data.__raw || text.slice(0,200))) || `news.search.failed ${r.status}`;
      return res.status(400).json({ error: msg, status: r.status, items: data });
    }

    const results = (data as any).results ?? [];
    const totalResults = (data as any).totalResults ?? (Array.isArray(results) ? results.length : 0);
    const nextPage = (data as any).nextPage ?? null;
    return res.json({ results, totalResults, nextPage, ts: Date.now() });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'news.search.failed' });
  }
});

export default router;
