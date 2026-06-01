import { useMemo, useState } from "react";
import DayWeekToggle from "@/components/journal/reports/DayWeekToggle";
import DateNavigator from "@/components/journal/reports/DateNavigator";
import DayKpiStrip from "@/components/journal/reports/DayKpiStrip";
import DayTradesTable from "@/components/journal/reports/DayTradesTable";
import StartMyDayCTA from "@/components/journal/reports/StartMyDayCTA";
import { useTradesByDateRange } from "@/hooks/useTradesData";

function todayLocal(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekRange(anchor: string): { start: string; end: string } {
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

export default function DayView() {
  const [mode, setMode] = useState<"day" | "week">("day");
  const [anchor, setAnchor] = useState<string>(todayLocal());

  const { start, end } = useMemo(() => {
    if (mode === "day") return { start: anchor, end: anchor };
    return weekRange(anchor);
  }, [mode, anchor]);

  const { data: trades, isLoading } = useTradesByDateRange(
    start + "T00:00:00.000Z",
    end + "T23:59:59.999Z"
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-ink-primary">Day View</h2>
        <p className="text-sm text-ink-tertiary mt-1">Drill into a single day or week of trading.</p>
      </div>

      <StartMyDayCTA />

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <DayWeekToggle value={mode} onChange={setMode} />
        <DateNavigator value={anchor} onChange={setAnchor} mode={mode} />
      </div>

      <DayKpiStrip trades={trades ?? []} isLoading={isLoading} />
      <DayTradesTable trades={trades ?? []} isLoading={isLoading} />
    </div>
  );
}
