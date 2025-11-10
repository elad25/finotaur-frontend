// src/index.js — server-delta-v9 (ESM) — mounts overview subroutes
// Minimal, safe changes: prefer ./routes/overview-subroutes.js (price/events/analyst/about/header),
// fallback to ./routes/overview.js if present. Everything else left intact.

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// -------- CORS (credentials safe) --------
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use((req, res, next) => { res.setHeader('Vary', 'Origin'); next(); });
app.use(express.json());

// -------- Health --------
app.get('/api/_whoami', (_req, res) => res.json({ version: 'server-delta-v9', origin: ORIGIN }));

// -------- Helpers (kept) --------
const UA = process.env.SEC_USER_AGENT || 'Finotaur/1.0 (contact@example.com)';
async function j(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}
const pad10 = (s) => String(s||'').padStart(10,'0');
const stableSort = (arr) => [...(arr||[])].sort((a,b)=> new Date(a?.end || a?.endDate || a?.filed || a?.fy || a?.date || 0) - new Date(b?.end || b?.endDate || b?.filed || b?.fy || b?.date || 0));
const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : null; };
const latest = (arr) => { const s = stableSort(arr).slice(-1)[0]; return s ? num(s?.val ?? s?.value) : null; };
const prev = (arr) => { const s = stableSort(arr).slice(-2); return s.length>=2 ? num(s[0]?.val ?? s[0]?.value) : null; };
const strip = (s) => String(s||'').replace(/-/g, '');

// -------- SEC helpers --------
async function resolveCikBySymbol(symbol){
  const data = await j('https://www.sec.gov/files/company_tickers.json');
  const u = String(symbol||'').toUpperCase();
  for (const k in data) {
    const row = data[k];
    if ((row?.ticker||'').toUpperCase() === u) return pad10(row.cik_str);
  }
  return null;
}
const buildFilingUrl = (cik, acc, primary) => {
  const c = String(Number(cik));
  const a = strip(acc);
  return primary
    ? `https://www.sec.gov/Archives/edgar/data/${c}/${a}/${primary}`
    : `https://www.sec.gov/Archives/edgar/data/${c}/${a}/index.json`;
};
const wantedSet = (forms) => new Set(String(forms||'').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean));

// -------- Inline /api/sec/filings --------
app.get('/api/sec/filings', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '').toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'symbol_required' });
    const cik = await resolveCikBySymbol(symbol);
    if (!cik) return res.status(404).json({ error: 'cik_not_found', symbol });
    const sub = await j(`https://data.sec.gov/submissions/CIK${cik}.json`);
    const rec = sub?.filings?.recent || {};
    const N = Math.min(rec.form?.length||0, rec.filingDate?.length||0, rec.accessionNumber?.length||0, rec.primaryDocument?.length||0);
    const want = wantedSet(req.query.forms||'');
    const lim  = Math.max(1, Math.min(parseInt(req.query.limit||'20',10)||20, 100));
    const out = [];
    for (let i=0;i<N;i++){
      const form = String(rec.form[i]||'').toUpperCase();
      if (want.size && !want.has(form)) continue;
      out.push({
        form,
        filingDate: rec.filingDate[i]||null,
        reportDate: rec.reportDate?.[i]||null,
        accessionNumber: rec.accessionNumber[i]||null,
        primaryDocument: rec.primaryDocument[i]||null,
        filingUrl: buildFilingUrl(cik, rec.accessionNumber[i], rec.primaryDocument[i]),
      });
      if (out.length>=lim) break;
    }
    res.json({ symbol, cik, filings: out });
  } catch (e) {
    res.status(500).json({ error: 'sec_filings_error', message: String(e?.message||e) });
  }
});

