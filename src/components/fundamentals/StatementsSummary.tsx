// src/components/fundamentals/StatementsSummary.tsx
import React from "react";

type Row = {
  endDate: string;
  revenue?: number | null;
  netIncome?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  freeCashFlow?: number | null;
};

function formatMoney(n?: number | null) {
  if (n == null) return "—";
  const units = ["", "K", "M", "B", "T"];
  let u = 0, x = n;
  while (Math.abs(x) >= 1000 && u < units.length-1) { x /= 1000; u++; }
  return `${x.toFixed(2)}${units[u]}`;
}

export const StatementsSummary: React.FC<{ rows: Row[] }> = ({ rows }) => {
  const latest = rows[0];
  const prev = rows[1];
  const yoY = (a?: number | null, b?: number | null) => {
    if (a == null || b == null || b === 0) return "—";
    const p = ((a - b) / b) * 100;
    return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
  };
  return (
    <div className="rounded-xl border border-zinc-800 p-4">
      <div className="text-sm font-semibold mb-2">Financial Statements Summary (TTM / YoY)</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
        <Item label="Revenue" value={formatMoney(latest?.revenue ?? null)} change={yoY(latest?.revenue ?? null, prev?.revenue ?? null)} />
        <Item label="Net Income" value={formatMoney(latest?.netIncome ?? null)} change={yoY(latest?.netIncome ?? null, prev?.netIncome ?? null)} />
        <Item label="Gross Margin" value={latest?.grossMargin != null ? `${(latest.grossMargin*100).toFixed(1)}%` : "—"} />
        <Item label="Operating Margin" value={latest?.operatingMargin != null ? `${(latest.operatingMargin*100).toFixed(1)}%` : "—"} />
        <Item label="Net Margin" value={latest?.netMargin != null ? `${(latest.netMargin*100).toFixed(1)}%` : "—"} />
        <Item label="Free Cash Flow" value={formatMoney(latest?.freeCashFlow ?? null)} />
      </div>
    </div>
  );
};

const Item: React.FC<{ label: string; value: string; change?: string }> = ({ label, value, change }) => (
  <div className="rounded-lg border border-zinc-800 p-3">
    <div className="text-xs opacity-70">{label}</div>
    <div className="font-semibold">{value}</div>
    {change && change !== "—" ? <div className="text-xs opacity-70">YoY: {change}</div> : null}
  </div>
);

export default StatementsSummary;
