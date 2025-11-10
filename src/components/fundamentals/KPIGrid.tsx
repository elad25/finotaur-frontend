
import React from "react";
import { fmt } from "./utils";

export function KPIGrid({ data }: { data: any }) {
  const s = data?.snapshot ?? {};
  const items = [
    { label: "Market Cap", value: s.marketCap ? fmt.$n(s.marketCap, 0) : "—", sub: "" },
    { label: "Revenue (TTM)", value: s.revenueTTM ? fmt.$n(s.revenueTTM, 0) : "—", sub: "" },
    { label: "Net Income (TTM)", value: s.netIncomeTTM ? fmt.$n(s.netIncomeTTM, 0) : "—", sub: "" },
    { label: "Gross Margin", value: s.grossProfitTTM && s.revenueTTM ? fmt.p(s.grossProfitTTM / s.revenueTTM) : "—", sub: "" },
    { label: "Operating Margin", value: s.operatingIncomeTTM && s.revenueTTM ? fmt.p(s.operatingIncomeTTM / s.revenueTTM) : "—", sub: "" },
    { label: "Net Margin", value: s.netIncomeTTM && s.revenueTTM ? fmt.p(s.netIncomeTTM / s.revenueTTM) : "—", sub: "" },
    { label: "ROE", value: s.roe != null ? fmt.p(s.roe) : "—", sub: "" },
    { label: "ROA", value: s.roa != null ? fmt.p(s.roa) : "—", sub: "" },
    { label: "Debt/Equity", value: s.debtToEquity != null ? fmt.n(s.debtToEquity, 2) : "—", sub: "" },
    { label: "Current Ratio", value: s.currentRatio != null ? fmt.n(s.currentRatio, 2) : "—", sub: "" },
    { label: "Quick Ratio", value: s.quickRatio != null ? fmt.n(s.quickRatio, 2) : "—", sub: "" },
    { label: "Price", value: s.price != null ? fmt.$n(s.price) : "—", sub: "" },
  ];

  return (
    <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl bg-neutral-900/60 border border-neutral-800 p-3">
          <div className="text-xs text-neutral-400">{it.label}</div>
          <div className="text-lg text-neutral-100">{it.value}</div>
          {it.sub && <div className="text-[10px] text-neutral-500">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}
export default KPIGrid;
