type Props = { streak: number };

export default function StreakBadge({ streak }: Props) {
  const glow = streak >= 3 ? 'shadow-[0_0_28px_rgba(201,166,70,0.15)]' : '';
  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-[#141414] p-5 flex flex-col gap-1 ${glow}`}
    >
      <span className="text-[11px] uppercase tracking-[0.8px] text-ink-tertiary">
        Current Streak
      </span>
      <span className="text-5xl font-bold text-[#C9A646] tabular-nums">{streak}</span>
      <span className="text-xs text-ink-secondary">{streak === 1 ? 'day' : 'days'}</span>
    </div>
  );
}
