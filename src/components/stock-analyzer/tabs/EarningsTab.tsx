// src/components/stock-analyzer/tabs/EarningsTab.tsx
// =====================================================
// 📊 EARNINGS TAB — AI-Powered Quarterly Earnings Analysis
// =====================================================
// Replaces: DividendsTab, NewsTab, RisksTab
// Features:
//   ✅ AI-generated earnings analysis via backend proxy
//   ✅ Verdict bar (Beat/Miss/Mixed)
//   ✅ Headline metrics (Revenue, EPS, Op Income, FCF)
//   ✅ Segment breakdown with visual bars
//   ✅ Forward guidance vs consensus
//   ✅ Earnings call key highlights
//   ✅ Post-earnings price action
//   ✅ AI Bottom Line summary
//   ✅ Caching per ticker
//   ✅ Loading states & error handling
// =====================================================

import { memo, useState, useEffect, useCallback, useRef, Fragment } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, AlertTriangle,
  Loader2, RefreshCw, ChevronDown, ChevronUp,
  Sparkles, Target, MessageSquareQuote, Activity,
  ArrowUpRight, ArrowDownRight, Minus, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types/stock-analyzer.types';
import { C, cardStyle } from '@/constants/stock-analyzer.constants';
import { Card, SectionHeader } from '../ui';
import { fmtBig, isValid } from '@/utils/stock-analyzer.utils';

// =====================================================
// TYPES
// =====================================================

interface EarningsMetric {
  label: string;
  actual: string;
  estimate: string;
  surprise: number; // percentage
  status: 'beat' | 'miss' | 'inline';
}

interface SegmentData {
  name: string;
  revenue: string;
  yoy: string;
  yoyPositive: boolean;
  margin: string;
  vsEstimate: 'beat' | 'miss' | 'inline';
  color: string;
  pct: number; // bar width percentage
}

interface QuarterlyComparisonRow {
  metric: string;
  values: { quarter: string; value: string; raw?: number }[];
  yoyChanges: { period: string; change: string; positive: boolean }[];
  format: 'currency' | 'per_share' | 'percent' | 'number';
}

interface QuarterlyComparison {
  currentQuarter: string;
  quarters: string[]; // e.g. ["Q4 2025", "Q4 2024", "Q4 2023", "Q4 2022"]
  rows: QuarterlyComparisonRow[];
}

interface GuidanceItem {
  label: string;
  low: string;
  high: string;
  consensus: string;
  signal: 'above' | 'below' | 'mixed';
}

interface EarningsHighlight {
  speaker: string;
  text: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  tag: string;
}

interface PriceAction {
  timeframe: string;
  move: string;
  positive: boolean;
  detail: string;
}

interface EarningsData {
  quarter: string;
  quarterRange: string;
  reportDate: string;
  verdict: 'beat' | 'miss' | 'mixed';
  verdictEmoji: string;
  verdictSummary: string;
  metrics: EarningsMetric[];
  segments: SegmentData[];
  quarterlyComparison?: QuarterlyComparison;
  guidance: GuidanceItem[];
  guidanceAnalysis: string;
  highlights: EarningsHighlight[];
  priceAction: PriceAction[];
  aiBottomLine: string;
  nextEarnings: string;
  impliedMove: string;
  rating: string;
}

// =====================================================
// CACHE
// =====================================================

const earningsCacheMap = new Map<string, { data: EarningsData; generatedAt: string }>();
const secFilingCacheMap = new Map<string, string>(); // ticker -> filing URL

// =====================================================
// AI PROMPT
// =====================================================

