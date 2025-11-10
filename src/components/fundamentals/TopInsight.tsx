
import React from 'react';
type Props = {
  ai?: { summary: string; insights?: string[] } | null;
  fairValue: { value:number; premiumPct:number; method:string };
  grades?: { valuation:number; growth:number; profitability:number; health:number } | null;
  asOf?: string;
};

function Chip({children}:{children:React.ReactNode}){
  return <span className="px-2 py-0.5 rounded-full border border-amber-400/30 text-amber-300 text-xs">{children}</span>;
}

function TopInsightImpl({ ai, fairValue, grades, asOf }: Props){
  return (
    <div className="rounded-2xl border border-zinc-800 p-4 bg-zinc-900/40">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-zinc-200">{ai?.summary || 'AI insights currently unavailable.'}</div>
        <div className="flex gap-2 items-center whitespace-nowrap">
          <Chip>Fair Value ${fairValue?.value ?? '—'} ({(fairValue?.premiumPct ?? 0) > 0 ? '+' : ''}{fairValue?.premiumPct ?? '—'}%)</Chip>
          {grades && <Chip>Grades V:{grades.valuation} G:{grades.growth} P:{grades.profitability} H:{grades.health}</Chip>}
          {asOf && <span className="text-xs text-zinc-500">As of {asOf}</span>}
        </div>
      </div>
    </div>
  );
}
const Skeleton = () => <div className="h-16 rounded-2xl border border-zinc-800 bg-zinc-900/30 animate-pulse"/>;
const TopInsight = Object.assign(TopInsightImpl, { Skeleton });
export default TopInsight;
