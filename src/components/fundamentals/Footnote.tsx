
import React from 'react';
type Props = { context?: { sector?:string; industry?:string; sic?:string } | null };
export default function Footnote({ context }:Props){
  return (
    <div className="text-xs text-zinc-500 mt-6">
      <div>Sector: {context?.sector ?? '—'} · Industry: {context?.industry ?? '—'} · SIC: {context?.sic ?? '—'}</div>
      <div>Sources: SEC (filings), Polygon (price/market cap), FMP (sector/peers). Cache: 5 min; SWR: 60s.</div>
    </div>
  );
}
