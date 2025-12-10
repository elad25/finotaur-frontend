'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  Activity, DollarSign, Users, Building2, Brain,
  BookOpen, GitBranch, Layers, Lightbulb, Target, Zap, BarChart3, X, Sparkles,
  AlertTriangle, Clock, Filter, Maximize2, Calendar, ArrowRight, Info,
  ChevronRight, Shield, Radio, Circle, AlertCircle, Eye, EyeOff,
  TrendingUp as TrendUp, Gauge, Crosshair, Compass, FileText
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type TabType = 'overview' | 'indicators' | 'calendar';
type TrendDirection = 'up' | 'down' | 'flat';
type SignalType = 'leading' | 'coincident' | 'lagging';
type IndicatorCategory = 'growth' | 'inflation' | 'labor' | 'business' | 'sentiment';
type FilterType = 'all' | 'leading' | 'coincident' | 'lagging' | 'positive' | 'negative' | 'neutral';

interface MacroSummary {
  growth: { direction: TrendDirection; label: string; change: string };
  inflation: { direction: TrendDirection; label: string; change: string };
  labor: { direction: TrendDirection; label: string; change: string };
  business: { direction: TrendDirection; label: string; change: string };
  sentiment: { direction: TrendDirection; label: string; change: string };
}

interface NarrativeBlock {
  headline: string;
  whatsHappening: string;
  whyItMatters: string;
  marketTakeaway: string;
  takeawayType: 'long' | 'short' | 'neutral' | 'reduce';
}

interface TurningPoint {
  indicator: string;
  type: SignalType;
  direction: 'bullish' | 'bearish' | 'neutral';
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
}

interface CohesionItem {
  category: string;
  score: number;
  direction: TrendDirection;
  change: string;
  components: { name: string; contribution: number }[];
}

interface ThemeData {
  title: string;
  description: string;
  dataPoints: string[];
  marketImplication: string;
  riskFactor: string;
  probability: number;
  ifThen: { condition: string; outcome: string };
  status: 'active' | 'emerging' | 'fading';
}

interface ImplicationData {
  asset: string;
  outlook: 'bullish' | 'bearish' | 'neutral';
  toFavor: string;
  toAvoid: string;
  keyChart: string;
  timeframe: 'short' | 'medium' | 'long';
  confidence: number;
}

interface IndicatorData {
  id: string;
  name: string;
  shortName: string;
  category: IndicatorCategory;
  signalType: SignalType;
  last: number;
  previous: number;
  consensus: number;
  surprise: number;
  surpriseType: 'positive' | 'negative' | 'neutral';
  trend: TrendDirection;
  unit: string;
  nextRelease: string;
  daysToRelease: number;
  insight: string;
  fullInsight: string;
  zScore: number;
  percentile: number;
  importance: string;
  sparkline: number[];
}

interface CalendarEvent {
  date: string;
  day: string;
  indicator: string;
  previous: string;
  consensus: string;
  importance: 'high' | 'medium' | 'low';
  isPast?: boolean;
}

// =============================================================================
// DATA
// =============================================================================

const macroSummary: MacroSummary = {
  growth: { direction: 'down', label: 'Slowing', change: '-0.8% MoM' },
  inflation: { direction: 'flat', label: 'Sticky', change: '+0.1% MoM' },
  labor: { direction: 'down', label: 'Normalizing', change: '-5 pts' },
  business: { direction: 'up', label: 'Bottoming', change: '+4 pts' },
  sentiment: { direction: 'up', label: 'Improving', change: '+8 pts' }
};

const narrative: NarrativeBlock = {
  headline: "Late-Cycle Slowdown with Manufacturing Inflection",
  whatsHappening: "Growth decelerating to +2% as consumer momentum fades. Core PCE stuck at 2.8%. Manufacturing showing first signs of trough with ISM New Orders crossing 50.",
  whyItMatters: "Fed in wait-and-see mode — needs inflation progress before more cuts. Labor market normalizing but not cracking. Services weakness (ISM drop) is new risk to soft landing.",
  marketTakeaway: "Favor quality over beta. Add duration on dips. Rotate to value/cyclicals only on manufacturing confirmation.",
  takeawayType: 'neutral'
};

const surpriseIndex = {
  current: -12.4,
  previous: -8.2,
  weekAgo: -5.1,
  monthAgo: +3.2,
  trend: 'down' as TrendDirection,
  interpretation: "Data disappointing vs expectations",
  percentile: 22
};

const turningPoints: TurningPoint[] = [
  { indicator: "ISM New Orders", type: 'leading', direction: 'bullish', description: "Crossed 50 for first time in 8 months — potential manufacturing trough", impact: 'high', confidence: 72 },
  { indicator: "JOLTS Ratio", type: 'leading', direction: 'bearish', description: "Back to pre-COVID 1.1x level — labor market normalizing", impact: 'medium', confidence: 85 },
  { indicator: "Initial Claims", type: 'leading', direction: 'bearish', description: "4-week avg rising: 224K vs 210K — early softening signal", impact: 'medium', confidence: 65 },
  { indicator: "Yield Curve", type: 'leading', direction: 'bullish', description: "2s10s uninverted — recession signal historically lags", impact: 'high', confidence: 60 },
  { indicator: "Core CPI", type: 'lagging', direction: 'bearish', description: "3M annualized up to 3.6% — last mile proving difficult", impact: 'high', confidence: 88 },
  { indicator: "Unemployment", type: 'lagging', direction: 'bearish', description: "Sahm indicator at 0.43% — approaching 0.5% threshold", impact: 'high', confidence: 78 },
  { indicator: "GDP", type: 'lagging', direction: 'neutral', description: "Q3 at 2.8%, tracking 2.0-2.5% for Q4 — soft landing intact", impact: 'medium', confidence: 90 },
  { indicator: "PCE", type: 'lagging', direction: 'bearish', description: "Core stuck at 2.8% for 6 months — Fed patience tested", impact: 'high', confidence: 85 }
];

const cohesionData: CohesionItem[] = [
  { category: "Growth", score: 42, direction: 'down', change: "-3 vs last month", components: [
    { name: "GDP", contribution: 15 }, { name: "IP", contribution: 8 }, { name: "Retail", contribution: 19 }
  ]},
  { category: "Inflation", score: 58, direction: 'flat', change: "unchanged", components: [
    { name: "CPI", contribution: 20 }, { name: "PCE", contribution: 22 }, { name: "PPI", contribution: 16 }
  ]},
  { category: "Labor", score: 55, direction: 'down', change: "-5 vs last month", components: [
    { name: "NFP", contribution: 18 }, { name: "Claims", contribution: 20 }, { name: "JOLTS", contribution: 17 }
  ]},
  { category: "Business", score: 48, direction: 'up', change: "+4 vs last month", components: [
    { name: "ISM Mfg", contribution: 25 }, { name: "ISM Svc", contribution: 23 }
  ]},
  { category: "Sentiment", score: 62, direction: 'up', change: "+8 vs last month", components: [
    { name: "Conf.", contribution: 32 }, { name: "UMich", contribution: 30 }
  ]}
];

