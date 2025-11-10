import React from "react";

type Row = {
  symbol: string;
  companyName?: string | null;
  total: number;
  upgrades: number;
  downgrades: number;
  lastDate?: string | null;
};

export function RepeatedSymbolsTable({ data, isLoading, error }: { data?: Row[]; isLoading?: boolean; error?: string | null; }) {
  if (isLoading) {
    return <div className="p-4 text-sm opacity-70">Loading…</div>;
  }
  if (error) {
    return <div className="p-4 text-sm text-red-400">Failed: {error}</div>;
  }
  if (!data || data.length === 0) {
    return <div className="p-4 text-sm opacity-70">No data</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left opacity-70">
          <tr>
            <th className="py-2 pr-4">Symbol</th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Upgrades</th>
            <th className="py-2 pr-4">Downgrades</th>
            <th className="py-2 pr-4">Total</th>
            <th className="py-2 pr-4">Last action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.symbol} className="border-t border-white/10">
              <td className="py-2 pr-4 font-semibold">{r.symbol}</td>
              <td className="py-2 pr-4">{r.companyName ?? ""}</td>
              <td className="py-2 pr-4">{r.upgrades}</td>
              <td className="py-2 pr-4">{r.downgrades}</td>
              <td className="py-2 pr-4">{r.total}</td>
              <td className="py-2 pr-4">{r.lastDate ? new Date(r.lastDate).toISOString().slice(0,10) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
