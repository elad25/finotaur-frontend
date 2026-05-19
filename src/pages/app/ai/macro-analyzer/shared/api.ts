// shared/api.ts
// =====================================================
// 📌 API CLIENT + DATA HOOKS v3.0
// Connects to the Express backend on Railway
// Set VITE_API_URL in your .env to your Railway URL
//
// v3.0: Added ISM Intelligence endpoint (quotes, sectors, trades)
// v2.0: Added AI analysis endpoints (server-cached)
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch } from '@/utils/authFetch';

// Robust against both VITE_API_URL conventions:
//   - Set to bare host (e.g. https://finotaur-server-production.up.railway.app) → we append /api/macro-analyzer
//   - Set to host + /api/macro-analyzer (legacy) → kept as-is (idempotent)
// This fixes the production 404 where VITE_API_URL was the bare host but every fetch
// below appends just `/overview`, `/indicators`, etc. — producing /overview at Railway,
// which 404s at the catch-all.
const _apiHost = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';
const API_BASE = _apiHost.endsWith('/api/macro-analyzer')
  ? _apiHost
  : `${_apiHost.replace(/\/$/, '')}/api/macro-analyzer`;

// Anthropic mirror base — same host, /api/anthropic/macro-analyzer prefix.
// Used when a per-feature flag enables the Anthropic path (Phase 5 N1.5).
const _bareHost = _apiHost.replace(/\/api\/macro-analyzer$/, '').replace(/\/$/, '');
const ANTHROPIC_MACRO_BASE = `${_bareHost}/api/anthropic/macro-analyzer`;
const ANTHROPIC_MACRO_MASTER =
  import.meta.env.VITE_ENABLE_ANTHROPIC_MACRO_ANALYZER === 'true';

// =====================================================
// GENERIC FETCHER
// =====================================================

async function apiFetch<T>(endpoint: string): Promise<T> {
  // Use authFetch so Authorization: Bearer <supabase_token> is auto-injected.
  // Without it, userTier middleware sees no Bearer header and sets req.userTier='free',
  // causing aiGate to refuse `pro/finotaur/elite`-tier macro_analyzer endpoints with 403.
  const res = await authFetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Unknown API error');
  }
  return json.data as T;
}

// =====================================================
// GENERIC DATA HOOK
// =====================================================

interface UseApiDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: string | null;
}

const FETCH_TIMEOUT_MS = 8_000;

function useApiData<T>(
  fetcher: () => Promise<T>,
  refreshMs: number
): UseApiDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const mounted = useRef(true);
  const fetching = useRef(false);
  // Holds the AbortController for the currently in-flight request so cleanup can cancel it.
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;

    // Cancel any previous in-flight request before starting a new one.
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    // Timeout: abort the request after FETCH_TIMEOUT_MS milliseconds.
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      setError(null);
      const result = await fetcher();
      clearTimeout(timeoutId);
      if (mounted.current) {
        setData(result);
        setLastUpdated(new Date().toISOString());
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (mounted.current) {
        const isAbort =
          err instanceof Error && err.name === 'AbortError';
        setError(
          isAbort
            ? 'Request timed out — server may be slow or unavailable'
            : (err instanceof Error ? err.message : 'Failed to fetch data'),
        );
      }
    } finally {
      if (mounted.current) setIsLoading(false);
      fetching.current = false;
    }
  }, [fetcher]);

  useEffect(() => {
    mounted.current = true;
    fetchData();
    const interval = setInterval(fetchData, refreshMs);
    return () => {
      mounted.current = false;
      clearInterval(interval);
      // Abort any in-flight request so it doesn't update unmounted state.
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchData, refreshMs]);

  return { data, isLoading, error, refresh: fetchData, lastUpdated };
}

// =====================================================
// API FUNCTIONS
// =====================================================

