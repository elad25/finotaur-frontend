// src/services/macroService.ts
import type { Request, Response } from "express";

const FRED_BASE = "https://api.stlouisfed.org/fred";
const FRED_API_KEY = process.env.FRED_API_KEY || "";

async function fetchJSON(url: string) {
  const r = await fetch(url);
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`FRED request failed ${r.status}: ${text}`);
  }
  return r.json();
}

// Return last few GDP observations from FRED GDP series
export async function getFredGDP(req: Request, res: Response) {
  try {
    if (!FRED_API_KEY) return res.status(500).json({ error: "FRED_API_KEY missing" });
    const url = `${FRED_BASE}/series/observations?series_id=GDP&api_key=${FRED_API_KEY}&file_type=json`;
    const data = await fetchJSON(url);
    const observations = Array.isArray(data?.observations) ? data.observations.slice(-12) : [];
    return res.json({ series: "GDP", observations });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to fetch GDP" });
  }
}

// Compute YoY inflation from CPIAUCSL (CPI, seasonally adjusted)
export async function getFredInflation(req: Request, res: Response) {
  try {
    if (!FRED_API_KEY) return res.status(500).json({ error: "FRED_API_KEY missing" });
    const url = `${FRED_BASE}/series/observations?series_id=CPIAUCSL&api_key=${FRED_API_KEY}&file_type=json`;
    const data = await fetchJSON(url);
    const obs = Array.isArray(data?.observations) ? data.observations : [];
    if (obs.length < 13) return res.json({ series: "CPIAUCSL", yoy: null, observations: obs.slice(-13) });

    const last = parseFloat(obs[obs.length - 1].value);
    const prevYear = parseFloat(obs[obs.length - 13].value);
    const yoy = isFinite(last) && isFinite(prevYear) && prevYear !== 0 ? ((last - prevYear) / prevYear) * 100 : null;
    return res.json({ series: "CPIAUCSL", yoy, observations: obs.slice(-13) });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to fetch inflation" });
  }
}
