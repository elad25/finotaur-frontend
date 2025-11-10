// finotaur-server/src/services/fundamentals/sec.ts
import { getCompanyFactsByCIK, getTickerMap } from "../../services/sec";
import { getSnapshotTicker, getAggs, getTickerDetails } from "../providers/polygon";

type Tv = { t: string; v: number | null };

function lastN<T>(arr: T[], n: number): T[] {
  if (!Array.isArray(arr)) return [];
  const len = arr.length;
  return arr.slice(Math.max(0, len - n));
}
async function tickerToCIK(symbol: string): Promise<string | null> {
  const map: any = await getTickerMap();
  const row = map?.[symbol?.toUpperCase?.() || ""];
  if (!row) return null;
  return String(row.cik_str || row.cik || "").padStart(10, "0") || null;
}
function seriesFromUSD(units: any): Tv[] {
  const usd = units?.USD;
  if (!Array.isArray(usd)) return [];
  const points = usd.map((row: any) => ({ t: String(row.end || row.fy || row.fp || ""), v: (row.val ?? null) as number | null }));
  points.sort((a, b) => String(a.t).localeCompare(String(b.t)));
  return points;
}
function ttmSum(units: any): number | null {
  const usd = units?.USD;
  if (!Array.isArray(usd)) return null;
  const sorted = usd.slice().sort((a: any, b: any) => String(a.end).localeCompare(String(b.end)));
  let sum = 0, count = 0;
  for (let i = sorted.length - 1; i >= 0 && count < 4; i--) { sum += Number(sorted[i]?.val || 0); count++; }
  return count === 4 ? sum : null;
}
function latest(units:any): number | null {
  const usd = units?.USD;
  if (!Array.isArray(usd) || usd.length === 0) return null;
  const row = usd[usd.length - 1];
  const v = Number(row?.val);
  return Number.isFinite(v) ? v : null;
}

