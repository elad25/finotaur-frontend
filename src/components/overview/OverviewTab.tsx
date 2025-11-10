// src/components/overview/OverviewTab.tsx
import React, { useMemo, useState } from "react";
import { useOverview } from "@/hooks/useOverview";
import { FinotaurScore } from "@/components/ui/FinotaurScore";
import PriceChart from "./PriceChart";
import AnalystDonut from "./AnalystDonut";

function timeAgo(iso?: string) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  const m = Math.floor(s/60), h = Math.floor(m/60), d = Math.floor(h/24);
  if (d>0) return `${d}d ago`; if (h>0) return `${h}h ago`; if (m>0) return `${m}m ago`; return `${s}s ago`;
}

export default function OverviewTab({ symbol: symbolProp }: { symbol?: string }) {
  const { symbol, data, loading, error } = useOverview(symbolProp);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const changeSign = data?.change != null ? (data.change >= 0 ? "+" : "") : "";
  const changePct = data?.changePct != null ? `${changeSign}${data.changePct.toFixed(2)}%` : "--";

  async function askAI() {
    if (!symbol || !question.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/overview/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, question }),
      });
      const j = await res.json();
      setAnswer(j.answer || "No answer");
    } catch (e:any) {
      setAnswer(String(e));
    } finally {
      setAsking(false);
    }
  }

  // 52W mini bar
  const mini52 = (()=>{
    const low = data?.week52Range?.low;
    const high = data?.week52Range?.high;
    const price = data?.price ?? null;
    if (low==null || high==null || price==null || high<=low) return null;
    const pct = Math.max(0, Math.min(100, ((price-low)/(high-low))*100));
    return { low, high, price, pct };
  })();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#151515] border border-[#2A2A2A]">
          <div className="text-lg font-semibold">{data?.companyName || symbol || ""} <span className="opacity-60">({symbol})</span></div>
          <div className="text-2xl font-bold mt-1">
            {data?.price != null ? data.price : "--"}
            <span className={`ml-2 text-sm ${ (data?.change||0) >= 0 ? "text-green-400" : "text-red-400" }`}>{changePct}</span>
          </div>
          <div className="text-xs italic opacity-80 mt-2">{data?.miniInsight || "AI insight will appear here."}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#151515] border border-[#2A2A2A]">
          {data?.finotaurScore ? (
            <FinotaurScore score={data.finotaurScore.score} tagline={data.finotaurScore.tagline} />
          ) : (
            <div className="text-sm opacity-80">Calculating FINOTAUR Score…</div>
          )}
        </div>
        <div className="p-4 rounded-2xl bg-[#151515] border border-[#2A2A2A]">
          <div className="text-sm font-semibold mb-2">Market Snapshot</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Market Cap</div><div className="text-right">{data?.marketSnapshot?.marketCap ?? "--"}</div>
            <div>P/E</div><div className="text-right">{data?.marketSnapshot?.pe ?? "--"}</div>
            <div>Beta</div><div className="text-right">{data?.marketSnapshot?.beta ?? "--"}</div>
            <div>Div Yield</div><div className="text-right">{data?.marketSnapshot?.dividendYield ?? "--"}</div>
            <div>Avg Vol</div><div className="text-right">{data?.marketSnapshot?.avgVolume ?? "--"}</div>
            <div>52W</div>
            <div className="text-right">
              {mini52 ? (
                <div className="flex items-center gap-2">
                  <span className="opacity-70">{mini52.low}</span>
                  <div className="flex-1 h-1.5 rounded bg-white/10 relative">
                    <div className="absolute top-0 left-0 h-1.5 rounded bg-[#D4AF37]" style={{ width: `${mini52.pct}%` }} />
                  </div>
                  <span className="opacity-70">{mini52.high}</span>
                </div>
              ) : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Price Chart with layers */}
      {symbol && <PriceChart symbol={symbol} />}

      {/* Analyst sentiment (AI) with donut */}
      <div className="p-4 rounded-2xl bg-[#151515] border border-[#2A2A2A]">
        <div className="text-sm font-semibold mb-2">Analyst Sentiment (AI)</div>
        {data?.analystAI ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs items-center">
            <div className="grid grid-cols-2 gap-2">
              <div>Buy</div><div className="text-right">{data.analystAI.distribution.buy}</div>
              <div>Hold</div><div className="text-right">{data.analystAI.distribution.hold}</div>
              <div>Sell</div><div className="text-right">{data.analystAI.distribution.sell}</div>
              <div>Avg Target</div><div className="text-right">{data.analystAI.targets.average}</div>
              <div>High</div><div className="text-right">{data.analystAI.targets.high}</div>
              <div>Low</div><div className="text-right">{data.analystAI.targets.low}</div>
            </div>
            <div className="md:col-span-1"><AnalystDonut buy={data.analystAI.distribution.buy} hold={data.analystAI.distribution.hold} sell={data.analystAI.distribution.sell} /></div>
            <div className="md:col-span-1 opacity-75">{data.analystAI.note}</div>
          </div>
        ) : <div className="text-xs opacity-80">Loading…</div>}
      </div>

      {/* Latest News */}
      <div className="p-4 rounded-2xl bg-[#151515] border border-[#2A2A2A]">
        <div className="text-sm font-semibold mb-3">Latest News</div>
        <div className="flex flex-col gap-2">
          {data?.news?.slice(0,4).map(n => (
            <a key={n.id} href={n.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-4 p-3 rounded-lg bg-[#101010] border border-[#222] hover:bg-[#121212]">
              <div>
                <div className="text-sm">{n.title}</div>
                <div className="text-xs opacity-70 mt-1">{n.publisher} • {timeAgo(n.published_utc)}</div>
              </div>
              <div className={`text-xs px-2 py-1 rounded ${n.sentiment==='positive' ? 'bg-green-900/40 text-green-300' : n.sentiment==='negative' ? 'bg-red-900/40 text-red-300' : 'bg-zinc-800 text-zinc-200'}`}>
                {n.sentiment}
              </div>
            </a>
          ))}
          {!data?.news?.length && <div className="text-xs opacity-70">No news found.</div>}
        </div>
      </div>

      {/* Company Overview from SEC */}
      {data?.companyOverview && (
        <div className="p-4 rounded-2xl bg-[#151515] border border-[#2A2A2A]">
          <div className="text-sm font-semibold mb-2">Company Overview</div>
          <div className="text-xs opacity-85">{data.companyOverview}</div>
          <div className="text-[10px] opacity-60 mt-2">Source: SEC EDGAR</div>
        </div>
      )}

      {/* Ask AI box */}
      <div className="p-4 rounded-2xl bg-[#151515] border border-[#2A2A2A]">
        <div className="text-sm font-semibold mb-2">Ask AI about {symbol}</div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this company, fundamentals, risks, catalysts…"
          className="w-full h-24 p-2 rounded bg-[#101010] border border-[#222]"
        />
        <div className="mt-2 flex items-center gap-2">
          <button onClick={askAI} disabled={asking || !question.trim()} className="px-3 py-1 rounded bg-white/10 hover:bg:white/15 border border-white/10">
            {asking ? 'Thinking…' : 'Ask AI'}
          </button>
          {answer && <div className="text-xs opacity-80">{answer}</div>}
        </div>
      </div>
    </div>
  );
}
