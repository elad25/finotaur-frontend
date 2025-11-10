// src/components/UpgradesRepeatsTable.tsx
// A small, neutral table component that you can drop into any page.
// It does not impose styles; it uses plain HTML so it won't conflict with your design system.
import React from "react";
import { fetchTopRepeats, type RepeatsResponse } from "@/services/analystRepeats";

export type UpgradesRepeatsTableProps = {
  windowDays?: number; // default 90
  limit?: number;      // default 50
  className?: string;  // optional container class from your design system
  caption?: string;    // optional table caption
};

export default function UpgradesRepeatsTable({
  windowDays = 90,
  limit = 50,
  className,
  caption = "Symbols with repeated analyst actions (last 90 days)",
}: UpgradesRepeatsTableProps) {
  const [data, setData] = React.useState<RepeatsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchTopRepeats({ windowDays, limit });
        if (!alive) return;
        setData(res);
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [windowDays, limit]);

  if (loading) return <div className={className}>Loading…</div>;
  if (error) return <div className={className} role="alert">Failed to load repeats: {error}</div>;
  if (!data) return <div className={className}>No data.</div>;

  return (
    <div className={className}>
      <table>
        {caption ? <caption style={{ textAlign: "left", marginBottom: 8 }}>{caption}</caption> : null}
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Symbol</th>
            <th style={{ textAlign: "right" }}>Count</th>
            <th style={{ textAlign: "right" }}>Upgrades</th>
            <th style={{ textAlign: "right" }}>Downgrades</th>
            <th style={{ textAlign: "left" }}>Last Date</th>
          </tr>
        </thead>
        <tbody>
          {data.repeats.map((row) => (
            <tr key={row.symbol}>
              <td>{row.symbol}</td>
              <td style={{ textAlign: "right" }}>{row.count}</td>
              <td style={{ textAlign: "right" }}>{row.upgrades}</td>
              <td style={{ textAlign: "right" }}>{row.downgrades}</td>
              <td>{row.lastDate ?? "-"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} style={{ fontSize: 12, opacity: 0.7, paddingTop: 4 }}>
              Window: {data.from} → {data.to} • Total events scanned: {data.total}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
