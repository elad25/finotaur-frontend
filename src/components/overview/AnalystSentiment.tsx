import React, { useEffect, useState } from "react";

type Props = { symbol: string };
type Sentiment = {
  buy?: number;
  hold?: number;
  sell?: number;
  targetAvg?: number;
  targetHigh?: number;
  targetLow?: number;
};

async function fetchSentiment(symbol: string): Promise<Sentiment | null> {
  const r = await fetch(`/api/analytics/sentiment?symbol=${encodeURIComponent(symbol)}`);
  if (!r.ok) return null;
  return await r.json();
}

export const AnalystSentiment: React.FC<Props> = ({ symbol }) => {
  const [s, setS] = useState<Sentiment | null>(null);
  useEffect(() => void fetchSentiment(symbol).then(setS), [symbol]);

  const pct = (n?: number) => (n != null ? `${Math.round(n * 100)}%` : "0%");

  return (
    <div>
      <div className="text-sm font-medium mb-3">Analyst Consensus</div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-xs opacity-70">Buy</div>
          <div className="h-2 bg-neutral-800 rounded">
            <div className="h-2 rounded bg-emerald-600" style={{ width: pct(s?.buy) }} />
          </div>
          <div className="text-xs mt-1">{pct(s?.buy)}</div>
        </div>
        <div>
          <div className="text-xs opacity-70">Hold</div>
          <div className="h-2 bg-neutral-800 rounded">
            <div className="h-2 rounded bg-yellow-600" style={{ width: pct(s?.hold) }} />
          </div>
          <div className="text-xs mt-1">{pct(s?.hold)}</div>
        </div>
        <div>
          <div className="text-xs opacity-70">Sell</div>
          <div className="h-2 bg-neutral-800 rounded">
            <div className="h-2 rounded bg-red-600" style={{ width: pct(s?.sell) }} />
          </div>
          <div className="text-xs mt-1">{pct(s?.sell)}</div>
        </div>
      </div>

      <div className="text-xs opacity-80 mt-3">
        Target Price — Avg: <span className="opacity-100">{s?.targetAvg ?? "—"}</span> · High: <span className="opacity-100">{s?.targetHigh ?? "—"}</span> · Low: <span className="opacity-100">{s?.targetLow ?? "—"}</span>
      </div>
    </div>
  );
};