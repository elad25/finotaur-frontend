// tabs/ReportsTab.tsx
// =====================================================
// 📊 REPORTS TAB — PREMIUM COMPACT + DEEP ANALYSIS
// Each major macro report gets its own sub-tab:
// ISM, GDP, CPI, PPI, FOMC, NFP, PCE, Retail, Housing
// 
// KEY FEATURES:
// ✅ Rich data-driven analysis (zero AI cost)
// ✅ ISM charts display with full historical data
// ✅ Compact layout with expandable indicator rows
// ✅ Cross-indicator signal analysis
// ✅ Actionable positioning insights per report
// ✅ Fixed UTF-8 encoding
// =====================================================

import React, { memo, useMemo, useState, useCallback, useRef } from 'react';
import {
  FileText, Factory, TrendingUp, Thermometer, Banknote,
  Users, ShoppingCart, Home, BarChart2, Brain,
  Calendar, ExternalLink, RefreshCw, AlertTriangle,
  ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight, Minus,
  Target, Clock, Shield, Activity, Info, Zap, AlertCircle,
  Crosshair, Layers, Eye, MessageSquareQuote, Briefcase,
  TrendingDown, Hash, Quote, Star
} from 'lucide-react';
import {
  Card, SectionHeader, Badge, ProgressBar,
  cn, SectionSkeleton, Skeleton, MiniChart, LazySection
} from '../shared/ui';
import {
  useIndicators, useFedData, useISMIntelligence, useISMSectorAI, useGDPIntelligence, useCPIIntelligence, usePPIIntelligence,
  type IndicatorData, type FedData, type AIResult,
  type ISMIntelligenceData, type ISMQuote, type ISMSectorRanking, type ISMTradeIdea,
  type GDPIntelligenceData, type GDPComponentData,
  type CPIIntelligenceData, type PPIIntelligenceData
} from '../shared/api';

// =====================================================
// REPORT DEFINITIONS
// =====================================================

interface ReportDef {
  id: string;
  name: string;
  fullName: string;
  icon: React.ElementType;
  source: string;
  sourceUrl: string;
  frequency: string;
  indicatorIds: string[];
  description: string;
  whyItMatters: string;
  keyComponents: string[];
  fedRelevance: string;
}

const REPORT_DEFS: ReportDef[] = [
  {
    id: 'ism',
    name: 'ISM',
    fullName: 'ISM Manufacturing & Services PMI',
    icon: Factory,
    source: 'Institute for Supply Management',
    sourceUrl: 'https://www.ismworld.org',
    frequency: 'Monthly (1st & 3rd business day)',
    indicatorIds: ['ismMfg', 'ismNewOrders', 'ismProduction', 'ismEmployment', 'ismPrices', 'ismBacklog'],
    description: 'Purchasing Managers Index measuring manufacturing and services activity. Above 50 = expansion.',
    whyItMatters: 'Leading indicator — PMI turns before GDP. Highly correlated with corporate earnings growth.',
    keyComponents: ['New Orders', 'Production', 'Employment', 'Supplier Deliveries', 'Inventories', 'Prices Paid'],
    fedRelevance: 'Weak ISM → dovish Fed. Strong ISM + high Prices Paid → hawkish signal.',
  },
  {
    id: 'gdp',
    name: 'GDP',
    fullName: 'Gross Domestic Product',
    icon: TrendingUp,
    source: 'Bureau of Economic Analysis (BEA)',
    sourceUrl: 'https://www.bea.gov',
    frequency: 'Quarterly (Advance, 2nd, 3rd estimates)',
    indicatorIds: ['gdp'],
    description: 'Total value of goods and services produced. The broadest measure of economic activity.',
    whyItMatters: 'The ultimate scorecard — tells you if the economy is growing or contracting.',
    keyComponents: ['Real vs Nominal GDP', 'Consumer Spending (PCE)', 'GDP Deflator', 'Business Investment', 'Final Sales', 'GDI'],
    fedRelevance: 'Strong GDP reduces cut urgency. Weak GDP accelerates easing timeline.',
  },
  {
    id: 'cpi',
    name: 'CPI',
    fullName: 'Consumer Price Index',
    icon: Thermometer,
    source: 'Bureau of Labor Statistics (BLS)',
    sourceUrl: 'https://www.bls.gov/cpi/',
    frequency: 'Monthly (around 10th-14th)',
    indicatorIds: ['cpi', 'coreCpi'],
    description: 'Year-over-year change in consumer prices. The most-watched inflation measure by markets.',
    whyItMatters: 'Moves markets more than almost any other release. Directly impacts Fed rate decisions.',
    keyComponents: ['Shelter', 'Food', 'Energy', 'Used Cars', 'Medical Care', 'Services ex-Shelter'],
    fedRelevance: 'CPI above target → hawkish. Declining CPI → opens door for cuts.',
  },
  {
    id: 'ppi',
    name: 'PPI',
    fullName: 'Producer Price Index',
    icon: Factory,
    source: 'Bureau of Labor Statistics (BLS)',
    sourceUrl: 'https://www.bls.gov/ppi/',
    frequency: 'Monthly (around 11th-15th)',
    indicatorIds: ['ppi'],
    description: 'Wholesale price changes before they reach consumers. A leading indicator for CPI.',
    whyItMatters: 'Leads CPI by 1-3 months. Rising PPI signals future consumer inflation.',
    keyComponents: ['Final Demand Goods', 'Final Demand Services', 'Food', 'Energy', 'Trade Services'],
    fedRelevance: 'Feeds into PCE calculation. Persistently high PPI → Fed stays restrictive.',
  }
  
];

// =====================================================
// REPORT SUB-TAB SELECTOR
// =====================================================

const ReportSelector = memo(({ reports, activeId, onChange }: {
  reports: ReportDef[];
  activeId: string;
  onChange: (id: string) => void;
}) => (
  <div className="flex flex-wrap gap-1.5 mb-4">
    {reports.map((report) => {
      const Icon = report.icon;
      const isActive = activeId === report.id;
      return (
        <button
          key={report.id}
          onClick={() => onChange(report.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
            isActive ? "text-black" : "text-[#8B8B8B] hover:text-[#C9A646]"
          )}
          style={isActive
            ? { background: 'linear-gradient(135deg, #C9A646, #F4D97B)' }
            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,166,70,0.08)' }
          }
        >
          <Icon className="h-3 w-3" />
          {report.name}
        </button>
      );
    })}
  </div>
));
ReportSelector.displayName = 'ReportSelector';

// =====================================================
// INTERACTIVE CHART
// =====================================================

const CH = 280;
const CP = { top: 20, right: 40, bottom: 32, left: 56 };
const THRESHOLD_MAP: Record<string, number> = {
  'ismMfg': 50, 'ismNewOrders': 50, 'ismProduction': 50,
  'ismEmployment': 50, 'ismPrices': 50,
  'cpi': 2, 'coreCpi': 2, 'pce': 2, 'corePce': 2
};

function getFreqForId(id: string) { return id === 'gdp' ? 'Quarterly' : 'Monthly'; }

function estimateDates(data: number[], lastUpdated: string, freq: string): string[] {
  const end = new Date(lastUpdated);
  const step = freq.toLowerCase().includes('quarter') ? 3 : 1;
  return data.map((_, i) => {
    const d = new Date(end);
    d.setMonth(d.getMonth() - (data.length - 1 - i) * step);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  });
}

const ReportChart = memo(({ data, color, unit, name, lastUpdated, frequency, threshold }: {
  data: number[]; color: string; unit: string; name: string;
  lastUpdated: string; frequency: string; threshold?: number;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hi, setHi] = useState<number | null>(null);
  const [tp, setTp] = useState({ x: 0, y: 0 });

  const cd = useMemo(() => {
    if (!data || data.length < 2) return null;
    const dates = estimateDates(data, lastUpdated, frequency);
    const pts = data.map((value, index) => ({ value, label: dates[index], index }));
    const vals = pts.map(p => p.value);
    const dMin = Math.min(...vals), dMax = Math.max(...vals);
    const pad = (dMax - dMin) * 0.15 || 1;
    let yMin = dMin - pad, yMax = dMax + pad;
    if (threshold != null) { yMin = Math.min(yMin, threshold - pad); yMax = Math.max(yMax, threshold + pad); }
    return { pts, yMin, yMax };
  }, [data, lastUpdated, frequency, threshold]);

  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!cd || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const W = 900;
    const scaleX = W / r.width;
    const svgX = (e.clientX - r.left) * scaleX;
    const chartWidth = W - CP.left - CP.right;

    // Snap to nearest point by X axis only (vertical band)
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < cd.pts.length; i++) {
      const px = CP.left + (i / (cd.pts.length - 1)) * chartWidth;
      const dist = Math.abs(svgX - px);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    setHi(bestIdx);
    const ptSvgX = CP.left + (bestIdx / (cd.pts.length - 1)) * chartWidth;
    setTp({ x: ptSvgX / scaleX, y: e.clientY - r.top });
  }, [cd]);

  if (!cd || cd.pts.length < 2) return null;
  const { pts, yMin, yMax } = cd;
  const W = 900, cW = W - CP.left - CP.right, cH = CH - CP.top - CP.bottom;
  const gX = (i: number) => CP.left + (i / (pts.length - 1)) * cW;
  const gY = (v: number) => CP.top + (1 - (v - yMin) / (yMax - yMin)) * cH;
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${gX(i).toFixed(1)},${gY(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${gX(pts.length - 1).toFixed(1)},${(CP.top + cH).toFixed(1)} L${CP.left},${(CP.top + cH).toFixed(1)} Z`;
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (i / 4) * (yMax - yMin));
  const xStep = Math.max(1, Math.floor(pts.length / 5));
  const xLabels = pts.filter((_, i) => i % xStep === 0 || i === pts.length - 1);
  const gid = `g${name.replace(/[^a-zA-Z0-9]/g, '')}`;
  const hp = hi != null ? pts[hi] : null;

  return (
    <div className="relative w-full">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${CH}`} className="w-full cursor-crosshair"
        style={{ height: 'auto', minHeight: '240px', maxHeight: '320px' }}
        onMouseMove={onMove} onMouseLeave={() => setHi(null)} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={`${gid}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="40%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          <filter id={`${gid}g`}><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={CP.left} x2={W - CP.right} y1={gY(t)} y2={gY(t)} stroke="rgba(201,166,70,0.06)" strokeWidth="1" strokeDasharray={i === 0 || i === 4 ? '0' : '4 4'} />
            <text x={CP.left - 8} y={gY(t) + 4} textAnchor="end" fill="#6B6B6B" fontSize="10" fontFamily="monospace">{t.toFixed(t % 1 === 0 ? 0 : 1)}{unit}</text>
          </g>
        ))}
        {threshold != null && threshold >= yMin && threshold <= yMax && (
          <g>
            <line x1={CP.left} x2={W - CP.right} y1={gY(threshold)} y2={gY(threshold)} stroke="rgba(245,158,11,0.35)" strokeWidth="1.5" strokeDasharray="6 4" />
            <text x={W - CP.right + 4} y={gY(threshold) + 4} fill="#F59E0B" fontSize="9" fontFamily="monospace">{threshold}{unit}</text>
          </g>
        )}
        {xLabels.map(p => (
          <text key={p.index} x={gX(p.index)} y={CH - 6} textAnchor="middle" fill="#6B6B6B" fontSize="9" fontFamily="monospace">{p.label}</text>
        ))}
        <path d={area} fill={`url(#${gid}f)`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${gid}g)`} />
        {pts.map((p, i) => (
          <circle key={i} cx={gX(i)} cy={gY(p.value)} r={i === pts.length - 1 ? 4.5 : 3} fill={i === pts.length - 1 ? color : '#0d0b08'} stroke={color} strokeWidth={i === pts.length - 1 ? 0 : 1.5} />
        ))}
        {hi != null && hp && (
          <g>
            <line x1={gX(hi)} x2={gX(hi)} y1={CP.top} y2={CP.top + cH} stroke="rgba(201,166,70,0.25)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={gX(hi)} cy={gY(hp.value)} r="5" fill="#0d0b08" stroke={color} strokeWidth="2.5" />
          </g>
        )}
      </svg>
      {hi != null && hp && (
        <div className="absolute pointer-events-none z-50" style={{ left: `${tp.x}px`, top: `${tp.y - 64}px`, transform: `translateX(${tp.x > (svgRef.current?.getBoundingClientRect().width || 800) / 2 ? '-110%' : '10%'})` }}>
          <div className="px-3 py-2 rounded-lg shadow-2xl" style={{ background: 'rgba(13,11,8,0.95)', border: '1px solid rgba(201,166,70,0.25)', backdropFilter: 'blur(12px)' }}>
            <p className="text-[10px] text-[#C9A646] font-medium mb-0.5">{hp.label}</p>
            <p className="text-base font-bold text-white">{hp.value.toFixed(hp.value % 1 === 0 ? 0 : 2)}{unit}</p>
            {hi > 0 && (() => { const diff = hp.value - pts[hi - 1].value; return (
              <p className={cn("text-[9px] font-medium", diff > 0 ? 'text-[#22C55E]' : diff < 0 ? 'text-[#EF4444]' : 'text-[#F59E0B]')}>
                {diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : '→ '}{diff.toFixed(2)}{unit} vs prior
              </p>
            ); })()}
          </div>
        </div>
      )}
    </div>
  );
});
ReportChart.displayName = 'ReportChart';

// =====================================================
// COMPACT INDICATOR ROW
// =====================================================

function computeMoM(data: number[]): number[] {
  if (data.length < 2) return data;
  return data.map((val, i) => i === 0 ? 0 : Math.round((val - data[i - 1]) * 100) / 100);
}

