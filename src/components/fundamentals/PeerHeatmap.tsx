
import React from 'react';
type Props = { peers?: { tickers?: string[]; metrics?: Record<string, any> } | null; symbol?: string };
function PeerHeatmapImpl({ peers, symbol }: Props){
  const tickers = peers?.tickers || [];
  const metrics = peers?.metrics || {};
  const rows = Object.keys(metrics);
  if (tickers.length===0 || rows.length===0) return <div className="rounded-2xl border border-zinc-800 p-4 text-sm text-zinc-500">No peer data available.</div>;
  return (
    <div className="rounded-2xl border border-zinc-800 p-4 bg-zinc-900/40 overflow-x-auto">
      <h3 className="font-semibold mb-2">Peer Heatmap</h3>
      <table className="text-sm min-w-[600px]">
        <thead className="text-zinc-400">
          <tr><th className="text-left py-1">Metric</th>{[symbol, ...tickers.filter(t=>t!==symbol), 'sectorAvg'].map(t=><th key={t} className="text-right px-2">{t}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(m => {
            const row = metrics[m] || {};
            const all = Object.values(row).filter((v:any)=> typeof v==='number') as number[];
            const min = Math.min(...all), max = Math.max(...all);
            const cols = [symbol, ...tickers.filter(t=>t!==symbol), 'sectorAvg'];
            return (
              <tr key={m} className="border-t border-zinc-800">
                <td className="py-1">{m}</td>
                {cols.map(c => {
                  const v = row[c];
                  const norm = typeof v==='number' && max>min ? (v-min)/(max-min) : 0.5;
                  const bg = `rgba(255,215,0,${0.15 + norm*0.25})`;
                  return <td key={c} className="text-right px-2"><span className="px-2 py-0.5 rounded" style={{background:bg}}>{v ?? '—'}</span></td>
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
const Skeleton = () => <div className="h-48 rounded-2xl border border-zinc-800 bg-zinc-900/30 animate-pulse"/>;
const PeerHeatmap = Object.assign(PeerHeatmapImpl, { Skeleton });
export default PeerHeatmap;
