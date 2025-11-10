import type { Request } from 'express';

function nullish<T>(v: any, def: T): T { return (v === undefined || v === null) ? def : v; }

export async function getOverviewSummary(req: Request) {
  const symbol = String(req.query.symbol || '').toUpperCase();
  // Attempt to reuse any existing provider endpoints your server already exposes.
  const base = `${req.protocol}://${req.get('host')}`;

  async function safeJson(url: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) { return null; }
  }

  const profile = await safeJson(`${base}/api/profile?symbol=${encodeURIComponent(symbol)}`)
               ?? await safeJson(`${base}/api/company/profile?symbol=${encodeURIComponent(symbol)}`)
               ?? null;

  const analytics = await safeJson(`${base}/api/analytics/ratios?symbol=${encodeURIComponent(symbol)}`)
                 ?? await safeJson(`${base}/api/ratios?symbol=${encodeURIComponent(symbol)}`)
                 ?? null;

  const range52w = await safeJson(`${base}/api/range52w?symbol=${encodeURIComponent(symbol)}`) ?? null;
  const priceMeta = await safeJson(`${base}/api/price/meta?symbol=${encodeURIComponent(symbol)}`) ?? null;

  return {
    symbol,
    marketCap: nullish(analytics?.marketCap, null),
    peTTM: nullish(analytics?.peTTM, null),
    peForward: nullish(analytics?.peForward, null),
    beta: nullish(analytics?.beta, null),
    dividendYield: nullish(analytics?.dividendYield, null),
    range52w: {
      min: nullish(range52w?.min, null),
      max: nullish(range52w?.max, null),
      current: nullish(range52w?.current, null),
    },
    avgVolume: nullish(priceMeta?.avgVolume, null),
    analystConsensus: nullish(analytics?.analystConsensus, null),
    targetPrice: {
      avg: nullish(analytics?.targetPrice?.avg, null),
      high: nullish(analytics?.targetPrice?.high, null),
      low: nullish(analytics?.targetPrice?.low, null),
    },
    profile: {
      name: nullish(profile?.name, null),
      description: nullish(profile?.description, null),
    },
    source: {
      profile: profile?.source ?? 'fmp|sec',
      analytics: analytics?.source ?? 'fmp',
      price: priceMeta?.source ?? 'polygon'
    }
  };
}
