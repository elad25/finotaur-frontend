// src/components/copyTrading/MirroredOrdersPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Compact "live mirrored orders" panel — bridges the visibility gap between a
// working-order mirror being placed and it filling. EnforcementFeed only
// shows discrete historical events; this derives the CURRENT set of orders
// that are still working (mirrored, not yet cancelled/filled) from the same
// automation_events stream.
//
// IMPORTANT: this is best-effort / observational, not authoritative order
// state. A fill that never produced an order_copy_* event (e.g. an older
// agent version, a gap in event delivery) will NOT be reflected here — it's
// a live snapshot derived purely from the event stream the agent reports,
// not a query against the broker's actual working orders. Treat it as a
// helpful visibility aid, not a source of truth for "what's really working".
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { Copy } from 'lucide-react';
import { Card, Eyebrow } from '@/components/ds/Card';
import { DataState } from '@/components/ds/DataState';
import { cn } from '@/lib/utils';
import {
  useAutomationEvents,
  type AutomationEvent,
} from '@/features/automation/hooks/useAutomationEvents';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Same inline relative-time approach used in EnforcementFeed.tsx. */
function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-US');
}

function readString(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return null;
}

function readNumber(payload: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

/** Defensively reads every `payload.per_target[].account`. */
function readAllTargetAccounts(payload: Record<string, unknown>): string[] {
  const perTarget = payload['per_target'];
  if (!Array.isArray(perTarget)) return [];
  return perTarget
    .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
    .map((t) => t['account'])
    .filter((a): a is string => typeof a === 'string' && a.length > 0);
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  limit: 'LIMIT',
  stop: 'STOP',
  stoplimit: 'STOP LIMIT',
  mit: 'MIT',
  market: 'MARKET',
};

interface LiveMirroredOrder {
  orderId: string;
  side: string | null;
  orderTypeLabel: string | null;
  symbol: string | null;
  price: number | null;
  targetAccounts: string[];
  updatedAt: string;
}

/**
 * Reduces the recent `order_copy_*` events into the set of orders still
 * working: `order_copy_executed` / `order_copy_modified` add or refresh an
 * entry keyed by the leader's `payload.order_id`; `order_copy_cancelled`
 * removes it. Events are read newest-first (per useAutomationEvents), so
 * each order_id's FIRST occurrence encountered here is its most recent
 * state — once seen (added or removed), later (older) events for the same
 * order_id are ignored.
 */
function deriveLiveOrders(events: AutomationEvent[]): LiveMirroredOrder[] {
  const seen = new Set<string>();
  const removed = new Set<string>();
  const live: LiveMirroredOrder[] = [];

  for (const e of events) {
    const payload = e.payload ?? {};
    const orderId = readString(payload, ['order_id']);
    if (!orderId || seen.has(orderId)) continue;
    seen.add(orderId);

    if (e.event_type === 'order_copy_cancelled') {
      removed.add(orderId);
      continue;
    }

    if (e.event_type !== 'order_copy_executed' && e.event_type !== 'order_copy_modified') continue;
    if (removed.has(orderId)) continue;

    const side = readString(payload, ['side'])?.toUpperCase() ?? null;
    const orderTypeRaw = readString(payload, ['order_type']);
    const orderTypeLabel = orderTypeRaw
      ? ORDER_TYPE_LABELS[orderTypeRaw.toLowerCase()] ?? orderTypeRaw.toUpperCase()
      : null;
    const symbol = e.symbol ?? readString(payload, ['symbol']);
    const limitPrice = readNumber(payload, ['limit_price']);
    const stopPrice = readNumber(payload, ['stop_price']);
    const price = limitPrice ?? stopPrice;
    const targetAccounts = readAllTargetAccounts(payload);

    live.push({
      orderId,
      side,
      orderTypeLabel,
      symbol,
      price,
      targetAccounts,
      updatedAt: e.created_at,
    });
  }

  return live;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface MirroredOrdersPanelProps {
  className?: string;
}

export function MirroredOrdersPanel({ className }: MirroredOrdersPanelProps) {
  const { events, isLoading, isError, refetch } = useAutomationEvents({
    eventTypes: ['order_copy_executed', 'order_copy_modified', 'order_copy_cancelled'],
    limit: 50,
  });

  const liveOrders = useMemo(() => deriveLiveOrders(events), [events]);

  return (
    <Card padding="compact" className={cn('space-y-3', className)}>
      <div className="flex items-center gap-ds-2">
        <Eyebrow>Mirrored orders</Eyebrow>
        {liveOrders.length > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-gold-primary/10 border border-gold-border px-1.5 py-0.5 text-[10px] font-semibold text-gold-muted">
            {liveOrders.length}
          </span>
        )}
      </div>

      <DataState
        isLoading={isLoading}
        isError={isError}
        data={liveOrders}
        onRetry={refetch}
        empty={
          <p className="text-sm text-zinc-500 py-4">
            No working mirrored orders right now.
          </p>
        }
      >
        {(data) => (
          <div className="space-y-1">
            {data.map((order) => {
              const head = [order.side, order.orderTypeLabel, order.symbol].filter(Boolean).join(' ');
              return (
                <div
                  key={order.orderId}
                  className="flex items-start justify-between gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-gold-primary/10 border border-gold-border text-gold-muted">
                      <Copy className="h-3 w-3" aria-hidden="true" />
                      Working
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-300 truncate">
                        {head || 'Order'}
                        {order.price != null ? ` @ ${order.price}` : ''}
                      </p>
                      {order.targetAccounts.length > 0 && (
                        <p className="text-xs text-zinc-600 truncate">
                          {order.targetAccounts.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600 shrink-0">
                    {formatRelative(order.updatedAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </DataState>
    </Card>
  );
}

export default MirroredOrdersPanel;
