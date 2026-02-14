// src/components/stock-analyzer/tabs/BusinessTab.tsx
// =====================================================
// 🏛️ BUSINESS TAB v3.1 — FINOTAUR PREMIUM DESIGN
// =====================================================
// Luxury institutional-grade business analysis tab
// Matches FINOTAUR AI aesthetic with gold accents,
// competitive landscape, moat analysis with diamond
// markers, and strategic recommendations
// =====================================================

import { memo, useMemo, useState, useEffect, useRef } from 'react';
import {
  Briefcase, TrendingUp, DollarSign, Zap, Shield,
  Target, Crown, Building2, Users, Globe,
  ChevronRight, Sparkles, BarChart2, Award,
  Layers, ArrowUpRight, ArrowDownRight, Minus, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types/stock-analyzer.types';
import { C } from '@/constants/stock-analyzer.constants';
import { Card, SectionHeader, BarMeter } from '../ui';
import { fmtPct, fmtBig, isValid, getBusinessModelType } from '@/utils/stock-analyzer.utils';

// =====================================================
// FINOTAUR AI BADGE
// =====================================================

const FinotaurBadge = memo(({ label }: { label?: string }) => (
  <span
    className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider px-3 py-1 rounded-full"
    style={{
      background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(244,217,123,0.08))',
      border: '1px solid rgba(201,166,70,0.25)',
      color: '#C9A646',
      boxShadow: '0 0 12px rgba(201,166,70,0.08)',
    }}
  >
    <Sparkles className="w-2.5 h-2.5" />
    FINOTAUR AI
    {label && <span className="opacity-60 ml-0.5">• {label}</span>}
  </span>
));
FinotaurBadge.displayName = 'FinotaurBadge';

// =====================================================
// VERDICT BADGE
// =====================================================

const VerdictBadge = memo(({ text, color }: { text: string; color: string }) => (
  <span
    className="inline-flex items-center text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase"
    style={{
      background: `${color}15`,
      border: `1px solid ${color}30`,
      color,
    }}
  >
    {text}
  </span>
));
VerdictBadge.displayName = 'VerdictBadge';

// =====================================================
// MOAT DIAMOND METER — Premium Gold Diamond Style
// =====================================================
// Inspired by institutional valuation multiples charts:
// A horizontal track with a gold diamond (◆) marker
// showing where the factor sits on the strength scale.
// =====================================================

