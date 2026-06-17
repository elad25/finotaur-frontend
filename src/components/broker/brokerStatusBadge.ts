// src/components/broker/brokerStatusBadge.ts
// ─────────────────────────────────────────────────────────────────────
// Pure visual helpers for broker connection status. Extracted from
// BrokerConnectionModal.tsx (F2.5) so the new Popover, the AddBrokerPopup,
// and the global "Connect Broker" button indicator can share one source
// of truth for status colors / labels.
// ─────────────────────────────────────────────────────────────────────

import type { BrokerConnection } from '@/lib/brokers/types';

/**
 * Grace window before a `renewing` connection is treated as STUCK. A brief
 * silent retry is normal (token refresh between syncs); a connection that has
 * not completed a successful sync for this long is genuinely broken and must
 * be surfaced to the user.
 */
const STUCK_RENEWING_GRACE_MS = 45 * 60 * 1000; // 45 minutes

/**
 * True when a `renewing` connection has been failing long enough that it is no
 * longer a benign silent retry — the user should be prompted to reconnect.
 * Falls back to connected_at/created_at when there has never been a successful
 * sync, and stays silent (returns false) when there is no timestamp to judge by.
 */
export function isStuckRenewing(conn: BrokerConnection, now: number = Date.now()): boolean {
  if (conn.status !== 'renewing') return false;
  const ref = conn.last_successful_sync_at ?? conn.connected_at ?? conn.created_at ?? null;
  if (!ref) return false;
  const refMs = Date.parse(ref);
  if (Number.isNaN(refMs)) return false;
  return now - refMs > STUCK_RENEWING_GRACE_MS;
}

/**
 * Single source of truth for "this connection needs the user's attention"
 * (drives the Reconnect affordance). Connected = fine; renewing = fine UNLESS
 * stuck; every other status (error/canceled/degraded/pending/disconnected)
 * needs attention.
 */
export function connectionNeedsAttention(conn: BrokerConnection, now: number = Date.now()): boolean {
  if (conn.status === 'connected') return false;
  if (conn.status === 'renewing') return isStuckRenewing(conn, now);
  return true;
}

/** Status pill (label + fg/bg colors) used in connection rows. */
export function statusBadge(conn: BrokerConnection): { label: string; color: string; bg: string } {
  if (isStuckRenewing(conn)) {
    return { label: 'Reconnect needed', color: '#C9A646', bg: 'rgba(201,166,70,0.1)' };
  }
  switch (conn.status) {
    case 'connected':
      return { label: 'Connected', color: '#4AD295', bg: 'rgba(74,210,149,0.1)' };
    case 'renewing':
      // Silent retry — visually identical to connected so the user isn't alarmed
      return { label: 'Connected', color: '#4AD295', bg: 'rgba(74,210,149,0.1)' };
    case 'degraded':
      return { label: 'Reconnecting', color: '#C9A646', bg: 'rgba(201,166,70,0.1)' };
    case 'canceled':
      return { label: 'Subscription canceled', color: '#E36363', bg: 'rgba(227,99,99,0.1)' };
    case 'error':
      return { label: 'Error', color: '#E36363', bg: 'rgba(227,99,99,0.1)' };
    case 'pending':
      return { label: 'Pending', color: '#C9A646', bg: 'rgba(201,166,70,0.1)' };
    case 'disconnected':
    default:
      return { label: 'Disconnected', color: '#A0A0A0', bg: 'rgba(160,160,160,0.1)' };
  }
}

/** Solid color for the small dot rendered next to each connection row. */
export function statusDotColor(conn: BrokerConnection): string {
  return statusBadge(conn).color;
}

/**
 * Global indicator color for the "Connect Broker" button dot.
 * Priority (error wins): error → pending → connected → none.
 * Returns null when the dot should be hidden (no connections, or all
 * 'disconnected').
 */
export type AggregateDotColor = 'red' | 'yellow' | 'green' | null;

export function aggregateStatusDotColor(connections: BrokerConnection[]): AggregateDotColor {
  if (connections.length === 0) return null;
  if (connections.some((c) => c.status === 'error' || c.status === 'canceled')) return 'red';
  if (connections.some((c) => c.status === 'pending' || c.status === 'degraded' || isStuckRenewing(c))) return 'yellow';
  if (connections.every((c) => c.status === 'connected' || c.status === 'renewing')) return 'green';
  return null;
}
