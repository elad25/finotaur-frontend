import { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Search } from 'lucide-react';
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
  EMA_PERIOD_RANGE,
  SMA_PERIOD_RANGE,
  RSI_PERIOD_RANGE,
  MACD_FAST_RANGE,
  MACD_SLOW_RANGE,
  MACD_SIGNAL_RANGE,
  BBANDS_PERIOD_RANGE,
  BBANDS_STDDEV_RANGE,
  ATR_PERIOD_RANGE,
  type ArenaIndicatorInstance,
  type ArenaIndicatorKey,
  type ArenaIndicatorParamsByType,
} from './indicatorsSettings';
import type { ChartStyleSettings, SessionVolumeProfilePeriod } from './chartStyleSettings';

export interface IndicatorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently added instances — single source of truth lives in TradingArena.tsx. */
  instances: ArenaIndicatorInstance[];
  /** Adds a fresh instance of `type` (returns its id, or null if refused — see useArenaIndicatorPreferences.ts's addInstance doc). */
  onAddInstance: (type: ArenaIndicatorKey) => string | null;
  onReset: () => void;
  intraday: boolean;
}

const SESSION_PERIOD_OPTIONS: { value: SessionVolumeProfilePeriod; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'custom', label: 'Custom' },
];

/**
 * Renders the "Inputs" fields for ONE indicator instance — extracted to a
 * standalone function so IndicatorSettingsDialog.tsx's per-instance "Inputs"
 * tab can reuse the EXACT same fields without duplicating this switch,
 * avoiding drift between the catalog and the per-instance dialog. Takes the
 * instance's OWN params object (not the old whole-map `ArenaIndicatorParams`)
 * plus a generic `onPatch` callback that patches THAT instance only —
 * volumeProfile is the one exception, still editing `chartStyle` directly
 * (its detail params are global, not per-instance — see
 * indicatorsSettings.ts's `ArenaIndicatorParamsByType.volumeProfile`).
 */
export function renderIndicatorInputsFields(
  key: ArenaIndicatorKey,
  params: ArenaIndicatorParamsByType[ArenaIndicatorKey],
  onPatch: (patch: Record<string, unknown>) => void,
  chartStyle: ChartStyleSettings,
  onChartStyleChange: (patch: Partial<ChartStyleSettings>) => void,
) {
  switch (key) {
    case 'ema': {
      const p = params as { period: number };
      return <NumberField label="Period" value={p.period} min={EMA_PERIOD_RANGE.min} max={EMA_PERIOD_RANGE.max} step={1} onCommit={(v) => onPatch({ period: v })} />;
    }
    case 'sma': {
      const p = params as { period: number };
      return <NumberField label="Period" value={p.period} min={SMA_PERIOD_RANGE.min} max={SMA_PERIOD_RANGE.max} step={1} onCommit={(v) => onPatch({ period: v })} />;
    }
    case 'bbands': {
      const p = params as { period: number; stdDev: number };
      return (
        <>
          <NumberField label="Period" value={p.period} min={BBANDS_PERIOD_RANGE.min} max={BBANDS_PERIOD_RANGE.max} step={1} onCommit={(v) => onPatch({ period: v })} />
          <NumberField label="Std dev" value={p.stdDev} min={BBANDS_STDDEV_RANGE.min} max={BBANDS_STDDEV_RANGE.max} step={0.1} onCommit={(v) => onPatch({ stdDev: v })} />
        </>
      );
    }
    case 'rsi': {
      const p = params as { period: number };
      return <NumberField label="Period" value={p.period} min={RSI_PERIOD_RANGE.min} max={RSI_PERIOD_RANGE.max} step={1} onCommit={(v) => onPatch({ period: v })} />;
    }
    case 'macd': {
      const p = params as { fast: number; slow: number; signal: number };
      return (
        <>
          <NumberField label="Fast" value={p.fast} min={MACD_FAST_RANGE.min} max={MACD_FAST_RANGE.max} step={1} onCommit={(v) => onPatch({ fast: v })} />
          <NumberField label="Slow" value={p.slow} min={MACD_SLOW_RANGE.min} max={MACD_SLOW_RANGE.max} step={1} onCommit={(v) => onPatch({ slow: v })} />
          <NumberField label="Signal" value={p.signal} min={MACD_SIGNAL_RANGE.min} max={MACD_SIGNAL_RANGE.max} step={1} onCommit={(v) => onPatch({ signal: v })} />
        </>
      );
    }
    case 'atr': {
      const p = params as { period: number };
      return <NumberField label="Period" value={p.period} min={ATR_PERIOD_RANGE.min} max={ATR_PERIOD_RANGE.max} step={1} onCommit={(v) => onPatch({ period: v })} />;
    }
    case 'cvd': {
      const p = params as { displayMode: 'pane' | 'overlay' };
      return (
        <div className="flex w-full flex-col gap-1">
          <div className="mb-1 text-[10px] text-[#707070]">Display</div>
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="CVD display mode">
            {(['pane', 'overlay'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onPatch({ displayMode: mode })}
                className={pillClass(p.displayMode === mode)}
              >
                {mode === 'pane' ? 'Pane' : 'Overlay'}
              </button>
            ))}
          </div>
        </div>
      );
    }
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
  label: string;
  description: string;
  disabled?: boolean;
  disabledHint?: string;
  onAdd: () => void;
}

