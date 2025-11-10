
import React from "react";

export function IndustryComparison({ data }: { data: any }) {
  const peers = data?.peers?.tickers ?? [];
  return (
    <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-3">
      <div className="text-xs text-neutral-400 mb-2">Peers</div>
      <div className="text-neutral-100 text-sm">{peers.length ? peers.join(", ") : "—"}</div>
    </div>
  );
}
export default IndustryComparison;