const themes: ThemeData[] = [
  {
    title: "Soft Landing Narrowing",
    description: "Path to soft landing still viable but narrower than 3 months ago",
    dataPoints: ["Consumer resilient (+0.4% retail)", "Services offsetting manufacturing", "Real wages positive (+1.2% YoY)"],
    marketImplication: "Quality large-caps outperform. Defensive sectors (healthcare, utilities) as hedge.",
    riskFactor: "Services crack (ISM Svc 52.1 vs 56.0 is yellow flag)",
    probability: 55,
    ifThen: { condition: "ISM Services stays >52", outcome: "Stay long quality, trim small-caps & high-beta" },
    status: 'active'
  },
  {
    title: "Manufacturing Trough",
    description: "Early signals of manufacturing bottoming after 18-month contraction",
    dataPoints: ["ISM New Orders >50", "Inventory destocking ending (I/S ratio normalizing)", "Global PMIs stabilizing (Europe, China)"],
    marketImplication: "Industrials (XLI), materials (XLB) attractive on confirmation. Value rotation setup.",
    riskFactor: "False dawn — need 2-3 months confirmation above 50",
    probability: 40,
    ifThen: { condition: "ISM Mfg crosses 50 for 2 consecutive months", outcome: "Add XLI, XLB, rotate growth→value" },
    status: 'emerging'
  },
  {
    title: "Inflation Stickiness",
    description: "Last mile to 2% proving difficult — shelter and services remain firm",
    dataPoints: ["Core PCE at 2.8%", "Supercore (ex-housing svc) reaccelerating", "Wages at 4% (above Fed comfort)"],
    marketImplication: "Duration risk if inflation re-accelerates. TIPS as hedge. Growth multiples at risk.",
    riskFactor: "Shelter disinflation slower than expected (OER sticky)",
    probability: 30,
    ifThen: { condition: "Core CPI >3.5% for 3 consecutive months", outcome: "Cut duration, add TIPS, reduce growth exposure" },
    status: 'active'
  },
  {
    title: "Labor Market Cracking",
    description: "Risk scenario where labor market deteriorates faster than expected",
    dataPoints: ["Sahm at 0.43% (threshold 0.5%)", "Quits rate declining", "Hiring rate at 2019 levels"],
    marketImplication: "Risk-off if triggered. Flight to quality, long duration, defensive rotation.",
    riskFactor: "Claims sustained >250K would confirm",
    probability: 20,
    ifThen: { condition: "Sahm crosses 0.5% OR claims >250K for 4 weeks", outcome: "Defensive posture: long TLT, short HYG, reduce equity beta" },
    status: 'fading'
  }
];

const implications: ImplicationData[] = [
  { 
    asset: "US Equities", 
    outlook: 'neutral', 
    toFavor: "Quality large-caps (MSFT, AAPL, UNH), Healthcare (XLV), Low-vol factor", 
    toAvoid: "High-beta small-caps (IWM), Unprofitable tech, Leveraged plays", 
    keyChart: "SPX vs Russell 2000 ratio — quality outperformance to continue",
    timeframe: 'medium', 
    confidence: 70 
  },
  { 
    asset: "US Treasuries", 
    outlook: 'bullish', 
    toFavor: "Duration (TLT), 10Y (fair value 3.75-4.25%), TIPS on inflation hedge", 
    toAvoid: "Short-end if inflation sticky, Long-dated corporates (credit spread risk)", 
    keyChart: "10Y yield vs Core PCE — rates have room to fall if inflation cooperates",
    timeframe: 'medium', 
    confidence: 75 
  },
  { 
    asset: "US Dollar", 
    outlook: 'bearish', 
    toFavor: "EUR, GBP on rate convergence as Fed cuts more than ECB/BoE", 
    toAvoid: "Long USD vs majors, EM FX (selective only)", 
    keyChart: "DXY vs rate differentials — dollar premium to narrow",
    timeframe: 'short', 
    confidence: 65 
  },
  { 
    asset: "Commodities", 
    outlook: 'neutral', 
    toFavor: "Gold (constructive, 2400-2600 range), Copper on China stimulus", 
    toAvoid: "Oil (rangebound 70-85), Broad industrial metals (demand uncertainty)", 
    keyChart: "Gold vs real rates — inverse correlation intact, supports gold",
    timeframe: 'medium', 
    confidence: 60 
  }
];

