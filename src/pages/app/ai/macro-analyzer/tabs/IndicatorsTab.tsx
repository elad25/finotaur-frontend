// tabs/IndicatorsTab.tsx
// =====================================================
// 📊 MACRO PULSE - KEY INDICATORS DASHBOARD
// Full-width gauges showing expansion/contraction status
// for ISM, GDP, CPI, PPI, JOLTS, Michigan Sentiment
// with directional forecasts (rising/falling)
// =====================================================

import React, { memo, useMemo } from 'react';
import {
  Activity, TrendingUp, Thermometer, Factory,
  RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Minus, Target, Users, BarChart2, Gauge, Brain,
  Shield, Zap
} from 'lucide-react';
import {
  Card, SectionHeader, Badge, cn, Skeleton
} from '../shared/ui';
import { useIndicators, useRegime, type IndicatorData, type RegimeData } from '../shared/api';

// =====================================================
// GAUGE INDICATOR DEFINITIONS
// Each defines: how to find the data, thresholds,
// what "expansion" vs "contraction" means
// =====================================================

interface GaugeDef {
  id: string;
  label: string;
  fullName: string;
  category: 'activity' | 'inflation' | 'sentiment';
  indicatorIds: string[];
  expansionThreshold: number;     // above = expansion
  targetValue?: number;           // optimal target (e.g. 2% for CPI)
  rangeMin: number;               // gauge min
  rangeMax: number;               // gauge max
  invertSignal: boolean;          // true = lower is better (inflation)
  expandLabel: string;
  contractLabel: string;
  description: string;
}

const GAUGE_DEFS: GaugeDef[] = [
  {
    id: 'ismMfg', label: 'ISM PMI', fullName: 'ISM Manufacturing PMI',
    category: 'activity', indicatorIds: ['ismMfg'],
    expansionThreshold: 50, rangeMin: 40, rangeMax: 65, invertSignal: false,
    expandLabel: 'Expansion', contractLabel: 'Contraction',
    description: 'Manufacturing activity. Above 50 = expanding.',
  },
  {
    id: 'gdp', label: 'GDP', fullName: 'GDP Growth (QoQ Annualized)',
    category: 'activity', indicatorIds: ['gdp'],
    expansionThreshold: 0, rangeMin: -3, rangeMax: 6, invertSignal: false,
    expandLabel: 'Growth', contractLabel: 'Recession',
    description: 'Overall economic output growth rate.',
  },
  {
    id: 'cpi', label: 'CPI', fullName: 'Consumer Price Index YoY',
    category: 'inflation', indicatorIds: ['cpi'],
    expansionThreshold: 2, targetValue: 2, rangeMin: 0, rangeMax: 6, invertSignal: true,
    expandLabel: 'Above Target', contractLabel: 'Below Target',
    description: "Consumer inflation. Fed's 2% target.",
  },
  {
    id: 'ppi', label: 'PPI', fullName: 'Producer Price Index YoY',
    category: 'inflation', indicatorIds: ['ppi'],
    expansionThreshold: 2, targetValue: 2, rangeMin: -1, rangeMax: 8, invertSignal: true,
    expandLabel: 'Rising Costs', contractLabel: 'Easing Costs',
    description: 'Wholesale prices — leads CPI by 1-3 months.',
  },
  {
    id: 'corePce', label: 'Core PCE', fullName: 'Core PCE (Fed Preferred)',
    category: 'inflation', indicatorIds: ['corePce'],
    expansionThreshold: 2, targetValue: 2, rangeMin: 0, rangeMax: 5, invertSignal: true,
    expandLabel: 'Above Target', contractLabel: 'At/Below Target',
    description: "Fed's preferred inflation gauge. Target 2%.",
  },
  {
    id: 'sentiment', label: 'Michigan', fullName: 'U. of Michigan Consumer Sentiment',
    category: 'sentiment', indicatorIds: ['consumerSentiment'],
    expansionThreshold: 70, rangeMin: 50, rangeMax: 110, invertSignal: false,
    expandLabel: 'Optimistic', contractLabel: 'Pessimistic',
    description: 'Consumer confidence — drives spending outlook.',
  },
  {
    id: 'unemployment', label: 'Unemployment', fullName: 'Unemployment Rate',
    category: 'sentiment', indicatorIds: ['unemployment'],
    expansionThreshold: 4.5, rangeMin: 3, rangeMax: 7, invertSignal: true,
    expandLabel: 'Rising', contractLabel: 'Tight Labor',
    description: 'Labor market health. Below 4.5% = strong.',
  },
  {
    id: 'nfp', label: 'NFP', fullName: 'Non-Farm Payrolls',
    category: 'sentiment', indicatorIds: ['nfp'],
    expansionThreshold: 100, rangeMin: -200, rangeMax: 500, invertSignal: false,
    expandLabel: 'Strong Hiring', contractLabel: 'Weak Hiring',
    description: 'Monthly jobs added. Above 100K = healthy.',
  },
];

