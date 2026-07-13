/**
 * Trading Arena — Indicators POPUP (replaces ArenaToolbar's old 7-row
 * on/off dropdown with a full settings dialog — same modal chrome as
 * FootprintSettingsDialog.tsx: Radix Dialog, gold-on-black, scrolling
 * content, footer Reset + Close).
 *
 * Two sections: OVERLAYS (VWAP, EMA, SMA, Bollinger Bands, Session Volume
 * Profile) and PANES (RSI, MACD, ATR) — mirrors FinotaurChart's own
 * overlay-vs-subpane split (see components/charting/types.ts's Indicator
 * doc comment). Every row is a toggle + an inline description; the
 * parameterized ones (EMA/SMA/RSI/Bollinger/MACD/ATR) also expose small
 * numeric fields, sanitized via ../components/indicatorsSettings.ts's
 * range constants (same clamp-on-blur NumberField idiom as
 * FootprintSettingsDialog.tsx / ChartSettingsMenu.tsx).
 *
 * Session Volume Profile is modeled as an 8th "indicator" toggle (state in
 * `enabled.volumeProfile`, see indicatorsSettings.ts) — its detailed params
 * (period/custom session/vPOC/VAH-VAL/width/opacity) still live in
 * ChartStyleSettings.volumeProfile (unchanged shape), edited here via the
 * same `chartStyle`/`onChartStyleChange` plumbing ChartSettingsMenu and
 * FootprintSettingsDialog already use — see chartStyleSettings.ts.
 *
 * Max 5 active indicators (MAX_ACTIVE_INDICATORS, counts Volume Profile):
 * attempting to enable a 6th leaves the toggle off and shows an inline
 * notice near the header counter instead of silently no-op'ing.
 */

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MAX_ACTIVE_INDICATORS,
  countActiveIndicators,
  EMA_PERIOD_RANGE,
  SMA_PERIOD_RANGE,
  RSI_PERIOD_RANGE,
  MACD_FAST_RANGE,
  MACD_SLOW_RANGE,
  MACD_SIGNAL_RANGE,
  BBANDS_PERIOD_RANGE,
  BBANDS_STDDEV_RANGE,
  ATR_PERIOD_RANGE,
  type ArenaIndicatorEnabled,
  type ArenaIndicatorParams,
} from './indicatorsSettings';
import type { ChartStyleSettings, SessionVolumeProfilePeriod } from './chartStyleSettings';

export interface IndicatorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabled: ArenaIndicatorEnabled;
  params: ArenaIndicatorParams;
  onUpdateEnabled: (patch: Partial<ArenaIndicatorEnabled>) => void;
  onUpdateParams: <K extends keyof ArenaIndicatorParams>(key: K, patch: Partial<ArenaIndicatorParams[K]>) => void;
  onReset: () => void;
  /** VWAP is intraday-only — same gate ArenaToolbar previously applied. */
  intraday: boolean;
  /** Session Volume Profile's detail params live here (Chart-tab-only concern — see ChartTab.tsx). */
  chartStyle: ChartStyleSettings;
  onChartStyleChange: (patch: Partial<ChartStyleSettings>) => void;
}

const SESSION_PERIOD_OPTIONS: { value: SessionVolumeProfilePeriod; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'custom', label: 'Custom' },
];

