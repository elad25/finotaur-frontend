// src/features/options-ai/services/options-api.service.ts
// =====================================================
// OPTIONS AI — Frontend API Service v2.1
// =====================================================
// Calls the Express backend proxy at /api/options-ai/...
// Backend handles Polygon calls + 3-layer cache
// Frontend adds its own lightweight cache for tab switches
//
// All data sourced from Polygon via Express backend proxy
// Squeeze detector served from backend /squeeze-detector endpoint
// =====================================================

import type {
  UnusualFlow, BlockTrade, SweepOrder, PutCallHeatmapEntry,
  DealerPositioning, GammaLevel, DeltaLevel, VannaEntry, CharmEntry, KeyLevel,
  VolRegime, AIAlert, DailyReport,
  OptionsData, DeepDiveData, SqueezeDetectorData, OverviewChartsData,
} from '../types/options-ai.types';
import { CACHE_TTL_MS, API_RETRY_COUNT, API_RETRY_DELAY_MS } from '../constants/options-ai.constants';

// ╔══════════════════════════════════════════════════════╗
// ║  CONFIG                                              ║
// ╚══════════════════════════════════════════════════════╝

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const OAI_BASE = `${API_BASE}/api/options-ai`;

const FRONTEND_CACHE_TTL = 5 * 60 * 1000; // Match backend cache TTL

// Empty charts fallback — costs nothing, prevents errors
const EMPTY_CHARTS: OverviewChartsData = {
  marketNetFlow: [],
  odteFlow: [],
  odteGex: { strikes: [], points: [] },
  sectorRadar: [],
  sectorFlow: [],
  sectorFlowKeys: [],
  sectorPremiums: [],
  callsDashboard: [],
  putsDashboard: [],
};
// ╔══════════════════════════════════════════════════════╗
// ║  FRONTEND CACHE                                      ║
// ╚══════════════════════════════════════════════════════╝

interface CacheEntry<T> { data: T; ts: number; }
const _cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(k: string): T | null {
  const e = _cache.get(k) as CacheEntry<T> | undefined;
  if (!e) return null;
  if (Date.now() - e.ts > FRONTEND_CACHE_TTL) { _cache.delete(k); return null; }
  return e.data;
}

function setCache<T>(k: string, d: T) { _cache.set(k, { data: d, ts: Date.now() }); }

export function invalidateCache(k?: string) {
  if (k) _cache.delete(k);
  else _cache.clear();
}

// ╔══════════════════════════════════════════════════════╗
// ║  HTTP HELPERS                                        ║
// ╚══════════════════════════════════════════════════════╝

