// src/services/patternLibrary.api.ts
// ─────────────────────────────────────────────────────────────────────────
// Pattern Library admin API client — Catalyst Intelligence Deck (Tree #2).
// Created 2026-05-26.
//
// Backend: finotaur-server `/api/patterns/*` (see patternLibrary.js).
// Auth: x-admin-key header, sourced from localStorage('finotaur_admin_key').
// First-time use: the consuming page prompts the admin to paste the key.
// ─────────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const ADMIN_KEY_STORAGE = 'finotaur_admin_key';

export function getAdminKey(): string | null {
  return localStorage.getItem(ADMIN_KEY_STORAGE);
}

export function setAdminKey(key: string): void {
  localStorage.setItem(ADMIN_KEY_STORAGE, key.trim());
}

export function clearAdminKey(): void {
  localStorage.removeItem(ADMIN_KEY_STORAGE);
}

function adminHeaders(): HeadersInit {
  const key = getAdminKey();
  return {
    'Content-Type': 'application/json',
    ...(key ? { 'x-admin-key': key } : {}),
  };
}

// ─── Types matching server output ────────────────────────────────────────
export type CatalystCategory =
  | 'regulation'
  | 'gov_procurement'
  | 'trade_policy'
  | 'subsidy'
  | 'geopolitical'
  | 'court_ruling'
  | 'fda_binary'
  | 'state_mandate';

export type Direction = 'LONG' | 'SHORT';

export interface FirstCatalyst {
  date: string;
  category: CatalystCategory;
  sector?: string | null;
  summary: string;
  earliest_signal: string;
  source_url?: string | null;
}

export interface SecondCatalyst {
  date: string;
  category: CatalystCategory;
  summary: string;
  role: 'confirmation' | 'extension' | 'amplifier';
  source_url?: string | null;
}

export interface AnalysisResult {
  ok: boolean;
  used: number;
  cap: number;
  move: {
    ticker: string;
    moveStartDate: string;
    moveEndDate: string;
    returnPct: number;
    direction: Direction;
    startPrice: number;
    endPrice: number;
  };
  newsEventsCount: number;
  analysis: {
    first_catalyst: FirstCatalyst | null;
    second_catalyst: SecondCatalyst | null;
    mechanism: string;
    replication_signals: string[];
  };
  cost?: {
    perplexity_usage?: Record<string, number>;
    anthropic_usage?: Record<string, number>;
    perplexity_duration_ms?: number;
    anthropic_duration_ms?: number;
  };
}

export interface SavedPattern {
  id: string;
  ticker: string;
  move_start_date: string;
  move_end_date: string;
  return_pct: number;
  direction: Direction;
  first_catalyst_date: string;
  first_catalyst_category: CatalystCategory;
  first_catalyst_sector: string | null;
  first_catalyst_summary: string;
  first_catalyst_earliest_signal: string;
  first_catalyst_source_url: string | null;
  second_catalyst_date: string | null;
  second_catalyst_category: CatalystCategory | null;
  second_catalyst_summary: string | null;
  second_catalyst_role: string | null;
  second_catalyst_source_url: string | null;
  mechanism: string;
  replication_signals: string[];
  admin_reviewed: boolean;
  admin_notes: string | null;
  analysis_cost_usd: number | null;
  created_at: string;
  updated_at: string;
}

export interface ListFilters {
  limit?: number;
  category?: CatalystCategory;
  direction?: Direction;
  sector?: string;
}

// ─── API methods ─────────────────────────────────────────────────────────
export async function analyzePattern(ticker: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE}/api/patterns/analyze`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ ticker: ticker.trim().toUpperCase() }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `analyze failed: ${res.status}`);
  }
  return res.json();
}

export interface SavePayload {
  ticker: string;
  move_start_date: string;
  move_end_date: string;
  return_pct: number;
  direction: Direction;
  first_catalyst: FirstCatalyst;
  second_catalyst?: SecondCatalyst | null;
  mechanism: string;
  replication_signals: string[];
  admin_reviewed?: boolean;
  admin_notes?: string | null;
  analysis_cost_usd?: number | null;
}

export async function savePattern(
  payload: SavePayload
): Promise<{ ok: boolean; pattern: SavedPattern }> {
  const res = await fetch(`${API_BASE}/api/patterns/save`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `save failed: ${res.status}`);
  }
  return res.json();
}

export async function listPatterns(
  filters: ListFilters = {}
): Promise<{ ok: boolean; patterns: SavedPattern[] }> {
  const qs = new URLSearchParams();
  if (filters.limit) qs.set('limit', String(filters.limit));
  if (filters.category) qs.set('category', filters.category);
  if (filters.direction) qs.set('direction', filters.direction);
  if (filters.sector) qs.set('sector', filters.sector);

  const res = await fetch(`${API_BASE}/api/patterns/list?${qs}`, {
    method: 'GET',
    headers: adminHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `list failed: ${res.status}`);
  }
  return res.json();
}

export async function getPattern(
  id: string
): Promise<{ ok: boolean; pattern: SavedPattern }> {
  const res = await fetch(`${API_BASE}/api/patterns/${id}`, {
    method: 'GET',
    headers: adminHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `get failed: ${res.status}`);
  }
  return res.json();
}
