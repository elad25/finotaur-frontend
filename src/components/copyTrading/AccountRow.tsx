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

  // 3-state model (per Elad's spec, 2026-05-09): green / yellow / black only.
  //   connected   = engine has live session AND token valid
  //   issue       = communication problem (token expired OR engine offline despite DB connected)
  //   disconnected = not connected at all
  const status: 'connected' | 'issue' | 'disconnected' =
    isLive && !tokenExpired                                                       ? 'connected' :
    (connection.is_active && connection.status === 'connected') || tokenExpired   ? 'issue' :
                                                                                    'disconnected';

  const dotClass =
    status === 'connected' ? 'bg-status-success animate-pulse' :
    status === 'issue'     ? 'bg-status-warning' :
                             'bg-status-offline border border-border-ds-default';

  const textClass =
    status === 'connected' ? 'text-status-success' :
    status === 'issue'     ? 'text-status-warning' :
                             'text-ink-tertiary';

  const statusLabel =
    status === 'connected' ? 'Connected' :
    status === 'issue'     ? (tokenExpired ? 'Token expired' : 'Engine offline') :
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
