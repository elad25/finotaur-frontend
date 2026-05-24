// components/BrokerConnectionModal.tsx
// ─────────────────────────────────────────────────────────────────────
// F1.A entry point — unified broker connections manager.
// 3 sections: Active Connections / Re-authenticate Required / Add New.
// Backed by useBrokerConnections (broker_connections table, post-F1.A).
// Tradovate connect form is delegated to the existing TradovateConnectModal
// to avoid duplicating credentials UX.
// ─────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  X, RefreshCw, AlertCircle, Link as LinkIcon, Trash2,
  CheckCircle2, Clock, Plus,
} from 'lucide-react';
import { BROKER_CONFIGS, BrokerName, BrokerConnection } from '@/lib/brokers/types';
import { useAuth } from '@/hooks/useAuth';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import TradovateConnectModal from '@/components/TradovateConnectModal';
import { statusBadge } from '@/components/broker/brokerStatusBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

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

// ── Active connection row ────────────────────────────────────────────
function ActiveConnectionRow({
  conn,
  onSync,
  onDisconnect,
  busy,
}: {
  conn: BrokerConnection;
  onSync: (id: string) => void;
  onDisconnect: (id: string) => void;
  busy: boolean;
}) {
  const badge = statusBadge(conn);
  const envLabel = conn.environment ? ` · ${String(conn.environment).toUpperCase()}` : '';
  return (
    <div
      className="bg-[#0A0A0A] border rounded-[14px] p-4 flex items-center gap-3"
      style={{ borderColor: BORDER_LIGHT }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-mono flex-shrink-0"
        style={{ background: `${brokerColor(conn.broker)}20`, color: brokerColor(conn.broker) }}
      >
        {brokerDisplay(conn.broker).substring(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#F4F4F4] text-sm font-medium truncate">
            {conn.connection_name || conn.account_name || brokerDisplay(conn.broker)}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider flex-shrink-0"
            style={{ color: badge.color, background: badge.bg }}
          >
            {badge.label}
          </span>
        </div>
        <div className="text-[11px] text-[#A0A0A0] flex items-center gap-2 flex-wrap">
          <span>{brokerDisplay(conn.broker)}{envLabel}</span>
          {conn.account_name && conn.connection_name !== conn.account_name && (
            <span className="text-[#666]">· acct {conn.account_name}</span>
          )}
          <span className="text-[#666]">· last sync {timeAgo(conn.last_sync_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onSync(conn.id)}
          disabled={busy}
          className="p-2 rounded-lg text-[#A0A0A0] hover:text-[#C9A646] hover:bg-[#C9A646]/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Sync now"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (confirm(`Disconnect ${brokerDisplay(conn.broker)} (${conn.account_name ?? conn.environment})?`)) {
              onDisconnect(conn.id);
            }
          }}
          disabled={busy}
          className="p-2 rounded-lg text-[#A0A0A0] hover:text-[#E36363] hover:bg-[#E36363]/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Disconnect"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Re-authenticate row ──────────────────────────────────────────────
function ReauthRow({
  conn,
  onReconnect,
  onRemove,
  busy,
}: {
  conn: BrokerConnection;
  onReconnect: (id: string) => void;
  onRemove: (id: string) => void;
  busy: boolean;
}) {
  const envLabel = conn.environment ? ` · ${String(conn.environment).toUpperCase()}` : '';
  return (
    <div
      className="bg-[#0A0A0A] border rounded-[14px] p-4 flex items-center gap-3 opacity-90"
      style={{ borderColor: 'rgba(227,99,99,0.15)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(227,99,99,0.1)' }}
      >
        <AlertCircle className="w-5 h-5 text-[#E36363]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[#F4F4F4] text-sm font-medium truncate">
          {conn.connection_name || conn.account_name || brokerDisplay(conn.broker)}
        </div>
        <div className="text-[11px] text-[#A0A0A0] mt-0.5 flex items-center gap-2 flex-wrap">
          <span>{brokerDisplay(conn.broker)}{envLabel}</span>
          {conn.account_name && conn.connection_name !== conn.account_name && (
            <span className="text-[#666]">· acct {conn.account_name}</span>
          )}
          <span className="text-[#E36363]">· {conn.last_error ?? 'Reconnecting...'}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onReconnect(conn.id)}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#C9A646] text-[#0A0A0A] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reconnect
        </button>
        <button
          onClick={() => {
            if (confirm(`Permanently remove ${brokerDisplay(conn.broker)} (${conn.account_name ?? conn.environment})? Portfolio history is preserved.`)) {
              onRemove(conn.id);
            }
          }}
          disabled={busy}
          className="p-2 rounded-lg text-[#A0A0A0] hover:text-[#E36363] hover:bg-[#E36363]/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Remove permanently"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Broker grid card (Add New section) ───────────────────────────────
function BrokerCard({
  broker,
  onPick,
}: {
  broker: BrokerName;
  onPick: (b: BrokerName) => void;
}) {
  const config = BROKER_CONFIGS[broker];
  const enabled = config.status === 'available' || config.status === 'beta';
  return (
    <button
      onClick={() => enabled && onPick(broker)}
      disabled={!enabled}
      className={`bg-[#0A0A0A] border rounded-[16px] p-4 text-left transition-all duration-300 ${
        enabled ? 'hover:border-[#C9A646]/30 cursor-pointer' : 'opacity-40 cursor-not-allowed'
      }`}
      style={{ borderColor: BORDER_LIGHT }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-mono"
          style={{ background: `${config.color}20`, color: config.color }}
        >
          {config.displayName.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[#F4F4F4] text-sm font-medium truncate">{config.displayName}</div>
          {config.status === 'beta' && (
            <span className="text-[10px] text-[#C9A646] uppercase tracking-wider">Beta</span>
          )}
          {config.status === 'coming_soon' && (
            <span className="text-[10px] text-[#A0A0A0] uppercase tracking-wider">Coming Soon</span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {config.features.oauth && (
          <span className="text-[9px] bg-[#C9A646]/10 text-[#C9A646] px-2 py-0.5 rounded">OAuth</span>
        )}
        {config.features.fileImport && (
          <span className="text-[9px] bg-[#4AD295]/10 text-[#4AD295] px-2 py-0.5 rounded">CSV</span>
        )}
        {config.features.webhook && (
          <span className="text-[9px] bg-[#5B9BFF]/10 text-[#5B9BFF] px-2 py-0.5 rounded">Webhook</span>
        )}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────
export default function BrokerConnectionModal({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const { connections: active, isLoading: loadingActive, syncNow, disconnect } =
    useBrokerConnections({ active: true });
  const { connections: inactive, isLoading: loadingInactive, reconnect, remove } =
    useBrokerConnections({ active: false });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [showTradovateConnect, setShowTradovateConnect] = useState(false);

  if (!isOpen) return null;

  const ibkrEnabled = import.meta.env.VITE_ENABLE_IBKR === 'true';
  const visibleBrokers = (Object.keys(BROKER_CONFIGS) as BrokerName[]).filter(
    (b) => b !== 'manual' && (b !== 'interactive_brokers' || ibkrEnabled),
  );

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

  const handlePickBroker = async (broker: BrokerName) => {
    if (broker === 'tradovate' && user) {
      // OAuth 2.0 path — calls oauth-start edge function for a signed authorize URL.
      // Falls back to the legacy username/password modal if OAuth start fails
      // (e.g. dashboard secrets not yet configured).
      try {
        const { getTradovateAuthorizationUrl } = await import(
          '@/lib/brokers/tradovate/tradovate-oauth'
        );
        const url = await getTradovateAuthorizationUrl('sandbox');
        window.location.href = url;
      } catch (err) {
        console.error('[BrokerConnectionModal] Tradovate OAuth start failed:', err);
        setShowTradovateConnect(true);
      }
      return;
    }
    if (broker === 'interactive_brokers' && user) {
      const { getIBAuthorizationUrl } = await import('@/lib/brokers/ib/ib-oauth');
      window.location.href = getIBAuthorizationUrl(user.id);
      return;
    }
    // Fallback: other brokers not implemented yet — caller already disabled them.
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-[#141414] border rounded-[20px] p-6 sm:p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(201,166,70,0.2)] animate-fadeIn max-h-[90vh] overflow-y-auto"
          style={{ borderColor: BORDER_LIGHT }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[#F4F4F4] text-xl font-semibold">Broker Connections</h3>
              <p className="text-[#A0A0A0] text-xs font-light mt-1">
                Manage how Finotaur receives your trades.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#A0A0A0] hover:text-[#F4F4F4] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section 1: Active */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-[#4AD295]" />
              <h4 className="text-[#F4F4F4] text-sm font-semibold uppercase tracking-wider">
                Active Connections
              </h4>
              <span className="text-[11px] text-[#A0A0A0]">({active.length})</span>
            </div>
            {!loadingActive && active.length > 0 && (
              <p className="text-[10px] text-[#A0A0A0]/70 mb-2 flex items-start gap-1.5">
                <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>
                  Auto-sync coming soon — click <RefreshCw className="w-3 h-3 inline-block align-text-bottom" /> Sync Now after each trade for now.
                </span>
              </p>
            )}
            {loadingActive ? (
              <div className="text-[#A0A0A0] text-sm py-4">Loading...</div>
            ) : active.length === 0 ? (
              <div
                className="bg-[#0A0A0A] border rounded-[14px] p-4 text-[#A0A0A0] text-sm text-center"
                style={{ borderColor: BORDER_LIGHT }}
              >
                No active connections. Add one below.
              </div>
            ) : (
              <div className="space-y-2">
                {active.map((c) => (
                  <ActiveConnectionRow
                    key={c.id}
                    conn={c}
                    onSync={wrapBusy(syncNow)}
                    onDisconnect={wrapBusy(disconnect)}
                    busy={busyId === c.id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Re-authenticate Required (only if any) */}
          {!loadingInactive && inactive.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-[#E36363]" />
                <h4 className="text-[#F4F4F4] text-sm font-semibold uppercase tracking-wider">
                  Re-authenticate Required
                </h4>
                <span className="text-[11px] text-[#A0A0A0]">({inactive.length})</span>
              </div>
              <div className="space-y-2">
                {inactive.map((c) => (
                  <ReauthRow
                    key={c.id}
                    conn={c}
                    onReconnect={wrapBusy(reconnect)}
                    onRemove={wrapBusy(remove)}
                    busy={busyId === c.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Section 3: Add New */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-4 h-4 text-[#C9A646]" />
              <h4 className="text-[#F4F4F4] text-sm font-semibold uppercase tracking-wider">
                Add New Broker
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {visibleBrokers.map((b) => (
                <BrokerCard key={b} broker={b} onPick={handlePickBroker} />
              ))}
            </div>
            <p className="text-[10px] text-[#666] mt-3 flex items-start gap-1.5">
              <LinkIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>
                Auto-sync updates trades in real time. CSV import is available from
                "Import Trades" in the dashboard header.
              </span>
            </p>
          </section>
        </div>
      </div>

      {/* Tradovate connect form (existing component, opened on demand) */}
      {showTradovateConnect && (
        <TradovateConnectModal
          initialStep="credentials"
          onClose={() => setShowTradovateConnect(false)}
        />
      )}
    </>
  );
}
