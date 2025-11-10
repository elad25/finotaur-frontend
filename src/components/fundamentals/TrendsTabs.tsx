import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

type Trends = { periods:string[] } & Record<string, any[]>;
type Props = { trends?: Trends | null };

const toRows = (trends:Trends, ...keys:string[]) => {
  const norm = (v:any)=> (typeof v==='object' && v!=null) ? (v.value ?? v.close ?? Number(v)) : v;
  return (trends.periods || []).map((p, i) => {
    const obj:any = { period: p };
    keys.forEach(k => { const arr:any[] = (trends as any)[k] || []; obj[k] = norm(arr[i]); });
    return obj;
  });
};

function Chart({data, lines}:{data:any[]; lines: Array<{dataKey:string}>}){
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip formatter={(value:any)=> (typeof value==='object' && value!=null ? (value.value ?? value.close ?? String(value)) : value)} />
          <Legend />
          {lines.map(l => <Line key={l.dataKey} type="monotone" dataKey={l.dataKey} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendsTabsImpl({ trends }: Props){
  if (!trends?.periods?.length) return <div className="rounded-2xl border border-zinc-800 p-4 text-sm text-zinc-500">No trend data available.</div>;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 p-4 bg-zinc-900/40">
        <h3 className="font-semibold mb-2">Revenue & Net Income</h3>
        <Chart data={toRows(trends,'revenue','netIncome')} lines={[{dataKey:'revenue'},{dataKey:'netIncome'}]} />
      </div>
      <div className="rounded-2xl border border-zinc-800 p-4 bg-zinc-900/40">
        <h3 className="font-semibold mb-2">Margins</h3>
        <Chart data={toRows(trends,'grossMargin','operatingMargin','netMargin')} lines={[{dataKey:'grossMargin'},{dataKey:'operatingMargin'},{dataKey:'netMargin'}]} />
      </div>
      <div className="rounded-2xl border border-zinc-800 p-4 bg-zinc-900/40">
        <h3 className="font-semibold mb-2">Debt & Equity</h3>
        <Chart data={toRows(trends,'totalDebt','totalEquity')} lines={[{dataKey:'totalDebt'},{dataKey:'totalEquity'}]} />
      </div>
      <div className="rounded-2xl border border-zinc-800 p-4 bg-zinc-900/40">
        <h3 className="font-semibold mb-2">Cash Flows</h3>
        <Chart data={toRows(trends,'cfo','cfi','cff')} lines={[{dataKey:'cfo'},{dataKey:'cfi'},{dataKey:'cff'}]} />
      </div>
      <div className="rounded-2xl border border-zinc-800 p-4 bg-zinc-900/40">
        <h3 className="font-semibold mb-2">EPS & Price</h3>
        <Chart data={toRows(trends,'eps','price')} lines={[{dataKey:'eps'},{dataKey:'price'}]} />
      </div>
    </div>
  );
}
const Skeleton = () => <div className="space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="h-64 rounded-2xl border border-zinc-800 bg-zinc-900/30 animate-pulse"/>)}</div>;
const TrendsTabs = Object.assign(TrendsTabsImpl, { Skeleton });
export default TrendsTabs;
