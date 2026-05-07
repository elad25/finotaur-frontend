// src/components/broker/brokerStatusBadge.ts
// ─────────────────────────────────────────────────────────────────────
// Pure visual helpers for broker connection status. Extracted from
// BrokerConnectionModal.tsx (F2.5) so the new Popover, the AddBrokerPopup,
// and the global "Connect Broker" button indicator can share one source
// of truth for status colors / labels.
// ─────────────────────────────────────────────────────────────────────

import type { BrokerConnection } from '@/lib/brokers/types';

/** Status pill (label + fg/bg colors) used in connection rows. */
export function statusBadge(conn: BrokerConnection): { label: string; color: string; bg: string } {
  switch (conn.status) {
    case 'connected':
      return { label: 'Connected', color: '#4AD295', bg: 'rgba(74,210,149,0.1)' };
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
  if (connections.some((c) => c.status === 'error')) return 'red';
  if (connections.some((c) => c.status === 'pending')) return 'yellow';
  if (connections.some((c) => c.status === 'connected')) return 'green';
  return null;
}