// =====================================================
// SINGLE GAUGE ROW
// Full-width horizontal bar showing value position
// with expansion/contraction zones
// =====================================================

const MacroGauge = memo(({ def, indicator }: {
  def: GaugeDef;
  indicator: IndicatorData | null;
}) => {
  const value = indicator?.value ?? null;
  const trend = indicator?.trend ?? 'stable';
  const change = indicator?.change ?? 0;
  const prevValue = indicator?.previousValue ?? null;

  // Calculate position on gauge (0-100%)
  const position = useMemo(() => {
    if (value == null) return 50;
    const clamped = Math.max(def.rangeMin, Math.min(def.rangeMax, value));
    return ((clamped - def.rangeMin) / (def.rangeMax - def.rangeMin)) * 100;
  }, [value, def]);

  // Threshold position
  const thresholdPos = useMemo(() => {
    return ((def.expansionThreshold - def.rangeMin) / (def.rangeMax - def.rangeMin)) * 100;
  }, [def]);

  // Target position (if exists)
  const targetPos = useMemo(() => {
    if (def.targetValue == null) return null;
    return ((def.targetValue - def.rangeMin) / (def.rangeMax - def.rangeMin)) * 100;
  }, [def]);

  // Status determination
  const isExpansion = value != null
    ? def.invertSignal
      ? value <= def.expansionThreshold
      : value >= def.expansionThreshold
    : null;

  // Direction forecast based on trend
  const direction = trend === 'improving'
    ? (def.invertSignal ? 'falling' : 'rising')
    : trend === 'declining'
      ? (def.invertSignal ? 'rising' : 'falling')
      : 'stable';

  const directionLabel = direction === 'rising' ? 'Expected ↑' : direction === 'falling' ? 'Expected ↓' : 'Holding →';
  const statusColor = isExpansion === null ? '#6B6B6B' : isExpansion ? '#22C55E' : '#EF4444';
  const statusLabel = isExpansion === null ? 'No Data' : isExpansion ? def.expandLabel : def.contractLabel;

  const TrendIcon = trend === 'improving' ? ArrowUpRight : trend === 'declining' ? ArrowDownRight : Minus;
  const trendColor = trend === 'improving' ? '#22C55E' : trend === 'declining' ? '#EF4444' : '#F59E0B';

  // For inflation indicators, invert the trend color logic
  const displayTrendColor = def.invertSignal
    ? (trend === 'improving' ? '#22C55E' : trend === 'declining' ? '#EF4444' : '#F59E0B')
    : trendColor;

  if (value == null) {
    return (
      <div className="p-3 rounded-xl bg-white/[0.02]" style={{ border: '1px solid rgba(201,166,70,0.08)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[#6B6B6B]">{def.label}</p>
          <Skeleton className="h-5 w-16 rounded" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl transition-all hover:bg-white/[0.02]" style={{
      background: 'rgba(201,166,70,0.02)',
      border: `1px solid ${statusColor}20`,
    }}>
      {/* Header Row */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs font-semibold text-white">{def.label}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: `${displayTrendColor}10`, border: `1px solid ${displayTrendColor}25` }}>
            <TrendIcon className="w-2.5 h-2.5" style={{ color: displayTrendColor }} />
            <span className="text-[10px] font-medium" style={{ color: displayTrendColor }}>{directionLabel}</span>
          </div>
          <div className="px-2 py-0.5 rounded text-[10px] font-bold" style={{
            color: statusColor,
            background: `${statusColor}10`,
            border: `1px solid ${statusColor}30`,
          }}>
            {statusLabel}
          </div>
        </div>
      </div>

      {/* Value Row */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-lg font-bold text-white">{value}</span>
        <span className="text-[10px] text-[#6B6B6B]">{indicator?.unit}</span>
        <span className="text-[10px] font-medium ml-1" style={{ color: displayTrendColor }}>
          {change > 0 ? '+' : ''}{change}{indicator?.unit}
        </span>
        {prevValue != null && (
          <span className="text-[9px] text-[#6B6B6B]">from {prevValue}{indicator?.unit}</span>
        )}
      </div>

      {/* Gauge Bar */}
      <div className="relative h-2 rounded-full overflow-visible mb-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {/* Left zone (contraction / below target) */}
        <div className="absolute left-0 top-0 h-full rounded-l-full" style={{
          width: `${thresholdPos}%`,
          background: def.invertSignal
            ? 'linear-gradient(90deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))'
            : 'linear-gradient(90deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
        }} />
        {/* Right zone (expansion / above target) */}
        <div className="absolute top-0 h-full rounded-r-full" style={{
          left: `${thresholdPos}%`,
          width: `${100 - thresholdPos}%`,
          background: def.invertSignal
            ? 'linear-gradient(90deg, rgba(239,68,68,0.05), rgba(239,68,68,0.15))'
            : 'linear-gradient(90deg, rgba(34,197,94,0.05), rgba(34,197,94,0.15))',
        }} />

        {/* Threshold line */}
        <div className="absolute top-[-3px] w-0.5 h-[14px]" style={{
          left: `${thresholdPos}%`,
          background: 'rgba(201,166,70,0.5)',
        }} />

        {/* Target line (if different from threshold) */}
        {targetPos != null && Math.abs(targetPos - thresholdPos) > 2 && (
          <div className="absolute top-[-3px] w-0.5 h-[14px]" style={{
            left: `${targetPos}%`,
            background: 'rgba(245,158,11,0.5)',
            borderStyle: 'dashed',
          }} />
        )}

        {/* Value indicator (current position) */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700" style={{ left: `${Math.max(2, Math.min(98, position))}%` }}>
          <div className="w-4 h-4 rounded-full border-2 shadow-lg" style={{
            borderColor: statusColor,
            background: '#0d0b08',
            boxShadow: `0 0 8px ${statusColor}40`,
          }} />
        </div>
      </div>

      {/* Scale labels */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[8px] text-[#6B6B6B] font-mono">{def.rangeMin}{indicator?.unit}</span>
        <span className="text-[8px] text-[#C9A646] font-mono">{def.expansionThreshold}{indicator?.unit}</span>
        <span className="text-[8px] text-[#6B6B6B] font-mono">{def.rangeMax}{indicator?.unit}</span>
      </div>
    </div>
  );
});
MacroGauge.displayName = 'MacroGauge';

// =====================================================
// AGGREGATE HEALTH SCORE
// =====================================================

const MacroHealthScore = memo(({ indicators, regime }: {
  indicators: IndicatorData[];
  regime: RegimeData | null;
}) => {
  const health = useMemo(() => {
    let bullish = 0, bearish = 0, total = 0;

    GAUGE_DEFS.forEach(def => {
      const ind = indicators.find(i => def.indicatorIds.includes(i.id));
      if (!ind) return;
      total++;
      const isGood = def.invertSignal
        ? ind.value <= def.expansionThreshold
        : ind.value >= def.expansionThreshold;
      if (isGood) bullish++;
      else bearish++;
    });

    const score = total > 0 ? Math.round((bullish / total) * 100) : 50;
    const improving = indicators.filter(i => i.trend === 'improving').length;
    const declining = indicators.filter(i => i.trend === 'declining').length;

    return { score, bullish, bearish, total, improving, declining };
  }, [indicators]);

  const overallSignal = health.score >= 65 ? 'EXPANSION' : health.score >= 40 ? 'MIXED' : 'CONTRACTION';
  const overallColor = health.score >= 65 ? '#22C55E' : health.score >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <Card highlight>
      <div className="relative p-6">
        <div className="absolute top-0 left-0 w-1 h-full" style={{
          background: `linear-gradient(to bottom, ${overallColor}, ${overallColor}40, transparent)`
        }} />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
              background: `${overallColor}15`, border: `1px solid ${overallColor}30`
            }}>
              <Gauge className="w-6 h-6" style={{ color: overallColor }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Macro Pulse</h2>
              <p className="text-xs text-[#8B8B8B]">Key economic indicators — expansion vs contraction</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold px-4 py-1.5 rounded-xl" style={{
              color: overallColor,
              background: `${overallColor}10`,
              border: `1px solid ${overallColor}30`,
            }}>
              {overallSignal}
            </div>
            {regime && (
              <p className="text-[10px] text-[#6B6B6B] mt-1">
                Regime: {regime.stage} · {regime.confidence}% confidence
              </p>
            )}
          </div>
        </div>

        {/* Health bar */}
        <div className="h-2 rounded-full overflow-hidden flex mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full transition-all duration-700" style={{ width: `${(health.bullish / Math.max(health.total, 1)) * 100}%`, background: '#22C55E' }} />
          <div className="h-full transition-all duration-700" style={{ width: `${((health.total - health.bullish - health.bearish) / Math.max(health.total, 1)) * 100}%`, background: '#F59E0B' }} />
          <div className="h-full transition-all duration-700" style={{ width: `${(health.bearish / Math.max(health.total, 1)) * 100}%`, background: '#EF4444' }} />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-[#22C55E]">{health.bullish} in expansion</span>
          <span className="text-[#6B6B6B]">{health.improving} improving · {health.declining} declining</span>
          <span className="text-[#EF4444]">{health.bearish} in contraction</span>
        </div>
      </div>
    </Card>
  );
});
MacroHealthScore.displayName = 'MacroHealthScore';

// =====================================================
// LOADING SKELETON
// =====================================================

const IndicatorsLoadingSkeleton = memo(() => (
  <div className="space-y-6">
    <Card highlight>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div><Skeleton className="h-6 w-32 mb-1" /><Skeleton className="h-3 w-56" /></div>
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-2 w-full rounded-full mb-3" />
        <div className="flex justify-between"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-24" /></div>
      </div>
    </Card>
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className="p-5 rounded-2xl bg-white/[0.02]">
        <div className="flex items-center justify-between mb-3">
          <div><Skeleton className="h-4 w-20 mb-1" /><Skeleton className="h-3 w-44" /></div>
          <div className="flex gap-2"><Skeleton className="h-6 w-20 rounded-lg" /><Skeleton className="h-6 w-24 rounded-lg" /></div>
        </div>
        <Skeleton className="h-6 w-24 mb-3" />
        <Skeleton className="h-3 w-full rounded-full mb-2" />
        <div className="flex justify-between"><Skeleton className="h-2 w-8" /><Skeleton className="h-2 w-8" /><Skeleton className="h-2 w-8" /></div>
      </div>
    ))}
  </div>
));
IndicatorsLoadingSkeleton.displayName = 'IndicatorsLoadingSkeleton';