export const fetchOverview = () => apiFetch<OverviewData>('/overview');
export const fetchIndicators = () => apiFetch<IndicatorData[]>('/indicators');
export const fetchFed = () => apiFetch<FedData>('/fed');
export const fetchRegime = () => apiFetch<RegimeData>('/regime');
export const fetchGlobal = () => apiFetch<GlobalData>('/global');
export const fetchSectors = () => apiFetch<SectorData>('/sectors');

// ISM Intelligence (quotes + sectors + trades — zero AI cost)
export const fetchISMIntelligence = () => apiFetch<ISMIntelligenceData>('/ism/intelligence');

// AI endpoints (server-cached)
export const fetchAIAnalysis = () => apiFetch<AIAnalysisData>('/ai-analysis');
export const generateAISection = async (section: 'regime' | 'positioning' | 'risk') => {
  const res = await authFetch(`${API_BASE}/ai-generate/${section}`, { method: 'POST' });
  if (!res.ok) throw new Error(`AI generate failed: ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'AI generation failed');
  return json.data as AIResult;
};

// ISM AI Sector Analysis (cached server-side, 1 call/hour for 10K users)
export const fetchISMSectorAI = () => apiFetch<AIResult | null>('/ism/ai-sector-analysis');

// GDP Deep Intelligence (cached server-side, 1 call/quarter for 10K users)
export const fetchGDPIntelligence = () => apiFetch<GDPIntelligenceData>('/gdp/intelligence');

export const generateGDPIntelligence = async () => {
  const useAnthropic = ANTHROPIC_MACRO_MASTER ||
    import.meta.env.VITE_ENABLE_ANTHROPIC_MACRO_GDP === 'true';
  const url = useAnthropic
    ? `${ANTHROPIC_MACRO_BASE}/gdp/intelligence`
    : `${API_BASE}/gdp/intelligence`;
  const res = await authFetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`GDP AI analysis failed: ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'GDP AI generation failed');
  return json.data as AIResult;
};

// CPI Deep Intelligence (cached server-side, 1 call/2hrs for 10K users)
export const fetchCPIIntelligence = () => apiFetch<CPIIntelligenceData>('/cpi/intelligence');
export const generateCPIIntelligence = async () => {
  const useAnthropic = ANTHROPIC_MACRO_MASTER ||
    import.meta.env.VITE_ENABLE_ANTHROPIC_MACRO_CPI === 'true';
  const url = useAnthropic
    ? `${ANTHROPIC_MACRO_BASE}/cpi/intelligence`
    : `${API_BASE}/cpi/intelligence`;
  const res = await authFetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`CPI AI analysis failed: ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'CPI AI generation failed');
  return json.data as AIResult;
};

// PPI Deep Intelligence (cached server-side, 1 call/2hrs for 10K users)
export const fetchPPIIntelligence = () => apiFetch<PPIIntelligenceData>('/ppi/intelligence');
export const generatePPIIntelligence = async () => {
  const useAnthropic = ANTHROPIC_MACRO_MASTER ||
    import.meta.env.VITE_ENABLE_ANTHROPIC_MACRO_PPI === 'true';
  const url = useAnthropic
    ? `${ANTHROPIC_MACRO_BASE}/ppi/intelligence`
    : `${API_BASE}/ppi/intelligence`;
  const res = await authFetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`PPI AI analysis failed: ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'PPI AI generation failed');
  return json.data as AIResult;
};

