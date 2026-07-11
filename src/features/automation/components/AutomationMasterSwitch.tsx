// src/features/automation/components/AutomationMasterSwitch.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Master enable + kill switch toggles, wired to useAutomationSettings.
// Rendered as compact pill-buttons (checkbox on the left) so they sit inline in
// the Automation control header, next to the "Lock all accounts" button.
// The "accounts locked" notice is a separate export so it can live on its own
// full-width row below the button strip.
// ─────────────────────────────────────────────────────────────────────────────

import { Power, AlertOctagon, Lock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAutomationSettings } from '../hooks/useAutomationSettings';
import { usePortfolios } from '@/hooks/usePortfolios';

/** True when at least one portfolio is kill-switch-locked until a future time. */
function useAnyAccountsLocked(): boolean {
  const { portfolios } = usePortfolios();
  const now = new Date();
  return portfolios.some(
    (p) =>
      (p.kill_switch_active ?? false) &&
      p.kill_switch_locked_until != null &&
      new Date(p.kill_switch_locked_until) > now,
  );
}

interface AutomationMasterSwitchProps {
  /** Demo mode: display as an active/enabled switch, but every write is inert. */
  demo?: boolean;
}

export function AutomationMasterSwitch({ demo = false }: AutomationMasterSwitchProps) {
  // Hooks are called unconditionally per React rules — their values are just
  // not read (and their writes never fire) when `demo` is true.
  const { settings: realSettings, upsert, isLoading } = useAutomationSettings();
  const anyLocked = useAnyAccountsLocked();

  // Demo: show a static "running" visual (enabled, kill switch not engaged)
  // instead of the real hook's value.
  const settings = demo ? { ...realSettings, master_enabled: true, kill_switch_engaged: false } : realSettings;

  const handleMasterToggle = async (checked: boolean) => {
    if (demo) return; // demo: no network, no DB write
    await upsert({ master_enabled: checked });
  };

  const handleKillSwitch = async (checked: boolean) => {
    if (demo) return; // demo: no network, no DB write
    await upsert({ kill_switch_engaged: checked });
  };

  const masterOn = settings.master_enabled && !settings.kill_switch_engaged;
  const killOn = settings.kill_switch_engaged;
  const masterDisabled = isLoading || settings.kill_switch_engaged || (anyLocked && settings.master_enabled);
  const killDisabled = isLoading || (anyLocked && !settings.kill_switch_engaged);

  // Base shape shared with the "Lock all accounts" button.
  const pillBase =
    'flex items-center gap-ds-2 rounded-lg border px-ds-3 py-ds-2 text-sm font-semibold transition-colors select-none';

  return (
    <div className="flex flex-wrap items-center gap-ds-2">
      {/* Automation enabled */}
      <label
        className={cn(
          pillBase,
          masterDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          masterOn
            ? 'border-emerald-600/60 bg-emerald-600/10 text-emerald-400 hover:border-emerald-500 hover:bg-emerald-600/20 hover:text-emerald-300'
            : 'border-zinc-700 bg-zinc-800/40 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800',
        )}
        title={
          anyLocked && settings.master_enabled
            ? "You have locked accounts — automation stays on until the lock releases (5:00 PM CT)."
            : 'When enabled, the desktop agent (when paired) will enforce risk rules and execute copier routes. This does nothing until a desktop agent is connected.'
        }
      >
        <Checkbox
          checked={settings.master_enabled}
          onCheckedChange={(v) => handleMasterToggle(Boolean(v))}
          disabled={masterDisabled}
        />
        <Power className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        Automation enabled
      </label>

      {/* Kill switch */}
      <label
        className={cn(
          pillBase,
          killDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          killOn
            ? 'border-red-600/60 bg-red-600/10 text-red-400 hover:border-red-500 hover:bg-red-600/20 hover:text-red-300'
            : 'border-zinc-700 bg-zinc-800/40 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800',
        )}
        title={
          anyLocked && !settings.kill_switch_engaged
            ? "Can't engage the kill switch while accounts are locked — it would disable the lock. Releases at 5:00 PM CT."
            : 'Immediately halts all automation activity on the desktop agent. Use in emergencies. Overrides master enable.'
        }
      >
        <Checkbox
          checked={settings.kill_switch_engaged}
          onCheckedChange={(v) => handleKillSwitch(Boolean(v))}
          disabled={killDisabled}
        />
        <AlertOctagon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        Kill switch
      </label>
    </div>
  );
}

/**
 * Full-width notice shown below the automation button strip when one or more
 * accounts are kill-switch-locked. Renders nothing when nothing is locked.
 */
export function AutomationLockedBanner() {
  const anyLocked = useAnyAccountsLocked();
  if (!anyLocked) return null;

  return (
    <div className="mt-ds-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
      <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <span>
        You have locked accounts. Automation stays on until the lock releases at 5:00 PM
        CT — you can't turn it off or engage the kill switch until then.
      </span>
    </div>
  );
}
