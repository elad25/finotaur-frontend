// src/services/top5Scanner.api.ts
// =====================================================
// 🔌 FINOTAUR SCANNER v5 — Unified API Service
// =====================================================
// Dual scanner: Earnings Inflection + Significant Catalysts
// OPTIMIZED: Parallel fetching, batch logos, 0 redundant calls
// =====================================================

const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

// ── Shared Types ──────────────────────────────────

export interface SignalData {
  score: number;
  detail: string;
  weight: number;
}

export interface KeyLevels {
  support: number;
  resistance: number;
  target: number;
}

export interface ScannerSignals {
  volume: SignalData;
  news: SignalData;
  options: SignalData;
  gap: SignalData;
  shortInterest: SignalData;
  technical: SignalData;
  darkPool: SignalData;
  social: SignalData;
  sector: SignalData;
  events: SignalData;
}

export interface LitePatternSignals {
  guidanceTone: SignalData;
  earningsInflection: SignalData;
  supplyChain: SignalData;
}

// ── Earnings Pick (from /api/top5/latest) ─────────

export interface StockPick {
  ticker: string;
  name: string;
  logo?: string;
  price: number;
  change: number;
  preMarketChange: number;
  overallScore: number;
  litePatternScore: number;
  finotaurScore: number;
  catalyst: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  inflectionStage: 'EARLY' | 'ACCELERATING' | 'CONFIRMED' | 'N/A';
  whyThisStock: string;
  supplyChainRole: string;
  liteParallel: string;
  scannerSignals: ScannerSignals;
  liteSignals: LitePatternSignals;
  keyLevels: KeyLevels;
  avgVolume: string;
  marketCap: string;
  sector: string;
  tradeType?: string;
  tradeTimeframe?: string;
  riskLevel?: number;
  highlights?: string[];
  guidanceDirection?: string;
}

export interface ScanResult {
  picks: StockPick[];
  lastScan: string | null;
  scanId: string | null;
  totalScanned: number;
  totalLogged: number;
}

// ── Catalyst Pick (from /api/catalysts/latest) ────

export interface AnalystAction {
  firm: string;
  action: string;
  rating: string;
  priceTarget: number;
  date: string;
}

export interface SpilloverCompany {
  ticker: string;
  name: string;
  impact: 'positive' | 'negative';
  reason: string;
}

export interface CatalystSignals {
  catalystMagnitude: SignalData;
  earningsImpact: SignalData;
  competitivePosition: SignalData;
  guidanceTone: SignalData;
  analystRevisions: SignalData;
  marginExpansion: SignalData;
  supplyChain: SignalData;
  shortSqueeze: SignalData;
  tamExpansion: SignalData;
  macroTailwind: SignalData;
}

export interface CatalystPick {
  ticker: string;
  name: string;
  sector: string;
  marketCap: string;
  price: number;
  change: number;
  catalystType: string;
  catalystHeadline: string;
  catalystDate: string;
  catalystDetail: string;
  overallScore: number;
  finotaurScore: number;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  inflectionStage: 'EARLY' | 'ACCELERATING' | 'CONFIRMED' | 'N/A';
  whyThisStock: string;
  catalystImpact: string;
  tradeType: string;
  tradeTimeframe: string;
  riskLevel: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  target1: number;
  target2: number;
  riskRewardRatio: number;
  guidanceDirection: string;
  guidanceMagnitude: string;
  highlights: string[];
  analystActions: AnalystAction[];
  supplyChainRole: string;
  moatType: string;
  moatDetail: string;
  spilloverCompanies: SpilloverCompany[];
  scannerSignals: CatalystSignals;
  citations: string[];
}

export interface CatalystResult {
  picks: CatalystPick[];
  lastScan: string | null;
  scanId: string | null;
  totalScanned: number;
}

// ── Earnings Report (DB row) ──────────────────────

