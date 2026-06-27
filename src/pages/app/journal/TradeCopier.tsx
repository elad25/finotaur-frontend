// src/pages/app/journal/TradeCopier.tsx
// ═══════════════════════════════════════════════════════════════
// Trade Copier — FINOTAUR design
//   1. Broker Connection Status (Tradovate live/demo)
//   2. Copy Panel: Leader + Instrument (smart futures) + Followers table
//   3. Trade Copier History (audit log)
// Premium-only page. Consistent glassmorphism design.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, memo, useMemo, useRef, useEffect } from 'react';
import {
  Link2, RefreshCw,
  History, Zap, Shield, WifiOff,
  MoreVertical, ChevronDown, ChevronRight, Crown,
  Download, Filter,
} from 'lucide-react';
import { useTradovate } from '@/hooks/useTradovate';
import { usePortfolios } from '@/hooks/usePortfolios';
import { useCopyTradeLog } from '@/hooks/useCopyTradeLog';
import AddBrokerPopup from '@/components/broker/AddBrokerPopup';
import { useSubscription } from '@/hooks/useSubscription';
import { CopierPremiumGate } from '@/features/automation/components/CopierPremiumGate';
import AgentStatusTab from '@/features/automation/tabs/AgentStatusTab';
import InstallAgentTab from '@/features/automation/tabs/InstallAgentTab';
import { format } from 'date-fns';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { CopyTradingDashboard } from '@/components/copyTrading/CopyTradingDashboard';
import { ManageRiskTab } from '@/components/copyTrading/ManageRiskTab';
import { JournalAccountsOverview } from '@/features/automation/components/JournalAccountsOverview';
import { BROKER_CONFIGS } from '@/lib/brokers/types';
import type { BrokerConnection } from '@/lib/brokers/types';
import { useLocation, useNavigate, Link } from 'react-router-dom';

// ─── Premium Guard ────────────────────────────────────────────
function PremiumGate() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#C9A646]/10 border border-[#C9A646]/20 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8 text-[#C9A646]" />
        </div>
        <h2 className="text-xl font-bold text-white">Premium Journal Feature</h2>
        <p className="text-zinc-400 text-sm">
          Trade Copier is available to Premium Journal subscribers (Finotaur tier and above).
          Connect your broker, auto-sync trades, and copy positions across accounts.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/app/upgrade"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A646] to-[#E8C56A] text-black font-bold text-sm hover:opacity-90 transition-all"
          >
            <Zap className="w-4 h-4" /> View Plans
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Section Card wrapper ─────────────────────────────────────
const SectionCard = memo(({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`
    relative overflow-hidden bg-surface-glass backdrop-blur-md
    border border-gold-border rounded-xl p-ds-6
    shadow-[0_18px_60px_rgba(0,0,0,0.48),0_0_48px_rgba(201,166,70,0.08)]
    hover:border-gold-primary/35 transition-all duration-300
    ${className}
  `}>
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
    <div className="pointer-events-none absolute -top-24 left-1/2 h-44 w-[72%] -translate-x-1/2 rounded-full bg-gold-primary/[0.08] blur-3xl" />
    {children}
  </div>
));

// ─── Sync Status Badge ────────────────────────────────────────
const SyncBadge = memo(({ type, label }: { type: string; label: string }) => {
  const configs = {
    connected:    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400 animate-pulse' },
    disconnected: { bg: 'bg-zinc-800/60',    border: 'border-zinc-700/40',    text: 'text-zinc-500',    dot: 'bg-zinc-600' },
    error:        { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400',     dot: 'bg-red-400' },
    pending:      { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   dot: 'bg-amber-400 animate-pulse' },
  };
  const c = configs[type as keyof typeof configs] ?? configs.disconnected;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${c.bg} ${c.border} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
});

// ─── Copy Engine Health Pill ──────────────────────────────────
const EnginePill = memo(function EnginePill({ alive, sessions }: { alive: boolean; sessions: number }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${
        alive
          ? 'bg-status-success/10 border-status-success/30 text-status-success'
          : 'bg-status-offline border-border-ds-default text-ink-secondary'
      }`}
      title={alive ? `Copy engine live · ${sessions} session${sessions === 1 ? '' : 's'}` : 'Copy engine not running'}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${alive ? 'bg-status-success animate-pulse' : 'bg-status-offline border border-border-ds-default'}`} />
      Engine {alive ? `· ${sessions}` : 'down'}
    </div>
  );
});