/** "+"-only add row — clicking ALWAYS adds a fresh instance. No Added/active state: the same indicator can be added any number of times (see IndicatorsDialogProps.onAddInstance). */
function IndicatorAddRow({ label, description, disabled, disabledHint, onAdd }: IndicatorAddRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded px-2 py-2">
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
      >
        <div className={cn('text-[12px] font-semibold', disabled ? 'text-[#3a3a3a]' : 'text-[#C0C0C0]')}>{label}</div>
        <div className="truncate text-[10px] text-[#707070]">{disabled && disabledHint ? disabledHint : description}</div>
      </button>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        aria-label={`Add ${label}`}
        title={disabled && disabledHint ? disabledHint : `Add ${label}`}
        className={cn(pillClass(false), disabled && 'cursor-not-allowed opacity-40')}
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Case-insensitive substring match on label + shortLabel + description. */
function matchesQuery(definition: (typeof ARENA_INDICATOR_DEFINITIONS)[number], query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    definition.label.toLowerCase().includes(q)
    || definition.shortLabel.toLowerCase().includes(q)
    || definition.description.toLowerCase().includes(q)
  );
}

export function IndicatorsDialog({
  open,
  onOpenChange,
  instances,
  onAddInstance,
  onReset,
  intraday,
}: IndicatorsDialogProps) {
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);
  const [query, setQuery] = useState('');

  const atLimit = instances.length >= MAX_ACTIVE_INDICATORS;
  const hasVolumeProfile = useMemo(() => instances.some((instance) => instance.type === 'volumeProfile'), [instances]);

  const overlayDefinitions = useMemo(
    () => ARENA_INDICATOR_DEFINITIONS.filter((definition) => definition.section === 'overlays' && matchesQuery(definition, query)),
    [query],
  );
  const paneDefinitions = useMemo(
    () => ARENA_INDICATOR_DEFINITIONS.filter((definition) => definition.section === 'panes' && matchesQuery(definition, query)),
    [query],
  );
  const noMatches = query.length > 0 && overlayDefinitions.length === 0 && paneDefinitions.length === 0;

  useEffect(() => {
    if (!atLimit) setLimitNoticeVisible(false);
  }, [atLimit]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  function handleAdd(type: ArenaIndicatorKey) {
    if (type === 'volumeProfile' && hasVolumeProfile) return; // single-instance cap — "+" is a no-op once one exists
    if (atLimit) {
      setLimitNoticeVisible(true);
      return;
    }
    onAddInstance(type);
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
            {instances.length}/{MAX_ACTIVE_INDICATORS} active
          </span>
        </DialogHeader>

        <div className="border-b px-4 py-3" style={{ borderColor: 'rgba(201,166,70,0.12)' }}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#707070]" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search indicators..."
              aria-label="Search indicators"
              className="h-8 w-full rounded border pl-7 pr-2 text-[12px] text-[#E8E8E8] placeholder:text-[#5a5a5a] focus:outline-none"
              style={{ background: '#0D0D0F', borderColor: 'rgba(201,166,70,0.25)' }}
            />
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4 flex flex-col gap-4">
          {limitNoticeVisible && <div className="text-[10px] text-amber-400">Up to 5 active indicators - remove one first.</div>}

          {noMatches && <div className="text-[11px] text-[#707070]">No indicators match.</div>}

          {overlayDefinitions.length > 0 && (
            <div>
              <SectionLabel>Overlays</SectionLabel>
              <div className="flex flex-col gap-1">
                {overlayDefinitions.map((definition) => (
                  <IndicatorAddRow
                    key={definition.key}
                    label={definition.label}
                    description={definition.description}
                    disabled={
                      (definition.key === 'vwap' && !intraday)
                      || (definition.key === 'volumeProfile' && hasVolumeProfile)
                    }
                    disabledHint={
                      definition.key === 'vwap' && !intraday
                        ? 'VWAP is intraday-only.'
                        : definition.key === 'volumeProfile' && hasVolumeProfile
                          ? 'Already added.'
                          : undefined
                    }
                    onAdd={() => handleAdd(definition.key)}
                  />
                ))}
              </div>
            </div>
          )}

          {overlayDefinitions.length > 0 && paneDefinitions.length > 0 && <SectionDivider />}

          {paneDefinitions.length > 0 && (
            <div>
              <SectionLabel>Panes</SectionLabel>
              <div className="flex flex-col gap-1">
                {paneDefinitions.map((definition) => (
                  <IndicatorAddRow
                    key={definition.key}
                    label={definition.label}
                    description={definition.description}
                    onAdd={() => handleAdd(definition.key)}
                  />
                ))}
              </div>
            </div>
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
