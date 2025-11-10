import { Router } from 'express';
import { resolveCikByTicker, fetchCompanyFilings } from '../providers/edgar/sec';

const router = Router();

router.get('/latest', async (req, res) => {
  try {
    const symbol = String((req.query.symbol || '')).trim().toUpperCase();
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));
    if (!symbol) return res.status(400).json({ error: 'symbol.required' });

    const cik = await resolveCikByTicker(symbol);
    if (!cik) {
      return res.status(404).json({ error: 'cik.not_found', symbol });
    }

    const submission = await fetchCompanyFilings(cik);
    const filings = (submission as any)?.filings?.recent;
    if (!filings) {
      return res.status(404).json({ error: 'filings.not_found', symbol, cik });
    }

    const items = (filings.accessionNumber || []).map((_: any, i: number) => ({
      accessionNumber: filings.accessionNumber[i],
      filingDate: filings.filingDate?.[i],
      reportDate: filings.reportDate?.[i],
      acceptanceDateTime: filings.acceptanceDateTime?.[i],
      form: filings.form?.[i],
      primaryDocDescription: filings.primaryDocDescription?.[i],
      primaryDocument: filings.primaryDocument?.[i],
    })).slice(0, limit);

    return res.json({ symbol, cik, items, ts: Date.now() });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'edgar.latest.failed' });
  }
});

export default router;
