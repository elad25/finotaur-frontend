// src/components/broker/BrokerConnectionsPopover.tsx
// Compact broker/account selector anchored to the journal dashboard broker button.

import { useMemo, useState } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronUp, Plus, RefreshCw } from 'lucide-react';
import { BROKER_CONFIGS, BrokerName, BrokerConnection } from '@/lib/brokers/types';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { statusBadge } from '@/components/broker/brokerStatusBadge';
import { BrokerReconnectModal } from '@/components/broker/BrokerReconnectModal';
import { usePortfolioContext, ALL_PORTFOLIOS_ID } from '@/contexts/PortfolioContext';
import type { Portfolio } from '@/hooks/usePortfolios';
import { cn } from '@/lib/utils';

const BORDER_LIGHT = 'rgba(255, 215, 0, 0.08)';

interface Props {
  children: React.ReactNode;
  onAddConnection?: () => void;
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
  const hasConnectionIssue = connection && connection.status !== 'connected' && connection.status !== 'active';
  const environment = portfolio.environment ? portfolio.environment.toUpperCase() : null;

  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      onClick={() => onToggle(portfolio.id)}
      className={cn(
        'group flex w-full items-center gap-2 rounded-[7px] px-2.5 py-1 text-left transition-all duration-150',
        checked
          ? 'bg-[#C9A646]/[0.07]'
          : 'hover:bg-[#101010]',
      )}
    >
      <CheckboxMark checked={checked} compact />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[11px] font-semibold leading-tight text-[#EDEDED]">
            {portfolio.name}
          </span>
          {environment && (
            <span className="rounded-sm border border-[#C9A646]/20 bg-[#C9A646]/[0.08] px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wide text-[#C9A646]">
              {environment}
            </span>
          )}
        </div>
        {connection?.last_sync_at && (
          <div className="flex min-w-0 items-center gap-1.5 text-[8px] leading-tight text-[#777]">
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
  const hasConnectionIssue = group.connection
    && group.connection.status !== 'connected'
    && group.connection.status !== 'renewing';

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

function PopoverBody({ onAddConnection }: { onAddConnection?: () => void }) {
  const {
    connections: active,
    isLoading: loadingActive,
  } = useBrokerConnections({ active: true });
  const {
    connections: inactive,
    isLoading: loadingInactive,
    reconnect,
  } = useBrokerConnections({ active: false });

  const {
    portfolios,
    tradovatePortfolios,
    manualPortfolios,
    selectedPortfolioIds,
    togglePortfolioSelection,
    setSelectedPortfolioIds,
    isShowingAll,
    isLoading: loadingPortfolios,
  } = usePortfolioContext();

  const [reconnectFor, setReconnectFor] = useState<BrokerConnection | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const allConnections = useMemo(() => [...active, ...inactive], [active, inactive]);

  const toggleGroupOpen = (id: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const connectionForPortfolio = useMemo(() => {
    const byTradovateId = new Map<string, BrokerConnection>();
    for (const connection of allConnections) {
      if (connection.account_id) byTradovateId.set(String(connection.account_id), connection);
    }

    return (portfolio: Portfolio) => {
      if (portfolio.source !== 'tradovate' || !portfolio.tradovate_account_id) return undefined;
      return byTradovateId.get(String(portfolio.tradovate_account_id));
    };
  }, [allConnections]);

  const connectionGroups = useMemo<ConnectionGroup[]>(() => {
    const groups = new Map<string, ConnectionGroup>();

    for (const portfolio of tradovatePortfolios) {
      const connection = connectionForPortfolio(portfolio);
      const broker = (connection?.broker as BrokerName | undefined) ?? 'tradovate';
      const title = connection?.connection_name?.trim()
        || portfolio.connection_label?.trim()
        || 'Tradovate connection';
      const key = `${broker}:${title}`;

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          title,
          broker,
          portfolios: [],
          connection,
        });
      }

      groups.get(key)!.portfolios.push(portfolio);
    }

    if (manualPortfolios.length > 0) {
      groups.set('manual', {
        id: 'manual',
        title: 'Manual',
        broker: 'manual',
        portfolios: manualPortfolios,
      });
    }

    return Array.from(groups.values());
  }, [tradovatePortfolios, manualPortfolios, connectionForPortfolio]);

  const showLoading = loadingActive || loadingInactive || loadingPortfolios;

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
        <>
          <AllAccountsRow
            checked={isShowingAll}
            total={portfolios.length}
            onSelect={() => setSelectedPortfolioIds([ALL_PORTFOLIOS_ID])}
          />

          {connectionGroups.map((group) => (
            <ConnectionGroupSection
              key={group.id}
              group={group}
              connectionFor={connectionForPortfolio}
              selectedPortfolioIds={selectedPortfolioIds}
              isShowingAll={isShowingAll}
              isOpen={!collapsedGroups.has(group.id)}
              onToggle={togglePortfolioSelection}
              onToggleOpen={toggleGroupOpen}
              onReconnect={setReconnectFor}
            />
          ))}
        </>
      )}

      <button
        onClick={onAddConnection}
        className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-[#C9A646]/30 px-4 py-2 text-xs font-medium text-[#C9A646] transition-colors hover:border-[#C9A646]/50 hover:bg-[#C9A646]/10"
      >
        <Plus className="h-3.5 w-3.5" />
        Add new connection
      </button>

      {reconnectFor && (
        <BrokerReconnectModal
          open={!!reconnectFor}
          onOpenChange={(open) => { if (!open) setReconnectFor(null); }}
          brokerName={reconnectFor.connection_name ?? reconnectFor.broker ?? 'Broker'}
          lastError={reconnectFor.last_error}
          onReconnect={async () => {
            const result = await reconnect(reconnectFor.id);
            return { success: result.success, error: result.error };
          }}
        />
      )}
    </div>
  );
}

export default function BrokerConnectionsPopover({ children, onAddConnection }: Props) {
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
        className="w-[360px] rounded-[16px] border bg-[#141414] p-3 shadow-[0_0_30px_rgba(201,166,70,0.15)]"
        style={{ borderColor: BORDER_LIGHT }}
      >
        <PopoverBody onAddConnection={onAddConnection} />
      </PopoverContent>
    </Popover>
  );
}
