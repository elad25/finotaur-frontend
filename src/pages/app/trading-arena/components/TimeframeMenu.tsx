/**
 * Trading Arena — TradingView-style timeframe menu.
 *
 * Renders a single "Timeframe ▾" dropdown trigger (its caption always shows
 * the current interval) — grouped SECONDS/MINUTES/HOURS/DAYS rows plus a
 * "Custom…" row that opens a small dialog (number + unit) for arbitrary
 * timeframes not in the fixed grid.
 *
 * Selecting any interval (preset row or custom) just switches the active
 * interval — there is no favoriting/pinning mechanism and no separate
 * quick-access strip.
 *
 * Visual language matches ArenaToolbar's local ToolbarTrigger (dark panel,
 * gold accents, no Radix Popover — same intentional scope choice). The
 * "Custom…" dialog is the one place this feature uses Radix Dialog (see
 * src/components/ui/dialog.tsx), which requires a DialogTitle — CI enforces
 * this project-wide.
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ARENA_TIMEFRAME_GROUPS,
  buildCustomInterval,
  formatIntervalLabel,
  formatIntervalShort,
  type ArenaInterval,
  type CustomIntervalUnit,
  type IntervalCapability,
} from '../utils/intervals';

export interface TimeframeMenuProps {
  value: ArenaInterval;
  onChange: (next: ArenaInterval) => void;
  /** Which menu sections are usable for the active symbol/asset class. */
  capability: IntervalCapability;
}

const UNIT_OPTIONS: { value: CustomIntervalUnit; label: string }[] = [
  { value: 'seconds', label: 'Seconds' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours',   label: 'Hours' },
  { value: 'days',    label: 'Days' },
];

export function TimeframeMenu({ value, onChange, capability }: TimeframeMenuProps) {
  const [open, setOpen] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customValue, setCustomValue] = useState('10');
  const [customUnit, setCustomUnit] = useState<CustomIntervalUnit>('minutes');

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectInterval = useCallback((interval: ArenaInterval) => {
    onChange(interval);
    setOpen(false);
  }, [onChange]);

  const handleCustomApply = useCallback((e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(customValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const interval = buildCustomInterval(parsed, customUnit);
    if ((customUnit === 'seconds') && !capability.secondsEnabled) return;
    onChange(interval);
    setCustomDialogOpen(false);
    setOpen(false);
  }, [customValue, customUnit, capability.secondsEnabled, onChange]);

  return (
    <div ref={containerRef} className="flex items-center gap-1">
      {/* Dropdown trigger */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="true"
          aria-expanded={open}
          className={cn(
            'flex items-center gap-1.5 h-7 rounded px-2 text-[11px] font-semibold transition-all duration-150 border',
            open
              ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border-[rgba(201,166,70,0.45)]'
              : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
          )}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">Timeframe</span>
          <span>{formatIntervalShort(value)}</span>
          <ChevronDown className={cn('h-3 w-3 transition-transform duration-150', open && 'rotate-180')} aria-hidden="true" />
        </button>

        {open && (
          <div
            className="absolute left-0 top-[calc(100%+4px)] z-50 bg-[#0D0D0F] border border-[rgba(201,166,70,0.25)] rounded-lg shadow-lg flex flex-col p-1 min-w-[220px] max-h-[420px] overflow-y-auto"
            role="listbox"
            aria-label="Select timeframe"
          >
            {ARENA_TIMEFRAME_GROUPS.map((group) => {
              const groupDisabled = group.header === 'SECONDS' && !capability.secondsEnabled;
              return (
                <div key={group.header}>
                  <div
                    className="px-2 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-wide text-[#555555]"
                    title={groupDisabled ? capability.secondsDisabledReason : undefined}
                  >
                    {group.header}
                  </div>
                  {group.items.map((item) => (
                    <TimeframeRow
                      key={item}
                      interval={item}
                      selected={item === value}
                      disabled={groupDisabled}
                      disabledReason={capability.secondsDisabledReason}
                      onSelect={() => selectInterval(item)}
                    />
                  ))}
                </div>
              );
            })}

            <div className="my-1 h-px bg-[rgba(201,166,70,0.12)]" aria-hidden="true" />

            <button
              type="button"
              onClick={() => setCustomDialogOpen(true)}
              className="h-7 rounded px-2 text-left text-[11px] font-semibold text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150"
            >
              Custom…
            </button>
          </div>
        )}
      </div>

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="bg-[#0D0D0F] border-[rgba(201,166,70,0.25)] text-[#E8E8E8] max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-[15px] text-[#E8E8E8]">Custom Timeframe</DialogTitle>
            <DialogDescription className="text-[12px] text-[#707070]">
              Enter any number of seconds, minutes, hours, or days.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCustomApply} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                step={1}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                className="h-8 w-20 rounded border border-[rgba(201,166,70,0.25)] bg-black/40 px-2 text-[12px] font-semibold text-[#E8E8E8] focus:border-[#C9A646]/50 focus:outline-none"
                aria-label="Custom timeframe value"
              />
              <select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as CustomIntervalUnit)}
                className="h-8 flex-1 rounded border border-[rgba(201,166,70,0.25)] bg-black/40 px-2 text-[12px] font-semibold text-[#E8E8E8] focus:border-[#C9A646]/50 focus:outline-none"
                aria-label="Custom timeframe unit"
              >
                {UNIT_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.value === 'seconds' && !capability.secondsEnabled}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {customUnit === 'seconds' && !capability.secondsEnabled && (
              <p className="text-[11px] text-[#E24B4A]">{capability.secondsDisabledReason}</p>
            )}
            <DialogFooter>
              <button
                type="submit"
                disabled={customUnit === 'seconds' && !capability.secondsEnabled}
                className="h-8 rounded px-3 text-[12px] font-semibold bg-[rgba(201,166,70,0.18)] text-[#C9A646] border border-[rgba(201,166,70,0.45)] hover:bg-[rgba(201,166,70,0.28)] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Row subcomponent
// ═══════════════════════════════════════════════════════════════

interface TimeframeRowProps {
  interval: ArenaInterval;
  selected: boolean;
  disabled: boolean;
  disabledReason?: string;
  onSelect: () => void;
}

function TimeframeRow({ interval, selected, disabled, disabledReason, onSelect }: TimeframeRowProps) {
  return (
    <div
      className={cn(
        'group flex items-center h-7 rounded px-2 gap-1.5 transition-all duration-150',
        disabled && 'cursor-not-allowed opacity-40',
        !disabled && selected && 'bg-[rgba(201,166,70,0.18)]',
        !disabled && !selected && 'hover:bg-[rgba(255,255,255,0.04)]',
      )}
      title={disabled ? disabledReason : undefined}
    >
      <button
        type="button"
        role="option"
        aria-selected={selected}
        disabled={disabled}
        onClick={onSelect}
        className={cn(
          'flex-1 text-left text-[11px] font-semibold',
          disabled && 'text-[#555555]',
          !disabled && selected && 'text-[#C9A646]',
          !disabled && !selected && 'text-[#707070] group-hover:text-[#C0C0C0]',
        )}
      >
        {formatIntervalLabel(interval)}
      </button>
    </div>
  );
}
