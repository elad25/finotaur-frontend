// src/components/markets/QuoteBadge.tsx
import React, { useEffect, useState } from "react";

type Props = { symbol: string };

type Quote = {
  price: number | null;
  chOpen: number | null;   // change from today's open (%)
  chPrev: number | null;   // change from previous close (%)
  isPremarket?: boolean;
};

export const QuoteBadge: React.FC<Props> = ({ symbol }) => {
  const [q, setQ] = useState<Quote | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/quote?symbol=" + encodeURIComponent(symbol))
      .then(r => r.json())
      .then(d => { if (alive) setQ(d); })
      .catch(() => setQ(null));
    return () => { alive = false; };
  }, [symbol]);

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