// =====================================================
// MAIN INDICATORS TAB
// =====================================================

function IndicatorsTab() {
  const { data: indicators, isLoading: loadingInd, error: errorInd, refresh: refreshInd } = useIndicators();
  const { data: regime } = useRegime();

  const gaugeData = useMemo(() => {
    if (!indicators) return [];
    return GAUGE_DEFS.map(def => {
      const ind = indicators.find(i => def.indicatorIds.includes(i.id)) || null;
      return { def, indicator: ind };
    });
  }, [indicators]);

  if (errorInd) {
    return (
      <Card>
        <div className="p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-[#EF4444] mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Failed to load indicators</p>
          <p className="text-sm text-[#8B8B8B] mb-4">{errorInd}</p>
          <button onClick={refreshInd} className="px-4 py-2 rounded-lg text-sm text-[#C9A646] border border-[#C9A646]/30 hover:bg-[#C9A646]/10">
            <RefreshCw className="w-4 h-4 inline mr-2" /> Retry
          </button>
        </div>
      </Card>
    );
  }

  if (loadingInd || !indicators) return <IndicatorsLoadingSkeleton />;

  // Group by category
  const activityGauges = gaugeData.filter(g => g.def.category === 'activity');
  const inflationGauges = gaugeData.filter(g => g.def.category === 'inflation');
  const sentimentGauges = gaugeData.filter(g => g.def.category === 'sentiment');

  return (
    <div className="space-y-6">
      {/* Overall Health */}
      <MacroHealthScore indicators={indicators} regime={regime} />

      {/* Activity Section */}
      <Card>
        <div className="p-6">
          <SectionHeader icon={Activity} title="Economic Activity" subtitle="Growth & employment — expansion vs contraction" />
          <div className="space-y-2">
            {activityGauges.map(({ def, indicator }) => (
              <MacroGauge key={def.id} def={def} indicator={indicator} />
            ))}
          </div>
        </div>
      </Card>

      {/* Inflation Section */}
      <Card>
        <div className="p-6">
          <SectionHeader icon={Thermometer} title="Inflation Pressure" subtitle="Price stability — above or below Fed's 2% target" />
          <div className="space-y-2">
            {inflationGauges.map(({ def, indicator }) => (
              <MacroGauge key={def.id} def={def} indicator={indicator} />
            ))}
          </div>
        </div>
      </Card>

      {/* Sentiment Section */}
      <Card>
        <div className="p-6">
          <SectionHeader icon={Users} title="Labor & Sentiment" subtitle="Employment health & consumer confidence" />
          <div className="space-y-2">
            {sentimentGauges.map(({ def, indicator }) => (
              <MacroGauge key={def.id} def={def} indicator={indicator} />
            ))}
          </div>
        </div>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 text-xs text-[#6B6B6B]">
        <Shield className="w-3 h-3 text-[#C9A646]" />
        Data from FRED · Updated automatically
        <button onClick={refreshInd} className="text-[#C9A646] hover:text-[#F4D97B] ml-2 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
    </div>
  );
}

export default memo(IndicatorsTab);