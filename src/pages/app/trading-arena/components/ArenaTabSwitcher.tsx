/**
 * Trading Arena — top-bar tab switcher (Chart / Order Flow / Liquidity).
 *
 * A dropdown trigger + panel, visually matching the toolbar's existing
 * trigger language exactly (see ArenaToolbar's local ToolbarTrigger and
 * TimeframeMenu's own dropdown trigger — same h-7/px-2/text-[11px] trigger,
 * same gold-accent open/active state, same dark panel background/border/
 * radius/shadow, same outside-click + Escape close pattern). No caption
 * prefix (mirrors ArenaToolbar's "Indicators" trigger, not TimeframeMenu's
 * "Timeframe" prefix) — each option label (Chart / Order Flow / Liquidity)
 * is self-descriptive, so a prefix would be redundant. URL (:section param)
 * stays the source of truth: this component only navigates, TradingArena.tsx
 * derives `activeTab` from the URL via toTabId.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRADING_ARENA_TABS, type TabId } from '../types';

interface ArenaTabSwitcherProps {
  activeTab: TabId;
}

export function ArenaTabSwitcher({ activeTab }: ArenaTabSwitcherProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback((tab: TabId) => {
    navigate(`/app/trading-arena/${tab}`);
    setOpen(false);
  }, [navigate]);

  // Same outside-click + Escape pattern as ArenaToolbar/TimeframeMenu — only
  // attached while the panel is open.
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

  const activeLabel = TRADING_ARENA_TABS.find((tab) => tab.id === activeTab)?.label ?? 'Chart';

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1.5 h-7 rounded px-2 text-[11px] font-semibold transition-all duration-150 border',
          open
            ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border-[rgba(201,166,70,0.45)]'
            : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
        )}
      >
        <span>{activeLabel}</span>
        <ChevronDown
          className={cn('h-3 w-3 transition-transform duration-150', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 bg-[#0D0D0F] border border-[rgba(201,166,70,0.25)] rounded-lg shadow-lg flex flex-col p-1 min-w-[160px]"
          role="listbox"
          aria-label="Select view"
        >
          {TRADING_ARENA_TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => handleSelect(tab.id)}
                className={cn(
                  'flex items-center justify-between gap-2 h-7 rounded px-2 text-[11px] font-semibold whitespace-nowrap transition-colors duration-150',
                  active
                    ? 'bg-[rgba(201,166,70,0.12)] text-[#C9A646] hover:bg-[rgba(201,166,70,0.18)]'
                    : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)]',
                )}
              >
                <span>{tab.label}</span>
                {active && <Check className="h-3 w-3 flex-shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
