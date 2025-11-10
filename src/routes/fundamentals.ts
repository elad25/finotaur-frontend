import type { Request, Response } from 'express';
import { lookupCIK, getCompanyFactsByCIK, getSubmissionsByCIK, normalizeFactsToStatements, getTickerMap } from '../services/sec';
import { getLastPricePolygon } from '../services/polygon';
import { computeDerivedFromStatements, computeMultiples, runSimpleDCF, buildInsightLine } from '../services/compute';

const express = require('express');
export const router = express.Router();

router.get('/api/fundamentals/all', async (req: Request, res: Response) => {
  const started = Date.now();
  try {
    const symbol = String(req.query.symbol || '').toUpperCase();
    const periods = Number(req.query.periods || 10);
    if (!symbol) return res.status(400).json({ error: 'symbol required' });

    const cik = await lookupCIK(symbol);
    const [facts, subs] = await Promise.all([ getCompanyFactsByCIK(cik), getSubmissionsByCIK(cik).catch(()=>null) ]);
    const stmts = normalizeFactsToStatements(facts, periods);
    const price = await getLastPricePolygon(symbol);
    stmts.price = price;

    const derived = computeDerivedFromStatements(stmts);
    const shares = stmts?.dilutedSharesTTM ?? stmts?.shares ?? null;
    const marketCap = (price && shares) ? price * shares : (stmts?.marketCap ?? null);
    const multiples = computeMultiples({ price, marketCap, stmts });
    const dcf = runSimpleDCF({ stmts, price });
    const aiLine = buildInsightLine(derived, multiples, dcf);

    const tickMap = await getTickerMap();
    const mapEntry = tickMap[symbol];
    const sic = subs?.sic || mapEntry?.sic || subs?.sicDescription || undefined;
    const sector = subs?.sector || mapEntry?.sector || undefined;
    const industry = subs?.industry || mapEntry?.industry || undefined;
    const company = subs?.name || mapEntry?.company || undefined;

    const peers = Object.entries(tickMap)
      .filter(([t,v]: any)=> v?.sic && String(v.sic) === String(sic) && t !== symbol)
      .slice(0,3).map(([t])=> t);

    const payload = {
      symbol,
      asOf: new Date().toISOString(),
      ai: { line: aiLine },
      fairValue: { value: dcf.value, premiumPct: dcf.premiumPct, asOf: new Date().toISOString() },
      assumptions: { wacc: dcf.assumptions.wacc, ltGrowth: dcf.assumptions.ltGrowth },
      kpis: { price, shares, marketCap, ...derived.kpis },
      trends: derived.trends,
      valuation: { multiples: { ...multiples }, miniTrends: {} },
      health: derived.health,
      peers: { tickers: peers, table: [] },
      context: { company, sector, industry, sic },
      sources: ['SEC (companyfacts, submissions)', 'Polygon (price)'],
      cache: { server: '5m hot; 24h warm', swr: 60 }
    };

    res.json(payload);
  } catch (e:any) {
    console.error('fundamentals/all error', e?.message);
    res.status(500).json({ error: e?.message || 'internal error' });
  } finally {
    const ms = Date.now()-started;
    if (process.env.LOG_LEVEL !== 'silent') console.log(`[fundamentals/all] ${req.query.symbol} ${Date.now()-started}ms`);
  }
});

// Diagnostics route (optional)
router.get('/api/_diag/sec', async (_req: Request, res: Response) => {
  try {
    const url = 'https://www.sec.gov/files/company_tickers.json';
    const r = await fetch(url, { headers: { 'User-Agent': process.env.SEC_USER_AGENT || 'Finotaur/1.0 (mailto:dev@finotaur.com)' } as any });
    res.json({ status: r.status, ok: r.ok });
  } catch (e:any) {
    res.status(500).json({ error: e?.message || 'fetch failed' });
  }
});

export default router;
