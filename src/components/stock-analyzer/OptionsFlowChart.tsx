// src/components/stock-analyzer/OptionsFlowChart.tsx
// =====================================================
// 📊 OPTIONS FLOW CHART — Institutional Net Flow v1.0
// =====================================================
// Dark professional chart matching FINOTAUR design language.
// Shows: Calls vs Puts cumulative premium, Algo flow,
//        Stock price overlay, Volume convergence bars.
//
// Data source: /api/options-flow/:symbol (Polygon)
// Cache: 24h on backend, in-memory on frontend (survives tab switches)
//
// PLACEMENT: OverviewTab — below Company Overview section
// =====================================================

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  BarChart,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  Zap,
  Shield,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// TYPES
// =====================================================

interface OptionsFlowData {
  symbol: string;
  hasData: boolean;
  currentPrice: number;
  previousClose: number;
  priceChange: number;
  priceChangePercent: number;
  summary: {
    totalVolume: number;
    totalOI: number;
    totalPremium: number;
    totalPremiumFormatted: string;
    netPremium: number;
    netPremiumFormatted: string;
    putCallRatio: number;
    putCallOIRatio: number;
    sentiment: string;
    sentimentScore: number;
  };
  calls: {
    volume: number;
    openInterest: number;
    premium: number;
    premiumFormatted: string;
    largePremium: number;
    largePremiumFormatted: string;
  };
  puts: {
    volume: number;
    openInterest: number;
    premium: number;
    premiumFormatted: string;
    largePremium: number;
    largePremiumFormatted: string;
  };
  algoFlow: {
    netPremium: number;
    netPremiumFormatted: string;
    direction: string;
  };
  gamma: {
    netExposure: number;
    topLevels: Array<{ strike: number; totalGamma: number }>;
  };
  chartData: Array<{
    strike: number;
    callVolume: number;
    putVolume: number;
    netFlow: number;
    cumCalls: number;
    cumPuts: number;
    cumNet: number;
    algoFlow: number;
  }>;
  strikeDistribution: Array<{
    strike: number;
    callVolume: number;
    putVolume: number;
    callOI: number;
    putOI: number;
    netPremium: number;
  }>;
  unusualActivity: Array<{
    type: string;
    strike: number;
    expiration: string;
    volume: number;
    openInterest: number;
    volOiRatio: number;
    premium: number;
    isLargeOrder: boolean;
  }>;
  expirationBreakdown: Array<{
    date: string;
    callVolume: number;
    putVolume: number;
    callPremium: number;
    putPremium: number;
  }>;
  contractsAnalyzed: number;
  timestamp: string;
}

interface OptionsFlowChartProps {
  ticker: string;
}

// =====================================================
// FRONTEND CACHE — survives tab switches (24h)
// =====================================================

const flowCacheMap = new Map<string, { data: OptionsFlowData; timestamp: number }>();
const FRONTEND_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

function getCachedFlow(ticker: string): OptionsFlowData | null {
  const entry = flowCacheMap.get(ticker);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > FRONTEND_CACHE_TTL) {
    flowCacheMap.delete(ticker);
    return null;
  }
  return entry.data;
}

function setCachedFlow(ticker: string, data: OptionsFlowData) {
  flowCacheMap.set(ticker, { data, timestamp: Date.now() });
}

