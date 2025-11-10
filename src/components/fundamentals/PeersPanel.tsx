
type PeerRow = { name: string; ticker: string; pe?: number | null; roe?: number | null; margin?: number | null; sectorAvg?: { pe?: number | null; roe?: number | null; margin?: number | null } };
export default function PeersPanel({ rows }: { rows: PeerRow[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800/70 p-4">
      <div className="text-sm font-medium mb-2">Peers</div>
      <div className="grid grid-cols-5 gap-2 text-sm font-medium text-zinc-400 mb-1">
        <div>Company</div><div>P/E</div><div>ROE</div><div>Margin</div><div>Sector Avg</div>
      </div>
      <div className="divide-y divide-zinc-800/70">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-5 gap-2 py-2">
            <div className="truncate">{r.name} <span className="text-zinc-500">({r.ticker})</span></div>
            <div>{r.pe ?? "—"}</div>
            <div>{r.roe ? `${r.roe}%` : "—"}</div>
            <div>{r.margin ? `${r.margin}%` : "—"}</div>
            <div className="text-zinc-400">{r.sectorAvg ? `P/E ${r.sectorAvg.pe ?? "—"}, ROE ${r.sectorAvg.roe ?? "—"}%` : "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