const MoatDiamondMeter = memo(({ label, strength, description }: {
  label: string;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  description: string;
}) => {
  // Map strength to position percentage on the bar (0-100)
  const positionMap = {
    WEAK: 20,
    MODERATE: 55,
    STRONG: 85,
  };
  const position = positionMap[strength];

  // Badge label styling — all gold themed, bright & glowing
  const badgeMap = {
    STRONG: { label: 'Strong', bg: 'rgba(201,166,70,0.20)', color: '#F4D97B', borderColor: 'rgba(244,217,123,0.4)', glow: '0 0 12px rgba(201,166,70,0.25)' },
    MODERATE: { label: 'Moderate', bg: 'rgba(201,166,70,0.14)', color: '#E0C35A', borderColor: 'rgba(201,166,70,0.3)', glow: '0 0 8px rgba(201,166,70,0.15)' },
    WEAK: { label: 'Weak', bg: 'rgba(201,166,70,0.08)', color: '#C9A646', borderColor: 'rgba(201,166,70,0.18)', glow: 'none' },
  };
  const badge = badgeMap[strength];

  return (
    <div className="py-4 group">
      {/* Label row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-[#E8DCC4] tracking-wide">{label}</span>
        <span
          className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-md uppercase"
          style={{
            background: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.borderColor}`,
            boxShadow: badge.glow,
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Diamond track */}
      <div className="relative h-3 mb-2.5">
        {/* Background track — segmented look */}
        <div className="absolute inset-0 flex gap-[2px] rounded-full overflow-hidden">
          {/* Weak zone */}
          <div
            className="flex-1 rounded-l-full"
            style={{
              background: 'linear-gradient(90deg, rgba(201,166,70,0.10), rgba(201,166,70,0.16))',
            }}
          />
          {/* Moderate zone */}
          <div
            style={{
              flex: 1,
              background: 'linear-gradient(90deg, rgba(201,166,70,0.16), rgba(201,166,70,0.26))',
            }}
          />
          {/* Strong zone */}
          <div
            className="flex-1 rounded-r-full"
            style={{
              background: 'linear-gradient(90deg, rgba(201,166,70,0.26), rgba(201,166,70,0.38))',
            }}
          />
        </div>

        {/* Filled portion up to diamond */}
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${position}%`,
            background: `linear-gradient(90deg, rgba(201,166,70,0.12), rgba(244,217,123,0.50))`,
            boxShadow: '0 0 8px rgba(201,166,70,0.15)',
          }}
        />

        {/* Diamond marker (◆) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out"
          style={{
            left: `${position}%`,
            transform: `translateX(-50%) translateY(-50%)`,
          }}
        >
          {/* Glow effect */}
          <div
            className="absolute blur-lg"
            style={{
              width: 32,
              height: 32,
              marginLeft: -8,
              marginTop: -8,
              background: 'radial-gradient(circle, rgba(244,217,123,0.6), rgba(201,166,70,0.2), transparent)',
            }}
          />
          {/* The diamond shape */}
          <div
            className="relative"
            style={{
              width: 16,
              height: 16,
              transform: 'rotate(45deg)',
              background: 'linear-gradient(135deg, #FBE8A0, #F4D97B, #C9A646)',
              borderRadius: 2,
              boxShadow: '0 0 14px rgba(244,217,123,0.6), 0 0 28px rgba(201,166,70,0.3), 0 0 4px rgba(255,255,255,0.2)',
            }}
          />
        </div>
      </div>

      {/* Scale labels */}
      <div className="flex justify-between mb-1.5 px-1">
        <span className="text-[9px] text-[#6B6B6B] tracking-wider uppercase">Weak</span>
        <span className="text-[9px] text-[#6B6B6B] tracking-wider uppercase">Moderate</span>
        <span className="text-[9px] text-[#6B6B6B] tracking-wider uppercase">Strong</span>
      </div>

      {/* Description */}
      <p className="text-xs text-[#6B6B6B] leading-relaxed">{description}</p>
    </div>
  );
});
MoatDiamondMeter.displayName = 'MoatDiamondMeter';

// =====================================================
// COMPETITIVE LANDSCAPE HELPERS
// =====================================================

// =====================================================
// COMPETITIVE LANDSCAPE — AI-POWERED (Dynamic)
// =====================================================

interface CompetitorData {
  name: string;
  ticker: string;
  description: string;
  threat: 'HIGH THREAT' | 'MEDIUM' | 'LOW';
}

const competitorCache = new Map<string, { data: CompetitorData[]; timestamp: number }>();
const COMPETITOR_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function fetchCompetitorsAI(data: StockData, signal?: AbortSignal): Promise<CompetitorData[]> {
  const cacheKey = data.ticker;
  const cached = competitorCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < COMPETITOR_CACHE_TTL) {
    return cached.data;
  }

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const prompt = `Identify the top 3 real competitors for ${data.name} (${data.ticker}) in the ${data.industry} industry.

Market Cap: ${data.marketCap ? '$' + (data.marketCap / 1e9).toFixed(0) + 'B' : 'N/A'}
Sector: ${data.sector} | Industry: ${data.industry}

Return ONLY valid JSON array, no markdown, no backticks:
[
  { "name": "Company Name", "ticker": "TICK", "description": "One sentence why they compete", "threat": "HIGH THREAT" },
  { "name": "Company Name", "ticker": "TICK", "description": "One sentence why they compete", "threat": "MEDIUM" },
  { "name": "Company Name", "ticker": "TICK", "description": "One sentence why they compete", "threat": "LOW" }
]

Rules:
- Use REAL company names and ticker symbols (not placeholders)
- threat must be exactly "HIGH THREAT", "MEDIUM", or "LOW"
- description must be specific to WHY they compete with ${data.ticker}
- Order by threat level: highest first
- Do NOT include ${data.ticker} itself`;

  try {
    const response = await fetch(`${API_BASE}/api/ai-proxy/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        prompt,
        system: 'You are a senior equity research analyst. Return ONLY valid JSON arrays. No markdown, no backticks, no preamble.',
        useWebSearch: false,
        maxTokens: 500,
      }),
    });

    if (!response.ok) throw new Error('API error');

    const result = await response.json();
    if (!result.success) throw new Error('AI failed');

    const text = (result.content || '').replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed: CompetitorData[] = JSON.parse(text);

    // Validate
    const valid = parsed.filter(c =>
      c.name && c.ticker && c.description &&
      ['HIGH THREAT', 'MEDIUM', 'LOW'].includes(c.threat)
    ).slice(0, 5);

    if (valid.length > 0) {
      competitorCache.set(cacheKey, { data: valid, timestamp: Date.now() });
      return valid;
    }
    throw new Error('No valid competitors');
  } catch {
    return []; // Return empty — UI will handle gracefully
  }
}

