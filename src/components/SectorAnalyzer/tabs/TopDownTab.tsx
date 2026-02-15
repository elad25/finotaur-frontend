// =====================================================
// 🎯 TOP DOWN TAB - Macro → ISM → Sector → Trade Analysis
// =====================================================
// ARCHITECTURE: "Compute Once, Serve 10,000"
// - Reads pre-generated data from sector_analysis_cache
// - ZERO AI calls on page load
// - Falls back to static sector data if cache empty
// - ISM data ALWAYS visible (real or fallback)
// - 4x daily refresh: pre-market, mid-morning, midday, post-close
// =====================================================

import React, { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, BarChart2, Zap, AlertTriangle, TrendingUp, TrendingDown,
  Info, PieChart, ArrowRight, ChevronDown, ChevronUp,
  Activity, Layers, Globe, Shield, Clock, ArrowUpRight, ArrowDownRight,
  MessageSquareQuote, Sparkles
} from 'lucide-react';
import { Sector, TradeIdea } from '../types';
import { Card, colors } from '../ui';
import { cn, formatPercent } from '../utils';

// 🔧 Decode HTML entities in ISM quotes (&#8220; &#8217; etc.)
const decodeQuoteText = (text: string): string => {
  if (!text) return '';
  try {
    const doc = new DOMParser().parseFromString(text.replace(/&amp;/g, '&'), 'text/html');
    let decoded = doc.body.textContent || text;
    decoded = decoded.replace(/^["\u201C\u201D\u201E\u201F]+|["\u201C\u201D\u201E\u201F]+$/g, '').trim();
    return decoded;
  } catch {
    return text
      .replace(/&#8220;/g, '\u201C').replace(/&#8221;/g, '\u201D')
      .replace(/&#8216;/g, '\u2018').replace(/&#8217;/g, '\u2019')
      .replace(/&#8212;/g, '\u2014').replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"').replace(/&ldquo;|&rdquo;/g, '').replace(/&lsquo;|&rsquo;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
      .replace(/^["\u201C\u201D]+|["\u201C\u201D]+$/g, '')
      .replace(/^["'>]+/g, '').trim();
  }
};

// =====================================================
// 🔗 HOOK: Fetch cached sector analysis
// =====================================================

interface ISMExecutiveQuote {
  industry: string;
  comment: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  isVerified?: boolean;
  source?: string;
}

interface CachedSectorAnalysis {
  macro_regime?: {
    regime: string;
    regimeLabel: string;
    riskLevel: string;
    fedPolicy: string;
    rotationTheme: string;
    narrative: string;
  };
  ism_context?: {
    pmi: number;
    direction: string;
    keySignals: string[];
    month: string;
    newOrders: number;
    employment: number;
    prices: number;
    backlog: number;
    production?: number;
    // Derived signals from ism_economic_snapshots
    demandSignal?: string;
    pricingPowerSignal?: string;
    laborMarketSignal?: string;
    // Executive quotes from ISM respondents
    executiveQuotes?: Array<{
      industry: string;
      comment: string;
      sentiment: string;
      isVerified?: boolean;
      source?: string;
    }>;
    // AI verdict: does ISM support this sector?
    ismVerdict?: string;
  };
  sector_verdict?: {
    signal: string;
    rating: number;
    summary: string;
    ismImpact: string;
  };
  top_down_flow?: {
    macroNarrative: string;
    sectorThesis: string;
    ismConnection: string;
    alignmentScore?: number;
    alignmentRationale?: string;
    stockPicks: Array<string | { ticker: string; name: string; thesis: string; alignmentScore: number }>;
  };
  trade_ideas?: CachedTradeIdea[];
  rotation_signal?: {
    strength: string;
    catalyst: string;
    ismDriver: string;
  };
  allocation_guide?: {
    recommendedWeight: string;
    conviction: string;
    riskProfile: string;
  };
  ai_commentary?: string;
  ai_bull_case?: string;
  ai_bear_case?: string;
  ai_key_trade?: string;
  generated_at?: string;
}

interface CachedTradeIdea {
  ticker: string;
  direction: string;
  conviction: number;
  // Rich company-level fields
  name?: string;
  performanceVsSector?: string;
  fundamentalCase?: string;
  macroImpact?: string;
  ismConnection?: string;
  catalyst?: string;
  risk?: string;
  // NEW: Deep company analysis fields
  companyThesis?: string;        // 3-4 sentences: Why THIS company specifically benefits now
  upcomingEvents?: string;       // Investor day, product launch, earnings, partnerships — with dates
  upcomingCatalysts?: string;    // New: detailed catalysts with dates (30-90 day window)
  revenueDriver?: string;        // What specific business line / segment is accelerating
  competitiveEdge?: string;      // Moat / market position vs peers
  macroTailwind?: string;        // How macro regime SPECIFICALLY benefits this company's business model
  ismTailwind?: string;          // How ISM components flow into this company's revenue/margins
  entryLogic?: string;           // Why now — technical + fundamental timing
  targetRationale?: string;      // Price target reasoning with multiples or catalysts
  // Trade parameters
  entry?: string;
  target?: string;
  stop?: string;
  riskReward?: string;
  timeHorizon?: string;
  // Legacy fields
  strategy?: string;
  thesis?: string;
  ismBacking?: string;
  risks?: string[];
}

// In a real app, this would use React Query/SWR.
// Here we define the interface - the parent component or a hook provides the data.
// For now, we accept it as an optional prop and fall back gracefully.

// =====================================================
// 🏔️ TOP-DOWN FLOW VISUALIZATION
// =====================================================

interface TopDownFlowProps {
  macro: CachedSectorAnalysis['macro_regime'];
  ism: CachedSectorAnalysis['ism_context'];
  flow: CachedSectorAnalysis['top_down_flow'];
  sectorName: string;
}

// Star rating component
const AlignmentStars = memo<{ score: number; size?: 'sm' | 'md' }>(({ score, size = 'sm' }) => {
  const s = size === 'md' ? 'text-sm' : 'text-[11px]';
  return (
    <div className={`flex items-center gap-0.5 ${s}`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= score ? '#C9A646' : '#2A2A2A' }}>★</span>
      ))}
    </div>
  );
});
AlignmentStars.displayName = 'AlignmentStars';

const TopDownFlow = memo<TopDownFlowProps>(({ macro, ism, flow, sectorName }) => {
  const alignmentScore = flow?.alignmentScore || 3;

  // Helper: truncate macro narrative to ~4 lines (max ~400 chars)
  const truncateMacro = (text: string | undefined, maxLen = 380): string => {
    if (!text) return 'Macro analysis will update at next scheduled run.';
    if (text.length <= maxLen) return text;
    const trimmed = text.substring(0, maxLen);
    const lastPeriod = trimmed.lastIndexOf('.');
    return lastPeriod > maxLen * 0.5 ? trimmed.substring(0, lastPeriod + 1) : trimmed + '...';
  };

  // Build ISM fallback from ism_context data when flow.ismConnection is missing
  const buildIsmFallback = (): string => {
    if (!ism?.pmi) return 'ISM data pending next analysis cycle.';
    const parts: string[] = [];
    parts.push(`Manufacturing PMI at ${ism.pmi} signals ${ism.direction === 'contraction' ? 'contraction' : 'expansion'}.`);
    if (ism.newOrders) parts.push(`New Orders at ${ism.newOrders}${ism.newOrders >= 50 ? ' (expanding)' : ' (contracting)'}.`);
    if (ism.employment) parts.push(`Employment index at ${ism.employment}.`);
    if (ism.prices) parts.push(`Prices component at ${ism.prices}${ism.prices > 55 ? ' — inflationary pressure' : ''}.`);
    return parts.join(' ');
  };

  // Build sector fallback from verdict/macro data
  const buildSectorFallback = (): string => {
    if (macro?.rotationTheme) {
      return `${sectorName} positioned within ${macro.rotationTheme} theme. ${macro.riskLevel ? `Risk environment: ${macro.riskLevel}.` : ''}`;
    }
    return `${sectorName} analysis will update at next scheduled run.`;
  };

// ★ v4.1: VALIDATED QUOTES — WHITELIST approach: only allow REAL ISM industry names
  const VALID_ISM_INDUSTRIES = new Set([
    'Chemical Products', 'Computer & Electronic Products', 'Transportation Equipment',
    'Machinery', 'Fabricated Metal Products', 'Electrical Equipment, Appliances & Components',
    'Miscellaneous Manufacturing', 'Food, Beverage & Tobacco Products',
    'Petroleum & Coal Products', 'Primary Metals', 'Plastics & Rubber Products',
    'Furniture & Related Products', 'Nonmetallic Mineral Products', 'Wood Products',
    'Textile Mills', 'Apparel, Leather & Allied Products',
    'Printing & Related Support Activities', 'Paper Products',
  ]);

  const verifiedQuotes = useMemo(() => {
    if (!ism?.executiveQuotes?.length) return [];
    return ism.executiveQuotes.filter(q => {
      // Method 1: Backend tagged as verified with real source
      if (q.isVerified === true && q.source === 'ISM Report') return true;
      // Method 2: Industry name is a REAL ISM manufacturing industry
      if (VALID_ISM_INDUSTRIES.has(q.industry)) return true;
      // Everything else is rejected (AI-generated like "Banking", "Investment Management", etc.)
      return false;
    });
  }, [ism?.executiveQuotes]);
  const hasRealQuotes = verifiedQuotes.length > 0;

  const steps = useMemo(() => [
    {
      level: 'MACRO',
      icon: Globe,
      color: '#3B82F6',
      content: macro?.regimeLabel || 'Analyzing...',
      detail: truncateMacro(flow?.macroNarrative || macro?.narrative),
      badge: macro?.riskLevel ? `${macro.riskLevel.toUpperCase()} RISK` : null,
      badgeColor: macro?.riskLevel === 'high' || macro?.riskLevel === 'elevated' ? colors.negative : 
                  macro?.riskLevel === 'low' ? colors.positive : colors.warning,
    },
    {
      level: 'ISM',
      icon: Activity,
      color: '#C9A646',
      content: ism?.pmi ? `PMI ${ism.pmi} — ${ism.direction === 'contraction' ? 'Contraction' : 'Expansion'}` : 'ISM Data',
      detail: flow?.ismConnection || buildIsmFallback(),
      badge: ism?.direction === 'contraction' ? 'CONTRACTION' : ism?.direction === 'expansion' ? 'EXPANSION' : null,
      badgeColor: ism?.direction === 'contraction' ? colors.negative : colors.positive,
    },
    {
      level: 'SECTOR',
      icon: Layers,
      color: '#22C55E',
      content: sectorName,
      detail: flow?.sectorThesis || buildSectorFallback(),
      badge: null,
      badgeColor: null,
    },
  ], [macro, ism, flow, sectorName]);

  // Normalize stock picks (handle both old string[] and new object[] format)
  const stockPicks = useMemo(() => {
    if (!flow?.stockPicks?.length) return [];
    return flow.stockPicks.map(pick => {
      if (typeof pick === 'string') return { ticker: pick, name: '', thesis: '', alignmentScore: 3 };
      return pick;
    });
  }, [flow?.stockPicks]);

  return (
    <Card highlight>
      <div className="p-5">
        {/* Header with alignment score — NO rationale text */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" 
                 style={{ background: 'linear-gradient(135deg, #C9A646, #F4D97B)' }}>
              <ArrowDownRight className="h-4 w-4 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Top-Down Analysis Flow</h3>
              <p className="text-xs text-[#6B6B6B]">Macro → ISM → Sector → Trade</p>
            </div>
          </div>
          {/* Stars badge ONLY — no rationale text below */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
               style={{ 
                 background: alignmentScore >= 4 ? 'rgba(34,197,94,0.08)' : alignmentScore >= 3 ? 'rgba(201,166,70,0.08)' : 'rgba(239,68,68,0.08)',
                 border: `1px solid ${alignmentScore >= 4 ? 'rgba(34,197,94,0.2)' : alignmentScore >= 3 ? 'rgba(201,166,70,0.2)' : 'rgba(239,68,68,0.2)'}`,
               }}>
            <AlignmentStars score={alignmentScore} size="md" />
            <span className="text-[10px] font-bold ml-1"
                  style={{ color: alignmentScore >= 4 ? colors.positive : alignmentScore >= 3 ? '#C9A646' : colors.negative }}>
              {alignmentScore >= 4 ? 'STRONG SETUP' : alignmentScore >= 3 ? 'MODERATE' : 'WEAK SETUP'}
            </span>
          </div>
        </div>

        {/* Flow Steps */}
        <div className="relative mb-5">
          {steps.map((step, i) => {
            const IconComp = step.icon;
            return (
              <React.Fragment key={step.level}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="relative flex gap-4 pb-5 last:pb-0"
                >
                  {/* Connector Line */}
                  {i < steps.length - 1 && (
                    <div className="absolute left-[19px] top-[40px] bottom-0 w-px"
                         style={{ background: `linear-gradient(to bottom, ${step.color}40, ${steps[i + 1].color}40)` }} />
                  )}

                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center z-10"
                       style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}>
                    <IconComp className="h-5 w-5" style={{ color: step.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold tracking-widest" style={{ color: step.color }}>
                        {step.level}
                      </span>
                      {step.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: `${step.badgeColor}15`, color: step.badgeColor }}>
                          {step.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-white leading-snug mb-1">{step.content}</p>
                    {step.detail && (
                      <p className="text-xs text-[#9B9B9B] leading-relaxed">{step.detail}</p>
                    )}
                  </div>
                </motion.div>

                {/* ═══ ISM SECTION: REAL QUOTES + AI VERDICT (after ISM step only) ═══ */}
                {step.level === 'ISM' && (hasRealQuotes || ism?.ismVerdict) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="ml-14 mb-5 space-y-3"
                  >
                    {/* ★ VERIFIED Executive Quotes — ONLY real ISM respondent quotes */}
                    {hasRealQuotes && (
                      <div className="rounded-xl p-4" 
                           style={{ background: 'rgba(201,166,70,0.04)', border: '1px solid rgba(201,166,70,0.12)' }}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] font-bold text-[#C9A646] tracking-widest uppercase">
                            🏭 Industry Executives
                          </span>
                          <span className="text-[9px] text-[#6B6B6B]">
                            ISM Respondent Quotes
                          </span>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded ml-auto"
                                style={{ background: 'rgba(34,197,94,0.1)', color: colors.positive }}>
                            ✓ VERIFIED
                          </span>
                        </div>
                        <div className="space-y-2.5">
                          {verifiedQuotes.map((q, qi) => (
                            <div key={qi} className="flex gap-3 items-start">
                              <div className="flex-shrink-0 mt-1 w-1 h-full min-h-[20px] rounded-full"
                                   style={{ background: q.sentiment === 'positive' ? colors.positive : 
                                            q.sentiment === 'negative' ? colors.negative : '#6B6B6B' }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-[#D0D0D0] leading-relaxed italic">
                                  "{decodeQuoteText(q.comment)}"
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[9px] font-medium text-[#C9A646]">{q.industry}</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded"
                                        style={{ 
                                          background: q.sentiment === 'positive' ? 'rgba(34,197,94,0.1)' : 
                                                      q.sentiment === 'negative' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                                          color: q.sentiment === 'positive' ? colors.positive : 
                                                 q.sentiment === 'negative' ? colors.negative : '#8B8B8B' 
                                        }}>
                                    {q.sentiment === 'positive' ? '▲ Positive' : q.sentiment === 'negative' ? '▼ Negative' : '● Neutral'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-2" style={{ borderTop: '1px solid rgba(201,166,70,0.08)' }}>
                          <span className="text-[8px] text-[#4A4A4A]">
                            Source: ISM Manufacturing Report — "What Respondents Are Saying" • {ism?.month || 'Latest'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* ★ NO REAL QUOTES — Show ISM component breakdown instead */}
                    {!hasRealQuotes && ism?.pmi && (
                      <div className="rounded-xl p-4" 
                           style={{ background: 'rgba(201,166,70,0.03)', border: '1px solid rgba(201,166,70,0.08)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="h-3.5 w-3.5 text-[#C9A646]" />
                          <span className="text-[10px] font-bold text-[#C9A646] tracking-widest uppercase">
                            ISM Component Breakdown
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { label: 'New Orders', value: ism.newOrders, threshold: 50 },
                            { label: 'Employment', value: ism.employment, threshold: 50 },
                            { label: 'Prices', value: ism.prices, threshold: 50 },
                            { label: 'Backlog', value: ism.backlog, threshold: 50 },
                            { label: 'Production', value: ism.production, threshold: 50 },
                          ].filter(c => c.value != null).map((comp, ci) => (
                            <div key={ci} className="p-2 rounded-lg text-center"
                                 style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.06)' }}>
                              <div className="text-[9px] text-[#6B6B6B] uppercase mb-0.5">{comp.label}</div>
                              <div className="text-sm font-bold" 
                                   style={{ color: comp.value >= comp.threshold ? colors.positive : colors.negative }}>
                                {comp.value}
                              </div>
                              <div className="text-[8px]"
                                   style={{ color: comp.value >= comp.threshold ? colors.positive : colors.negative }}>
                                {comp.value >= comp.threshold ? 'Expanding' : 'Contracting'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI ISM Verdict */}
                    {ism?.ismVerdict && (
                      <div className="rounded-xl p-4"
                           style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.12)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-3.5 w-3.5 text-[#A855F7]" />
                          <span className="text-[10px] font-bold text-[#A855F7] tracking-widest uppercase">
                            AI ISM Analysis
                          </span>
                        </div>
                        <p className="text-xs text-[#C8C8C8] leading-relaxed">{ism.ismVerdict}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Stock Picks with Alignment */}
        {stockPicks.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.12)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-[#A855F7]" />
              <span className="text-[10px] font-bold text-[#A855F7] tracking-widest uppercase">
                Aligned Stock Picks
              </span>
            </div>
            <div className="space-y-2.5">
              {stockPicks.map((pick, i) => (
                <motion.div
                  key={pick.ticker}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="flex-shrink-0">
                    <span className="text-sm font-bold text-[#C9A646]">{pick.ticker}</span>
                    {pick.name && <span className="text-[10px] text-[#6B6B6B] block">{pick.name}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    {pick.thesis && <p className="text-xs text-[#9B9B9B] leading-relaxed">{pick.thesis}</p>}
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                    <AlignmentStars score={pick.alignmentScore || 3} />
                    <span className="text-[9px]" style={{ 
                      color: (pick.alignmentScore || 3) >= 4 ? colors.positive : (pick.alignmentScore || 3) >= 3 ? '#C9A646' : colors.negative 
                    }}>
                      {(pick.alignmentScore || 3)}/5
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

TopDownFlow.displayName = 'TopDownFlow';

// =====================================================
// 📊 ISM DASHBOARD STRIP
// =====================================================
// ALWAYS renders — uses real data or shows "—" placeholders
// This ensures ISM section is NEVER empty on the page
// =====================================================

interface ISMStripProps {
  ism: CachedSectorAnalysis['ism_context'];
}

const ISMStrip = memo<ISMStripProps>(({ ism }) => {
  // Always show the strip — use real values or fallback dashes
  const pmi = ism?.pmi ?? null;
  const newOrders = ism?.newOrders ?? null;
  const employment = ism?.employment ?? null;
  const prices = ism?.prices ?? null;
  const backlog = ism?.backlog ?? null;

  const indicators = [
    { 
      label: 'PMI', 
      value: pmi, 
      threshold: 50, 
      color: pmi !== null ? (pmi >= 50 ? colors.positive : colors.negative) : '#6B6B6B' 
    },
    { 
      label: 'New Orders', 
      value: newOrders, 
      threshold: 50, 
      color: newOrders !== null ? (newOrders >= 50 ? colors.positive : colors.negative) : '#6B6B6B' 
    },
    { 
      label: 'Employment', 
      value: employment, 
      threshold: 48, 
      color: employment !== null ? (employment >= 48 ? colors.positive : colors.negative) : '#6B6B6B' 
    },
    { 
      label: 'Prices', 
      value: prices, 
      threshold: 55, 
      color: prices !== null ? (prices > 55 ? colors.warning : colors.positive) : '#6B6B6B' 
    },
    { 
      label: 'Backlog', 
      value: backlog, 
      threshold: 47, 
      color: backlog !== null ? (backlog >= 47 ? colors.positive : colors.negative) : '#6B6B6B' 
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {indicators.map(ind => (
        <motion.div
          key={ind.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${ind.color}15` }}
        >
          <div className="text-[9px] text-[#6B6B6B] uppercase tracking-wider mb-1">{ind.label}</div>
          <div className="text-lg font-bold" style={{ color: ind.color }}>
            {ind.value ?? '—'}
          </div>
          {ind.value !== null && (
            <div className="text-[9px] mt-0.5" style={{ color: ind.color }}>
              {ind.value >= ind.threshold ? '▲' : '▼'} {ind.threshold}
            </div>
          )}
          {ind.value === null && (
            <div className="text-[9px] mt-0.5 text-[#4A4A4A]">pending</div>
          )}
        </motion.div>
      ))}
    </div>
  );
});

ISMStrip.displayName = 'ISMStrip';

// =====================================================
// 📊 CONVICTION BAR
// =====================================================

interface ConvictionBarProps {
  conviction: number;
  size?: 'sm' | 'md';
}

const ConvictionBar = memo<ConvictionBarProps>(({ conviction, size = 'md' }) => {
  const filled = Math.floor(conviction / 10);
  const color = conviction >= 75 ? colors.positive : conviction >= 50 ? colors.warning : colors.negative;
  const barH = size === 'sm' ? 'h-3' : 'h-4';
  const barW = size === 'sm' ? 'w-1.5' : 'w-2';

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`${barW} ${barH} rounded-sm`}
               style={{ background: i < filled ? color : 'rgba(255,255,255,0.08)' }} />
        ))}
      </div>
      <span className="text-sm font-bold" style={{ color }}>{conviction}%</span>
    </div>
  );
});

ConvictionBar.displayName = 'ConvictionBar';

// =====================================================
// 📊 STOCK ANALYSIS CARD
// =====================================================

interface TradeCardProps {
  idea: CachedTradeIdea;
  index: number;
}

const TradeStrategyCard = memo<TradeCardProps>(({ idea, index }) => {
  const isBullish = idea.direction === 'bullish' || idea.direction === ('long' as any);
  const dirColor = isBullish ? colors.positive : colors.negative;
  const DirIcon = isBullish ? TrendingUp : TrendingDown;

  const mainThesis = idea.companyThesis || idea.fundamentalCase || idea.thesis || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-xl overflow-hidden"
      style={{ 
        background: isBullish ? 'rgba(34,197,94,0.03)' : 'rgba(239,68,68,0.03)', 
        border: `1px solid ${isBullish ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'}` 
      }}
    >
      <div className="p-5">
        {/* Header: Direction + Ticker + TimeHorizon */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded"
                    style={{ background: `${dirColor}12`, color: dirColor }}>
                {isBullish ? 'BULLISH' : 'BEARISH'}
              </span>
              {idea.timeHorizon && (
                <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded"
                      style={{ background: 'rgba(201,166,70,0.1)', color: '#C9A646' }}>
                  {idea.timeHorizon.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <DirIcon className="h-5 w-5" style={{ color: dirColor }} />
              <span className="text-xl font-bold" style={{ color: dirColor }}>{idea.ticker}</span>
              {idea.name && <span className="text-sm text-[#8B8B8B]">• {idea.name}</span>}
            </div>
          </div>
        </div>

        {/* Company Deep Analysis */}
        {mainThesis && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-sm text-[#D0D0D0] leading-relaxed">{mainThesis}</p>
          </div>
        )}

        {/* ISM Connection — specific to this company */}
        {(idea.ismTailwind || idea.ismConnection || idea.ismBacking) && (
          <div className="p-3 rounded-lg mb-3" style={{ background: 'rgba(201,166,70,0.04)', border: '1px solid rgba(201,166,70,0.1)' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Activity className="h-3.5 w-3.5 text-[#C9A646]" />
              <span className="text-[10px] font-bold text-[#C9A646] tracking-wider uppercase">ISM & Macro Impact</span>
            </div>
            <p className="text-sm text-[#C0C0C0] leading-relaxed">
              {idea.ismTailwind || idea.ismConnection || idea.ismBacking}
              {(idea.ismTailwind || idea.ismConnection || idea.ismBacking) && (idea.macroTailwind || idea.macroImpact) ? ' ' : ''}
              {idea.macroTailwind || idea.macroImpact}
            </p>
          </div>
        )}

        {/* Upcoming Catalysts — dates & events */}
        {(idea.upcomingCatalysts || idea.upcomingEvents) && (
          <div className="p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="h-3.5 w-3.5 text-[#22C55E]" />
              <span className="text-[10px] font-bold text-[#22C55E] tracking-wider uppercase">Upcoming Catalysts</span>
            </div>
            <p className="text-sm text-[#C0C0C0] leading-relaxed">{idea.upcomingCatalysts || idea.upcomingEvents}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
});

TradeStrategyCard.displayName = 'TradeStrategyCard';

// =====================================================
// 🏛️ SECTOR VERDICT CARD
// =====================================================

interface VerdictProps {
  verdict: CachedSectorAnalysis['sector_verdict'];
  rotation: CachedSectorAnalysis['rotation_signal'];
  allocation: CachedSectorAnalysis['allocation_guide'];
  sectorName: string;
}

const SectorVerdict = memo<VerdictProps>(({ verdict, rotation, allocation, sectorName }) => {
  const signalColor = verdict?.signal === 'OVERWEIGHT' ? colors.positive
    : verdict?.signal === 'UNDERWEIGHT' ? colors.negative
    : colors.warning;

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-[#C9A646]" />
            <h3 className="text-lg font-bold text-white">Sector Verdict</h3>
          </div>
          <span className="text-sm font-bold px-3 py-1.5 rounded-lg"
                style={{ background: `${signalColor}12`, color: signalColor, border: `1px solid ${signalColor}20` }}>
            {verdict?.signal || 'NEUTRAL'}
          </span>
        </div>

        {/* Rating Ring + Summary */}
        <div className="flex items-start gap-5 mb-5">
          <div className="flex-shrink-0 relative w-20 h-20">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
              <circle cx="40" cy="40" r="34" fill="none" stroke={signalColor} strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={`${((verdict?.rating || 50) / 100) * 213.6} 213.6`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-white">{verdict?.rating || 50}</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-[#B0B0B0] leading-relaxed mb-2">{verdict?.summary}</p>
            {verdict?.ismImpact && (
              <p className="text-xs text-[#C9A646] leading-relaxed">
                <strong>ISM Impact:</strong> {verdict.ismImpact}
              </p>
            )}
          </div>
        </div>

        {/* Rotation + Allocation */}
        <div className="grid grid-cols-2 gap-3">
          {rotation && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.06)' }}>
              <div className="text-[9px] text-[#6B6B6B] uppercase mb-1">Rotation Signal</div>
              <div className="text-sm font-medium text-white mb-1">{rotation.catalyst}</div>
              <div className="text-[10px] text-[#8B8B8B]">Strength: {rotation.strength}</div>
            </div>
          )}
          {allocation && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.06)' }}>
              <div className="text-[9px] text-[#6B6B6B] uppercase mb-1">Allocation</div>
              <div className="text-sm font-medium text-white mb-1">{allocation.recommendedWeight}</div>
              <div className="text-[10px] text-[#8B8B8B]">Conviction: {allocation.conviction}</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
});

SectorVerdict.displayName = 'SectorVerdict';

// =====================================================
// 📋 BULL/BEAR CASE
// =====================================================

interface BullBearProps {
  bullCase?: string;
  bearCase?: string;
  keyTrade?: string;
}

const BullBearCase = memo<BullBearProps>(({ bullCase, bearCase, keyTrade }) => (
  <Card>
    <div className="p-6">
      <div className="flex items-center gap-3 mb-5">
        <Info className="h-5 w-5 text-[#C9A646]" />
        <h3 className="text-lg font-bold text-white">Bull vs Bear</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-[#22C55E]" />
            <span className="text-sm font-bold text-[#22C55E]">Bull Case</span>
          </div>
          <p className="text-sm text-[#B0B0B0] leading-relaxed">{bullCase || 'Loading...'}</p>
        </div>
        <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-[#EF4444]" />
            <span className="text-sm font-bold text-[#EF4444]">Bear Case</span>
          </div>
          <p className="text-sm text-[#B0B0B0] leading-relaxed">{bearCase || 'Loading...'}</p>
        </div>
      </div>

      {keyTrade && (
        <div className="p-3 rounded-xl" style={{ background: 'rgba(201,166,70,0.06)', border: '1px solid rgba(201,166,70,0.1)' }}>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#C9A646]" />
            <span className="text-sm text-[#C9A646]">
              <strong>Key Trade: </strong>
              <span className="text-[#E8DCC4]">{keyTrade}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  </Card>
));

BullBearCase.displayName = 'BullBearCase';

// =====================================================
// ⏰ FRESHNESS INDICATOR
// =====================================================

const FreshnessIndicator = memo<{ generatedAt?: string }>(({ generatedAt }) => {
  if (!generatedAt) return null;

  const age = Date.now() - new Date(generatedAt).getTime();
  const minutes = Math.floor(age / 60000);
  const hours = Math.floor(minutes / 60);

  const isFresh = minutes < 180; // < 3 hours
  const label = hours > 0 ? `${hours}h ${minutes % 60}m ago` : `${minutes}m ago`;

  return (
    <div className="flex items-center gap-1.5 text-[10px]" 
         style={{ color: isFresh ? colors.positive : colors.warning }}>
      <div className="w-1.5 h-1.5 rounded-full animate-pulse"
           style={{ background: isFresh ? colors.positive : colors.warning }} />
      Updated {label}
    </div>
  );
});

FreshnessIndicator.displayName = 'FreshnessIndicator';

// =====================================================
// 🚀 MAIN TOP DOWN TAB
// =====================================================

interface TopDownTabProps {
  sector: Sector;
  cachedAnalysis?: CachedSectorAnalysis | null; // From parent via React Query/SWR
}

export const TopDownTab = memo<TopDownTabProps>(({ sector, cachedAnalysis }) => {
  // Use cached data or build from static sector data
  const analysis = useMemo<CachedSectorAnalysis>(() => {
    if (cachedAnalysis) return cachedAnalysis;

    // Fallback: build from existing sector.tradeIdeas
    return {
      macro_regime: {
        regime: 'unknown',
        regimeLabel: 'Analysis Pending',
        riskLevel: 'moderate',
        fedPolicy: 'neutral',
        rotationTheme: 'Sector Rotation',
        narrative: 'Macro analysis will update at next scheduled run.',
      },
      ism_context: undefined,
      sector_verdict: sector.verdict ? {
        signal: sector.verdict.signal,
        rating: sector.verdict.rating,
        summary: sector.verdict.summary,
        ismImpact: '',
      } : undefined,
      top_down_flow: {
        macroNarrative: 'Pending next analysis cycle.',
        sectorThesis: sector.verdict?.summary || `${sector.name} analysis pending.`,
        ismConnection: 'ISM data will be integrated at next run.',
        stockPicks: sector.topHoldings?.slice(0, 3).map(h => h.ticker) || [],
      },
      trade_ideas: sector.tradeIdeas?.map((idea, i) => ({
        strategy: idea.strategy,
        direction: 'long' as const,
        ticker: idea.trade.replace(/^(Long|Short)\s+/, ''),
        thesis: idea.thesis,
        ismBacking: '',
        entry: idea.entry || 'Current levels',
        target: idea.target,
        stop: idea.stop || '-5%',
        conviction: idea.conviction || (i === 0 ? 75 : 60),
        riskReward: idea.riskReward || '2:1',
        timeHorizon: idea.timeHorizon || '1-3 months',
        risks: idea.risks || ['Market regime shift', 'Sector rotation'],
      })) || [],
      ai_commentary: sector.verdict?.summary,
      ai_bull_case: undefined,
      ai_bear_case: undefined,
      ai_key_trade: undefined,
      generated_at: undefined,
    };
  }, [cachedAnalysis, sector]);

  return (
    <div className="space-y-5">
      {/* Header with Freshness */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-[#C9A646]" />
          <h2 className="text-lg font-bold text-white">Top-Down Analysis</h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#C9A646]/10 text-[#C9A646]">
            ISM INTEGRATED
          </span>
        </div>
        <FreshnessIndicator generatedAt={analysis.generated_at} />
      </div>

      {/* ISM Dashboard Strip — ALWAYS visible */}
      <ISMStrip ism={analysis.ism_context} />

      {/* Top-Down Flow */}
      <TopDownFlow
        macro={analysis.macro_regime}
        ism={analysis.ism_context}
        flow={analysis.top_down_flow}
        sectorName={sector.name}
      />

      {/* Sector Verdict */}
      <SectorVerdict
        verdict={analysis.sector_verdict}
        rotation={analysis.rotation_signal}
        allocation={analysis.allocation_guide}
        sectorName={sector.name}
      />

      {/* Trade Strategies */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <Zap className="h-5 w-5 text-[#C9A646]" />
            <h3 className="text-lg font-bold text-white">Top Down Strategies</h3>
            <span className="text-[10px] text-[#6B6B6B]">
              {analysis.trade_ideas?.length || 0} strategies
            </span>
          </div>

          <div className="space-y-3">
            {(analysis.trade_ideas || []).map((idea, i) => (
              <TradeStrategyCard key={i} idea={idea} index={i} />
            ))}
          </div>
        </div>
      </Card>

      {/* Bull vs Bear */}
      {(analysis.ai_bull_case || analysis.ai_bear_case) && (
        <BullBearCase
          bullCase={analysis.ai_bull_case}
          bearCase={analysis.ai_bear_case}
          keyTrade={analysis.ai_key_trade}
        />
      )}

      {/* AI Commentary */}
      {analysis.ai_commentary && (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(201,166,70,0.04)', border: '1px solid rgba(201,166,70,0.08)' }}>
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-[#C9A646] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#B0B0B0] leading-relaxed">{analysis.ai_commentary}</p>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-center pt-2 pb-4">
        <p className="text-[10px] text-[#4A4A4A]">
          Analysis generated by AI • Pre-cached for performance • Not investment advice
        </p>
      </div>
    </div>
  );
});

TopDownTab.displayName = 'TopDownTab';

export default TopDownTab;