// -------- Inline /api/fundamentals --------
const POLY_KEY = process.env.POLYGON_API_KEY || '';
function gaap(facts, key){ try { return facts?.facts?.['us-gaap']?.[key] || null; } catch { return null; } }
function unitsAny(item, keys){ if(!item?.units) return []; for(const k of keys){ if(item.units[k]) return item.units[k]; } return []; }
function buildSeries(arr){ return stableSort(arr).map(p=>({ date: p.end || p.endDate || p.fy || p.date, value: num(p.val ?? p.value) })).filter(p=>p.date); }
async function polygonPrevClose(symbol){ if(!POLY_KEY) return null; try{ const u=`https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?adjusted=true&apiKey=${POLY_KEY}`; const d=await j(u); return d?.results?.[0]?.c ?? null; } catch { return null; } }
const growth = (curr, pre) => (curr!=null && pre!=null && pre!==0) ? ((curr-pre)/pre) : null;

async function fundamentalsPayload(symbol){
  const cik = await resolveCikBySymbol(symbol);
  if(!cik) throw Object.assign(new Error('cik_not_found'), { code:404 });
  const facts = await j(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`);
  const revenueF   = gaap(facts, 'Revenues') || gaap(facts, 'RevenueFromContractWithCustomerExcludingAssessedTax');
  const netIncF    = gaap(facts, 'NetIncomeLoss');
  const epsBasicF  = gaap(facts, 'EarningsPerShareBasic');
  const epsDilF    = gaap(facts, 'EarningsPerShareDiluted');
  const grossF     = gaap(facts, 'GrossProfit');
  const opIncF     = gaap(facts, 'OperatingIncomeLoss');
  const liabF      = gaap(facts, 'Liabilities');
  const equityF    = gaap(facts, 'StockholdersEquity');
  const divF       = gaap(facts, 'CommonStockDividendsPerShareDeclared');
  const revArr = unitsAny(revenueF, ['USD','USDm','USDMillions']);
  const niArr  = unitsAny(netIncF, ['USD','USDm','USDMillions']);
  const epsArr = unitsAny(epsDilF || epsBasicF, ['USD']);
  const gpArr  = unitsAny(grossF, ['USD']);
  const opArr  = unitsAny(opIncF, ['USD']);
  const debtArr= unitsAny(liabF, ['USD']);
  const eqArr  = unitsAny(equityF, ['USD']);
  const divArr = unitsAny(divF, ['USD']);
  const revTTM = latest(revArr);
  const revPrev= prev(revArr);
  const niTTM  = latest(niArr);
  const epsTTM = latest(epsArr);
  const gpTTM  = latest(gpArr);
  const opTTM  = latest(opArr);
  const debt   = latest(debtArr);
  const equity = latest(eqArr);
  const divPS  = latest(divArr);
  const price  = await polygonPrevClose(symbol);
  const gRev = growth(revTTM, revPrev);
  const insight = (gRev!=null)
    ? `${symbol}'s revenue ${gRev>=0?'grew':'declined'} ${(Math.abs(gRev)*100).toFixed(1)}% YoY${debt!=null?' while debt remained relatively flat':''}.`
    : `${symbol} fundamentals snapshot.`;
  const series = {
    revenue: buildSeries(revArr),
    netIncome: buildSeries(niArr),
    eps: buildSeries(epsArr),
    grossMargin: buildSeries(gpArr).map(p=>({date:p.date, value:null})),
    operatingMargin: buildSeries(opArr).map(p=>({date:p.date, value:null})),
    netMargin: buildSeries(niArr).map(p=>({date:p.date, value:null})),
    debt: buildSeries(debtArr),
    equity: buildSeries(eqArr),
  };
  const rows = (()=>{
    const map = new Map();
    const add=(k,arr)=>arr.forEach(p=>{ const d=p.end||p.date; if(!d)return; const o=map.get(d)||{endDate:d}; o[k]=num(p.val??p.value); map.set(d,o); });
    add('revenue', revArr); add('netIncome', niArr); add('eps', epsArr); add('totalDebt', debtArr); add('equity', eqArr);
    return Array.from(map.values()).sort((a,b)=> new Date(a.endDate)-new Date(b.endDate));
  })();
  const snapshot = {
    symbol, price: price ?? null,
    revenueTTM: revTTM, netIncomeTTM: niTTM, epsTTM,
    grossProfitTTM: gpTTM, operatingIncomeTTM: opTTM,
    totalDebt: debt, equity, dividendPerShare: divPS,
    pe: (price!=null && epsTTM) ? Number((price/epsTTM).toFixed(2)) : null,
    roe: (niTTM!=null && equity) ? Number((niTTM/equity).toFixed(4)) : null,
    roa: null, debtToEquity: (debt!=null && equity) ? Number((debt/equity).toFixed(2)) : null,
    currentRatio: null,
  };
  return { snapshot, series, rows, insight };
}

app.get('/api/fundamentals/all', async (req,res)=>{
  try{ const symbol = String(req.query.symbol||'').toUpperCase(); if(!symbol) return res.status(400).json({error:'symbol_required'});
    const payload = await fundamentalsPayload(symbol); res.json(payload);
  }catch(e){ res.status(e?.code===404?404:500).json({ error:'fundamentals_error', message:String(e?.message||e) }); }
});
app.get('/api/fundamentals', async (req,res)=>{
  try{ const symbol = String(req.query.symbol||'').toUpperCase(); if(!symbol) return res.status(400).json({error:'symbol_required'});
    const payload = await fundamentalsPayload(symbol); res.json(payload);
  }catch(e){ res.status(e?.code===404?404:500).json({ error:'fundamentals_error', message:String(e?.message||e) }); }
});

// -------- External routers (unchanged) --------
// --- Overview aux routes (ESM) ---
// מספקים /api/price, /api/events, /api/profile + /api/snapshot, /api/news
try { const { default: priceRoutes }   = await import('./routes/price.js');   app.use('/api', priceRoutes); } catch {}
try { const { default: eventsRoutes }  = await import('./routes/events.js');  app.use('/api', eventsRoutes); } catch {}
try { const { default: profileRoutes } = await import('./routes/profile.js'); app.use('/api', profileRoutes); } catch {}
try { const { default: newsRoutes }    = await import('./routes/news.js');    app.use('/api', newsRoutes); } catch {}
// --- Overview subroutes for Finotaur Overview Tab ---
try {
  const { default: overviewRef } = await import('./routes/overview/reference.js');
  app.use('/api', overviewRef);        // ⬅️ לא /api/overview
} catch {}

try {
  const { default: overviewFilings } = await import('./routes/overview/filings.js');
  app.use('/api', overviewFilings);    // ⬅️ לא /api/overview
} catch {}
try { const { default: overviewRef }     = await import('./routes/overview/reference.js'); app.use('/api', overviewRef); } catch {}
try { const { default: overviewFilings } = await import('./routes/overview/filings.js');   app.use('/api', overviewFilings); } catch {}



// -------- Overview: prefer subroutes; fallback to overview.js --------
let mountedOverview = false;
try {
  const mod = await import('./routes/overview-subroutes.js');
  const overviewSub = mod.default || mod;
  if (overviewSub) { app.use('/api/overview', overviewSub); mountedOverview = true; }
} catch {}
if (!mountedOverview) {
  try {
    const mod2 = await import('./routes/overview.js');
    const overviewRouter = mod2.default || mod2;
    if (overviewRouter) app.use('/api/overview', overviewRouter);
  } catch {}
}
try { const { default: priceRoutes }   = await import('./routes/price.js');   app.use('/api', priceRoutes); } catch {}
try { const { default: eventsRoutes }  = await import('./routes/events.js');  app.use('/api', eventsRoutes); } catch {}
try { const { default: profileRoutes } = await import('./routes/profile.js'); app.use('/api', profileRoutes); } catch {}
try { const { default: newsRoutes }    = await import('./routes/news.js');    app.use('/api', newsRoutes); } catch {}
const { default: registerRoutes } = await import('./routes/register.js');
await registerRoutes(app);

// -------- Symbols router BEFORE 404 --------


import overviewRouter from './routes/overview.js';
app.use('/api', overviewRouter);

import secRouter from './routes/sec.js';
app.use('/api/sec', secRouter);


try {
  const { default: symbolsRouter } = await import('./routes/symbols.js');
  app.use('/api/symbols', symbolsRouter);
} catch {}

// -------- 404 LAST --------
app.use((req,res)=> res.status(404).json({error:'not_found', path: req.path}));
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, ()=> console.log(`[finotaur] server-delta-v9 on http://localhost:${PORT}`));
