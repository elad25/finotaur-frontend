
import React from "react";

export function DCFBox({ data }: { data: any }) {
  const fair = data?.valuation?.dcf?.fairValue ?? null;
  const asOf = data?.valuation?.dcf?.asOf ?? null;
  return (
    <div className="rounded-xl bg-neutral-900/60 border border-neutral-800 p-3">
      <div className="text-xs text-neutral-400 mb-1">Fair Value (DCF)</div>
      <div className="text-neutral-100">{fair != null ? `$${fair}` : "—"}</div>
      {asOf && <div className="text-[10px] text-neutral-500">{asOf}</div>}
    </div>
  );
}
export default DCFBox;
