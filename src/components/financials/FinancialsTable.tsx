import React, { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";

type SeriesPoint = { date: string; value: number | null };
type StatementBlock = { name: string; unit?: string; series: SeriesPoint[]; };

export default function FinancialsTable({ blocks, dates }: { blocks: StatementBlock[]; dates: string[] }) {
  // Normalize table rows (latest N dates) and create sparkline data per row
  const rows = useMemo(() => {
    return blocks.map(b => {
      const last = b.series.slice(-dates.length);
      // Map to dictionary for quick lookup
      const byDate = Object.fromEntries(last.map(p => [p.date, p.value]));
      const values = dates.map(d => byDate[d] ?? null);
      const spark = last.map(p => ({ x: p.date, y: p.value }));
      return { name: b.name, values, spark };
    });
  }, [blocks, dates]);

  return (
    <div className="overflow-auto rounded-xl border border-zinc-800">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-black/60 backdrop-blur z-10">
          <tr className="text-zinc-300">
            <th className="text-left font-medium px-3 py-2 w-60">Metric</th>
            {dates.map(d => (
              <th key={d} className="text-right font-medium px-3 py-2 whitespace-nowrap">{d}</th>
            ))}
            <th className="text-right font-medium px-3 py-2">Trend</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t border-zinc-800 hover:bg-zinc-900/40">
              <td className="px-3 py-2 text-zinc-200">{r.name}</td>
              {r.values.map((v, i) => (
                <td key={i} className="px-3 py-2 text-right tabular-nums text-zinc-100">
                  {formatNum(v)}
                </td>
              ))}
              <td className="px-3 py-2">
                <div className="w-28 h-8">
                  <ResponsiveContainer>
                    <AreaChart data={r.spark}>
                      <XAxis dataKey="x" hide />
                      <Tooltip formatter={(val: any) => [formatNum(val as number), ""]} />
                      <Area dataKey="y" type="monotone" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatNum(v: number | null) {
  if (v === null || v === undefined) return "";
  // Compact format without "astronomical" long numbers
  const fmt = Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
  return fmt.format(v);
}
