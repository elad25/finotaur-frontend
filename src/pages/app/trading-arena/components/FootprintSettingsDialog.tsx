/**
 * Trading Arena — Footprint Settings POPUP (ATAS-style full settings dialog).
 *
 * Replaces the old "Settings ▾" small dropdown (FootprintSettingsMenu.tsx —
 * left in the repo unused, not deleted) with a full modal dialog: a
 * left-hand tab rail (ATAS convention) and a scrolling content panel, so
 * EVERY footprint preference lives in one discoverable surface — including
 * the color scheme and the general chart-style settings that used to only
 * be reachable via the separate toolbar-level "Chart ▾" dropdown.
 *
 * Sections (left rail): Footprint | Imbalance | Colors | Stats Rows | Chart.
 * Purely presentational — all state lives in the caller via
 * `settings`/`onChange` (footprint) and `chartStyle`/`onChartStyleChange`
 * (chart style), same contract FootprintSettingsMenu.tsx and
 * ChartSettingsMenu.tsx already used. This component never touches
 * localStorage itself.
 *
 * Chart tab reuse note: ChartSettingsMenu.tsx manages its own trigger +
 * floating-panel open state internally and exposes no "content only" export,
 * so nesting the actual `<ChartSettingsMenu>` component inside this modal
 * would mean a dropdown-trigger-within-a-dialog (confusing double-popup
 * UX) rather than a clean embedded panel. Per the task's documented
 * fallback, this file re-implements the CORE chart-style sections directly
 * against the same `ChartStyleSettings` object / `chartStyleSettings.ts`
 * constants (candle colors, borders/wicks, background, grid, crosshair,
 * price line, session Volume Profile) — the toolbar's "Chart ▾" quick path
 * (ArenaToolbar.tsx, untouched) keeps working exactly as before for anyone
 * who prefers it. `footprintOnZoom` is intentionally OMITTED here — it's a
 * ChartTab-only bridge toggle (see chartStyleSettings.ts), not relevant to
 * the dedicated Footprint tab this dialog lives on.
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
import { CleanSelect } from './CleanSelect';
import type { FootprintCellMode } from '@/components/charting/orderflow/types';
import type {
  FootprintColorScheme,
  FootprintLayout,
  FootprintSettings,
} from './footprintSettings';
import {
  snapRowSizePriceToTick,
  snapRowSizeTicksToInt,
  FOOTPRINT_AUTO_TRANSFORM_MIN_PX_RANGE,
  FOOTPRINT_MIN_CELL_PX_FOR_TEXT_RANGE,
  FOOTPRINT_PROPORTION_UPPER_PERCENTILE_RANGE,
} from './footprintSettings';
import {
  CANDLE_COLOR_PRESETS,
  BACKGROUND_PRESETS,
  TIMEZONE_OPTIONS,
  type ChartStyleSettings,
  type CrosshairStyle,
  type PriceAxisFontSize,
  type PricePrecision,
} from './chartStyleSettings';

export interface FootprintSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: FootprintSettings;
  onChange: (patch: Partial<FootprintSettings>) => void;
  /** Resets the footprint-side settings (all tabs except Chart) to defaults. */
  onReset: () => void;
  /** Current instrument tick size — drives the row-size $/ticks translation line and price-mode snapping. */
  tickSize: number;
  /** True when FlowBinStore.wasRowSizeClamped() reports the last setConfig() clamped the row size upward. */
  rowSizeClamped: boolean;
  /** General chart-style settings (Chart tab section) — see chartStyleSettings.ts. */
  chartStyle: ChartStyleSettings;
  onChartStyleChange: (patch: Partial<ChartStyleSettings>) => void;
  onChartStyleReset: () => void;
  /** Gates the "Auto-transform to footprint" Order Flow toggle parity note (Chart tab only reads it for the disabled-hint copy). */
  assetClass?: string;
}

type DialogTabId = 'footprint' | 'imbalance' | 'colors' | 'stats' | 'chart';

const TABS: { id: DialogTabId; label: string }[] = [
  { id: 'footprint', label: 'Footprint' },
  { id: 'imbalance', label: 'Imbalance' },
  { id: 'colors', label: 'Colors' },
  { id: 'stats', label: 'Stats Rows' },
  { id: 'chart', label: 'Chart' },
];

