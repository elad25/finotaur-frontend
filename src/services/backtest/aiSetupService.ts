// src/services/backtest/aiSetupService.ts
// ============================================================================
// AI SETUP SERVICE — calls the two /api/anthropic/backtest/* endpoints.
// Uses the project-canonical authFetch (Bearer token auto-injected from
// the current Supabase session). Follows the same pattern as WallStreetTab
// and MacroAnalyzer AI endpoints.
// ============================================================================

import { authFetch } from '@/utils/authFetch';
import type { SetupDefinition } from '@/core/auto/types';
import type { BacktestStatisticsLike } from '@/core/auto/AutoBacktestEngine';

const API_HOST =
  import.meta.env.VITE_API_URL ||
  'https://finotaur-server-production.up.railway.app';

const BACKTEST_BASE = `${API_HOST.replace(/\/$/, '')}/api/anthropic/backtest`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape returned by POST /api/anthropic/backtest/parse-setup */
export interface ParseSetupResponse {
  definition: Partial<SetupDefinition>;
  assumptions: string[];
  unsupported: string[];
}

/** Shape returned by POST /api/anthropic/backtest/analyze-result */
export interface ResultAnalysis {
  verdict: 'promising' | 'marginal' | 'weak' | 'insufficient-data';
  sampleSizeNote: string;
  strengths: string[];
  weaknesses: string[];
  optimizationIdeas: Array<{ change: string; rationale: string }>;
  summary: string;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Calls POST /api/anthropic/backtest/parse-setup with the user's plain-text
 * strategy description and returns a partial SetupDefinition plus assumption
 * and unsupported-feature lists.
 */
export async function parseSetupFromText(
  text: string,
): Promise<ParseSetupResponse> {
  const res = await authFetch(`${BACKTEST_BASE}/parse-setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`Setup parsing failed: ${res.status} ${res.statusText}`);
  }

  // Backend may wrap in { success, data } or return the shape directly.
  const json: unknown = await res.json();

  if (
    json !== null &&
    typeof json === 'object' &&
    'success' in json &&
    'data' in json
  ) {
    const wrapped = json as { success: boolean; data: ParseSetupResponse; error?: string };
    if (!wrapped.success) {
      throw new Error(wrapped.error ?? 'Setup parsing failed');
    }
    return wrapped.data;
  }

  return json as ParseSetupResponse;
}

/**
 * Calls POST /api/anthropic/backtest/analyze-result with backtest statistics
 * and a plain-text setup summary. Strips the heavy `equityCurve` array from
 * the statistics clone before posting to keep payload small.
 */
export async function analyzeBacktestResult(
  statistics: BacktestStatisticsLike,
  setupSummary: string,
): Promise<ResultAnalysis> {
  // Clone and strip the equityCurve to keep the payload small.
  const { equityCurve: _stripped, ...statisticsPayload } = statistics;

  const res = await authFetch(`${BACKTEST_BASE}/analyze-result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statistics: statisticsPayload, setupSummary }),
  });

  if (!res.ok) {
    throw new Error(`Result analysis failed: ${res.status} ${res.statusText}`);
  }

  const json: unknown = await res.json();

  if (
    json !== null &&
    typeof json === 'object' &&
    'success' in json &&
    'data' in json
  ) {
    const wrapped = json as { success: boolean; data: ResultAnalysis; error?: string };
    if (!wrapped.success) {
      throw new Error(wrapped.error ?? 'Result analysis failed');
    }
    return wrapped.data;
  }

  return json as ResultAnalysis;
}
