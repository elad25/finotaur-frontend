// src/components/stock-analyzer/tabs/WhoShouldOwnThis.tsx
// =====================================================
// WHO SHOULD OWN THIS STOCK — Compact Visual Design
// =====================================================
// Cache flow (10,000 users concurrent):
//   1. Local Map        → instant, <1ms
//   2. Server LRU+DB   → GET /api/stock-cache/:ticker/investor-profile
//   3. AI generation   → POST /api/ai-proxy/chat (~8s, once per ticker)
//   4. Save to server  → POST /api/stock-cache/:ticker/investor-profile
// =====================================================

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle, Loader2, RefreshCw, Sparkles,
} from 'lucide-react';
import type { StockData } from '@/types/stock-analyzer.types';
import { Card } from '../ui';

// ─── Types ───────────────────────────────────────────

export interface InvestorProfile {
  finotaurRating: 'Strong Buy' | 'Buy' | 'Hold' | 'Reduce' | 'Sell';
  ratingRationale: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Speculative';
  riskRationale: string;
  investorTypes: string[];
  timeHorizon: 'Short-term' | 'Medium-term' | 'Long-term';
  timeHorizonMonths: number;
  idealFor: string[];
  notFor: string[];
  positionSizing: string;
  entryStrategy: string;
  exitTrigger: string;
  profileSummary: string;
}

// ─── Local in-memory cache ───────────────────────────
const localCache = new Map<string, { data: InvestorProfile; fetchedAt: number }>();
const LOCAL_TTL = 30 * 60 * 1000;

// ─── Config ──────────────────────────────────────────

const RATING_CFG = {
  'Strong Buy': { color: '#22C55E', pos: 5 },
  'Buy':        { color: '#4ADE80', pos: 4 },
  'Hold':       { color: '#F59E0B', pos: 3 },
  'Reduce':     { color: '#F97316', pos: 2 },
  'Sell':       { color: '#EF4444', pos: 1 },
} as const;

const RISK_CFG = {
  'Low':         { color: '#22C55E', pos: 1 },
  'Medium':      { color: '#F59E0B', pos: 2 },
  'High':        { color: '#F97316', pos: 3 },
  'Speculative': { color: '#EF4444', pos: 4 },
} as const;

const ALL_TYPES = ['Defensive', 'Income', 'Value', 'GARP', 'Growth', 'Momentum', 'Speculative'] as const;
const TYPE_COLORS: Record<string, string> = {
  Defensive:   '#60A5FA',
  Income:      '#4ADE80',
  Value:       '#22C55E',
  GARP:        '#C9A646',
  Growth:      '#F59E0B',
  Momentum:    '#F97316',
  Speculative: '#EF4444',
};

const HORIZON_CFG = {
  'Short-term':  { color: '#F59E0B', label: '< 6 mo',  pct: 8  },
  'Medium-term': { color: '#C9A646', label: '6–18 mo', pct: 42 },
  'Long-term':   { color: '#4ADE80', label: '18+ mo',  pct: 80 },
} as const;

// ─── API ─────────────────────────────────────────────
const API_BASE = (import.meta as any).env?.VITE_API_URL
  || 'https://finotaur-server-production.up.railway.app';

async function checkServerCache(ticker: string): Promise<InvestorProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/api/stock-cache/${ticker}/investor-profile`);
    if (!res.ok) return null;
    const j = await res.json();
    return j.success && j.cached && j.data ? j.data : null;
  } catch { return null; }
}

async function saveServerCache(ticker: string, profile: InvestorProfile, earningsDate?: string | null) {
  try {
    await fetch(`${API_BASE}/api/stock-cache/${ticker}/investor-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileData: profile, earningsDate: earningsDate || null }),
    });
  } catch { /* non-critical */ }
}

