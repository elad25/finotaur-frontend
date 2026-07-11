/**
 * Trading Arena — Order Flow control cluster (Chart tab)
 *
 * Compact pill-style controls matching TradingArena's IntervalSelector /
 * TabSwitcher visual language (gold-on-black, `rgba(201,166,70,*)` accents).
 * Renders:
 *   (a) Order Flow on/off toggle
 *   (b) cell-mode segmented control (Bid×Ask | Delta | Volume)
 *   (c) CVD / Delta sub-pane toggles
 *   (d) row-density segmented control (Auto | ×2 | ×4)
 *   (e) VP (Volume Profile) toggle — ATAS-style visible-range profile overlay
 *   (f) Heatmap toggle — Bookmap-style liquidity heatmap (DepthMatrixLayer,
 *       reused as-is from the Market Scanner)
 *
 * Disabled (dimmed, non-interactive) as a single unit when the active symbol
 * is not crypto — order flow only has a Binance trade source today.
 */

import { cn } from '@/lib/utils';
import type { FootprintCellMode, ImbalancePreset } from '@/components/charting/orderflow/types';

export type RowDensity = 'auto' | 'x2' | 'x4';

export interface OrderFlowControlsState {
  enabled: boolean;
  cellMode: FootprintCellMode;
  showCvd: boolean;
  showDelta: boolean;
  rowDensity: RowDensity;
  /** Volume Profile overlay (ATAS-style visible-range histogram + POC/VA). Default OFF. */
  showVolumeProfile: boolean;
  /** Bookmap-style liquidity heatmap (DepthMatrixLayer, reused from the Market Scanner). Default OFF. */
  showHeatmap: boolean;
  /** Diagonal-imbalance highlighting preset — Standard/Strict/Stacked (see resolveImbalancePreset). Default 'standard'. */
  imbalancePreset: ImbalancePreset;
  /** Cluster Statistics 6-row strip (Volume/Delta/Delta%/Max Δ/Min Δ/Session Δ). Default ON; OFF falls back to the compact totals row. */
  showStats: boolean;
  /** ATAS-style Magnifier — hover-a-candle popup showing full footprint detail at normal/semi-zoomed chart levels. Default ON. */
  magnifierEnabled: boolean;
}

export const DEFAULT_ORDER_FLOW_CONTROLS: OrderFlowControlsState = {
  enabled: true,
  cellMode: 'bidAsk',
  showCvd: false,
  showDelta: false,
  rowDensity: 'auto',
  showVolumeProfile: false,
  showHeatmap: false,
  imbalancePreset: 'standard',
  showStats: true,
  magnifierEnabled: true,
};

interface OrderFlowControlsProps {
  state: OrderFlowControlsState;
  onChange: (next: OrderFlowControlsState) => void;
  /** True when the active symbol is not crypto — order flow has no data source. */
  disabled: boolean;
  /** Shown while backfill/connection is in flight. */
  statusNote?: string;
  /** Tooltip on the whole cluster when backfill history is limited. */
  historyLimitedNote?: string;
  /**
   * 'bar' (default) — original top-of-chart strip chrome (bottom border,
   * tight padding). 'menu' — used inside the Arena toolbar's "Chart ▾"
   * popover: no border, roomier padding, same flex-wrap behavior.
   */
  variant?: 'bar' | 'menu';
}

const CELL_MODE_OPTIONS: { value: FootprintCellMode; label: string }[] = [
  { value: 'bidAsk', label: 'Bid×Ask' },
  { value: 'delta', label: 'Delta' },
  { value: 'volume', label: 'Volume' },
  { value: 'trades', label: 'Trades' },
  { value: 'volumeDelta', label: 'Vol+Δ' },
];

const ROW_DENSITY_OPTIONS: { value: RowDensity; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'x2', label: '×2' },
  { value: 'x4', label: '×4' },
];

const IMBALANCE_PRESET_OPTIONS: { value: ImbalancePreset; label: string; title: string }[] = [
  { value: 'standard', label: 'Standard', title: 'Standard — 150% diagonal ratio, singles highlighted' },
  { value: 'strict', label: 'Strict', title: 'Strict — 300% diagonal ratio, singles highlighted' },
  { value: 'stacked', label: 'Stacked', title: 'Stacked — 150% ratio, only runs of 3+ consecutive levels highlighted' },
];

function pillClass(active: boolean, disabled: boolean): string {
  return cn(
    'h-7 min-w-[32px] rounded px-2 text-[11px] font-semibold transition-all duration-150 border',
    disabled && 'cursor-not-allowed opacity-40',
    !disabled && active && 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border-[rgba(201,166,70,0.45)]',
    !disabled && !active && 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
    disabled && 'text-[#555555] border-transparent',
  );
}

