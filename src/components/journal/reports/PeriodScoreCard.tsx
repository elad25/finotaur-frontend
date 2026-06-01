type Props = { label: string; score: number };

export default function PeriodScoreCard({ label, score }: Props) {
  const scoreColor =
    score >= 80 ? 'text-[#4AD295]' :
    score >= 50 ? 'text-[#C9A646]' :
    'text-[#E24B4A]';

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-5 flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-[0.8px] text-ink-tertiary">{label}</span>
      <span className={`text-3xl font-semibold tabular-nums ${scoreColor}`}>{score}%</span>
      <div className="bg-white/[0.06] h-1.5 rounded-full overflow-hidden mt-1">
        <div
          className="h-full bg-[#C9A646] transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
