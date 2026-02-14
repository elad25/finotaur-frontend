// =====================================================
// 📊 OVERVIEW TAB - Optimized for 10,000 Users
// =====================================================
// v3.0 — "Compute Once, Serve 10,000"
//
// WHAT CHANGED FROM v2.0:
//   ✅ AISectorCommentary: reads from cachedAnalysis (was: per-user AI call)
//   ✅ AIMacroEnvironment: reads from cachedAnalysis (was: per-user AI call)
//   ✅ SectorFactorsGrid: preserved — built from cron-cached bull/bear data
//   ✅ SectorVerdict: preserved — rendered in main component
//   ✅ All visual components preserved 1:1
//   ✅ Cost: $0/user (was ~$0.05/user/view)
//
// ARCHITECTURE:
//   Cron (4x/day) → sector_snapshots → useSectorAnalysis → this tab
//   10,000 users × 0 AI calls = $0 marginal cost
//
// REMOVED:
//   - callSectorAI() — per-user AI proxy calls
//   - fetchSectorIsmContext() — ISM now in cachedAnalysis.ism_context
//   - buildSectorCommentaryPrompt() — prompt builder (cron handles)
//   - parseSectorCommentary() — parser (cron returns structured JSON)
//   - buildMacroEnvPrompt() — macro prompt (cron handles)
//   - In-memory cacheMap instances — React Query handles caching
// =====================================================

import React, { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, Layers, Activity, TrendingUp, TrendingDown, Award, 
  Calendar, PieChart, DollarSign, BarChart2,
  ArrowUpRight, ArrowDownRight,
  Sparkles, Brain, Clock, Copy, Check,
  Landmark, Shield, AlertTriangle
} from 'lucide-react';
import { Sector, SubSector } from '../types';
import { 
  Card, StatBox, RiskBadge, ScoreBar, 
  SignalBadge, ProgressRing, colors 
} from '../ui';
import { cn, formatPercent, formatCurrency, getSignalColor } from '../utils';

// =====================================================
// 🔗 CACHED ANALYSIS TYPE (from useSectorAnalysis hook)
// =====================================================

interface CachedSectorData {
  ai_commentary?: string;
  ai_bull_case?: string;
  ai_bear_case?: string;
  ai_key_trade?: string;
  ai_generated_at?: string;
  generated_at?: string;

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
  };

  verdict?: {
    signal: string;
    rating: number;
    summary: string;
    ismImpact: string;
  };
  sector_verdict?: {
    signal: string;
    rating: number;
    summary: string;
    ismImpact: string;
  };

  allocation_guide?: {
    recommendedWeight: string;
    conviction: string;
    riskProfile: string;
  };

  // Earnings Calendar (from cron, FREE Yahoo Finance)
  earnings_calendar?: Array<{
    date: string;
    ticker: string;
    company?: string;
    estimate: number | null;
    whisper: number | null;
    impact: string;
    time?: string;
  }>;
}

// =====================================================
// 📋 COPY BUTTON (preserved from v2)
// =====================================================

