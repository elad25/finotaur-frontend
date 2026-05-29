// src/hooks/crypto/useHeatmap.ts
// Thin wrapper over the existing /api/crypto/overview endpoint,
// shaped for the heatmap page. Reuses QUERY_TTL.heatmap (30s stale, 60s refetch).
// Crypto is 24/7 — no MarketStatusBadge needed.

import { useQuery } from '@tanstack/react-query';
import { QUERY_TTL } from '@/lib/queryClient';
import type { CoinMarketData } from '@/pages/app/crypto/_shared/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HeatmapCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap: number;
  market_cap_rank: number | null;
  current_price: number;
  price_change_percentage_24h: number | null;
}

export interface HeatmapData {
  coins: HeatmapCoin[];
  totalMcap: number;
  gainers: number;
  losers: number;
}

// ─── Fetcher ─────────────────────────────────────────────────────────────────

async function fetchHeatmapCoins(limit: number): Promise<HeatmapCoin[]> {
  const res = await fetch(`/api/crypto/overview?per_page=${limit}&page=1&sparkline=false`);
  if (!res.ok) throw new Error(`heatmap fetch failed: ${res.status}`);
  const raw = await res.json();
  // The overview endpoint may return { items: [...] } or a raw array
  const items: CoinMarketData[] = Array.isArray(raw) ? raw : raw?.items ?? [];
  return items.map((c) => ({
    id: c.id,
    symbol: c.symbol,
    name: c.name,
    image: c.image,
    market_cap: c.market_cap ?? 0,
    market_cap_rank: c.market_cap_rank ?? null,
    current_price: c.current_price ?? 0,
    price_change_percentage_24h: c.price_change_percentage_24h ?? null,
  }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHeatmap(limit = 100) {
  const query = useQuery<HeatmapCoin[], Error>({
    queryKey: ['heatmap', limit],
    queryFn: () => fetchHeatmapCoins(limit),
    ...QUERY_TTL.heatmap,
  });

  const coins = query.data ?? [];

  // Compute totals on the client — sort descending by market_cap for layout
  const sorted = [...coins].sort((a, b) => b.market_cap - a.market_cap);
  const totalMcap = sorted.reduce((s, c) => s + c.market_cap, 0);
  const gainers = sorted.filter((c) => (c.price_change_percentage_24h ?? 0) > 0).length;
  const losers = sorted.filter((c) => (c.price_change_percentage_24h ?? 0) < 0).length;

  return {
    ...query,
    coins: sorted,
    totalMcap,
    gainers,
    losers,
  };
}
