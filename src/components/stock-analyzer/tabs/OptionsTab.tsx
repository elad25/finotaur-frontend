// src/components/stock-analyzer/tabs/OptionsTab.tsx
// =====================================================
// 🎯 OPTIONS TAB — Institutional-Grade Options Intelligence
// =====================================================
// Features:
//   ✅ Finotaur AI Advice — Top-of-tab insight card
//   ✅ Max Pain Chart — Area chart with HOVER TOOLTIP showing values
//   ✅ Open Interest Bar Chart — Calls vs Puts by strike
//   ✅ Unusual Options Activity — Block trades, sweeps, OI spikes
//   ✅ Call/Put Flow — Premium flow over time (5/10/30 days)
//   ✅ Expiration selector: 2 weekly + 4 monthly (up to ~2 months)
//   ✅ Caching per ticker + expiration
//   ✅ Premium Finotaur styling
// =====================================================

import { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Target, TrendingUp, TrendingDown, AlertTriangle,
  Loader2, RefreshCw, ChevronDown, ChevronUp,
  Sparkles, Activity, BarChart3, Eye,
  ArrowUpRight, ArrowDownRight, Zap, Shield,
  Calendar, DollarSign, Flame, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types/stock-analyzer.types';
import { C, cardStyle } from '@/constants/stock-analyzer.constants';
import { Card, SectionHeader } from '../ui';
import { fmtBig, isValid } from '@/utils/stock-analyzer.utils';
import { stockCache, getNextEarningsDate } from '@/services/stock-analyzer.cache';
import { AlgoFlowChart } from '../AlgoFlowChart';
import { GammaExposureChart } from '../GammaExposureChart';

// =====================================================
// TYPES
// =====================================================

interface OptionContract {
  contract: string;
  type: 'call' | 'put';
  strike: number;
  expiration: string;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  underlyingPrice: number;
}

interface UnusualActivity {
  underlying: string;
  contract: string;
  type: 'call' | 'put';
  strike: number;
  expiration: string;
  volume: number;
  openInterest: number;
  volOiRatio: number;
  lastPrice: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  underlyingPrice: number;
  tradeDate: string | null;
}

interface StrikeOI {
  strike: number;
  callOI: number;
  putOI: number;
  callVolume: number;
  putVolume: number;
  callPremium: number;
  putPremium: number;
}

interface MaxPainPoint {
  strike: number;
  totalPain: number;
  callPain: number;
  putPain: number;
}

interface OptionsCache {
  chain: OptionContract[];
  expirations: string[];
  unusual: UnusualActivity[];
  fetchedAt: number;
  expiration: string;
}
interface AIAdvice {
  headline: string;
  detail: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: 'high' | 'medium' | 'low';
}

// =====================================================
// CACHE
// =====================================================

const optionsCacheMap = new Map<string, OptionsCache>();
const aiAdviceCacheMap = new Map<string, { advice: AIAdvice; generatedAt: string }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 min

// =====================================================
// DATA FETCHING
// =====================================================

async function fetchExpirations(ticker: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/options/expirations/${ticker}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.expirations || [];
  } catch { return []; }
}

