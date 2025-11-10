
import React from "react";
type Peer = { ticker: string; metric?: number | null };
type Props = { peers?: Peer[] | null };
export default function PeersHeatmap({ peers }: Props) {
  const items = peers ?? [];
  return (
    <div className="rounded-2xl bg-black/30 p-4 border border-white/5">
      <div className="text-sm font-semibold mb-2">Peers</div>
      {items.length===0 ? <div className="text-sm text-white/60">—</div> :
        <div className="grid grid-cols-3 gap-2">{items.map((p,i)=>(<div key={i} className="rounded-lg p-3 bg-gradient-to-br from-black/30 to-black/10 border border-white/5"><div className="text-xs text-white/60">{p.ticker}</div><div className="text-sm font-semibold">{p.metric ?? "—"}</div></div>))}</div>}
    </div>
  );
}