export const generateISMSectorAI = async () => {
  const useAnthropic = ANTHROPIC_MACRO_MASTER ||
    import.meta.env.VITE_ENABLE_ANTHROPIC_MACRO_ISM === 'true';
  const url = useAnthropic
    ? `${ANTHROPIC_MACRO_BASE}/ism/ai-sector-analysis`
    : `${API_BASE}/ism/ai-sector-analysis`;
  const res = await authFetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`ISM AI analysis failed: ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'ISM AI generation failed');
  return json.data as AIResult;
};

// FOMC Minutes Intelligence (cached server-side, 1 call/24h for 10K users)
export const fetchFOMCMinutes = () => apiFetch<AIResult | null>('/fed/fomc-minutes');
export const generateFOMCMinutes = async () => {
  const useAnthropic = ANTHROPIC_MACRO_MASTER ||
    import.meta.env.VITE_ENABLE_ANTHROPIC_MACRO_FOMC === 'true';
  const url = useAnthropic
    ? `${ANTHROPIC_MACRO_BASE}/fed/fomc-minutes`
    : `${API_BASE}/fed/fomc-minutes`;
  const res = await authFetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`FOMC Minutes analysis failed: ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'FOMC Minutes generation failed');
  return json.data as AIResult;
};

export const refreshAllData = async () => {
  await authFetch(`${API_BASE}/refresh`, { method: 'POST' });
};

// =====================================================
// TYPED HOOKS
// =====================================================

export function useOverview() {
  return useApiData(fetchOverview, 300_000);
}

export function useIndicators() {
  return useApiData(fetchIndicators, 300_000);
}

export function useFedData() {
  return useApiData(fetchFed, 900_000);
}

export function useRegime() {
  return useApiData(fetchRegime, 1_800_000);
}

export function useGlobal() {
  return useApiData(fetchGlobal, 600_000);
}

export function useSectors() {
  return useApiData(fetchSectors, 300_000);
}

// ISM Intelligence — refreshes every 30 min (data is monthly)
export function useISMIntelligence() {
  return useApiData(fetchISMIntelligence, 1_800_000);
}

// ISM AI Sector Analysis — refreshes every 30 min (checks cache)
export function useISMSectorAI() {
  return useApiData(fetchISMSectorAI, 1_800_000);
}

// GDP Deep Intelligence — refreshes every 60 min (quarterly data)
export function useGDPIntelligence() {
  return useApiData(fetchGDPIntelligence, 3_600_000);
}



// CPI Deep Intelligence — refreshes every 30 min (monthly data, checks cache)
export function useCPIIntelligence() {
  return useApiData(fetchCPIIntelligence, 1_800_000);
}

// PPI Deep Intelligence — refreshes every 30 min (checks cache)
export function usePPIIntelligence() {
  return useApiData(fetchPPIIntelligence, 1_800_000);
}

// FOMC Minutes — refreshes every 60 min (checks cache, data is ~monthly)
export function useFOMCMinutes() {
  return useApiData(fetchFOMCMinutes, 3_600_000);
}

export interface IndicatorData {
  id: string;
  name: string;
  shortName: string;
  value: number;
  previousValue: number;
  change: number;
  unit: string;
  trend: 'improving' | 'declining' | 'stable';
  category: string;
  impact: 'high' | 'medium' | 'low';
  lastUpdated: string;
  source: string;
  historicalData?: number[];
}

export interface OverviewData {
  indicators: IndicatorData[];
  regime: RegimeData;
  fed: {
    currentRate: number;
    meetings: FedMeetingData[];
    events: FedEventData[];
  };
}

export interface FedData {
  currentRate: number;
  treasury10y: number;
  treasury2y: number;
  treasury3m: number;
  yieldCurve: number;
  balanceSheet: {
    totalAssets: number;
    treasuries: number;
    mbs: number;
    changePercent: number;
  };
  meetings: FedMeetingData[];
  events: FedEventData[];
}

export interface FedMeetingData {
  date: string;
  currentRate: number;
  expectedRate: number;
  probability: number;
  decision: 'hike' | 'cut' | 'hold';
  isNext?: boolean;
}

export interface FedEventData {
  date: string;
  event: string;
  importance: 'high' | 'medium' | 'low';
}

export interface RegimeData {
  stage: string;
  stageIndex: number;
  confidence: number;
  score: number;
  indicators: {
    name: string;
    signal: string;
    weight: number;
    contribution: string;
  }[];
  recessionProbability: number;
  timeInRegime: string;
}