const buildEarningsPrompt = (data: StockData) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  let likelyQ: string;
  let likelyYear: number;
  if (currentMonth <= 2) { likelyQ = 'Q4'; likelyYear = currentYear - 1; }
  else if (currentMonth <= 5) { likelyQ = 'Q1'; likelyYear = currentYear; }
  else if (currentMonth <= 8) { likelyQ = 'Q2'; likelyYear = currentYear; }
  else { likelyQ = 'Q3'; likelyYear = currentYear; }
  const q1 = `${likelyQ} ${likelyYear}`;
  const q2 = `${likelyQ} ${likelyYear - 1}`;
  const q3 = `${likelyQ} ${likelyYear - 2}`;
  const q4 = `${likelyQ} ${likelyYear - 3}`;

  return `Analyze the MOST RECENT quarterly earnings for ${data.name} (${data.ticker}).

TODAY'S DATE: ${today.toISOString().split('T')[0]}. The most recently reported quarter is likely ${q1} (or the quarter just before it if not yet reported). Use the ACTUAL most recent quarter that has been reported — search the web to confirm.

Current data: Price: $${data.price.toFixed(2)} | P/E: ${data.pe?.toFixed(1) || 'N/A'} | Revenue: ${data.revenue ? fmtBig(data.revenue) : 'N/A'} | EPS: $${data.eps?.toFixed(2) || 'N/A'} | Market Cap: ${data.marketCap ? fmtBig(data.marketCap) : 'N/A'} | Next Earnings: ${data.nextEarningsDate || 'N/A'}

SEARCH THE WEB for: ${data.ticker} latest quarterly earnings results ${currentYear}, earnings call transcript highlights, revenue by segment, forward guidance, post-earnings stock price movement, analyst reactions.

Return ONLY a valid JSON object with NO markdown, NO backticks, NO preamble. Use this exact structure:
{
  "quarter": "${q1}",
  "quarterRange": "Oct–Dec ${likelyYear}",
  "reportDate": "Feb 5, ${currentYear}",
  "verdict": "beat" | "miss" | "mixed",
  "verdictSummary": "One sentence summary of earnings result with key numbers",
  "metrics": [
    { "label": "Revenue", "actual": "$213.4B", "estimate": "$211.5B", "surprise": 0.9, "status": "beat" },
    { "label": "EPS", "actual": "$1.95", "estimate": "$2.06", "surprise": -5.3, "status": "miss" },
    { "label": "Op. Income", "actual": "$21.3B", "estimate": "$18.8B", "surprise": 13.3, "status": "beat" },
    { "label": "Free Cash Flow", "actual": "$39.5B", "estimate": "$35.0B", "surprise": 12.9, "status": "beat" }
  ],
  "segments": [
    { "name": "North America", "revenue": "$95.5B", "yoy": "+10.2%", "yoyPositive": true, "margin": "5.1%", "vsEstimate": "beat", "color": "#3B82F6", "pct": 42 },
    { "name": "International", "revenue": "$43.4B", "yoy": "+9.0%", "yoyPositive": true, "margin": "3.5%", "vsEstimate": "beat", "color": "#8B5CF6", "pct": 24 }
  ],
  "quarterlyComparison": {
    "currentQuarter": "${q1}",
    "quarters": ["${q1}", "${q2}", "${q3}", "${q4}"],
    "rows": [
      { "metric": "## Income Statement", "values": [], "yoyChanges": [], "format": "currency" },
      { "metric": "Revenue", "values": [{"quarter":"${q1}","value":"$7.7B"},{"quarter":"${q2}","value":"$6.2B"},{"quarter":"${q3}","value":"$5.6B"},{"quarter":"${q4}","value":"$4.8B"}], "yoyChanges": [{"period":"${q1} vs ${q2}","change":"+24%","positive":true},{"period":"${q2} vs ${q3}","change":"+11%","positive":true},{"period":"${q3} vs ${q4}","change":"+17%","positive":true}], "format": "currency" },
      { "metric": "Gross Profit", "values": [{"quarter":"${q1}","value":"$4.1B"},{"quarter":"${q2}","value":"$3.1B"},{"quarter":"${q3}","value":"$2.7B"},{"quarter":"${q4}","value":"$2.2B"}], "yoyChanges": [{"period":"${q1} vs ${q2}","change":"+32%","positive":true},{"period":"${q2} vs ${q3}","change":"+15%","positive":true},{"period":"${q3} vs ${q4}","change":"+23%","positive":true}], "format": "currency" },
      { "metric": "Operating Income", "values": [{"quarter":"${q1}","value":"$2.0B"},{"quarter":"${q2}","value":"$1.4B"},{"quarter":"${q3}","value":"$1.0B"},{"quarter":"${q4}","value":"$0.7B"}], "yoyChanges": [{"period":"${q1} vs ${q2}","change":"+43%","positive":true},{"period":"${q2} vs ${q3}","change":"+40%","positive":true},{"period":"${q3} vs ${q4}","change":"+43%","positive":true}], "format": "currency" },
      { "metric": "Net Income", "values": [{"quarter":"${q1}","value":"$1.8B"},{"quarter":"${q2}","value":"$1.2B"},{"quarter":"${q3}","value":"$1.3B"},{"quarter":"${q4}","value":"$0.9B"}], "yoyChanges": [{"period":"${q1} vs ${q2}","change":"+42%","positive":true},{"period":"${q2} vs ${q3}","change":"-8%","positive":false},{"period":"${q3} vs ${q4}","change":"+44%","positive":true}], "format": "currency" },
      { "metric": "## Per Share", "values": [], "yoyChanges": [], "format": "per_share" },
      { "metric": "EPS (Diluted)", "values": [{"quarter":"${q1}","value":"$1.09"},{"quarter":"${q2}","value":"$0.77"},{"quarter":"${q3}","value":"$0.83"},{"quarter":"${q4}","value":"$0.52"}], "yoyChanges": [{"period":"${q1} vs ${q2}","change":"+41%","positive":true},{"period":"${q2} vs ${q3}","change":"-7%","positive":false},{"period":"${q3} vs ${q4}","change":"+60%","positive":true}], "format": "per_share" },
      { "metric": "## Margins", "values": [], "yoyChanges": [], "format": "percent" },
      { "metric": "Gross Margin", "values": [{"quarter":"${q1}","value":"54%"},{"quarter":"${q2}","value":"51%"},{"quarter":"${q3}","value":"48%"},{"quarter":"${q4}","value":"46%"}], "yoyChanges": [{"period":"${q1} vs ${q2}","change":"+3pp","positive":true},{"period":"${q2} vs ${q3}","change":"+3pp","positive":true},{"period":"${q3} vs ${q4}","change":"+2pp","positive":true}], "format": "percent" },
      { "metric": "Operating Margin", "values": [{"quarter":"${q1}","value":"26%"},{"quarter":"${q2}","value":"23%"},{"quarter":"${q3}","value":"18%"},{"quarter":"${q4}","value":"15%"}], "yoyChanges": [{"period":"${q1} vs ${q2}","change":"+3pp","positive":true},{"period":"${q2} vs ${q3}","change":"+5pp","positive":true},{"period":"${q3} vs ${q4}","change":"+3pp","positive":true}], "format": "percent" },
      { "metric": "Net Margin", "values": [{"quarter":"${q1}","value":"23%"},{"quarter":"${q2}","value":"20%"},{"quarter":"${q3}","value":"23%"},{"quarter":"${q4}","value":"19%"}], "yoyChanges": [{"period":"${q1} vs ${q2}","change":"+3pp","positive":true},{"period":"${q2} vs ${q3}","change":"-3pp","positive":false},{"period":"${q3} vs ${q4}","change":"+4pp","positive":true}], "format": "percent" },
      { "metric": "## Cash Flow", "values": [], "yoyChanges": [], "format": "currency" },
      { "metric": "Free Cash Flow", "values": [{"quarter":"${q1}","value":"$1.5B"},{"quarter":"${q2}","value":"$1.1B"},{"quarter":"${q3}","value":"$0.8B"},{"quarter":"${q4}","value":"$0.5B"}], "yoyChanges": [{"period":"${q1} vs ${q2}","change":"+36%","positive":true},{"period":"${q2} vs ${q3}","change":"+38%","positive":true},{"period":"${q3} vs ${q4}","change":"+60%","positive":true}], "format": "currency" }
    ]
  },
  "guidance": [
    { "label": "Revenue", "low": "$151.0B", "high": "$155.5B", "consensus": "$158.6B", "signal": "below" },
    { "label": "Operating Income", "low": "$14.0B", "high": "$18.0B", "consensus": "$17.8B", "signal": "mixed" }
  ],
  "guidanceAnalysis": "Write 4-6 sentences as a senior equity analyst assessing the forward guidance. Cover: (1) Is management's guidance realistic or sandbagging? Compare to historical beat rates. (2) What competitive threats could derail the outlook — name specific competitors and their moves. (3) Geopolitical/regulatory risks — tariffs, antitrust, data privacy laws, trade tensions that directly impact this company. (4) What macro headwinds (FX, rates, consumer spending) threaten execution. (5) What would cause a downside revision — be specific about triggers. End with the single biggest risk to guidance being met.",
  "highlights": [
    { "speaker": "CEO Name on Topic", "text": "Key quote or paraphrase from earnings call", "sentiment": "bullish", "tag": "Bullish — Growth Confidence" },
    { "speaker": "CFO on Costs", "text": "Key concern or warning", "sentiment": "bearish", "tag": "Bearish — Margin Pressure" }
  ],
  "priceAction": [
    { "timeframe": "After Hours", "move": "−4.2%", "positive": false, "detail": "$185.20 → $177.42" },
    { "timeframe": "Next Day Close", "move": "+1.1%", "positive": true, "detail": "Partial recovery" },
    { "timeframe": "5-Day Return", "move": "−2.8%", "positive": false, "detail": "Stabilizing near support" }
  ],
  "aiBottomLine": "2-3 sentence AI analysis of what the earnings mean for investors. Include specific numbers and forward-looking assessment.",
  "nextEarnings": "Apr 30, ${currentYear}",
  "impliedMove": "±5.2%",
  "rating": "HOLD"
}

IMPORTANT:
- Use REAL data from the most recent earnings report. Do NOT fabricate numbers.
- Today is ${today.toISOString().split('T')[0]}. Make sure you report the LATEST quarter, NOT an old one.
- All segment percentages in "pct" should add up to ~100.
- Include 3-5 highlights from the earnings call with mix of bullish/bearish/neutral.
- The aiBottomLine should be institutional-grade analysis, not generic.
- If earnings data is not available, use the best available information and note the quarter.
- quarterlyComparison MUST compare the SAME quarter across 4 years (e.g., ${q1} vs ${q2} vs ${q3} vs ${q4}). NOT sequential quarters.
- yoyChanges is an array with exactly 3 entries: [latest vs 1yr ago, 1yr ago vs 2yr ago, 2yr ago vs 3yr ago].
- Use "##" prefix for section header rows. Section headers have empty values and yoyChanges arrays.
- Include at minimum: Revenue, Gross Profit, Operating Income, Net Income, EPS, Gross Margin, Operating Margin, Net Margin, Free Cash Flow.`;
};

