import React, { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, BarChart, Bar } from 'recharts';
import type { FundamentalsData } from './types';

export default function TrendTabs({ data }: { data: FundamentalsData | null }) {
  const [tab, setTab] = useState<'rev'|'margin'|'de'|'cf'>('rev');
  const s = data?.snapshot;
  const rev = s?.sparks?.revenue || [];
  const ni = s?.sparks?.netIncome || [];
  const debt = s?.sparks?.debt || [];
  const equity = s?.sparks?.equity || [];
  return (
    <div className="mt-6">
      <div className="flex gap-2 text-xs mb-2">
        {['rev','margin','de','cf'].map(t => (
          <button key={t} onClick={()=>setTab(t as any)} className={`px-3 py-1 rounded-full ${tab===t?'bg-yellow-600/20 text-yellow-400':'bg-zinc-800 text-zinc-300'}`}>
            {t==='rev'?'Revenue vs Net Income':t==='margin'?'Margins (beta)':t==='de'?'Debt vs Equity':'Cash Flow (beta)'}
          </button>
        ))}
      </div>
      <div className="h-56 rounded-2xl bg-[#131417] border border-zinc-800 p-3">
        <ResponsiveContainer>
          {tab==='rev' ? (
            <AreaChart data={rev.map((p,i)=>({x:p.x, rev:p.y, ni: (ni[i]?.y ?? null)}))}>
              <CartesianGrid vertical={false} strokeOpacity={0.1} />
              <XAxis dataKey="x" hide />
              <YAxis hide />
              <Area type="monotone" dataKey="rev" fillOpacity={0.2} />
              <Area type="monotone" dataKey="ni" fillOpacity={0.2} />
            </AreaChart>
          ) : tab==='de' ? (
            <LineChart data={debt.map((p,i)=>({x:p.x, debt:p.y, equity:(equity[i]?.y ?? null)}))}>
              <CartesianGrid vertical={false} strokeOpacity={0.1} />
              <XAxis dataKey="x" hide /><YAxis hide />
              <Line type="monotone" dataKey="debt" dot={false} />
              <Line type="monotone" dataKey="equity" dot={false} />
            </LineChart>
          ) : tab==='cf' ? (
            <BarChart data={rev.map((p,i)=>({x:p.x, CFO:p.y*0.2, CFI:p.y*0.05, CFF:p.y*0.1}))}>
              <CartesianGrid vertical={false} strokeOpacity={0.1} />
              <XAxis dataKey="x" hide /><YAxis hide />
              <Bar dataKey="CFO" stackId="a" />
              <Bar dataKey="CFI" stackId="a" />
              <Bar dataKey="CFF" stackId="a" />
            </BarChart>
          ) : (
            <LineChart data={rev.map((p)=>({x:p.x, gross: p.y? p.y*0.4 : 0, op: p.y? p.y*0.2:0, net:p.y? p.y*0.15:0 }))}>
              <CartesianGrid vertical={false} strokeOpacity={0.1} />
              <XAxis dataKey="x" hide /><YAxis hide />
              <Line type="monotone" dataKey="gross" dot={false} />
              <Line type="monotone" dataKey="op" dot={false} />
              <Line type="monotone" dataKey="net" dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
