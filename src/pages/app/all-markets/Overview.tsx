import { api } from '@/lib/apiBase';
// src/pages/app/all-markets/Overview.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Mover = { symbol: string; price: number|null; chp: number|null; name?: string };
type MoversResp = { gainers: Mover[]; losers: Mover[]; source: string; ts: number };

export default function AllMarketsOverview() {
  const [data, setData] = useState<MoversResp| null>(null);
  useEffect(()=>{
    let ok = true;
    (async ()=>{
  try{
    const res = await fetch(api(`/api/top-movers?limit=6`));
    if(!res.ok){ if(ok) setData({ gainers: [], losers: [], source: 'http-error', ts: Date.now() }); return; }
    const j = await res.json().catch(()=>null);
    if(!j || typeof j !== 'object'){ if(ok) setData({ gainers: [], losers: [], source: 'parse-error', ts: Date.now() }); return; }
    if(ok) setData(j as any);
  }catch{
    if(ok) setData({ gainers: [], losers: [], source: 'network-error', ts: Date.now() });
  }
})();
    return ()=>{ ok=false };
  },[]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="rounded-2xl border-border bg-base-800 shadow-premium">
          <CardHeader><CardTitle>Top Gainers</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Symbol</TableHead><TableHead>Price</TableHead><TableHead className="text-right">Change%</TableHead></TableRow></TableHeader>
              <TableBody>{(data?.gainers||[]).map((m,i)=>(
                <TableRow key={m.symbol+String(i)}><TableCell>{m.symbol}</TableCell><TableCell>{m.price!=null?`$${m.price}`:'-'}</TableCell><TableCell className={"text-right "+((m.chp||0)>=0?"text-green-500":"text-red-500")}>{m.chp!=null?m.chp.toFixed(2)+'%':'-'}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-base-800 shadow-premium">
          <CardHeader><CardTitle>Top Losers</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Symbol</TableHead><TableHead>Price</TableHead><TableHead className="text-right">Change%</TableHead></TableRow></TableHeader>
              <TableBody>{(data?.losers||[]).map((m,i)=>(
                <TableRow key={m.symbol+String(i)}><TableCell>{m.symbol}</TableCell><TableCell>{m.price!=null?`$${m.price}`:'-'}</TableCell><TableCell className={"text-right "+((m.chp||0)>=0?"text-green-500":"text-red-500")}>{m.chp!=null?m.chp.toFixed(2)+'%':'-'}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
