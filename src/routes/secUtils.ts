
import express from 'express';
import { buildFilingUrl } from '../services/sec';

const router = express.Router();

router.get('/filingUrl', (req, res) => {
  const cik = String(req.query.cik || '');
  const accessionNumber = String(req.query.accessionNumber || '');
  const primaryDocument = String(req.query.primaryDocument || '');
  if (!cik || !accessionNumber || !primaryDocument) {
    return res.status(400).json({ error: 'cik, accessionNumber, primaryDocument are required' });
  }
  const url = buildFilingUrl(cik, accessionNumber, primaryDocument);
  res.json({ url });
});

import fetch from 'node-fetch';

router.get('/download', async (req, res) => {
  try {
    const cik = String(req.query.cik || '');
    const accessionNumber = String(req.query.accessionNumber || '');
    const primaryDocument = String(req.query.primaryDocument || '');
    if (!cik || !accessionNumber || !primaryDocument) {
      return res.status(400).json({ error: 'cik, accessionNumber, primaryDocument are required' });
    }
    const url = buildFilingUrl(cik, accessionNumber, primaryDocument);
    const r = await fetch(url, { headers: { 'User-Agent': process.env.SEC_USER_AGENT || 'FinotaurBot/1.0' } as any });
    if (!r.ok) {
      return res.status(r.status).json({ error: `SEC responded ${r.status}` });
    }
    const filename = `${cik}-${accessionNumber}-${primaryDocument}`.replace(/\s+/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Try to forward content-type; default to text/html
    const ct = r.headers.get('content-type') || 'text/html; charset=utf-8';
    res.setHeader('Content-Type', ct);
    // Stream the response
    r.body.pipe(res);
  } catch (e:any) {
    res.status(500).json({ error: e?.message || 'download failed' });
  }
});

export default router;
