import React, { useEffect, useMemo, useState } from "react";
import { getJSON } from "@/lib/api";

type Snap = {
  marketCap: number|null;
  peTTM: number|null; peFwd: number|null; beta: number|null;
  dividendYield: number|null; avgVolume: number|null;
  wk52Low: number|null; wk52High: number|null; last: number|null;
  analyst: { consensus: string; targetAvg: number|null; targetHigh: number|null; targetLow: number|null };
};
type Pt = { t:number; close:number; v?:number };

export default function SnapshotCards({ symbol }: { symbol: string }){
  const [snap,setSnap]=useState<Snap|null>(null);
  const [year,setYear]=useState<Pt[]>([]);
  const [ref,setRef]=useState<{marketCap:number|null; dividendYield:number|null} | null>(null);

  useEffect(()=>{
    let stop=false;
    getJSON<Snap>(`/api/snapshot?symbol=${encodeURIComponent(symbol)}`).then(d=>!stop&&setSnap(d)).catch(()=>setSnap(null));
    getJSON<Pt[]>(`/api/price?symbol=${encodeURIComponent(symbol)}&interval=day&closes=0`).then(d=>!stop&&setYear(d.slice(-252))).catch(()=>setYear([]));
    getJSON(`/api/overview/reference?symbol=${encodeURIComponent(symbol)}`).then(d=>!stop&&setRef(d)).catch(()=>setRef(null));
    return ()=>{stop=true};
  },[symbol]);

  const wk = useMemo(()=>{
    if(!year.length) return {low:null,high:null,pos:null};
    const lows = Math.min(...year.map(p=>p.close));
    const highs = Math.max(...year.map(p=>p.close));
    const last = year.at(-1)?.close ?? null;
    const pos = (last!=null && highs>lows) ? ( (last-lows)/(highs-lows) ) : null;
    return {low:lows, high:highs, pos};
  },[year]);

  const avgVol = useMemo(()=>{
    const vols = year.map(p=>p.v).filter((v): v is number => typeof v === 'number' && isFinite(v));
    if (vols.length === 0) return null;
    const N = Math.min(30, vols.length);
    return Math.round(vols.slice(-N).reduce((a,b)=>a+b,0)/N);
  },[year]);

  const fmt = (n:number|null, d=0)=> (n==null||!isFinite(n)) ? "—" : (d? n.toFixed(d): Intl.NumberFormat('en-US',{notation:'compact'}).format(n));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <div className="rounded-2xl p-4 bg-[#0D0E10] border border-[#1b1d21]">
        <div className="text-xs text-gray-400 mb-1">Market Cap</div>
        <div className="text-lg">{fmt(ref?.marketCap ?? snap?.marketCap ?? null)}</div>
      </div>
      <div className="rounded-2xl p-4 bg-[#0D0E10] border border-[#1b1d21]">
        <div className="text-xs text-gray-400 mb-1">P/E (TTM / Fwd)</div>
        <div className="text-lg">{fmt(snap?.peTTM,2)} / {fmt(snap?.peFwd,2)}</div>
      </div>
      <div className="rounded-2xl p-4 bg-[#0D0E10] border border-[#1b1d21]">
        <div className="text-xs text-gray-400 mb-1">Beta</div>
        <div className="text-lg">{fmt(snap?.beta,2)}</div>
      </div>
      <div className="rounded-2xl p-4 bg-[#0D0E10] border border-[#1b1d21]">
        <div className="text-xs text-gray-400 mb-1">Dividend Yield</div>
        <div className="text-lg">{fmt(ref?.dividendYield ?? snap?.dividendYield,2)}</div>
      </div>

      <div className="rounded-2xl p-4 bg-[#0D0E10] border border-[#1b1d21] col-span-1 md:col-span-2">
        <div className="text-xs text-gray-400 mb-1">52W Range</div>
        <div className="h-2 bg-[#1b1d21] rounded relative">
          {wk.pos!=null && (
            <div className="absolute -top-1 w-0.5 h-4 bg-[#D4AF37]" style={{ left: `${wk.pos*100}%` }}/>
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{fmt(wk.low,2)}</span><span>{fmt(wk.high,2)}</span>
        </div>
      </div>

      <div className="rounded-2xl p-4 bg-[#0D0E10] border border-[#1b1d21]">
        <div className="text-xs text-gray-400 mb-1">Avg Volume</div>
        <div className="text-lg">{fmt(avgVol)}</div>
      </div>

      <div className="rounded-2xl p-4 bg-[#0D0E10] border border-[#1b1d21] flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-400 mb-1">Analyst Consensus</div>
          <div className="text-lg">{snap?.analyst?.consensus || "—"}</div>
          <div className="text-xs text-gray-400 mt-1">Target — Avg: {fmt(snap?.analyst?.targetAvg,2)} | H — {fmt(snap?.analyst?.targetHigh,2)} | L — {fmt(snap?.analyst?.targetLow,2)}</div>
        </div>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="32" fill="none" stroke="#2a2c31" strokeWidth="10"/>
          <circle cx="40" cy="40" r="32" fill="none" stroke="#D4AF37" strokeWidth="10" strokeDasharray={`${2*Math.PI*32*0.25} ${2*Math.PI*32}`} transform="rotate(-90 40 40)"/>
        </svg>
      </div>
    </div>
  );
}
