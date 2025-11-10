import { api } from '@/lib/apiBase';
import { PageTemplate } from '@/components/PageTemplate';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type TrendItem = { item: { id: string; symbol: string; name: string; price_btc?: number } };
type Dominance = Record<string, number>;

export default function CryptoMovers() {
  const [trending, setTrending] = useState<TrendItem[]>([]);
  const [dominance, setDominance] = useState<Dominance>({});
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let alive=true;
    setLoading(true);
    Promise.all([
      fetch(api(`/api/crypto/trending`)).then(r=>r.json()),
      fetch(api(`/api/crypto/dominance`)).then(r=>r.json()),
    ]).then(([t,d])=>{
      if(!alive) return;
      setTrending(t.items||[]);
      setDominance((d.data?.data?.market_cap_percentage)||{});
    }).finally(()=>{ if(alive) setLoading(false); });
    return ()=>{ alive=false };
  },[]);

  return (
    <PageTemplate title="Top Movers" description="Cryptocurrencies with the biggest price movements.">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="rounded-2xl border-border bg-base-800 shadow-premium md:col-span-2">
          <CardHeader><CardTitle>Trending</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="text-muted-foreground">Loading…</div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Ticker</TableHead><TableHead>Name</TableHead></TableRow></TableHeader>
                <TableBody>
                  {trending.map((t)=> (
                    <TableRow key={t.item.id}>
                      <TableCell className="uppercase">{t.item.symbol}</TableCell>
                      <TableCell>{t.item.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-base-800 shadow-premium">
          <CardHeader><CardTitle>Dominance</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="text-muted-foreground">Loading…</div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Coin</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
                <TableBody>
                  {Object.entries(dominance).sort((a,b)=> b[1]-a[1]).slice(0,8).map(([k,v])=> (
                    <TableRow key={k}>
                      <TableCell className="uppercase">{k}</TableCell>
                      <TableCell className="text-right">{v.toFixed(2)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
