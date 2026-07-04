// src/services/copilotVerdictsApi.ts
// FINOTAUR — COPILOT per-holding Verdicts API.
// Mirrors the auth-header pattern used by copilotFundamentalsApi.ts /
// copilotSynthesisBriefApi.ts.

import { supabase } from '@/lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || '';
    const accessToken = session?.access_token || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    return headers;
  } catch {
    return {
      'Content-Type': 'application/json',
      'x-user-id': '',
    };
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VerdictType = 'BUY_MORE' | 'HOLD' | 'TRIM' | 'EXIT' | 'HEDGE';

export interface HoldingVerdict {
  symbol: string;
  underlying: string | null;
  assetClass: string | null;
  verdict: VerdictType;
  confidence: number | null;
  rationale: string | null;
  ruleTrace: unknown;
  portfolioPct: number | null;
  priceAtIssue: number | null;
  qtyAtIssue: number | null;
}

export interface HoldingVerdictsResponse {
  generatedAt: string | null;
  verdicts: HoldingVerdict[];
}

// ---------------------------------------------------------------------------
// Raw (wire) shape — server may emit camelCase or snake_case per field.
// Normalized defensively below; this type intentionally allows `unknown`
// for the whole payload shape since we don't control the wire contract.
// ---------------------------------------------------------------------------

interface RawHoldingVerdict {
  symbol?: unknown;
  underlying?: unknown;
  assetClass?: unknown;
  asset_class?: unknown;
  verdict?: unknown;
  confidence?: unknown;
  rationale?: unknown;
  ruleTrace?: unknown;
  rule_trace?: unknown;
  portfolioPct?: unknown;
  portfolio_pct?: unknown;
  priceAtIssue?: unknown;
  price_at_issue?: unknown;
  qtyAtIssue?: unknown;
  qty_at_issue?: unknown;
}

interface RawHoldingVerdictsResponse {
  generatedAt?: unknown;
  generated_at?: unknown;
  verdicts?: unknown;
}

const VALID_VERDICTS: readonly VerdictType[] = ['BUY_MORE', 'HOLD', 'TRIM', 'EXIT', 'HEDGE'];

function toNullableString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function toNullableNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function toVerdictType(v: unknown): VerdictType | null {
  return typeof v === 'string' && (VALID_VERDICTS as readonly string[]).includes(v)
    ? (v as VerdictType)
    : null;
}

/** Normalizes a single raw verdict entry, accepting camelCase or snake_case keys. */
function normalizeVerdict(raw: RawHoldingVerdict): HoldingVerdict | null {
  const symbol = toNullableString(raw.symbol);
  const verdict = toVerdictType(raw.verdict);
  if (!symbol || !verdict) return null; // malformed entry — skip gracefully

  return {
    symbol,
    underlying: toNullableString(raw.underlying),
    assetClass: toNullableString(raw.assetClass ?? raw.asset_class),
    verdict,
    confidence: toNullableNumber(raw.confidence),
    rationale: toNullableString(raw.rationale),
    ruleTrace: raw.ruleTrace ?? raw.rule_trace ?? null,
    portfolioPct: toNullableNumber(raw.portfolioPct ?? raw.portfolio_pct),
    priceAtIssue: toNullableNumber(raw.priceAtIssue ?? raw.price_at_issue),
    qtyAtIssue: toNullableNumber(raw.qtyAtIssue ?? raw.qty_at_issue),
  };
}

function normalizeResponse(raw: RawHoldingVerdictsResponse): HoldingVerdictsResponse {
  const rawVerdicts = Array.isArray(raw.verdicts) ? raw.verdicts : [];
  const verdicts = rawVerdicts
    .map((v) => normalizeVerdict((v ?? {}) as RawHoldingVerdict))
    .filter((v): v is HoldingVerdict => v !== null);

  return {
    generatedAt: toNullableString(raw.generatedAt ?? raw.generated_at),
    verdicts,
  };
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

/**
 * Fetches per-holding verdicts (BUY_MORE / HOLD / TRIM / EXIT / HEDGE) from
 * the weekly COPILOT analysis. Returns the empty-state shape
 * ({ generatedAt: null, verdicts: [] }) on any failure — callers must
 * handle the empty case gracefully rather than throwing.
 */
export async function fetchHoldingVerdicts(): Promise<HoldingVerdictsResponse> {
  const empty: HoldingVerdictsResponse = { generatedAt: null, verdicts: [] };

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/ai/copilot/verdicts`, { headers });

    if (!response.ok) return empty;

    const payload = (await response.json()) as RawHoldingVerdictsResponse;
    return normalizeResponse(payload ?? {});
  } catch {
    return empty;
  }
}
