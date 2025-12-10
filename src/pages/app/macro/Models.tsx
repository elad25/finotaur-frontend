// src/pages/app/macro/Models.tsx
import { useState } from 'react';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Target,
  Shield,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronRight,
  ChevronDown,
  Flame,
  Layers,
  Zap,
  TrendingUp as TrendUp,
  BarChart3,
  RefreshCw,
  ShieldCheck,
  Lightbulb,
  ChevronUp
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface RadarPoint {
  label: string;
  value: number;
  max: number;
}

interface TurningPoint {
  indicator: string;
  type: 'inflection' | 'reversal' | 'bottoming';
  description: string;
  detected: string;
}

interface AssetSensitivity {
  asset: string;
  sensitivity: 'High' | 'Medium' | 'Low';
  impact: 'Positive' | 'Negative' | 'Mixed';
}

interface GlobalRegion {
  region: string;
  score: number;
  trend: 'up' | 'down' | 'flat';
  signal: string;
  description: string;
}

interface EconomicIndicator {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: number;
  changeUnit: string;
  trend: 'up' | 'down' | 'flat';
  signal: string;
  sparkline: number[];
  source: string;
}

// ═══════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════

const globalMacroScore = 67;
const macroRegime = 'Disinflationary Expansion';
const riskSignal = 'risk_on';
const shockStatus = { detected: false, message: 'No major shocks detected' };

// Radar Data
const radarData: RadarPoint[] = [
  { label: 'Growth', value: 72, max: 100 },
  { label: 'Inflation', value: 35, max: 100 },
  { label: 'Labor', value: 68, max: 100 },
  { label: 'Liquidity', value: 65, max: 100 },
  { label: 'Rates', value: 58, max: 100 },
  { label: 'Financial', value: 70, max: 100 },
  { label: 'Credit', value: 75, max: 100 },
  { label: 'Sentiment', value: 62, max: 100 },
];

// Leading vs Lagging
const leadingIndicators = [
  { name: 'ISM New Orders', value: '54.2', trend: 'up' as const },
  { name: 'Credit Impulse', value: '2.4%', trend: 'up' as const },
  { name: 'Liquidity Index', value: '68', trend: 'up' as const },
  { name: 'Financial Conditions', value: '99.2', trend: 'down' as const },
];

const laggingIndicators = [
  { name: 'Non-Farm Payrolls', value: '227K', trend: 'flat' as const },
  { name: 'Core CPI', value: '3.2%', trend: 'down' as const },
  { name: 'Initial Claims', value: '215K', trend: 'flat' as const },
];

// Turning Points
const turningPoints: TurningPoint[] = [
  { indicator: 'Inflation', type: 'inflection', description: 'Declining momentum detected', detected: '2d ago' },
  { indicator: 'Liquidity', type: 'reversal', description: 'Positive reversal confirmed', detected: '5d ago' },
  { indicator: 'Yield Curve', type: 'bottoming', description: 'Flattening shift underway', detected: '1w ago' },
];

// Asset Sensitivity
const assetSensitivity: AssetSensitivity[] = [
  { asset: 'Tech', sensitivity: 'High', impact: 'Positive' },
  { asset: 'Growth', sensitivity: 'High', impact: 'Positive' },
  { asset: 'Long Duration', sensitivity: 'High', impact: 'Positive' },
  { asset: 'Financials', sensitivity: 'Medium', impact: 'Positive' },
  { asset: 'Value', sensitivity: 'Medium', impact: 'Mixed' },
  { asset: 'Commodities', sensitivity: 'High', impact: 'Negative' },
  { asset: 'Defensives', sensitivity: 'Low', impact: 'Negative' },
];

// Cross-Asset Correlations
const correlations = [
  { pair: 'Stocks / Bonds', status: 'Decoupling', direction: 'diverging' as const },
  { pair: 'USD / Risk Assets', status: 'Inverse', direction: 'normal' as const },
  { pair: 'Liquidity / Equities', status: 'Positive', direction: 'aligned' as const },
  { pair: 'VIX / S&P 500', status: 'Normal', direction: 'normal' as const },
];