async function fetchOptionsChain(ticker: string, expiration: string): Promise<OptionContract[]> {
  try {
    const url = expiration
      ? `/api/options/chain/${ticker}?expiration=${expiration}`
      : `/api/options/chain/${ticker}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.chain || [];
  } catch { return []; }
}

async function fetchUnusualActivity(ticker: string): Promise<UnusualActivity[]> {
  try {
    const res = await fetch(`/api/options/unusual?symbols=${ticker}&min_volume=500&min_vol_oi=0.3`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || data.uoa || []).sort((a: UnusualActivity, b: UnusualActivity) => b.volOiRatio - a.volOiRatio);
  } catch { return []; }
}

async function fetchAIAdvice(ticker: string, data: StockData, chain: OptionContract[], unusual: UnusualActivity[]): Promise<AIAdvice> {
  const cached = aiAdviceCacheMap.get(ticker);
  if (cached && Date.now() - new Date(cached.generatedAt).getTime() < 30 * 60 * 1000) {
    return cached.advice;
  }

  // Build context for AI
  const totalCallOI = chain.filter(c => c.type === 'call').reduce((s, c) => s + (c.openInterest || 0), 0);
  const totalPutOI = chain.filter(c => c.type === 'put').reduce((s, c) => s + (c.openInterest || 0), 0);
  const pcRatio = totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : 'N/A';
  const topUnusual = unusual.slice(0, 5);
  const avgIV = chain.length > 0
    ? (chain.reduce((s, c) => s + (c.impliedVolatility || 0), 0) / chain.length * 100).toFixed(1)
    : 'N/A';

  const prompt = `You are Finotaur's institutional options analyst. Analyze the options flow for ${data.name} (${data.ticker}).

Current Price: $${data.price.toFixed(2)} | P/C OI Ratio: ${pcRatio} | Avg IV: ${avgIV}%
Total Call OI: ${totalCallOI.toLocaleString()} | Total Put OI: ${totalPutOI.toLocaleString()}

${topUnusual.length > 0 ? `Top Unusual Activity:
${topUnusual.map(u => `- ${u.type.toUpperCase()} $${u.strike} exp ${u.expiration} | Vol: ${u.volume} vs OI: ${u.openInterest} (${u.volOiRatio}x) | IV: ${((u.impliedVolatility || 0) * 100).toFixed(0)}% | Delta: ${u.delta?.toFixed(2) || 'N/A'}`).join('\n')}` : 'No significant unusual activity detected.'}

SEARCH THE WEB for ${data.ticker} options unusual activity, dark pool, institutional flow, options sweep.

Return ONLY a valid JSON with NO markdown:
{
  "headline": "One punchy sentence about the most notable options signal (e.g., 'Massive $200C sweep suggests institutional accumulation ahead of earnings')",
  "detail": "2-3 sentences explaining WHY this matters. Reference specific strikes, volumes, ratios. Be brutally specific — no generic filler.",
  "sentiment": "bullish" | "bearish" | "neutral",
  "confidence": "high" | "medium" | "low"
}`;

  try {
    const res = await fetch('/api/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: 'gpt-4o',
        temperature: 0.4,
        maxTokens: 500,
        useWebSearch: true,
      }),
    });

    if (!res.ok) throw new Error('AI proxy error');
    const result = await res.json();
    const text = result.content || result.text || '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const advice = JSON.parse(cleaned) as AIAdvice;
    aiAdviceCacheMap.set(ticker, { advice, generatedAt: new Date().toISOString() });
    return advice;
  } catch {
    // Fallback: generate locally from data
    const fallback: AIAdvice = generateLocalAdvice(data, chain, unusual, pcRatio, avgIV);
    aiAdviceCacheMap.set(ticker, { advice: fallback, generatedAt: new Date().toISOString() });
    return fallback;
  }
}

function generateLocalAdvice(
  data: StockData,
  chain: OptionContract[],
  unusual: UnusualActivity[],
  pcRatio: string,
  avgIV: string
): AIAdvice {
  const pcr = parseFloat(pcRatio) || 1;
  const top = unusual[0];

  if (top && top.volOiRatio > 3) {
    return {
      headline: `Unusual ${top.type.toUpperCase()} activity at $${top.strike} strike — volume is ${top.volOiRatio}x open interest`,
      detail: `${top.volume.toLocaleString()} contracts traded vs ${top.openInterest.toLocaleString()} OI on the ${top.expiration} $${top.strike} ${top.type}. This ${top.volOiRatio}x Vol/OI ratio signals aggressive new positioning. IV at ${((top.impliedVolatility || 0) * 100).toFixed(0)}% suggests the market is pricing significant movement.`,
      sentiment: top.type === 'call' ? 'bullish' : 'bearish',
      confidence: top.volOiRatio > 5 ? 'high' : 'medium',
    };
  }

  if (pcr > 1.5) {
    return {
      headline: `Elevated Put/Call ratio of ${pcRatio} — hedging activity above normal`,
      detail: `The options market is skewed bearish with put open interest significantly exceeding calls. Average IV at ${avgIV}% reflects heightened uncertainty. This could signal institutional hedging or directional bearish bets.`,
      sentiment: 'bearish',
      confidence: 'medium',
    };
  }

  if (pcr < 0.5) {
    return {
      headline: `Very low Put/Call ratio of ${pcRatio} — bullish conviction in the options market`,
      detail: `Call open interest overwhelmingly exceeds puts, suggesting strong bullish positioning. Average IV at ${avgIV}% is ${parseFloat(avgIV) > 40 ? 'elevated — expect larger moves' : 'moderate — controlled risk environment'}.`,
      sentiment: 'bullish',
      confidence: 'medium',
    };
  }

  return {
    headline: `Options market balanced at ${pcRatio} P/C ratio with ${avgIV}% average IV`,
    detail: `No extreme signals detected. The options chain shows relatively balanced positioning between calls and puts. Watch for any unusual volume spikes or IV expansion as potential catalysts.`,
    sentiment: 'neutral',
    confidence: 'low',
  };
}

// =====================================================
// COMPUTATIONS
// =====================================================

function computeStrikeOI(chain: OptionContract[]): StrikeOI[] {
  const map = new Map<number, StrikeOI>();

  for (const opt of chain) {
    const s = opt.strike;
    if (!s) continue;
    const existing = map.get(s) || {
      strike: s, callOI: 0, putOI: 0, callVolume: 0, putVolume: 0, callPremium: 0, putPremium: 0
    };

    if (opt.type === 'call') {
      existing.callOI += opt.openInterest || 0;
      existing.callVolume += opt.volume || 0;
      existing.callPremium += (opt.lastPrice || 0) * (opt.volume || 0) * 100;
    } else {
      existing.putOI += opt.openInterest || 0;
      existing.putVolume += opt.volume || 0;
      existing.putPremium += (opt.lastPrice || 0) * (opt.volume || 0) * 100;
    }

    map.set(s, existing);
  }

  return Array.from(map.values()).sort((a, b) => a.strike - b.strike);
}

function computeMaxPain(strikeData: StrikeOI[], currentPrice: number): MaxPainPoint[] {
  const strikes = strikeData.map(s => s.strike);
  if (strikes.length === 0) return [];

  return strikes.map(testStrike => {
    let callPain = 0;
    let putPain = 0;

    for (const sd of strikeData) {
      if (testStrike > sd.strike) {
        callPain += (testStrike - sd.strike) * sd.callOI * 100;
      }
      if (testStrike < sd.strike) {
        putPain += (sd.strike - testStrike) * sd.putOI * 100;
      }
    }

    return {
      strike: testStrike,
      totalPain: callPain + putPain,
      callPain,
      putPain,
    };
  });
}

function findMaxPainStrike(painData: MaxPainPoint[]): number | null {
  if (painData.length === 0) return null;
  let minPain = Infinity;
  let mpStrike = painData[0].strike;
  for (const p of painData) {
    if (p.totalPain < minPain) {
      minPain = p.totalPain;
      mpStrike = p.strike;
    }
  }
  return mpStrike;
}

// =====================================================
// HELPER: Format numbers
// =====================================================

function fmtK(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtDollars(n: number): string {
  if (n >= 1_000_000_000) return '$' + (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

function formatExpDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const month = d.toLocaleString('en', { month: 'short' });
  const day = d.getDate();
  const year = d.getFullYear();
  const label = `${month} ${day}, ${year}`;
  if (diff <= 0) return `${label} (Expired)`;
  if (diff <= 7) return `${label} (${diff}d)`;
  return `${label} (${diff}d)`;
}

// =====================================================
// HELPER: Filter expirations — 4 weekly + 6 monthly + quarterly
// =====================================================

function filterSmartExpirations(expirations: string[]): { exp: string; label: string; type: 'weekly' | 'monthly' | 'quarterly' }[] {
  if (expirations.length === 0) return [];

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Filter to only future expirations
  const future = expirations.filter(exp => {
    const d = new Date(exp + 'T00:00:00');
    return d >= now;
  });

  if (future.length === 0) return expirations.slice(0, 6).map(e => ({
    exp: e,
    label: formatExpDate(e),
    type: 'weekly' as const,
  }));

  // Helper: is this the 3rd Friday of its month?
  const isThirdFriday = (dateStr: string): boolean => {
    const d = new Date(dateStr + 'T00:00:00');
    const dow = d.getDay(); // 5 = Friday
    const dom = d.getDate();
    return dow === 5 && dom >= 15 && dom <= 21;
  };

  // Classify all future expirations
  const weeklies: string[] = [];
  const monthlies: string[] = [];

  for (const exp of future) {
    if (isThirdFriday(exp)) {
      monthlies.push(exp);
    } else {
      weeklies.push(exp);
    }
  }

  const results: { exp: string; label: string; type: 'weekly' | 'monthly' | 'quarterly' }[] = [];

  // Take 4 nearest weeklies
  for (const exp of weeklies.slice(0, 4)) {
    results.push({ exp, label: formatExpDate(exp), type: 'weekly' });
  }

  // Take 6 nearest monthlies
  for (const exp of monthlies.slice(0, 6)) {
    results.push({ exp, label: formatExpDate(exp), type: 'monthly' });
  }

  // Add quarterly expirations (3rd Friday of Mar, Jun, Sep, Dec) beyond the monthlies
  const quarterlyMonths = new Set([2, 5, 8, 11]); // 0-indexed: Mar=2, Jun=5, Sep=8, Dec=11
  const existingExps = new Set(results.map(r => r.exp));
  for (const exp of future) {
    if (existingExps.has(exp)) continue;
    const d = new Date(exp + 'T00:00:00');
    if (quarterlyMonths.has(d.getMonth()) && isThirdFriday(exp)) {
      results.push({ exp, label: formatExpDate(exp), type: 'quarterly' });
      if (results.filter(r => r.type === 'quarterly').length >= 2) break;
    }
  }

  // If not enough options, fill with more future expirations to have at least 6 total
  if (results.length < 6) {
    for (const exp of future) {
      if (!results.find(r => r.exp === exp)) {
        results.push({
          exp,
          label: formatExpDate(exp),
          type: isThirdFriday(exp) ? 'monthly' : 'weekly',
        });
        if (results.length >= 10) break;
      }
    }
  }

  // Sort by date
  results.sort((a, b) => a.exp.localeCompare(b.exp));

  return results;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

// ── Finotaur AI Advice Card ──
const AdviceCard = memo(({ advice, isLoading, ticker }: {
  advice: AIAdvice | null;
  isLoading: boolean;
  ticker: string;
}) => {
  if (isLoading) {
    return (
      <div className="rounded-2xl p-5 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(201,166,70,0.02) 100%)',
        border: '1px solid rgba(201,166,70,0.2)',
      }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)',
          }}>
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#C9A646]">FINOTAUR OPTIONS INSIGHT</p>
            <p className="text-[10px] text-[#6B6B6B]">AI-powered analysis</p>
          </div>
          <Loader2 className="w-4 h-4 text-[#C9A646] animate-spin ml-auto" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-4/5 rounded animate-pulse" style={{ background: 'rgba(201,166,70,0.1)' }} />
          <div className="h-4 w-full rounded animate-pulse" style={{ background: 'rgba(201,166,70,0.06)' }} />
          <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: 'rgba(201,166,70,0.04)' }} />
        </div>
      </div>
    );
  }

  if (!advice) return null;

  const sentimentConfig = {
    bullish: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', icon: TrendingUp, label: 'BULLISH' },
    bearish: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: TrendingDown, label: 'BEARISH' },
    neutral: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: Activity, label: 'NEUTRAL' },
  };

  const cfg = sentimentConfig[advice.sentiment];
  const SentIcon = cfg.icon;
  const confColors = { high: '#22C55E', medium: '#F59E0B', low: '#8B8B8B' };

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(201,166,70,0.02) 100%)',
      border: '1px solid rgba(201,166,70,0.2)',
    }}>
      {/* Gold shimmer line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
        background: 'linear-gradient(90deg, transparent, #C9A646, #F4D97B, #C9A646, transparent)',
      }} />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)',
            boxShadow: '0 2px 12px rgba(201,166,70,0.3)',
          }}>
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#C9A646] tracking-wider">FINOTAUR OPTIONS INSIGHT</p>
            <p className="text-[10px] text-[#6B6B6B]">AI-powered • {ticker}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider flex items-center gap-1"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
            <SentIcon className="w-3 h-3" />
            {cfg.label}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', color: confColors[advice.confidence] }}>
            {advice.confidence.toUpperCase()}
          </span>
        </div>
      </div>

      <p className="text-white font-semibold text-sm leading-relaxed mb-2">
        {advice.headline}
      </p>
      <p className="text-[#8B8B8B] text-xs leading-relaxed">
        {advice.detail}
      </p>
    </div>
  );
});
AdviceCard.displayName = 'AdviceCard';

// ── Expiration Selector (2 weekly + 4 monthly) ──
const ExpirationSelector = memo(({ expirations, selected, onSelect, isLoading }: {
  expirations: string[];
  selected: string;
  onSelect: (exp: string) => void;
  isLoading: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const smartExps = useMemo(() => filterSmartExpirations(expirations), [expirations]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
        style={{
          background: 'rgba(201,166,70,0.1)',
          border: '1px solid rgba(201,166,70,0.2)',
          color: '#C9A646',
        }}
      >
        <Calendar className="w-3.5 h-3.5" />
        {selected ? formatExpDate(selected) : 'Select Expiration'}
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 right-0 z-50 min-w-[250px] rounded-xl overflow-hidden shadow-2xl"
            style={{
              background: '#1A1A1A',
              border: '1px solid rgba(201,166,70,0.15)',
            }}>
            <div className="p-2 max-h-[350px] overflow-y-auto scrollbar-none">
              {/* Weekly section */}
              {smartExps.some(e => e.type === 'weekly') && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[9px] text-[#6B6B6B] uppercase tracking-widest font-bold">
                    Weekly
                  </p>
                  {smartExps.filter(e => e.type === 'weekly').map((item) => {
                    const isSelected = item.exp === selected;
                    return (
                      <button
                        key={item.exp}
                        onClick={() => { onSelect(item.exp); setOpen(false); }}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-xs transition-all',
                          isSelected ? 'text-black font-bold' : 'text-[#8B8B8B] hover:text-white hover:bg-white/5'
                        )}
                        style={isSelected ? {
                          background: 'linear-gradient(135deg, #C9A646, #F4D97B)',
                        } : {}}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </>
              )}

              {/* Monthly section */}
              {smartExps.some(e => e.type === 'monthly') && (
                <>
                  <p className="px-3 pt-3 pb-1 text-[9px] text-[#6B6B6B] uppercase tracking-widest font-bold"
                    style={{ borderTop: smartExps.some(e => e.type === 'weekly') ? '1px solid rgba(255,255,255,0.06)' : 'none', marginTop: '4px' }}>
                    Monthly
                  </p>
                                    {smartExps.filter(e => e.type === 'monthly').map((item) => {
                    const isSelected = item.exp === selected;
                    return (
                      <button
                        key={item.exp}
                        onClick={() => { onSelect(item.exp); setOpen(false); }}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-xs transition-all',
                          isSelected ? 'text-black font-bold' : 'text-[#8B8B8B] hover:text-white hover:bg-white/5'
                        )}
                        style={isSelected ? {
                          background: 'linear-gradient(135deg, #C9A646, #F4D97B)',
                        } : {}}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </>
              )}

              {/* Quarterly section */}
              {smartExps.some(e => e.type === 'quarterly') && (
                <>
                  <p className="px-3 pt-3 pb-1 text-[9px] text-[#6B6B6B] uppercase tracking-widest font-bold"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '4px' }}>
                    Quarterly
                  </p>
                  {smartExps.filter(e => e.type === 'quarterly').map((item) => {
                    const isSelected = item.exp === selected;
                    return (
                      <button
                        key={item.exp}
                        onClick={() => { onSelect(item.exp); setOpen(false); }}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-xs transition-all',
                          isSelected ? 'text-black font-bold' : 'text-[#8B8B8B] hover:text-white hover:bg-white/5'
                        )}
                        style={isSelected ? {
                          background: 'linear-gradient(135deg, #C9A646, #F4D97B)',
                        } : {}}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});
ExpirationSelector.displayName = 'ExpirationSelector';

// ── Max Pain Chart (SVG) — WITH INTERACTIVE HOVER TOOLTIP + EXPECTED RANGE ──
const MaxPainChart = memo(({ painData, currentPrice, maxPainStrike, strikeData }: {
  painData: MaxPainPoint[];
  currentPrice: number;
  maxPainStrike: number | null;
  strikeData?: StrikeOI[];
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    point: MaxPainPoint;
  } | null>(null);

  if (painData.length < 3) {
    return (
      <div className="h-[280px] flex items-center justify-center text-[#4B4B4B] text-sm">
        Insufficient data for Max Pain calculation
      </div>
    );
  }

  const W = 700, H = 280, PX = 50, PY = 30, PB = 40;
  const chartW = W - PX * 2;
  const chartH = H - PY - PB;

  const maxPain = Math.max(...painData.map(p => p.totalPain));
  const minStrike = painData[0].strike;
  const maxStrike = painData[painData.length - 1].strike;
  const strikeRange = maxStrike - minStrike || 1;

  const x = (strike: number) => PX + ((strike - minStrike) / strikeRange) * chartW;
  const y = (pain: number) => PY + chartH - (pain / maxPain) * chartH;

  // ── Compute expected settlement range from OI concentration ──
  let expectedLow: number | null = null;
  let expectedHigh: number | null = null;

  if (strikeData && strikeData.length > 0) {
    // Weight each strike by total OI (call + put)
    const totalOI = strikeData.reduce((s, sd) => s + sd.callOI + sd.putOI, 0);
    if (totalOI > 0) {
      // Find weighted mean
      let weightedSum = 0;
      for (const sd of strikeData) {
        weightedSum += sd.strike * (sd.callOI + sd.putOI);
      }
      const mean = weightedSum / totalOI;

      // Find weighted std dev
      let varianceSum = 0;
      for (const sd of strikeData) {
        varianceSum += (sd.strike - mean) ** 2 * (sd.callOI + sd.putOI);
      }
      const stdDev = Math.sqrt(varianceSum / totalOI);

      // Expected range = mean ± 1 std dev (covers ~68% of OI)
      expectedLow = mean - stdDev;
      expectedHigh = mean + stdDev;

      // Clamp to chart bounds
      expectedLow = Math.max(minStrike, expectedLow);
      expectedHigh = Math.min(maxStrike, expectedHigh);
    }
  }

  // Build path for total pain area
  const areaPath = painData.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${x(p.strike).toFixed(1)} ${y(p.totalPain).toFixed(1)}`
  ).join(' ');
  const areaFill = `${areaPath} L ${x(painData[painData.length - 1].strike).toFixed(1)} ${(PY + chartH).toFixed(1)} L ${x(painData[0].strike).toFixed(1)} ${(PY + chartH).toFixed(1)} Z`;

  // Call pain line
  const callPath = painData.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${x(p.strike).toFixed(1)} ${y(p.callPain).toFixed(1)}`
  ).join(' ');

  // Put pain line
  const putPath = painData.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${x(p.strike).toFixed(1)} ${y(p.putPain).toFixed(1)}`
  ).join(' ');

  // X-axis labels (show ~8 labels)
  const step = Math.max(1, Math.floor(painData.length / 8));
  const xLabels = painData.filter((_, i) => i % step === 0);

  // Y-axis labels
  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => (maxPain / yTicks) * i);

  const currentPriceX = x(currentPrice);
  const maxPainX = maxPainStrike ? x(maxPainStrike) : null;

  // ── Mouse handler: find nearest data point ──
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    // Convert mouseX back to strike
    const mouseStrike = minStrike + ((mouseX - PX) / chartW) * strikeRange;

    // Find nearest data point
    let nearest = painData[0];
    let nearestDist = Infinity;
    for (const p of painData) {
      const dist = Math.abs(p.strike - mouseStrike);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = p;
      }
    }

    setHover({
      x: x(nearest.strike),
      y: y(nearest.totalPain),
      point: nearest,
    });
  };

  const handleMouseLeave = () => setHover(null);

  // Tooltip positioning: keep inside SVG bounds
  const tooltipW = 130;
  const tooltipH = 44;
  const tooltipX = hover ? (hover.x + tooltipW + 10 > W ? hover.x - tooltipW - 10 : hover.x + 10) : 0;
  const tooltipY = hover ? Math.max(PY, Math.min(hover.y - tooltipH / 2, PY + chartH - tooltipH)) : 0;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto cursor-crosshair"
      preserveAspectRatio="xMidYMid meet"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <defs>
        <linearGradient id="painGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9A646" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#C9A646" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="maxPainLine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#22C55E" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="rangeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9A646" stopOpacity="0.08" />
          <stop offset="50%" stopColor="#C9A646" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#C9A646" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map((val, i) => (
        <g key={i}>
          <line x1={PX} y1={y(val)} x2={W - PX} y2={y(val)}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <text x={PX - 6} y={y(val) + 3} fill="#4B4B4B" fontSize="9" textAnchor="end">
            {fmtDollars(val)}
          </text>
        </g>
      ))}

      {/* ═══ EXPECTED SETTLEMENT RANGE — clean shaded band only ═══ */}
      {expectedLow !== null && expectedHigh !== null && (
        <rect
          x={x(expectedLow)} y={PY}
          width={x(expectedHigh) - x(expectedLow)} height={chartH}
          fill="url(#rangeGrad)"
          rx="2"
        />
      )}

      {/* Area fill — total pain */}
      <path d={areaFill} fill="url(#painGrad)" />

      {/* Lines */}
      <path d={callPath} fill="none" stroke="#3B82F6" strokeWidth="1.5" opacity="0.6" />
      <path d={putPath} fill="none" stroke="#EF4444" strokeWidth="1.5" opacity="0.6" />
      <path d={areaPath} fill="none" stroke="#C9A646" strokeWidth="2" />

      {/* Max Pain vertical line — label sits above, line starts below label */}
      {maxPainX !== null && (
        <g>
          <line x1={maxPainX} y1={PY + 18} x2={maxPainX} y2={PY + chartH}
            stroke="#22C55E" strokeWidth="1" strokeDasharray="4,6" opacity="0.45" />
          <rect x={maxPainX - 30} y={PY} width="60" height="15" rx="4"
            fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.25)" strokeWidth="0.5" />
          <text x={maxPainX} y={PY + 10.5} fill="#22C55E" fontSize="8" fontWeight="700" textAnchor="middle" opacity="0.8">
            MP ${maxPainStrike}
          </text>
        </g>
      )}

      {/* Current Price — thin solid white line, small label on the line */}
      {currentPriceX >= PX && currentPriceX <= W - PX && (
        <g>
          <line x1={currentPriceX} y1={PY} x2={currentPriceX} y2={PY + chartH}
            stroke="rgba(255,255,255,0.18)" strokeWidth="0.75" />
          <rect x={currentPriceX - 20} y={PY + chartH - 16} width="40" height="13" rx="3"
            fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
          <text x={currentPriceX} y={PY + chartH - 7} fill="rgba(255,255,255,0.55)" fontSize="7.5" fontWeight="600" textAnchor="middle">
            ${currentPrice.toFixed(0)}
          </text>
        </g>
      )}

      {/* X labels */}
      {xLabels.map((p) => (
        <text key={p.strike} x={x(p.strike)} y={H - 6} fill="#4B4B4B" fontSize="9" textAnchor="middle">
          ${p.strike}
        </text>
      ))}

      {/* Expected Range labels on X axis — small, at edges */}
      {expectedLow !== null && expectedHigh !== null && (
        <g opacity="0.5">
          <text x={x(expectedLow)} y={H - 6} fill="#C9A646" fontSize="7" fontWeight="600" textAnchor="middle">
            ▸${expectedLow.toFixed(0)}
          </text>
          <text x={x(expectedHigh)} y={H - 6} fill="#C9A646" fontSize="7" fontWeight="600" textAnchor="middle">
            ${expectedHigh.toFixed(0)}◂
          </text>
        </g>
      )}

      {/* Legend */}
      <g transform={`translate(${W - PX - 160}, ${PY + 4})`}>
        <rect width="150" height="66" rx="6" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.06)" />
        <line x1="8" y1="14" x2="22" y2="14" stroke="#C9A646" strokeWidth="2" />
        <text x="28" y="17" fill="#8B8B8B" fontSize="8">Total Pain (Writers' Loss)</text>
        <line x1="8" y1="28" x2="22" y2="28" stroke="#3B82F6" strokeWidth="1.5" />
        <text x="28" y="31" fill="#8B8B8B" fontSize="8">Call Pain</text>
        <line x1="8" y1="42" x2="22" y2="42" stroke="#EF4444" strokeWidth="1.5" />
        <text x="28" y="45" fill="#8B8B8B" fontSize="8">Put Pain</text>
        <rect x="8" y="52" width="14" height="8" rx="2" fill="rgba(201,166,70,0.12)" stroke="rgba(201,166,70,0.25)" strokeWidth="0.5" />
        <text x="28" y="59" fill="#8B8B8B" fontSize="8">Expected Range</text>
      </g>

      {/* ═══ HOVER CROSSHAIR + TOOLTIP ═══ */}
      {hover && (
        <g>
          {/* Vertical crosshair line */}
          <line
            x1={hover.x} y1={PY} x2={hover.x} y2={PY + chartH}
            stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,3"
          />
          {/* Dot on total pain line */}
          <circle cx={hover.x} cy={hover.y} r="4" fill="#C9A646" stroke="#000" strokeWidth="1.5" />
          {/* Dot on call pain line */}
          <circle cx={hover.x} cy={y(hover.point.callPain)} r="3" fill="#3B82F6" stroke="#000" strokeWidth="1" />
          {/* Dot on put pain line */}
          <circle cx={hover.x} cy={y(hover.point.putPain)} r="3" fill="#EF4444" stroke="#000" strokeWidth="1" />

          {/* Tooltip — compact */}
          <rect
            x={tooltipX} y={tooltipY}
            width={tooltipW} height={tooltipH}
            rx="6" fill="rgba(15,15,15,0.95)"
            stroke="rgba(201,166,70,0.25)" strokeWidth="0.75"
          />
          <text x={tooltipX + tooltipW / 2} y={tooltipY + 13} fill="#C9A646" fontSize="9" fontWeight="700" textAnchor="middle">
            ${hover.point.strike}
          </text>
          <line x1={tooltipX + 8} y1={tooltipY + 18} x2={tooltipX + tooltipW - 8} y2={tooltipY + 18}
            stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <circle cx={tooltipX + 14} cy={tooltipY + 29} r="3" fill="#C9A646" />
          <text x={tooltipX + 22} y={tooltipY + 32} fill="#C9A646" fontSize="8" fontWeight="600">
            {fmtDollars(hover.point.totalPain)}
          </text>
          <circle cx={tooltipX + 14} cy={tooltipY + 39} r="2.5" fill="#3B82F6" />
          <text x={tooltipX + 22} y={tooltipY + 42} fill="#3B82F6" fontSize="8" fontWeight="600">
            {fmtDollars(hover.point.callPain)}
          </text>
          <circle cx={tooltipX + tooltipW / 2 + 4} cy={tooltipY + 39} r="2.5" fill="#EF4444" />
          <text x={tooltipX + tooltipW / 2 + 12} y={tooltipY + 42} fill="#EF4444" fontSize="8" fontWeight="600">
            {fmtDollars(hover.point.putPain)}
          </text>
        </g>
      )}

      {/* Invisible overlay rect — ensures mouse events fire over entire chart area */}
      <rect x={PX} y={PY} width={chartW} height={chartH} fill="transparent" />
    </svg>
  );
});
MaxPainChart.displayName = 'MaxPainChart';

