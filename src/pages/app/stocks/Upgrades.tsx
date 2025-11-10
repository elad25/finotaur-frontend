import { useEffect, useMemo, useState } from "react";

type RepeatRow = {
  symbol: string;
  count: number;
  upgrades: number;
  downgrades: number;
  lastDate: string | null;
};

type RepeatsResponse = {
  from: string;
  to: string;
  total: number;
  repeats: RepeatRow[];
};

export default function StocksUpgradesPage() {
  const [data, setData] = useState<RepeatsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const r = await fetch(`/api/analyst/upgrades/repeats`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancelled) setData(j);
      } catch (e:any) {
        if (!cancelled) setErr(e.message || "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => data?.repeats ?? [], [data]);

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upgrades &amp; Downgrades</h1>
        <p className="text-sm opacity-70 mt-1">
          Use the global search to choose a ticker. Meanwhile, see top repeated symbols below (last 90 days, via FMP).
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-medium">Top repeated symbols (90 days)</h2>
          {data ? (
            <span className="text-xs opacity-70">window: {data.from} → {data.to} • total events: {data.total}</span>
          ) : null}
        </div>

        <div className="p-2 overflow-auto">
          {loading && <div className="p-4 text-sm">Loading…</div>}
          {err && <div className="p-4 text-sm text-red-400">Failed {err}</div>}
          {!loading && !err && (
            <table className="min-w-full text-sm">
              <thead className="text-left opacity-70">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Symbol</th>
                  <th className="px-3 py-2">Repeats</th>
                  <th className="px-3 py-2">Upgrades</th>
                  <th className="px-3 py-2">Downgrades</th>
                  <th className="px-3 py-2">Last event</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.symbol} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-3 py-2 opacity-70">{idx + 1}</td>
                    <td className="px-3 py-2 font-semibold">{r.symbol}</td>
                    <td className="px-3 py-2">{r.count}</td>
                    <td className="px-3 py-2">{r.upgrades}</td>
                    <td className="px-3 py-2">{r.downgrades}</td>
                    <td className="px-3 py-2">{r.lastDate || "-"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center opacity-70">No events found in the last 90 days.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="text-xs opacity-70">
        Data provided by FinancialModelingPrep (FMP). We present market consensus/ratings and do not generate this data.
      </div>
    </div>
  );
}