function getMoatAnalysis(data: StockData): {
  overall: 'WIDE MOAT' | 'NARROW MOAT' | 'NO MOAT';
  overallColor: string;
  factors: { label: string; strength: 'STRONG' | 'MODERATE' | 'WEAK'; description: string }[];
} {
  let score = 0;
  const factors: { label: string; strength: 'STRONG' | 'MODERATE' | 'WEAK'; description: string }[] = [];

  // Network Effects
  const isNetwork = data.industry.toLowerCase().includes('internet') ||
    data.industry.toLowerCase().includes('marketplace') ||
    ['META', 'GOOGL', 'AMZN', 'MSFT', 'AAPL', 'V', 'MA', 'PYPL'].includes(data.ticker);
  if (isNetwork) {
    factors.push({ label: 'Network Effects', strength: 'STRONG', description: `Platform scale creates self-reinforcing user growth and engagement` });
    score += 2;
  } else {
    factors.push({ label: 'Network Effects', strength: 'WEAK', description: 'Limited network-driven competitive advantages in current business model' });
  }

  // Cost Advantage
  if (isValid(data.grossMargin) && data.grossMargin! > 50) {
    factors.push({ label: 'Cost Advantage', strength: 'STRONG', description: `Gross margins of ${data.grossMargin!.toFixed(0)}% indicate significant pricing power and cost efficiency` });
    score += 2;
  } else if (isValid(data.grossMargin) && data.grossMargin! > 30) {
    factors.push({ label: 'Cost Advantage', strength: 'MODERATE', description: `Gross margins at ${data.grossMargin!.toFixed(0)}% suggest reasonable but not dominant cost position` });
    score += 1;
  } else {
    factors.push({ label: 'Cost Advantage', strength: 'WEAK', description: 'Thin margins suggest limited pricing power relative to competitors' });
  }

  // Switching Costs
  const isHighSwitch = data.sector.toLowerCase().includes('technology') ||
    data.industry.toLowerCase().includes('software') ||
    data.industry.toLowerCase().includes('bank');
  if (isHighSwitch && isValid(data.roe) && data.roe! > 15) {
    factors.push({ label: 'Switching Costs', strength: 'STRONG', description: 'Deep integration into customer workflows creates high migration friction' });
    score += 2;
  } else if (isHighSwitch) {
    factors.push({ label: 'Switching Costs', strength: 'MODERATE', description: 'Some customer lock-in through product ecosystem and integrations' });
    score += 1;
  } else {
    factors.push({ label: 'Switching Costs', strength: 'WEAK', description: 'Customers can switch to alternatives with relatively low friction' });
  }

  // Brand Strength
  if (isValid(data.marketCap) && data.marketCap > 200e9) {
    factors.push({ label: 'Brand Strength', strength: 'STRONG', description: `${fmtBig(data.marketCap)} market cap reflects dominant brand recognition and trust` });
    score += 2;
  } else if (isValid(data.marketCap) && data.marketCap > 50e9) {
    factors.push({ label: 'Brand Strength', strength: 'MODERATE', description: 'Established brand with meaningful recognition in target markets' });
    score += 1;
  } else {
    factors.push({ label: 'Brand Strength', strength: 'WEAK', description: 'Brand still building recognition and market presence' });
  }

  // Intangible Assets (IP/Regulatory)
  const isIP = data.sector.toLowerCase().includes('healthcare') ||
    data.industry.toLowerCase().includes('pharma') ||
    data.industry.toLowerCase().includes('semiconductor') ||
    data.industry.toLowerCase().includes('software');
  if (isIP) {
    factors.push({ label: 'Intangible Assets', strength: 'STRONG', description: 'Patents, IP portfolio, and regulatory barriers protect market position' });
    score += 2;
  } else if (isValid(data.grossMargin) && data.grossMargin! > 40) {
    factors.push({ label: 'Intangible Assets', strength: 'MODERATE', description: 'Some proprietary advantages through brand, processes, or know-how' });
    score += 1;
  } else {
    factors.push({ label: 'Intangible Assets', strength: 'WEAK', description: 'Limited intellectual property protection or regulatory moat' });
  }

  // Overall
  const overall = score >= 6 ? 'WIDE MOAT' : score >= 3 ? 'NARROW MOAT' : 'NO MOAT';
  const overallColor = score >= 6 ? '#C9A646' : score >= 3 ? '#B8943D' : '#6B6B6B';

  return { overall, overallColor, factors };
}

