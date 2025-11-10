import { Router, Request, Response } from "express";

// This router exposes:
//   GET /api/analyst/upgrades/repeats?windowDays=90&limit=25
//   GET /api/analyst/upgrades/recent?limit=30
//
// It fetches analyst upgrades/downgrades from FinancialModelingPrep (FMP)
// using multiple compatible endpoints (v4/v3) to avoid 404s and normalizes
// the payload shape for the frontend.

const router = Router();

// --- Utils ---
const FMP_BASE = "https://financialmodelingprep.com";
function getFmpKey(): string {
  const key = process.env.FMP_API_KEY
    || process.env.FINANCIAL_MODELING_PREP_API_KEY
    || process.env.FINANCIAL_MODELING_PREP_KEY
    || "";
  if (!key) {
    console.warn("[analyst] Missing FMP API key. Set FMP_API_KEY.");
  }
  return key;
}

function fmt(d: Date): string {
  return d.toISOString().slice(0,10);
}

type Normalized = {
  symbol: string;
  firm: string | null;
  date: string; // YYYY-MM-DD
  action: string; // upgrade | downgrade | reiterate | initiate | maintains (normalized lowercase)
  fromRating: string | null;
  toRating: string | null;
  fromTarget?: number | null;
  toTarget?: number | null;
  url?: string | null;
};

async function fmpFetchJson(path: string): Promise<any> {
  const url = path.includes("apikey=")
    ? path
    : `${path}${path.includes("?") ? "&" : "?"}apikey=${encodeURIComponent(getFmpKey())}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FMP ${res.status} for ${url}: ${text.slice(0,200)}`);
  }
  try {
    return await res.json();
  } catch {
    // Some FMP endpoints return empty string when no data
    return [];
  }
}

// Try multiple FMP endpoints to be resilient to plan/version differences.
async function fetchFmpAnalystWindow(from: string, to: string): Promise<any[]> {
  const candidates: string[] = [
    `${FMP_BASE}/api/v4/stock/grade?from=${from}&to=${to}`,
    `${FMP_BASE}/api/v3/stock/upgrade_downgrade?from=${from}&to=${to}`,
    `${FMP_BASE}/api/v4/analyst-stock-grade?from=${from}&to=${to}`, // alt slug some accounts have
  ];
  for (const url of candidates) {
    try {
      const out = await fmpFetchJson(url);
      if (Array.isArray(out) && out.length >= 0) return out;
    } catch (e) {
      // continue
      // console.warn(String(e));
    }
  }
  return [];
}

function toNumber(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function normalizeRow(it: any): Normalized | null {
  const symbol = (it.symbol || it.ticker || it.SYMBOL || "").toUpperCase();
  const rawDate = it.date || it.publishedDate || it.gradeDate || it.calendarDate || it.publicationDate;
  if (!symbol || !rawDate) return null;
  const date = String(rawDate).slice(0,10);

  const firm = it.analystCompany || it.firm || it.analyst || it.researchFirm || null;
  const fromRating = it.fromGrade || it.fromRating || it.previousGrade || null;
  const toRating   = it.toGrade   || it.toRating   || it.newGrade      || it.grade || null;

  // Targets sometimes appear with different keys
  const fromTarget = toNumber(it.fromTargetPrice ?? it.priceTargetPrevious ?? it.previousPriceTarget);
  const toTarget   = toNumber(it.toTargetPrice   ?? it.priceTargetCurrent  ?? it.newPriceTarget);

  let action = (it.action || it.analystAction || it.companyAction || it.ratingAction || "").toString().toLowerCase();
  if (!action && fromRating && toRating) {
    // crude inference
    if (fromRating === toRating) action = "reiterate";
    else action = "change";
  }

  const url = it.url || it.articleURL || null;

  return { symbol, firm: firm ?? null, date, action, fromRating, toRating, fromTarget, toTarget, url };
}

async function getAnalystEvents(from: string, to: string): Promise<Normalized[]> {
  const raw = await fetchFmpAnalystWindow(from, to);
  const out: Normalized[] = [];
  for (const row of Array.isArray(raw) ? raw : []) {
    const n = normalizeRow(row);
    if (n) out.push(n);
  }
  // sort DESC by date
  out.sort((a,b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}

router.get("/upgrades/recent", async (req: Request, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 30));
    const to = fmt(new Date());
    const from = fmt(new Date(Date.now() - 1000*60*60*24*180)); // 180d for safety
    const items = await getAnalystEvents(from, to);
    res.json({ from, to, total: items.length, items: items.slice(0, limit) });
  } catch (e: any) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
});

router.get("/upgrades/repeats", async (req: Request, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
    const windowDays = Math.max(1, Math.min(365, Number(req.query.windowDays) || 90));
    const to = fmt(new Date());
    const from = fmt(new Date(Date.now() - 1000*60*60*24*windowDays));

    const items = await getAnalystEvents(from, to);
    const map: Record<string, { count: number; upgrades: number; downgrades: number; lastDate: string | null }> = {};

    for (const it of items) {
      const key = it.symbol;
      if (!map[key]) map[key] = { count: 0, upgrades: 0, downgrades: 0, lastDate: null };
      map[key].count += 1;
      if (it.action.includes("up")) map[key].upgrades += 1;
      if (it.action.includes("down")) map[key].downgrades += 1;
      if (!map[key].lastDate || it.date > map[key].lastDate) map[key].lastDate = it.date;
    }

    const repeats = Object.entries(map)
      .map(([symbol, v]) => ({ symbol, ...v }))
      .sort((a,b) => b.count - a.count || (b.lastDate || "").localeCompare(a.lastDate || ""))
      .slice(0, limit);

    res.json({ from, to, total: items.length, repeats });
  } catch (e: any) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
});

export default router;