const CONTENT_OPTIONS: { value: FootprintCellMode; label: string }[] = [
  { value: 'bidAsk', label: 'Bid×Ask' },
  { value: 'delta', label: 'Delta' },
  { value: 'volume', label: 'Volume' },
  { value: 'trades', label: 'Trades' },
  { value: 'volumeDelta', label: 'Vol+Δ' },
];

const LAYOUT_OPTIONS: { value: FootprintLayout; label: string }[] = [
  { value: 'numbers', label: 'Numbers' },
  { value: 'histogram', label: 'Histogram' },
];

const COLOR_SCHEME_OPTIONS: { value: FootprintColorScheme; label: string }[] = [
  { value: 'delta', label: 'Delta' },
  { value: 'volumeHeat', label: 'Volume heat' },
  { value: 'solid', label: 'Solid' },
];

const VALUES_DIVIDER_OPTIONS: { value: 1 | 1000; label: string }[] = [
  { value: 1000, label: 'K-compact (5.3K)' },
  { value: 1, label: 'Raw (5300)' },
];

const CROSSHAIR_OPTIONS: { value: CrosshairStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'hidden', label: 'Hidden' },
];

const FONT_SIZE_OPTIONS: PriceAxisFontSize[] = [11, 12, 13];

const PRICE_PRECISION_OPTIONS: { value: PricePrecision; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
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

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-[#C0C0C0]">{label}</span>
      {children}
    </div>
  );
}

function ToggleSwitch({ active, onClick, label, disabled }: { active: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(pillClass(active), disabled && 'opacity-40 cursor-not-allowed')}
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

  // Resync when the caller's value changes externally (tab switch, Reset to
  // defaults) — same pattern FootprintSettingsMenu.tsx's NumberField used.
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
    <label className="flex items-center justify-between gap-2 text-[11px] text-[#C0C0C0]">
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
        className="w-16 h-6 rounded border px-1.5 text-right text-[11px] text-[#E8E8E8] focus:outline-none"
        style={{ background: '#0D0D0F', borderColor: 'rgba(201,166,70,0.25)' }}
      />
    </label>
  );
}

interface StatsRowCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function StatsRowCheckbox({ label, checked, onChange }: StatsRowCheckboxProps) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-[#C0C0C0] cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3 w-3 accent-[#C9A646]"
      />
      <span>{label}</span>
    </label>
  );
}

function formatTicksLabel(ticks: number): string {
  return Number.isInteger(ticks) ? String(ticks) : ticks.toFixed(2);
}

interface RowSizeControlProps {
  settings: FootprintSettings;
  onChange: (patch: Partial<FootprintSettings>) => void;
  tickSize: number;
  rowSizeClamped: boolean;
}

