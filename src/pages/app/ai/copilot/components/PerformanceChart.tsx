import { useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Card } from '@/components/ds/Card';
import { PerformancePoint } from '../hooks/usePortfolioMockData';
import { cn } from '@/lib/utils';

interface Props {
  series: PerformancePoint[];
}

type Mode = 'dollar' | 'percent';

export function PerformanceChart({ series }: Props) {
  const [mode, setMode] = useState<Mode>('dollar');

  const data = useMemo(() => {
    if (series.length === 0) return [];
    const start = series[0].value;
    return series.map(p => ({
      date: p.date,
      value: mode === 'dollar' ? p.value : ((p.value - start) / start) * 100,
    }));
  }, [series, mode]);

  return (
    <Card className="relative overflow-hidden rounded-[7px] bg-[#070604]/92 border-gold-primary/20 shadow-[0_24px_70px_rgba(0,0,0,0.48)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(244,217,123,0.065),transparent_32%,rgba(201,166,70,0.025))]" />
      <div className="relative">
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <h2 className="text-[13px] font-normal uppercase text-gold-primary">PERFORMANCE</h2>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] uppercase text-ink-tertiary">
              <span>TIME RANGE</span>
              {['1D', '1W', '1M', '3M', '6M', '1Y', 'YTD', 'ALL'].map((label) => (
                <span
                  key={label}
                  className={label === '1Y' ? 'rounded-[4px] border border-gold-primary/28 bg-gold-primary/10 px-2 py-1 text-gold-primary' : ''}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-[8px] bg-black/35 border border-gold-primary/15">
            <button
              onClick={() => setMode('dollar')}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-[5px] transition-colors',
                mode === 'dollar' ? 'bg-gold-primary/18 text-gold-primary' : 'text-ink-secondary hover:text-ink-primary'
              )}
            >
              $
            </button>
            <button
              onClick={() => setMode('percent')}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-[5px] transition-colors',
                mode === 'percent' ? 'bg-gold-primary/18 text-gold-primary' : 'text-ink-secondary hover:text-ink-primary'
              )}
            >
              %
            </button>
          </div>
        </div>

        <div style={{ width: '100%', height: 286 }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="copilotArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F4D97B" stopOpacity={0.36} />
                  <stop offset="100%" stopColor="#C9A646" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="copilotLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#A98220" />
                  <stop offset="42%" stopColor="#F4D97B" />
                  <stop offset="100%" stopColor="#C9A646" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(201,166,70,0.08)" strokeDasharray="3 3" vertical />
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 10 }}
                stroke="rgba(201,166,70,0.10)"
                tickFormatter={(d: string) => {
                  const date = new Date(d);
                  return date.toLocaleString('en', { month: 'short' });
                }}
                interval="preserveStartEnd"
                minTickGap={44}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 10 }}
                stroke="rgba(201,166,70,0.10)"
                tickFormatter={(v: number) => {
                  if (mode === 'percent') return `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(0)}%`;
                  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}k`;
                  return `$${Math.round(v)}`;
                }}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  background: '#090806',
                  border: '1px solid rgba(201,166,70,0.25)',
                  borderRadius: 8,
                  padding: 10,
                }}
                labelStyle={{ color: '#fff', fontSize: 11, marginBottom: 4 }}
                itemStyle={{ color: '#F4D97B', fontSize: 12, fontWeight: 500 }}
                formatter={(v: number) => {
                  if (mode === 'percent') return [`${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(2)}%`, 'Return'];
                  return [`$${v.toLocaleString('en', { maximumFractionDigits: 2 })}`, 'Value'];
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="url(#copilotLine)"
                fill="url(#copilotArea)"
                strokeWidth={2.2}
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 5, fill: '#F4D97B', stroke: '#0a0a0a', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 grid grid-cols-2 md:grid-cols-6 border-t border-gold-primary/10">
          {[
            ['RETURN (1Y)', '+24.67%', 'text-emerald-300'],
            ['ALPHA', '+7.38%', 'text-emerald-300'],
            ['SHARPE RATIO', '1.68', 'text-white'],
            ['MAX DRAWDOWN', '-8.91%', 'text-white'],
            ['VOLATILITY', '14.32%', 'text-gold-primary'],
            ['WINNING DAYS', '63.2%', 'text-white'],
          ].map(([label, value, color]) => (
            <div key={label} className="px-3 py-3 border-r border-gold-primary/10 last:border-r-0">
              <p className="text-[9px] uppercase text-ink-tertiary">{label}</p>
              <p className={`mt-2 font-mono text-sm tabular-nums ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
