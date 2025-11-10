import React, { useState } from "react";
import { getCompanySubmissions, getCompanyFacts, getLatest10KInfo } from "../services/sec";

export default function CompanySECDemo() {
  const [cik, setCik] = useState("0000320193");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any | null>(null);
  const [facts, setFacts] = useState<any | null>(null);
  const [latest10k, setLatest10k] = useState<any | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const [a, b, c] = await Promise.all([
        getCompanySubmissions(cik),
        getCompanyFacts(cik),
        getLatest10KInfo(cik),
      ]);
      setSubmissions(a);
      setFacts(b);
      setLatest10k(c);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>SEC • Company Demo</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label htmlFor="cik"><b>CIK:</b></label>
        <input id="cik" value={cik} onChange={(e) => setCik(e.target.value)} placeholder="e.g. 0000320193" />
        <button onClick={load} disabled={loading}>{loading ? "Loading..." : "Load"}</button>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {submissions && (
        <section style={{ marginTop: 16 }}>
          <h3>Recent filings (top 5)</h3>
          <ul>
            {submissions?.filings?.recent?.form?.slice(0,5)?.map((f: string, i: number) => (
              <li key={i}>
                {f} — {submissions.filings.recent.filingDate[i]}
              </li>
            ))}
          </ul>
        </section>
      )}

      {latest10k && (
        <section style={{ marginTop: 16 }}>
          <h3>Latest 10-K</h3>
          <p>Date: {latest10k.filingDate}</p>
          <a href={latest10k.url} target="_blank" rel="noreferrer">Open 10-K</a>
        </section>
      )}

      {facts && (
        <section style={{ marginTop: 16 }}>
          <h3>Facts (us-gaap • Assets first 3)</h3>
          <pre style={{ background: "#f8fafc", padding: 12, borderRadius: 8, maxHeight: 240, overflow: "auto" }}>
            {JSON.stringify(facts?.facts?.["us-gaap"]?.Assets?.units?.USD?.slice(0,3), null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
