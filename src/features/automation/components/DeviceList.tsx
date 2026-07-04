// src/features/automation/components/DeviceList.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Renders the list of paired automation_agent_devices.
// Each row: device_name, online/offline badge, agent_version, last seen,
// platform, and an Unpair button (with confirmation dialog).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { DataState } from '@/components/ds/DataState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAgentDevices } from '../hooks/useAgentDevices';
import type { AutomationAgentDevice } from '../lib/automationTypes';

// ── relative time (same logic as AgentStatusTab.formatRelative) ──────────────

function formatRelative(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-US');
}

// ── confirm unpair dialog ─────────────────────────────────────────────────────

interface ConfirmUnpairDialogProps {
  device: AutomationAgentDevice | null;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function ConfirmUnpairDialog({
  device,
  onConfirm,
  onCancel,
  isPending,
}: ConfirmUnpairDialogProps) {
  return (
    <Dialog open={!!device} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="border-border-ds-subtle bg-surface-1 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Unpair device</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Remove{' '}
            <span className="text-zinc-200 font-medium">{device?.device_name ?? 'this device'}</span>{' '}
            from your account? The agent will stop receiving configuration updates
            and will halt automation.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 mt-2">
          <Button
            variant="goldOutline"
            size="compact"
            showArrow={false}
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-xl',
              'py-2 px-5 text-xs font-medium',
              'bg-red-500/10 border border-red-500/30 text-red-400',
              'hover:bg-red-500/20 hover:border-red-500/50 transition-colors',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            {isPending ? 'Unpairing…' : 'Unpair'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── single device row ─────────────────────────────────────────────────────────

interface DeviceRowProps {
  device: AutomationAgentDevice;
  onUnpair: (device: AutomationAgentDevice) => void;
}

function DeviceRow({ device, onUnpair }: DeviceRowProps) {
  const online = device.isOnline ?? false;

  return (
    <Card padding="compact" className="flex items-center justify-between gap-4">
      {/* left: name + meta */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* online/offline badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
              online
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-zinc-700/50 text-zinc-500',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                online ? 'bg-emerald-400' : 'bg-zinc-600',
              )}
              aria-hidden="true"
            />
            {online ? 'Online' : 'Offline'}
          </span>

          <span className="text-sm font-medium text-zinc-200 truncate">
            {device.device_name}
          </span>

          {device.platform && (
            <span className="text-xs text-zinc-600">{device.platform}</span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-600">
          <span>
            v{device.agent_version ?? '—'}
          </span>
          <span aria-hidden="true">·</span>
          <span>Last seen {formatRelative(device.last_heartbeat_at)}</span>
        </div>
      </div>

      {/* right: unpair button */}
      <button
        type="button"
        onClick={() => onUnpair(device)}
        className="p-1.5 rounded text-zinc-500 hover:text-red-400 transition-colors shrink-0"
        aria-label={`Unpair ${device.device_name}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </Card>
  );
}

// ── main export ───────────────────────────────────────────────────────────────

export function DeviceList() {
  const { devices, isLoading, isError, error, refetch, unpairDevice } = useAgentDevices();

  const [pendingUnpair, setPendingUnpair] = useState<AutomationAgentDevice | null>(null);
  const [isUnpairing, setIsUnpairing] = useState(false);

  const handleConfirmUnpair = async () => {
    if (!pendingUnpair) return;
    setIsUnpairing(true);
    await unpairDevice(pendingUnpair.id);
    setIsUnpairing(false);
    setPendingUnpair(null);
  };

  return (
    <>
      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={devices}
        onRetry={refetch}
        empty={
          <Card padding="compact" className="text-center py-6">
            <p className="text-sm text-zinc-500">No devices paired yet.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Click "Pair a new device" above to connect your desktop agent.
            </p>
          </Card>
        }
      >
        {(data) => (
          <div className="space-y-2">
            {data.map((device) => (
              <DeviceRow
                key={device.id}
                device={device}
                onUnpair={setPendingUnpair}
              />
            ))}
          </div>
        )}
      </DataState>

      <ConfirmUnpairDialog
        device={pendingUnpair}
        onConfirm={handleConfirmUnpair}
        onCancel={() => setPendingUnpair(null)}
        isPending={isUnpairing}
      />
    </>
  );
}
