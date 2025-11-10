// src/components/overview/NewsList.tsx (delta4)
import React, { useState } from "react";

type NewsItem = { id:string|number, title:string, url:string, publisher:string, published_utc:string, sentiment:'positive'|'negative'|'neutral' };

function timeAgo(iso:string){
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const h = Math.floor(diff/3.6e6);
  if (h < 24) return `${h}h ago`;
  const d2 = Math.floor(h/24);
  return `${d2}d ago`;
}

export default function NewsList({ items }:{ items: NewsItem[] }){
  const [open, setOpen] = useState<NewsItem|null>(null);
  return (
    <div className="rounded-2xl bg-[#151515] border border-[#2A2A2A] p-4">
      <h3 className="text-lg font-semibold mb-3">Latest News</h3>
      {(!items || items.length===0) && <div className="text-sm text-white/60">No news found.</div>}
      <div className="flex flex-col gap-3">
        {items?.map(n => (
          <button key={n.id} onClick={()=>setOpen(n)} className="text-left rounded-lg px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${n.sentiment==='positive'?'border-green-400/50 text-green-300': n.sentiment==='negative'?'border-red-400/50 text-red-300':'border-gray-400/40 text-gray-300'}`}>
                {n.sentiment}
              </span>
              <span className="text-sm">{n.title}</span>
            </div>
            <div className="text-xs text-white/50 mt-1">{n.publisher} • {timeAgo(n.published_utc)}</div>
          </button>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setOpen(null)}>
          <div className="w-[560px] max-w-[92vw] rounded-2xl bg-[#111] border border-white/10 p-5" onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-semibold">{open.title}</h4>
              <button onClick={()=>setOpen(null)} className="text-white/60 hover:text-white">✕</button>
            </div>
            <p className="text-sm text-white/70 mt-2">Open article to read the full story.</p>
            <a href={open.url} target="_blank" className="inline-block mt-3 text-xs underline text-[#D4AF37]">Open in source</a>
          </div>
        </div>
      )}
    </div>
  );
}