// ─── Broker Connections Section ───────────────────────────────

function formatLastSync(value?: string | null): string {
  if (!value) return 'Never';
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'just now';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function isConnectionActive(connection: BrokerConnection, liveCredentialIds: Set<string>): boolean {
  const tokenExpired = connection.token_expires_at
    ? new Date(connection.token_expires_at) < new Date()
    : false;
  return connection.is_active && connection.status === 'connected' && !tokenExpired;
}

const ConnectionsStatusDot = memo(function ConnectionsStatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`h-2 w-2 rounded-full ${active ? 'bg-status-success' : 'bg-status-warning'}`}
      aria-hidden="true"
    />
  );
});

const ConnectionDetailsTable = memo(function ConnectionDetailsTable({
  connections,
  liveCredentialIds,
}: {
  connections: BrokerConnection[];
  liveCredentialIds: Set<string>;
}) {
  const first = connections[0];
  const activeCount = connections.filter((conn) => isConnectionActive(conn, liveCredentialIds)).length;
  const brokerName = first ? (BROKER_CONFIGS[first.broker]?.displayName ?? first.broker) : 'Broker';
  const connectionName = first?.connection_name ?? first?.account_name ?? brokerName;
  const statusActive = activeCount > 0 || Boolean(first && isConnectionActive(first, liveCredentialIds));

  return (
    <div className="overflow-hidden rounded-lg border border-border-ds-subtle bg-surface-1">
      <div className="grid grid-cols-[150px_190px_150px_190px_180px_150px_64px] border-b border-border-ds-subtle bg-surface-2 px-ds-4 py-ds-3 text-[11px] uppercase text-ink-secondary max-xl:grid-cols-[130px_1.1fr_120px_150px_150px_120px_56px] max-lg:hidden">
        <span>Status</span>
        <span>Connection Name</span>
        <span>Username</span>
        <span>Platform</span>
        <span>Active Accounts</span>
        <span>Used Slots</span>
        <span className="text-right">Actions</span>
      </div>

      <div className="grid min-h-[54px] grid-cols-[150px_190px_150px_190px_180px_150px_64px] items-center px-ds-4 py-ds-3 text-sm text-ink-primary max-xl:grid-cols-[130px_1.1fr_120px_150px_150px_120px_56px] max-lg:grid-cols-1 max-lg:gap-ds-2">
        <div className="flex items-center gap-ds-2">
          <ConnectionsStatusDot active={statusActive} />
          <span>{statusActive ? 'Connected' : 'Needs attention'}</span>
        </div>
        <span className="truncate">{connectionName}</span>
        <span className="font-mono text-xs tracking-[0.18em] text-ink-primary">••••••••</span>
        <span>{brokerName}</span>
        <span>{activeCount} / 5</span>
        <span>{connections.length} / 20</span>
        <button
          type="button"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-gold-primary transition-colors hover:bg-gold-primary/10"
          aria-label="Connection actions"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

const AccountsTable = memo(function AccountsTable({
  connections,
  liveCredentialIds,
}: {
  connections: BrokerConnection[];
  liveCredentialIds: Set<string>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-ds-subtle bg-surface-1">
      <div className="grid grid-cols-[42px_120px_150px_1fr_150px_150px_120px_130px_64px] border-b border-border-ds-subtle bg-surface-2 px-ds-4 py-ds-3 text-[11px] uppercase text-ink-secondary max-xl:grid-cols-[42px_110px_130px_1fr_130px_120px_110px_110px_56px] max-lg:hidden">
        <span />
        <span>Status</span>
        <span>Account ID</span>
        <span>Name</span>
        <span>Broker</span>
        <span>Balance</span>
        <span>Role</span>
        <span>Last Sync</span>
        <span className="text-right">Actions</span>
      </div>

      <div className="divide-y divide-border-ds-subtle">
        {connections.map((connection, index) => {
          const active = isConnectionActive(connection, liveCredentialIds);
          const brokerName = BROKER_CONFIGS[connection.broker]?.displayName ?? connection.broker;
          const accountName = connection.account_name ?? connection.connection_name ?? 'MFFU';
          const accountId = connection.account_id ?? connection.id.slice(0, 9);
          const role = index === 0 ? 'Leader' : 'Follower';

          return (
            <div
              key={connection.id}
              className="grid min-h-[48px] grid-cols-[42px_120px_150px_1fr_150px_150px_120px_130px_64px] items-center px-ds-4 py-ds-2 text-sm text-ink-primary transition-colors hover:bg-surface-2 max-xl:grid-cols-[42px_110px_130px_1fr_130px_120px_110px_110px_56px] max-lg:grid-cols-[32px_1fr_40px] max-lg:gap-ds-2"
            >
              <label className="flex h-5 w-5 items-center justify-center rounded-sm border border-border-ds-default">
                <input type="checkbox" className="sr-only" aria-label={`Select ${accountName}`} />
              </label>

              <div className="flex items-center gap-ds-2">
                <ConnectionsStatusDot active={active} />
                <span className={active ? 'text-status-success' : 'text-status-warning'}>
                  {active ? 'Active' : 'Attention'}
                </span>
              </div>

              <span className="font-mono text-sm text-ink-primary max-lg:hidden">{accountId}</span>
              <span className="truncate max-lg:col-start-2 max-lg:row-start-2">{accountName}</span>
              <span className="max-lg:hidden">{brokerName}</span>
              <span className="font-mono text-sm max-lg:hidden">$0.00</span>
              <span className="max-lg:hidden">
                <span className={`rounded-sm border px-ds-2 py-1 text-xs ${
                  role === 'Leader'
                    ? 'border-gold-border text-gold-primary'
                    : 'border-border-ds-default text-ink-secondary'
                }`}>
                  {role}
                </span>
              </span>
              <span className="text-ink-secondary max-lg:hidden">
                {formatLastSync(connection.last_successful_sync_at ?? connection.last_sync_at)}
              </span>
              <button
                type="button"
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-gold-primary transition-colors hover:bg-gold-primary/10 max-lg:col-start-3 max-lg:row-span-2"
                aria-label={`${accountName} actions`}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const ConnectionsAccordion = memo(function ConnectionsAccordion({
  connections,
  liveCredentialIds,
  expandedConnectionIds,
  disabledConnectionIds,
  onToggleConnection,
  onToggleEnabled,
  onReconnect,
  reconnectingId,
}: {
  connections: BrokerConnection[];
  liveCredentialIds: Set<string>;
  expandedConnectionIds: Set<string>;
  disabledConnectionIds: Set<string>;
  onToggleConnection: (id: string) => void;
  onToggleEnabled: (id: string) => void;
  onReconnect: (conn: BrokerConnection) => void;
  reconnectingId: string | null;
}) {
  const activeCount = connections.filter((conn) => isConnectionActive(conn, liveCredentialIds)).length;

  return (
    <div className="overflow-hidden rounded-lg border border-border-ds-subtle bg-surface-1">
      <div className="grid grid-cols-[44px_1.25fr_150px_110px_160px_120px_120px_92px] border-b border-border-ds-subtle bg-surface-2 px-ds-4 py-ds-3 text-[11px] uppercase text-ink-secondary max-xl:grid-cols-[36px_1.1fr_130px_96px_130px_110px_110px_84px] max-lg:hidden">
        <span />
        <span>Connection Name</span>
        <span>Status</span>
        <span>Enabled</span>
        <span>Platform</span>
        <span>Accounts</span>
        <span>Last Ping</span>
        <span>Details</span>
      </div>

      <div className="divide-y divide-border-ds-subtle">
        {connections.map((connection) => {
          const active = isConnectionActive(connection, liveCredentialIds);
          const expanded = expandedConnectionIds.has(connection.id);
          const enabled = active && !disabledConnectionIds.has(connection.id);
          const brokerName = BROKER_CONFIGS[connection.broker]?.displayName ?? connection.broker;
          const connectionName = connection.connection_name ?? connection.account_name ?? brokerName;

          return (
            <div key={connection.id}>
              <div className="grid min-h-[44px] grid-cols-[44px_1.25fr_150px_110px_160px_120px_120px_92px] items-center px-ds-4 py-ds-2 text-sm text-ink-primary transition-colors hover:bg-surface-2 max-xl:grid-cols-[36px_1.1fr_130px_96px_130px_110px_110px_84px] max-lg:grid-cols-[32px_1fr_86px] max-lg:gap-ds-2">
                <span className="text-ink-tertiary">#</span>
                <span className="truncate font-medium">{connectionName}</span>
                <div className="flex items-center gap-ds-2">
                  <ConnectionsStatusDot active={active} />
                  <span className={active ? 'text-status-success' : 'text-status-warning'}>{active ? 'Connected' : 'Attention'}</span>
                  {!active && (
                    <button
                      type="button"
                      onClick={() => onReconnect(connection)}
                      disabled={reconnectingId === connection.id}
                      className="ml-ds-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-gold-border bg-transparent text-gold-primary transition-colors hover:border-gold-primary hover:bg-gold-primary/10 disabled:opacity-50 disabled:cursor-wait"
                      aria-label={`Reconnect ${connection.connection_name ?? connection.account_name ?? connection.broker}`}
                      title="Reconnect"
                    >
                      <RefreshCw className={`h-3 w-3 ${reconnectingId === connection.id ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`${connectionName} enabled`}
                  onClick={() => onToggleEnabled(connection.id)}
                  className="max-lg:hidden"
                >
                  <span className={`inline-flex h-5 w-9 items-center rounded-full border px-0.5 transition-colors ${enabled ? 'border-blue-500/50 bg-blue-500/20' : 'border-border-ds-default bg-surface-2'}`}>
                    <span className={`h-4 w-4 rounded-full transition-transform ${enabled ? 'translate-x-4 bg-blue-400' : 'bg-ink-muted'}`} />
                  </span>
                </button>
                <span className="max-lg:hidden">{brokerName}</span>
                <span className="max-lg:hidden">{active ? 1 : 0} / 20</span>
                <span className="text-status-success max-lg:hidden">
                  {formatLastSync(connection.last_successful_sync_at ?? connection.last_sync_at)}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleConnection(connection.id)}
                  className="inline-flex items-center gap-ds-1 text-sm font-medium text-ink-primary transition-colors hover:text-gold-primary max-lg:justify-end"
                  aria-expanded={expanded}
                >
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Details
                </button>
              </div>

              {expanded && (
                <div className="border-t border-border-ds-subtle bg-surface-base/45 px-ds-4 py-ds-3">
                  <AccountsTable connections={[connection]} liveCredentialIds={liveCredentialIds} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ─── Live Positions / Orders / History Section ─────────────────
// Cloud copy-engine polling (/api/copy-engine/accounts) has been removed.
// Execution runs via the local desktop agent; positions & orders appear
// once the agent is paired and running.
const CopierActivitySection = memo(() => {
  return (
    <div className="space-y-ds-4">
      <div className="flex items-center gap-ds-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-border bg-gold-primary/10">
          <History className="h-4 w-4 text-gold-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink-primary">Live Copier Monitor</h3>
          <p className="text-[11px] text-ink-secondary">
            Positions, pending orders, and copy history
          </p>
        </div>
      </div>
      <div className="flex min-h-[184px] items-center justify-center rounded-lg border border-zinc-800/70 bg-zinc-950/35 px-6 py-8 text-center">
        <p className="text-sm text-zinc-500">
          Live positions &amp; P&amp;L appear here once your desktop agent is paired and running.
        </p>
      </div>
      <CopyHistorySection compact />
    </div>
  );
});

// ─── Copy History Section ─────────────────────────────────────
const CopyHistorySection = memo(({ compact = false }: { compact?: boolean }) => {
  const { log, isLoading, successCount, skippedCount, failedCount } = useCopyTradeLog(30);

  const historyRows = useMemo(() => {
    return log.map(entry => ({
      id:       entry.id,
      time:     format(new Date(entry.created_at), 'HH:mm:ss'),
      contract: entry.target_symbol || entry.source_symbol || 'NQ',
      type:     entry.action === 'close' ? 'Close' : 'Limit',
      side:     entry.action === 'close' ? 'Sell' : 'Buy',
      qty:      entry.copied_quantity ?? entry.original_quantity ?? 1,
      price:    null as number | null,
      status:   entry.status === 'success' ? 'Filled' : entry.status,
    }));
  }, [log]);

  const statusConfig = {
    success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    skipped: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
    failed: { color: 'text-red-400', bg: 'bg-red-500/10' },
  };

  return (
    <div className={compact ? 'min-h-[184px]' : 'space-y-4'}>
      {!compact && <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center">
            <History className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Copy History</h3>
            <p className="text-[11px] text-zinc-500">Last 30 copy actions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {successCount > 0 && (
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              {successCount} copied
            </span>
          )}
          {skippedCount > 0 && (
            <span className="text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
              {skippedCount} skipped
            </span>
          )}
          {failedCount > 0 && (
            <span className="text-[11px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">
              {failedCount} failed
            </span>
          )}
        </div>
      </div>}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-zinc-900/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div>
            <div className="mb-2 flex items-center justify-end gap-2">
              <button className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200">
                <Filter className="h-3.5 w-3.5" />
                Filter
              </button>
              <button className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200">
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-800/70 bg-zinc-950/35">
              <div className="grid grid-cols-[120px_1fr_120px_120px_80px_140px_100px] border-b border-zinc-800/70 bg-zinc-900/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                <span>Time</span>
                <span>Contract</span>
                <span>Type</span>
                <span>Side</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Price</span>
                <span className="text-right">Status</span>
              </div>
              <div className="divide-y divide-zinc-800/60">
                {historyRows.length === 0 ? (
                  <div className="px-3 py-8 text-center text-xs text-zinc-500">
                    No copy history yet — once a copied trade fires, it will appear here.
                  </div>
                ) : (
                  historyRows.map(order => (
                    <div key={order.id} className="grid min-h-[34px] grid-cols-[120px_1fr_120px_120px_80px_140px_100px] items-center px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900/50">
                      <span className="font-mono text-xs text-zinc-500">{order.time}</span>
                      <span className="font-mono text-xs font-semibold">{order.contract}</span>
                      <span className="text-xs text-zinc-400">{order.type}</span>
                      <span className={order.side === 'Buy' ? 'text-emerald-400' : 'text-red-400'}>
                        {order.side === 'Buy' ? 'up ' : 'down '}
                        {order.side}
                      </span>
                      <span className="text-right font-mono text-xs">{order.qty}</span>
                      <span className="text-right font-mono text-xs">{order.price != null ? order.price.toFixed(2) : '-'}</span>
                      <span className="text-right">
                        <span className="rounded-sm bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                          {order.status}
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          {/* eslint-disable-next-line no-constant-binary-expression */}
          {false && (
            <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent pr-1">
          {log.map(entry => {
            const cfg = statusConfig[entry.status as keyof typeof statusConfig] ?? statusConfig.failed;
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700/60 transition-all"
              >
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${cfg.bg} ${cfg.color}`}>
                  {entry.status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300">
                    {entry.original_quantity} → {entry.copied_quantity ?? 0} contracts
                    {entry.ratio_applied && (
                      <span className="text-zinc-600 ml-1">({Math.round(entry.ratio_applied * 100)}%)</span>
                    )}
                  </p>
                  {entry.error_message && (
                    <p className="text-[10px] text-red-400/70 truncate">{entry.error_message}</p>
                  )}
                </div>
                <span className="text-[10px] text-zinc-600 flex-shrink-0">
                  {format(new Date(entry.created_at), 'MMM d HH:mm')}
                </span>
              </div>
            );
          })}
            </div>
          )}
        </>
      )}
    </div>
  );
});

// ─── Main Page ────────────────────────────────────────────────
export default function TradeCopier() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useSubscription();

  const { hasAnyConnection } = useTradovate();

  // Load broker connections only for the "Set a leader" banner presence check.
  // The accounts display is now sourced from portfolios (same as journal).
  const { connections } = useBrokerConnections({ active: true });

  // Portfolios are the source of truth for account display (same as journal).
  const { portfolios, isLoading: portfoliosLoading } = usePortfolios();
  const [showAddBroker, setShowAddBroker] = useState(false);

  const activeTab: 'connections' | 'copy-trading' | 'manage-risk' | 'agent' | 'install' =
    location.pathname.endsWith('/manage-risk')
      ? 'manage-risk'
      : location.pathname.endsWith('/trade-copier')
        ? 'copy-trading'
        : location.pathname.endsWith('/agent')
          ? 'agent'
          : location.pathname.endsWith('/install')
            ? 'install'
            : 'connections';

  if (!isAdmin) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#C9A646]/10 border border-[#C9A646]/20 flex items-center justify-center mx-auto">
          <Zap className="w-8 h-8 text-[#C9A646]" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A646]/10 border border-[#C9A646]/25 text-[#C9A646] text-xs font-semibold tracking-wider uppercase">
          Private Beta
        </div>
        <h2 className="text-xl font-bold text-white">Trade Copier — Private Beta</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          We&apos;re fire-testing the copier with admin accounts before public release.
          Stay tuned — this will open to all Premium members soon.
        </p>
      </div>
    </div>
  );

  // Non-manual portfolios: the same accounts visible in the journal, used for
  // presence checks (e.g. the "Set a leader" banner).
  const brokerPortfolios = useMemo(
    () => (portfoliosLoading ? [] : portfolios.filter((p) => p.source !== 'manual')),
    [portfolios, portfoliosLoading],
  );

  return (
    <CopierPremiumGate>
    <div className="relative min-h-screen overflow-hidden bg-surface-base text-ink-primary">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(201,166,70,0.08),transparent_70%)]" />

      <div className="relative w-full max-w-[1280px] mx-auto px-ds-5 py-ds-7 space-y-ds-6">

        {/* ── Header ── */}
        {/* ── Tab 1: Broker Connections ── */}
        {activeTab === 'connections' && (
          <>
            {brokerPortfolios.length > 0 && (
              <div className="flex min-h-[56px] items-center justify-between gap-ds-4 rounded-lg border border-blue-500/25 bg-blue-500/10 px-ds-4">
                <div className="flex items-center gap-ds-3">
                  <Crown className="h-5 w-5 text-gold-primary" />
                  <span className="text-sm font-medium text-ink-primary">Set a leader account for copy trading</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/app/copy-trade/trade-copier')}
                  className="inline-flex items-center gap-ds-2 rounded-md bg-blue-500 px-ds-3 py-ds-2 text-sm font-semibold text-white transition-colors hover:bg-blue-400"
                >
                  Set a leader
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <SectionCard>
            <div className="flex items-center gap-ds-4 mb-ds-4">
              <div className="w-9 h-9 rounded-lg bg-gold-primary/10 border border-gold-border flex items-center justify-center">
                <Link2 className="w-4 h-4 text-gold-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink-primary">Broker Connections</h2>
                <p className="text-[11px] text-ink-secondary">Auto-syncing — no manual refresh needed</p>
              </div>
            </div>

            {/* Journal-sourced accounts view — same portfolios/grouping as the trade journal */}
            <JournalAccountsOverview />
            </SectionCard>
          </>
        )}

        {/* ── Tab 2: Trade Copier ── */}
        {activeTab === 'copy-trading' && (
          <>
            {hasAnyConnection ? (
              <>
                <SectionCard>
                  <CopyTradingDashboard />
                </SectionCard>
                <SectionCard>
                  <CopierActivitySection />
                </SectionCard>
              </>
            ) : (
              <SectionCard>
                <div className="text-center py-16 space-y-4">
                  <WifiOff className="w-12 h-12 text-zinc-700 mx-auto" />
                  <div>
                    <p className="text-ink-secondary font-medium">No accounts connected</p>
                    <p className="text-ink-secondary text-sm mt-1">
                      Connect a broker in the Connections tab to enable Trade Copier.
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}
          </>
        )}

        {/* ── Tab 3: Manage Risk ── */}
        {/* No SectionCard here: the global "All Accounts" panel and the
            per-account cards render frameless and full-width (no gold frame,
            no p-ds-6 inset) so they spread wider across the page. */}
        {activeTab === 'manage-risk' && <ManageRiskTab />}

        {/* ── Tab 4: Agent ── */}
        {activeTab === 'agent' && <AgentStatusTab />}

        {/* ── Tab 5: Install ── */}
        {activeTab === 'install' && <InstallAgentTab />}

      </div>

      {showAddBroker && (
        <AddBrokerPopup open={showAddBroker} onOpenChange={setShowAddBroker} />
      )}
    </div>
    </CopierPremiumGate>
  );
}
