type Props = { streak: number };

export default function StreakBadge({ streak }: Props) {
  const glow = streak >= 3 ? 'shadow-[0_0_28px_rgba(201,166,70,0.15)]' : '';
  return (
    <div
      className={`rounded-2xl border border-yellow-200/15 bg-[#141414] p-5 flex flex-col gap-1 ${glow}`}
    >
      <span className="text-[11px] uppercase tracking-wider text-yellow-200/70">
        Current Streak
      </span>
      <span className="text-5xl font-bold text-yellow-100">{streak}</span>
      <span className="text-xs text-zinc-400">{streak === 1 ? 'day' : 'days'}</span>
    </div>
  );
}
