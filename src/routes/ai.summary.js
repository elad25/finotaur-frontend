// src/routes/ai.summary.js
import express from 'express';
const router = express.Router();

async function fetchJson(url) {
  const headers = {
    'User-Agent': process.env.SEC_UA || 'Finotaur/1.0 (email: support@finotaur.app)',
    'Accept': 'application/json',
  };
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.json();
}

async function resolveCik(symbol) {
  const list = await fetchJson('https://www.sec.gov/files/company_tickers.json');
  const lower = symbol.toUpperCase();
  for (const k of Object.keys(list)) {
    const row = list[k];
    if ((row?.ticker || '').toUpperCase() === lower) {
      return String(row.cik_str).padStart(10, '0');
    }
  }
  return null;
}

function lastTwoSeries(values) {
  const arr = (values||[]).slice().sort((a,b)=>new Date(a.end)-new Date(b.end));
  if (arr.length < 2) return [null,null];
  const a = arr[arr.length-1];
  const b = arr[arr.length-2];
  return [a, b];
}

function pct(a, b) {
  if (a==null || b==null || b===0) return null;
  return ((a-b)/b)*100;
}

router.get('/insight', async (req, res) => {
  try {
    const symbol = String(req.query.symbol||'').toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'symbol_required' });
    const cik = await resolveCik(symbol);
    if (!cik) return res.json({ symbol, text: '' });
    const facts = await fetchJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`);
    const usd = facts?.facts?.['us-gaap'] || {};
    const rev = usd['Revenues']?.units?.USD || [];
    const debt = usd['LongTermDebt']?.units?.USD || [];
    const [rA,rB] = lastTwoSeries(rev);
    const [dA,dB] = lastTwoSeries(debt);
    const rYoY = (rA&&rB)?pct(rA.val,rB.val):null;
    const debtFlat = (dA && dB && dB.val) ? Math.abs((dA.val - dB.val) / dB.val) < 0.03 : null;
    const revPhrase = rYoY==null ? 'Revenue trend unavailable' : `Revenue ${rYoY>=0?'grew':'declined'} ${Math.abs(rYoY).toFixed(1)}% YoY`;
    const debtPhrase = debtFlat==null ? '' : debtFlat ? 'while debt remained roughly flat' : 'and debt changed materially';
    const sentiment = (rYoY!=null && rYoY>0) ? 'indicating improving top-line momentum' : 'suggesting softness in recent periods';
    const text = `${revPhrase} ${debtPhrase} — ${sentiment}.`;
    res.json({ symbol, text });
  } catch (e) {
    res.status(500).json({ error: String(e?.message||e) });
  }
});

export default router;
