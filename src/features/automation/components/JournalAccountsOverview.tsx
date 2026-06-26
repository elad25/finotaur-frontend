// src/features/automation/components/JournalAccountsOverview.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Read-only overview of the user's journal broker connections and their
// accounts — populated from the same source the trade journal uses.
//
// Groups accounts by connection using buildAccountGroups() (the IDENTICAL
// helper used by the journal's AccountFilterDropdown) so the copier page
// mirrors the journal's grouping exactly.
//
// Each connection is shown as a COLLAPSED compact row by default.
// Clicking the chevron expands the individual account rows beneath it.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wifi, WifiOff, Circle, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { DataState } from '@/components/ds/DataState';
import { usePortfolios } from '@/hooks/usePortfolios';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import {
  buildAccountGroups,
  type PortfolioGroup,
} from '@/components/journal/accountGrouping';
import { BROKER_CONFIGS } from '@/lib/brokers/types';
import type { BrokerConnection } from '@/lib/brokers/types';

// ── Status pill ───────────────────────────────────────────────────────────────
// Shows "Connected" (green) when there is a matching live broker_connection,
// or "Reconnect needed" (amber/neutral) when the group has accounts but no
// live connection entry (e.g. orphaned prop-firm groups like Apex).

interface ConnectionStatusPillProps {
  connection: BrokerConnection | undefined;
}

function ConnectionStatusPill({ connection }: ConnectionStatusPillProps) {
  if (connection) {
    const isOnline =
      connection.is_active &&
      (connection.status === 'connected' || connection.status === 'renewing');

    const label = isOnline ? 'Connected' : 'Reconnect needed';

    return (
      <span
        className={[
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
          isOnline
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-amber-500/10 text-amber-400',
        ].join(' ')}
        aria-label={`Status: ${label}`}
      >
        {isOnline ? (
          <Wifi className="w-3 h-3" aria-hidden="true" />
        ) : (
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
        )}
        {label}
      </span>
    );
  }

  // No matching broker_connection entry — group is orphaned (e.g. Apex accounts
  // imported from Tradovate with no active OAuth connection).
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400"
      aria-label="Status: Reconnect needed"
    >
      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
      Reconnect needed
    </span>
  );
}

// ── Environment badge ─────────────────────────────────────────────────────────

function EnvironmentBadge({ env }: { env: string | null }) {
  if (!env) return null;
  const isLive = env === 'live';
  return (
    <span
      className={[
        'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
        isLive
          ? 'bg-amber-500/15 text-amber-400'
          : 'bg-zinc-700/60 text-zinc-500',
      ].join(' ')}
    >
      {isLive ? 'Live' : 'Demo'}
    </span>
  );
}

// ── Account row inside a group (shown when expanded) ──────────────────────────

interface AccountRowProps {
  name: string;
  environment: string | null;
  isActive: boolean;
}

function AccountRow({ name, environment, isActive }: AccountRowProps) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-3 rounded-md hover:bg-zinc-800/40 transition-colors">
      <Circle
        className={[
          'w-1.5 h-1.5 shrink-0',
          isActive ? 'text-emerald-500' : 'text-zinc-600',
        ].join(' ')}
        fill="currentColor"
        aria-hidden="true"
      />
      <span className="text-sm text-zinc-300 flex-1 min-w-0 truncate">{name}</span>
      <EnvironmentBadge env={environment} />
    </div>
  );
}

// ── Collapsed connection row ──────────────────────────────────────────────────

interface ConnectionRowProps {
  group: PortfolioGroup;
  /** Matching broker_connections row for status enrichment. */
  brokerConnection: BrokerConnection | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}

function ConnectionRow({ group, brokerConnection, isExpanded, onToggle }: ConnectionRowProps) {
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
  const Chevron = isExpanded ? ChevronDown : ChevronRight;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
      {/* Compact connection header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/40 transition-colors rounded-lg text-left"
        aria-expanded={isExpanded}
        aria-label={`${group.label} — ${accountCount} account${accountCount !== 1 ? 's' : ''}. ${isExpanded ? 'Collapse' : 'Expand'}`}
      >
        <Chevron className="w-3.5 h-3.5 text-zinc-500 shrink-0" aria-hidden="true" />

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

        {/* Status pill */}
        <ConnectionStatusPill connection={brokerConnection} />
      </button>

      {/* Expanded account list */}
      {isExpanded && (
        <div className="border-t border-zinc-800/70 px-2 py-1.5 space-y-0.5">
          {group.portfolios.map((p) => (
            <AccountRow
              key={p.id}
              name={p.name}
              environment={p.environment}
              isActive={p.is_active}
            />
          ))}
        </div>
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

  // Track which connection group keys are expanded. Default = all collapsed.
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

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

            {/* Connection rows — one per group, collapsed by default */}
            <div className="space-y-1.5">
              {data.map((group) => (
                <ConnectionRow
                  key={group.key}
                  group={group}
                  brokerConnection={groupConnection(group)}
                  isExpanded={expandedKeys.has(group.key)}
                  onToggle={() => toggleGroup(group.key)}
                />
              ))}
            </div>
          </div>
        )}
      </DataState>
    </div>
  );
}
