import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ARENA_INDICATOR_DEFINITIONS,
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
  type ArenaIndicatorKey,
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
  settingsKey?: ArenaIndicatorKey | null;
  onSettingsKeyChange?: (key: ArenaIndicatorKey | null) => void;
  intraday: boolean;
  chartStyle: ChartStyleSettings;
  onChartStyleChange: (patch: Partial<ChartStyleSettings>) => void;
}

const SESSION_PERIOD_OPTIONS: { value: SessionVolumeProfilePeriod; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'custom', label: 'Custom' },
];

/**
 * Renders the "Inputs" fields for one indicator — extracted to a standalone
 * function (was a closure inside IndicatorsDialog) so IndicatorSettingsDialog.tsx's
 * per-indicator "Inputs" tab can reuse the EXACT same fields without
 * duplicating this switch, avoiding drift between the two dialogs.
 */
export function renderIndicatorInputsFields(
  key: ArenaIndicatorKey,
  params: ArenaIndicatorParams,
  onUpdateParams: <K extends keyof ArenaIndicatorParams>(key: K, patch: Partial<ArenaIndicatorParams[K]>) => void,
  chartStyle: ChartStyleSettings,
  onChartStyleChange: (patch: Partial<ChartStyleSettings>) => void,
) {
  switch (key) {
    case 'ema':
      return <NumberField label="Period" value={params.ema.period} min={EMA_PERIOD_RANGE.min} max={EMA_PERIOD_RANGE.max} step={1} onCommit={(v) => onUpdateParams('ema', { period: v })} />;
    case 'sma':
      return <NumberField label="Period" value={params.sma.period} min={SMA_PERIOD_RANGE.min} max={SMA_PERIOD_RANGE.max} step={1} onCommit={(v) => onUpdateParams('sma', { period: v })} />;
    case 'bbands':
      return (
        <>
          <NumberField label="Period" value={params.bbands.period} min={BBANDS_PERIOD_RANGE.min} max={BBANDS_PERIOD_RANGE.max} step={1} onCommit={(v) => onUpdateParams('bbands', { period: v })} />
          <NumberField label="Std dev" value={params.bbands.stdDev} min={BBANDS_STDDEV_RANGE.min} max={BBANDS_STDDEV_RANGE.max} step={0.1} onCommit={(v) => onUpdateParams('bbands', { stdDev: v })} />
        </>
      );
    case 'rsi':
      return <NumberField label="Period" value={params.rsi.period} min={RSI_PERIOD_RANGE.min} max={RSI_PERIOD_RANGE.max} step={1} onCommit={(v) => onUpdateParams('rsi', { period: v })} />;
    case 'macd':
      return (
        <>
          <NumberField label="Fast" value={params.macd.fast} min={MACD_FAST_RANGE.min} max={MACD_FAST_RANGE.max} step={1} onCommit={(v) => onUpdateParams('macd', { fast: v })} />
          <NumberField label="Slow" value={params.macd.slow} min={MACD_SLOW_RANGE.min} max={MACD_SLOW_RANGE.max} step={1} onCommit={(v) => onUpdateParams('macd', { slow: v })} />
          <NumberField label="Signal" value={params.macd.signal} min={MACD_SIGNAL_RANGE.min} max={MACD_SIGNAL_RANGE.max} step={1} onCommit={(v) => onUpdateParams('macd', { signal: v })} />
        </>
      );
    case 'atr':
      return <NumberField label="Period" value={params.atr.period} min={ATR_PERIOD_RANGE.min} max={ATR_PERIOD_RANGE.max} step={1} onCommit={(v) => onUpdateParams('atr', { period: v })} />;
    case 'volumeProfile':
      return (
        <div className="flex w-full flex-col gap-2">
          <div>
            <div className="mb-1 text-[10px] text-[#707070]">Session period</div>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Session period">
              {SESSION_PERIOD_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, period: opt.value } })} className={pillClass(chartStyle.volumeProfile.period === opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {chartStyle.volumeProfile.period === 'custom' && (
            <div className="flex flex-wrap items-center gap-3">
              <TimeField label="Start" value={chartStyle.volumeProfile.customSessionStart} onCommit={(v) => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, customSessionStart: v } })} />
              <TimeField label="End" value={chartStyle.volumeProfile.customSessionEnd} onCommit={(v) => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, customSessionEnd: v } })} />
            </div>
          )}
          <div>
            <div className="mb-1 text-[10px] text-[#707070]">Side</div>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Volume profile side">
              {[
                { value: 'left' as const, label: 'Left' },
                { value: 'right' as const, label: 'Right' },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, anchorSide: opt.value } })} className={pillClass(chartStyle.volumeProfile.anchorSide === opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={() => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, showVpoc: !chartStyle.volumeProfile.showVpoc } })} className={pillClass(chartStyle.volumeProfile.showVpoc)}>
              vPOC
            </button>
            <button type="button" onClick={() => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, showVahVal: !chartStyle.volumeProfile.showVahVal } })} className={pillClass(chartStyle.volumeProfile.showVahVal)}>
              VAH/VAL
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <NumberField label="Width %" value={chartStyle.volumeProfile.profileWidthPct} min={5} max={60} step={5} onCommit={(v) => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, profileWidthPct: v } })} />
            <NumberField label="Opacity" value={chartStyle.volumeProfile.opacity} min={0} max={1} step={0.1} onCommit={(v) => onChartStyleChange({ volumeProfile: { ...chartStyle.volumeProfile, opacity: v } })} />
          </div>
        </div>
      );
    case 'vwap':
    default:
      return <span className="text-[10px] text-[#707070]">No editable values for this indicator.</span>;
  }
}

