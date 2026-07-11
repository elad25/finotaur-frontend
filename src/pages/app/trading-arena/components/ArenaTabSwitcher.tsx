/**
 * Trading Arena — top-bar tab switcher (Chart / Order Flow / Liquidity).
 *
 * Compact segmented control, visually matching the toolbar's existing
 * chip/trigger language (see ArenaToolbar's ToolbarTrigger and
 * TimeframeMenu's FavoriteChip — same gold-accent active state, same
 * height/radius/border conventions). URL (:section param) stays the
 * source of truth: this component only navigates, TradingArena.tsx derives
 * `activeTab` from the URL via toTabId.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { TRADING_ARENA_TABS, type TabId } from '../types';

interface ArenaTabSwitcherProps {
  activeTab: TabId;
}

export function ArenaTabSwitcher({ activeTab }: ArenaTabSwitcherProps) {
  const navigate = useNavigate();

  const handleSelect = useCallback((tab: TabId) => {
    navigate(`/app/trading-arena/${tab}`);
  }, [navigate]);

  return (
    <div
      className="flex items-center gap-0.5 flex-shrink-0 p-0.5 rounded-md"
      style={{ background: 'rgba(255,255,255,0.03)' }}
      role="tablist"
      aria-label="Trading Arena view"
    >
      {TRADING_ARENA_TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => handleSelect(tab.id)}
            className={cn(
              'flex items-center h-6 rounded px-2.5 text-[11px] font-semibold whitespace-nowrap transition-all duration-150',
              active
                ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646]'
                : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)]',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
