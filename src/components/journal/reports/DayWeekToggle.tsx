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
            ? "px-4 py-1.5 rounded-full text-sm font-medium bg-yellow-600/25 text-yellow-100 border border-yellow-500/40 transition-colors"
            : "px-4 py-1.5 rounded-full text-sm font-medium text-zinc-300 border border-transparent hover:bg-zinc-800 transition-colors"
        }
      >
        {label}
      </button>
    );
  };

  return (
    <div className="inline-flex rounded-full bg-black/30 p-1 gap-1">
      {btn("day", "Day")}
      {btn("week", "Week")}
    </div>
  );
}
