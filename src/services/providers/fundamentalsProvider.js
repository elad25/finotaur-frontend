// src/services/providers/fundamentalsProvider.js
const fetchFn = typeof fetch !== 'undefined' ? fetch : (...a) => import('node-fetch').then(({default: f}) => f(...a));
const { get, set } = require('../../utils/cache');

const POLYGON_KEY = process.env.POLYGON_API_KEY || process.env.POLYGON_KEY || "";
const FMP_KEY = process.env.FMP_API_KEY || "";

const base = {
  polygon: {
    financials: (symbol, period='quarterly', limit=12) => POLYGON_KEY ?
      `https://api.polygon.io/vX/reference/financials?ticker=${encodeURIComponent(symbol)}&timeframe=${period}&limit=${limit}&apiKey=${POLYGON_KEY}` : null,
    ticker: (symbol) => POLYGON_KEY ? `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(symbol)}?apiKey=${POLYGON_KEY}` : null,
    aggs: (symbol, from, to) => POLYGON_KEY ? `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${from}/${to}?adjusted=true&apiKey=${POLYGON_KEY}` : null,
  },
  fmp: {
    profile: (symbol) => FMP_KEY ? `https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}` : null,
    ratiosTTM: (symbol) => FMP_KEY ? `https://financialmodelingprep.com/api/v3/ratios-ttm/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}` : null,
    ratiosAnnual: (symbol) => FMP_KEY ? `https://financialmodelingprep.com/api/v3/ratios/${encodeURIComponent(symbol)}?period=annual&limit=8&apikey=${FMP_KEY}` : null,
    ratiosQuarter: (symbol) => FMP_KEY ? `https://financialmodelingprep.com/api/v3/ratios/${encodeURIComponent(symbol)}?period=quarter&limit=12&apikey=${FMP_KEY}` : null,
    income: (symbol, period='quarter', limit=12) => FMP_KEY ? `https://financialmodelingprep.com/api/v3/income-statement/${encodeURIComponent(symbol)}?period=${period}&limit=${limit}&apikey=${FMP_KEY}` : null,
    balance: (symbol, period='quarter', limit=12) => FMP_KEY ? `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${encodeURIComponent(symbol)}?period=${period}&limit=${limit}&apikey=${FMP_KEY}` : null,
    cashflow: (symbol, period='quarter', limit=12) => FMP_KEY ? `https://financialmodelingprep.com/api/v3/cash-flow-statement/${encodeURIComponent(symbol)}?period=${period}&limit=${limit}&apikey=${FMP_KEY}` : null,
    peers: (symbol) => FMP_KEY ? `https://financialmodelingprep.com/api/v3/stock_peers?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}` : null,
  }
};

async function json(url, soft=false) {
  if (!url) return null;
  const c = get(url); if (c) return c;
  const r = await fetchFn(url);
  if (!r.ok) {
    if (soft && [401,403,429].includes(r.status)) return { __error: true, status: r.status, url };
    const t = await r.text().catch(()=>'');
    throw new Error(`fetch_failed ${r.status} ${url} :: ${t.slice(0,120)}`);
  }
  const j = await r.json();
  set(url, j, 5*60*1000);
  return j;
}

function n(x){ const v = Number(x); return Number.isFinite(v) ? v : null; }
function sum(arr, key, count=4){ return arr.slice(0,count).reduce((a,b)=>a + (b[key] || 0), 0) || null; }
function pct(a, b){ if (a==null || b==null || b===0) return null; return ((a-b)/Math.abs(b))*100; }

async function getRowsFromPolygon(symbol, period) {
  const fin = await json(base.polygon.financials(symbol, period, 12), true);
  if (!fin || !Array.isArray(fin.results)) return [];
  return fin.results.map(r => ({
    endDate: r.end_date,
    revenue: r.financials?.income_statement?.revenues?.value ?? null,
    netIncome: r.financials?.income_statement?.net_income_loss?.value ?? null,
    grossMargin: (r.financials?.income_statement?.gross_profit?.value != null && r.financials?.income_statement?.revenues?.value) ?
      r.financials.income_statement.gross_profit.value / r.financials.income_statement.revenues.value : null,
    operatingMargin: (r.financials?.income_statement?.operating_income_loss?.value != null && r.financials?.income_statement?.revenues?.value) ?
      r.financials.income_statement.operating_income_loss.value / r.financials.income_statement.revenues.value : null,
    netMargin: (r.financials?.income_statement?.net_income_loss?.value != null && r.financials?.income_statement?.revenues?.value) ?
      r.financials.income_statement.net_income_loss.value / r.financials.income_statement.revenues.value : null,
    totalDebt: r.financials?.balance_sheet?.long_term_debt?.value ?? null,
    equity: r.financials?.balance_sheet?.stockholders_equity?.value ?? null,
    eps: r.financials?.income_statement?.basic_eps?.value ?? null,
    opCF: r.financials?.cash_flow_statement?.net_cash_flow_from_operating_activities?.value ?? null,
    capex: r.financials?.cash_flow_statement?.capital_expenditure?.value ?? null,
  }));
}

