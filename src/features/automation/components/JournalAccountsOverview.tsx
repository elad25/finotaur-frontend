// src/features/automation/components/JournalAccountsOverview.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Read-only overview of the user's journal broker connections and their
// accounts — populated from the same source the trade journal uses.
//
// Groups accounts by connection using buildAccountGroups() (the IDENTICAL
// helper used by the journal's AccountFilterDropdown) so the copier page
// mirrors the journal's grouping exactly.
//
// Each connection group is shown as a static, non-interactive row:
// connection name + broker + account count + status pill. No expand/collapse.
//
// Reconnect-needed rows (orphaned groups with no live broker_connection, or
// a connection that is inactive/not connected) render a small "Connect" button
// that initiates the Tradovate OAuth flow. Prop-firm accounts (Apex / MFFU /
// Lucid) run on the demo environment — getTradovateAuthorizationUrl('demo').
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { DataState } from '@/components/ds/DataState';
import { Button } from '@/components/ds/Button';
import { usePortfolios } from '@/hooks/usePortfolios';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import {
  buildAccountGroups,
  type PortfolioGroup,
} from '@/components/journal/accountGrouping';
import { BROKER_CONFIGS } from '@/lib/brokers/types';
import type { BrokerConnection } from '@/lib/brokers/types';
import { getTradovateAuthorizationUrl } from '@/lib/brokers/tradovate/tradovate-oauth';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true when the group has a live, active broker_connection that is
 * either "connected" or in the brief "renewing" transient state.
 * Returns false for orphaned groups (no connection row) or stale/inactive ones.
 */