export interface GlobalData {
  pmis: {
    country: string;
    flag: string;
    pmi: number;
    trend: 'improving' | 'declining' | 'stable';
    vsUS: 'better' | 'worse' | 'same';
    implication: string;
  }[];
  indices: {
    name: string;
    country: string;
    flag: string;
    value: number;
    change: number;
    changePercent: number;
  }[];
  dxy: {
    value: number;
    change: number;
  };
  commodities: {
    name: string;
    value: number;
    change: number;
    changePercent: number;
  }[];
  china: {
    gdpGrowth: number;
    pmi: number;
    cpi: number;
    keyRisks: string[];
    usImpact: string;
  };
}

export interface SectorData {
  sectors: {
    name: string;
    ticker: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }[];
}

// =====================================================
// ISM INTELLIGENCE TYPES
// =====================================================

export interface ISMQuote {
  industry: string;
  sector: string;
  comment: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  keyTheme: string | null;
}

export interface ISMSectorRanking {
  sector: string;
  etf: string | null;
  rank: number;
  impactScore: number;
  direction: 'positive' | 'negative' | 'neutral';
  reasoning: string | null;
  quoteSupport: string | null;
  quoteSupportIndustry: string | null;
  changeVsLastMonth: string | null;
  whyNow: string | null;
  keyStocks: string[];
}

export interface ISMTradeIdea {
  direction: 'long' | 'short';
  sector: string;
  title: string;
  etf: string | null;
  stocks: string[];
  thesis: string;
  executiveQuote: string | null;
  executiveQuoteIndustry: string | null;
  conviction: 'high' | 'medium' | 'low';
  invalidation: string[];
  risks: string[];
  directImpact: string | null;
}

export interface ISMIntelligenceData {
  month: string;
  dataSource: string;

  // Core PMI
  pmi: number;
  newOrders: number | null;
  production: number | null;
  employment: number | null;
  prices: number | null;
  backlog: number | null;
  supplierDeliveries: number | null;
  inventories: number | null;
  priorPmi: number | null;
  isExpansion: boolean;

  // Historical
  historicalPmi: number[];

  // Executive Quotes
  quotes: ISMQuote[];
  quotesBySector: Record<string, ISMQuote[]>;
  quoteCount: number;

  // Sector Rankings
  sectorRankings: ISMSectorRanking[];

  // Trade Ideas
  tradeIdeas: ISMTradeIdea[];
  tradeCount: number;

  // IndicatorData format
  indicators: IndicatorData[];
}

// =====================================================
// CPI DEEP INTELLIGENCE TYPES
// =====================================================

export interface CPIIntelligenceData {
  cpi: IndicatorData | null;
  coreCpi: IndicatorData | null;
  aiAnalysis: AIResult | null;
  lastUpdated: string | null;
}

// AI types
export interface AIResult {
  analysis: string;
  generatedAt: string;
  cached: boolean;
  ageMinutes: number;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
  message?: string;
}

export interface AIAnalysisData {
  regime: AIResult | null;
  positioning: AIResult | null;
  risk: AIResult | null;
}

// =====================================================
// GDP DEEP INTELLIGENCE TYPES
// =====================================================

export interface GDPComponentData {
  id: string;
  name: string;
  shortName: string;
  value: number;
  previousValue: number;
  change: number;
  unit: string;
  lastUpdated: string;
  historicalData: number[];
}

export interface GDPIntelligenceData {
  components: Record<string, GDPComponentData>;
  aiAnalysis: AIResult | null;
  lastUpdated: string | null;
}

// =====================================================
// PPI DEEP INTELLIGENCE TYPES
// =====================================================

export interface PPIIntelligenceData {
  ppi: IndicatorData | null;
  aiAnalysis: AIResult | null;
  lastUpdated: string | null;
}