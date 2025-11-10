import React from 'react';
import useSWR from 'swr';

type TF = 'TTM' | 'Annual' | 'Quarterly';
const fetcher = (u:string)=> fetch(u).then(r=>r.json());

export default function Fundamentals({ symbol, tf='TTM', periods=10 }:{symbol:string; tf?:TF; periods?:5|10}){
  const { data, error, isLoading } = useSWR(`/api/fundamentals/all?symbol=${symbol}&tf=${tf}&periods=${periods}`, fetcher, { dedupingInterval: 60000 });
  if (error) return <div className="text-red-400">שגיאה בטעינת נתונים</div>;

  const dbg = data ? `kpis: ${Object.keys(data?.kpis || {}).length}  trends: ${Object.keys(data?.trends || {}).length}  valuation.multiples: ${Object.keys(data?.valuation?.multiples || {}).length}  peers: ${data?.peers?.tickers?.length||0}  health: ${data?.health?'yes':'no'}  context: ${data?.context?'yes':'no'}` : 'טוען...';

  return (
    <div className="space-y-6">
      <div className="p-2 rounded-xl bg-yellow-900/20 text-yellow-300 text-xs font-mono">{dbg}</div>
      <TopRow data={data} loading={isLoading} />
      <KPIGrid data={data} loading={isLoading} />
      <Trends data={data} loading={isLoading} />
      <Valuation data={data} loading={isLoading} />
      <Health data={data} loading={isLoading} />
      <Peers data={data} loading={isLoading} />
      <Context data={data} />
    </div>
  );
}

function Skel({h='h-24'}:{h?:string}){ return <div className={`animate-pulse bg-neutral-800/60 rounded-2xl ${h}`} />; }
function Pill({children}:{children:React.ReactNode}){ return <span className="px-3 py-1 rounded-full border border-yellow-500/40 text-yellow-400 text-xs">{children}</span>; }

function TopRow({data, loading}:{data:any; loading:boolean}){
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
      {loading ? <Skel h="h-6" /> : <div className="text-sm text-neutral-200">{data?.ai?.line ?? '—'}</div>}
      <div className="flex items-center gap-2">
        <Pill>Fair Value {data?.fairValue?.value ? `$${data.fairValue.value.toFixed(2)}` : '—'}</Pill>
        <Pill>{typeof data?.fairValue?.premiumPct === 'number' ? `${data.fairValue.premiumPct.toFixed(1)}%` : '—'}</Pill>
      </div>
    </div>
  );
}

function KPIGrid({data, loading}:{data:any; loading:boolean}){
  if (loading) return <Skel />;
  const k = data?.kpis ?? {};
  const Item = ({label, value, sub}:{label:string; value:any; sub?:string}) => (
    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="text-xl text-neutral-100">{value ?? '—'}</div>
      {sub ? <div className="text-[11px] text-neutral-500">{sub}</div> : null}
    </div>
  );
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <Item label="Market Cap" value={fmtCap(k.marketCap)} sub={delta('marketCap', k)} />
      <Item label="Revenue (TTM)" value={fmtNum(k.revenueTTM)} sub={delta('revenue', k)} />
      <Item label="Net Income (TTM)" value={fmtNum(k.netIncomeTTM)} sub={delta('netIncome', k)} />
      <Item label="Gross Margin" value={fmtPct(k.grossMarginTTM)} sub={delta('grossMargin', k)} />
      <Item label="Operating Margin" value={fmtPct(k.operatingMarginTTM)} sub={delta('operMargin', k)} />
      <Item label="Net Margin" value={fmtPct(k.netMarginTTM)} sub={delta('netMargin', k)} />
      <Item label="ROE" value={fmtPct(k.roeTTM)} />
      <Item label="ROA" value={fmtPct(k.roaTTM)} />
      <Item label="Debt/Equity" value={fmtMaybe(k.debtToEquity)} />
      <Item label="Current Ratio" value={fmtMaybe(k.currentRatio)} />
      <Item label="Quick Ratio" value={fmtMaybe(k.quickRatio)} />
    </div>
  );
}

