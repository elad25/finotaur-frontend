#!/usr/bin/env node
/**
 * build-universe.mjs
 *
 * Generates the static ticker universe (~2,500 tickers) from free public data:
 *   1. SEC EDGAR company_tickers.json   (~10,000 US-listed companies)
 *   2. GitHub datasets S&P 500 CSV       (~500 companies with sector/industry)
 *   3. Hardcoded ETF list                (~50 curated ETFs)
 *
 * Output: src/data/ticker-universe.json
 *
 * Usage:
 *   node scripts/seo/build-universe.mjs [--limit=N] [--out=<path>]
 *
 * Flags:
 *   --limit=N     Max tickers in output (default: 2500)
 *   --out=<path>  Output JSON path (default: src/data/ticker-universe.json)
 */

import { writeFile, mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE_ROOT = resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

/**
 * Parse --key=value CLI flags into a plain object.
 * @returns {{ limit: number, out: string }}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const flags = { limit: 2500, out: 'src/data/ticker-universe.json' };

  for (const arg of args) {
    const m = arg.match(/^--(\w+)=(.+)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (key === 'limit') flags.limit = parseInt(val, 10);
    if (key === 'out') flags.out = val;
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Curated ETF list
// Each entry: { ticker, name, industry }
// sector is always "ETF" for the type field downstream.
// ---------------------------------------------------------------------------

/** @type {Array<{ticker: string, name: string, industry: string}>} */
const CURATED_ETFS = [
  // Broad market
  { ticker: 'SPY',  name: 'SPDR S&P 500 ETF Trust',               industry: 'Broad Market' },
  { ticker: 'QQQ',  name: 'Invesco QQQ Trust',                     industry: 'Technology' },
  { ticker: 'IWM',  name: 'iShares Russell 2000 ETF',              industry: 'Small Cap' },
  { ticker: 'DIA',  name: 'SPDR Dow Jones Industrial Average ETF', industry: 'Broad Market' },
  { ticker: 'VOO',  name: 'Vanguard S&P 500 ETF',                  industry: 'Broad Market' },
  { ticker: 'VTI',  name: 'Vanguard Total Stock Market ETF',       industry: 'Broad Market' },
  // Thematic / sector
  { ticker: 'ARKK', name: 'ARK Innovation ETF',                    industry: 'Innovation' },
  { ticker: 'XLF',  name: 'Financial Select Sector SPDR Fund',     industry: 'Financials' },
  { ticker: 'XLE',  name: 'Energy Select Sector SPDR Fund',        industry: 'Energy' },
  { ticker: 'XLK',  name: 'Technology Select Sector SPDR Fund',    industry: 'Technology' },
  { ticker: 'XLV',  name: 'Health Care Select Sector SPDR Fund',   industry: 'Health Care' },
  { ticker: 'XLY',  name: 'Consumer Discretionary Select Sector SPDR Fund', industry: 'Consumer Discretionary' },
  { ticker: 'XLP',  name: 'Consumer Staples Select Sector SPDR Fund',       industry: 'Consumer Staples' },
  { ticker: 'XLI',  name: 'Industrial Select Sector SPDR Fund',    industry: 'Industrials' },
  { ticker: 'XLU',  name: 'Utilities Select Sector SPDR Fund',     industry: 'Utilities' },
  { ticker: 'XLB',  name: 'Materials Select Sector SPDR Fund',     industry: 'Materials' },
  { ticker: 'XLRE', name: 'Real Estate Select Sector SPDR Fund',   industry: 'Real Estate' },
  { ticker: 'XLC',  name: 'Communication Services Select Sector SPDR Fund', industry: 'Communication Services' },
  // Commodities
  { ticker: 'GLD',  name: 'SPDR Gold Shares',                      industry: 'Gold' },
  { ticker: 'SLV',  name: 'iShares Silver Trust',                  industry: 'Silver' },
  { ticker: 'USO',  name: 'United States Oil Fund',                industry: 'Oil' },
  { ticker: 'UNG',  name: 'United States Natural Gas Fund',        industry: 'Natural Gas' },
  // Fixed income
  { ticker: 'TLT',  name: 'iShares 20+ Year Treasury Bond ETF',   industry: 'Long-Term Treasuries' },
  { ticker: 'IEF',  name: 'iShares 7-10 Year Treasury Bond ETF',  industry: 'Intermediate Treasuries' },
  { ticker: 'HYG',  name: 'iShares iBoxx High Yield Corporate Bond ETF', industry: 'High Yield Bonds' },
  { ticker: 'LQD',  name: 'iShares iBoxx Investment Grade Corporate Bond ETF', industry: 'Investment Grade Bonds' },
  { ticker: 'AGG',  name: 'iShares Core U.S. Aggregate Bond ETF', industry: 'Aggregate Bonds' },
  { ticker: 'BND',  name: 'Vanguard Total Bond Market ETF',        industry: 'Aggregate Bonds' },
  // International
  { ticker: 'EEM',  name: 'iShares MSCI Emerging Markets ETF',     industry: 'Emerging Markets' },
  { ticker: 'FXI',  name: 'iShares China Large-Cap ETF',           industry: 'China' },
  { ticker: 'EWZ',  name: 'iShares MSCI Brazil ETF',              industry: 'Brazil' },
  { ticker: 'EWJ',  name: 'iShares MSCI Japan ETF',               industry: 'Japan' },
  { ticker: 'EFA',  name: 'iShares MSCI EAFE ETF',                industry: 'Developed Markets ex-US' },
  { ticker: 'VEA',  name: 'Vanguard FTSE Developed Markets ETF',   industry: 'Developed Markets ex-US' },
  { ticker: 'VWO',  name: 'Vanguard FTSE Emerging Markets ETF',    industry: 'Emerging Markets' },
  // Volatility
  { ticker: 'VXX',  name: 'iPath Series B S&P 500 VIX Short-Term Futures ETN', industry: 'Volatility' },
  { ticker: 'SVXY', name: 'ProShares Short VIX Short-Term Futures ETF',         industry: 'Volatility' },
  { ticker: 'UVXY', name: 'ProShares Ultra VIX Short-Term Futures ETF',         industry: 'Volatility' },
  // Leveraged
  { ticker: 'SOXL', name: 'Direxion Daily Semiconductor Bull 3X Shares', industry: 'Semiconductors' },
  { ticker: 'TQQQ', name: 'ProShares UltraPro QQQ',                      industry: 'Technology' },
  { ticker: 'SQQQ', name: 'ProShares UltraPro Short QQQ',                industry: 'Technology' },
  { ticker: 'SPXL', name: 'Direxion Daily S&P 500 Bull 3X Shares',       industry: 'Broad Market' },
  { ticker: 'SPXS', name: 'Direxion Daily S&P 500 Bear 3X Shares',       industry: 'Broad Market' },
  // Extra popular ETFs
  { ticker: 'VIG',  name: 'Vanguard Dividend Appreciation ETF',    industry: 'Dividend Growth' },
  { ticker: 'SCHD', name: 'Schwab US Dividend Equity ETF',         industry: 'Dividend Growth' },
  { ticker: 'JEPI', name: 'JPMorgan Equity Premium Income ETF',    industry: 'Income' },
  { ticker: 'JEPQ', name: 'JPMorgan Nasdaq Equity Premium Income ETF', industry: 'Income' },
  { ticker: 'SOXX', name: 'iShares Semiconductor ETF',             industry: 'Semiconductors' },
  { ticker: 'XBI',  name: 'SPDR S&P Biotech ETF',                  industry: 'Biotechnology' },
  { ticker: 'IBB',  name: 'iShares Biotechnology ETF',             industry: 'Biotechnology' },
  { ticker: 'KWEB', name: 'KraneShares CSI China Internet ETF',    industry: 'China Internet' },
];

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Regex that matches any non-ASCII character */
const NON_ASCII_RE = /[^\x00-\x7F]/;

/**
 * Returns true if the ticker is valid for the universe.
 * Drops: ^ or $ prefix, length > 5, empty.
 * Keeps: dots (BRK.B is valid).
 * @param {string} ticker
 */
function isValidTicker(ticker) {
  if (!ticker || typeof ticker !== 'string') return false;
  if (ticker.startsWith('^') || ticker.startsWith('$')) return false;
  if (ticker.length > 5) return false;
  return true;
}

/**
 * Returns true if the company name is valid (no non-ASCII, non-empty).
 * @param {string} name
 */
function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  if (NON_ASCII_RE.test(name)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

const SEC_UA = 'Finotaur SEO Builder contact@finotaur.com';

/**
 * Fetch with a required User-Agent and throw on non-OK responses.
 * @param {string} url
 * @param {string} userAgent
 * @returns {Promise<Response>}
 */
async function fetchWithUA(url, userAgent) {
  const res = await fetch(url, {
    headers: { 'User-Agent': userAgent },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res;
}

// ---------------------------------------------------------------------------
// Step 1: SEC EDGAR
// ---------------------------------------------------------------------------

/**
 * Fetches the SEC EDGAR company tickers list.
 * Returns an array of { ticker, name, cik } sorted by cik ascending.
 * @returns {Promise<Array<{ticker: string, name: string, cik: number}>>}
 */
async function fetchSecTickers() {
  console.log('[1/4] Fetching SEC EDGAR company_tickers.json...');
  const res = await fetchWithUA(
    'https://www.sec.gov/files/company_tickers.json',
    SEC_UA
  );
  /** @type {Record<string, {cik_str: string, ticker: string, title: string}>} */
  const raw = await res.json();

  const entries = Object.values(raw)
    .map((entry) => ({
      ticker: (entry.ticker ?? '').toUpperCase().trim(),
      name: (entry.title ?? '').trim(),
      cik: parseInt(entry.cik_str ?? '0', 10),
    }))
    .filter((e) => isValidTicker(e.ticker) && isValidName(e.name));

  // Sort by CIK ascending (oldest / largest companies first)
  entries.sort((a, b) => a.cik - b.cik);

  console.log(`    -> ${entries.length} valid entries from SEC EDGAR`);
  return entries;
}

// ---------------------------------------------------------------------------
// Step 2: S&P 500 CSV
// ---------------------------------------------------------------------------

/**
 * Parses a simple CSV string where the first line is the header.
 * Does NOT handle quoted fields with commas inside — the S&P CSV doesn't need it.
 * @param {string} csv
 * @returns {Array<Record<string, string>>}
 */
function parseCsv(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/\r$/, ''));
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/\r$/, ''));
    /** @type {Record<string, string>} */
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });
    return row;
  });
}

