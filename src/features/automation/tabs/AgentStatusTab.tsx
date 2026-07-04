// src/features/automation/tabs/AgentStatusTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Master switch + desktop agent device management + recent events feed.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { DataState } from '@/components/ds/DataState';
import { useAutomationEvents } from '../hooks/useAutomationEvents';
import { AutomationMasterSwitch } from '../components/AutomationMasterSwitch';
import { PairDeviceDialog } from '../components/PairDeviceDialog';
import { DeviceList } from '../components/DeviceList';

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-US');
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AgentStatusTab() {
  const { events, isLoading, isError, refetch } = useAutomationEvents({ limit: 20 });
  const [pairOpen, setPairOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* 1. Master switch */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
          Automation Control
        </h2>
        <AutomationMasterSwitch />
      </section>

      {/* 2. Desktop Agents — pair + list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Desktop Agents
          </h2>
          <Button
            variant="goldOutline"
            size="compact"
            showArrow={false}
            onClick={() => setPairOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Pair a new device
          </Button>
        </div>

        <DeviceList />

        <p className="mt-3 text-xs text-zinc-600">
          The desktop agent runs locally on your machine and is the only component that
          executes trades or enforces risk halts.{' '}
          <strong className="text-zinc-500">Nothing on this page executes orders.</strong>
        </p>
      </section>

      {/* 3. Recent activity */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
          Recent Activity
        </h2>
        <DataState
          isLoading={isLoading}
          isError={isError}
          data={events}
          onRetry={refetch}
          empty={
            <Card padding="compact" className="flex items-center gap-3 text-zinc-500">
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-sm">No automation events recorded yet.</span>
            </Card>
          }
        >
          {(data) => (
            <div className="space-y-1">
              {data.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start justify-between gap-4 px-3 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-300 font-mono">{evt.event_type}</p>
                    {evt.payload && (
                      <p className="text-xs text-zinc-600 truncate">
                        {JSON.stringify(evt.payload)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-zinc-600 shrink-0">
                    {formatRelative(evt.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DataState>
      </section>

      {/* Pair device dialog — rendered here so it has the tab's context */}
      <PairDeviceDialog open={pairOpen} onOpenChange={setPairOpen} />
    </div>
  );
}