// ── Open Interest Bar Chart (SVG) — WITH HOVER TOOLTIP ──
const OIBarChart = memo(({ strikeData, currentPrice }: {
  strikeData: StrikeOI[];
  currentPrice: number;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (strikeData.length < 2) {
    return (
      <div className="h-[280px] flex items-center justify-center text-[#4B4B4B] text-sm">
        Insufficient data for OI chart
      </div>
    );
  }

  // Filter to strikes near current price (±15 strikes)
  const priceIdx = strikeData.findIndex(s => s.strike >= currentPrice);
  const center = priceIdx >= 0 ? priceIdx : Math.floor(strikeData.length / 2);
  const start = Math.max(0, center - 15);
  const end = Math.min(strikeData.length, center + 15);
  const visible = strikeData.slice(start, end);

  const W = 700, H = 280, PX = 50, PY = 20, PB = 50;
  const chartW = W - PX * 2;
  const chartH = H - PY - PB;

  const maxOI = Math.max(...visible.map(s => Math.max(s.callOI, s.putOI)), 1);
  const barW = Math.min(chartW / visible.length * 0.35, 12);
  const gap = chartW / visible.length;

  // Mouse handler: find which bar the mouse is over
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    // Find which bar index
    const idx = Math.floor((mouseX - PX) / gap);
    if (idx >= 0 && idx < visible.length) {
      setHoverIdx(idx);
    } else {
      setHoverIdx(null);
    }
  };

  const handleMouseLeave = () => setHoverIdx(null);

  // Tooltip data
  const hoverData = hoverIdx !== null ? visible[hoverIdx] : null;
  const hoverCx = hoverIdx !== null ? PX + gap * hoverIdx + gap / 2 : 0;

  // Tooltip positioning
  const ttW = 110;
  const ttH = 38;
  const ttX = hoverCx + ttW + 10 > W ? hoverCx - ttW - 10 : hoverCx + 10;
  const ttY = PY + 10;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto cursor-crosshair"
      preserveAspectRatio="xMidYMid meet"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <defs>
        <linearGradient id="callBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="putBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#EF4444" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="callBarHover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="1" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="putBarHover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F87171" stopOpacity="1" />
          <stop offset="100%" stopColor="#EF4444" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const yPos = PY + chartH * (1 - pct);
        return (
          <g key={i}>
            <line x1={PX} y1={yPos} x2={W - PX} y2={yPos} stroke="rgba(255,255,255,0.04)" />
            <text x={PX - 6} y={yPos + 3} fill="#4B4B4B" fontSize="9" textAnchor="end">
              {fmtK(maxOI * pct)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {visible.map((s, i) => {
        const cx = PX + gap * i + gap / 2;
        const callH = (s.callOI / maxOI) * chartH;
        const putH = (s.putOI / maxOI) * chartH;
        const isAtMoney = Math.abs(s.strike - currentPrice) < (visible[1]?.strike - visible[0]?.strike || 5) * 0.6;
        const isHovered = hoverIdx === i;

        return (
          <g key={s.strike} opacity={hoverIdx !== null && !isHovered ? 0.4 : 1}>
            {/* ATM highlight */}
            {isAtMoney && !isHovered && (
              <rect x={cx - gap / 2} y={PY} width={gap} height={chartH}
                fill="rgba(245,158,11,0.05)" />
            )}
            {/* Hover highlight */}
            {isHovered && (
              <rect x={cx - gap / 2} y={PY} width={gap} height={chartH}
                fill="rgba(255,255,255,0.03)" />
            )}
            {/* Call bar (left) */}
            <rect
              x={cx - barW - 1} y={PY + chartH - callH}
              width={barW} height={callH}
              fill={isHovered ? 'url(#callBarHover)' : 'url(#callBar)'} rx="2"
            />
            {/* Put bar (right) */}
            <rect
              x={cx + 1} y={PY + chartH - putH}
              width={barW} height={putH}
              fill={isHovered ? 'url(#putBarHover)' : 'url(#putBar)'} rx="2"
            />
            {/* Strike label */}
            {(i % Math.max(1, Math.floor(visible.length / 12)) === 0 || isAtMoney) && (
              <text x={cx} y={H - PB + 14} fill={isHovered ? '#fff' : isAtMoney ? '#F59E0B' : '#4B4B4B'}
                fontSize={isAtMoney || isHovered ? '10' : '8'} fontWeight={isAtMoney || isHovered ? '700' : '400'}
                textAnchor="middle" transform={`rotate(-45, ${cx}, ${H - PB + 14})`}>
                ${s.strike}
              </text>
            )}
          </g>
        );
      })}

      {/* Current price line */}
      {(() => {
        const cpIdx = visible.findIndex(s => s.strike >= currentPrice);
        if (cpIdx < 0) return null;
        const cpX = PX + gap * cpIdx + gap / 2;
        return (
          <line x1={cpX} y1={PY} x2={cpX} y2={PY + chartH}
            stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7" />
        );
      })()}

      {/* Legend */}
      <g transform={`translate(${PX + 8}, ${PY + 4})`}>
        <rect width="100" height="36" rx="6" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.06)" />
        <rect x="8" y="8" width="10" height="10" rx="2" fill="#3B82F6" />
        <text x="24" y="17" fill="#8B8B8B" fontSize="9">Call OI</text>
        <rect x="8" y="22" width="10" height="10" rx="2" fill="#EF4444" />
        <text x="24" y="31" fill="#8B8B8B" fontSize="9">Put OI</text>
      </g>

      {/* ═══ HOVER TOOLTIP — compact ═══ */}
      {hoverData && hoverIdx !== null && (
        <g>
          <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="6"
            fill="rgba(15,15,15,0.95)" stroke="rgba(201,166,70,0.25)" strokeWidth="0.75" />
          <text x={ttX + ttW / 2} y={ttY + 13} fill="#C9A646" fontSize="9" fontWeight="700" textAnchor="middle">
            ${hoverData.strike}
          </text>
          <line x1={ttX + 8} y1={ttY + 17} x2={ttX + ttW - 8} y2={ttY + 17}
            stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <rect x={ttX + 10} y={ttY + 22} width="6" height="6" rx="1" fill="#3B82F6" />
          <text x={ttX + 20} y={ttY + 29} fill="#3B82F6" fontSize="8" fontWeight="600">
            {hoverData.callOI.toLocaleString()}
          </text>
          <rect x={ttX + ttW / 2 + 2} y={ttY + 22} width="6" height="6" rx="1" fill="#EF4444" />
          <text x={ttX + ttW / 2 + 12} y={ttY + 29} fill="#EF4444" fontSize="8" fontWeight="600">
            {hoverData.putOI.toLocaleString()}
          </text>
          <text x={ttX + ttW / 2} y={ttY + 37} fill="#5B5B5B" fontSize="7" textAnchor="middle">
            Vol {(hoverData.callVolume + hoverData.putVolume).toLocaleString()}
          </text>
        </g>
      )}
    </svg>
  );
});
OIBarChart.displayName = 'OIBarChart';

