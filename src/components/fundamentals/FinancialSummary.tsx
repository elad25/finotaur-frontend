
import { useEffect, useState } from "react";
import { getCikForTicker, getCompanyFacts } from "@/services/secClient";
import { seriesFromFact, yoy, pct } from "@/lib/secSeries";

type Props = { symbol: string };

export default function FinancialSummary({ symbol }: Props) {
  const [facts, setFacts] = useState<any|null>(null);
  useEffect(() => {
    (async () => {
      const cik = await getCikForTicker(symbol);
      if (!cik) return;
      setFacts(await getCompanyFacts(cik));
    })();
  }, [symbol]);

  if (!facts) return null;

  const revenue = seriesFromFact(facts, "Revenues", {limit: 8});
  const netInc  = seriesFromFact(facts, "NetIncomeLoss", {limit: 8});
  const opMargin = seriesFromFact(facts, "OperatingIncomeLoss", {limit: 8}).map((p,i)=>({date:p.date, value:pct(p.value, revenue[i]?.value ?? null)}));

  const lastR = revenue[revenue.length-1]?.value ?? null;
  const prevR = revenue[revenue.length-2]?.value ?? null;
  const lastN = netInc[netInc.length-1]?.value ?? null;
  const prevN = netInc[netInc.length-2]?.value ?? null;
  const lastOpM = opMargin[opMargin.length-1]?.value ?? null;

  return (
    <div className="rounded-2xl border border-border bg-base-800 p-4">
      <h3 className="mb-3 font-semibold">Financial Statements Summary</h3>
      <div className="space-y-1 text-sm">
        <div>Revenue {lastR==null||prevR==null ? "—" : `YoY ${yoy(lastR, prevR).toFixed(1)}%`}, Net Income {lastN==null||prevN==null ? "—" : `YoY ${yoy(lastN, prevN).toFixed(1)}%`}.</div>
        <div>Operating Margin {lastOpM==null ? "—" : `${lastOpM.toFixed(1)}%`} (latest period).</div>
      </div>
    </div>
  );
}