function Trends({data, loading}:{data:any; loading:boolean}){
  if (loading) return <Skel h="h-40" />;
  const t = data?.trends ?? {};
  return (
    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
      <div className="text-sm text-neutral-300 mb-2">מגמות פיננסיות (דמו טקסטואלי)</div>
      <div className="text-xs text-neutral-500">Periods: {t?.periods?.length || 0}</div>
      <div className="text-xs text-neutral-500">Revenue pts: {t?.revenue?.length || 0} • Net: {t?.netIncome?.length || 0}</div>
      <div className="text-xs text-neutral-500">Margins pts: {t?.grossMarginPct?.length || 0}/{t?.operMarginPct?.length || 0}</div>
      <div className="text-xs text-neutral-500">CFO/CFI/CFF pts: {t?.cashFlow?.cfo?.length || 0}/{t?.cashFlow?.cfi?.length || 0}/{t?.cashFlow?.cff?.length || 0}</div>
    </div>
  );
}

function Valuation({data, loading}:{data:any; loading:boolean}){
  if (loading) return <Skel />;
  const m = data?.valuation?.multiples ?? {};
  const Row = ({label, value}:{label:string; value:any}) => (
    <div className="flex items-center justify-between p-2 border-b border-neutral-800">
      <div className="text-neutral-300 text-sm">{label}</div>
      <div className="text-neutral-100">{typeof value === 'number' ? value.toFixed(2) : '—'}</div>
    </div>
  );
  return (
    <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
      <div className="p-3 text-neutral-400 text-xs">מכפילים</div>
      <Row label="P/E (TTM)" value={m.peTTM} />
      <Row label="Forward P/E" value={m.peForward} />
      <Row label="PEG" value={m.peg} />
      <Row label="P/B" value={m.pb} />
      <Row label="P/S" value={m.ps} />
      <Row label="EV/EBITDA" value={m.evEbitda} />
    </div>
  );
}

function Health({data, loading}:{data:any; loading:boolean}){
  if (loading) return <Skel />;
  const h = data?.health ?? {};
  const Row = ({label, value}:{label:string; value:any}) => (
    <div className="grid grid-cols-2 p-2 border-b border-neutral-800">
      <div className="text-neutral-300 text-sm">{label}</div>
      <div className="text-neutral-100">{typeof value === 'number' ? value.toFixed(2) : '—'}</div>
    </div>
  );
  return (
    <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
      <div className="p-3 text-neutral-400 text-xs">מדדי בריאות</div>
      <Row label="Altman Z" value={h.altmanZ} />
      <Row label="Piotroski F" value={h.piotroskiF} />
      <Row label="Interest Coverage" value={h.interestCoverage} />
    </div>
  );
}

function Peers({data, loading}:{data:any; loading:boolean}){
  if (loading) return <Skel />;
  const peers = data?.peers ?? { tickers: [] };
  return (
    <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4">
      <div className="text-neutral-300 text-sm mb-2">השוואת עמיתים (SIC)</div>
      <div className="text-xs text-neutral-500">{peers.tickers?.join(', ') || '—'}</div>
    </div>
  );
}

function Context({data}:{data:any}){
  const c = data?.context ?? {};
  return (
    <div className="text-xs text-neutral-500">
      {c.company || '—'} • מגזר: {c.sector || '—'} • תעשייה: {c.industry || '—'} • SIC: {c.sic || '—'}
    </div>
  );
}

function delta(key:string,k:any){
  const n = k?.deltaYoY?.[key];
  return typeof n==='number' ? (n>=0?`+${n.toFixed(1)}% YoY`:`${n.toFixed(1)}% YoY`) : undefined;
}
function fmtMaybe(n:any){ return (typeof n==='number' ? n.toFixed(2) : '—'); }
function fmtNum(n:any){ return (typeof n==='number' ? `${n.toLocaleString()}` : '—'); }
function fmtCap(n:any){ return (typeof n==='number' ? `$${(n/1e9).toFixed(1)}B` : '—'); }
function fmtPct(n:any){ return (typeof n==='number' ? `${n.toFixed(1)}%` : '—'); }
