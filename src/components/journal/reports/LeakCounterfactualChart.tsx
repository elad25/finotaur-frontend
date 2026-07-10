// src/components/journal/reports/LeakCounterfactualChart.tsx
// =====================================================
// AI Summary — "What following the rule was worth"
// =====================================================
// Renders a cumulative Actual-vs-Counterfactual P&L chart for the #1 leak
// verdict, using the per-trade deltaUsd contributions the Leak Detector
// engine already computed (verdict.counterfactuals). Pure presentational —
// no network calls. Renders nothing when the family has no honest
// per-trade attribution (counterfactuals undefined/empty).
// =====================================================

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import type { Trade } from '@/hooks/useTradesData';
import type { Leak } from '@/lib/journal/leakDetector';
import { Card } from '@/components/ds/Card';

// ─── Constants (mirror RevengeRadar.tsx) ──────────────────────────────────────

const COLOR_GOLD = '#C9A646';
const COLOR_PURPLE = '#A78BFA';
const MAX_POINTS = 300;

interface CounterfactualPoint {
  idx: number;
  label: string;
  actual: number;
  counterfactual: number;
}

function fmtPnl(pnl: number): string {
  const abs = Math.abs(pnl);
  const sign = pnl >= 0 ? '+' : '-';
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtUsd(v: number): string {
  return `$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
}

function safeTime(iso: string | undefined | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

function downsample(points: CounterfactualPoint[], maxPoints: number): CounterfactualPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const out: CounterfactualPoint[] = [];
  for (let i = 0; i < points.length; i += step) {
    out.push(points[i]);
  }
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

interface LeakCounterfactualChartProps {
  trades: Trade[];
  verdict: Leak;
}

export default function LeakCounterfactualChart({ trades, verdict }: LeakCounterfactualChartProps) {
  const points = useMemo<CounterfactualPoint[]>(() => {
    if (!verdict.counterfactuals || verdict.counterfactuals.length === 0) return [];

    const deltaByTradeId = new Map<string, number>();
    for (const c of verdict.counterfactuals) {
      deltaByTradeId.set(c.tradeId, (deltaByTradeId.get(c.tradeId) ?? 0) + c.deltaUsd);
    }

    const closedTrades = trades
      .filter((t) => t.close_at != null)
      .sort((a, b) => (safeTime(a.close_at) ?? 0) - (safeTime(b.close_at) ?? 0));

    let runningActual = 0;
    let runningCounterfactual = 0;
    const raw: CounterfactualPoint[] = closedTrades.map((t, idx) => {
      const pnl = t.pnl ?? 0;
      runningActual += pnl;
      const delta = deltaByTradeId.get(t.id) ?? 0;
      runningCounterfactual += pnl + delta;
      const label = new Date(t.close_at as string).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return { idx, label, actual: runningActual, counterfactual: runningCounterfactual };
    });

    return downsample(raw, MAX_POINTS);
  }, [trades, verdict]);

  if (points.length === 0) return null;

  const lastPoint = points[points.length - 1];
  const gap = lastPoint.counterfactual - lastPoint.actual;

  return (
    <Card padding="default" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-ink-primary">What following the rule was worth</p>
          <p className="text-[11px] text-ink-tertiary mt-0.5">
            Actual equity vs. the same trades executed by your rule.
          </p>
        </div>
        {gap > 0 && (
          <div className="text-right shrink-0">
            <p className="font-mono tabular-nums text-xl font-bold" style={{ color: COLOR_PURPLE }}>
              +{fmtUsd(gap)}
            </p>
            <p className="text-[11px] text-ink-tertiary">left on the table</p>
          </div>
        )}
      </div>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <AreaChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="leak-cf-grad-actual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_GOLD} stopOpacity={0.18} />
                <stop offset="100%" stopColor={COLOR_GOLD} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="leak-cf-grad-counterfactual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_PURPLE} stopOpacity={0.14} />
                <stop offset="100%" stopColor={COLOR_PURPLE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v >= 0 ? '+' : '-'}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`}
              width={72}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(20,20,20,0.95)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                fontSize: 11,
                padding: '4px 8px',
              }}
              itemStyle={{ color: 'rgba(255,255,255,0.82)' }}
              labelStyle={{ color: 'rgba(255,255,255,0.42)' }}
              formatter={(val: number, name: string) => [fmtPnl(Math.round(val)), name]}
              cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', paddingTop: 8 }} />
            <Area
              type="monotone"
              dataKey="counterfactual"
              name="If you followed"
              stroke={COLOR_PURPLE}
              strokeWidth={2}
              fill="url(#leak-cf-grad-counterfactual)"
              fillOpacity={1}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke={COLOR_GOLD}
              strokeWidth={3}
              fill="url(#leak-cf-grad-actual)"
              fillOpacity={1}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
