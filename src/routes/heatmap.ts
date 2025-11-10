import { Router } from 'express';
import { getFresh, saveWithTTL } from '../store/cache';
import type { MarketKey, HeatmapResponse } from '../types/heatmap';
import { fetchStocks, fetchIndices, fetchCommodities } from '../sources/fmp';
import { fetchCrypto } from '../sources/coingecko';
import { fetchForex } from '../sources/forex';
import { fetchFutures } from '../sources/futures';

const r = Router();
const TTL_MIN = Number(process.env.HEATMAP_TTL_MIN ?? 30);
const TTL_SEC = TTL_MIN * 60;

const FETCHERS: Record<MarketKey, () => Promise<{ items: any[]; provider: string }>> = {
  stocks: fetchStocks,
  indices: fetchIndices,
  crypto: fetchCrypto,
  futures: fetchFutures,
  forex: fetchForex,
  commodities: fetchCommodities,
};

async function bootstrap(market: MarketKey): Promise<HeatmapResponse> {
  const { items, provider } = await FETCHERS[market]();
  const doc: HeatmapResponse = {
    market,
    asOf: Date.now(),
    items,
    provider,
    ttlSec: TTL_SEC,
    stale: false,
  };
  saveWithTTL(`heatmap:v1:${market}`, doc, TTL_SEC);
  return doc;
}

const MARKETS: MarketKey[] = ['stocks','indices','crypto','futures','forex','commodities'];

for (const m of MARKETS) {
  r.get(`/${m}`, async (_req, res) => {
    try {
      const cached = getFresh<HeatmapResponse>(`heatmap:v1:${m}`);
      if (cached) {
        res.set('Cache-Control', 'public, max-age=60');
        res.set('X-Last-Updated', String(cached.value.asOf));
        return res.json({ ...cached.value, stale: cached.stale });
      }
      // cache miss -> bootstrap once
      const doc = await bootstrap(m);
      res.set('Cache-Control', 'public, max-age=60');
      res.set('X-Last-Updated', String(doc.asOf));
      return res.json(doc);
    } catch (err) {
      console.error('[heatmap route]', m, err);
      return res.status(500).json({ error: 'failed to load heatmap' });
    }
  });
}

// simple health endpoint
r.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

export default r;
