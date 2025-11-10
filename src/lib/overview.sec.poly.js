// src/lib/overview.sec.poly.js (delta4)
import fetch from 'node-fetch';

const POLY_BASE = process.env.POLYGON_BASE || 'https://api.polygon.io';
const POLY_KEY  = process.env.POLYGON_API_KEY || '';
const SEC_UA    = process.env.SEC_USER_AGENT || 'Finotaur/1.0 (contact@example.com)';

// in-memory cache
const cache = new Map();
const setCache = (k,v,ttl)=> cache.set(k,{val:v,exp:Date.now()+ttl});
const getCache = (k)=>{ const h=cache.get(k); if(!h) return null; if(Date.now()>h.exp){ cache.delete(k); return null; } return h.val; };

async function j(url, headers={}){
  const r = await fetch(url, { headers });
  if(!r.ok){
    const t = await r.text().catch(()=> '');
    throw new Error(`HTTP ${r.status} ${url} :: ${t.slice(0,160)}`);
  }
  return r.json();
}
const withKey = (pathQ) => {
  const u = new URL(pathQ, POLY_BASE);
  u.searchParams.set('apiKey', POLY_KEY || '');
  return u.toString();
};

// ---------------- SEC ----------------
export async function resolveCikBySymbol(symbol){
  const key=`cik:${symbol}`; const hit=getCache(key); if(hit) return hit;
  const data = await j('https://www.sec.gov/files/company_tickers.json', { 'User-Agent': SEC_UA });
  const u = String(symbol||'').toUpperCase();
  for (const k in data){
    const row = data[k];
    if ((row?.ticker||'').toUpperCase() === u){
      const cik = String(row.cik_str).padStart(10,'0');
      setCache(key, cik, 24*3600*1000); return cik;
    }
  }
  return null;
}
const strip = (s)=> String(s||'').replace(/-/g,'');
const filingUrl = (cik, acc, primary)=> primary
 ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${strip(acc)}/${primary}`
 : `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${strip(acc)}/index.json`;

export async function getRecentFilings(symbol, limit=80){
  const cik = await resolveCikBySymbol(symbol); if(!cik) return [];
  const sub = await j(`https://data.sec.gov/submissions/CIK${cik}.json`, { 'User-Agent': SEC_UA });
  const r = sub?.filings?.recent || {};
  const N = Math.min(r.form?.length||0, r.filingDate?.length||0, r.accessionNumber?.length||0, r.primaryDocument?.length||0);
  const out = [];
  for(let i=0;i<N;i++){
    out.push({
      form: String(r.form[i]||'').toUpperCase(),
      filingDate: r.filingDate[i] || null,
      reportDate: r.reportDate?.[i] || null,
      accessionNumber: r.accessionNumber[i] || null,
      primaryDocument: r.primaryDocument[i] || null,
      url: filingUrl(cik, r.accessionNumber[i], r.primaryDocument[i]),
    });
    if(out.length>=limit) break;
  }
  return out;
}

export async function getCompanyOverviewFrom10K(symbol){
  const key=`co10k:${symbol}`; const hit=getCache(key); if(hit!==undefined) return hit;
  try{
    const filings = await getRecentFilings(symbol, 120);
    const tenk = filings.find(f=> f.form==='10-K') || filings.find(f=> f.form.startsWith('10-K'));
    if(!tenk){ setCache(key, null, 6*3600*1000); return null; }
    const res = await fetch(tenk.url, { headers:{ 'User-Agent': SEC_UA, 'Accept':'text/html' } });
    const html = await res.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    const lower = text.toLowerCase();
    let idx = lower.indexOf('business');
    if (idx < 0) idx = lower.indexOf('overview');
    const slice = idx>0 ? text.slice(idx, idx+900) : text.slice(0,900);
    const sents = slice.split('. ').filter(Boolean).slice(0, 2);
    const out = sents.join('. ') + (sents.length?'.':'');
    setCache(key, out || null, 24*3600*1000);
    return out || null;
  }catch(e){
    setCache(key, null, 6*3600*1000); return null;
  }
}

// ---------------- Polygon ----------------
export const getSnapshot = (s)=> j(withKey(`/v2/snapshot/locale/us/markets/stocks/tickers/${s}`));
export const getLastTrade = (s)=> j(withKey(`/v2/last/trade/${s}`));
export const getPrevClose = (s)=> j(withKey(`/v2/aggs/ticker/${s}/prev?adjusted=true`));
export const getAggs     = (s,from,to,span='day')=> j(withKey(`/v2/aggs/ticker/${s}/range/1/${span}/${from}/${to}?adjusted=true`));
export const getDividends= (s,limit=50)=> j(withKey(`/v3/reference/dividends?ticker=${s}&limit=${limit}`));
export const getRefTicker= (s)=> j(withKey(`/v3/reference/tickers/${s}`));
export const getNews     = (s,limit=5)=> j(withKey(`/v2/reference/news?ticker=${s}&limit=${limit}`));