// ── Signal Strength calculator ──
function getSignalStrength(item: UnusualActivity): { level: 'strong' | 'medium' | 'weak'; score: number } {
  let score = 0;
  // Vol/OI ratio scoring
  if (item.volOiRatio >= 5) score += 3;
  else if (item.volOiRatio >= 3) score += 2;
  else if (item.volOiRatio >= 1) score += 1;
  // Premium size scoring
  const premium = (item.lastPrice || 0) * item.volume * 100;
  if (premium >= 500_000) score += 3;
  else if (premium >= 100_000) score += 2;
  else if (premium >= 25_000) score += 1;
  // Volume scoring
  if (item.volume >= 5000) score += 2;
  else if (item.volume >= 1000) score += 1;
  // Sweep bonus
  if (item.volOiRatio > 3) score += 1;

  if (score >= 6) return { level: 'strong', score };
  if (score >= 3) return { level: 'medium', score };
  return { level: 'weak', score };
}

// ── UOA Summary Banner ──
const UOASummary = memo(({ unusual, currentPrice }: {
  unusual: UnusualActivity[];
  currentPrice: number;
}) => {
  if (unusual.length === 0) return null;

  const calls = unusual.filter(u => u.type === 'call');
  const puts = unusual.filter(u => u.type === 'put');
  const totalPremium = unusual.reduce((s, u) => s + (u.lastPrice || 0) * u.volume * 100, 0);

  // Buy/Sell → Sentiment inference
  const bullishPremium = unusual.reduce((s, u) => {
    const mid = (u.bid + u.ask) / 2;
    const isBuying = u.lastPrice >= mid;
    const isBull = (u.type === 'call' && isBuying) || (u.type === 'put' && !isBuying);
    return s + (isBull ? (u.lastPrice || 0) * u.volume * 100 : 0);
  }, 0);
  const bearishPremium = totalPremium - bullishPremium;
  const bullishCount = unusual.filter(u => {
    const mid = (u.bid + u.ask) / 2;
    const isBuying = u.lastPrice >= mid;
    return (u.type === 'call' && isBuying) || (u.type === 'put' && !isBuying);
  }).length;
  const bearishCount = unusual.length - bullishCount;

  // Dominant direction
  const callPremium = calls.reduce((s, u) => s + (u.lastPrice || 0) * u.volume * 100, 0);
  const putPremium = puts.reduce((s, u) => s + (u.lastPrice || 0) * u.volume * 100, 0);
  const bias = callPremium > putPremium * 1.5 ? 'bullish' : putPremium > callPremium * 1.5 ? 'bearish' : 'mixed';

  // Top expirations
  const expCounts = new Map<string, number>();
  unusual.forEach(u => expCounts.set(u.expiration, (expCounts.get(u.expiration) || 0) + 1));
  const topExp = Array.from(expCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const topExpLabel = topExp ? new Date(topExp[0] + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '';

  let summary = '';
  if (bias === 'bullish') {
    summary = `Bullish bias — ${calls.length}/${unusual.length} are CALL`;
  } else if (bias === 'bearish') {
    summary = `Bearish positioning — ${puts.length}/${unusual.length} are PUT`;
  } else {
    summary = `Mixed flow — ${calls.length} calls vs ${puts.length} puts`;
  }
  if (topExp && topExp[1] > 1) {
    summary += ` · ${topExpLabel} exp`;
  }

  const biasColor = bias === 'bullish' ? '#22C55E' : bias === 'bearish' ? '#EF4444' : '#F59E0B';

  return (
    <div className="rounded-lg px-3 py-2 mb-2" style={{
      background: `linear-gradient(135deg, ${biasColor}06, transparent)`,
      border: `1px solid ${biasColor}18`,
    }}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-white/70 font-medium">
          <Zap className="w-3 h-3 inline mr-1" style={{ color: biasColor }} />
          {summary}
        </p>
        <div className="flex items-center gap-3 text-[10px]">
          <span>
            <span className="text-[#22C55E] font-bold">{bullishCount} Bullish</span>
            <span className="text-[#4B4B4B] mx-1">·</span>
            <span className="text-[#22C55E] font-semibold">{fmtDollars(bullishPremium)}</span>
          </span>
          <span>
            <span className="text-[#EF4444] font-bold">{bearishCount} Bearish</span>
            <span className="text-[#4B4B4B] mx-1">·</span>
            <span className="text-[#EF4444] font-semibold">{fmtDollars(bearishPremium)}</span>
          </span>
        </div>
      </div>
    </div>
  );
});
UOASummary.displayName = 'UOASummary';

// ── Unusual Activity Block — clear sentiment-based design ──
const UnusualBlock = memo(({ item, currentPrice }: {
  item: UnusualActivity;
  currentPrice: number;
}) => {
  const isCall = item.type === 'call';
  const premium = (item.lastPrice || 0) * item.volume * 100;
  const otm = isCall ? item.strike > currentPrice : item.strike < currentPrice;
  const pctOTM = ((Math.abs(item.strike - currentPrice) / currentPrice) * 100).toFixed(1);
  const isSweep = item.volOiRatio > 3;
  const signal = getSignalStrength(item);

  // Infer trade side from bid/ask
  const mid = (item.bid + item.ask) / 2;
  const isBuyingSide = item.lastPrice >= mid; // traded at ask = someone buying

  // Determine sentiment:
  // Buy Call = Bullish, Sell Call = Bearish
  // Buy Put = Bearish, Sell Put = Bullish
  const isBullish = (isCall && isBuyingSide) || (!isCall && !isBuyingSide);
  const sentimentColor = isBullish ? '#22C55E' : '#EF4444';
  const sentimentLabel = isBullish ? 'BULLISH' : 'BEARISH';
  const actionLabel = `${isBuyingSide ? 'Buy' : 'Sell'} ${isCall ? 'Call' : 'Put'}`;

  const strBars = signal.level === 'strong' ? 3 : signal.level === 'medium' ? 2 : 1;
  const strColor = signal.level === 'strong' ? '#22C55E' : signal.level === 'medium' ? '#F59E0B' : '#6B6B6B';

  // Expiration
  const expLabel = (() => {
    try {
      const d = new Date(item.expiration + 'T00:00:00');
      const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return `${d.toLocaleDateString('en', { month: 'short', day: 'numeric' })} · ${diff}d`;
    } catch { return item.expiration; }
  })();

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all" style={{
      background: `linear-gradient(90deg, ${sentimentColor}06, transparent)`,
      border: `1px solid ${sentimentColor}12`,
    }}>
      {/* Sentiment indicator */}
      <div className="shrink-0 w-[58px] text-center">
        <div className="text-[10px] font-black tracking-wide" style={{ color: sentimentColor }}>
          {sentimentLabel}
        </div>
        <div className="text-[8px] mt-0.5 text-[#6B6B6B]">
          {actionLabel}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 shrink-0" style={{ background: `${sentimentColor}20` }} />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-white font-bold text-sm">${item.strike}</span>
          <span className="font-bold text-sm" style={{ color: sentimentColor }}>
            {fmtDollars(premium)}
          </span>
          <span className="text-[#5B5B5B] text-[9px]">{expLabel}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[9px] text-[#5B5B5B]">
          <span>{item.volume.toLocaleString()} contracts</span>
          <span>@ ${item.lastPrice?.toFixed(2)}</span>
          <span className={otm ? '' : 'text-[#F59E0B]'}>{otm ? `${pctOTM}% OTM` : 'ATM'}</span>
          {item.volOiRatio > 2 && (
            <span style={{ color: '#F59E0B' }}>V/OI {item.volOiRatio}x</span>
          )}
        </div>
      </div>

      {/* Tags + strength */}
      <div className="shrink-0 flex items-center gap-1.5">
        {isSweep && (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
            SWEEP
          </span>
        )}
        <span className="text-[9px] text-[#6B6B6B] font-medium whitespace-nowrap">
          {(() => {
            if (item.tradeDate) {
              try {
                const d = new Date(item.tradeDate);
                return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
              } catch { /* fall through */ }
            }
            return 'Today';
          })()}
        </span>
      </div>
    </div>
  );
});
UnusualBlock.displayName = 'UnusualBlock';