function getBusinessVerdict(data: StockData): string {
  const parts: string[] = [];
  parts.push(`${data.name} operates as a ${data.industry.toLowerCase()} company in the ${data.sector.toLowerCase()} sector`);

  if (isValid(data.marketCap)) {
    parts[0] += ` with a market capitalization of ${fmtBig(data.marketCap)}`;
  }
  parts[0] += '.';

  if (isValid(data.grossMargin) && isValid(data.netMargin)) {
    const quality = data.grossMargin! > 50 ? 'premium' : data.grossMargin! > 30 ? 'solid' : 'thin';
    parts.push(`The company demonstrates ${quality} unit economics with ${data.grossMargin!.toFixed(0)}% gross margins and ${data.netMargin!.toFixed(1)}% net profitability.`);
  }

  if (isValid(data.revenueGrowth)) {
    if (data.revenueGrowth! > 15) parts.push(`Revenue growth of ${data.revenueGrowth!.toFixed(1)}% indicates strong momentum and market share gains.`);
    else if (data.revenueGrowth! > 0) parts.push(`Moderate revenue growth of ${data.revenueGrowth!.toFixed(1)}% suggests steady demand.`);
    else parts.push(`Revenue contraction of ${data.revenueGrowth!.toFixed(1)}% warrants monitoring for structural challenges.`);
  }

  if (isValid(data.roe) && data.roe! > 20) {
    parts.push(`Return on equity of ${data.roe!.toFixed(0)}% reflects efficient capital deployment and management effectiveness.`);
  }

  return parts.join(' ');
}

// =====================================================
// METRIC TILE
// =====================================================

const MetricTile = memo(({ label, value, color, topBorder }: { label: string; value: string; color?: string; topBorder?: boolean }) => (
  <div
    className="p-4 rounded-xl relative overflow-hidden"
    style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
    }}
  >
    {topBorder && (
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(201,166,70,0.4), transparent)',
        }}
      />
    )}
    <p className="text-[10px] uppercase tracking-wider text-[#6B6B6B] mb-1.5 font-medium">{label}</p>
    <p className={cn('text-sm font-semibold', color || 'text-white')}>{value}</p>
  </div>
));
MetricTile.displayName = 'MetricTile';

