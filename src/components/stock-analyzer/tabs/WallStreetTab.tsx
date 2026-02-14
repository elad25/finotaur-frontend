// src/components/stock-analyzer/tabs/WallStreetTab.tsx
// =====================================================
// 🏛️ WALL STREET TAB — Enhanced with FINOTAUR Score,
//    Analyst Breakdown & Sentiment Trend
// =====================================================

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import {
  Award, Target, TrendingUp, TrendingDown, Users,
  Loader2, RefreshCw, Sparkles, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, Building2,
  Star, Shield, Zap, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types/stock-analyzer.types';
import { C, cardStyle } from '@/constants/stock-analyzer.constants';
import { Card, SectionHeader } from '../ui';
import { isValid, fmtBig, fmtPct } from '@/utils/stock-analyzer.utils';

// =====================================================
// TYPES
// =====================================================

interface AnalystDetail {
  firm: string;
  analyst: string;
  rating: 'Strong Buy' | 'Buy' | 'Overweight' | 'Hold' | 'Underweight' | 'Sell' | 'Strong Sell';
  priceTarget: number;
  previousTarget: number | null;
  date: string;
  change: 'upgrade' | 'downgrade' | 'reiterated' | 'initiated';
}

interface ScoreBreakdown {
  valuation: number;       // 0-20: P/E, P/S, P/B, EV/EBITDA vs sector
  earningsSurprise: number; // 0-20: recent beats/misses, magnitude
  wallStreetDelivery: number; // 0-20: guidance vs actual, consistency
  growth: number;          // 0-20: revenue/EPS growth trajectory
  momentum: number;        // 0-20: analyst upgrades, PT raises, sentiment shift
  total: number;           // 0-100 aggregate
  grade: string;           // A+ through F
  label: string;           // "Strong Buy" etc
  rationale: string;       // 2-3 sentence explanation
}

interface SentimentPoint {
  period: string;          // "Q1 2024", "Q2 2024" etc
  buyPct: number;          // % of analysts with buy
  holdPct: number;
  sellPct: number;
  avgTarget: number;
  sentiment: number;       // -100 to +100
  keyEvent: string;        // "Beat Q1 earnings" etc
}

interface WallStreetAIData {
  analysts: AnalystDetail[];
  score: ScoreBreakdown;
  sentimentTrend: SentimentPoint[];
  topBull: { firm: string; target: number; thesis: string };
  topBear: { firm: string; target: number; thesis: string };
  surpriseHistory: { quarter: string; epsExpected: string; epsActual: string; surprise: string; beat: boolean }[];
  consensusShift: string; // "improving" | "deteriorating" | "stable"
}

// =====================================================
// CACHE
// =====================================================

const wallStreetCache = new Map<string, { data: WallStreetAIData; generatedAt: string }>();

// =====================================================
// FINOTAUR SCORE CALCULATOR (client-side from data)
// =====================================================

function computeClientScore(data: StockData): Partial<ScoreBreakdown> {
  let valuation = 10;
  if (isValid(data.pe)) {
    if (data.pe! < 15) valuation = 18;
    else if (data.pe! < 25) valuation = 14;
    else if (data.pe! < 40) valuation = 10;
    else if (data.pe! < 60) valuation = 6;
    else valuation = 3;
  }
  if (isValid(data.pb) && data.pb! < 3) valuation = Math.min(20, valuation + 2);
  if (isValid(data.evEbitda) && data.evEbitda! < 15) valuation = Math.min(20, valuation + 2);

  let growth = 10;
  if (isValid(data.revenueGrowth)) {
    if (data.revenueGrowth! > 25) growth = 18;
    else if (data.revenueGrowth! > 15) growth = 15;
    else if (data.revenueGrowth! > 5) growth = 12;
    else if (data.revenueGrowth! > 0) growth = 8;
    else growth = 4;
  }
  if (isValid(data.epsGrowth) && data.epsGrowth! > 10) growth = Math.min(20, growth + 3);

  let momentum = 10;
  if (data.analystBreakdown) {
    const ab = data.analystBreakdown;
    const buyRatio = (ab.strongBuy + ab.buy) / Math.max(ab.total, 1);
    momentum = Math.round(buyRatio * 20);
  }

  return { valuation, growth, momentum };
}

// =====================================================
// AI PROMPT
// =====================================================

const buildWallStreetPrompt = (data: StockData) => {
  const ab = data.analystBreakdown;
  return `Analyze Wall Street coverage for ${data.name} (${data.ticker}).

Current data: Price: $${data.price.toFixed(2)} | P/E: ${data.pe?.toFixed(1) || 'N/A'} | Forward P/E: ${data.forwardPe?.toFixed(1) || 'N/A'} | P/S: ${data.ps?.toFixed(1) || 'N/A'} | P/B: ${data.pb?.toFixed(1) || 'N/A'} | EV/EBITDA: ${data.evEbitda?.toFixed(1) || 'N/A'} | PEG: ${data.pegRatio?.toFixed(2) || 'N/A'} | Revenue Growth: ${data.revenueGrowth?.toFixed(1) || 'N/A'}% | EPS Growth: ${data.epsGrowth?.toFixed(1) || 'N/A'}% | Gross Margin: ${data.grossMargin?.toFixed(1) || 'N/A'}% | Net Margin: ${data.netMargin?.toFixed(1) || 'N/A'}% | ROE: ${data.roe?.toFixed(1) || 'N/A'}% | D/E: ${data.debtToEquity?.toFixed(2) || 'N/A'} | FCF Yield: ${data.fcfYield?.toFixed(1) || 'N/A'}% | Analyst Consensus: ${data.analystRating || 'N/A'} | # Analysts: ${data.numberOfAnalysts} | Breakdown: SB:${ab?.strongBuy || 0} B:${ab?.buy || 0} H:${ab?.hold || 0} S:${ab?.sell || 0} SS:${ab?.strongSell || 0} | PT: $${data.priceTarget?.toFixed(0) || 'N/A'} (Low: $${data.priceTargetLow?.toFixed(0) || 'N/A'} / High: $${data.priceTargetHigh?.toFixed(0) || 'N/A'}) | Market Cap: ${data.marketCap ? fmtBig(data.marketCap) : 'N/A'} | Sector: ${data.sector}

SEARCH THE WEB for: ${data.ticker} analyst ratings upgrades downgrades 2025, ${data.ticker} price target changes analyst name, ${data.ticker} earnings surprise history EPS beat miss, ${data.ticker} Wall Street coverage analyst recommendations recent, ${data.ticker} stock rating changes site:tipranks.com OR site:marketbeat.com OR site:benzinga.com

Return ONLY a valid JSON object with NO markdown, NO backticks, NO preamble:
{
  "analysts": [
    { "firm": "Goldman Sachs", "analyst": "John Smith", "rating": "Buy", "priceTarget": 220, "previousTarget": 200, "date": "Jan 15, 2025", "change": "upgrade" },
    { "firm": "Morgan Stanley", "analyst": "Jane Doe", "rating": "Overweight", "priceTarget": 215, "previousTarget": 210, "date": "Jan 10, 2025", "change": "reiterated" }
  ],
  "score": {
    "valuation": 14,
    "earningsSurprise": 17,
    "wallStreetDelivery": 15,
    "growth": 16,
    "momentum": 13,
    "total": 75,
    "grade": "B+",
    "label": "Outperform",
    "rationale": "2-3 sentences explaining the FINOTAUR score. Reference specific multiples (P/E vs sector avg, PEG ratio quality), earnings surprise consistency (how many consecutive beats), whether company systematically under-promises and over-delivers to Wall Street, and the trajectory of analyst upgrades vs downgrades."
  },
  "sentimentTrend": [
    { "period": "Q1 2024", "buyPct": 60, "holdPct": 30, "sellPct": 10, "avgTarget": 180, "sentiment": 40, "keyEvent": "Beat Q1 estimates" },
    { "period": "Q2 2024", "buyPct": 65, "holdPct": 28, "sellPct": 7, "avgTarget": 195, "sentiment": 55, "keyEvent": "Raised guidance" },
    { "period": "Q3 2024", "buyPct": 62, "holdPct": 30, "sellPct": 8, "avgTarget": 200, "sentiment": 50, "keyEvent": "In-line Q3" },
    { "period": "Q4 2024", "buyPct": 70, "holdPct": 22, "sellPct": 8, "avgTarget": 210, "sentiment": 60, "keyEvent": "Strong holiday season" },
    { "period": "Q1 2025", "buyPct": 68, "holdPct": 25, "sellPct": 7, "avgTarget": 215, "sentiment": 58, "keyEvent": "AI strategy update" }
  ],
  "topBull": { "firm": "Goldman Sachs", "target": 250, "thesis": "1-2 sentence bull thesis" },
  "topBear": { "firm": "Bernstein", "target": 150, "thesis": "1-2 sentence bear thesis" },
  "surpriseHistory": [
    { "quarter": "Q4 2024", "epsExpected": "$2.00", "epsActual": "$2.15", "surprise": "+7.5%", "beat": true },
    { "quarter": "Q3 2024", "epsExpected": "$1.85", "epsActual": "$1.90", "surprise": "+2.7%", "beat": true },
    { "quarter": "Q2 2024", "epsExpected": "$1.75", "epsActual": "$1.82", "surprise": "+4.0%", "beat": true },
    { "quarter": "Q1 2024", "epsExpected": "$1.60", "epsActual": "$1.55", "surprise": "-3.1%", "beat": false }
  ],
  "consensusShift": "improving"
}

SCORING METHODOLOGY for FINOTAUR Score (0-100):
- Valuation (0-20): Compare P/E, P/S, P/B, EV/EBITDA to sector averages. Lower multiples relative to growth = higher score. PEG < 1 is excellent. Negative earnings gets 0.
- Earnings Surprise (0-20): Last 4 quarters of EPS beats/misses. Consecutive beats = higher. Magnitude of surprise matters. 4/4 beats with >5% avg surprise = 18-20.
- Wall Street Delivery (0-20): Does management consistently meet or beat guidance? Do they under-promise and over-deliver? Raised guidance = bonus points. Missed guidance = heavy penalty.
- Growth (0-20): Revenue and EPS growth trajectory. Accelerating growth = bonus. Decelerating = penalty. Compare to sector peers.
- Momentum (0-20): Net upgrades vs downgrades last 6 months. Rising price targets. Improving buy ratio. New coverage initiations at Buy = positive.

IMPORTANT:
- Include 8-15 real analyst ratings from major firms (Goldman, Morgan Stanley, JPMorgan, BofA, Citi, Barclays, UBS, Deutsche Bank, Wells Fargo, RBC, Jefferies, Piper Sandler, Wedbush, Stifel, Bernstein, Mizuho, Canaccord, KeyBanc, Oppenheimer, Raymond James, etc.)
- EVERY analyst entry MUST have the REAL analyst name — NEVER use "Unknown", "N/A", "TBD", or any placeholder. If you cannot find the specific analyst name for a firm, DO NOT include that firm. Only include entries where you have BOTH the real firm name AND the real analyst name.
- Use REAL, VERIFIED data from web search results. Do NOT fabricate or hallucinate analyst names, ratings, price targets, or dates.
- sentimentTrend should cover last 5 quarters showing how analyst tone has shifted with real events.
- surpriseHistory should cover last 4 quarters of REAL actual EPS vs consensus expected EPS.
- All data must be sourced from real, recent analyst actions found via web search. Quality over quantity — 6 real entries are better than 15 with fake names.`;
};

// =====================================================
// FETCH WALL STREET AI DATA
// =====================================================

async function fetchWallStreetData(
  data: StockData,
  signal?: AbortSignal
): Promise<WallStreetAIData> {
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const response = await fetch(`${API_BASE}/api/ai-proxy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      prompt: buildWallStreetPrompt(data),
      system: 'You are a senior equity research analyst with access to real market data. Return ONLY valid JSON with no markdown formatting, no backticks, no explanation. Just the raw JSON object. CRITICAL: Every analyst entry must include the REAL analyst name — never use "Unknown" or placeholders. If you do not know the analyst name, omit that entry entirely.',
      useWebSearch: true,
      maxTokens: 4000,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `API error: ${response.status}`);
  }

  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'AI analysis failed');

  const text = result.content || '';
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);

  // Strip citations
  const strip = (obj: any): any => {
    if (typeof obj === 'string') return obj.replace(/\s*\[\d+\]/g, '').trim();
    if (Array.isArray(obj)) return obj.map(strip);
    if (obj && typeof obj === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) out[k] = strip(v);
      return out;
    }
    return obj;
  };

  const stripped = strip(parsed) as WallStreetAIData;

  // Filter out any analyst entries with Unknown/N/A/TBD names
  if (stripped.analysts) {
    stripped.analysts = stripped.analysts.filter(a =>
      a.analyst &&
      !['unknown', 'n/a', 'tbd', 'not available', 'undisclosed'].includes(a.analyst.toLowerCase().trim())
    );
  }

  return stripped;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

// --- FINOTAUR Score Ring ---
const ScoreRing = memo(({ score, grade, label }: { score: number; grade: string; label: string }) => {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? '#22C55E' :
    score >= 60 ? '#C9A646' :
    score >= 40 ? '#F59E0B' :
    '#EF4444';

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
        {/* Background track */}
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        {/* Score arc */}
        <circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        {/* Glow */}
        <circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 6px ${color}40)`, transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white">{score}</span>
        <span className="text-xs font-bold mt-0.5" style={{ color }}>{grade}</span>
      </div>
    </div>
  );
});
ScoreRing.displayName = 'ScoreRing';

