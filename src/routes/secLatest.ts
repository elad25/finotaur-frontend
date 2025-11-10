import express from 'express';
import { getTickerMap, padCik, getSubmissionsByCIK } from '../services/secCore';

const router = express.Router();

function classifyForm(form: string): 'annual' | 'quarterly' | 'other' {
  const f = (form || '').toUpperCase();
  if (f === '10-K' || f === '20-F') return 'annual';
  if (f === '10-Q' || f === '6-K') return 'quarterly';
  return 'other';
}

router.get('/filings/latest', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '').toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });
    const map = await getTickerMap();
    const entry = (map as any)[symbol];
    if (!entry) return res.status(404).json({ error: 'symbol not found' });
    const cik = padCik(entry.cik_str);
    const sub = await getSubmissionsByCIK(cik);
    const recent = sub?.filings?.recent || {};
    const N = Math.min(
      recent.form?.length || 0,
      recent.filingDate?.length || 0,
      recent.reportDate?.length || 0,
      recent.accessionNumber?.length || 0,
      recent.primaryDocument?.length || 0
    );
    const rows: any[] = [];
    for (let i = 0; i < N; i++) {
      rows.push({
        form: recent.form?.[i],
        accessionNumber: recent.accessionNumber?.[i],
        filingDate: recent.filingDate?.[i],
        reportDate: recent.reportDate?.[i],
        primaryDocument: recent.primaryDocument?.[i],
        friendlyType: classifyForm(recent.form?.[i]),
        downloadPath: `/api/sec/download?cik=${cik}&accessionNumber=${recent.accessionNumber?.[i]}&primaryDocument=${encodeURIComponent(recent.primaryDocument?.[i] || '')}`
      });
    }
    const annualLatest = rows.find(r => r.friendlyType === 'annual') || null;
    const quarterlyLatest = rows.find(r => r.friendlyType === 'quarterly') || null;
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json({ symbol, cik, annualLatest, quarterlyLatest });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'internal error' });
  }
});

export default router;
