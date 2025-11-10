// src/components/fundamentals/ComparisonWidget.tsx
import React from "react";

type Row = { symbol: string; marketCap?: number | null; pe?: number | null; dividend?: number | null; netMargin?: number | null };

export const ComparisonWidget: React.FC<{ rows: Row[] }> = ({ rows }) => {
  if (!rows?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900/40">
            <th className="text-left p-3">Company</th>
            <th className="text-left p-3">Market Cap</th>
            <th className="text-left p-3">P/E</th>
            <th className="text-left p-3">Dividend</th>
            <th className="text-left p-3">Net Margin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-zinc-800/60">
              <td className="p-3">{r.symbol}</td>
              <td className="p-3">{r.marketCap ? r.marketCap.toLocaleString() : "—"}</td>
              <td className="p-3">{r.pe ?? "—"}</td>
              <td className="p-3">{r.dividend != null ? `${r.dividend.toFixed(2)}%` : "—"}</td>
              <td className="p-3">{r.netMargin != null ? `${r.netMargin.toFixed(1)}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonWidget;
