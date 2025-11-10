
import React from "react";
import { fmt } from "./utils";

export function HealthTable({ data }: { data: any }) {
  const h = data?.health || {};
  const entries = Object.entries(h) as Array<[string, number|null]>;
  if (!entries.length) {
    return <div className="text-xs text-neutral-500 p-3">No health data.</div>;
  }
  return (
    <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
      {entries.map(([k, v], idx) => (
        <div key={idx} className="flex items-center justify-between p-2 border-b border-neutral-800">
          <div className="text-neutral-300 text-sm">{k}</div>
          <div className="text-neutral-100">{v != null ? fmt.n(v, 2) : "—"}</div>
        </div>
      ))}
    </div>
  );
}
export default HealthTable;