function RowSizeControl({ settings, onChange, tickSize, rowSizeClamped }: RowSizeControlProps) {
  const [unit, setUnit] = useState<'price' | 'ticks'>(settings.rowSizeMode === 'ticks' ? 'ticks' : 'price');
  const [text, setText] = useState<string>(settings.rowSizeValue != null ? String(settings.rowSizeValue) : '');

  // External change (symbol switch, dialog reopen, Reset to defaults) — resync local input state.
  useEffect(() => {
    setText(settings.rowSizeValue != null ? String(settings.rowSizeValue) : '');
    if (settings.rowSizeMode !== 'auto') setUnit(settings.rowSizeMode);
  }, [settings.rowSizeMode, settings.rowSizeValue]);

  const commit = () => {
    const parsed = Number(text);
    if (text.trim() === '' || !Number.isFinite(parsed) || parsed <= 0) {
      setText(settings.rowSizeValue != null ? String(settings.rowSizeValue) : '');
      return;
    }
    const snapped = unit === 'price' ? snapRowSizePriceToTick(parsed, tickSize) : snapRowSizeTicksToInt(parsed);
    setText(String(snapped));
    onChange({ rowSizeMode: unit, rowSizeValue: snapped });
  };

  const isAuto = settings.rowSizeMode === 'auto';

  const translation =
    !isAuto && settings.rowSizeValue != null
      ? settings.rowSizeMode === 'price'
        ? { ticks: settings.rowSizeValue / tickSize, dollars: settings.rowSizeValue }
        : { ticks: settings.rowSizeValue, dollars: settings.rowSizeValue * tickSize }
      : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setText('');
            onChange({ rowSizeMode: 'auto', rowSizeValue: null });
          }}
          aria-pressed={isAuto}
          className={pillClass(isAuto)}
        >
          Auto
        </button>

        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder={isAuto ? 'Auto' : '—'}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="w-16 h-7 rounded border px-1.5 text-right text-[11px] text-[#E8E8E8] focus:outline-none"
          style={{ background: '#0D0D0F', borderColor: 'rgba(201,166,70,0.25)' }}
        />

        <div className="flex items-center gap-0.5" role="group" aria-label="Row size unit">
          <button
            type="button"
            onClick={() => setUnit('price')}
            aria-pressed={unit === 'price'}
            className={pillClass(unit === 'price')}
            title="Row size in dollars"
          >
            $
          </button>
          <button
            type="button"
            onClick={() => setUnit('ticks')}
            aria-pressed={unit === 'ticks'}
            className={pillClass(unit === 'ticks')}
            title="Row size in ticks"
          >
            ticks
          </button>
        </div>
      </div>

      {translation && (
        <div className="text-[10px] text-[#707070]">
          = {formatTicksLabel(translation.ticks)} ticks · ${translation.dollars.toFixed(2)} per row
        </div>
      )}

      {rowSizeClamped && (
        <div className="text-[10px] text-amber-400">
          Row size too small for this symbol — clamped
        </div>
      )}
    </div>
  );
}

