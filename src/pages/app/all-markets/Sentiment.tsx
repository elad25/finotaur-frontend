import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  CartesianGrid,
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
  Shield,
} from 'lucide-react';
import { Card, Eyebrow } from '@/components/ds/Card';

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
// DESIGN TOKENS — ETF / DS gold-on-black
// Raw hex only where recharts / inline-positioned SVG needs it.
// Everything else uses DS Tailwind classes.
// ============================================
const GOLD = '#C9A646'; // --gold-primary
const RED = '#E24B4A'; // --num-negative
const CHART = {
  line: GOLD,
  grid: 'rgba(255,255,255,0.04)',
  axis: 'rgba(255,255,255,0.42)',
  ref: 'rgba(255,255,255,0.25)',
  tooltipBg: '#141414',
  tooltipBorder: 'rgba(255,255,255,0.08)',
};

// Regime accent: greed = gold, fear = red, neutral = muted white.
function regimeAccent(score: number): { hex: string; textClass: string; regime: string } {
  if (score >= 55) return { hex: GOLD, textClass: 'text-gold-primary', regime: 'GREED' };
  if (score >= 45) return { hex: 'rgba(255,255,255,0.55)', textClass: 'text-ink-secondary', regime: 'NEUTRAL' };
  return { hex: RED, textClass: 'text-num-negative', regime: 'FEAR' };
}

