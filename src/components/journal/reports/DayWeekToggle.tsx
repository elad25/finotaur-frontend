interface DayWeekToggleProps {
  value: "day" | "week";
  onChange: (v: "day" | "week") => void;
}

export default function DayWeekToggle({ value, onChange }: DayWeekToggleProps) {
  const btn = (v: "day" | "week", label: string) => {
    const active = value === v;
    return (
      <button
        key={v}
        onClick={() => onChange(v)}
        className={
          active
            ? "rounded-md px-4 py-1.5 text-xs font-medium bg-[#C9A646]/55 text-white shadow-[0_0_18px_rgba(201,166,70,0.18)] transition-all"
            : "rounded-md px-4 py-1.5 text-xs font-medium bg-white/[0.045] text-ink-secondary hover:text-ink-primary transition-all"
        }
      >
        {label}
      </button>
    );
  };

  return (
    <div className="inline-flex gap-2">
      {btn("day", "Day")}
      {btn("week", "Week")}
    </div>
  );
}
