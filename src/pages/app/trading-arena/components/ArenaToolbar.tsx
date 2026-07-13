/**
 * Trading Arena — single-row toolbar (Timeframe / Indicators)
 *
 * Replaces the old 3-row chart-controls layout (a header row with an inline
 * IntervalSelector pill-strip, plus a wrapping OrderFlowControls strip
 * holding ~25 buttons) with ONE horizontal row:
 *   - Timeframe    — always shown. Now a TimeframeMenu (see that file):
 *                    favorite chips + a TradingView-style grouped dropdown
 *                    (SECONDS/MINUTES/HOURS/DAYS) with a "Custom…" dialog.
 *   - Indicators (N) — chart tab only. Opens the Indicators POPUP
 *                    (see ./IndicatorsDialog.tsx) — a full settings dialog
 *                    (toggle + editable params per indicator, 8 rows:
 *                    VWAP/EMA/SMA/Bollinger/Volume Profile/RSI/MACD/ATR,
 *                    max 5 active at once). Same lifted-dialog-state pattern
 *                    FootprintTab.tsx uses for FootprintSettingsDialog — the
 *                    trigger is a plain button, not a ToolbarTrigger dropdown.
 *                    Selection + params live in TradingArena.tsx (single
 *                    source of truth, shared across tabs) and persist via
 *                    useArenaIndicatorPreferences (v2 — see that hook).
 *   - Chart ▾      — always shown (all 3 tabs). TradingView-style Chart
 *                    Settings (see ChartSettingsMenu.tsx): candle colors,
 *                    canvas/grid/crosshair/watermark, price axis + last
 *                    price line, timezone, price precision. Applies LIVE,
 *                    persists globally via useChartStylePreferences, and
 *                    reaches all 3 tabs' FinotaurChart instances through
 *                    ChartStyleContext (provided in TradingArena.tsx) rather
 *                    than per-tab prop threading — see chartStyleSettings.ts's
 *                    header comment for why.
 *
 * The Chart tab is a plain candlestick chart (2026-07 restructure) — no
 * order-flow controls apply to it anymore. The full OrderFlowControls
 * cluster now lives entirely on the dedicated Order Flow tab (see
 * FootprintTab.tsx), which manages its own controls state internally and
 * does not go through this toolbar.
 *
 * Chart ▾ (ChartSettingsMenu) manages its own open/close state internally —
 * same pattern FootprintSettingsMenu already uses. Indicators (N) follows
 * the FootprintTab.tsx lifted-dialog-state pattern instead (a plain trigger
 * button + a Radix Dialog rendered alongside it, which owns its own
 * open/close/outside-click/Escape behavior — no shared `openMenu` state
 * machine needed for it).
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { TabId } from '../types';
import type { ArenaInterval, IntervalCapability } from '../utils/intervals';
import { TimeframeMenu } from './TimeframeMenu';
import { ChartSettingsMenu } from './ChartSettingsMenu';
import { IndicatorsDialog } from './IndicatorsDialog';
import { isIntradayInterval } from '@/components/charting/indicators';
import { countActiveIndicators, type ArenaIndicatorEnabled, type ArenaIndicatorParams } from './indicatorsSettings';
import type { ChartStyleSettings } from './chartStyleSettings';

interface ArenaToolbarProps {
  interval: ArenaInterval;
  onIntervalChange: (v: ArenaInterval) => void;
  /** Which timeframe sections are usable for the active symbol/asset class. */
  intervalCapability: IntervalCapability;
  activeTab: TabId;
  /** Current indicator on/off state — single source of truth lives in TradingArena.tsx. */
  indicatorsEnabled: ArenaIndicatorEnabled;
  /** Current indicator editable params — single source of truth lives in TradingArena.tsx. */
  indicatorsParams: ArenaIndicatorParams;
  onIndicatorsEnabledChange: (patch: Partial<ArenaIndicatorEnabled>) => void;
  onIndicatorsParamsChange: <K extends keyof ArenaIndicatorParams>(key: K, patch: Partial<ArenaIndicatorParams[K]>) => void;
  onIndicatorsReset: () => void;
  /** Current chart style settings (Chart ▾ menu) — single source of truth lives in TradingArena.tsx. */
  chartStyle: ChartStyleSettings;
  onChartStyleChange: (patch: Partial<ChartStyleSettings>) => void;
  onChartStyleReset: () => void;
  /** Current asset class — passed straight through to ChartSettingsMenu (gates the footprint auto-transform toggle). */
  assetClass: string;
}

export function ArenaToolbar({
  interval,
  onIntervalChange,
  intervalCapability,
  activeTab,
  indicatorsEnabled,
  indicatorsParams,
  onIndicatorsEnabledChange,
  onIndicatorsParamsChange,
  onIndicatorsReset,
  chartStyle,
  onChartStyleChange,
  onChartStyleReset,
  assetClass,
}: ArenaToolbarProps) {
  const [indicatorsDialogOpen, setIndicatorsDialogOpen] = useState(false);

  // Indicators (N) only applies to the plain candlestick chart.
  const showChartOnlyMenus = activeTab === 'chart';

  // VWAP is only meaningful on intraday intervals — same gate IndicatorToolbar
  // applies for Backtest/Journal.
  const intraday = isIntradayInterval(interval);
  const activeIndicatorCount = countActiveIndicators(indicatorsEnabled);
  const indicatorsTriggerValue = activeIndicatorCount > 0
    ? `Indicators (${activeIndicatorCount})`
    : 'Indicators';

  return (
    <div className="flex items-center gap-1">
      {/* Timeframe — always shown (chart / footprint / liquidity tabs all use it).
          Renders favorite chips + the grouped dropdown + a "Custom…" dialog —
          see TimeframeMenu.tsx. */}
      <TimeframeMenu
        value={interval}
        onChange={onIntervalChange}
        capability={intervalCapability}
      />

      <span
        className="w-px h-5 flex-shrink-0"
        style={{ background: 'rgba(201,166,70,0.12)' }}
        aria-hidden="true"
      />

      {/* Chart ▾ — TradingView-style Chart Settings. Always shown (all 3
          tabs respect the style via ChartStyleContext), unlike Indicators (N)
          which is chart-tab only. */}
      <ChartSettingsMenu
        settings={chartStyle}
        onChange={onChartStyleChange}
        onReset={onChartStyleReset}
        assetClass={assetClass}
      />

      {showChartOnlyMenus && (
        <>
          <span
            className="w-px h-5 flex-shrink-0"
            style={{ background: 'rgba(201,166,70,0.12)' }}
            aria-hidden="true"
          />

          {/* Indicators (N) — opens the Indicators POPUP (full settings dialog). */}
          <button
            type="button"
            onClick={() => setIndicatorsDialogOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={indicatorsDialogOpen}
            className={cn(
              'flex items-center gap-1.5 h-7 rounded px-2 text-[11px] font-semibold transition-all duration-150 border',
              indicatorsDialogOpen
                ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border-[rgba(201,166,70,0.45)]'
                : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
            )}
          >
            {indicatorsTriggerValue}
          </button>
          <IndicatorsDialog
            open={indicatorsDialogOpen}
            onOpenChange={setIndicatorsDialogOpen}
            enabled={indicatorsEnabled}
            params={indicatorsParams}
            onUpdateEnabled={onIndicatorsEnabledChange}
            onUpdateParams={onIndicatorsParamsChange}
            onReset={onIndicatorsReset}
            intraday={intraday}
            chartStyle={chartStyle}
            onChartStyleChange={onChartStyleChange}
          />
        </>
      )}
    </div>
  );
}
