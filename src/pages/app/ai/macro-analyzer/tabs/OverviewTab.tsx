// tabs/OverviewTab.tsx
// =====================================================
// 📊 OVERVIEW TAB
// Shows the big picture: AI narrative, regime, key indicators,
// Fed snapshot - all from ONE batched API call (/api/overview)
// =====================================================

import React, { memo, useMemo, useState, useCallback } from 'react';
import {
  Brain, Sparkles, ChevronDown, RefreshCw,
  Activity, Banknote, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Zap, Shield,
  BarChart2, Target
} from 'lucide-react';
import {
  Card, SectionHeader, ProgressBar, Badge, LazySection,
  CycleStageVisualizer, SignalDot, cn, SectionSkeleton
} from '../shared/ui';
import { useOverview } from '../shared/api';
import type { IndicatorData, RegimeData } from '../shared/api';

// =====================================================
// ERROR / LOADING STATES
// =====================================================

const ErrorState = memo(({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <Card>
    <div className="p-8 text-center">
      <AlertTriangle className="w-10 h-10 text-[#EF4444] mx-auto mb-4" />
      <p className="text-white font-medium mb-2">Failed to load data</p>
      <p className="text-sm text-[#8B8B8B] mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg text-sm text-[#C9A646] border border-[#C9A646]/30 hover:bg-[#C9A646]/10 transition-colors"
      >
        <RefreshCw className="w-4 h-4 inline mr-2" />
        Retry
      </button>
    </div>
  </Card>
));
ErrorState.displayName = 'ErrorState';

// =====================================================
// AI MACRO NARRATIVE
// Generates narrative from real indicator data
// =====================================================

const AIMacroNarrative = memo(({ indicators, regime, fedRate }: {
  indicators: IndicatorData[];
  regime: RegimeData;
  fedRate: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleExpanded = useCallback(() => setIsExpanded(prev => !prev), []);

  // Build narrative from real data
  const narrative = useMemo(() => {
    const gdp = indicators.find(i => i.id === 'gdp');
    const cpi = indicators.find(i => i.id === 'cpi');
    const unemployment = indicators.find(i => i.id === 'unemployment');
    const ismMfg = indicators.find(i => i.id === 'ism-mfg' || i.id === 'ism_mfg');
    const nfp = indicators.find(i => i.id === 'nfp');

    const improving = indicators.filter(i => i.trend === 'improving').length;
    const declining = indicators.filter(i => i.trend === 'declining').length;
    const total = indicators.length;

    // Determine overall tone
    const overallTrend = improving > declining ? 'positive' : declining > improving ? 'negative' : 'mixed';

    // Build sectors based on regime
    const cyclicalFavor = regime.stageIndex <= 2; // Recovery or early expansion
    const favorSectors = cyclicalFavor
      ? ['Technology', 'Industrials', 'Financials', 'Small Caps']
      : ['Utilities', 'Healthcare', 'Consumer Staples', 'Bonds'];
    const avoidSectors = cyclicalFavor
      ? ['Utilities', 'Staples', 'Long Bonds', 'REITs']
      : ['Cyclicals', 'Small Caps', 'High Beta'];

    return {
      stage: regime.stage,
      confidence: regime.confidence,
      gdpValue: gdp ? `${gdp.value}${gdp.unit}` : 'N/A',
      gdpTrend: gdp?.trend || 'stable',
      cpiValue: cpi ? `${cpi.value}${cpi.unit}` : 'N/A',
      cpiTrend: cpi?.trend || 'stable',
      unemploymentValue: unemployment ? `${unemployment.value}${unemployment.unit}` : 'N/A',
      ismValue: ismMfg ? `${ismMfg.value}` : 'N/A',
      ismTrend: ismMfg?.trend || 'stable',
      nfpValue: nfp ? `${nfp.value}${nfp.unit}` : 'N/A',
      fedRate,
      improving,
      declining,
      total,
      overallTrend,
      favorSectors,
      avoidSectors,
    };
  }, [indicators, regime, fedRate]);

  return (
    <Card highlight>
      <div className="relative p-6">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A646] via-[#F4D97B] to-transparent" />

        <SectionHeader
          icon={Brain}
          title="AI Macro Narrative"
          subtitle="What the data is telling us — generated from live indicators"
        />

        {/* Main Verdict */}
        <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(201,166,70,0.05)', border: '1px solid rgba(201,166,70,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#C9A646]" />
            <span className="text-sm font-semibold text-[#C9A646]">FINOTAUR MACRO VERDICT</span>
          </div>

          <p className="text-[#E8DCC4] leading-relaxed mb-4">
            The economy is in <span className="text-[#C9A646] font-semibold">{narrative.stage.toUpperCase()}</span> mode.
            {narrative.ismValue !== 'N/A' && (
              <> Manufacturing PMI at <span className="font-semibold">{narrative.ismValue}</span> ({narrative.ismTrend}).</>
            )}
            {narrative.cpiValue !== 'N/A' && (
              <> Inflation at <span className="font-semibold">{narrative.cpiValue}</span> ({narrative.cpiTrend}).</>
            )}
            {narrative.unemploymentValue !== 'N/A' && (
              <> Unemployment at <span className="font-semibold">{narrative.unemploymentValue}</span>.</>
            )}
            {' '}Fed Funds at <span className="font-semibold">{narrative.fedRate}%</span>.
            {' '}{narrative.improving}/{narrative.total} indicators improving.
          </p>

          {/* Expandable */}
          <div className={cn("overflow-hidden transition-all duration-300", isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0")}>
            <div className="pt-4 border-t border-[#C9A646]/20">
              <p className="text-[#8B8B8B] leading-relaxed mb-4">
                <span className="text-[#C9A646] font-semibold">MARKET IMPLICATION:</span>{' '}
                {narrative.overallTrend === 'positive'
                  ? 'Favor cyclicals over defensives. Risk-on positioning warranted.'
                  : narrative.overallTrend === 'negative'
                  ? 'Defensive positioning recommended. Reduce cyclical exposure.'
                  : 'Mixed signals suggest balanced positioning with selective exposure.'}
              </p>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 rounded-lg bg-[#22C55E]/5 border border-[#22C55E]/20">
                  <p className="text-xs text-[#22C55E] font-semibold mb-2">✅ FAVOR</p>
                  <p className="text-xs text-[#8B8B8B]">{narrative.favorSectors.join(', ')}</p>
                </div>
                <div className="p-3 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/20">
                  <p className="text-xs text-[#EF4444] font-semibold mb-2">❌ AVOID</p>
                  <p className="text-xs text-[#8B8B8B]">{narrative.avoidSectors.join(', ')}</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={toggleExpanded}
            className="text-xs text-[#C9A646] hover:text-[#F4D97B] flex items-center gap-1 transition-colors mt-2"
          >
            {isExpanded ? 'Show less' : 'Read full analysis'}
            <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isExpanded && "rotate-180")} />
          </button>
        </div>

        {/* Confidence & Stats */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#6B6B6B] mb-1">Regime Confidence</p>
            <div className="flex items-center gap-2">
              <ProgressBar value={narrative.confidence} color="linear-gradient(90deg, #C9A646, #F4D97B)" className="w-24" />
              <span className="text-sm font-semibold text-[#C9A646]">{narrative.confidence}%</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#6B6B6B]">Indicators</p>
            <p className="text-xs text-[#8B8B8B]">
              <span className="text-[#22C55E]">{narrative.improving}↑</span>
              {' / '}
              <span className="text-[#EF4444]">{narrative.declining}↓</span>
              {' / '}
              {narrative.total - narrative.improving - narrative.declining}→
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#C9A646]/10">
          <p className="text-xs text-[#6B6B6B] flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Updates automatically every 5 minutes from FRED & Yahoo Finance
          </p>
        </div>
      </div>
    </Card>
  );
});
AIMacroNarrative.displayName = 'AIMacroNarrative';

// =====================================================
// REGIME SNAPSHOT (compact for overview)
// =====================================================

const RegimeSnapshot = memo(({ regime }: { regime: RegimeData }) => {
  const stages = useMemo(() => ['Recession', 'Recovery', 'Expansion', 'Peak'], []);

  return (
    <Card>
      <div className="p-6">
        <SectionHeader icon={Activity} title="Economic Regime" subtitle="Where are we in the cycle" />

        <CycleStageVisualizer stages={stages} currentStage={regime.stageIndex} />

        <div className="p-4 rounded-xl mt-4" style={{ background: 'rgba(201,166,70,0.05)', border: '1px solid rgba(201,166,70,0.2)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-lg font-bold text-[#C9A646]">{regime.stage.toUpperCase()}</span>
              <p className="text-xs text-[#6B6B6B]">Time in regime: {regime.timeInRegime}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#6B6B6B]">Confidence</p>
              <p className="text-xl font-bold text-[#C9A646]">{regime.confidence}%</p>
            </div>
          </div>
        </div>

        {/* Key Regime Indicators */}
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold text-white mb-2">
            Regime Score: {regime.score}/100
          </h4>
          {regime.indicators.slice(0, 5).map((ind, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <span className="text-xs text-[#8B8B8B] flex-1">{ind.name}</span>
              <span className={cn("text-xs font-medium w-24",
                ind.signal === 'POSITIVE' || ind.signal === 'IMPROVING' || ind.signal === 'TIGHT'
                  ? 'text-[#22C55E]'
                  : ind.signal === 'STABLE' ? 'text-[#F59E0B]' : 'text-[#EF4444]'
              )}>{ind.signal}</span>
              <span className="text-xs text-[#C9A646] w-20 text-right">{ind.contribution}</span>
            </div>
          ))}
        </div>

        {/* Recession Probability */}
        <div className="mt-4 p-3 rounded-lg bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8B8B8B]">🚨 Recession Probability (12m):</span>
            <span className={cn("text-lg font-bold",
              regime.recessionProbability < 25 ? 'text-[#22C55E]' :
              regime.recessionProbability < 50 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
            )}>{regime.recessionProbability}%</span>
          </div>
          <ProgressBar
            value={regime.recessionProbability}
            color={regime.recessionProbability < 25 ? '#22C55E' : regime.recessionProbability < 50 ? '#F59E0B' : '#EF4444'}
            className="mt-2"
          />
        </div>
      </div>
    </Card>
  );
});
RegimeSnapshot.displayName = 'RegimeSnapshot';

// =====================================================
// KEY INDICATORS GRID (top movers from real data)
// =====================================================

const KeyIndicatorsGrid = memo(({ indicators }: { indicators: IndicatorData[] }) => {
  // Show high-impact indicators first, then by absolute change
  const sorted = useMemo(() => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return [...indicators]
      .sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact] || Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 8);
  }, [indicators]);

  return (
    <Card>
      <div className="p-6">
        <SectionHeader
          icon={BarChart2}
          title="Key Indicators"
          subtitle="High-impact economic data at a glance"
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {sorted.map((ind) => {
            const trendColor = ind.trend === 'improving' ? '#22C55E' : ind.trend === 'declining' ? '#EF4444' : '#F59E0B';
            const TrendIcon = ind.trend === 'improving' ? TrendingUp : ind.trend === 'declining' ? TrendingDown : Activity;

            return (
              <div
                key={ind.id}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors border border-transparent hover:border-[#C9A646]/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[#6B6B6B] uppercase tracking-wider">{ind.shortName}</span>
                  <Badge variant={ind.impact === 'high' ? 'danger' : ind.impact === 'medium' ? 'warning' : 'success'}>
                    {ind.impact === 'high' ? 'HIGH' : ind.impact === 'medium' ? 'MED' : 'LOW'}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-xl font-bold text-white">{ind.value}</span>
                  <span className="text-xs text-[#6B6B6B]">{ind.unit}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendIcon className="w-3 h-3" style={{ color: trendColor }} />
                  <span className="text-xs font-medium" style={{ color: trendColor }}>
                    {ind.change > 0 ? '+' : ''}{ind.change}{ind.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
});
KeyIndicatorsGrid.displayName = 'KeyIndicatorsGrid';

// =====================================================
// FED SNAPSHOT (compact for overview)
// =====================================================

const FedSnapshot = memo(({ fedRate, meetings, events }: {
  fedRate: number;
  meetings: { date: string; expectedRate: number; probability: number; decision: string; isNext?: boolean }[];
  events: { date: string; event: string; importance: string }[];
}) => {
  const nextMeeting = useMemo(() => meetings.find(m => m.isNext) || meetings[0], [meetings]);
  const nextCut = useMemo(() => meetings.find(m => m.decision === 'cut'), [meetings]);

  return (
    <Card>
      <div className="p-6">
        <SectionHeader icon={Banknote} title="Fed Snapshot" subtitle="Rate path & upcoming events" />

        {/* Current Rate */}
        <div className="p-4 rounded-xl mb-4" style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.1), transparent)', border: '1px solid rgba(201,166,70,0.2)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#8B8B8B]">Fed Funds Rate</span>
            <span className="text-3xl font-bold text-[#C9A646]">{fedRate}%</span>
          </div>
        </div>

        {/* Next Meeting */}
        {nextMeeting && (
          <div className="p-3 rounded-lg bg-white/[0.03] mb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B6B6B]">Next Meeting</p>
                <p className="text-sm text-white font-medium">
                  {new Date(nextMeeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <p className={cn("text-sm font-bold",
                  nextMeeting.decision === 'cut' ? 'text-[#22C55E]' :
                  nextMeeting.decision === 'hike' ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                )}>{nextMeeting.decision.toUpperCase()}</p>
                <p className="text-xs text-[#8B8B8B]">{nextMeeting.probability}% probability</p>
              </div>
            </div>
          </div>
        )}

        {/* First Expected Cut */}
        {nextCut && (
          <div className="p-3 rounded-lg bg-[#22C55E]/5 border border-[#22C55E]/20 mb-3">
            <p className="text-xs text-[#22C55E] font-semibold">First Cut Expected</p>
            <p className="text-sm text-white">
              {new Date(nextCut.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              <span className="text-xs text-[#8B8B8B] ml-2">({nextCut.probability}% prob)</span>
            </p>
          </div>
        )}

        {/* Upcoming Events */}
        <div className="mt-4">
          <p className="text-xs text-[#6B6B6B] font-semibold mb-2">Upcoming Fed Events</p>
          <div className="space-y-1">
            {events.slice(0, 4).map((evt, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full",
                    evt.importance === 'high' ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'
                  )} />
                  <span className="text-xs text-white">{evt.date}</span>
                </div>
                <span className="text-xs text-[#8B8B8B] truncate ml-2 max-w-[200px]">{evt.event}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
});
FedSnapshot.displayName = 'FedSnapshot';

// =====================================================
// MAIN OVERVIEW TAB
// =====================================================

function OverviewTab() {
  const { data, isLoading, error, refresh, lastUpdated } = useOverview();

  if (error) return <ErrorState message={error} onRetry={refresh} />;

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <SectionSkeleton height="h-80" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionSkeleton height="h-64" />
          <SectionSkeleton height="h-64" />
        </div>
        <SectionSkeleton height="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Narrative - built from real data */}
      <AIMacroNarrative
        indicators={data.indicators}
        regime={data.regime}
        fedRate={data.fed.currentRate}
      />

      {/* Two-column: Regime + Fed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LazySection fallbackHeight="h-[500px]">
          <RegimeSnapshot regime={data.regime} />
        </LazySection>
        <LazySection fallbackHeight="h-[400px]">
          <FedSnapshot
            fedRate={data.fed.currentRate}
            meetings={data.fed.meetings}
            events={data.fed.events}
          />
        </LazySection>
      </div>

      {/* Key Indicators Grid */}
      <LazySection fallbackHeight="h-64">
        <KeyIndicatorsGrid indicators={data.indicators} />
      </LazySection>

      {/* Last update info */}
      {lastUpdated && (
        <div className="flex items-center justify-center gap-2 text-xs text-[#6B6B6B]">
          <CheckCircle className="w-3 h-3 text-[#22C55E]" />
          Data from FRED & Yahoo Finance • Updated {new Date(lastUpdated).toLocaleTimeString()}
          <button onClick={refresh} className="text-[#C9A646] hover:text-[#F4D97B] ml-2 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(OverviewTab);