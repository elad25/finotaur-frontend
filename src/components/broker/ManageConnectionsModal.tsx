// src/components/broker/ManageConnectionsModal.tsx
// Broker-agnostic "Manage Connections" modal.
// Shows ALL active journal connections (one row per connection, not per account).
// Replaces the Tradovate-only manage step in TradovateConnectModal as the
// entry point for every "Manage Connections" trigger in the Journal.

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link2, Trash2, X, RefreshCw } from 'lucide-react';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { usePortfolioContext } from '@/contexts/PortfolioContext';
import { BROKER_CONFIGS, type BrokerName, type BrokerConnection } from '@/lib/brokers/types';

// ── Prop-firm display name helper ────────────────────────────────────────────
// Derives a human-readable firm label from the Tradovate account_name field.
// Matches the detection logic in useTradovate.ts (isApex, isPropFirm checks).
// For non-Tradovate brokers, falls back to BROKER_CONFIGS displayName.
function getConnectionDisplayName(conn: BrokerConnection): string {
  if (conn.broker === 'tradovate' || conn.broker === 'ninja_trader') {
    const acct = (conn.account_name ?? '').toUpperCase();
    if (/^APEX[_-]?\d+/i.test(acct)) return 'Apex';
    if (/^TST[_-]?\d+/i.test(acct) || /^TOPSTEP/i.test(acct)) return 'Topstep';
    if (/^MFF[_-]?\d+/i.test(acct) || /^MYFUNDED/i.test(acct)) return 'MyFundedFutures';
    if (/^EARN[_-]?\d+/i.test(acct)) return 'Earn2Trade';
    if (/^UPROFIT[_-]?\d+/i.test(acct)) return 'Uprofit';
    // Named label overrides detection
    if (conn.connection_name?.trim()) return conn.connection_name.trim();
    // Plain Tradovate
    return conn.broker === 'ninja_trader' ? 'NinjaTrader' : 'Tradovate';
  }
  // For all other brokers, use the config displayName (or broker key as fallback)
  const cfg = BROKER_CONFIGS[conn.broker as BrokerName];
  if (cfg) return cfg.displayName;
  // Unknown broker — humanise the key
  return conn.broker
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Account count helper ──────────────────────────────────────────────────────
// Counts portfolios that belong to a connection.
// For tradovate/ninja_trader: matches on source='tradovate' + same environment.
// For other brokers: matches on broker_connection_id.
function useAccountCount(conn: BrokerConnection): number {
  const { portfolios } = usePortfolioContext();
  if (conn.broker === 'tradovate' || conn.broker === 'ninja_trader') {
    return portfolios.filter(
      p => p.source === 'tradovate' && p.environment === conn.environment,
    ).length;
  }
  // broker_connection_id is set for source='broker' portfolios
  return portfolios.filter(p => p.broker_connection_id === conn.id).length;
}

// ── Row component ─────────────────────────────────────────────────────────────
function ConnectionRow({
  conn,
  onRemove,
  isRemoving,
}: {
  conn: BrokerConnection;
  onRemove: (id: string) => void;
  isRemoving: boolean;
}) {
  const displayName = getConnectionDisplayName(conn);
  const accountCount = useAccountCount(conn);
  const isConnected = conn.status === 'connected' || conn.status === 'renewing';
  const isExpired   = conn.status === 'error' || conn.status === 'canceled' || conn.status === 'disconnected';

  const handleRemove = () => {
    if (
      !window.confirm(
        'Remove this connection? This removes all its accounts from your journal. This cannot be undone.',
      )
    ) return;
    onRemove(conn.id);
  };

  return (
    <div
      className="rounded-[18px] overflow-hidden transition-all duration-200"
      style={{
        background: isConnected
          ? 'linear-gradient(135deg, rgba(30,52,41,0.42) 0%, rgba(15,15,15,0.96) 58%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.012) 100%)',
        border: isConnected
          ? '1px solid rgba(74,210,149,0.28)'
          : isExpired
          ? '1px solid rgba(227,99,99,0.2)'
          : '1px solid rgba(255,255,255,0.07)',
        boxShadow: isConnected
          ? '0 18px 36px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)'
          : 'inset 0 1px 0 rgba(255,255,255,0.035)',
      }}
    >
      {/* Status bar */}
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isConnected ? 'bg-emerald-400 animate-pulse' :
            isExpired   ? 'bg-red-400' : 'bg-zinc-600'
          }`}
        />
        {conn.environment && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide ${
              conn.environment === 'live'
                ? 'bg-emerald-500/10 text-emerald-300'
                : 'bg-blue-500/12 text-blue-300'
            }`}
          >
            {conn.environment.toUpperCase()}
          </span>
        )}
        <span
          className={`text-[10px] font-medium ${
            isConnected ? 'text-emerald-400' :
            isExpired   ? 'text-red-400' : 'text-zinc-500'
          }`}
        >
          {isConnected ? 'Connected' : conn.status}
        </span>
      </div>

      {/* Label row */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="min-w-0">
            <div className="text-base font-semibold text-white truncate">
              {displayName}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {accountCount > 0
                ? `${accountCount} account${accountCount !== 1 ? 's' : ''}`
                : conn.account_name || conn.account_id || '1 account'}
            </div>
          </div>
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all text-zinc-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            title="Remove connection"
          >
            {isRemoving
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ManageConnectionsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAddConnection: () => void;
}

export function ManageConnectionsModal({
  open,
  onOpenChange,
  onAddConnection,
}: ManageConnectionsModalProps) {
  const { connections, isLoading, remove, syncNow } = useBrokerConnections({
    active: true,
    purpose: 'journal',
  });
  const queryClient = useQueryClient();
  // Track which connection id is being removed (for per-row loading state)
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!open) return null;

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    await remove(id);
    setRemovingId(null);
  };

  const handleRefreshAccounts = async () => {
    if (isRefreshing || connections.length === 0) return;
    setIsRefreshing(true);
    try {
      // Re-sync every connection sequentially. Each Tradovate/NinjaTrader sync
      // reconciles the live account set server-side (blown/removed accounts get
      // deactivated), so refreshing here keeps the account picker truthful.
      for (const conn of connections) {
        await syncNow(conn.id);
      }
      // Refresh the journal portfolio list so deactivated accounts disappear
      // from the selector immediately (matches ['portfolios', userId] by prefix).
      await queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddNew = () => {
    onOpenChange(false);
    onAddConnection();
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      {/* Modal shell — mirrors TradovateConnectModal manage overlay styling */}
      <div
        className="relative flex flex-col w-full max-w-sm rounded-[24px] overflow-hidden border border-[#C9A646]/15 shadow-[0_26px_90px_rgba(0,0,0,0.62)]"
        style={{
          background: 'linear-gradient(150deg, rgba(18,18,18,0.98) 0%, rgba(10,10,10,0.99) 100%)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent)]"
          style={{ borderBottom: '1px solid rgba(201,166,70,0.12)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#C9A646]/25 bg-[#C9A646]/10 shadow-[0_0_26px_rgba(201,166,70,0.12)]">
              <Link2 className="w-4 h-4 text-[#C9A646]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-tight text-white tracking-tight">
                Manage Connections
              </h3>
              <p className="text-sm text-zinc-500 mt-0.5">
                {isLoading
                  ? 'Loading…'
                  : `${connections.length} connection${connections.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-zinc-800"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-zinc-500">Loading connections…</div>
          ) : connections.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              No broker connections yet.
            </div>
          ) : (
            connections.map((conn) => (
              <ConnectionRow
                key={conn.id}
                conn={conn}
                onRemove={handleRemove}
                isRemoving={removingId === conn.id}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex-shrink-0 flex flex-col gap-2.5">
          <button
            onClick={handleRefreshAccounts}
            disabled={isRefreshing || isLoading || connections.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] text-sm font-medium transition-all hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#d4d4d8',
            }}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing…' : 'Refresh accounts'}
          </button>
          <button
            onClick={handleAddNew}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] text-sm font-semibold transition-all hover:bg-[#C9A646]/10"
            style={{
              background: 'rgba(201,166,70,0.06)',
              border: '1px solid rgba(201,166,70,0.15)',
              color: '#C9A646',
            }}
          >
            <span className="text-base font-bold leading-none">+</span>
            Add New Connection
          </button>
        </div>
      </div>
    </div>
  );
}