// price block with triple fallback
export async function resolvePriceBlock(symbol){
  const key=`price:${symbol}`; const hit=getCache(key); if(hit) return hit;
  // 1) snapshot
  try{
    const snap = await getSnapshot(symbol);
    const t = snap?.ticker || {};
    if (t?.lastTrade?.p != null){
      const out = {
        price: t.lastTrade.p,
        change: t.todaysChange ?? null,
        changePct: t.todaysChangePerc ?? null,
        dayLow: t?.day?.l ?? null,
        dayHigh: t?.day?.h ?? null,
        marketCap: t?.marketCap ?? null,
        avgVol: t?.day?.v ?? null
      };
      setCache(key, out, 60*1000); return out;
    }
  }catch{}
  // 2) last/trade + prev
  try{
    const [lt, prev] = await Promise.all([ getLastTrade(symbol), getPrevClose(symbol) ]);
    const price = lt?.results?.p ?? null;
    const prevClose = prev?.results?.[0]?.c ?? null;
    const change = (price!=null && prevClose!=null)? price - prevClose : null;
    const changePct = (change!=null && prevClose)? (change/prevClose)*100 : null;
    const out = { price, change, changePct, dayLow:null, dayHigh:null, marketCap:null, avgVol:null };
    if (price!=null){ setCache(key, out, 60*1000); return out; }
  }catch{}
  // 3) aggs fallback (uses last close)
  try{
    const to = new Date();
    const from = new Date(); from.setDate(to.getDate()-2);
    const iso = d=> d.toISOString().split('T')[0];
    const [ag, prev] = await Promise.all([ getAggs(symbol, iso(from), iso(to), 'day'), getPrevClose(symbol) ]);
    const arr = ag?.results || [];
    const last = arr[arr.length-1];
    const price = last?.c ?? null;
    const prevClose = prev?.results?.[0]?.c ?? null;
    const change = (price!=null && prevClose!=null)? price - prevClose : null;
    const changePct = (change!=null && prevClose)? (change/prevClose)*100 : null;
    // avgVol 20d
    const vol20 = arr.slice(-20).map(p=>p.v).filter(Boolean);
    const avgVol = vol20.length ? Math.round(vol20.reduce((a,b)=>a+b,0)/vol20.length) : null;
    const out = { price, change, changePct, dayLow:last?.l ?? null, dayHigh:last?.h ?? null, marketCap:null, avgVol };
    setCache(key, out, 60*1000); return out;
  }catch{}
  return { price:null, change:null, changePct:null, dayLow:null, dayHigh:null, marketCap:null, avgVol:null };
}

export async function compute52wRange(symbol){
  const key=`52w:${symbol}`; const hit=getCache(key); if(hit) return hit;
  const to = new Date(); const from = new Date(); from.setDate(to.getDate()-365);
  const iso=d=> d.toISOString().split('T')[0];
  const ag = await getAggs(symbol, iso(from), iso(to), 'day');
  const arr = (ag?.results||[]).map(p=>p.c).filter(Number.isFinite);
  if(!arr.length){ const out={low:null,high:null}; setCache(key,out,2*3600*1000); return out; }
  const low = Math.min(...arr), high=Math.max(...arr);
  const out={low,high}; setCache(key,out,6*3600*1000); return out;
}

const RANGE_TO_DAYS = { '1D':1,'1W':7,'1M':30,'6M':182,'1Y':365,'5Y':1825 };
export async function getChartSeries(symbol, range='1M'){
  const key=`chart:${symbol}:${range}`; const hit=getCache(key); if(hit) return hit;
  const days = RANGE_TO_DAYS[range] || 30;
  const to = new Date(), from=new Date(); from.setDate(to.getDate()-days);
  const iso=d=> d.toISOString().split('T')[0];
  // minute attempt for 1D
  if(range==='1D'){
    try{
      const agMin = await getAggs(symbol, iso(from), iso(to), 'minute');
      if(agMin?.results?.length){
        const series = agMin.results.map(p=>({t:p.t,o:p.o,h:p.h,l:p.l,c:p.c,v:p.v}));
        const events = await buildEvents(symbol);
        const out={series, events}; setCache(key,out,5*60*1000); return out;
      }
    }catch{}
  }
  const ag = await getAggs(symbol, iso(from), iso(to), 'day');
  const series = (ag?.results||[]).map(p=>({t:p.t,o:p.o,h:p.h,l:p.l,c:p.c,v:p.v}));
  const events = await buildEvents(symbol);
  const out={series, events}; setCache(key,out,5*60*1000); return out;
}

async function buildEvents(symbol){
  const [filings, dividends] = await Promise.all([ getRecentFilings(symbol, 80), getDividends(symbol, 80) ]);
  const events=[];
  filings.forEach(f=>{
    const date=f.filingDate||f.reportDate; if(!date) return;
    let type='filing'; if(f.form.startsWith('10-K')||f.form.startsWith('10-Q')) type='earnings';
    events.push({ type, date, title:f.form, url:f.url });
  });
  (dividends?.results||[]).forEach(d=>{
    const date = d.ex_dividend_date || d.declaration_date; if(!date) return;
    const title = `Dividend ${d.cash_amount!=null?('$'+d.cash_amount):''}`;
    events.push({ type:'dividend', date, title });
  });
  return events;
}

// Market cap from reference; dividend yield estimation from last 4 payouts * 4 / price
export async function getRefSnapshot(symbol, hintPrice){
  try{
    const ref = await getRefTicker(symbol);
    const results = ref?.results || {};
    const marketCap = results?.market_cap ?? null;
    let dividendYield = null;
    try{
      const div = await getDividends(symbol, 8);
      const arr = (div?.results||[]).slice(0,4).map(d=> d.cash_amount).filter(x=> typeof x==='number');
      if(arr.length){
        const annual = arr.reduce((a,b)=>a+b,0) * (4/arr.length);
        if(hintPrice) dividendYield = (annual / hintPrice) * 100;
      }
    }catch{}
    return { marketCap, dividendYield };
  }catch{ return { marketCap:null, dividendYield:null }; }
}

export async function getNewsFor(symbol, limit=5){
  try{
    const n = await getNews(symbol, limit);
    const items = (n?.results||[]).map(x=>({
      id: x.id,
      title: x.title,
      url: x.article_url,
      publisher: x.publisher?.name || x.publisher?.id || 'Unknown',
      published_utc: x.published_utc,
      sentiment: 'neutral',
      tickers: x.tickers || []
    }));
    return items;
  }catch{ return []; }
}