export interface EarningsReport {
  id: string;
  ticker: string;
  company_name: string;
  sector: string;
  report_date: string;
  quarter: string;
  overall_score: number;
  lite_pattern_score: number;
  finotaur_score: number;
  direction: string;
  inflection_stage: string;
  trade_type: string;
  trade_timeframe: string;
  trade_thesis: string;
  risk_level: number;
  catalyst: string;
  highlight_1: string;
  highlight_2: string;
  highlight_3: string;
  highlight_4: string;
  highlight_5: string;
  guidance_direction: string;
  guidance_magnitude: string;
  guidance_key_quote: string;
  has_strategy_shift: boolean;
  strategy_shift_detail: string;
  has_restructuring: boolean;
  restructuring_detail: string;
  spillover_companies: any[];
  drastic_move_potential: number;
  drastic_move_catalysts: any[];
  key_quotes: any[];
  entry_zone_low: number;
  entry_zone_high: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  risk_reward_ratio: number;
  investor_profile_notes: string;
  is_inflection_point: boolean;
  is_growth_accelerating: boolean;
  revenue_trend_4q: string;
  [key: string]: any;
}

// ═══════════════════════════════════════════════════
// CORE: Fetch Both Scanners in PARALLEL
// ═══════════════════════════════════════════════════
// 10K users hitting this = 1 parallel call per user
// Both endpoints are cached 2min on backend anyway

export async function fetchAllPicks(): Promise<{ earnings: ScanResult; catalysts: CatalystResult }> {
  const [earnings, catalysts] = await Promise.all([
    fetchLatestScan(),
    fetchCatalystLatest(),
  ]);
  return { earnings, catalysts };
}

// ── Earnings Scanner Endpoints ────────────────────

export async function fetchLatestScan(): Promise<ScanResult> {
  try {
    const res = await fetch(`${API_BASE}/api/top5/latest`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { picks: [], lastScan: null, scanId: null, totalScanned: 0, totalLogged: 0 };
  }
}

export async function triggerScan(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/top5/scan`, { method: 'POST' });
    return await res.json();
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function fetchScanStatus(): Promise<{ inProgress: boolean; lastResult: any }> {
  try {
    const res = await fetch(`${API_BASE}/api/top5/scan/status`);
    return await res.json();
  } catch {
    return { inProgress: false, lastResult: null };
  }
}

// ── Catalyst Scanner Endpoints ────────────────────

export async function fetchCatalystLatest(): Promise<CatalystResult> {
  try {
    const res = await fetch(`${API_BASE}/api/catalysts/latest`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { picks: [], lastScan: null, scanId: null, totalScanned: 0 };
  }
}

export async function triggerCatalystScan(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/catalysts/scan`, { method: 'POST' });
    return await res.json();
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function fetchCatalystStatus(): Promise<{ inProgress: boolean; lastResult: any }> {
  try {
    const res = await fetch(`${API_BASE}/api/catalysts/scan/status`);
    return await res.json();
  } catch {
    return { inProgress: false, lastResult: null };
  }
}

// ── Logo Batch (OPTIMIZED) ────────────────────────

const logoMemCache = new Map<string, string | null>();

export async function fetchLogos(tickers: string[]): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const toFetch: string[] = [];

  for (const t of tickers) {
    if (logoMemCache.has(t)) {
      result.set(t, logoMemCache.get(t)!);
    } else {
      toFetch.push(t);
    }
  }

  if (toFetch.length > 0) {
    const fetched = await Promise.allSettled(
      toFetch.map(async (ticker) => {
        const res = await fetch(`${API_BASE}/api/market-data/company/${ticker}`);
        if (!res.ok) return { ticker, logo: null };
        const data = await res.json();
        return { ticker, logo: data?.logo || null };
      })
    );

    for (const r of fetched) {
      if (r.status === 'fulfilled') {
        logoMemCache.set(r.value.ticker, r.value.logo);
        result.set(r.value.ticker, r.value.logo);
      }
    }
  }

  return result;
}

// ── Earnings Reports Search ───────────────────────

