import React, { useState } from "react";

export function Tabs({ tabs }:{ tabs: {key:string; label:string; content:React.ReactNode;}[] }){
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  return (
    <div>
      <div className="mb-3 flex gap-2">
        {tabs.map(t=>(
          <button key={t.key}
            onClick={()=>setActive(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs border transition
              ${active===t.key ? "border-yellow-400/70 bg-yellow-900/20 text-yellow-100" : "border-yellow-700/30 text-zinc-300 hover:bg-zinc-800"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-yellow-700/20 bg-zinc-950/40 p-4">
        {tabs.find(t=>t.key===active)?.content}
      </div>
    </div>
  );
}
