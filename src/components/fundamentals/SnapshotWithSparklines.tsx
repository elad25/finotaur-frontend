
import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

type Row = { endDate:string; revenue?:number|null; netIncome?:number|null; eps?:number|null };
type Snapshot = {
  symbol:string; companyName?:string|null;
  marketCap?:number|null; pe?:number|null; pb?:number|null; ps?:number|null;
  evToEbitda?:number|null; peg?:number|null; epsTTM?:number|null; revenueTTM?:number|null;
  netIncomeTTM?:number|null; dividendYield?:number|null; debtToEquity?:number|null;
  roe?:number|null; roa?:number|null; assetTurnover?:number|null; inventoryTurnover?:number|null;
  currentRatio?:number|null; quickRatio?:number|null; wk52?:{low:number; high:number}|null;
};

const fmtNum=(n?:number|null)=>n==null?"—":Number(n).toLocaleString();
const fmtPct=(n?:number|null)=>n==null?"—":`${(Number(n)*100).toFixed(1)}%`;
const fmtMC=(n?:number|null)=>{ if(n==null) return "—"; const u=['','K','M','B','T']; let i=0,x=Number(n); while(Math.abs(x)>=1000&&i<u.length-1){x/=1000;i++;} return `${x.toFixed(2)}${u[i]}`; };

const Spark:React.FC<{data:{x:string,y:number|null}[]}> = ({data}) => {
  const d = data.map(p=>({x:p.x,y:p.y==null?null:Number(p.y)}));
  return (
    <div className="h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={d}>
          <Line type="monotone" dataKey="y" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const KV:React.FC<{label:string; value:string|number; series?:{x:string,y:number|null}[]}> = ({label, value, series}) => (
  <div className="rounded-xl border border-zinc-800 p-3">
    <div className="text-xs opacity-70">{label}</div>
    <div className="text-base font-semibold mt-1">{value}</div>
    {series && series.length ? <Spark data={series.slice(-5)} /> : null}
  </div>
);

const SnapshotWithSparklines:React.FC<{ snapshot:Snapshot|null; rows:Row[]; onOpenSec?:()=>void; onCompare?:()=>void; }> = ({ snapshot, rows, onOpenSec, onCompare }) => {
  if (!snapshot) return null;
  const revSeries = useMemo(()=>[...rows].reverse().map(r=>({x:r.endDate.slice(0,10),y:r.revenue??null})),[rows]);
  const niSeries  = useMemo(()=>[...rows].reverse().map(r=>({x:r.endDate.slice(0,10),y:r.netIncome??null})),[rows]);
  const epsSeries = useMemo(()=>[...rows].reverse().map(r=>({x:r.endDate.slice(0,10),y:r.eps??null})),[rows]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-lg font-semibold">{snapshot.companyName} ({snapshot.symbol})</div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800" onClick={onCompare}>Compare with</button>
          <button className="px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800" onClick={onOpenSec}>View SEC Filings</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KV label="Market Cap" value={fmtMC(snapshot.marketCap)} />
        <KV label="P/E (TTM)" value={fmtNum(snapshot.pe)} />
        <KV label="EPS (TTM)" value={fmtNum(snapshot.epsTTM)} series={epsSeries} />
        <KV label="Revenue (TTM)" value={fmtMC(snapshot.revenueTTM)} series={revSeries} />
        <KV label="Net Income (TTM)" value={fmtMC(snapshot.netIncomeTTM)} series={niSeries} />
        <KV label="Dividend Yield" value={snapshot.dividendYield==null?'—':`${Number(snapshot.dividendYield).toFixed(2)}%`} />
        <KV label="Debt/Equity" value={snapshot.debtToEquity!=null?Number(snapshot.debtToEquity).toFixed(2):'—'} />
        <KV label="ROE" value={fmtPct(snapshot.roe)} />
        <KV label="ROA" value={fmtPct(snapshot.roa)} />
        <KV label="Current Ratio" value={fmtNum(snapshot.currentRatio)} />
        <KV label="Quick Ratio" value={fmtNum(snapshot.quickRatio)} />
        <KV label="52-Week Range" value={snapshot.wk52?`${snapshot.wk52.low.toFixed(2)}–${snapshot.wk52.high.toFixed(2)}`:'—'} />
      </div>
    </div>
  );
};
export default SnapshotWithSparklines;
