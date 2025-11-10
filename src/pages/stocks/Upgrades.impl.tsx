import React from "react";
import { RepeatedSymbolsTable } from "@/components/Analyst/RepeatedSymbolsTable";

async function fetchJSON(path: string) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function UpgradesImpl() {
  const [rows, setRows] = React.useState<any[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchJSON("/api/analyst/upgrades/repeats?days=90&limit=50")
      .then((data) => {
        if (!cancelled) {
          setRows(data?.rows ?? []);
          setErr(null);
        }
      })
      .catch((e) => !cancelled && setErr(String(e?.message ?? e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Top repeated symbols (90 days)</h2>
      <div className="rounded-lg border border-white/10 bg-white/5">
        <RepeatedSymbolsTable data={rows ?? []} isLoading={loading} error={err} />
      </div>
      <p className="text-xs opacity-60">
        Data provided by FinancialModelingPrep (FMP). We present market consensus/ratings and do not generate this data.
      </p>
    </section>
  );
}
