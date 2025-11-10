// SEC direct fetch + robust fallbacks
import fetch from 'node-fetch';

const UA = process.env.SEC_USER_AGENT || 'Finotaur/1.0 (mailto:dev@finotaur.com)';
const HEADERS = { 'User-Agent': UA, 'Accept': 'application/json' };

let tickerMapCache: Record<string, any> | null = null;

// Build ticker map from SEC official list
export async function getTickerMap(): Promise<Record<string, any>> {
  if (tickerMapCache) return tickerMapCache;
  const url = 'https://www.sec.gov/files/company_tickers.json';
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) { tickerMapCache = {}; return tickerMapCache; }
  const json: any = await r.json();
  const map: Record<string, any> = {};
  for (const k of Object.keys(json)) {
    const row = json[k];
    if (!row?.ticker) continue;
    map[String(row.ticker).toUpperCase()] = {
      cik: String(row.cik_str).padStart(10, '0'),
      company: row.title
    };
  }
  tickerMapCache = map;
  return tickerMapCache;
}

export async function lookupCIK(symbol: string): Promise<string> {
  const map = await getTickerMap();
  return map[symbol.toUpperCase()]?.cik || symbol;
}

export async function getCompanyFactsByCIK(cik: string): Promise<any> {
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`SEC companyfacts failed ${r.status}`);
  return await r.json();
}

export async function getSubmissionsByCIK(cik: string): Promise<any> {
  const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) return null;
  return await r.json();
}

// ---- Normalization with concept fallbacks ----
function unitsUSD(facts:any, ns:string, concept:string){ return facts?.facts?.[ns]?.[concept]?.units?.USD ?? []; }
function unitsSH(facts:any, ns:string, concept:string){ return facts?.facts?.[ns]?.[concept]?.units?.shares ?? []; }

function seriesUSDAny(facts:any, ns:string, concepts:string[]) {
  for (const c of concepts) {
    const arr = unitsUSD(facts, ns, c);
    if (arr?.length) return arr.map((x:any)=>({ v: Number(x?.val ?? 0), end: x?.end || x?.fy || '' }));
  }
  return [];
}
function instantUSDAny(facts:any, concepts:string[]) {
  for (const c of concepts) {
    const arr = unitsUSD(facts, 'us-gaap', c);
    if (arr?.length) return Number(arr.at(-1)?.val ?? 0);
  }
  return 0;
}

export function normalizeFactsToStatements(facts: any, periods: number = 10) {
  const revA = seriesUSDAny(facts, 'us-gaap', [
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'SalesRevenueNet',
    'Revenues'
  ]);
  const niA  = seriesUSDAny(facts, 'us-gaap', ['NetIncomeLoss','ProfitLoss']);
  const gpA  = seriesUSDAny(facts, 'us-gaap', ['GrossProfit']);
  const opA  = seriesUSDAny(facts, 'us-gaap', ['OperatingIncomeLoss']);
  const cfoA = seriesUSDAny(facts, 'us-gaap', [
    'NetCashProvidedByUsedInOperatingActivities',
    'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'
  ]);
  const cfiA = seriesUSDAny(facts, 'us-gaap', ['NetCashProvidedByUsedInInvestingActivities']);
  const cffA = seriesUSDAny(facts, 'us-gaap', ['NetCashProvidedByUsedInFinancingActivities']);

  const rev = revA.map(x=>x.v);
  const ni  = niA.map(x=>x.v);
  const gp  = gpA.map(x=>x.v);
  const op  = opA.map(x=>x.v);
  const cfo = cfoA.map(x=>x.v);
  const cfi = cfiA.map(x=>x.v);
  const cff = cffA.map(x=>x.v);

  const lastN = (arr:number[], n:number)=> arr.slice(-n);
  const sum4 = (arr:number[])=> arr.slice(-4).reduce((a,b)=>a+b,0);

  const revenueTTM = sum4(rev);
  const netIncomeTTM = sum4(ni);
  const grossMarginTTM = revenueTTM ? (sum4(gp)/revenueTTM)*100 : null;
  const operatingMarginTTM = revenueTTM ? (sum4(op)/revenueTTM)*100 : null;

  const equity = instantUSDAny(facts, ['StockholdersEquity','StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest']);
  const equityPrev = Number(unitsUSD(facts,'us-gaap','StockholdersEquity')?.at(-2)?.val ?? equity);
  const assets = instantUSDAny(facts, ['Assets']);
  const assetsPrev = Number(unitsUSD(facts,'us-gaap','Assets')?.at(-2)?.val ?? assets);
  const currentAssets = instantUSDAny(facts, ['AssetsCurrent']);
  const currentLiabilities = instantUSDAny(facts, ['LiabilitiesCurrent']);
  const cash = instantUSDAny(facts, ['CashAndCashEquivalentsAtCarryingValue','CashAndCashEquivalents']);
  const longDebt = instantUSDAny(facts, ['LongTermDebtNoncurrent']);
  const shortDebt = instantUSDAny(facts, ['LongTermDebtCurrent','DebtCurrent','DebtCurrentAndNoncurrent']);
  const totalDebt = longDebt + shortDebt;

  const shares =
    Number(unitsSH(facts,'us-gaap','WeightedAverageNumberOfDilutedSharesOutstanding')?.at(-1)?.val ??
           unitsSH(facts,'dei','EntityCommonStockSharesOutstanding')?.at(-1)?.val ?? 0);

  const n = Math.min(periods, rev.length);
  const periodsArr = Array.from({length: n}, (_,i)=> i+1);

  // margins as rolling TTM ratios
  function movingRatio(num:number[], den:number[], len:number){
    const out:number[]=[]; 
    const m = Math.min(num.length, den.length);
    for(let i=Math.max(0,m-len); i<m; i++){
      const sn = num.slice(Math.max(0,i-3), i+1).reduce((a,b)=>a+b,0);
      const sd = den.slice(Math.max(0,i-3), i+1).reduce((a,b)=>a+b,0);
      out.push(sd? (sn/sd)*100 : 0);
    }
    return out;
  }

  return {
    periods: periodsArr,
    revenue: lastN(rev, n),
    netIncome: lastN(ni, n),
    grossMarginPct: movingRatio(gp, rev, n),
    operMarginPct: movingRatio(op, rev, n),
    debt: Array(n).fill(totalDebt),
    equity: Array(n).fill(equity),
    cfo: lastN(cfo, n),
    cfi: lastN(cfi, n),
    cff: lastN(cff, n),
    revenueTTM, netIncomeTTM, grossMarginTTM, operatingMarginTTM,
    equity, equityPrev, assets, assetsPrev, currentAssets, currentLiabilities,
    cash, totalDebt, dilutedSharesTTM: shares
  };
}