/**
 * Fetches S&P 500 constituents and returns a map: ticker -> { sector, industry, name }.
 * @returns {Promise<Map<string, {sector: string, industry: string, name: string}>>}
 */
async function fetchSp500() {
  console.log('[2/4] Fetching S&P 500 constituents CSV...');
  const res = await fetchWithUA(
    'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv',
    SEC_UA
  );
  const csv = await res.text();
  const rows = parseCsv(csv);

  const map = new Map();
  for (const row of rows) {
    const ticker = (row['Symbol'] ?? '').toUpperCase().trim();
    if (!ticker) continue;
    map.set(ticker, {
      name: (row['Security'] ?? '').trim(),
      sector: (row['GICS Sector'] ?? '').trim() || null,
      industry: (row['GICS Sub-Industry'] ?? '').trim() || null,
    });
  }

  console.log(`    -> ${map.size} S&P 500 entries parsed`);
  return map;
}

// ---------------------------------------------------------------------------
// Step 3: ETFs (static)
// ---------------------------------------------------------------------------

/**
 * Returns the hardcoded ETF list as universe entries.
 * @returns {Array<{ticker: string, name: string, sector: string|null, industry: string|null, type: string}>}
 */
function buildEtfEntries() {
  console.log('[3/4] Building curated ETF list...');
  const entries = CURATED_ETFS.map((e) => ({
    ticker: e.ticker,
    name: e.name,
    sector: 'ETF',
    industry: e.industry,
    type: 'etf',
  }));
  console.log(`    -> ${entries.length} ETFs`);
  return entries;
}

