// src/components/stock-analyzer/tabs/ValuationTab.tsx
// =====================================================
// 💎 VALUATION TAB — Institutional-Grade Deep Valuation
// =====================================================
// Features:
//   ✅ Classic multiples with sector comparison
//   ✅ Client-side health scores (Altman Z, Piotroski F)
//   ✅ ROIC vs WACC spread with interpretation
//   ✅ AI-powered: DCF (3 scenarios), Reverse DCF, EPV, SOTP
//   ✅ Earnings Quality (Accruals), Beneish M-Score
//   ✅ Cash Conversion Cycle, Capex Quality
//   ✅ Every result has "what it means" + company-specific insight
// =====================================================

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import {
  Scale, Info, Sparkles, TrendingUp, TrendingDown,
  Shield, AlertTriangle, Loader2, RefreshCw,
  ChevronDown, ChevronUp, DollarSign, BarChart3,
  Activity, Zap, Target, Building2, Lock,
  ArrowUpRight, ArrowDownRight, Minus, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types/stock-analyzer.types';
import { C, cardStyle } from '@/constants/stock-analyzer.constants';
import { Card, SectionHeader, MetricBox } from '../ui';
import { fmtPct, fmtBig, isValid, fmt } from '@/utils/stock-analyzer.utils';
import { saveToServerCache } from '@/services/stock-analyzer.api';
import { WhoShouldOwnThis } from './WhoShouldOwnThis';

// =====================================================
// TYPES
// =====================================================

interface DCFScenario {
  label: string;          // "Bear", "Base", "Bull"
  probability: number;    // 0.2, 0.5, 0.3
  growthRate: number;     // revenue CAGR %
  terminalGrowth: number;
  wacc: number;
  fairValue: number;
  upside: number;         // vs current price %
}

interface ValuationModel {
  name: string;
  fairValue: number;
  upside: number;
  confidence: 'high' | 'medium' | 'low';
  description: string;
}

interface HealthScore {
  name: string;
  value: number;
  maxValue: number;
  zone: 'safe' | 'warning' | 'danger';
  interpretation: string;      // what this score means generally
  companyInsight: string;      // what it means for THIS company
}

interface QualityMetric {
  name: string;
  value: string;
  numericValue: number;
  status: 'good' | 'neutral' | 'bad';
  whatItIs: string;            // general explanation
  whatItMeans: string;         // company-specific insight
}

interface ROICAnalysis {
  roic: number;
  wacc: number;
  spread: number;
  spreadTrend: string;        // "expanding" | "contracting" | "stable"
  interpretation: string;
  companyInsight: string;
  historicalSpread: { period: string; spread: number }[];
}

interface ValuationAIData {
  // DCF
  dcfScenarios: DCFScenario[];
  weightedFairValue: number;
  // Reverse DCF
  reverseDCF: {
    impliedGrowthRate: number;
    impliedTerminalMultiple: number;
    isRealistic: boolean;
    interpretation: string;
    companyInsight: string;
  };
  // EPV (Earnings Power Value)
  epv: {
    adjustedEarnings: string;
    epvPerShare: number;
    vsMarketCap: string;       // "premium" or "discount"
    franchiseValue: boolean;
    interpretation: string;
    companyInsight: string;
  };
  // SOTP
  sotp: {
    segments: { name: string; value: string; multiple: string; methodology: string }[];
    totalValue: number;
    vsMarketCap: number;       // % premium/discount
    interpretation: string;
  } | null;
  // ROIC vs WACC
  roicAnalysis: ROICAnalysis;
  // Earnings Quality
  earningsQuality: QualityMetric[];
  // Health Scores
  altmanZ: HealthScore;
  piotroskiF: HealthScore;
  beneishM: HealthScore;
  // Cash & Capex
  cashConversion: QualityMetric;
  capexQuality: QualityMetric;
  // Sector comparison
  sectorComparison: {
    metric: string;
    company: number;
    sectorAvg: number;
    verdict: string;
  }[];
  // Overall verdict
  valuationVerdict: {
    label: string;             // "Undervalued", "Fair Value", "Overvalued"
    confidence: string;
    summary: string;           // 3-4 sentence institutional-grade conclusion
  };
}

// =====================================================
// CACHE
// =====================================================

const valuationCache = new Map<string, { data: ValuationAIData; generatedAt: string }>();

// =====================================================
// SERVER CACHE HELPERS (shared across ALL users)
// =====================================================

async function checkServerValuationCache(ticker: string): Promise<ValuationAIData | null> {
  try {
    const res = await fetch(`/api/stock-cache/${ticker}/valuation`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success && json.cached && json.data ? json.data : null;
  } catch { return null; }
}

async function saveServerValuationCache(
  ticker: string, data: ValuationAIData, earningsDate?: string | null
) {
  try {
    await fetch(`/api/stock-cache/${ticker}/valuation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valuationData: data, earningsDate: earningsDate || null }),
    });
  } catch { /* non-critical */ }
}

// =====================================================
// AI PROMPT
// =====================================================

const buildValuationPrompt = (data: StockData) => `Perform an institutional-grade deep valuation analysis for ${data.name} (${data.ticker}).

FINANCIAL DATA:
Price: $${data.price.toFixed(2)} | Market Cap: ${data.marketCap ? fmtBig(data.marketCap) : 'N/A'}
P/E: ${data.pe?.toFixed(1) || 'N/A'} | Fwd P/E: ${data.forwardPe?.toFixed(1) || 'N/A'} | P/S: ${data.ps?.toFixed(1) || 'N/A'} | P/B: ${data.pb?.toFixed(1) || 'N/A'}
EV/EBITDA: ${data.evEbitda?.toFixed(1) || 'N/A'} | EV/Revenue: ${data.evRevenue?.toFixed(1) || 'N/A'} | PEG: ${data.pegRatio?.toFixed(2) || 'N/A'}
Revenue: ${data.revenue ? fmtBig(data.revenue) : 'N/A'} | Rev Growth: ${data.revenueGrowth?.toFixed(1) || 'N/A'}%
EPS: $${data.eps?.toFixed(2) || 'N/A'} | EPS Growth: ${data.epsGrowth?.toFixed(1) || 'N/A'}%
Gross Margin: ${data.grossMargin?.toFixed(1) || 'N/A'}% | Op Margin: ${data.operatingMargin?.toFixed(1) || 'N/A'}% | Net Margin: ${data.netMargin?.toFixed(1) || 'N/A'}%
ROE: ${data.roe?.toFixed(1) || 'N/A'}% | ROA: ${data.roa?.toFixed(1) || 'N/A'}% | ROIC: ${data.roic?.toFixed(1) || 'N/A'}%
D/E: ${data.debtToEquity?.toFixed(2) || 'N/A'} | D/A: ${data.debtToAssets?.toFixed(2) || 'N/A'}
Current Ratio: ${data.currentRatio?.toFixed(2) || 'N/A'} | Quick Ratio: ${data.quickRatio?.toFixed(2) || 'N/A'}
FCF Yield: ${data.fcfYield?.toFixed(1) || 'N/A'}% | FCF/Share: $${data.freeCashFlowPerShare?.toFixed(2) || 'N/A'}
Book Value/Share: $${data.bookValuePerShare?.toFixed(2) || 'N/A'} | Rev/Share: $${data.revenuePerShare?.toFixed(2) || 'N/A'}
Beta: ${data.beta?.toFixed(2) || 'N/A'} | Sector: ${data.sector} | Industry: ${data.industry}

SEARCH THE WEB for: ${data.ticker} DCF valuation analysis fair value, ${data.ticker} ROIC WACC spread historical, ${data.ticker} earnings quality accruals ratio, ${data.ticker} Altman Z-Score Piotroski F-Score, ${data.ticker} sum of parts valuation segments, ${data.ticker} free cash flow capex breakdown maintenance vs growth, ${data.ticker} cash conversion cycle trend, ${data.ticker} sector valuation comparison multiples

Return ONLY valid JSON with NO markdown, NO backticks:
{
  "dcfScenarios": [
    { "label": "Bear", "probability": 0.2, "growthRate": 3.0, "terminalGrowth": 2.0, "wacc": 10.5, "fairValue": 145, "upside": -12.5 },
    { "label": "Base", "probability": 0.5, "growthRate": 8.0, "terminalGrowth": 2.5, "wacc": 9.2, "fairValue": 195, "upside": 17.8 },
    { "label": "Bull", "probability": 0.3, "growthRate": 14.0, "terminalGrowth": 3.0, "wacc": 8.5, "fairValue": 260, "upside": 57.0 }
  ],
  "weightedFairValue": 202,
  "reverseDCF": {
    "impliedGrowthRate": 12.5,
    "impliedTerminalMultiple": 22.0,
    "isRealistic": true,
    "interpretation": "Reverse DCF takes the current market price and works backward to reveal what growth rate the market is pricing in. If the implied growth exceeds historical or industry norms, the stock may be overvalued.",
    "companyInsight": "At $X, the market implies Y% revenue CAGR for the next 10 years. Given [company]'s historical Z% growth and [specific factor], this assumption is [realistic/aggressive/conservative]. Key risk: [specific risk]."
  },
  "epv": {
    "adjustedEarnings": "$X.XB",
    "epvPerShare": 180,
    "vsMarketCap": "discount",
    "franchiseValue": true,
    "interpretation": "EPV (Earnings Power Value) by Bruce Greenwald measures what a company is worth based solely on current earnings with zero growth assumptions. If EPV exceeds asset value, the company has a franchise (moat). If Market Cap exceeds EPV, the market is pricing in future growth.",
    "companyInsight": "Specific analysis of this company's EPV vs its market cap and what it implies about growth expectations."
  },
  "sotp": {
    "segments": [
      { "name": "Cloud/Services", "value": "$120B", "multiple": "12x Revenue", "methodology": "Peer comp: CRM, NOW" },
      { "name": "Hardware", "value": "$45B", "multiple": "8x EBITDA", "methodology": "Peer comp: HPQ, DELL" }
    ],
    "totalValue": 220,
    "vsMarketCap": 15.5,
    "interpretation": "SOTP reveals hidden value in diversified companies by valuing each segment independently."
  },
  "roicAnalysis": {
    "roic": 18.5,
    "wacc": 9.2,
    "spread": 9.3,
    "spreadTrend": "expanding",
    "interpretation": "ROIC vs WACC spread is the most fundamental measure of value creation. When ROIC exceeds WACC, every dollar reinvested creates shareholder value. A widening spread signals a strengthening competitive moat, while a narrowing spread warns of eroding advantages.",
    "companyInsight": "With ROIC of X% vs WACC of Y%, [company] generates Z% excess returns on capital. The [expanding/contracting] trend over recent years suggests [moat analysis]. Compared to sector average ROIC of W%, this positions the company as [top/middle/bottom] tier.",
    "historicalSpread": [
      { "year": "2020", "spread": 7.5 },
      { "year": "2021", "spread": 8.2 },
      { "year": "2022", "spread": 8.8 },
      { "year": "2023", "spread": 9.0 },
      { "year": "2024", "spread": 9.3 }
    ]
  },
  "earningsQuality": [
    {
      "name": "Accruals Ratio",
      "value": "−3.2%",
      "numericValue": -3.2,
      "status": "good",
      "whatItIs": "Accruals Ratio = (Net Income − Operating Cash Flow) / Total Assets. A negative ratio means cash flow exceeds reported earnings — the company's profits are 'real' and backed by cash. A high positive ratio (>10%) signals earnings may be inflated through accounting rather than genuine cash generation.",
      "whatItMeans": "Company-specific analysis of accruals quality."
    },
    {
      "name": "Cash Flow vs Net Income",
      "value": "1.3x",
      "numericValue": 1.3,
      "status": "good",
      "whatItIs": "Operating Cash Flow / Net Income ratio. Above 1.0x means the company generates more cash than it reports as profit — a sign of conservative accounting and high earnings quality.",
      "whatItMeans": "Company-specific analysis."
    }
  ],
  "altmanZ": {
    "name": "Altman Z-Score",
    "value": 4.2,
    "maxValue": 6,
    "zone": "safe",
    "interpretation": "The Altman Z-Score predicts bankruptcy risk using 5 financial ratios: working capital/assets, retained earnings/assets, EBIT/assets, market cap/liabilities, and revenue/assets. Above 3.0 = safe zone (very low bankruptcy risk). Between 1.8-3.0 = grey zone (moderate risk). Below 1.8 = distress zone (high bankruptcy risk).",
    "companyInsight": "Company-specific Z-Score analysis with specific ratios."
  },
  "piotroskiF": {
    "name": "Piotroski F-Score",
    "value": 7,
    "maxValue": 9,
    "zone": "safe",
    "interpretation": "The Piotroski F-Score rates financial strength on 9 binary tests across profitability (positive ROA, positive CFO, improving ROA, cash > earnings), leverage (decreasing debt, improving liquidity, no dilution), and efficiency (improving margins, improving asset turnover). Score 8-9 = very strong, 5-7 = average, 0-4 = weak.",
    "companyInsight": "Company-specific breakdown of which tests pass/fail."
  },
  "beneishM": {
    "name": "Beneish M-Score",
    "value": -2.8,
    "maxValue": 0,
    "zone": "safe",
    "interpretation": "The Beneish M-Score detects earnings manipulation using 8 variables (DSRI, GMI, AQI, SGI, DEPI, SGAI, LVGI, TATA). An M-Score above −1.78 suggests a high probability of earnings manipulation. Below −1.78 is considered unlikely to be a manipulator. This model correctly identified Enron as a manipulator before its collapse.",
    "companyInsight": "Company-specific M-Score analysis."
  },
  "cashConversion": {
    "name": "Cash Conversion Cycle",
    "value": "45 days",
    "numericValue": 45,
    "status": "good",
    "whatItIs": "CCC = Days Inventory Outstanding + Days Sales Outstanding − Days Payables Outstanding. It measures how many days it takes to convert inventory investment into cash. A shorter cycle means faster cash generation. A declining trend signals improving efficiency; a rising trend is a red flag suggesting potential inventory buildup or collection problems.",
    "whatItMeans": "Company-specific CCC analysis with trend and peer comparison."
  },
  "capexQuality": {
    "name": "Capex Quality Ratio",
    "value": "65% Growth / 35% Maintenance",
    "numericValue": 65,
    "status": "good",
    "whatItIs": "Breaks down capital expenditure into growth capex (expanding capacity, new products, acquisitions) vs maintenance capex (keeping existing operations running). A company with mostly maintenance capex is just surviving, not growing. High growth capex ratio suggests management is investing for future returns.",
    "whatItMeans": "Company-specific capex analysis."
  },
  "sectorComparison": [
    { "metric": "P/E", "company": 25.3, "sectorAvg": 22.0, "verdict": "15% premium — justified by above-average growth" },
    { "metric": "EV/EBITDA", "company": 18.5, "sectorAvg": 14.2, "verdict": "30% premium — reflects higher margins" },
    { "metric": "P/S", "company": 8.2, "sectorAvg": 5.5, "verdict": "49% premium — priced for continued share gains" },
    { "metric": "FCF Yield", "company": 3.5, "sectorAvg": 4.2, "verdict": "Below sector — reinvesting heavily" }
  ],
  "valuationVerdict": {
    "label": "Fairly Valued",
    "confidence": "Medium",
    "summary": "3-4 sentence institutional-grade conclusion synthesizing all models. Reference specific numbers: DCF weighted value vs price, ROIC spread quality, health scores, and the biggest risk to the valuation thesis."
  }
}

CRITICAL INSTRUCTIONS:
- Every "interpretation" field must explain WHAT the metric is and WHY it matters in plain language (2-3 sentences).
- Every "companyInsight" field must be SPECIFIC to ${data.ticker} with actual numbers and analysis (2-3 sentences).
- DCF scenarios must use realistic assumptions based on the company's actual financials and growth trajectory.
- Use REAL financial data from web search. Do NOT fabricate numbers.
- Health scores must reflect actual calculations, not guesses.
- Sector comparison must use real sector average multiples.
- The valuationVerdict should synthesize ALL models into a clear, institutional-grade conclusion.`;

// =====================================================
// FETCH
// =====================================================

async function fetchValuationData(data: StockData, signal?: AbortSignal): Promise<ValuationAIData> {
  const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';
  const response = await fetch(`${API_BASE}/api/ai-proxy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      prompt: buildValuationPrompt(data),
      system: 'You are a CFA charterholder and senior equity research analyst at a top-tier investment bank. Return ONLY valid JSON. No markdown, no backticks, no preamble. CRITICAL: Keep ALL text fields to 1-2 sentences MAX. Be extremely concise. Every interpretation and companyInsight must be brief but specific with numbers.',
      useWebSearch: true,
      maxTokens: 16000,
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
  
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Try to salvage truncated JSON by closing open strings/objects
    let fixed = cleaned;
    // Remove trailing incomplete string value
    fixed = fixed.replace(/,\s*"[^"]*":\s*"[^"]*$/, '');
    // Close any open objects/arrays
    const opens = (fixed.match(/{/g) || []).length;
    const closes = (fixed.match(/}/g) || []).length;
    for (let i = 0; i < opens - closes; i++) fixed += '}';
    const openBr = (fixed.match(/\[/g) || []).length;
    const closeBr = (fixed.match(/\]/g) || []).length;
    for (let i = 0; i < openBr - closeBr; i++) fixed += ']';
    try {
      parsed = JSON.parse(fixed);
    } catch {
      throw new Error('AI response was truncated. Please retry.');
    }
  }

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

const safe = strip(parsed);

  // ---- Sanitize all numeric fields that AI might return as strings ----
  
  // sectorComparison
  if (Array.isArray(safe.sectorComparison)) {
    safe.sectorComparison = safe.sectorComparison.map((row: any) => ({
      ...row,
      company: Number(row.company) || 0,
      sectorAvg: Number(row.sectorAvg) || 0,
    }));
  }

  // SOTP
  if (safe.sotp) {
    safe.sotp.totalValue = Number(safe.sotp.totalValue) || 0;
    safe.sotp.vsMarketCap = Number(safe.sotp.vsMarketCap) || 0;
  }

  // DCF
  safe.weightedFairValue = Number(safe.weightedFairValue) || 0;
  if (Array.isArray(safe.dcfScenarios)) {
    safe.dcfScenarios = safe.dcfScenarios.map((s: any) => ({
      ...s,
      probability: Number(s.probability) || 0,
      growthRate: Number(s.growthRate) || 0,
      terminalGrowth: Number(s.terminalGrowth) || 0,
      wacc: Number(s.wacc) || 0,
      fairValue: Number(s.fairValue) || 0,
      upside: Number(s.upside) || 0,
    }));
  }

  // Reverse DCF
  if (safe.reverseDCF) {
    safe.reverseDCF.impliedGrowthRate = Number(safe.reverseDCF.impliedGrowthRate) || 0;
    safe.reverseDCF.impliedTerminalMultiple = Number(safe.reverseDCF.impliedTerminalMultiple) || 0;
  }

  // EPV
  if (safe.epv) {
    safe.epv.epvPerShare = Number(safe.epv.epvPerShare) || 0;
  }

  // ROIC
  if (safe.roicAnalysis) {
    safe.roicAnalysis.roic = Number(safe.roicAnalysis.roic) || 0;
    safe.roicAnalysis.wacc = Number(safe.roicAnalysis.wacc) || 0;
    safe.roicAnalysis.spread = Number(safe.roicAnalysis.spread) || 0;
    if (Array.isArray(safe.roicAnalysis.historicalSpread)) {
      safe.roicAnalysis.historicalSpread = safe.roicAnalysis.historicalSpread.map((h: any) => ({
        period: h.period || h.year || '',
        spread: Number(h.spread) || 0,
        roic:   h.roic  != null ? Number(h.roic)  : undefined,
        wacc:   h.wacc  != null ? Number(h.wacc)  : undefined,
      }));
    }
  }

  // Health scores
  ['altmanZ', 'piotroskiF', 'beneishM'].forEach((key) => {
    if (safe[key]) {
      safe[key].value = Number(safe[key].value) || 0;
      safe[key].maxValue = Number(safe[key].maxValue) || 0;
    }
  });

  // Quality metrics
  ['cashConversion', 'capexQuality'].forEach((key) => {
    if (safe[key]) {
      safe[key].numericValue = Number(safe[key].numericValue) || 0;
    }
  });
  if (Array.isArray(safe.earningsQuality)) {
    safe.earningsQuality = safe.earningsQuality.map((m: any) => ({
      ...m,
      numericValue: Number(m.numericValue) || 0,
    }));
  }

  return safe as ValuationAIData;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

// --- Expandable Insight ---
const InsightBlock = memo(({ whatItIs, whatItMeans, label }: { whatItIs: string; whatItMeans: string; label?: string }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(p => !p)}
        className="flex items-center gap-1.5 text-[11px] text-[#C9A646] hover:text-[#F4D97B] transition-colors"
      >
        <Info className="w-3 h-3" />
        <span>{expanded ? 'Hide' : 'What does this mean?'}</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(201,166,70,0.04)', border: '1px solid rgba(201,166,70,0.08)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#C9A646] mb-1.5">{label || 'Definition'}</p>
            <p className="text-[12px] text-[#8B8B8B] leading-[1.7]">{whatItIs}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.08)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E] mb-1.5">Company Insight</p>
            <p className="text-[12px] text-[#A0A0A0] leading-[1.7]">{whatItMeans}</p>
          </div>
        </div>
      )}
    </div>
  );
});
InsightBlock.displayName = 'InsightBlock';

