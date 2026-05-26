// src/services/upcomingEvents.api.ts
// =====================================================
// 📅 UPCOMING EVENTS — API client
// =====================================================
// Wraps fetch() to the Express server. Handles:
//   - Bearer token from Supabase session for public endpoints (Pro+ gating server-side)
//   - x-admin-key header from localStorage for admin endpoints (mirrors patternLibrary.api)
//   - Graceful failure (returns sentinel values, never throws on network errors)
// =====================================================

import { supabase } from '@/lib/supabase';
import type {
  UpcomingEvent,
  UpcomingEventAdmin,
  UpcomingEventCreate,
  UpcomingEventPatch,
  ListEventsResponse,
  ThesisResponse,
  ScanResponse,
  EventType,
} from '@/types/upcomingEvents';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  'https://finotaur-server-production.up.railway.app';

const ADMIN_KEY_LS = 'finotaur_admin_key'; // same key patternLibrary uses

// ─── Auth helpers ─────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function adminHeaders(): Record<string, string> {
  const key = localStorage.getItem(ADMIN_KEY_LS);
  return key ? { 'x-admin-key': key, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (Pro+ gated server-side via req.userTier middleware)
// ═══════════════════════════════════════════════════════════════════════

export interface ListEventsParams {
  days?: number;          // default 3 (RangeSelector default), server allows up to 90
  type?: EventType;
  ticker?: string;
  limit?: number;
}

/**
 * GET /api/upcoming-events/list
 * Returns events within `days` from today, optionally filtered by type/ticker.
 * Graceful failure: returns empty events array on any network/server error.
 */
export async function listEvents(
  params: ListEventsParams = {}
): Promise<ListEventsResponse> {
  const qs = new URLSearchParams();
  qs.set('days', String(params.days ?? 3));
  if (params.type) qs.set('type', params.type);
  if (params.ticker) qs.set('ticker', params.ticker);
  if (params.limit) qs.set('limit', String(params.limit));

  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/api/upcoming-events/list?${qs}`, { headers });
    if (!res.ok) {
      // 403 = not Pro+. 503 = backend down. Both → empty list, caller renders fallback.
      return { events: [], meta: { days: params.days ?? 3, type: null, ticker: null, count: 0 } };
    }
    return await res.json();
  } catch {
    return { events: [], meta: { days: params.days ?? 3, type: null, ticker: null, count: 0 } };
  }
}

/**
 * GET /api/upcoming-events/:id
 */
export async function getEvent(id: string): Promise<UpcomingEvent | null> {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/api/upcoming-events/${id}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data.event ?? null;
  } catch {
    return null;
  }
}

/**
 * GET /api/upcoming-events/:id/thesis
 * Server returns cached thesis if present; generates + caches on first call.
 * In-process Map lock ensures concurrent calls share one Anthropic call.
 */
export async function getThesis(id: string): Promise<ThesisResponse | null> {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/api/upcoming-events/${id}/thesis`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS (x-admin-key)
// ═══════════════════════════════════════════════════════════════════════

/**
 * POST /api/upcoming-events/admin/scan — force Perplexity scan now
 */
export async function adminScan(
  opts: { days?: number; eventTypes?: EventType[] } = {}
): Promise<ScanResponse | { error: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/upcoming-events/admin/scan`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(opts),
    });
    if (!res.ok) return { error: `scan_failed_${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'network_error' };
  }
}

/**
 * GET — admin variant that lists ALL events (including unpublished).
 * Note: server doesn't yet expose admin-list; this just calls public /list
 * with high days. Admin sees same data as Pro+ for now. If we need
 * unpublished view, add server route /admin/list later.
 */
export async function adminListAll(days = 90): Promise<UpcomingEvent[]> {
  const data = await listEvents({ days, limit: 200 });
  return data.events;
}

/**
 * POST /api/upcoming-events/admin/create
 */
export async function adminCreate(
  payload: UpcomingEventCreate
): Promise<UpcomingEventAdmin | { error: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/upcoming-events/admin/create`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body?.error ?? `create_failed_${res.status}` };
    }
    const body = await res.json();
    return body.event;
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'network_error' };
  }
}

/**
 * PATCH /api/upcoming-events/admin/:id
 */
export async function adminUpdate(
  id: string,
  patch: UpcomingEventPatch
): Promise<UpcomingEventAdmin | { error: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/upcoming-events/admin/${id}`, {
      method: 'PATCH',
      headers: adminHeaders(),
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body?.error ?? `update_failed_${res.status}` };
    }
    const body = await res.json();
    return body.event;
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'network_error' };
  }
}

/**
 * DELETE /api/upcoming-events/admin/:id
 */
export async function adminDelete(id: string): Promise<{ deleted: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/upcoming-events/admin/${id}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    });
    if (!res.ok) return { deleted: false, error: `delete_failed_${res.status}` };
    return { deleted: true };
  } catch (e) {
    return { deleted: false, error: e instanceof Error ? e.message : 'network_error' };
  }
}

/**
 * POST /api/upcoming-events/admin/:id/regenerate — force thesis regen
 */
export async function adminRegenerateThesis(
  id: string
): Promise<ThesisResponse | { error: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/upcoming-events/admin/${id}/regenerate`, {
      method: 'POST',
      headers: adminHeaders(),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body?.error ?? `regenerate_failed_${res.status}` };
    }
    return await res.json();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'network_error' };
  }
}
