// supabase/functions/sec-fundamentals/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Returns free SEC XBRL company profile + financials for a given
//   stock ticker.  Replaces the Polygon-sourced Railway path used by
//   the Stock Analyzer.  All data is sourced from SEC public APIs
//   (no API key required).
//
// INPUT:
//   GET  ?symbol=AAPL
//   POST { symbol: "AAPL", price?: number, sharesOut?: number }
//     - price      : last-close price (optional) — enables PE, P/B, EV ratios
//     - sharesOut  : diluted shares override (optional) — falls back to SEC DEI
//
// OUTPUT:
//   {
//     company:    { symbol, name, cik, sector, industry, website, logo },
//     financials: { revenue, netIncome, eps, grossMargin, operatingMargin,
//                   netMargin, roe, roa, debtToEquity, currentRatio,
//                   fcf, fcfPerShare, ebitda, revenueGrowth, netIncomeGrowth,
//                   epsGrowth, debtToAssets, bookValuePerShare, cashPerShare,
//                   operatingCashFlowPerShare, revenuePerShare, peRatio,
//                   priceToBook, priceToSales, evToEbitda, evToRevenue,
//                   totalEquity, totalLiabilities, operatingIncome,
//                   sharesOutstanding, confidence, components },
//     source:     "sec",
//     meta:       { asOf, errors[] }
//   }
//
// SEC ENDPOINTS HIT:
//   1. https://www.sec.gov/files/company_tickers.json           (CIK lookup)
//   2. https://data.sec.gov/submissions/CIK{pad10}.json         (name, SIC, website)
//   3. https://data.sec.gov/api/xbrl/companyfacts/CIK{pad10}.json (XBRL facts)
//
// SECURITY:
//   Anonymous (no JWT).  SEC requires a User-Agent header — we always send one.
//   No secrets needed or used.
// ═══════════════════════════════════════════════════════════════

// ─── Inline CORS (matches _shared/cors.ts contract) ───────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// ─── SEC fetch headers (required by SEC EDGAR — 403 without UA) ─
const SEC_UA = 'finotaur research contact@finotaur.com';
const SEC_HEADERS = {
  'User-Agent': SEC_UA,
  'Accept': 'application/json',
  'Accept-Encoding': 'gzip, deflate, br',
};

// ─── Module-scope ticker-map cache (lives for the function instance lifetime) ─
// SEC ticker map is ~1 MB and changes rarely; cache avoids re-fetching on
// every warm invocation.
let _tickerMapCache: Record<string, { cik: string; company: string }> | null = null;
let _tickerMapFetchedAt = 0;
const TICKER_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ═════════════════════════════════════════════════════════════════
// SEC helpers — inlined from secCore.ts / sec.ts
// ═════════════════════════════════════════════════════════════════

function padCik(cik: number | string): string {
  return String(cik).padStart(10, '0');
}

async function getTickerMap(): Promise<Record<string, { cik: string; company: string }>> {
  const now = Date.now();
  if (_tickerMapCache && (now - _tickerMapFetchedAt) < TICKER_CACHE_TTL_MS) {
    return _tickerMapCache;
  }
  const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
    headers: SEC_HEADERS,
  });
  if (!res.ok) {
    // Return empty rather than throwing — the caller will produce a graceful error
    return {};
  }
  // deno-lint-ignore no-explicit-any
  const data: any = await res.json();
  const map: Record<string, { cik: string; company: string }> = {};
  for (const k of Object.keys(data)) {
    const row = data[k];
    if (!row?.ticker) continue;
    map[String(row.ticker).toUpperCase()] = {
      cik: padCik(row.cik_str),
      company: String(row.title ?? ''),
    };
  }
  _tickerMapCache = map;
  _tickerMapFetchedAt = now;
  return map;
}

// deno-lint-ignore no-explicit-any
async function fetchSubmissions(cik: string): Promise<any | null> {
  const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
  const res = await fetch(url, { headers: SEC_HEADERS });
  if (!res.ok) return null;
  return await res.json();
}