function pillClass(active: boolean): string {
  return cn(
    'h-7 rounded px-2 text-[11px] font-semibold transition-all duration-150 border whitespace-nowrap',
    active
      ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border-[rgba(201,166,70,0.45)]'
      : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[9px] font-semibold uppercase tracking-wide text-[#707070] mb-1.5">
      {children}
    </div>
  );
}

function SectionDivider() {
  return <div className="h-px" style={{ background: 'rgba(201,166,70,0.10)' }} aria-hidden="true" />;
}

function ToggleSwitch({ active, onClick, label, disabled }: { active: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(pillClass(active), disabled && 'opacity-40 cursor-not-allowed', 'flex-shrink-0')}
    >
      {label}
    </button>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (value: number) => void;
}

function NumberField({ label, value, min, max, step, onCommit }: NumberFieldProps) {
  const [text, setText] = useState(String(value));

  // Resync when the caller's value changes externally (dialog reopen, Reset to defaults).
  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    setText(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <label className="flex items-center gap-1.5 text-[10px] text-[#707070]">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={text}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className="w-14 h-6 rounded border px-1.5 text-right text-[11px] text-[#E8E8E8] focus:outline-none"
        style={{ background: '#0D0D0F', borderColor: 'rgba(201,166,70,0.25)' }}
      />
    </label>
  );
}

function TimeField({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  const commit = () => {
    if (/^\d{1,2}:\d{2}$/.test(text.trim())) {
      if (text !== value) onCommit(text.trim());
    } else {
      setText(value); // invalid — revert
    }
  };

  return (
    <label className="flex items-center gap-1.5 text-[10px] text-[#707070]">
      <span>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        placeholder="HH:MM"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className="w-14 h-6 rounded border px-1.5 text-right text-[11px] text-[#E8E8E8] focus:outline-none"
        style={{ background: '#0D0D0F', borderColor: 'rgba(201,166,70,0.25)' }}
      />
    </label>
  );
}

interface IndicatorRowProps {
  label: string;
  description: string;
  active: boolean;
  disabled?: boolean;
  disabledHint?: string;
  onToggle: () => void;
  children?: React.ReactNode;
}

function IndicatorRow({ label, description, active, disabled, disabledHint, onToggle, children }: IndicatorRowProps) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded px-1.5 py-1.5"
      style={{ background: active && !disabled ? 'rgba(201,166,70,0.05)' : 'transparent' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className={cn(
              'text-[12px] font-semibold',
              disabled ? 'text-[#3a3a3a]' : active ? 'text-[#C9A646]' : 'text-[#C0C0C0]',
            )}
          >
            {label}
          </span>
          <span className="text-[10px] text-[#707070]">
            {disabled && disabledHint ? disabledHint : description}
          </span>
        </div>
        <ToggleSwitch active={active} disabled={disabled} onClick={onToggle} label={active ? 'On' : 'Off'} />
      </div>
      {active && !disabled && children && (
        <div className="flex flex-wrap items-center gap-3 pl-1">{children}</div>
      )}
    </div>
  );
}

export function IndicatorsDialog({
  open,
  onOpenChange,
  enabled,
  params,
  onUpdateEnabled,
  onUpdateParams,
  onReset,
  intraday,
  chartStyle,
  onChartStyleChange,
}: IndicatorsDialogProps) {
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);

  const activeCount = countActiveIndicators(enabled);
  const atLimit = activeCount >= MAX_ACTIVE_INDICATORS;

  // Clear the "turn one off first" notice once the user actually frees up a slot.
  useEffect(() => {
    if (!atLimit) setLimitNoticeVisible(false);
  }, [atLimit]);

  function handleToggle(key: keyof ArenaIndicatorEnabled) {
    const isActive = enabled[key];
    if (!isActive && atLimit) {
      setLimitNoticeVisible(true);
      return;
    }
    onUpdateEnabled({ [key]: !isActive } as Partial<ArenaIndicatorEnabled>);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[560px] gap-0 border-[rgba(201,166,70,0.25)] bg-[rgba(10,10,11,0.98)] p-0 text-white shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        aria-describedby={undefined}
      >
        <DialogHeader className="flex-row items-center justify-between space-y-0 border-b px-5 py-4" style={{ borderColor: 'rgba(201,166,70,0.12)' }}>
          <DialogTitle className="text-[15px] font-semibold text-[#E8E8E8]">
            Indicators
          </DialogTitle>
          <span className={cn('text-[11px] font-semibold', atLimit ? 'text-red-400' : 'text-[#707070]')}>
            {activeCount}/{MAX_ACTIVE_INDICATORS} active
          </span>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto p-4 flex flex-col gap-4">
          {limitNoticeVisible && (
            <div className="text-[10px] text-amber-400">
              Up to 5 active indicators — turn one off first.
            </div>
          )}

          <div>
            <SectionLabel>Overlays</SectionLabel>
            <div className="flex flex-col gap-1">
              <IndicatorRow
                label="VWAP (Session)"
                description="Cumulative volume-weighted average price, resets every session."
                active={enabled.vwap}
                disabled={!intraday}
                disabledHint="VWAP is intraday-only."
                onToggle={() => handleToggle('vwap')}
              />

              <IndicatorRow
                label="EMA"
                description="Exponential moving average — weights recent bars more heavily than older ones."
                active={enabled.ema}
                onToggle={() => handleToggle('ema')}
              >
                <NumberField
                  label="Period"
                  value={params.ema.period}
                  min={EMA_PERIOD_RANGE.min}
                  max={EMA_PERIOD_RANGE.max}
                  step={1}
                  onCommit={(v) => onUpdateParams('ema', { period: v })}
                />
              </IndicatorRow>

              <IndicatorRow
                label="SMA"
                description="Simple moving average — arithmetic mean of closing price over the window."
                active={enabled.sma}
                onToggle={() => handleToggle('sma')}
              >
                <NumberField
                  label="Period"
                  value={params.sma.period}
                  min={SMA_PERIOD_RANGE.min}
                  max={SMA_PERIOD_RANGE.max}
                  step={1}
                  onCommit={(v) => onUpdateParams('sma', { period: v })}
                />
              </IndicatorRow>

              <IndicatorRow
                label="Bollinger Bands"
                description="Volatility bands — a moving average ± a standard-deviation multiplier."
                active={enabled.bbands}
                onToggle={() => handleToggle('bbands')}
              >
                <NumberField
                  label="Period"
                  value={params.bbands.period}
                  min={BBANDS_PERIOD_RANGE.min}
                  max={BBANDS_PERIOD_RANGE.max}
                  step={1}
                  onCommit={(v) => onUpdateParams('bbands', { period: v })}
                />
                <NumberField
                  label="Std dev"
                  value={params.bbands.stdDev}
                  min={BBANDS_STDDEV_RANGE.min}
                  max={BBANDS_STDDEV_RANGE.max}
                  step={0.1}
                  onCommit={(v) => onUpdateParams('bbands', { stdDev: v })}
                />
              </IndicatorRow>

              <IndicatorRow
                label="Volume Profile (Session)"
                description="Horizontal histogram of traded volume by price, for the current session."
                active={enabled.volumeProfile}
                onToggle={() => handleToggle('volumeProfile')}
              >
                <div className="flex w-full flex-col gap-2">
                  <div>
                    <div className="mb-1 text-[10px] text-[#707070]">Session period</div>
                    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Session period">
                      {SESSION_PERIOD_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, period: opt.value } })}
                          className={pillClass(chartStyle.volumeProfile.period === opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {chartStyle.volumeProfile.period === 'custom' && (
                    <div className="flex flex-wrap items-center gap-3">
                      <TimeField
                        label="Start"
                        value={chartStyle.volumeProfile.customSessionStart}
                        onCommit={(v) => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, customSessionStart: v } })}
                      />
                      <TimeField
                        label="End"
                        value={chartStyle.volumeProfile.customSessionEnd}
                        onCommit={(v) => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, customSessionEnd: v } })}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <ToggleSwitch
                      active={chartStyle.volumeProfile.showVpoc}
                      onClick={() => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, showVpoc: !chartStyle.volumeProfile.showVpoc } })}
                      label={chartStyle.volumeProfile.showVpoc ? 'vPOC: On' : 'vPOC: Off'}
                    />
                    <ToggleSwitch
                      active={chartStyle.volumeProfile.showVahVal}
                      onClick={() => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, showVahVal: !chartStyle.volumeProfile.showVahVal } })}
                      label={chartStyle.volumeProfile.showVahVal ? 'VAH/VAL: On' : 'VAH/VAL: Off'}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <NumberField
                      label="Width %"
                      value={chartStyle.volumeProfile.profileWidthPct}
                      min={5}
                      max={60}
                      step={5}
                      onCommit={(v) => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, profileWidthPct: v } })}
                    />
                    <NumberField
                      label="Opacity"
                      value={chartStyle.volumeProfile.opacity}
                      min={0}
                      max={1}
                      step={0.1}
                      onCommit={(v) => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, opacity: v } })}
                    />
                  </div>
                </div>
              </IndicatorRow>
            </div>
          </div>

          <SectionDivider />

          <div>
            <SectionLabel>Panes</SectionLabel>
            <div className="flex flex-col gap-1">
              <IndicatorRow
                label="RSI"
                description="Momentum oscillator (0-100); reference lines at 70/30 mark overbought/oversold."
                active={enabled.rsi}
                onToggle={() => handleToggle('rsi')}
              >
                <NumberField
                  label="Period"
                  value={params.rsi.period}
                  min={RSI_PERIOD_RANGE.min}
                  max={RSI_PERIOD_RANGE.max}
                  step={1}
                  onCommit={(v) => onUpdateParams('rsi', { period: v })}
                />
              </IndicatorRow>

              <IndicatorRow
                label="MACD"
                description="Trend-following momentum via two EMAs and a signal line, with a histogram."
                active={enabled.macd}
                onToggle={() => handleToggle('macd')}
              >
                <NumberField
                  label="Fast"
                  value={params.macd.fast}
                  min={MACD_FAST_RANGE.min}
                  max={MACD_FAST_RANGE.max}
                  step={1}
                  onCommit={(v) => onUpdateParams('macd', { fast: v })}
                />
                <NumberField
                  label="Slow"
                  value={params.macd.slow}
                  min={MACD_SLOW_RANGE.min}
                  max={MACD_SLOW_RANGE.max}
                  step={1}
                  onCommit={(v) => onUpdateParams('macd', { slow: v })}
                />
                <NumberField
                  label="Signal"
                  value={params.macd.signal}
                  min={MACD_SIGNAL_RANGE.min}
                  max={MACD_SIGNAL_RANGE.max}
                  step={1}
                  onCommit={(v) => onUpdateParams('macd', { signal: v })}
                />
              </IndicatorRow>

              <IndicatorRow
                label="ATR"
                description="Average True Range — volatility measured in price ($), not percent."
                active={enabled.atr}
                onToggle={() => handleToggle('atr')}
              >
                <NumberField
                  label="Period"
                  value={params.atr.period}
                  min={ATR_PERIOD_RANGE.min}
                  max={ATR_PERIOD_RANGE.max}
                  step={1}
                  onCommit={(v) => onUpdateParams('atr', { period: v })}
                />
              </IndicatorRow>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between border-t px-5 py-3 sm:justify-between" style={{ borderColor: 'rgba(201,166,70,0.12)' }}>
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 h-7 rounded px-2 text-[11px] font-semibold text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-7 rounded px-3 text-[11px] font-semibold text-[#C9A646] border border-[rgba(201,166,70,0.35)] bg-[rgba(201,166,70,0.10)] hover:bg-[rgba(201,166,70,0.18)] transition-colors duration-150"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
