// src/features/automation/components/AutomationMasterSwitch.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Master enable + kill switch toggles, wired to useAutomationSettings.
// ─────────────────────────────────────────────────────────────────────────────

import { Power, AlertOctagon } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAutomationSettings } from '../hooks/useAutomationSettings';

export function AutomationMasterSwitch() {
  const { settings, upsert, isLoading } = useAutomationSettings();

  const handleMasterToggle = async (checked: boolean) => {
    await upsert({ master_enabled: checked });
  };

  const handleKillSwitch = async (checked: boolean) => {
    await upsert({ kill_switch_engaged: checked });
  };

  return (
    <div className="space-y-3">
      {/* Master enabled */}
      <Card padding="compact">
        <label className="flex items-start gap-4 cursor-pointer">
          <Checkbox
            checked={settings.master_enabled}
            onCheckedChange={(v) => handleMasterToggle(Boolean(v))}
            disabled={isLoading || settings.kill_switch_engaged}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Power
                className={cn(
                  'h-4 w-4',
                  settings.master_enabled ? 'text-emerald-400' : 'text-zinc-500',
                )}
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-zinc-200">Automation enabled</span>
              {settings.master_enabled && !settings.kill_switch_engaged && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              When enabled, the desktop agent (when paired) will enforce risk rules and
              execute copier routes. This does nothing until a desktop agent is connected.
            </p>
          </div>
        </label>
      </Card>

      {/* Kill switch */}
      <Card
        padding="compact"
        className={cn(settings.kill_switch_engaged && 'border-red-500/40 bg-red-500/5')}
      >
        <label className="flex items-start gap-4 cursor-pointer">
          <Checkbox
            checked={settings.kill_switch_engaged}
            onCheckedChange={(v) => handleKillSwitch(Boolean(v))}
            disabled={isLoading}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <AlertOctagon
                className={cn(
                  'h-4 w-4',
                  settings.kill_switch_engaged ? 'text-red-400' : 'text-zinc-500',
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  'text-sm font-medium',
                  settings.kill_switch_engaged ? 'text-red-300' : 'text-zinc-200',
                )}
              >
                Kill switch
              </span>
              {settings.kill_switch_engaged && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold uppercase tracking-wider">
                  Engaged
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Immediately halts all automation activity on the desktop agent. Use in
              emergencies. Overrides master enable.
            </p>
          </div>
        </label>
      </Card>
    </div>
  );
}