// ============================================
// API FETCH FUNCTIONS
// ============================================
async function fetchYahooFinanceData(
  symbol: string,
  range: string = '1y',
): Promise<{ current: number; history: HistoricalDataPoint[] }> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}`,
    );
    const data = await response.json();
    const result = data.chart.result[0];

    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0].close;
    const current = result.meta.regularMarketPrice;

    const history: HistoricalDataPoint[] = timestamps
      .map((ts: number, i: number) => {
        const date = new Date(ts * 1000);
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
          fullDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          value: prices[i] ? Number(prices[i].toFixed(2)) : null,
        };
      })
      .filter((p: HistoricalDataPoint) => p.value !== null);

    return { current, history };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    const mockHistory = generateMockHistory(symbol === '%5EVIX' ? 18 : 1.15, 250);
    return {
      current: symbol === '%5EVIX' ? 18.5 : 1.3,
      history: mockHistory,
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
      value: Number((baseValue + variance + spike).toFixed(2)),
    });
  }
  return history;
}

function filterDataByRange(data: HistoricalDataPoint[], range: TimeRange): HistoricalDataPoint[] {
  const now = new Date();
  let daysBack: number;

  switch (range) {
    case '7D':
      daysBack = 7;
      break;
    case '1M':
      daysBack = 30;
      break;
    case '3M':
      daysBack = 90;
      break;
    case '6M':
      daysBack = 180;
      break;
    case 'YTD': {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      daysBack = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
      break;
    }
    case '1Y':
      daysBack = 365;
      break;
    default:
      daysBack = 365;
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
  const compositeScore = vixScore * 0.55 + pcrScore * 0.45;

  let label: SentimentScore['label'];
  if (compositeScore >= 75) label = 'Extreme Greed';
  else if (compositeScore >= 55) label = 'Greed';
  else if (compositeScore >= 45) label = 'Neutral';
  else if (compositeScore >= 25) label = 'Fear';
  else label = 'Extreme Fear';

  return { score: compositeScore, label };
}

// ============================================
// HERO SENTIMENT — score anchor + regime bar
// ============================================
function HeroSentiment({ score, label, vix, pcr }: { score: number; label: string; vix: number; pcr: number }) {
  const accent = regimeAccent(score);
  const position = `${score}%`;
  const vixDirection = vix > 20 ? 'up' : 'down';
  const pcrDirection = pcr > 1 ? 'up' : 'down';

  return (
    <Card padding="spacious">
      {/* Header row: eyebrow + anchor score */}
      <div className="flex items-start justify-between">
        <div className="space-y-ds-1">
          <Eyebrow>Market Sentiment</Eyebrow>
          <p className="text-body text-ink-secondary max-w-[280px]">
            Composite reading from VIX and Put/Call, rebased 0–100.
          </p>
        </div>

        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1">
            <span className="font-mono tabular-nums text-7xl leading-none text-ink-primary">
              {Math.round(score)}
            </span>
            <span className="font-mono text-base text-ink-muted">/100</span>
          </div>
          <p className="text-xs mt-2 text-ink-tertiary">
            Market in <span className={accent.textClass}>{accent.regime}</span> regime
          </p>
        </div>
      </div>

      {/* Bar section */}
      <div className="mt-ds-6">
        <div className="flex justify-between text-[10px] mb-3 uppercase tracking-widest text-ink-muted">
          <span>Extreme Fear</span>
          <span>Fear</span>
          <span>Neutral</span>
          <span>Greed</span>
          <span>Extreme Greed</span>
        </div>

        <div className="relative h-2.5 rounded-full bg-surface-2">
          {[25, 45, 55, 75].map((pos) => (
            <div
              key={pos}
              className="absolute top-0 bottom-0 w-px bg-border-ds-subtle"
              style={{ left: `${pos}%` }}
            />
          ))}

          {/* Halo */}
          <div
            className="absolute top-1/2 w-12 h-12 rounded-full"
            style={{
              left: position,
              transform: 'translate(-50%, -50%)',
              backgroundColor: accent.hex,
              opacity: 0.18,
              filter: 'blur(10px)',
            }}
          />

          {/* Indicator dot */}
          <div
            className="absolute top-1/2 w-4 h-4 rounded-full"
            style={{
              left: position,
              transform: 'translate(-50%, -50%)',
              backgroundColor: accent.hex,
            }}
          />
        </div>
      </div>

      {/* Label + contributors */}
      <div className="flex items-center justify-between mt-ds-5">
        <span className={`text-sm font-medium uppercase tracking-wider ${accent.textClass}`}>{label}</span>

        <div className="flex items-center gap-6 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span>VIX</span>
            {vixDirection === 'up' ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-num-negative" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-gold-primary" />
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <span>P/C</span>
            {pcrDirection === 'up' ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-num-negative" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-gold-primary" />
            )}
          </span>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// CONTEXT CHARTS — ETF gold line + segmented range
// ============================================
const timeRanges: TimeRange[] = ['7D', '1M', '3M', '6M', 'YTD', '1Y'];

function ContextChart({
  title,
  currentValue,
  data,
  referenceLine,
  icon: Icon,
}: {
  title: string;
  currentValue: number;
  data: HistoricalDataPoint[];
  referenceLine?: number;
  icon: React.ElementType;
}) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1M');

  const filteredData = useMemo(() => filterDataByRange(data, selectedRange), [data, selectedRange]);

  const { minValue, maxValue } = useMemo(() => {
    const values = filteredData.map((d) => d.value);
    const min = Math.min(...values, referenceLine || Infinity);
    const max = Math.max(...values, referenceLine || 0);
    const padding = (max - min) * 0.15;
    return {
      minValue: Number((min - padding).toFixed(2)),
      maxValue: Number((max + padding).toFixed(2)),
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

  const gradientId = `sentiment-gold-${title.replace(/\s/g, '')}`;

  return (
    <Card padding="default">
      {/* Header: title eyebrow + current value */}
      <div className="flex items-center justify-between mb-ds-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-ink-muted" />
          <span className="text-[11px] uppercase tracking-wider text-ink-tertiary">{title}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono tabular-nums text-2xl text-ink-primary">{currentValue.toFixed(2)}</span>
          <span className={`font-mono text-xs tabular-nums ${change >= 0 ? 'text-ink-primary' : 'text-num-negative'}`}>
            {change >= 0 ? '+' : ''}
            {change.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Range — ETF segmented control */}
      <div className="flex justify-end mb-ds-4">
        <div className="flex rounded-[6px] overflow-hidden border border-border-ds-subtle">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                selectedRange === range
                  ? 'bg-gold-primary/20 text-gold-bright'
                  : 'text-ink-tertiary hover:text-ink-secondary'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 5, right: 40, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.line} stopOpacity={0.18} />
                <stop offset="100%" stopColor={CHART.line} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="0" vertical={false} stroke={CHART.grid} strokeOpacity={1} />

            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: CHART.axis }}
              interval={tickInterval}
              dy={5}
            />

            <YAxis
              domain={[minValue, maxValue]}
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: CHART.axis }}
              width={35}
              tickFormatter={(v) => v.toFixed(1)}
            />

            <RechartsTooltip
              contentStyle={{
                backgroundColor: CHART.tooltipBg,
                border: `1px solid ${CHART.tooltipBorder}`,
                borderRadius: '8px',
                fontSize: '11px',
                padding: '8px 12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.55)', marginBottom: '4px' }}
              formatter={(val: number) => [
                <span key="val" className="text-ink-primary">
                  {val.toFixed(2)}
                </span>,
                '',
              ]}
              labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
            />

            {referenceLine && (
              <ReferenceLine y={referenceLine} stroke={CHART.ref} strokeDasharray="4 4" />
            )}

            <Area
              type="monotone"
              dataKey="value"
              stroke={CHART.line}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 3, fill: CHART.line, stroke: CHART.tooltipBg, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ============================================
// SIGNALS — gold/white/red, no green
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
        action: vix < 12 ? 'Complacency building — watch for reversal' : 'Favorable for directional longs',
      });
    } else if (vix > 25) {
      result.push({
        type: 'bearish' as const,
        icon: AlertTriangle,
        keyword: 'Elevated',
        text: 'fear levels',
        action: vix > 30 ? 'Contrarian bias forming' : 'Risk-off sentiment dominant',
      });
    }

    if (pcr < 0.7) {
      result.push({
        type: 'bullish' as const,
        icon: TrendingUp,
        keyword: 'Extreme',
        text: 'call activity',
        action: 'Potential exhaustion signal',
      });
    } else if (pcr > 1.0) {
      result.push({
        type: 'bearish' as const,
        icon: TrendingDown,
        keyword: 'Heavy',
        text: 'put hedging',
        action: pcr > 1.2 ? 'Contrarian opportunity emerging' : 'Protective positioning active',
      });
    }

    return result;
  }, [vix, pcr]);

  return (
    <Card padding="default">
      <div className="flex items-center gap-2 mb-ds-5">
        <Activity className="h-4 w-4 text-ink-muted" />
        <span className="text-[11px] uppercase tracking-wider text-ink-tertiary">Signals</span>
      </div>

      {signals.length === 0 ? (
        <div className="flex items-start gap-3">
          <Shield className="h-4 w-4 mt-0.5 shrink-0 text-ink-muted" />
          <div>
            <p className="text-sm text-ink-primary">No significant signals</p>
            <p className="text-xs mt-1 text-ink-muted">Market sentiment is balanced</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {signals.map((signal, idx) => {
            const IconComponent = signal.icon;
            // bullish = gold accent, bearish = red. No green per DS.
            const accentClass = signal.type === 'bullish' ? 'text-gold-primary' : 'text-num-negative';
            return (
              <div key={idx} className="flex items-start gap-3">
                <IconComponent className={`h-4 w-4 mt-0.5 shrink-0 ${accentClass}`} />
                <div>
                  <p className="text-sm text-ink-primary">
                    <span className={`font-medium ${accentClass}`}>{signal.keyword}</span> {signal.text}
                  </p>
                  <p className="text-xs mt-1 text-ink-secondary">{signal.action}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ============================================
// CONTEXT — reference numbers
// ============================================
function ContextSection({ vix, pcr }: { vix: number; pcr: number }) {
  const pcrReading =
    pcr > 1.2 ? 'Very Bearish' : pcr > 1 ? 'Bearish' : pcr < 0.7 ? 'Very Bullish' : pcr < 0.85 ? 'Bullish' : 'Neutral';
  // gold for bullish-leaning, red for bearish-leaning, muted for neutral
  const pcrClass = pcr > 1 ? 'text-num-negative' : pcr < 0.85 ? 'text-gold-primary' : 'text-ink-secondary';

  return (
    <Card padding="default">
      <div className="flex items-center gap-2 mb-ds-5">
        <BarChart3 className="h-4 w-4 text-ink-muted" />
        <span className="text-[11px] uppercase tracking-wider text-ink-tertiary">Context</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* VIX */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-3 text-ink-muted">VIX Reference</p>
          <div className="space-y-2.5">
            {[
              { label: 'COVID Peak', value: 82.69 },
              { label: '2008 Peak', value: 80.86 },
              { label: 'Average', value: 19.5 },
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-ink-muted">{item.label}</span>
                <span className="font-mono tabular-nums font-medium text-ink-secondary">{item.value}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-3 mt-3 border-t border-border-ds-subtle">
              <span className="text-ink-secondary">Current</span>
              <span className="font-mono tabular-nums font-semibold text-ink-primary">{vix.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* PCR */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-3 text-ink-muted">Put/Call Ratio</p>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Current</span>
              <span className="font-mono tabular-nums font-semibold text-ink-primary">{pcr.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-muted">Reading</span>
              <span className={`font-medium ${pcrClass}`}>{pcrReading}</span>
            </div>
          </div>
          <p className="text-[10px] mt-4 leading-relaxed text-ink-muted">
            {pcr >= 1 ? 'Elevated puts indicate hedging activity' : 'Call dominance suggests bullish positioning'}
          </p>
        </div>
      </div>
    </Card>
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
        fetchYahooFinanceData('%5ECPCE', '1y'),
      ]);

      setMarketData({
        vix: vixData.current,
        putCallRatio: pcrData.current,
        vixHistory: vixData.history,
        pcrHistory: pcrData.history,
      });
      setIsLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const compositeSentiment = useMemo(
    () =>
      marketData
        ? calculateCompositeSentiment(marketData.vix, marketData.putCallRatio)
        : { score: 50, label: 'Neutral' as const },
    [marketData],
  );

  if (isLoading || !marketData) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base text-ink-primary">
      <div className="mx-auto max-w-[1000px] py-ds-7 px-ds-4 flex flex-col gap-ds-5">
        {/* Page header */}
        <div className="space-y-ds-1">
          <Eyebrow>Market Intelligence</Eyebrow>
          <h1 className="text-h2 font-medium text-ink-primary">Fear &amp; Greed Index</h1>
          <p className="text-body text-ink-secondary">
            Live market sentiment from volatility and options positioning.
          </p>
        </div>

        {/* Hero */}
        <HeroSentiment
          score={compositeSentiment.score}
          label={compositeSentiment.label}
          vix={marketData.vix}
          pcr={marketData.putCallRatio}
        />

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-ds-5">
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
        <div className="grid md:grid-cols-2 gap-ds-5">
          <SignalsSection vix={marketData.vix} pcr={marketData.putCallRatio} />
          <ContextSection vix={marketData.vix} pcr={marketData.putCallRatio} />
        </div>
      </div>
    </div>
  );
}