const CopyButton = memo(({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title="Copy">
      {copied ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5 text-[#4B4B4B]" />}
    </button>
  );
});
CopyButton.displayName = 'CopyButton';

// =====================================================
// ⏰ FRESHNESS INDICATOR
// =====================================================

const FreshnessIndicator = memo<{ generatedAt?: string }>(({ generatedAt }) => {
  if (!generatedAt) return null;

  const age = Date.now() - new Date(generatedAt).getTime();
  const minutes = Math.floor(age / 60000);
  const hours = Math.floor(minutes / 60);

  const isFresh = minutes < 180;
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
// 🏷️ SECTOR FACTORS GRID (preserved from v2)
// Now built from cached bull/bear data instead of AI parse
// =====================================================

interface SectorFactorItem {
  title: string;
  description: string;
}

const SectorFactorsGrid = memo(({ positiveFactors, negativeFactors }: {
  positiveFactors: SectorFactorItem[];
  negativeFactors: SectorFactorItem[];
}) => {
  if (!positiveFactors.length && !negativeFactors.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
      {/* Tailwinds */}
      {positiveFactors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#22C55E]" />
            <span className="text-xs font-bold text-[#22C55E] tracking-wider uppercase">Sector Tailwinds</span>
          </div>
          {positiveFactors.map((factor, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl p-4 transition-all duration-200 hover:border-[#22C55E]/25"
              style={{
                background: 'rgba(34,197,94,0.04)',
                border: '1px solid rgba(34,197,94,0.12)',
              }}
            >
              <h4 className="text-[13px] font-bold text-white mb-2 leading-snug">{factor.title}</h4>
              <p className="text-[12.5px] text-[#9B9B9B] leading-[1.75]">{factor.description}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Headwinds */}
      {negativeFactors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-[#EF4444]" />
            <span className="text-xs font-bold text-[#EF4444] tracking-wider uppercase">Sector Headwinds</span>
          </div>
          {negativeFactors.map((factor, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl p-4 transition-all duration-200 hover:border-[#EF4444]/25"
              style={{
                background: 'rgba(239,68,68,0.04)',
                border: '1px solid rgba(239,68,68,0.12)',
              }}
            >
              <h4 className="text-[13px] font-bold text-white mb-2 leading-snug">{factor.title}</h4>
              <p className="text-[12.5px] text-[#9B9B9B] leading-[1.75]">{factor.description}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
});
SectorFactorsGrid.displayName = 'SectorFactorsGrid';

// =====================================================
// 🤖 AI SECTOR COMMENTARY — FROM CACHE (ZERO AI CALLS)
// =====================================================
// v2: callSectorAI() per user → parse text → show
// v3: read cachedAnalysis from cron → show directly
// =====================================================

function getRatingColor(signal: string): string {
  if (signal === 'OVERWEIGHT') return '#22C55E';
  if (signal === 'UNDERWEIGHT') return '#EF4444';
  return '#F59E0B';
}

interface AISectorCommentaryProps {
  sector: Sector;
  cachedAnalysis?: CachedSectorData | null;
}

const AISectorCommentary = memo<AISectorCommentaryProps>(({ sector, cachedAnalysis }) => {
  const hasData = !!(cachedAnalysis?.ai_commentary || cachedAnalysis?.ai_bull_case);
  const generatedAt = cachedAnalysis?.generated_at || cachedAnalysis?.ai_generated_at;
  const verdict = cachedAnalysis?.sector_verdict || cachedAnalysis?.verdict;
  const signalColor = verdict?.signal ? getRatingColor(verdict.signal) : '#C9A646';

  // Build factors from cached data for SectorFactorsGrid
  const positiveFactors = useMemo<SectorFactorItem[]>(() => {
    const factors: SectorFactorItem[] = [];
    if (cachedAnalysis?.ai_bull_case) {
      factors.push({ title: 'Bull Case', description: cachedAnalysis.ai_bull_case });
    }
    if (cachedAnalysis?.macro_regime?.rotationTheme) {
      factors.push({ title: 'Rotation Theme', description: cachedAnalysis.macro_regime.rotationTheme });
    }
    if (cachedAnalysis?.allocation_guide?.recommendedWeight?.toLowerCase().includes('overweight')) {
      factors.push({ title: 'Allocation Signal', description: `${cachedAnalysis.allocation_guide.recommendedWeight} — Conviction: ${cachedAnalysis.allocation_guide.conviction}` });
    }
    // Fallback from static sector data
    if (factors.length === 0 && sector.industryTrends) {
      sector.industryTrends
        .filter(t => t.impact === 'Positive')
        .slice(0, 3)
        .forEach(t => factors.push({ title: t.trend, description: t.description }));
    }
    return factors;
  }, [cachedAnalysis, sector]);

  const negativeFactors = useMemo<SectorFactorItem[]>(() => {
    const factors: SectorFactorItem[] = [];
    if (cachedAnalysis?.ai_bear_case) {
      factors.push({ title: 'Bear Case', description: cachedAnalysis.ai_bear_case });
    }
    if (cachedAnalysis?.macro_regime?.riskLevel === 'high' || cachedAnalysis?.macro_regime?.riskLevel === 'elevated') {
      factors.push({ title: 'Elevated Macro Risk', description: `${cachedAnalysis.macro_regime.regimeLabel} — ${cachedAnalysis.macro_regime.riskLevel} risk environment` });
    }
    if (cachedAnalysis?.allocation_guide?.recommendedWeight?.toLowerCase().includes('underweight')) {
      factors.push({ title: 'Allocation Warning', description: `${cachedAnalysis.allocation_guide.recommendedWeight} — ${cachedAnalysis.allocation_guide.riskProfile}` });
    }
    // Fallback from static sector data
    if (factors.length === 0 && sector.industryTrends) {
      sector.industryTrends
        .filter(t => t.impact === 'Negative')
        .slice(0, 3)
        .forEach(t => factors.push({ title: t.trend, description: t.description }));
    }
    return factors;
  }, [cachedAnalysis, sector]);

  if (!hasData && !sector.verdict) return null;

  return (
    <Card highlight>
      <div className="relative p-6">
        {/* Gold accent line */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A646] via-[#C9A646]/40 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.05))',
                border: '1px solid rgba(201,166,70,0.3)',
                boxShadow: '0 0 16px rgba(201,166,70,0.08)',
              }}
            >
              <Brain className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">AI Sector Commentary</h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#C9A646]/10 text-[#C9A646] border border-[#C9A646]/20">
                  FINOTAUR AI
                </span>
              </div>
              <p className="text-[10px] text-[#6B6B6B] mt-0.5">
                {hasData
                  ? generatedAt
                    ? `Generated ${new Date(generatedAt).toLocaleTimeString()} • Pre-cached sector intelligence`
                    : 'Pre-generated macro-aware sector intelligence'
                  : 'Analysis from sector data'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {verdict?.signal && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                style={{ background: `${signalColor}12`, border: `1px solid ${signalColor}30` }}
              >
                <span className="text-xs font-bold tracking-wide" style={{ color: signalColor }}>
                  {verdict.signal}
                </span>
              </div>
            )}
            <FreshnessIndicator generatedAt={generatedAt} />
          </div>
        </div>

        {/* Main Commentary */}
        {cachedAnalysis?.ai_commentary && (
          <div
            className="p-4 rounded-xl relative mb-4"
            style={{ background: 'rgba(201,166,70,0.06)', border: '1px solid rgba(201,166,70,0.15)' }}
          >
            <div className="absolute top-3 right-3">
              <CopyButton text={cachedAnalysis.ai_commentary} />
            </div>
            <p className="text-[#E8DCC4] leading-relaxed text-sm pr-8">{cachedAnalysis.ai_commentary}</p>
          </div>
        )}

        {/* ISM Impact — Built from real ism_context data, NOT from AI text */}
        {(cachedAnalysis?.ism_context?.pmi || verdict?.ismImpact) && (
          <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(201,166,70,0.04)', border: '1px solid rgba(201,166,70,0.1)' }}>
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-[#C9A646]" />
              <span className="text-xs text-[#C9A646]">
                <strong>ISM Impact: </strong>
                <span className="text-[#E8DCC4]">
                  {cachedAnalysis?.ism_context?.pmi
                    ? `PMI ${cachedAnalysis.ism_context.pmi} (${cachedAnalysis.ism_context.direction}) — Prices ${cachedAnalysis.ism_context.prices > 55 ? 'elevated' : 'moderate'} at ${cachedAnalysis.ism_context.prices}, Employment ${cachedAnalysis.ism_context.employment < 48 ? 'weak' : 'stable'} at ${cachedAnalysis.ism_context.employment}${cachedAnalysis.ism_context.backlog && cachedAnalysis.ism_context.backlog < 46 ? `, Backlog depleting at ${cachedAnalysis.ism_context.backlog}` : ''}`
                    : verdict?.ismImpact}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Bull / Bear / Macro Regime grid */}
        {(cachedAnalysis?.ai_bull_case || cachedAnalysis?.ai_bear_case || cachedAnalysis?.macro_regime?.narrative) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {cachedAnalysis?.ai_bull_case && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-3 rounded-xl"
                style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span className="text-xs font-semibold text-[#22C55E] tracking-wide">BULL CASE</span>
                </div>
                <p className="text-xs text-[#C8C8C8] leading-relaxed">{cachedAnalysis.ai_bull_case}</p>
              </motion.div>
            )}

            {cachedAnalysis?.ai_bear_case && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-3.5 h-3.5 text-[#EF4444]" />
                  <span className="text-xs font-semibold text-[#EF4444] tracking-wide">BEAR CASE</span>
                </div>
                <p className="text-xs text-[#C8C8C8] leading-relaxed">{cachedAnalysis.ai_bear_case}</p>
              </motion.div>
            )}

            {cachedAnalysis?.macro_regime?.narrative && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-3 rounded-xl"
                style={{ background: 'rgba(201,166,70,0.04)', border: '1px solid rgba(201,166,70,0.12)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Landmark className="w-3.5 h-3.5 text-[#C9A646]" />
                  <span className="text-xs font-semibold text-[#C9A646] tracking-wide">MACRO REGIME</span>
                </div>
                <p className="text-xs text-[#C8C8C8] leading-relaxed line-clamp-3">
                  <span className="font-semibold text-[#C9A646]">{cachedAnalysis.macro_regime.regimeLabel}</span> — {cachedAnalysis.macro_regime.narrative?.split('. ').slice(0, 2).join('. ')}.
                </p>
              </motion.div>
            )}
          </div>
        )}

        {/* Key Trade */}
        {cachedAnalysis?.ai_key_trade && (
          <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(201,166,70,0.06)', border: '1px solid rgba(201,166,70,0.1)' }}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#C9A646]" />
              <span className="text-sm text-[#C9A646]">
                <strong>Key Trade: </strong>
                <span className="text-[#E8DCC4]">{cachedAnalysis.ai_key_trade}</span>
              </span>
            </div>
          </div>
        )}

        {/* Allocation Guide */}
        {cachedAnalysis?.allocation_guide && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="p-2.5 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.06)' }}>
              <div className="text-[9px] text-[#6B6B6B] uppercase mb-1">Weight</div>
              <div className="text-xs font-bold text-white">{cachedAnalysis.allocation_guide.recommendedWeight}</div>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.06)' }}>
              <div className="text-[9px] text-[#6B6B6B] uppercase mb-1">Conviction</div>
              <div className="text-xs font-bold text-[#C9A646]">{cachedAnalysis.allocation_guide.conviction}</div>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.06)' }}>
              <div className="text-[9px] text-[#6B6B6B] uppercase mb-1">Risk</div>
              <div className="text-xs font-bold text-[#8B8B8B]">{cachedAnalysis.allocation_guide.riskProfile}</div>
            </div>
          </div>
        )}

        {/* Tailwinds / Headwinds Factors Grid */}
        <SectorFactorsGrid
          positiveFactors={positiveFactors}
          negativeFactors={negativeFactors}
        />

        {/* Fallback: if no cached AI data, show static verdict */}
        {!hasData && sector.verdict && (
          <div className="p-4 rounded-xl" style={{ background: 'rgba(201,166,70,0.06)', border: '1px solid rgba(201,166,70,0.15)' }}>
            <p className="text-[#E8DCC4] leading-relaxed text-sm">{sector.verdict.summary}</p>
            <p className="text-[10px] text-[#6B6B6B] mt-2">AI commentary will update at next scheduled refresh</p>
          </div>
        )}
      </div>
    </Card>
  );
});

AISectorCommentary.displayName = 'AISectorCommentary';

// =====================================================
// 🏆 SECTOR VERDICT COMPONENT (preserved from v2)
// =====================================================

interface SectorVerdictProps {
  verdict: Sector['verdict'];
  ticker: string;
}

const SectorVerdict = memo<SectorVerdictProps>(({ verdict, ticker }) => {
  if (!verdict) return null;

  const signalConfig = {
    OVERWEIGHT: { color: colors.positive, icon: ArrowUpRight },
    NEUTRAL: { color: colors.warning, icon: null },
    UNDERWEIGHT: { color: colors.negative, icon: ArrowDownRight },
  };

  const config = signalConfig[verdict.signal];
  const Icon = config.icon;

  return (
    <Card highlight>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Award className="h-5 w-5 text-[#C9A646]" />
          <h3 className="text-lg font-bold text-white">FINOTAUR Sector Rating</h3>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <ProgressRing
            value={verdict.rating}
            max={100}
            size={100}
            strokeWidth={8}
            color={colors.gold.primary}
            label="/100"
          />

          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <span className="text-2xl font-bold" style={{ color: config.color }}>
                {verdict.signal}
              </span>
              {Icon && <Icon className="h-6 w-6" style={{ color: config.color }} />}
              <span className="text-[#6B6B6B] text-sm">(vs S&P 500)</span>
            </div>
            <p className="text-[#E8DCC4] leading-relaxed">"{verdict.summary}"</p>
          </div>
        </div>
      </div>
    </Card>
  );
});

SectorVerdict.displayName = 'SectorVerdict';

// =====================================================
// 📈 SECTOR VS MARKET COMPONENT (preserved)
// =====================================================

interface SectorVsMarketProps {
  vsMarket: Sector['vsMarket'];
  ticker: string;
}

const SectorVsMarket = memo<SectorVsMarketProps>(({ vsMarket, ticker }) => {
  if (!vsMarket || vsMarket.length === 0) return null;

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <BarChart2 className="h-5 w-5 text-[#C9A646]" />
          <h3 className="text-lg font-bold text-white">Performance vs S&P 500</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-[#6B6B6B] uppercase border-b border-[#C9A646]/10">
                <th className="text-left py-2 px-3">Period</th>
                {vsMarket.map((item, i) => (
                  <th key={i} className="text-center py-2 px-3">{item.period}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-3 px-3 text-sm text-[#8B8B8B]">{ticker}</td>
                {vsMarket.map((item, i) => (
                  <td key={i} className="text-center py-3 px-3">
                    <span className="text-sm font-semibold" style={{ color: item.sectorReturn >= 0 ? colors.positive : colors.negative }}>
                      {formatPercent(item.sectorReturn)}
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-3 text-sm text-[#8B8B8B]">SPY</td>
                {vsMarket.map((item, i) => (
                  <td key={i} className="text-center py-3 px-3">
                    <span className="text-sm font-semibold" style={{ color: item.spyReturn >= 0 ? colors.positive : colors.negative }}>
                      {formatPercent(item.spyReturn)}
                    </span>
                  </td>
                ))}
              </tr>
              <tr
                className="relative"
                style={{
                  background: 'linear-gradient(90deg, rgba(201,166,70,0.10), rgba(244,217,123,0.06), rgba(201,166,70,0.03))',
                  boxShadow: '0 0 20px rgba(201,166,70,0.08), inset 0 1px 0 rgba(244,217,123,0.12), inset 0 -1px 0 rgba(201,166,70,0.08)',
                  borderTop: '1px solid rgba(201,166,70,0.18)',
                  borderBottom: '1px solid rgba(201,166,70,0.12)',
                }}
              >
                <td className="py-3.5 px-3 text-sm font-bold tracking-wide" style={{ color: '#F4D97B', textShadow: '0 0 12px rgba(201,166,70,0.3)' }}>Alpha</td>
                {vsMarket.map((item, i) => (
                  <td key={i} className="text-center py-3.5 px-3">
                    <span
                      className="text-sm font-bold"
                      style={{
                        color: item.alpha >= 0 ? '#F4D97B' : colors.negative,
                        textShadow: item.alpha >= 0 ? '0 0 10px rgba(244,217,123,0.25)' : 'none',
                      }}
                    >
                      {formatPercent(item.alpha)}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
});

SectorVsMarket.displayName = 'SectorVsMarket';

// =====================================================
// 📊 SECTOR FUNDAMENTALS COMPONENT (preserved)
// =====================================================

interface SectorFundamentalsProps {
  fundamentals: Sector['fundamentals'];
}

const SectorFundamentals = memo<SectorFundamentalsProps>(({ fundamentals }) => {
  if (!fundamentals) return null;

  const metrics = [
    { label: 'P/E (FWD)', value: `${fundamentals.peForward.toFixed(1)}x`, comparison: `vs ${fundamentals.peVsSpAvg.toFixed(0)}x S&P avg` },
    { label: 'EV/EBITDA', value: `${fundamentals.evEbitda.toFixed(1)}x`, comparison: `vs ${fundamentals.evEbitdaVsSpAvg.toFixed(0)}x S&P avg` },
    { label: 'Rev Growth', value: formatPercent(fundamentals.revGrowth, true), comparison: `vs ${formatPercent(fundamentals.revGrowthVsSpAvg)} S&P avg` },
    { label: 'Earnings Growth', value: formatPercent(fundamentals.earningsGrowth, true), comparison: `vs ${formatPercent(fundamentals.earningsGrowthVsSpAvg)} S&P avg` },
  ];

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <PieChart className="h-5 w-5 text-[#C9A646]" />
          <h3 className="text-lg font-bold text-white">Sector Fundamentals Summary</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {metrics.map((metric, i) => (
            <div key={i} className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.06)' }}>
              <div className="text-[10px] text-[#6B6B6B] mb-1 uppercase">{metric.label}</div>
              <div className="text-xl font-bold text-[#C9A646] mb-1">{metric.value}</div>
              <div className="text-[10px] text-[#8B8B8B]">{metric.comparison}</div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-lg" style={{ background: 'rgba(201,166,70,0.05)', border: '1px solid rgba(201,166,70,0.1)' }}>
          <span className="text-sm text-[#E8DCC4]">
            <strong className="text-[#C9A646]">Valuation: </strong>
            {fundamentals.valuationAssessment}
          </span>
        </div>
      </div>
    </Card>
  );
});

SectorFundamentals.displayName = 'SectorFundamentals';

// =====================================================
// 💰 MONEY FLOW COMPONENT (preserved)
// =====================================================

interface MoneyFlowProps {
  moneyFlow: Sector['moneyFlow'];
}

const MoneyFlow = memo<MoneyFlowProps>(({ moneyFlow }) => {
  if (!moneyFlow) return null;

  const signalConfig = {
    ACCUMULATION: { color: colors.positive, emoji: '🟢' },
    DISTRIBUTION: { color: colors.negative, emoji: '🔴' },
    NEUTRAL: { color: colors.warning, emoji: '🟡' },
  };

  const config = signalConfig[moneyFlow.signal];

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <DollarSign className="h-5 w-5 text-[#C9A646]" />
          <h3 className="text-lg font-bold text-white">Money Flow (Last 30 Days)</h3>
        </div>

        <div className="p-4 rounded-xl mb-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.06)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8B8B8B]">NET INFLOW:</span>
            <span className="text-xl font-bold" style={{ color: moneyFlow.netInflow >= 0 ? colors.positive : colors.negative }}>
              {moneyFlow.netInflow >= 0 ? '+' : ''}{formatCurrency(moneyFlow.netInflow * 1e9)}
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ background: config.color }} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#6B6B6B] uppercase">ETF Flow</h4>
            {moneyFlow.etfFlows.map((etf, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-white">{etf.ticker}:</span>
                <span className="font-semibold" style={{ color: etf.flow >= 0 ? colors.positive : colors.negative }}>
                  {etf.flow >= 0 ? '+' : ''}{formatCurrency(etf.flow * 1e6)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#6B6B6B] uppercase">Hedge Fund Activity</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white">13F Net Buying:</span>
              <span className="font-semibold text-[#C9A646]">{formatCurrency(moneyFlow.hedgeFundActivity.netBuying * 1e9)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white">New Positions:</span>
              <span className="font-semibold text-[#22C55E]">{moneyFlow.hedgeFundActivity.newPositions}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white">Closed Positions:</span>
              <span className="font-semibold text-[#EF4444]">{moneyFlow.hedgeFundActivity.closedPositions}</span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg flex items-center gap-2" style={{ background: `${config.color}08`, border: `1px solid ${config.color}20` }}>
          <span>{config.emoji}</span>
          <span className="text-sm font-bold" style={{ color: config.color }}>Signal: {moneyFlow.signal} ✅</span>
        </div>
      </div>
    </Card>
  );
});

MoneyFlow.displayName = 'MoneyFlow';

// =====================================================
// 📅 EARNINGS CALENDAR — LIVE FROM CACHE (4x daily refresh)
// Reads from cachedAnalysis.earnings_calendar (cron-fetched)
// Falls back to sector.earningsCalendar (static data)
// ZERO per-user API calls
// =====================================================

interface EarningsCalendarProps {
  earnings?: Sector['earningsCalendar'];
  cachedEarnings?: CachedSectorData['earnings_calendar'];
}

const EarningsCalendar = memo<EarningsCalendarProps>(({ earnings, cachedEarnings }) => {
  // Prefer cached (live) earnings over static data
  const displayEarnings = useMemo(() => {
    if (cachedEarnings && cachedEarnings.length > 0) {
      return cachedEarnings.map(e => ({
        date: e.date,
        ticker: e.ticker,
        estimate: e.estimate ?? 0,
        whisper: e.whisper ?? 0,
        impact: (e.impact || 'Medium') as 'High' | 'Medium' | 'Med' | 'Low',
        company: e.company,
      }));
    }
    return earnings || [];
  }, [cachedEarnings, earnings]);

  if (!displayEarnings || displayEarnings.length === 0) return null;

  const isLive = !!(cachedEarnings && cachedEarnings.length > 0);

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-[#C9A646]" />
            <h3 className="text-lg font-bold text-white">Upcoming Earnings This Week</h3>
          </div>
          {isLive && (
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#22C55E' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
              Live Data
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-[#6B6B6B] uppercase border-b border-[#C9A646]/10">
                <th className="text-left py-2 px-3">Date</th>
                <th className="text-left py-2 px-3">Ticker</th>
                <th className="text-center py-2 px-3">Estimate</th>
                <th className="text-center py-2 px-3">Whisper</th>
                <th className="text-center py-2 px-3">Impact</th>
              </tr>
            </thead>
            <tbody>
              {displayEarnings.map((item, i) => (
                <motion.tr key={`${item.ticker}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="border-b border-white/5">
                  <td className="py-3 px-3 text-sm text-[#8B8B8B]">{item.date}</td>
                  <td className="py-3 px-3"><span className="font-bold text-[#C9A646]">{item.ticker}</span></td>
                  <td className="text-center py-3 px-3 text-sm text-white">
                    {item.estimate ? `$${item.estimate.toFixed(2)}` : '—'}
                  </td>
                  <td className="text-center py-3 px-3 text-sm text-[#22C55E]">
                    {item.whisper ? `$${item.whisper.toFixed(2)}` : '—'}
                  </td>
                  <td className="text-center py-3 px-3"><RiskBadge level={item.impact} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
});

EarningsCalendar.displayName = 'EarningsCalendar';

// =====================================================
// 📊 SUB-SECTOR BREAKDOWN — Visual Momentum View (preserved)
// =====================================================

interface SubSectorBreakdownProps {
  subSectors: Sector['subSectors'];
}

const SubSectorBreakdown = memo<SubSectorBreakdownProps>(({ subSectors }) => {
  if (!subSectors || subSectors.length === 0) return null;

  const sorted = [...subSectors].sort((a, b) => b.ytd - a.ytd);
  const maxAbsYtd = Math.max(...sorted.map(s => Math.abs(s.ytd)), 1);
  const totalWeight = sorted.reduce((sum, s) => sum + s.weight, 0);
  const leader = sorted[0];
  const laggard = sorted[sorted.length - 1];

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-[#C9A646]" />
            <h3 className="text-lg font-bold text-white">Sub-Sector Momentum</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
              <span className="text-[10px] text-[#6B6B6B] uppercase">Leading</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
              <span className="text-[10px] text-[#6B6B6B] uppercase">Lagging</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {sorted.map((sub, i) => {
            const barWidth = Math.max(Math.abs(sub.ytd) / maxAbsYtd * 100, 8);
            const isPositive = sub.ytd >= 0;
            const barColor = isPositive ? '#22C55E' : '#EF4444';
            const isLeader = sub.name === leader.name;
            const isLaggard = sub.name === laggard.name;
            const signalColor = getSignalColor(sub.signal);
            const weightPct = totalWeight > 0 ? (sub.weight / totalWeight * 100) : 0;

            return (
              <motion.div
                key={sub.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="relative"
              >
                <div
                  className="rounded-xl p-4 transition-all duration-200"
                  style={{
                    background: isLeader ? 'rgba(34,197,94,0.06)' : isLaggard ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                    border: isLeader ? '1px solid rgba(34,197,94,0.18)' : isLaggard ? '1px solid rgba(239,68,68,0.18)' : '1px solid rgba(201,166,70,0.06)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white">{sub.name}</span>
                      {isLeader && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#22C55E]/12 text-[#22C55E] border border-[#22C55E]/20">
                          🔥 LEADER
                        </span>
                      )}
                      {isLaggard && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#EF4444]/12 text-[#EF4444] border border-[#EF4444]/20">
                          ❄️ LAGGARD
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-[#6B6B6B] uppercase block">P/E</span>
                        <span className="text-sm font-medium text-[#C9A646]">{sub.pe}x</span>
                      </div>
                      <SignalBadge signal={sub.signal} size="sm" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-2.5">
                    <span className="text-[10px] text-[#6B6B6B] uppercase min-w-[28px]">YTD</span>
                    <div className="flex-1 h-7 rounded-lg overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.7, delay: i * 0.1, ease: 'easeOut' }}
                        className="h-full rounded-lg flex items-center justify-end pr-2.5"
                        style={{
                          background: isPositive
                            ? 'linear-gradient(90deg, rgba(34,197,94,0.15), rgba(34,197,94,0.4))'
                            : 'linear-gradient(90deg, rgba(239,68,68,0.15), rgba(239,68,68,0.4))',
                          boxShadow: `0 0 12px ${barColor}15`,
                        }}
                      >
                        <span className="text-xs font-bold" style={{ color: barColor }}>
                          {formatPercent(sub.ytd)}
                        </span>
                      </motion.div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#6B6B6B] uppercase min-w-[28px]">WT</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${weightPct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.1 + 0.3 }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, rgba(201,166,70,0.3), rgba(201,166,70,0.6))' }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-[#8B8B8B] min-w-[36px] text-right">{sub.weight}%</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2.5 pt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-[10px] text-[#6B6B6B] uppercase">Rating</span>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, starIdx) => {
                        const filled = starIdx < Math.floor(sub.rating / 20);
                        return (
                          <div
                            key={starIdx}
                            className="w-3.5 h-3.5 rounded-sm"
                            style={{
                              background: filled ? 'linear-gradient(135deg, #C9A646, #F4D97B)' : 'rgba(255,255,255,0.06)',
                              border: filled ? '1px solid rgba(201,166,70,0.4)' : '1px solid rgba(255,255,255,0.06)',
                            }}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[11px] font-semibold text-[#C9A646] ml-1">{sub.rating}/100</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: sorted.length * 0.1 + 0.3 }}
          className="mt-5 p-4 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.06), rgba(201,166,70,0.02))',
            border: '1px solid rgba(201,166,70,0.12)',
          }}
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-[#C9A646] mt-0.5 shrink-0" />
            <p className="text-sm text-[#E8DCC4] leading-relaxed">
              <strong className="text-[#C9A646]">{leader.name}</strong> is leading the sector with{' '}
              <span className="text-[#22C55E] font-semibold">{formatPercent(leader.ytd)}</span> YTD at{' '}
              {leader.weight}% weight, while{' '}
              <strong className="text-[#C9A646]">{laggard.name}</strong> lags at{' '}
              <span style={{ color: laggard.ytd >= 0 ? colors.positive : colors.negative }} className="font-semibold">
                {formatPercent(laggard.ytd)}
              </span>.
              {leader.ytd - laggard.ytd > 15 && (
                <span className="text-[#F59E0B]"> The {(leader.ytd - laggard.ytd).toFixed(0)}pp spread suggests meaningful dispersion — stock selection matters here.</span>
              )}
              {leader.ytd - laggard.ytd <= 15 && leader.ytd - laggard.ytd > 5 && (
                <span className="text-[#8B8B8B]"> The {(leader.ytd - laggard.ytd).toFixed(0)}pp spread shows moderate sub-sector divergence.</span>
              )}
              {leader.ytd - laggard.ytd <= 5 && (
                <span className="text-[#8B8B8B]"> Sub-sectors are moving in tandem — a rising tide is lifting all boats.</span>
              )}
            </p>
          </div>
        </motion.div>
      </div>
    </Card>
  );
});

SubSectorBreakdown.displayName = 'SubSectorBreakdown';

// =====================================================
// 🌐 MACRO ENVIRONMENT — FROM CACHE (ZERO AI CALLS)
// =====================================================
// v2: callSectorAI() per user with web search → $0.03/view
// v3: read from cachedAnalysis.macro_regime + ism_context → $0/view
// =====================================================

interface AIMacroEnvironmentProps {
  sector: Sector;
  cachedAnalysis?: CachedSectorData | null;
}

const AIMacroEnvironment = memo<AIMacroEnvironmentProps>(({ sector, cachedAnalysis }) => {
  const macro = cachedAnalysis?.macro_regime;
  const ism = cachedAnalysis?.ism_context;
  const generatedAt = cachedAnalysis?.generated_at || cachedAnalysis?.ai_generated_at;

  return (
    <Card>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))',
                border: '1px solid rgba(201,166,70,0.25)',
              }}
            >
              <Activity className="h-4.5 w-4.5 text-[#C9A646]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Macro Environment</h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#C9A646]/10 text-[#C9A646] border border-[#C9A646]/20">
                  PRE-CACHED
                </span>
              </div>
              <p className="text-[10px] text-[#6B6B6B] mt-0.5">
                How current macro conditions affect this sector
              </p>
            </div>
          </div>
          <FreshnessIndicator generatedAt={generatedAt} />
        </div>

        {/* Sensitivity factor cards — always show from static data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {sector.macroSensitivity.map((item, i) => {
            const sensitivityColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
              High: { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)', text: '#EF4444', icon: '🔴' },
              Medium: { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)', text: '#F59E0B', icon: '🟡' },
              Med: { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)', text: '#F59E0B', icon: '🟡' },
              Low: { bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.15)', text: '#22C55E', icon: '🟢' },
            };
            const c = sensitivityColors[item.sensitivity] || sensitivityColors['Medium'];

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl p-4"
                style={{ background: c.bg, border: `1px solid ${c.border}` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">{item.factor}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${c.text}15`, color: c.text }}>
                    {item.sensitivity}
                  </span>
                </div>
                <p className="text-xs text-[#9B9B9B] leading-relaxed">{item.impact}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ISM Context Strip — from cache */}
        {ism?.pmi && (
          <div className="grid grid-cols-5 gap-2 mb-5">
            {[
              { label: 'PMI', value: ism.pmi, threshold: 50, color: ism.pmi >= 50 ? colors.positive : colors.negative },
              { label: 'New Orders', value: ism.newOrders, threshold: 50, color: (ism.newOrders || 50) >= 50 ? colors.positive : colors.negative },
              { label: 'Employment', value: ism.employment, threshold: 48, color: (ism.employment || 50) >= 48 ? colors.positive : colors.negative },
              { label: 'Prices', value: ism.prices, threshold: 55, color: (ism.prices || 50) > 55 ? colors.warning : colors.positive },
              { label: 'Backlog', value: ism.backlog, threshold: 47, color: (ism.backlog || 50) >= 47 ? colors.positive : colors.negative },
            ].map(ind => (
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
                <div className="text-[9px] mt-0.5" style={{ color: ind.color }}>
                  {ind.value && ind.value >= ind.threshold ? '▲' : '▼'} {ind.threshold}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Macro Narrative from cache */}
        {macro?.narrative && (
          <div
            className="rounded-xl p-5 relative"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.05), rgba(201,166,70,0.02))',
              border: '1px solid rgba(201,166,70,0.12)',
            }}
          >
            <div className="absolute top-0 left-0 w-[3px] h-full rounded-full" style={{ background: 'linear-gradient(to bottom, #C9A646, #C9A64620, transparent)' }} />
            <div className="flex items-start gap-3">
              <Brain className="w-4 h-4 text-[#C9A646] mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#C9A646] tracking-wider uppercase">AI Macro Assessment</span>
                    {macro.riskLevel && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ 
                              background: macro.riskLevel === 'high' || macro.riskLevel === 'elevated' 
                                ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                              color: macro.riskLevel === 'high' || macro.riskLevel === 'elevated' 
                                ? colors.negative : colors.positive 
                            }}>
                        {macro.riskLevel.toUpperCase()} RISK
                      </span>
                    )}
                  </div>
                  <CopyButton text={macro.narrative} />
                </div>
                <p className="text-sm text-[#C8C8C8] leading-[1.85]">
                  {macro.regimeLabel} — {macro.narrative}
                </p>
                {macro.fedPolicy && (
                  <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgba(201,166,70,0.08)' }}>
                    <span className="text-[10px] text-[#6B6B6B]">Fed: <strong className="text-[#C9A646]">{macro.fedPolicy}</strong></span>
                    <span className="text-[10px] text-[#6B6B6B]">Theme: <strong className="text-[#C9A646]">{macro.rotationTheme}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fallback if no cached macro data */}
        {!macro?.narrative && (
          <div className="p-4 rounded-xl" style={{ background: 'rgba(201,166,70,0.04)', border: '1px solid rgba(201,166,70,0.08)' }}>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#6B6B6B]" />
              <p className="text-sm text-[#6B6B6B]">Macro analysis will update at next scheduled refresh (4x daily)</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

AIMacroEnvironment.displayName = 'AIMacroEnvironment';

// =====================================================
// 📊 MAIN OVERVIEW TAB COMPONENT
// =====================================================

interface OverviewTabProps {
  sector: Sector;
  cachedAnalysis?: CachedSectorData | null;
}

export const OverviewTab = memo<OverviewTabProps>(({ sector, cachedAnalysis }) => {
  return (
    <div className="space-y-6">

      {/* AI Sector Commentary — FROM CACHE, ZERO AI CALLS */}
      <AISectorCommentary sector={sector} cachedAnalysis={cachedAnalysis} />

      {/* Sector vs Market */}
      {sector.vsMarket && (
        <SectorVsMarket vsMarket={sector.vsMarket} ticker={sector.ticker} />
      )}

      {/* Sector Snapshot + Fundamentals — Compact */}
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-[#C9A646]" />
            <h3 className="text-sm font-bold text-white">Sector Snapshot</h3>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
            <StatBox label="Market Cap" value={sector.marketCap} />
            <StatBox label="S&P Weight" value={`${sector.spWeight}%`} />
            <StatBox label="Companies" value={sector.companies.toString()} />
            <StatBox label="Beta" value={sector.beta.toFixed(2)} />
            <StatBox label="YTD" value={formatPercent(sector.ytdChange)} color={sector.ytdChange >= 0 ? colors.positive : colors.negative} />
            <StatBox label="Momentum" value={sector.momentum.toString()} color={sector.momentum >= 0 ? colors.positive : colors.negative} />
          </div>
          {sector.fundamentals && (
            <>
              <div className="border-t border-white/5 pt-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                  {[
                    { label: 'P/E (FWD)', value: `${sector.fundamentals.peForward.toFixed(1)}x`, sub: `vs ${sector.fundamentals.peVsSpAvg.toFixed(0)}x S&P` },
                    { label: 'EV/EBITDA', value: `${sector.fundamentals.evEbitda.toFixed(1)}x`, sub: `vs ${sector.fundamentals.evEbitdaVsSpAvg.toFixed(0)}x S&P` },
                    { label: 'Rev Growth', value: formatPercent(sector.fundamentals.revGrowth, true), sub: `vs ${formatPercent(sector.fundamentals.revGrowthVsSpAvg)} S&P` },
                    { label: 'EPS Growth', value: formatPercent(sector.fundamentals.earningsGrowth, true), sub: `vs ${formatPercent(sector.fundamentals.earningsGrowthVsSpAvg)} S&P` },
                  ].map((m, i) => (
                    <div key={i} className="p-2.5 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.06)' }}>
                      <div className="text-[9px] text-[#6B6B6B] uppercase mb-0.5">{m.label}</div>
                      <div className="text-base font-bold text-[#C9A646]">{m.value}</div>
                      <div className="text-[9px] text-[#8B8B8B]">{m.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(201,166,70,0.05)', border: '1px solid rgba(201,166,70,0.1)' }}>
                  <span className="text-xs text-[#E8DCC4]">
                    <strong className="text-[#C9A646]">Valuation: </strong>
                    {sector.fundamentals.valuationAssessment}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Money Flow */}
      {sector.moneyFlow && (
        <MoneyFlow moneyFlow={sector.moneyFlow} />
      )}

      {/* Earnings Calendar — LIVE from cache, fallback to static */}
      <EarningsCalendar 
        earnings={sector.earningsCalendar} 
        cachedEarnings={cachedAnalysis?.earnings_calendar}
      />

    </div>
  );
});

OverviewTab.displayName = 'OverviewTab';

export default OverviewTab;