// deno-lint-ignore no-explicit-any
async function fetchCompanyFacts(cik: string): Promise<any> {
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
  const res = await fetch(url, { headers: SEC_HEADERS });
  if (!res.ok) throw new Error(`SEC companyfacts HTTP ${res.status} for CIK ${cik}`);
  return await res.json();
}

// ═════════════════════════════════════════════════════════════════
// Financials helpers — inlined from secFinancialsHelpers.ts
// ═════════════════════════════════════════════════════════════════

interface ParsedEntry {
  start: string | null;
  end: string | null;
  val: number;
  filed: string | null;
  days: number;
}

function daysBetween(aISO: string, bISO: string): number {
  return Math.round((Date.parse(bISO) - Date.parse(aISO)) / 86_400_000);
}

// deno-lint-ignore no-explicit-any
function parseEntries(units: any): ParsedEntry[] {
  if (!units || typeof units !== 'object') return [];
  // deno-lint-ignore no-explicit-any
  const u = units as Record<string, any>;
  const arr: unknown[] =
    Array.isArray(u['USD'])        ? u['USD']        :
    Array.isArray(u['USD/shares']) ? u['USD/shares'] :
    Array.isArray(u['shares'])     ? u['shares']     :
    [];

  // deno-lint-ignore no-explicit-any
  return (arr as any[]).map((pt) => {
    const start = pt.start ?? null;
    const end   = pt.end   ?? null;
    const filed = pt.filed ?? null;
    const val   = pt.val   ?? null;
    const days  = (start && end) ? daysBetween(String(start), String(end)) : 0;
    return {
      start: start ? String(start) : null,
      end:   end   ? String(end)   : null,
      val:   Number(val),
      filed: filed ? String(filed) : null,
      days,
    };
  }).filter((e) => e.end !== null && e.val !== null && Number.isFinite(e.val));
}

/** YTD-diff algorithm → single-quarter values. */
function quarterlySeries(concept: unknown): Map<string, number> {
  if (!concept || typeof concept !== 'object' || !('units' in (concept as object))) {
    return new Map();
  }
  // deno-lint-ignore no-explicit-any
  const entries = parseEntries((concept as any).units);

  const valid = entries.filter(
    (e) => e.start !== null && e.end !== null && Number.isFinite(e.val) &&
           e.days >= 60 && e.days <= 400,
  );

  // Dedupe by (start, end): latest filed wins.
  const pairMap = new Map<string, ParsedEntry>();
  for (const e of valid) {
    const key = `${e.start}|${e.end}`;
    const existing = pairMap.get(key);
    if (!existing || (e.filed && existing.filed && e.filed > existing.filed)) {
      pairMap.set(key, e);
    }
  }

  // Group by start date (one fiscal-year's cumulative series per group).
  const groups = new Map<string, ParsedEntry[]>();
  for (const e of pairMap.values()) {
    if (!e.start) continue;
    if (!groups.has(e.start)) groups.set(e.start, []);
    groups.get(e.start)!.push(e);
  }

  const assignedEnds = new Set<string>();
  const qMap = new Map<string, number>();

  for (const [start, groupEntries] of groups.entries()) {
    groupEntries.sort((a, b) => (a.end! < b.end! ? -1 : 1));
    let prevEnd = start;
    let prevVal = 0;

    for (const entry of groupEntries) {
      const segDays = daysBetween(prevEnd, entry.end!);
      if (segDays >= 70 && segDays <= 100) {
        const quarterValue = entry.val - prevVal;
        if (!assignedEnds.has(entry.end!)) {
          assignedEnds.add(entry.end!);
          qMap.set(entry.end!, quarterValue);
        }
      }
      prevEnd = entry.end!;
      prevVal = entry.val;
    }
  }

  return qMap;
}

