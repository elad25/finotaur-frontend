// =====================================================
// ⚠️ RISKS TAB - AI-Powered Risk Intelligence
// =====================================================
// ARCHITECTURE: "COMPUTE ONCE, SERVE 10,000"
// • Primary: sector_snapshots.risk_analysis (JSONB) from cron
// • Fallback: Smart generation from existing sector data
//   (risks[], macroSensitivity[], topHoldings[], cachedAnalysis)
// • NEVER shows empty/loading state — always has content
// • ZERO AI calls on page load
// =====================================================

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, TrendingDown, TrendingUp, Shield,
  Activity, Users, ArrowRight, XCircle, Zap, Gauge, Landmark, Layers
} from 'lucide-react';
import { Sector } from '../types';
import { Card } from '../ui';

// =====================================================
// 🎯 TYPES
// =====================================================

interface MacroRisk {
  risk: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  why: string;
  whatsChanging: string;
  affectedLeaders: string[];
}

interface SectorRisk {
  risk: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  why: string;
  trendShift: string;
  affectedLeaders: string[];
}

interface LeaderContagion {
  ticker: string;
  name: string;
  sectorWeight: string;
  risk: string;
  catalyst: string;
  contagionLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface TrendChange {
  indicator: string;
  direction: 'IMPROVING' | 'DETERIORATING' | 'REVERSING';
  detail: string;
  actionable: string;
}

interface RiskAnalysis {
  overallRiskScore: number;
  riskLevel: string;
  riskSummary: string;
  macroRisks: MacroRisk[];
  sectorRisks: SectorRisk[];
  leaderContagion: LeaderContagion[];
  trendChanges: TrendChange[];
  exitTriggers: string[];
  hedgeIdea: string;
  isFallback?: boolean;
}

// =====================================================
// 🧠 SMART FALLBACK GENERATOR
// =====================================================
// Builds risk analysis from existing sector data when
// cron hasn't populated risk_analysis yet.
// Uses: sector.risks, sector.macroSensitivity,
//       sector.topHoldings, cachedAnalysis fields
// =====================================================

function buildFallbackRiskAnalysis(sector: Sector, cachedAnalysis?: any): RiskAnalysis {
  const regime = cachedAnalysis?.macro_regime;
  const ism = cachedAnalysis?.ism_context;
  const verdict = cachedAnalysis?.verdict || sector.verdict;
  const bearCase = cachedAnalysis?.ai_bear_case;

  // --- Overall Score from existing data ---
  const riskCount = sector.risks?.length || 0;
  const highRisks = sector.risks?.filter(r => r.impact === 'High' || r.probability === 'High').length || 0;
  const isElevated = regime?.riskLevel === 'elevated' || regime?.riskLevel === 'high';
  const ismContraction = ism?.direction === 'contraction';

  let score = 35;
  score += highRisks * 12;
  score += (riskCount - highRisks) * 5;
  if (isElevated) score += 15;
  if (ismContraction) score += 10;
  if (verdict?.signal === 'UNDERWEIGHT') score += 10;
  if (verdict?.signal === 'OVERWEIGHT') score -= 8;
  score = Math.max(15, Math.min(85, score));

  const riskLevel = score >= 70 ? 'HIGH' : score >= 50 ? 'ELEVATED' : score >= 35 ? 'MODERATE' : 'LOW';

  // --- Risk Summary ---
  const riskSummary = bearCase
    ? bearCase.substring(0, 200)
    : `${sector.name} faces ${highRisks} high-severity risk${highRisks !== 1 ? 's' : ''} in current ${regime?.regimeLabel || 'market'} environment. ${isElevated ? 'Elevated macro risk warrants caution.' : 'Risk profile manageable with proper positioning.'}`;

  // --- Macro Risks from macroSensitivity ---
  const macroRisks: MacroRisk[] = (sector.macroSensitivity || []).slice(0, 3).map(ms => {
    const topTickers = (sector.topHoldings || [])
      .sort((a, b) => (b.weight || b.score || 0) - (a.weight || a.score || 0))
      .slice(0, 2)
      .map(h => h.ticker);

    return {
      risk: ms.factor,
      severity: ms.sensitivity === 'High' ? 'HIGH' : ms.sensitivity === 'Medium' ? 'MEDIUM' : 'LOW',
      why: ms.impact,
      whatsChanging: regime
        ? `${regime.regimeLabel} regime with ${regime.fedPolicy || 'neutral'} Fed policy and ${regime.riskLevel || 'moderate'} risk`
        : 'Monitor macro conditions for shifts',
      affectedLeaders: topTickers,
    };
  });

  // --- Sector Risks from risks[] ---
  const sectorRisks: SectorRisk[] = (sector.risks || []).slice(0, 3).map(r => {
    const topTicker = (sector.topHoldings || [])
      .sort((a, b) => (b.weight || b.score || 0) - (a.weight || a.score || 0))
      .slice(0, 1)
      .map(h => h.ticker);

    return {
      risk: r.risk,
      severity: r.impact === 'High' ? 'HIGH' : r.impact === 'Medium' ? 'MEDIUM' : 'LOW',
      why: `${r.risk} with ${r.probability?.toLowerCase() || 'moderate'} probability could impact ${sector.name} fundamentals`,
      trendShift: ism
        ? `ISM PMI at ${ism.pmi || 'N/A'} (${ism.direction || 'N/A'}) — ${ism.direction === 'contraction' ? 'adds pressure' : 'provides support'}`
        : 'Monitoring sector-specific developments',
      affectedLeaders: topTicker,
    };
  });

  // --- Leader Contagion from topHoldings ---
  const sortedHoldings = [...(sector.topHoldings || [])]
    .sort((a, b) => (b.weight || b.score || 0) - (a.weight || a.score || 0))
    .slice(0, 3);

  const leaderContagion: LeaderContagion[] = sortedHoldings.map((h, idx) => {
    const weight = h.weight ? `~${h.weight}%` : `Top ${idx + 1}`;
    const isNegative = (h.change || 0) < 0;
    const hasInsiderSelling = h.insiderActivity === 'sell';

    return {
      ticker: h.ticker,
      name: h.name,
      sectorWeight: `${weight} of ${sector.ticker}`,
      risk: isNegative
        ? `${h.ticker} down ${Math.abs(h.change || 0).toFixed(1)}% — sustained weakness could drag the sector`
        : hasInsiderSelling
          ? `Insider selling detected in ${h.ticker} despite sector strength`
          : `${h.ticker} as top holding has outsized influence on ${sector.ticker} performance`,
      catalyst: 'Upcoming earnings or macro shift could trigger move',
      contagionLevel: idx === 0 ? 'HIGH' : idx === 1 ? 'MEDIUM' : 'LOW',
    };
  });

  // --- Trend Changes from ISM + regime ---
  const trendChanges: TrendChange[] = [];

  if (ism?.pmi) {
    trendChanges.push({
      indicator: 'ISM Manufacturing PMI',
      direction: ism.direction === 'contraction' ? 'DETERIORATING' : 'IMPROVING',
      detail: `PMI at ${ism.pmi} — ${ism.direction === 'contraction' ? 'manufacturing contraction adds sector headwinds' : 'expansion supports cyclical exposure'}`,
      actionable: ism.direction === 'contraction' ? 'Reduce cyclical exposure, favor defensive names' : 'Maintain or increase sector allocation',
    });
  }

  if (regime?.fedPolicy) {
    const fedDir = regime.fedPolicy === 'hawkish' ? 'DETERIORATING' : regime.fedPolicy === 'dovish' ? 'IMPROVING' : 'REVERSING';
    trendChanges.push({
      indicator: 'Fed Policy Stance',
      direction: fedDir,
      detail: `Fed policy is ${regime.fedPolicy} with rates ${regime.rateDirection || 'stable'} — impacts sector valuations and capital flows`,
      actionable: regime.fedPolicy === 'hawkish'
        ? 'Watch rate-sensitive holdings closely'
        : regime.fedPolicy === 'dovish'
          ? 'Growth and duration benefit from easing bias'
          : 'Neutral — position based on sector fundamentals',
    });
  }

  if (sector.momentum !== undefined) {
    const momDir = sector.momentum > 60 ? 'IMPROVING' : sector.momentum < 40 ? 'DETERIORATING' : 'REVERSING';
    trendChanges.push({
      indicator: 'Sector Momentum',
      direction: momDir,
      detail: `${sector.name} momentum at ${sector.momentum}/100 — ${momDir === 'IMPROVING' ? 'positive trend intact' : momDir === 'DETERIORATING' ? 'weakening trend signals caution' : 'trend at inflection point'}`,
      actionable: momDir === 'DETERIORATING' ? 'Tighten stops and reduce position size' : 'Maintain positions with current trend',
    });
  }

  // --- Exit Triggers ---
  const exitTriggers = [
    `${sector.ticker} closes below 200-day moving average on heavy volume`,
    `${sector.name} relative strength vs SPY turns negative for 30+ consecutive days`,
    ism?.pmi ? `ISM PMI drops below ${Math.max(42, Math.floor((ism.pmi || 48) - 5))} signaling deep contraction` : 'Key macro indicators deteriorate sharply',
  ];

  // --- Hedge Idea ---
  const hedgeIdea = sector.beta && sector.beta > 1
    ? `Consider a ${Math.round(10 + (sector.beta - 1) * 20)}% allocation to put protection on ${sector.ticker} or reduce position size during elevated volatility periods. ${sector.ticker} beta of ${sector.beta.toFixed(2)} amplifies market drawdowns.`
    : `${sector.name} has defensive characteristics (beta ${sector.beta?.toFixed(2) || 'N/A'}) that provide natural downside protection. Monitor sector-specific catalysts rather than broad hedging.`;

  return {
    overallRiskScore: score,
    riskLevel,
    riskSummary,
    macroRisks,
    sectorRisks,
    leaderContagion,
    trendChanges,
    exitTriggers,
    hedgeIdea,
    isFallback: true,
  };
}

// =====================================================
// 🔧 HELPERS
// =====================================================

const severityColor = (s: string) => {
  switch (s?.toUpperCase()) {
    case 'HIGH': case 'CRITICAL': return '#EF4444';
    case 'MEDIUM': case 'ELEVATED': return '#F59E0B';
    case 'LOW': case 'MODERATE': return '#22C55E';
    default: return '#8B8B8B';
  }
};

const severityBg = (s: string) => {
  switch (s?.toUpperCase()) {
    case 'HIGH': case 'CRITICAL': return 'rgba(239,68,68,0.08)';
    case 'MEDIUM': case 'ELEVATED': return 'rgba(245,158,11,0.06)';
    case 'LOW': case 'MODERATE': return 'rgba(34,197,94,0.05)';
    default: return 'rgba(255,255,255,0.02)';
  }
};

const directionIcon = (d: string) => {
  switch (d?.toUpperCase()) {
    case 'IMPROVING': return { icon: TrendingUp, color: '#22C55E', label: 'IMPROVING' };
    case 'DETERIORATING': return { icon: TrendingDown, color: '#EF4444', label: 'DETERIORATING' };
    case 'REVERSING': return { icon: Activity, color: '#F59E0B', label: 'REVERSING' };
    default: return { icon: Activity, color: '#8B8B8B', label: d || 'N/A' };
  }
};

const SeverityBadge = ({ level }: { level: string }) => (
  <span
    className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
    style={{ color: severityColor(level), background: severityBg(level), border: `1px solid ${severityColor(level)}24` }}
  >
    {level}
  </span>
);

const RiskShell = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`relative overflow-hidden rounded-[18px] border border-[#C9A646]/12 ${className}`}
    style={{
      background:
        'radial-gradient(circle at 14% 0%, rgba(201,166,70,0.075), transparent 32%), linear-gradient(180deg, rgba(12,18,24,0.96), rgba(6,9,13,0.98))',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.055), 0 18px 42px rgba(0,0,0,0.28)',
    }}
  >
    {children}
  </div>
);

