
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getJSON } from "@/lib/api";

type Pt = { t: number; close: number };
type Ev = { t: number; type: "dividend"|"earnings"|"filing"; label: string };

const TF_TO_INTERVAL: Record<string, string> = { "1D":"2min","1W":"5min","1M":"4h","6M":"day","1Y":"day","5Y":"day" };
const TF_DEFAULT = "1M";

function bisectLeftByT(arr: Pt[], x: number){ let lo=0,hi=arr.length; while(lo<hi){const mid=(lo+hi)>>1; if(arr[mid].t<x) lo=mid+1; else hi=mid;} return lo; }

function useResize(ref: React.RefObject<HTMLElement>) {
  const [w, setW] = useState(800);
  useEffect(()=>{
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(()=>{
      const r = el.getBoundingClientRect();
      setW(Math.max(320, r.width));
    });
    ro.observe(el);
    return ()=>ro.disconnect();
  },[ref]);
  return w;
}

function PriceChartLite({ symbol }: { symbol: string }){
  const [tf,setTf]=useState<string>(TF_DEFAULT);
  const [data,setData]=useState<Pt[]>([]);
  const [events,setEvents]=useState<Ev[]>([]);
  const [err,setErr]=useState<string|null>(null);
  const [hover,setHover]=useState<{p:Pt, ev?:Ev}|null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useResize(wrapRef);
  const w = width, h = 260, pad = 24;

  useEffect(()=>{
    let stop=false; setErr(null); setData([]); setEvents([]);
    const interval = TF_TO_INTERVAL[tf] || "day";
    getJSON<Pt[]>(`/api/price?symbol=${encodeURIComponent(symbol)}&interval=${interval}&closes=1`)
      .then(d=>!stop&&setData(d)).catch(e=>!stop&&setErr(String(e?.message||e)));
    getJSON<Ev[]>(`/api/events?symbol=${encodeURIComponent(symbol)}&types=dividends,earnings,filings`)
      .then(d=>!stop&&setEvents(d)).catch(()=>{});
    return ()=>{ stop=true };
  },[symbol,tf]);

  // index-based x scale to avoid weekend gaps look
  const minY = useMemo(()=> data.length? Math.min(...data.map(x=>x.close)) : 0, [data]);
  const maxY = useMemo(()=> data.length? Math.max(...data.map(x=>x.close)) : 1, [data]);
  const xScale = (i:number)=> pad + (i/(Math.max(1, data.length-1))) * (w - pad*2);
  const yScale = (v:number)=> h - pad - ((v-minY)/(maxY-minY)) * (h - pad*2);

  function nearestEvent(t:number){
    if(!events.length) return undefined;
    let best: Ev|undefined; let bestD = Infinity;
    for(const e of events){
      const d = Math.abs(e.t - t);
      if (d < bestD && d < 1000*60*60*12) { best=e; bestD=d; } // within ~12h
    }
    return best;
  }

  return (
    <div ref={wrapRef} className="rounded-2xl p-4 bg-[#0D0E10] border border-[#1b1d21] w-full">
      <div className="flex gap-2 mb-3 text-xs">
        {["1D","1W","1M","6M","1Y","5Y"].map(k=>(
          <button key={k} className={`px-2 py-1 rounded ${tf===k?'bg-[#1b1d21] text-white':'text-gray-400'}`} onClick={()=>setTf(k)}>{k}</button>
        ))}
      </div>
      {!data.length && !err && <div className="h-[260px] animate-pulse text-gray-500 text-sm flex items-center justify-center">Loading chart…</div>}
      {err && <div className="text-red-400 text-xs">Error: {err}</div>}
      {data.length>1 && (
        <svg width={w} height={h}>
          <defs>
            <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <g opacity="0.15" stroke="#FFFFFF">
            {[0,1,2,3,4].map(i=>{ const y=pad+i*((h-pad*2)/4); return <line key={i} x1={pad} x2={w-pad} y1={y} y2={y}/>; })}
          </g>
          {/* area */}
          <path d={`M ${xScale(0)} ${h-pad} ` + data.map((p,i)=>`L ${xScale(i)} ${yScale(p.close)}`).join(' ') + ` L ${xScale(data.length-1)} ${h-pad} Z`}
            fill="url(#goldArea)" stroke="none" />
          <path d={`M ${xScale(0)} ${yScale(data[0].close)} ` + data.slice(1).map((p,i)=>`L ${xScale(i+1)} ${yScale(p.close)}`).join(' ')}
            fill="none" stroke="#D4AF37" strokeWidth="2" />
          {/* capture */}
          <rect x="0" y="0" width={w} height={h} fill="transparent" pointerEvents="all"
            onMouseMove={(e)=>{
              const rect = (e.target as SVGRectElement).getBoundingClientRect();
              const x = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, (x - pad) / (w - pad*2)));
              const idx = Math.round(ratio * (data.length-1));
              const p = data[idx];
              if (!p) return setHover(null);
              const ev = nearestEvent(p.t);
              setHover({ p, ev });
            }}
            onMouseLeave={()=>setHover(null)}
          />
          {/* hover */}
          {hover && (
            <g>
              <line x1={xScale(data.indexOf(hover.p))} x2={xScale(data.indexOf(hover.p))} y1={pad} y2={h-pad} stroke="#888" strokeDasharray="3,3" />
              <circle cx={xScale(data.indexOf(hover.p))} cy={yScale(hover.p.close)} r="3" fill="#D4AF37" />
              <rect x={Math.min(Math.max(xScale(data.indexOf(hover.p))+8, pad), w-220)} y={pad} width="210" height={hover.ev?54:34} rx="6" fill="#141519" stroke="#2a2c31" />
              <text x={Math.min(Math.max(xScale(data.indexOf(hover.p))+16, pad+8), w-212)} y={pad+14} fontSize="11" fill="#F5F6F8">${hover.p.close.toFixed(2)}</text>
              <text x={Math.min(Math.max(xScale(data.indexOf(hover.p))+16, pad+8), w-212)} y={pad+28} fontSize="10" fill="#bbb">{new Date(hover.p.t).toLocaleString()}</text>
              {hover.ev && <text x={Math.min(Math.max(xScale(data.indexOf(hover.p))+16, pad+8), w-212)} y={pad+44} fontSize="10" fill="#D4AF37">{hover.ev.label}</text>}
            </g>
          )}
        </svg>
      )}
    </div>
  );
}

export default PriceChartLite;
export { PriceChartLite };
