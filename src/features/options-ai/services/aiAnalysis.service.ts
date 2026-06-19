// src/features/options-ai/services/aiAnalysis.service.ts
// =====================================================
// AI ANALYSIS — Frontend Service
// =====================================================
// Calls backend at GET /api/options-ai/ai-analysis/:symbol
// Authenticated via authFetch (Bearer token auto-injected)
// Throws on HTTP error with the server's error message
// =====================================================

import type { AiAnalysisResult } from '../types/options-ai.types';
import { authFetch } from '@/utils/authFetch';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Fetch AI analysis for a given symbol.
 *
 * Success (HTTP 200):
 *   { symbol, analysis: AiAnalysis, meta: AiAnalysisMeta }
 * No-data (HTTP 200, analysis null):
 *   { symbol, analysis: null, meta: AiAnalysisMeta, message: string }
 * Error (HTTP 4xx/5xx):
 *   throws Error with the server's `error` field as message
 */
export async function fetchAiAnalysis(
  symbol: string,
  signal?: AbortSignal,
): Promise<AiAnalysisResult> {
  const url = `${API_BASE}/api/options-ai/ai-analysis/${encodeURIComponent(symbol.toUpperCase())}`;

  const res = await authFetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.error === 'string' && body.error) {
        message = body.error;
      }
    } catch {
      // JSON parse failed — keep the generic message
    }
    throw new Error(message);
  }

  return res.json() as Promise<AiAnalysisResult>;
}
