
type Props = {
  label: string;
  value: string | number | null | undefined;
  sub?: string; // YoY delta etc.
};

export default function KpiCard({ label, value, sub }: Props) {
  const display = (v: any) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "number") {
      // heuristic: if big, add commas. Keep 1 decimal for percentages passed as string if needed externally.
      const abs = Math.abs(v);
      if (abs >= 1000) return v.toLocaleString();
      return String(v);
    }
    return String(v);
  };

  return (
    <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 p-4 hover:bg-zinc-950/70 transition-colors">
      <div className="text-xs uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="mt-1 text-lg font-medium">{display(value)}</div>
      {sub ? <div className="text-xs text-zinc-500 mt-1">{sub}</div> : null}
    </div>
  );
}