const indicators: IndicatorData[] = [
  // Growth
  { id: 'gdp', name: 'Real GDP', shortName: 'GDP', category: 'growth', signalType: 'lagging', last: 2.8, previous: 3.0, consensus: 2.9, surprise: -0.1, surpriseType: 'negative', trend: 'down', unit: '%', nextRelease: 'Dec 19', daysToRelease: 11, insight: 'Q4 tracking +2.0-2.5%', fullInsight: 'GDP tracking 2.0-2.5% for Q4, down from 2.8% in Q3. Consumer spending remains the key pillar supporting growth, but business investment slowing.', zScore: -0.3, percentile: 62, importance: 'GDP measures total economic output — the broadest measure of economic activity. QoQ changes signal acceleration/deceleration of the economy.', sparkline: [3.4, 4.9, 2.1, 1.6, 3.0, 2.8] },
  { id: 'ip', name: 'Industrial Production', shortName: 'IP', category: 'growth', signalType: 'coincident', last: 0.3, previous: -0.4, consensus: 0.2, surprise: 0.1, surpriseType: 'positive', trend: 'flat', unit: '%', nextRelease: 'Dec 17', daysToRelease: 9, insight: 'Flat for 12 months', fullInsight: 'Industrial production essentially flat YoY. Manufacturing component down -0.7% YoY, dragged by durables. Utilities volatile due to weather.', zScore: -0.8, percentile: 35, importance: 'IP measures output of factories, mines, and utilities. Key for assessing manufacturing health and often leads GDP by 1-2 quarters.', sparkline: [0.2, -0.5, -0.4, 0.3, -0.4, 0.3] },
  { id: 'retail', name: 'Retail Sales', shortName: 'Retail', category: 'growth', signalType: 'coincident', last: 0.4, previous: 0.8, consensus: 0.3, surprise: 0.1, surpriseType: 'positive', trend: 'flat', unit: '%', nextRelease: 'Dec 17', daysToRelease: 9, insight: 'Consumer still spending', fullInsight: 'Consumer remains the engine of the economy. Real retail sales growing but decelerating. Control group (ex-autos, gas, building) +0.1%.', zScore: 0.4, percentile: 58, importance: 'Retail sales track consumer spending, which is ~70% of GDP. Control group feeds directly into GDP calculations.', sparkline: [0.3, 0.1, 0.8, 0.4, 0.8, 0.4] },
  // Inflation
  { id: 'cpi', name: 'CPI', shortName: 'CPI', category: 'inflation', signalType: 'lagging', last: 2.7, previous: 2.6, consensus: 2.7, surprise: 0.0, surpriseType: 'neutral', trend: 'flat', unit: '%', nextRelease: 'Dec 11', daysToRelease: 3, insight: 'Last mile difficult', fullInsight: 'Headline CPI down from 9.1% peak but progress stalling. Core at 3.3%. Shelter inflation (OER) remains sticky at 5%+, preventing further progress.', zScore: 0.5, percentile: 72, importance: 'CPI is the main inflation gauge watched by markets. While Fed targets PCE, CPI moves markets more due to earlier release.', sparkline: [3.0, 2.9, 2.5, 2.4, 2.6, 2.7] },
  { id: 'pce', name: 'Core PCE', shortName: 'Core PCE', category: 'inflation', signalType: 'lagging', last: 2.8, previous: 2.7, consensus: 2.8, surprise: 0.0, surpriseType: 'neutral', trend: 'flat', unit: '%', nextRelease: 'Dec 20', daysToRelease: 12, insight: 'Fed\'s key metric at 2.8%', fullInsight: 'Core PCE stuck in 2.6-2.8% range for 6 months. Services inflation persistent. Fed needs sustained move toward 2% for more cuts.', zScore: 0.8, percentile: 85, importance: 'Core PCE is the Fed\'s preferred inflation measure. Target is 2%. This is THE number the Fed watches for policy decisions.', sparkline: [2.6, 2.6, 2.5, 2.6, 2.7, 2.8] },
  { id: 'ppi', name: 'PPI', shortName: 'PPI', category: 'inflation', signalType: 'leading', last: 2.4, previous: 2.0, consensus: 2.2, surprise: 0.2, surpriseType: 'negative', trend: 'up', unit: '%', nextRelease: 'Dec 12', daysToRelease: 4, insight: 'Diverging from CPI ⚠️', fullInsight: 'PPI ticking up while CPI cools — divergence is unusual. Could signal cost pressures building in pipeline that will pass through to consumer.', zScore: 0.3, percentile: 55, importance: 'PPI measures producer costs before they reach consumers. Often leads CPI by 1-2 months. Rising PPI can signal future inflation.', sparkline: [1.7, 1.8, 2.0, 2.0, 2.0, 2.4] },
  // Labor
  { id: 'nfp', name: 'Non-Farm Payrolls', shortName: 'NFP', category: 'labor', signalType: 'coincident', last: 227, previous: 36, consensus: 200, surprise: 27, surpriseType: 'positive', trend: 'flat', unit: 'K', nextRelease: 'Jan 10', daysToRelease: 33, insight: '227K, 3M avg 173K', fullInsight: '227K rebound after hurricane-distorted October (36K). 3-month average of 173K is cooling from 200K+ earlier this year. Still above breakeven (~100K).', zScore: 0.2, percentile: 55, importance: 'NFP is the most watched jobs number. Sets market tone on release day. Above 150K = solid, below 100K = concerning.', sparkline: [179, 114, 159, 223, 36, 227] },
  { id: 'unemp', name: 'Unemployment', shortName: 'Unemp', category: 'labor', signalType: 'lagging', last: 4.2, previous: 4.1, consensus: 4.1, surprise: 0.1, surpriseType: 'negative', trend: 'up', unit: '%', nextRelease: 'Jan 10', daysToRelease: 33, insight: 'Sahm at 0.43% ⚠️', fullInsight: 'Unemployment ticked up to 4.2%. Sahm indicator at 0.43%, approaching 0.5% threshold that historically signals recession. Key metric to watch.', zScore: 0.0, percentile: 32, importance: 'Unemployment is a lagging indicator but the Sahm Rule (0.5% rise from low) has called every recession since 1970.', sparkline: [4.1, 4.3, 4.2, 4.1, 4.1, 4.2] },
  { id: 'claims', name: 'Initial Claims', shortName: 'Claims', category: 'labor', signalType: 'leading', last: 224, previous: 215, consensus: 220, surprise: 4, surpriseType: 'negative', trend: 'up', unit: 'K', nextRelease: 'Dec 12', daysToRelease: 4, insight: '4-wk avg rising ⚠️', fullInsight: '4-week average 224K vs 210K a month ago. Not alarming yet (pre-COVID was 220K) but trend is concerning. Watch for sustained >250K.', zScore: -0.2, percentile: 25, importance: 'Initial claims is the best weekly leading indicator for labor market deterioration. Rising claims often precede rising unemployment.', sparkline: [217, 213, 215, 224, 215, 224] },
  { id: 'jolts', name: 'JOLTS', shortName: 'JOLTS', category: 'labor', signalType: 'leading', last: 7.74, previous: 7.37, consensus: 7.50, surprise: 0.24, surpriseType: 'positive', trend: 'down', unit: 'M', nextRelease: 'Dec 17', daysToRelease: 9, insight: 'Ratio at 1.1x (pre-COVID)', fullInsight: 'JOLTS ratio (openings per unemployed) normalized to 1.1x, back to pre-COVID equilibrium. Peak was 2.0x in 2022. Labor market balanced.', zScore: 0.1, percentile: 68, importance: 'JOLTS shows job openings vs unemployed. Ratio >1.5 = very tight labor market. Back to 1.1 = normalized, wage pressure should ease.', sparkline: [7.67, 7.86, 7.37, 7.74, 7.37, 7.74] },
  // Business
  { id: 'ism-mfg', name: 'ISM Manufacturing', shortName: 'ISM Mfg', category: 'business', signalType: 'leading', last: 48.4, previous: 46.5, consensus: 47.5, surprise: 0.9, surpriseType: 'positive', trend: 'up', unit: '', nextRelease: 'Jan 3', daysToRelease: 26, insight: 'New Orders >50 🔄', fullInsight: 'ISM jumped to 48.4. New Orders crossed 50 (50.4) — potential manufacturing trough signal. Still in contraction but improving. Need confirmation.', zScore: -0.9, percentile: 28, importance: 'ISM Mfg is THE leading manufacturing indicator. >50 = expansion, <50 = contraction. New Orders component leads the headline by 1-2 months.', sparkline: [48.5, 46.8, 47.2, 47.2, 46.5, 48.4] },
  { id: 'ism-svc', name: 'ISM Services', shortName: 'ISM Svc', category: 'business', signalType: 'leading', last: 52.1, previous: 56.0, consensus: 55.5, surprise: -3.4, surpriseType: 'negative', trend: 'down', unit: '', nextRelease: 'Jan 7', daysToRelease: 30, insight: 'Big drop — watch closely ⚠️', fullInsight: 'Largest drop since COVID. Services is 80% of economy — if this cracks, soft landing at serious risk. Single month, need confirmation.', zScore: -0.3, percentile: 42, importance: 'ISM Services covers 80% of the economy. A sustained move below 50 would be very concerning for growth outlook.', sparkline: [51.5, 54.9, 56.0, 52.1, 56.0, 52.1] },
  // Sentiment
  { id: 'cc', name: 'Consumer Confidence', shortName: 'Conf.', category: 'sentiment', signalType: 'leading', last: 111.7, previous: 109.6, consensus: 111.8, surprise: -0.1, surpriseType: 'neutral', trend: 'up', unit: '', nextRelease: 'Dec 23', daysToRelease: 15, insight: 'Post-election surge', fullInsight: 'Post-election surge in confidence. Jobs differential (jobs plentiful vs hard to get) healthy at +18. Expectations component leading.', zScore: 0.4, percentile: 62, importance: 'Consumer confidence leads spending decisions. The "jobs plentiful" differential is highly correlated with unemployment direction.', sparkline: [105.6, 99.2, 109.6, 111.7, 109.6, 111.7] },
  { id: 'umich', name: 'Michigan Sentiment', shortName: 'UMich', category: 'sentiment', signalType: 'leading', last: 74.0, previous: 71.8, consensus: 73.0, surprise: 1.0, surpriseType: 'positive', trend: 'up', unit: '', nextRelease: 'Dec 13', daysToRelease: 5, insight: 'Inflation exp. anchored', fullInsight: 'Inflation expectations anchored: 1Y at 2.9%, 5Y at 3.1%. Fed watches these closely. Well-anchored expectations = Fed can be patient.', zScore: -0.8, percentile: 28, importance: 'Michigan inflation expectations are watched by the Fed for anchoring. Unanchored expectations can become self-fulfilling.', sparkline: [70.1, 70.5, 71.8, 74.0, 71.8, 74.0] }
];

