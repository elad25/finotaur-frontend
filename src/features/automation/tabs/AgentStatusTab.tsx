// src/features/automation/tabs/AgentStatusTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Master switch + desktop agent device management + recent events feed.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { Plus, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { useTimedQuery } from '@/hooks/useTimedQuery';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { DataState } from '@/components/ds/DataState';
import { AutomationMasterSwitch } from '../components/AutomationMasterSwitch';
import { PairDeviceDialog } from '../components/PairDeviceDialog';
import { DeviceList } from '../components/DeviceList';
import { useAgentDevices } from '../hooks/useAgentDevices';
import { useAgentCommands } from '../hooks/useAgentCommands';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ── recent events (optional, read-only) ──────────────────────────────────────

interface AutomationEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

function useRecentEvents() {
  const { id: userId } = useEffectiveUser();
  return useTimedQuery({
    queryKey: ['automation', 'events', userId ?? ''],
    queryFn: async (): Promise<AutomationEvent[]> => {
      const { data, error } = await supabase
        .from('automation_events')
        .select('id,event_type,payload,created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error?.code === '42P01') return [];
      if (error) throw error;
      return (data ?? []) as AutomationEvent[];
    },
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

// ─────────────────────────────────────────────────────────────────────────────

// ── Emergency controls ────────────────────────────────────────────────────────

type ConfirmTarget = 'flatten_all' | 'cancel_orders' | null;

function EmergencyControls() {
  const { devices } = useAgentDevices();
  const { enqueueCommand, isSending } = useAgentCommands();
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);

  const hasPairedDevice = devices.length > 0;

  const handleConfirm = useCallback(async () => {
    if (!confirmTarget) return;
    try {
      const count = await enqueueCommand(confirmTarget);
      const label = confirmTarget === 'flatten_all' ? 'Flatten' : 'Cancel orders';
      toast.success(`${label} command sent to ${count} device${count !== 1 ? 's' : ''}.`);
    } catch {
      // error toast already shown by enqueueCommand
    } finally {
      setConfirmTarget(null);
    }
  }, [confirmTarget, enqueueCommand]);

  const dialogConfig = {
    flatten_all: {
      title: 'Flatten all positions?',
      description:
        'This sends an immediate flatten command to your connected desktop agent(s). All open positions on the linked accounts will be closed at market. This cannot be undone.',
      actionLabel: 'Flatten all',
    },
    cancel_orders: {
      title: 'Cancel all orders?',
      description:
        'This sends an immediate cancel-all command to your connected desktop agent(s). All pending orders on the linked accounts will be cancelled. This cannot be undone.',
      actionLabel: 'Cancel all orders',
    },
  } as const;

  const active = confirmTarget ? dialogConfig[confirmTarget] : null;

  return (
    <>
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-1">
          Emergency Controls
        </h2>
        <p className="text-xs text-zinc-500 mb-3">
          Manual, user-initiated controls. Commands are sent to your paired desktop agent(s)
          and executed on your own live brokerage accounts.
        </p>

        {hasPairedDevice ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isSending}
              onClick={() => setConfirmTarget('flatten_all')}
              className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:border-red-400/60 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending && confirmTarget === 'flatten_all' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              )}
              Flatten all positions
            </button>

            <button
              type="button"
              disabled={isSending}
              onClick={() => setConfirmTarget('cancel_orders')}
              className="flex items-center gap-2 rounded-xl border border-zinc-600/50 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-700/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending && confirmTarget === 'cancel_orders' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Cancel all orders
            </button>
          </div>
        ) : (
          <p className="text-xs text-zinc-600 italic">
            Pair a desktop agent to enable emergency controls.
          </p>
        )}
      </section>

      {/* Confirmation dialog */}
      <AlertDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => { if (!open) setConfirmTarget(null); }}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {active?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {active?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isSending}
              className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSending}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirm();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isSending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </span>
              ) : (
                active?.actionLabel
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AgentStatusTab() {
  const { data: events = [], isLoading, isError, error, refetch } = useRecentEvents();
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

      {/* 3. Emergency controls */}
      <EmergencyControls />

      {/* 4. Recent activity */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
          Recent Activity
        </h2>
        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
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
