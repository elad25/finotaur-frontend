// src/components/broker/BrokerConnectionsPopover.tsx
// Compact broker/account selector anchored to the journal dashboard broker button.

import { useCallback, useMemo, useState } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronUp, Minus, Plus, RefreshCw, Settings } from 'lucide-react';
import { BROKER_CONFIGS, BrokerName, BrokerConnection } from '@/lib/brokers/types';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { statusBadge, connectionNeedsAttention } from '@/components/broker/brokerStatusBadge';
import { BrokerReconnectModal } from '@/components/broker/BrokerReconnectModal';
import { usePortfolioContext, ALL_PORTFOLIOS_ID } from '@/contexts/PortfolioContext';
import type { Portfolio } from '@/hooks/usePortfolios';
import { buildAccountGroups } from '@/components/journal/accountGrouping';
import type { PortfolioGroup } from '@/components/journal/accountGrouping';
import { cn } from '@/lib/utils';

const BORDER_LIGHT = 'rgba(255, 215, 0, 0.08)';

interface Props {
  children: React.ReactNode;
  onAddConnection?: () => void;
  onManage?: () => void;
}

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

function brokerColor(broker: BrokerName | 'manual'): string {
  if (broker === 'manual') return '#C9A646';
  return BROKER_CONFIGS[broker]?.color ?? '#C9A646';
}

function brokerLogo(broker: BrokerName | 'manual'): string | undefined {
  if (broker === 'manual') return undefined;
  return BROKER_CONFIGS[broker]?.logo;
}

function BrokerLogo({ broker }: { broker: BrokerName | 'manual' }) {
  const [imageErrored, setImageErrored] = useState(false);
  const logo = brokerLogo(broker);
  const label = broker === 'manual' ? 'Manual' : brokerDisplay(broker);

  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.035] text-[8px] font-bold"
      style={{ color: brokerColor(broker) }}
    >
      {logo && !imageErrored ? (
        <img
          src={logo}
          alt={label}
          className="max-h-3.5 max-w-[22px] object-contain"
          onError={() => setImageErrored(true)}
        />
      ) : (
        <span>{label.substring(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
}

function CheckboxMark({ checked, compact = false }: { checked: boolean; compact?: boolean }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-[4px] border transition-all duration-150',
        compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
        checked
          ? 'border-[#C9A646] bg-[#C9A646] text-[#080808] shadow-[0_0_12px_rgba(201,166,70,0.22)]'
          : 'border-[#C9A646]/28 bg-[#050505] text-transparent group-hover:border-[#C9A646]/55',
      )}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
  );
}

function AllAccountsRow({
  checked,
  total,
  onSelect,
}: {
  checked: boolean;
  total: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      onClick={onSelect}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-[10px] border px-3 py-2 text-left transition-all duration-150',
        checked
          ? 'border-[#C9A646]/38 bg-[#C9A646]/[0.08]'
          : 'border-white/[0.07] bg-[#080808] hover:border-[#C9A646]/24 hover:bg-[#101010]',
      )}
    >
      <CheckboxMark checked={checked} />
      <div className="flex h-7 w-9 shrink-0 items-center justify-center rounded-md border border-[#C9A646]/20 bg-[#C9A646]/10 text-[9px] font-bold text-[#C9A646]">
        ALL
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-[#F4F4F4]">All accounts</div>
        <div className="text-[9px] text-[#777]">
          {total} portfolio{total === 1 ? '' : 's'} in one view
        </div>
      </div>
    </button>
  );
}

function AccountListRow({
  portfolio,
  broker,
  connection,
  checked,
  onToggle,
  onReconnect,
}: {
  portfolio: Portfolio;
  broker: BrokerName | 'manual';
  connection?: BrokerConnection;
  checked: boolean;
  onToggle: (id: string) => void;
  onReconnect: (conn: BrokerConnection) => void;
}) {
  const badge = connection ? statusBadge(connection) : null;
  const hasConnectionIssue = connection ? connectionNeedsAttention(connection) : false;
  const environment = portfolio.environment ? portfolio.environment.toUpperCase() : null;

  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      onClick={() => onToggle(portfolio.id)}
      className={cn(
        'group flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left transition-all duration-150',
        checked
          ? 'bg-[#C9A646]/[0.08]'
          : 'hover:bg-white/[0.035]',
      )}
    >
      <CheckboxMark checked={checked} compact />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[12px] font-semibold leading-tight text-[#EDEDED]">
            {portfolio.name}
          </span>
          {environment && (
            <span className="rounded-[4px] border border-[#C9A646]/24 bg-[#C9A646]/[0.08] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[#C9A646]">
              {environment}
            </span>
          )}
        </div>
        {connection?.last_sync_at && (
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] leading-tight text-[#777]">
            <span className="shrink-0">synced {timeAgo(connection.last_sync_at)}</span>
          </div>
        )}
      </div>

      {badge && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: badge.color, boxShadow: `0 0 8px ${badge.color}` }}
          aria-label={badge.label}
        />
      )}

      {hasConnectionIssue && connection && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onReconnect(connection);
          }}
          className="rounded-md p-1 text-[#E36363] transition-colors hover:bg-[#E36363]/10"
          aria-label="Reconnect broker"
        >
          <AlertCircle className="h-3.5 w-3.5" />
        </button>
      )}
    </button>
  );
}

