
import React from 'react';
import useSWR from 'swr';
export type TF = 'TTM' | 'Annual' | 'Quarterly';
export default function Fundamentals({ symbol, tf='TTM', periods=10 }:{symbol:string; tf?:TF; periods?:5|10}){
  const { data, error, isLoading } = useSWR(`/api/fundamentals/all?symbol=${symbol}&tf=${tf}&periods=${periods}`, (u)=>fetch(u).then(r=>r.json()), { dedupingInterval: 60000 });
  if (error) return <div className="text-red-400">שגיאה בטעינת נתונים</div>;
  return (
    <div className="space-y-6">
      <TopInsightRow data={data} loading={isLoading} />
      <SnapshotKPIs data={data} loading={isLoading} />
      <ValuationMultiples data={data} loading={isLoading} />
      <RatiosHealthTable data={data} loading={isLoading} />
      <PeersComparison data={data} loading={isLoading} />
      <ContextFooter data={data} />
    </div>
  );
}
function Skeleton({height='h-24'}:{height?:string}){ return <div className={`animate-pulse bg-neutral-800/60 rounded-2xl ${height}`} />; }
function Pill({children}:{children:React.ReactNode}){ return <span className="px-3 py-1 rounded-full border border-yellow-500/40 text-yellow-400 text-xs">{children}</span>; }
export function TopInsightRow({data, loading}:{data:any; loading:boolean}){
  return (<div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
    {loading ? <Skeleton height="h-6" /> : <div className="text-sm text-neutral-200">{data?.ai?.line ?? '—'}</div>}
    <div className="flex items-center gap-2">
      <Pill>Fair Value {data?.fairValue?.value ? `$${data.fairValue.value.toFixed(2)}` : '—'}</Pill>
      <Pill>{data?.fairValue?.premiumPct ? `${data.fairValue.premiumPct.toFixed(1)}%` : '—'}</Pill>
    </div>
  </div>);
}
export function SnapshotKPIs({data, loading}:{data:any; loading:boolean}){
  if (loading) return <Skeleton />;
  const k = data?.kpis ?? {};
  const Item = ({label, value}:{label:string; value:any}) => (<div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
    <div className="text-xs text-neutral-400">{label}</div>
    <div className="text-xl text-neutral-100">{value ?? '—'}</div>
  </div>);
  return (<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    <Item label="Market Cap" value={fmtCap(k.marketCap)} />
    <Item label="Revenue (TTM)" value={fmtNum(k.revenueTTM)} />
    <Item label="Net Income (TTM)" value={fmtNum(k.netIncomeTTM)} />
    <Item label="Gross Margin" value={fmtPct(k.grossMarginTTM)} />
    <Item label="Operating Margin" value={fmtPct(k.operatingMarginTTM)} />
    <Item label="Net Margin" value={fmtPct(k.netMarginTTM)} />
    <Item label="ROE" value={fmtPct(k.roeTTM)} />
    <Item label="ROA" value={fmtPct(k.roaTTM)} />
    <Item label="Debt/Equity" value={k.debtToEquity?.toFixed?.(2) ?? '—'} />
    <Item label="Current Ratio" value={k.currentRatio?.toFixed?.(2) ?? '—'} />
    <Item label="Quick Ratio" value={k.quickRatio?.toFixed?.(2) ?? '—'} />
  </div>);
}
export function ValuationMultiples({data, loading}:{data:any; loading:boolean}){
  if (loading) return <Skeleton />;
  const m = data?.valuation?.multiples ?? {};
  const Row = ({label, value}:{label:string; value:any}) => (<div className="flex items-center justify-between p-2 border-b border-neutral-800">
    <div className="text-neutral-300 text-sm">{label}</div>
    <div className="text-neutral-100">{typeof value === 'number' ? value.toFixed(2) : '—'}</div>
  </div>);
  return (<div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
    <div className="p-3 text-neutral-400 text-xs">מכפילים</div>
    <Row label="P/E (TTM)" value={m.peTTM} />
    <Row label="Forward P/E" value={m.peForward} />
    <Row label="PEG" value={m.peg} />
    <Row label="P/B" value={m.pb} />
    <Row label="P/S" value={m.ps} />
    <Row label="EV/EBITDA" value={m.evEbitda} />
  </div>);
}
export function RatiosHealthTable({data, loading}:{data:any; loading:boolean}){
  if (loading) return <Skeleton />;
  const h = data?.health ?? {};
  const Row = ({label, value}:{label:string; value:any}) => (<div className="grid grid-cols-2 p-2 border-b border-neutral-800">
    <div className="text-neutral-300 text-sm">{label}</div>
    <div className="text-neutral-100">{typeof value === 'number' ? value.toFixed(2) : '—'}</div>
  </div>);
  return (<div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
    <div className="p-3 text-neutral-400 text-xs">מדדי בריאות</div>
    <Row label="Altman Z" value={h.altmanZ} />
    <Row label="Piotroski F" value={h.piotroskiF} />
    <Row label="Interest Coverage" value={h.interestCoverage} />
  </div>);
}
export function PeersComparison({data, loading}:{data:any; loading:boolean}){
  if (loading) return <Skeleton />;
  const peers = data?.peers ?? { tickers: [] };
  return (<div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4">
    <div className="text-neutral-300 text-sm mb-2">השוואת עמיתים (לפי SIC — ללא FMP)</div>
    <div className="text-xs text-neutral-500">{peers.tickers?.join(', ') || '—'}</div>
  </div>);
}
export function ContextFooter({data}:{data:any}){
  const c = data?.context ?? {};
  return (<div className="text-xs text-neutral-500">
    מגזר: {c.sector || '—'} • תעשייה: {c.industry || '—'} • SIC: {c.sic || '—'}
    <div className="mt-1 text-[11px] text-neutral-600">מקורות: SEC (דוחות+Submissions), Polygon (מחיר)</div>
  </div>);
}
function fmtNum(n:any){ return (typeof n==='number' ? `${n.toLocaleString()}` : '—'); }
function fmtCap(n:any){ return (typeof n==='number' ? `$${(n/1e9).toFixed(1)}B` : '—'); }
function fmtPct(n:any){ return (typeof n==='number' ? `${n.toFixed(1)}%` : '—'); }
