// src/hooks/useOverview.ts
import { useEffect, useState } from "react";

export type MarketSnapshot = {
  marketCap: number | null;
  pe: number | null;
  beta: number | null;
  dividendYield: number | null;
  avgVolume: number | null;
};

export type NewsItem = {
  id: string | number;
  title: string;
  url: string;
  publisher: string;
  published_utc: string;
  tickers?: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  category: string[];
};

export type FinotaurScore = {
  score: number;
  tagline: string;
  parts: { profitability: number; growth: number; risk: number; valuation: number };
};

export type OverviewPayload = {
  symbol: string;
  companyName: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  dayRange: { low: number | null; high: number | null };
  week52Range: { low: number | null; high: number | null };
  marketSnapshot: MarketSnapshot;
  finotaurScore: FinotaurScore;
  miniInsight: string;
  analystAI: { distribution: { buy: number; hold: number; sell: number }, targets: { average: number; high: number; low: number }, note: string };
  forecastAI: { revenueGrowthProb: number; marginExpansionProb: number };
  news: NewsItem[];
  updatedAt: string;
};

export function useOverview(symbolFromProps?: string) {
  const [symbol, setSymbol] = useState<string | null>(symbolFromProps || null);
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      const sp = new URLSearchParams(window.location.search);
      const s = (sp.get('symbol') || sp.get('ticker'));
      if (s) setSymbol(s.toUpperCase());
    }
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    fetch(`/api/overview?symbol=${encodeURIComponent(symbol)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [symbol]);

  return { symbol, setSymbol, data, loading, error };
}