const calendarEvents: CalendarEvent[] = [
  { date: 'Dec 6', day: 'Fri', indicator: 'NFP', previous: '36K', consensus: '200K', importance: 'high', isPast: true },
  { date: 'Dec 11', day: 'Wed', indicator: 'CPI', previous: '2.6%', consensus: '2.7%', importance: 'high' },
  { date: 'Dec 12', day: 'Thu', indicator: 'PPI', previous: '2.0%', consensus: '2.2%', importance: 'medium' },
  { date: 'Dec 12', day: 'Thu', indicator: 'Initial Claims', previous: '215K', consensus: '220K', importance: 'medium' },
  { date: 'Dec 13', day: 'Fri', indicator: 'Michigan Sentiment', previous: '71.8', consensus: '73.0', importance: 'medium' },
  { date: 'Dec 17', day: 'Tue', indicator: 'Retail Sales', previous: '0.8%', consensus: '0.3%', importance: 'high' },
  { date: 'Dec 17', day: 'Tue', indicator: 'Industrial Production', previous: '-0.4%', consensus: '0.2%', importance: 'medium' },
  { date: 'Dec 17', day: 'Tue', indicator: 'JOLTS', previous: '7.37M', consensus: '7.50M', importance: 'medium' },
  { date: 'Dec 18', day: 'Wed', indicator: 'FOMC Decision', previous: '4.75%', consensus: '4.50%', importance: 'high' },
  { date: 'Dec 19', day: 'Thu', indicator: 'GDP (Final)', previous: '3.0%', consensus: '2.9%', importance: 'medium' },
  { date: 'Dec 20', day: 'Fri', indicator: 'Core PCE', previous: '2.7%', consensus: '2.8%', importance: 'high' },
  { date: 'Dec 23', day: 'Mon', indicator: 'Consumer Confidence', previous: '109.6', consensus: '111.8', importance: 'medium' }
];

const categories = [
  { id: 'growth' as IndicatorCategory, name: 'Growth', icon: <TrendingUp className="w-3 h-3" />, color: 'text-blue-400' },
  { id: 'inflation' as IndicatorCategory, name: 'Inflation', icon: <DollarSign className="w-3 h-3" />, color: 'text-orange-400' },
  { id: 'labor' as IndicatorCategory, name: 'Labor', icon: <Users className="w-3 h-3" />, color: 'text-purple-400' },
  { id: 'business' as IndicatorCategory, name: 'Business', icon: <Building2 className="w-3 h-3" />, color: 'text-cyan-400' },
  { id: 'sentiment' as IndicatorCategory, name: 'Sentiment', icon: <Brain className="w-3 h-3" />, color: 'text-pink-400' }
];

// =============================================================================
// UTILITY COMPONENTS
// =============================================================================

const Arrow: React.FC<{ dir: TrendDirection; size?: string }> = ({ dir, size = 'w-3.5 h-3.5' }) => {
  if (dir === 'up') return <TrendingUp className={`${size} text-emerald-400`} />;
  if (dir === 'down') return <TrendingDown className={`${size} text-red-400`} />;
  return <Minus className={`${size} text-zinc-500`} />;
};

const Sparkline: React.FC<{ data: number[]; trend: TrendDirection; width?: number; height?: number }> = ({ 
  data, trend, width = 56, height = 20 
}) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => 
    `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`
  ).join(' ');
  const color = trend === 'up' ? '#34d399' : trend === 'down' ? '#f87171' : '#71717a';
  
  return (
    <svg width={width} height={height} className="opacity-80">
      <polyline 
        points={points} 
        fill="none" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <circle 
        cx={(data.length - 1) / (data.length - 1) * width} 
        cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
        r="2"
        fill={color}
      />
    </svg>
  );
};

const formatValue = (value: number, unit: string): string => {
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'K') return `${value}K`;
  if (unit === 'M') return `${value.toFixed(2)}M`;
  return value.toFixed(1);
};