// =====================================================
// COMPETITOR LOGO HOOK
// =====================================================

const logoCache = new Map<string, string | null>();

function useCompetitorLogo(ticker: string): { logoUrl: string | null; loading: boolean } {
  const [logoUrl, setLogoUrl] = useState<string | null>(logoCache.get(ticker) ?? null);
  const [loading, setLoading] = useState(!logoCache.has(ticker));

  useEffect(() => {
    if (logoCache.has(ticker)) {
      setLogoUrl(logoCache.get(ticker)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const API_BASE = import.meta.env.VITE_API_URL || '';

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/market-data/company/${ticker}`);
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        const logo = data?.logo || null;

        logoCache.set(ticker, logo);
        if (!cancelled) {
          setLogoUrl(logo);
          setLoading(false);
        }
      } catch {
        logoCache.set(ticker, null);
        if (!cancelled) {
          setLogoUrl(null);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [ticker]);

  return { logoUrl, loading };
}

// =====================================================
// COMPETITOR ROW
// =====================================================

const CompetitorRow = memo(({ name, ticker, description, threat }: CompetitorData) => {
  const threatColor = threat === 'HIGH THREAT' ? '#C9A646' : threat === 'MEDIUM' ? '#B8943D' : '#6B6B6B';
  const { logoUrl, loading } = useCompetitorLogo(ticker);
  const [imgError, setImgError] = useState(false);

  const showLogo = logoUrl && !imgError;

  return (
    <div
      className="p-4 rounded-xl transition-all duration-300 hover:translate-x-1"
      style={{
        background: `linear-gradient(135deg, ${threatColor}08, transparent)`,
        border: `1px solid ${threatColor}15`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          {/* Logo / Fallback Avatar */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold overflow-hidden flex-shrink-0"
            style={{
              background: showLogo ? '#1A1A2E' : `${threatColor}15`,
              color: threatColor,
              border: showLogo ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}
          >
            {loading ? (
              <div
                className="w-full h-full animate-pulse"
                style={{ background: `${threatColor}10` }}
              />
            ) : showLogo ? (
              <img
                src={logoUrl}
                alt={`${name} logo`}
                className="w-full h-full object-contain p-[3px]"
                style={{ borderRadius: 'inherit' }}
                onError={() => setImgError(true)}
                loading="lazy"
              />
            ) : (
              ticker.slice(0, 2)
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="text-[10px] text-[#6B6B6B]">{ticker}</p>
          </div>
        </div>
        <span
          className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded"
          style={{ background: `${threatColor}15`, color: threatColor }}
        >
          {threat}
        </span>
      </div>
      <p className="text-xs text-[#6B6B6B] leading-relaxed pl-[42px]">{description}</p>
    </div>
  );
});
CompetitorRow.displayName = 'CompetitorRow';

// =====================================================
// GROWTH METRIC
// =====================================================

const GrowthMetric = memo(({ label, value, rawValue }: { label: string; value: string; rawValue?: number | null }) => {
  const isPositive = isValid(rawValue) && rawValue! > 0;
  const isNegative = isValid(rawValue) && rawValue! < 0;
  const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;
  const color = isPositive ? C.green : isNegative ? C.red : '#6B6B6B';

  return (
    <div
      className="relative p-5 rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.02), transparent)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#6B6B6B] font-medium">{label}</p>
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
});
GrowthMetric.displayName = 'GrowthMetric';

// =====================================================
// DIFFERENTIATOR ITEM
// =====================================================

const DifferentiatorItem = memo(({ icon, text, isPositive }: { icon: string; text: string; isPositive: boolean }) => {
  const color = isPositive ? C.green : C.red;
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl transition-all duration-300"
      style={{
        background: `linear-gradient(135deg, ${color}06, transparent)`,
        border: `1px solid ${color}15`,
      }}
    >
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${color}15` }}
      >
        <span className="text-xs" style={{ color }}>{icon}</span>
      </div>
      <span className="text-sm text-[#A0A0A0] leading-relaxed">{text}</span>
    </div>
  );
});
DifferentiatorItem.displayName = 'DifferentiatorItem';

