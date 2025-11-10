import React, { useState } from "react";

export default function StrategyPanel(){
  const [confidence, setConfidence] = useState(3);
  const presets = ["ICT","ORB","Breakout","Reversal","News"];
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2">
        {presets.map(p=>(
          <button key={p} className="rounded-full border border-yellow-700/30 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">{p}</button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-zinc-400">Confidence</span>
        <input type="range" min={1} max={5} value={confidence} onChange={(e)=>setConfidence(parseInt(e.target.value))} />
        <span className="text-yellow-100">{confidence}/5</span>
      </div>
      <div className="grid gap-2">
        <label className="inline-flex items-center gap-2 text-zinc-300"><input type="checkbox" /> Followed plan</label>
        <label className="inline-flex items-center gap-2 text-zinc-300"><input type="checkbox" /> Broke rule</label>
      </div>
    </div>
  );
}
