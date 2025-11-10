// src/components/fundamentals/CompanySnapshot.tsx
import React from "react";
type Snapshot = {
  symbol: string; companyName?: string; marketCap?: number|null; pe?: number|null; pb?: number|null; ps?: number|null;
  evToEbitda?: number|null; peg?: number|null; epsTTM?: number|null; revenueTTM?: number|null; netIncomeTTM?: number|null;
  dividendYield?: number|null; debtToEquity?: number|null; roe?: number|null; roa?: number|null; assetTurnover?: number|null;
  inventoryTurnover?: number|null; currentRatio?: number|null; quickRatio?: number|null; wk52?: {low:number;high:number}|null;
};
const fmtNum=(n?:number|null)=>n==null?"—":Number(n).toLocaleString();
const fmtPct=(n?:number|null)=>n==null?"—":`${(Number(n)).toFixed(2)}%`;
const fmtMC=(n?:number|null)=>{ if(n==null) return "—"; const u=["","K","M","B","T"]; let i=0,x=Number(n); while(Math.abs(x)>=1000&&i<u.length-1){x/=1000;i++;} return `${x.toFixed(2)}${u[i]}`; };
export const CompanySnapshot:React.FC<{data:Snapshot|null; onOpenSec?:()=>void;}>=({data,onOpenSec})=>{
  if(!data) return null;
  const rows=[
    {label:"Market Cap",value:fmtMC(data.marketCap)},{label:"P/E (TTM)",value:fmtNum(data.pe)},{label:"P/B",value:fmtNum(data.pb)},
    {label:"P/S",value:fmtNum(data.ps)},{label:"EV/EBITDA",value:fmtNum(data.evToEbitda)},{label:"PEG",value:fmtNum(data.peg)},
    {label:"EPS (TTM)",value:fmtNum(data.epsTTM)},{label:"Revenue (TTM)",value:fmtMC(data.revenueTTM)},{label:"Net Income (TTM)",value:fmtMC(data.netIncomeTTM)},
    {label:"Dividend Yield",value:fmtPct(data.dividendYield)},{label:"Debt/Equity",value:data.debtToEquity!=null?data.debtToEquity.toFixed(2):"—"},
    {label:"ROE",value:fmtPct(data.roe)},{label:"ROA",value:fmtPct(data.roa)},{label:"Asset Turnover",value:fmtNum(data.assetTurnover)},
    {label:"Inventory Turnover",value:fmtNum(data.inventoryTurnover)},{label:"Current Ratio",value:fmtNum(data.currentRatio)},{label:"Quick Ratio",value:fmtNum(data.quickRatio)},
    {label:"52-Week Range",value:data.wk52?`${data.wk52.low.toFixed(2)} – ${data.wk52.high.toFixed(2)}`:"—"},
  ];
  return (<div className="space-y-2"><div className="flex items-center justify-between">
    <div className="text-lg font-semibold">{data.companyName} ({data.symbol})</div>
    <button className="px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800" onClick={onOpenSec}>View SEC Filings</button>
  </div>
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
    {rows.map((r,i)=>(<div key={i} className="rounded-xl border border-zinc-800 p-3"><div className="text-xs opacity-70">{r.label}</div><div className="text-base font-semibold mt-1">{r.value}</div></div>))}
  </div></div>);
};
export default CompanySnapshot;
