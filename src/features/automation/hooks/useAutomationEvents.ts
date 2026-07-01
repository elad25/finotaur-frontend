// src/features/automation/hooks/useAutomationEvents.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared react-query hook for reading `automation_events` — generalized from
// the `useRecentEvents` logic in `AgentStatusTab.tsx`. Use this anywhere a
// component needs recent risk-enforcement / copy-failure / agent event rows
// instead of duplicating the query.
// ─────────────────────────────────────────────────────────────────────────────

import { useTimedQuery } from '@/hooks/useTimedQuery';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import type { UseQueryResult } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutomationEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface UseAutomationEventsOptions {
  /** Restrict to specific event types via `.in('event_type', eventTypes)`. */
  eventTypes?: string[];
  /** Row cap. Defaults to 20. */
  limit?: number;
  /**
   * Reserved for future server-side filtering. `automation_events.payload`
   * currently carries the account reference, so filtering by account is
   * done client-side today — see `parseEnforcementEvent`.
   */
  accountId?: string | null;
}

interface UseAutomationEventsResult {
  events: AutomationEvent[];
  isLoading: boolean;
  isError: boolean;
  refetch: UseQueryResult<AutomationEvent[]>['refetch'];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Reads recent `automation_events` rows for the current effective user.
 * Generalized version of `AgentStatusTab`'s internal `useRecentEvents`.
 */
export function useAutomationEvents(opts?: UseAutomationEventsOptions): UseAutomationEventsResult {
  const { id: userId } = useEffectiveUser();
  const eventTypes = opts?.eventTypes;
  const limit = opts?.limit ?? 20;

  const query = useTimedQuery({
    queryKey: ['automation', 'events', userId, eventTypes ?? null, limit],
    queryFn: async (): Promise<AutomationEvent[]> => {
      let builder = supabase
        .from('automation_events')
        .select('id,event_type,payload,created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (eventTypes && eventTypes.length > 0) {
        builder = builder.in('event_type', eventTypes);
      }

      const { data, error } = await builder;
      if (error?.code === '42P01') return [];
      if (error) throw error;
      return (data ?? []) as AutomationEvent[];
    },
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  return {
    events: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// ---------------------------------------------------------------------------
// parseEnforcementEvent — defensive payload reader
// ---------------------------------------------------------------------------

/** Safely reads a string field from an unknown payload, trying multiple key aliases. */
function readString(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return null;
}

/**
 * Safely pulls common fields out of an `AutomationEvent.payload`, whose
 * shape varies by producer (agent vs. server-side enforcement). Never
 * assumes a key exists — every field falls back to `null` and `message`
 * always resolves to a short English summary.
 */
export function parseEnforcementEvent(e: AutomationEvent): {
  accountId: string | null;
  limit: string | null;
  action: string | null;
  message: string;
} {
  const payload = e.payload ?? {};

  const accountId = readString(payload, ['account_id', 'accountId', 'account']);
  const limit = readString(payload, ['limit', 'rule', 'check']);
  const action = readString(payload, ['action']);
  const explicitMessage = readString(payload, ['message', 'reason']);

  let message = explicitMessage;
  if (!message) {
    const parts: string[] = [];
    if (limit) parts.push(limit);
    if (action) parts.push(action);
    message = parts.length > 0 ? parts.join(' — ') : e.event_type;
  }

  return { accountId, limit, action, message };
}
