import { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  BarChart3,
  Loader2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Shield
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface HistoricalDataPoint {
  date: string;
  fullDate: string;
  value: number;
}

interface MarketData {
  vix: number;
  putCallRatio: number;
  vixHistory: HistoricalDataPoint[];
  pcrHistory: HistoricalDataPoint[];
}

interface SentimentScore {
  score: number;
  label: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
}

type TimeRange = '7D' | '1M' | '3M' | '6M' | 'YTD' | '1Y';

// ============================================
// DESIGN TOKENS - Final
// ============================================
const COLORS = {
  // Backgrounds
  bg: '#12161D',
  card: '#171C24',
  cardHero: '#1A2029',
  cardInner: '#1D232E',
  divider: '#252C38',
  
  // Text hierarchy
  primary: '#F1F3F5',
  secondary: '#A0A6B0',
  muted: '#6F7580',
  
  // Bar
  bar: '#2A303B',
  
  // Chart
  chartLine: '#9AA3AE',
  chartGrid: '#2A3038',
  chartFill: '#3A4250',
  
  // Accents - full color for dot, tinted for text
  fear: '#8E3B2F',
  fearText: '#D4A59E',
  fearHalo: 'rgba(142, 59, 47, 0.16)',
  greed: '#2D6A5A',
  greedText: '#9EC4B8',
  greedHalo: 'rgba(45, 106, 90, 0.16)',
  neutral: '#6F7580',
  neutralHalo: 'rgba(111, 117, 128, 0.16)',
};

// ============================================
// API FETCH FUNCTIONS
// ============================================
async function fetchYahooFinanceData(symbol: string, range: string = '1y'): Promise<{ current: number; history: HistoricalDataPoint[] }> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}`
    );
    const data = await response.json();
    const result = data.chart.result[0];
    
    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0].close;
    const current = result.meta.regularMarketPrice;
    
    const history: HistoricalDataPoint[] = timestamps.map((ts: number, i: number) => {
      const date = new Date(ts * 1000);
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        fullDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        value: prices[i] ? Number(prices[i].toFixed(2)) : null
      };
    }).filter((p: HistoricalDataPoint) => p.value !== null);
    
    return { current, history };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    const mockHistory = generateMockHistory(symbol === '%5EVIX' ? 18 : 1.15, 250);
    return { 
      current: symbol === '%5EVIX' ? 18.5 : 1.30, 
      history: mockHistory 
    };
  }
}

function generateMockHistory(baseValue: number, days: number): HistoricalDataPoint[] {
  const history: HistoricalDataPoint[] = [];
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const variance = (Math.random() - 0.5) * baseValue * 0.3;
    const spike = i > 200 && i < 220 ? baseValue * 0.5 : 0;
    history.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      fullDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      value: Number((baseValue + variance + spike).toFixed(2))
    });
  }
  return history;
}

function filterDataByRange(data: HistoricalDataPoint[], range: TimeRange): HistoricalDataPoint[] {
  const now = new Date();
  let daysBack: number;
  
  switch (range) {
    case '7D': daysBack = 7; break;
    case '1M': daysBack = 30; break;
    case '3M': daysBack = 90; break;
    case '6M': daysBack = 180; break;
    case 'YTD': 
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      daysBack = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
      break;
    case '1Y': daysBack = 365; break;
    default: daysBack = 365;
  }
  
  return data.slice(-daysBack);
}

// ============================================
// SENTIMENT CALCULATION
// ============================================
function calculateVixScore(vix: number): number {
  if (vix <= 12) return 100 - ((12 - Math.max(vix, 9)) / 3) * 10;
  if (vix <= 15) return 90 - ((vix - 12) / 3) * 20;
  if (vix <= 20) return 70 - ((vix - 15) / 5) * 20;
  if (vix <= 25) return 50 - ((vix - 20) / 5) * 20;
  if (vix <= 35) return 30 - ((vix - 25) / 10) * 20;
  return Math.max(0, 10 - ((vix - 35) / 15) * 10);
}

function calculatePcrScore(pcr: number): number {
  if (pcr <= 0.5) return 100;
  if (pcr <= 0.7) return 100 - ((pcr - 0.5) / 0.2) * 15;
  if (pcr <= 0.85) return 85 - ((pcr - 0.7) / 0.15) * 20;
  if (pcr <= 1.0) return 65 - ((pcr - 0.85) / 0.15) * 20;
  if (pcr <= 1.2) return 45 - ((pcr - 1.0) / 0.2) * 20;
  if (pcr <= 1.5) return 25 - ((pcr - 1.2) / 0.3) * 20;
  return Math.max(0, 5 - ((pcr - 1.5) / 0.5) * 5);
}

function calculateCompositeSentiment(vix: number, pcr: number): SentimentScore {
  const vixScore = calculateVixScore(vix);
  const pcrScore = calculatePcrScore(pcr);
  const compositeScore = (vixScore * 0.55) + (pcrScore * 0.45);
  
  let label: SentimentScore['label'];
  if (compositeScore >= 75) label = 'Extreme Greed';
  else if (compositeScore >= 55) label = 'Greed';
  else if (compositeScore >= 45) label = 'Neutral';
  else if (compositeScore >= 25) label = 'Fear';
  else label = 'Extreme Fear';
  
  return { score: compositeScore, label };
}

// ============================================
// HERO SENTIMENT BAR
// ============================================
function HeroSentimentBar({ score, label, vix, pcr }: { 
  score: number; 
  label: string;
  vix: number;
  pcr: number;
}) {
  const getColors = () => {
    if (score >= 55) return { 
      dot: COLORS.greed, 
      text: COLORS.greedText, 
      halo: COLORS.greedHalo,
      regime: 'GREED'
    };
    if (score >= 45) return { 
      dot: COLORS.neutral, 
      text: COLORS.secondary, 
      halo: COLORS.neutralHalo,
      regime: 'NEUTRAL'
    };
    return { 
      dot: COLORS.fear, 
      text: COLORS.fearText, 
      halo: COLORS.fearHalo,
      regime: 'FEAR'
    };
  };
  
  const colors = getColors();
  const position = `${score}%`;
  
  const vixDirection = vix > 20 ? 'up' : 'down';
  const pcrDirection = pcr > 1 ? 'up' : 'down';

  return (
    <div className="px-8 py-10" style={{ backgroundColor: COLORS.cardHero }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h2 className="text-sm font-medium tracking-wide uppercase" style={{ color: COLORS.muted }}>
            Market Sentiment
          </h2>
        </div>
        
        {/* ANCHOR Score - The brain lands here immediately */}
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-0.5">
            <span 
              className="text-8xl font-normal tabular-nums tracking-tighter" 
              style={{ color: COLORS.primary }}
            >
              {Math.round(score)}
            </span>
            <span 
              className="text-base font-light" 
              style={{ color: COLORS.muted, opacity: 0.4 }}
            >
              /100
            </span>
          </div>
          {/* Regime statement */}
          <p className="text-xs mt-2 tracking-wide" style={{ color: COLORS.secondary }}>
            Market in <span style={{ color: colors.text }}>{colors.regime}</span> regime
          </p>
        </div>
      </div>
      
      {/* Bar section */}
      <div className="mb-6">
        {/* Zone labels */}
        <div 
          className="flex justify-between text-[10px] mb-3 uppercase tracking-widest" 
          style={{ color: COLORS.muted }}
        >
          <span>Extreme Fear</span>
          <span>Fear</span>
          <span>Neutral</span>
          <span>Greed</span>
          <span>Extreme Greed</span>
        </div>
        
        {/* Track */}
        <div 
          className="relative h-2.5 rounded-full"
          style={{ backgroundColor: COLORS.bar }}
        >
          {/* Subtle dividers */}
          {[25, 45, 55, 75].map((pos) => (
            <div
              key={pos}
              className="absolute top-0 bottom-0 w-px"
              style={{ 
                left: `${pos}%`,
                backgroundColor: COLORS.cardInner 
              }}
            />
          ))}
          
          {/* Halo effect - more visible */}
          <div
            className="absolute top-1/2 w-12 h-12 rounded-full"
            style={{ 
              left: position,
              transform: 'translate(-50%, -50%)',
              backgroundColor: colors.halo,
              filter: 'blur(10px)'
            }}
          />
          
          {/* Indicator dot - FULL COLOR, no opacity */}
          <div
            className="absolute top-1/2 w-4 h-4 rounded-full"
            style={{ 
              left: position,
              transform: 'translate(-50%, -50%)',
              backgroundColor: colors.dot,
            }}
          />
        </div>
      </div>
      
      {/* Label and contributors */}
      <div className="flex items-center justify-between">
        <span 
          className="text-sm font-medium uppercase tracking-wider"
          style={{ color: colors.text }}
        >
          {label}
        </span>
        
        {/* Contributors */}
        <div className="flex items-center gap-6 text-xs" style={{ color: COLORS.muted }}>
          <span className="flex items-center gap-1.5">
            <span>VIX</span>
            {vixDirection === 'up' ? (
              <ArrowUpRight className="w-3.5 h-3.5" style={{ color: COLORS.fear, opacity: 0.7 }} />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" style={{ color: COLORS.greed, opacity: 0.7 }} />
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <span>P/C</span>
            {pcrDirection === 'up' ? (
              <ArrowUpRight className="w-3.5 h-3.5" style={{ color: COLORS.fear, opacity: 0.7 }} />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" style={{ color: COLORS.greed, opacity: 0.7 }} />
            )}
          </span>
        </div>
      </div>
      
      {/* Intelligent Divider - colored by sentiment */}
      <div 
        className="mt-8 h-px w-full" 
        style={{ backgroundColor: colors.dot, opacity: 0.07 }}
      />
    </div>
  );
}

// ============================================
// CONTEXT CHARTS
// ============================================
const timeRanges: TimeRange[] = ['7D', '1M', '3M', '6M', 'YTD', '1Y'];

function ContextChart({ 
  title,
  currentValue,
  data, 
  referenceLine,
  icon: Icon
}: { 
  title: string;
  currentValue: number;
  data: HistoricalDataPoint[]; 
  referenceLine?: number;
  icon: React.ElementType;
}) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1M');
  
  const filteredData = useMemo(() => 
    filterDataByRange(data, selectedRange), 
    [data, selectedRange]
  );

  const { minValue, maxValue } = useMemo(() => {
    const values = filteredData.map(d => d.value);
    const min = Math.min(...values, referenceLine || Infinity);
    const max = Math.max(...values, referenceLine || 0);
    const padding = (max - min) * 0.15;
    return {
      minValue: Number((min - padding).toFixed(2)),
      maxValue: Number((max + padding).toFixed(2))
    };
  }, [filteredData, referenceLine]);

  const change = useMemo(() => {
    if (filteredData.length < 2) return 0;
    const first = filteredData[0].value;
    const last = filteredData[filteredData.length - 1].value;
    return ((last - first) / first) * 100;
  }, [filteredData]);

  const tickInterval = useMemo(() => {
    const len = filteredData.length;
    if (len <= 7) return 1;
    if (len <= 30) return Math.floor(len / 5);
    if (len <= 90) return Math.floor(len / 6);
    return Math.floor(len / 6);
  }, [filteredData]);

  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: COLORS.card }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: COLORS.muted }} />
          <span className="text-sm" style={{ color: COLORS.secondary }}>{title}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-light tabular-nums" style={{ color: COLORS.primary }}>
            {currentValue.toFixed(2)}
          </span>
          <span 
            className="text-xs tabular-nums"
            style={{ color: change >= 0 ? COLORS.greed : COLORS.fear, opacity: 0.8 }}
          >
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        </div>
      </div>
      
      {/* Time range selector */}
      <div className="flex gap-1 mb-4">
        {timeRanges.map((range) => (
          <button
            key={range}
            onClick={() => setSelectedRange(range)}
            className="px-2.5 py-1 text-[10px] rounded transition-all duration-150"
            style={{
              color: selectedRange === range ? COLORS.primary : COLORS.muted,
              backgroundColor: selectedRange === range ? COLORS.cardInner : 'transparent'
            }}
          >
            {range}
          </button>
        ))}
      </div>
      
      {/* Chart */}
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={filteredData} 
            margin={{ top: 5, right: 40, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`gradient-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.chartFill} stopOpacity={0.4} />
                <stop offset="100%" stopColor={COLORS.chartFill} stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="0" 
              vertical={false}
              stroke={COLORS.chartGrid}
              strokeOpacity={0.5}
            />
            
            <XAxis 
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: COLORS.muted }}
              interval={tickInterval}
              dy={5}
            />
            
            <YAxis 
              domain={[minValue, maxValue]}
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: COLORS.muted }}
              width={35}
              tickFormatter={(v) => v.toFixed(1)}
            />
            
            <RechartsTooltip
              contentStyle={{
                backgroundColor: COLORS.cardInner,
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                padding: '8px 12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
              labelStyle={{ color: COLORS.muted, marginBottom: '4px' }}
              formatter={(val: number) => [
                <span key="val" style={{ color: COLORS.primary }}>{val.toFixed(2)}</span>, 
                ''
              ]}
              labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
            />
            
            {referenceLine && (
              <ReferenceLine 
                y={referenceLine} 
                stroke={COLORS.muted}
                strokeDasharray="4 4"
                strokeOpacity={0.4}
              />
            )}
            
            <Area
              type="monotone"
              dataKey="value"
              stroke={COLORS.chartLine}
              strokeWidth={1.5}
              fill={`url(#gradient-${title.replace(/\s/g, '')})`}
              dot={false}
              activeDot={{ r: 3, fill: COLORS.chartLine, stroke: COLORS.card, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================================
// SIGNALS - With purposeful color
// ============================================
function SignalsSection({ vix, pcr }: { vix: number; pcr: number }) {
  const signals = useMemo(() => {
    const result = [];
    
    if (vix < 15) {
      result.push({ 
        type: 'bullish' as const, 
        icon: Shield,
        keyword: 'Low',
        text: 'volatility environment',
        action: vix < 12 ? 'Complacency building — watch for reversal' : 'Favorable for directional longs'
      });
    } else if (vix > 25) {
      result.push({ 
        type: 'bearish' as const, 
        icon: AlertTriangle,
        keyword: 'Elevated',
        text: 'fear levels',
        action: vix > 30 ? 'Contrarian bias forming' : 'Risk-off sentiment dominant'
      });
    }
    
    if (pcr < 0.7) {
      result.push({ 
        type: 'bullish' as const, 
        icon: TrendingUp,
        keyword: 'Extreme',
        text: 'call activity',
        action: 'Potential exhaustion signal'
      });
    } else if (pcr > 1.0) {
      result.push({ 
        type: 'bearish' as const, 
        icon: TrendingDown,
        keyword: 'Heavy',
        text: 'put hedging',
        action: pcr > 1.2 ? 'Contrarian opportunity emerging' : 'Protective positioning active'
      });
    }
    
    return result;
  }, [vix, pcr]);

  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: COLORS.card }}>
      <div className="flex items-center gap-2 mb-5">
        <Activity className="h-4 w-4" style={{ color: COLORS.muted }} />
        <span className="text-sm" style={{ color: COLORS.secondary }}>Signals</span>
      </div>
      
      {signals.length === 0 ? (
        <div className="flex items-start gap-3">
          <Shield className="h-4 w-4 mt-0.5 shrink-0" style={{ color: COLORS.muted }} />
          <div>
            <p className="text-sm" style={{ color: COLORS.primary }}>No significant signals</p>
            <p className="text-xs mt-1" style={{ color: COLORS.muted }}>Market sentiment is balanced</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {signals.map((signal, idx) => {
            const IconComponent = signal.icon;
            const accentColor = signal.type === 'bullish' ? COLORS.greed : COLORS.fear;
            return (
              <div key={idx} className="flex items-start gap-3">
                <IconComponent 
                  className="h-4 w-4 mt-0.5 shrink-0" 
                  style={{ color: accentColor }} 
                />
                <div>
                  <p className="text-sm" style={{ color: COLORS.primary }}>
                    <span style={{ color: accentColor, fontWeight: 500 }}>{signal.keyword}</span>
                    {' '}{signal.text}
                  </p>
                  <p className="text-xs mt-1" style={{ color: COLORS.secondary }}>
                    {signal.action}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// CONTEXT - Numbers prominent
// ============================================
function ContextSection({ vix, pcr }: { vix: number; pcr: number }) {
  const pcrReading = pcr > 1.2 ? 'Very Bearish' : pcr > 1 ? 'Bearish' : pcr < 0.7 ? 'Very Bullish' : pcr < 0.85 ? 'Bullish' : 'Neutral';
  const pcrColor = pcr > 1 ? COLORS.fearText : pcr < 0.85 ? COLORS.greedText : COLORS.secondary;

  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: COLORS.card }}>
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="h-4 w-4" style={{ color: COLORS.muted }} />
        <span className="text-sm" style={{ color: COLORS.secondary }}>Context</span>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        {/* VIX */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: COLORS.muted }}>
            VIX Reference
          </p>
          <div className="space-y-2.5">
            {[
              { label: 'COVID Peak', value: 82.69 },
              { label: '2008 Peak', value: 80.86 },
              { label: 'Average', value: 19.5 },
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span style={{ color: COLORS.muted }}>{item.label}</span>
                <span className="tabular-nums font-medium" style={{ color: COLORS.secondary }}>
                  {item.value}
                </span>
              </div>
            ))}
            <div 
              className="flex justify-between text-sm pt-3 mt-3" 
              style={{ borderTop: `1px solid ${COLORS.divider}` }}
            >
              <span style={{ color: COLORS.secondary }}>Current</span>
              <span className="tabular-nums font-semibold" style={{ color: COLORS.primary }}>
                {vix.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        
        {/* PCR */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: COLORS.muted }}>
            Put/Call Ratio
          </p>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span style={{ color: COLORS.secondary }}>Current</span>
              <span className="tabular-nums font-semibold" style={{ color: COLORS.primary }}>
                {pcr.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: COLORS.muted }}>Reading</span>
              <span className="font-medium" style={{ color: pcrColor }}>
                {pcrReading}
              </span>
            </div>
          </div>
          <p className="text-[10px] mt-4 leading-relaxed" style={{ color: COLORS.muted }}>
            {pcr >= 1 
              ? 'Elevated puts indicate hedging activity' 
              : 'Call dominance suggests bullish positioning'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function AllMarketsSentiment() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      const [vixData, pcrData] = await Promise.all([
        fetchYahooFinanceData('%5EVIX', '1y'),
        fetchYahooFinanceData('%5ECPCE', '1y')
      ]);
      
      setMarketData({ 
        vix: vixData.current, 
        putCallRatio: pcrData.current,
        vixHistory: vixData.history,
        pcrHistory: pcrData.history
      });
      setIsLoading(false);
    };
    
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);
  
  const compositeSentiment = useMemo(() => 
    marketData ? calculateCompositeSentiment(marketData.vix, marketData.putCallRatio) : { score: 50, label: 'Neutral' as const },
    [marketData]
  );

  if (isLoading || !marketData) {
    return (
      <div 
        className="p-6 min-h-[400px] flex items-center justify-center" 
        style={{ backgroundColor: COLORS.bg }}
      >
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: COLORS.muted }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4" style={{ backgroundColor: COLORS.bg }}>
      {/* HERO - Market Sentiment */}
      <div className="rounded-lg overflow-hidden">
        <HeroSentimentBar 
          score={compositeSentiment.score} 
          label={compositeSentiment.label}
          vix={marketData.vix}
          pcr={marketData.putCallRatio}
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <ContextChart
          title="VIX Index"
          currentValue={marketData.vix}
          data={marketData.vixHistory}
          referenceLine={20}
          icon={Activity}
        />
        
        <ContextChart
          title="Put/Call Ratio"
          currentValue={marketData.putCallRatio}
          data={marketData.pcrHistory}
          referenceLine={1}
          icon={BarChart3}
        />
      </div>

      {/* Intelligence */}
      <div className="grid md:grid-cols-2 gap-4">
        <SignalsSection 
          vix={marketData.vix} 
          pcr={marketData.putCallRatio}
        />
        <ContextSection 
          vix={marketData.vix} 
          pcr={marketData.putCallRatio}
        />
      </div>
    </div>
  );
}