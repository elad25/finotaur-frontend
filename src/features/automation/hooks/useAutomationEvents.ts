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
  broker_connection_id: string | null;
  symbol: string | null;
  severity: string | null;
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
        .select('id,event_type,payload,created_at,broker_connection_id,symbol,severity')
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

/** Safely reads a numeric field from an unknown payload, trying multiple key aliases. */
function readNumber(payload: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

/** Prettifies an unrecognized snake_case key into readable English (fallback only). */
function prettify(raw: string): string {
  return raw
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** `check` (the risk limit that fired) → short human English label. */
const CHECK_LABELS: Record<string, string> = {
  daily_loss: 'Daily loss limit',
  trade_profit_target: 'Trade profit target',
  max_position_usd: 'Max position $',
  tilt_loss_streak: 'Tilt streak',
  weekly_loss: 'Weekly loss limit',
  daily_profit_target: 'Daily profit target',
  weekly_profit_target: 'Weekly profit target',
  max_contracts: 'Max contracts',
  max_trades_per_day: 'Max trades/day',
  max_loss_per_trade_usd: 'Max loss per trade',
};

/** `action` (what the agent did in response) → short human English label. */
const ACTION_LABELS: Record<string, string> = {
  close_lock: 'account locked',
  stop_copies: 'copies stopped',
  flatten_symbol: 'symbol flattened',
  pause_copies: 'copies paused',
};

/** Exported so callers (e.g. `ManageRiskTab`) can render the same human label for `parsed.check`. */
export function humanizeCheck(check: string | null): string | null {
  if (!check) return null;
  return CHECK_LABELS[check] ?? prettify(check);
}

function humanizeAction(action: string | null): string | null {
  if (!action) return null;
  return ACTION_LABELS[action] ?? prettify(action);
}

/** Formats a number as compact USD (e.g. `$10`, `$-250`, `$607,090`). Sign is preserved as-is. */
function formatUsd(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

/**
 * Builds the short parenthetical value suffix for a `risk_enforced` message,
 * e.g. ` (target $10)`, ` ($-250 vs $-20)`, ` ($607,090 > $1,000)`. Returns
 * '' when no recognizable value pair is present in the payload.
 */
function buildValueSuffix(payload: Record<string, unknown>): string {
  const target = readNumber(payload, ['target']);
  const unrealizedPnl = readNumber(payload, ['unrealized_pnl']);
  if (target != null && unrealizedPnl != null) {
    return ` (target ${formatUsd(target)}, unrealized ${formatUsd(unrealizedPnl)})`;
  }
  if (target != null) {
    return ` (target ${formatUsd(target)})`;
  }

  const threshold = readNumber(payload, ['threshold']);
  const totalPnl = readNumber(payload, ['total_pnl']);
  const realizedPnl = readNumber(payload, ['realized_pnl']);
  const pnlValue = totalPnl ?? realizedPnl;
  if (threshold != null && pnlValue != null) {
    return ` (${formatUsd(pnlValue)} vs ${formatUsd(threshold)})`;
  }

  const maxAllowed = readNumber(payload, ['max_allowed']);
  const positionUsd = readNumber(payload, ['position_usd']);
  if (maxAllowed != null && positionUsd != null) {
    return ` (${formatUsd(positionUsd)} > ${formatUsd(maxAllowed)})`;
  }

  return '';
}

/** Defensively reads `payload.per_target[0].account` — arrays/shape may be missing. */
function readFirstTargetAccount(payload: Record<string, unknown>): string | null {
  const perTarget = payload['per_target'];
  if (!Array.isArray(perTarget) || perTarget.length === 0) return null;
  const first = perTarget[0];
  if (typeof first !== 'object' || first === null) return null;
  const account = (first as Record<string, unknown>)['account'];
  return typeof account === 'string' && account.length > 0 ? account : null;
}

/** Defensively reads `payload.per_target[0].reason`. */
function readFirstTargetReason(payload: Record<string, unknown>): string | null {
  const perTarget = payload['per_target'];
  if (!Array.isArray(perTarget) || perTarget.length === 0) return null;
  const first = perTarget[0];
  if (typeof first !== 'object' || first === null) return null;
  const reason = (first as Record<string, unknown>)['reason'];
  return typeof reason === 'string' && reason.length > 0 ? reason : null;
}

export interface ParsedEnforcementEvent {
  /** The risk rule that fired, e.g. from `payload.rule_id`. NOT present for copy_failed. */
  ruleId: string | null;
  /** Human-readable rule label, e.g. `payload.rule_label` ("SIM TEST v140"). */
  ruleLabel: string | null;
  /** The raw check name that fired, e.g. "daily_loss". */
  check: string | null;
  /** The raw action taken, e.g. "close_lock", "stop_copies", "flatten_symbol", "pause_copies". */
  action: string | null;
  /**
   * Account name, when derivable from the payload. `risk_enforced` events do
   * NOT carry an account reference (link via `ruleId` instead) — this is
   * always `null` for that event type. `copy_failed` events carry it via
   * `per_target[0].account` or `source_account`.
   */
  accountName: string | null;
  /** Instrument symbol, when present (event column first, then payload). */
  symbol: string | null;
  /** Concise English human summary — always resolves to something, never empty. */
  message: string;
}

/**
 * Safely pulls common fields out of an `AutomationEvent.payload`, whose
 * shape varies by producer/event_type. Never assumes a key exists — every
 * field falls back to `null` and `message` always resolves to a short
 * English summary.
 *
 * Verified real prod shapes (2026-07-01):
 * - `risk_enforced` has NO account field in payload — link to an account
 *   only via `ruleId` (matched against `automation_risk_rules.id`).
 * - `copy_failed` DOES carry an account, via `per_target[0].account` or
 *   `source_account`.
 */
export function parseEnforcementEvent(e: AutomationEvent): ParsedEnforcementEvent {
  const payload = e.payload ?? {};

  const ruleId = readString(payload, ['rule_id']);
  const ruleLabel = readString(payload, ['rule_label']);
  const check = readString(payload, ['check']);
  const action = readString(payload, ['action']);
  const symbol = e.symbol ?? readString(payload, ['symbol']);

  let accountName: string | null = null;
  if (e.event_type === 'copy_failed') {
    accountName = readFirstTargetAccount(payload) ?? readString(payload, ['source_account']);
  }
  // risk_enforced: no account field in payload by design — stays null.

  let message: string;
  if (e.event_type === 'risk_enforced') {
    const label = ruleLabel ?? 'Risk rule';
    const checkLabel = humanizeCheck(check);
    const actionLabel = humanizeAction(action);
    const core = [checkLabel, actionLabel].filter(Boolean).join(' → ');
    message = core ? `${label}: ${core}${buildValueSuffix(payload)}` : `${label}: ${e.event_type}`;
  } else if (e.event_type === 'copy_failed') {
    const reason = readFirstTargetReason(payload) ?? 'blocked';
    message = `Copy blocked on ${accountName ?? 'account'} — ${reason}`;
  } else {
    message = e.event_type;
  }

  return { ruleId, ruleLabel, check, action, accountName, symbol, message };
}
