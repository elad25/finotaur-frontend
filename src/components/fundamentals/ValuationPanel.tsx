import Spark from "./Spark";

export default function ValuationPanel({ multiples = {}, rows = [] as any[] }: any) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const m = multiples ?? {};
  const items = [
    ["P/E (TTM)", m.pe],
    ["Forward P/E", m.fwdPe],
    ["PEG", m.peg],
    ["P/B", m.pb],
    ["P/S", m.ps],
    ["EV/EBITDA", m.evToEbitda],
  ];

  return (
    <div className="p-3 rounded-xl bg-zinc-900">
      <div className="text-sm mb-2">Valuation Multiples</div>
      <div className="divide-y divide-zinc-800">
        {items.map(([label, value]) => (
          <div key={label as string} className="flex items-center justify-between py-3">
            <div className="text-zinc-300">{label as string}</div>
            <div className="flex items-center gap-4">
              <div className="w-28 text-right">{value ?? "—"}</div>
              <div className="w-24">
                <Spark data={safeRows.map((r: any) => ({ date: r.endDate, value: value ?? null }))} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