async function snapshot(symbol, period='quarterly'){
  const [rows, tick, prof, ratTTM] = await Promise.all([
    getRowsFromPolygon(symbol, period),
    json(base.polygon.ticker(symbol), true),
    json(base.fmp.profile(symbol), true),
    json(base.fmp.ratiosTTM(symbol), true),
  ]);

  let wk=null;
  try {
    const to = new Date().toISOString().slice(0,10);
    const from = new Date(Date.now()-365*24*3600*1000).toISOString().slice(0,10);
    const agg = await json(base.polygon.aggs(symbol, from, to), true);
    if (agg?.results?.length) {
      let lo=+Infinity, hi=-Infinity;
      for (const k of agg.results) { if (typeof k.l==='number') lo=Math.min(lo,k.l); if (typeof k.h==='number') hi=Math.max(hi,k.h); }
      wk = { low: lo, high: hi };
    }
  } catch {}

  const profile = Array.isArray(prof) ? prof[0] || {} : {};
  const ratiosTTM = Array.isArray(ratTTM) ? ratTTM[0] || {} : {};

  const snap = {
    symbol,
    companyName: String(profile.companyName || symbol),
    marketCap: n(profile.mktCap) ?? n(tick?.results?.market_cap),
    pe: n(ratiosTTM.peRatioTTM),
    pb: n(ratiosTTM.priceToBookRatioTTM),
    ps: n(ratiosTTM.priceToSalesRatioTTM),
    evToEbitda: n(ratiosTTM.enterpriseValueOverEBITDATTM),
    peg: n(ratiosTTM.pegRatioTTM),
    epsTTM: n(ratiosTTM.epsTTM),
    revenueTTM: rows.slice(0,4).reduce((a,b)=>a+(b.revenue||0),0) || null,
    netIncomeTTM: rows.slice(0,4).reduce((a,b)=>a+(b.netIncome||0),0) || null,
    dividendYield: n(profile.dividendYield),
    debtToEquity: (rows[0]?.totalDebt!=null && rows[0]?.equity!=null && rows[0].equity!==0) ? (rows[0].totalDebt/rows[0].equity) : null,
    roe: n(ratiosTTM.returnOnEquityTTM),
    roa: n(ratiosTTM.returnOnAssetsTTM),
    assetTurnover: n(ratiosTTM.assetTurnoverTTM),
    inventoryTurnover: n(ratiosTTM.inventoryTurnoverTTM),
    currentRatio: n(ratiosTTM.currentRatioTTM),
    quickRatio: n(ratiosTTM.quickRatioTTM),
    wk52: wk,
  };

  return { snap, rows };
}

async function ratios(symbol){
  const [ann, q] = await Promise.all([ json(base.fmp.ratiosAnnual(symbol), true), json(base.fmp.ratiosQuarter(symbol), true) ]);
  return { annual: Array.isArray(ann)?ann:[], quarterly:Array.isArray(q)?q:[] };
}

async function statements(symbol){
  const [incA, incQ, balA, balQ, cfA, cfQ] = await Promise.all([
    json(base.fmp.income(symbol, 'annual', 8), true),
    json(base.fmp.income(symbol, 'quarter', 12), true),
    json(base.fmp.balance(symbol, 'annual', 8), true),
    json(base.fmp.balance(symbol, 'quarter', 12), true),
    json(base.fmp.cashflow(symbol, 'annual', 8), true),
    json(base.fmp.cashflow(symbol, 'quarter', 12), true),
  ]);
  return { income:{annual:incA||[],quarterly:incQ||[]}, balance:{annual:balA||[],quarterly:balQ||[]}, cashflow:{annual:cfA||[],quarterly:cfQ||[]} };
}

function aiFromRows(rows){
  if (!rows.length) return "No sufficient recent data to summarize.";
  const [a,b] = rows;
  const pct = (x,y)=> (x==null||y==null||y===0) ? null : ((x-y)/Math.abs(y))*100;
  const revYoY = pct(a.revenue, b?.revenue);
  const opmYoY = pct(a.operatingMargin, b?.operatingMargin);
  const netYoY = pct(a.netIncome, b?.netIncome);
  const parts = [];
  if (revYoY!=null) parts.push(`Revenue ${revYoY>=0? 'up':'down'} ${Math.abs(revYoY).toFixed(1)}% YoY`);
  if (opmYoY!=null) parts.push(`Operating margin ${opmYoY>=0? 'improved':'contracted'} ${Math.abs(opmYoY).toFixed(1)}%`);
  if (netYoY!=null) parts.push(`Net income ${netYoY>=0? 'increased':'decreased'} ${Math.abs(netYoY).toFixed(1)}% YoY`);
  return parts.join(', ') + '.';
}

async function peers(symbol){
  const p = await json(base.fmp.peers(symbol), true);
  let arr = [];
  if (Array.isArray(p)) arr = p;
  else if (p && Array.isArray(p[symbol])) arr = p[symbol];
  else if (Array.isArray(p?.[0]?.peersList)) arr = p[0].peersList;
  return arr.filter(Boolean).slice(0,5);
}

module.exports = { snapshot, ratios, statements, aiFromRows, peers };
export { snapshot, ratios, statements, aiFromRows, peers };