// --- Inline Insight (icon-only, for compact rows) ---
const InsightInline = memo(({ whatItIs, whatItMeans, label }: { whatItIs: string; whatItMeans: string; label?: string }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(p => !p)}
        className="text-[#C9A646]/40 hover:text-[#C9A646] transition-colors"
        title="What does this mean?"
      >
        <Info className="w-3 h-3" />
      </button>
      {expanded && (
        <div className="absolute right-0 top-6 z-50 w-72 space-y-2 shadow-2xl"
          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))' }}>
          <div className="p-3 rounded-lg" style={{ background: '#141414', border: '1px solid rgba(201,166,70,0.15)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#C9A646]">{label || 'Definition'}</p>
              <button onClick={() => setExpanded(false)} className="text-[#555] hover:text-white">
                <ChevronUp className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-[#8B8B8B] leading-[1.7] mb-2">{whatItIs}</p>
            <div className="pt-2 border-t border-white/[0.06]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E] mb-1">Company Insight</p>
              <p className="text-[11px] text-[#A0A0A0] leading-[1.7]">{whatItMeans}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
InsightInline.displayName = 'InsightInline';

// --- Health Score Gauge ---
const HealthGauge = memo(({ score }: { score: HealthScore }) => {
  const pct = Math.min((score.value / score.maxValue) * 100, 100);
  const zoneColor = score.zone === 'safe' ? '#22C55E' : score.zone === 'warning' ? '#F59E0B' : '#EF4444';
  const zoneBg = score.zone === 'safe' ? 'rgba(34,197,94,0.08)' : score.zone === 'warning' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)';
  const zoneLabel = score.zone === 'safe' ? 'Safe' : score.zone === 'warning' ? 'Caution' : 'Danger';

  return (
    <div className="p-4 rounded-xl" style={{ background: zoneBg, border: `1px solid ${zoneColor}15` }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-white">{score.name}</p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${zoneColor}20`, color: zoneColor }}>
            {zoneLabel}
          </span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black" style={{ color: zoneColor }}>{score.value.toFixed(1)}</p>
          <p className="text-[10px] text-[#6B6B6B]">/ {score.maxValue}</p>
        </div>
      </div>
      {/* Bar */}
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-1">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: zoneColor }} />
      </div>
      <InsightBlock whatItIs={score.interpretation} whatItMeans={score.companyInsight} label={score.name} />
    </div>
  );
});
HealthGauge.displayName = 'HealthGauge';

// --- Quality Metric Card ---
const QualityCard = memo(({ metric }: { metric: QualityMetric }) => {
  const color = metric.status === 'good' ? '#22C55E' : metric.status === 'bad' ? '#EF4444' : '#F59E0B';
  const icon = metric.status === 'good' ? <ArrowUpRight className="w-3 h-3" /> : metric.status === 'bad' ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />;

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
      <p className="text-xs text-[#8B8B8B]">{metric.name}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm font-bold" style={{ color }}>{metric.value}</p>
        <div style={{ color }}>{icon}</div>
        <InsightInline whatItIs={metric.whatItIs} whatItMeans={metric.whatItMeans} label={metric.name} />
      </div>
    </div>
  );
});
QualityCard.displayName = 'QualityCard';

// --- DCF Scenario Bar ---
const DCFBar = memo(({ scenario, currentPrice }: { scenario: DCFScenario; currentPrice: number }) => {
  const color = scenario.label === 'Bull' ? '#22C55E' : scenario.label === 'Bear' ? '#EF4444' : '#C9A646';
  const maxVal = Math.max(scenario.fairValue, currentPrice) * 1.2;
  const fairPct = (scenario.fairValue / maxVal) * 100;
  const pricePct = (currentPrice / maxVal) * 100;

  return (
    <div className="p-4 rounded-xl" style={{ background: `${color}08`, border: `1px solid ${color}12` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color }}>{scenario.label}</span>
          <span className="text-[10px] text-[#6B6B6B]">{(scenario.probability * 100).toFixed(0)}% prob</span>
        </div>
        <span className="text-lg font-black" style={{ color }}>${scenario.fairValue}</span>
      </div>
      {/* Visual bar */}
      <div className="relative h-3 bg-white/[0.04] rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full" style={{ width: `${fairPct}%`, background: `${color}50` }} />
        {/* Current price marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white"
          style={{ left: `${pricePct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[#6B6B6B]">
        <span>Growth: {scenario.growthRate}% CAGR</span>
        <span>WACC: {scenario.wacc}%</span>
        <span className={cn("font-semibold", scenario.upside >= 0 ? "text-[#22C55E]" : "text-[#EF4444]")}>
          {scenario.upside >= 0 ? '+' : ''}{scenario.upside.toFixed(1)}%
        </span>
      </div>
    </div>
  );
});
DCFBar.displayName = 'DCFBar';

// --- ROIC Spread Chart (SVG) ---
const ROICChart = memo(({ data }: { data: { period: string; spread: number; roic?: number; wacc?: number }[] }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (!data || data.length < 2) return null;

  const W = 400, H = 140;
  const padL = 35, padR = 10, padT = 30, padB = 25;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const spreads = data.map(d => d.spread);
  const minS = Math.min(...spreads, 0) - 1;
  const maxS = Math.max(...spreads) + 2;
  const range = maxS - minS;

  const getX = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const getY = (v: number) => padT + chartH - ((v - minS) / range) * chartH;
  const zeroY = getY(0);

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.spread) }));
  const line = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `${acc} C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
  }, '');
  const area = `${line} L ${points[points.length - 1].x} ${zeroY} L ${points[0].x} ${zeroY} Z`;

  // Y/Y change calculation
  const getYoY = (i: number) => {
    if (i === 0) return null;
    const diff = spreads[i] - spreads[i - 1];
    return diff;
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxHeight: '150px' }}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <defs>
        <linearGradient id="roicGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
        </linearGradient>
        <filter id="roicGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Zero line */}
      <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 4" />
      <text x={padL - 6} y={zeroY + 3} textAnchor="end" fill="#6B6B6B" fontSize="8">0%</text>

      {/* Area + Line */}
      <path d={area} fill="url(#roicGrad)" />
      <path d={line} fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />

      {/* Vertical hover guide line */}
      {hoverIdx !== null && (
        <line
          x1={points[hoverIdx].x} y1={padT}
          x2={points[hoverIdx].x} y2={H - padB}
          stroke="rgba(201,166,70,0.3)" strokeWidth="1" strokeDasharray="3 3"
        />
      )}

      {/* Data points */}
      {points.map((p, i) => {
        const isHovered = hoverIdx === i;
        return (
          <g key={i}>
            {/* Glow on hover */}
            {isHovered && (
              <circle cx={p.x} cy={p.y} r="8" fill="rgba(34,197,94,0.2)" filter="url(#roicGlow)" />
            )}
            {/* Circle */}
            <circle
              cx={p.x} cy={p.y}
              r={isHovered ? 5 : 3.5}
              fill={isHovered ? '#22C55E' : '#0a0a0a'}
              stroke="#22C55E"
              strokeWidth={isHovered ? 2 : 1.5}
              style={{ transition: 'r 0.15s, fill 0.15s' }}
            />
            {/* Static labels only when NOT hovered on any point */}
            {hoverIdx === null && (
              <>
                <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#22C55E" fontSize="9" fontWeight="600">
                  {spreads[i].toFixed(1)}%
                </text>
              </>
            )}
            {/* Year labels always visible */}
            <text x={p.x} y={H - 5} textAnchor="middle" fill={isHovered ? '#C9A646' : '#6B6B6B'} fontSize="8" fontWeight={isHovered ? '700' : '400'}>
              {data[i].period}
            </text>
          </g>
        );
      })}

      {/* Tooltip on hover */}
      {hoverIdx !== null && (() => {
        const p = points[hoverIdx];
        const spread = spreads[hoverIdx];
        const yoy = getYoY(hoverIdx);
        const ttW = 120, ttH = yoy !== null ? 52 : 36;
        // Position tooltip above the point, clamp to SVG bounds
        let tx = p.x - ttW / 2;
        if (tx < 2) tx = 2;
        if (tx + ttW > W - 2) tx = W - ttW - 2;
        const ty = p.y - ttH - 14;

        return (
          <g>
            {/* Tooltip background */}
            <rect
              x={tx} y={ty} width={ttW} height={ttH} rx={6}
              fill="#1a1a2e" stroke="rgba(201,166,70,0.3)" strokeWidth="0.8"
            />
            {/* Year header */}
            <text x={tx + 8} y={ty + 14} fill="#C9A646" fontSize="9" fontWeight="700" letterSpacing="0.04em">
              {data[hoverIdx].period}
            </text>
            {/* Spread value */}
            <text x={tx + ttW - 8} y={ty + 14} textAnchor="end" fill={spread >= 0 ? '#22C55E' : '#EF4444'} fontSize="10" fontWeight="700">
              {spread >= 0 ? '+' : ''}{spread.toFixed(1)}%
            </text>
            {/* Spread label */}
            <text x={tx + 8} y={ty + 28} fill="#6B6B6B" fontSize="8">ROIC-WACC Spread</text>
            {/* Y/Y change if available */}
            {yoy !== null && (
              <>
                <text x={tx + 8} y={ty + 42} fill="#8B8B8B" fontSize="8">Y/Y Δ</text>
                <text x={tx + ttW - 8} y={ty + 42} textAnchor="end" fill={yoy >= 0 ? '#22C55E' : '#EF4444'} fontSize="9" fontWeight="600">
                  {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}pp
                </text>
              </>
            )}
          </g>
        );
      })()}

      {/* Invisible hit areas for hover detection */}
      {points.map((p, i) => {
        const sliceW = chartW / data.length;
        return (
          <rect
            key={`hit-${i}`}
            x={p.x - sliceW / 2}
            y={0}
            width={sliceW}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
            style={{ cursor: 'crosshair' }}
          />
        );
      })}
    </svg>
  );
});
ROICChart.displayName = 'ROICChart';

// --- Verdict Badge ---
const VerdictBadge = memo(({ label, confidence }: { label: string; confidence: string }) => {
  const color = label.includes('Under') ? '#22C55E' : label.includes('Over') ? '#EF4444' : '#C9A646';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="px-6 py-3 rounded-2xl" style={{ background: `${color}12`, border: `2px solid ${color}30` }}>
        <p className="text-xl font-black" style={{ color }}>{label}</p>
      </div>
      <span className="text-[10px] text-[#6B6B6B]">Confidence: {confidence}</span>
    </div>
  );
});
VerdictBadge.displayName = 'VerdictBadge';

// --- Loading Skeleton ---
const ValuationSkeleton = memo(() => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="rounded-2xl h-44" style={{ background: 'rgba(201,166,70,0.03)', border: '1px solid rgba(201,166,70,0.08)' }} />
    ))}
  </div>
));
ValuationSkeleton.displayName = 'ValuationSkeleton';

