import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildFilingUrl } from "@/lib/filingUrl";
import { getJsonSmart } from "@/lib/http";

type Filing = {
  form: string;
  filingDate: string;
  reportDate?: string;
  accessionNumber: string;
  primaryDocument: string;
  filingUrl?: string;
  description?: string;
};

type SecFilingsResponse = {
  symbol: string;
  cik: string;
  filings: Filing[];
};

const FORM_CHOICES = ["10-K", "10-Q", "8-K", "20-F", "6-K"];
const FORM_DEFAULT = new Set(["10-K", "10-Q", "8-K"]);

export default function ReportsSECDocuments({ initialSymbol }: { initialSymbol?: string } = {}) {
  const [query, setQuery] = useState("");
  const [symbol, setSymbol] = useState("");
  const [cik, setCik] = useState<string>("");
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(15);
  const [filters, setFilters] = useState<string[]>(Array.from(FORM_DEFAULT));
  const [openSuggest, setOpenSuggest] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{symbol:string; name?:string}>>([]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { if (initialSymbol) setQuery(initialSymbol); }, [initialSymbol]);
  const debRef = useRef<number | null>(null);

  // debounce query -> suggestions via backend to avoid CORS
  useEffect(() => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      setOpenSuggest(false);
      return;
    }
    if (debRef.current) window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(() => runSuggest(query), 160);
    return () => { if (debRef.current) window.clearTimeout(debRef.current); };
  }, [query]);

  async function runSuggest(q: string) {
    try {
      const data = await getJsonSmart(`/api/sec/tickers?q=${encodeURIComponent(q)}`);
      const items = Array.isArray(data?.items) ? data.items : [];
      setSuggestions(items);
      setOpenSuggest(items.length > 0);
    } catch {
      setSuggestions([]);
      setOpenSuggest(false);
    }
  }

  function onPick(sym: string) {
    const s = sym.toUpperCase();
    setSymbol(s);
    setQuery(s);
    setOpenSuggest(false);
    load(s);
  }

  async function load(sym?: string) {
    const ticker = (sym || query || "").trim().toUpperCase();
    if (!ticker) return;
    setLoading(true);
    setError(null);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const json: SecFilingsResponse = await getJsonSmart(`/api/sec/filings?symbol=${encodeURIComponent(ticker)}`, { signal: ac.signal });
      const cik = json?.cik || "";
      setCik(cik);
      setSymbol(json?.symbol?.toUpperCase?.() || ticker);

      const rows = (json?.filings || []).map(f => ({
        ...f,
        filingUrl: f.filingUrl || (cik && f.accessionNumber && f.primaryDocument
          ? buildFilingUrl(cik, f.accessionNumber, f.primaryDocument)
          : undefined)
      }));

      const filtered = rows.filter(r => filters.includes(r.form));
      filtered.sort((a, b) => (a.filingDate < b.filingDate ? 1 : -1));
      setFilings(filtered.slice(0, count));
    } catch (e:any) {
      setError(e?.message || "Request failed");
      setFilings([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleForm(t: string) {
    setFilters(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  const filterBadge = useMemo(() => filters.join(", "), [filters]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 relative">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onFocus={() => suggestions.length && setOpenSuggest(true)}
            placeholder="Type a ticker… e.g., AAPL"
            className="h-9 w-60 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none"
          />
          {openSuggest && (
            <div className="absolute z-20 mt-1 w-80 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-800"
                  onClick={() => onPick(s.symbol)}
                >
                  <span className="font-medium">{s.symbol}</span>
                  <span className="opacity-70 truncate max-w-[220px]">{s.name || ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm opacity-80">
          Show
          <input
            type="number"
            min={5}
            max={50}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value || "15", 10))}
            className="h-8 w-16 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-white"
          />
          items
        </label>

        <div className="flex items-center gap-3">
          {["10-K", "10-Q", "8-K", "20-F", "6-K"].map((t) => (
            <label key={t} className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={filters.includes(t)} onChange={() => toggleForm(t)} />
              <span>{t}</span>
            </label>
          ))}
        </div>

        <button
          onClick={() => load()}
          disabled={loading}
          className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm hover:bg-zinc-800"
        >
          {loading ? "Loading…" : "Load reports"}
        </button>
      </div>

      {error && <div className="text-amber-400 text-sm">{error}</div>}

      {!loading && filings.length > 0 && (
        <div className="mt-2">
          <div className="text-sm opacity-70 mb-2">
            {symbol && <span className="mr-2">Symbol <b>{symbol}</b></span>}
            {cik && <span className="mr-2">CIK {cik}</span>}
            • Types: {filterBadge}
          </div>
          <div className="rounded-xl border border-zinc-700 overflow-hidden">
            <table className="w-full border-collapse">
              <thead className="bg-zinc-900/70">
                <tr>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Filed</th>
                  <th className="text-left px-3 py-2">Report</th>
                  <th className="text-left px-3 py-2">Open</th>
                  <th className="text-left px-3 py-2">AI</th>
                </tr>
              </thead>
              <tbody>
                {filings.map((f, i) => {
                  const aiHref = `/app/ai/reports?source=sec&symbol=${encodeURIComponent(symbol)}&cik=${encodeURIComponent(cik)}&form=${encodeURIComponent(f.form)}&acc=${encodeURIComponent(f.accessionNumber)}&doc=${encodeURIComponent(f.primaryDocument)}`;
                  return (
                    <tr key={i} className="border-t border-zinc-800">
                      <td className="px-3 py-2">{f.form}</td>
                      <td className="px-3 py-2">{f.filingDate}</td>
                      <td className="px-3 py-2">{f.reportDate || "-"}</td>
                      <td className="px-3 py-2">
                        <a href={(f.filingUrl || buildFilingUrl(cik, f.accessionNumber, f.primaryDocument))} target="_blank" rel="noreferrer" className="text-yellow-500 hover:underline">Open filing</a>
                      </td>
                      <td className="px-3 py-2">
                        <a href={aiHref} className="text-yellow-500 hover:underline">Analyze with AI</a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && filings.length === 0 && (
        <div className="opacity-60 text-sm">Type a ticker and click “Load reports”.</div>
      )}
    </div>
  );
}
