// src/components/copyTrading/AccountRow.tsx
// Per-connection row inside BrokerAccordion.
// All colors use DS tokens — no raw Tailwind color classes.
import { memo } from 'react';
import { Unplug } from 'lucide-react';
import type { BrokerConnection } from '@/lib/brokers/types';

interface AccountRowProps {
  connection: BrokerConnection;
  isLive: boolean;
  onDisconnect: (id: string) => void;
}

export const AccountRow = memo(function AccountRow({
  connection,
  isLive,
  onDisconnect,
}: AccountRowProps) {
  const tokenExpired = connection.token_expires_at
    ? new Date(connection.token_expires_at) < new Date()
    : false;

  const status: 'live' | 'engine-offline' | 'expired' | 'disconnected' =
    tokenExpired                                                 ? 'expired' :
    isLive                                                       ? 'live' :
    (connection.is_active && connection.status === 'connected')  ? 'engine-offline' :
    'disconnected';

  const dotClass =
    status === 'live'           ? 'bg-gold-primary animate-pulse' :
    status === 'engine-offline' ? 'bg-status-warning' :
    status === 'expired'        ? 'bg-num-negative' :
                                  'bg-ink-tertiary';

  const textClass =
    status === 'live'           ? 'text-gold-primary' :
    status === 'engine-offline' ? 'text-status-warning' :
    status === 'expired'        ? 'text-num-negative' :
                                  'text-ink-tertiary';

  const statusLabel =
    status === 'live'           ? 'Live' :
    status === 'engine-offline' ? 'Engine offline' :
    status === 'expired'        ? 'Token expired' :
                                  'Disconnected';

  return (
    <div className="flex items-center gap-ds-3 py-ds-2 px-ds-3 rounded-md bg-surface-1 border border-border-ds-subtle">
      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${dotClass}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-ds-2">
          <span className="text-sm text-ink-primary truncate">
            {connection.account_name ?? connection.account_id}
          </span>
          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${
            connection.environment === 'live'
              ? 'border-gold-border text-gold-primary'
              : 'border-border-ds-subtle text-ink-secondary'
          }`}>
            {connection.environment}
          </span>
        </div>
        <div className={`text-[11px] ${textClass}`}>{statusLabel}</div>
      </div>
      <button
        onClick={() => onDisconnect(connection.id)}
        className="text-ink-tertiary hover:text-num-negative transition-colors duration-base"
        aria-label="Disconnect"
      >
        <Unplug className="w-4 h-4" />
      </button>
    </div>
  );
});
