// src/components/overview/RecentNews.tsx
import React from "react";
import { apiGet } from "@/lib/api";

type NewsItem = { id:string; title:string; source?:string; publishedAt?:number; sentiment?: "Positive"|"Neutral"|"Negative"; url?:string; summary?:string; };

export default function RecentNews({ symbol }:{ symbol:string }){
  const [items, setItems] = React.useState<NewsItem[]>([]);
  React.useEffect(()=>{
    let m=true;
    apiGet<NewsItem[]>("/api/news", { symbol, limit: 4 }).then(r=>{ if(m) setItems(r||[]);} ).catch(()=>{});
    return ()=>{ m=false; };
  }, [symbol]);
  if (!items.length) return <div className="rounded-2xl bg-zinc-900 p-3 text-sm text-zinc-400">News feed integration pending per data-source.</div>;
  return (
    <div className="rounded-2xl bg-zinc-900 p-3">
      <div className="font-semibold mb-2">Recent News</div>
      <div className="space-y-2">
        {items.map(n=>(
          <a key={n.id} href={n.url} target="_blank" rel="noreferrer" className="block p-2 rounded-md hover:bg-zinc-800">
            <div className="text-sm">{n.title}</div>
            <div className="text-xs text-zinc-500">{n.source ?? ""} • {n.publishedAt ? timeAgo(n.publishedAt) : ""} • {n.sentiment ?? "Neutral"}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function timeAgo(ts: number){
  const d = Date.now()-ts;
  const m = Math.floor(d/60000);
  if (m<60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h<48) return `${h}h ago`;
  const days = Math.floor(h/24);
  return `${days}d ago`;
}
