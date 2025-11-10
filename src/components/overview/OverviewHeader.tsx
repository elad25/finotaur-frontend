import React from "react";
type Props = { symbol: string; companyName?: string; price?: number | null; changePct?: number | null; aiLine?: string; };
function fmt(n?: number | null, d: number = 2) { if (n == null || Number.isNaN(n)) return "—"; return n.toLocaleString(undefined, { maximumFractionDigits: d }); }
export default function OverviewHeader({ symbol, companyName, price, changePct, aiLine }: Props) {
  const color = changePct == null ? "" : changePct > 0 ? "text-emerald-400" : changePct < 0 ? "text-red-400" : "text-zinc-300";
  return (<div className="w-full max-w-[1200px] mx-auto">
    <div className="flex items-end gap-3">
      <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">{companyName || symbol}</h1>
      <span className="text-sm text-zinc-400">({symbol})</span>
      <div className="ml-auto flex items-baseline gap-3">
        <span className="text-xl font-medium text-zinc-100">{fmt(price)}</span>
        <span className={`text-sm font-medium ${color}`}>{changePct != null ? `${changePct.toFixed(2)}%` : "—"}</span>
      </div>
    </div>
    {aiLine ? <p className="mt-2 italic text-sm text-zinc-300/80">{aiLine}</p> : null}
  </div>); }