/** For balance-sheet concepts (no start / days ≈ 0). */
function instantSeries(concept: unknown): Map<string, number> {
  if (!concept || typeof concept !== 'object' || !('units' in (concept as object))) {
    return new Map();
  }
  // deno-lint-ignore no-explicit-any
  const entries = parseEntries((concept as any).units);
  const iMap = new Map<string, { val: number; filed: string | null }>();

  for (const e of entries) {
    if (e.days > 1) continue;
    const existing = iMap.get(e.end!);
    if (!existing || (e.filed && existing.filed && e.filed > existing.filed)) {
      iMap.set(e.end!, { val: e.val, filed: e.filed });
    }
  }

  const result = new Map<string, number>();
  for (const [end, rec] of iMap.entries()) {
    result.set(end, rec.val);
  }
  return result;
}

/**
 * Returns the freshest-data quarterly series among multiple concept names.
 * Prevents picking stale series (e.g. old `Revenues` vs current revenue concept).
 */
function firstFlowSeries(
  F: Record<string, unknown>,
  concepts: string[],
): Map<string, number> {
  let bestMap: Map<string, number> = new Map();
  let bestLatest = '';

  for (const name of concepts) {
    if (!F?.[name]) continue;
    const s = quarterlySeries(F[name]);
    if (s.size === 0) continue;
    let latest = '';
    for (const key of s.keys()) {
      if (key > latest) latest = key;
    }
    if (latest > bestLatest) {
      bestLatest = latest;
      bestMap = s;
    }
  }

  return bestMap;
}

function seriesLatestDate(m: Map<string, number>): string {
  let latest = '';
  for (const key of m.keys()) {
    if (key > latest) latest = key;
  }
  return latest;
}

function firstInstantSeries(
  F: Record<string, unknown>,
  concepts: string[],
): Map<string, number> {
  for (const name of concepts) {
    if (F?.[name]) {
      const s = instantSeries(F[name]);
      if (s.size > 0) return s;
    }
  }
  return new Map();
}

// ═════════════════════════════════════════════════════════════════
// Financials normalizer — inlined from secFinancials.ts
// ═════════════════════════════════════════════════════════════════

function saneMargin(x: number | null, maxAbs = 100): number | null {
  if (x === null || !Number.isFinite(x) || Math.abs(x) > maxAbs) return null;
  return x;
}

function safePct(num: number | null, den: number | null): number | null {
  if (num === null || den === null || den === 0) return null;
  const v = (num / den) * 100;
  return Number.isFinite(v) ? v : null;
}

function safeDiv(num: number | null, den: number | null): number | null {
  if (num === null || den === null || den === 0) return null;
  const v = num / den;
  return Number.isFinite(v) ? v : null;
}

function safeGrowthPct(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null || prev === 0) return null;
  const v = ((cur - prev) / Math.abs(prev)) * 100;
  return Number.isFinite(v) ? v : null;
}

