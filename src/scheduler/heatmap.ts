import { saveWithTTL } from '../store/cache';
import type { HeatmapResponse, MarketKey } from '../types/heatmap';
import { fetchStocks, fetchIndices, fetchCommodities } from '../sources/fmp';
import { fetchCrypto } from '../sources/coingecko';
import { fetchForex } from '../sources/forex';
import { fetchFutures } from '../sources/futures';

const TTL_MIN = Number(process.env.HEATMAP_TTL_MIN ?? 30);
const TTL_SEC = TTL_MIN * 60;

const MARKETS: { key: MarketKey; fn: () => Promise<{ items: any[]; provider: string }> }[] = [
  { key: 'stocks', fn: fetchStocks },
  { key: 'indices', fn: fetchIndices },
  { key: 'crypto', fn: fetchCrypto },
  { key: 'futures', fn: fetchFutures },
  { key: 'forex', fn: fetchForex },
  { key: 'commodities', fn: fetchCommodities },
];

async function runOnceFor(key: MarketKey, fn: () => Promise<{ items: any[]; provider: string }>) {
  try {
    const { items, provider } = await fn();
    const doc: HeatmapResponse = {
      market: key,
      asOf: Date.now(),
      items,
      provider,
      ttlSec: TTL_SEC,
      stale: false,
    };
    saveWithTTL(`heatmap:v1:${key}`, doc, TTL_SEC);
    // jitter between markets 1-3s
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
  } catch (err) {
    console.error('[HEATMAP scheduler]', key, err);
  }
}

async function runCycle() {
  for (const { key, fn } of MARKETS) {
    await runOnceFor(key, fn);
  }
}

export function startScheduler() {
  // first run immediately
  runCycle();
  // then every ~30 min with jitter ±2.5 min
  setInterval(runCycle, TTL_SEC * 1000 + ((Math.random() * 5 - 2.5) * 60 * 1000));
}
