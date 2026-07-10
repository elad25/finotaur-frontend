// src/lib/reports/reportApi.ts
// =====================================================
// FINO REPORTS — server API client
// =====================================================
// Thin, fail-soft fetchers for the AI takeaway layer. Every report must
// render fully from client-computed data with NO server call at all —
// these functions only ever ADD a short AI-written sentence on top. Any
// network/parse error resolves to `null`, never throws, so callers can
// always fall back to the deterministic copy baked into each slide.
// =====================================================

import { authFetch } from '@/utils/authFetch';
import type {
  ReportTakeawaysRequest,
  ReportTakeawaysResponse,
  MarketsReportResponse,
} from './reportTypes';

export const REPORTS_API_BASE = '/api/ai-reports';

/**
 * POST /api/ai-reports/report-takeaways
 * One call per report render — batches every unlocked slide's compact
 * stats JSON and gets back a takeaway sentence per slide key.
 */
export async function fetchTakeaways(
  body: ReportTakeawaysRequest,
): Promise<ReportTakeawaysResponse | null> {
  try {
    const res = await authFetch(`${REPORTS_API_BASE}/report-takeaways`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== 'object' || !data.takeaways) return null;
    return data as ReportTakeawaysResponse;
  } catch (err) {
    console.warn('[reportApi] fetchTakeaways failed — falling back to deterministic copy:', err);
    return null;
  }
}

/**
 * GET /api/ai-reports/markets-report
 * Server-cached daily markets narrative. Open to all tiers.
 */
export async function fetchMarketsReport(): Promise<MarketsReportResponse | null> {
  try {
    const res = await authFetch(`${REPORTS_API_BASE}/markets-report`);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== 'object' || !data.report) return null;
    return data as MarketsReportResponse;
  } catch (err) {
    console.warn('[reportApi] fetchMarketsReport failed — showing warming-up state:', err);
    return null;
  }
}