// =====================================================
// MAIN COMPONENT
// =====================================================

export const OptionsTab = memo(({ data }: { data: StockData }) => {
  const [chain, setChain] = useState<OptionContract[]>([]);
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExp, setSelectedExp] = useState<string>('');
  const [unusual, setUnusual] = useState<UnusualActivity[]>([]);
  const [advice, setAdvice] = useState<AIAdvice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdviceLoading, setIsAdviceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllUnusual, setShowAllUnusual] = useState(false);
  const fetchedRef = useRef<string>('');

  const ticker = data.ticker;

  // ── Main data fetch ──
  const fetchData = useCallback(async (exp?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch expirations first (if we don't have them)
      let exps = expirations;
      if (exps.length === 0) {
        exps = await fetchExpirations(ticker);
        setExpirations(exps);
      }

      // 2. Select nearest expiration if not specified
      const expToUse = exp || exps[0] || '';
      if (!exp && expToUse) {
        setSelectedExp(expToUse);
      }

      // 3. Fetch chain and unusual in parallel
      const [chainData, unusualData] = await Promise.all([
        fetchOptionsChain(ticker, expToUse),
        fetchUnusualActivity(ticker),
      ]);

      setChain(chainData);
      setUnusual(unusualData);

      // 4. Fetch AI advice (non-blocking)
      setIsAdviceLoading(true);
      fetchAIAdvice(ticker, data, chainData, unusualData)
        .then(a => { setAdvice(a); setIsAdviceLoading(false); })
        .catch(() => setIsAdviceLoading(false));

    } catch (e: any) {
      setError(e.message || 'Failed to load options data');
    } finally {
      setIsLoading(false);
    }
  }, [ticker, data, expirations]);

  // ── Auto-fetch on mount / ticker change ──
  useEffect(() => {
    if (fetchedRef.current === ticker) return;
    fetchedRef.current = ticker;
    setExpirations([]);
    setSelectedExp('');
    setChain([]);
    setUnusual([]);
    setAdvice(null);
    fetchData();
  }, [ticker, fetchData]);

  // ── Expiration change ──
  const handleExpChange = useCallback((exp: string) => {
    setSelectedExp(exp);
    fetchData(exp);
  }, [fetchData]);

  // ── Computed data ──
  const strikeData = useMemo(() => computeStrikeOI(chain), [chain]);
  const painData = useMemo(() => computeMaxPain(strikeData, data.price), [strikeData, data.price]);
  const maxPainStrike = useMemo(() => findMaxPainStrike(painData), [painData]);

  const totalCallOI = useMemo(() => chain.filter(c => c.type === 'call').reduce((s, c) => s + (c.openInterest || 0), 0), [chain]);
  const totalPutOI = useMemo(() => chain.filter(c => c.type === 'put').reduce((s, c) => s + (c.openInterest || 0), 0), [chain]);

  const visibleUnusual = showAllUnusual ? unusual : unusual.slice(0, 4);

  // ── Error state ──
  if (error && chain.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-[#F59E0B] mx-auto mb-3" />
          <p className="text-white font-medium mb-1">Options Data Unavailable</p>
          <p className="text-[#6B6B6B] text-sm mb-4">{error}</p>
          <button onClick={() => fetchData()} className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'rgba(201,166,70,0.15)', color: '#C9A646', border: '1px solid rgba(201,166,70,0.2)' }}>
            <RefreshCw className="w-3.5 h-3.5 inline mr-2" />Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ══════════════════════════════════════════
          SECTION 0: FINOTAUR AI ADVICE
      ══════════════════════════════════════════ */}
      <AdviceCard advice={advice} isLoading={isAdviceLoading} ticker={ticker} />

      {/* ══════════════════════════════════════════
          SECTION 1: MAX PAIN CHART
      ══════════════════════════════════════════ */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader
            icon={Target}
            title="Max Pain Analysis"
            subtitle="Strike price where option writers lose the least"
            badge={maxPainStrike ? `MP: $${maxPainStrike}` : undefined}
          />
          <ExpirationSelector
            expirations={expirations}
            selected={selectedExp}
            onSelect={handleExpChange}
            isLoading={isLoading}
          />
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
            <p className="text-[9px] text-[#4B4B4B] uppercase tracking-wider mb-0.5">Max Pain</p>
            <p className="text-lg font-bold text-[#22C55E]">${maxPainStrike || '—'}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}>
            <p className="text-[9px] text-[#4B4B4B] uppercase tracking-wider mb-0.5">Current Price</p>
            <p className="text-lg font-bold text-[#F59E0B]">${data.price.toFixed(2)}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[9px] text-[#4B4B4B] uppercase tracking-wider mb-0.5">Distance</p>
            <p className={cn('text-lg font-bold', maxPainStrike && maxPainStrike > data.price ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
              {maxPainStrike ? `${maxPainStrike > data.price ? '+' : ''}${((maxPainStrike - data.price) / data.price * 100).toFixed(1)}%` : '—'}
            </p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[9px] text-[#4B4B4B] uppercase tracking-wider mb-0.5">Expiration</p>
            <p className="text-sm font-bold text-white">
              {selectedExp ? new Date(selectedExp + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-[280px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#C9A646] animate-spin" />
          </div>
        ) : (
          <MaxPainChart painData={painData} currentPrice={data.price} maxPainStrike={maxPainStrike} strikeData={strikeData} />
        )}

        {maxPainStrike && (
          <p className="text-[10px] text-[#6B6B6B] mt-2 px-1">
            <Shield className="w-3 h-3 inline mr-1 text-[#22C55E]" />
            Max Pain at <span className="text-[#22C55E] font-semibold">${maxPainStrike}</span> suggests gravitational pull
            {maxPainStrike > data.price
              ? ` upward (${((maxPainStrike - data.price) / data.price * 100).toFixed(1)}% above current price)`
              : maxPainStrike < data.price
                ? ` downward (${((data.price - maxPainStrike) / data.price * 100).toFixed(1)}% below current price)`
                : ' — price is at max pain level'}
            {' '}as option writers benefit most from expiration near this strike.
          </p>
        )}
      </Card>

      {/* ══════════════════════════════════════════
          SECTION 2: OPEN INTEREST BAR CHART
      ══════════════════════════════════════════ */}
      <Card className="p-5">
        <SectionHeader
          icon={BarChart3}
          title="Open Interest by Strike"
          subtitle="Call vs Put positioning across the chain"
          badge={`${fmtK(totalCallOI)} C / ${fmtK(totalPutOI)} P`}
        />

        <div className="mt-4">
          {isLoading ? (
            <div className="h-[280px] flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[#C9A646] animate-spin" />
            </div>
          ) : (
            <OIBarChart strikeData={strikeData} currentPrice={data.price} />
          )}
        </div>

        {!isLoading && strikeData.length > 0 && (
          <div className="flex items-center gap-4 mt-3 text-[10px] text-[#6B6B6B]">
            <span>Total Call OI: <span className="text-[#3B82F6] font-semibold">{totalCallOI.toLocaleString()}</span></span>
            <span>Total Put OI: <span className="text-[#EF4444] font-semibold">{totalPutOI.toLocaleString()}</span></span>
            <span>P/C Ratio: <span className="text-white font-semibold">
              {totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : 'N/A'}
            </span></span>
          </div>
        )}
      </Card>

      {/* ══════════════════════════════════════════
          SECTION 3: UNUSUAL OPTIONS ACTIVITY
      ══════════════════════════════════════════ */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-1">
          <SectionHeader
            icon={Zap}
            title="Unusual Options Activity"
            subtitle="Block trades, sweeps & high Vol/OI signals"
            badge={unusual.length > 0 ? `${unusual.length} signals` : undefined}
          />
          {!isLoading && unusual.length > 0 && (
            <span className="text-[10px] text-[#6B6B6B] shrink-0">
              Price: <span className="text-white font-semibold">${data.price.toFixed(2)}</span>
            </span>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{
                background: 'rgba(201,166,70,0.04)',
                animationDelay: `${i * 150}ms`,
              }} />
            ))
          ) : unusual.length === 0 ? (
            <div className="py-8 text-center">
              <Eye className="w-6 h-6 text-[#4B4B4B] mx-auto mb-2" />
              <p className="text-[#6B6B6B] text-sm">No unusual activity detected for {ticker}</p>
              <p className="text-[#4B4B4B] text-[10px] mt-1">Thresholds: Vol ≥ 500, Vol/OI ≥ 0.3x</p>
            </div>
          ) : (
            <>
              <UOASummary unusual={unusual} currentPrice={data.price} />
              {visibleUnusual.map((item, i) => (
                <UnusualBlock key={item.contract || i} item={item} currentPrice={data.price} />
              ))}
              {unusual.length > 4 && (
                <button
                  onClick={() => setShowAllUnusual(!showAllUnusual)}
                  className="w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1"
                  style={{ background: 'rgba(255,255,255,0.03)', color: '#8B8B8B', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  {showAllUnusual ? (
                    <><ChevronUp className="w-3.5 h-3.5" /> Show Less</>
                  ) : (
                    <><ChevronDown className="w-3.5 h-3.5" /> Show All {unusual.length} Signals</>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </Card>

{/* ══════════════════════════════════════════
          SECTION 3.5: GAMMA EXPOSURE (GEX) PROFILE
      ══════════════════════════════════════════ */}
      <Card className="p-5">
        <SectionHeader
          icon={Flame}
          title="Gamma Exposure (GEX)"
          subtitle="Price levels vs dealer gamma positioning"
          badge={chain.length > 0 ? `${chain.length} contracts` : undefined}
        />

        <div className="mt-4">
          {isLoading ? (
            <div className="h-[500px] flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[#C9A646] animate-spin" />
            </div>
          ) : (
            <GammaExposureChart chain={chain} currentPrice={data.price} ticker={ticker} />
          )}
        </div>
      </Card>

      {/* ══════════════════════════════════════════
          SECTION 4: ALGO FLOW — Price + Options Overlay
      ══════════════════════════════════════════ */}
      <Card className="p-5">
        <SectionHeader
          icon={Activity}
          title="Algo Flow"
          subtitle="30-day price action with call/put volume overlay"
        />

        <div className="mt-4">
          {isLoading ? (
            <div className="h-[420px] flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[#C9A646] animate-spin" />
            </div>
          ) : (
            <AlgoFlowChart chain={chain} ticker={ticker} currentPrice={data.price} />
          )}
        </div>
      </Card>

      {/* Disclaimer */}
      <p className="text-[9px] text-[#3B3B3B] text-center px-4">
        Options data from Polygon. Max Pain is theoretical and not a price prediction.
        Unusual activity reflects volume ≥ 500 & Vol/OI ≥ 0.3x. Not financial advice.
      </p>
    </div>
  );
});

OptionsTab.displayName = 'OptionsTab';