/** Sum the 4 most-recent quarter values from a Map<date,val>. Returns null if <4 available. */
function ttmFromMap(qMap: Map<string, number>): number | null {
  if (qMap.size === 0) return null;
  const sorted = [...qMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  if (sorted.length < 4) return null;
  const sum = sorted.slice(0, 4).reduce((acc, [, v]) => acc + v, 0);
  return Number.isFinite(sum) ? sum : null;
}

function latestInstant(iMap: Map<string, number>): number | null {
  if (iMap.size === 0) return null;
  const sorted = [...iMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const v = sorted[0][1];
  return Number.isFinite(v) ? v : null;
}

function prevInstant(iMap: Map<string, number>): number | null {
  const sorted = [...iMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  if (sorted.length < 2) return null;
  const v = sorted[1][1];
  return Number.isFinite(v) ? v : null;
}

/** Prior-year TTM = quarters 5–8 (before the most-recent 4). */
function annualPrior(qMap: Map<string, number>): number | null {
  if (qMap.size < 8) return null;
  const sorted = [...qMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const prior4 = sorted.slice(4, 8);
  if (prior4.length < 4) return null;
  const s = prior4.reduce((acc, [, v]) => acc + v, 0);
  return Number.isFinite(s) ? s : null;
}

/** Resolve diluted shares from the SEC companyfacts JSON. */
function resolveShares(facts: unknown): number | null {
  // deno-lint-ignore no-explicit-any
  const F   = (facts as any)?.facts?.['us-gaap'] ?? {};
  // deno-lint-ignore no-explicit-any
  const DEI = (facts as any)?.facts?.['dei'] ?? {};

  // deno-lint-ignore no-explicit-any
  function latestSharesNode(node: any): number | null {
    const arr = node?.units?.shares;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    // deno-lint-ignore no-explicit-any
    const sorted = [...arr].sort((a: any, b: any) =>
      String(a.end ?? '').localeCompare(String(b.end ?? ''))
    );
    const v = Number(sorted[sorted.length - 1]?.val);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  return (
    latestSharesNode(DEI.EntityCommonStockSharesOutstanding) ??
    latestSharesNode(F.WeightedAverageNumberOfDilutedSharesOutstanding) ??
    latestSharesNode(F.CommonStockSharesOutstanding) ??
    null
  );
}

// ─── Confidence flags ────────────────────────────────────────
interface FinancialsConfidence {
  revenue: boolean;
  netIncome: boolean;
  grossProfit: boolean;
  operatingIncome: boolean;
  cfo: boolean;
  capex: boolean;
  totalAssets: boolean;
  totalEquity: boolean;
  currentAssets: boolean;
  currentLiabilities: boolean;
  longTermDebt: boolean;
  shortTermDebt: boolean;
  sharesOut: boolean;
  da: boolean;
}

// deno-lint-ignore no-explicit-any
function buildFinancials(facts: any, price: number | null, sharesOutOverride: number | null) {
  // deno-lint-ignore no-explicit-any
  const F = (facts as any)?.facts?.['us-gaap'] ?? {};

  // ── Flow series (YTD-diff algorithm) ─────────────────────────────
  const revMap = firstFlowSeries(F, [
    'Revenues',
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'RevenueFromContractWithCustomerIncludingAssessedTax',
    'SalesRevenueNet',
    'RevenuesNetOfInterestExpense',
  ]);

  const niMap  = firstFlowSeries(F, ['NetIncomeLoss', 'ProfitLoss']);

  // GrossProfit: reject stale series (> 3 years old) and fall back to COGS synthetic
  const STALE_GP_CUTOFF = `${new Date().getFullYear() - 3}-01-01`;
  const _gpRaw    = firstFlowSeries(F, ['GrossProfit']);
  const gpMap     = seriesLatestDate(_gpRaw) >= STALE_GP_CUTOFF ? _gpRaw : new Map<string, number>();

  const cogsMap   = firstFlowSeries(F, [
    'CostOfRevenue',
    'CostOfGoodsAndServicesSold',
    'CostOfGoodsSold',
  ]);

  const opMap    = firstFlowSeries(F, [
    'OperatingIncomeLoss',
    'OperatingIncomeLossBeforeEquityMethodInvestments',
  ]);

  const cfoMap   = firstFlowSeries(F, [
    'NetCashProvidedByUsedInOperatingActivities',
    'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations',
  ]);

  const capexMap = firstFlowSeries(F, [
    'PaymentsToAcquirePropertyPlantAndEquipment',
    'PaymentsForCapitalImprovements',
  ]);

  const daMap    = firstFlowSeries(F, [
    'DepreciationDepletionAndAmortization',
    'DepreciationAndAmortization',
    'Depreciation',
  ]);

  // ── Instant (balance-sheet) series ────────────────────────────────
  const assetsMap  = firstInstantSeries(F, ['Assets']);
  const equityMap  = firstInstantSeries(F, [
    'StockholdersEquity',
    'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest',
  ]);
  const liabMap    = firstInstantSeries(F, ['Liabilities']);
  const curAssMap  = firstInstantSeries(F, ['AssetsCurrent']);
  const curLibMap  = firstInstantSeries(F, ['LiabilitiesCurrent']);
  const cashMap    = firstInstantSeries(F, [
    'CashAndCashEquivalentsAtCarryingValue',
    'CashAndCashEquivalents',
  ]);
  const ltdMap     = firstInstantSeries(F, ['LongTermDebtNoncurrent', 'LongTermDebt']);
  const stdMap     = firstInstantSeries(F, [
    'DebtCurrent',
    'ShortTermBorrowings',
    'LongTermDebtCurrent',
  ]);

  // ── TTM flow values ────────────────────────────────────────────────
  const revenueTTM         = ttmFromMap(revMap);
  const netIncomeTTM       = ttmFromMap(niMap);
  const gpTTMDirect        = ttmFromMap(gpMap);
  const cogsTTM            = ttmFromMap(cogsMap);
  const grossProfitTTM: number | null =
    gpTTMDirect ??
    (revenueTTM !== null && cogsTTM !== null ? revenueTTM - cogsTTM : null);
  const operatingIncomeTTM = ttmFromMap(opMap);
  const cfoTTM             = ttmFromMap(cfoMap);
  const capexRaw           = ttmFromMap(capexMap);
  const capexTTM           = capexRaw !== null ? Math.abs(capexRaw) : null;
  const daTTM              = ttmFromMap(daMap);

  // ── Latest balance-sheet instants ─────────────────────────────────
  const totalAssets       = latestInstant(assetsMap);
  const totalEquity       = latestInstant(equityMap);
  const totalLiabilities  = latestInstant(liabMap);
  const currentAssets     = latestInstant(curAssMap);
  const currentLiab       = latestInstant(curLibMap);
  const cash              = latestInstant(cashMap);
  const ltd               = latestInstant(ltdMap);
  const std               = latestInstant(stdMap);
  const totalDebt: number | null =
    (ltd !== null || std !== null) ? (ltd ?? 0) + (std ?? 0) : null;

  const totalEquityPrev = prevInstant(equityMap);
  const totalAssetsPrev = prevInstant(assetsMap);

  // ── Shares ────────────────────────────────────────────────────────
  const sharesOut: number | null = sharesOutOverride ?? resolveShares(facts);

  // ── YoY growth ────────────────────────────────────────────────────
  const revenuePriorTTM   = annualPrior(revMap);
  const netIncomePriorTTM = annualPrior(niMap);

  const revenueGrowth   = safeGrowthPct(revenueTTM, revenuePriorTTM);
  const netIncomeGrowth = safeGrowthPct(netIncomeTTM, netIncomePriorTTM);

  // EPS growth
  let epsGrowth: number | null = null;
  if (sharesOut && sharesOut > 0) {
    const epsTTM      = netIncomeTTM    !== null ? netIncomeTTM    / sharesOut : null;
    const epsPriorTTM = netIncomePriorTTM !== null ? netIncomePriorTTM / sharesOut : null;
    epsGrowth = safeGrowthPct(epsTTM, epsPriorTTM);
  } else {
    // Attempt direct EPS from us-gaap EarningsPerShareDiluted
    const epsNode = F?.EarningsPerShareDiluted;
    if (epsNode?.units) {
      const arr =
        epsNode.units?.['USD/shares'] ??
        epsNode.units?.USD ??
        [];
      if (Array.isArray(arr)) {
        const epsQMap = new Map<string, number>();
        // deno-lint-ignore no-explicit-any
        for (const pt of arr as any[]) {
          if (!pt.start || !pt.end) continue;
          const days = Math.round(
            (Date.parse(String(pt.end)) - Date.parse(String(pt.start))) / 86_400_000,
          );
          if (days < 80 || days > 100) continue;
          const v = Number(pt.val);
          if (!Number.isFinite(v)) continue;
          epsQMap.set(String(pt.end), v);
        }
        const sorted = [...epsQMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
        if (sorted.length >= 8) {
          const curEps  = sorted.slice(0, 4).reduce((s, [, v]) => s + v, 0);
          const prevEps = sorted.slice(4, 8).reduce((s, [, v]) => s + v, 0);
          epsGrowth = safeGrowthPct(curEps, prevEps);
        }
      }
    }
  }

  // ── Derived metrics ────────────────────────────────────────────────
  const grossMargin     = saneMargin(safePct(grossProfitTTM, revenueTTM), 100);
  const operatingMargin = saneMargin(safePct(operatingIncomeTTM, revenueTTM), 100);
  const netMargin       = saneMargin(safePct(netIncomeTTM, revenueTTM), 100);

  const equityAvg = (totalEquity !== null && totalEquityPrev !== null)
    ? (totalEquity + totalEquityPrev) / 2
    : (totalEquity ?? null);
  const assetsAvg = (totalAssets !== null && totalAssetsPrev !== null)
    ? (totalAssets + totalAssetsPrev) / 2
    : (totalAssets ?? null);

  const roe = safePct(netIncomeTTM, equityAvg);
  const roa = safePct(netIncomeTTM, assetsAvg);

  const currentRatio = safeDiv(currentAssets, currentLiab);
  const debtToEquity = safeDiv(totalDebt, totalEquity);
  const debtToAssets = safeDiv(totalDebt, totalAssets);

  const fcfTTM: number | null =
    cfoTTM !== null && capexTTM !== null ? cfoTTM - capexTTM : null;

  const sh = (sharesOut !== null && sharesOut > 0) ? sharesOut : null;
  const eps                       = sh ? safeDiv(netIncomeTTM, sh) : null;
  const revenuePerShare           = sh ? safeDiv(revenueTTM, sh) : null;
  const bookValuePerShare         = sh ? safeDiv(totalEquity, sh) : null;
  const cashPerShare              = sh ? safeDiv(cash, sh) : null;
  const freeCashFlowPerShare      = sh ? safeDiv(fcfTTM, sh) : null;
  const operatingCashFlowPerShare = sh ? safeDiv(cfoTTM, sh) : null;

  // EBITDA ≈ Operating Income + D&A  (best-effort without D&A)
  const ebitda: number | null =
    operatingIncomeTTM !== null && daTTM !== null
      ? operatingIncomeTTM + daTTM
      : operatingIncomeTTM;

  // EV and price-dependent ratios
  let marketCap: number | null = null;
  if (price !== null && sh !== null) marketCap = price * sh;
  const ev: number | null =
    marketCap !== null && totalDebt !== null && cash !== null
      ? marketCap + totalDebt - cash
      : null;

  const peRatio     = (price !== null && eps !== null && eps !== 0) ? price / eps : null;
  const priceToBook = (price !== null && bookValuePerShare !== null && bookValuePerShare !== 0)
    ? price / bookValuePerShare : null;
  const priceToSales = sh !== null && revenueTTM !== null && revenueTTM !== 0 && marketCap !== null
    ? marketCap / revenueTTM : null;
  const evToEbitda  = ev !== null && ebitda !== null && ebitda !== 0 ? ev / ebitda : null;
  const evToRevenue = ev !== null && revenueTTM !== null && revenueTTM !== 0 ? ev / revenueTTM : null;

  // ── Confidence flags ─────────────────────────────────────────────
  const confidence: FinancialsConfidence = {
    revenue:            revenueTTM !== null,
    netIncome:          netIncomeTTM !== null,
    grossProfit:        grossProfitTTM !== null,
    operatingIncome:    operatingIncomeTTM !== null,
    cfo:                cfoTTM !== null,
    capex:              capexTTM !== null,
    totalAssets:        totalAssets !== null,
    totalEquity:        totalEquity !== null,
    currentAssets:      currentAssets !== null,
    currentLiabilities: currentLiab !== null,
    longTermDebt:       ltd !== null,
    shortTermDebt:      std !== null,
    sharesOut:          sharesOut !== null,
    da:                 daTTM !== null,
  };

  return {
    // Primary fields matching Polygon/FMP endpoint shape
    revenue:                  revenueTTM,
    netIncome:                netIncomeTTM,
    eps,
    grossMargin,
    operatingMargin,
    netMargin,
    roe,
    roa,
    debtToEquity,
    currentRatio,
    fcf:                      fcfTTM,
    fcfPerShare:              freeCashFlowPerShare,
    ebitda,
    revenueGrowth,
    netIncomeGrowth,
    epsGrowth,
    debtToAssets,
    bookValuePerShare,
    cashPerShare,
    operatingCashFlowPerShare,
    revenuePerShare,
    peRatio,
    priceToBook,
    priceToSales,
    evToEbitda,
    evToRevenue,
    // Raw building blocks
    totalEquity,
    totalLiabilities,
    operatingIncome:          operatingIncomeTTM,
    sharesOutstanding:        sharesOut,
    totalDebt,
    cash,
    // Metadata
    confidence,
    components: {
      revenueTTM,
      netIncomeTTM,
      grossProfitTTM,
      operatingIncomeTTM,
      cfoTTM,
      capexTTM,
      daTTM,
      totalAssets,
      totalEquity,
      currentAssets,
      currentLiabilities: currentLiab,
      totalDebt,
      cash,
      sharesOut,
    },
  };
}

// ═════════════════════════════════════════════════════════════════
// Company profile builder
// ═════════════════════════════════════════════════════════════════

// deno-lint-ignore no-explicit-any
function extractCompanyProfile(symbol: string, cik: string, subs: any | null, tickerEntry: { cik: string; company: string }) {
  const name         = subs?.name ?? tickerEntry.company ?? symbol;
  const sicDesc      = subs?.sicDescription ?? null;
  // SIC description is "Software Publishers" etc.  Map to sector/industry as best-effort.
  const sector       = sicDesc ?? null;
  const industry     = sicDesc ?? null;
  const website: string | null = subs?.website ?? null;
  const exchange     = subs?.exchanges?.[0] ?? null;

  // Derive logo from Clearbit if we have a domain
  let logo: string | null = null;
  if (website) {
    try {
      const host = new URL(website.startsWith('http') ? website : `https://${website}`).hostname;
      // Strip www. prefix
      const domain = host.replace(/^www\./, '');
      if (domain && domain.includes('.')) {
        logo = `https://logo.clearbit.com/${domain}`;
      }
    } catch {
      // Malformed URL — leave logo null
    }
  }

  return { symbol: symbol.toUpperCase(), name, cik, sector, industry, website, logo, exchange };
}

// ═════════════════════════════════════════════════════════════════
// Null financials shape (returned on failure)
// ═════════════════════════════════════════════════════════════════

function nullFinancials() {
  const conf: FinancialsConfidence = {
    revenue: false, netIncome: false, grossProfit: false, operatingIncome: false,
    cfo: false, capex: false, totalAssets: false, totalEquity: false,
    currentAssets: false, currentLiabilities: false, longTermDebt: false,
    shortTermDebt: false, sharesOut: false, da: false,
  };
  return {
    revenue: null, netIncome: null, eps: null, grossMargin: null,
    operatingMargin: null, netMargin: null, roe: null, roa: null,
    debtToEquity: null, currentRatio: null, fcf: null, fcfPerShare: null,
    ebitda: null, revenueGrowth: null, netIncomeGrowth: null, epsGrowth: null,
    debtToAssets: null, bookValuePerShare: null, cashPerShare: null,
    operatingCashFlowPerShare: null, revenuePerShare: null, peRatio: null,
    priceToBook: null, priceToSales: null, evToEbitda: null, evToRevenue: null,
    totalEquity: null, totalLiabilities: null, operatingIncome: null,
    sharesOutstanding: null, totalDebt: null, cash: null,
    confidence: conf,
    components: {
      revenueTTM: null, netIncomeTTM: null, grossProfitTTM: null,
      operatingIncomeTTM: null, cfoTTM: null, capexTTM: null, daTTM: null,
      totalAssets: null, totalEquity: null, currentAssets: null,
      currentLiabilities: null, totalDebt: null, cash: null, sharesOut: null,
    },
  };
}

// ═════════════════════════════════════════════════════════════════
// Request parser
// ═════════════════════════════════════════════════════════════════

interface FundamentalsRequest {
  symbol: string;
  price?: number | null;
  sharesOut?: number | null;
}

async function parseRequest(req: Request): Promise<FundamentalsRequest> {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    return {
      symbol:    url.searchParams.get('symbol') ?? '',
      price:     url.searchParams.has('price')     ? Number(url.searchParams.get('price'))     : null,
      sharesOut: url.searchParams.has('sharesOut') ? Number(url.searchParams.get('sharesOut')) : null,
    };
  }
  return await req.json();
}

// ═════════════════════════════════════════════════════════════════
// HTTP handler
// ═════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'GET or POST only' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: FundamentalsRequest;
  try {
    body = await parseRequest(req);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const symbol = String(body.symbol ?? '').trim().toUpperCase();
  if (!symbol) {
    return new Response(JSON.stringify({ error: 'symbol is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const price:     number | null = (body.price != null && Number.isFinite(Number(body.price)))     ? Number(body.price)     : null;
  const sharesOut: number | null = (body.sharesOut != null && Number.isFinite(Number(body.sharesOut))) ? Number(body.sharesOut) : null;

  const asOf   = new Date().toISOString();
  const errors: string[] = [];

  // ── Null company shape used on early-bail paths ────────────────
  const nullCompany = {
    symbol,
    name: null,
    cik: null,
    sector: null,
    industry: null,
    website: null,
    logo: null,
    exchange: null,
  };

  // ── 1. Resolve CIK ────────────────────────────────────────────
  let tickerEntry: { cik: string; company: string } | undefined;
  try {
    const map = await getTickerMap();
    tickerEntry = map[symbol];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`ticker map fetch failed: ${msg}`);
    return new Response(
      JSON.stringify({ company: nullCompany, financials: nullFinancials(), source: 'sec', meta: { asOf, errors } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (!tickerEntry) {
    errors.push(`No CIK found for symbol ${symbol}`);
    return new Response(
      JSON.stringify({ company: nullCompany, financials: nullFinancials(), source: 'sec', meta: { asOf, errors } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const cik = tickerEntry.cik;

  // ── 2. Fetch submissions (company profile) — non-fatal ────────
  // deno-lint-ignore no-explicit-any
  let subs: any | null = null;
  try {
    subs = await fetchSubmissions(cik);
  } catch (e) {
    errors.push(`submissions fetch failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 3. Build company profile ──────────────────────────────────
  const company = extractCompanyProfile(symbol, cik, subs, tickerEntry);

  // ── 4. Fetch companyfacts (XBRL) + normalise ──────────────────
  let financials = nullFinancials();
  try {
    const facts = await fetchCompanyFacts(cik);
    financials = buildFinancials(facts, price, sharesOut);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`companyfacts failed: ${msg}`);
    console.error(`sec-fundamentals: facts fetch failed for ${symbol} (CIK ${cik}):`, msg);
    // Return graceful null-financials — caller degrades gracefully
    return new Response(
      JSON.stringify({ company, financials: nullFinancials(), source: 'sec', meta: { asOf, errors } }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          // Short cache — still useful even for error responses so we don't hammer SEC
          'Cache-Control': 'public, max-age=60, s-maxage=120',
        },
      },
    );
  }

  // ── 5. Respond ────────────────────────────────────────────────
  return new Response(
    JSON.stringify({ company, financials, source: 'sec', meta: { asOf, errors } }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        // Fundamentals don't change intra-day; cache aggressively at the edge.
        'Cache-Control': 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400',
        'Vary': 'Accept-Encoding',
      },
    },
  );
});
