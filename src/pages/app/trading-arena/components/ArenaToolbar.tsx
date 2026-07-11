/**
 * Trading Arena — single-row toolbar (Timeframe / Indicators / Chart)
 *
 * Replaces the old 3-row chart-controls layout (a header row with an inline
 * IntervalSelector pill-strip, plus a wrapping OrderFlowControls strip
 * holding ~25 buttons) with ONE horizontal row of dropdown triggers:
 *   - Timeframe    — always shown. Now a TimeframeMenu (see that file):
 *                    favorite chips + a TradingView-style grouped dropdown
 *                    (SECONDS/MINUTES/HOURS/DAYS) with a "Custom…" dialog.
 *   - Indicators ▾ — chart tab only. PLACEHOLDER: read-only rows for the
 *                    two hardcoded default indicators (EMA 50 / RSI 14).
 *                    No add/remove logic, no state.
 *   - Chart ▾      — chart tab only. Hosts the EXISTING OrderFlowControls
 *                    component (unchanged logic) as the popover body, in
 *                    its 'menu' variant.
 *
 * Dropdown behavior is a tiny local implementation — a single `openMenu`
 * state here plus one shared document mousedown/Escape listener. No new
 * dependency (no Radix Popover etc. — that's an intentional scope choice
 * for this stub-quality toolbar).
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FootprintCellMode } from '@/components/charting/orderflow/types';
import type { TabId } from '../types';
import type { ArenaInterval, IntervalCapability } from '../utils/intervals';
import { OrderFlowControls, type OrderFlowControlsState } from './OrderFlowControls';
import { TimeframeMenu } from './TimeframeMenu';

type MenuId = 'indicators' | 'chart';

interface ArenaToolbarProps {
  interval: ArenaInterval;
  onIntervalChange: (v: ArenaInterval) => void;
  /** Which timeframe sections are usable for the active symbol/asset class. */
  intervalCapability: IntervalCapability;
  activeTab: TabId;
  controls: OrderFlowControlsState;
  onControlsChange: (next: OrderFlowControlsState) => void;
  /** Passed straight through to OrderFlowControls' `disabled` (non-crypto symbol). */
  chartControlsDisabled: boolean;
  /** Passed straight through to OrderFlowControls — optional, see ChartTab wiring note. */
  statusNote?: string;
  historyLimitedNote?: string;
}

// Display label for the Chart ▾ trigger. Mirrors OrderFlowControls' internal
// CELL_MODE_OPTIONS labels — kept as a small local map here rather than
// exporting that internal constant; both lists are small and stable.
const CELL_MODE_LABELS: Record<FootprintCellMode, string> = {
  bidAsk: 'Bid×Ask',
  delta: 'Delta',
  volume: 'Volume',
  trades: 'Trades',
  volumeDelta: 'Vol+Δ',
};

export function ArenaToolbar({
  interval,
  onIntervalChange,
  intervalCapability,
  activeTab,
  controls,
  onControlsChange,
  chartControlsDisabled,
  statusNote,
  historyLimitedNote,
}: ArenaToolbarProps) {
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleMenu = useCallback((id: MenuId) => {
    setOpenMenu((prev) => (prev === id ? null : id));
  }, []);

  // One shared listener for the whole toolbar — closes whichever menu is
  // open on outside click or Escape. Only attached while a menu is open.
  useEffect(() => {
    if (!openMenu) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenMenu(null);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  // Indicators ▾ and Chart ▾ only apply to the footprint chart itself.
  const showChartOnlyMenus = activeTab === 'chart';

  return (
    <div ref={containerRef} className="flex items-center gap-1">
      {/* Timeframe — always shown (chart / footprint / liquidity tabs all use it).
          Renders favorite chips + the grouped dropdown + a "Custom…" dialog —
          see TimeframeMenu.tsx. */}
      <TimeframeMenu
        value={interval}
        onChange={onIntervalChange}
        capability={intervalCapability}
      />

      {showChartOnlyMenus && (
        <>
          <span
            className="w-px h-5 flex-shrink-0"
            style={{ background: 'rgba(201,166,70,0.12)' }}
            aria-hidden="true"
          />

          {/* Indicators ▾ — PLACEHOLDER. Static read-only rows, no state. */}
          <ToolbarTrigger
            caption={null}
            value="Indicators"
            isOpen={openMenu === 'indicators'}
            onClick={() => toggleMenu('indicators')}
          >
            <div className="flex flex-col p-2 min-w-[160px] gap-1">
              <div className="flex h-7 items-center rounded px-2 text-[11px] text-[#C0C0C0]">
                EMA 50
              </div>
              <div className="flex h-7 items-center rounded px-2 text-[11px] text-[#C0C0C0]">
                RSI 14
              </div>
              <span className="px-2 pt-1 text-[10px] text-[#555555]">More coming soon</span>
            </div>
          </ToolbarTrigger>

          {/* Chart ▾ — hosts the existing OrderFlowControls as the popover body */}
          <ToolbarTrigger
            caption="Chart"
            value={CELL_MODE_LABELS[controls.cellMode]}
            isOpen={openMenu === 'chart'}
            onClick={() => toggleMenu('chart')}
            panelClassName="max-w-[560px]"
          >
            <OrderFlowControls
              variant="menu"
              state={controls}
              onChange={onControlsChange}
              disabled={chartControlsDisabled}
              statusNote={statusNote}
              historyLimitedNote={historyLimitedNote}
            />
          </ToolbarTrigger>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared trigger + popover shell — one reusable dropdown for all three menus.
// ---------------------------------------------------------------------------

interface ToolbarTriggerProps {
  /** Tiny uppercase caption before the value (omit for a plain single-word label like "Indicators"). */
  caption: string | null;
  /** Current value shown on the trigger (e.g. "15m", "Bid×Ask", or the menu's own name). */
  value: string;
  isOpen: boolean;
  onClick: () => void;
  children: ReactNode;
  panelClassName?: string;
}

function ToolbarTrigger({ caption, value, isOpen, onClick, children, panelClassName }: ToolbarTriggerProps) {
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
