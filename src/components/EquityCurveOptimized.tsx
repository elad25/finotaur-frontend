// ================================================
// 🚀 OPTIMIZED: Equity Curve Component
// ================================================
// ✅ Area chart + Gradient fill (recharts)
// ✅ Tooltip מלא עם hover על כל נקודה
// ✅ Memoized + isAnimationActive={false} לביצועים
// ✅ Downsampling for 1000+ trades
// ✅ activeDot בלבד - לא מצייר dot על כל point
// ================================================

import { memo, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { Trade } from '@/utils/statsCalculations';

interface EquityCurveOptimizedProps {
  trades: Trade[];
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────

const CustomTooltip = memo(({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const isPos = d.cumR >= 0;

  return (
    <div
      style={{
        background: 'rgba(14,14,14,0.97)',
        border: `1px solid ${isPos ? 'rgba(0,196,108,0.3)' : 'rgba(228,69,69,0.3)'}`,
        borderRadius: 10,
        padding: '12px 16px',
        minWidth: 175,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ color: '#9A9A9A', fontSize: 11, marginBottom: 8 }}>{d.date}</div>

      <div
        style={{
          color: isPos ? '#00C46C' : '#E44545',
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1,
          marginBottom: 10,
        }}
      >
        {isPos ? '+' : ''}{d.cumR?.toFixed(2)}R
      </div>

      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9A9A9A', fontSize: 11 }}>Trade #{d.tradeIndex}</span>
          {d.symbol && (
            <span style={{ color: '#C9A646', fontSize: 11, fontWeight: 600 }}>{d.symbol}</span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9A9A9A', fontSize: 11 }}>This trade</span>
          <span
            style={{
              color: d.r >= 0 ? '#00C46C' : '#E44545',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {d.r >= 0 ? '+' : ''}{d.r?.toFixed(2)}R
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9A9A9A', fontSize: 11 }}>Outcome</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color:
                d.outcome === 'WIN'
                  ? '#00C46C'
                  : d.outcome === 'LOSS'
                  ? '#E44545'
                  : '#C9A646',
            }}
          >
            {d.outcome}
          </span>
        </div>
      </div>
    </div>
  );
});
CustomTooltip.displayName = 'CustomTooltip';

// ─── Main Component ────────────────────────────────────────────────────────

export const EquityCurveOptimized = memo(function EquityCurveOptimized({
  trades,
}: EquityCurveOptimizedProps) {
  const chartData = useMemo(() => {
    if (!trades?.length) return [];

    const sorted = [...trades].sort(
      (a, b) =>
        new Date(a.open_at).getTime() - new Date(b.open_at).getTime()
    );

    let cumR = 0;
    const points = sorted.map((trade, idx) => {
      const r =
        trade.actual_r ??
        trade.actual_user_r ??
        trade.metrics?.actual_r ??
        trade.metrics?.rr ??
        0;
      cumR += r;

      return {
        date: new Date(trade.open_at).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
        }),
        r: Number(r.toFixed(3)),
        cumR: Number(cumR.toFixed(3)),
        tradeIndex: idx + 1,
        outcome: trade.outcome ?? '—',
        symbol: (trade as any).symbol ?? null,
      };
    });

    // 🚀 Downsample אם יותר מ-300 נקודות
    if (points.length > 300) {
      const step = Math.ceil(points.length / 300);
      return points.filter(
        (_, idx) => idx % step === 0 || idx === points.length - 1
      );
    }

    return points;
  }, [trades]);

  const totalR = chartData.at(-1)?.cumR ?? 0;
  const isPositive = totalR >= 0;
  const accentColor = isPositive ? '#C9A646' : '#E44545';
  const gradientId = isPositive ? 'eqGradPos' : 'eqGradNeg';
  const fillColor = isPositive ? '#C9A646' : '#E44545';

  if (!chartData.length) {
    return (
      <div
        className="rounded-xl p-5"
        style={{
          background: 'rgba(14,14,14,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h3
          className="text-xs uppercase tracking-widest mb-4 flex items-center gap-2"
          style={{ color: '#C9A646', fontWeight: 700 }}
        >
          <TrendingUp className="w-4 h-4" />
          Equity Curve
        </h3>
        <div className="h-48 flex items-center justify-center" style={{ color: '#606060' }}>
          <p className="text-sm">No data to display</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'rgba(14,14,14,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3
          className="text-xs uppercase tracking-widest flex items-center gap-2"
          style={{ color: '#C9A646', fontWeight: 700 }}
        >
          <TrendingUp className="w-4 h-4" />
          Equity Curve
        </h3>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: isPositive ? '#00C46C' : '#E44545',
          }}
        >
          Total: {isPositive ? '+' : ''}{totalR.toFixed(2)}R
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity={0.22} />
              <stop offset="100%" stopColor={fillColor} stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />

          <ReferenceLine
            y={0}
            stroke="rgba(255,255,255,0.1)"
            strokeDasharray="4 4"
          />

          <XAxis
            dataKey="tradeIndex"
            tick={{ fill: '#606060', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            tickFormatter={(v) => `#${v}`}
          />
          <YAxis
            tick={{ fill: '#606060', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}R`}
            width={46}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: 'rgba(201,166,70,0.25)',
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
          />

          <Area
            type="monotone"
            dataKey="cumR"
            stroke={accentColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 5,
              fill: accentColor,
              stroke: '#0A0A0A',
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Footer trades */}
      <div className="mt-2 flex justify-between">
        <span style={{ color: '#606060', fontSize: 10 }}>Trade #1</span>
        <span style={{ color: '#606060', fontSize: 10 }}>Trade #{chartData.length}</span>
      </div>
    </div>
  );
});