function isGroupConnected(connection: BrokerConnection | undefined): boolean {
  if (!connection) return false;
  return (
    connection.is_active &&
    (connection.status === 'connected' || connection.status === 'renewing')
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
// Shows "Connected" (green) only when isGroupConnected() is true.
// "Reconnect needed" state is handled at the row level via the Connect button.

interface ConnectedPillProps {
  label: string;
}

function ConnectedPill({ label }: ConnectedPillProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400"
      aria-label={`Status: ${label}`}
    >
      <Wifi className="w-3 h-3" aria-hidden="true" />
      {label}
    </span>
  );
}

// ── Connection row ────────────────────────────────────────────────────────────

interface ConnectionRowProps {
  group: PortfolioGroup;
  /** Matching broker_connections row for status enrichment. */
  brokerConnection: BrokerConnection | undefined;
  /** True while the OAuth URL is being fetched for this specific row. */
  isConnecting: boolean;
  /** Called when the user clicks "Connect" on a reconnect-needed row. */
  onConnect: () => void;
}

function ConnectionRow({
  group,
  brokerConnection,
  isConnecting,
  onConnect,
}: ConnectionRowProps) {
  // Derive broker display name from the first portfolio in the group.
  const firstPortfolio = group.portfolios[0];
  const source = firstPortfolio?.source;

  let brokerLabel = 'Tradovate';
  if (source === 'broker' && brokerConnection) {
    brokerLabel =
      BROKER_CONFIGS[brokerConnection.broker as keyof typeof BROKER_CONFIGS]
        ?.displayName ?? brokerConnection.broker;
  }

  const accountCount = group.portfolios.length;
  const connected = isGroupConnected(brokerConnection);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 flex items-center gap-3 px-3 py-2.5">
      {/* Connection name */}
      <span className="font-semibold text-sm text-zinc-100 truncate flex-1 min-w-0">
        {group.label}
      </span>

      {/* Broker label + account count */}
      <span className="text-[11px] text-zinc-500 shrink-0 hidden sm:block">
        {brokerLabel}
      </span>
      <span className="text-[11px] text-zinc-500 shrink-0">
        {accountCount} account{accountCount !== 1 ? 's' : ''}
      </span>

      {/* Status area — static pill for connected, actionable button for reconnect-needed */}
      {connected ? (
        <ConnectedPill label="Connected" />
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={onConnect}
          disabled={isConnecting}
          aria-label={`Connect ${group.label}`}
          className="shrink-0 h-6 px-2 text-[11px] border-amber-500/40 text-amber-400 hover:border-amber-400 hover:text-amber-300 hover:bg-amber-500/10 disabled:opacity-60"
        >
          <AlertTriangle className="w-3 h-3 mr-1" aria-hidden="true" />
          {isConnecting ? 'Connecting…' : 'Connect'}
        </Button>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function NoAccountsState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-8 text-center">
      <WifiOff className="mx-auto mb-3 w-8 h-8 text-zinc-600" aria-hidden="true" />
      <p className="text-sm font-medium text-zinc-300 mb-1">No broker accounts yet</p>
      <p className="text-xs text-zinc-500 max-w-xs mx-auto mb-4">
        Connect a broker via OAuth in your journal and your accounts will appear here automatically.
      </p>
      <Link
        to="/app/journal/broker-connections"
        className="inline-flex items-center gap-1.5 text-xs text-[#C9A646] hover:text-[#E2BB5E] transition-colors font-medium"
      >
        Connect a broker &rarr;
      </Link>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function JournalAccountsOverview() {
  // Tracks which group key is currently fetching an OAuth URL.
  // null = nothing in progress.
  const [connectingKey, setConnectingKey] = useState<string | null>(null);

  const {
    tradovatePortfolios,
    brokerPortfolios,
    manualPortfolios,
    isLoading: portfoliosLoading,
    error: portfoliosError,
    refetch: refetchPortfolios,
  } = usePortfolios();

  // Load all active connections (journal + copier) for status enrichment.
  // Non-blocking: if this fails the rows still render, just without the live pill.
  const {
    connections,
    isLoading: connectionsLoading,
    error: connectionsError,
  } = useBrokerConnections({ active: true });

  // Build a map from broker_connection_id / credential_id → BrokerConnection
  // so each group row can look up its live status in O(1).
  const connectionById = new Map<string, BrokerConnection>(
    connections.map((c) => [c.id, c]),
  );

  // Use the journal's own buildAccountGroups() — identical to AccountFilterDropdown.
  // Exclude the synthetic Manual portfolio from the copier overview (no broker = not copyable).
  const nonManualManual = manualPortfolios.filter((p) => p.source !== 'manual'); // keep broker-source "manual" entries if any
  const groups = buildAccountGroups(tradovatePortfolios, brokerPortfolios, nonManualManual);

  // Count totals for the header summary.
  const totalAccounts = tradovatePortfolios.length + brokerPortfolios.length;
  const totalConnections = groups.length;

  // Resolve a BrokerConnection for a given group.
  // Groups keyed `conn-<credential_id>` → look up by credential_id.
  // Groups keyed `broker-<broker_connection_id>` → look up by broker_connection_id.
  function groupConnection(group: PortfolioGroup): BrokerConnection | undefined {
    const key = group.key;
    if (key.startsWith('conn-')) {
      return connectionById.get(key.slice('conn-'.length));
    }
    if (key.startsWith('broker-')) {
      return connectionById.get(key.slice('broker-'.length));
    }
    // Generic 'tradovate' bucket: attempt to find via credential_id of the first portfolio.
    const credId = group.portfolios[0]?.credential_id;
    if (credId) return connectionById.get(credId);
    return undefined;
  }

  /**
   * Initiates the Tradovate OAuth flow for a reconnect-needed group.
   * Prop-firm accounts (Apex / MFFU / Lucid) live on the demo environment —
   * the server self-corrects env for live accounts too, so passing 'demo'
   * is safe as the universal default here.
   */
  async function handleConnect(groupKey: string) {
    if (connectingKey !== null) return; // already connecting another row
    setConnectingKey(groupKey);
    try {
      const url = await getTradovateAuthorizationUrl('demo');
      window.location.href = url;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start broker connection.';
      toast.error('Connection failed', { description: message });
      setConnectingKey(null);
    }
    // On success we navigate away; no need to reset connectingKey.
  }

  // Combined loading: both hooks must finish for a meaningful render.
  const isLoading = portfoliosLoading || connectionsLoading;
  // Only surface portfolio errors (connections are enrichment-only).
  const isError = Boolean(portfoliosError);
  const error = portfoliosError ?? connectionsError;
  void connectionsError; // consumed via isError / error above

  return (
    <div>
      {/* Section header */}
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Your accounts
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Synced from your journal — the same broker accounts you trade. Build copier routes from
          these below.
        </p>
      </div>

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={groups}
        onRetry={refetchPortfolios}
        isEmpty={(g) => g.length === 0}
        empty={<NoAccountsState />}
      >
        {(data) => (
          <div>
            {/* Summary line */}
            {totalAccounts > 0 && (
              <p className="text-[11px] text-zinc-500 mb-3">
                {totalAccounts} account{totalAccounts !== 1 ? 's' : ''} across{' '}
                {totalConnections} connection{totalConnections !== 1 ? 's' : ''}
              </p>
            )}

            {/* Connection rows — one row per group */}
            <div className="space-y-1.5">
              {data.map((group) => (
                <ConnectionRow
                  key={group.key}
                  group={group}
                  brokerConnection={groupConnection(group)}
                  isConnecting={connectingKey === group.key}
                  onConnect={() => handleConnect(group.key)}
                />
              ))}
            </div>
          </div>
        )}
      </DataState>
    </div>
  );
}
