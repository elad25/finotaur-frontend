// src/components/stock-analyzer/tabs/OverviewTab.tsx
// =====================================================
// 🧠 AI-POWERED OVERVIEW TAB v5.0 — FINOTAUR DEEP BRIEF
// =====================================================
// v5.0 CHANGES:
//   ✅ REPLACED "Company at a Glance" + "Key Metrics" with AI-generated
//      "Positive Factors / Negative Factors" section
//   ✅ Factors are generated alongside the Investment Story (one AI call)
//   ✅ Each side shows 3 factors with bold title + detailed paragraph
//   ✅ Premium institutional styling matching Finotaur design language
//   ✅ Cached alongside existing brief data
//   ✅ All prior v4.0 features retained (7 AI sections, auto-load, etc.)
//
// BACKEND REQUIREMENT:
//   Mount aiProxy.js in index.js:
//     import aiProxyRouter from './routes/aiProxy.js';
//     app.use('/api/ai-proxy', aiProxyRouter);
//
//   Set env vars:
//     OPENAI_API_KEY=sk-...
//     PERPLEXITY_API_KEY=pplx-... (optional, for web search)
// =====================================================

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { Skeleton } from '@/components/ds/Skeleton';
import { StockTabErrorBoundary } from '../StockTabErrorBoundary';
import { FinoInsightCard } from '@/components/ai-insight/FinoInsightCard';
import {
  Building2, Activity, FileText, Sparkles, BarChart3, Globe,
  Brain, Shield, AlertTriangle, Calendar,
  ChevronDown, ChevronUp, Loader2, RefreshCw, Zap, Eye,
  Landmark, Crosshair, Users, Copy, Check, Search, TrendingUp, TrendingDown, BarChart2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types/stock-analyzer.types';
import { authFetch } from '@/utils/authFetch';
import { Card, MetricBox, SectionHeader, FactRow } from '../ui';
import { fmtBig, fmtPrice, fmt, isValid, generateSignal, generateInvestmentThesis } from '@/utils/stock-analyzer.utils';
import { saveToServerCache } from '@/services/stock-analyzer.api';

// =====================================================
// TYPES
// =====================================================

interface AISection {
  id: string;
  title: string;
  icon: any;
  badge: string;
  color: string;
  content: string | null;
  verdict: string | null;
  verdictColor: string | null;
  isLoading: boolean;
  error: string | null;
  searchUsed: boolean;
}

interface FactorItem {
  title: string;
  description: string;
}

interface InvestmentStoryData {
  summary: string;
  bullCase: string;
  bearCase: string;
  optionsInsight: string;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Reduce' | 'Sell';
  positiveFactors?: FactorItem[];
  negativeFactors?: FactorItem[];
}

interface BriefCache {
  ticker: string;
  sections: AISection[];
  generatedAt: string;
  investmentStory?: InvestmentStoryData | null;
}

// =====================================================
// BRIEF CACHE — in-memory, survives tab switches
// =====================================================

const briefCacheMap = new Map<string, BriefCache>();

// =====================================================
// SYSTEM PROMPT
// =====================================================

const SYSTEM_PROMPT = `You are a senior equity research analyst writing for smart investors who want clear, practical analysis — not a textbook.

VOICE & STYLE:
- Write like a sharp analyst talking to a colleague over coffee — confident, direct, no fluff
- Use natural conversational prose. Two short paragraphs maximum (4 lines each)
- NO markdown, NO headers, NO bullet points, NO numbered lists, NO bold, NO asterisks (**)
- NO citation brackets like [1], [2], [3] or any reference markers
- NO phrases like "it's worth noting", "it should be noted", "importantly", "notably"
- Start with the most important insight, not background. Never open with "Company X is a..."
- Every sentence must teach the reader something new about the company's situation
- Use specific numbers naturally within sentences — don't list metrics, weave them into your argument
- If you searched the web, blend findings naturally. Never say "according to my search"
- NEVER give direct buy/sell instructions like "Buy X now" or "Sell X immediately". Instead, describe the situation and let the reader decide. Say "the setup looks attractive" not "buy this stock"
- This is NOT investment advice. Present analysis and observations, not commands
- Write for someone who has 20 seconds to decide if this matters to their portfolio
- STRICT LIMIT: 2 paragraphs, roughly 4 lines each. No more.
- The verdict/rating/grade line at the end must also have NO asterisks or bold formatting — just plain text.`;

// =====================================================
// VERDICT PARSER
// =====================================================

function extractVerdict(content: string, sectionId: string): { verdict: string; color: string } | null {
  const patterns: Record<string, RegExp[]> = {
    executive_thesis: [/(?:Rating|Signal|Verdict|Position):\s*(.+?)(?:\.|$)/im],
    management_credibility: [/Verdict:\s*Management credibility is\s*(\w+)/i, /Verdict:\s*(.+?)(?:\.|$)/i],
    financial_deep_dive: [/Financial Health Grade:\s*([A-F][+-]?)\s*[—–\-]\s*(.+?)(?:\.|$)/i, /Grade:\s*(.+?)(?:\.|$)/i],
    competitive_moat: [/Moat Rating:\s*(\w+)\s*[—–\-]/i, /Moat:\s*(.+?)(?:\.|$)/i],
    macro_bridge: [/Macro Positioning:\s*(.+?)(?:\.|$)/i, /Positioning:\s*(.+?)(?:\.|$)/i],
    hidden_risks: [/Risk Level:\s*(\w+)\s*[—–\-]/i, /Risk:\s*(.+?)(?:\.|$)/i],
    catalysts_timeline: [/Key Date to Watch:\s*(.+?)(?:\.|$)/i, /Key Catalyst:\s*(.+?)(?:\.|$)/i],
  };

  const sectionPatterns = patterns[sectionId] || [];
  for (const pattern of sectionPatterns) {
    const match = content.match(pattern);
    if (match) {
      // For financial_deep_dive with grade pattern, combine grade letter + description

const verdict = (sectionId === 'financial_deep_dive' && match[2]) 
  ? `Grade: ${match[1].trim()} — ${match[2].trim()}`
  : (sectionId === 'financial_deep_dive')
    ? `Grade: ${match[1].trim()}`
    : match[1].trim();
      const lower = verdict.toLowerCase();
      if (['high', 'strong', 'wide', 'favorable', 'a+', 'a-', 'a ', 'buy'].some(k => lower.startsWith(k) || lower.includes(k)))
        return { verdict, color: '#22C55E' };
      if (['moderate', 'narrow', 'neutral', 'b+', 'b ', 'b-', 'hold', 'monitor'].some(k => lower.startsWith(k) || lower.includes(k)))
        return { verdict, color: '#F59E0B' };
      if (['low', 'none', 'unfavorable', 'elevated', 'c', 'd', 'f', 'sell', 'caution', 'reduce'].some(k => lower.startsWith(k) || lower.includes(k)))
        return { verdict, color: '#EF4444' };
      return { verdict, color: '#8B8B8B' };
    }
  }
  return null;
}

// =====================================================
// AI SECTION DEFINITIONS — 7 Deep Analysis Sections
// =====================================================

const AI_SECTIONS_CONFIG = [
  {
    id: 'executive_thesis',
    title: 'Executive Thesis',
    icon: Crosshair,
    badge: 'AI Directional View',
    color: '#C9A646',
    useWebSearch: true,
    prompt: (data: StockData) => `Give me your investment thesis on ${data.name} (${data.ticker}) — should I buy, hold, or avoid this stock right now?

Data: ${data.sector} | $${(data.marketCap / 1e9).toFixed(1)}B market cap | P/E: ${data.pe?.toFixed(1) || 'N/A'} | Revenue Growth: ${data.revenueGrowth?.toFixed(1) || 'N/A'}% | Margins: ${data.grossMargin?.toFixed(1) || 'N/A'}% gross / ${data.netMargin?.toFixed(1) || 'N/A'}% net | ROE: ${data.roe?.toFixed(1) || 'N/A'}% | FCF/Share: $${data.freeCashFlowPerShare?.toFixed(2) || 'N/A'} | Price: $${data.price.toFixed(2)} | Target: $${data.priceTarget?.toFixed(2) || 'N/A'} | 52W: $${data.week52Low?.toFixed(2) || 'N/A'}-$${data.week52High?.toFixed(2) || 'N/A'}

SEARCH THE WEB for ${data.ticker} latest earnings, news, analyst moves.

Write 2 short paragraphs. First paragraph: what's the story right now based on the most recent earnings/news, and why does the current setup look attractive, neutral, or concerning? Do NOT say "buy" or "sell" as a command — describe the opportunity or risk and let the reader decide. Second paragraph: the one risk that could change this picture and what price level would signal that the thesis is broken. End with: "Rating: [Strong Buy/Buy/Hold/Reduce/Sell]"`
  },
  {
    id: 'management_credibility',
    title: 'Management Credibility',
    icon: Users,
    badge: 'Leadership Assessment',
    color: '#C9A646',
    useWebSearch: true,
    prompt: (data: StockData) => `Can I trust ${data.name}'s (${data.ticker}) management team with my money?

Data: Revenue Growth: ${data.revenueGrowth?.toFixed(1) || 'N/A'}% | ROE: ${data.roe?.toFixed(1) || 'N/A'}% | ROIC: ${data.roic?.toFixed(1) || 'N/A'}% | Debt/Equity: ${data.debtToEquity?.toFixed(2) || 'N/A'} | Payout: ${data.payoutRatio?.toFixed(1) || 'N/A'}% | FCF/Share: $${data.freeCashFlowPerShare?.toFixed(2) || 'N/A'}

SEARCH THE WEB for: ${data.ticker} earnings call tone, insider buying selling, executive changes, guidance track record.

Write 2 short paragraphs. First: Do they deliver on promises? Cover their beat/miss record, how they allocate capital (buybacks, dividends, debt), and whether insiders are buying or selling. Name the CEO/CFO. Second: Any red or green flags — tone on recent calls, C-suite turnover, accounting issues. End with: "Verdict: Management credibility is [HIGH/MODERATE/LOW] — [one-line reason]."`
  },
  {
    id: 'financial_deep_dive',
    title: 'Financial Deep Dive',
    icon: BarChart3,
    badge: 'Beyond the Numbers',
    color: '#C9A646',
    useWebSearch: true,
    prompt: (data: StockData) => `What do ${data.name}'s (${data.ticker}) financials really tell us beyond the headline numbers?

Data: Revenue Growth: ${data.revenueGrowth?.toFixed(1) || 'N/A'}% | EPS: $${data.eps?.toFixed(2) || 'N/A'} (${data.epsGrowth?.toFixed(1) || 'N/A'}% growth) | Margins: ${data.grossMargin?.toFixed(1) || 'N/A'}% gross / ${data.operatingMargin?.toFixed(1) || 'N/A'}% op / ${data.netMargin?.toFixed(1) || 'N/A'}% net | ROE: ${data.roe?.toFixed(1) || 'N/A'}% | Debt/Equity: ${data.debtToEquity?.toFixed(2) || 'N/A'} | FCF/Share: $${data.freeCashFlowPerShare?.toFixed(2) || 'N/A'} | P/E: ${data.pe?.toFixed(1) || 'N/A'} | EV/EBITDA: ${data.evEbitda?.toFixed(1) || 'N/A'}

SEARCH THE WEB for: ${data.ticker} latest quarterly results, revenue segments, margin trends.

Write 2 short paragraphs. First: Is the revenue growth real? Cover whether it's organic or bought, which segments are driving it, and whether margins are expanding or compressing — and why that matters for the stock. Second: The cash flow reality check — compare EPS to free cash flow, flag any balance sheet concerns (debt coming due, goodwill bloat, hidden liabilities), and say whether the earnings quality is trustworthy. End with: "Financial Health Grade: [A/B/C/D/F] — [one-line reason]."`
  },
  {
    id: 'competitive_moat',
    title: 'Competitive Moat',
    icon: Shield,
    badge: 'Moat Assessment',
    color: '#C9A646',
    useWebSearch: true,
    prompt: (data: StockData) => `What protects ${data.name} (${data.ticker}) from competition, and is that protection getting stronger or weaker?

Data: ${data.sector} | Gross Margin: ${data.grossMargin?.toFixed(1) || 'N/A'}% | Operating Margin: ${data.operatingMargin?.toFixed(1) || 'N/A'}% | ROE: ${data.roe?.toFixed(1) || 'N/A'}% | ROIC: ${data.roic?.toFixed(1) || 'N/A'}% | Revenue Growth: ${data.revenueGrowth?.toFixed(1) || 'N/A'}%

SEARCH THE WEB for: ${data.name} market share, competitive threats, disruption risks.

Write 2 short paragraphs. First: What's the moat — pricing power, switching costs, network effects, or something else? Use margin trends and market share data as evidence of whether it's widening or narrowing. Second: Name the top 2-3 competitors who could realistically threaten this business and explain how. How durable is this moat — 3 years, 10 years? End with: "Moat Rating: [Wide/Narrow/None] — [one-line reason]."`
  },
  {
    id: 'macro_bridge',
    title: 'Macro-to-Company Bridge',
    icon: Landmark,
    badge: 'FINOTAUR Macro Link',
    color: '#C9A646',
    useWebSearch: true,
    // prompt is now dynamic — built at generation time with ISM data injected
    prompt: (data: StockData, ismData?: string) => `How does the current macro environment affect ${data.name} (${data.ticker}) specifically?

Company: ${data.sector} | Beta: ${data.beta?.toFixed(2) || 'N/A'} | Debt/Equity: ${data.debtToEquity?.toFixed(2) || 'N/A'} | Revenue Growth: ${data.revenueGrowth?.toFixed(1) || 'N/A'}% | Dividend Yield: ${data.dividendYield?.toFixed(2) || 'N/A'}%
${ismData ? `\n${ismData}\n` : ''}
SEARCH THE WEB for: current Fed funds rate, latest CPI print, tariffs or trade policy affecting ${data.sector}.

CRITICAL INSTRUCTIONS:
- You MUST use the ISM data provided above (if available) — these are real numbers from the ISM Manufacturing Report stored in our database. Do NOT ignore them.
- If the ISM data shows this sector faces headwinds (negative direction, low ranking), SAY SO clearly. Be honest.
- If the ISM data shows tailwinds (positive direction, high ranking), explain why that helps this specific company.
- If no ISM data is provided, say that ISM data is unavailable and base your analysis on web search results only.
- Combine the ISM data with the Fed rate and CPI you find via web search to paint the full macro picture.

Write 2 short paragraphs. First: Connect the dots — how do current interest rates, inflation, and the ISM manufacturing reading specifically hit this company's revenue, costs, and valuation? Use actual numbers (Fed rate, CPI, the ISM PMI and sub-components provided). If the sector ranking shows headwinds, be direct about it. If executive quotes from the ISM survey paint a negative picture, reference that. Second: What's the geopolitical exposure — tariffs, international revenue mix, supply chain risks? Is the current macro regime a tailwind or headwind for this stock? Be honest — if macro doesn't support this company, say it plainly. End with: "Macro Positioning: [Favorable/Neutral/Unfavorable] — [one-line reason with a specific macro data point]."`
  },
  {
    id: 'hidden_risks',
    title: 'Hidden Risks & Red Flags',
    icon: AlertTriangle,
    badge: 'What The Market Misses',
    color: '#C9A646',
    useWebSearch: true,
    prompt: (data: StockData) => `What could go wrong with ${data.name} (${data.ticker}) that most investors aren't thinking about?

Data: P/E: ${data.pe?.toFixed(1) || 'N/A'} | Debt/Equity: ${data.debtToEquity?.toFixed(2) || 'N/A'} | Margins: ${data.grossMargin?.toFixed(1) || 'N/A'}% gross / ${data.netMargin?.toFixed(1) || 'N/A'}% net | FCF/Share: $${data.freeCashFlowPerShare?.toFixed(2) || 'N/A'} | Price: $${data.price.toFixed(2)} vs 52W High: $${data.week52High?.toFixed(2) || 'N/A'}

SEARCH THE WEB for: ${data.ticker} litigation, short seller reports, insider selling, debt maturity, accounting red flags.

Write 2 short paragraphs. First: The hidden stuff — earnings quality gaps (GAAP vs non-GAAP), off-balance-sheet debt, revenue concentration risks, or any accounting tricks that inflate the numbers. Be specific with dollar amounts. Second: External threats — pending lawsuits, regulatory investigations, short interest signals, and the single biggest risk the market is underpricing right now. End with: "Risk Level: [Elevated/Moderate/Low] — [the one risk that keeps you up at night]."`
  },
  {
    id: 'catalysts_timeline',
    title: 'Catalysts & Timeline',
    icon: Calendar,
    badge: 'Event Calendar',
    color: '#C9A646',
    useWebSearch: true,
    prompt: (data: StockData) => `What are the next big dates and events that could move ${data.name} (${data.ticker}) stock?

Data: Price: $${data.price.toFixed(2)} | Target: $${data.priceTarget?.toFixed(2) || 'N/A'} (${data.priceTarget && data.price ? ((data.priceTarget / data.price - 1) * 100).toFixed(1) : 'N/A'}% upside) | 52W: $${data.week52Low?.toFixed(2) || 'N/A'}-$${data.week52High?.toFixed(2) || 'N/A'} | ${data.analystRating || 'N/A'} consensus

SEARCH THE WEB for: ${data.ticker} next earnings date, product launches, FDA dates, ex-dividend, analyst days, regulatory decisions.

Write 2 short paragraphs. First paragraph: Start with next earnings — state the EXACT DATE clearly (e.g. "Q1 2026 earnings are expected on April 23"), then the consensus EPS estimate and how it compares to last year, then how the stock typically moves around earnings. After that, list any other upcoming catalysts (product launches, regulatory decisions, CHIPS Act grants, analyst days) with their approximate dates. Second paragraph: Downside scenario — what happens if the company misses expectations, with specific price levels (support at $XX, resistance at $XX, 200-day MA at $XX). End with: "Key Date to Watch: [Month Day — event name] — [one clear sentence why it matters]."`
  }
];

// =====================================================
// AI API CALL — Through backend proxy (OpenAI / Perplexity)
// =====================================================

async function callAI(
  prompt: string,
  useWebSearch: boolean,
  signal?: AbortSignal
): Promise<{ content: string; searchUsed: boolean }> {
  const response = await authFetch(`${import.meta.env.VITE_API_URL || ''}/api/ai-proxy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      prompt,
      system: SYSTEM_PROMPT,
      useWebSearch,
      maxTokens: 1500,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Analysis failed');

  return {
    content: data.content || 'Analysis unavailable.',
    searchUsed: data.searchUsed || false,
  };
}

// =====================================================
// ISM MACRO CONTEXT — Fetch from DB for macro_bridge
// =====================================================

interface IsmMacroContext {
  reportMonth: string | null;
  headline: {
    pmi: number | null;
    newOrders: number | null;
    production: number | null;
    employment: number | null;
    prices: number | null;
    supplierDeliveries: number | null;
    inventories: number | null;
  } | null;
  macroSnapshot: any | null;
  executiveSummary: {
    pmiValue: number | null;
    keyPoints: string[];
    marketRegime: string | null;
  } | null;
  sectorRanking: {
    rank: number;
    impact_score: number;
    direction: string;
    reasoning: string;
    key_driver?: string;
    ism_signal?: string;
    trend?: string;
    quote_support?: string;
  } | null;
  relevantQuotes: Array<{ industry: string; comment: string; sentiment: string }>;
  tradeIdeas: Array<{ title: string; direction: string; thesis: string; conviction: string }>;
}

async function fetchIsmContext(sector: string): Promise<IsmMacroContext | null> {
  try {
    const res = await authFetch(`/api/stock-analysis/ism-macro/${encodeURIComponent(sector)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

function buildIsmDataBlock(ism: IsmMacroContext): string {
  const parts: string[] = [];
  
  if (ism.headline) {
    const h = ism.headline;
    parts.push(`FINOTAUR ISM MANUFACTURING DATA (${ism.reportMonth || 'latest'}):`);
    if (h.pmi != null) parts.push(`  Headline PMI: ${h.pmi} ${Number(h.pmi) >= 50 ? '(expansion)' : '(contraction)'}`);
    if (h.newOrders != null) parts.push(`  New Orders: ${h.newOrders} ${Number(h.newOrders) >= 50 ? '(expanding)' : '(contracting)'}`);
    if (h.production != null) parts.push(`  Production: ${h.production} ${Number(h.production) >= 50 ? '(expanding)' : '(contracting)'}`);
    if (h.employment != null) parts.push(`  Employment: ${h.employment} ${Number(h.employment) >= 50 ? '(hiring)' : '(cutting jobs)'}`);
    if (h.prices != null) parts.push(`  Prices Paid: ${h.prices} ${Number(h.prices) >= 50 ? '(rising input costs)' : '(falling input costs)'}`);
    if (h.inventories != null) parts.push(`  Inventories: ${h.inventories} ${Number(h.inventories) >= 50 ? '(building)' : '(drawing down)'}`);
    if (h.supplierDeliveries != null) parts.push(`  Supplier Deliveries: ${h.supplierDeliveries}`);
  }
  
  if (ism.sectorRanking) {
    const sr = ism.sectorRanking;
    parts.push('');
    parts.push(`SECTOR ISM IMPACT ANALYSIS:`);
    parts.push(`  Sector Rank: #${sr.rank} | Direction: ${sr.direction} | Impact Score: ${sr.impact_score}`);
    if (sr.reasoning) parts.push(`  Reasoning: ${sr.reasoning}`);
    if (sr.key_driver) parts.push(`  Key Driver: ${sr.key_driver}`);
    if (sr.ism_signal) parts.push(`  ISM Signal: ${sr.ism_signal}`);
    if (sr.trend) parts.push(`  Trend: ${sr.trend}`);
    if (sr.quote_support) parts.push(`  Supporting Quote: "${sr.quote_support}"`);
  }
  
  if (ism.relevantQuotes?.length > 0) {
    parts.push('');
    parts.push('EXECUTIVE QUOTES FROM ISM SURVEY:');
    ism.relevantQuotes.forEach(q => {
      parts.push(`  [${q.industry}] "${q.comment}" (sentiment: ${q.sentiment})`);
    });
  }
  
  if (ism.tradeIdeas?.length > 0) {
    parts.push('');
    parts.push('FINOTAUR ISM TRADE IDEAS FOR THIS SECTOR:');
    ism.tradeIdeas.forEach(t => {
      parts.push(`  ${t.direction.toUpperCase()}: ${t.title} (${t.conviction} conviction) — ${t.thesis}`);
    });
  }
  
  if (ism.executiveSummary?.marketRegime) {
    parts.push('');
    parts.push(`CURRENT MARKET REGIME: ${ism.executiveSummary.marketRegime}`);
  }
  
  if (ism.executiveSummary?.keyPoints?.length) {
    parts.push('ISM KEY POINTS:');
    ism.executiveSummary.keyPoints.slice(0, 3).forEach(p => parts.push(`  • ${p}`));
  }
  
  return parts.join('\n');
}

// =====================================================
// INVESTMENT STORY + POSITIVE/NEGATIVE FACTORS — AI Generator
// =====================================================

const INVESTMENT_STORY_PROMPT = (data: StockData) => `You are FINOTAUR AI — the most advanced stock analysis engine. Generate a concise investment intelligence brief for ${data.name} (${data.ticker}).

FULL DATA PACKAGE:
Price: $${data.price.toFixed(2)} | Change: ${data.changePercent?.toFixed(2)}% | Prev Close: $${data.previousClose.toFixed(2)}
Market Cap: $${(data.marketCap / 1e9).toFixed(1)}B | Sector: ${data.sector} | Industry: ${data.industry}
P/E: ${data.pe?.toFixed(1) || 'N/A'} | P/S: ${data.ps?.toFixed(1) || 'N/A'} | P/B: ${data.pb?.toFixed(1) || 'N/A'} | EV/EBITDA: ${data.evEbitda?.toFixed(1) || 'N/A'} | PEG: ${data.pegRatio?.toFixed(1) || 'N/A'}
Revenue Growth: ${data.revenueGrowth?.toFixed(1) || 'N/A'}% | EPS Growth: ${data.epsGrowth?.toFixed(1) || 'N/A'}% | Net Income Growth: ${data.netIncomeGrowth?.toFixed(1) || 'N/A'}%
Gross Margin: ${data.grossMargin?.toFixed(1) || 'N/A'}% | Operating Margin: ${data.operatingMargin?.toFixed(1) || 'N/A'}% | Net Margin: ${data.netMargin?.toFixed(1) || 'N/A'}%
ROE: ${data.roe?.toFixed(1) || 'N/A'}% | ROA: ${data.roa?.toFixed(1) || 'N/A'}% | ROIC: ${data.roic?.toFixed(1) || 'N/A'}%
Debt/Equity: ${data.debtToEquity?.toFixed(2) || 'N/A'} | Current Ratio: ${data.currentRatio?.toFixed(2) || 'N/A'} | Quick Ratio: ${data.quickRatio?.toFixed(2) || 'N/A'}
FCF/Share: $${data.freeCashFlowPerShare?.toFixed(2) || 'N/A'} | EPS: $${data.eps?.toFixed(2) || 'N/A'} | Book Value/Share: $${data.bookValuePerShare?.toFixed(2) || 'N/A'}
Dividend Yield: ${data.dividendYield?.toFixed(2) || 'N/A'}% | Payout Ratio: ${data.payoutRatio?.toFixed(1) || 'N/A'}%
52W Range: $${data.week52Low?.toFixed(2) || 'N/A'} - $${data.week52High?.toFixed(2) || 'N/A'} | Beta: ${data.beta?.toFixed(2) || 'N/A'}
Analyst: ${data.analystRating || 'N/A'} | Target: $${data.priceTarget?.toFixed(2) || 'N/A'} (${data.numberOfAnalysts} analysts)
Next Earnings: ${data.nextEarningsDate || 'N/A'}

SEARCH THE WEB for: "${data.ticker} latest earnings results analyst upgrades downgrades"

CRITICAL FORMATTING RULES:
- NO markdown anywhere. NO asterisks (**), NO bold, NO headers, NO bullet points.
- Each label must appear on its own line followed by a colon and the content.
- Keep ALL factor descriptions to EXACTLY 2-3 short sentences. No more.
- Keep OPTIONS to 1 sentence only. If no data found, say "No significant unusual options activity detected recently."

RESPOND IN EXACTLY THIS FORMAT:

SUMMARY: 2-3 sentences about what makes this stock interesting RIGHT NOW. Reference recent earnings, current trends, and fundamentals. Be specific with numbers.

BULL: 1-2 sentences. The single best reason to own this stock today with a specific number.

BEAR: 1-2 sentences. The most important risk with a specific number.

OPTIONS: 1 sentence only about recent options activity or sentiment. Keep it brief.

POSITIVE_FACTOR_1_TITLE: Short title (5-8 words max)
POSITIVE_FACTOR_1: Exactly 2-3 sentences. Key strength with one number, why it matters.

POSITIVE_FACTOR_2_TITLE: Short title (5-8 words max)
POSITIVE_FACTOR_2: Exactly 2-3 sentences. Different angle with one number.

POSITIVE_FACTOR_3_TITLE: Short title (5-8 words max)
POSITIVE_FACTOR_3: Exactly 2-3 sentences. Moat or strategic edge with one number.

NEGATIVE_FACTOR_1_TITLE: Short title (5-8 words max)
NEGATIVE_FACTOR_1: Exactly 2-3 sentences. Key risk with one number.

NEGATIVE_FACTOR_2_TITLE: Short title (5-8 words max)
NEGATIVE_FACTOR_2: Exactly 2-3 sentences. Different risk with one number.

NEGATIVE_FACTOR_3_TITLE: Short title (5-8 words max)
NEGATIVE_FACTOR_3: Exactly 2-3 sentences. Third risk with one number.

RATING: [Strong Buy/Buy/Hold/Reduce/Sell]`;

// Clean markdown artifacts from AI response
function cleanAIText(text: string): string {
  return text
    .replace(/\*\*/g, '')       // Remove all ** bold markers
    .replace(/\*/g, '')         // Remove remaining * italic markers
    .replace(/^#+\s*/gm, '')    // Remove markdown headers
    .replace(/\[(\d+)\]/g, '')  // Remove citation brackets [1], [2]
    .replace(/---+/g, '')       // Remove horizontal rules
    .trim();
}

function parseInvestmentStory(content: string): InvestmentStoryData | null {
  try {
    const clean = cleanAIText(content);

    // Split by known labels — most reliable parsing method
    const LABELS = [
      'SUMMARY', 'BULL', 'BEAR', 'OPTIONS',
      'POSITIVE_FACTOR_1_TITLE', 'POSITIVE_FACTOR_1',
      'POSITIVE_FACTOR_2_TITLE', 'POSITIVE_FACTOR_2',
      'POSITIVE_FACTOR_3_TITLE', 'POSITIVE_FACTOR_3',
      'NEGATIVE_FACTOR_1_TITLE', 'NEGATIVE_FACTOR_1',
      'NEGATIVE_FACTOR_2_TITLE', 'NEGATIVE_FACTOR_2',
      'NEGATIVE_FACTOR_3_TITLE', 'NEGATIVE_FACTOR_3',
      'RATING'
    ];

    // Build split regex: matches any label followed by colon
    // Sort labels longest-first so POSITIVE_FACTOR_1_TITLE matches before POSITIVE_FACTOR_1
    const sortedLabels = [...LABELS].sort((a, b) => b.length - a.length);
    const splitPattern = new RegExp('(' + sortedLabels.join('|') + ')\\s*:', 'gi');
    const parts = clean.split(splitPattern);

    // Build a map: label -> content
    const sections: Record<string, string> = {};
    for (let i = 1; i < parts.length - 1; i += 2) {
      const label = parts[i].toUpperCase().trim();
      const value = (parts[i + 1] || '').trim();
      sections[label] = value;
    }


    const summary = sections['SUMMARY'] || '';
    if (!summary) {
      return null;
    }

    // Helper to truncate to ~3 sentences max
    const truncate = (text: string): string => {
      if (!text) return '';
      const sentences = text.split(/(?<=[.!?])\s+/);
      return sentences.slice(0, 3).join(' ');
    };

    const positiveFactors: FactorItem[] = [];
    if (sections['POSITIVE_FACTOR_1_TITLE'] && sections['POSITIVE_FACTOR_1'])
      positiveFactors.push({ title: sections['POSITIVE_FACTOR_1_TITLE'], description: truncate(sections['POSITIVE_FACTOR_1']) });
    if (sections['POSITIVE_FACTOR_2_TITLE'] && sections['POSITIVE_FACTOR_2'])
      positiveFactors.push({ title: sections['POSITIVE_FACTOR_2_TITLE'], description: truncate(sections['POSITIVE_FACTOR_2']) });
    if (sections['POSITIVE_FACTOR_3_TITLE'] && sections['POSITIVE_FACTOR_3'])
      positiveFactors.push({ title: sections['POSITIVE_FACTOR_3_TITLE'], description: truncate(sections['POSITIVE_FACTOR_3']) });

    const negativeFactors: FactorItem[] = [];
    if (sections['NEGATIVE_FACTOR_1_TITLE'] && sections['NEGATIVE_FACTOR_1'])
      negativeFactors.push({ title: sections['NEGATIVE_FACTOR_1_TITLE'], description: truncate(sections['NEGATIVE_FACTOR_1']) });
    if (sections['NEGATIVE_FACTOR_2_TITLE'] && sections['NEGATIVE_FACTOR_2'])
      negativeFactors.push({ title: sections['NEGATIVE_FACTOR_2_TITLE'], description: truncate(sections['NEGATIVE_FACTOR_2']) });
    if (sections['NEGATIVE_FACTOR_3_TITLE'] && sections['NEGATIVE_FACTOR_3'])
      negativeFactors.push({ title: sections['NEGATIVE_FACTOR_3_TITLE'], description: truncate(sections['NEGATIVE_FACTOR_3']) });

    // Truncate options to 1-2 sentences
    const optionsSentences = sections['OPTIONS'] ? sections['OPTIONS'].split(/(?<=[.!?])\s+/).slice(0, 2).join(' ') : '';

    const ratingMatch = (sections['RATING'] || '').match(/(Strong Buy|Buy|Hold|Reduce|Sell)/i);


    return {
      summary,
      bullCase: sections['BULL'] || '',
      bearCase: sections['BEAR'] || '',
      optionsInsight: optionsSentences,
      rating: (ratingMatch?.[1] as InvestmentStoryData['rating']) || 'Hold',
      positiveFactors: positiveFactors.length > 0 ? positiveFactors : undefined,
      negativeFactors: negativeFactors.length > 0 ? negativeFactors : undefined,
    };
  } catch (err) {
    console.error('[Parser] Exception:', err);
    return null;
  }
}

// =====================================================
// COPY BUTTON
// =====================================================

const CopyButton = memo(({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }, [text]);
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title="Copy">
      {copied ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5 text-[#4B4B4B]" />}
    </button>
  );
});
CopyButton.displayName = 'CopyButton';

// =====================================================
// POSITIVE / NEGATIVE FACTORS COMPONENT
// =====================================================

const FactorsSection = memo(({ positiveFactors, negativeFactors, isLoading }: {
  positiveFactors?: FactorItem[];
  negativeFactors?: FactorItem[];
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-ds-6 md:grid-cols-2">
        {/* Positive skeleton */}
        <div className="space-y-ds-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#52C878]" />
            <span className="text-[13px] font-semibold uppercase text-[#52C878]" style={{ letterSpacing: '0.14em' }}>Positive Factors</span>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2 rounded-[12px] border border-white/[0.065] bg-white/[0.024] p-ds-5">
              <div className="h-4 w-3/4 animate-pulse rounded-[4px]" style={{ background: 'rgba(255,255,255,0.07)', animationDelay: `${i * 200}ms` }} />
              <div className="h-3 w-full animate-pulse rounded-[4px]" style={{ background: 'rgba(255,255,255,0.045)', animationDelay: `${i * 200 + 100}ms` }} />
              <div className="h-3 w-5/6 animate-pulse rounded-[4px]" style={{ background: 'rgba(255,255,255,0.045)', animationDelay: `${i * 200 + 150}ms` }} />
            </div>
          ))}
        </div>
        {/* Negative skeleton */}
        <div className="space-y-ds-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-num-negative" />
            <span className="text-[13px] font-semibold uppercase text-num-negative" style={{ letterSpacing: '0.14em' }}>Negative Factors</span>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2 rounded-[12px] border border-white/[0.065] bg-white/[0.024] p-ds-5">
              <div className="h-4 w-3/4 animate-pulse rounded-[4px]" style={{ background: 'rgba(255,255,255,0.07)', animationDelay: `${i * 200}ms` }} />
              <div className="h-3 w-full animate-pulse rounded-[4px]" style={{ background: 'rgba(255,255,255,0.045)', animationDelay: `${i * 200 + 100}ms` }} />
              <div className="h-3 w-5/6 animate-pulse rounded-[4px]" style={{ background: 'rgba(255,255,255,0.045)', animationDelay: `${i * 200 + 150}ms` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!positiveFactors?.length && !negativeFactors?.length) return null;

  return (
    <div className="grid grid-cols-1 gap-ds-6 md:grid-cols-2">
      {/* ── POSITIVE FACTORS ── */}
      <div className="space-y-ds-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-[#52C878]" />
          <span className="text-[13px] font-semibold uppercase text-[#52C878]" style={{ letterSpacing: '0.14em' }}>Positive Factors</span>
        </div>
        {(positiveFactors || []).map((factor, i) => (
          <div key={i} className="rounded-[12px] border border-white/[0.075] bg-white/[0.024] p-ds-5 transition-colors duration-200 hover:border-white/[0.12] hover:bg-white/[0.032]">
            <div className="mb-ds-3 h-px w-full bg-gradient-to-r from-[#52C878]/35 via-white/[0.055] to-transparent" />
            <h4 className="mb-ds-2 text-[14px] font-semibold leading-snug text-ink-primary">
              {factor.title}
            </h4>
            <p className="text-[13px] leading-[1.75] text-ink-secondary">
              {factor.description}
            </p>
          </div>
        ))}
      </div>

      {/* ── NEGATIVE FACTORS ── */}
      <div className="space-y-ds-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="w-4 h-4 text-num-negative" />
          <span className="text-[13px] font-semibold uppercase text-num-negative" style={{ letterSpacing: '0.14em' }}>Negative Factors</span>
        </div>
        {(negativeFactors || []).map((factor, i) => (
          <div key={i} className="rounded-[12px] border border-white/[0.075] bg-white/[0.024] p-ds-5 transition-colors duration-200 hover:border-white/[0.12] hover:bg-white/[0.032]">
            <div className="mb-ds-3 h-px w-full bg-gradient-to-r from-[#E24B4A]/40 via-white/[0.055] to-transparent" />
            <h4 className="mb-ds-2 text-[14px] font-semibold leading-snug text-ink-primary">
              {factor.title}
            </h4>
            <p className="text-[13px] leading-[1.75] text-ink-secondary">
              {factor.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});
FactorsSection.displayName = 'FactorsSection';

// =====================================================
// SERVER BRIEF CACHE HELPERS
// =====================================================

interface ServerBriefData {
  sections: Array<{
    id: string;
    content: string | null;
    verdict: string | null;
    verdictColor: string | null;
    searchUsed: boolean;
  }>;
  investmentStory: InvestmentStoryData | null;
  generatedAt: string;
  ticker: string;
}

async function checkServerBriefCache(ticker: string): Promise<ServerBriefData | null> {
  try {
    const res = await authFetch(`/api/stock-cache/${ticker}/brief`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.cached && json.data) return json.data;
    return null;
  } catch {
    return null;
  }
}

async function saveServerBriefCache(
  ticker: string,
  sections: AISection[],
  story: InvestmentStoryData | null,
  generatedAt: string,
  earningsDate?: string | null
): Promise<void> {
  try {
    await authFetch(`/api/stock-cache/${ticker}/brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        briefData: {
          sections: sections.map(s => ({
            id: s.id, content: s.content, verdict: s.verdict,
            verdictColor: s.verdictColor, searchUsed: s.searchUsed,
          })),
          investmentStory: story,
          generatedAt,
          ticker,
        },
        earningsDate: earningsDate || null,
      }),
    });
  } catch { /* non-critical */ }
}

// =====================================================
// HOT TAKEAWAYS - derived from existing AI content
// =====================================================

type HotTakeawayTone = 'positive' | 'negative' | 'warning' | 'neutral';

interface HotTakeaway {
  text: string;
  tone: HotTakeawayTone;
}

function cleanAnalysisSentence(sentence: string): string {
  return sentence
    .replace(/\s+/g, ' ')
    .replace(/^(Rating|Verdict|Financial Health Grade|Moat Rating|Macro Positioning|Risk Level|Key Date to Watch):\s*/i, '')
    .trim();
}

function sentenceTone(sentence: string): HotTakeawayTone {
  const lower = sentence.toLowerCase();
  if (/(beat|beats|growth|expansion|strong|pricing power|tailwind|improving|wide|favorable|positive|upside)/.test(lower)) return 'positive';
  if (/(risk|negative|miss|pressure|compress|decline|weak|fall|drop|concern|bear|unfavorable|lawsuit|debt|dilution)/.test(lower)) return 'negative';
  if (/(watch|depends|execution|if|support|resistance|break|caution|valuation|high|elevated|cash flow|fcf)/.test(lower)) return 'warning';
  return 'neutral';
}

function sentenceScore(sentence: string): number {
  const lower = sentence.toLowerCase();
  let score = 0;
  if (/\d/.test(sentence)) score += 3;
  if (/(revenue|margin|eps|fcf|cash flow|valuation|p\/e|target|support|resistance|debt|guidance|earnings)/.test(lower)) score += 3;
  if (/(beat|miss|risk|growth|pressure|execution|watch|depends|break|negative|positive|strong|weak)/.test(lower)) score += 2;
  if (sentence.length >= 45 && sentence.length <= 150) score += 1;
  return score;
}

function extractHotTakeaways(content: string | null, verdict?: string | null): HotTakeaway[] {
  if (!content) return [];

  const cleaned = content
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map(cleanAnalysisSentence)
    .filter(sentence => sentence.length > 24 && !/^(rating|verdict|financial health grade|moat rating|macro positioning|risk level|key date to watch)$/i.test(sentence));

  const ranked = sentences
    .map((sentence, index) => ({ sentence, index, score: sentenceScore(sentence) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 4)
    .sort((a, b) => a.index - b.index)
    .map(({ sentence }) => ({
      text: sentence.length > 96 ? `${sentence.slice(0, 93).trim()}...` : sentence,
      tone: sentenceTone(sentence),
    }));

  if (verdict && ranked.length < 4) {
    ranked.push({
      text: verdict.length > 96 ? `${verdict.slice(0, 93).trim()}...` : verdict,
      tone: sentenceTone(verdict),
    });
  }

  return ranked.slice(0, 4);
}

function TakeawayIcon({ tone }: { tone: HotTakeawayTone }) {
  if (tone === 'positive') return <TrendingUp className="h-3.5 w-3.5 text-[#52C878]" />;
  if (tone === 'negative') return <TrendingDown className="h-3.5 w-3.5 text-num-negative" />;
  if (tone === 'warning') return <AlertTriangle className="h-3.5 w-3.5 text-gold-primary" />;
  return <Activity className="h-3.5 w-3.5 text-ink-tertiary" />;
}

// =====================================================
// AI SECTION CARD
// =====================================================

const AISectionCard = memo(({ section, isExpanded, onToggle }: { section: AISection; isExpanded: boolean; onToggle: () => void }) => {
  const Icon = section.icon;
  const hasContent = !!section.content;
  const hotTakeaways = extractHotTakeaways(section.content, section.verdict);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[12px] border transition-colors duration-200',
        hasContent ? 'border-gold-border/55 bg-white/[0.026]' : 'border-white/[0.07] bg-white/[0.018]',
      )}
      style={{
        boxShadow: hasContent
          ? '0 20px 58px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.055)'
          : '0 14px 36px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-gold-primary/75 via-gold-primary/20 to-transparent" aria-hidden="true" />

      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        className="flex w-full cursor-pointer items-center justify-between gap-ds-4 p-ds-5 text-left transition-colors duration-200 hover:bg-white/[0.022]"
      >
        <div className="flex min-w-0 items-start gap-ds-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-gold-border/70 bg-gold-primary/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <Icon className="h-5 w-5 text-gold-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-ds-2">
              <span className="text-[16px] font-semibold leading-tight text-ink-primary">{section.title}</span>
              <span className="rounded-[4px] border border-gold-border/60 bg-gold-primary/[0.07] px-2 py-0.5 text-[10px] font-semibold uppercase text-gold-primary">
                {section.badge}
              </span>
              {section.searchUsed && (
                <span className="flex items-center gap-1 rounded-[4px] border border-[#52C878]/25 bg-[#52C878]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#52C878]">
                  <Search className="h-2.5 w-2.5" /> Live
                </span>
              )}
            </div>
            {section.verdict && (
              <span className="mt-ds-1 inline-block text-[12px] font-semibold" style={{ color: section.verdictColor || '#C9A646' }}>
                {section.verdict}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-ds-2">
          {section.content && <CopyButton text={section.content} />}
          {section.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gold-primary" />
          ) : (
            isExpanded ? <ChevronUp className="h-4 w-4 text-gold-primary/70" /> : <ChevronDown className="h-4 w-4 text-gold-primary/70" />
          )}
        </div>
      </div>

      <div className={cn('overflow-hidden transition-all duration-300', isExpanded ? 'max-h-[2200px] opacity-100' : 'max-h-0 opacity-0')}>
        <div className="px-ds-5 pb-ds-5">
          {section.isLoading && (
            <div className="rounded-[12px] border border-gold-border/35 bg-gold-primary/[0.035] p-ds-4 space-y-ds-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          )}

          {section.content && !section.isLoading && (
            <div className="grid grid-cols-1 gap-ds-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="relative border-l border-gold-border/55 pl-ds-5">
                <p className="whitespace-pre-wrap text-[14px] leading-[1.85] text-ink-secondary">
                  {section.content}
                </p>
              </div>

              <aside className="rounded-[12px] border border-white/[0.075] bg-white/[0.022] p-ds-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
                <div className="mb-ds-4 flex items-center justify-between gap-ds-3">
                  <h4 className="text-[13px] font-semibold text-gold-primary">Hot Takeaways</h4>
                  <span className="text-[10px] uppercase text-ink-muted" style={{ letterSpacing: '0.12em' }}>from AI</span>
                </div>
                <div className="space-y-ds-3">
                  {hotTakeaways.length > 0 ? hotTakeaways.map((takeaway, index) => (
                    <div key={`${takeaway.text}-${index}`} className="flex gap-ds-3 border-b border-white/[0.055] pb-ds-3 last:border-0 last:pb-0">
                      <div className="mt-0.5 shrink-0">
                        <TakeawayIcon tone={takeaway.tone} />
                      </div>
                      <p className="text-[12px] leading-[1.55] text-ink-secondary">{takeaway.text}</p>
                    </div>
                  )) : (
                    <p className="text-[12px] leading-relaxed text-ink-tertiary">
                      Takeaways will appear as soon as the AI section finishes.
                    </p>
                  )}
                </div>
              </aside>
            </div>
          )}

          {section.error && (
            <div className="flex items-center gap-ds-3 rounded-[12px] border border-num-negative/15 bg-num-negative/5 p-ds-4">
              <AlertTriangle className="h-4 w-4 shrink-0 text-num-negative" />
              <div>
                <p className="text-sm text-num-negative/85">{section.error}</p>
                <p className="mt-1 text-xs text-num-negative/55">Click "Regenerate" to retry</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
AISectionCard.displayName = 'AISectionCard';

// =====================================================
// MAIN COMPONENT
// =====================================================

export const OverviewTab = memo(({ data, prefetchedBrief }: { data: StockData; prefetchedBrief?: ServerBriefData | null }) => {
  const signal = generateSignal(data);
  const thesis = generateInvestmentThesis(data);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAutoGenerated = useRef<string | null>(null);

  const makeEmptySections = (): AISection[] =>
    AI_SECTIONS_CONFIG.map(s => ({ id: s.id, title: s.title, icon: s.icon, badge: s.badge, color: s.color, content: null, verdict: null, verdictColor: null, isLoading: false, error: null, searchUsed: false }));

  const cached = briefCacheMap.get(data.ticker);
  const [sections, setSections] = useState<AISection[]>(cached?.sections || makeEmptySections());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(cached?.generatedAt || null);
  const [generatedTicker, setGeneratedTicker] = useState<string | null>(cached ? data.ticker : null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['executive_thesis']));
  const [allExpanded, setAllExpanded] = useState(false);
  const [investmentStory, setInvestmentStory] = useState<InvestmentStoryData | null>(cached?.investmentStory || null);
  const [storyLoading, setStoryLoading] = useState(false);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const toggleAll = useCallback(() => {
    if (allExpanded) setExpandedSections(new Set(['executive_thesis']));
    else setExpandedSections(new Set(AI_SECTIONS_CONFIG.map(s => s.id)));
    setAllExpanded(!allExpanded);
  }, [allExpanded]);

  const generateBrief = useCallback(async () => {
    // ── CHECK PREFETCHED / SERVER CACHE FIRST ──
    try {
      const serverCached = prefetchedBrief || await checkServerBriefCache(data.ticker);
      if (serverCached && serverCached.sections?.some(s => s.content)) {
        console.log(`[AI Brief] ${prefetchedBrief ? 'Prefetched' : 'Server cache'} hit: ${data.ticker}`);
        const restoredSections = makeEmptySections().map(s => {
          const cached = serverCached.sections.find(cs => cs.id === s.id);
          if (cached?.content) {
            return { ...s, content: cached.content, verdict: cached.verdict, verdictColor: cached.verdictColor, searchUsed: cached.searchUsed, isLoading: false, error: null };
          }
          return s;
        });
        setSections(restoredSections);
        setGeneratedAt(serverCached.generatedAt);
        setGeneratedTicker(data.ticker);
        setIsGenerating(false);
        
        // Check if cached story has factors
        const cachedStory = serverCached.investmentStory;
        const hasFactors = cachedStory?.positiveFactors?.length && cachedStory?.negativeFactors?.length;
        
        if (cachedStory && hasFactors) {
          // Full cache with factors — use as-is
          setInvestmentStory(cachedStory);
          setStoryLoading(false);
          briefCacheMap.set(data.ticker, { ticker: data.ticker, sections: restoredSections, generatedAt: serverCached.generatedAt, investmentStory: cachedStory });
        } else {
          // Old cache without factors — restore story but trigger factors generation
          if (cachedStory) setInvestmentStory(cachedStory);
          setStoryLoading(false);
          briefCacheMap.set(data.ticker, { ticker: data.ticker, sections: restoredSections, generatedAt: serverCached.generatedAt, investmentStory: cachedStory });
          // factorsRetried useEffect will auto-trigger regenerateFactors
        }
        
        setExpandedSections(new Set(AI_SECTIONS_CONFIG.map(s => s.id)));
        setAllExpanded(true);
        return;
      }
    } catch { /* server cache unavailable, generate fresh */ }

    // ── No server cache — generate with AI ──
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setGeneratedAt(null);
    setGeneratedTicker(data.ticker);
    setStoryLoading(true);
    setInvestmentStory(null);
    setSections(prev => prev.map(s => ({ ...s, content: null, verdict: null, verdictColor: null, isLoading: true, error: null, searchUsed: false })));
    setExpandedSections(new Set(AI_SECTIONS_CONFIG.map(s => s.id)));
    setAllExpanded(true);

    let finalStory: InvestmentStoryData | null = null;

    // ── STEP 0: Generate Investment Story + Positive/Negative Factors ──
    try {
      const { content: storyRaw } = await callAI(INVESTMENT_STORY_PROMPT(data), true, controller.signal);
      const parsed = parseInvestmentStory(storyRaw);
      if (!controller.signal.aborted && parsed) {
        setInvestmentStory(parsed);
        finalStory = parsed;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('[InvestmentStory] Error:', err.message);
    }
    if (!controller.signal.aborted) setStoryLoading(false);

    // ── PRE-FETCH: Get ISM macro context from DB for macro_bridge section ──
    let ismDataBlock: string | undefined;
    if (data.sector) {
      try {
        const ismCtx = await fetchIsmContext(data.sector);
        if (ismCtx) {
          ismDataBlock = buildIsmDataBlock(ismCtx);
          console.log('[Overview] ISM macro context loaded for sector:', data.sector);
        } else {
          console.log('[Overview] No ISM data found for sector:', data.sector);
        }
      } catch (e) {
        console.warn('[Overview] ISM fetch failed, continuing without:', e);
      }
    }

    // ── STEP 1-7: Generate deep brief sections IN PARALLEL ──
    // Each section is an independent AI call (no inter-dependencies between sections;
    // ISM data was already pre-fetched above and injected only into macro_bridge).
    // Running them in parallel cuts total time from O(n) to O(1) single-call latency
    // (~15s vs ~135s for 9 sections). Each section updates its own slice of state
    // independently so they appear as soon as each one resolves.
    await Promise.allSettled(
      AI_SECTIONS_CONFIG.map(async (config) => {
        if (controller.signal.aborted) return;
        try {
          const prompt = config.id === 'macro_bridge'
            ? config.prompt(data, ismDataBlock)
            : config.prompt(data);
          const { content, searchUsed } = await callAI(prompt, config.useWebSearch, controller.signal);
          const verdictInfo = extractVerdict(content, config.id);
          if (!controller.signal.aborted) {
            setSections(prev => prev.map(s => s.id === config.id ? { ...s, content, searchUsed, verdict: verdictInfo?.verdict || null, verdictColor: verdictInfo?.color || null, isLoading: false, error: null } : s));
          }
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          if (!controller.signal.aborted) {
            setSections(prev => prev.map(s => s.id === config.id ? { ...s, content: null, verdict: null, verdictColor: null, isLoading: false, error: err.message || 'Analysis failed', searchUsed: false } : s));
          }
        }
      })
    );

    if (!controller.signal.aborted) {
      const genAt = new Date().toISOString();
      setIsGenerating(false);
      setGeneratedAt(genAt);
      setSections(prev => {
        const final = prev.map(s => ({ ...s, isLoading: false }));
        briefCacheMap.set(data.ticker, { ticker: data.ticker, sections: final, generatedAt: genAt, investmentStory: finalStory });
        // ── SAVE TO SERVER CACHE for other users ──
        if (final.some(s => s.content)) {
          saveServerBriefCache(data.ticker, final, finalStory, genAt, data.nextEarningsDate);
        }
        return final;
      });
    }
  }, [data, prefetchedBrief]);

  // ========== AUTO-GENERATE on first load for this ticker ==========
  useEffect(() => {
    const hasCached = briefCacheMap.has(data.ticker);
    const alreadyGenerated = hasAutoGenerated.current === data.ticker;

    if (!hasCached && !alreadyGenerated && !isGenerating) {
      hasAutoGenerated.current = data.ticker;
      const timer = setTimeout(() => generateBrief(), 600);
      return () => clearTimeout(timer);
    }

    if (hasCached && generatedTicker !== data.ticker) {
      const c = briefCacheMap.get(data.ticker)!;
      setSections(c.sections);
      setGeneratedAt(c.generatedAt);
      setGeneratedTicker(data.ticker);
      if (c.investmentStory) setInvestmentStory(c.investmentStory);
    }
  }, [data.ticker]);

  // Reset on ticker change
  useEffect(() => {
    if (generatedTicker && generatedTicker !== data.ticker) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const c = briefCacheMap.get(data.ticker);
      if (c) { setSections(c.sections); setGeneratedAt(c.generatedAt); setGeneratedTicker(data.ticker); if (c.investmentStory) setInvestmentStory(c.investmentStory); }
      else { setSections(makeEmptySections()); setIsGenerating(false); setGeneratedAt(null); setGeneratedTicker(null); setInvestmentStory(null); }
    }
  }, [data.ticker, generatedTicker]);

  useEffect(() => { return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); }; }, []);

  const completedCount = sections.filter(s => s.content).length;
  const hasContent = completedCount > 0;
  const searchCount = sections.filter(s => s.searchUsed).length;

  // Separate factors regeneration for when story exists but factors are missing (old cache)
  const [factorsLoading, setFactorsLoading] = useState(false);
  const factorsRetried = useRef<string | null>(null);

  const regenerateFactors = useCallback(async () => {
    setFactorsLoading(true);
    try {
      const { content: storyRaw } = await callAI(INVESTMENT_STORY_PROMPT(data), true);
      const parsed = parseInvestmentStory(storyRaw);
      if (parsed && (parsed.positiveFactors?.length || parsed.negativeFactors?.length)) {
        const merged = { ...investmentStory!, positiveFactors: parsed.positiveFactors, negativeFactors: parsed.negativeFactors };
        setInvestmentStory(merged);
        const existingCache = briefCacheMap.get(data.ticker);
        if (existingCache) {
          briefCacheMap.set(data.ticker, { ...existingCache, investmentStory: merged });
          // Update server cache too
          saveServerBriefCache(data.ticker, existingCache.sections, merged, existingCache.generatedAt, data.nextEarningsDate);
        }
      }
    } catch (err: any) {
      console.error('[RegenerateFactors] Error:', err.message);
    }
    setFactorsLoading(false);
  }, [data, investmentStory]);

  // Auto-trigger factors if story loaded but factors missing
  useEffect(() => {
    if (
      investmentStory &&
      !investmentStory.positiveFactors?.length &&
      !investmentStory.negativeFactors?.length &&
      !storyLoading &&
      !factorsLoading &&
      factorsRetried.current !== data.ticker
    ) {
      factorsRetried.current = data.ticker;
      regenerateFactors();
    }
  }, [investmentStory, storyLoading, factorsLoading, data.ticker, regenerateFactors]);

  return (
    <StockTabErrorBoundary>
    <div className="space-y-ds-7">
      {/* L1 ambient AI insight — from pre-generated backend card */}
      <FinoInsightCard kind="stock" symbol={data.ticker} />

      {/* ========== INVESTMENT STORY — AI Enhanced ========== */}
      <Card highlight>
        <div className="relative p-ds-6 md:p-ds-7">
          
          {/* Header with rating */}
          <div className="mb-ds-6 flex items-center justify-between gap-ds-4">
            <SectionHeader icon={Sparkles} title="The Investment Story" badge="AI Analysis" />
            {investmentStory?.rating && (
              <div className="flex items-center gap-2 rounded-[8px] px-ds-3 py-ds-2" style={{
                background: 'rgba(201,166,70,0.055)',
                border: '1px solid rgba(201,166,70,0.18)',
              }}>
                <span className="text-[12px] font-semibold tracking-[0.08em] text-gold-primary">{investmentStory.rating.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Loading state */}
          {storyLoading && (
            <div className="mb-ds-5 space-y-ds-3">
              <Skeleton className="h-3 w-3/4 mb-ds-2" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-3 animate-pulse rounded-[4px]" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.035), rgba(255,255,255,0.075), rgba(255,255,255,0.035))', width: `${95 - i * 12}%`, animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          )}

          {/* AI Summary */}
          {investmentStory ? (
            <div className="space-y-ds-6">
              {/* Main thesis */}
              <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.024] p-ds-5 md:p-ds-6">
                <p className="text-[15px] leading-[1.85] text-ink-primary/90 md:text-[16px]">{investmentStory.summary}</p>
              </div>

              {/* Bull / Bear / Options grid */}
              <div className="grid grid-cols-1 overflow-hidden rounded-[12px] border border-white/[0.07] bg-white/[0.018] md:grid-cols-3">
                {/* Bull Case */}
                {investmentStory.bullCase && (
                  <div className="border-b border-white/[0.07] p-ds-5 md:border-b-0 md:border-r">
                    <div className="mb-ds-3 flex items-center gap-ds-2">
                      <TrendingUp className="w-3.5 h-3.5 text-[#52C878]" />
                      <span className="text-[12px] font-semibold text-[#52C878]" style={{ letterSpacing: '0.12em' }}>BULL CASE</span>
                    </div>
                    <p className="text-[13px] leading-[1.75] text-ink-secondary">{investmentStory.bullCase}</p>
                  </div>
                )}

                {/* Bear Case */}
                {investmentStory.bearCase && (
                  <div className="border-b border-white/[0.07] p-ds-5 md:border-b-0 md:border-r">
                    <div className="mb-ds-3 flex items-center gap-ds-2">
                      <TrendingDown className="w-3.5 h-3.5 text-num-negative" />
                      <span className="text-[12px] font-semibold text-num-negative" style={{ letterSpacing: '0.12em' }}>BEAR CASE</span>
                    </div>
                    <p className="text-[13px] leading-[1.75] text-ink-secondary">{investmentStory.bearCase}</p>
                  </div>
                )}

                {/* Options Insight */}
                {investmentStory.optionsInsight && (
                  <div className="p-ds-5">
                    <div className="mb-ds-3 flex items-center gap-ds-2">
                      <BarChart2 className="w-3.5 h-3.5 text-gold-primary" />
                      <span className="text-[12px] font-semibold text-gold-primary" style={{ letterSpacing: '0.12em' }}>OPTIONS FLOW</span>
                    </div>
                    <p className="text-[13px] leading-[1.75] text-ink-secondary">{investmentStory.optionsInsight}</p>
                  </div>
                )}
              </div>
            </div>
          ) : !storyLoading ? (
            /* Fallback to static thesis when AI hasn't loaded */
            <div className="mb-ds-5 rounded-[12px] border border-white/[0.07] bg-white/[0.024] p-ds-5">
              <p className="text-[15px] italic leading-[1.85] text-ink-primary/90">"{thesis}"</p>
            </div>
          ) : null}

          {/* Signal + Wall Street */}
          <div className="mt-ds-6 flex flex-wrap items-center gap-ds-4 border-t border-white/[0.07] pt-ds-5">
            <div className="flex items-center gap-ds-2 rounded-[8px] border border-gold-border/60 bg-gold-primary/[0.045] px-ds-3 py-ds-2">
              <div className="w-2 h-2 rounded-full" style={{ background: signal.color }} />
              <span className="text-sm font-medium" style={{ color: signal.color }}>{signal.signal}</span>
            </div>
            {data.analystRating && (
              <span className="text-[13px] text-ink-tertiary">Wall Street: <span className="font-medium text-gold-primary">{data.analystRating}</span></span>
            )}
            {data.nextEarningsDate && (
              <span className="text-[13px] text-ink-tertiary">Next Earnings: <span className="font-medium text-ink-primary">{new Date(data.nextEarningsDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></span>
            )}
          </div>
        </div>
      </Card>

      {/* ========== POSITIVE / NEGATIVE FACTORS ========== */}
      <FactorsSection
        positiveFactors={investmentStory?.positiveFactors}
        negativeFactors={investmentStory?.negativeFactors}
        isLoading={storyLoading || factorsLoading}
      />

      {/* ========== AI DEEP BRIEF ========== */}
      <div className="space-y-4">
        <Card gold>
          <div className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.05))', border: '1px solid rgba(201,166,70,0.3)', boxShadow: '0 0 20px rgba(201,166,70,0.1)' }}>
                  <Brain className="w-6 h-6 text-[#C9A646]" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-white">FINOTAUR AI Deep Brief</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C9A646]/15 text-[#C9A646] border border-[#C9A646]/25">INSTITUTIONAL GRADE</span>
                    {searchCount > 0 && (<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/25 flex items-center gap-1"><Search className="w-2.5 h-2.5" />LIVE DATA</span>)}
                  </div>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">
                    {isGenerating ? `Analyzing ${data.ticker} with real-time data... (${completedCount}/${AI_SECTIONS_CONFIG.length})` :
                     generatedAt ? `Generated ${new Date(generatedAt).toLocaleTimeString()} • ${completedCount} sections • ${searchCount} used live data` :
                     '7-section deep analysis powered by AI '}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {hasContent && (
                  <button onClick={toggleAll}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black active:scale-[0.98] hover:shadow-lg hover:shadow-[#C9A646]/20 transition-all"
                    style={{ background: 'linear-gradient(135deg, #C9A646, #F4D97B, #C9A646)', backgroundSize: '200% 100%' }}>
                    <Eye className="w-4 h-4" />{allExpanded ? 'Collapse All' : 'Expand All'}
                  </button>
                )}
                {isGenerating && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C9A646]/10 text-[#C9A646]/50 cursor-wait text-sm font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin" />Analyzing...
                  </div>
                )}
              </div>
            </div>
            {isGenerating && (
              <div className="mt-4">
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${(completedCount / AI_SECTIONS_CONFIG.length) * 100}%`, background: 'linear-gradient(90deg, #C9A646, #F4D97B)' }} />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Search className="w-3 h-3 text-[#06B6D4] animate-pulse" />
                  <span className="text-[10px] text-[#06B6D4]">{completedCount < AI_SECTIONS_CONFIG.length ? `Analyzing: ${AI_SECTIONS_CONFIG[Math.min(completedCount, AI_SECTIONS_CONFIG.length - 1)].title}...` : 'Finalizing brief...'}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {(hasContent || isGenerating) && (
          <div className="space-y-3">
            {sections.map((section) => (<AISectionCard key={section.id} section={section} isExpanded={expandedSections.has(section.id)} onToggle={() => toggleSection(section.id)} />))}
          </div>
        )}

        {!hasContent && !isGenerating && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {AI_SECTIONS_CONFIG.slice(0, 4).map((config) => { const Icon = config.icon; return (
                <div key={config.id} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5"><Icon className="w-4 h-4 shrink-0" style={{ color: config.color + '80' }} /><div><p className="text-xs font-medium text-[#8B8B8B]">{config.title}</p><p className="text-[10px] text-[#4B4B4B]">{config.badge}</p></div></div>
              ); })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {AI_SECTIONS_CONFIG.slice(4).map((config) => { const Icon = config.icon; return (
                <div key={config.id} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5"><Icon className="w-4 h-4 shrink-0" style={{ color: config.color + '80' }} /><div><p className="text-xs font-medium text-[#8B8B8B]">{config.title}</p><p className="text-[10px] text-[#4B4B4B]">{config.badge}</p></div></div>
              ); })}
            </div>
          </div>
        )}
      </div>
    </div>
    </StockTabErrorBoundary>
  );
});

OverviewTab.displayName = 'OverviewTab';
