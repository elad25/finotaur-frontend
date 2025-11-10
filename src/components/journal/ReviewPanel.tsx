import React from "react";

export default function ReviewPanel(){
  return (
    <div className="grid gap-4 text-sm">
      <div className="grid gap-1">
        <label className="text-zinc-400">Mistake?</label>
        <select className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200">
          <option value="">No</option>
          <option>Entry timing</option>
          <option>Size control</option>
          <option>Discipline</option>
          <option>Chasing</option>
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-zinc-400">Next time I will…</label>
        <input className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200" placeholder="Be patient for 15-min confirmation…" />
      </div>
      <div className="flex flex-wrap gap-2">
        {["Discipline","Entry timing","Size control","Patience"].map(t=>(
          <span key={t} className="rounded-full border border-yellow-700/30 px-3 py-1.5 text-xs text-zinc-300">{t}</span>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <label className="inline-flex items-center gap-2 text-zinc-300"><input type="checkbox" /> Archive trade</label>
        <label className="inline-flex items-center gap-2 text-zinc-300"><input type="checkbox" /> Flag for review</label>
      </div>
    </div>
  );
}
