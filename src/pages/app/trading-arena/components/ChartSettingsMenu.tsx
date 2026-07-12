/**
 * Trading Arena — "Chart ▾" TradingView-style Chart Settings menu.
 *
 * One `Chart` ToolbarTrigger (see ./ToolbarTrigger.tsx — the same gold-on-
 * black dropdown chrome ArenaToolbar's Timeframe/Indicators menus and
 * FootprintSettingsMenu's Settings ▾ use) opening a single scrollable panel
 * with 4 sections: Candles, Canvas, Scales & Lines, Time — plus a
 * "Reset to defaults" row at the bottom. Purely presentational — all state
 * lives in the caller via `settings`/`onChange`/`onReset`
 * (useChartStylePreferences.ts); this component never touches localStorage
 * itself. Settings apply LIVE (no Ok/Apply) — every control fires onChange
 * immediately, TradingView-style.
 */

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolbarTrigger } from './ToolbarTrigger';
import { CleanSelect } from './CleanSelect';
import {
  CANDLE_COLOR_PRESETS,
  BACKGROUND_PRESETS,
  TIMEZONE_OPTIONS,
  type ChartStyleSettings,
  type CrosshairStyle,
  type PriceAxisFontSize,
  type PricePrecision,
} from './chartStyleSettings';

export interface ChartSettingsMenuProps {
  settings: ChartStyleSettings;
  onChange: (patch: Partial<ChartStyleSettings>) => void;
  onReset: () => void;
}

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

function ToggleSwitch({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={pillClass(active)}
    >
      {label}
    </button>
  );
}

export function ChartSettingsMenu({ settings, onChange, onReset }: ChartSettingsMenuProps) {
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

  const activeCandlePresetId = CANDLE_COLOR_PRESETS.find(
    (p) => p.up === settings.candleUpColor && p.down === settings.candleDownColor,
  )?.id;
  const activeBackgroundPresetId = BACKGROUND_PRESETS.find(
    (p) => p.color === settings.backgroundColor,
  )?.id;

  return (
    <div ref={containerRef} className="contents">
      <ToolbarTrigger
        caption={null}
        value="Chart"
        isOpen={isOpen}
        onClick={() => setIsOpen((o) => !o)}
        panelClassName="max-h-[75vh] w-[300px] overflow-y-auto"
      >
        <div className="flex flex-col gap-3 p-3">
          {/* Small header icon — purely visual, matches the trigger's gear identity */}
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#707070]">
            <Settings2 className="h-3 w-3" aria-hidden="true" />
            <span>Chart Settings</span>
          </div>

          <SectionDivider />

          {/* CANDLES */}
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
                    onClick={() => onChange({ candleUpColor: preset.up, candleDownColor: preset.down })}
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
                  active={settings.candleBordersVisible}
                  onClick={() => onChange({ candleBordersVisible: !settings.candleBordersVisible })}
                  label={settings.candleBordersVisible ? 'On' : 'Off'}
                />
              </FieldRow>
              <FieldRow label="Wicks">
                <ToggleSwitch
                  active={settings.candleWicksVisible}
                  onClick={() => onChange({ candleWicksVisible: !settings.candleWicksVisible })}
                  label={settings.candleWicksVisible ? 'On' : 'Off'}
                />
              </FieldRow>
            </div>
          </div>

          <SectionDivider />

          {/* CANVAS */}
          <div>
            <SectionLabel>Canvas</SectionLabel>
            <div className="flex flex-col gap-2">
              <div>
                <div className="text-[10px] text-[#707070] mb-1">Background</div>
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Background preset">
                  {BACKGROUND_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.label}
                      aria-pressed={activeBackgroundPresetId === preset.id}
                      onClick={() => onChange({ backgroundColor: preset.color })}
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
                  active={settings.gridVerticalVisible}
                  onClick={() => onChange({ gridVerticalVisible: !settings.gridVerticalVisible })}
                  label={settings.gridVerticalVisible ? 'On' : 'Off'}
                />
              </FieldRow>
              <FieldRow label="Grid — Horizontal">
                <ToggleSwitch
                  active={settings.gridHorizontalVisible}
                  onClick={() => onChange({ gridHorizontalVisible: !settings.gridHorizontalVisible })}
                  label={settings.gridHorizontalVisible ? 'On' : 'Off'}
                />
              </FieldRow>
              <div>
                <div className="text-[10px] text-[#707070] mb-1">Crosshair</div>
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Crosshair style">
                  {CROSSHAIR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onChange({ crosshairStyle: opt.value })}
                      className={pillClass(settings.crosshairStyle === opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <FieldRow label="Watermark">
                <ToggleSwitch
                  active={settings.watermarkVisible}
                  onClick={() => onChange({ watermarkVisible: !settings.watermarkVisible })}
                  label={settings.watermarkVisible ? 'On' : 'Off'}
                />
              </FieldRow>
            </div>
          </div>

          <SectionDivider />

          {/* SCALES & LINES */}
          <div>
            <SectionLabel>Scales &amp; Lines</SectionLabel>
            <div className="flex flex-col gap-2">
              <FieldRow label="Last price line">
                <ToggleSwitch
                  active={settings.lastPriceLineVisible}
                  onClick={() => onChange({ lastPriceLineVisible: !settings.lastPriceLineVisible })}
                  label={settings.lastPriceLineVisible ? 'On' : 'Off'}
                />
              </FieldRow>
              <div>
                <div className="text-[10px] text-[#707070] mb-1">Price axis font size</div>
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Price axis font size">
                  {FONT_SIZE_OPTIONS.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => onChange({ priceAxisFontSize: size })}
                      className={pillClass(settings.priceAxisFontSize === size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <SectionDivider />

          {/* TIME */}
          <div>
            <SectionLabel>Time</SectionLabel>
            <div className="flex flex-col gap-2">
              <div>
                <div className="text-[10px] text-[#707070] mb-1">Timezone</div>
                <CleanSelect
                  value={settings.timezone}
                  options={TIMEZONE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  onChange={(v) => onChange({ timezone: v })}
                />
              </div>
              <div>
                <div className="text-[10px] text-[#707070] mb-1">Price precision</div>
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Price precision">
                  {PRICE_PRECISION_OPTIONS.map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => onChange({ pricePrecision: opt.value })}
                      className={pillClass(settings.pricePrecision === opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <SectionDivider />

          {/* RESET */}
          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-1.5 h-7 rounded px-2 text-[11px] font-semibold text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Reset to defaults
          </button>
        </div>
      </ToolbarTrigger>
    </div>
  );
}
