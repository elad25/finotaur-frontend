import { useEffect, useMemo, useState } from "react";
import { fetchQuote } from "@/components/markets/quotes";

type Row = { symbol: string; price: number|null; chp: number|null };

export default function ComparisonWidget({ peers = [] as string[] }) {
  const uniquePeers = useMemo(() => Array.from(new Set(peers.filter(Boolean).map(s => s.toUpperCase()))), [peers]);
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    (async () => {
      const out: Row[] = [];
      for (const s of uniquePeers) {
        const q = await fetchQuote(s);
        out.push({ symbol: s, price: q.price ?? null, chp: q.chp ?? null });
      }
      setRows(out);
    })();
  }, [uniquePeers]);
  if (rows.length===0) return null;
  return (
    <div className="rounded-2xl border border-border bg-base-800 p-4">
      <h3 className="mb-3 font-semibold">Quick Compare</h3>
      <table className="w-full text-sm">
        <thead className="text-left opacity-60"><tr><th>Company</th><th>Price</th><th>Chg%</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.symbol} className="border-top border-border/60">
              <td className="py-2">{r.symbol}</td>
              <td>{r.price ?? "—"}</td>
              <td className={r.chp!=null && r.chp>=0 ? "text-green-400" : "text-red-400"}>{r.chp!=null ? r.chp.toFixed(2)+"%" : "—%"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
