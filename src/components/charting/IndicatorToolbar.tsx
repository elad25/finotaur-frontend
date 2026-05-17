/**
 * IndicatorToolbar — chip row for toggling chart indicators.
 *
 * Renders four toggle pills (SMA 20 / EMA 50 / RSI 14 / VWAP). Each pill
 * lights up in the indicator's overlay color when active, dims when off.
 * VWAP is disabled (grayed out) on non-intraday intervals, where the
 * cumulative-from-session-open semantics are not meaningful.
 *
 * Periods are fixed in Phase 2 (no settings dropdown).
 */

import { isIntradayInterval } from './indicators';
import type { IndicatorSettings, Interval } from './types';
import { INDICATOR_PERIODS } from './types';

interface IndicatorToolbarProps {
  settings: IndicatorSettings;
  onChange: (next: IndicatorSettings) => void;
  /** Used to disable VWAP on daily / weekly / monthly intervals. */
  interval: Interval;
}

// Indicator overlay colors mirror FinotaurChart's INDICATOR_COLORS. Duplicated
// here intentionally — keeping the toolbar self-contained avoids importing
// from a sibling that lives behind a React.lazy boundary in some routes.
const CHIP_COLOR = {
  sma: '#7dd3fc',
  ema: '#fcd34d',
  vwap: '#c4b5fd',
  rsi: '#d4d4d8',
} as const;

interface ChipProps {
  label: string;
  active: boolean;
  color: string;
  disabled?: boolean;
  disabledHint?: string;
  onClick: () => void;
}

function Chip({ label, active, color, disabled, disabledHint, onClick }: ChipProps) {
  const base =
    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition';
  const stateCls = disabled
    ? 'cursor-not-allowed border-zinc-800 bg-zinc-900/40 text-zinc-600'
    : active
      ? 'cursor-pointer bg-zinc-900/70 hover:bg-zinc-800'
      : 'cursor-pointer border-zinc-700/60 bg-zinc-900/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300';

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      aria-pressed={!disabled && active}
      className={`${base} ${stateCls}`}
      style={
        !disabled && active
          ? { borderColor: color, color }
          : undefined
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: disabled ? '#3f3f46' : active ? color : '#52525b',
        }}
      />
      {label}
    </button>
  );
}

export function IndicatorToolbar({ settings, onChange, interval }: IndicatorToolbarProps) {
  const intraday = isIntradayInterval(interval);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Indicators
      </span>
      <Chip
        label={`SMA ${INDICATOR_PERIODS.sma}`}
        active={settings.sma}
        color={CHIP_COLOR.sma}
        onClick={() => onChange({ ...settings, sma: !settings.sma })}
      />
      <Chip
        label={`EMA ${INDICATOR_PERIODS.ema}`}
        active={settings.ema}
        color={CHIP_COLOR.ema}
        onClick={() => onChange({ ...settings, ema: !settings.ema })}
      />
      <Chip
        label={`RSI ${INDICATOR_PERIODS.rsi}`}
        active={settings.rsi}
        color={CHIP_COLOR.rsi}
        onClick={() => onChange({ ...settings, rsi: !settings.rsi })}
      />
      <Chip
        label="VWAP"
        active={settings.vwap && intraday}
        color={CHIP_COLOR.vwap}
        disabled={!intraday}
        disabledHint="VWAP is intraday-only"
        onClick={() => onChange({ ...settings, vwap: !settings.vwap })}
      />
    </div>
  );
}

export default IndicatorToolbar;
