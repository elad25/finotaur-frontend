import { api } from '@/lib/apiBase';
import { PageTemplate } from '@/components/PageTemplate';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Mover = { symbol: string; price: number|null; chp: number|null; name?: string };
type MoversResp = { gainers: Mover[]; losers: Mover[]; source: string; ts: number };

export default function AllMarketsMovers() {
  const [data, setData] = useState<MoversResp| null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string| null>(null);

  useEffect(()=>{
    let alive = true;
    setLoading(true);
    fetch(api(`/api/top-movers?limit=6`))
      .then(r=> r.ok ? r.json(): Promise.reject(r.statusText))
      .then((j)=> { if(alive) { setData(j); setErr(null);} })
      .catch(e=> { if(alive) setErr(String(e)); })
      .finally(()=> { if(alive) setLoading(false); });
    return ()=> { alive = false; };
  },[]);

  const renderTable = (list: Mover[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Price</TableHead>
          <TableHead className="text-right">Change%</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((m, i)=> (
          <TableRow key={m.symbol+String(i)}>
            <TableCell>{m.symbol} {m.name ? <span className="text-muted-foreground">({m.name})</span> : null}</TableCell>
            <TableCell>{m.price != null ? `$${m.price}` : '-'}</TableCell>
            <TableCell className={"text-right " + ((m.chp||0)>=0 ? "text-green-500" : "text-red-500")}>
              {m.chp != null ? `${m.chp.toFixed(2)}%` : '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <PageTemplate
      title="Top Movers"
      description="Biggest gainers and losers across all markets today."
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="rounded-2xl border-border bg-base-800 shadow-premium">
          <CardHeader><CardTitle>Gainers</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="text-muted-foreground">Loading…</div> : err ? <div className="text-red-500">{err}</div> : renderTable(data?.gainers||[])}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-base-800 shadow-premium">
          <CardHeader><CardTitle>Losers</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="text-muted-foreground">Loading…</div> : err ? <div className="text-red-500">{err}</div> : renderTable(data?.losers||[])}
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