export async function fetchSecData(symbol: string, _tf: "TTM"|"Annual"|"Quarterly" = "TTM", periods = 10) {
  const cik = await tickerToCIK(symbol);
  if (!cik) throw new Error(`No CIK for ${symbol}`);
  const facts: any = await getCompanyFactsByCIK(cik);

  const F = facts?.facts?.["us-gaap"] || {};
  const rev = F.Revenues || F.RevenueFromContractWithCustomerExcludingAssessedTax;
  const ni  = F.NetIncomeLoss;
  const gp  = F.GrossProfit;
  const oi  = F.OperatingIncomeLoss;
  const ta  = F.Assets;
  const se  = F.StockholdersEquity;
  const tdLong = F.LongTermDebtNoncurrent || F.LongTermDebt;
  const tdShort = F.ShortTermBorrowings || F.DebtCurrent;
  const cash = F.CashAndCashEquivalentsAtCarryingValue || F.CashAndCashEquivalentsPeriodIncreaseDecrease;

  const cfo = F.NetCashProvidedByUsedInOperatingActivities;
  const cfi = F.NetCashProvidedByUsedInInvestingActivities;
  const cff = F.NetCashProvidedByUsedInFinancingActivities;

  const revenueTTM = ttmSum(rev?.units);
  const netIncomeTTM = ttmSum(ni?.units);
  const grossMargin = (ttmSum(gp?.units) && revenueTTM) ? (ttmSum(gp?.units)! / revenueTTM) * 100 : null;
  const operatingMargin = (ttmSum(oi?.units) && revenueTTM) ? (ttmSum(oi?.units)! / revenueTTM) * 100 : null;
  const netMargin = (netIncomeTTM && revenueTTM) ? (netIncomeTTM / revenueTTM) * 100 : null;

  const equityLatest = latest(se?.units);
  const assetsLatest = latest(ta?.units);
  const debtLatest = (latest(tdLong?.units) || 0) + (latest(tdShort?.units) || 0);
  const cashLatest = latest(cash?.units) || 0;

  const roe = (netIncomeTTM && equityLatest) ? (Number(netIncomeTTM) / equityLatest) * 100 : null;
  const roa = (netIncomeTTM && assetsLatest) ? (Number(netIncomeTTM) / assetsLatest) * 100 : null;

  // Polygon snapshot + details
  let marketCap: number | null = null;
  let lastPrice: number | null = null;
  let sharesOut: number | null = null;
  try {
    const snap = await getSnapshotTicker(symbol);
    const s = snap?.ticker || snap?.results || {};
    marketCap = Number(s?.market_cap || s?.marketCap || NaN);
    if (!Number.isFinite(marketCap)) marketCap = null;
    lastPrice = Number(s?.lastTrade?.p || s?.last?.price || s?.last?.p || s?.day?.c || NaN);
    if (!Number.isFinite(lastPrice)) lastPrice = null;
  } catch {}

  try {
    const det = await getTickerDetails(symbol);
    const r = det?.results || det;
    const so = Number(r?.share_class_shares_outstanding || r?.weighted_shares_outstanding || r?.shares_outstanding || NaN);
    sharesOut = Number.isFinite(so) ? so : null;
  } catch {}

  // Price series
  const today = new Date();
  const from = new Date(today); from.setFullYear(today.getFullYear()-3);
  const fromIso = from.toISOString().slice(0,10);
  const toIso = today.toISOString().slice(0,10);
  let price: Tv[] = [];
  try {
    const aggs = await getAggs(symbol, "day", fromIso, toIso);
    const results = aggs?.results || [];
    price = results.map((r:any)=> ({ t: new Date(r.t || r.timestamp || 0).toISOString().slice(0,10), v: Number(r.c || r.close || 0) }));
  } catch {}

  const trends = {
    periods: [],
    revenue: lastN(seriesFromUSD(rev?.units), periods),
    netIncome: lastN(seriesFromUSD(ni?.units), periods),
    grossMargin: [] as Tv[],
    operatingMargin: [] as Tv[],
    netMargin: [] as Tv[],
    totalDebt: lastN(seriesFromUSD((tdLong?.units||{})), periods), // approx: show LT debt only if needed
    totalEquity: lastN(seriesFromUSD(se?.units), periods),
    cfo: lastN(seriesFromUSD(cfo?.units), periods),
    cfi: lastN(seriesFromUSD(cfi?.units), periods),
    cff: lastN(seriesFromUSD(cff?.units), periods),
    eps: [],
    price: lastN(price, periods*4)
  };

  const kpis = {
    marketCap: { value: marketCap, deltaYoY: null, spark: trends.price.slice(-10) },
    revenueTTM: { value: revenueTTM, deltaYoY: null, spark: trends.revenue },
    netIncomeTTM: { value: netIncomeTTM, deltaYoY: null, spark: trends.netIncome },
    grossMargin: { value: grossMargin, deltaYoY: null, spark: [] as Tv[] },
    operatingMargin: { value: operatingMargin, deltaYoY: null, spark: [] as Tv[] },
    netMargin: { value: netMargin, deltaYoY: null, spark: [] as Tv[] },
    roe: { value: roe, deltaYoY: null, spark: [] as Tv[] },
    roa: { value: roa, deltaYoY: null, spark: [] as Tv[] },
    debtToEquity: { value: (equityLatest && equityLatest !== 0) ? (debtLatest / equityLatest) : null, deltaYoY: null, spark: [] as Tv[] },
    currentRatio: { value: null, deltaYoY: null, spark: [] as Tv[] },
    quickRatio: { value: null, deltaYoY: null, spark: [] as Tv[] }
  };

  const health = { altmanZ: null as any, piotroskiF: null as any, interestCoverage: null as any };
  const peers = { tickers: [] as string[], metrics: {} as any };
  const context = { sector: undefined as any, industry: undefined as any, sic: undefined as any };

  return { kpis, trends, health, peers, context, aux: { equityLatest, debtLatest, cashLatest, sharesOut, lastPrice } };
}
