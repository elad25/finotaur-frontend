/**
 * Trading Arena — single-row toolbar (Timeframe / Indicators)
 *
 * Replaces the old 3-row chart-controls layout (a header row with an inline
 * IntervalSelector pill-strip, plus a wrapping OrderFlowControls strip
 * holding ~25 buttons) with ONE horizontal row:
 *   - Timeframe    — always shown. Now a TimeframeMenu (see that file):
 *                    favorite chips + a TradingView-style grouped dropdown
 *                    (SECONDS/MINUTES/HOURS/DAYS) with a "Custom…" dialog.
 *   - Indicators ▾ — chart tab only. A real add/remove picker: 7 toggle
 *                    rows (SMA/EMA/RSI/VWAP/MACD/BB/ATR — the same set
 *                    IndicatorToolbar exposes for Backtest/Journal, and the
 *                    only types FinotaurChart renders). Selection state
 *                    lives in TradingArena.tsx (single source of truth,
 *                    shared across tabs) and persists via
 *                    useArenaIndicatorPreferences.
 *
 * The Chart tab is a plain candlestick chart (2026-07 restructure) — no
 * order-flow controls apply to it anymore. The full OrderFlowControls
 * cluster now lives entirely on the dedicated Order Flow tab (see
 * FootprintTab.tsx), which manages its own controls state internally and
 * does not go through this toolbar.
 *
 * Dropdown behavior (Indicators ▾) is a tiny local implementation — a
 * single `openMenu` state here plus one shared document mousedown/Escape
 * listener. No new dependency (no Radix Popover etc. — that's an intentional
 * scope choice for this stub-quality toolbar).
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabId } from '../types';
import type { ArenaInterval, IntervalCapability } from '../utils/intervals';
import { TimeframeMenu } from './TimeframeMenu';
import { isIntradayInterval } from '@/components/charting/indicators';
import { INDICATOR_PERIODS, type IndicatorSettings } from '@/components/charting/types';

type MenuId = 'indicators';

// Same 7 indicator types FinotaurChart can render (see FinotaurChart.tsx's
// per-type switch) — mirrors IndicatorToolbar.tsx's chip set/labels so the
// Arena's picker and Backtest/Journal's toolbar stay visually consistent.
const INDICATOR_ROWS: Array<{ key: keyof IndicatorSettings; label: string }> = [
  { key: 'sma', label: `SMA ${INDICATOR_PERIODS.sma}` },
  { key: 'ema', label: `EMA ${INDICATOR_PERIODS.ema}` },
  { key: 'rsi', label: `RSI ${INDICATOR_PERIODS.rsi}` },
  { key: 'vwap', label: 'VWAP' },
  { key: 'macd', label: 'MACD' },
  { key: 'bbands', label: `BB ${INDICATOR_PERIODS.bbands.period}` },
  { key: 'atr', label: `ATR ${INDICATOR_PERIODS.atr}` },
];

interface ArenaToolbarProps {
  interval: ArenaInterval;
  onIntervalChange: (v: ArenaInterval) => void;
  /** Which timeframe sections are usable for the active symbol/asset class. */
  intervalCapability: IntervalCapability;
  activeTab: TabId;
  /** Current indicator on/off state — single source of truth lives in TradingArena.tsx. */
  indicatorSettings: IndicatorSettings;
  onIndicatorSettingsChange: (next: IndicatorSettings) => void;
}

export function ArenaToolbar({
  interval,
  onIntervalChange,
  intervalCapability,
  activeTab,
  indicatorSettings,
  onIndicatorSettingsChange,
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

  // Indicators ▾ only applies to the plain candlestick chart.
  const showChartOnlyMenus = activeTab === 'chart';

  // VWAP is only meaningful on intraday intervals — same gate IndicatorToolbar
  // applies for Backtest/Journal.
  const intraday = isIntradayInterval(interval);
  const activeIndicatorCount = INDICATOR_ROWS.filter((row) => indicatorSettings[row.key]).length;
  const indicatorsTriggerValue = activeIndicatorCount > 0
    ? `Indicators (${activeIndicatorCount})`
    : 'Indicators';

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

          {/* Indicators ▾ — real add/remove picker. Row click toggles;
              active indicators get a gold check + highlight. */}
          <ToolbarTrigger
            caption={null}
            value={indicatorsTriggerValue}
            isOpen={openMenu === 'indicators'}
            onClick={() => toggleMenu('indicators')}
          >
            <div className="flex flex-col p-1.5 min-w-[160px]">
              {INDICATOR_ROWS.map((row) => {
                const disabled = row.key === 'vwap' && !intraday;
                return (
                  <IndicatorRow
                    key={row.key}
                    label={row.label}
                    active={indicatorSettings[row.key]}
                    disabled={disabled}
                    disabledHint={disabled ? 'VWAP is intraday-only' : undefined}
                    onClick={() =>
                      onIndicatorSettingsChange({
                        ...indicatorSettings,
                        [row.key]: !indicatorSettings[row.key],
                      })
                    }
                  />
                );
              })}
            </div>
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

// ---------------------------------------------------------------------------
// Indicators ▾ panel row — one toggle per indicator type.
// ---------------------------------------------------------------------------

interface IndicatorRowProps {
  label: string;
  active: boolean;
  disabled?: boolean;
  disabledHint?: string;
  onClick: () => void;
}

function IndicatorRow({ label, active, disabled, disabledHint, onClick }: IndicatorRowProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      aria-pressed={!disabled && active}
      className={cn(
        'flex h-7 items-center justify-between gap-2 rounded px-2 text-[11px] transition-colors duration-150',
        disabled
          ? 'cursor-not-allowed text-[#3a3a3a]'
          : active
            ? 'cursor-pointer bg-[rgba(201,166,70,0.12)] text-[#C9A646] hover:bg-[rgba(201,166,70,0.18)]'
            : 'cursor-pointer text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#E8E8E8]',
      )}
    >
      <span>{label}</span>
      {!disabled && active && <Check className="h-3 w-3 flex-shrink-0" aria-hidden="true" />}
    </button>
  );
}