// --- Score Breakdown Bar ---
const ScoreBar = memo(({ label, value, max = 20, icon: Icon }: { label: string; value: number; max?: number; icon: any }) => {
  const pct = (value / max) * 100;
  const color =
    pct >= 80 ? '#22C55E' :
    pct >= 60 ? '#C9A646' :
    pct >= 40 ? '#F59E0B' :
    '#EF4444';

  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-[#8B8B8B]">{label}</span>
          <span className="text-xs font-bold" style={{ color }}>{value}/{max}</span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }}
          />
        </div>
      </div>
    </div>
  );
});
ScoreBar.displayName = 'ScoreBar';

// --- Analyst Row ---
const AnalystRow = memo(({ analyst }: { analyst: AnalystDetail }) => {
  const ratingColor: Record<string, string> = {
    'Strong Buy': '#166534', 'Buy': '#22C55E', 'Overweight': '#22C55E',
    'Hold': '#F59E0B', 'Underweight': '#EF4444', 'Sell': '#EF4444', 'Strong Sell': '#991B1B',
  };
  const changeIcon = analyst.change === 'upgrade'
    ? <ArrowUpRight className="w-3 h-3 text-[#22C55E]" />
    : analyst.change === 'downgrade'
    ? <ArrowDownRight className="w-3 h-3 text-[#EF4444]" />
    : <Minus className="w-3 h-3 text-[#8B8B8B]" />;
  const changeBg = analyst.change === 'upgrade'
    ? 'rgba(34,197,94,0.08)' : analyst.change === 'downgrade'
    ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)';
  const color = ratingColor[analyst.rating] || '#8B8B8B';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0" style={{ background: changeBg }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.04]">
        <Building2 className="w-4 h-4 text-[#6B6B6B]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{analyst.firm}</span>
          {changeIcon}
          <span className="text-[10px] text-[#6B6B6B] capitalize">{analyst.change}</span>
        </div>
        <span className="text-[11px] text-[#6B6B6B]">{analyst.analyst} · {analyst.date}</span>
      </div>
      <div className="text-right shrink-0">
        <span
          className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold"
          style={{ background: `${color}18`, color, border: `1px solid ${color}25` }}
        >
          {analyst.rating}
        </span>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-xs font-semibold text-white">${analyst.priceTarget}</span>
          {analyst.previousTarget && (
            <span className="text-[10px] text-[#6B6B6B] line-through">${analyst.previousTarget}</span>
          )}
        </div>
      </div>
    </div>
  );
});
AnalystRow.displayName = 'AnalystRow';

