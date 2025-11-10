
import { useEffect, useState } from "react";
import { getCikForTicker, getCompanyFacts } from "@/services/secClient";
import { seriesFromFact, pct } from "@/lib/secSeries";
import { fetchQuote } from "@/components/markets/quotes";

type Props = { symbol: string };

function latest<T>(arr: {value:number}[]): number|null {
  if (!arr || arr.length===0) return null;
  return arr[arr.length-1].value ?? null;
}

export default function KeyRatios({ symbol }: Props) {
  const [data, setData] = useState<any|null>(null);
  const [price, setPrice] = useState<number|null>(null);

  useEffect(() => {
    let on = true;
    (async () => {
      const q = await fetchQuote(symbol);
      if (on) setPrice(q.price);
      const cik = await getCikForTicker(symbol);
      if (!cik) return;
      const facts = await getCompanyFacts(cik);
      if (on) setData(facts);
    })();
    return () => { on = false };
  }, [symbol]);

  if (!data) return null;

  const revenue = seriesFromFact(data, "Revenues");
  const netInc  = seriesFromFact(data, "NetIncomeLoss");
  const equity  = seriesFromFact(data, "StockholdersEquity");
  const assets  = seriesFromFact(data, "Assets");
  const currentAssets = seriesFromFact(data, "AssetsCurrent");
  const currentLiab   = seriesFromFact(data, "LiabilitiesCurrent");
  const shares = seriesFromFact(data, "CommonStockSharesOutstanding", {limit: 2});
  const eps = seriesFromFact(data, "EarningsPerShareDiluted", {limit: 2});
  const ni = latest(netInc);
  const rev = latest(revenue);
  const eq = latest(equity);
  const asst = latest(assets);
  const curA = latest(currentAssets);
  const curL = latest(currentLiab);
  const sh = latest(shares);
  const e = latest(eps);

  const pe = (price!=null && e) ? (price / e) : null;
  const pb = (price!=null && eq && sh) ? (price / (eq/sh)) : null;
  const ps = (price!=null && rev && sh) ? (price / (rev/sh)) : null;

  const roe = (ni!=null && eq) ? (ni/eq)*100 : null;
  const roa = (ni!=null && asst) ? (ni/asst)*100 : null;
  const netMargin = (ni!=null && rev) ? (ni/rev)*100 : null;
  const currentRatio = (curA!=null && curL) ? (curA/curL) : null;
  const quickRatio = null; // placeholder unless we compute inventory

  const debt = latest(seriesFromFact(data, "LongTermDebtNoncurrent"));
  const d2e = (debt!=null && eq) ? (debt/eq) : null;

  const rows = [
    ["Valuation","P/E",pe],["Valuation","P/B",pb],["Valuation","P/S",ps],
    ["Profitability","ROE",roe],["Profitability","ROA",roa],["Profitability","Net Margin",netMargin],
    ["Liquidity","Current Ratio",currentRatio],["Liquidity","Quick Ratio",quickRatio],
    ["Leverage","Debt/Equity",d2e],["Leverage","Interest Coverage",null],
    ["Efficiency","Asset Turnover", (rev!=null && asst) ? (rev/asst) : null]
  ] as const;

  return (
    <div className="rounded-2xl border border-border bg-base-800 p-4">
      <h3 className="mb-3 font-semibold">Key Ratios</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left opacity-60">
            <th className="py-2">Category</th>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([cat, m, v], idx) => (
            <tr key={idx} className="border-t border-border/60">
              <td className="py-2">{cat}</td>
              <td>{m}</td>
              <td>{v==null ? "—" : (typeof v === "number" ? (Math.abs(v) > 10 ? v.toFixed(2) : v.toFixed(2)) : v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-muted-foreground">Price source: /api/quote (Yahoo fallback)</div>
    </div>
  );
}