// =====================================================
// FETCH EARNINGS DATA — From DB-cached backend endpoint
// =====================================================
// Flow:
//   1. Frontend calls GET /api/earnings-analysis/:ticker
//   2. Backend checks Supabase → if cached & valid → returns instantly
//   3. If not cached → backend calls AI → saves to DB → returns
//   4. Next user searching same ticker gets instant data
//   5. Cache invalidates when next earnings date passes
// =====================================================

async function fetchEarningsData(
  data: StockData,
  signal?: AbortSignal
): Promise<EarningsData> {
  const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

  const response = await fetch(`${API_BASE}/api/earnings-analysis/${data.ticker}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `API error: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Earnings analysis failed');
  }

  const analysis = result.data;

  if (!analysis.verdictEmoji) {
    analysis.verdictEmoji = analysis.verdict === 'beat' ? '🟢' : analysis.verdict === 'miss' ? '🔴' : '⚠️';
  }

  return analysis as EarningsData;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

const VerdictBar = memo(({ data }: { data: EarningsData }) => {
  const verdictColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
    beat: { bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.25)', text: '#22C55E', label: 'BEAT' },
    miss: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)', text: '#EF4444', label: 'MISS' },
    mixed: { bg: 'rgba(234, 179, 8, 0.08)', border: 'rgba(234, 179, 8, 0.25)', text: '#EAB308', label: 'MIXED' },
  };
  const normalizedVerdict = (data.verdict || 'mixed').toLowerCase();
  const v = verdictColors[normalizedVerdict] || verdictColors.mixed;

  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-5"
      style={{ background: v.bg, border: `1px solid ${v.border}` }}
    >
      <div className="flex flex-col items-center gap-1 min-w-[70px]">
        <span className="text-3xl">{data.verdictEmoji}</span>
        <span
          className="font-mono text-xs font-bold tracking-wider"
          style={{ color: v.text }}
        >
          {v.label}
        </span>
      </div>
      <p className="text-sm text-[#A0A0A0] leading-relaxed flex-1">
        <strong className="text-white">{(data.verdictSummary || '').split('.')[0]}.</strong>{' '}
        {(data.verdictSummary || '').split('.').slice(1).join('.').trim()}
      </p>
    </div>
  );
});
VerdictBar.displayName = 'VerdictBar';