function SimpleAccountRow({
  portfolio,
  checked,
  onToggle,
  indent = false,
  connection,
  onReconnect,
}: {
  portfolio: Portfolio;
  checked: boolean;
  onToggle: (id: string) => void;
  indent?: boolean;
  connection?: BrokerConnection;
  onReconnect?: (conn: BrokerConnection) => void;
}) {
  const badge = portfolio.source === 'manual'
    ? 'Manual'
    : portfolio.environment === 'live'
      ? 'Live'
      : 'Demo';
  const badgeClass = portfolio.source === 'manual'
    ? 'bg-zinc-700/50 text-zinc-500'
    : portfolio.environment === 'live'
      ? 'bg-emerald-400/10 text-emerald-400'
      : 'bg-yellow-400/10 text-yellow-400';

  const statusDot = connection ? statusBadge(connection) : null;
  const needsAttention = connection ? connectionNeedsAttention(connection) : false;

  return (
    <button
      role="option"
      aria-selected={checked}
      onClick={() => onToggle(portfolio.id)}
      className={cn(
        'group flex w-full items-center gap-2.5 py-2 text-xs font-medium transition-colors duration-100',
        indent ? 'pl-5 pr-3' : 'px-3',
        checked
          ? 'bg-[#C9A646]/5 text-[#C9A646]'
          : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100',
      )}
    >
      <CheckboxMark checked={checked} compact />
      <span className="min-w-0 flex-1 truncate text-left">{portfolio.name}</span>
      {statusDot && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: statusDot.color, boxShadow: `0 0 6px ${statusDot.color}` }}
          aria-label={statusDot.label}
        />
      )}
      {needsAttention && connection && onReconnect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReconnect(connection);
          }}
          className="flex h-5 shrink-0 items-center gap-1 rounded border border-[#C9A646]/25 px-1.5 text-[9px] font-medium text-[#C9A646] transition-colors hover:border-[#C9A646]/45 hover:bg-[#C9A646]/10"
          aria-label="Reconnect broker"
        >
          <RefreshCw className="h-2.5 w-2.5" />
          Reconnect
        </button>
      )}
      <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-semibold', badgeClass)}>
        {badge}
      </span>
    </button>
  );
}

type ConnectionGroup = {
  id: string;
  title: string;
  broker: BrokerName | 'manual';
  portfolios: Portfolio[];
  connection?: BrokerConnection;
};

function ConnectionGroupSection({
  group,
  connectionFor,
  selectedPortfolioIds,
  isShowingAll,
  isOpen,
  onToggle,
  onToggleOpen,
  onReconnect,
}: {
  group: ConnectionGroup;
  connectionFor: (portfolio: Portfolio) => BrokerConnection | undefined;
  selectedPortfolioIds: string[];
  isShowingAll: boolean;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onToggleOpen: (id: string) => void;
  onReconnect: (conn: BrokerConnection) => void;
}) {
  const badge = group.connection ? statusBadge(group.connection) : null;
  const brokerName = group.broker === 'manual' ? 'Manual Import' : brokerDisplay(group.broker);
  const displayBrokerName = group.broker === 'manual' ? 'MANUAL' : brokerName.toUpperCase();
  const hasConnectionIssue = group.connection ? connectionNeedsAttention(group.connection) : false;

  return (
    <section className="border-t border-white/[0.06] first:border-t-0">
      <div className="group flex w-full items-center gap-2.5 px-1.5 py-2 text-left transition-colors hover:bg-white/[0.025]">
        <button
          type="button"
          onClick={() => onToggleOpen(group.id)}
          className="min-w-0 flex-1 text-left"
          aria-expanded={isOpen}
        >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[10px] font-semibold uppercase leading-tight tracking-[0.02em] text-[#DCDCDC]">
              FINOTAUR - {displayBrokerName}
            </span>
          </div>
          <div className="hidden">
            {brokerName} · {group.portfolios.length} account{group.portfolios.length === 1 ? '' : 's'}
          </div>
        </div>
        {badge && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: badge.color, boxShadow: `0 0 8px ${badge.color}` }}
            aria-label={badge.label}
          />
        )}
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-[#A0A0A0] transition-colors group-hover:text-[#C9A646]" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#A0A0A0] transition-colors group-hover:text-[#C9A646]" />
        )}
      </button>
      {hasConnectionIssue && group.connection && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onReconnect(group.connection!);
          }}
          className="flex h-6 shrink-0 items-center gap-1 rounded-md border border-[#C9A646]/25 px-2 text-[9px] font-medium text-[#C9A646] transition-colors hover:border-[#C9A646]/45 hover:bg-[#C9A646]/10"
          aria-label={`Reconnect ${group.title}`}
        >
          <RefreshCw className="h-3 w-3" />
          Reconnect
        </button>
      )}
      </div>
      {isOpen && (
      <div className="pb-1 pl-1">
      {group.portfolios.map((portfolio) => (
        <AccountListRow
          key={portfolio.id}
          portfolio={portfolio}
          broker={group.broker}
          connection={connectionFor(portfolio)}
          checked={!isShowingAll && selectedPortfolioIds.includes(portfolio.id)}
          onToggle={onToggle}
          onReconnect={onReconnect}
        />
      ))}
      </div>
      )}
    </section>
  );
}

