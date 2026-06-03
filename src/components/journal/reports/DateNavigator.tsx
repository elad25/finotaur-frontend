import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateNavigatorProps {
  value: string;
  onChange: (v: string) => void;
  mode: "day" | "week";
}

function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayYMD(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDayLabel(ymd: string): string {
  const d = new Date(ymd + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function weekBounds(anchor: string): { start: string; end: string } {
  const d = new Date(anchor + "T00:00:00");
  const day = d.getDay(); // 0=Sun..6=Sat
  const offsetToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + offsetToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

function formatWeekLabel(anchor: string): string {
  const { start, end } = weekBounds(anchor);
  const fmt = (ymd: string) =>
    new Date(ymd + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function DateNavigator({ value, onChange, mode }: DateNavigatorProps) {
  const step = mode === "day" ? 1 : 7;
  const today = todayYMD();

  const next = addDays(value, step);
  const nextDisabled = next > today;

  const label = mode === "day" ? formatDayLabel(value) : formatWeekLabel(value);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(addDays(value, -step))}
        className="p-1.5 rounded-md bg-white/[0.045] text-ink-secondary hover:text-ink-primary border border-white/[0.06] transition-colors"
        aria-label="Previous"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <span className="text-sm text-ink-primary font-medium min-w-[200px] text-center">
        {label}
      </span>

      <button
        onClick={() => !nextDisabled && onChange(next)}
        disabled={nextDisabled}
        className="p-1.5 rounded-md bg-white/[0.045] text-ink-secondary hover:text-ink-primary border border-white/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Next"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <input
        type="date"
        value={value}
        max={today}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="ml-2 bg-white/[0.045] border border-white/[0.06] text-ink-primary text-sm rounded-md px-2 py-1 [color-scheme:dark]"
      />
    </div>
  );
}
