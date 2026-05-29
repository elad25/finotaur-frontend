type Props = { label: string; score: number };

export default function PeriodScoreCard({ label, score }: Props) {
  return (
    <div className="rounded-2xl border border-yellow-200/15 bg-[#141414] p-5 flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-yellow-200/70">{label}</span>
      <span className="text-3xl font-semibold text-yellow-100">{score}%</span>
      <div className="bg-yellow-200/10 h-1.5 rounded-full overflow-hidden mt-1">
        <div
          className="h-full bg-gold-bright transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
