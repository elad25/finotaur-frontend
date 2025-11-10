
import React from 'react';
type Props = { trends?: { periods:string[]; cfo:number[]; netIncome:number[] } | null; aiNote?: string | null };
function CashflowQualityImpl({ trends, aiNote }: Props){
  if (!trends?.periods?.length) return <div className="rounded-2xl border border-zinc-800 p-4 text-sm text-zinc-500">No cashflow data.</div>;
  const bad = trends.cfo && trends.netIncome && trends.cfo.length && trends.netIncome.length
    ? trends.cfo.slice(-2).some((v,i)=> v < (trends.netIncome?.slice(-2)[i] ?? 0))
    : false;
  return (
    <div className="rounded-2xl border border-zinc-800 p-4 bg-zinc-900/40">
      <h3 className="font-semibold mb-2">Earnings Quality</h3>
      <div className="text-sm text-zinc-300">CFO vs Net Income — latest periods look {bad?'weaker':'healthy'}.</div>
      {aiNote && <div className="text-xs text-zinc-500 mt-1">{aiNote}</div>}
    </div>
  );
}
const Skeleton = () => <div className="h-28 rounded-2xl border border-zinc-800 bg-zinc-900/30 animate-pulse"/>;
const CashflowQuality = Object.assign(CashflowQualityImpl, { Skeleton });
export default CashflowQuality;
