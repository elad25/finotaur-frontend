/**
 * Trading Arena — shared toolbar trigger + popover shell.
 *
 * Extracted verbatim from ArenaToolbar.tsx (PR 2 — Unified Footprint
 * Settings) so FootprintSettingsMenu.tsx can reuse the exact same
 * gold-on-black dropdown chrome without duplicating it. ArenaToolbar
 * imports this back — zero visual change to its existing Timeframe /
 * Indicators dropdowns.
 */

import { type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolbarTriggerProps {
  /** Tiny uppercase caption before the value (omit for a plain single-word label like "Indicators"). */
  caption: string | null;
  /** Current value shown on the trigger (e.g. "15m", "Bid×Ask", or the menu's own name). */
  value: string;
  isOpen: boolean;
  onClick: () => void;
  children: ReactNode;
  panelClassName?: string;
}

export function ToolbarTrigger({ caption, value, isOpen, onClick, children, panelClassName }: ToolbarTriggerProps) {
  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={cn(
          'flex items-center gap-1.5 h-7 rounded px-2 text-[11px] font-semibold transition-all duration-150 border',
          isOpen
            ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border-[rgba(201,166,70,0.45)]'
            : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
        )}
      >
        {caption && (
          <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{caption}</span>
        )}
        <span>{value}</span>
        <ChevronDown
          className={cn('h-3 w-3 transition-transform duration-150', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute left-0 top-[calc(100%+4px)] z-50 bg-[#0D0D0F] border border-[rgba(201,166,70,0.25)] rounded-lg shadow-lg',
            panelClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
