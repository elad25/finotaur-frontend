
import React from 'react';
type KPI = { value: number | null; deltaYoY: number | null; spark: number[] | null };
type Health = { altmanZ:number; piotroskiF:number; interestCoverage:number } | undefined;
type Props = { health?: Health; kpis?: Record<string, KPI> | null };
function KeyRatiosTableImpl({ health, kpis }: Props){
  const rows: Array<[string, number | null | undefined]> = [
    ['Altman Z', health?.altmanZ],
    ['Piotroski F', health?.piotroskiF],
    ['Interest Coverage', health?.interestCoverage],
    ['Current Ratio', kpis?.currentRatio?.value],
    ['Quick Ratio', kpis?.quickRatio?.value],
    ['Debt/Equity', kpis?.debtToEquity?.value],
  ];
  return (<div className="rounded-2xl border border-zinc-800 p-4 bg-zinc-900/40"><h3 className="text-lg font-semibold mb-3">Key Ratios & Health</h3><table className="w-full text-sm"><tbody>{rows.map(([name,val])=>(<tr key={name} className="border-b border-zinc-800"><td className="py-2">{name}</td><td className="py-2 text-right">{(val ?? '—') as any}</td></tr>))}</tbody></table><div className="text-xs text-zinc-500 mt-2">Definitions and thresholds will be added as tooltips.</div></div>);
}
const Skeleton = () => <div className="h-40 rounded-2xl border border-zinc-800 bg-zinc-900/30 animate-pulse"/>;
const KeyRatiosTable = Object.assign(KeyRatiosTableImpl, { Skeleton });
export default KeyRatiosTable;