// =====================================================
// MAIN COMPONENT
// =====================================================

export const ValuationTab = memo(({ data, prefetchedValuation }: { data: StockData; prefetchedValuation?: any }) => {
  const [aiData, setAiData] = useState<ValuationAIData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tickerRef = useRef(data.ticker);

  const generate = useCallback(async (force = false) => {
    const ticker = data.ticker;

    // 1. Local memory cache (instant)
    if (!force && valuationCache.has(ticker)) {
      setAiData(valuationCache.get(ticker)!.data);
      return;
    }

    // 2. PREFETCHED or SERVER cache (shared across ALL users — Supabase-backed)
    if (!force) {
      try {
        const serverCached = prefetchedValuation || await checkServerValuationCache(ticker);
        if (serverCached) {
          console.log(`[Valuation] ⚡ ${prefetchedValuation ? 'PREFETCHED' : 'SERVER CACHE'} HIT for ${ticker}`);
          valuationCache.set(ticker, { data: serverCached, generatedAt: new Date().toISOString() });
          if (tickerRef.current === ticker) setAiData(serverCached);
          return;
        }
      } catch { /* continue to generate */ }
    }

    // 3. Generate fresh with AI
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchValuationData(data, controller.signal);
      valuationCache.set(ticker, { data: result, generatedAt: new Date().toISOString() });
      // Save to server for next user!
      saveServerValuationCache(ticker, result, (data as any).nextEarningsDate);
      if (tickerRef.current === ticker) setAiData(result);
    } catch (err: any) {
      if (err.name !== 'AbortError' && tickerRef.current === ticker) {
        setError(err.message || 'Failed to load valuation data');
      }
    } finally {
      if (tickerRef.current === ticker) setIsLoading(false);
    }
  }, [data, prefetchedValuation]);

  useEffect(() => {
    tickerRef.current = data.ticker;
    generate();
    return () => { abortRef.current?.abort(); };
  }, [data.ticker, generate]);

  return (
    <div className="space-y-4">

      {/* ============================================= */}
      {/* 1. Current Multiples */}
      {/* ============================================= */}
      <Card>
        <div className="p-6">
          <SectionHeader icon={Scale} title="Valuation Multiples" subtitle="Current trading multiples" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'P/E (TTM)', value: data.pe, suffix: 'x', benchmark: 22, benchLabel: 'S&P ~22x' },
              { label: 'Forward P/E', value: data.forwardPe, suffix: 'x', benchmark: 20, benchLabel: 'Fwd ~20x' },
              { label: 'PEG Ratio', value: data.pegRatio, suffix: 'x', benchmark: 1, benchLabel: 'Fair ≈ 1.0x' },
              { label: 'P/S', value: data.ps, suffix: 'x', benchmark: 3, benchLabel: 'Median ~3x' },
              { label: 'P/B', value: data.pb, suffix: 'x', benchmark: 3, benchLabel: 'Median ~3x' },
              { label: 'EV/EBITDA', value: data.evEbitda, suffix: 'x', benchmark: 13, benchLabel: 'Median ~13x' },
              { label: 'EV/Revenue', value: data.evRevenue, suffix: 'x', benchmark: 3, benchLabel: 'Median ~3x' },
              { label: 'FCF Yield', value: data.fcfYield, suffix: '%', benchmark: 4, benchLabel: 'Good > 4%', invert: true },
            ].map((m) => {
              const valid = isValid(m.value);
              const val = m.value ?? 0;
              // @ts-ignore
              const isCheap = m.invert ? val > m.benchmark : val < m.benchmark;
              const color = !valid ? '#6B6B6B' : isCheap ? '#22C55E' : '#F59E0B';
              return (
                <div key={m.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <p className="text-[10px] text-[#6B6B6B] mb-1">{m.label}</p>
                  <p className="text-lg font-bold" style={{ color: valid ? 'white' : '#6B6B6B' }}>
                    {valid ? m.value!.toFixed(1) + m.suffix : 'N/A'}
                  </p>
                  {valid && (
                    <p className="text-[10px] mt-1" style={{ color }}>
                      {isCheap ? '✓' : '△'} vs {m.benchLabel}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ============================================= */}
      {/* 2. Valuation Context (client-side) */}
      {/* ============================================= */}
      <Card highlight>
        <div className="relative p-6">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A646] to-transparent" />
          <SectionHeader icon={Info} title="Quick Valuation Context" />
          <div className="space-y-3">
            {isValid(data.pe) && isValid(data.forwardPe) && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                <span className="text-sm text-[#8B8B8B]">P/E Trailing vs Forward</span>
                <span className={cn("text-sm font-semibold",
                  data.forwardPe! < data.pe! ? "text-[#22C55E]" : "text-[#F59E0B]"
                )}>
                  {data.pe!.toFixed(1)}x → {data.forwardPe!.toFixed(1)}x
                  {data.forwardPe! < data.pe! ? ' (Earnings Expanding)' : ' (Compression Risk)'}
                </span>
              </div>
            )}
            {isValid(data.roic) && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                <span className="text-sm text-[#8B8B8B]">ROIC (Return on Invested Capital)</span>
                <span className={cn("text-sm font-semibold",
                  data.roic! > 15 ? "text-[#22C55E]" : data.roic! > 8 ? "text-[#F59E0B]" : "text-[#EF4444]"
                )}>
                  {data.roic!.toFixed(1)}% {data.roic! > 15 ? '— Value Creator' : data.roic! > 8 ? '— Average' : '— Below Cost of Capital'}
                </span>
              </div>
            )}
            {isValid(data.pegRatio) && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                <span className="text-sm text-[#8B8B8B]">PEG Ratio (Growth-Adj. P/E)</span>
                <span className={cn("text-sm font-semibold",
                  data.pegRatio! <= 1 ? "text-[#22C55E]" : data.pegRatio! <= 2 ? "text-[#F59E0B]" : "text-[#EF4444]"
                )}>
                  {data.pegRatio!.toFixed(2)}x {data.pegRatio! <= 1 ? '— Undervalued' : data.pegRatio! <= 2 ? '— Fair' : '— Overvalued'}
                </span>
              </div>
            )}
            {isValid(data.fcfYield) && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                <span className="text-sm text-[#8B8B8B]">Free Cash Flow Yield</span>
                <span className={cn("text-sm font-semibold",
                  data.fcfYield! > 5 ? "text-[#22C55E]" : data.fcfYield! > 2 ? "text-[#F59E0B]" : "text-[#EF4444]"
                )}>
                  {data.fcfYield!.toFixed(1)}% {data.fcfYield! > 5 ? '— Attractive' : data.fcfYield! > 2 ? '— Moderate' : '— Low'}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ============================================= */}
      {/* AI-POWERED DEEP VALUATION */}
      {/* ============================================= */}

      {error && !aiData && (
        <Card>
          <div className="p-6 text-center">
            <p className="text-sm text-[#EF4444] mb-3">{error}</p>
            <button onClick={() => generate(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(201,166,70,0.08)', border: '1px solid rgba(201,166,70,0.15)', color: '#C9A646' }}>
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        </Card>
      )}

      {isLoading && !aiData && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 py-3">
            <div className="w-5 h-5 rounded-full border-2 border-[#C9A646]/30 border-t-[#C9A646] animate-spin" />
            <span className="text-sm text-[#8B8B8B]">Running deep valuation models for {data.ticker}...</span>
          </div>
          <ValuationSkeleton />
        </div>
      )}

      {/* ============================================= */}
      {/* 3. DCF — 3 Scenarios */}
      {/* ============================================= */}
      {aiData?.dcfScenarios && (
        <Card gold>
          <div className="p-6">
            <SectionHeader icon={DollarSign} title="DCF Valuation" subtitle="Discounted Cash Flow — 3 probability-weighted scenarios" badge="AI-Powered" />
            <div className="space-y-3">
              {aiData.dcfScenarios.map((s, i) => (
                <DCFBar key={i} scenario={s} currentPrice={data.price} />
              ))}
            </div>
            {/* Weighted fair value */}
            <div className="mt-4 p-4 rounded-xl text-center" style={{ background: 'rgba(201,166,70,0.06)', border: '1px solid rgba(201,166,70,0.15)' }}>
              <p className="text-[10px] text-[#6B6B6B] mb-1">Probability-Weighted Fair Value</p>
              <p className="text-3xl font-black text-[#C9A646]">${aiData.weightedFairValue}</p>
              {(() => {
                const up = ((aiData.weightedFairValue - data.price) / data.price) * 100;
                return (
                  <p className={cn("text-sm font-semibold mt-1", up >= 0 ? "text-[#22C55E]" : "text-[#EF4444]")}>
                    {up >= 0 ? '+' : ''}{up.toFixed(1)}% vs current ${data.price.toFixed(2)}
                  </p>
                );
              })()}
            </div>
          </div>
        </Card>
      )}

      {/* ============================================= */}
      {/* 4. Reverse DCF */}
      {/* ============================================= */}
      {aiData?.reverseDCF && (
        <Card>
          <div className="p-6">
            <SectionHeader icon={Search} title="Reverse DCF" subtitle="What growth is the market pricing in?" />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-xl bg-white/[0.03] text-center">
                <p className="text-[10px] text-[#6B6B6B] mb-1">Implied Growth Rate</p>
                <p className="text-2xl font-black text-[#C9A646]">{aiData.reverseDCF.impliedGrowthRate}%</p>
                <p className="text-[10px] text-[#6B6B6B]">CAGR next 10 years</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] text-center">
                <p className="text-[10px] text-[#6B6B6B] mb-1">Implied Terminal Multiple</p>
                <p className="text-2xl font-black text-white">{aiData.reverseDCF.impliedTerminalMultiple}x</p>
                <p className="text-[10px] text-[#6B6B6B]">Exit EV/EBITDA</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("px-3 py-1 rounded-lg text-xs font-bold",
                aiData.reverseDCF.isRealistic ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#EF4444]/10 text-[#EF4444]"
              )}>
                {aiData.reverseDCF.isRealistic ? '✓ Realistic' : '⚠ Aggressive'}
              </div>
            </div>
            <InsightBlock whatItIs={aiData.reverseDCF.interpretation} whatItMeans={aiData.reverseDCF.companyInsight} label="Reverse DCF" />
          </div>
        </Card>
      )}

      {/* ============================================= */}
      {/* 5. EPV (Earnings Power Value) */}
      {/* ============================================= */}
      {aiData?.epv && (
        <Card>
          <div className="p-6">
            <SectionHeader icon={Lock} title="Earnings Power Value (EPV)" subtitle="Zero-growth intrinsic value — Bruce Greenwald model" />
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-white/[0.03] text-center">
                <p className="text-[10px] text-[#6B6B6B] mb-1">Adj. Earnings</p>
                <p className="text-sm font-bold text-white">{aiData.epv.adjustedEarnings}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] text-center">
                <p className="text-[10px] text-[#6B6B6B] mb-1">EPV / Share</p>
                <p className="text-lg font-black text-[#C9A646]">${aiData.epv.epvPerShare}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] text-center">
                <p className="text-[10px] text-[#6B6B6B] mb-1">Franchise Value</p>
                <p className={cn("text-sm font-bold", aiData.epv.franchiseValue ? "text-[#22C55E]" : "text-[#F59E0B]")}>
                  {aiData.epv.franchiseValue ? 'Yes (Moat)' : 'No'}
                </p>
              </div>
            </div>
            <InsightBlock whatItIs={aiData.epv.interpretation} whatItMeans={aiData.epv.companyInsight} label="Earnings Power Value" />
          </div>
        </Card>
      )}

      {/* ============================================= */}
      {/* 6. ROIC vs WACC Spread */}
      {/* ============================================= */}
      {aiData?.roicAnalysis && (
        <Card>
          <div className="p-6">
            <SectionHeader icon={Activity} title="ROIC vs WACC — Value Creation" subtitle="The most fundamental measure of capital efficiency" />
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
                <p className="text-[10px] text-[#6B6B6B] mb-1">ROIC</p>
                <p className="text-xl font-black text-[#22C55E]">{aiData.roicAnalysis.roic}%</p>
              </div>
              <div className="p-3 rounded-xl text-center bg-white/[0.03]">
                <p className="text-[10px] text-[#6B6B6B] mb-1">WACC</p>
                <p className="text-xl font-black text-white">{aiData.roicAnalysis.wacc}%</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{
                background: aiData.roicAnalysis.spread > 0 ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                border: `1px solid ${aiData.roicAnalysis.spread > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}`,
              }}>
                <p className="text-[10px] text-[#6B6B6B] mb-1">Spread</p>
                <p className={cn("text-xl font-black", aiData.roicAnalysis.spread > 0 ? "text-[#22C55E]" : "text-[#EF4444]")}>
                  {aiData.roicAnalysis.spread > 0 ? '+' : ''}{aiData.roicAnalysis.spread}%
                </p>
                <span className="text-[10px]" style={{ color: aiData.roicAnalysis.spread > 0 ? '#22C55E' : '#EF4444' }}>
                  {aiData.roicAnalysis.spread > 0 ? 'Creating Value' : 'Destroying Value'}
                </span>
              </div>
            </div>
            {/* Trend chart */}
            {aiData.roicAnalysis.historicalSpread?.length > 1 && (
              <div className="mb-3 p-3 rounded-xl bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5A6E]">
                    Spread Trend — {aiData.roicAnalysis.spreadTrend}
                  </p>
                </div>
                <ROICChart data={aiData.roicAnalysis.historicalSpread} />
              </div>
            )}
            <InsightBlock whatItIs={aiData.roicAnalysis.interpretation} whatItMeans={aiData.roicAnalysis.companyInsight} label="ROIC vs WACC" />
          </div>
        </Card>
      )}

      {/* ============================================= */}
      {/* 7. SOTP (Sum of the Parts) */}
      {/* ============================================= */}
      {aiData?.sotp && (
        <Card>
          <div className="p-6">
            <SectionHeader icon={Building2} title="Sum of the Parts" subtitle="Segment-by-segment valuation" />
            <div className="space-y-2 mb-4">
              {aiData.sotp.segments.map((seg, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <p className="text-sm font-medium text-white">{seg.name}</p>
                    <p className="text-[10px] text-[#6B6B6B]">{seg.methodology}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#C9A646]">{seg.value}</p>
                    <p className="text-[10px] text-[#6B6B6B]">{seg.multiple}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(201,166,70,0.06)', border: '1px solid rgba(201,166,70,0.12)' }}>
              <p className="text-[10px] text-[#6B6B6B]">SOTP Fair Value</p>
              <p className="text-2xl font-black text-[#C9A646]">${aiData.sotp.totalValue}/share</p>
              <p className={cn("text-xs font-semibold mt-1",
                aiData.sotp.vsMarketCap > 0 ? "text-[#22C55E]" : "text-[#EF4444]"
              )}>
                {aiData.sotp.vsMarketCap > 0 ? '+' : ''}{aiData.sotp.vsMarketCap.toFixed(1)}% vs Market Cap
              </p>
            </div>
            {aiData.sotp.interpretation && (
              <p className="mt-3 text-[12px] text-[#8B8B8B] leading-[1.7]">{aiData.sotp.interpretation}</p>
            )}
          </div>
        </Card>
      )}

      {/* ============================================= */}
      {/* 8+9. Earnings & Capital Quality (merged)     */}
      {/* ============================================= */}
      {(aiData?.earningsQuality?.length || aiData?.cashConversion || aiData?.capexQuality) && (
        <Card>
          <div className="p-5">
            <SectionHeader icon={Sparkles} title="Earnings & Capital Quality" />
            <div className="space-y-1.5 mt-4">
              {aiData?.earningsQuality?.map((m, i) => (
                <QualityCard key={i} metric={m} />
              ))}
              {aiData?.cashConversion && <QualityCard metric={aiData.cashConversion} />}
              {aiData?.capexQuality && <QualityCard metric={aiData.capexQuality} />}
            </div>
          </div>
        </Card>
      )}

      {/* ============================================= */}
      {/* 10. Financial Health Scores */}
      {/* ============================================= */}
      {(aiData?.altmanZ || aiData?.piotroskiF || aiData?.beneishM) && (
        <Card>
          <div className="p-6">
            <SectionHeader icon={Shield} title="Financial Health Scores" subtitle="Bankruptcy risk, financial strength & manipulation detection" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiData.altmanZ && <HealthGauge score={aiData.altmanZ} />}
              {aiData.piotroskiF && <HealthGauge score={aiData.piotroskiF} />}
              {aiData.beneishM && (
                <div className="p-4 rounded-xl" style={{
                  background: aiData.beneishM.zone === 'safe' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${aiData.beneishM.zone === 'safe' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}`,
                }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Beneish M-Score</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                        background: aiData.beneishM.zone === 'safe' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                        color: aiData.beneishM.zone === 'safe' ? '#22C55E' : '#EF4444',
                      }}>
                        {aiData.beneishM.zone === 'safe' ? 'Unlikely Manipulator' : '⚠ Possible Manipulator'}
                      </span>
                    </div>
                    <p className="text-2xl font-black" style={{ color: aiData.beneishM.zone === 'safe' ? '#22C55E' : '#EF4444' }}>
                      {aiData.beneishM.value.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-[10px] text-[#6B6B6B] mb-1">Threshold: −1.78 (above = risk)</p>
                  <InsightBlock whatItIs={aiData.beneishM.interpretation} whatItMeans={aiData.beneishM.companyInsight} label="Beneish M-Score" />
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ============================================= */}
      {/* 11. Sector Comparison */}
      {/* ============================================= */}
      {aiData?.sectorComparison && aiData.sectorComparison.length > 0 && (
        <Card>
          <div className="p-6">
            <SectionHeader icon={BarChart3} title="Sector Comparison" subtitle={`${data.ticker} vs ${data.sector} averages`} />
            <div className="space-y-2">
              {aiData.sectorComparison.map((row, i) => {
                const companyVal = Number(row.company) || 0;
                const sectorVal = Number(row.sectorAvg) || 0;
                const isPremium = companyVal > sectorVal;
                return (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{row.metric}</span>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-[#C9A646] font-semibold">{data.ticker}: {companyVal.toFixed(1)}x</span>
                        <span className="text-[#6B6B6B]">Sector: {sectorVal.toFixed(1)}x</span>
                      </div>
                    </div>
                    {/* Comparative bar */}
                    <div className="relative h-2 bg-white/[0.04] rounded-full overflow-hidden mb-1.5">
                      <div className="absolute h-full rounded-full bg-[#C9A646]/40" style={{ width: `${Math.min((companyVal / Math.max(companyVal, sectorVal, 0.01) * 1.1) * 100 / 1.1, 100)}%` }} />
                      <div
                        className="absolute top-0 h-full w-0.5 bg-[#6B6B6B]"
                        style={{ left: `${(sectorVal / Math.max(companyVal, sectorVal, 0.01) * 1.1) * 100 / 1.1}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#8B8B8B]">{row.verdict}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* ============================================= */}
      {/* 12. Overall Verdict */}
      {/* ============================================= */}
      {aiData?.valuationVerdict && (
        <Card gold>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #B8963F, #C9A646)' }}>
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Valuation Verdict</h3>
                <p className="text-xs text-[#6B6B6B]">Synthesis of all models</p>
              </div>
            </div>
            <div className="flex justify-center mb-5">
              <VerdictBadge label={aiData.valuationVerdict.label} confidence={aiData.valuationVerdict.confidence} />
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'rgba(201,166,70,0.04)', border: '1px solid rgba(201,166,70,0.1)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A646]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#C9A646]">AI Analysis</span>
              </div>
              <p className="text-[13px] text-[#A0A0A0] leading-[1.85]">{aiData.valuationVerdict.summary}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ============================================= */}
      {/* 13. Who Should Own This Stock               */}
      {/* ============================================= */}
      <WhoShouldOwnThis data={data} />

      
    </div>
  );
});

ValuationTab.displayName = 'ValuationTab';