const MetricCard = memo(({ metric }: { metric: EarningsMetric }) => {
  const statusConfig: Record<string, { color: string; bg: string; border: string; prefix: string }> = {
    beat: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', prefix: '▲ BEAT' },
    miss: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', prefix: '▼ MISS' },
    inline: { color: '#EAB308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.25)', prefix: '≈ INLINE' },
  };
  const normalizedStatus = (metric.status || 'inline').toLowerCase();
  const s = statusConfig[normalizedStatus] || statusConfig.inline;
  const surprise = typeof metric.surprise === 'number' ? metric.surprise : 0;

  return (
    <div className="relative rounded-xl p-4 text-center overflow-hidden bg-white/[0.03]">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: s.color }} />

      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B6B6B] mb-2">
        {metric.label}
      </p>
      <p className="font-mono text-xl font-bold text-white mb-1">{metric.actual}</p>
      <p className="text-[10px] text-[#5A5A6E] mb-2">Est. {metric.estimate}</p>
      <span
        className="inline-block font-mono text-[10px] font-bold px-2.5 py-1 rounded-full"
        style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
      >
        {s.prefix} {surprise > 0 ? '+' : ''}{surprise.toFixed(1)}%
      </span>
    </div>
  );
});
MetricCard.displayName = 'MetricCard';

// Segment color palette - rich, distinguishable colors for each segment
const SEGMENT_COLORS = [
  { bar: '#3B82F6', glow: 'rgba(59,130,246,0.15)', text: '#60A5FA' },   // Blue
  { bar: '#8B5CF6', glow: 'rgba(139,92,246,0.15)', text: '#A78BFA' },   // Purple
  { bar: '#C9A646', glow: 'rgba(201,166,70,0.15)', text: '#D4B85C' },   // Gold
  { bar: '#22C55E', glow: 'rgba(34,197,94,0.15)', text: '#4ADE80' },    // Green
  { bar: '#F59E0B', glow: 'rgba(245,158,11,0.15)', text: '#FBBF24' },   // Amber
  { bar: '#EC4899', glow: 'rgba(236,72,153,0.15)', text: '#F472B6' },   // Pink
  { bar: '#06B6D4', glow: 'rgba(6,182,212,0.15)', text: '#22D3EE' },    // Cyan
  { bar: '#EF4444', glow: 'rgba(239,68,68,0.15)', text: '#F87171' },    // Red
];

