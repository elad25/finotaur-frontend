/**
 * Trading Arena — Order-Flow Alerts bell (v1).
 *
 * Toolbar trigger + Radix Popover dropdown (same portal-rendered pattern as
 * ColorSwatchPicker.tsx) showing: a compact settings row (master toggle,
 * per-type toggles, big-trade $ threshold input) followed by the last 50
 * alert events (see ../hooks/useOrderFlowAlerts.ts / ../orderflow/orderFlowAlerts.ts).
 * Bell + unseen-count badge only — no toasts, no sounds (v1 noise-control
 * spec). Clicking an event does nothing in v1 (no chart jump).
 */

import { useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Bell, Layers, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderFlowAlertEvent, OrderFlowAlertSettings } from '../orderflow/orderFlowAlerts';

export interface OrderFlowAlertsBellProps {
  events: OrderFlowAlertEvent[];
  unseenCount: number;
  onMarkAllSeen: () => void;
  settings: OrderFlowAlertSettings;
  onSettingsChange: (patch: Partial<OrderFlowAlertSettings>) => void;
  /** False for non-crypto symbols — v1 is Binance-live-feed-only (see the hook's header comment). */
  active: boolean;
  light?: boolean;
}

function formatEventTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function AlertTypeIcon({ type }: { type: OrderFlowAlertEvent['type'] }) {
  const Icon = type === 'STACKED_IMBALANCE' ? Layers : Zap;
  return <Icon className="mt-0.5 h-3 w-3 flex-shrink-0 text-[#707070]" aria-hidden="true" />;
}

export function OrderFlowAlertsBell({
  events,
  unseenCount,
  onMarkAllSeen,
  settings,
  onSettingsChange,
  active,
  light,
}: OrderFlowAlertsBellProps) {
  const [open, setOpen] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Standard bell UX — opening the dropdown clears the unseen badge.
    if (next) onMarkAllSeen();
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={!active}
          aria-label="Order-flow alerts"
          aria-haspopup="dialog"
          aria-expanded={open}
          title={active ? 'Order-flow alerts' : 'Order-flow alerts are available for crypto symbols only'}
          className={cn(
            'relative flex items-center justify-center h-7 w-7 flex-shrink-0 rounded transition-all duration-150 border',
            !active && 'opacity-40 cursor-not-allowed',
            open
              ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border-[rgba(201,166,70,0.45)]'
              : light
                ? 'text-[#6a6d78] hover:text-[#131722] hover:bg-[rgba(0,0,0,0.04)] border-transparent'
                : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
          )}
        >
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          {unseenCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-[3px] text-[9px] font-bold leading-none text-black"
              style={{ background: '#C9A646' }}
              aria-hidden="true"
            >
              {unseenCount > 9 ? '9+' : unseenCount}
            </span>
          )}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-[10000] flex w-[320px] flex-col rounded-lg border shadow-lg outline-none"
          style={{ background: '#0D0D0F', borderColor: 'rgba(201,166,70,0.25)' }}
          aria-label="Order-flow alerts"
        >
          {/* Settings row */}
          <div className="flex flex-col gap-2 border-b p-2.5" style={{ borderColor: 'rgba(201,166,70,0.12)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#E8E8E8]">Order-Flow Alerts</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <span className="text-[10px] text-[#707070]">On</span>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => onSettingsChange({ enabled: e.target.checked })}
                  className="h-3.5 w-3.5 accent-[#C9A646]"
                  aria-label="Enable order-flow alerts"
                />
              </label>
            </div>

            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="flex items-center gap-1.5 text-[10px] text-[#909090]">
                <Layers className="h-3 w-3" aria-hidden="true" />
                Stacked imbalance
              </span>
              <input
                type="checkbox"
                checked={settings.stackedImbalanceEnabled}
                disabled={!settings.enabled}
                onChange={(e) => onSettingsChange({ stackedImbalanceEnabled: e.target.checked })}
                className="h-3.5 w-3.5 accent-[#C9A646] disabled:opacity-40"
              />
            </label>

            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="flex items-center gap-1.5 text-[10px] text-[#909090]">
                <Zap className="h-3 w-3" aria-hidden="true" />
                Big trade
              </span>
              <input
                type="checkbox"
                checked={settings.bigTradeEnabled}
                disabled={!settings.enabled}
                onChange={(e) => onSettingsChange({ bigTradeEnabled: e.target.checked })}
                className="h-3.5 w-3.5 accent-[#C9A646] disabled:opacity-40"
              />
            </label>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#909090]">Big trade threshold ($)</span>
              <input
                type="number"
                min={0}
                step={1000}
                placeholder="Auto"
                value={settings.bigTradeThresholdUsd ?? ''}
                disabled={!settings.enabled || !settings.bigTradeEnabled}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    onSettingsChange({ bigTradeThresholdUsd: null });
                    return;
                  }
                  const parsed = Number(raw);
                  if (Number.isFinite(parsed) && parsed > 0) onSettingsChange({ bigTradeThresholdUsd: parsed });
                }}
                className="h-6 w-24 rounded border bg-transparent text-right text-[11px] text-[#C0C0C0] outline-none focus:border-[rgba(201,166,70,0.55)] disabled:opacity-40"
                style={{ borderColor: 'rgba(201,166,70,0.25)' }}
                aria-label="Big trade threshold in dollars"
              />
            </div>
          </div>

          {/* Event list */}
          <div className="max-h-[280px] overflow-y-auto">
            {!active ? (
              <p className="px-3 py-4 text-center text-[11px] text-[#707070]">
                Alerts are available for crypto symbols only.
              </p>
            ) : events.length === 0 ? (
              <p className="px-3 py-4 text-center text-[11px] text-[#707070]">No alerts yet.</p>
            ) : (
              <ul>
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start gap-2 border-b px-2.5 py-2 last:border-b-0"
                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <AlertTypeIcon type={event.type} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span
                        className="truncate text-[11px] font-medium"
                        style={{ color: event.side === 'buy' ? '#22c55e' : '#dc2626' }}
                      >
                        {event.message}
                      </span>
                      <span className="text-[9px] text-[#5a5a5a]">{formatEventTime(event.time)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
