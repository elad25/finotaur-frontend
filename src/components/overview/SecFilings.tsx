import React, { useEffect, useState } from "react";
import { getJSON } from "@/lib/api";
// Build fallback SEC search URL when we do not have a direct document link
function secSearchUrl(symbol: string, form?: string, filingDate?: string){
  const params = new URLSearchParams();
  if (symbol) params.set("entityName", symbol.toUpperCase());
  if (form) params.set("forms", form);
  // The hash-based search takes query params via the URL fragment
  const qs = params.toString();
  return `https://www.sec.gov/edgar/search/#/?${qs}`;
}

type Row = { type:string; filingDate?:string; reportDate?:string; docUrl?:string|null };

export default function SecFilings({ symbol }: { symbol: string }){
  const [rows,setRows]=useState<Row[]>([]);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    let stop=false;
    (async()=>{
      setLoading(true);
      try{
        const r = await getJSON<Row[]>(`/api/overview/filings?symbol=${encodeURIComponent(symbol)}&annual=1&quarterly=1&limit=10`);
        if(!stop) setRows(Array.isArray(r)? r: []);
      }catch{ if(!stop) setRows([]); }
      finally{ if(!stop) setLoading(false); }
    })();
    return ()=>{stop=true};
  },[symbol]);

  const noData = rows.length===0 && !loading;

  return (
    <section className="rounded-2xl p-4 bg-[#0D0E10] border border-[#1b1d21]">
      <h3 className="text-2xl font-semibold mb-1">SEC Filings</h3>
      <div className="text-sm text-gray-400 mb-3">
        {symbol} — Showing Annual &amp; Quarterly/Interim
      </div>

      <div className="w-full overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-400">
            <tr className="border border-[#1b1d21] rounded-2xl overflow-hidden">
              <th className="text-left py-3 px-4 w-1/5">Type</th>
              <th className="text-left py-3 px-4 w-1/5">Filing Date</th>
              <th className="text-left py-3 px-4 w-1/5">Report Date</th>
              <th className="text-left py-3 px-4 w-1/5">Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b1d21]">
            {loading && (
              <tr><td colSpan={4} className="py-6 text-center text-gray-500">Loading…</td></tr>
            )}
            {noData && (
              <tr><td colSpan={4} className="py-6 text-center text-gray-500">No Annual or Quarterly/Interim filings found for this ticker.</td></tr>
            )}
            {!loading && rows.map((r,i)=>(
              <tr key={i} className="hover:bg-[#0f1114] transition-colors">
                <td className="py-3 px-4">{r.type||"—"}</td>
                <td className="py-3 px-4">{r.filingDate||"—"}</td>
                <td className="py-3 px-4">{r.reportDate||"—"}</td>
                <td className="py-3 px-4">
                  {r.docUrl ? <a className="text-[#D4AF37] underline" href={r.docUrl} target="_blank" rel="noreferrer">Open</a> : <span className="text-gray-500">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