const Badge: React.FC<{ children: React.ReactNode; variant: 'emerald' | 'red' | 'amber' | 'zinc' | 'blue' | 'purple' }> = ({ children, variant }) => {
  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    zinc: 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  };
  return (
    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border font-medium tracking-wide ${colors[variant]}`}>
      {children}
    </span>
  );
};

// =============================================================================
// MACRO SUMMARY BAR - NEW COMPONENT
// =============================================================================

const MacroSummaryBar: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);
  
  const summaryItems = [
    { key: 'growth', icon: <TrendingUp className="w-3 h-3" />, ...macroSummary.growth },
    { key: 'inflation', icon: <DollarSign className="w-3 h-3" />, ...macroSummary.inflation },
    { key: 'labor', icon: <Users className="w-3 h-3" />, ...macroSummary.labor },
    { key: 'business', icon: <Building2 className="w-3 h-3" />, ...macroSummary.business },
    { key: 'sentiment', icon: <Brain className="w-3 h-3" />, ...macroSummary.sentiment }
  ];

  return (
    <div className="bg-[#0a0a0b] border-b border-zinc-800/40">
      <div className="max-w-6xl mx-auto px-6 py-2.5">
        <div className="flex items-center justify-between">
          {/* Left: Macro Pillars */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-zinc-600 uppercase tracking-wider mr-3 font-medium">Regime</span>
            {summaryItems.map((item, idx) => (
              <React.Fragment key={item.key}>
                <div 
                  className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-zinc-800/30 cursor-default transition-colors"
                >
                  <span className="text-zinc-600">{item.icon}</span>
                  <span className="text-[10px] text-zinc-500 uppercase font-medium">{item.key}</span>
                  <Arrow dir={item.direction} size="w-3 h-3" />
                  <span className={`text-[10px] font-medium ${
                    item.direction === 'up' ? 'text-emerald-400' : 
                    item.direction === 'down' ? 'text-red-400' : 'text-zinc-400'
                  }`}>
                    {item.label}
                  </span>
                  
                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    <div className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 whitespace-nowrap shadow-xl">
                      <span className="text-[10px] text-zinc-400">{item.change}</span>
                    </div>
                  </div>
                </div>
                {idx < summaryItems.length - 1 && <div className="w-px h-3 bg-zinc-800/50" />}
              </React.Fragment>
            ))}
          </div>

          {/* Right: Surprise Index */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-900/50 border border-zinc-800/50">
              <Gauge className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Surprise</span>
              <span className={`text-sm font-mono font-medium ${surpriseIndex.current < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {surpriseIndex.current > 0 ? '+' : ''}{surpriseIndex.current.toFixed(1)}
              </span>
              <Arrow dir={surpriseIndex.trend} size="w-3 h-3" />
              <span className="text-[9px] text-zinc-600">{surpriseIndex.percentile}th %ile</span>
            </div>
            
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// NARRATIVE SECTION - IMPROVED
// =============================================================================

const NarrativeSection: React.FC = () => {
  const takeawayConfig = {
    long: { color: 'border-emerald-500/30 bg-emerald-500/5', icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, label: 'CONSTRUCTIVE' },
    short: { color: 'border-red-500/30 bg-red-500/5', icon: <TrendingDown className="w-4 h-4 text-red-400" />, label: 'DEFENSIVE' },
    neutral: { color: 'border-amber-500/30 bg-amber-500/5', icon: <Minus className="w-4 h-4 text-amber-400" />, label: 'NEUTRAL' },
    reduce: { color: 'border-orange-500/30 bg-orange-500/5', icon: <AlertTriangle className="w-4 h-4 text-orange-400" />, label: 'CAUTIOUS' }
  };

  const config = takeawayConfig[narrative.takeawayType];

  return (
    <section className="mb-12">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-4 bg-amber-500/70 rounded-full" />
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.15em]">Macro Narrative</span>
      </div>
      
      {/* Headline */}
      <h2 className="text-2xl font-light text-white tracking-tight mb-8 leading-tight">
        {narrative.headline}
      </h2>
      
      {/* Three Column Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* What's Happening */}
        <div className="col-span-4">
          <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
            <Circle className="w-2 h-2 text-blue-400" fill="currentColor" />
            What's Happening
          </div>
          <p className="text-[13px] text-zinc-400 leading-relaxed">{narrative.whatsHappening}</p>
        </div>

        {/* Why It Matters */}
        <div className="col-span-4">
          <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
            <Circle className="w-2 h-2 text-purple-400" fill="currentColor" />
            Why It Matters
          </div>
          <p className="text-[13px] text-zinc-400 leading-relaxed">{narrative.whyItMatters}</p>
        </div>

        {/* Market Takeaway */}
        <div className="col-span-4">
          <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
            <Circle className="w-2 h-2 text-amber-400" fill="currentColor" />
            Market Takeaway
          </div>
          <div className={`p-4 rounded-lg border ${config.color}`}>
            <div className="flex items-center gap-2 mb-2">
              {config.icon}
              <span className={`text-[10px] font-medium uppercase tracking-wider ${
                narrative.takeawayType === 'long' ? 'text-emerald-400' :
                narrative.takeawayType === 'short' ? 'text-red-400' :
                narrative.takeawayType === 'neutral' ? 'text-amber-400' : 'text-orange-400'
              }`}>
                {config.label}
              </span>
            </div>
            <p className="text-[13px] text-zinc-300 leading-relaxed">{narrative.marketTakeaway}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================================================
// TURNING POINTS - SPLIT LEADING/LAGGING
// =============================================================================

const TurningPointsSection: React.FC = () => {
  const leading = turningPoints.filter(t => t.type === 'leading');
  const lagging = turningPoints.filter(t => t.type === 'lagging');

  const SignalCard: React.FC<{ point: TurningPoint }> = ({ point }) => (
    <div className="group flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-800/20 transition-colors cursor-default">
      {/* Direction Indicator */}
      <div className={`w-1 h-full min-h-[48px] rounded-full flex-shrink-0 ${
        point.direction === 'bullish' ? 'bg-emerald-500' : 
        point.direction === 'bearish' ? 'bg-red-500' : 'bg-zinc-600'
      }`} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white">{point.indicator}</span>
          <Badge variant={point.direction === 'bullish' ? 'emerald' : point.direction === 'bearish' ? 'red' : 'zinc'}>
            {point.direction}
          </Badge>
          {point.impact === 'high' && (
            <Badge variant="amber">High Impact</Badge>
          )}
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">{point.description}</p>
      </div>
      
      {/* Confidence */}
      <div className="text-right flex-shrink-0">
        <div className="text-[10px] text-zinc-600 mb-0.5">Confidence</div>
        <div className={`text-sm font-mono font-medium ${
          point.confidence >= 80 ? 'text-white' : 
          point.confidence >= 60 ? 'text-zinc-300' : 'text-zinc-500'
        }`}>
          {point.confidence}%
        </div>
      </div>
    </div>
  );

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-4 bg-purple-500/70 rounded-full" />
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.15em]">Turning Points</span>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Leading Signals */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800/50">
            <Radio className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Leading Signals</span>
            <span className="text-[9px] text-zinc-600 ml-auto">Forward-looking</span>
          </div>
          <div className="space-y-1">
            {leading.map((point, i) => (
              <SignalCard key={i} point={point} />
            ))}
          </div>
        </div>

        {/* Lagging Signals */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800/50">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">Lagging Signals</span>
            <span className="text-[9px] text-zinc-600 ml-auto">Confirmation</span>
          </div>
          <div className="space-y-1">
            {lagging.map((point, i) => (
              <SignalCard key={i} point={point} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================================================
// COHESION HEATMAP - PROFESSIONAL VERSION
// =============================================================================

const CohesionHeatmap: React.FC = () => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const getHeatmapColor = (score: number, direction: TrendDirection) => {
    const intensity = Math.min(score / 100, 1);
    if (direction === 'up') return `rgba(16, 185, 129, ${intensity * 0.25})`;
    if (direction === 'down') return `rgba(239, 68, 68, ${intensity * 0.25})`;
    return `rgba(250, 204, 21, ${intensity * 0.2})`;
  };

  const getBorderColor = (direction: TrendDirection) => {
    if (direction === 'up') return 'border-emerald-500/20';
    if (direction === 'down') return 'border-red-500/20';
    return 'border-amber-500/20';
  };

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-cyan-500/70 rounded-full" />
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.15em]">Data Cohesion</span>
        </div>
        <div className="flex items-center gap-4 text-[9px] text-zinc-600">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-500/50" /> Improving</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-red-500/50" /> Deteriorating</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-amber-500/50" /> Stable</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {cohesionData.map((item) => (
          <div 
            key={item.category}
            className={`relative p-4 rounded-lg border cursor-default transition-all duration-200 ${getBorderColor(item.direction)} ${
              hoveredCategory === item.category ? 'scale-[1.02] shadow-lg' : ''
            }`}
            style={{ background: getHeatmapColor(item.score, item.direction) }}
            onMouseEnter={() => setHoveredCategory(item.category)}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">{item.category}</span>
              <Arrow dir={item.direction} size="w-3.5 h-3.5" />
            </div>
            
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-light text-white">{item.score}</span>
              <span className="text-[10px] text-zinc-600">/100</span>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  item.direction === 'up' ? 'bg-emerald-500' : 
                  item.direction === 'down' ? 'bg-red-500' : 'bg-amber-500'
                }`}
                style={{ width: `${item.score}%` }}
              />
            </div>

            {/* Hover Details */}
            {hoveredCategory === item.category && (
              <div className="absolute left-0 right-0 top-full mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20">
                <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">{item.change}</div>
                <div className="space-y-1.5">
                  {item.components.map((comp, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">{comp.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-zinc-500 rounded-full"
                            style={{ width: `${(comp.contribution / 35) * 100}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-zinc-400 w-6 text-right">{comp.contribution}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

// =============================================================================
// MAJOR THEMES - DEEP VERSION
// =============================================================================

const ThemesSection: React.FC = () => {
  const [expandedTheme, setExpandedTheme] = useState<number | null>(0);

  const getStatusConfig = (status: ThemeData['status']) => {
    switch (status) {
      case 'active': return { color: 'text-emerald-400 bg-emerald-500/10', label: 'Active' };
      case 'emerging': return { color: 'text-amber-400 bg-amber-500/10', label: 'Emerging' };
      case 'fading': return { color: 'text-zinc-400 bg-zinc-700/30', label: 'Fading' };
    }
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 50) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (prob >= 30) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-4 bg-yellow-500/70 rounded-full" />
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.15em]">Major Themes</span>
      </div>

      <div className="space-y-3">
        {themes.map((theme, i) => {
          const isExpanded = expandedTheme === i;
          const statusConfig = getStatusConfig(theme.status);
          
          return (
            <div 
              key={i}
              className={`border rounded-xl transition-all duration-300 ${
                isExpanded ? 'border-zinc-700 bg-zinc-900/30' : 'border-zinc-800/50 hover:border-zinc-700/50'
              }`}
            >
              {/* Header */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setExpandedTheme(isExpanded ? null : i)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Probability Score */}
                    <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border ${getProbabilityColor(theme.probability)}`}>
                      <span className="text-xl font-light">{theme.probability}</span>
                      <span className="text-[8px] uppercase tracking-wider opacity-70">%</span>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-medium text-white">{theme.title}</h4>
                        <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded font-medium tracking-wider ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-zinc-500">{theme.description}</p>
                    </div>
                  </div>
                  
                  <button className="p-1 hover:bg-zinc-800/50 rounded transition-colors">
                    {isExpanded ? 
                      <ChevronUp className="w-5 h-5 text-zinc-500" /> : 
                      <ChevronDown className="w-5 h-5 text-zinc-500" />
                    }
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-zinc-800/50 pt-4 space-y-5">
                  {/* Data Points */}
                  <div>
                    <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      Supporting Data
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {theme.dataPoints.map((point, j) => (
                        <span 
                          key={j} 
                          className="text-[11px] text-zinc-400 bg-zinc-800/50 border border-zinc-700/30 px-3 py-1.5 rounded-lg"
                        >
                          {point}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Two Column: Implication & Risk */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                        <Target className="w-3 h-3 text-blue-400" />
                        Market Implication
                      </div>
                      <p className="text-[12px] text-zinc-400 leading-relaxed">{theme.marketImplication}</p>
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        Risk Factor
                      </div>
                      <p className="text-[12px] text-zinc-400 leading-relaxed">{theme.riskFactor}</p>
                    </div>
                  </div>

                  {/* If/Then Decision Tree */}
                  <div className="bg-zinc-800/20 border border-zinc-800/50 rounded-lg p-4">
                    <div className="text-[9px] text-amber-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <GitBranch className="w-3 h-3" />
                      Decision Framework
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                        <div className="text-[9px] text-zinc-600 uppercase mb-1">If</div>
                        <p className="text-[12px] text-zinc-300">{theme.ifThen.condition}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <div className="flex-1 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                        <div className="text-[9px] text-amber-500 uppercase mb-1">Then</div>
                        <p className="text-[12px] text-amber-200">{theme.ifThen.outcome}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

// =============================================================================
// MARKET IMPLICATIONS - ENHANCED
// =============================================================================

const ImplicationsSection: React.FC = () => {
  const getOutlookConfig = (outlook: ImplicationData['outlook']) => {
    switch (outlook) {
      case 'bullish': return { icon: <TrendingUp className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
      case 'bearish': return { icon: <TrendingDown className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
      default: return { icon: <Minus className="w-4 h-4" />, color: 'text-zinc-400', bg: 'bg-zinc-700/30 border-zinc-600/30' };
    }
  };

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-4 bg-blue-500/70 rounded-full" />
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.15em]">Market Implications</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {implications.map((impl) => {
          const outlookConfig = getOutlookConfig(impl.outlook);
          
          return (
            <div key={impl.asset} className="border border-zinc-800/50 rounded-xl p-5 hover:border-zinc-700/50 transition-colors">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-base font-medium text-white">{impl.asset}</h4>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${outlookConfig.bg}`}>
                    <span className={outlookConfig.color}>{outlookConfig.icon}</span>
                    <span className={`text-[10px] uppercase font-medium ${outlookConfig.color}`}>{impl.outlook}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-zinc-600">
                    Confidence: <span className="text-white font-medium">{impl.confidence}%</span>
                  </span>
                  <span className={`uppercase px-1.5 py-0.5 rounded ${
                    impl.timeframe === 'short' ? 'text-amber-400 bg-amber-500/10' :
                    impl.timeframe === 'medium' ? 'text-blue-400 bg-blue-500/10' :
                    'text-purple-400 bg-purple-500/10'
                  }`}>
                    {impl.timeframe}-term
                  </span>
                </div>
              </div>

              {/* Favor / Avoid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-[9px] text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <div className="w-3 h-px bg-emerald-500" />
                    Favor
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{impl.toFavor}</p>
                </div>
                <div>
                  <div className="text-[9px] text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <div className="w-3 h-px bg-red-500" />
                    Avoid
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{impl.toAvoid}</p>
                </div>
              </div>

              {/* Key Chart */}
              <div className="pt-3 border-t border-zinc-800/50">
                <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Key Chart
                </div>
                <p className="text-[11px] text-zinc-500 italic">{impl.keyChart}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// =============================================================================
// INDICATORS TAB - ENHANCED WITH FILTERS
// =============================================================================

const IndicatorsTab: React.FC<{ proMode: boolean; onSelect: (id: string) => void }> = ({ proMode, onSelect }) => {
  const [signalFilter, setSignalFilter] = useState<'all' | SignalType>('all');
  const [surpriseFilter, setSurpriseFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IndicatorCategory | 'all'>('all');
  const [compactMode, setCompactMode] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = indicators.filter(ind => {
    if (categoryFilter !== 'all' && ind.category !== categoryFilter) return false;
    if (signalFilter !== 'all' && ind.signalType !== signalFilter) return false;
    if (surpriseFilter !== 'all' && ind.surpriseType !== surpriseFilter) return false;
    return true;
  });

  const groupedByCategory = categories.map(cat => ({
    ...cat,
    indicators: filtered.filter(ind => ind.category === cat.id)
  })).filter(group => group.indicators.length > 0);

  return (
    <>
      {/* Filter Bar */}
      <div className="mb-6 p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Category Filters */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-600 uppercase tracking-wider mr-2">Category</span>
            <button
              onClick={() => setCategoryFilter('all')}
              className={`text-[10px] uppercase px-2.5 py-1.5 rounded-lg transition-colors ${
                categoryFilter === 'all' ? 'text-white bg-zinc-700' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`flex items-center gap-1.5 text-[10px] uppercase px-2.5 py-1.5 rounded-lg transition-colors ${
                  categoryFilter === cat.id ? `${cat.color} bg-zinc-700` : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                {cat.icon}
                {cat.name}
              </button>
            ))}
          </div>

          {/* Signal Type Filters */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-600 uppercase tracking-wider mr-2">Signal</span>
            {(['all', 'leading', 'coincident', 'lagging'] as const).map(type => (
              <button
                key={type}
                onClick={() => setSignalFilter(type)}
                className={`text-[10px] uppercase px-2.5 py-1.5 rounded-lg transition-colors ${
                  signalFilter === type ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Surprise Filters */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-600 uppercase tracking-wider mr-2">Surprise</span>
            {(['all', 'positive', 'negative', 'neutral'] as const).map(type => (
              <button
                key={type}
                onClick={() => setSurpriseFilter(type)}
                className={`text-[10px] uppercase px-2.5 py-1.5 rounded-lg transition-colors ${
                  surpriseFilter === type 
                    ? type === 'positive' ? 'text-emerald-400 bg-emerald-500/10'
                    : type === 'negative' ? 'text-red-400 bg-red-500/10'
                    : type === 'neutral' ? 'text-zinc-300 bg-zinc-700'
                    : 'text-white bg-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                {type === 'positive' ? '+ Beat' : type === 'negative' ? '- Miss' : type === 'neutral' ? '= Inline' : type}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <button
            onClick={() => setCompactMode(!compactMode)}
            className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg transition-colors ${
              compactMode ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            {compactMode ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {compactMode ? 'Detailed' : 'Compact'}
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] text-zinc-600">{filtered.length} indicators</span>
      </div>

      {compactMode ? (
        // Compact Table View
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-zinc-600 uppercase tracking-wider border-b border-zinc-800/50">
                <th className="pb-3 text-left font-medium">Indicator</th>
                <th className="pb-3 text-left font-medium">Type</th>
                <th className="pb-3 text-right font-medium">Last</th>
                <th className="pb-3 text-right font-medium">vs Cons</th>
                <th className="pb-3 text-right font-medium">Z-Score</th>
                <th className="pb-3 text-center font-medium">Trend</th>
                <th className="pb-3 text-right font-medium">Next</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ind => (
                <tr 
                  key={ind.id}
                  className="border-b border-zinc-800/30 hover:bg-zinc-900/30 cursor-pointer transition-colors"
                  onClick={() => onSelect(ind.id)}
                >
                  <td className="py-3">
                    <span className="text-sm text-white">{ind.shortName}</span>
                  </td>
                  <td className="py-3">
                    <span className={`text-[9px] uppercase ${
                      ind.signalType === 'leading' ? 'text-amber-500' :
                      ind.signalType === 'coincident' ? 'text-blue-400' : 'text-zinc-500'
                    }`}>
                      {ind.signalType}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm text-white font-mono">{formatValue(ind.last, ind.unit)}</span>
                  </td>
                  <td className={`py-3 text-right text-sm font-mono ${
                    ind.surpriseType === 'positive' ? 'text-emerald-400' :
                    ind.surpriseType === 'negative' ? 'text-red-400' : 'text-zinc-500'
                  }`}>
                    {ind.surprise > 0 ? '+' : ''}{ind.surprise.toFixed(1)}
                  </td>
                  <td className={`py-3 text-right text-sm font-mono ${
                    ind.zScore <= -1 ? 'text-red-400' : ind.zScore >= 1 ? 'text-emerald-400' : 'text-zinc-500'
                  }`}>
                    {ind.zScore > 0 ? '+' : ''}{ind.zScore.toFixed(1)}σ
                  </td>
                  <td className="py-3">
                    <div className="flex justify-center">
                      <Sparkline data={ind.sparkline} trend={ind.trend} width={40} height={16} />
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <span className={`text-[11px] ${ind.daysToRelease <= 7 ? 'text-amber-400' : 'text-zinc-600'}`}>
                      {ind.daysToRelease}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Grouped Card View
        <div className="space-y-8">
          {groupedByCategory.map(group => (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800/30">
                <span className={group.color}>{group.icon}</span>
                <span className={`text-xs font-medium uppercase tracking-wider ${group.color}`}>{group.name}</span>
                <span className="text-[10px] text-zinc-600 ml-2">{group.indicators.length} indicators</span>
              </div>
              
              <div className="space-y-2">
                {group.indicators.map(ind => (
                  <div 
                    key={ind.id}
                    className="relative flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-900/30 cursor-pointer transition-colors group"
                    onClick={() => onSelect(ind.id)}
                    onMouseEnter={() => setHoveredId(ind.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Name & Type */}
                    <div className="w-28 flex-shrink-0">
                      <div className="text-sm text-white group-hover:text-amber-300 transition-colors">{ind.shortName}</div>
                      <div className={`text-[9px] uppercase ${
                        ind.signalType === 'leading' ? 'text-amber-600' :
                        ind.signalType === 'coincident' ? 'text-blue-600' : 'text-zinc-600'
                      }`}>
                        {ind.signalType}
                      </div>
                    </div>

                    {/* Value & Surprise */}
                    <div className="w-24 text-right">
                      <div className="text-base font-mono text-white">{formatValue(ind.last, ind.unit)}</div>
                      <div className={`text-[10px] font-mono ${
                        ind.surpriseType === 'positive' ? 'text-emerald-400' :
                        ind.surpriseType === 'negative' ? 'text-red-400' : 'text-zinc-600'
                      }`}>
                        {ind.surprise > 0 ? '+' : ''}{ind.surprise.toFixed(1)} vs cons
                      </div>
                    </div>

                    {/* Sparkline */}
                    <div className="w-16 flex-shrink-0">
                      <Sparkline data={ind.sparkline} trend={ind.trend} />
                    </div>

                    {/* Insight */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-zinc-500 truncate">{ind.insight}</p>
                    </div>

                    {/* Pro Stats */}
                    {proMode && (
                      <div className="flex items-center gap-4 text-[10px] font-mono flex-shrink-0">
                        <div className="text-right">
                          <div className="text-zinc-600">Z-Score</div>
                          <div className={ind.zScore <= -1 ? 'text-red-400' : ind.zScore >= 1 ? 'text-emerald-400' : 'text-zinc-400'}>
                            {ind.zScore > 0 ? '+' : ''}{ind.zScore.toFixed(1)}σ
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-zinc-600">%ile</div>
                          <div className="text-zinc-400">{ind.percentile}</div>
                        </div>
                      </div>
                    )}

                    {/* Next Release */}
                    <div className="w-16 text-right flex-shrink-0">
                      <div className={`text-[11px] ${ind.daysToRelease <= 7 ? 'text-amber-400' : 'text-zinc-600'}`}>
                        {ind.daysToRelease <= 7 ? `${ind.daysToRelease}d` : ind.nextRelease}
                      </div>
                      {ind.daysToRelease <= 3 && (
                        <div className="text-[8px] text-amber-500 uppercase">Soon</div>
                      )}
                    </div>

                    {/* Hover Tooltip */}
                    {hoveredId === ind.id && (
                      <div className="absolute left-28 bottom-full mb-2 w-72 p-4 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-30">
                        <div className="text-[9px] text-amber-500 uppercase tracking-wider mb-2">Why It Matters</div>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">{ind.importance}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

// =============================================================================
// CALENDAR TAB - ENHANCED
// =============================================================================

const CalendarTab: React.FC = () => {
  const today = 'Dec 8';
  
  const upcomingEvents = calendarEvents.filter(e => !e.isPast);
  const pastEvents = calendarEvents.filter(e => e.isPast);

  return (
    <div>
      {/* Timeline Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-4 bg-amber-500/70 rounded-full" />
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.15em]">Economic Calendar</span>
        <span className="text-[10px] text-zinc-600 ml-auto">Next 2 weeks</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-6 text-[10px]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-zinc-500">High Impact</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-600" />
          <span className="text-zinc-500">Medium Impact</span>
        </span>
      </div>

      {/* Events */}
      <div className="space-y-1">
        {upcomingEvents.map((event, i) => (
          <div 
            key={i}
            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
              event.importance === 'high' ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-zinc-900/30'
            }`}
          >
            {/* Date */}
            <div className="w-16 flex-shrink-0">
              <div className="text-sm text-white">{event.date}</div>
              <div className="text-[10px] text-zinc-600">{event.day}</div>
            </div>

            {/* Importance Indicator */}
            <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${
              event.importance === 'high' ? 'bg-amber-500' : 'bg-zinc-700'
            }`} />

            {/* Indicator Name */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{event.indicator}</span>
                {event.importance === 'high' && (
                  <Badge variant="amber">Market Mover</Badge>
                )}
              </div>
            </div>

            {/* Previous & Consensus */}
            <div className="flex items-center gap-6 text-[11px]">
              <div className="text-right">
                <div className="text-zinc-600">Previous</div>
                <div className="text-zinc-400 font-mono">{event.previous}</div>
              </div>
              <div className="text-right">
                <div className="text-zinc-600">Consensus</div>
                <div className="text-white font-mono">{event.consensus}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FOMC Highlight */}
      <div className="mt-8 p-5 border border-amber-500/20 bg-amber-500/5 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-medium text-amber-400">Key Event: FOMC Decision</span>
          <span className="text-[10px] text-amber-500/70 ml-auto">Dec 18</span>
        </div>
        <p className="text-[12px] text-zinc-400 leading-relaxed">
          Market pricing ~85% probability of 25bp cut to 4.50%. Focus on dot plot for 2025 rate path guidance. 
          Any hawkish surprise (hold or fewer cuts projected) would be risk-off.
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// DETAIL MODAL - ENHANCED
// =============================================================================

const DetailModal: React.FC<{ indicator: IndicatorData | null; onClose: () => void }> = ({ indicator, onClose }) => {
  if (!indicator) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div 
        className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800/50 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-medium text-white mb-1">{indicator.name}</h2>
              <div className="flex items-center gap-3 text-[10px]">
                <span className={`uppercase font-medium ${
                  indicator.signalType === 'leading' ? 'text-amber-500' :
                  indicator.signalType === 'coincident' ? 'text-blue-400' : 'text-zinc-500'
                }`}>
                  {indicator.signalType}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-500">Next: {indicator.nextRelease}</span>
                {indicator.daysToRelease <= 7 && (
                  <Badge variant="amber">{indicator.daysToRelease}d</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-light text-white font-mono">{formatValue(indicator.last, indicator.unit)}</div>
                <div className={`text-[11px] font-mono ${
                  indicator.surpriseType === 'positive' ? 'text-emerald-400' :
                  indicator.surpriseType === 'negative' ? 'text-red-400' : 'text-zinc-500'
                }`}>
                  {indicator.surprise > 0 ? '+' : ''}{indicator.surprise.toFixed(1)} vs consensus
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(85vh-100px)]">
          {/* Stats Grid */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'Previous', value: formatValue(indicator.previous, indicator.unit) },
              { label: 'Consensus', value: formatValue(indicator.consensus, indicator.unit) },
              { label: 'Z-Score', value: `${indicator.zScore > 0 ? '+' : ''}${indicator.zScore.toFixed(1)}σ`, 
                color: indicator.zScore <= -1 ? 'text-red-400' : indicator.zScore >= 1 ? 'text-emerald-400' : '' },
              { label: 'Percentile', value: `${indicator.percentile}th` },
              { label: 'Days Out', value: `${indicator.daysToRelease}` }
            ].map(stat => (
              <div key={stat.label} className="bg-zinc-800/30 rounded-lg p-3 text-center">
                <div className="text-[8px] text-zinc-600 uppercase tracking-wider mb-1">{stat.label}</div>
                <div className={`text-sm font-mono font-medium ${stat.color || 'text-zinc-300'}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Analysis */}
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">Current Analysis</span>
            </div>
            <p className="text-[13px] text-zinc-300 leading-relaxed">{indicator.fullInsight}</p>
          </div>

          {/* Why It Matters */}
          <div className="bg-zinc-800/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-medium text-amber-500 uppercase tracking-wider">Why It Matters</span>
            </div>
            <p className="text-[13px] text-zinc-400 leading-relaxed">{indicator.importance}</p>
          </div>

          {/* 6-Month Chart */}
          <div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3">6-Month Trend</div>
            <div className="flex items-end gap-2 h-24 px-2">
              {indicator.sparkline.map((v, i) => {
                const min = Math.min(...indicator.sparkline);
                const max = Math.max(...indicator.sparkline);
                const height = ((v - min) / (max - min || 1)) * 100;
                const isLast = i === indicator.sparkline.length - 1;
                const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex-1 flex items-end">
                      <div 
                        className={`w-full rounded-t transition-all ${
                          isLast ? 'bg-amber-500' : 'bg-zinc-700 hover:bg-zinc-600'
                        }`}
                        style={{ height: `${Math.max(height, 8)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-zinc-600">{months[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function MacroTerminal() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [proMode, setProMode] = useState(true);
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);

  const getSelectedIndicatorData = () => indicators.find(i => i.id === selectedIndicator) || null;

  return (
    <div className="min-h-screen bg-[#09090b] text-white antialiased">
      {/* Macro Summary Bar */}
      <MacroSummaryBar />

      {/* Main Header */}
      <div className="border-b border-zinc-800/30 sticky top-0 z-40 bg-[#09090b]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                <Compass className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h1 className="text-lg font-medium tracking-tight">Macro Intelligence Terminal</h1>
                <p className="text-[11px] text-zinc-600">Real-time economic regime analysis • Updated Dec 8, 2024</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Pro Mode Toggle */}
              <button
                onClick={() => setProMode(!proMode)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  proMode 
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
                    : 'text-zinc-500 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${proMode ? 'fill-amber-400' : ''}`} />
                <span className="text-[11px] uppercase tracking-wider font-medium">
                  {proMode ? 'Pro Mode' : 'Basic'}
                </span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1">
            {[
              { id: 'overview' as TabType, label: 'Overview', icon: <BookOpen className="w-4 h-4" /> },
              { id: 'indicators' as TabType, label: 'Indicators', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'calendar' as TabType, label: 'Calendar', icon: <Calendar className="w-4 h-4" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all ${
                  activeTab === tab.id 
                    ? 'text-white bg-zinc-800' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {activeTab === 'overview' && (
          <>
            <NarrativeSection />
            <TurningPointsSection />
            <CohesionHeatmap />
            <ThemesSection />
            <ImplicationsSection />
          </>
        )}
        {activeTab === 'indicators' && (
          <IndicatorsTab proMode={proMode} onSelect={setSelectedIndicator} />
        )}
        {activeTab === 'calendar' && (
          <CalendarTab />
        )}
      </div>

      {/* Detail Modal */}
      <DetailModal 
        indicator={getSelectedIndicatorData()} 
        onClose={() => setSelectedIndicator(null)} 
      />
    </div>
  );
}