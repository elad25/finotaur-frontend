import React from "react";

type Analyst = { buy:number; hold:number; sell:number; targetAvg:number|null; targetHigh:number|null; targetLow:number|null };

function sum(a:number,b:number){ return (a||0)+(b||0); }
function fmt(n?: number | null, d: number = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: d });
}

export default function AnalystBlock({ data }:{ data:Analyst }){
  const total = sum(data.buy, sum(data.hold, data.sell));
  if (!total && !data.targetAvg && !data.targetHigh && !data.targetLow) {
    // Auto-hide when no data (keeps layout clean)
    return null;
  }
  const pct = (v:number)=> total? Math.round((v/total)*100) : 0;
  const segments = [
    {label:"Buy", v:data.buy, pct:pct(data.buy)},
    {label:"Hold", v:data.hold, pct:pct(data.hold)},
    {label:"Sell", v:data.sell, pct:pct(data.sell)},
  ];

  // Simple donut
  const r=34, cx=40, cy=40, C=2*Math.PI*r;
  let start=0;
  const arcs = segments.map((s,i)=>{
    const len = (s.pct/100)*C;
    const a = <circle key={i} cx={cx} cy={cy} r={r} fill="transparent" strokeWidth="8"
      strokeDasharray={`${len} ${C-len}`} strokeDashoffset={-start}
      className={i===0? "text-emerald-400": i===1? "text-zinc-300" : "text-rose-400"} stroke="currentColor"/>;
    start += len;
    return a;
  });

  return (
    <div className="rounded-2xl bg-[#0F1114] p-4 border border-white/5">
      <div className="flex items-center justify-between">
        <div className="text-white/90 font-medium">Analyst Sentiment</div>
        <div className="text-xs text-white/50">Consensus</div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-4">
        <div className="col-span-1 flex items-center justify-center">
          <svg viewBox="0 0 80 80" className="w-24 h-24">{arcs}</svg>
        </div>
        <div className="col-span-2 space-y-2">
          {segments.map((s,i)=>(
            <div key={i}>
              <div className="flex justify-between text-xs text-white/70">
                <span>{s.label}</span><span>{s.pct}%</span>
              </div>
              <div className="h-1.5 rounded bg-white/10">
                <div className={`h-1.5 rounded ${i===0?"bg-emerald-400": i===1?"bg-white/60":"bg-rose-400"}`} style={{width:`${s.pct}%`}}/>
              </div>
            </div>
          ))}
          <div className="pt-2 text-xs text-white/70">
            Target Price — Avg: {fmt(data.targetAvg)} · High: {fmt(data.targetHigh)} · Low: {fmt(data.targetLow)}
          </div>
        </div>
      </div>
    </div>
  );
}