const IndicatorRow = memo(({ ind, isExpanded, onToggle }: {
  ind: IndicatorData;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const [viewMode, setViewMode] = useState<'level' | 'mom'>('level');
  const hasChart = ind.historicalData && ind.historicalData.length >= 2;

  const TrendIcon = ind.trend === 'improving' ? ArrowUpRight :
                    ind.trend === 'declining' ? ArrowDownRight : Minus;
  const trendColor = ind.trend === 'improving' ? '#22C55E' :
                     ind.trend === 'declining' ? '#EF4444' : '#F59E0B';

  const chartData = useMemo(() => {
    if (!ind.historicalData || ind.historicalData.length < 2) return null;
    if (viewMode === 'mom') return computeMoM(ind.historicalData);
    return ind.historicalData;
  }, [ind.historicalData, viewMode]);

  const chartThreshold = viewMode === 'level' ? THRESHOLD_MAP[ind.id] : 0;

  // Mini sparkline
  const sparkline = useMemo(() => {
    if (!ind.historicalData || ind.historicalData.length < 3) return null;
    const d = ind.historicalData.slice(-12);
    const max = Math.max(...d), min = Math.min(...d);
    const range = max - min || 1;
    const h = 22, w = 56;
    const pts = d.map((v, i) => `${(i / (d.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
    return { pts, w, h };
  }, [ind.historicalData]);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: isExpanded ? 'rgba(201,166,70,0.04)' : 'rgba(255,255,255,0.02)',
        border: isExpanded ? '1px solid rgba(201,166,70,0.15)' : '1px solid rgba(201,166,70,0.06)',
      }}
    >
      <button
        onClick={onToggle}
        disabled={!hasChart}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 transition-colors",
          hasChart ? "hover:bg-white/[0.02] cursor-pointer" : "cursor-default"
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {hasChart ? (
            <ChevronRight className={cn("w-3 h-3 text-[#6B6B6B] transition-transform flex-shrink-0", isExpanded && "rotate-90")} />
          ) : (
            <div className="w-3 h-3 flex-shrink-0" />
          )}
          <span className="text-xs text-[#8B8B8B] truncate w-28 text-left">{ind.shortName || ind.name}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-[#C9A646] tabular-nums">{ind.value}</span>
            <span className="text-[10px] text-[#6B6B6B]">{ind.unit}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: `${trendColor}10` }}>
            <TrendIcon className="w-3 h-3" style={{ color: trendColor }} />
            <span className="text-[11px] font-medium tabular-nums" style={{ color: trendColor }}>
              {ind.change > 0 ? '+' : ''}{ind.change}{ind.unit}
            </span>
          </div>

          {sparkline && !isExpanded && (
            <svg width={sparkline.w} height={sparkline.h} className="opacity-40 hidden sm:block">
              <polyline points={sparkline.pts} fill="none" stroke={trendColor} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}

          <span className="text-[10px] text-[#6B6B6B] tabular-nums hidden md:inline">
            from {ind.previousValue}{ind.unit}
          </span>

          <Badge variant={ind.trend === 'improving' ? 'success' : ind.trend === 'declining' ? 'danger' : 'warning'}>
            {ind.trend.toUpperCase()}
          </Badge>
        </div>
      </button>

      {isExpanded && chartData && chartData.length > 1 && (
        <div className="px-4 pb-3">
          {ind.historicalData && ind.historicalData.length > 3 && (
            <div className="flex justify-end mb-1">
              <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid rgba(201,166,70,0.15)' }}>
                {(['level', 'mom'] as const).map(m => (
                  <button
                    key={m}
                    onClick={(e) => { e.stopPropagation(); setViewMode(m); }}
                    className={cn("px-2.5 py-1 text-[10px] font-medium transition-all",
                      viewMode === m ? 'text-black' : 'text-[#8B8B8B] hover:text-[#C9A646]'
                    )}
                    style={viewMode === m ? { background: 'linear-gradient(135deg, #C9A646, #F4D97B)' } : {}}
                  >
                    {m === 'level' ? 'Level' : 'MoM Δ'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <ReportChart
            data={chartData}
            color={trendColor}
            unit={ind.unit}
            name={`${ind.shortName || ind.id}-${viewMode}`}
            lastUpdated={ind.lastUpdated}
            frequency={getFreqForId(ind.id)}
            threshold={chartThreshold}
          />
        </div>
      )}
    </div>
  );
});
IndicatorRow.displayName = 'IndicatorRow';

// =====================================================
// GDP DEEP INTELLIGENCE — 6 component analysis
// Server-cached AI analysis, zero cost per user
// =====================================================

const GDPComponentCard = memo(({ comp, label }: { comp: GDPComponentData | undefined; label: string }) => {
  if (!comp) return null;
  const isPositive = comp.value > 0;
  const isImproving = comp.change > 0;
  const color = isPositive ? '#22C55E' : comp.value > -1 ? '#F59E0B' : '#EF4444';

  return (
    <div className="p-3 rounded-xl" style={{ background: `${color}06`, border: `1px solid ${color}15` }}>
      <p className="text-[10px] text-[#6B6B6B] mb-0.5">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold tabular-nums" style={{ color }}>{comp.value}%</span>
        {comp.change !== 0 && (
          <span className={cn("text-[10px] font-medium", isImproving ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
            {isImproving ? '+' : ''}{comp.change}pp
          </span>
        )}
      </div>
      <span className="text-[9px] text-[#6B6B6B]">Prior: {comp.previousValue}%</span>
    </div>
  );
});
GDPComponentCard.displayName = 'GDPComponentCard';

const GDPDeepIntelligence = memo(({ data }: { data: GDPIntelligenceData | null }) => {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  if (!data || !data.components || Object.keys(data.components).length === 0) return null;

  const c = data.components;
  const realGDP = c.gdp;
  const nominalGDP = c.gdpNominal;
  const gdpGDI = c.gdpGDI;

  // GDP vs GDI divergence signal
  const gdiDivergence = realGDP && gdpGDI ? Math.abs(realGDP.value - gdpGDI.value) : 0;
  const hasDivergence = gdiDivergence > 1.5;

  // Real vs Nominal gap = inflation component
  const inflationGap = realGDP && nominalGDP ? (nominalGDP.value - realGDP.value) : 0;

  const toggle = useCallback((idx: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // Parse AI analysis sections
  const aiSections = useMemo(() => {
    const analysis = data.aiAnalysis?.analysis;
    if (!analysis) return null;
    const clean = analysis.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,3}\s?/g, '');
    const blocks = clean.split('\n\n').filter(Boolean);

    const result: { header: string; content: string }[] = [];
    let current: { header: string; content: string } | null = null;

    for (const block of blocks) {
      const lines = block.split('\n').filter(Boolean);
      const firstLine = lines[0] || '';

      if (/^[A-Z\s]{4,}[—\-:]/i.test(firstLine) || /^(REAL VS|THE CONSUMER|INFLATION UNDER|BUSINESS CONFIDENCE|THE CLEAN|THE INCOME|BOTTOM LINE)/i.test(firstLine)) {
        if (current) result.push(current);
        const sepIdx = Math.max(firstLine.indexOf(':'), firstLine.indexOf('—'));
        const headerPart = sepIdx > 0 ? firstLine.slice(0, sepIdx).trim() : firstLine.replace(/[:—\-]$/, '').trim();
        const bodyPart = sepIdx > 0 ? firstLine.slice(sepIdx + 1).trim() : '';
        current = { header: headerPart, content: bodyPart ? bodyPart + '\n' + lines.slice(1).join('\n') : lines.slice(1).join('\n') };
      } else if (current) {
        current.content += '\n' + block;
      }
    }
    if (current) result.push(current);
    return result;
  }, [data.aiAnalysis]);

  const getSectionIcon = (header: string) => {
    if (/REAL VS|HEADLINE/i.test(header)) return TrendingUp;
    if (/CONSUMER|ENGINE/i.test(header)) return ShoppingCart;
    if (/INFLATION|HOOD/i.test(header)) return Thermometer;
    if (/BUSINESS|CONFIDENCE/i.test(header)) return Briefcase;
    if (/CLEAN|SIGNAL/i.test(header)) return Target;
    if (/INCOME|CHECK/i.test(header)) return Activity;
    if (/BOTTOM/i.test(header)) return Crosshair;
    return Layers;
  };

  const getSectionColor = (header: string) => {
    if (/BOTTOM/i.test(header)) return '#3B82F6';
    if (/INFLATION/i.test(header)) return '#F59E0B';
    if (/BUSINESS/i.test(header)) return '#8B5CF6';
    return '#C9A646';
  };

  return (
    <>
      {/* GDP Components Dashboard */}
      <Card highlight>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-[#C9A646]" />
            <h3 className="text-sm font-semibold text-white">GDP Component Dashboard</h3>
            {realGDP && (
              <span className="text-[10px] text-[#6B6B6B]">
                Q{Math.ceil((new Date(realGDP.lastUpdated).getMonth() + 1) / 3)} {new Date(realGDP.lastUpdated).getFullYear()}
              </span>
            )}
          </div>

          {/* Warning banner for GDP-GDI divergence */}
          {hasDivergence && (
            <div className="mb-3 p-2.5 rounded-lg flex items-center gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] flex-shrink-0" />
              <p className="text-[11px] text-[#F59E0B]">
                GDP-GDI divergence of {gdiDivergence.toFixed(1)}pp detected — historically signals upcoming GDP revision.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            <GDPComponentCard comp={c.gdp} label="Real GDP" />
            <GDPComponentCard comp={c.gdpNominal} label="Nominal GDP" />
            <GDPComponentCard comp={c.gdpPCE} label="Consumer (PCE)" />
            <GDPComponentCard comp={c.gdpDeflator} label="GDP Deflator" />
            <GDPComponentCard comp={c.gdpInvestment} label="Private Investment" />
            <GDPComponentCard comp={c.gdpFinalSales} label="Final Sales (Clean)" />
            <GDPComponentCard comp={c.gdpGDI} label="GDI (Income)" />
            {/* Inflation gap derived metric */}
            <div className="p-3 rounded-xl" style={{
              background: inflationGap > 2 ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
              border: `1px solid ${inflationGap > 2 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'}`,
            }}>
              <p className="text-[10px] text-[#6B6B6B] mb-0.5">Inflation Gap</p>
              <span className="text-lg font-bold tabular-nums" style={{ color: inflationGap > 2 ? '#EF4444' : '#22C55E' }}>
                {inflationGap.toFixed(1)}pp
              </span>
              <p className="text-[9px] text-[#6B6B6B]">Nominal - Real</p>
            </div>
          </div>

          {/* Historical Real GDP chart */}
          {realGDP?.historicalData && realGDP.historicalData.length > 3 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[#6B6B6B]">Real GDP Trend ({realGDP.historicalData.length}Q)</span>
                <span className="text-[10px] text-[#6B6B6B]">0% = stall speed</span>
              </div>
              <ReportChart
                data={realGDP.historicalData}
                color={realGDP.value >= 2 ? '#22C55E' : realGDP.value >= 0 ? '#F59E0B' : '#EF4444'}
                unit="%"
                name="gdp-real-history"
                lastUpdated={realGDP.lastUpdated}
                frequency="Quarterly"
                threshold={0}
              />
            </div>
          )}
        </div>
      </Card>

      {/* AI Deep Analysis */}
      {aiSections && aiSections.length > 0 && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#C9A646]" />
                <h3 className="text-sm font-semibold text-white">GDP Deep Intelligence</h3>
                <span className="text-[10px] text-[#6B6B6B]">AI-powered component analysis</span>
              </div>
              {data.aiAnalysis?.cached && (
                <span className="text-[10px] text-[#6B6B6B] bg-white/[0.03] px-2 py-1 rounded-md">
                  {(data.aiAnalysis.ageMinutes || 0) < 1 ? 'Just updated' : `${data.aiAnalysis.ageMinutes}m ago`}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {aiSections.map((section, idx) => {
                const Icon = getSectionIcon(section.header);
                const color = getSectionColor(section.header);
                const isOpen = expanded.has(idx);

                return (
                  <div
                    key={idx}
                    className="rounded-xl overflow-hidden transition-all"
                    style={{
                      background: isOpen ? `${color}08` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isOpen ? color + '20' : 'rgba(201,166,70,0.06)'}`,
                    }}
                  >
                    <button
                      onClick={() => toggle(idx)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color }} />
                        </div>
                        <span className="text-sm font-medium text-white">{fixCapsText(section.header)}</span>
                      </div>
                      <ChevronDown className={cn("w-3.5 h-3.5 text-[#6B6B6B] transition-transform", isOpen && "rotate-180")} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3.5">
                        <div className="pl-[34px]">
                          {section.content.split('\n').filter(Boolean).map((paragraph, pIdx) => (
                            <p key={pIdx} className="text-[13px] text-[#C8BFA0] leading-relaxed mb-1.5 last:mb-0">
                              {renderAnalysisText(paragraph)}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Loading state for AI */}
      {!aiSections && data.aiAnalysis === null && (
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-4 h-4 text-[#C9A646]" />
              <h3 className="text-sm font-semibold text-white">GDP Deep Intelligence</h3>
            </div>
            <div className="py-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-3 bg-white/[0.04] rounded animate-pulse" style={{ width: `${25 + i * 10}%` }} />
                  <div className="h-3 bg-white/[0.03] rounded w-full animate-pulse" />
                  <div className="h-3 bg-white/[0.03] rounded animate-pulse" style={{ width: '85%' }} />
                </div>
              ))}
              <p className="text-[10px] text-[#4B4B4B] text-center mt-4">Generating GDP intelligence brief...</p>
            </div>
          </div>
        </Card>
      )}
    </>
  );
});
GDPDeepIntelligence.displayName = 'GDPDeepIntelligence';

// =====================================================
// ISM COMPONENTS GAUGE — Visual sub-index display
// Shows all ISM sub-components as horizontal bars
// relative to the 50 expansion/contraction threshold
// =====================================================

const ISMComponentsGauge = memo(({ indicators }: { indicators: IndicatorData[] }) => {
  const components = useMemo(() => {
    const order = ['ismNewOrders', 'ismProduction', 'ismEmployment', 'ismPrices'];
    return order
      .map(id => indicators.find(i => i.id === id))
      .filter((i): i is IndicatorData => i != null);
  }, [indicators]);

  if (components.length === 0) return null;

  return (
    <div className="space-y-2">
      {components.map(comp => {
        const val = comp.value;
        const isExpansion = val >= 50;
        const color = isExpansion ? '#22C55E' : '#EF4444';
        // Position on 30-70 scale
        const pct = Math.max(0, Math.min(100, ((val - 30) / 40) * 100));
        const threshold50 = ((50 - 30) / 40) * 100;

        return (
          <div key={comp.id} className="flex items-center gap-3">
            <span className="text-[11px] text-[#8B8B8B] w-24 truncate text-right">{comp.shortName || comp.name}</span>
            <div className="flex-1 relative h-5 rounded-full overflow-hidden bg-white/[0.05]">
              {/* 50 threshold line */}
              <div
                className="absolute top-0 bottom-0 w-px bg-[#F59E0B]/40 z-10"
                style={{ left: `${threshold50}%` }}
              />
              {/* Value bar */}
              <div
                className="absolute top-0.5 bottom-0.5 rounded-full transition-all duration-700"
                style={{
                  left: val >= 50 ? `${threshold50}%` : `${pct}%`,
                  width: val >= 50 ? `${pct - threshold50}%` : `${threshold50 - pct}%`,
                  background: color,
                  opacity: 0.6,
                }}
              />
            </div>
            <span className="text-sm font-bold tabular-nums w-10 text-right" style={{ color }}>{val}</span>
          </div>
        );
      })}
      <div className="flex items-center justify-center gap-4 mt-1">
        <span className="text-[9px] text-[#EF4444]/60">← Contraction</span>
        <span className="text-[9px] text-[#F59E0B]">50</span>
        <span className="text-[9px] text-[#22C55E]/60">Expansion →</span>
      </div>
    </div>
  );
});
ISMComponentsGauge.displayName = 'ISMComponentsGauge';

// =====================================================
// ISM TENSIONS — New Orders vs Production, Prices vs Demand
// Pure data computation from ISM intelligence — zero AI cost
// =====================================================

const ISMTensions = memo(({ intel }: { intel: ISMIntelligenceData }) => {
  const tensions = useMemo(() => {
    const result: { name: string; left: string; leftVal: number | null; right: string; rightVal: number | null; interpretation: string; signal: 'bullish' | 'bearish' | 'neutral' }[] = [];

    if (intel.newOrders != null && intel.production != null) {
      const gap = intel.newOrders - intel.production;
      result.push({
        name: 'Demand vs Output',
        left: 'New Orders',
        leftVal: intel.newOrders,
        right: 'Production',
        rightVal: intel.production,
        interpretation: gap > 2
          ? `New Orders lead Production by ${gap.toFixed(1)} pts — demand exceeds current output. Production should accelerate in coming months. Bullish for industrials.`
          : gap < -2
          ? `Production exceeds New Orders by ${Math.abs(gap).toFixed(1)} pts — output running ahead of demand. Inventory build risk. Watch for production cuts ahead.`
          : `New Orders and Production are aligned (gap: ${gap.toFixed(1)}). Stable manufacturing dynamics.`,
        signal: gap > 2 ? 'bullish' : gap < -2 ? 'bearish' : 'neutral',
      });
    }

    if (intel.newOrders != null && intel.prices != null) {
      const ordersBelow50 = intel.newOrders < 50;
      const pricesAbove55 = intel.prices > 55;
      result.push({
        name: 'Demand vs Pricing',
        left: 'New Orders',
        leftVal: intel.newOrders,
        right: 'Prices Paid',
        rightVal: intel.prices,
        interpretation: ordersBelow50 && pricesAbove55
          ? `STAGFLATION SIGNAL: Demand contracting (${intel.newOrders}) while input costs surge (${intel.prices}). Worst combo for margins and equities. Fed is stuck.`
          : !ordersBelow50 && !pricesAbove55
          ? `Goldilocks: Demand expanding (${intel.newOrders}) with contained costs (${intel.prices}). Healthy environment for corporate margins.`
          : ordersBelow50
          ? `Demand weak (${intel.newOrders}) but pricing pressure easing (${intel.prices}). Disinflationary — supports Fed easing case.`
          : `Strong demand (${intel.newOrders}) with rising costs (${intel.prices}). Inflationary pressure — watch for margin squeeze.`,
        signal: ordersBelow50 && pricesAbove55 ? 'bearish' : !ordersBelow50 && !pricesAbove55 ? 'bullish' : 'neutral',
      });
    }

    if (intel.inventories != null && intel.supplierDeliveries != null) {
      result.push({
        name: 'Supply Chain Health',
        left: 'Inventories',
        leftVal: intel.inventories,
        right: 'Deliveries',
        rightVal: intel.supplierDeliveries,
        interpretation: intel.inventories > 50 && intel.supplierDeliveries < 50
          ? `Inventories building (${intel.inventories}) while deliveries slow (${intel.supplierDeliveries}). Supply chain stress — potential restocking cycle ahead.`
          : intel.inventories < 48
          ? `Low inventories (${intel.inventories}) — restocking cycle likely. Bullish for materials, logistics, and industrial distributors.`
          : `Supply chain normalizing. Inventories at ${intel.inventories}, deliveries at ${intel.supplierDeliveries}.`,
        signal: intel.inventories < 48 ? 'bullish' : intel.inventories > 52 && intel.supplierDeliveries < 48 ? 'bearish' : 'neutral',
      });
    }

    if (intel.employment != null && intel.newOrders != null) {
      const gap = intel.newOrders - intel.employment;
      result.push({
        name: 'Hiring vs Demand',
        left: 'New Orders',
        leftVal: intel.newOrders,
        right: 'Employment',
        rightVal: intel.employment,
        interpretation: gap > 3
          ? `Demand (${intel.newOrders}) running well ahead of hiring (${intel.employment}). Companies will need to add workers — bullish for upcoming NFP prints.`
          : gap < -3
          ? `Hiring (${intel.employment}) outpacing demand (${intel.newOrders}). Companies may be over-staffed. Watch for layoff announcements.`
          : `Hiring aligned with demand dynamics. Employment at ${intel.employment}, New Orders at ${intel.newOrders}.`,
        signal: gap > 3 ? 'bullish' : gap < -3 ? 'bearish' : 'neutral',
      });
    }

    return result;
  }, [intel]);

  if (tensions.length === 0) return null;

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-[#C9A646]" />
          <h3 className="text-sm font-semibold text-white">Under-the-Surface Tensions</h3>
          <span className="text-[10px] text-[#6B6B6B]">component vs component analysis</span>
        </div>
        <div className="space-y-3">
          {tensions.map((t, idx) => {
            const sigColor = t.signal === 'bullish' ? '#22C55E' : t.signal === 'bearish' ? '#EF4444' : '#F59E0B';
            return (
              <div key={idx} className="rounded-xl p-3" style={{ background: `${sigColor}06`, border: `1px solid ${sigColor}15` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">{t.name}</span>
                  <Badge variant={t.signal === 'bullish' ? 'success' : t.signal === 'bearish' ? 'danger' : 'warning'}>
                    {t.signal.toUpperCase()}
                  </Badge>
                </div>
                {/* Visual tension bar */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#8B8B8B]">{t.left}</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: t.leftVal != null && t.leftVal >= 50 ? '#22C55E' : '#EF4444' }}>{t.leftVal ?? '—'}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{
                        width: `${Math.max(5, Math.min(100, ((t.leftVal || 50) - 30) / 40 * 100))}%`,
                        background: t.leftVal != null && t.leftVal >= 50 ? '#22C55E' : '#EF4444',
                        opacity: 0.7,
                      }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-[#6B6B6B] font-medium px-1">vs</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#8B8B8B]">{t.right}</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: t.rightVal != null && t.rightVal >= 50 ? '#22C55E' : '#EF4444' }}>{t.rightVal ?? '—'}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{
                        width: `${Math.max(5, Math.min(100, ((t.rightVal || 50) - 30) / 40 * 100))}%`,
                        background: t.rightVal != null && t.rightVal >= 50 ? '#22C55E' : '#EF4444',
                        opacity: 0.7,
                      }} />
                    </div>
                  </div>
                </div>
                <p className="text-[12px] text-[#C8BFA0] leading-relaxed">{renderAnalysisText(t.interpretation)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
});
ISMTensions.displayName = 'ISMTensions';

// =====================================================
// SECTOR RANKINGS — from ism_sector_rankings table
// Visual ranked list with impact scores and direction
// =====================================================

const ISMSectorRankings = memo(({ rankings }: { rankings: ISMSectorRanking[] }) => {
  const [expandedSector, setExpandedSector] = useState<number | null>(null);
  const sorted = useMemo(() => [...rankings].sort((a, b) => a.rank - b.rank), [rankings]);

  if (sorted.length === 0) return null;

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-[#C9A646]" />
          <h3 className="text-sm font-semibold text-white">Sector Impact Rankings</h3>
          <span className="text-[10px] text-[#6B6B6B]">{sorted.length} sectors ranked by ISM impact</span>
        </div>
        <div className="space-y-1.5">
          {sorted.map((sector, idx) => {
            const dirColor = sector.direction === 'positive' ? '#22C55E' : sector.direction === 'negative' ? '#EF4444' : '#F59E0B';
            const DirIcon = sector.direction === 'positive' ? ArrowUpRight : sector.direction === 'negative' ? ArrowDownRight : Minus;
            const isExpanded = expandedSector === idx;
            const scoreWidth = Math.max(8, Math.min(100, sector.impactScore * 10));

            return (
              <div key={idx} className="rounded-xl overflow-hidden transition-all" style={{
                background: isExpanded ? `${dirColor}06` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isExpanded ? dirColor + '20' : 'rgba(201,166,70,0.06)'}`,
              }}>
                <button
                  onClick={() => setExpandedSector(isExpanded ? null : idx)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Rank badge */}
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style={{
                      background: idx < 3 ? 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(244,217,123,0.1))' : 'rgba(255,255,255,0.04)',
                      color: idx < 3 ? '#C9A646' : '#6B6B6B',
                      border: idx < 3 ? '1px solid rgba(201,166,70,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                      #{sector.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{sector.sector}</span>
                        {sector.etf && (
                          <span className="text-[10px] text-[#C9A646] font-mono bg-[#C9A646]/10 px-1.5 py-0.5 rounded">{sector.etf}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Impact score bar */}
                    <div className="w-20 hidden sm:block">
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${scoreWidth}%`, background: dirColor, opacity: 0.7 }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold tabular-nums w-8 text-right" style={{ color: dirColor }}>
                      {sector.impactScore.toFixed(1)}
                    </span>
                    <DirIcon className="w-3.5 h-3.5" style={{ color: dirColor }} />
                    <ChevronRight className={cn("w-3 h-3 text-[#6B6B6B] transition-transform", isExpanded && "rotate-90")} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    {sector.reasoning && (
                      <div className="ml-9 p-2.5 rounded-lg bg-white/[0.03]">
                        <p className="text-[10px] text-[#C9A646] font-semibold mb-1">ISM Signal</p>
                        <p className="text-[12px] text-[#C8BFA0] leading-relaxed">{sector.reasoning}</p>
                      </div>
                    )}
                    {sector.whyNow && (
                      <div className="ml-9 p-2.5 rounded-lg bg-white/[0.03]">
                        <p className="text-[10px] text-[#F59E0B] font-semibold mb-1">Why Now</p>
                        <p className="text-[12px] text-[#C8BFA0] leading-relaxed">{sector.whyNow}</p>
                      </div>
                    )}
                    {sector.quoteSupport && (
                      <div className="ml-9 p-2.5 rounded-lg" style={{ background: 'rgba(201,166,70,0.04)', borderLeft: '2px solid rgba(201,166,70,0.3)' }}>
                        <p className="text-[10px] text-[#6B6B6B] mb-1">
                          {sector.quoteSupportIndustry ? `— ${sector.quoteSupportIndustry}` : 'Executive Quote'}
                        </p>
                        <p className="text-[12px] text-[#C8BFA0] italic leading-relaxed">"{sector.quoteSupport}"</p>
                      </div>
                    )}
                    {sector.changeVsLastMonth && (
                      <div className="ml-9">
                        <span className="text-[10px] text-[#8B8B8B]">vs Last Month: </span>
                        <span className="text-[10px] font-medium text-[#C8BFA0]">{sector.changeVsLastMonth}</span>
                      </div>
                    )}
                    {sector.keyStocks && sector.keyStocks.length > 0 && (
                      <div className="ml-9 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-[#6B6B6B]">Key Stocks:</span>
                        {sector.keyStocks.map((stock, sIdx) => (
                          <span key={sIdx} className="text-[10px] font-mono text-[#C9A646] bg-[#C9A646]/8 px-1.5 py-0.5 rounded">
                            {stock}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
});
ISMSectorRankings.displayName = 'ISMSectorRankings';

// =====================================================
// EXECUTIVE QUOTES — from ism_quotes table
// Grouped by sector with sentiment coloring
// =====================================================

const ISMExecutiveQuotes = memo(({ quotes, quotesBySector }: {
  quotes: ISMQuote[];
  quotesBySector: Record<string, ISMQuote[]>;
}) => {
  const [expandedSector, setExpandedSector] = useState<string | null>(null);

  const sectorEntries = useMemo(() => {
    return Object.entries(quotesBySector)
      .map(([sector, sectorQuotes]) => {
        const positive = sectorQuotes.filter(q => q.sentiment === 'positive').length;
        const negative = sectorQuotes.filter(q => q.sentiment === 'negative').length;
        const netSentiment = positive - negative;
        return { sector, quotes: sectorQuotes, positive, negative, netSentiment };
      })
      .sort((a, b) => b.quotes.length - a.quotes.length);
  }, [quotesBySector]);

  if (quotes.length === 0) return null;

  const sentimentColor = (s: string) =>
    s === 'positive' ? '#22C55E' : s === 'negative' ? '#EF4444' : s === 'mixed' ? '#F59E0B' : '#8B8B8B';

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-[#C9A646]" />
            <h3 className="text-sm font-semibold text-white">Voices from the Field</h3>
            <span className="text-[10px] text-[#6B6B6B]">{quotes.length} executive quotes</span>
          </div>
          {/* Sentiment summary */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#22C55E]">{quotes.filter(q => q.sentiment === 'positive').length} positive</span>
            <span className="text-[10px] text-[#6B6B6B]">/</span>
            <span className="text-[10px] text-[#EF4444]">{quotes.filter(q => q.sentiment === 'negative').length} negative</span>
          </div>
        </div>

        <div className="space-y-1.5">
          {sectorEntries.map(({ sector, quotes: sq, positive, negative, netSentiment }) => {
            const isOpen = expandedSector === sector;
            const sentColor = netSentiment > 0 ? '#22C55E' : netSentiment < 0 ? '#EF4444' : '#F59E0B';

            return (
              <div key={sector} className="rounded-xl overflow-hidden" style={{
                background: isOpen ? `${sentColor}05` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isOpen ? sentColor + '15' : 'rgba(201,166,70,0.06)'}`,
              }}>
                <button
                  onClick={() => setExpandedSector(isOpen ? null : sector)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight className={cn("w-3 h-3 text-[#6B6B6B] transition-transform", isOpen && "rotate-90")} />
                    <span className="text-sm font-medium text-white">{sector}</span>
                    <span className="text-[10px] text-[#6B6B6B]">({sq.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {positive > 0 && <span className="text-[10px] text-[#22C55E] bg-[#22C55E]/10 px-1.5 py-0.5 rounded">{positive} +</span>}
                    {negative > 0 && <span className="text-[10px] text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded">{negative} -</span>}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    {sq.map((quote, qIdx) => (
                      <div key={qIdx} className="pl-5 p-2.5 rounded-lg" style={{
                        borderLeft: `2px solid ${sentimentColor(quote.sentiment)}40`,
                        background: 'rgba(255,255,255,0.015)',
                      }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-[#8B8B8B] font-medium">{quote.industry}</span>
                          <div className="flex items-center gap-1.5">
                            {quote.keyTheme && (
                              <span className="text-[9px] text-[#C9A646] bg-[#C9A646]/8 px-1.5 py-0.5 rounded">{quote.keyTheme}</span>
                            )}
                            <span className="w-2 h-2 rounded-full" style={{ background: sentimentColor(quote.sentiment) }} />
                          </div>
                        </div>
                        <p className="text-[12px] text-[#C8BFA0] leading-relaxed italic">"{quote.comment}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
});
ISMExecutiveQuotes.displayName = 'ISMExecutiveQuotes';
// =====================================================
// ISM AI SECTOR ANALYSIS — AI-powered sector intelligence
// Combines ISM numbers + executive quotes → actionable calls
// Server-cached: 1 AI call/hour serves 10K users
// =====================================================

// Fix ALL-CAPS text from AI while preserving tickers and acronyms
// Convert ALL CAPS headers → Title Case: "HEADLINE PPI — PRODUCER COST" → "Headline PPI — Producer Cost"
function fixCapsText(text: string): string {
  const upperCount = (text.match(/[A-Z]/g) || []).length;
  const letterCount = (text.match(/[A-Za-z]/g) || []).length;
  if (letterCount === 0 || upperCount / letterCount < 0.5) return text;

  const acronyms = new Set(['PMI','ISM','GDP','CPI','PPI','FED','NFP','PCE','FOMC','YOY','QOQ','ETF','AI','US','DXY','SPX','GDI','MOM','OER','TIPS','REIT','TLT','XLI','XLB','XLF','XLY','XLP','XLE','XHB','VNQ','TIP','GLD','DBC','XRT','IWM','QQQ','SPY']);
  const smallWords = new Set(['the','a','an','and','or','but','in','on','of','to','for','by','vs','at','is']);

  return text.split(/(\([A-Z]{1,5}\)|—)/g).map(segment => {
    if (/^\([A-Z]{1,5}\)$/.test(segment) || segment === '—') return segment;
    return segment
      .split(/\s+/)
      .filter(Boolean)
      .map((word, idx) => {
        const clean = word.replace(/[^A-Za-z&]/g, '');
        if (acronyms.has(clean.toUpperCase())) return clean.toUpperCase();
        if (idx > 0 && smallWords.has(clean.toLowerCase())) return clean.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }).join(' ').replace(/\s+/g, ' ').replace(/\s*—\s*/g, ' — ').trim();
}

// Helper: parse text and highlight tickers + sectors with premium pill styling
function renderAnalysisText(text: string): React.ReactNode[] {
  const cleaned = fixCapsText(text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,3}\s?/g, ''));
  
  // Split on tickers (XLI) AND key numbers like 4.4%, 50.3, +0.2pp, $4.5T, 200K
  const parts = cleaned.split(/(\([A-Z]{1,5}\)|\b\d+\.?\d*%|\b\d+\.?\d*pp\b|\$\d+\.?\d*[BTMKbtmk]?\b|\b\d+\.?\d*K\b)/g);
  
  return parts.map((part, i) => {
    if (/^\([A-Z]{1,5}\)$/.test(part)) {
      const ticker = part.slice(1, -1);
      return (
        <span
          key={i}
          className="inline-flex items-center mx-0.5 px-1.5 py-px rounded font-mono text-[12px] font-semibold tracking-wide"
          style={{
            color: '#E8D5A3',
            background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.08))',
            border: '1px solid rgba(201,166,70,0.25)',
            letterSpacing: '0.03em',
          }}
        >
          {ticker}
        </span>
      );
    }
    if (/^\d+\.?\d*%$|^\d+\.?\d*pp$|^\$\d+\.?\d*[BTMKbtmk]?$|^\d+\.?\d*K$/.test(part)) {
      return (
        <span key={i} className="text-white font-semibold">{part}</span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const ISMAISectorAnalysis = memo(({ aiData }: {
  aiData: AIResult | null;
}) => {
  const analysis = aiData?.analysis;
  const ageMinutes = aiData?.ageMinutes || 0;

  // Parse sections from AI output
  const sections = useMemo(() => {
    if (!analysis) return null;
    const clean = analysis.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,3}\s?/g, '');
    const blocks = clean.split('\n\n').filter(Boolean);
    
    const result: { header: string; paragraphs: string[]; stocks: { ticker: string; name: string; reason: string }[] }[] = [];
    let current: typeof result[0] | null = null;

    for (const block of blocks) {
      const lines = block.split('\n').filter(Boolean);
      const firstLine = lines[0] || '';
      
      if (/^[A-Z\s]{4,}:/.test(firstLine) || /^(THE BIG PICTURE|WHERE TO ADD|WHERE TO TRIM|WHAT THE STREET|BOTTOM LINE)/i.test(firstLine)) {
        if (current) result.push(current);
        const colonIdx = firstLine.indexOf(':');
        const headerPart = colonIdx > 0 ? firstLine.slice(0, colonIdx).trim() : firstLine.replace(/:$/, '').trim();
        const bodyPart = colonIdx > 0 ? firstLine.slice(colonIdx + 1).trim() : '';
        current = { header: headerPart, paragraphs: bodyPart ? [bodyPart] : [], stocks: [] };
        for (let i = 1; i < lines.length; i++) {
          const stockMatch = lines[i].match(/^\(([A-Z]{1,5})\)\s*(.+?)\s*[—–-]\s*(.+)$/);
          if (stockMatch) {
            current.stocks.push({ ticker: stockMatch[1], name: stockMatch[2].trim(), reason: stockMatch[3].trim() });
          } else if (lines[i].trim()) {
            current.paragraphs.push(lines[i]);
          }
        }
      } else if (current) {
        for (const line of lines) {
          const stockMatch = line.match(/^\(([A-Z]{1,5})\)\s*(.+?)\s*[—–-]\s*(.+)$/);
          if (stockMatch) {
            current.stocks.push({ ticker: stockMatch[1], name: stockMatch[2].trim(), reason: stockMatch[3].trim() });
          } else if (line.trim()) {
            current.paragraphs.push(line);
          }
        }
      }
    }
    if (current) result.push(current);
    return result;
  }, [analysis]);

  // Determine if section is add/trim/etc for subtle accent
  const getSectionAccent = (header: string) => {
    if (/ADD|OVERWEIGHT|BUY|EXPOSURE/i.test(header)) return 'rgba(34,197,94,0.4)';
    if (/TRIM|UNDERWEIGHT|AVOID|REDUCE/i.test(header)) return 'rgba(239,68,68,0.4)';
    return 'rgba(201,166,70,0.4)';
  };

  return (
    <Card>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.12), rgba(201,166,70,0.04))',
              border: '1px solid rgba(201,166,70,0.2)',
            }}>
              <Brain className="w-4 h-4 text-[#C9A646]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#F0EBE0] tracking-tight">Macro Intelligence Brief</h3>
              <p className="text-[10px] text-[#6B6B6B] tracking-wide uppercase">AI-powered ISM analysis</p>
            </div>
          </div>
          {aiData?.cached && (
            <span className="text-[10px] text-[#6B6B6B] bg-white/[0.03] px-2 py-1 rounded-md">
              {ageMinutes < 1 ? 'Just updated' : `${ageMinutes}m ago`}
            </span>
          )}
        </div>

        {/* Loading */}
        {!sections && (
          <div className="py-6 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-white/[0.04] rounded animate-pulse" style={{ width: `${25 + i * 10}%` }} />
                <div className="h-3 bg-white/[0.03] rounded w-full animate-pulse" />
                <div className="h-3 bg-white/[0.03] rounded animate-pulse" style={{ width: '85%' }} />
              </div>
            ))}
            <p className="text-[10px] text-[#4B4B4B] text-center mt-4">Generating brief...</p>
          </div>
        )}

        {/* Sections */}
        {sections && (
          <div className="space-y-4">
            {sections.map((section, idx) => (
              <div key={idx}>
                {/* Section header — subtle left accent */}
                <div className="flex items-center gap-2 mb-2" style={{ borderLeft: `2px solid ${getSectionAccent(section.header)}`, paddingLeft: '10px' }}>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#C9A646]">
                    {section.header}
                  </span>
                </div>

                {/* Analysis text */}
                {section.paragraphs.length > 0 && (
                  <div className="pl-3 mb-2">
                    {section.paragraphs.map((p, pIdx) => (
                      <p key={pIdx} className="text-[13px] text-[#E8E4DC] leading-[1.8] font-light mb-1 last:mb-0">
                        {renderAnalysisText(p)}
                      </p>
                    ))}
                  </div>
                )}

                {/* Compact stock list */}
                {section.stocks.length > 0 && (
                  <div className="pl-3 space-y-1 mt-2">
                    {section.stocks.map((stock, sIdx) => (
                      <div key={sIdx} className="flex items-baseline gap-2 py-1 px-2 rounded-md" style={{
                        background: 'rgba(201,166,70,0.03)',
                      }}>
                        <span className="font-mono text-[11px] font-semibold text-[#C9A646] flex-shrink-0 w-10 text-center">
                          {stock.ticker}
                        </span>
                        <span className="text-[12.5px] text-[#C8BFA0]">{stock.name}</span>
                        <span className="text-[11.5px] text-[#B5AFA3]">— {renderAnalysisText(stock.reason)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Divider between sections (not after last) */}
                {idx < sections.length - 1 && (
                  <div className="mt-4 border-t border-white/[0.04]" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
});
ISMAISectorAnalysis.displayName = 'ISMAISectorAnalysis';

// =====================================================
// TRADE IDEAS — from ism_trade_ideas table
// Actionable positioning with thesis + conviction
// =====================================================

const ISMTradeIdeas = memo(({ trades }: { trades: ISMTradeIdea[] }) => {
  const [expandedTrade, setExpandedTrade] = useState<number | null>(null);

  if (trades.length === 0) return null;

  const longs = trades.filter(t => t.direction === 'long');
  const shorts = trades.filter(t => t.direction === 'short');

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-[#C9A646]" />
            <h3 className="text-sm font-semibold text-white">Trade Ideas</h3>
            <span className="text-[10px] text-[#6B6B6B]">{trades.length} ideas from ISM analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#22C55E] bg-[#22C55E]/10 px-1.5 py-0.5 rounded">{longs.length} Long</span>
            <span className="text-[10px] text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded">{shorts.length} Short</span>
          </div>
        </div>

        <div className="space-y-2">
          {trades.map((trade, idx) => {
            const isLong = trade.direction === 'long';
            const dirColor = isLong ? '#22C55E' : '#EF4444';
            const convictionColor = trade.conviction === 'high' ? '#C9A646' : trade.conviction === 'medium' ? '#F59E0B' : '#6B6B6B';
            const isExpanded = expandedTrade === idx;

            return (
              <div key={idx} className="rounded-xl overflow-hidden" style={{
                background: isExpanded ? `${dirColor}06` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isExpanded ? dirColor + '20' : 'rgba(201,166,70,0.06)'}`,
              }}>
                <button
                  onClick={() => setExpandedTrade(isExpanded ? null : idx)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{
                      background: `${dirColor}15`, border: `1px solid ${dirColor}30`,
                    }}>
                      {isLong ? <ArrowUpRight className="w-3.5 h-3.5" style={{ color: dirColor }} /> : <ArrowDownRight className="w-3.5 h-3.5" style={{ color: dirColor }} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase" style={{ color: dirColor }}>{trade.direction}</span>
                        <span className="text-sm font-medium text-white truncate">{trade.title || trade.sector}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {trade.etf && (
                      <span className="text-[10px] font-mono text-[#C9A646] bg-[#C9A646]/10 px-1.5 py-0.5 rounded">{trade.etf}</span>
                    )}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map(level => (
                        <Star key={level} className="w-2.5 h-2.5" style={{
                          color: (trade.conviction === 'high' && level <= 3) || (trade.conviction === 'medium' && level <= 2) || (trade.conviction === 'low' && level <= 1) ? convictionColor : '#333',
                          fill: (trade.conviction === 'high' && level <= 3) || (trade.conviction === 'medium' && level <= 2) || (trade.conviction === 'low' && level <= 1) ? convictionColor : 'transparent',
                        }} />
                      ))}
                    </div>
                    <ChevronRight className={cn("w-3 h-3 text-[#6B6B6B] transition-transform", isExpanded && "rotate-90")} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    {/* Thesis */}
                    {trade.thesis && (
                      <div className="ml-[34px] p-2.5 rounded-lg bg-white/[0.03]">
                        <p className="text-[10px] text-[#C9A646] font-semibold mb-1">Thesis</p>
                        <p className="text-[12px] text-[#C8BFA0] leading-relaxed">{trade.thesis}</p>
                      </div>
                    )}

                    {/* Executive quote support */}
                    {trade.executiveQuote && (
                      <div className="ml-[34px] p-2.5 rounded-lg" style={{ background: 'rgba(201,166,70,0.04)', borderLeft: '2px solid rgba(201,166,70,0.3)' }}>
                        <p className="text-[10px] text-[#6B6B6B] mb-1">
                          {trade.executiveQuoteIndustry ? `— ${trade.executiveQuoteIndustry}` : 'Supporting Quote'}
                        </p>
                        <p className="text-[12px] text-[#C8BFA0] italic leading-relaxed">"{trade.executiveQuote}"</p>
                      </div>
                    )}

                    {/* Direct Impact */}
                    {trade.directImpact && (
                      <div className="ml-[34px] p-2.5 rounded-lg bg-white/[0.03]">
                        <p className="text-[10px] text-[#F59E0B] font-semibold mb-1">Direct Impact</p>
                        <p className="text-[12px] text-[#C8BFA0] leading-relaxed">{trade.directImpact}</p>
                      </div>
                    )}

                    {/* Stocks */}
                    {trade.stocks && trade.stocks.length > 0 && (
                      <div className="ml-[34px] flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-[#6B6B6B]">Tickers:</span>
                        {trade.stocks.map((stock, sIdx) => (
                          <span key={sIdx} className="text-[10px] font-mono text-[#C9A646] bg-[#C9A646]/8 px-1.5 py-0.5 rounded">
                            {stock}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Invalidation + Risks */}
                    <div className="ml-[34px] grid grid-cols-2 gap-2">
                      {trade.invalidation && trade.invalidation.length > 0 && (
                        <div className="p-2 rounded-lg bg-[#EF4444]/5">
                          <p className="text-[9px] text-[#EF4444] font-semibold mb-1">INVALIDATION</p>
                          {trade.invalidation.map((inv, iIdx) => (
                            <p key={iIdx} className="text-[10px] text-[#C8BFA0]">- {inv}</p>
                          ))}
                        </div>
                      )}
                      {trade.risks && trade.risks.length > 0 && (
                        <div className="p-2 rounded-lg bg-[#F59E0B]/5">
                          <p className="text-[9px] text-[#F59E0B] font-semibold mb-1">RISKS</p>
                          {trade.risks.map((risk, rIdx) => (
                            <p key={rIdx} className="text-[10px] text-[#C8BFA0]">- {risk}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[9px] text-[#4B4B4B] mt-3 text-center">
          For educational purposes only — not financial advice. All ideas derived from ISM data analysis.
        </p>
      </div>
    </Card>
  );
});
ISMTradeIdeas.displayName = 'ISMTradeIdeas';

// =====================================================
// ISM MACRO REGIME SNAPSHOT — from intelligence data
// Shows PMI headline + key stats in compact format
// =====================================================

const ISMRegimeSnapshot = memo(({ intel }: { intel: ISMIntelligenceData }) => {
  const regime = useMemo(() => {
    const pmi = intel.pmi;
    if (pmi >= 55) return { label: 'Strong Expansion', color: '#22C55E', bg: '#22C55E' };
    if (pmi >= 50) return { label: 'Mild Expansion', color: '#22C55E', bg: '#22C55E' };
    if (pmi >= 48) return { label: 'Near Threshold', color: '#F59E0B', bg: '#F59E0B' };
    if (pmi >= 45) return { label: 'Moderate Contraction', color: '#EF4444', bg: '#EF4444' };
    return { label: 'Deep Contraction', color: '#EF4444', bg: '#EF4444' };
  }, [intel.pmi]);

  const pmiChange = intel.priorPmi ? (intel.pmi - intel.priorPmi) : 0;

  return (
    <Card highlight>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-[#C9A646]" />
          <h3 className="text-sm font-semibold text-white">ISM Macro Snapshot</h3>
          <span className="text-[10px] text-[#6B6B6B]">{intel.month}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {/* PMI Headline */}
          <div className="col-span-2 md:col-span-1 p-3 rounded-xl" style={{ background: `${regime.bg}08`, border: `1px solid ${regime.bg}20` }}>
            <p className="text-[10px] text-[#6B6B6B] mb-0.5">PMI</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: regime.color }}>{intel.pmi}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {pmiChange !== 0 && (
                <span className={cn("text-[10px] font-medium", pmiChange > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
                  {pmiChange > 0 ? '+' : ''}{pmiChange.toFixed(1)}
                </span>
              )}
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${regime.bg}15`, color: regime.color }}>{regime.label}</span>
            </div>
          </div>

          {/* Sub-components */}
          {[
            { label: 'New Orders', val: intel.newOrders },
            { label: 'Production', val: intel.production },
            { label: 'Employment', val: intel.employment },
            { label: 'Prices', val: intel.prices },
            { label: 'Backlog', val: intel.backlog },
            { label: 'Inventories', val: intel.inventories },
          ].map((item) => (
            item.val != null && (
              <div key={item.label} className="p-3 rounded-xl bg-white/[0.03]">
                <p className="text-[10px] text-[#6B6B6B] mb-0.5">{item.label}</p>
                <p className="text-lg font-bold tabular-nums" style={{ color: item.val >= 50 ? '#22C55E' : '#EF4444' }}>
                  {item.val}
                </p>
                <span className="text-[9px]" style={{ color: item.val >= 50 ? '#22C55E60' : '#EF444460' }}>
                  {item.val >= 50 ? 'Expanding' : 'Contracting'}
                </span>
              </div>
            )
          ))}
        </div>

        {/* Historical PMI mini chart */}
        {intel.historicalPmi && intel.historicalPmi.length > 3 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#6B6B6B]">PMI Trend ({intel.historicalPmi.length} months)</span>
              <span className="text-[10px] text-[#6B6B6B]">50 = expansion line</span>
            </div>
            <div className="h-12">
              <MiniChart data={intel.historicalPmi} color="#C9A646" height={48} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});
ISMRegimeSnapshot.displayName = 'ISMRegimeSnapshot';





// Render section content — structured trade cards for POSITIONING sections
function renderSectionContent(section: { header: string; content: string }): React.ReactNode {
  const isPositioning = /POSITION|TRADE|SECTOR IMPACT/i.test(section.header);

  if (!isPositioning) {
    return (
      <>
        {section.content.split('\n\n').filter(Boolean).map((paragraph, pIdx) => (
          <p key={pIdx} className={cn("text-[13px] leading-relaxed text-[#C8BFA0]", pIdx > 0 && "mt-2.5")}>
            {renderAnalysisText(paragraph.trim())}
          </p>
        ))}
      </>
    );
  }

  // Parse positioning section: intro text + ticker trade cards
  const lines = section.content.split('\n').filter(l => l.trim());
  const introLines: string[] = [];
  const tradeCards: { ticker: string; direction: 'long' | 'short' | 'neutral'; reason: string }[] = [];

  for (const line of lines) {
    // Match: (XLI) — reason... or (TLT) reason...
    const tickerMatch = line.match(/^\s*\(([A-Z]{1,5})\)\s*[—–\-,.]?\s*(.+)/);
    if (tickerMatch) {
      const ticker = tickerMatch[1];
      const reason = tickerMatch[2].trim().replace(/^[—–\-,.\s]+/, '');
      const lowerReason = reason.toLowerCase();
      const direction: 'long' | 'short' | 'neutral' =
        /overweight|add|buy|long|bullish|accumul|benefit|support|favor|relief|attractive|opportunity/.test(lowerReason) ? 'long' :
        /underweight|trim|sell|short|bearish|reduce|avoid|headwind|pressure|risk|caution|vulnerable/.test(lowerReason) ? 'short' :
        'neutral';
      tradeCards.push({ ticker, direction, reason });
    } else {
      introLines.push(line);
    }
  }

  // If no structured trades found, try to extract inline tickers from prose
  if (tradeCards.length === 0) {
    const fullText = section.content;
    const tickerSentences = fullText.split(/(?<=[.!?])\s+/).filter(s => /\([A-Z]{1,5}\)/.test(s));
    for (const sentence of tickerSentences) {
      const tickers = sentence.match(/\(([A-Z]{1,5})\)/g);
      if (tickers) {
        for (const raw of tickers) {
          const ticker = raw.replace(/[()]/g, '');
          const lowerSentence = sentence.toLowerCase();
          const direction: 'long' | 'short' | 'neutral' =
            /overweight|add|buy|long|bullish|benefit|support|favor|relief|accumul/.test(lowerSentence) ? 'long' :
            /underweight|trim|sell|short|bearish|reduce|avoid|headwind|pressure|risk/.test(lowerSentence) ? 'short' :
            'neutral';
          // Remove the ticker itself from the reason
          const reason = sentence.replace(/\(([A-Z]{1,5})\)/g, '$1').trim();
          if (!tradeCards.find(t => t.ticker === ticker)) {
            tradeCards.push({ ticker, direction, reason });
          }
        }
      }
    }
    // If we extracted inline trades, clear those sentences from introLines
    if (tradeCards.length > 0) {
      const tickerSentenceSet = new Set(tickerSentences.map(s => s.trim()));
      const cleanedIntro = introLines
        .join('\n')
        .split(/(?<=[.!?])\s+/)
        .filter(s => !tickerSentenceSet.has(s.trim()))
        .join(' ')
        .trim();
      introLines.length = 0;
      if (cleanedIntro) introLines.push(cleanedIntro);
    }
  }

  return (
    <>
      {introLines.length > 0 && introLines.map((p, pIdx) => (
        <p key={`intro-${pIdx}`} className={cn("text-[13px] leading-relaxed text-[#C8BFA0]", pIdx > 0 && "mt-2")}>
          {renderAnalysisText(p.trim())}
        </p>
      ))}

      {tradeCards.length > 0 && (
        <div className={cn("space-y-1.5", introLines.length > 0 && "mt-3")}>
          {tradeCards.map((trade, tIdx) => {
            const dirColor = trade.direction === 'long' ? '#22C55E' : trade.direction === 'short' ? '#EF4444' : '#F59E0B';
            const DirIcon = trade.direction === 'long' ? ArrowUpRight : trade.direction === 'short' ? ArrowDownRight : Minus;
            const dirLabel = trade.direction === 'long' ? 'LONG' : trade.direction === 'short' ? 'SHORT' : 'WATCH';
            return (
              <div key={tIdx} className="flex items-start gap-2.5 p-2.5 rounded-xl transition-all" style={{
                background: `${dirColor}06`,
                border: `1px solid ${dirColor}15`,
              }}>
                <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                  <DirIcon className="w-3 h-3" style={{ color: dirColor }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider w-10" style={{ color: dirColor }}>{dirLabel}</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-[#E8D5A3] flex-shrink-0 mt-px px-1.5 py-0.5 rounded" style={{
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.08))',
                  border: '1px solid rgba(201,166,70,0.25)',
                }}>
                  {trade.ticker}
                </span>
                <p className="text-[12px] text-[#C8BFA0] leading-relaxed flex-1">
                  {trade.reason}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {tradeCards.length === 0 && introLines.length === 0 && (
        <>
          {section.content.split('\n\n').filter(Boolean).map((paragraph, pIdx) => (
            <p key={pIdx} className={cn("text-[13px] leading-relaxed text-[#C8BFA0]", pIdx > 0 && "mt-2.5")}>
              {renderAnalysisText(paragraph.trim())}
            </p>
          ))}
        </>
      )}
    </>
  );
}




// =====================================================
// CPI AI DEEP INTELLIGENCE
// Server-cached AI analysis: 1 call/2hrs serves 10K users
// Shows 7 sections parsed from AI response
// =====================================================

const CPIDeepIntelligence = memo(({ data }: { data: CPIIntelligenceData | null }) => {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const aiSections = useMemo(() => {
    const analysis = data?.aiAnalysis?.analysis;
    if (!analysis) return null;
    const clean = analysis.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,3}\s?/g, '');
    const blocks = clean.split('\n\n').filter(Boolean);

    const result: { header: string; content: string }[] = [];
    let current: { header: string; content: string } | null = null;

    for (const block of blocks) {
      const lines = block.split('\n').filter(Boolean);
      const firstLine = lines[0] || '';

      if (/^[A-Z\s&]{4,}[—\-]/i.test(firstLine) || /^(HEADLINE|CORE CPI|SHELTER|SUPERCORE|BASE EFFECT|SECTOR IMPACT|FED IMPLICATION)/i.test(firstLine)) {
        if (current) result.push(current);
        const sepIdx = Math.max(firstLine.indexOf(':'), firstLine.indexOf('—'));
        const headerPart = sepIdx > 0 ? firstLine.slice(0, sepIdx).trim() : firstLine.replace(/[:—\-]$/, '').trim();
        const bodyPart = sepIdx > 0 ? firstLine.slice(sepIdx + 1).trim() : '';
        current = { header: headerPart, content: bodyPart ? bodyPart + '\n' + lines.slice(1).join('\n') : lines.slice(1).join('\n') };
      } else if (current) {
        current.content += '\n' + block;
      }
    }
    if (current) result.push(current);
    return result;
  }, [data?.aiAnalysis]);

  if (!aiSections || aiSections.length === 0) return null;

  const getSectionIcon = (header: string) => {
    if (/HEADLINE/i.test(header)) return Zap;
    if (/CORE/i.test(header)) return Target;
    if (/SHELTER/i.test(header)) return Home;
    if (/SUPERCORE/i.test(header)) return Eye;
    if (/BASE/i.test(header)) return Clock;
    if (/SECTOR|POSITION/i.test(header)) return Crosshair;
    if (/FED|RATE/i.test(header)) return Banknote;
    return Layers;
  };

  const getSectionColor = (header: string) => {
    if (/HEADLINE/i.test(header)) return '#F59E0B';
    if (/CORE/i.test(header)) return '#EF4444';
    if (/SHELTER/i.test(header)) return '#8B5CF6';
    if (/SUPERCORE/i.test(header)) return '#F59E0B';
    if (/BASE/i.test(header)) return '#3B82F6';
    if (/SECTOR|POSITION/i.test(header)) return '#22C55E';
    if (/FED|RATE/i.test(header)) return '#C9A646';
    return '#C9A646';
  };

  const toggle = useCallback((idx: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-4 h-4 text-[#C9A646]" />
          <h3 className="text-sm font-semibold text-white">AI Inflation Intelligence</h3>
          <span className="text-[10px] text-[#6B6B6B]">sector & Fed implications</span>
          {data?.aiAnalysis && (
            <span className="ml-auto text-[9px] text-[#6B6B6B]">
              {data.aiAnalysis.cached ? `cached ${data.aiAnalysis.ageMinutes}m ago` : 'fresh'}
            </span>
          )}
        </div>
        <p className="text-[10px] text-[#6B6B6B] mb-3 pl-6">AI-generated analysis powered by GPT-4o — 1 shared call per 2 hours</p>

        <div className="space-y-2">
          {aiSections.map((section, idx) => {
            const Icon = getSectionIcon(section.header);
            const color = getSectionColor(section.header);
            const isOpen = expanded.has(idx);
            return (
              <div
                key={idx}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  background: isOpen ? `${color}08` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isOpen ? color + '20' : 'rgba(201,166,70,0.06)'}`,
                }}
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <span className="text-sm font-medium text-white">{fixCapsText(section.header)}</span>
                  </div>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-[#6B6B6B] transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-3.5">
                    <div className="pl-[34px]">
                      {renderSectionContent(section)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
});
CPIDeepIntelligence.displayName = 'CPIDeepIntelligence';

// =====================================================
// PPI AI DEEP INTELLIGENCE
// Server-cached AI analysis: 1 call/2hrs serves 10K users
// Shows 6 sections parsed from AI response
// =====================================================

const PPIDeepIntelligence = memo(({ data }: { data: PPIIntelligenceData | null }) => {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const aiSections = useMemo(() => {
    const analysis = data?.aiAnalysis?.analysis;
    if (!analysis) return null;
    const clean = analysis.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,3}\s?/g, '');
    const blocks = clean.split('\n\n').filter(Boolean);

    const result: { header: string; content: string }[] = [];
    let current: { header: string; content: string } | null = null;

    for (const block of blocks) {
      const lines = block.split('\n').filter(Boolean);
      const firstLine = lines[0] || '';

      if (/^[A-Z\s&]{4,}[—\-]/i.test(firstLine) || /^(HEADLINE PPI|PIPELINE|GOODS|SERVICES|MARGIN|FED|PCE|POSITIONING|TRADE)/i.test(firstLine)) {
        if (current) result.push(current);
        const sepIdx = Math.max(firstLine.indexOf(':'), firstLine.indexOf('—'));
        const headerPart = sepIdx > 0 ? firstLine.slice(0, sepIdx).trim() : firstLine.replace(/[:—\-]$/, '').trim();
        const bodyPart = sepIdx > 0 ? firstLine.slice(sepIdx + 1).trim() : '';
        current = { header: headerPart, content: bodyPart ? bodyPart + '\n' + lines.slice(1).join('\n') : lines.slice(1).join('\n') };
      } else if (current) {
        current.content += '\n' + block;
      }
    }
    if (current) result.push(current);
    return result;
  }, [data?.aiAnalysis]);

  if (!aiSections || aiSections.length === 0) return null;

  const getSectionIcon = (header: string) => {
    if (/HEADLINE/i.test(header)) return Zap;
    if (/PIPELINE|CPI/i.test(header)) return TrendingUp;
    if (/GOODS|SERVICE/i.test(header)) return Layers;
    if (/MARGIN|PROFIT/i.test(header)) return Briefcase;
    if (/FED|PCE|RATE/i.test(header)) return Banknote;
    if (/POSITION|TRADE/i.test(header)) return Crosshair;
    return Activity;
  };

  const getSectionColor = (header: string) => {
    if (/HEADLINE/i.test(header)) return '#F59E0B';
    if (/PIPELINE|CPI/i.test(header)) return '#3B82F6';
    if (/GOODS|SERVICE/i.test(header)) return '#8B5CF6';
    if (/MARGIN|PROFIT/i.test(header)) return '#EF4444';
    if (/FED|PCE|RATE/i.test(header)) return '#C9A646';
    if (/POSITION|TRADE/i.test(header)) return '#22C55E';
    return '#C9A646';
  };

  const toggle = useCallback((idx: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-4 h-4 text-[#C9A646]" />
          <h3 className="text-sm font-semibold text-white">AI Producer Price Intelligence</h3>
          <span className="text-[10px] text-[#6B6B6B]">pipeline & margin implications</span>
          {data?.aiAnalysis && (
            <span className="ml-auto text-[9px] text-[#6B6B6B]">
              {data.aiAnalysis.cached ? `cached ${data.aiAnalysis.ageMinutes}m ago` : 'fresh'}
            </span>
          )}
        </div>
        <p className="text-[10px] text-[#6B6B6B] mb-3 pl-6">AI-generated analysis powered by GPT-4o — 1 shared call per 2 hours</p>

        <div className="space-y-2">
          {aiSections.map((section, idx) => {
            const Icon = getSectionIcon(section.header);
            const color = getSectionColor(section.header);
            const isOpen = expanded.has(idx);
            return (
              <div
                key={idx}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  background: isOpen ? `${color}08` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isOpen ? color + '20' : 'rgba(201,166,70,0.06)'}`,
                }}
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <span className="text-sm font-medium text-white">{fixCapsText(section.header)}</span>
                  </div>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-[#6B6B6B] transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-3.5">
                    <div className="pl-[34px]">
                      {renderSectionContent(section)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
});
PPIDeepIntelligence.displayName = 'PPIDeepIntelligence';

// =====================================================
// DEEP DATA-DRIVEN ANALYSIS ENGINE
// Zero AI cost — computed from real indicator values
// Provides meaningful, actionable intelligence
// =====================================================

interface AnalysisBlock {
  title: string;
  icon: React.ElementType;
  color: string;
  content: string;
}

function buildDeepAnalysis(
  report: ReportDef,
  matchedIndicators: IndicatorData[],
  allIndicators: IndicatorData[],
  fedData: FedData | null
): AnalysisBlock[] {
  const blocks: AnalysisBlock[] = [];
  const primary = matchedIndicators[0];

  // ===== ISM =====
  if (report.id === 'ism') {
    const pmi = matchedIndicators.find(i => i.id === 'ismMfg');
    const newOrders = matchedIndicators.find(i => i.id === 'ismNewOrders');
    const production = matchedIndicators.find(i => i.id === 'ismProduction');
    const employment = matchedIndicators.find(i => i.id === 'ismEmployment');
    const prices = matchedIndicators.find(i => i.id === 'ismPrices');

    if (pmi) {
      const pmiVal = pmi.value;
      const isExpanding = pmiVal >= 50;
      const momentum = pmi.change;

      // 1. Current State
      let stateText = '';
      if (pmiVal >= 55) stateText = `Manufacturing is in strong expansion at ${pmiVal}. This level historically correlates with S&P 500 earnings growth of 8-12% YoY. Cyclicals, industrials (XLI), and materials (XLB) tend to outperform in this environment.`;
      else if (pmiVal >= 50) stateText = `Manufacturing is in mild expansion at ${pmiVal}. The economy is growing but not overheating. This is a "Goldilocks" zone for equities — strong enough for earnings but not so hot that it triggers aggressive Fed tightening.`;
      else if (pmiVal >= 48) stateText = `Manufacturing is near the expansion threshold at ${pmiVal}. Historically, readings between 48-50 often precede a cyclical recovery. Smart money starts rotating into cyclicals here — the risk/reward is asymmetric.`;
      else if (pmiVal >= 45) stateText = `Manufacturing is in moderate contraction at ${pmiVal}. This signals economic slowdown but not recession. Defensive positioning is warranted — utilities (XLU), healthcare (XLV), and consumer staples (XLP) tend to outperform.`;
      else stateText = `Manufacturing is in deep contraction at ${pmiVal}. Below 45 has historically preceded recessions 65% of the time. Risk-off positioning: overweight bonds, gold, and defensive sectors. Underweight cyclicals.`;

      blocks.push({
        title: 'Current State',
        icon: Activity,
        color: isExpanding ? '#22C55E' : '#EF4444',
        content: stateText,
      });

      // 2. Sub-Index Deep Dive
      const subParts: string[] = [];
      if (newOrders) {
        const no = newOrders.value;
        if (no >= 55) subParts.push(`New Orders at ${no} — the most forward-looking component is signaling strong demand ahead. This leads production by 1-2 months and GDP by 2-3 months.`);
        else if (no >= 50) subParts.push(`New Orders at ${no} — modest demand growth. Enough to sustain expansion but not enough to signal a strong acceleration.`);
        else subParts.push(`New Orders at ${no} — below 50 means demand is shrinking. This is a leading recession indicator. If it stays below 50 for 3+ months, expect GDP to weaken.`);
      }
      if (prices) {
        const pr = prices.value;
        if (pr >= 60) subParts.push(`Prices Paid at ${pr} — input costs are surging. This is an inflation warning signal. The Fed will take note — this makes cuts less likely. Watch for margin compression in manufacturing-heavy sectors.`);
        else if (pr >= 50) subParts.push(`Prices Paid at ${pr} — moderate input inflation. Not alarming but not disinflationary either.`);
        else subParts.push(`Prices Paid at ${pr} — deflation in input costs. This is disinflationary and supportive of Fed easing. Good for margins.`);
      }
      if (employment) {
        const emp = employment.value;
        if (emp >= 50) subParts.push(`Employment at ${emp} — factories are hiring. This supports NFP prints and consumer spending.`);
        else subParts.push(`Employment at ${emp} — factories are cutting jobs. Watch for this to show up in upcoming NFP data.`);
      }

      // Stagflation check
      if (newOrders && prices && newOrders.value < 50 && prices.value > 55) {
        subParts.push(`⚠️ STAGFLATION SIGNAL: New Orders < 50 while Prices Paid > 55. This is the worst combo for markets — demand falling while costs rise. The Fed is stuck between fighting inflation and supporting growth.`);
      }

      if (subParts.length > 0) {
        blocks.push({
          title: 'Component Analysis',
          icon: Layers,
          color: '#C9A646',
          content: subParts.join('\n\n'),
        });
      }

      // 3. Momentum & Direction
      const hist = pmi.historicalData;
      let momentumText = '';
      if (hist && hist.length >= 3) {
        const last3 = hist.slice(-3);
        const trend3m = last3[2] - last3[0];
        if (trend3m > 2) momentumText = `3-month momentum is strongly positive (+${trend3m.toFixed(1)} pts). Manufacturing is accelerating. Historically when PMI gains 2+ pts over 3 months, S&P 500 returns average +4.2% over next quarter.`;
        else if (trend3m > 0) momentumText = `3-month momentum is positive (+${trend3m.toFixed(1)} pts). The trend is moving in the right direction. Gradual improvement is more sustainable than spikes.`;
        else if (trend3m > -2) momentumText = `3-month momentum is slightly negative (${trend3m.toFixed(1)} pts). Losing steam but not alarming yet. Watch the next print for confirmation.`;
        else momentumText = `3-month momentum is negative (${trend3m.toFixed(1)} pts). Manufacturing is deteriorating. Be cautious on cyclicals until we see stabilization.`;
      }
      if (momentumText) {
        blocks.push({
          title: 'Momentum & Trend',
          icon: TrendingUp,
          color: momentum > 0 ? '#22C55E' : '#EF4444',
          content: momentumText,
        });
      }

      // 4. Positioning
      let posText = '';
      if (pmiVal >= 52) posText = `Positioning: Risk-on. Overweight industrials (XLI), materials (XLB), financials (XLF), small caps (IWM). Underweight defensive sectors. Consider long copper/oil as manufacturing expansion drives commodity demand.`;
      else if (pmiVal >= 48 && momentum > 0) posText = `Positioning: Early cyclical rotation. Start adding to cyclicals on dips. ISM inflecting higher is one of the strongest buy signals for value/cyclical stocks. Consider XLI, XLB, IWM on pullbacks.`;
      else if (pmiVal >= 48) posText = `Positioning: Neutral with defensive tilt. Manufacturing is near the line — wait for direction before making big sector bets. Barbelling quality growth + defensives is prudent.`;
      else posText = `Positioning: Defensive. Overweight bonds (TLT), utilities (XLU), healthcare (XLV), gold (GLD). Underweight industrials and materials until PMI shows bottoming signals (2+ consecutive improvements).`;

      blocks.push({
        title: 'Market Positioning',
        icon: Crosshair,
        color: '#3B82F6',
        content: posText,
      });
    }
  }

  // ===== CPI =====
  else if (report.id === 'cpi') {
    const cpi = matchedIndicators.find(i => i.id === 'cpi');
    const core = matchedIndicators.find(i => i.id === 'coreCpi');
    const ppi = allIndicators.find(i => i.id === 'ppi');
    const corePce = allIndicators.find(i => i.id === 'corePce');

    if (cpi) {
      const v = cpi.value;
      const coreV = core?.value;
      const cpiHist = cpi.historicalData || [];
      const coreHist = core?.historicalData || [];

      // 1. HEADLINE vs EXPECTATIONS
      const prevV = cpi.previousValue;
      const delta = cpi.change;
      const absDelta = Math.abs(delta);
      let headlineText = `CPI YoY came in at ${v}% vs ${prevV}% prior (${delta > 0 ? '+' : ''}${delta.toFixed(2)}pp change).`;
      if (absDelta >= 0.3) headlineText += ` This is a significant move — a ${delta > 0 ? 'hot' : 'cool'} print that will drive volatility. Deviations of 0.3pp+ from prior typically trigger 1-2% moves in rate-sensitive assets within the first hour.`;
      else if (absDelta >= 0.1) headlineText += ` A meaningful ${delta > 0 ? 'upside' : 'downside'} surprise vs the prior reading. Not extreme, but enough to shift the narrative for the next FOMC meeting.`;
      else headlineText += ` Essentially in line with the prior reading. This is a "no news" print — confirming the existing trend rather than shifting the narrative. Low-volatility reaction expected.`;
      
      if (cpiHist.length >= 6) {
        const last6Changes = [];
        for (let i = cpiHist.length - 1; i >= Math.max(1, cpiHist.length - 6); i--) {
          last6Changes.push(Math.abs(cpiHist[i] - cpiHist[i - 1]));
        }
        const avgMove = last6Changes.reduce((a, b) => a + b, 0) / last6Changes.length;
        if (absDelta > avgMove * 1.5) headlineText += ` The ${absDelta.toFixed(2)}pp move is well above the 6-month average change of ${avgMove.toFixed(2)}pp — this is a statistically notable deviation.`;
      }
      blocks.push({ title: 'Headline vs Prior — The First 30 Seconds', icon: Zap, color: absDelta >= 0.2 ? (delta > 0 ? '#EF4444' : '#22C55E') : '#F59E0B', content: headlineText });

      // 2. CORE CPI — THE FED'S FOCUS
      if (coreV != null && core) {
        let coreText = `Core CPI (ex food & energy) at ${coreV}% YoY (${core.change > 0 ? '+' : ''}${core.change.toFixed(2)}pp vs prior ${core.previousValue}%).`;
        
        // 3-month annualized calculation
        if (coreHist.length >= 4) {
          const recent3 = coreHist.slice(-3);
          const threeMonthsAgo = coreHist[coreHist.length - 4];
          const change3m = recent3[2] - threeMonthsAgo;
          const ann3m = (change3m * 4).toFixed(2); // annualized
          const isReaccel = parseFloat(ann3m) > coreV;
          coreText += ` The 3-month annualized rate is running at approximately ${ann3m}%. ${isReaccel ? 'CRITICAL: 3-month annualized ABOVE the YoY rate means inflation is RE-ACCELERATING beneath the surface. The YoY number is masking a worsening trend. The Fed will see through this.' : 'The 3-month trend is running below the annual rate — disinflation momentum is intact. This is the path the Fed needs to see to justify cuts.'}`;
        }
        
        // Stickiness assessment
        if (coreHist.length >= 4) {
          const last4 = coreHist.slice(-4);
          const range = Math.max(...last4) - Math.min(...last4);
          if (range < 0.15) coreText += ` Core CPI has been stuck in a ${range.toFixed(2)}pp range over the last 4 months — this is "sticky" inflation. The Fed needs to see a decisive break lower.`;
        }
        
        // Core vs Headline spread
        const coreSpread = coreV - v;
        if (Math.abs(coreSpread) >= 0.2) {
          coreText += ` ${coreSpread > 0 ? `Core running ${coreSpread.toFixed(2)}pp above headline suggests sticky services inflation is the problem — food/energy are masking the underlying pressure.` : `Core ${Math.abs(coreSpread).toFixed(2)}pp below headline — underlying inflation is actually better than the headline suggests. Volatile components (food/energy) are distorting the picture upward.`}`;
        }
        blocks.push({ title: 'Core CPI — The Fed\'s Real Focus', icon: Target, color: coreV <= 2.5 ? '#22C55E' : coreV <= 3.5 ? '#F59E0B' : '#EF4444', content: coreText });
      }

      // 3. SHELTER — THE LAGGING GIANT
      let shelterText = `Shelter is approximately 35% of headline CPI and approximately 45% of Core CPI — it is by far the single largest component and the one most likely to distort the overall picture.`;
      if (coreV != null) {
        if (coreV > 3.0) shelterText += ` With Core CPI at ${coreV}%, shelter is almost certainly the primary culprit keeping it elevated. The CPI shelter component uses Owners' Equivalent Rent (OER) which lags real-time market rents by 6-12 months. Real-time rental indices (Zillow, Apartment List) have shown deceleration for months — this means CPI shelter has significant "baked-in" disinflation coming, but it takes time to feed through.`;
        else if (coreV > 2.5) shelterText += ` Shelter is likely still above its pre-pandemic run rate but starting to decelerate. The lag between market rents and OER means we should expect further improvements over the next 3-6 months. This is the disinflationary tailwind that gives the Fed confidence.`;
        else shelterText += ` At this level of Core CPI, shelter has likely normalized significantly. When shelter completes its catch-down to market rents, there is risk of inflation undershooting the 2% target.`;
      }
      shelterText += ` Key watch: if CPI ex-shelter is already below 2%, then the entire "inflation problem" is a lagged housing measurement issue, not a broad-based pricing phenomenon.`;
      blocks.push({ title: 'Shelter — The Lagging Giant (35% of CPI)', icon: Home, color: '#8B5CF6', content: shelterText });

      // 4. SUPERCORE — THE FED'S SECRET GAUGE
      let supercoreText = `"Supercore" — services excluding shelter — is the metric Fed officials have repeatedly cited as the key gauge of underlying inflation pressure. It captures wage-driven inflation in categories like medical care, education, insurance, and airfares.`;
      if (coreV != null) {
        const impliedSupercore = coreV > v ? 'elevated' : 'moderate';
        supercoreText += ` With Core CPI at ${coreV}% and headline at ${v}%, the services component is likely running ${impliedSupercore}. ${coreV > v ? 'When core exceeds headline, it signals that services inflation is the dominant force — this is directly tied to wage growth and the labor market. Until the labor market loosens further, supercore will remain sticky.' : 'Core below headline is a positive signal for supercore — it suggests services inflation is not the dominant driver, giving the Fed more room to ease.'}`;
      }
      if (corePce) {
        supercoreText += ` Cross-reference: Core PCE (the Fed\'s preferred measure) is at ${corePce.value}%, ${corePce.value < (coreV || 3) ? 'running below Core CPI as usual — PCE typically reads 0.3-0.5pp lower due to methodology differences. What matters is the direction.' : 'tracking closely with Core CPI.'}`;
      }
      blocks.push({ title: 'Supercore — What the Fed Really Watches', icon: Eye, color: '#F59E0B', content: supercoreText });

      // 5. BASE EFFECTS — THE FORWARD PATH
      let baseText = '';
      if (cpiHist.length >= 12) {
        const currentYoY = cpiHist[cpiHist.length - 1];
        // The "base" that will drop out next month is from ~12 months ago
        // We can estimate using the historical YoY data trajectory
        const yearAgoChange = cpiHist.length >= 13 ? (cpiHist[cpiHist.length - 12] - cpiHist[cpiHist.length - 13]) : null;
        
        baseText = `Base effects refer to what happened 12 months ago that is about to "roll off" the YoY calculation. Current CPI YoY is ${currentYoY.toFixed(2)}%.`;
        
        if (yearAgoChange !== null) {
          if (yearAgoChange > 0.15) baseText += ` A relatively high reading from last year is about to drop out of the calculation — this creates a favorable base effect. Even a "normal" monthly print of 0.2-0.3% would cause the YoY rate to decline further. The disinflation path has a tailwind.`;
          else if (yearAgoChange < -0.1) baseText += ` A low reading from last year is about to drop out — this creates an unfavorable base effect. Even if monthly inflation is well-behaved, the YoY rate could tick up. Don't panic if next month's YoY is slightly higher — it may be purely arithmetic.`;
          else baseText += ` The base from a year ago is relatively neutral. Next month's YoY will be primarily driven by the actual monthly print rather than base effect mechanics.`;
        }
        
        // Projection
        baseText += ` Rough projection: if the next MoM print comes in at 0.2% (benign), YoY would likely edge ${v > 2.5 ? 'lower toward' : 'stay near'} ${(v - 0.05).toFixed(1)}-${v.toFixed(1)}%. If MoM prints 0.3% (warm), YoY would likely ${v <= 2.5 ? 'remain around' : 'hold near'} ${v.toFixed(1)}-${(v + 0.1).toFixed(1)}%. The trend matters more than any single print — watch the 3-month direction.`;
      } else {
        baseText = `Insufficient historical data (need 12+ months) to calculate base effects precisely. Focus on the trend direction of the last 3-6 readings instead: ${cpi.trend === 'improving' ? 'the trend is clearly disinflationary' : cpi.trend === 'declining' ? 'the trend shows re-acceleration' : 'the trend is flat/range-bound'}.`;
      }
      blocks.push({ title: 'Base Effects — The Forward Path', icon: Clock, color: '#3B82F6', content: baseText });

      // 6. FED & REAL RATE
      let fedText = `Current Fed Funds: ${fedData?.currentRate || '?'}%.`;
      if (fedData) {
        const realRate = (fedData.currentRate - v).toFixed(1);
        fedText += ` Real rate (Fed Funds - CPI): ${realRate}%. ${parseFloat(realRate) > 2.0 ? 'Real rate is deeply restrictive — policy is actively crushing demand. This level is historically unsustainable for more than 12-18 months without triggering a downturn.' : parseFloat(realRate) > 1.0 ? 'Real rate is meaningfully restrictive — the Fed is successfully tightening financial conditions.' : parseFloat(realRate) > 0 ? 'Real rate is mildly positive — policy is slightly restrictive but not aggressively so.' : 'Real rate is negative — despite rate hikes, policy is still accommodative in inflation-adjusted terms.'}`;
        const cutsCount = fedData.meetings?.filter(m => m.decision === 'cut').length || 0;
        fedText += ` Market pricing: ${cutsCount} rate cuts expected.`;
        if (v <= 2.5 && cutsCount < 3) fedText += ' With inflation near target, markets may be under-pricing the easing cycle.';
        else if (v > 3.0 && cutsCount >= 2) fedText += ' With inflation elevated, current cut pricing faces repricing risk — hawkish surprise likely.';
      }
      if (ppi) {
        fedText += `\n\nPipeline signal: PPI at ${ppi.value}% (${ppi.trend}). ${ppi.value < v ? 'PPI below CPI = positive pipeline — producer costs are easing, which should flow through to consumer prices in 1-3 months.' : 'PPI above CPI = margin compression ahead and potential upward pressure on consumer prices.'}`;
      }
      blocks.push({ title: 'Fed & Rate Impact', icon: Banknote, color: '#F59E0B', content: fedText });

      // 7. POSITIONING
      let posText = '';
      if (cpi.trend === 'improving' && delta < 0) {
        posText = `Disinflationary trade in play. Overweight: long-duration bonds (TLT), growth/tech (QQQ), REITs (VNQ), homebuilders (XHB), and utilities (XLU). These sectors benefit directly from falling inflation expectations and rate cut pricing. Underweight energy (XLE) and commodities — they lose the inflation tailwind.`;
        if (coreV != null && coreV <= 3.0) posText += ` With Core CPI at ${coreV}%, the "mission accomplished" narrative is gaining traction. Risk-on positioning is warranted.`;
      } else if (cpi.trend === 'declining' || delta > 0.1) {
        posText = `Inflation is sticky or re-accelerating. Overweight: energy (XLE), commodities (DJP), value stocks, financials (XLF), and TIPS (TIP). Short duration on fixed income — avoid TLT. Underweight high-multiple growth and rate-sensitive sectors.`;
        if (coreV != null && coreV > 3.0) posText += ` Core at ${coreV}% keeps the Fed hawkish. Don't fight this — defensive positioning with inflation hedges is the play.`;
      } else {
        posText = `Stable inflation with no clear directional break — low conviction macro environment. Focus on stock-picking over sector bets. Quality factor (QUAL) tends to outperform when inflation is range-bound. Barbell strategy: some growth + some value + modest bond allocation.`;
      }
      blocks.push({ title: 'Market Positioning', icon: Crosshair, color: '#3B82F6', content: posText });
    }
  }

  // ===== GDP =====
  else if (report.id === 'gdp') {
    const gdp = matchedIndicators.find(i => i.id === 'gdp');
    if (gdp) {
      const v = gdp.value;
      let stateText = '';
      if (v >= 3.0) stateText = `GDP at ${v}% QoQ annualized — the economy is running hot. Above 3% growth typically means strong corporate earnings (+10-15% YoY historically). However, it also reduces urgency for Fed cuts and can reignite inflation fears. This is bullish for cyclicals but creates a ceiling for rate-sensitive sectors.`;
      else if (v >= 1.5) stateText = `GDP at ${v}% QoQ annualized — moderate, sustainable growth. This is the "Goldilocks" zone: strong enough for earnings, soft enough for the Fed to ease. Historically the best environment for equities with average annual returns of 12-15%.`;
      else if (v >= 0) stateText = `GDP at ${v}% QoQ annualized — the economy is barely growing. This is the danger zone: close to stalling. If consumer spending (70% of GDP) weakens further, recession risk rises materially. The Fed will likely accelerate cuts.`;
      else stateText = `GDP at ${v}% — negative growth. If this continues for a second quarter, it's a technical recession. Risk-off: overweight treasuries, defensive sectors, and gold. The Fed will likely shift to emergency easing mode.`;

      blocks.push({ title: 'Growth Assessment', icon: TrendingUp, color: v >= 2 ? '#22C55E' : v >= 0 ? '#F59E0B' : '#EF4444', content: stateText });

      const hist = gdp.historicalData;
      if (hist && hist.length >= 3) {
        const acceleration = hist[hist.length - 1] - hist[hist.length - 2];
        blocks.push({
          title: 'Momentum',
          icon: Activity,
          color: acceleration > 0 ? '#22C55E' : '#EF4444',
          content: `GDP ${acceleration > 0 ? 'accelerated' : 'decelerated'} by ${Math.abs(acceleration).toFixed(1)}pp vs prior quarter. ${acceleration > 0.5 ? 'Strong acceleration — the economy is gaining steam. Pro-growth assets should outperform.' : acceleration < -0.5 ? 'Sharp deceleration — growth is fading fast. This is when the smart money starts rotating to defensives and bonds.' : 'Modest change — no regime shift yet. Stay with current positioning.'}`,
        });
      }
    }
  }

  // ===== NFP =====
  else if (report.id === 'nfp') {
    const nfp = matchedIndicators.find(i => i.id === 'nfp');
    const unemp = matchedIndicators.find(i => i.id === 'unemployment');
    const claims = matchedIndicators.find(i => i.id === 'initialClaims');
    const earnings = matchedIndicators.find(i => i.id === 'avgHourlyEarn');

    const parts: string[] = [];
    if (nfp) {
      const v = nfp.value;
      if (v >= 200) parts.push(`NFP at ${v}K — robust job creation. Above 200K is considered strong. This signals a resilient economy but makes the Fed less likely to cut rates. Good for consumer-facing stocks, challenging for rate-sensitive sectors.`);
      else if (v >= 100) parts.push(`NFP at ${v}K — moderate job growth. This is the sweet spot: enough to sustain the expansion, not so hot that it triggers Fed hawkishness.`);
      else if (v >= 0) parts.push(`NFP at ${v}K — weak job creation. Below 100K signals meaningful labor market cooling. The Fed will take notice — this accelerates the cut timeline.`);
      else parts.push(`NFP at ${v}K — job losses. Negative NFP is a recessionary signal. Expect emergency Fed action and a flight to safety in treasuries and gold.`);
    }
    if (unemp) parts.push(`Unemployment at ${unemp.value}%. ${unemp.value <= 3.8 ? 'Still historically tight — no labor market stress yet.' : unemp.value <= 4.5 ? 'Rising but not alarming. The Sahm Rule triggers at 0.5pp rise from 12-month low — watch this closely.' : 'Elevated — labor market is clearly weakening. This is the Fed\'s dual mandate at work — cuts are coming.'}`);
    if (claims) parts.push(`Initial Claims at ${claims.value}K. ${claims.value < 220 ? 'Very low — no signs of layoffs.' : claims.value < 280 ? 'Normal range — labor market is healthy.' : 'Elevated — rising claims foreshadow weak future NFP prints.'}`);
    if (earnings) parts.push(`Avg Hourly Earnings: $${earnings.value}. ${earnings.trend === 'improving' ? 'Wage growth is accelerating — this feeds into services inflation (the stickiest component). Hawkish for Fed.' : 'Wage growth is moderating — this is what the Fed wants to see for disinflation.'}`);

    if (parts.length > 0) {
      blocks.push({ title: 'Labor Market Assessment', icon: Users, color: nfp && nfp.value >= 100 ? '#22C55E' : '#F59E0B', content: parts.join('\n\n') });
    }
  }

  // ===== PPI =====
  else if (report.id === 'ppi') {
    const ppi = matchedIndicators.find(i => i.id === 'ppi');
    const cpi = allIndicators.find(i => i.id === 'cpi');
    if (ppi) {
      const v = ppi.value;
      let text = '';
      if (v > (cpi?.value || 3)) text = `PPI at ${v}% running above CPI (${cpi?.value || '?'}%). This signals margin compression ahead — producers are absorbing higher costs that haven't fully passed through to consumers yet. Negative for corporate margins.`;
      else if (v < (cpi?.value || 2)) text = `PPI at ${v}% below CPI (${cpi?.value || '?'}%). Good news: margin expansion. Producers face less input inflation than what consumers are paying. Positive for corporate profits, especially manufacturers.`;
      else text = `PPI at ${v}%, roughly in line with consumer inflation. Margins are stable. PPI typically leads CPI by 1-3 months, so watch for any directional shift.`;
      blocks.push({ title: 'Pipeline Inflation Analysis', icon: Factory, color: ppi.trend === 'declining' ? '#22C55E' : '#F59E0B', content: text });
    }
  }

  // ===== PCE =====
  else if (report.id === 'pce') {
    const pce = matchedIndicators.find(i => i.id === 'pce');
    const core = matchedIndicators.find(i => i.id === 'corePce');
    if (pce || core) {
      const v = (core || pce)!.value;
      const target = 2.0;
      const gapToTarget = (v - target).toFixed(1);
      let text = `Core PCE at ${v}% — ${parseFloat(gapToTarget) > 0 ? `${gapToTarget}pp above` : `${Math.abs(parseFloat(gapToTarget))}pp below`} the Fed's 2% target. This is THE metric the Fed watches.`;
      if (v <= 2.2) text += ` At this level, the Fed has a green light for rate cuts. Expect dovish pivot language. Bullish for bonds and growth stocks.`;
      else if (v <= 2.8) text += ` Getting closer to target. The Fed is likely shifting to a neutral stance. One or two more months of decline could trigger the first cut.`;
      else text += ` Still meaningfully above target. The Fed will maintain restrictive policy. Don't fight the Fed — avoid duration risk until PCE is clearly trending to 2.5%.`;
      blocks.push({ title: "Fed's Preferred Inflation Gauge", icon: Target, color: v <= 2.5 ? '#22C55E' : '#F59E0B', content: text });
    }
  }

  // ===== FOMC =====
  else if (report.id === 'fomc' && fedData) {
    const cutsCount = fedData.meetings?.filter(m => m.decision === 'cut').length || 0;
    const nextMeeting = fedData.meetings?.find((m: any) => m.isNext);
    const nextCut = fedData.meetings?.find((m: any) => m.decision === 'cut');

    let fedText = `Fed Funds at ${fedData.currentRate}%. 10Y Treasury at ${fedData.treasury10y}%. Yield curve (10Y-2Y) at ${fedData.yieldCurve > 0 ? '+' : ''}${fedData.yieldCurve.toFixed(2)}%.`;
    if (fedData.yieldCurve < 0) fedText += ` The yield curve remains inverted — historically this precedes recessions by 6-18 months. However, the inversion depth matters: shallow inversions sometimes resolve without recession.`;
    else if (fedData.yieldCurve > 0.5) fedText += ` The curve has steepened positively — this is a normalization signal. Historically bullish for banks, financials, and cyclicals.`;
    blocks.push({ title: 'Rates & Yield Curve', icon: Activity, color: '#C9A646', content: fedText });

    let pathText = `Market pricing: ${cutsCount} rate cuts expected over the next ${fedData.meetings?.length || '?'} meetings.`;
    if (nextMeeting) pathText += ` Next meeting: ${nextMeeting.decision.toUpperCase()} expected with ${nextMeeting.probability}% probability.`;
    if (nextCut) pathText += ` First cut expected: ${new Date(nextCut.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (${nextCut.probability}% probability).`;
    pathText += ` ${cutsCount >= 3 ? 'Aggressive easing priced — risk of hawkish repricing if inflation reaccelerates.' : cutsCount >= 1 ? 'Moderate easing expected — in line with soft landing scenario.' : 'No cuts priced — the Fed is on extended hold. Watch for any shift in language.'}`;
    if (fedData.balanceSheet) pathText += `\n\nBalance sheet: $${(fedData.balanceSheet.totalAssets / 1e6).toFixed(1)}T (${fedData.balanceSheet.changePercent > 0 ? '+' : ''}${fedData.balanceSheet.changePercent.toFixed(1)}% change). QT continues to drain liquidity from the system.`;
    blocks.push({ title: 'Rate Path & Policy', icon: Crosshair, color: '#3B82F6', content: pathText });
  }

  // ===== RETAIL =====
  else if (report.id === 'retail') {
    const retail = matchedIndicators.find(i => i.id === 'retailSales');
    if (retail) {
      let text = `Retail Sales at $${retail.value}B (${retail.change > 0 ? '+' : ''}${retail.change}B MoM). Consumer spending drives 70% of GDP — this is the backbone of the US economy.`;
      text += retail.trend === 'improving' ? ` Spending is rising — consumers remain resilient despite elevated rates. Bullish for consumer discretionary (XLY), restaurants, and e-commerce. But strong spending could delay Fed cuts.` : ` Spending is weakening — consumers are pulling back. Watch credit card delinquencies and consumer confidence for confirmation. If spending contracts further, GDP growth will slow.`;
      blocks.push({ title: 'Consumer Health', icon: ShoppingCart, color: retail.trend === 'improving' ? '#22C55E' : '#EF4444', content: text });
    }
  }

  // ===== HOUSING =====
  else if (report.id === 'housing') {
    const starts = matchedIndicators.find(i => i.id === 'housingStarts');
    const permits = matchedIndicators.find(i => i.id === 'buildingPermits');
    const mortgage = matchedIndicators.find(i => i.id === 'mortgageRate');

    const parts: string[] = [];
    if (mortgage) parts.push(`30Y Mortgage at ${mortgage.value}%. ${mortgage.value > 7 ? 'Above 7% is crushing affordability. Housing activity will remain depressed until rates come down meaningfully.' : mortgage.value > 6 ? 'Still elevated but starting to attract buyers who have been waiting on the sidelines.' : 'Below 6% would unlock significant pent-up demand. Watch for a surge in activity.'}`);
    if (starts) parts.push(`Housing Starts at ${starts.value}M annualized. ${starts.trend === 'improving' ? 'Rising starts signal builder confidence and future inventory.' : 'Declining starts mean builders are cautious — supply will remain tight.'}`);
    if (permits) parts.push(`Building Permits at ${permits.value}M. ${permits.trend === 'improving' ? 'Permits lead starts by 1-2 months — more activity ahead.' : 'Falling permits suggest further decline in construction activity.'} Permits > Starts = expansion ahead. Starts > Permits = contraction risk.`);
    if (parts.length > 0) {
      blocks.push({ title: 'Housing Sector Analysis', icon: Home, color: starts?.trend === 'improving' ? '#22C55E' : '#F59E0B', content: parts.join('\n\n') });
    }
  }

  return blocks;
}

// =====================================================
// ANALYSIS BLOCK RENDERER
// =====================================================

const AnalysisSection = memo(({ blocks }: { blocks: AnalysisBlock[] }) => {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const toggle = useCallback((idx: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-2">
      {blocks.map((block, idx) => {
        const Icon = block.icon;
        const isOpen = expanded.has(idx);
        return (
          <div
            key={idx}
            className="rounded-xl overflow-hidden transition-all"
            style={{
              background: isOpen ? `${block.color}08` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isOpen ? block.color + '20' : 'rgba(201,166,70,0.06)'}`,
            }}
          >
            <button
              onClick={() => toggle(idx)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: `${block.color}15` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: block.color }} />
                </div>
                <span className="text-sm font-medium text-white">{block.title}</span>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 text-[#6B6B6B] transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
              <div className="px-4 pb-3.5">
                <div className="pl-[34px]">
                  {block.content.split('\n\n').map((paragraph, pIdx) => (
                    <p key={pIdx} className={cn("text-[13px] leading-relaxed", pIdx > 0 && "mt-2.5",
                      paragraph.startsWith('⚠️') ? 'text-[#EF4444] font-medium' : 'text-[#C8BFA0]'
                    )}>
                      {renderAnalysisText(paragraph)}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
AnalysisSection.displayName = 'AnalysisSection';

// =====================================================
// SINGLE REPORT VIEW
// =====================================================

const ReportView = memo(({ report, indicators, fedData, ismIntelligence, ismSectorAI, gdpIntelligence, cpiIntelligence, ppiIntelligence }: {
  report: ReportDef;
  indicators: IndicatorData[];
  fedData: FedData | null;
  ismIntelligence: ISMIntelligenceData | null;
  ismSectorAI?: AIResult | null;
  gdpIntelligence?: GDPIntelligenceData | null;
  cpiIntelligence?: CPIIntelligenceData | null;
  ppiIntelligence?: PPIIntelligenceData | null;
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const matchedIndicators = useMemo(() =>
    indicators.filter(ind => report.indicatorIds.includes(ind.id)),
    [indicators, report.indicatorIds]
  );

  const primaryIndicator = matchedIndicators[0] || null;

  // Auto-expand first chart that has historical data
  const effectiveExpanded = useMemo(() => {
    if (expandedChart !== null) return expandedChart;
    const firstWithHistory = matchedIndicators.find(i => i.historicalData && i.historicalData.length >= 2);
    if (firstWithHistory) return firstWithHistory.id;
    return null;
  }, [matchedIndicators, expandedChart]);

  // Deep analysis blocks
  const analysisBlocks = useMemo(() =>
    buildDeepAnalysis(report, matchedIndicators, indicators, fedData),
    [report, matchedIndicators, indicators, fedData]
  );

  return (
    <div className="space-y-3">
      {/* ===== HEADER ===== */}
      <Card highlight>
        <div className="p-4">
          <div className="flex items-start justify-between mb-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(244,217,123,0.08))', border: '1px solid rgba(201,166,70,0.25)' }}
              >
                <report.icon className="w-4 h-4 text-[#C9A646]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white leading-tight">{report.fullName}</h2>
                <p className="text-xs text-[#6B6B6B] mt-0.5 truncate">{report.description}</p>
              </div>
            </div>
            {report.id === 'ism' && ismIntelligence && (
              <Badge variant={ismIntelligence.isExpansion ? 'success' : 'danger'}>
                {ismIntelligence.isExpansion ? 'EXPANSION' : 'CONTRACTION'}
              </Badge>
            )}
          </div>

          {/* Inline metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] mb-2.5 pl-12">
            <span className="text-[#6B6B6B]">
              <a href={report.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="text-[#C9A646] hover:text-[#F4D97B] inline-flex items-center gap-0.5">
                {report.source} <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </span>
            <span className="text-[#6B6B6B]">{report.frequency}</span>
            {primaryIndicator && (
              <span className="text-[#6B6B6B]">
                Updated {new Date(primaryIndicator.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* Collapsible context */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-[11px] text-[#C9A646] hover:text-[#F4D97B] transition-colors pl-12"
          >
            <ChevronDown className={cn("w-3 h-3 transition-transform", showDetails && "rotate-180")} />
            Context & Fed relevance
          </button>

          {showDetails && (
            <div className="mt-2.5 ml-12 space-y-2">
              <div className="p-2.5 rounded-lg bg-white/[0.03]">
                <p className="text-[10px] text-[#C9A646] font-semibold mb-0.5">Why It Matters</p>
                <p className="text-xs text-[#8B8B8B] leading-relaxed">{report.whyItMatters}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.03]">
                <p className="text-[10px] text-[#F59E0B] font-semibold mb-0.5">🏛️ Fed Relevance</p>
                <p className="text-xs text-[#8B8B8B] leading-relaxed">{report.fedRelevance}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {report.keyComponents.map((comp, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded text-[10px] text-[#8B8B8B] bg-white/[0.04]">{comp}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ===== FOMC: Rate Dashboard ===== */}
      {report.id === 'fomc' && fedData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(201,166,70,0.06)', border: '1px solid rgba(201,166,70,0.2)' }}>
            <p className="text-[10px] text-[#6B6B6B] mb-0.5">Fed Funds</p>
            <p className="text-xl font-bold text-[#C9A646] tabular-nums">{fedData.currentRate}%</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-[#6B6B6B] mb-0.5">10Y Treasury</p>
            <p className="text-xl font-bold text-white tabular-nums">{fedData.treasury10y}%</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-[#6B6B6B] mb-0.5">2Y Treasury</p>
            <p className="text-xl font-bold text-white tabular-nums">{fedData.treasury2y}%</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-[#6B6B6B] mb-0.5">Yield Curve</p>
            <p className={cn("text-xl font-bold tabular-nums", fedData.yieldCurve > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
              {fedData.yieldCurve > 0 ? '+' : ''}{fedData.yieldCurve.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* ===== ISM PMI HISTORICAL CHART ===== */}
      {report.id === 'ism' && ismIntelligence && ismIntelligence.historicalPmi && ismIntelligence.historicalPmi.length > 3 && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#C9A646]" />
                <h3 className="text-sm font-semibold text-white">ISM PMI Trend</h3>
                <span className="text-[10px] text-[#6B6B6B]">{ismIntelligence.historicalPmi.length} months</span>
              </div>
              <div className="flex items-center gap-2">
                {ismIntelligence.priorPmi != null && (
                  <span className={cn("text-xs font-medium",
                    ismIntelligence.pmi > ismIntelligence.priorPmi ? 'text-[#22C55E]' : ismIntelligence.pmi < ismIntelligence.priorPmi ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                  )}>
                    {ismIntelligence.pmi > ismIntelligence.priorPmi ? '↗ +' : ismIntelligence.pmi < ismIntelligence.priorPmi ? '↘ ' : '→ '}
                    {(ismIntelligence.pmi - ismIntelligence.priorPmi).toFixed(1)} vs prior
                  </span>
                )}
                <Badge variant={ismIntelligence.isExpansion ? 'success' : 'danger'}>
                  {ismIntelligence.pmi}
                </Badge>
              </div>
            </div>
            <ReportChart
              data={ismIntelligence.historicalPmi}
              color={ismIntelligence.isExpansion ? '#22C55E' : '#EF4444'}
              unit=""
              name="ism-pmi-history"
              lastUpdated={`${ismIntelligence.month}-01`}
              frequency="Monthly"
              threshold={50}
            />
          </div>
        </Card>
      )}

      {/* ===== ISM COMPONENTS GAUGE ===== */}
      {report.id === 'ism' && matchedIndicators.length > 1 && (
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-[#C9A646]" />
              <h3 className="text-sm font-semibold text-white">ISM Components</h3>
              <span className="text-[10px] text-[#6B6B6B]">vs 50 expansion line</span>
            </div>
            <ISMComponentsGauge indicators={matchedIndicators} />
          </div>
        </Card>
      )}

      {/* ===== LATEST DATA ===== */}
      {matchedIndicators.length > 0 && report.id !== 'gdp' && (
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4 text-[#C9A646]" />
              <h3 className="text-sm font-semibold text-white">Latest Data</h3>
              <span className="text-[10px] text-[#6B6B6B]">click to expand chart</span>
            </div>
            <div className="space-y-1.5">
              {matchedIndicators.filter(ind => report.id !== 'ism' || ind.id !== 'ismMfg').map((ind) => (
                <IndicatorRow
                  key={ind.id}
                  ind={ind}
                  isExpanded={effectiveExpanded === ind.id}
                  onToggle={() => setExpandedChart(effectiveExpanded === ind.id ? '__none__' : ind.id)}
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ===== DEEP ANALYSIS (skip for GDP — has its own intelligence) ===== */}
      {analysisBlocks.length > 0 && report.id !== 'gdp' && (
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-[#C9A646]" />
              <h3 className="text-sm font-semibold text-white">Intelligence Report</h3>
              <span className="text-[10px] text-[#6B6B6B]">data-driven analysis</span>
            </div>
            <AnalysisSection blocks={analysisBlocks} />
          </div>
        </Card>
      )}

      {/* ===== GDP DEEP INTELLIGENCE ===== */}
      {report.id === 'gdp' && gdpIntelligence && (
        <GDPDeepIntelligence data={gdpIntelligence} />
      )}

      {/* ===== CPI AI DEEP INTELLIGENCE ===== */}
      {report.id === 'cpi' && cpiIntelligence && (
        <CPIDeepIntelligence data={cpiIntelligence} />
      )}

      {/* ===== PPI AI DEEP INTELLIGENCE ===== */}
      {report.id === 'ppi' && ppiIntelligence && (
        <PPIDeepIntelligence data={ppiIntelligence} />
      )}

      {/* ===== ISM INTELLIGENCE SECTIONS ===== */}
      {report.id === 'ism' && ismIntelligence && (
        <>
          {/* Under-the-Surface Tensions */}
          <LazySection fallbackHeight="h-48">
            <ISMTensions intel={ismIntelligence} />
          </LazySection>

          {/* Sector Impact Rankings */}
          {ismIntelligence.sectorRankings.length > 0 && (
            <LazySection fallbackHeight="h-64">
              <ISMSectorRankings rankings={ismIntelligence.sectorRankings} />
            </LazySection>
          )}

          {/* Executive Quotes */}
          {ismIntelligence.quoteCount > 0 && (
            <LazySection fallbackHeight="h-48">
              <ISMExecutiveQuotes quotes={ismIntelligence.quotes} quotesBySector={ismIntelligence.quotesBySector} />
            </LazySection>
          )}

          {/* AI Macro Intelligence Brief */}
          <LazySection fallbackHeight="h-48">
            <ISMAISectorAnalysis aiData={ismSectorAI || null} />
          </LazySection>

          {/* Trade Ideas */}
          {ismIntelligence.tradeCount > 0 && (
            <LazySection fallbackHeight="h-48">
              <ISMTradeIdeas trades={ismIntelligence.tradeIdeas} />
            </LazySection>
          )}

        </>
      )}

      
    </div>
  );
});
ReportView.displayName = 'ReportView';

// =====================================================
// MAIN REPORTS TAB
// =====================================================

function ReportsTab() {
  const [activeReport, setActiveReport] = useState('ism');
  const { data: indicators, isLoading: loadingInd, error: errorInd, refresh } = useIndicators();
  const { data: fedData } = useFedData();
  const { data: ismIntelligence } = useISMIntelligence();
  const { data: ismSectorAI, refresh: refreshSectorAI } = useISMSectorAI();
  const { data: gdpIntelligence } = useGDPIntelligence();
  const { data: cpiIntelligence } = useCPIIntelligence();
  const { data: ppiIntelligence } = usePPIIntelligence();

  const currentReport = useMemo(() =>
    REPORT_DEFS.find(r => r.id === activeReport) || REPORT_DEFS[0],
    [activeReport]
  );

  const handleReportChange = useCallback((id: string) => setActiveReport(id), []);

  if (errorInd) {
    return (
      <Card>
        <div className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-[#EF4444] mx-auto mb-3" />
          <p className="text-white font-medium mb-1.5">Failed to load report data</p>
          <p className="text-xs text-[#8B8B8B] mb-3">{errorInd}</p>
          <button onClick={refresh} className="px-3 py-1.5 rounded-lg text-xs text-[#C9A646] border border-[#C9A646]/30 hover:bg-[#C9A646]/10">
            <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" /> Retry
          </button>
        </div>
      </Card>
    );
  }

  if (loadingInd || !indicators) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {REPORT_DEFS.map((r) => (
            <Skeleton key={r.id} className="h-8 w-14 rounded-lg" />
          ))}
        </div>
        <Card highlight>
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div><Skeleton className="h-5 w-52 mb-1.5" /><Skeleton className="h-3 w-72" /></div>
            </div>
          </div>
        </Card>
        <Card><div className="p-4"><Skeleton className="h-40 w-full rounded-xl" /></div></Card>
        <Card><div className="p-4"><Skeleton className="h-32 w-full rounded-xl" /></div></Card>
      </div>
    );
  }

  return (
    <div>
      <ReportSelector reports={REPORT_DEFS} activeId={activeReport} onChange={handleReportChange} />
      <ReportView report={currentReport} indicators={indicators} fedData={fedData} ismIntelligence={activeReport === 'ism' ? ismIntelligence : null} ismSectorAI={activeReport === 'ism' ? ismSectorAI : null} gdpIntelligence={activeReport === 'gdp' ? gdpIntelligence : null} cpiIntelligence={activeReport === 'cpi' ? cpiIntelligence : null} ppiIntelligence={activeReport === 'ppi' ? ppiIntelligence : null} />
    </div>
  );
}

export default memo(ReportsTab);