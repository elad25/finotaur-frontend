
import { useEffect, useMemo, useState } from "react";
import { getCikForTicker, getCompanyFacts } from "@/services/secClient";
import { seriesFromFact } from "@/lib/secSeries";
import { fetchQuote } from "@/components/markets/quotes";

type Props = { symbol: string };

function fmtNumber(n: number|null, opts: Intl.NumberFormatOptions = {}) {
  if (n==null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(undefined, opts).format(n);
}
function fmtPct(n: number|null) {
  if (n==null || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export default function CompanySnapshot({ symbol }: Props) {
  const [facts, setFacts] = useState<any|null>(null);
  const [price, setPrice] = useState<number|null>(null);

  useEffect(() => {
    let on = true;
    (async () => {
      const cik = await getCikForTicker(symbol);
      if (!cik) return;
      const f = await getCompanyFacts(cik);
      const q = await fetchQuote(symbol);
      if (!on) return;
      setFacts(f);
      setPrice(q.price ?? null);
    })();
    return () => { on = false };
  }, [symbol]);

  const snapshot = useMemo(() => {
    if (!facts) return null;

    const shares = seriesFromFact(facts, "CommonStockSharesOutstanding").at(-1)?.value ?? null;
    const eps = seriesFromFact(facts, "EarningsPerShareDiluted").at(-1)?.value ?? null;
    const revenue = seriesFromFact(facts, "Revenues").at(-1)?.value ?? null;
    const netIncome = seriesFromFact(facts, "NetIncomeLoss").at(-1)?.value ?? null;
    const dividends = seriesFromFact(facts, "CommonStockDividendsPerShareDeclared").at(-1)?.value ?? null;
    const ltDebt = seriesFromFact(facts, "LongTermDebtNoncurrent").at(-1)?.value ?? null;
    const equity = seriesFromFact(facts, "StockholdersEquity").at(-1)?.value ?? null;
    const beta = null; // placeholder (can be added later from Polygon/FMP)
    const wk52High = seriesFromFact(facts, "MarketPriceHigh").at(-1)?.value ?? null;
    const wk52Low = seriesFromFact(facts, "MarketPriceLow").at(-1)?.value ?? null;

    const marketCap = (price!=null && shares!=null) ? price * shares : null;
    const pe = (price!=null && eps) ? (price / eps) : null;
    const dy = (dividends!=null && price!=null && price!==0) ? (dividends / price * 100) : null;
    const d2e = (ltDebt!=null && equity!=null && equity!==0) ? (ltDebt / equity) : null;

    return { marketCap, pe, eps, revenue, netIncome, dy, d2e, beta, wk52Low, wk52High };
  }, [facts, price]);

  if (!snapshot) return null;

  return (
    <div className="rounded-2xl border border-border bg-base-800 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Company Snapshot</h3>
        <a className="text-sm underline opacity-80 hover:opacity-100" href={`/app/stocks/reports?symbol=${encodeURIComponent(symbol)}`}>View SEC Filings</a>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 text-sm">
        <div><div className="opacity-60">Market Cap</div><div className="font-medium">{fmtNumber(snapshot.marketCap, {notation:"compact", maximumFractionDigits: 2})}</div></div>
        <div><div className="opacity-60">P/E Ratio</div><div className="font-medium">{snapshot.pe==null? "—" : snapshot.pe.toFixed(1)}</div></div>
        <div><div className="opacity-60">EPS (TTM)</div><div className="font-medium">{snapshot.eps==null? "—" : snapshot.eps.toFixed(2)}</div></div>
        <div><div className="opacity-60">Revenue (TTM)</div><div className="font-medium">{fmtNumber(snapshot.revenue, {notation:"compact", maximumFractionDigits: 2})}</div></div>
        <div><div className="opacity-60">Net Income (TTM)</div><div className="font-medium">{fmtNumber(snapshot.netIncome, {notation:"compact", maximumFractionDigits: 2})}</div></div>
        <div><div className="opacity-60">Dividend Yield</div><div className="font-medium">{fmtPct(snapshot.dy)}</div></div>
        <div><div className="opacity-60">Debt/Equity</div><div className="font-medium">{snapshot.d2e==null? "—" : snapshot.d2e.toFixed(2)}</div></div>
        <div><div className="opacity-60">Beta</div><div className="font-medium">{snapshot.beta==null? "—" : snapshot.beta.toFixed(2)}</div></div>
        <div><div className="opacity-60">52-Week Range</div><div className="font-medium">{snapshot.wk52Low==null || snapshot.wk52High==null ? "—" : `${fmtNumber(snapshot.wk52Low)} - ${fmtNumber(snapshot.wk52High)}`}</div></div>
      </div>
    </div>
  );
}