// ---------------------------------------------------------------------------
// Step 4: Combine + dedupe + cap
// ---------------------------------------------------------------------------

/**
 * Merges SEC, S&P, and ETF data into the final universe.
 *
 * Priority order for a given ticker:
 *   1. ETF list (always an ETF if listed there)
 *   2. S&P 500 enriched data (has sector/industry)
 *   3. SEC EDGAR bare entry (sector/industry = null)
 *
 * Capping strategy:
 *   - All ETFs (~50)
 *   - All S&P 500 (~500)
 *   - Fill remainder from SEC ordered by CIK (oldest first)
 *
 * @param {Array<{ticker: string, name: string, cik: number}>} secEntries
 * @param {Map<string, {sector: string, industry: string, name: string}>} sp500Map
 * @param {Array<{ticker: string, name: string, sector: string|null, industry: string|null, type: string}>} etfEntries
 * @param {number} limit
 * @returns {Array<{ticker: string, name: string, sector: string|null, industry: string|null, type: string}>}
 */
function buildUniverse(secEntries, sp500Map, etfEntries, limit) {
  console.log('[4/4] Merging and deduplicating...');

  /** @type {Map<string, {ticker: string, name: string, sector: string|null, industry: string|null, type: string}>} */
  const universe = new Map();

  // Layer 1: ETFs (highest priority — always classified as ETF)
  for (const etf of etfEntries) {
    universe.set(etf.ticker, etf);
  }

  // Layer 2: S&P 500 — only add if not already an ETF
  let sp500Added = 0;
  for (const [ticker, data] of sp500Map.entries()) {
    if (universe.has(ticker)) continue;
    if (!isValidTicker(ticker) || !isValidName(data.name)) continue;
    universe.set(ticker, {
      ticker,
      name: data.name,
      sector: data.sector ?? null,
      industry: data.industry ?? null,
      type: 'stock',
    });
    sp500Added++;
  }

  // Layer 3: SEC fill — skip already present tickers
  let secAdded = 0;
  for (const entry of secEntries) {
    if (universe.size >= limit) break;
    if (universe.has(entry.ticker)) continue;

    // Check for S&P enrichment (ticker may appear in SEC but not S&P map)
    universe.set(entry.ticker, {
      ticker: entry.ticker,
      name: entry.name,
      sector: null,
      industry: null,
      type: 'stock',
    });
    secAdded++;
  }

  const result = Array.from(universe.values()).slice(0, limit);

  console.log(`    -> ETFs: ${etfEntries.length}`);
  console.log(`    -> S&P 500 (non-ETF): ${sp500Added}`);
  console.log(`    -> SEC fill: ${secAdded}`);
  console.log(`    -> Final count: ${result.length}`);

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const flags = parseArgs();
  const outPath = resolve(WORKTREE_ROOT, flags.out);

  console.log('=== Finotaur SEO: build-universe ===');
  console.log(`Limit: ${flags.limit} | Output: ${outPath}`);
  console.log('');

  // Fetch all sources (fail fast on any error)
  const [secEntries, sp500Map, etfEntries] = await Promise.all([
    fetchSecTickers(),
    fetchSp500(),
    Promise.resolve(buildEtfEntries()),
  ]);

  const tickers = buildUniverse(secEntries, sp500Map, etfEntries, flags.limit);

  const output = {
    generated_at: new Date().toISOString(),
    count: tickers.length,
    source: 'sec_edgar + sp500 constituents + curated etfs',
    tickers,
  };

  // Ensure output directory exists
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(output, null, 2), 'utf8');

  console.log('');
  console.log(`=== Done: ${tickers.length} tickers written to ${outPath} ===`);
}

main().catch((err) => {
  console.error('FATAL:', err.message ?? err);
  process.exit(1);
});