// --- Sentiment Trend Chart (Elegant line + dynamic scale) ---
const SentimentChart = memo(({ data }: { data: SentimentPoint[] }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length < 2) return null;

  const W = 640, H = 240;
  const padL = 48, padR = 52, padT = 35, padB = 44;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Dynamic Y scale based on actual buyPct range (not fixed -100 to 100)
  const buyVals = data.map(d => d.buyPct);
  const minBuy = Math.floor(Math.min(...buyVals) / 5) * 5 - 5;
  const maxBuy = Math.ceil(Math.max(...buyVals) / 5) * 5 + 5;
  const buyRange = maxBuy - minBuy || 10;

  // Avg PT range for right axis
  const targets = data.map(d => d.avgTarget);
  const minPT = Math.floor(Math.min(...targets) * 0.95);
  const maxPT = Math.ceil(Math.max(...targets) * 1.05);
  const ptRange = maxPT - minPT || 1;

  const getX = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const getBuyY = (v: number) => padT + chartH - ((v - minBuy) / buyRange) * chartH;
  const getPtY = (v: number) => padT + chartH - ((v - minPT) / ptRange) * chartH;

  // Smooth curve helper
  const smooth = (pts: { x: number; y: number }[]) =>
    pts.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      const prev = pts[i - 1];
      const cpx = ((prev.x + p.x) / 2).toFixed(1);
      return `${acc} C ${cpx} ${prev.y.toFixed(1)} ${cpx} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }, '');

  // Buy % line points
  const buyPoints = data.map((d, i) => ({ x: getX(i), y: getBuyY(d.buyPct) }));
  const buyLine = smooth(buyPoints);
  const buyArea = `${buyLine} L ${buyPoints[buyPoints.length - 1].x.toFixed(1)} ${(padT + chartH).toFixed(1)} L ${buyPoints[0].x.toFixed(1)} ${(padT + chartH).toFixed(1)} Z`;

  // PT line points
  const ptPoints = data.map((d, i) => ({ x: getX(i), y: getPtY(d.avgTarget) }));
  const ptLine = smooth(ptPoints);

  // Y grid values
  const ySteps = 4;
  const yGridVals = Array.from({ length: ySteps + 1 }, (_, i) => minBuy + (buyRange / ySteps) * i);

  // Hover zone width per data point
  const zoneW = chartW / (data.length - 1);

  // Tooltip dimensions & positioning
  const tooltipW = 155;
  const tooltipH = 82;
  const hd = hoverIdx != null ? data[hoverIdx] : null;
  const hx = hoverIdx != null ? getX(hoverIdx) : 0;
  const tooltipX = hoverIdx != null
    ? (hx + tooltipW + 15 > W ? hx - tooltipW - 10 : hx + 10)
    : 0;
  const tooltipY = hoverIdx != null
    ? Math.max(padT, Math.min(buyPoints[hoverIdx].y - tooltipH / 2, padT + chartH - tooltipH))
    : 0;

  return (
    <div className="space-y-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: '260px', cursor: 'crosshair' }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="buyAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A646" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#C9A646" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="ptLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0.8" />
          </linearGradient>
          <filter id="goldGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {yGridVals.map((v, i) => {
          const y = getBuyY(v);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 6" />
              <text x={padL - 8} y={y + 3} textAnchor="end" fill="#4A4A4A" fontSize="9">{Math.round(v)}%</text>
            </g>
          );
        })}

        {/* Buy % area fill */}
        <path d={buyArea} fill="url(#buyAreaGrad)" />

        {/* Buy % line */}
        <path d={buyLine} fill="none" stroke="#C9A646" strokeWidth="2.5" strokeLinecap="round" filter="url(#goldGlow)" />

        {/* PT dashed line */}
        <path d={ptLine} fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="6 4" opacity="0.6" />

        {/* Hover vertical line */}
        {hoverIdx != null && (
          <line
            x1={hx} y1={padT} x2={hx} y2={padT + chartH}
            stroke="rgba(201,166,70,0.25)" strokeWidth="1" strokeDasharray="3,4"
          />
        )}

        {/* Data points — show dots always, labels only on hover or last point */}
        {buyPoints.map((p, i) => {
          const isHovered = hoverIdx === i;
          const isLast = i === data.length - 1;
          const showLabel = isHovered || (hoverIdx == null && isLast);
          const dotR = isHovered ? 6 : 4.5;
          const ptDotR = isHovered ? 4 : 2.5;

          return (
            <g key={i}>
              {/* Buy dot — outer glow on hover */}
              {isHovered && (
                <circle cx={p.x} cy={p.y} r="10" fill="#C9A646" opacity="0.15" />
              )}
              <circle cx={p.x} cy={p.y} r={dotR} fill="#0a0a0a" stroke="#C9A646" strokeWidth="2" />
              <circle cx={p.x} cy={p.y} r={dotR - 2} fill="#C9A646" />

              {/* Buy % label — only when hovered or last point with no hover */}
              {showLabel && (
                <text x={p.x} y={p.y - 14} textAnchor="middle" fill="#C9A646" fontSize="11" fontWeight="700">
                  {data[i].buyPct}% Buy
                </text>
              )}

              {/* PT dot */}
              {isHovered && (
                <circle cx={ptPoints[i].x} cy={ptPoints[i].y} r="7" fill="#22C55E" opacity="0.15" />
              )}
              <circle cx={ptPoints[i].x} cy={ptPoints[i].y} r={ptDotR} fill="#0a0a0a" stroke="#22C55E" strokeWidth="1.5" opacity={isHovered ? 1 : 0.5} />

              {/* X axis label */}
              <text x={p.x} y={H - 10} textAnchor="middle" fill={isHovered ? '#E8DCC4' : '#6B6B6B'} fontSize="10" fontWeight={isHovered ? '700' : '400'}>{data[i].period}</text>
            </g>
          );
        })}

        {/* Right axis: PT values — highlight hovered */}
        {ptPoints.map((p, i) => (
          <text
            key={`pt-${i}`}
            x={W - padR + 8}
            y={p.y + 4}
            textAnchor="start"
            fill="#22C55E"
            fontSize="9"
            opacity={hoverIdx === i ? 1 : (hoverIdx != null ? 0.3 : 0.6)}
            fontWeight={hoverIdx === i ? '700' : '400'}
          >
            ${targets[i]}
          </text>
        ))}

        {/* Axis labels */}
        <text x={padL - 8} y={padT - 12} textAnchor="start" fill="#6B6B6B" fontSize="8">Buy %</text>
        <text x={W - padR + 8} y={padT - 12} textAnchor="start" fill="#22C55E" fontSize="8" opacity="0.5">Avg PT</text>

        {/* Legend */}
        <g transform={`translate(${padL + chartW / 2 - 80}, ${H - 2})`}>
          <line x1="0" y1="-4" x2="14" y2="-4" stroke="#C9A646" strokeWidth="2.5" strokeLinecap="round" />
          <text x="18" y="0" fill="#8B8B8B" fontSize="9">Buy Ratio</text>
          <line x1="78" y1="-4" x2="92" y2="-4" stroke="#22C55E" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
          <text x="96" y="0" fill="#8B8B8B" fontSize="9">Price Target</text>
        </g>

        {/* ── Tooltip ── */}
        {hoverIdx != null && hd && (
          <g>
            <rect
              x={tooltipX} y={tooltipY}
              width={tooltipW} height={tooltipH}
              rx="8" fill="rgba(12,12,14,0.95)"
              stroke="rgba(201,166,70,0.2)" strokeWidth="0.75"
            />
            <text x={tooltipX + tooltipW / 2} y={tooltipY + 15} fill="#C9A646" fontSize="10" fontWeight="700" textAnchor="middle">
              {hd.period}
            </text>
            <line x1={tooltipX + 10} y1={tooltipY + 21} x2={tooltipX + tooltipW - 10} y2={tooltipY + 21}
              stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            <circle cx={tooltipX + 14} cy={tooltipY + 33} r="3" fill="#C9A646" />
            <text x={tooltipX + 22} y={tooltipY + 36} fill="#8B8B8B" fontSize="8.5">Buy</text>
            <text x={tooltipX + tooltipW - 12} y={tooltipY + 36} fill="#C9A646" fontSize="9" fontWeight="700" textAnchor="end">
              {hd.buyPct}%
            </text>
            <circle cx={tooltipX + 14} cy={tooltipY + 46} r="3" fill="#F59E0B" />
            <text x={tooltipX + 22} y={tooltipY + 49} fill="#8B8B8B" fontSize="8.5">Hold</text>
            <text x={tooltipX + tooltipW - 12} y={tooltipY + 49} fill="#F59E0B" fontSize="9" fontWeight="700" textAnchor="end">
              {hd.holdPct}%
            </text>
            <circle cx={tooltipX + 14} cy={tooltipY + 59} r="3" fill="#EF4444" />
            <text x={tooltipX + 22} y={tooltipY + 62} fill="#8B8B8B" fontSize="8.5">Sell</text>
            <text x={tooltipX + tooltipW - 12} y={tooltipY + 62} fill="#EF4444" fontSize="9" fontWeight="700" textAnchor="end">
              {hd.sellPct}%
            </text>
            <circle cx={tooltipX + 14} cy={tooltipY + 72} r="3" fill="#22C55E" />
            <text x={tooltipX + 22} y={tooltipY + 75} fill="#8B8B8B" fontSize="8.5">Avg PT</text>
            <text x={tooltipX + tooltipW - 12} y={tooltipY + 75} fill="#22C55E" fontSize="9" fontWeight="700" textAnchor="end">
              ${hd.avgTarget}
            </text>
          </g>
        )}

        {/* Invisible hover zones — must be LAST so they sit on top */}
        {data.map((_, i) => (
          <rect
            key={`hz-${i}`}
            x={getX(i) - zoneW / 2}
            y={padT - 5}
            width={zoneW}
            height={chartH + padB + 5}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}
      </svg>

      {/* Summary stats */}
      {(() => {
        const first = data[0];
        const last = data[data.length - 1];
        const buyDelta = last.buyPct - first.buyPct;
        const ptDelta = last.avgTarget - first.avgTarget;
        const ptDeltaPct = (ptDelta / first.avgTarget) * 100;
        return (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] text-[#6B6B6B] mb-1">Buy Ratio Shift</p>
              <p className={cn("text-base font-bold", buyDelta >= 0 ? "text-[#22C55E]" : "text-[#EF4444]")}>
                {buyDelta >= 0 ? '+' : ''}{buyDelta}pp
              </p>
              <p className="text-[10px] text-[#6B6B6B]">{first.buyPct}% → {last.buyPct}%</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] text-[#6B6B6B] mb-1">Avg PT Move</p>
              <p className={cn("text-base font-bold", ptDelta >= 0 ? "text-[#22C55E]" : "text-[#EF4444]")}>
                {ptDelta >= 0 ? '+' : ''}{ptDeltaPct.toFixed(1)}%
              </p>
              <p className="text-[10px] text-[#6B6B6B]">${first.avgTarget} → ${last.avgTarget}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] text-[#6B6B6B] mb-1">Current Sell %</p>
              <p className={cn("text-base font-bold", last.sellPct <= 10 ? "text-[#22C55E]" : last.sellPct <= 20 ? "text-[#F59E0B]" : "text-[#EF4444]")}>
                {last.sellPct}%
              </p>
              <p className="text-[10px] text-[#6B6B6B]">
                {last.sellPct < first.sellPct ? 'Bears fading' : last.sellPct > first.sellPct ? 'Bears rising' : 'Stable'}
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
});
SentimentChart.displayName = 'SentimentChart';

// --- Surprise History Row ---
const SurpriseRow = memo(({ item }: { item: { quarter: string; epsExpected: string; epsActual: string; surprise: string; beat: boolean } }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
    <span className="text-sm text-[#8B8B8B] w-20 shrink-0 font-medium">{item.quarter}</span>
    <div className="text-center">
      <p className="text-[10px] text-[#6B6B6B]">Expected</p>
      <p className="text-sm text-[#8B8B8B] font-medium">{item.epsExpected}</p>
    </div>
    <div className="text-center">
      <p className="text-[10px] text-[#6B6B6B]">Actual</p>
      <p className="text-sm text-white font-semibold">{item.epsActual}</p>
    </div>
    <div className={cn(
      "px-3 py-1.5 rounded-md text-xs font-bold min-w-[70px] text-center",
      item.beat ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#EF4444]/10 text-[#EF4444]"
    )}>
      {item.surprise}
    </div>
  </div>
));
SurpriseRow.displayName = 'SurpriseRow';

// --- Loading Skeleton ---
const WallStreetLoadingSkeleton = memo(() => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map(i => (
      <div key={i} className="rounded-2xl h-48" style={{ background: 'rgba(201,166,70,0.03)', border: '1px solid rgba(201,166,70,0.08)' }} />
    ))}
  </div>
));
WallStreetLoadingSkeleton.displayName = 'WallStreetLoadingSkeleton';

// =====================================================
// MAIN COMPONENT
// =====================================================

export const WallStreetTab = memo(({ data, prefetchedData }: { data: StockData; prefetchedData?: any }) => {
  const ab = data.analystBreakdown;
  const hasPT = isValid(data.priceTarget) && isValid(data.priceTargetHigh) && isValid(data.priceTargetLow);
  const upside = hasPT && data.price > 0 ? ((data.priceTarget! - data.price) / data.price) * 100 : 0;
  const ptRange = hasPT ? data.priceTargetHigh! - data.priceTargetLow! : 1;
  const ptPosition = hasPT && ptRange > 0 ? ((data.price - data.priceTargetLow!) / ptRange) * 100 : 50;

  // AI State
  const [aiData, setAiData] = useState<WallStreetAIData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllAnalysts, setShowAllAnalysts] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const tickerRef = useRef(data.ticker);

  const generate = useCallback(async (force = false) => {
    const ticker = data.ticker;
    if (!force && wallStreetCache.has(ticker)) {
      setAiData(wallStreetCache.get(ticker)!.data);
      return;
    }

    // 2. PREFETCHED or SERVER cache
    if (!force) {
      try {
        const serverCached = prefetchedData || await (async () => {
          const res = await fetch(`/api/stock-cache/${ticker}/wallstreet`);
          if (!res.ok) return null;
          const json = await res.json();
          return (json.success && json.cached && json.data) ? json.data : null;
        })();
        if (serverCached) {
          console.log(`[WallStreet] ⚡ ${prefetchedData ? 'PREFETCHED' : 'SERVER CACHE'} HIT for ${ticker}`);
          wallStreetCache.set(ticker, { data: serverCached, generatedAt: new Date().toISOString() });
          if (tickerRef.current === ticker) setAiData(serverCached);
          return;
        }
      } catch { /* continue to generate */ }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchWallStreetData(data, controller.signal);
      wallStreetCache.set(ticker, { data: result, generatedAt: new Date().toISOString() });
      // Save to server for next user!
      try {
        await fetch(`/api/stock-cache/${ticker}/wallstreet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallStreetData: result, earningsDate: data.nextEarningsDate || null }),
        });
      } catch { /* non-critical */ }
      if (tickerRef.current === ticker) {
        setAiData(result);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[WallStreetTab] AI fetch error:', err);
        if (tickerRef.current === ticker) {
          setError(err.message || 'Failed to load analyst data');
        }
      }
    } finally {
      if (tickerRef.current === ticker) {
        setIsLoading(false);
      }
    }
  }, [data, prefetchedData]);

  useEffect(() => {
    tickerRef.current = data.ticker;
    generate();
    return () => { abortRef.current?.abort(); };
  }, [data.ticker, generate]);

  // Merge AI score with client-side calculations
  const clientScore = computeClientScore(data);

  const displayedAnalysts = aiData?.analysts
    ? (showAllAnalysts ? aiData.analysts : aiData.analysts.slice(0, 6))
    : [];

  return (
    <div className="space-y-4">
      {/* ============================================= */}
      {/* 1. Analyst Consensus (original, enhanced) */}
      {/* ============================================= */}
      <Card gold>
        <div className="p-6">
          <SectionHeader icon={Award} title="Analyst Consensus" subtitle={`Based on ${data.numberOfAnalysts} analyst ratings`} />
          {ab && ab.total > 0 ? (
            <div className="space-y-6">
              <div>
                <div className="flex h-8 rounded-lg overflow-hidden">
                  {[
                    { val: ab.strongBuy, color: '#166534', label: 'Strong Buy' },
                    { val: ab.buy, color: '#22C55E', label: 'Buy' },
                    { val: ab.hold, color: '#F59E0B', label: 'Hold' },
                    { val: ab.sell, color: '#EF4444', label: 'Sell' },
                    { val: ab.strongSell, color: '#991B1B', label: 'Strong Sell' },
                  ].filter(r => r.val > 0).map((r) => (
                    <div key={r.label} className="flex items-center justify-center text-xs font-semibold text-white"
                      style={{ width: `${(r.val / ab.total) * 100}%`, background: r.color, minWidth: r.val > 0 ? '28px' : 0 }}>
                      {r.val}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-[#22C55E]">Buy: {ab.strongBuy + ab.buy}</span>
                  <span className="text-xs text-[#F59E0B]">Hold: {ab.hold}</span>
                  <span className="text-xs text-[#EF4444]">Sell: {ab.sell + ab.strongSell}</span>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className={cn("px-6 py-3 rounded-xl text-lg font-bold",
                  data.analystRating?.includes('Buy') ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20" :
                  data.analystRating === 'Hold' ? "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20" :
                  "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20"
                )}>
                  {data.analystRating || 'N/A'}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-[#6B6B6B] py-8">Analyst data not available for this ticker.</p>
          )}
        </div>
      </Card>

      {/* ============================================= */}
      {/* 2. Price Target */}
      {/* ============================================= */}
      {hasPT && (
        <Card>
          <div className="p-6">
            <SectionHeader icon={Target} title="Price Target Distribution" />
            <div className="flex items-center gap-8">
              <div className="flex-1">
                <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(90deg, #EF4444, #F59E0B, #22C55E)' }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#C9A646] shadow-lg transition-all"
                    style={{ left: `calc(${Math.min(Math.max(ptPosition, 2), 98)}% - 8px)` }} />
                </div>
                <div className="flex justify-between mt-3 text-xs">
                  <span className="text-[#EF4444]">${data.priceTargetLow!.toFixed(0)}</span>
                  <span className="text-[#C9A646] font-semibold">Target: ${data.priceTarget!.toFixed(0)}</span>
                  <span className="text-[#22C55E]">${data.priceTargetHigh!.toFixed(0)}</span>
                </div>
              </div>
              <div className={cn("text-center px-6 py-4 rounded-xl border",
                upside >= 0 ? "bg-[#22C55E]/10 border-[#22C55E]/20" : "bg-[#EF4444]/10 border-[#EF4444]/20"
              )}>
                <p className={cn("text-3xl font-bold", upside >= 0 ? "text-[#22C55E]" : "text-[#EF4444]")}>
                  {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
                </p>
                <p className={cn("text-xs", upside >= 0 ? "text-[#22C55E]/70" : "text-[#EF4444]/70")}>
                  {upside >= 0 ? 'Upside' : 'Downside'} to Target
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ============================================= */}
      {/* AI-POWERED SECTIONS */}
      {/* ============================================= */}

      {/* Error state */}
      {error && !aiData && (
        <Card>
          <div className="p-6 text-center">
            <p className="text-sm text-[#EF4444] mb-3">{error}</p>
            <button
              onClick={() => generate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(201,166,70,0.08)', border: '1px solid rgba(201,166,70,0.15)', color: '#C9A646' }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && !aiData && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 py-3">
            <div className="w-5 h-5 rounded-full border-2 border-[#C9A646]/30 border-t-[#C9A646] animate-spin" />
            <span className="text-sm text-[#8B8B8B]">Analyzing {data.ticker} Wall Street coverage...</span>
          </div>
          <WallStreetLoadingSkeleton />
        </div>
      )}

      {/* ============================================= */}
      {/* 3. FINOTAUR Score */}
      {/* ============================================= */}
      {aiData?.score && (
        <Card gold>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #B8963F, #C9A646)' }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">FINOTAUR Score</h3>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#C9A646]/10 text-[#C9A646] border border-[#C9A646]/20">
                    AI-Powered
                  </span>
                </div>
                <p className="text-xs text-[#6B6B6B]">Proprietary composite rating · Multiples + Surprises + Delivery</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Score Ring */}
              <div className="flex flex-col items-center justify-center">
                <ScoreRing score={aiData.score.total} grade={aiData.score.grade} label={aiData.score.label} />
                <div className="mt-3 text-center">
                  <span
                    className="inline-block px-4 py-1.5 rounded-lg text-sm font-bold"
                    style={{
                      background: aiData.score.total >= 70 ? 'rgba(34,197,94,0.1)' : aiData.score.total >= 50 ? 'rgba(201,166,70,0.1)' : 'rgba(239,68,68,0.1)',
                      color: aiData.score.total >= 70 ? '#22C55E' : aiData.score.total >= 50 ? '#C9A646' : '#EF4444',
                      border: `1px solid ${aiData.score.total >= 70 ? 'rgba(34,197,94,0.2)' : aiData.score.total >= 50 ? 'rgba(201,166,70,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    }}
                  >
                    {aiData.score.label}
                  </span>
                </div>
              </div>

              {/* Breakdown Bars */}
              <div className="space-y-3">
                <ScoreBar label="Valuation" value={aiData.score.valuation} icon={BarChart3} />
                <ScoreBar label="Earnings Surprise" value={aiData.score.earningsSurprise} icon={Zap} />
                <ScoreBar label="Wall St. Delivery" value={aiData.score.wallStreetDelivery} icon={Shield} />
                <ScoreBar label="Growth Trajectory" value={aiData.score.growth} icon={TrendingUp} />
                <ScoreBar label="Analyst Momentum" value={aiData.score.momentum} icon={Star} />
              </div>
            </div>

            {/* Rationale */}
            {aiData.score.rationale && (
              <div
                className="mt-5 p-4 rounded-xl"
                style={{ background: 'rgba(201,166,70,0.04)', border: '1px solid rgba(201,166,70,0.1)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#C9A646]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#C9A646]">Score Rationale</span>
                </div>
                <p className="text-[13px] text-[#A0A0A0] leading-[1.85]">{aiData.score.rationale}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ============================================= */}
      {/* 4. Earnings Surprise History */}
      {/* ============================================= */}
      {aiData?.surpriseHistory && aiData.surpriseHistory.length > 0 && (
        <Card>
          <div className="p-6">
            <SectionHeader
              icon={Zap}
              title="Earnings Surprise History"
              subtitle={`${aiData.surpriseHistory.filter(s => s.beat).length}/${aiData.surpriseHistory.length} beats in recent quarters`}
            />
            <div>
              {aiData.surpriseHistory.map((item, i) => (
                <SurpriseRow key={i} item={item} />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ============================================= */}
      {/* 5. Analyst Detail Breakdown */}
      {/* ============================================= */}
      {aiData?.analysts && aiData.analysts.length > 0 && (
        <Card>
          <div className="p-6">
            <SectionHeader
              icon={Users}
              title="Analyst Ratings Detail"
              subtitle={`${aiData.analysts.length} covering analysts`}
              badge={aiData.consensusShift ? `Consensus ${aiData.consensusShift}` : undefined}
            />

            {/* Bull vs Bear */}
            {(aiData.topBull || aiData.topBear) && (
              <div className="grid grid-cols-2 gap-3 mb-5">
                {aiData.topBull && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="w-3.5 h-3.5 text-[#22C55E]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#22C55E]">Top Bull</span>
                    </div>
                    <p className="text-xs font-semibold text-white">{aiData.topBull.firm} — ${aiData.topBull.target}</p>
                    <p className="text-[11px] text-[#8B8B8B] mt-1 leading-relaxed">{aiData.topBull.thesis}</p>
                  </div>
                )}
                {aiData.topBear && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingDown className="w-3.5 h-3.5 text-[#EF4444]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#EF4444]">Top Bear</span>
                    </div>
                    <p className="text-xs font-semibold text-white">{aiData.topBear.firm} — ${aiData.topBear.target}</p>
                    <p className="text-[11px] text-[#8B8B8B] mt-1 leading-relaxed">{aiData.topBear.thesis}</p>
                  </div>
                )}
              </div>
            )}

            {/* Analyst list */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="px-3 py-2 flex items-center text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B] border-b border-white/[0.06]">
                <span className="flex-1">Firm / Analyst</span>
                <span className="w-28 text-right">Rating / PT</span>
              </div>
              {displayedAnalysts.map((a, i) => <AnalystRow key={i} analyst={a} />)}
            </div>

            {aiData.analysts.length > 6 && (
              <button
                onClick={() => setShowAllAnalysts(prev => !prev)}
                className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-[#C9A646] hover:bg-white/[0.03] transition-colors"
              >
                {showAllAnalysts ? (
                  <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>Show All {aiData.analysts.length} Analysts <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            )}
          </div>
        </Card>
      )}

      {/* ============================================= */}
      {/* 6. Analyst Sentiment Trend */}
      {/* ============================================= */}
      {aiData?.sentimentTrend && aiData.sentimentTrend.length >= 2 && (
        <Card>
          <div className="p-6">
            <SectionHeader
              icon={BarChart3}
              title="Analyst Sentiment Trend"
              subtitle="Buy / Hold / Sell distribution & avg price target over time"
              badge={aiData.consensusShift ? aiData.consensusShift.charAt(0).toUpperCase() + aiData.consensusShift.slice(1) : undefined}
            />
            <SentimentChart data={aiData.sentimentTrend} />

            {/* Key events timeline */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5A6E]">Key Catalysts</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {aiData.sentimentTrend.map((p, i) => {
                  const isPositive = p.sentiment > (i > 0 ? aiData.sentimentTrend[i - 1].sentiment : p.sentiment);
                  const isNegative = p.sentiment < (i > 0 ? aiData.sentimentTrend[i - 1].sentiment : p.sentiment);
                  return (
                    <div
                      key={i}
                      className="px-3 py-2 rounded-lg text-[10px] flex items-center gap-2"
                      style={{
                        background: isPositive ? 'rgba(34,197,94,0.04)' : isNegative ? 'rgba(239,68,68,0.04)' : 'rgba(201,166,70,0.04)',
                        border: `1px solid ${isPositive ? 'rgba(34,197,94,0.12)' : isNegative ? 'rgba(239,68,68,0.12)' : 'rgba(201,166,70,0.1)'}`,
                      }}
                    >
                      {isPositive ? <ArrowUpRight className="w-3 h-3 text-[#22C55E] shrink-0" /> :
                       isNegative ? <ArrowDownRight className="w-3 h-3 text-[#EF4444] shrink-0" /> :
                       <Minus className="w-3 h-3 text-[#C9A646] shrink-0" />}
                      <span>
                        <span className="font-semibold" style={{ color: isPositive ? '#22C55E' : isNegative ? '#EF4444' : '#C9A646' }}>
                          {p.period}
                        </span>
                        <span className="text-[#8B8B8B] ml-1">{p.keyEvent}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Regenerate */}
      {aiData && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => generate(true)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(201,166,70,0.08)', border: '1px solid rgba(201,166,70,0.15)', color: '#8B8B8B' }}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {isLoading ? 'Regenerating...' : 'Regenerate Wall Street Analysis'}
          </button>
        </div>
      )}
    </div>
  );
});

WallStreetTab.displayName = 'WallStreetTab';