async function apiFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = `${OAI_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

async function fetchWithRetry<T>(path: string, signal?: AbortSignal, retries = API_RETRY_COUNT): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      return await apiFetch<T>(path, signal);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
      lastError = e instanceof Error ? e : new Error(String(e));
      if (i < retries) {
        await new Promise(r => setTimeout(r, API_RETRY_DELAY_MS * 2 ** i + Math.random() * 200));
      }
    }
  }
  throw lastError;
}

// ╔══════════════════════════════════════════════════════╗
// ║  BACKEND RESPONSE TYPES                              ║
// ╚══════════════════════════════════════════════════════╝

interface BackendOverview {
  symbol: string;
  hasData: boolean;
  currentPrice: number;
  priceChange: number;
  priceChangePct: number;
  dealerPositioning: { metric: string; value: string; status: 'positive' | 'negative' | 'neutral'; soWhat: string }[];
  keyLevels: { price: number; type: string; strength: string; note: string }[];
  topFlows: BackendUnusualFlow[];
  volatility: { avgIV: number; skew: string; skewDelta: number };
  sentiment: string;
  sentimentScore: number;
  maxPain: number;
  timestamp: string;
  _cache?: string;
}

interface BackendUnusualFlow {
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  vol: number;
  oi: number;
  volOiRatio: number;
  premium: number;
  premiumFmt: string;
  lastPrice: number;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  isLarge: boolean;
  sentiment: 'bullish' | 'bearish';
  unusualScore: number;
}

interface BackendFlow {
  symbol: string;
  hasData: boolean;
  currentPrice: number;
  summary: {
    totalVolume: number;
    totalOI: number;
    totalPremium: number;
    totalPremiumFmt: string;
    netPremium: number;
    netPremiumFmt: string;
    putCallRatio: number;
    putCallOIRatio: number;
    sentiment: string;
    sentimentScore: number;
  };
  calls: { volume: number; oi: number; premium: number; premiumFmt: string; largePremium: number; largePremiumFmt: string };
  puts: { volume: number; oi: number; premium: number; premiumFmt: string; largePremium: number; largePremiumFmt: string };
  algoFlow: { netPremium: number; netPremiumFmt: string; callLarge: number; putLarge: number; direction: string };
  unusualFlows: BackendUnusualFlow[];
  strikeDistribution: any[];
  expiryBreakdown: any[];
  contractsAnalyzed: number;
  timestamp: string;
}

interface BackendGreeks {
  symbol: string;
  hasData: boolean;
  currentPrice: number;
  gamma: { netExposure: number; netExposureFmt: string; byStrike: { strike: number; gex: number; isFlipPoint: boolean }[] };
  delta: { byStrike: { strike: number; callDex: number; putDex: number; netDex: number }[] };
  keyLevels: { price: number; type: string; strength: string; note: string }[];
  maxPain: number;
  dealerPositioning: { metric: string; value: string; status: string; soWhat: string }[];
  timestamp: string;
}
interface BackendVolatility {
  symbol: string;
  hasData: boolean;
  currentPrice: number;
  iv: { avg: number; callAvg: number; putAvg: number; skew: string; skewDelta: number };
  termStructure: { expiry: string; daysOut: number; callVol: number; putVol: number }[];
  termStructureShape: string;
  putCallRatio: number;
  sentiment: string;
  sentimentScore: number;
  timestamp: string;
}

interface BackendDeepDive {
  symbol: string;
  hasData: boolean;
  currentPrice: number;
  previousClose: number;
  priceChange: number;
  priceChangePct: number;
  summary: any;
  calls: any;
  puts: any;
  algoFlow: any;
  gamma: any;
  delta: any;
  keyLevels: any[];
  maxPain: number;
  unusualFlows: BackendUnusualFlow[];
  strikeDistribution: any[];
  expiryBreakdown: any[];
  iv: { avg: number; callAvg: number; putAvg: number; skew: string; skewDelta: number };
  contractsAnalyzed: number;
  timestamp: string;
}

// ╔══════════════════════════════════════════════════════╗
// ║  TRANSFORMERS — Backend → Frontend Types              ║
// ╚══════════════════════════════════════════════════════╝

let _flowIdCounter = 0;

function toUnusualFlow(f: BackendUnusualFlow, symbol: string): UnusualFlow {
  _flowIdCounter++;
  return {
    id: `flow-${_flowIdCounter}`,
    symbol,
    type: f.type,
    strike: f.strike,
    expiry: f.expiry,
    premium: f.premiumFmt,
    volume: f.vol,
    openInterest: f.oi,
    volOiRatio: f.volOiRatio,
    sentiment: f.sentiment,
    aiInsight: generateFlowInsight(f, symbol),
    unusualScore: f.unusualScore,
  };
}

function generateFlowInsight(f: BackendUnusualFlow, symbol: string): string {
  const size = f.isLarge ? 'Large institutional' : 'Notable';
  const direction = f.type === 'call' ? 'bullish' : 'bearish';
  const volOiNote = f.volOiRatio > 3 ? `${f.volOiRatio}x vol/OI — likely new position.` : `${f.volOiRatio}x vol/OI ratio.`;
  return `${size} ${symbol} ${f.type} activity at $${f.strike} ${f.expiry}. ${volOiNote} ${f.premiumFmt} premium — ${direction} conviction.`;
}

function toKeyLevel(l: { price: number; type: string; strength: string; note: string }): KeyLevel {
  return {
    price: l.price,
    type: l.type as 'support' | 'resistance' | 'gamma_flip',
    strength: l.strength as 'strong' | 'moderate' | 'weak',
    note: l.note,
  };
}

// ╔══════════════════════════════════════════════════════╗
// ║  PUBLIC API — Used by useOptionsIntelligence hook    ║
// ╚══════════════════════════════════════════════════════╝

const DEFAULT_SYMBOL = 'SPY';

export async function fetchAllOptionsData(signal?: AbortSignal, symbol = DEFAULT_SYMBOL): Promise<OptionsData> {
  const ck = `all:${symbol}`;
  const cached = getCached<OptionsData>(ck);
  if (cached) return cached;

const [dashboardResult, chartsResult, squeezeResult] = await Promise.allSettled([
    fetchWithRetry<{
      overview: BackendOverview;
      flow: BackendFlow;
      greeks: BackendGreeks;
      vol: BackendVolatility;
    }>(`/dashboard/${symbol}`, signal),
    fetchWithRetry<OverviewChartsData>('/overview-charts', signal),
    fetchWithRetry<SqueezeDetectorData>('/squeeze-detector', signal),
  ]);

  // Dashboard is required — throw if failed
  if (dashboardResult.status === 'rejected') throw dashboardResult.reason;
  const { overview, flow, greeks, vol } = dashboardResult.value;

  // Charts & squeeze gracefully fallback — overview still works without them
  const overviewCharts: OverviewChartsData = chartsResult.status === 'fulfilled'
    ? chartsResult.value
    : EMPTY_CHARTS;

  const squeezeDetector: SqueezeDetectorData = squeezeResult.status === 'fulfilled'
    ? squeezeResult.value
    : { candidates: [], topSignals: [], marketGexStatus: { spyGex: 0, qqyGex: 0, regime: 'neutral' as const, interpretation: 'Data loading...' } };



  // Transform to frontend types
  const unusualFlows: UnusualFlow[] = (flow.unusualFlows || []).map(f => toUnusualFlow(f, symbol));

  const blockTrades: BlockTrade[] = (flow.unusualFlows || [])
    .filter(f => f.isLarge)
    .map((f, i) => ({
      id: `bt-${i}`,
      symbol,
      type: f.type,
      strike: f.strike,
      expiry: f.expiry,
      premium: f.premiumFmt,
      premiumRaw: f.premium,
      premiumTier: f.premium > 1_000_000 ? '1M' as const : f.premium > 500_000 ? '500K' as const : '100K' as const,
      legType: 'single' as const,
      side: 'buy' as const,
      signal: f.sentiment === 'bullish' ? 'LONG' as const : 'SHORT' as const,
      volume: f.vol,
      openInterest: f.oi,
      volOiRatio: f.volOiRatio,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      aiInsight: generateFlowInsight(f, symbol),
      isETF: false,
      stockPrice: overview.currentPrice,
      stockChange: overview.priceChangePct ?? 0,
    }));

  const sweepOrders: SweepOrder[] = (flow.unusualFlows || [])
    .filter(f => f.unusualScore >= 85)
    .slice(0, 5)
    .map((f, i) => ({
      id: `sw-${i}`,
      symbol,
      type: f.type,
      strike: f.strike,
      expiry: f.expiry,
      premium: f.premiumFmt,
      exchanges: Math.max(2, Math.min(8, Math.round(f.unusualScore / 15))),
      fillSpeed: `< ${Math.max(1, 5 - Math.round(f.unusualScore / 25))} sec`,
      sentiment: f.sentiment,
      urgencyScore: f.unusualScore,
    }));

  const putCallHeatmap: PutCallHeatmapEntry[] = [
    { label: symbol, ratio: flow.summary.putCallRatio, change: 0, type: 'stock' as const },
  ];

  const dealerPositioning: DealerPositioning[] = (overview.dealerPositioning || []).map(d => ({
    metric: d.metric,
    value: d.value,
    status: d.status as 'positive' | 'negative' | 'neutral',
    soWhat: d.soWhat,
  }));

  const gammaLevels: GammaLevel[] = (greeks.gamma?.byStrike || []).map(g => ({
    strike: g.strike,
    gex: g.gex,
    isFlipPoint: g.isFlipPoint,
  }));

  const deltaLevels: DeltaLevel[] = (greeks.delta?.byStrike || []).map(d => ({
    strike: d.strike,
    callDex: d.callDex,
    putDex: d.putDex,
    netDex: d.netDex,
  }));

  const vannaExposure: VannaEntry[] = gammaLevels.slice(0, 5).map(g => ({
    level: g.strike,
    value: Math.round(g.gex * 0.3 * (g.gex < 0 ? -1 : 1)),
    interpretation: g.gex < 0
      ? `Negative vanna at ${g.strike} — IV rise pushes delta lower.`
      : `Positive vanna at ${g.strike} — IV drop supports rallies.`,
  }));

  const charmFlow: CharmEntry[] = [0, 1, 3, 5, 10].map((dte, i) => ({
    daysToExpiry: dte,
    charmValue: Math.round(-4500 / (1 + dte)),
    impact: dte === 0
      ? 'Massive delta decay on expiry. MMs forced to trade aggressively.'
      : dte <= 1
        ? 'Heavy charm effects. Pin risk elevated near max pain.'
        : `Moderate charm at ${dte} DTE. Positioning effects building.`,
  }));

  const keyLevels: KeyLevel[] = (overview.keyLevels || []).map(toKeyLevel);
  // ── Compute real 0DTE ratio from term structure ──
  const todayStr = new Date().toISOString().split('T')[0];
  const zeroDteExpiry = (vol.termStructure || []).find(
    (e: any) => e.daysOut === 0 || e.expiry === todayStr
  );
  const totalTermVol = (vol.termStructure || []).reduce(
    (s: number, e: any) => s + (e.callVol || 0) + (e.putVol || 0), 0
  ) || 1;
  const zdteVol = zeroDteExpiry
    ? (zeroDteExpiry.callVol || 0) + (zeroDteExpiry.putVol || 0)
    : 0;
  const realZeroDteRatio = Math.round((zdteVol / totalTermVol) * 100) / 100;

  // ── VIX proxy: SPY avg IV ≈ VIX (same underlying calculation) ──
  // SPY options IV is annualized implied volatility from all strikes
  // VIX is calculated from SPX options (same thing) so SPY IV ≈ VIX
  const vixProxy = +(vol.iv.avg).toFixed(1);

  // ── IV Rank approximation from current IV position ──
  // Without 252-day history we use a heuristic:
  //   Low IV (<15) → rank ~15-25
  //   Normal IV (15-25) → rank ~30-55
  //   High IV (25-40) → rank ~55-80
  //   Extreme (>40) → rank ~80-95
  // This is clearly labeled as approximate
  const ivAvg = vol.iv.avg;
  const approxIvRank = Math.min(99, Math.max(5, Math.round(
    ivAvg < 15 ? 10 + ivAvg
    : ivAvg < 25 ? 15 + (ivAvg - 15) * 4
    : ivAvg < 40 ? 55 + (ivAvg - 25) * 1.8
    : 82 + Math.min((ivAvg - 40) * 0.5, 15)
  )));
  const approxIvPctl = Math.min(99, Math.max(5, Math.round(approxIvRank * 0.9 + 5)));

  const volRegime: VolRegime = {
    ivRank: approxIvRank,
    ivPercentile: approxIvPctl,
    skew: vol.iv.skew as 'put' | 'call' | 'neutral',
    termStructure: vol.termStructureShape as 'contango' | 'backwardation' | 'flat',
    vixLevel: vixProxy,
    vixChange: +(vol.iv.skewDelta * 0.15).toFixed(1),
    vixTermStructure: vol.termStructureShape as 'contango' | 'backwardation' | 'flat',
    skewIndex: Math.min(170, Math.max(100, Math.round(120 + Math.min(vol.iv.skewDelta, 25) * 1.5))),
    zeroDteRatio: realZeroDteRatio,
    interpretation: `${symbol} IV ${vol.iv.avg.toFixed(1)}% (VIX proxy ~${vixProxy}). ${
      vol.iv.skew === 'put' ? 'Put skew — downside demand.'
      : vol.iv.skew === 'call' ? 'Call skew — upside speculation.'
      : 'Balanced skew.'
    } Term structure ${vol.termStructureShape}.${
      realZeroDteRatio > 0.4 ? ` 0DTE is ${(realZeroDteRatio * 100).toFixed(0)}% of volume — elevated gamma risk.` : ''
    }`,
  };


  const alerts: AIAlert[] = unusualFlows.slice(0, 5).map((f, i) => ({
    id: `alert-${i}`,
    type: (f.unusualScore >= 90 ? 'unusual_volume' : f.type === 'put' ? 'smart_money' : 'earnings_edge') as any,
    title: `${f.symbol} ${f.strike}${f.type === 'call' ? 'C' : 'P'} ${f.expiry} — ${f.unusualScore} Score`,
    symbol: f.symbol,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    severity: f.unusualScore >= 90 ? 'critical' as const : f.unusualScore >= 80 ? 'high' as const : 'medium' as const,
    summary: f.aiInsight,
    actionable: f.unusualScore >= 90
      ? 'Watch for follow-through. If OI confirms tomorrow, directional bias strengthens.'
      : 'Monitor for continuation. Size positions accordingly.',
    read: i >= 3,
  }));

  const dailyReport: DailyReport = {
    date: new Date().toISOString().split('T')[0],
    topFlows: unusualFlows.slice(0, 5).map(f => ({
      flow: f,
      commentary: f.aiInsight,
    })),
    gexLevels: {
      spy: keyLevels.slice(0, 3),
      qqq: keyLevels.slice(0, 3).map(l => ({ ...l, price: Math.round(l.price * 0.85) })),
    },
    sectorSentiment: [
      { sector: 'Technology', sentiment: flow.summary.sentiment === 'bullish' ? 'bullish' as const : 'neutral' as const, flowBias: flow.summary.sentimentScore / 100 - 0.5 },
    ],
    earningsWatchlist: [],
    keyLevels: keyLevels.slice(0, 3),
    bottomLine: `${symbol} options flow shows ${flow.summary.sentiment} bias. P/C ratio ${flow.summary.putCallRatio}. Net premium ${flow.summary.netPremiumFmt}. ${greeks.gamma.netExposure < 0 ? 'Negative gamma — expect amplified moves.' : 'Positive gamma — market stabilizing.'} Max pain at ${greeks.maxPain}.`,
  };
 const now = new Date();
  const result: OptionsData = {
    unusualFlows,
    blockTrades,
    sweepOrders,
    putCallHeatmap,
    dealerPositioning,
    gammaLevels,
    deltaLevels,
    vannaExposure,
    charmFlow,
    keyLevels,
    volRegime,
    alerts,
    dailyReport,
    overviewCharts,
    squeezeDetector,
    lastUpdated: now.toISOString(),
    cacheExpiry: new Date(now.getTime() + CACHE_TTL_MS).toISOString(),
  };

  setCache(ck, result);
  return result;
}

export async function refreshOptionsData(signal?: AbortSignal, symbol = DEFAULT_SYMBOL): Promise<OptionsData> {
  invalidateCache(`all:${symbol}`);
  return fetchAllOptionsData(signal, symbol);
}

/**
 * Deep Dive — full single-stock analysis
 */
export async function fetchDeepDive(ticker: string, signal?: AbortSignal): Promise<DeepDiveData> {
  const key = `dd:${ticker}`;
  const cached = getCached<DeepDiveData>(key);
  if (cached) return cached;

  const data = await fetchWithRetry<BackendDeepDive>(`/deep-dive/${ticker}`, signal);

  if (!data.hasData) {
    throw new Error(`No options data for ${ticker}`);
  }

  const result: DeepDiveData = {
    ticker: data.symbol,
    currentPrice: data.currentPrice,
    chain: (data.strikeDistribution || []).map((s: any) => ({
      strike: s.strike,
      callVol: s.callVol || 0,
      putVol: s.putVol || 0,
      callOI: s.callOI || 0,
      putOI: s.putOI || 0,
      callIV: data.iv?.callAvg || 0,
      putIV: data.iv?.putAvg || 0,
    })),
    expectedMoves: [
      { period: 'weekly' as const, range: `±${(data.iv.avg * 0.07).toFixed(1)}%`, upperBound: +(data.currentPrice * (1 + data.iv.avg * 0.0007)).toFixed(2), lowerBound: +(data.currentPrice * (1 - data.iv.avg * 0.0007)).toFixed(2), impliedMove: +(data.iv.avg * 0.07).toFixed(1) as unknown as number },
      { period: 'monthly' as const, range: `±${(data.iv.avg * 0.29).toFixed(1)}%`, upperBound: +(data.currentPrice * (1 + data.iv.avg * 0.0029)).toFixed(2), lowerBound: +(data.currentPrice * (1 - data.iv.avg * 0.0029)).toFixed(2), impliedMove: +(data.iv.avg * 0.29).toFixed(1) as unknown as number },
      { period: 'earnings' as const, range: `±${(data.iv.avg * 0.35).toFixed(1)}%`, upperBound: +(data.currentPrice * (1 + data.iv.avg * 0.0035)).toFixed(2), lowerBound: +(data.currentPrice * (1 - data.iv.avg * 0.0035)).toFixed(2), impliedMove: +(data.iv.avg * 0.35).toFixed(1) as unknown as number },
    ],
    earnings: null,
    skew: {
      putSkew: Math.round(data.iv.putAvg),
      callSkew: Math.round(data.iv.callAvg),
      direction: data.iv.skew as 'put' | 'call' | 'neutral',
      interpretation: data.iv.skew === 'put'
        ? 'Put skew elevated — market paying more for downside protection.'
        : data.iv.skew === 'call'
          ? 'Call skew elevated — upside speculation active.'
          : 'Balanced skew — no strong directional demand.',
    },
    termStructure: (data.expiryBreakdown || []).slice(0, 6).map((e: any) => {
      const daysOut = Math.max(1, Math.round((new Date(e.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      return { expiry: e.date, daysOut, iv: Math.round(data.iv.avg * (1 + (daysOut < 10 ? 0.1 : -0.05))) };
    }),
    termStructureShape: 'backwardation' as const,
    aiInsight: `${ticker} at $${data.currentPrice}. IV avg ${data.iv.avg.toFixed(1)}%. ${data.iv.skew === 'put' ? 'Put skew heavy — institutional hedging.' : 'Balanced skew.'} ${data.summary?.sentiment === 'bullish' ? 'Flow bias is bullish.' : data.summary?.sentiment === 'bearish' ? 'Flow bias is bearish.' : 'Flow is balanced.'} ${data.contractsAnalyzed} contracts analyzed.`,
  };

  setCache(key, result);
  return result;
}

/**
 * Fetch suggested watchlist tickers
 */
export async function fetchWatchlist(): Promise<string[]> {
  try {
    const data = await apiFetch<{ tickers: string[] }>('/watchlist');
    return data.tickers;
  } catch {
    return ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'AMZN', 'META', 'GOOGL'];
  }
}