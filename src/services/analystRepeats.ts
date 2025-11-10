// src/services/analystRepeats.ts
// Non-breaking typed client for the analyst endpoints.
export type RepeatRow = {
  symbol: string;
  count: number;
  upgrades: number;
  downgrades: number;
  lastDate: string | null;
};

export type RepeatsResponse = {
  from: string;
  to: string;
  total: number;
  repeats: RepeatRow[];
};

export async function fetchTopRepeats(opts?: { windowDays?: number; limit?: number }): Promise<RepeatsResponse> {
  const qs = new URLSearchParams();
  if (opts?.windowDays != null) qs.set("windowDays", String(opts.windowDays));
  if (opts?.limit != null) qs.set("limit", String(opts.limit));
  const r = await fetch(`/api/analyst/upgrades/repeats${qs.toString() ? `?${qs}` : ""}`, {
    headers: { "Accept": "application/json" },
  });
  if (!r.ok) throw new Error(`Failed HTTP ${r.status}`);
  return r.json();
}

export async function fetchRecent(limit = 30): Promise<{ from: string; to: string; total: number; items: any[] }>{{
  const r = await fetch(`/api/analyst/upgrades/recent?limit=${encodeURIComponent(String(limit))}`, {
    headers: { "Accept": "application/json" },
  });
  if (!r.ok) throw new Error(`Failed HTTP ${r.status}`);
  return r.json();
}