export function pillClass(active: boolean): string {
  return cn(
    'h-7 rounded px-2 text-[11px] font-semibold transition-all duration-150 border whitespace-nowrap inline-flex items-center gap-1.5',
    active
      ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border-[rgba(201,166,70,0.45)]'
      : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
  );
}

function SectionLabel({ children }: { children: string }) {
  return <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#707070]">{children}</div>;
}

function SectionDivider() {
  return <div className="h-px" style={{ background: 'rgba(201,166,70,0.10)' }} aria-hidden="true" />;
}

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (value: number) => void;
}

export function NumberField({ label, value, min, max, step, onCommit }: NumberFieldProps) {
  const [text, setText] = useState(String(value));

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
        className="h-6 w-16 rounded border px-1.5 text-right text-[11px] text-[#E8E8E8] focus:outline-none"
        style={{ background: '#0D0D0F', borderColor: 'rgba(201,166,70,0.25)' }}
      />
    </label>
  );
}

export function TimeField({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  const commit = () => {
    if (/^\d{1,2}:\d{2}$/.test(text.trim())) {
      if (text !== value) onCommit(text.trim());
    } else {
      setText(value);
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
        className="h-6 w-16 rounded border px-1.5 text-right text-[11px] text-[#E8E8E8] focus:outline-none"
        style={{ background: '#0D0D0F', borderColor: 'rgba(201,166,70,0.25)' }}
      />
    </label>
  );
}

interface IndicatorAddRowProps {
  indicatorKey: ArenaIndicatorKey;
  label: string;
  description: string;
  active: boolean;
  disabled?: boolean;
  disabledHint?: string;
  selected: boolean;
  onAddOrSelect: () => void;
}

function IndicatorAddRow({
  label,
  description,
  active,
  disabled,
  disabledHint,
  selected,
  onAddOrSelect,
}: IndicatorAddRowProps) {
  return (
    <div
      className={cn('flex items-center justify-between gap-3 rounded px-2 py-2', selected && 'bg-[rgba(201,166,70,0.08)]')}
      style={{ background: selected ? 'rgba(201,166,70,0.08)' : active ? 'rgba(201,166,70,0.04)' : 'transparent' }}
    >
      <button
        type="button"
        onClick={onAddOrSelect}
        disabled={disabled}
        className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
      >
        <div className={cn('text-[12px] font-semibold', disabled ? 'text-[#3a3a3a]' : active ? 'text-[#C9A646]' : 'text-[#C0C0C0]')}>
          {label}
        </div>
        <div className="truncate text-[10px] text-[#707070]">{disabled && disabledHint ? disabledHint : description}</div>
      </button>
      <button
        type="button"
        onClick={onAddOrSelect}
        disabled={disabled}
        className={cn(pillClass(active), disabled && 'cursor-not-allowed opacity-40')}
      >
        {active ? <Check className="h-3 w-3" aria-hidden="true" /> : <Plus className="h-3 w-3" aria-hidden="true" />}
        <span>{active ? 'Added' : 'Add'}</span>
      </button>
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
  settingsKey,
  onSettingsKeyChange,
  intraday,
  chartStyle,
  onChartStyleChange,
}: IndicatorsDialogProps) {
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);
  const [localSettingsKey, setLocalSettingsKey] = useState<ArenaIndicatorKey | null>(null);
  const selectedSettingsKey = settingsKey !== undefined ? settingsKey : localSettingsKey;
  const setSelectedSettingsKey = onSettingsKeyChange ?? setLocalSettingsKey;

  const activeCount = countActiveIndicators(enabled);
  const atLimit = activeCount >= MAX_ACTIVE_INDICATORS;
  const overlayDefinitions = useMemo(() => ARENA_INDICATOR_DEFINITIONS.filter((definition) => definition.section === 'overlays'), []);
  const paneDefinitions = useMemo(() => ARENA_INDICATOR_DEFINITIONS.filter((definition) => definition.section === 'panes'), []);
  const selectedDefinition = ARENA_INDICATOR_DEFINITIONS.find((definition) => definition.key === selectedSettingsKey);

  useEffect(() => {
    if (!atLimit) setLimitNoticeVisible(false);
  }, [atLimit]);

  function handleAddOrSelect(key: ArenaIndicatorKey) {
    if (enabled[key]) {
      setSelectedSettingsKey(key);
      return;
    }
    if (atLimit) {
      setLimitNoticeVisible(true);
      return;
    }
    onUpdateEnabled({ [key]: true } as Partial<ArenaIndicatorEnabled>);
    setSelectedSettingsKey(key);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[560px] gap-0 border-[rgba(201,166,70,0.25)] bg-[rgba(10,10,11,0.98)] p-0 text-white shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        aria-describedby={undefined}
      >
        <DialogHeader className="flex-row items-center justify-between space-y-0 border-b px-5 py-4" style={{ borderColor: 'rgba(201,166,70,0.12)' }}>
          <DialogTitle className="text-[15px] font-semibold text-[#E8E8E8]">Indicators</DialogTitle>
          <span className={cn('text-[11px] font-semibold', atLimit ? 'text-red-400' : 'text-[#707070]')}>
            {activeCount}/{MAX_ACTIVE_INDICATORS} active
          </span>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto p-4 flex flex-col gap-4">
          {limitNoticeVisible && <div className="text-[10px] text-amber-400">Up to 5 active indicators - remove one first.</div>}

          <div>
            <SectionLabel>Overlays</SectionLabel>
            <div className="flex flex-col gap-1">
              {overlayDefinitions.map((definition) => (
                <IndicatorAddRow
                  key={definition.key}
                  indicatorKey={definition.key}
                  label={definition.label}
                  description={definition.description}
                  active={enabled[definition.key]}
                  disabled={definition.key === 'vwap' && !intraday}
                  disabledHint="VWAP is intraday-only."
                  selected={selectedSettingsKey === definition.key}
                  onAddOrSelect={() => handleAddOrSelect(definition.key)}
                />
              ))}
            </div>
          </div>

          <SectionDivider />

          <div>
            <SectionLabel>Panes</SectionLabel>
            <div className="flex flex-col gap-1">
              {paneDefinitions.map((definition) => (
                <IndicatorAddRow
                  key={definition.key}
                  indicatorKey={definition.key}
                  label={definition.label}
                  description={definition.description}
                  active={enabled[definition.key]}
                  selected={selectedSettingsKey === definition.key}
                  onAddOrSelect={() => handleAddOrSelect(definition.key)}
                />
              ))}
            </div>
          </div>

          {selectedDefinition && enabled[selectedDefinition.key] && (
            <>
              <SectionDivider />
              <div className="rounded border border-[rgba(201,166,70,0.16)] bg-[rgba(201,166,70,0.05)] p-3">
                <div className="mb-3 flex items-center gap-2">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-[#C9A646]" aria-hidden="true" />
                  <div>
                    <div className="text-[12px] font-semibold text-[#E8E8E8]">{selectedDefinition.label} settings</div>
                    <div className="text-[10px] text-[#707070]">{selectedDefinition.description}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {renderIndicatorInputsFields(selectedDefinition.key, params, onUpdateParams, chartStyle, onChartStyleChange)}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between border-t px-5 py-3 sm:justify-between" style={{ borderColor: 'rgba(201,166,70,0.12)' }}>
          <button
            type="button"
            onClick={onReset}
            className="flex h-7 items-center gap-1.5 rounded px-2 text-[11px] font-semibold text-[#707070] transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#C0C0C0]"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-7 rounded border border-[rgba(201,166,70,0.35)] bg-[rgba(201,166,70,0.10)] px-3 text-[11px] font-semibold text-[#C9A646] transition-colors duration-150 hover:bg-[rgba(201,166,70,0.18)]"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
