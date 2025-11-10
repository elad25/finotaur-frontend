
type ValRow = { label: string; value?: number | string | null; trend?: string | null };
export default function ValuationTable({ rows }: { rows: ValRow[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800/70 p-4">
      <div className="text-sm font-medium mb-2">Valuation Multiples</div>
      <div className="divide-y divide-zinc-800/70">
        {rows.map((r, i) => (
          <div key={i} className="py-2 flex items-center justify-between">
            <div className="text-zinc-300">{r.label}</div>
            <div className="text-zinc-100">{r.value ?? "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