// Global Regions - ENHANCED with descriptions
const globalRegions: GlobalRegion[] = [
  { 
    region: 'United States', 
    score: 67, 
    trend: 'up', 
    signal: 'Expansion',
    description: 'Strong labor market, moderating inflation. Fed pivot expectations support risk assets.'
  },
  { 
    region: 'Eurozone', 
    score: 48, 
    trend: 'flat', 
    signal: 'Stagnation',
    description: 'Manufacturing weakness persists. ECB cautious on cuts despite disinflation progress.'
  },
  { 
    region: 'China / Asia', 
    score: 55, 
    trend: 'up', 
    signal: 'Recovery',
    description: 'Policy stimulus gaining traction. Property sector stabilizing, exports recovering.'
  },
];

// Economic Indicators
const economicIndicators: EconomicIndicator[] = [
  { id: 'gdp', name: 'GDP', value: 2.8, unit: '%', change: 0.3, changeUnit: 'pp', trend: 'up', signal: 'Above Trend', sparkline: [1.8, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8], source: 'BEA' },
  { id: 'cpi', name: 'Core CPI', value: 3.2, unit: '%', change: -0.2, changeUnit: 'pp', trend: 'down', signal: 'Moderating', sparkline: [4.0, 3.9, 3.7, 3.6, 3.5, 3.4, 3.3, 3.2, 3.2], source: 'BLS' },
  { id: 'nfp', name: 'NFP', value: 227, unit: 'K', change: 12, changeUnit: 'K', trend: 'up', signal: 'Solid', sparkline: [180, 195, 210, 185, 220, 195, 210, 215, 227], source: 'BLS' },
  { id: 'ism', name: 'ISM PMI', value: 52.4, unit: '', change: 0.6, changeUnit: 'pts', trend: 'up', signal: 'Expansion', sparkline: [48.5, 49.2, 49.8, 50.1, 50.8, 51.2, 51.8, 52.0, 52.4], source: 'ISM' },
  { id: 'claims', name: 'Claims', value: 215, unit: 'K', change: -3, changeUnit: 'K', trend: 'down', signal: 'Healthy', sparkline: [225, 222, 220, 218, 219, 217, 216, 218, 215], source: 'DOL' },
  { id: 'fedfunds', name: 'Fed Funds', value: 5.50, unit: '%', change: 0, changeUnit: 'bp', trend: 'flat', signal: 'On Hold', sparkline: [5.25, 5.25, 5.50, 5.50, 5.50, 5.50, 5.50, 5.50, 5.50], source: 'Fed' },
  { id: 'treasury10y', name: '10Y Yield', value: 4.25, unit: '%', change: -15, changeUnit: 'bp', trend: 'down', signal: 'Easing', sparkline: [4.70, 4.65, 4.55, 4.50, 4.45, 4.40, 4.35, 4.30, 4.25], source: 'Treasury' },
  { id: 'vix', name: 'VIX', value: 14.2, unit: '', change: -1.6, changeUnit: 'pts', trend: 'down', signal: 'Low Vol', sparkline: [18.5, 17.2, 16.8, 16.0, 15.5, 15.2, 14.8, 14.5, 14.2], source: 'CBOE' },
];

// Scenarios
const scenarios = [
  { name: 'Base Case', probability: 60, description: 'Soft landing with gradual Fed cuts', spx: '+8-12%', driver: 'Liquidity acceleration, stable inflation' },
  { name: 'Bull Case', probability: 25, description: 'Goldilocks with faster disinflation', spx: '+15-20%', driver: 'Sticky CPI decline, strong earnings' },
  { name: 'Bear Case', probability: 15, description: 'Recession / Inflation re-acceleration', spx: '-10-20%', driver: 'CPI surprise, credit stress' },
];

// Hedge Recommendations
const hedgeRecommendations = [
  'Consider small cap value as hedge for growth exposure',
  'Equal-weight indices offer protection vs cap-weighted concentration',
  'VIX call spreads attractive while volatility remains below 15',
];

