#!/usr/bin/env node
/**
 * fetch-ticker-data.mjs
 *
 * Hydrates every ticker in the universe with live data from FINOTAUR's
 * Railway server. Calls 4 endpoints per ticker in parallel, respects
 * concurrency limits, retries on transient failures, and supports
 * resumable incremental runs.
 *
 * Usage:
 *   node scripts/seo/fetch-ticker-data.mjs [options]
 *
 * Options:
 *   --limit=N           Process only first N tickers (default: all)
 *   --resume            Skip tickers already present with fetched_at < 24h
 *   --concurrency=N     Parallel tickers at a time (default: 3)
 *   --out=<path>        Output path (default: src/data/seo-tickers.json)
 *
 * Environment:
 *   SEO_SERVER_URL      Override server base URL
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE_ROOT = resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://finotaur-server-production.up.railway.app';
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;
const BATCH_DELAY_MS = 250;
const RESUME_TTL_HOURS = 24;
const PROGRESS_INTERVAL = 50;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   limit: number | null,
 *   resume: boolean,
 *   concurrency: number,
 *   out: string,
 *   baseUrl: string
 * }} Flags
 */

/**
 * Parse CLI flags and environment variables.
 * @returns {Flags}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  /** @type {Flags} */
  const flags = {
    limit: null,
    resume: false,
    concurrency: 3,
    out: 'src/data/seo-tickers.json',
    baseUrl: process.env.SEO_SERVER_URL ?? DEFAULT_BASE_URL,
  };

  for (const arg of args) {
    if (arg === '--resume') {
      flags.resume = true;
      continue;
    }
    const m = arg.match(/^--(\w+)=(.+)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (key === 'limit') flags.limit = parseInt(val, 10);
    if (key === 'concurrency') flags.concurrency = parseInt(val, 10);
    if (key === 'out') flags.out = val;
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

/**
 * Sleeps for the given number of milliseconds.
 * @param {number} ms
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetches a URL with automatic retries on failure.
 * Returns the parsed JSON on success, or null after all retries are exhausted.
 *
 * @param {string} url
 * @param {number} attempts
 * @param {number} delayMs
 * @returns {Promise<unknown | null>}
 */
async function fetchJson(url, attempts = RETRY_ATTEMPTS, delayMs = RETRY_DELAY_MS) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Finotaur SEO Builder contact@finotaur.com' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (attempt < attempts) {
        await sleep(delayMs);
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Response parsers — defensive, never assume keys exist
// ---------------------------------------------------------------------------

/**
 * Extracts the description string from a profile API response.
 * @param {unknown} raw
 * @returns {{ description: string | null } | null}
 */
function parseProfile(raw) {
  if (!raw || typeof raw !== 'object') return { description: null };
  const r = /** @type {Record<string, unknown>} */ (raw);
  // Server shape: { profile: { description: "Apple is among..." } }
  const profile = r['profile'];
  const desc =
    profile && typeof profile === 'object'
      ? /** @type {Record<string, unknown>} */ (profile)['description']
      : null;
  return { description: typeof desc === 'string' && desc.trim() ? desc.trim() : null };
}

/**
 * @typedef {{
 *   marketCap: null,
 *   revenue: number | null,
 *   netIncome: number | null,
 *   eps: number | null,
 *   pe: number | null,
 *   roe: number | null,
 *   debtToEquity: number | null,
 *   dividendPerShare: number | null,
 *   fundamentalsPrice: number | null
 * }} Fundamentals
 */

/**
 * Extracts fundamentals from an API response.
 * Server shape: { snapshot: { symbol, price, revenueTTM, netIncomeTTM, epsTTM,
 *   grossProfitTTM, operatingIncomeTTM, totalDebt, equity, dividendPerShare,
 *   pe, roe, roa, debtToEquity, currentRatio }, series: {...} }
 * @param {unknown} raw
 * @returns {Fundamentals}
 */
function parseFundamentals(raw) {
  /** @type {Fundamentals} */
  const empty = {
    marketCap: null, // server does not expose market cap
    revenue: null,
    netIncome: null,
    eps: null,
    pe: null,
    roe: null,
    debtToEquity: null,
    dividendPerShare: null,
    fundamentalsPrice: null,
  };

  if (!raw || typeof raw !== 'object') return empty;
  const r = /** @type {Record<string, unknown>} */ (raw);

  const snapshot = r['snapshot'];
  if (!snapshot || typeof snapshot !== 'object') return empty;
  const s = /** @type {Record<string, unknown>} */ (snapshot);

  /**
   * Returns v if it is a finite number, otherwise null.
   * @param {unknown} v
   * @returns {number | null}
   */
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);

  return {
    marketCap: null,              // server does not expose market cap
    revenue: num(s['revenueTTM']),
    netIncome: num(s['netIncomeTTM']),
    eps: num(s['epsTTM']),
    pe: num(s['pe']),
    roe: num(s['roe']),
    debtToEquity: num(s['debtToEquity']),
    dividendPerShare: num(s['dividendPerShare']),
    fundamentalsPrice: num(s['price']),
  };
}

/**
 * @typedef {{ last: number | null, change_pct: number | null, as_of: string | null }} PriceInfo
 */

/**
 * Extracts price info from a price API response.
 * Server shape: direct array [{ t: <unix-ms>, close: <number> }, ...] sorted ascending by t.
 * @param {unknown} raw
 * @returns {PriceInfo}
 */
function parsePrice(raw) {
  /** @type {PriceInfo} */
  const empty = { last: null, change_pct: null, as_of: null };

  if (!Array.isArray(raw) || raw.length === 0) return empty;

  const lastEntry = raw[raw.length - 1];
  const prevEntry = raw.length >= 2 ? raw[raw.length - 2] : null;

  if (!lastEntry || typeof lastEntry !== 'object') return empty;
  const lastObj = /** @type {Record<string, unknown>} */ (lastEntry);

  const last = typeof lastObj['close'] === 'number' && isFinite(lastObj['close'])
    ? lastObj['close']
    : null;

  let changePct = null;
  if (last !== null && prevEntry && typeof prevEntry === 'object') {
    const prevObj = /** @type {Record<string, unknown>} */ (prevEntry);
    const prev = typeof prevObj['close'] === 'number' && isFinite(prevObj['close'])
      ? prevObj['close']
      : null;
    if (prev !== null && prev !== 0) {
      changePct = Math.round(((last - prev) / prev) * 100 * 100) / 100;
    }
  }

  // t is unix-ms per server contract
  const tRaw = lastObj['t'];
  const asOf = typeof tRaw === 'number' && isFinite(tRaw)
    ? new Date(tRaw).toISOString().slice(0, 10)
    : null;

  return { last, change_pct: changePct, as_of: asOf };
}

/**
 * @typedef {{ title: string | null, source: string | null, url: string | null, published_at: string | null }} NewsItem
 */

/**
 * Extracts up to 3 news items from a news API response.
 * Server shape: direct array [{ id, title, source, url, publishedAt, sentiment }, ...]
 * Note: server uses camelCase `publishedAt`, not `published_at`.
 * @param {unknown} raw
 * @returns {NewsItem[]}
 */
function parseNews(raw) {
  if (!Array.isArray(raw)) return [];

  return raw.slice(0, 3).map((n) => {
    if (!n || typeof n !== 'object') {
      return { title: null, source: null, url: null, published_at: null };
    }
    const item = /** @type {Record<string, unknown>} */ (n);
    return {
      title: typeof item['title'] === 'string' ? item['title'] : null,
      source: typeof item['source'] === 'string' ? item['source'] : null,
      url: typeof item['url'] === 'string' ? item['url'] : null,
      published_at: typeof item['publishedAt'] === 'string' ? item['publishedAt'] : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Per-ticker fetch
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   ticker: string,
 *   name: string,
 *   sector: string | null,
 *   industry: string | null,
 *   type: string
 * }} UniverseEntry
 */

/**
 * @typedef {{
 *   ticker: string,
 *   name: string,
 *   sector: string | null,
 *   industry: string | null,
 *   type: string,
 *   description: string | null,
 *   price: PriceInfo,
 *   fundamentals: Fundamentals,
 *   news: NewsItem[],
 *   fetched_at: string
 * }} TickerData
 */

/**
 * Fetches all 4 data endpoints for a single ticker in parallel.
 * Returns null only if ALL 4 endpoints fail (ticker is likely invalid).
 * Otherwise returns a TickerData object with partial nulls.
 *
 * @param {UniverseEntry} entry
 * @param {string} baseUrl
 * @returns {Promise<TickerData | null>}
 */
async function fetchTickerData(entry, baseUrl) {
  const { ticker } = entry;
  const T = encodeURIComponent(ticker);

  const [profileResult, fundamentalsResult, priceResult, newsResult] =
    await Promise.allSettled([
      fetchJson(`${baseUrl}/api/profile?symbol=${T}`),
      fetchJson(`${baseUrl}/api/fundamentals?symbol=${T}`),
      fetchJson(`${baseUrl}/api/price?symbol=${T}&interval=day`),
      fetchJson(`${baseUrl}/api/news?symbol=${T}&limit=3`),
    ]);

  const rawProfile      = profileResult.status      === 'fulfilled' ? profileResult.value      : null;
  const rawFundamentals = fundamentalsResult.status  === 'fulfilled' ? fundamentalsResult.value  : null;
  const rawPrice        = priceResult.status         === 'fulfilled' ? priceResult.value         : null;
  const rawNews         = newsResult.status          === 'fulfilled' ? newsResult.value          : null;

  // All 4 failed → skip this ticker
  if (rawProfile === null && rawFundamentals === null && rawPrice === null && rawNews === null) {
    return null;
  }

  const parsedProfile      = parseProfile(rawProfile);
  const parsedPrice        = parsePrice(rawPrice);
  const parsedFundamentals = parseFundamentals(rawFundamentals);
  const parsedNews         = parseNews(rawNews);

  // Fallback: if /api/price returned no last price, use fundamentals snapshot price
  if (parsedPrice.last === null && parsedFundamentals.fundamentalsPrice !== null) {
    parsedPrice.last = parsedFundamentals.fundamentalsPrice;
    // change_pct stays null — we have only one price point here
  }

  return {
    ticker: entry.ticker,
    name: entry.name,
    sector: entry.sector,
    industry: entry.industry,
    type: entry.type,
    description: parsedProfile.description,
    price: parsedPrice,
    fundamentals: parsedFundamentals,
    news: parsedNews,
    fetched_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Concurrency pool
// ---------------------------------------------------------------------------

/**
 * Processes items in a pool of fixed concurrency with an inter-batch delay.
 *
 * @template T
 * @template R
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<R>} fn
 * @param {(results: R[], startIndex: number) => void} [onBatch]
 * @returns {Promise<R[]>}
 */
async function poolMap(items, concurrency, fn, onBatch) {
  const results = [];
  let index = 0;

  while (index < items.length) {
    const batch = items.slice(index, index + concurrency);
    const batchIndex = index;
    const batchResults = await Promise.all(
      batch.map((item, i) => fn(item, batchIndex + i))
    );
    results.push(...batchResults);
    if (onBatch) onBatch(batchResults, batchIndex);
    index += concurrency;
    if (index < items.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Resume helper
// ---------------------------------------------------------------------------

/**
 * Reads existing output file for --resume mode.
 * Returns the existing tickers map or an empty map.
 * @param {string} outPath
 * @returns {Promise<Map<string, TickerData>>}
 */
async function loadExistingOutput(outPath) {
  if (!existsSync(outPath)) return new Map();
  try {
    const raw = await readFile(outPath, 'utf8');
    const json = JSON.parse(raw);
    if (json && typeof json.tickers === 'object') {
      return new Map(Object.entries(json.tickers));
    }
  } catch {
    // corrupt or missing — start fresh
  }
  return new Map();
}

/**
 * Returns true if the entry should be skipped because it was fetched recently.
 * @param {TickerData} existing
 * @returns {boolean}
 */
function isFresh(existing) {
  if (!existing?.fetched_at) return false;
  const age = Date.now() - new Date(existing.fetched_at).getTime();
  return age < RESUME_TTL_HOURS * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const flags = parseArgs();
  const outPath = resolve(WORKTREE_ROOT, flags.out);
  const universePath = resolve(WORKTREE_ROOT, 'src/data/ticker-universe.json');

  console.log('=== Finotaur SEO: fetch-ticker-data ===');
  console.log(`Server: ${flags.baseUrl}`);
  console.log(`Concurrency: ${flags.concurrency} | Resume: ${flags.resume}`);
  console.log(`Output: ${outPath}`);
  console.log('');

  // Load universe
  if (!existsSync(universePath)) {
    console.error(`FATAL: ticker-universe.json not found at ${universePath}`);
    console.error('Run build-universe.mjs first.');
    process.exit(1);
  }
  const universeRaw = JSON.parse(await readFile(universePath, 'utf8'));
  /** @type {UniverseEntry[]} */
  let allTickers = universeRaw.tickers ?? [];
  if (flags.limit !== null) {
    allTickers = allTickers.slice(0, flags.limit);
  }
  console.log(`Loaded ${allTickers.length} tickers from universe`);

  // Load existing output for --resume
  const existingMap = flags.resume ? await loadExistingOutput(outPath) : new Map();
  if (flags.resume && existingMap.size > 0) {
    console.log(`Resume mode: ${existingMap.size} tickers already in output`);
  }

  // Determine which tickers need fetching
  /** @type {UniverseEntry[]} */
  const toFetch = allTickers.filter((e) => {
    if (!flags.resume) return true;
    const existing = existingMap.get(e.ticker);
    return !existing || !isFresh(existing);
  });
  console.log(`Fetching ${toFetch.length} tickers (${allTickers.length - toFetch.length} skipped via resume)`);
  console.log('');

  // Stats counters
  let succeeded = 0;
  let partial = 0;
  let failed = 0;
  const startTime = Date.now();

  /**
   * Process a single ticker and update counters.
   * @param {UniverseEntry} entry
   * @param {number} absoluteIndex
   * @returns {Promise<TickerData | null>}
   */
  async function processTicker(entry, absoluteIndex) {
    const data = await fetchTickerData(entry, flags.baseUrl);
    if (data === null) {
      console.log(`  [SKIP] ${entry.ticker} — all 4 endpoints failed`);
      failed++;
      return null;
    }
    // A ticker "succeeded" if it has at minimum: description, price.last, and revenue.
    // ETFs commonly miss fundamentals (revenue null) — that counts as "partial", not failure.
    const isSucceeded =
      data.description !== null &&
      data.price.last !== null &&
      data.fundamentals.revenue !== null;
    if (isSucceeded) {
      succeeded++;
    } else {
      partial++;
    }
    return data;
  }

  // Track batch stats for progress logging
  let batchSucceeded = 0;
  let batchPartial = 0;
  let batchFailed = 0;
  let totalProcessed = 0;

  /** @type {Map<string, TickerData>} */
  const resultMap = new Map(existingMap);

  await poolMap(
    toFetch,
    flags.concurrency,
    processTicker,
    (batchResults, batchStart) => {
      // Update results map
      for (let i = 0; i < batchResults.length; i++) {
        const data = batchResults[i];
        if (data) {
          resultMap.set(data.ticker, data);
        }
      }

      totalProcessed += batchResults.length;

      // Progress report every PROGRESS_INTERVAL tickers
      if (totalProcessed % PROGRESS_INTERVAL < flags.concurrency || totalProcessed >= toFetch.length) {
        const absolutePos = (flags.resume ? allTickers.length - toFetch.length : 0) + totalProcessed;
        console.log(
          `[${absolutePos}/${allTickers.length}] ` +
          `${toFetch[Math.min(batchStart + flags.concurrency - 1, toFetch.length - 1)]?.ticker ?? ''} ` +
          `— ${succeeded} succeeded, ${partial} partial, ${failed} failed total`
        );
      }
    }
  );

  // Build final output — preserve skipped tickers from resume
  /** @type {Record<string, TickerData>} */
  const tickersObj = {};
  for (const entry of allTickers) {
    const data = resultMap.get(entry.ticker);
    if (data) {
      tickersObj[entry.ticker] = data;
    }
  }

  const output = {
    generated_at: new Date().toISOString(),
    count: Object.keys(tickersObj).length,
    tickers: tickersObj,
  };

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(output, null, 2), 'utf8');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('=== Summary ===');
  console.log(`Total tickers fetched: ${toFetch.length}`);
  console.log(`  Succeeded (all 4 endpoints): ${succeeded}`);
  console.log(`  Partial (1-3 endpoints OK):  ${partial}`);
  console.log(`  Failed (all 4 endpoints):    ${failed}`);
  console.log(`  Skipped (resume, fresh):     ${allTickers.length - toFetch.length}`);
  console.log(`Total in output: ${Object.keys(tickersObj).length}`);
  console.log(`Elapsed: ${elapsed}s`);
  console.log(`Output: ${outPath}`);
}

main().catch((err) => {
  console.error('FATAL:', err.message ?? err);
  process.exit(1);
});
