import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { FundamentalsData, SparkPoint } from './types';

function Card({ title, value, delta, spark }: { title: string; value: React.ReactNode; delta?: number | null; spark?: SparkPoint[] }) {
  return (
    <div className="rounded-2xl bg-[#131417] p-4 border border-zinc-800">
      <div className="text-xs text-zinc-400 mb-1">{title}</div>
      <div className="text-lg text-white font-medium">{value ?? '—'}</div>
      {typeof delta === 'number' && <div className="text-[11px] mt-1">{delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%</div>}
      {spark && spark.length > 1 && (
        <div className="h-8 mt-2">
          <ResponsiveContainer>
            <AreaChart data={spark}><Area type="monotone" dataKey="y" strokeOpacity={0} fillOpacity={0.3} /></AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function SnapshotGrid({ data }: { data: FundamentalsData | null }) {
  const s = data?.snapshot;
  const fmt = (n?: number | null) => (n==null ? '—' : Intl.NumberFormat('en', { notation:'compact' }).format(n));
  const pct = (n?: number | null) => (n==null ? '—' : `${(n*100).toFixed(1)}%`);
  const revenueSpark = s?.sparks?.revenue ?? [];
  const niSpark = s?.sparks?.netIncome ?? [];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card title="Market Cap" value={fmt(s?.marketCap ?? null)} />
      <Card title="Revenue (TTM)" value={fmt(s?.revenueTTM ?? null)} delta={s?.yoy?.revenue ?? null} spark={revenueSpark} />
      <Card title="Net Income (TTM)" value={fmt(s?.netIncomeTTM ?? null)} delta={s?.yoy?.netIncome ?? null} spark={niSpark} />
      <Card title="Gross Margin" value={pct(s?.grossMargin ?? null)} />
      <Card title="ROE" value={pct(s?.roe ?? null)} />
      <Card title="Debt/Equity" value={s?.debtEquity==null ? '—' : s.debtEquity.toFixed(2)} />
    </div>
  );
}
