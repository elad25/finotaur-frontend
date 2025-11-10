import React, { useEffect, useMemo, useState } from "react";

type Filing = {
  form: string;
  filingDate?: string;
  reportDate?: string;
  accessionNumber?: string;
  primaryDocument?: string;
};

type Props = {
  symbol: string;                  // Locked symbol (e.g., "MSFT")
  defaultShow?: number;            // How many rows to show initially
  defaultAnnual?: boolean;         // toggle initial
  defaultQuarterlyInterim?: boolean; // toggle initial
};

const ANNUAL_FORMS = new Set(["10-K", "20-F"]);
const QUARTERLY_INTERIM_FORMS = new Set(["10-Q", "6-K"]);

export default function SecFilingsForSymbolLock({
  symbol,
  defaultShow = 20,
  defaultAnnual = true,
  defaultQuarterlyInterim = true,
}: Props) {
  const [filings, setFilings] = useState<Filing[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(defaultShow);
  const [annual, setAnnual] = useState(defaultAnnual);
  const [quarterly, setQuarterly] = useState(defaultQuarterlyInterim);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    fetch(`/api/sec/filings?symbol=${encodeURIComponent(symbol)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setFilings(Array.isArray(data.filings) ? data.filings : []);
      })
      .catch((e) => setError(e?.message || "Failed to fetch"))
      .finally(() => setLoading(false));
  }, [symbol]);

  const filtered = useMemo(() => {
    if (!filings) return [];
    return filings.filter((f) => {
      const form = (f.form || "").toUpperCase().trim();
      const isAnnual = ANNUAL_FORMS.has(form);
      const isQuarterly = QUARTERLY_INTERIM_FORMS.has(form);
      if (isAnnual && !annual) return false;
      if (isQuarterly && !quarterly) return false;
      if (!isAnnual && !isQuarterly) {
        return annual || quarterly;
      }
      return true;
    }).slice(0, show);
  }, [filings, annual, quarterly, show]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-70">
          <span className="font-semibold">{symbol.toUpperCase()}</span>{" "}
          — Showing {annual ? "Annual" : ""}{annual && quarterly ? " & " : ""}{quarterly ? "Quarterly/Interim" : ""}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-70">Show</span>
            <select
              value={show}
              onChange={(e) => setShow(Number(e.target.value))}
              className="bg-transparent border rounded px-2 py-1 text-sm"
            >
              {[10, 15, 20, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-sm opacity-70">items</span>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={annual} onChange={(e) => setAnnual(e.target.checked)} />
            Annual Report
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={quarterly} onChange={(e) => setQuarterly(e.target.checked)} />
            Quarterly / Interim Report
          </label>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left opacity-70">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Filing Date</th>
              <th className="px-4 py-3">Report Date</th>
              <th className="px-4 py-3">Document</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 opacity-70">Loading filings…</td>
              </tr>
            )}
            {(!loading && error) && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-red-400">Failed to fetch: {error}</td>
              </tr>
            )}
            {(!loading && !error && filtered.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-6 opacity-70">
                  No Annual or Quarterly/Interim filings found for this ticker.
                </td>
              </tr>
            )}
            {filtered.map((f, i) => (
              <tr key={`${f.accessionNumber}-${i}`} className="border-t border-white/5">
                <td className="px-4 py-3">{f.form}</td>
                <td className="px-4 py-3">{f.filingDate || "-"}</td>
                <td className="px-4 py-3">{f.reportDate || "-"}</td>
                <td className="px-4 py-3">
                  {f.primaryDocument ? (
                    <a
                      className="underline"
                      href={`https://www.sec.gov/Archives/edgar/data/${encodeURIComponent(f.accessionNumber || "")}/${encodeURIComponent(f.primaryDocument)}`}
                      target="_blank" rel="noreferrer"
                    >
                      {f.primaryDocument}
                    </a>
                  ) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
