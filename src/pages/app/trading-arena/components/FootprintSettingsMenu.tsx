/**
 * Trading Arena — Footprint tab "Settings ▾" menu (PR 2 — Unified Footprint
 * Settings).
 *
 * One `Settings ▾` ToolbarTrigger (see ./ToolbarTrigger.tsx — the same
 * gold-on-black dropdown chrome ArenaToolbar's Timeframe/Indicators menus
 * use) opening a single scrollable panel with 6 sections: Content, Layout,
 * Colors, Imbalance, Row Size, and Panels (+ Cluster Statistics row
 * visibility). Purely presentational — all state lives in the caller via
 * `settings`/`onChange` (see useFootprintPreferences.ts); this component
 * never touches localStorage itself.
 *
 * Layout/Colors are wired end-to-end here (persisted, selectable) — and
 * fully rendered: footprintRender.ts's dispatch handles layout==='histogram'
 * and all three colorSchemes ('delta' | 'volumeHeat' | 'solid'), shipped and
 * verified live in production.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ToolbarTrigger } from './ToolbarTrigger';
import type { FootprintCellMode } from '@/components/charting/orderflow/types';
import type { FootprintColorScheme, FootprintLayout, FootprintSettings } from './footprintSettings';
import { snapRowSizePriceToTick, snapRowSizeTicksToInt, FOOTPRINT_AUTO_TRANSFORM_MIN_PX_RANGE } from './footprintSettings';

export interface FootprintSettingsMenuProps {
  settings: FootprintSettings;
  onChange: (patch: Partial<FootprintSettings>) => void;
  /** Current instrument tick size — drives the row-size $/ticks translation line and price-mode snapping. */
  tickSize: number;
  /** True when FlowBinStore.wasRowSizeClamped() reports the last setConfig() clamped the row size upward. */
  rowSizeClamped: boolean;
}

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

export function FootprintSettingsMenu({ settings, onChange, tickSize, rowSizeClamped }: FootprintSettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="contents">
      <ToolbarTrigger
        caption={null}
        value="Settings"
        isOpen={isOpen}
        onClick={() => setIsOpen((o) => !o)}
        panelClassName="max-h-[75vh] w-[300px] overflow-y-auto"
      >
        <div className="flex flex-col gap-3 p-3">
          {/* CONTENT */}
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

          {/* LAYOUT */}
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

              {/* ATAS "Auto transform candles to footprint" (S1 "Arena WOW week") */}
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#C0C0C0]">
                <span>Auto-transform to footprint</span>
                <button
                  type="button"
                  onClick={() => onChange({ autoTransform: !settings.autoTransform })}
                  aria-pressed={settings.autoTransform}
                  className={pillClass(settings.autoTransform)}
                  title="Show full footprint detail only once a bar is wide enough to be legible; plain candles below the threshold"
                >
                  {settings.autoTransform ? 'On' : 'Off'}
                </button>
              </div>
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

          {/* COLORS */}
          <div>
            <SectionLabel>Colors</SectionLabel>
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

          <SectionDivider />

          {/* IMBALANCE */}
          <div>
            <SectionLabel>Imbalance</SectionLabel>
            <div className="flex flex-col gap-2">
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
              <button
                type="button"
                onClick={() => onChange({ imbalanceStackedOnly: !settings.imbalanceStackedOnly })}
                aria-pressed={settings.imbalanceStackedOnly}
                className={cn(pillClass(settings.imbalanceStackedOnly), 'self-start')}
                title="Only highlight runs of Stacked-count or more consecutive same-side imbalances"
              >
                Stacked only
              </button>
            </div>
          </div>

          <SectionDivider />

          {/* ROW SIZE */}
          <div>
            <SectionLabel>Row Size</SectionLabel>
            <RowSizeControl settings={settings} onChange={onChange} tickSize={tickSize} rowSizeClamped={rowSizeClamped} />
          </div>

          <SectionDivider />

          {/* PANELS */}
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
              <button
                type="button"
                onClick={() => onChange({ showCvd: !settings.showCvd })}
                aria-pressed={settings.showCvd}
                className={pillClass(settings.showCvd)}
              >
                CVD
              </button>
              <button
                type="button"
                onClick={() => onChange({ showDelta: !settings.showDelta })}
                aria-pressed={settings.showDelta}
                className={pillClass(settings.showDelta)}
              >
                Delta
              </button>
            </div>
          </div>

          <SectionDivider />

          {/* STATS ROWS */}
          <div>
            <SectionLabel>Stats Rows</SectionLabel>
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
          </div>
        </div>
      </ToolbarTrigger>
    </div>
  );
}

// ─── Numeric input row (Ratio % / Stacked count) ────────────────────────────

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

// ─── Stats row checkbox ─────────────────────────────────────────────────────

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

// ─── Row size control (Auto pill + $/ticks text input) ─────────────────────

interface RowSizeControlProps {
  settings: FootprintSettings;
  onChange: (patch: Partial<FootprintSettings>) => void;
  tickSize: number;
  rowSizeClamped: boolean;
}

function RowSizeControl({ settings, onChange, tickSize, rowSizeClamped }: RowSizeControlProps) {
  const [unit, setUnit] = useState<'price' | 'ticks'>(settings.rowSizeMode === 'ticks' ? 'ticks' : 'price');
  const [text, setText] = useState<string>(settings.rowSizeValue != null ? String(settings.rowSizeValue) : '');

  // External change (symbol switch, another tab instance) — resync local input state.
  useEffect(() => {
    setText(settings.rowSizeValue != null ? String(settings.rowSizeValue) : '');
    if (settings.rowSizeMode !== 'auto') setUnit(settings.rowSizeMode);
  }, [settings.rowSizeMode, settings.rowSizeValue]);

  const commit = () => {
    const parsed = Number(text);
    if (text.trim() === '' || !Number.isFinite(parsed) || parsed <= 0) {
      // Empty/invalid input — revert display, do not switch off Auto.
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

function formatTicksLabel(ticks: number): string {
  return Number.isInteger(ticks) ? String(ticks) : ticks.toFixed(2);
}