function PopoverBody({
  onAddConnection,
  onManage,
}: {
  onAddConnection?: () => void;
  onManage?: () => void;
}) {
  const {
    connections: activeConnections,
    isLoading: loadingActive,
  } = useBrokerConnections({ active: true, purpose: 'journal' });
  const {
    connections: inactiveConnections,
    isLoading: loadingInactive,
    reconnect,
  } = useBrokerConnections({ active: false, purpose: 'journal' });

  // Merge active + inactive so we can surface needs-attention indicators for
  // both connected and recently-disconnected connections.
  const allConnections = useMemo(
    () => [...activeConnections, ...inactiveConnections],
    [activeConnections, inactiveConnections],
  );

  const {
    tradovatePortfolios,
    brokerPortfolios,
    manualPortfolios,
    selectedPortfolioIds,
    togglePortfolioSelection,
    setSelectedPortfolioIds,
    isShowingAll,
    isLoading: loadingPortfolios,
  } = usePortfolioContext();

  const [reconnectFor, setReconnectFor] = useState<BrokerConnection | null>(null);
  // Groups default collapsed — tames the long prop-firm account list.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo<PortfolioGroup[]>(
    () =>
      buildAccountGroups(tradovatePortfolios, brokerPortfolios, manualPortfolios).map(g => {
        // Label a per-connection tradovate group by the connection's OWN name
        // (e.g. "APEX") — the name set at creation — not the firm-detected
        // fallback derived from the first account's spec.
        if (g.key.startsWith('conn-')) {
          const conn = allConnections.find(c => c.id === g.key.slice(5));
          const nm = conn?.connection_name?.trim();
          if (nm) return { ...g, label: nm };
        }
        return g;
      }),
    [tradovatePortfolios, brokerPortfolios, manualPortfolios, allConnections],
  );

  /**
   * Returns the BrokerConnection that backs a given portfolio, or undefined.
   *
   * - source === 'broker': direct match via portfolio.broker_connection_id
   *   (the portfolio id itself is "broker_<connection_uuid>").
   * - source === 'tradovate': match by environment — a Tradovate/NinjaTrader
   *   broker_connections row for the same environment backs this portfolio.
   * - source === 'manual': no backing connection.
   */
  const connectionForPortfolio = useCallback(
    (portfolio: Portfolio): BrokerConnection | undefined => {
      if (portfolio.source === 'broker') {
        const connId = portfolio.broker_connection_id;
        return connId ? allConnections.find(c => c.id === connId) : undefined;
      }
      if (portfolio.source === 'tradovate') {
        if (portfolio.credential_id) {
          const byCred = allConnections.find(c => c.id === portfolio.credential_id);
          if (byCred) return byCred;
        }
        return allConnections.find(
          c =>
            (c.broker === 'tradovate' || c.broker === 'ninja_trader') &&
            c.environment === portfolio.environment,
        );
      }
      return undefined;
    },
    [allConnections],
  );

  const toggleGroupExpanded = useCallback((key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleGroupToggle = useCallback((group: PortfolioGroup) => {
    const groupIds = group.portfolios.map(p => p.id);
    const currentReal = selectedPortfolioIds.filter(
      id => id !== ALL_PORTFOLIOS_ID,
    );
    const allSelected = groupIds.every(id => currentReal.includes(id));
    let nextIds: string[];
    if (allSelected) {
      nextIds = currentReal.filter(id => !groupIds.includes(id));
    } else {
      nextIds = Array.from(new Set([...currentReal, ...groupIds]));
    }
    if (nextIds.length === 0) {
      setSelectedPortfolioIds([ALL_PORTFOLIOS_ID]);
    } else {
      setSelectedPortfolioIds(nextIds);
    }
  }, [selectedPortfolioIds, setSelectedPortfolioIds]);

  const showLoading = loadingActive || loadingInactive || loadingPortfolios;
  const handleManage = () => {
    if (onManage) onManage();
    else onAddConnection?.();
  };

  return (
    <div className="flex flex-col gap-2.5" role="listbox" aria-multiselectable="true">
      <div className="px-1">
        <h3 className="text-sm font-semibold text-[#F4F4F4]">Broker Connections</h3>
        <p className="mt-0.5 text-[10px] font-light text-[#A0A0A0]">
          Choose which connected portfolios power this dashboard.
        </p>
      </div>

      {showLoading ? (
        <div className="py-2 text-center text-xs text-[#A0A0A0]">Loading...</div>
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-[#C9A646]/20 bg-[#141414]">
          {/* Scrollable account list — capped so it never runs off the viewport */}
          <div className="max-h-[55vh] overflow-y-auto pr-1">
          <button
            type="button"
            role="option"
            aria-selected={isShowingAll}
            onClick={() => setSelectedPortfolioIds([ALL_PORTFOLIOS_ID])}
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors',
              isShowingAll
                ? 'bg-[#C9A646]/5 text-[#C9A646]'
                : 'text-zinc-300 hover:bg-zinc-800/50',
            )}
          >
            <CheckboxMark checked={isShowingAll} compact />
            <span className="flex-1 text-left">All accounts</span>
          </button>

          {groups.length > 0 && (
            <>
              <div className="mx-2 border-t border-zinc-800/60" />
              <div className="px-3 pb-0.5 pt-2">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
                  My accounts
                </span>
              </div>

              {groups.map(group => {
                const isExpanded = expanded.has(group.key);
                const realSelected = selectedPortfolioIds.filter(
                  id => id !== ALL_PORTFOLIOS_ID,
                );
                const selectedInGroup = group.portfolios.filter(p => realSelected.includes(p.id)).length;
                const totalInGroup = group.portfolios.length;
                const allChecked = !isShowingAll && selectedInGroup === totalInGroup;
                const someChecked = !isShowingAll && selectedInGroup > 0 && selectedInGroup < totalInGroup;

                // Single-account groups with a non-prop-firm key render as a direct row (no collapse)
                const isPropFirmGroup = group.key.startsWith('pf_');
                const isMultiAccount = totalInGroup > 1;
                const useCollapse = isPropFirmGroup || isMultiAccount;

                if (!useCollapse) {
                  const portfolio = group.portfolios[0];
                  const conn = connectionForPortfolio(portfolio);
                  return (
                    <SimpleAccountRow
                      key={group.key}
                      portfolio={portfolio}
                      checked={!isShowingAll && selectedPortfolioIds.includes(portfolio.id)}
                      onToggle={togglePortfolioSelection}
                      connection={conn}
                      onReconnect={setReconnectFor}
                    />
                  );
                }

                // For the group header status dot, use the first portfolio's
                // connection — for a prop-firm group all accounts share the
                // same Tradovate connection (same environment), so any of them
                // represent the connection state.
                const groupConn = connectionForPortfolio(group.portfolios[0]);
                const groupDot = groupConn ? statusBadge(groupConn) : null;
                const groupNeedsAttention = groupConn ? connectionNeedsAttention(groupConn) : false;

                return (
                  <div key={group.key}>
                    {/* Group header row */}
                    <div
                      className="flex w-full cursor-pointer select-none items-center gap-2 px-3 py-1.5 transition-colors duration-100 hover:bg-zinc-800/40"
                      onClick={() => toggleGroupExpanded(group.key)}
                    >
                      {/* Tri-state checkbox */}
                      <button
                        type="button"
                        aria-label={`Toggle all ${group.label} accounts`}
                        onClick={e => {
                          e.stopPropagation();
                          handleGroupToggle(group);
                        }}
                        className={cn(
                          'flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border transition-all',
                          allChecked
                            ? 'border-[#C9A646] bg-[#C9A646]'
                            : someChecked
                              ? 'border-[#C9A646] bg-[#C9A646]/20'
                              : 'border-zinc-600 hover:border-zinc-400',
                        )}
                      >
                        {allChecked && <Check className="h-2.5 w-2.5 text-[#0A0A0A]" strokeWidth={3} />}
                        {someChecked && <Minus className="h-2.5 w-2.5 text-[#C9A646]" strokeWidth={3} />}
                      </button>

                      {/* Group label */}
                      <span className="flex-1 truncate text-[9px] font-semibold uppercase tracking-widest text-zinc-500">
                        {group.label}
                      </span>

                      {/* Connection status dot — shown for any non-ok state */}
                      {groupDot && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: groupDot.color, boxShadow: `0 0 6px ${groupDot.color}` }}
                          aria-label={groupDot.label}
                        />
                      )}

                      {/* Reconnect button — shown only when attention is needed */}
                      {groupNeedsAttention && groupConn && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setReconnectFor(groupConn);
                          }}
                          className="flex h-5 shrink-0 items-center gap-1 rounded border border-[#C9A646]/25 px-1.5 text-[9px] font-medium text-[#C9A646] transition-colors hover:border-[#C9A646]/45 hover:bg-[#C9A646]/10"
                          aria-label={`Reconnect ${group.label}`}
                        >
                          <RefreshCw className="h-2.5 w-2.5" />
                          Reconnect
                        </button>
                      )}

                      {/* Selected / total count */}
                      <span className="text-[9px] font-medium tabular-nums text-zinc-600">
                        {selectedInGroup}/{totalInGroup}
                      </span>

                      {/* Expand/collapse chevron */}
                      <ChevronDown
                        className={cn(
                          'h-3 w-3 flex-shrink-0 text-zinc-600 transition-transform duration-150',
                          !isExpanded && '-rotate-90',
                        )}
                      />
                    </div>

                    {/* Per-account rows (shown when expanded) */}
                    {isExpanded && group.portfolios.map(p => (
                      <SimpleAccountRow
                        key={p.id}
                        portfolio={p}
                        checked={!isShowingAll && selectedPortfolioIds.includes(p.id)}
                        onToggle={togglePortfolioSelection}
                        indent
                        connection={connectionForPortfolio(p)}
                        onReconnect={setReconnectFor}
                      />
                    ))}
                  </div>
                );
              })}
            </>
          )}
          </div>{/* end scrollable account list */}

          <div className="mx-2 mt-1 border-t border-zinc-800/60" />
          <div className="grid grid-cols-2 gap-2 p-2">
            <button
              onClick={onAddConnection}
              className="flex items-center justify-center gap-2 rounded-[10px] border border-[#C9A646]/30 px-3 py-2 text-xs font-medium text-[#C9A646] transition-colors hover:border-[#C9A646]/50 hover:bg-[#C9A646]/10"
            >
              <Plus className="h-3.5 w-3.5" />
              Add connection
            </button>
            <button
              onClick={handleManage}
              className="flex items-center justify-center gap-2 rounded-[10px] border border-zinc-700/70 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-[#C9A646]/35 hover:bg-zinc-800/50 hover:text-[#C9A646]"
            >
              <Settings className="h-3.5 w-3.5" />
              Manage
            </button>
          </div>
        </div>
      )}

      {reconnectFor && (
        <BrokerReconnectModal
          open={!!reconnectFor}
          onOpenChange={(open) => { if (!open) setReconnectFor(null); }}
          brokerName={reconnectFor.connection_name ?? reconnectFor.broker ?? 'Broker'}
          lastError={reconnectFor.last_error}
          onReconnect={async () => {
            const result = await reconnect(reconnectFor.id);
            // OQ-87: pass requires_credentials through so the modal closes
            // cleanly (parent shows the AddBroker popup via onAddConnection).
            if (result.requires_credentials && onAddConnection) {
              onAddConnection();
            }
            return {
              success: result.success,
              error: result.error,
              requires_credentials: result.requires_credentials,
            };
          }}
        />
      )}
    </div>
  );
}

export default function BrokerConnectionsPopover({ children, onAddConnection, onManage }: Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-[20px] border-t bg-[#141414] p-4"
          style={{ borderColor: BORDER_LIGHT }}
        >
          <PopoverBody onAddConnection={onAddConnection} onManage={onManage} />
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
        className="w-[360px] rounded-[16px] border bg-[#141414] p-3 shadow-[0_0_30px_rgba(201,166,70,0.15)]"
        style={{ borderColor: BORDER_LIGHT }}
      >
        <PopoverBody onAddConnection={onAddConnection} onManage={onManage} />
      </PopoverContent>
    </Popover>
  );
}
