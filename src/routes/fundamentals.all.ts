import { Router, Request, Response } from 'express';
import MemCache from '../lib/memCache';
import { buildPeriods, TF } from '../lib/alignPeriods';

const router = Router();
const cache = new MemCache<any>(5*60*1000);

router.get('/api/fundamentals/all', async (req: Request, res: Response) => {
  const symbol = String(req.query.symbol || 'AAPL').toUpperCase();
  const tf = (String(req.query.tf || 'TTM') as TF);
  const periods = (Number(req.query.periods) === 5 ? 5 : 10) as 5|10;

  const key = `${symbol}:${tf}:${periods}`;
  const cached = cache.get(key);
  if (cached) {
    res.set('Cache-Control','max-age=300');
    return res.json(cached);
  }

  try {
    const payload = composeMock(symbol, tf, periods);
    cache.set(key, payload);
    res.set('Cache-Control','max-age=300');
    return res.json(payload);
  } catch (err:any){
    const fallback = emptyPayload(symbol);
    fallback.error = { code: 'UPSTREAM_TIMEOUT', detail: err?.message || 'unknown' } as any;
    res.set('Cache-Control','max-age=120');
    return res.json(fallback);
  }
});

export default router;

function emptyPayload(symbol:string){
  return {
    symbol,
    asOf: new Date().toISOString().slice(0,10),
    ai: null,
    fairValue: { value: null, premiumPct: null, method: 'DCF' as const },
    assumptions: { wacc: 9.0, ltGrowth: 2.5, taxRate: 18.0 },
    kpis: {},
    trends: { periods: [] as string[] },
    valuation: { multiples: [] as any[], grades: { valuation: 0, growth: 0, profitability: 0, health: 0 } },
    health: { altmanZ: null, piotroskiF: null, interestCoverage: null },
    peers: { tickers: [] as string[], metrics: {} as Record<string, any> },
    context: { sector: '', industry: '', sic: '' },
  };
}

function composeMock(symbol:string, tf:TF, n:5|10){
  const periods = buildPeriods(tf, n);
  const mkSeries = (base:number, amp:number) => periods.map((_,i)=> +(base + amp*Math.sin(i/2)).toFixed(2));
  const revenue = mkSeries(90, 14).map(x=> x*1e9);
  const net     = mkSeries(18, 6).map(x=> x*1e9);

  const payload:any = {
    symbol,
    asOf: new Date().toISOString().slice(0,10),
    ai: { summary: `${symbol} trends stable; modest margin drift.`, insights: [
      'Operating margin near 5Y average.',
      'FCF quality improving (CFO > Net Income).'
    ]},
    fairValue: { value: 182.0, premiumPct: 8.4, method: 'DCF' as const },
    assumptions: { wacc: 9.2, ltGrowth: 2.5, taxRate: 18.0 },
    kpis: {
      marketCap:       { value: 2.45e12, deltaYoY: 7.2, spark: mkSeries(2400,120) },
      revenueTTM:      { value: revenue.at(-1), deltaYoY: 5.1, spark: revenue.slice(-10) },
      netIncomeTTM:    { value: net.at(-1), deltaYoY: 3.2, spark: net.slice(-10) },
      grossMargin:     { value: 43.4, deltaYoY: 0.6, spark: mkSeries(43,1.2) },
      operatingMargin: { value: 27.1, deltaYoY: -0.3, spark: mkSeries(27,1.0) },
      netMargin:       { value: 20.9, deltaYoY: 0.2, spark: mkSeries(21,0.7) },
      roe:             { value: 28.1, deltaYoY: 1.0, spark: mkSeries(27.5,1.1) },
      roa:             { value: 12.7, deltaYoY: 0.4, spark: mkSeries(12.4,0.6) },
      debtToEquity:    { value: 0.44, deltaYoY: -0.02, spark: mkSeries(0.5,0.05) },
      currentRatio:    { value: 1.30, deltaYoY: 0.03, spark: mkSeries(1.3,0.05) },
      quickRatio:      { value: 1.04, deltaYoY: 0.01, spark: mkSeries(1.05,0.03) },
    },
    trends: {
      periods,
      revenue,
      netIncome: net,
      grossMargin: mkSeries(43, 1.3),
      operatingMargin: mkSeries(27, 1.0),
      netMargin: mkSeries(21, 0.8),
      totalDebt: mkSeries(120, 10).map(x=> x*1e9),
      totalEquity: mkSeries(260, 12).map(x=> x*1e9),
      cfo: mkSeries(32, 6).map(x=> x*1e9),
      cfi: mkSeries(-12, 4).map(x=> x*1e9),
      cff: mkSeries(-6, 3).map(x=> x*1e9),
      eps: mkSeries(5, 0.6),
      price: mkSeries(150, 18),
    },
    valuation: {
      multiples: [
        { metric: 'PE',        value: 28.9, avg5y: 26.2, sectorAvg: 25.0, trend: 'down' },
        { metric: 'ForwardPE', value: 24.1, avg5y: 23.0, sectorAvg: 23.4, trend: 'down' },
        { metric: 'PEG',       value: 1.2,  avg5y: 1.3,  sectorAvg: 1.4,  trend: 'up'   },
        { metric: 'PB',        value: 7.1,  avg5y: 6.8,  sectorAvg: 5.9,  trend: 'down' },
        { metric: 'PS',        value: 7.4,  avg5y: 6.9,  sectorAvg: 6.3,  trend: 'down' },
        { metric: 'EVEBITDA',  value: 19.3, avg5y: 20.4, sectorAvg: 17.2, trend: 'down' },
      ],
      grades: { valuation: 82, growth: 74, profitability: 91, health: 68 },
    },
    health: { altmanZ: 3.9, piotroskiF: 7, interestCoverage: 10.2 },
    peers: {
      tickers: ['AAPL','MSFT','GOOGL','META'],
      metrics: {
        PE:        { [symbol]: 28.9, AAPL: 28.0, MSFT: 30.0, GOOGL: 26.0, META: 24.0, sectorAvg: 25.0 },
        ROE:       { [symbol]: 28.1, AAPL: 25.0, MSFT: 29.0, GOOGL: 23.0, META: 30.0, sectorAvg: 18.0 },
        NetMargin: { [symbol]: 20.9, AAPL: 24.0, MSFT: 26.0, GOOGL: 21.0, META: 29.0, sectorAvg: 16.0 },
        DE:        { [symbol]: 0.44, AAPL: 0.40, MSFT: 0.30, GOOGL: 0.20, META: 0.15, sectorAvg: 0.50 },
      }
    },
    context: { sector: 'Technology', industry: 'Consumer Electronics', sic: '3571' },
  };

  for (const k of Object.keys(payload.kpis)) {
    const s = payload.kpis[k].spark;
    payload.kpis[k].spark = Array.isArray(s) ? s.slice(-10) : null;
  }
  return payload;
}
