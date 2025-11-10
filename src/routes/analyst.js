// src/routes/analyst.js — FMP v4-first with pagination (ESM)
import { Router } from 'express';
const router = Router();

const FMP_BASE = 'https://financialmodelingprep.com';

const getKey = () =>
  process.env.FMP_API_KEY
  || process.env.FINANCIAL_MODELING_PREP_API_KEY
  || process.env.FINANCIAL_MODELING_PREP_KEY
  || '';

const fmt = (t) => new Date(t).toISOString().slice(0,10);
const toNumber = (x) => Number.isFinite(Number(x)) ? Number(x) : null;

const normalize = (it) => {
  const symbol = String(it.symbol || it.ticker || '').toUpperCase();
  const rawDate = it.date || it.publishedDate || it.gradeDate || it.calendarDate || it.publicationDate;
  if (!symbol || !rawDate) return null;
  const date = String(rawDate).slice(0,10);
  const firm = it.analystCompany || it.firm || it.analyst || it.researchFirm || null;
  const fromRating = it.fromGrade || it.fromRating || it.previousGrade || null;
  const toRating   = it.toGrade   || it.toRating   || it.newGrade      || it.grade || null;
  const fromTarget = toNumber(it.fromTargetPrice ?? it.priceTargetPrevious ?? it.previousPriceTarget);
  const toTarget   = toNumber(it.toTargetPrice   ?? it.priceTargetCurrent  ?? it.newPriceTarget);
  let action = (it.action || it.analystAction || it.companyAction || it.ratingAction || '').toString().toLowerCase();
  if (!action && fromRating && toRating) action = (fromRating === toRating) ? 'reiterate' : 'change';
  const url = it.url || it.articleURL || null;
  return { symbol, firm, date, action, fromRating, toRating, fromTarget, toTarget, url };
};

async function fmpFetchJson(url) {
  const withKey = url.includes('apikey=')
    ? url
    : `${url}${url.includes('?') ? '&' : '?'}apikey=${encodeURIComponent(getKey())}`;
  const r = await fetch(withKey, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error(`FMP ${r.status}: ${withKey}`);
  try { return await r.json(); } catch { return []; }
}

// v4-first with pagination, then legacy fallbacks
async function fetchWindowAll(from, to) {
  const out = [];

  // v4 primary: /api/v4/stock/grade with paging
  try {
    let page = 0;
    const size = 1000; // max reasonable
    while (true) {
      const url = `${FMP_BASE}/api/v4/stock/grade?from=${from}&to=${to}&page=${page}&size=${size}`;
      const j = await fmpFetchJson(url);
      if (!Array.isArray(j) || j.length === 0) break;
      out.push(...j);
      if (j.length < size) break;
      page += 1;
      if (page > 50) break; // hard cap safety
    }
  } catch (e) {
    // ignore and try other endpoints
  }

  // v4 secondary: /api/v4/analyst-stock-grade (some plans expose this name)
  if (out.length === 0) {
    try {
      let page = 0;
      const size = 1000;
      while (true) {
        const url = `${FMP_BASE}/api/v4/analyst-stock-grade?from=${from}&to=${to}&page=${page}&size=${size}`;
        const j = await fmpFetchJson(url);
        if (!Array.isArray(j) || j.length === 0) break;
        out.push(...j);
        if (j.length < size) break;
        page += 1;
        if (page > 50) break;
      }
    } catch {}
  }

  // v3 legacy fallback (will likely return error for non-legacy plans; safe to ignore)
  if (out.length === 0) {
    try {
      const j = await fmpFetchJson(`${FMP_BASE}/api/v3/stock/upgrade_downgrade?from=${from}&to=${to}`);
      if (Array.isArray(j)) out.push(...j);
    } catch {}
  }

  return out;
}

async function getAnalystEvents(from, to) {
  const raw = await fetchWindowAll(from, to);
  const out = [];
  for (const row of raw) {
    const n = normalize(row);
    if (n) out.push(n);
  }
  out.sort((a,b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}

// --- Routes ---
router.get('/health', (_req, res) => res.json({ ok: true, service: 'analyst' }));

router.get('/upgrades/recent', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 30));
    const to = fmt(Date.now());
    const from = fmt(Date.now() - 1000*60*60*24*180);
    const items = await getAnalystEvents(from, to);
    res.json({ from, to, total: items.length, items: items.slice(0, limit) });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
});

router.get('/upgrades/repeats', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
    const windowDays = Math.max(1, Math.min(365, Number(req.query.windowDays) || 90));
    const to = fmt(Date.now());
    const from = fmt(Date.now() - 1000*60*60*24*windowDays);
    const items = await getAnalystEvents(from, to);

    const map = new Map();
    for (const it of items) {
      const k = it.symbol;
      if (!map.has(k)) map.set(k, { count: 0, upgrades: 0, downgrades: 0, lastDate: null });
      const v = map.get(k);
      v.count += 1;
      if (it.action.includes('up')) v.upgrades += 1;
      if (it.action.includes('down')) v.downgrades += 1;
      if (!v.lastDate || it.date > v.lastDate) v.lastDate = it.date;
    }
    const repeats = [...map.entries()]
      .map(([symbol, v]) => ({ symbol, ...v }))
      .sort((a,b) => b.count - a.count || String(b.lastDate).localeCompare(String(a.lastDate)))
      .slice(0, limit);

    res.json({ from, to, total: items.length, repeats });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
});

export default router;
