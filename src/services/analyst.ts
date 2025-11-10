export type AnalystItem = {
  symbol: string;
  firm: string | null;
  date: string;
  action: string; // upgrade | downgrade | maintains | reiterate | initiate
  fromRating: string | null;
  toRating: string | null;
  fromTarget?: number | null;
  toTarget?: number | null;
  url?: string | null;
};

export type AnalystRatingsResponse = {
  symbol: string;
  price: number | null;
  counts: { last90d: number; last30d: number };
  probability: { up: number | null; down: number | null };
  items: AnalystItem[];
};

export async function getAnalystRatings(symbol: string): Promise<AnalystRatingsResponse> {
  const r = await fetch(`/api/analyst/ratings?symbol=${encodeURIComponent(symbol)}`, {
    headers: { 'Accept': 'application/json' }
  });
  if (!r.ok) throw new Error(`Failed to fetch analyst ratings: ${r.status}`);
  return r.json();
}
