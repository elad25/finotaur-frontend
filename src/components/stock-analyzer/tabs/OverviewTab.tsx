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
import {
  Building2, Activity, FileText, Sparkles, BarChart3, Globe,
  Brain, Shield, AlertTriangle, Calendar,
  ChevronDown, ChevronUp, Loader2, RefreshCw, Zap, Eye,
  Landmark, Crosshair, Users, Copy, Check, Search, TrendingUp, TrendingDown, BarChart2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types/stock-analyzer.types';
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
  const response = await fetch('/api/ai-proxy/chat', {
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
    const res = await fetch(`/api/stock-analysis/ism-macro/${encodeURIComponent(sector)}`);
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Positive skeleton */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#22C55E]" />
            <span className="text-sm font-bold text-[#22C55E] tracking-wider uppercase">Positive Factors</span>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.08)' }}>
              <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: 'rgba(34,197,94,0.1)', animationDelay: `${i * 200}ms` }} />
              <div className="h-3 w-full rounded animate-pulse" style={{ background: 'rgba(34,197,94,0.05)', animationDelay: `${i * 200 + 100}ms` }} />
              <div className="h-3 w-5/6 rounded animate-pulse" style={{ background: 'rgba(34,197,94,0.05)', animationDelay: `${i * 200 + 150}ms` }} />
            </div>
          ))}
        </div>
        {/* Negative skeleton */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-[#EF4444]" />
            <span className="text-sm font-bold text-[#EF4444] tracking-wider uppercase">Negative Factors</span>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.08)' }}>
              <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: 'rgba(239,68,68,0.1)', animationDelay: `${i * 200}ms` }} />
              <div className="h-3 w-full rounded animate-pulse" style={{ background: 'rgba(239,68,68,0.05)', animationDelay: `${i * 200 + 100}ms` }} />
              <div className="h-3 w-5/6 rounded animate-pulse" style={{ background: 'rgba(239,68,68,0.05)', animationDelay: `${i * 200 + 150}ms` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!positiveFactors?.length && !negativeFactors?.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* ── POSITIVE FACTORS ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-[#22C55E]" />
          <span className="text-sm font-bold text-[#22C55E] tracking-wider uppercase">Positive Factors</span>
        </div>
        {(positiveFactors || []).map((factor, i) => (
          <div key={i} className="rounded-xl p-4 transition-all duration-200 hover:border-[#22C55E]/25" style={{
            background: 'rgba(34,197,94,0.04)',
            border: '1px solid rgba(34,197,94,0.12)',
          }}>
            <h4 className="text-[13px] font-bold text-white mb-2 leading-snug">
              {factor.title}
            </h4>
            <p className="text-[12.5px] text-[#9B9B9B] leading-[1.75]">
              {factor.description}
            </p>
          </div>
        ))}
      </div>

      {/* ── NEGATIVE FACTORS ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="w-4 h-4 text-[#EF4444]" />
          <span className="text-sm font-bold text-[#EF4444] tracking-wider uppercase">Negative Factors</span>
        </div>
        {(negativeFactors || []).map((factor, i) => (
          <div key={i} className="rounded-xl p-4 transition-all duration-200 hover:border-[#EF4444]/25" style={{
            background: 'rgba(239,68,68,0.04)',
            border: '1px solid rgba(239,68,68,0.12)',
          }}>
            <h4 className="text-[13px] font-bold text-white mb-2 leading-snug">
              {factor.title}
            </h4>
            <p className="text-[12.5px] text-[#9B9B9B] leading-[1.75]">
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
    const res = await fetch(`/api/stock-cache/${ticker}/brief`);
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
    await fetch(`/api/stock-cache/${ticker}/brief`, {
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
// AI SECTION CARD
// =====================================================

const AISectionCard = memo(({ section, isExpanded, onToggle }: { section: AISection; isExpanded: boolean; onToggle: () => void }) => {
  const Icon = section.icon;
  const hasContent = !!section.content;
  return (
    <div className="rounded-xl border transition-all duration-300" style={{
      background: hasContent ? 'rgba(201,166,70,0.02)' : 'rgba(255,255,255,0.01)',
      borderColor: hasContent ? 'rgba(201,166,70,0.15)' : 'rgba(255,255,255,0.05)',
    }}>
      <div onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }} className="w-full flex items-center justify-between p-4 text-left hover:bg-[#C9A646]/[0.03] transition-colors rounded-xl cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.12), rgba(244,217,123,0.06))',
            border: '1px solid rgba(201,166,70,0.20)',
            boxShadow: hasContent ? '0 0 12px rgba(201,166,70,0.08)' : 'none',
          }}>
            <Icon className="w-4 h-4 text-[#C9A646]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: hasContent ? '#F4D97B' : '#E8E8E8' }}>{section.title}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#C9A646]/10 text-[#C9A646] border border-[#C9A646]/20">{section.badge}</span>
              {section.searchUsed && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#C9A646]/8 text-[#D4B855] border border-[#C9A646]/15 flex items-center gap-0.5">
                  <Search className="w-2 h-2" />LIVE
                </span>
              )}
            </div>
            {section.verdict && (
              <span className="text-[10px] font-semibold mt-0.5 inline-block" style={{ color: section.verdictColor || '#C9A646' }}>
                {section.verdict}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {section.content && <CopyButton text={section.content} />}
          {section.isLoading ? (
            <Loader2 className="w-4 h-4 text-[#C9A646] animate-spin" />
          ) : (
            isExpanded ? <ChevronUp className="w-4 h-4 text-[#C9A646]/50" /> : <ChevronDown className="w-4 h-4 text-[#C9A646]/50" />
          )}
        </div>
      </div>
      <div className={cn('overflow-hidden transition-all duration-300', isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0')}>
        <div className="px-4 pb-4">
          {section.isLoading && (
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(201,166,70,0.03)', border: '1px solid rgba(201,166,70,0.08)' }}>
              <div className="w-5 h-5 rounded-full border-2 border-[#C9A646]/30 border-t-[#C9A646] animate-spin" />
              <span className="text-xs text-[#C9A646]/60">Analyzing with AI + real-time data...</span>
            </div>
          )}
          {section.content && !section.isLoading && (
            <div className="relative">
              <div className="absolute top-0 left-0 w-[3px] h-full rounded-full" style={{ background: 'linear-gradient(to bottom, #C9A646, #C9A64620, transparent)' }} />
              <div className="pl-4"><p className="text-[#C8C8C8] leading-[1.9] text-sm whitespace-pre-wrap">{section.content}</p></div>
            </div>
          )}
          {section.error && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/15">
              <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0" />
              <div><p className="text-sm text-[#EF4444]/80">{section.error}</p><p className="text-xs text-[#EF4444]/50 mt-1">Click "Regenerate" to retry</p></div>
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

    // ── STEP 1-7: Generate deep brief sections ──
    for (let i = 0; i < AI_SECTIONS_CONFIG.length; i++) {
      if (controller.signal.aborted) break;
      const config = AI_SECTIONS_CONFIG[i];
      try {
        // For macro_bridge, inject ISM data into the prompt
        const prompt = config.id === 'macro_bridge'
          ? config.prompt(data, ismDataBlock)
          : config.prompt(data);
        const { content, searchUsed } = await callAI(prompt, config.useWebSearch, controller.signal);
        const verdictInfo = extractVerdict(content, config.id);
        if (!controller.signal.aborted) {
          setSections(prev => prev.map(s => s.id === config.id ? { ...s, content, searchUsed, verdict: verdictInfo?.verdict || null, verdictColor: verdictInfo?.color || null, isLoading: false, error: null } : s));
        }
      } catch (err: any) {
        if (err.name === 'AbortError') break;
        if (!controller.signal.aborted) {
          setSections(prev => prev.map(s => s.id === config.id ? { ...s, content: null, verdict: null, verdictColor: null, isLoading: false, error: err.message || 'Analysis failed', searchUsed: false } : s));
        }
      }
    }

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
    <div className="space-y-6">
      {/* ========== INVESTMENT STORY — AI Enhanced ========== */}
      <Card highlight>
        <div className="relative p-6">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A646] to-transparent" />
          
          {/* Header with rating */}
          <div className="flex items-center justify-between mb-4">
            <SectionHeader icon={Sparkles} title="The Investment Story" badge="AI Analysis" />
            {investmentStory?.rating && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{
                background: investmentStory.rating.includes('Buy') ? 'rgba(34,197,94,0.1)' : investmentStory.rating === 'Hold' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${investmentStory.rating.includes('Buy') ? 'rgba(34,197,94,0.25)' : investmentStory.rating === 'Hold' ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}>
                <span className="text-xs font-bold tracking-wide" style={{
                  color: investmentStory.rating.includes('Buy') ? '#22C55E' : investmentStory.rating === 'Hold' ? '#F59E0B' : '#EF4444',
                }}>{investmentStory.rating.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Loading state */}
          {storyLoading && (
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 text-[#C9A646] animate-spin" />
                <span className="text-xs text-[#C9A646]">Analyzing fundamentals, financials & options flow...</span>
              </div>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-3 rounded-full animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(201,166,70,0.05), rgba(201,166,70,0.12), rgba(201,166,70,0.05))', width: `${95 - i * 12}%`, animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          )}

          {/* AI Summary */}
          {investmentStory ? (
            <div className="space-y-3">
              {/* Main thesis */}
              <div className="p-4 rounded-xl" style={{ background: 'rgba(201,166,70,0.06)', border: '1px solid rgba(201,166,70,0.15)' }}>
                <p className="text-[#E8DCC4] leading-relaxed text-sm">{investmentStory.summary}</p>
              </div>

              {/* Bull / Bear / Options grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Bull Case */}
                {investmentStory.bullCase && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-3.5 h-3.5 text-[#22C55E]" />
                      <span className="text-xs font-semibold text-[#22C55E] tracking-wide">BULL CASE</span>
                    </div>
                    <p className="text-xs text-[#C8C8C8] leading-relaxed">{investmentStory.bullCase}</p>
                  </div>
                )}

                {/* Bear Case */}
                {investmentStory.bearCase && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-3.5 h-3.5 text-[#EF4444]" />
                      <span className="text-xs font-semibold text-[#EF4444] tracking-wide">BEAR CASE</span>
                    </div>
                    <p className="text-xs text-[#C8C8C8] leading-relaxed">{investmentStory.bearCase}</p>
                  </div>
                )}

                {/* Options Insight */}
                {investmentStory.optionsInsight && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.12)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart2 className="w-3.5 h-3.5 text-[#A855F7]" />
                      <span className="text-xs font-semibold text-[#A855F7] tracking-wide">OPTIONS FLOW</span>
                    </div>
                    <p className="text-xs text-[#C8C8C8] leading-relaxed">{investmentStory.optionsInsight}</p>
                  </div>
                )}
              </div>
            </div>
          ) : !storyLoading ? (
            /* Fallback to static thesis when AI hasn't loaded */
            <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(201,166,70,0.06)', border: '1px solid rgba(201,166,70,0.15)' }}>
              <p className="text-[#E8DCC4] leading-relaxed italic text-sm">"{thesis}"</p>
            </div>
          ) : null}

          {/* Signal + Wall Street */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: `${signal.color}15`, border: `1px solid ${signal.color}30` }}>
              <div className="w-2 h-2 rounded-full" style={{ background: signal.color }} />
              <span className="text-sm font-medium" style={{ color: signal.color }}>{signal.signal}</span>
            </div>
            {data.analystRating && (
              <span className="text-xs text-[#6B6B6B]">Wall Street: <span className={cn("font-medium", data.analystRating.includes('Buy') ? 'text-[#22C55E]' : data.analystRating === 'Hold' ? 'text-[#F59E0B]' : 'text-[#EF4444]')}>{data.analystRating}</span></span>
            )}
            {data.nextEarningsDate && (
              <span className="text-xs text-[#6B6B6B]">Next Earnings: <span className="text-[#C9A646] font-medium">{new Date(data.nextEarningsDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></span>
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
  );
});

OverviewTab.displayName = 'OverviewTab';