// =====================================================
// 📊 RISK SCORE HEADER
// =====================================================

const RiskScoreHeader = memo<{ riskAnalysis: RiskAnalysis; sectorName: string }>(
  ({ riskAnalysis, sectorName }) => {
    const score = riskAnalysis.overallRiskScore || 0;
    const level = riskAnalysis.riskLevel || 'MODERATE';
    const color = severityColor(level);

    return (
      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5" style={{ color }} />
              <h3 className="text-lg font-bold text-white">{sectorName} Risk Assessment</h3>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-bold px-3 py-1 rounded-full uppercase"
                style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}
              >
                {level}
              </span>
              <span className="text-2xl font-black" style={{ color }}>{score}</span>
              <span className="text-xs text-[#6B6B6B]">/100</span>
            </div>
          </div>

          {/* Risk Score Bar */}
          <div className="h-1.5 rounded-full bg-white/5 mb-3">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>

          <p className="text-sm text-[#B0A080] leading-relaxed">
            {riskAnalysis.riskSummary}
          </p>
        </div>
      </Card>
    );
  }
);

RiskScoreHeader.displayName = 'RiskScoreHeader';

// =====================================================
// 🌍 MACRO + SECTOR RISKS (Combined, Compact)
// =====================================================

const RiskRadar = memo<{ macroRisks: MacroRisk[]; sectorRisks: SectorRisk[] }>(
  ({ macroRisks, sectorRisks }) => {
    const allRisks = useMemo(() => {
      const macro = (macroRisks || []).map(r => ({ ...r, type: 'MACRO' as const, detail: r.whatsChanging }));
      const sector = (sectorRisks || []).map(r => ({ ...r, type: 'SECTOR' as const, detail: r.trendShift }));
      const combined = [...macro, ...sector];
      const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      combined.sort((a, b) => (order[a.severity] ?? 2) - (order[b.severity] ?? 2));
      return combined;
    }, [macroRisks, sectorRisks]);

    if (allRisks.length === 0) return null;

    return (
      <Card>
        <div className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <Zap className="h-5 w-5 text-[#C9A646]" />
            <h3 className="text-base font-bold text-white">Risk Radar</h3>
            <span className="text-[10px] text-[#6B6B6B] ml-auto">
              {allRisks.filter(r => r.severity === 'HIGH').length} high · {allRisks.filter(r => r.severity === 'MEDIUM').length} medium
            </span>
          </div>

          <div className="space-y-2">
            {allRisks.map((r, i) => (
              <motion.div
                key={`${r.type}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-3 rounded-lg"
                style={{ background: severityBg(r.severity), border: `1px solid ${severityColor(r.severity)}12` }}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ background: severityColor(r.severity) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                        style={{ 
                          color: r.type === 'MACRO' ? '#818CF8' : '#C9A646',
                          background: r.type === 'MACRO' ? 'rgba(129,140,248,0.1)' : 'rgba(201,166,70,0.1)'
                        }}
                      >
                        {r.type}
                      </span>
                      <span className="text-sm font-semibold text-white truncate">{r.risk}</span>
                      <SeverityBadge level={r.severity} />
                    </div>
                    <p className="text-xs text-[#B0A080] leading-relaxed mb-1">{r.why}</p>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <ArrowRight className="h-3 w-3 text-[#6B6B6B] flex-shrink-0" />
                      <span className="text-[#8B8B8B] italic">{r.detail}</span>
                    </div>
                    {r.affectedLeaders?.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] text-[#6B6B6B]">At risk:</span>
                        {r.affectedLeaders.map(t => (
                          <span key={t} className="text-[10px] font-mono font-bold text-[#C9A646] px-1.5 py-0.5 rounded bg-[#C9A646]/8">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>
    );
  }
);

RiskRadar.displayName = 'RiskRadar';

// =====================================================
// 👑 LEADER CONTAGION - Stocks that can drag the sector
// =====================================================

const LeaderContagionSection = memo<{ leaders: LeaderContagion[] }>(({ leaders }) => {
  if (!leaders?.length) return null;

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <Users className="h-5 w-5 text-[#EF4444]" />
          <h3 className="text-base font-bold text-white">Leader Contagion Risk</h3>
        </div>

        <p className="text-xs text-[#6B6B6B] mb-3">
          These stocks have outsized sector influence — if they fall, the sector follows.
        </p>

        <div className="space-y-2">
          {leaders.map((l, i) => (
            <motion.div
              key={l.ticker}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{ background: severityBg(l.contagionLevel), border: `1px solid ${severityColor(l.contagionLevel)}10` }}
            >
              <div className="flex-shrink-0 text-center min-w-[48px]">
                <span className="text-sm font-mono font-black text-[#C9A646]">{l.ticker}</span>
                <div className="text-[9px] text-[#6B6B6B] mt-0.5">{l.sectorWeight}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-[#E8DCC4]">{l.name}</span>
                  <SeverityBadge level={l.contagionLevel} />
                </div>
                <p className="text-xs text-[#8B8B8B] leading-relaxed">{l.risk}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-[#6B6B6B]">Catalyst:</span>
                  <span className="text-[10px] text-[#F59E0B]">{l.catalyst}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  );
});

LeaderContagionSection.displayName = 'LeaderContagionSection';

// =====================================================
// 📈 TREND CHANGES - What's shifting NOW
// =====================================================

const TrendChangesSection = memo<{ changes: TrendChange[] }>(({ changes }) => {
  if (!changes?.length) return null;

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <Activity className="h-5 w-5 text-[#C9A646]" />
          <h3 className="text-base font-bold text-white">Trend Shifts</h3>
        </div>

        <div className="space-y-2">
          {changes.map((tc, i) => {
            const dir = directionIcon(tc.direction);
            const DirIcon = dir.icon;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${dir.color}12` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <DirIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: dir.color }} />
                  <span className="text-sm font-semibold text-white">{tc.indicator}</span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                    style={{ color: dir.color, background: `${dir.color}12` }}
                  >
                    {dir.label}
                  </span>
                </div>
                <p className="text-xs text-[#B0A080] leading-relaxed ml-5">{tc.detail}</p>
                <div className="flex items-center gap-1.5 mt-1 ml-5">
                  <span className="text-[10px] text-[#C9A646] font-medium">→ {tc.actionable}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Card>
  );
});

TrendChangesSection.displayName = 'TrendChangesSection';

// =====================================================
// 🛑 EXIT TRIGGERS + HEDGE
// =====================================================

const ExitAndHedge = memo<{ triggers: string[]; hedgeIdea: string }>(({ triggers, hedgeIdea }) => {
  if (!triggers?.length && !hedgeIdea) return null;

  return (
    <Card>
      <div className="p-5">
        {/* Exit Triggers */}
        {triggers?.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2.5 mb-3">
              <XCircle className="h-5 w-5 text-[#EF4444]" />
              <h3 className="text-base font-bold text-white">Exit Triggers</h3>
            </div>
            <div className="space-y-1.5">
              {triggers.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2 p-2.5 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)' }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.12)' }}
                  >
                    <span className="text-[10px] font-bold text-[#EF4444]">{i + 1}</span>
                  </div>
                  <span className="text-xs text-[#E8DCC4] leading-relaxed">{t}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Hedge Idea */}
        {hedgeIdea && (
          <div
            className="p-3.5 rounded-lg"
            style={{ background: 'rgba(201,166,70,0.05)', border: '1px solid rgba(201,166,70,0.12)' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="h-4 w-4 text-[#C9A646]" />
              <span className="text-xs font-bold text-[#C9A646] uppercase tracking-wider">Recommended Hedge</span>
            </div>
            <p className="text-sm text-[#E8DCC4] leading-relaxed">{hedgeIdea}</p>
          </div>
        )}
      </div>
    </Card>
  );
});

ExitAndHedge.displayName = 'ExitAndHedge';

const PremiumRiskSummary = memo<{ riskAnalysis: RiskAnalysis; sector: Sector }>(({ riskAnalysis, sector }) => {
  const score = riskAnalysis.overallRiskScore || 0;
  const level = riskAnalysis.riskLevel || 'MODERATE';
  const color = severityColor(level);
  const circumference = 263.89;
  const offset = circumference - (circumference * Math.min(score, 100)) / 100;

  return (
    <RiskShell>
      <div className="grid gap-5 p-5 lg:grid-cols-[210px_1fr_290px]">
        <div className="flex items-center gap-4 lg:flex-col lg:items-start">
          <div className="relative flex h-[116px] w-[116px] shrink-0 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 104 104">
              <circle cx="52" cy="52" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <motion.circle cx="52" cy="52" r="42" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1, ease: 'easeOut' }} />
            </svg>
            <div className="text-center">
              <div className="text-3xl font-black tabular-nums" style={{ color }}>{score}</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8E96A3]">risk</div>
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-[#C9A646]" />
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#C9A646]">Risk Control</span>
            </div>
            <h3 className="text-2xl font-bold text-white">{sector.name}</h3>
            <div className="mt-2"><SeverityBadge level={level} /></div>
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <p className="max-w-3xl text-[15px] leading-7 text-[#CDD3DD]">{riskAnalysis.riskSummary}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ['Macro', riskAnalysis.macroRisks?.length || 0, Landmark],
              ['Sector', riskAnalysis.sectorRisks?.length || 0, Layers],
              ['Exit Rules', riskAnalysis.exitTriggers?.length || 0, XCircle],
            ].map(([label, value, Icon]) => (
              <div key={label as string} className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-[#AAB2BF]">
                  <Icon className="h-4 w-4 text-[#C9A646]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{label as string}</span>
                </div>
                <div className="text-xl font-bold text-white">{value as number}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#C9A646]/12 bg-[#C9A646]/[0.045] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#C9A646]" />
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#C9A646]">Hedge Lens</span>
          </div>
          <p className="line-clamp-6 text-sm leading-6 text-[#D7DDE6]">{riskAnalysis.hedgeIdea}</p>
        </div>
      </div>
    </RiskShell>
  );
});
PremiumRiskSummary.displayName = 'PremiumRiskSummary';

const PremiumRiskRadar = memo<{ macroRisks: MacroRisk[]; sectorRisks: SectorRisk[] }>(({ macroRisks, sectorRisks }) => {
  const allRisks = useMemo(() => {
    const macro = (macroRisks || []).map(r => ({ ...r, type: 'MACRO' as const, detail: r.whatsChanging }));
    const sector = (sectorRisks || []).map(r => ({ ...r, type: 'SECTOR' as const, detail: r.trendShift }));
    const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return [...macro, ...sector].sort((a, b) => (order[a.severity] ?? 2) - (order[b.severity] ?? 2));
  }, [macroRisks, sectorRisks]);

  if (!allRisks.length) return null;

  return (
    <RiskShell>
      <div className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#C9A646]/18 bg-[#C9A646]/10">
            <Zap className="h-4 w-4 text-[#C9A646]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Risk Radar</h3>
            <p className="text-[11px] text-[#8E96A3]">Macro and sector pressure points, ranked by severity</p>
          </div>
          <span className="ml-auto rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1 text-[10px] text-[#AAB2BF]">
            {allRisks.filter(r => r.severity === 'HIGH').length} high / {allRisks.filter(r => r.severity === 'MEDIUM').length} medium
          </span>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {allRisks.map((risk, index) => (
            <motion.div key={`${risk.type}-${risk.risk}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="relative min-h-[150px] overflow-hidden rounded-2xl border p-4" style={{ background: `linear-gradient(180deg, ${severityBg(risk.severity)}, rgba(255,255,255,0.018))`, borderColor: `${severityColor(risk.severity)}22` }}>
              <div className="absolute right-0 top-0 h-20 w-20 rounded-full blur-2xl" style={{ background: `${severityColor(risk.severity)}18` }} />
              <div className="relative flex items-start gap-3">
                <div className="mt-1 h-12 w-1 rounded-full" style={{ background: severityColor(risk.severity) }} />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ color: risk.type === 'MACRO' ? '#9AA4FF' : '#C9A646', background: risk.type === 'MACRO' ? 'rgba(129,140,248,0.1)' : 'rgba(201,166,70,0.1)' }}>{risk.type}</span>
                    <span className="truncate text-sm font-semibold text-white">{risk.risk}</span>
                    <SeverityBadge level={risk.severity} />
                  </div>
                  <p className="mb-3 text-sm leading-6 text-[#D7DDE6]">{risk.why}</p>
                  <div className="flex items-start gap-2 rounded-xl border border-white/[0.05] bg-black/20 p-2.5 text-[11px]">
                    <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-[#C9A646]" />
                    <span className="leading-5 text-[#AAB2BF]">{risk.detail}</span>
                  </div>
                  {!!risk.affectedLeaders?.length && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[#8E96A3]">At risk</span>
                      {risk.affectedLeaders.map(ticker => <span key={ticker} className="rounded-md border border-[#C9A646]/12 bg-[#C9A646]/8 px-2 py-1 font-mono text-[10px] font-bold text-[#C9A646]">{ticker}</span>)}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </RiskShell>
  );
});
PremiumRiskRadar.displayName = 'PremiumRiskRadar';

const PremiumLeaderAndTrend = memo<{ leaders: LeaderContagion[]; changes: TrendChange[] }>(({ leaders, changes }) => (
  <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
    <RiskShell>
      <div className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <Users className="h-5 w-5 text-[#EF4444]" />
          <div><h3 className="text-base font-bold text-white">Leader Contagion</h3><p className="text-[11px] text-[#8E96A3]">Holdings with outsized index influence</p></div>
        </div>
        <div className="space-y-2">
          {(leaders || []).map((leader, index) => (
            <motion.div key={leader.ticker} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="rounded-2xl border p-3" style={{ background: severityBg(leader.contagionLevel), borderColor: `${severityColor(leader.contagionLevel)}18` }}>
              <div className="mb-2 flex items-center gap-2"><span className="font-mono text-sm font-black text-[#C9A646]">{leader.ticker}</span><span className="truncate text-xs font-medium text-white">{leader.name}</span><SeverityBadge level={leader.contagionLevel} /></div>
              <p className="text-xs leading-relaxed text-[#CDD3DD]">{leader.risk}</p>
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px]"><span className="text-[#8E96A3]">{leader.sectorWeight}</span><span className="text-[#F59E0B]">{leader.catalyst}</span></div>
            </motion.div>
          ))}
        </div>
      </div>
    </RiskShell>
    <RiskShell>
      <div className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-[#C9A646]" />
          <div><h3 className="text-base font-bold text-white">Trend Shifts</h3><p className="text-[11px] text-[#8E96A3]">What is changing now and what to do</p></div>
        </div>
        <div className="space-y-2">
          {(changes || []).map((change, index) => {
            const direction = directionIcon(change.direction);
            const Icon = direction.icon;
            return (
              <motion.div key={change.indicator} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="rounded-2xl border p-3" style={{ background: 'rgba(255,255,255,0.02)', borderColor: `${direction.color}18` }}>
                <div className="mb-2 flex flex-wrap items-center gap-2"><Icon className="h-3.5 w-3.5" style={{ color: direction.color }} /><span className="text-sm font-semibold text-white">{change.indicator}</span><span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ color: direction.color, background: `${direction.color}12` }}>{direction.label}</span></div>
                <p className="text-xs leading-relaxed text-[#CDD3DD]">{change.detail}</p>
                <p className="mt-2 text-[11px] font-medium text-[#C9A646]">{change.actionable}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </RiskShell>
  </div>
));
PremiumLeaderAndTrend.displayName = 'PremiumLeaderAndTrend';

const PremiumExitTriggers = memo<{ triggers: string[] }>(({ triggers }) => {
  if (!triggers?.length) return null;
  return (
    <RiskShell>
      <div className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <XCircle className="h-5 w-5 text-[#EF4444]" />
          <div><h3 className="text-base font-bold text-white">Exit Triggers</h3><p className="text-[11px] text-[#8E96A3]">Clear conditions that invalidate the setup</p></div>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {triggers.map((trigger, index) => (
            <motion.div key={trigger} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="flex items-start gap-3 rounded-2xl border border-[#EF4444]/12 bg-[#EF4444]/[0.045] p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EF4444]/12 text-[11px] font-bold text-[#EF4444]">{index + 1}</span>
              <span className="text-xs leading-5 text-[#D7DDE6]">{trigger}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </RiskShell>
  );
});
PremiumExitTriggers.displayName = 'PremiumExitTriggers';

// =====================================================
// 📊 MAIN RISKS TAB
// =====================================================

interface RisksTabProps {
  sector: Sector;
  cachedAnalysis?: any; // SectorSnapshot from useSectorAnalysis
}

export const RisksTab = memo<RisksTabProps>(({ sector, cachedAnalysis }) => {
  // PRIORITY: AI-cached risk_analysis > Smart fallback from sector data
  // NEVER shows empty state — always has content for 10K users
  const riskAnalysis: RiskAnalysis = useMemo(() => {
    // 1. Try AI-cached data (from cron)
    const ra = cachedAnalysis?.risk_analysis;
    if (ra && ra.overallRiskScore && ra.macroRisks?.length > 0) {
      return ra;
    }

    // 2. Smart fallback from existing sector data — ALWAYS works
    return buildFallbackRiskAnalysis(sector, cachedAnalysis);
  }, [cachedAnalysis, sector]);

  return (
    <div className="space-y-4">
      <PremiumRiskSummary riskAnalysis={riskAnalysis} sector={sector} />
      <PremiumRiskRadar macroRisks={riskAnalysis.macroRisks} sectorRisks={riskAnalysis.sectorRisks} />
      <PremiumLeaderAndTrend leaders={riskAnalysis.leaderContagion} changes={riskAnalysis.trendChanges} />
      <PremiumExitTriggers triggers={riskAnalysis.exitTriggers} />
    </div>
  );
});

RisksTab.displayName = 'RisksTab';

export default RisksTab;
