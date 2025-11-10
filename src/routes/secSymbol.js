// src/routes/secSymbol.js
import { Router } from 'express';

const SEC_DATA = process.env.SEC_BASE_URL || 'https://data.sec.gov';         // for submissions
const SEC_SITE = 'https://www.sec.gov';                                      // for files/company_tickers.json
const SEC_UA   = process.env.SEC_USER_AGENT || 'Finotaur/1.0 (mailto:dev@finotaur.com)';
const SEC_FROM = process.env.SEC_CONTACT || 'dev@finotaur.com';

async function j(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': SEC_UA,
      'Accept': 'application/json',
      'From': SEC_FROM
    }
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`SEC error ${r.status}: ${text.slice(0, 300)}`);
  }
  return r.json();
}

function padCIK(x) {
  return String(x).padStart(10, '0');
}

// GET /api/sec/filings?symbol=AAPL
const router = Router();
router.get('/filings', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '').trim().toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });

    // Correct mapping location: https://www.sec.gov/files/company_tickers.json
    const mapping = await j(`${SEC_SITE}/files/company_tickers.json`);
    const arr = Object.values(mapping || {});
    const row = arr.find(r => String(r.ticker).toUpperCase() === symbol);
    if (!row) return res.status(404).json({ error: `CIK not found for ${symbol}` });

    const cik = padCIK(row.cik_str);
    const data = await j(`${SEC_DATA}/submissions/CIK${cik}.json`);
    const recent = data?.filings?.recent;
    if (!recent) return res.json({ symbol, cik, filings: [] });

    const filings = [];
    for (let i = 0; i < (recent.form?.length || 0); i++) {
      const form = recent.form[i];
      if (form === '10-K' || form === '10-Q') {
        filings.push({
          form,
          accessionNumber: recent.accessionNumber[i],
          filingDate: recent.filingDate[i],
          reportDate: recent.reportDate?.[i],
          primaryDocument: recent.primaryDocument?.[i]
        });
      }
    }
    res.json({ symbol, cik, filings });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
