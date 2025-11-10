
import React, { useEffect, useMemo, useState } from 'react';
import AIHeadline from '@/components/fundamentals/AIHeadline';
import SnapshotWithSparklines from '@/components/fundamentals/SnapshotWithSparklines';
import TrendsCharts from '@/components/fundamentals/TrendsCharts';
import RatiosTable from '@/components/fundamentals/RatiosTable';
import ValuationSection from '@/components/fundamentals/ValuationSection';
import StatementsCompact from '@/components/fundamentals/StatementsCompact';
import { CardSkeleton, BlockSkeleton } from '@/components/fundamentals/Skeletons';

type Row = { endDate:string; revenue?:number|null; netIncome?:number|null; grossMargin?:number|null; operatingMargin?:number|null; netMargin?:number|null; totalDebt?:number|null; equity?:number|null; eps?:number|null; opCF?:number|null; capex?:number|null; };
export default function FundamentalsPage(){
  const [symbol,setSymbol] = useState<string>('AAPL');
  const [period,setPeriod] = useState<'quarterly'|'annual'>('quarterly');
  const [snapshot,setSnapshot] = useState<any>(null);
  const [rows,setRows] = useState<Row[]>([]);
  const [insights,setInsights] = useState<string|undefined>(undefined);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<string|null>(null);

  async function loadAll(s:string,p:'quarterly'|'annual'){
    setLoading(true); setError(null);
    try{
      const [snap, ins] = await Promise.all([
        fetch(`/api/fundamentals/snapshot?symbol=${encodeURIComponent(s)}&period=${p}`).then(r=>r.json()),
        fetch(`/api/fundamentals/insights?symbol=${encodeURIComponent(s)}&period=${p}`).then(r=>r.json()),
      ]);
      if (snap?.error) throw new Error(snap?.message || snap?.error);
      setSnapshot(snap.snapshot || null);
      setRows(snap.rows || []);
      setInsights(ins?.text || undefined);
    }catch(e:any){ setError(e?.message||String(e)); }
    finally{ setLoading(false); }
  }
  useEffect(()=>{ loadAll(symbol, period); },[]);

  const ratiosRows = useMemo(()=>{
    if (!snapshot) return [];
    const x:any[] = [];
    const pct=(n?:number|null)=>n==null?'—':`${(Number(n)*100).toFixed(1)}%`;
    x.push({category:'Valuation', metric:'P/E', value:snapshot.pe ?? '—'});
    x.push({category:'Valuation', metric:'P/B', value:snapshot.pb ?? '—'});
    x.push({category:'Valuation', metric:'P/S', value:snapshot.ps ?? '—'});
    x.push({category:'Profitability', metric:'ROE', value:pct(snapshot.roe)});
    x.push({category:'Profitability', metric:'ROA', value:pct(snapshot.roa)});
    x.push({category:'Efficiency', metric:'Asset Turnover', value:snapshot.assetTurnover ?? '—'});
    x.push({category:'Efficiency', metric:'Inventory Turnover', value:snapshot.inventoryTurnover ?? '—'});
    x.push({category:'Liquidity', metric:'Current Ratio', value:snapshot.currentRatio ?? '—'});
    x.push({category:'Liquidity', metric:'Quick Ratio', value:snapshot.quickRatio ?? '—'});
    x.push({category:'Leverage', metric:'Debt/Equity', value:snapshot.debtToEquity!=null?Number(snapshot.debtToEquity).toFixed(2):'—'});
    return x;
  },[snapshot]);

  const statementsMini = useMemo(()=>{
    const toMini=(key:keyof Row,label:string)=>({ label, data:[...rows].reverse().map(r=>({date:r.endDate.slice(0,10), value:(r as any)[key]??null})) });
    return [ toMini('revenue','Revenue'), toMini('netIncome','Net Income'), toMini('eps','EPS'), toMini('opCF','Operating Cash Flow'), toMini('capex','Capex'), toMini('totalDebt','Total Debt') ];
  },[rows]);

  function exportCSV(){
    const headers = ['date','revenue','netIncome','grossMargin','operatingMargin','netMargin','totalDebt','equity','eps','opCF','capex'];
    const lines = [headers.join(',')].concat(rows.map(r=>headers.map(h => (r as any)[h] ?? '').join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${symbol}_fundamentals.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <input className="px-3 py-2 rounded-lg bg-transparent border border-zinc-700 w-48" value={symbol} onChange={(e)=>setSymbol(e.target.value.toUpperCase())} placeholder="Ticker (e.g., AAPL)" />
        <button className="px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800" onClick={()=>loadAll(symbol,period)}>Load</button>
        <div className="ml-auto flex gap-2">
          <button className={\`px-3 py-2 rounded-lg border \${period==='annual'?'border-yellow-600':'border-zinc-700'}\`} onClick={()=>{setPeriod('annual');loadAll(symbol,'annual');}}>Annual</button>
          <button className={\`px-3 py-2 rounded-lg border \${period==='quarterly'?'border-yellow-600':'border-zinc-700'}\`} onClick={()=>{setPeriod('quarterly');loadAll(symbol,'quarterly');}}>Quarterly</button>
          <button className="px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800" onClick={()=>window.print()}>Export PDF</button>
          <button className="px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800" onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      {error ? <div className="text-red-400 text-sm">Error: {error}</div> : null}

      {loading && !snapshot ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">{Array.from({length:10}).map((_,i)=><CardSkeleton key={i}/>)}</div>
      ) : (
        <SnapshotWithSparklines snapshot={snapshot} rows={rows} onOpenSec={()=>window.open(`/app/stocks/reports?symbol=${encodeURIComponent(symbol)}`,'_blank')} onCompare={()=>alert('Compare Mode: coming soon')}/>
      )}

      <AIHeadline text={insights} />

      {loading && rows.length===0 ? <BlockSkeleton h={260}/> : <TrendsCharts rows={rows} />}

      <div>
        <div className="text-sm font-semibold mb-2">Key Ratios</div>
        <RatiosTable rows={ratiosRows as any} />
      </div>

      <StatementsCompact rows={statementsMini as any} />
    </div>
  );
}