// =====================================================
// MAIN COMPONENT
// =====================================================

export const BusinessTab = memo(({ data }: { data: StockData }) => {
  const bm = getBusinessModelType(data);
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [competitorsLoading, setCompetitorsLoading] = useState(true);
  const moat = useMemo(() => getMoatAnalysis(data), [data]);
  const verdict = useMemo(() => getBusinessVerdict(data), [data]);

  useEffect(() => {
    const controller = new AbortController();
    setCompetitorsLoading(true);
    fetchCompetitorsAI(data, controller.signal)
      .then(setCompetitors)
      .finally(() => setCompetitorsLoading(false));
    return () => controller.abort();
  }, [data.ticker]);

  const differentiators = useMemo(() => {
    return [
      isValid(data.grossMargin) && data.grossMargin! > 50 ? { icon: '✦', text: `High gross margins (${data.grossMargin!.toFixed(0)}%) — strong pricing power and competitive positioning`, positive: true } : null,
      isValid(data.roe) && data.roe! > 20 ? { icon: '✦', text: `Excellent ROE (${data.roe!.toFixed(0)}%) — efficient capital allocation driving shareholder returns`, positive: true } : null,
      isValid(data.marketCap) && data.marketCap > 100e9 ? { icon: '✦', text: `Large-cap status ($${(data.marketCap / 1e9).toFixed(0)}B) — scale advantages in procurement, R&D, and distribution`, positive: true } : null,
      isValid(data.dividendYield) && data.dividendYield! > 0 ? { icon: '✦', text: `Active shareholder returns program with ${data.dividendYield!.toFixed(2)}% dividend yield`, positive: true } : null,
      isValid(data.revenueGrowth) && data.revenueGrowth! > 10 ? { icon: '✦', text: `Accelerating growth engine at ${data.revenueGrowth!.toFixed(1)}% YoY revenue expansion`, positive: true } : null,
      isValid(data.netMargin) && data.netMargin! > 15 ? { icon: '✦', text: `Premium profitability with ${data.netMargin!.toFixed(1)}% net margins`, positive: true } : null,
      isValid(data.pe) && data.pe! > 40 ? { icon: '✗', text: `Premium valuation (P/E: ${data.pe!.toFixed(1)}x) — limited margin of safety for new positions`, positive: false } : null,
      isValid(data.revenueGrowth) && data.revenueGrowth! < 0 ? { icon: '✗', text: `Revenue decline of ${data.revenueGrowth!.toFixed(1)}% signals potential headwinds`, positive: false } : null,
      isValid(data.debtToEquity) && data.debtToEquity! > 2 ? { icon: '✗', text: `Elevated leverage (D/E: ${data.debtToEquity!.toFixed(1)}) — debt servicing may constrain flexibility`, positive: false } : null,
      isValid(data.netMargin) && data.netMargin! < 5 && data.netMargin! > 0 ? { icon: '✗', text: `Thin net margin (${data.netMargin!.toFixed(1)}%) — limited buffer against economic downturns`, positive: false } : null,
    ].filter(Boolean) as { icon: string; text: string; positive: boolean }[];
  }, [data]);

  return (
    <div className="space-y-6">

      {/* ═══════════════════════════════════════════════════ */}
      {/* THE BUSINESS MODEL — Hero Card                     */}
      {/* ═══════════════════════════════════════════════════ */}
      <Card highlight>
        <div className="relative p-6">
          {/* Gold left accent */}
          <div
            className="absolute top-0 left-0 w-1 h-full"
            style={{
              background: 'linear-gradient(180deg, #C9A646, #C9A64640, transparent)',
              boxShadow: '0 0 12px rgba(201,166,70,0.2)',
            }}
          />

          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))',
                border: '1px solid rgba(201,166,70,0.25)',
                boxShadow: '0 0 20px rgba(201,166,70,0.08)',
              }}
            >
              <Briefcase className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-white">The Business Model</h3>
                <VerdictBadge text={bm.type} color={C.gold} />
              </div>
            </div>
          </div>

          <p className="text-[#E8DCC4] leading-relaxed mb-8 text-[15px]">
            {data.description || `${data.name} operates in the ${data.industry} industry within the ${data.sector} sector.`}
          </p>

          {/* Model Attributes — Top Row */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <MetricTile label="Model Type" value={bm.type} color="text-[#C9A646]" topBorder />
            <MetricTile label="Recurring Revenue" value={bm.recurring} topBorder />
            <MetricTile
              label="Economic Sensitivity"
              value={bm.sensitivity}
              color={
                bm.sensitivity === 'Low' ? 'text-[#22C55E]' :
                bm.sensitivity === 'Very High' || bm.sensitivity === 'High' ? 'text-[#EF4444]' :
                'text-[#F59E0B]'
              }
              topBorder
            />
          </div>

          {/* Company Details — Bottom Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] uppercase tracking-wider text-[#6B6B6B] mb-1 font-medium">Sector</p>
              <p className="text-sm font-semibold text-[#C9A646]">{data.sector}</p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] uppercase tracking-wider text-[#6B6B6B] mb-1 font-medium">Industry</p>
              <p className="text-sm font-medium text-white">{data.industry}</p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] uppercase tracking-wider text-[#6B6B6B] mb-1 font-medium">Employees</p>
              <p className="text-sm font-medium text-white">{isValid(data.employees) ? data.employees!.toLocaleString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════ */}
      {/* COMPETITIVE LANDSCAPE                              */}
      {/* ═══════════════════════════════════════════════════ */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.12), rgba(201,166,70,0.04))',
                border: '1px solid rgba(201,166,70,0.2)',
              }}
            >
              <Target className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Competitive Landscape</h3>
              <p className="text-xs text-[#6B6B6B]">Key competitors & threats</p>
            </div>
          </div>

          <p className="text-sm text-[#A0A0A0] leading-relaxed mb-6">
            {data.name} competes in the {data.industry} space
            {isValid(data.marketCap) && ` with a market cap of ${fmtBig(data.marketCap)}`}.
            {isValid(data.grossMargin) && data.grossMargin! > 40
              ? ` Strong margins of ${data.grossMargin!.toFixed(0)}% suggest competitive pricing power.`
              : ' The competitive environment requires continued focus on operational efficiency.'}
          </p>

          <div className="space-y-3">
            {competitorsLoading ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader2 className="w-5 h-5 text-[#C9A646] animate-spin" />
                <span className="text-sm text-[#6B6B6B]">Analyzing competitive landscape...</span>
              </div>
            ) : competitors.length > 0 ? (
              competitors.map((comp, i) => (
                <CompetitorRow key={i} {...comp} />
              ))
            ) : (
              <p className="text-sm text-[#6B6B6B] text-center py-6">Competitor data unavailable</p>
            )}
          </div>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════ */}
      {/* COMPETITIVE MOAT — Diamond Style                   */}
      {/* ═══════════════════════════════════════════════════ */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.12), rgba(201,166,70,0.04))',
                border: '1px solid rgba(201,166,70,0.2)',
              }}
            >
              <Shield className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-white">Competitive Moat</h3>
                <p className="text-xs text-[#6B6B6B]">What protects the business</p>
              </div>
            </div>
            <VerdictBadge text={moat.overall} color={moat.overallColor} />
          </div>

          {/* Moat summary box */}
          <div
            className="p-4 rounded-xl mb-6"
            style={{
              background: `linear-gradient(135deg, ${moat.overallColor}08, transparent)`,
              border: `1px solid ${moat.overallColor}20`,
            }}
          >
            <p className="text-sm text-[#A0A0A0] leading-relaxed">
              {data.name}'s moat stems primarily from
              {moat.factors.filter(f => f.strength === 'STRONG').length > 0
                ? ` powerful ${moat.factors.filter(f => f.strength === 'STRONG').map(f => f.label.toLowerCase()).join(', ')}`
                : ' moderate competitive positioning'
              }
              {isValid(data.grossMargin) ? `, reinforced by ${data.grossMargin!.toFixed(0)}% gross margins` : ''}.
              {moat.overall === 'WIDE MOAT'
                ? ' The combination of these factors creates durable competitive advantages that are difficult to replicate.'
                : moat.overall === 'NARROW MOAT'
                ? ' While competitive advantages exist, they require continued investment to maintain.'
                : ' Competitive advantages are limited, suggesting vulnerability to disruption.'
              }
            </p>
          </div>

          {/* Diamond meters — gold luxury style */}
          <div className="space-y-1 divide-y divide-white/[0.04]">
            {moat.factors.map((factor, i) => (
              <MoatDiamondMeter key={i} {...factor} />
            ))}
          </div>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════ */}
      {/* GROWTH PROFILE                                     */}
      {/* ═══════════════════════════════════════════════════ */}
      <Card>
        <div className="p-6">
          <SectionHeader icon={TrendingUp} title="Growth Profile" subtitle="Year-over-year metrics" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <GrowthMetric label="Revenue Growth (YoY)" value={fmtPct(data.revenueGrowth)} rawValue={data.revenueGrowth} />
            <GrowthMetric label="EPS Growth" value={fmtPct(data.epsGrowth)} rawValue={data.epsGrowth} />
            <GrowthMetric label="Net Income Growth" value={fmtPct(data.netIncomeGrowth)} rawValue={data.netIncomeGrowth} />
          </div>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════ */}
      {/* PER SHARE DATA                                     */}
      {/* ═══════════════════════════════════════════════════ */}
      <Card>
        <div className="p-6">
          <SectionHeader icon={DollarSign} title="Per Share Data" subtitle="Fundamental metrics" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricTile label="EPS (TTM)" value={isValid(data.eps) ? `$${data.eps!.toFixed(2)}` : 'N/A'} />
            <MetricTile label="Revenue/Share" value={isValid(data.revenuePerShare) ? `$${data.revenuePerShare!.toFixed(2)}` : 'N/A'} />
            <MetricTile label="Book Value/Share" value={isValid(data.bookValuePerShare) ? `$${data.bookValuePerShare!.toFixed(2)}` : 'N/A'} />
            <MetricTile label="FCF/Share" value={isValid(data.freeCashFlowPerShare) ? `$${data.freeCashFlowPerShare!.toFixed(2)}` : 'N/A'} />
          </div>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════ */}
      {/* KEY DIFFERENTIATORS                                */}
      {/* ═══════════════════════════════════════════════════ */}
      {differentiators.length > 0 && (
        <Card>
          <div className="p-6">
            <SectionHeader icon={Zap} title="Key Differentiators" subtitle="Strengths & challenges" />
            <div className="space-y-3">
              {differentiators.map((item, i) => (
                <DifferentiatorItem key={i} icon={item.icon} text={item.text} isPositive={item.positive} />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* BUSINESS VERDICT — FINOTAUR AI                     */}
      {/* ═══════════════════════════════════════════════════ */}
      <Card gold>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <FinotaurBadge />
            <h3 className="text-lg font-bold text-white">Business Verdict</h3>
          </div>

          <div
            className="p-5 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.06), rgba(201,166,70,0.02))',
              border: '1px solid rgba(201,166,70,0.15)',
            }}
          >
            <p className="text-[#E8DCC4] leading-relaxed text-sm">{verdict}</p>
          </div>
        </div>
      </Card>
    </div>
  );
});

BusinessTab.displayName = 'BusinessTab';