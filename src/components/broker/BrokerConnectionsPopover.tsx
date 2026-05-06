// src/components/broker/BrokerConnectionsPopover.tsx
// ─────────────────────────────────────────────────────────────────────
// F2.5 broker connection manager — replaces BrokerConnectionModal.
// Compact Popover (desktop) / Sheet (mobile <768px) anchored to the
// dashboard "Connect Broker" button. Renders active + re-auth rows,
// preserves L4 sync toasts via useBrokerConnections, and exposes an
// "Add new connection" CTA that delegates to AddBrokerPopup (parent-
// owned). Disconnect/Remove are intentionally absent in F2.5 (OQ-57).
// ─────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  RefreshCw, AlertCircle, Plus, CheckCircle2, Clock, Link as LinkIcon,
} from 'lucide-react';
import { BROKER_CONFIGS, BrokerName, BrokerConnection } from '@/lib/brokers/types';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { statusBadge } from '@/components/broker/brokerStatusBadge';

const BORDER_LIGHT = 'rgba(255, 215, 0, 0.08)';

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function brokerDisplay(broker: string): string {
  return BROKER_CONFIGS[broker as BrokerName]?.displayName ?? broker;
}

function brokerColor(broker: string): string {
  return BROKER_CONFIGS[broker as BrokerName]?.color ?? '#C9A646';
}

interface Props {
  children: React.ReactNode;
  onAddConnection?: () => void;
}

// ── Connection row (active OR re-auth, distinguished by props) ───────
function ConnectionRow({
  conn,
  busy,
  onSync,
  onReconnect,
}: {
  conn: BrokerConnection;
  busy: boolean;
  onSync?: (id: string) => void;
  onReconnect?: (id: string) => void;
}) {
  const badge = statusBadge(conn);
  const envLabel = conn.environment ? ` · ${String(conn.environment).toUpperCase()}` : '';
  const isReauth = !!onReconnect;

  const handleRowClick = () => {
    if (isReauth && onReconnect && !busy) onReconnect(conn.id);
  };

  return (
    <div
      onClick={handleRowClick}
      className={`bg-[#0A0A0A] border rounded-[12px] p-3 flex items-center gap-3 ${
        isReauth ? 'cursor-pointer hover:border-[#E36363]/40 transition-colors' : ''
      }`}
      style={{ borderColor: isReauth ? 'rgba(227,99,99,0.15)' : BORDER_LIGHT }}
      title={isReauth ? 'Click to reconnect' : undefined}
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: badge.color, boxShadow: `0 0 6px ${badge.color}` }}
        aria-label={badge.label}
      />
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-mono flex-shrink-0"
        style={{ background: `${brokerColor(conn.broker)}20`, color: brokerColor(conn.broker) }}
      >
        {brokerDisplay(conn.broker).substring(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[#F4F4F4] text-[13px] font-medium truncate">
          {conn.connection_name || conn.account_name || brokerDisplay(conn.broker)}
        </div>
        <div className="text-[10px] text-[#A0A0A0] truncate">
          <span>{brokerDisplay(conn.broker)}{envLabel}</span>
          {isReauth ? (
            <span className="text-[#E36363]"> · {conn.last_error || 'click to reconnect'}</span>
          ) : (
            <span className="text-[#666]"> · last sync {timeAgo(conn.last_sync_at)}</span>
          )}
        </div>
      </div>
      {!isReauth && onSync && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSync(conn.id);
          }}
          disabled={busy}
          className="p-1.5 rounded-md text-[#A0A0A0] hover:text-[#C9A646] hover:bg-[#C9A646]/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Sync now"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
        </button>
      )}
      {isReauth && (
        <AlertCircle className="w-4 h-4 text-[#E36363] flex-shrink-0" />
      )}
    </div>
  );
}

// ── Body shared by Popover + Sheet ───────────────────────────────────
function PopoverBody({ onAddConnection }: { onAddConnection?: () => void }) {
  const {
    connections: active,
    isLoading: loadingActive,
    syncNow,
  } = useBrokerConnections({ active: true });
  const {
    connections: inactive,
    isLoading: loadingInactive,
    reconnect,
  } = useBrokerConnections({ active: false });

  const [busyId, setBusyId] = useState<string | null>(null);

  const wrapBusy =
    <T,>(fn: (id: string) => Promise<T>) =>
    async (id: string) => {
      setBusyId(id);
      try {
        await fn(id);
      } finally {
        setBusyId(null);
      }
    };

  const showEmpty =
    !loadingActive && !loadingInactive && active.length === 0 && inactive.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="px-1">
        <h3 className="text-[#F4F4F4] text-sm font-semibold">Broker Connections</h3>
        <p className="text-[10px] text-[#A0A0A0] mt-0.5 font-light">
          Manage how Finotaur receives your trades.
        </p>
      </div>

      {!loadingActive && active.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 px-1">
            <CheckCircle2 className="w-3 h-3 text-[#4AD295]" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
              Active ({active.length})
            </span>
          </div>
          {active.map((c) => (
            <ConnectionRow
              key={c.id}
              conn={c}
              busy={busyId === c.id}
              onSync={wrapBusy(syncNow)}
            />
          ))}
        </section>
      )}

      {!loadingInactive && inactive.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 px-1">
            <Clock className="w-3 h-3 text-[#E36363]" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
              Re-authenticate ({inactive.length})
            </span>
          </div>
          {inactive.map((c) => (
            <ConnectionRow
              key={c.id}
              conn={c}
              busy={busyId === c.id}
              onReconnect={wrapBusy(reconnect)}
            />
          ))}
        </section>
      )}

      {(loadingActive || loadingInactive) && (
        <div className="text-[#A0A0A0] text-xs py-2 text-center">Loading...</div>
      )}

      {showEmpty && (
        <div
          className="bg-[#0A0A0A] border rounded-[12px] p-4 text-center"
          style={{ borderColor: BORDER_LIGHT }}
        >
          <p className="text-[#A0A0A0] text-xs">No broker connections yet.</p>
          <p className="text-[#666] text-[10px] mt-1">
            Connect a broker to start syncing trades.
          </p>
        </div>
      )}

      <button
        onClick={onAddConnection}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[10px] border border-[#C9A646]/30 text-[#C9A646] text-xs font-medium hover:bg-[#C9A646]/10 hover:border-[#C9A646]/50 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add new connection
      </button>

      {!loadingActive && active.length > 0 && (
        <p className="text-[9px] text-[#666] flex items-start gap-1.5 px-1 leading-snug">
          <LinkIcon className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
          <span>
            Auto-sync coming soon — click{' '}
            <RefreshCw className="w-2.5 h-2.5 inline-block align-text-bottom" /> Sync Now
            after each trade for now.
          </span>
        </p>
      )}
    </div>
  );
}

// ── Wrapper: Popover (desktop) or Sheet (mobile <768px) ──────────────
export default function BrokerConnectionsPopover({ children, onAddConnection }: Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="bg-[#141414] border-t rounded-t-[20px] max-h-[85vh] overflow-y-auto p-4"
          style={{ borderColor: BORDER_LIGHT }}
        >
          <PopoverBody onAddConnection={onAddConnection} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="bg-[#141414] border rounded-[16px] w-[360px] max-h-[80vh] overflow-y-auto p-3 shadow-[0_0_30px_rgba(201,166,70,0.15)]"
        style={{ borderColor: BORDER_LIGHT }}
      >
        <PopoverBody onAddConnection={onAddConnection} />
      </PopoverContent>
    </Popover>
  );
}