// AI Narrative - ENHANCED
const aiNarrative = "The disinflation trend continues as liquidity conditions improve and central bank pivot expectations solidify. Yield curve normalization signals stabilizing long-term expectations, while leading indicators confirm strengthening economic momentum. Lagging indicators remain neutral, consistent with a soft landing trajectory. Current regime favors Risk-On positioning with emphasis on duration-sensitive assets including tech, growth equities, and long-duration bonds.";

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

// Radar Chart - POLISHED
const RadarChart = ({ data }: { data: RadarPoint[] }) => {
  const size = 300;
  const center = size / 2;
  const radius = 95;
  const levels = 4;
  const angleSlice = (Math.PI * 2) / data.length;

  const getPoint = (value: number, index: number) => {
    const angle = angleSlice * index - Math.PI / 2;
    const r = (value / 100) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const getLabelPosition = (index: number) => {
    const angle = angleSlice * index - Math.PI / 2;
    const labelRadius = radius + 40;
    return { x: center + labelRadius * Math.cos(angle), y: center + labelRadius * Math.sin(angle) };
  };

  const points = data.map((d, i) => getPoint(d.value, i));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {[...Array(levels)].map((_, i) => {
        const levelRadius = (radius / levels) * (i + 1);
        const levelPoints = data.map((_, j) => {
          const angle = angleSlice * j - Math.PI / 2;
          return `${center + levelRadius * Math.cos(angle)},${center + levelRadius * Math.sin(angle)}`;
        }).join(' ');
        return <polygon key={i} points={levelPoints} fill="none" stroke="#27272a" strokeWidth="1" opacity={0.6} />;
      })}
      {data.map((_, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        return <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} stroke="#27272a" strokeWidth="1" opacity={0.6} />;
      })}
      <path d={pathD} fill="rgba(16, 185, 129, 0.12)" stroke="#10b981" strokeWidth="2" />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="5" fill="#10b981" />)}
      {data.map((d, i) => {
        const pos = getLabelPosition(i);
        return <text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" className="text-[12px] fill-zinc-400 font-medium">{d.label}</text>;
      })}
    </svg>
  );
};

