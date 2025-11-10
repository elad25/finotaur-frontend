import { api } from '@/lib/apiBase';
import { PageTemplate } from '@/components/PageTemplate';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Coin = {
  id: string; symbol: string; name: string;
  current_price: number; price_change_percentage_24h: number|null;
  total_volume: number; market_cap: number;
};

export default function CryptoOverview() {
  const [items, setItems] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let alive=true;
    setLoading(true);
    fetch(api(`/api/crypto/overview?per_page=25&page=1`)).then(r=>r.json()).then(j=>{
      if(alive) setItems(j.items||[]);
    }).finally(()=>{ if(alive) setLoading(false); });
    return ()=>{ alive=false };
  },[]);

  return (
    <PageTemplate title="Crypto Dashboard" description="Live crypto market snapshot.">
      <Card className="rounded-2xl border-border bg-base-800 shadow-premium">
        <CardContent>
          {loading ? <div className="text-muted-foreground p-6">Loading…</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">24h</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c)=> (
                  <TableRow key={c.id}>
                    <TableCell className="uppercase">{c.symbol}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>${c.current_price}</TableCell>
                    <TableCell className={"text-right " + ((c.price_change_percentage_24h||0)>=0?"text-green-500":"text-red-500")}>
                      {c.price_change_percentage_24h!=null? c.price_change_percentage_24h.toFixed(2)+'%':'-'}
                    </TableCell>
                    <TableCell className="text-right">${c.total_volume?.toLocaleString?.() || c.total_volume}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
