// src/components/journal/OptionPayoffChart.tsx
// =====================================================
// Payoff-at-expiration diagram for an options trade (single-leg or
// multi-leg spread). Pure math — no Greeks, no IV, no external data.
// X = underlying price at expiration; Y = net P&L in account currency.
// =====================================================

import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  payoffCurve,
  payoffPriceDomain,
  netPayoffAtPrice,
  type TradeLeg,
} from '@/utils/tradeCalculations';

interface OptionPayoffChartProps {
  legs: TradeLeg[];
  /** Optional current/underlying price marker. */
  underlyingPrice?: number;
}

/** Find approximate breakeven prices (where the payoff curve crosses 0). */
function findBreakevens(points: { price: number; pnl: number }[]): number[] {
  const breakevens: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.pnl === 0) breakevens.push(a.price);
    else if ((a.pnl < 0 && b.pnl > 0) || (a.pnl > 0 && b.pnl < 0)) {
      // Linear interpolation for the zero crossing.
      const t = a.pnl / (a.pnl - b.pnl);
      breakevens.push(a.price + t * (b.price - a.price));
    }
  }
  return breakevens;
}

const OptionPayoffChart = memo(({ legs, underlyingPrice }: OptionPayoffChartProps) => {
  const { data, breakevens, strikes } = useMemo(() => {
    const domain = payoffPriceDomain(legs);
    if (!domain) return { data: [], breakevens: [], strikes: [] };
    const pts = payoffCurve(legs, domain.min, domain.max, 120);
    return {
      data: pts,
      breakevens: findBreakevens(pts),
      strikes: Array.from(new Set(legs.map((l) => l.strike_price))).sort((a, b) => a - b),
    };
  }, [legs]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 w-full">
        <p className="text-sm text-zinc-600">Not enough data to chart the payoff.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%" debounce={150}>
        <LineChart data={data} margin={{ top: 16, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid stroke="rgba(201,166,70,0.08)" strokeDasharray="3 3" vertical={false} />

          {/* Zero P&L line */}
          <ReferenceLine y={0} stroke="rgba(201,166,70,0.4)" strokeWidth={1.5} strokeDasharray="6 4" />

          {/* Strike markers */}
          {strikes.map((s) => (
            <ReferenceLine
              key={`strike-${s}`}
              x={s}
              stroke="rgba(122,122,122,0.4)"
              strokeDasharray="2 4"
              label={{ value: `K ${s}`, position: 'top', fill: '#7A7A7A', fontSize: 10 }}
            />
          ))}

          {/* Breakeven markers */}
          {breakevens.map((be, i) => (
            <ReferenceLine
              key={`be-${i}`}
              x={be}
              stroke="rgba(201,166,70,0.5)"
              strokeDasharray="4 4"
              label={{ value: `BE ${be.toFixed(2)}`, position: 'insideTopRight', fill: '#C9A646', fontSize: 10 }}
            />
          ))}

          {/* Underlying price marker (if provided) */}
          {underlyingPrice != null && (
            <ReferenceLine x={underlyingPrice} stroke="rgba(80,140,255,0.5)" strokeWidth={1.5} />
          )}

          <XAxis
            dataKey="price"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fill: '#7A7A7A', fontSize: 10 }}
            stroke="rgba(201,166,70,0.15)"
            tickLine={false}
            axisLine={{ stroke: 'rgba(201,166,70,0.15)' }}
            tickFormatter={(v: number) => v.toFixed(0)}
          />
          <YAxis
            tick={{ fill: '#7A7A7A', fontSize: 10 }}
            stroke="rgba(201,166,70,0.15)"
            tickLine={false}
            axisLine={{ stroke: 'rgba(201,166,70,0.15)' }}
            tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}$${Math.round(v)}`}
            width={62}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(201,166,70,0.3)', strokeWidth: 1 }}
            contentStyle={{
              background: 'rgba(20,20,20,0.98)',
              border: '1px solid rgba(201,166,70,0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
            }}
            labelStyle={{ color: '#9A9A9A', fontSize: '11px', marginBottom: '4px' }}
            labelFormatter={(v: number) => `Underlying @ $${Number(v).toFixed(2)}`}
            formatter={(value: number) => [
              `${value >= 0 ? '+' : ''}$${value.toFixed(2)}`,
              'P&L at expiration',
            ]}
          />
          <Line
            type="monotone"
            dataKey="pnl"
            stroke="#C9A646"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

OptionPayoffChart.displayName = 'OptionPayoffChart';

export default OptionPayoffChart;

// Re-export so callers can synthesize legs without a second import line.
export { netPayoffAtPrice };
