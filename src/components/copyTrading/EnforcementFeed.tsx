// src/components/copyTrading/EnforcementFeed.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Observability panel — shows recent risk-enforcement and copy-failure
// events so a user can SEE their protection actually working (halts,
// blocked copies) rather than trusting it blindly.
// ─────────────────────────────────────────────────────────────────────────────

import { ShieldAlert, XOctagon } from 'lucide-react';
import { Card, Eyebrow } from '@/components/ds/Card';
import { DataState } from '@/components/ds/DataState';
import { cn } from '@/lib/utils';
import {
  useAutomationEvents,
  parseEnforcementEvent,
  type AutomationEvent,
} from '@/features/automation/hooks/useAutomationEvents';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EnforcementFeedProps {
  /** When provided, only events for this account are shown. */
  accountId?: string | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Same inline relative-time approach used in `AgentStatusTab.tsx`. */
function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

interface EventBadgeConfig {
  label: string;
  className: string;
  Icon: typeof ShieldAlert;
}

const BADGE_BY_TYPE: Record<string, EventBadgeConfig> = {
  risk_enforced: {
    label: 'Risk enforced',
    className: 'bg-gold-primary/10 border border-gold-border text-gold-muted',
    Icon: ShieldAlert,
  },
  copy_failed: {
    label: 'Copy failed',
    className: 'bg-red-500/10 border border-red-500/30 text-red-400',
    Icon: XOctagon,
  },
};

function getBadgeConfig(eventType: string): EventBadgeConfig {
  return (
    BADGE_BY_TYPE[eventType] ?? {
      label: eventType,
      className: 'bg-zinc-500/10 border border-zinc-500/30 text-zinc-400',
      Icon: ShieldAlert,
    }
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EnforcementFeed({ accountId, className }: EnforcementFeedProps) {
  const { events, isLoading, isError, refetch } = useAutomationEvents({
    eventTypes: ['risk_enforced', 'copy_failed'],
    limit: 30,
  });

  const filteredEvents: AutomationEvent[] = accountId
    ? events.filter((e) => parseEnforcementEvent(e).accountId === accountId)
    : events;

  return (
    <Card padding="compact" className={cn('space-y-3', className)}>
      <Eyebrow>Protection activity</Eyebrow>

      <DataState
        isLoading={isLoading}
        isError={isError}
        data={filteredEvents}
        onRetry={refetch}
        empty={
          <p className="text-sm text-zinc-500 py-4">
            No enforcement events yet — your risk limits haven't fired.
          </p>
        }
      >
        {(data) => (
          <div className="space-y-1">
            {data.map((evt) => {
              const parsed = parseEnforcementEvent(evt);
              const badge = getBadgeConfig(evt.event_type);
              const { Icon } = badge;

              return (
                <div
                  key={evt.id}
                  className="flex items-start justify-between gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
                        badge.className,
                      )}
                    >
                      <Icon className="h-3 w-3" aria-hidden="true" />
                      {badge.label}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-300 truncate">{parsed.message}</p>
                      {!accountId && parsed.accountId && (
                        <p className="text-xs text-zinc-600 truncate">
                          Account: {parsed.accountId}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600 shrink-0">
                    {formatRelative(evt.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </DataState>
    </Card>
  );
}

export default EnforcementFeed;