export function FootprintSettingsDialog({
  open,
  onOpenChange,
  settings,
  onChange,
  onReset,
  tickSize,
  rowSizeClamped,
  chartStyle,
  onChartStyleChange,
  onChartStyleReset,
  assetClass,
}: FootprintSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<DialogTabId>('footprint');

  const activeCandlePresetId = CANDLE_COLOR_PRESETS.find(
    (p) => p.up === chartStyle.candleUpColor && p.down === chartStyle.candleDownColor,
  )?.id;
  const activeBackgroundPresetId = BACKGROUND_PRESETS.find(
    (p) => p.color === chartStyle.backgroundColor,
  )?.id;

  const handleReset = () => {
    if (activeTab === 'chart') {
      onChartStyleReset();
    } else {
      onReset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[720px] gap-0 border-[rgba(201,166,70,0.25)] bg-[rgba(10,10,11,0.98)] p-0 text-white shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        aria-describedby={undefined}
      >
        <DialogHeader className="border-b px-5 py-4" style={{ borderColor: 'rgba(201,166,70,0.12)' }}>
          <DialogTitle className="text-[15px] font-semibold text-[#E8E8E8]">
            Footprint Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-[420px]">
          {/* Left tab rail (ATAS-style) */}
          <div
            className="flex w-[150px] flex-shrink-0 flex-col gap-0.5 border-r p-2"
            style={{ borderColor: 'rgba(201,166,70,0.10)' }}
            role="tablist"
            aria-label="Footprint Settings sections"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded px-2.5 py-1.5 text-left text-[12px] font-semibold transition-colors duration-150',
                  activeTab === tab.id
                    ? 'bg-[rgba(201,166,70,0.14)] text-[#C9A646]'
                    : 'text-[#909090] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#E8E8E8]',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content — scrolls independently of the rail */}
          <div className="max-h-[65vh] flex-1 overflow-y-auto p-4">
            {activeTab === 'footprint' && (
              <div className="flex flex-col gap-4">
                <div>
                  <SectionLabel>Content</SectionLabel>
                  <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Footprint content">
                    {CONTENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange({ content: opt.value })}
                        className={pillClass(settings.content === opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <SectionDivider />

                <div>
                  <SectionLabel>Layout</SectionLabel>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Footprint layout">
                      {LAYOUT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => onChange({ layout: opt.value })}
                          className={pillClass(settings.layout === opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <FieldRow label="Auto-transform to footprint">
                      <ToggleSwitch
                        active={settings.autoTransform}
                        onClick={() => onChange({ autoTransform: !settings.autoTransform })}
                        label={settings.autoTransform ? 'On' : 'Off'}
                      />
                    </FieldRow>
                    {settings.autoTransform && (
                      <NumberField
                        label="Candle width to auto transform (px)"
                        value={settings.autoTransformMinPx}
                        min={FOOTPRINT_AUTO_TRANSFORM_MIN_PX_RANGE.min}
                        max={FOOTPRINT_AUTO_TRANSFORM_MIN_PX_RANGE.max}
                        step={1}
                        onCommit={(v) => onChange({ autoTransformMinPx: v })}
                      />
                    )}
                  </div>
                </div>

                <SectionDivider />

                <div>
                  <SectionLabel>Row Size</SectionLabel>
                  <RowSizeControl settings={settings} onChange={onChange} tickSize={tickSize} rowSizeClamped={rowSizeClamped} />
                </div>

                <SectionDivider />

                <div>
                  <SectionLabel>Panels</SectionLabel>
                  <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Overlay panels">
                    <button
                      type="button"
                      onClick={() => onChange({ showPoc: !settings.showPoc })}
                      aria-pressed={settings.showPoc}
                      className={pillClass(settings.showPoc)}
                    >
                      POC
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ showValueArea: !settings.showValueArea })}
                      aria-pressed={settings.showValueArea}
                      className={pillClass(settings.showValueArea)}
                    >
                      Value Area
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ magnifierEnabled: !settings.magnifierEnabled })}
                      aria-pressed={settings.magnifierEnabled}
                      className={pillClass(settings.magnifierEnabled)}
                    >
                      Magnifier
                    </button>
                  </div>
                </div>

                <SectionDivider />

                <div>
                  <SectionLabel>Number Display</SectionLabel>
                  <div className="flex flex-col gap-2">
                    <div>
                      <div className="mb-1 text-[10px] text-[#707070]">Values divider</div>
                      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Values divider">
                        {VALUES_DIVIDER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => onChange({ valuesDivider: opt.value })}
                            className={pillClass(settings.valuesDivider === opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <NumberField
                      label="Min. candle width to show text (px)"
                      value={settings.minCellPxForText}
                      min={FOOTPRINT_MIN_CELL_PX_FOR_TEXT_RANGE.min}
                      max={FOOTPRINT_MIN_CELL_PX_FOR_TEXT_RANGE.max}
                      step={1}
                      onCommit={(v) => onChange({ minCellPxForText: v })}
                    />
                    <NumberField
                      label="Proportion upper percentile (%)"
                      value={settings.proportionUpperPercentile}
                      min={FOOTPRINT_PROPORTION_UPPER_PERCENTILE_RANGE.min}
                      max={FOOTPRINT_PROPORTION_UPPER_PERCENTILE_RANGE.max}
                      step={1}
                      onCommit={(v) => onChange({ proportionUpperPercentile: v })}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'imbalance' && (
              <div className="flex flex-col gap-3">
                <NumberField
                  label="Ratio %"
                  value={settings.imbalanceRatioPct}
                  min={110}
                  max={1000}
                  step={10}
                  onCommit={(v) => onChange({ imbalanceRatioPct: v })}
                />
                <NumberField
                  label="Stacked count"
                  value={settings.imbalanceStackedCount}
                  min={2}
                  max={10}
                  step={1}
                  onCommit={(v) => onChange({ imbalanceStackedCount: v })}
                />
                <FieldRow label="Stacked only">
                  <ToggleSwitch
                    active={settings.imbalanceStackedOnly}
                    onClick={() => onChange({ imbalanceStackedOnly: !settings.imbalanceStackedOnly })}
                    label={settings.imbalanceStackedOnly ? 'On' : 'Off'}
                  />
                </FieldRow>

                <SectionDivider />

                <NumberField
                  label="Min. qty difference"
                  value={settings.imbalanceMinDiff}
                  min={0}
                  max={100000}
                  step={1}
                  onCommit={(v) => onChange({ imbalanceMinDiff: v })}
                />
                <FieldRow label="Ignore zero values">
                  <ToggleSwitch
                    active={settings.imbalanceIgnoreZeros}
                    onClick={() => onChange({ imbalanceIgnoreZeros: !settings.imbalanceIgnoreZeros })}
                    label={settings.imbalanceIgnoreZeros ? 'On' : 'Off'}
                  />
                </FieldRow>
                <FieldRow label="Bold winning number">
                  <ToggleSwitch
                    active={settings.imbalanceBold}
                    onClick={() => onChange({ imbalanceBold: !settings.imbalanceBold })}
                    label={settings.imbalanceBold ? 'On' : 'Off'}
                  />
                </FieldRow>
              </div>
            )}

            {activeTab === 'colors' && (
              <div>
                <SectionLabel>Cell Color Scheme</SectionLabel>
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Footprint color scheme">
                  {COLOR_SCHEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onChange({ colorScheme: opt.value })}
                      className={pillClass(settings.colorScheme === opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="flex flex-col gap-1">
                <StatsRowCheckbox
                  label="Volume"
                  checked={settings.statsRows.volume}
                  onChange={(checked) => onChange({ statsRows: { ...settings.statsRows, volume: checked } })}
                />
                <StatsRowCheckbox
                  label="Delta"
                  checked={settings.statsRows.delta}
                  onChange={(checked) => onChange({ statsRows: { ...settings.statsRows, delta: checked } })}
                />
                <StatsRowCheckbox
                  label="Delta %"
                  checked={settings.statsRows.deltaPct}
                  onChange={(checked) => onChange({ statsRows: { ...settings.statsRows, deltaPct: checked } })}
                />
                <StatsRowCheckbox
                  label="Max Δ"
                  checked={settings.statsRows.maxDelta}
                  onChange={(checked) => onChange({ statsRows: { ...settings.statsRows, maxDelta: checked } })}
                />
                <StatsRowCheckbox
                  label="Min Δ"
                  checked={settings.statsRows.minDelta}
                  onChange={(checked) => onChange({ statsRows: { ...settings.statsRows, minDelta: checked } })}
                />
                <StatsRowCheckbox
                  label="Session Δ"
                  checked={settings.statsRows.sessionDelta}
                  onChange={(checked) => onChange({ statsRows: { ...settings.statsRows, sessionDelta: checked } })}
                />
              </div>
            )}

            {activeTab === 'chart' && (
              <div className="flex flex-col gap-4">
                <div>
                  <SectionLabel>Candles</SectionLabel>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Candle color preset">
                      {CANDLE_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          title={preset.label}
                          aria-pressed={activeCandlePresetId === preset.id}
                          onClick={() => onChartStyleChange({ candleUpColor: preset.up, candleDownColor: preset.down })}
                          className={cn(
                            'flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded border transition-all duration-150',
                            activeCandlePresetId === preset.id
                              ? 'border-[rgba(201,166,70,0.65)] ring-1 ring-[rgba(201,166,70,0.45)]'
                              : 'border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.3)]',
                          )}
                        >
                          <span className="h-full w-1/2" style={{ background: preset.up }} aria-hidden="true" />
                          <span className="h-full w-1/2" style={{ background: preset.down }} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                    <FieldRow label="Borders">
                      <ToggleSwitch
                        active={chartStyle.candleBordersVisible}
                        onClick={() => onChartStyleChange({ candleBordersVisible: !chartStyle.candleBordersVisible })}
                        label={chartStyle.candleBordersVisible ? 'On' : 'Off'}
                      />
                    </FieldRow>
                    <FieldRow label="Wicks">
                      <ToggleSwitch
                        active={chartStyle.candleWicksVisible}
                        onClick={() => onChartStyleChange({ candleWicksVisible: !chartStyle.candleWicksVisible })}
                        label={chartStyle.candleWicksVisible ? 'On' : 'Off'}
                      />
                    </FieldRow>
                  </div>
                </div>

                <SectionDivider />

                <div>
                  <SectionLabel>Canvas</SectionLabel>
                  <div className="flex flex-col gap-2">
                    <div>
                      <div className="mb-1 text-[10px] text-[#707070]">Background</div>
                      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Background preset">
                        {BACKGROUND_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            title={preset.label}
                            aria-pressed={activeBackgroundPresetId === preset.id}
                            onClick={() => onChartStyleChange({ backgroundColor: preset.color })}
                            className={cn(
                              'h-7 w-7 flex-shrink-0 rounded border transition-all duration-150',
                              activeBackgroundPresetId === preset.id
                                ? 'border-[rgba(201,166,70,0.65)] ring-1 ring-[rgba(201,166,70,0.45)]'
                                : 'border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.3)]',
                            )}
                            style={{ background: preset.color }}
                          />
                        ))}
                      </div>
                    </div>
                    <FieldRow label="Grid — Vertical">
                      <ToggleSwitch
                        active={chartStyle.gridVerticalVisible}
                        onClick={() => onChartStyleChange({ gridVerticalVisible: !chartStyle.gridVerticalVisible })}
                        label={chartStyle.gridVerticalVisible ? 'On' : 'Off'}
                      />
                    </FieldRow>
                    <FieldRow label="Grid — Horizontal">
                      <ToggleSwitch
                        active={chartStyle.gridHorizontalVisible}
                        onClick={() => onChartStyleChange({ gridHorizontalVisible: !chartStyle.gridHorizontalVisible })}
                        label={chartStyle.gridHorizontalVisible ? 'On' : 'Off'}
                      />
                    </FieldRow>
                    <div>
                      <div className="mb-1 text-[10px] text-[#707070]">Crosshair</div>
                      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Crosshair style">
                        {CROSSHAIR_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => onChartStyleChange({ crosshairStyle: opt.value })}
                            className={pillClass(chartStyle.crosshairStyle === opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <SectionDivider />

                <div>
                  <SectionLabel>Scales &amp; Lines</SectionLabel>
                  <div className="flex flex-col gap-2">
                    <FieldRow label="Last price line">
                      <ToggleSwitch
                        active={chartStyle.lastPriceLineVisible}
                        onClick={() => onChartStyleChange({ lastPriceLineVisible: !chartStyle.lastPriceLineVisible })}
                        label={chartStyle.lastPriceLineVisible ? 'On' : 'Off'}
                      />
                    </FieldRow>
                    <div>
                      <div className="mb-1 text-[10px] text-[#707070]">Price axis font size</div>
                      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Price axis font size">
                        {FONT_SIZE_OPTIONS.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => onChartStyleChange({ priceAxisFontSize: size })}
                            className={pillClass(chartStyle.priceAxisFontSize === size)}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <SectionDivider />

                <div>
                  <SectionLabel>Time</SectionLabel>
                  <div className="flex flex-col gap-2">
                    <div>
                      <div className="mb-1 text-[10px] text-[#707070]">Timezone</div>
                      <CleanSelect
                        value={chartStyle.timezone}
                        options={TIMEZONE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                        onChange={(v) => onChartStyleChange({ timezone: v })}
                      />
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] text-[#707070]">Price precision</div>
                      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Price precision">
                        {PRICE_PRECISION_OPTIONS.map((opt) => (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onClick={() => onChartStyleChange({ pricePrecision: opt.value })}
                            className={pillClass(chartStyle.pricePrecision === opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <SectionDivider />

                {/* Volume Profile moved to the Trading Arena's Indicators
                    popup (2026-07) — it's now an 8th indicator toggle (see
                    indicatorsSettings.ts), counted in the max-5-active limit.
                    This tab used to duplicate ChartSettingsMenu.tsx's Volume
                    Profile section; same relocation note applies here. */}
                <div className="text-[10px] text-[#707070]">
                  Volume Profile moved to Indicators.
                </div>

                {assetClass !== undefined && assetClass !== 'crypto' && (
                  <div className="text-[10px] text-[#707070]">
                    Order Flow auto-transform (Chart tab) requires tick data — not shown here.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between border-t px-5 py-3 sm:justify-between" style={{ borderColor: 'rgba(201,166,70,0.12)' }}>
          <button
            type="button"
            onClick={handleReset}
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