async function generateProfile(data: StockData, signal?: AbortSignal): Promise<InvestorProfile> {
  const prompt = `You are a senior portfolio strategist. Analyze ${data.name} (${data.ticker}) and define exactly WHO should own this stock.

FINANCIAL DATA:
Sector: ${data.sector} | Industry: ${data.industry}
Price: $${data.price?.toFixed(2) || 'N/A'} | Market Cap: ${data.marketCap ? (data.marketCap / 1e9).toFixed(1) + 'B' : 'N/A'}
P/E: ${data.pe?.toFixed(1) || 'N/A'} | Fwd P/E: ${data.forwardPe?.toFixed(1) || 'N/A'} | PEG: ${data.pegRatio?.toFixed(2) || 'N/A'}
Revenue Growth: ${data.revenueGrowth?.toFixed(1) || 'N/A'}% | EPS Growth: ${data.epsGrowth?.toFixed(1) || 'N/A'}%
Net Margin: ${data.netMargin?.toFixed(1) || 'N/A'}% | ROIC: ${data.roic?.toFixed(1) || 'N/A'}%
Dividend Yield: ${data.dividendYield?.toFixed(2) || '0.00'}% | Beta: ${data.beta?.toFixed(2) || 'N/A'}
Debt/Equity: ${data.debtToEquity?.toFixed(2) || 'N/A'} | FCF/Share: $${data.freeCashFlowPerShare?.toFixed(2) || 'N/A'}

Return ONLY valid JSON — no markdown, no backticks:
{
  "finotaurRating": "Buy",
  "ratingRationale": "One sentence citing specific financials.",
  "riskLevel": "Medium",
  "riskRationale": "One sentence citing beta, debt, or earnings stability.",
  "investorTypes": ["Growth", "GARP"],
  "timeHorizon": "Long-term",
  "timeHorizonMonths": 24,
  "idealFor": ["Investors seeking X with Y horizon", "Portfolios needing Z exposure"],
  "notFor": ["Income investors — dividend yield is near zero", "Conservative investors — beta implies high volatility"],
  "positionSizing": "1-3% of portfolio — rationale",
  "entryStrategy": "Accumulate on pullbacks toward $XX support level",
  "exitTrigger": "Exit if [specific measurable condition]",
  "profileSummary": "One sentence — who this is for and why."
}

RULES:
finotaurRating: "Strong Buy" | "Buy" | "Hold" | "Reduce" | "Sell"
riskLevel: "Low" | "Medium" | "High" | "Speculative"
investorTypes: use ONLY from ["Defensive", "Income", "Value", "GARP", "Growth", "Momentum", "Speculative"]
timeHorizon: "Short-term" | "Medium-term" | "Long-term"
idealFor: 2 items max. notFor: 2 items max. profileSummary: 1 sentence. No asterisks, no bold.`;

  const res = await fetch(`${API_BASE}/api/ai-proxy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      prompt,
      system: 'You are a senior portfolio strategist. Return ONLY valid JSON, no markdown, no backticks.',
      useWebSearch: false,
      maxTokens: 700,
    }),
  });

  if (!res.ok) throw new Error(`AI proxy ${res.status}`);
  const j = await res.json();
  if (!j.success) throw new Error(j.error || 'AI failed');

  const text = (j.content || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(text);

  const validRatings  = ['Strong Buy', 'Buy', 'Hold', 'Reduce', 'Sell'] as const;
  const validRisks    = ['Low', 'Medium', 'High', 'Speculative'] as const;
  const validHorizons = ['Short-term', 'Medium-term', 'Long-term'] as const;
  if (!validRatings.includes(parsed.finotaurRating))  parsed.finotaurRating = 'Hold';
  if (!validRisks.includes(parsed.riskLevel))         parsed.riskLevel = 'Medium';
  if (!validHorizons.includes(parsed.timeHorizon))    parsed.timeHorizon = 'Medium-term';
  if (!Array.isArray(parsed.investorTypes) || !parsed.investorTypes.length)
    parsed.investorTypes = ['Growth'];

  return parsed as InvestorProfile;
}

// ─── Visual sub-components ───────────────────────────

// Rating scale — 5 filled segments
const RatingScale = memo(({ rating }: { rating: InvestorProfile['finotaurRating'] }) => {
  const cfg = RATING_CFG[rating] ?? RATING_CFG['Hold'];
  const steps = ['Sell', 'Reduce', 'Hold', 'Buy', 'Strong Buy'] as const;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-widest text-[#888] font-semibold">Rating</span>
        <span className="text-xs font-bold" style={{ color: cfg.color }}>{rating}</span>
      </div>
      <div className="flex gap-1">
        {steps.map((step) => {
          const sCfg = RATING_CFG[step];
          const isActive = sCfg.pos <= cfg.pos;
          return (
            <div key={step} className="flex-1 h-1.5 rounded-full"
              style={{ background: isActive ? cfg.color : 'rgba(255,255,255,0.06)' }} />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[#555]">Sell</span>
        <span className="text-[9px] text-[#555]">Strong Buy</span>
      </div>
    </div>
  );
});
RatingScale.displayName = 'RatingScale';

// Risk scale — 4 segments, each a different color
const RiskScale = memo(({ level }: { level: InvestorProfile['riskLevel'] }) => {
  const cfg = RISK_CFG[level] ?? RISK_CFG['Medium'];
  const steps = ['Low', 'Medium', 'High', 'Speculative'] as const;
  const riskColors = ['#22C55E', '#F59E0B', '#F97316', '#EF4444'];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-widest text-[#888] font-semibold">Risk</span>
        <span className="text-xs font-bold" style={{ color: cfg.color }}>{level}</span>
      </div>
      <div className="flex gap-1">
        {steps.map((step, i) => {
          const sCfg = RISK_CFG[step];
          const isActive = sCfg.pos <= cfg.pos;
          return (
            <div key={step} className="flex-1 h-1.5 rounded-full"
              style={{ background: isActive ? riskColors[i] : 'rgba(255,255,255,0.06)' }} />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[#666]">Low</span>
        <span className="text-[9px] text-[#666]">Speculative</span>
      </div>
    </div>
  );
});
RiskScale.displayName = 'RiskScale';

// Investor type spectrum — full row, active types light up
const InvestorTypeSpectrum = memo(({ active }: { active: string[] }) => {
  const activeSet = new Set(active);
  return (
    <div>
      <span className="text-[10px] uppercase tracking-widest text-[#888] font-semibold block mb-2">
        Investor Profile
      </span>
      <div className="flex gap-1.5 flex-wrap">
        {ALL_TYPES.map((t) => {
          const isActive = activeSet.has(t);
          const color = TYPE_COLORS[t];
          return (
            <div key={t}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium"
              style={isActive ? {
                background: `${color}18`,
                color,
                border: `1px solid ${color}35`,
              } : {
                background: 'rgba(255,255,255,0.02)',
                color: "#505050",
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
              {t}
            </div>
          );
        })}
      </div>
    </div>
  );
});
InvestorTypeSpectrum.displayName = 'InvestorTypeSpectrum';

// Time horizon — dot on a track
const HorizonTrack = memo(({ horizon, months }: {
  horizon: InvestorProfile['timeHorizon']; months: number;
}) => {
  const cfg = HORIZON_CFG[horizon] ?? HORIZON_CFG['Medium-term'];
  const clampedMonths = Math.min(Math.max(months || 12, 1), 60);
  const pct = (clampedMonths / 60) * 100;
  const ticks = [
    { label: '3 mo', pct: 5 },
    { label: '6 mo', pct: 10 },
    { label: '1 yr', pct: 20 },
    { label: '2 yr', pct: 40 },
    { label: '5 yr+', pct: 100 },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-widest text-[#888] font-semibold">Time Horizon</span>
        <span className="text-xs font-bold" style={{ color: cfg.color }}>
          {months ? `${months}+ mo` : cfg.label}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-visible" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #60A5FA 0%, #C9A646 50%, #4ADE80 100%)',
            opacity: 0.6,
          }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#0d0b08] -translate-x-1/2"
          style={{
            left: `${Math.min(pct, 97)}%`,
            background: cfg.color,
            boxShadow: `0 0 6px ${cfg.color}80`,
          }} />
      </div>
      <div className="relative mt-2 h-3">
        {ticks.map(tick => (
          <span key={tick.label} className="absolute text-[9px] -translate-x-1/2"
            style={{ left: `${tick.pct}%`, color: '#777' }}>
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
});
HorizonTrack.displayName = 'HorizonTrack';

// ─── Main Component ──────────────────────────────────

export const WhoShouldOwnThis = memo(({ data }: { data: StockData }) => {
  const [profile, setProfile]   = useState<InvestorProfile | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const abortRef  = useRef<AbortController | null>(null);
  const tickerRef = useRef(data.ticker);

  const load = useCallback(async (force = false) => {
    const ticker = data.ticker;
    if (!ticker) return;
    if (!force) {
      const m = localCache.get(ticker);
      if (m && Date.now() - m.fetchedAt < LOCAL_TTL) { setProfile(m.data); return; }
    }
    if (!force) {
      const cached = await checkServerCache(ticker);
      if (cached) {
        localCache.set(ticker, { data: cached, fetchedAt: Date.now() });
        if (tickerRef.current === ticker) setProfile(cached);
        return;
      }
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const result = await generateProfile(data, ctrl.signal);
      localCache.set(ticker, { data: result, fetchedAt: Date.now() });
      saveServerCache(ticker, result, (data as any).nextEarningsDate);
      if (tickerRef.current === ticker) setProfile(result);
    } catch (e: any) {
      if (e.name !== 'AbortError' && tickerRef.current === ticker)
        setError(e.message || 'Generation failed');
    } finally {
      if (tickerRef.current === ticker) setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    tickerRef.current = data.ticker;
    setProfile(null);
    setError(null);
    load(false);
    return () => abortRef.current?.abort();
  }, [data.ticker]);

  if (isLoading && !profile) return (
    <Card>
      <div className="p-5 flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-[#C9A646] animate-spin shrink-0" />
        <div>
          <p className="text-sm font-semibold text-white">Who Should Own This Stock</p>
          <p className="text-xs text-[#888]">Analyzing investor profile...</p>
        </div>
      </div>
    </Card>
  );

  if (error && !profile) return (
    <Card>
      <div className="p-5 flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
        <p className="text-sm text-[#999] flex-1">{error}</p>
        <button onClick={() => load(true)}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(201,166,70,0.08)', border: '1px solid rgba(201,166,70,0.15)', color: '#C9A646' }}>
          Retry
        </button>
      </div>
    </Card>
  );

  if (!profile) return null;

  return (
    <Card>
      <div className="p-5 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A646]" />
            <span className="text-[10px] font-bold text-[#C9A646] uppercase tracking-widest">Investor Profile</span>
          </div>
          <button onClick={() => load(true)} disabled={isLoading}
            className="p-1.5 rounded-lg transition-all hover:scale-105"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            title="Regenerate">
            <RefreshCw className="w-3 h-3 text-[#666]" />
          </button>
        </div>

        {/* Summary */}
        {profile.profileSummary && (
          <p className="text-sm text-[#C0C0C0] leading-relaxed border-l-2 border-[#C9A646]/50 pl-3">
            {profile.profileSummary}
          </p>
        )}

        {/* Rating + Risk */}
        <div className="grid grid-cols-2 gap-x-6">
          <RatingScale rating={profile.finotaurRating} />
          <RiskScale   level={profile.riskLevel} />
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)' }} />

        {/* Investor type spectrum */}
        <InvestorTypeSpectrum active={profile.investorTypes} />

        {/* Time horizon */}
        <HorizonTrack horizon={profile.timeHorizon} months={profile.timeHorizonMonths} />

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)' }} />

        {/* Fits / Avoid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#22C55E]/80 font-semibold mb-2">Fits</p>
            <div className="space-y-1.5">
              {profile.idealFor.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#22C55E]/60 mt-1.5 shrink-0" />
                  <p className="text-[12px] text-[#B0B0B0] leading-snug">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#EF4444]/80 font-semibold mb-2">Avoid If</p>
            <div className="space-y-1.5">
              {profile.notFor.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#EF4444]/60 mt-1.5 shrink-0" />
                  <p className="text-[12px] text-[#B0B0B0] leading-snug">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Exit trigger */}
        {profile.exitTrigger && (
          <div className="flex items-start gap-2.5 pt-0.5">
            <span className="text-[10px] uppercase tracking-widest text-[#F97316]/80 font-semibold shrink-0 mt-0.5">Exit</span>
            <p className="text-[12px] text-[#B0B0B0] leading-snug">{profile.exitTrigger}</p>
          </div>
        )}

      </div>
    </Card>
  );
});

WhoShouldOwnThis.displayName = 'WhoShouldOwnThis';