// src/components/markets/QuoteBadge.tsx
// Data source: /api/quote — Polygon snapshot. Gated by useMarketGate.
import React, { useEffect, useState } from "react";
import { useMarketGate } from "@/hooks/useMarketGate";

type Props = { symbol: string };

type Quote = {
  price: number | null;
  chOpen: number | null;   // change from today's open (%)
  chPrev: number | null;   // change from previous close (%)
  isPremarket?: boolean;
};

export const QuoteBadge: React.FC<Props> = ({ symbol }) => {
  const { gated } = useMarketGate();
  const [q, setQ] = useState<Quote | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/quote?symbol=" + encodeURIComponent(symbol))
      .then(r => r.json())
      .then(d => { if (alive) setQ(d); })
      .catch(() => setQ(null));
    return () => { alive = false; };
  }, [symbol]);

  // Gate: raw Polygon quote — not licensed for redistribution.
  // All hooks (useState, useEffect) have already been called above.
  // Return a neutral dash placeholder instead of null so the watchlist row layout stays intact.
  if (gated) return <span className="text-xs text-zinc-600 select-none" aria-hidden="true">—</span>;

  if (!q) return <span className="text-xs opacity-60">—</span>;

  const format = (v: number | null) => (v == null ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2) + "%");
  const cls = (v: number | null) => v == null ? "" : (v >= 0 ? "text-emerald-400" : "text-rose-400");

  return (
    <span className="text-[11px] flex gap-2">
      <span className={cls(q.chOpen)} title="Change vs today's open">{format(q.chOpen)}</span>
      <span className={cls(q.chPrev)} title="Change vs previous close">{format(q.chPrev)}</span>
      {q.isPremarket ? <span className="text-yellow-400/80">PM</span> : null}
    </span>
  );
};