const SegmentTable = memo(({ segments }: { segments: SegmentData[] }) => {
  // Find the largest segment for relative sizing
  const maxPct = Math.max(...segments.map(s => s.pct || 0), 1);

  // Parse revenue to number for the total bar
  const parseRevenue = (rev: string): number => {
    if (!rev) return 0;
    const clean = rev.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean) || 0;
    if (rev.includes('T')) return num * 1000;
    if (rev.includes('B')) return num;
    if (rev.includes('M')) return num / 1000;
    return num;
  };

  const totalRevenue = segments.reduce((sum, s) => sum + parseRevenue(s.revenue), 0);

  return (
    <div className="space-y-2">
      {/* Total Revenue Bar — proportional segments */}
      <div className="relative w-full h-8 rounded-lg overflow-hidden mb-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="h-full flex">
          {segments.map((seg, i) => {
            const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
            const segRevenue = parseRevenue(seg.revenue);
            const widthPct = totalRevenue > 0 ? (segRevenue / totalRevenue) * 100 : seg.pct || 0;
            return (
              <div
                key={seg.name}
                className="h-full relative group transition-all duration-700 first:rounded-l-lg last:rounded-r-lg"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(135deg, ${color.bar}cc, ${color.bar}88)`,
                  minWidth: widthPct > 0 ? '2px' : 0,
                }}
              >
                {/* Label inside bar (only if wide enough) */}
                {widthPct > 15 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white/90 truncate px-1">
                      {seg.name}
                    </span>
                  </div>
                )}
                {/* Tooltip on hover */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#1A1A2E] border border-white/10 rounded-md px-2 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  {seg.name}: {seg.revenue} ({widthPct.toFixed(0)}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Individual Segment Flow Cards */}
      {segments.map((seg, i) => {
        const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
        const barWidth = maxPct > 0 ? ((seg.pct || 0) / maxPct) * 100 : 50;
        const isPositive = seg.yoyPositive !== false && !String(seg.yoy).startsWith('-');
        const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
          beat: { bg: 'rgba(34,197,94,0.12)', color: '#22C55E', label: 'BEAT' },
          miss: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444', label: 'MISS' },
          inline: { bg: 'rgba(234,179,8,0.12)', color: '#EAB308', label: 'INLINE' },
        };
        const status = statusConfig[(seg.vsEstimate || 'inline').toLowerCase()] || statusConfig.inline;

        return (
          <div
            key={seg.name}
            className="relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.005]"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            {/* Colored left accent */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
              style={{ background: color.bar }}
            />

            <div className="pl-5 pr-4 py-3.5">
              {/* Row 1: Segment Name + Revenue + Status */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Color dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{
                      background: color.bar,
                      boxShadow: `0 0 6px ${color.bar}60`,
                    }}
                  />
                  {/* Name */}
                  <span className="text-sm font-semibold text-[#E8E8E8] truncate">{seg.name}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Revenue */}
                  <span className="font-mono text-sm font-bold text-white">{seg.revenue}</span>
                  {/* YoY */}
                  <span className={cn(
                    "font-mono text-xs font-semibold flex items-center gap-0.5",
                    isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  )}>
                    {isPositive ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {seg.yoy}
                  </span>
                  {/* Beat/Miss pill */}
                  <span
                    className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: status.bg,
                      color: status.color,
                      border: `1px solid ${status.color}30`,
                    }}
                  >
                    {status.label}
                  </span>
                </div>
              </div>

              {/* Row 2: Visual proportion bar */}
              <div className="relative w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${Math.max(barWidth, 3)}%`,
                    background: `linear-gradient(90deg, ${color.bar}dd, ${color.bar}55)`,
                    boxShadow: `0 0 8px ${color.bar}30`,
                  }}
                />
              </div>

              {/* Row 3: Margin info (if available) */}
              {seg.margin && seg.margin !== 'N/A' && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-[#5A5A6E]">Margin</span>
                  <span className="font-mono text-[10px] text-[#8B8B8B]">{seg.margin}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
SegmentTable.displayName = 'SegmentTable';

const StatusPill = memo(({ status }: { status: string }) => {
  const config: Record<string, { bg: string; color: string; border: string; label: string }> = {
    beat: { bg: 'rgba(34,197,94,0.1)', color: '#22C55E', border: 'rgba(34,197,94,0.25)', label: 'BEAT' },
    miss: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.25)', label: 'MISS' },
    inline: { bg: 'rgba(234,179,8,0.1)', color: '#EAB308', border: 'rgba(234,179,8,0.25)', label: 'INLINE' },
  };
  const normalized = (status || 'inline').toLowerCase();
  const c = config[normalized] || config.inline;
  return (
    <span
      className="inline-block font-mono text-[9px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      {c.label}
    </span>
  );
});
StatusPill.displayName = 'StatusPill';

// =====================================================
// QUARTERLY YoY COMPARISON TABLE (TipRanks-style)
// =====================================================
const YoYPill = memo(({ change, positive }: { change: string; positive: boolean }) => (
  <span
    className={cn(
      "inline-flex items-center gap-0.5 font-mono text-[11px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap",
      positive
        ? "text-[#22C55E] bg-[#22C55E]/[0.08]"
        : "text-[#EF4444] bg-[#EF4444]/[0.08]"
    )}
  >
    {positive ? (
      <ArrowUpRight className="w-3 h-3" />
    ) : (
      <ArrowDownRight className="w-3 h-3" />
    )}
    {change}
  </span>
));
YoYPill.displayName = 'YoYPill';

// =====================================================
// QUARTERLY YoY COMPARISON TABLE — Financials-Style Typography
// =====================================================
const QuarterlyComparisonTable = memo(({ comparison }: { comparison: QuarterlyComparison }) => {
  if (!comparison?.rows?.length || !comparison?.quarters?.length) return null;

  const quarters = comparison.quarters;

  // Helper: compute YoY change between two value strings
  const computeYoY = (currentVal: string | undefined, prevVal: string | undefined): { text: string; positive: boolean } | null => {
    if (!currentVal || !prevVal) return null;
    const parse = (v: string): number | null => {
      const clean = v.replace(/[^0-9.\-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? null : num;
    };
    const curr = parse(currentVal);
    const prev = parse(prevVal);
    if (curr === null || prev === null || prev === 0) return null;

    // Check if values are percentages (margin rows)
    const isPercent = currentVal.includes('%') && prevVal.includes('%');
    if (isPercent) {
      const diff = curr - prev;
      if (Math.abs(diff) < 0.05) return null;
      const sign = diff > 0 ? '+' : '';
      return { text: `${sign}${diff.toFixed(0)}%`, positive: diff > 0 };
    }

    const change = ((curr - prev) / Math.abs(prev)) * 100;
    if (Math.abs(change) < 0.05) return null;
    const sign = change > 0 ? '+' : '';
    return { text: `${sign}${change.toFixed(change >= 10 || change <= -10 ? 0 : 1)}%`, positive: change > 0 };
  };

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full border-collapse">
        {/* ── Header ── */}
        <thead>
          <tr>
            {/* Metric column */}
            <th className="text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A5A6E] py-3.5 pr-4 pl-2 border-b border-white/[0.06]">
              Metric
            </th>

            {/* Quarter + YoY columns interleaved */}
            {quarters.map((q, i) => (
              <Fragment key={q}>
                {/* Quarter header */}
                <th
                  className={cn(
                    "text-right text-[11px] font-bold uppercase tracking-[0.1em] py-3.5 px-4 border-b whitespace-nowrap",
                    i === 0
                      ? "text-white border-[#C9A646]/20 bg-[#C9A646]/[0.04]"
                      : "text-[#6B6B6B] border-white/[0.06]"
                  )}
                >
                  {q}
                </th>

                {/* YoY column header (between each pair, not after last) */}
                {i < quarters.length - 1 && (
                  <th
                    className="text-center text-[10px] font-semibold uppercase tracking-widest text-[#5A5A6E]/50 py-3.5 px-2 border-b border-white/[0.06]"
                  >
                    YoY
                  </th>
                )}
              </Fragment>
            ))}
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {comparison.rows.map((row, rowIdx) => {
            const isSectionHeader = row.metric.startsWith('##');
            const metricLabel = isSectionHeader ? row.metric.replace(/^##\s*/, '') : row.metric;

            // Total columns: metric + quarters + (quarters-1) YoY columns
            const totalCols = 1 + quarters.length + (quarters.length - 1);

            if (isSectionHeader) {
              return (
                <tr key={rowIdx}>
                  <td
                    colSpan={totalCols}
                    className="pt-7 pb-2.5 pl-2"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C9A646]">
                      {metricLabel}
                    </span>
                    <div className="mt-2 h-px bg-gradient-to-r from-[#C9A646]/25 via-[#C9A646]/10 to-transparent" />
                  </td>
                </tr>
              );
            }

            return (
              <tr
                key={rowIdx}
                className="group transition-colors hover:bg-white/[0.02]"
              >
                {/* Metric name — larger, brighter */}
                <td className="py-4 pr-4 pl-2 border-b border-white/[0.04]">
                  <span className="text-[14px] text-[#D0D0D0] font-medium">{row.metric}</span>
                </td>

                {/* Quarter values with interleaved YoY */}
                {quarters.map((q, i) => {
                  const val = row.values?.find(v => v.quarter === q);
                  const nextVal = i < quarters.length - 1
                    ? row.values?.find(v => v.quarter === quarters[i + 1])
                    : null;
                  const yoy = nextVal ? computeYoY(val?.value, nextVal?.value) : null;

                  return (
                    <Fragment key={q}>
                      {/* Value cell */}
                      <td
                        className={cn(
                          "text-right py-4 px-4 font-mono border-b whitespace-nowrap",
                          i === 0
                            ? "text-[15px] text-white font-bold border-[#C9A646]/10 bg-[#C9A646]/[0.03]"
                            : "text-[14px] text-[#9B9B9B] font-medium border-white/[0.04]"
                        )}
                      >
                        {val?.value || '—'}
                      </td>

                      {/* YoY pill between quarters */}
                      {i < quarters.length - 1 && (
                        <td
                          className="text-center py-4 px-1.5 border-b border-white/[0.04]"
                        >
                          {yoy ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5 font-mono text-[11px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap",
                                yoy.positive
                                  ? "text-[#22C55E] bg-[#22C55E]/[0.10] border border-[#22C55E]/[0.15]"
                                  : "text-[#EF4444] bg-[#EF4444]/[0.10] border border-[#EF4444]/[0.15]"
                              )}
                            >
                              {yoy.positive ? '↗' : '↘'} {yoy.text}
                            </span>
                          ) : (
                            <span className="text-[#2A2A3A] text-[10px]">—</span>
                          )}
                        </td>
                      )}
                    </Fragment>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
QuarterlyComparisonTable.displayName = 'QuarterlyComparisonTable';

const GuidanceSection = memo(({ guidance }: { guidance: GuidanceItem[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {guidance.map((g) => {
      const signalConfig: Record<string, { bg: string; color: string; icon: string; label: string }> = {
        above: { bg: 'rgba(34,197,94,0.08)', color: '#22C55E', icon: '▲', label: 'Above Consensus' },
        below: { bg: 'rgba(239,68,68,0.08)', color: '#EF4444', icon: '▼', label: 'Below Consensus' },
        mixed: { bg: 'rgba(234,179,8,0.08)', color: '#EAB308', icon: '↔', label: 'Wide Range' },
      };
      const normalizedSignal = (g.signal || 'mixed').toLowerCase();
      const s = signalConfig[normalizedSignal] || signalConfig.mixed;

      return (
        <div key={g.label} className="rounded-xl p-4 bg-white/[0.03]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5A6E] mb-3">{g.label}</p>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-base font-bold text-white">{g.low}</span>
            <span className="text-[#5A5A6E] text-xs">→</span>
            <span className="font-mono text-base font-bold text-white">{g.high}</span>
          </div>
          <p className="text-xs text-[#5A5A6E] mb-2">
            Consensus: <span className="font-mono text-[#9898A8]">{g.consensus}</span>
          </p>
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md"
            style={{ background: s.bg, color: s.color }}
          >
            {s.icon} {s.label}
          </span>
        </div>
      );
    })}
  </div>
));
GuidanceSection.displayName = 'GuidanceSection';

const HighlightItem = memo(({ highlight }: { highlight: EarningsHighlight }) => {
  const sentimentConfig: Record<string, { bg: string; icon: string; tagBg: string; tagColor: string }> = {
    bullish: { bg: 'rgba(34,197,94,0.06)', icon: '🟢', tagBg: 'rgba(34,197,94,0.1)', tagColor: '#22C55E' },
    bearish: { bg: 'rgba(239,68,68,0.06)', icon: '🔴', tagBg: 'rgba(239,68,68,0.1)', tagColor: '#EF4444' },
    neutral: { bg: 'rgba(59,130,246,0.06)', icon: '🔵', tagBg: 'rgba(59,130,246,0.1)', tagColor: '#3B82F6' },
  };
  const normalizedSentiment = (highlight.sentiment || 'neutral').toLowerCase();
  const s = sentimentConfig[normalizedSentiment] || sentimentConfig.neutral;

  return (
    <div className="flex gap-3 p-4 rounded-xl" style={{ background: s.bg }}>
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5"
        style={{ background: s.tagBg }}
      >
        {s.icon}
      </div>
      <div className="flex-1">
        <p className="text-[13px] text-[#A0A0A0] leading-relaxed">
          <strong className="text-white font-semibold">{highlight.speaker}:</strong>{' '}
          {highlight.text}
        </p>
        <span
          className="inline-block font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-2"
          style={{ background: s.tagBg, color: s.tagColor }}
        >
          {highlight.tag}
        </span>
      </div>
    </div>
  );
});
HighlightItem.displayName = 'HighlightItem';

const PriceActionGrid = memo(({ priceAction }: { priceAction: PriceAction[] }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    {priceAction.map((pa) => (
      <div key={pa.timeframe} className="rounded-xl p-4 text-center bg-white/[0.03]">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5A6E] mb-2">
          {pa.timeframe}
        </p>
        <p className={cn("font-mono text-2xl font-bold mb-1", pa.positive ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
          {pa.move}
        </p>
        <p className="text-[10px] text-[#5A5A6E]">{pa.detail}</p>
      </div>
    ))}
  </div>
));
PriceActionGrid.displayName = 'PriceActionGrid';

const AIBottomLine = memo(({ data }: { data: EarningsData }) => {
  const ratingText = (data.rating || '').toUpperCase();
  const isBuy = ratingText.includes('BUY');
  const isHold = ratingText === 'HOLD';

  const ratingBg = isBuy ? 'rgba(34,197,94,0.1)' : isHold ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
  const ratingBorder = isBuy ? 'rgba(34,197,94,0.25)' : isHold ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)';
  const ratingColor = isBuy ? '#22C55E' : isHold ? '#F59E0B' : '#EF4444';

  return (
    <Card highlight>
      <div className="relative p-6">
        {/* Gold left accent — matches Overview Investment Story */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A646] to-transparent" />

        {/* Header with rating badge */}
        <div className="flex items-center justify-between mb-4">
          <SectionHeader icon={Sparkles} title="Bottom Line" badge="AI Analysis" />
          {ratingText && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{
              background: ratingBg,
              border: `1px solid ${ratingBorder}`,
            }}>
              <span className="text-xs font-bold tracking-wide" style={{ color: ratingColor }}>
                {ratingText}
              </span>
            </div>
          )}
        </div>

        {/* AI Bottom Line text in gold-tinted box */}
        <div className="p-4 rounded-xl" style={{ background: 'rgba(201,166,70,0.06)', border: '1px solid rgba(201,166,70,0.15)' }}>
          <p className="text-[#E8DCC4] leading-relaxed text-sm">{data.aiBottomLine}</p>
        </div>

        {/* Footer metrics */}
        <div className="flex items-center gap-4 mt-4">
          {data.nextEarnings && (
            <span className="text-xs text-[#6B6B6B]">
              Next Earnings: <span className="text-[#C9A646] font-medium">{data.nextEarnings}</span>
            </span>
          )}
          {data.impliedMove && (
            <span className="text-xs text-[#6B6B6B]">
              Implied Move: <span className="text-[#C9A646] font-medium">{data.impliedMove}</span>
            </span>
          )}
          {data.rating && (
            <span className="text-xs text-[#6B6B6B]">
              Rating: <span className={cn("font-medium", isBuy ? 'text-[#22C55E]' : isHold ? 'text-[#F59E0B]' : 'text-[#EF4444]')}>
                {ratingText}
              </span>
            </span>
          )}
        </div>
      </div>
    </Card>
  );
});
AIBottomLine.displayName = 'AIBottomLine';

// =====================================================
// LOADING SKELETON
// =====================================================

const EarningsLoadingSkeleton = memo(() => (
  <div className="space-y-4 animate-pulse">
    {/* Verdict skeleton */}
    <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/5">
      <div className="flex items-center gap-5">
        <div className="w-[70px] h-16 rounded-lg bg-white/[0.05]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-white/[0.05]" />
          <div className="h-3 w-full rounded bg-white/[0.03]" />
        </div>
      </div>
    </div>
    {/* Metrics skeleton */}
    <Card>
      <div className="p-6">
        <div className="h-4 w-40 rounded bg-white/[0.05] mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-xl p-4 bg-white/[0.03] space-y-2">
              <div className="h-3 w-16 mx-auto rounded bg-white/[0.05]" />
              <div className="h-6 w-20 mx-auto rounded bg-white/[0.05]" />
              <div className="h-3 w-14 mx-auto rounded bg-white/[0.03]" />
            </div>
          ))}
        </div>
      </div>
    </Card>
    {/* More skeletons */}
    {[1,2,3].map(i => (
      <Card key={i}>
        <div className="p-6 space-y-3">
          <div className="h-4 w-48 rounded bg-white/[0.05]" />
          <div className="h-3 w-full rounded bg-white/[0.03]" />
          <div className="h-3 w-2/3 rounded bg-white/[0.03]" />
        </div>
      </Card>
    ))}
  </div>
));
EarningsLoadingSkeleton.displayName = 'EarningsLoadingSkeleton';

// =====================================================
// MAIN COMPONENT
// =====================================================

export const EarningsTab = memo(({ data, prefetchedData }: { data: StockData; prefetchedData?: any }) => {
  const cached = earningsCacheMap.get(data.ticker);
  const [earningsData, setEarningsData] = useState<EarningsData | null>(cached?.data || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secFilingUrl, setSecFilingUrl] = useState<string | null>(secFilingCacheMap.get(data.ticker) || null);
  const abortRef = useRef<AbortController | null>(null);
  const hasAutoGenerated = useRef<string | null>(cached ? data.ticker : null);

  // Fetch actual SEC filing URL (10-Q or 10-K) for this ticker
  useEffect(() => {
    if (secFilingCacheMap.has(data.ticker)) {
      setSecFilingUrl(secFilingCacheMap.get(data.ticker)!);
      return;
    }

    const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';
    let cancelled = false;

    (async () => {
      try {
        // Try 10-Q first (quarterly), then 10-K (annual)
        const res = await fetch(`${API_BASE}/api/sec/filings?symbol=${data.ticker}&forms=10-Q,10-K&limit=1`);
        if (!res.ok) return;
        const json = await res.json();
        const filing = json?.filings?.[0];
        if (!cancelled && filing?.filingUrl) {
          secFilingCacheMap.set(data.ticker, filing.filingUrl);
          setSecFilingUrl(filing.filingUrl);
        }
      } catch {
        // Silent fail — fallback URL will be used
      }
    })();

    return () => { cancelled = true; };
  }, [data.ticker]);

  const generate = useCallback(async (force = false) => {
    if (!force && earningsCacheMap.has(data.ticker)) {
      const c = earningsCacheMap.get(data.ticker)!;
      setEarningsData(c.data);
      return;
    }

    // 2. PREFETCHED or SERVER cache
    if (!force) {
      try {
        const serverCached = prefetchedData || await (async () => {
          const res = await fetch(`/api/stock-cache/${data.ticker}/earnings-tab`);
          if (!res.ok) return null;
          const json = await res.json();
          return (json.success && json.cached && json.data) ? json.data : null;
        })();
        if (serverCached) {
          console.log(`[Earnings] ⚡ ${prefetchedData ? 'PREFETCHED' : 'SERVER CACHE'} HIT for ${data.ticker}`);
          earningsCacheMap.set(data.ticker, { data: serverCached, generatedAt: new Date().toISOString() });
          setEarningsData(serverCached);
          return;
        }
      } catch { /* continue to generate */ }
    }

    // Abort previous
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchEarningsData(data, controller.signal);
      setEarningsData(result);
      earningsCacheMap.set(data.ticker, { data: result, generatedAt: new Date().toISOString() });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Earnings fetch error:', err);
        setError(err.message || 'Failed to load earnings data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [data, prefetchedData]);

  // Auto-generate on ticker change
  useEffect(() => {
    if (hasAutoGenerated.current === data.ticker) return;
    hasAutoGenerated.current = data.ticker;
    generate();

    return () => {
      abortRef.current?.abort();
    };
  }, [data.ticker, generate]);

  // Error state
  if (error && !earningsData) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-[#EF4444]/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Earnings Data Unavailable</h3>
            <p className="text-sm text-[#8B8B8B] mb-4">{error}</p>
            <button
              onClick={() => generate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'rgba(201,166,70,0.15)',
                border: '1px solid rgba(201,166,70,0.3)',
                color: '#C9A646',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading && !earningsData) {
    return (
      <div className="space-y-4">
        {/* Loading header */}
        <div className="flex items-center justify-center gap-3 py-3">
          <div className="w-5 h-5 rounded-full border-2 border-[#C9A646]/30 border-t-[#C9A646] animate-spin" />
          <span className="text-sm text-[#8B8B8B]">
            Analyzing {data.ticker} latest earnings...
          </span>
        </div>
        <EarningsLoadingSkeleton />
      </div>
    );
  }

  if (!earningsData) return null;

  return (
    <div className="space-y-4">
      {/* Tab Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.05))',
              border: '2px solid rgba(201,166,70,0.3)',
              boxShadow: '0 8px 32px rgba(201,166,70,0.2)',
            }}
          >
            {data.logo ? (
              <img
                src={data.logo}
                alt={data.ticker}
                className="w-[90%] h-[90%] object-contain rounded-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    `<span class="text-[#C9A646] font-bold text-sm">${data.ticker.slice(0, 2)}</span>`;
                }}
              />
            ) : (
              <span className="text-[#C9A646] font-bold text-sm">{data.ticker.slice(0, 2)}</span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {data.ticker} <span className="text-[#C9A646]">Earnings</span>
            </h2>
            <p className="text-xs text-[#5A5A6E]">
              {data.name} • Reported {earningsData.reportDate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="font-mono text-base font-bold text-[#C9A646]">{earningsData.quarter}</p>
            <p className="text-[10px] text-[#5A5A6E]">{earningsData.quarterRange}</p>
          </div>
          <a
            href={secFilingUrl || `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${data.ticker}&type=10-Q&dateb=&owner=include&count=5&action=getcompany`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.02]"
            style={{
              background: 'rgba(201,166,70,0.06)',
              border: '1px solid rgba(201,166,70,0.15)',
              color: '#C9A646',
            }}
            title="View SEC Filing"
          >
            <ExternalLink className="w-3 h-3" />
            <span>SEC Filing</span>
          </a>
        </div>
      </div>

      {/* 1. Verdict Bar */}
      <VerdictBar data={earningsData} />

      {/* 2. Headline Metrics */}
      {earningsData.metrics?.length > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#5A5A6E]">Headline Numbers</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {earningsData.metrics.map((m) => (
                <MetricCard key={m.label} metric={m} />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* 3. Segment Breakdown */}
      {earningsData.segments?.length > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#5A5A6E]">Revenue by Segment</p>
            </div>
            <SegmentTable segments={earningsData.segments} />
          </div>
        </Card>
      )}

      {/* 3.5 Quarterly YoY Comparison */}
      {earningsData.quarterlyComparison?.rows?.length > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7A7A8E]">
                  Quarterly Comparison — Same Quarter YoY
                </p>
              </div>
              <span
                className="text-[11px] font-mono font-bold px-3 py-1.5 rounded-lg"
                style={{
                  background: 'rgba(201,166,70,0.10)',
                  color: '#C9A646',
                  border: '1px solid rgba(201,166,70,0.20)',
                }}
              >
                {earningsData.quarterlyComparison.currentQuarter}
              </span>
            </div>
            <QuarterlyComparisonTable comparison={earningsData.quarterlyComparison} />
          </div>
        </Card>
      )}

      {/* 4. Forward Guidance — Analyst Assessment Only */}
      {earningsData.guidanceAnalysis && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#5A5A6E]">
                Forward Guidance
              </p>
            </div>

            {/* Analyst Assessment */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: 'rgba(201,166,70,0.04)',
                border: '1px solid rgba(201,166,70,0.1)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: 'rgba(201,166,70,0.12)' }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C9A646]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#C9A646]">
                  Analyst Assessment
                </span>
              </div>
              <p className="text-[13px] text-[#A0A0A0] leading-[1.85]">
                {earningsData.guidanceAnalysis}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 5. Earnings Call Highlights */}
      {earningsData.highlights?.length > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#5A5A6E]">
                Earnings Call — Key Highlights
              </p>
            </div>
            <div className="space-y-3">
              {earningsData.highlights.map((h, i) => (
                <HighlightItem key={i} highlight={h} />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* 6. Post-Earnings Price Action */}
      {earningsData.priceAction?.length > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#5A5A6E]">
                Post-Earnings Price Action
              </p>
            </div>
            <PriceActionGrid priceAction={earningsData.priceAction} />
          </div>
        </Card>
      )}

      {/* 7. AI Bottom Line */}
      <AIBottomLine data={earningsData} />
    </div>
  );
});

EarningsTab.displayName = 'EarningsTab';