// =====================================================
// HELPER: Format numbers
// =====================================================

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtPremium(n: number): string {
  const prefix = n >= 0 ? '+$' : '-$';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${prefix}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${prefix}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${prefix}${(abs / 1e3).toFixed(1)}K`;
  return `${prefix}${abs.toFixed(0)}`;
}

// =====================================================
// CUSTOM TOOLTIP
// =====================================================

function FlowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-white/10 p-3 shadow-2xl backdrop-blur-xl"
      style={{ background: 'rgba(15,15,15,0.95)' }}>
      <p className="text-xs font-bold text-white mb-2">Strike ${label}</p>
      <div className="space-y-1.5">
        {payload.map((item: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
              <span className="text-[10px] text-[#8B8B8B]">{item.name}</span>
            </div>
            <span className="text-[10px] font-mono font-bold" style={{ color: item.color }}>
              {typeof item.value === 'number' ? fmtCompact(item.value) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// METRIC PILL COMPONENT
// =====================================================

function MetricPill({ label, value, color, icon: Icon, subtext }: {
  label: string;
  value: string;
  color: string;
  icon?: any;
  subtext?: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-xl border border-white/5"
      style={{ background: `${color}08` }}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" style={{ color: `${color}80` }} />}
        <span className="text-[10px] text-[#6B6B6B] uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-sm font-bold font-mono" style={{ color }}>{value}</span>
      {subtext && <span className="text-[9px] text-[#4B4B4B]">{subtext}</span>}
    </div>
  );
}

// =====================================================
// SENTIMENT GAUGE
// =====================================================

function SentimentGauge({ score, sentiment }: { score: number; sentiment: string }) {
  const color = sentiment === 'bullish' ? '#22C55E' : sentiment === 'bearish' ? '#EF4444' : '#F59E0B';
  const width = `${score}%`;
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="relative h-full rounded-full overflow-hidden">
          {/* Gradient bar */}
          <div className="absolute inset-0 rounded-full"
            style={{ background: 'linear-gradient(90deg, #EF4444 0%, #F59E0B 40%, #F59E0B 60%, #22C55E 100%)' }} />
          {/* Mask to show only up to score */}
          <div className="absolute top-0 right-0 h-full bg-[#0a0a0a]/90 rounded-r-full"
            style={{ width: `${100 - score}%` }} />
          {/* Indicator dot */}
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg"
            style={{ left: `calc(${score}% - 6px)`, background: color }} />
        </div>
      </div>
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
        {sentiment}
      </span>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

const OptionsFlowChart = memo(({ ticker }: OptionsFlowChartProps) => {
  const [data, setData] = useState<OptionsFlowData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchFlow = useCallback(async (forceRefresh = false) => {
    if (!ticker) return;

    // Check frontend cache first
    if (!forceRefresh) {
      const cached = getCachedFlow(ticker);
      if (cached) {
        setData(cached);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/options-flow/${ticker}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();

      if (result.hasData) {
        setData(result);
        setCachedFlow(ticker, result);
      } else {
        setData(null);
        setError(result.message || 'No options data available');
      }
    } catch (e: any) {
      console.error('[OptionsFlow] Fetch error:', e);
      setError('Failed to load options flow data');
    } finally {
      setIsLoading(false);
    }
  }, [ticker]);

  // Auto-fetch on ticker change
  useEffect(() => {
    fetchFlow();
  }, [fetchFlow]);

  // ============ NO DATA STATE ============
  if (!isLoading && !data && !error) return null;

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-white/5 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(15,15,15,0.8), rgba(10,10,10,0.95))' }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-5 h-5 text-[#4B4B4B]" />
            <h3 className="text-sm font-bold text-[#6B6B6B]">Options Flow</h3>
          </div>
          <p className="text-xs text-[#4B4B4B]">{error}</p>
        </div>
      </div>
    );
  }

  // ============ LOADING STATE ============
  if (isLoading && !data) {
    return (
      <div className="rounded-2xl border border-white/5 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(15,15,15,0.8), rgba(10,10,10,0.95))' }}>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[#C9A646] animate-spin" />
            <span className="text-sm text-[#8B8B8B]">Loading options flow for {ticker}...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const sentimentColor = data.summary.sentiment === 'bullish' ? '#22C55E' 
    : data.summary.sentiment === 'bearish' ? '#EF4444' : '#F59E0B';

  // ============ MAIN RENDER ============
  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
      style={{ background: 'linear-gradient(180deg, rgba(12,12,12,1) 0%, rgba(8,8,8,1) 100%)' }}>
      
      {/* ======== HEADER ======== */}
      <div className="px-6 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${sentimentColor}20, ${sentimentColor}05)`,
                border: `1px solid ${sentimentColor}30`,
              }}>
              <Activity className="w-5 h-5" style={{ color: sentimentColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Market Net Flow</h3>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                  style={{
                    background: `${sentimentColor}15`,
                    color: sentimentColor,
                    border: `1px solid ${sentimentColor}25`,
                  }}>
                  {data.summary.sentiment}
                </span>
              </div>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                {data.contractsAnalyzed} contracts analyzed • {new Date(data.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-[10px] px-3 py-1.5 rounded-lg text-[#8B8B8B] hover:text-white border border-white/5 hover:border-white/10 transition-all"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
            <button
              onClick={() => fetchFlow(true)}
              disabled={isLoading}
              className="text-[10px] px-3 py-1.5 rounded-lg text-[#C9A646] hover:text-[#F4D97B] border border-[#C9A646]/20 hover:border-[#C9A646]/40 transition-all"
              style={{ background: 'rgba(201,166,70,0.05)' }}>
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* ======== SENTIMENT GAUGE ======== */}
      <div className="px-6 py-3 border-b border-white/5">
        <SentimentGauge score={data.summary.sentimentScore} sentiment={data.summary.sentiment} />
      </div>

      {/* ======== SUMMARY METRICS ======== */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <MetricPill
            label="Net Premium"
            value={data.summary.netPremiumFormatted}
            color={data.summary.netPremium >= 0 ? '#22C55E' : '#EF4444'}
            icon={data.summary.netPremium >= 0 ? TrendingUp : TrendingDown}
          />
          <MetricPill
            label="Total Premium"
            value={data.summary.totalPremiumFormatted}
            color="#C9A646"
            icon={Zap}
          />
          <MetricPill
            label="P/C Ratio"
            value={data.summary.putCallRatio.toFixed(2)}
            color={data.summary.putCallRatio < 0.7 ? '#22C55E' : data.summary.putCallRatio > 1.0 ? '#EF4444' : '#F59E0B'}
            subtext={data.summary.putCallRatio < 0.7 ? 'Bullish bias' : data.summary.putCallRatio > 1.0 ? 'Bearish bias' : 'Neutral'}
          />
          <MetricPill
            label="Algo Flow"
            value={data.algoFlow.netPremiumFormatted}
            color={data.algoFlow.direction === 'bullish' ? '#22C55E' : data.algoFlow.direction === 'bearish' ? '#EF4444' : '#F59E0B'}
            icon={Shield}
            subtext={`${data.algoFlow.direction} positioning`}
          />
          <MetricPill
            label="Call Volume"
            value={fmtCompact(data.calls.volume)}
            color="#22C55E"
            icon={ArrowUpRight}
            subtext={data.calls.premiumFormatted}
          />
          <MetricPill
            label="Put Volume"
            value={fmtCompact(data.puts.volume)}
            color="#EF4444"
            icon={ArrowDownRight}
            subtext={data.puts.premiumFormatted}
          />
        </div>
      </div>

      {/* ======== MAIN CHART — Cumulative Net Flow ======== */}
      {data.chartData.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#22C55E' }} />
                <span className="text-[10px] text-[#6B6B6B]">All Calls</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#EF4444' }} />
                <span className="text-[10px] text-[#6B6B6B]">All Puts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-1 rounded-sm" style={{ background: '#C9A646' }} />
                <span className="text-[10px] text-[#6B6B6B]">Algo Flow</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-0.5 rounded-sm" style={{ background: '#FFFFFF' }} />
                <span className="text-[10px] text-[#6B6B6B]">Net Flow</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data.chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="putGradient" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="algoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A646" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#C9A646" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />

              <XAxis
                dataKey="strike"
                tick={{ fontSize: 10, fill: '#4B4B4B' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                yAxisId="flow"
                tick={{ fontSize: 10, fill: '#4B4B4B' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => fmtCompact(v)}
              />
              <YAxis
                yAxisId="algo"
                orientation="right"
                tick={{ fontSize: 10, fill: '#4B4B4B' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => fmtCompact(v)}
              />

              <Tooltip content={<FlowTooltip />} />

              {/* Current price reference line */}
              <ReferenceLine
                x={Math.round(data.currentPrice)}
                yAxisId="flow"
                stroke="#FFFFFF"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `$${data.currentPrice.toFixed(0)}`,
                  position: 'top',
                  fill: '#FFFFFF',
                  fontSize: 10,
                }}
              />

              {/* Cumulative calls area */}
              <Area
                yAxisId="flow"
                type="monotone"
                dataKey="cumCalls"
                name="All Calls"
                stroke="#22C55E"
                strokeWidth={1.5}
                fill="url(#callGradient)"
                dot={false}
              />

              {/* Cumulative puts area (negative) */}
              <Area
                yAxisId="flow"
                type="monotone"
                dataKey="cumPuts"
                name="All Puts"
                stroke="#EF4444"
                strokeWidth={1.5}
                fill="url(#putGradient)"
                dot={false}
              />

              {/* Algo/Institutional flow */}
              <Area
                yAxisId="algo"
                type="monotone"
                dataKey="algoFlow"
                name="Algo Flow"
                stroke="#C9A646"
                strokeWidth={1}
                fill="url(#algoGradient)"
                dot={false}
              />

              {/* Net flow line */}
              <Line
                yAxisId="flow"
                type="monotone"
                dataKey="cumNet"
                name="Net Flow"
                stroke="#FFFFFF"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ======== VOLUME CONVERGENCE BARS ======== */}
      {data.chartData.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 px-2 mb-2">
            <BarChart3 className="w-3 h-3 text-[#4B4B4B]" />
            <span className="text-[10px] text-[#4B4B4B] uppercase tracking-wider">Volume by Strike</span>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={data.chartData} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
              <XAxis dataKey="strike" hide />
              <YAxis hide />
              <Tooltip content={<FlowTooltip />} />
              <Bar dataKey="callVolume" name="Call Vol" fill="#22C55E" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
              <Bar dataKey="putVolume" name="Put Vol" fill="#EF4444" fillOpacity={0.7} radius={[0, 0, 2, 2]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ======== GAMMA RANGE ======== */}
      {data.gamma.topLevels.length > 0 && (
        <div className="px-6 py-3 border-t border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-3.5 h-3.5 text-[#6B6B6B]" />
            <span className="text-[10px] text-[#6B6B6B] uppercase tracking-wider">Gamma Levels</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.gamma.topLevels.map((level, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span className="text-[10px] text-[#8B8B8B]">${level.strike}</span>
                <span className={cn("text-[10px] font-bold font-mono", level.totalGamma > 0 ? "text-[#22C55E]" : "text-[#EF4444]")}>
                  {level.totalGamma > 0 ? '↑' : '↓'} {fmtCompact(Math.abs(level.totalGamma))}γ
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======== EXPANDABLE DETAILS ======== */}
      {showDetails && (
        <div className="border-t border-white/5">
          {/* Unusual Activity Table */}
          {data.unusualActivity.length > 0 && (
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="text-xs font-bold text-[#F59E0B]">Unusual Activity</span>
                <span className="text-[9px] text-[#6B6B6B]">({data.unusualActivity.length} alerts)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-[#4B4B4B] uppercase tracking-wider">
                      <th className="text-left pb-2 pr-3">Type</th>
                      <th className="text-right pb-2 pr-3">Strike</th>
                      <th className="text-right pb-2 pr-3">Exp</th>
                      <th className="text-right pb-2 pr-3">Volume</th>
                      <th className="text-right pb-2 pr-3">OI</th>
                      <th className="text-right pb-2 pr-3">Vol/OI</th>
                      <th className="text-right pb-2">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.unusualActivity.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-white/[0.03]">
                        <td className={cn("py-1.5 pr-3 font-bold uppercase", row.type === 'call' ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
                          {row.type === 'call' ? '▲ CALL' : '▼ PUT'}
                          {row.isLargeOrder && <span className="ml-1 text-[#C9A646]">⚡</span>}
                        </td>
                        <td className="text-right py-1.5 pr-3 text-white font-mono">${row.strike}</td>
                        <td className="text-right py-1.5 pr-3 text-[#8B8B8B]">{row.expiration}</td>
                        <td className="text-right py-1.5 pr-3 text-white font-mono">{fmtCompact(row.volume)}</td>
                        <td className="text-right py-1.5 pr-3 text-[#8B8B8B] font-mono">{fmtCompact(row.openInterest)}</td>
                        <td className="text-right py-1.5 pr-3 font-bold font-mono"
                          style={{ color: row.volOiRatio > 2 ? '#F59E0B' : '#8B8B8B' }}>
                          {row.volOiRatio.toFixed(1)}x
                        </td>
                        <td className="text-right py-1.5 text-[#C9A646] font-mono">${fmtCompact(row.premium)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expiration Breakdown */}
          {data.expirationBreakdown && data.expirationBreakdown.length > 0 && (
            <div className="px-6 py-4 border-t border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-3.5 h-3.5 text-[#6B6B6B]" />
                <span className="text-xs font-bold text-white">Expiration Breakdown</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {data.expirationBreakdown.slice(0, 5).map((exp: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl border border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-[10px] text-[#6B6B6B] mb-1">{exp.date}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#22C55E] font-mono">{fmtCompact(exp.callVolume)}c</span>
                      <span className="text-[10px] text-[#EF4444] font-mono">{fmtCompact(exp.putVolume)}p</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======== FOOTER ======== */}
      <div className="px-6 py-2.5 border-t border-white/5 flex items-center justify-between">
        <span className="text-[9px] text-[#3B3B3B]">
          Data: Polygon.io • {data.contractsAnalyzed} contracts • Cached 24h
        </span>
        <span className="text-[9px] text-[#3B3B3B]">
          {new Date(data.timestamp).toLocaleString()}
        </span>
      </div>
    </div>
  );
});

OptionsFlowChart.displayName = 'OptionsFlowChart';
export default OptionsFlowChart;