export async function fetchEarningsReports(params?: {
  ticker?: string;
  sector?: string;
  from?: string;
  to?: string;
  minScore?: number;
  minLiteScore?: number;
  tradeType?: string;
  riskLevel?: number;
  direction?: string;
  investorStyle?: string;
  hasStrategyShift?: boolean;
  hasRestructuring?: boolean;
  limit?: number;
}): Promise<{ reports: EarningsReport[] }> {
  try {
    const qs = new URLSearchParams();
    if (params?.ticker) qs.set('ticker', params.ticker);
    if (params?.sector) qs.set('sector', params.sector);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.minScore) qs.set('min_score', String(params.minScore));
    if (params?.minLiteScore) qs.set('min_lite_score', String(params.minLiteScore));
    if (params?.tradeType) qs.set('trade_type', params.tradeType);
    if (params?.riskLevel) qs.set('risk_level', String(params.riskLevel));
    if (params?.direction) qs.set('direction', params.direction);
    if (params?.investorStyle) qs.set('investor_style', params.investorStyle);
    if (params?.hasStrategyShift) qs.set('has_strategy_shift', 'true');
    if (params?.hasRestructuring) qs.set('has_restructuring', 'true');
    if (params?.limit) qs.set('limit', String(params.limit));
    const res = await fetch(`${API_BASE}/api/top5/earnings?${qs}`);
    return await res.json();
  } catch {
    return { reports: [] };
  }
}

export async function fetchTickerEarnings(ticker: string): Promise<{ reports: EarningsReport[] }> {
  try {
    const res = await fetch(`${API_BASE}/api/top5/earnings/${ticker}`);
    return await res.json();
  } catch {
    return { reports: [] };
  }
}

// ── Investor / Spillover / Drastic / Strategy ─────

export async function fetchForInvestor(params: {
  style: 'growth' | 'value' | 'momentum' | 'swing' | 'day_trade' | 'income' | 'contrarian';
  maxRisk?: number;
  tradeType?: string;
  minScore?: number;
}): Promise<{ picks: EarningsReport[] }> {
  try {
    const qs = new URLSearchParams();
    qs.set('style', params.style);
    if (params.maxRisk) qs.set('max_risk', String(params.maxRisk));
    if (params.tradeType) qs.set('trade_type', params.tradeType);
    if (params.minScore) qs.set('min_score', String(params.minScore));
    const res = await fetch(`${API_BASE}/api/top5/for-investor?${qs}`);
    return await res.json();
  } catch {
    return { picks: [] };
  }
}

export async function fetchSpillover(ticker: string): Promise<{ reports: any[] }> {
  try { const res = await fetch(`${API_BASE}/api/top5/spillover/${ticker}`); return await res.json(); } catch { return { reports: [] }; }
}

export async function fetchDrasticMovers(): Promise<{ movers: any[] }> {
  try { const res = await fetch(`${API_BASE}/api/top5/drastic`); return await res.json(); } catch { return { movers: [] }; }
}

export async function fetchStrategyShifts(): Promise<{ reports: any[] }> {
  try { const res = await fetch(`${API_BASE}/api/top5/strategy-shifts`); return await res.json(); } catch { return { reports: [] }; }
}

export async function fetchInflections(): Promise<{ inflections: any[] }> {
  try { const res = await fetch(`${API_BASE}/api/top5/inflections`); return await res.json(); } catch { return { inflections: [] }; }
}

export async function fetchAlerts(minScore = 75): Promise<{ alerts: any[] }> {
  try { const res = await fetch(`${API_BASE}/api/top5/alerts?min_score=${minScore}`); return await res.json(); } catch { return { alerts: [] }; }
}

export async function fetchScanHistory(): Promise<{ scans: any[] }> {
  try { const res = await fetch(`${API_BASE}/api/top5/history`); return await res.json(); } catch { return { scans: [] }; }
}

export async function fetchCatalystHistory(): Promise<{ scans: any[] }> {
  try { const res = await fetch(`${API_BASE}/api/catalysts/history`); return await res.json(); } catch { return { scans: [] }; }
}

// ── Stock Analysis Page (DB-cached, zero AI) ────────

export interface StockAnalysis {
  ticker: string;
  cache: {
    investment_story: string;
    current_price: number;
    market_cap_raw: number;
    finotaur_score: number;
    inflection_signals: any;
    growth_trajectory: string;
    risk_summary: string;
    data_freshness: string;
  } | null;
  earningsHistory: EarningsReport[];
  catalystHistory: any[];
  dataFreshness: string | null;
}

export async function fetchStockAnalysis(ticker: string): Promise<StockAnalysis> {
  try {
    const res = await fetch(`${API_BASE}/api/top5/stock/${ticker}/analysis`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { ticker, cache: null, earningsHistory: [], catalystHistory: [], dataFreshness: null };
  }
}