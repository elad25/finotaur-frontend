
import React, { useEffect, useState } from "react";
import { getJSON } from "@/lib/api";

type Item = { id: string; title: string; source?: string; url: string; publishedAt?: string; sentiment?: string };

export default function NewsPreview({ symbol }: { symbol: string }){
  const [items,setItems]=useState<Item[]>([]);
  const [active,setActive]=useState<Item|null>(null);

  useEffect(()=>{
    let stop=false;
    getJSON<Item[]>(`/api/news?symbol=${encodeURIComponent(symbol)}&limit=4`).then(d=>!stop&&setItems(d)).catch(()=>setItems([]));
    return ()=>{stop=true};
  },[symbol]);

  return (
    <div className="space-y-2">
      {items.map(n=>(
        <button key={n.id} className="w-full text-left rounded-2xl p-4 bg-[#0D0E10] border border-[#1b1d21] hover:border-[#2a2c31]" onClick={()=>setActive(n)}>
          <div className="text-base">{n.title}</div>
          <div className="text-xs text-gray-400 mt-1">{n.source || '—'} • {n.publishedAt ? new Date(n.publishedAt).toLocaleString() : '—'} • {n.sentiment||'Neutral'}</div>
        </button>
      ))}
      {active && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={()=>setActive(null)}>
          <div className="w-[560px] max-w-[95vw] rounded-2xl p-6 bg-[#0D0E10] border border-[#2a2c31]" onClick={e=>e.stopPropagation()}>
            <div className="text-lg mb-2">{active.title}</div>
            <div className="text-xs text-gray-400 mb-4">{active.source || '—'} • {active.publishedAt ? new Date(active.publishedAt).toLocaleString() : '—'}</div>
            <a href={active.url} target="_blank" className="text-[#D4AF37] underline">Open article</a>
            <div className="mt-4 flex justify-end"><button className="px-3 py-1 rounded bg-[#1b1d21]" onClick={()=>setActive(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
