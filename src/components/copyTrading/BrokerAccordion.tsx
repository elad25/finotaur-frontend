// src/components/copyTrading/BrokerAccordion.tsx
// Collapsible broker card containing one AccountRow per connection.
// All colors use DS tokens — no raw Tailwind color classes.
import { useState, memo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { AccountRow } from './AccountRow';
import { BROKER_CONFIGS, type BrokerName } from '@/lib/brokers/types';
import type { BrokerConnection } from '@/lib/brokers/types';

interface BrokerAccordionProps {
  broker: BrokerName;
  connections: BrokerConnection[];
  liveCredentialIds: Set<string>;
  defaultExpanded?: boolean;
  onDisconnect: (id: string) => void;
}

export const BrokerAccordion = memo(function BrokerAccordion({
  broker,
  connections,
  liveCredentialIds,
  defaultExpanded = false,
  onDisconnect,
}: BrokerAccordionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const config = BROKER_CONFIGS[broker];
  const isEmpty = connections.length === 0;
  const liveCount = connections.filter(c => liveCredentialIds.has(c.id)).length;

  return (
    <div className={`rounded-lg bg-surface-1 border border-border-ds-subtle transition-opacity duration-base ${isEmpty ? 'opacity-40' : ''}`}>
      <button
        onClick={() => !isEmpty && setExpanded(v => !v)}
        disabled={isEmpty}
        className={`w-full flex items-center gap-ds-3 px-ds-4 py-ds-3 ${isEmpty ? 'cursor-default' : 'cursor-pointer hover:bg-surface-2 transition-colors duration-base'}`}
      >
        {!isEmpty && (
          expanded
            ? <ChevronDown  className="w-4 h-4 text-ink-secondary flex-shrink-0" />
            : <ChevronRight className="w-4 h-4 text-ink-secondary flex-shrink-0" />
        )}
        {isEmpty && <span className="w-4 h-4 flex-shrink-0" />}
        <span className="flex-1 text-left text-sm font-medium text-ink-primary">
          {config?.displayName ?? broker}
        </span>
        <span className="text-xs text-ink-secondary">
          {isEmpty
            ? 'Not connected'
            : `${connections.length} account${connections.length === 1 ? '' : 's'}${liveCount > 0 ? ` · ${liveCount} live` : ''}`}
        </span>
      </button>

      {expanded && !isEmpty && (
        <div className="px-ds-3 pb-ds-3 space-y-1.5">
          {connections.map(conn => (
            <AccountRow
              key={conn.id}
              connection={conn}
              isLive={liveCredentialIds.has(conn.id)}
              onDisconnect={onDisconnect}
            />
          ))}
        </div>
      )}
    </div>
  );
});