export function OrderFlowControls({
  state,
  onChange,
  disabled,
  statusNote,
  historyLimitedNote,
  variant = 'bar',
}: OrderFlowControlsProps) {
  const title = disabled ? 'Order flow requires a crypto symbol' : historyLimitedNote;

  return (
    <div
      className={cn(
        'flex items-center gap-3 flex-wrap',
        variant === 'menu' ? 'p-2' : 'px-3 py-1.5 border-b',
      )}
      style={variant === 'bar' ? { borderColor: 'rgba(201,166,70,0.10)' } : undefined}
      title={title}
    >
      {/* Order Flow on/off */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange({ ...state, enabled: !state.enabled })}
        className={pillClass(state.enabled, disabled)}
        aria-pressed={state.enabled}
      >
        Order Flow
      </button>

      <span className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(201,166,70,0.12)' }} aria-hidden="true" />

      {/* Cell mode segmented control */}
      <div className="flex items-center gap-1" role="group" aria-label="Footprint cell mode">
        {CELL_MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled || !state.enabled}
            onClick={() => onChange({ ...state, cellMode: opt.value })}
            className={pillClass(state.cellMode === opt.value, disabled || !state.enabled)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <span className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(201,166,70,0.12)' }} aria-hidden="true" />

      {/* CVD / Delta sub-pane toggles */}
      <div className="flex items-center gap-1" role="group" aria-label="Sub-panes">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ ...state, showCvd: !state.showCvd })}
          className={pillClass(state.showCvd, disabled)}
          aria-pressed={state.showCvd}
        >
          CVD
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ ...state, showDelta: !state.showDelta })}
          className={pillClass(state.showDelta, disabled)}
          aria-pressed={state.showDelta}
        >
          Delta
        </button>
      </div>

      <span className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(201,166,70,0.12)' }} aria-hidden="true" />

      {/* Row density segmented control */}
      <div className="flex items-center gap-1" role="group" aria-label="Row density">
        {ROW_DENSITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled || !state.enabled}
            onClick={() => onChange({ ...state, rowDensity: opt.value })}
            className={pillClass(state.rowDensity === opt.value, disabled || !state.enabled)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <span className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(201,166,70,0.12)' }} aria-hidden="true" />

      {/* Imbalance preset segmented control — opinionated presets over
          ATAS's ~400-setting maze. See resolveImbalancePreset in
          footprintRender.ts for the exact thresholds per preset. */}
      <div className="flex items-center gap-1" role="group" aria-label="Imbalance preset">
        {IMBALANCE_PRESET_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled || !state.enabled}
            onClick={() => onChange({ ...state, imbalancePreset: opt.value })}
            className={pillClass(state.imbalancePreset === opt.value, disabled || !state.enabled)}
            title={opt.title}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <span className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(201,166,70,0.12)' }} aria-hidden="true" />

      {/* Volume Profile / Heatmap / Stats toggles — independent of the
          footprint on/off switch above (each is its own overlay/render mode). */}
      <div className="flex items-center gap-1" role="group" aria-label="Volume profile, heatmap and stats overlays">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ ...state, showVolumeProfile: !state.showVolumeProfile })}
          className={pillClass(state.showVolumeProfile, disabled)}
          aria-pressed={state.showVolumeProfile}
          title="Volume Profile — visible-range volume-by-price with POC/Value Area"
        >
          VP
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ ...state, showHeatmap: !state.showHeatmap })}
          className={pillClass(state.showHeatmap, disabled)}
          aria-pressed={state.showHeatmap}
          title="Liquidity heatmap — Bookmap-style resting order-book depth"
        >
          Heatmap
        </button>
        <button
          type="button"
          disabled={disabled || !state.enabled}
          onClick={() => onChange({ ...state, showStats: !state.showStats })}
          className={pillClass(state.showStats, disabled || !state.enabled)}
          aria-pressed={state.showStats}
          title="Cluster Statistics — per-bar Volume/Delta/Delta%/Max Δ/Min Δ/Session Δ strip"
        >
          Stats
        </button>
        <button
          type="button"
          disabled={disabled || !state.enabled}
          onClick={() => onChange({ ...state, magnifierEnabled: !state.magnifierEnabled })}
          className={pillClass(state.magnifierEnabled, disabled || !state.enabled)}
          aria-pressed={state.magnifierEnabled}
          title="Magnifier — hover a candle at normal zoom to see its full footprint detail"
        >
          Magnifier
        </button>
      </div>

      {statusNote && (
        <span className="text-[10px] text-[#707070] ml-1" aria-live="polite">
          {statusNote}
        </span>
      )}
    </div>
  );
}
