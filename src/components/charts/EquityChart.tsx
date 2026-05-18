// ================================================
// OPTIMIZED EQUITY CHART - PRODUCTION READY v2.0
// File: src/components/charts/EquityChart.tsx
// ✅ Disabled animations in production
// ✅ Optimized re-renders
// ✅ Better performance
// ✅ FIXED: Protection against negative rect height
// ================================================

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Check, ChevronDown, HelpCircle } from 'lucide-react';
import { CHART_COLORS } from '@/constants/dashboard';

interface EquityData {
  date: string;
  equity: number;
  pnl: number;
}

interface EquityTrade {
  id?: string;
  symbol?: string | null;
  pnl: number | null;
  open_at?: string | null;
  close_at?: string | null;
}

type EquityViewMode = 'daily' | 'trades';

interface EquityChartProps {
  data: EquityData[];
  trades?: EquityTrade[];
}

const EquityChart = React.memo(({ data, trades = [] }: EquityChartProps) => {
  const [viewMode, setViewMode] = useState<EquityViewMode>('daily');
  const [selectorOpen, setSelectorOpen] = useState(false);
  // ✅ Optimize data for large datasets and ensure valid values
  const dailyData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Filter out invalid data points and ensure numbers are valid
    const mapped = data
      .filter(d => d && typeof d.equity === 'number' && !isNaN(d.equity) && isFinite(d.equity))
      .map(d => ({
        ...d,
        equity: Number(d.equity) || 0,
        pnl: Number(d.pnl) || 0,
        viewLabel: d.date,
        tooltipLabel: d.date,
      }));

    if (mapped.length === 0) return mapped;

    // Prepend a $0 baseline point so the curve visibly starts at zero, even
    // when only one trade exists. Without this, recharts renders a single
    // floating dot — unhelpful for a first-trade user expecting a line that
    // rose from $0 to current equity.
    return [
      { date: 'Start', equity: 0, pnl: 0, viewLabel: 'Start', tooltipLabel: 'Start · $0.00' },
      ...mapped,
    ];
  }, [data]);

  const tradeData = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    let runningPnl = 0;
    const mapped = trades
      .filter(trade => trade && trade.pnl != null && isFinite(Number(trade.pnl)))
      .sort((a, b) => {
        const aTime = new Date(a.close_at || a.open_at || 0).getTime();
        const bTime = new Date(b.close_at || b.open_at || 0).getTime();
        return aTime - bTime;
      })
      .map((trade, index) => {
        const pnl = Number(trade.pnl) || 0;
        runningPnl += pnl;
        const tradeNumber = index + 1;
        const date = trade.close_at || trade.open_at;

        return {
          date: `#${tradeNumber}`,
          equity: runningPnl,
          pnl,
          viewLabel: `#${tradeNumber}`,
          tooltipLabel: [
            `Trade #${tradeNumber}`,
            trade.symbol ? String(trade.symbol).toUpperCase() : null,
            date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null,
          ].filter(Boolean).join(' · '),
        };
      });

    if (mapped.length === 0) return mapped;

    // Prepend a #0 baseline point so the curve visibly rises from $0 to the
    // first trade's cumulative equity. See identical reasoning in dailyData.
    return [
      { date: '#0', equity: 0, pnl: 0, viewLabel: 'Start', tooltipLabel: 'Start · $0.00' },
      ...mapped,
    ];
  }, [trades]);

  const rawDisplayData = viewMode === 'trades' ? tradeData : dailyData;

  const optimizedData = useMemo(() => {
    if (rawDisplayData.length > 200) {
      const step = Math.ceil(rawDisplayData.length / 200);
      return rawDisplayData.filter((_, index) => index % step === 0 || index === rawDisplayData.length - 1);
    }

    return rawDisplayData;
  }, [rawDisplayData]);

  // ✅ Calculate Y-axis domain to prevent negative height issues
  const yAxisDomain = useMemo(() => {
    if (optimizedData.length === 0) return [0, 100];
    
    const values = optimizedData.map(d => d.equity);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Add padding to prevent edge cases
    const padding = Math.max(Math.abs(max - min) * 0.1, 10);
    
    return [
      Math.floor(min - padding),
      Math.ceil(max + padding)
    ];
  }, [optimizedData]);
  
  // ✅ Empty state
  if ((!data || data.length === 0) && (!trades || trades.length === 0)) {
    return (
      <div className="rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[#F4F4F4] font-semibold text-lg tracking-tight">Equity Curve</h3>
            <HelpCircle
              className="h-3.5 w-3.5 cursor-help text-white/38 transition-colors hover:text-[#E8C766]"
              aria-label="Shows cumulative closed-trade P&L over the selected period."
              title="Shows cumulative closed-trade P&L over the selected period."
            />
          </div>
          <p className="text-[#A0A0A0] text-sm mt-1 font-light">Cumulative P&L from closed trades</p>
        </div>
        <div className="flex flex-col items-center justify-center h-64 mt-5">
          <div className="text-[#A0A0A0] text-sm font-light">No closed trades yet</div>
          <div className="text-[#A0A0A0]/60 text-xs mt-1 font-light">
            Complete some trades to see your equity curve
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="animate-fadeIn rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold tracking-normal text-white">Equity Curve</h3>
            <HelpCircle
              className="h-3.5 w-3.5 cursor-help text-white/38 transition-colors hover:text-[#E8C766]"
              aria-label="Shows cumulative closed-trade P&L over time for the selected date range."
              title="Shows cumulative closed-trade P&L over time for the selected date range."
            />
          </div>
          <p className="mt-1 text-[11px] font-normal text-white/58">Cumulative P&L over time</p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSelectorOpen(open => !open)}
            className="flex items-center gap-2 rounded-md border border-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-white/78 transition-colors hover:border-[#C9A646]/28 hover:text-[#E8C766]"
            aria-haspopup="menu"
            aria-expanded={selectorOpen}
          >
            {viewMode === 'daily' ? 'Daily' : 'Trades'}
            <ChevronDown className={`h-3 w-3 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
          </button>

          {selectorOpen && (
            <div className="absolute right-0 top-8 z-20 w-32 overflow-hidden rounded-[10px] border border-[#C9A646]/18 bg-[#101010] p-1 shadow-[0_16px_34px_rgba(0,0,0,0.42)]">
              {([
                ['daily', 'Daily'],
                ['trades', 'Trades'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setViewMode(mode);
                    setSelectorOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-[11px] font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-[#C9A646]/14 text-[#E8C766]'
                      : 'text-white/66 hover:bg-white/[0.04] hover:text-white'
                  }`}
                  role="menuitem"
                >
                  {label}
                  {viewMode === mode && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div style={{ width: "100%", height: 210 }}>
        <ResponsiveContainer>
          <AreaChart data={optimizedData}>
            <defs>
              <linearGradient id="eqGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={CHART_COLORS.profit} stopOpacity={0.3}/>
                <stop offset="100%" stopColor={CHART_COLORS.gold} stopOpacity={0.3}/>
              </linearGradient>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={CHART_COLORS.profit}/>
                <stop offset="100%" stopColor={CHART_COLORS.gold}/>
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid 
              stroke={CHART_COLORS.grid}
              strokeDasharray="3 3" 
              vertical={false} 
            />
            <XAxis 
              dataKey="viewLabel" 
              tick={{ fill: CHART_COLORS.textMuted, fontSize: 11, fontWeight: 300 }} 
              stroke="rgba(255,255,255,0.06)"
              axisLine={{ strokeWidth: 0.5 }}
            />
            <YAxis 
              domain={yAxisDomain}
              tick={{ fill: CHART_COLORS.textMuted, fontSize: 11, fontWeight: 300 }} 
              stroke="rgba(255,255,255,0.06)"
              axisLine={{ strokeWidth: 0.5 }}
              allowDataOverflow={false}
              tickFormatter={(value) => {
                if (value === 0) return '$0';
                const absValue = Math.abs(value);
                if (absValue >= 1000) {
                  return `${value < 0 ? '-' : ''}$${(absValue / 1000).toFixed(1)}k`;
                }
                return `${value < 0 ? '-' : ''}$${Math.round(absValue)}`;
              }}
            />
            {/* ✅ Add zero reference line for better visualization */}
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{ 
                background: CHART_COLORS.backgroundDark, 
                border: `1px solid rgba(201,166,70,0.2)`, 
                borderRadius: 12,
                padding: 12,
                boxShadow: '0 0 20px rgba(201,166,70,0.15)'
              }}
              labelStyle={{ color: CHART_COLORS.text, fontSize: 12, marginBottom: 6, fontWeight: 500 }}
              itemStyle={{ color: CHART_COLORS.gold, fontSize: 13, fontWeight: 500 }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltipLabel ?? ''}
              formatter={(val: any) => {
                const value = Number(val);
                if (isNaN(value) || !isFinite(value)) return ['$0.00', 'Equity'];
                const sign = value < 0 ? '-' : '';
                const abs = Math.abs(value);
                return [`${sign}$${abs.toFixed(2)}`, "Equity"];
              }}
            />
            <Area 
              type="monotone" 
              dataKey="equity" 
              stroke="url(#lineGradient)"
              fill="url(#eqGradient)"
              strokeWidth={2.5}
              filter="url(#glow)"
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 5, fill: CHART_COLORS.gold, stroke: CHART_COLORS.backgroundDark, strokeWidth: 2 }}
              // ✅ Ensure baseValue is set to handle negative values properly
              baseValue={yAxisDomain[0]}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

EquityChart.displayName = 'EquityChart';

export default EquityChart;