// Sparkline - REFINED
const Sparkline = ({ data, trend }: { data: number[]; trend: 'up' | 'down' | 'flat' }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 80},${32 - ((v - min) / range) * 28}`).join(' ');
  const color = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#71717a';

  return (
    <svg width="80" height="36" className="opacity-80">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// Score Ring
const ScoreRing = ({ score, size = 100 }: { score: number; size?: number }) => {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 60 ? '#10b981' : score >= 40 ? '#eab308' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#18181b" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
      </div>
    </div>
  );
};

// Trend Icon
const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'flat' }) => {
  if (trend === 'up') return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
  if (trend === 'down') return <ArrowDownRight className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-zinc-500" />;
};

// Turning Point Badge - UNIFORM COLORS
const getTurningPointStyle = (type: string) => {
  switch (type) {
    case 'inflection': return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
    case 'reversal': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
    case 'bottoming': return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
    default: return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20';
  }
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function MacroModels() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLeadLag, setShowLeadLag] = useState(true);
  const [showTurningPoints, setShowTurningPoints] = useState(true);

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* ═══════════════════════════════════════════════════════
            HEADER ROW
        ═══════════════════════════════════════════════════════ */}
        <header className="grid grid-cols-12 gap-6 mb-14">
          {/* Score */}
          <div className="col-span-2 flex flex-col items-center justify-center">
            <ScoreRing score={globalMacroScore} size={110} />
            <span className="text-sm text-zinc-500 mt-3">Macro Score</span>
          </div>

          {/* Regime */}
          <div className="col-span-3 flex flex-col justify-center pl-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Macro Regime</div>
            <div className="text-2xl font-semibold text-emerald-400 mb-2">{macroRegime}</div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">Improving</span>
              <span className="text-xs text-zinc-600 ml-2">87% confidence</span>
            </div>
          </div>

          {/* Risk Signal */}
          <div className="col-span-2 flex items-center justify-center">
            <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border shadow-lg ${
              riskSignal === 'risk_on' 
                ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5' 
                : 'bg-red-500/5 border-red-500/20 shadow-red-500/5'
            }`}>
              <Flame className="w-7 h-7 text-emerald-400" />
              <div>
                <div className="text-xl font-bold text-emerald-400">Risk-On</div>
                <div className="text-xs text-zinc-500">Current Signal</div>
              </div>
            </div>
          </div>

          {/* Shock Detector */}
          <div className="col-span-2 flex items-center">
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/40 w-full shadow-inner">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-zinc-400 font-medium">Shock Detector</span>
              </div>
              <div className="text-sm text-emerald-400">{shockStatus.message}</div>
            </div>
          </div>

          {/* AI Insight */}
          <div className="col-span-3 flex items-center">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/10 w-full">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-400 font-medium">AI Insight</span>
              </div>
              <div className="text-sm text-zinc-400 leading-relaxed">
                Tech & Growth favored. Long duration bonds benefit from declining real rates.
              </div>
            </div>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════
            ROW 2: RADAR + LEADING/LAGGING + TURNING POINTS
        ═══════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-12 gap-6 mb-14">
          {/* Radar */}
          <div className="col-span-4 p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/40">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span className="text-base font-medium text-white">Macro Health Wheel</span>
            </div>
            <RadarChart data={radarData} />
          </div>

          {/* Leading vs Lagging - COLLAPSIBLE + LARGER TEXT */}
          <div className="col-span-4 p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/40">
            <button 
              onClick={() => setShowLeadLag(!showLeadLag)}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-400" />
                <span className="text-base font-medium text-white">Leading vs Lagging</span>
              </div>
              {showLeadLag ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
            </button>
            
            {showLeadLag && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Leading (Predictive)</div>
                  <div className="space-y-2.5">
                    {leadingIndicators.map((ind, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-zinc-300">{ind.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white font-medium">{ind.value}</span>
                          <TrendIcon trend={ind.trend} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t border-zinc-800/50 pt-5">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Lagging (Confirming)</div>
                  <div className="space-y-2.5">
                    {laggingIndicators.map((ind, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-zinc-300">{ind.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white font-medium">{ind.value}</span>
                          <TrendIcon trend={ind.trend} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Conclusion</span>
                    <span className="text-sm font-semibold text-emerald-400">Trend Strengthening</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Turning Points - COLLAPSIBLE */}
          <div className="col-span-4 p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/40">
            <button 
              onClick={() => setShowTurningPoints(!showTurningPoints)}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-2">
                <TrendUp className="w-5 h-5 text-amber-400" />
                <span className="text-base font-medium text-white">Turning Points</span>
              </div>
              {showTurningPoints ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
            </button>
            
            {showTurningPoints && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {turningPoints.map((tp, i) => (
                  <div key={i} className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-700/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{tp.indicator}</span>
                      <span className={`text-xs px-2 py-1 rounded-md border ${getTurningPointStyle(tp.type)}`}>
                        {tp.type}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-400 leading-relaxed">{tp.description}</div>
                    <div className="text-xs text-zinc-600 mt-2">Detected {tp.detected}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            ROW 3: KEY ECONOMIC INDICATORS
        ═══════════════════════════════════════════════════════ */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-5">
            <Layers className="w-5 h-5 text-zinc-500" />
            <span className="text-base font-medium text-white">Key Economic Indicators</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {economicIndicators.map((indicator) => (
              <div key={indicator.id} className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/40 hover:border-zinc-700/50 transition-all hover:shadow-lg hover:shadow-zinc-900/20">
                {/* Header - ALIGNED */}
                <div className="flex items-center justify-between mb-3 h-5">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{indicator.name}</span>
                  <span className="text-[10px] text-zinc-600">{indicator.source}</span>
                </div>
                
                {/* Value */}
                <div className="mb-3">
                  <span className="text-2xl font-semibold text-white">{indicator.value}</span>
                  <span className="text-sm text-zinc-500 ml-1">{indicator.unit}</span>
                </div>

                {/* Sparkline */}
                <div className="mb-3">
                  <Sparkline data={indicator.sparkline} trend={indicator.trend} />
                </div>

                {/* Change + Signal */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendIcon trend={indicator.trend} />
                    <span className={`text-xs font-medium ${
                      indicator.trend === 'up' ? 'text-emerald-400' : 
                      indicator.trend === 'down' ? 'text-red-400' : 'text-zinc-500'
                    }`}>
                      {indicator.change > 0 ? '+' : ''}{indicator.change}{indicator.changeUnit}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500">{indicator.signal}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            ROW 4: SCENARIOS + RISK CONTROLS
        ═══════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-12 gap-6 mb-14">
          {/* Scenarios */}
          <div className="col-span-8">
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-5 h-5 text-emerald-400" />
              <span className="text-base font-medium text-white">Scenario Engine</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {scenarios.map((s, i) => (
                <div key={i} className={`p-5 rounded-2xl border ${
                  i === 0 ? 'bg-emerald-500/5 border-emerald-500/15' :
                  i === 1 ? 'bg-green-500/5 border-green-500/15' :
                  'bg-red-500/5 border-red-500/15'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-base font-semibold ${
                      i === 0 ? 'text-emerald-400' : i === 1 ? 'text-green-400' : 'text-red-400'
                    }`}>{s.name}</span>
                    <span className="text-2xl font-bold text-white">{s.probability}%</span>
                  </div>
                  <p className="text-sm text-zinc-400 mb-3 leading-relaxed">{s.description}</p>
                  <div className="text-sm mb-3">
                    <span className="text-zinc-500">S&P 500: </span>
                    <span className={`font-medium ${s.spx.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>{s.spx}</span>
                  </div>
                  <div className="text-xs text-zinc-500 pt-3 border-t border-zinc-800/30 leading-relaxed">
                    <span className="text-zinc-600">Driver:</span> {s.driver}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Controls - LARGER TEXT */}
          <div className="col-span-4">
            <div className="flex items-center gap-2 mb-5">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <span className="text-base font-medium text-white">Risk Controls</span>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/40 h-[calc(100%-44px)]">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Hedge Recommendations</div>
              <div className="space-y-4">
                {hedgeRecommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-zinc-300 leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            ROW 5: SENSITIVITY MATRIX + CORRELATIONS
        ═══════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-12 gap-6 mb-14">
          {/* Sensitivity Matrix */}
          <div className="col-span-7">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <span className="text-base font-medium text-white">Asset Sensitivity Matrix</span>
            </div>

            <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/40 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800/40">
                    <th className="text-left p-4 text-sm text-zinc-500 font-medium">Asset Class</th>
                    <th className="text-center p-4 text-sm text-zinc-500 font-medium">Sensitivity</th>
                    <th className="text-center p-4 text-sm text-zinc-500 font-medium">Impact Now</th>
                  </tr>
                </thead>
                <tbody>
                  {assetSensitivity.map((asset, i) => (
                    <tr key={i} className="border-b border-zinc-800/20 last:border-0 hover:bg-zinc-800/10 transition-colors">
                      <td className="p-4 text-sm text-white font-medium">{asset.asset}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-md text-xs font-medium ${
                          asset.sensitivity === 'High' ? 'bg-amber-500/15 text-amber-400' :
                          asset.sensitivity === 'Medium' ? 'bg-blue-500/15 text-blue-400' :
                          'bg-zinc-500/15 text-zinc-400'
                        }`}>{asset.sensitivity}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-md text-xs font-medium ${
                          asset.impact === 'Positive' ? 'bg-emerald-500/15 text-emerald-400' :
                          asset.impact === 'Negative' ? 'bg-red-500/15 text-red-400' :
                          'bg-zinc-500/15 text-zinc-400'
                        }`}>{asset.impact}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cross-Asset Correlations */}
          <div className="col-span-5">
            <div className="flex items-center gap-2 mb-5">
              <RefreshCw className="w-5 h-5 text-blue-400" />
              <span className="text-base font-medium text-white">Cross-Asset Correlations</span>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/40">
              <div className="space-y-4">
                {correlations.map((corr, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <span className="text-sm text-zinc-300">{corr.pair}</span>
                    <span className={`text-xs px-3 py-1.5 rounded-md font-medium ${
                      corr.direction === 'aligned' ? 'bg-emerald-500/15 text-emerald-400' :
                      corr.direction === 'diverging' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-zinc-500/15 text-zinc-400'
                    }`}>{corr.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            ROW 6: GLOBAL COMPARISON - ENHANCED
        ═══════════════════════════════════════════════════════ */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="w-5 h-5 text-emerald-400" />
            <span className="text-base font-medium text-white">Global Macro Comparison</span>
          </div>

          <div className="grid grid-cols-3 gap-5">
            {globalRegions.map((region, i) => (
              <div key={i} className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/40">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-lg font-semibold text-white">{region.region}</span>
                    <div className="flex items-center gap-2 mt-2">
                      <TrendIcon trend={region.trend} />
                      <span className={`text-sm font-medium ${
                        region.trend === 'up' ? 'text-emerald-400' : 
                        region.trend === 'down' ? 'text-red-400' : 'text-zinc-400'
                      }`}>
                        {region.trend === 'up' ? 'Improving' : region.trend === 'down' ? 'Weakening' : 'Stable'}
                      </span>
                      <span className="text-xs text-zinc-600">•</span>
                      <span className="text-xs text-zinc-500">{region.signal}</span>
                    </div>
                  </div>
                  <ScoreRing score={region.score} size={70} />
                </div>
                {/* ENHANCED: Description */}
                <p className="text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/30 pt-4">
                  {region.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            ROW 7: AI NARRATIVE - ENHANCED
        ═══════════════════════════════════════════════════════ */}
        <section className="mb-14">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-amber-500/5 via-emerald-500/3 to-transparent border border-amber-500/10">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-6 h-6 text-amber-400" />
              <span className="text-lg font-medium text-amber-400">AI Macro Narrative</span>
            </div>
            <p className="text-base text-zinc-300 leading-relaxed">{aiNarrative}</p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            ADVANCED MODELS
        ═══════════════════════════════════════════════════════ */}
        <section className="mb-10">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors group"
          >
            <div className="p-1.5 rounded-lg bg-zinc-800/50 group-hover:bg-zinc-800 transition-colors">
              {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
            <span className="text-sm font-medium">Advanced Models</span>
            <span className="text-xs text-zinc-600 px-2 py-0.5 bg-zinc-800/50 rounded">12</span>
          </button>

          {showAdvanced && (
            <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {[
                { name: 'Recession Probability', value: '18%', trend: 'down' as const },
                { name: 'Sticky CPI', value: '4.1%', trend: 'down' as const },
                { name: 'PCE Core', value: '2.8%', trend: 'down' as const },
                { name: 'JOLTS Openings', value: '8.7M', trend: 'down' as const },
                { name: 'Wage Growth', value: '4.8%', trend: 'down' as const },
                { name: 'Consumer Confidence', value: '102.5', trend: 'up' as const },
                { name: 'Retail Sales M/M', value: '0.4%', trend: 'up' as const },
                { name: 'Industrial Production', value: '-0.1%', trend: 'down' as const },
                { name: 'Housing Starts', value: '1.35M', trend: 'up' as const },
                { name: 'HY Credit Spreads', value: '310bp', trend: 'flat' as const },
                { name: 'MOVE Index', value: '98', trend: 'down' as const },
                { name: 'DXY Dollar Index', value: '104.2', trend: 'down' as const },
              ].map((m, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/20 border border-zinc-800/30 hover:border-zinc-700/40 transition-colors">
                  <span className="text-sm text-zinc-400">{m.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white font-medium">{m.value}</span>
                    <TrendIcon trend={m.trend} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-zinc-800/30">
          <p className="text-xs text-zinc-600 leading-relaxed">
            Data sources: BEA, BLS, ISM, Federal Reserve, Treasury, CBOE. Models updated in real-time. Past performance is not indicative of future results.
          </p>
        </footer>
      </div>
    </div>
  );
}