/**
 * Trading Arena — Chart Settings POPUP (replaces the old "Chart ▾" dropdown
 * — ChartSettingsMenu.tsx, superseded but kept for rollback — with a gear
 * icon button that opens a full modal dialog: same chrome as
 * FootprintSettingsDialog.tsx / IndicatorsDialog.tsx — Radix Dialog,
 * gold-on-black, left tab rail + scrollable content, footer Reset + Done).
 *
 * Sections (left rail): Candles | Canvas | Scales & Lines | Time
 * (the "Order Flow" section — an "Auto-transform to footprint" toggle for
 * the plain Chart tab — was removed 2026-07-18: ALL order flow/footprint
 * now lives exclusively on the Order Flow tab, FootprintTab.tsx.)
 * Every remaining setting ChartSettingsMenu.tsx exposed is ported here 1:1, PLUS
 * full TradingView-style color freedom for candles: Body / Borders / Wick,
 * up & down colors each via a ColorSwatchPicker (palette grid + custom
 * color + opacity) — see ./ColorSwatchPicker.tsx and the new optional
 * candleBorder-/candleWick-prefixed fields on ChartStyleSettings
 * (chartStyleSettings.ts).
 *
 * Purely presentational — all state lives in the caller via
 * `settings`/`onChange`/`onReset` (useChartStylePreferences.ts); this
 * component never touches localStorage itself. Settings apply LIVE (no
 * Ok/Apply) — every control fires onChange immediately, TradingView-style.
 */

import { useState } from 'react';
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
import { ColorSwatchPicker } from './ColorSwatchPicker';
import {
  BACKGROUND_PRESETS,
  TIMEZONE_OPTIONS,
  type ChartStyleSettings,
  type CrosshairStyle,
  type PriceAxisFontSize,
  type PricePrecision,
} from './chartStyleSettings';

export interface ChartSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ChartStyleSettings;
  onChange: (patch: Partial<ChartStyleSettings>) => void;
  onReset: () => void;
  /**
   * Current asset class. Unused since the "Order Flow" section (the
   * "Auto-transform to footprint" toggle it gated) was removed 2026-07-18 —
   * the plain Chart tab never renders footprint (see ChartTab.tsx's header
   * comment). Kept optional on the prop type only so existing callers
   * (ArenaToolbar.tsx) don't need to change.
   */
  assetClass?: string;
}

type DialogTabId = 'candles' | 'canvas' | 'scales' | 'time';

const TABS: { id: DialogTabId; label: string }[] = [
  { id: 'candles', label: 'Candles' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'scales', label: 'Scales & Lines' },
  { id: 'time', label: 'Time' },
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

export function ChartSettingsDialog({ open, onOpenChange, settings, onChange, onReset }: ChartSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<DialogTabId>('candles');

  const activeBackgroundPresetId = BACKGROUND_PRESETS.find(
    (p) => p.color === settings.backgroundColor,
  )?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[560px] gap-0 border-[rgba(201,166,70,0.25)] bg-[rgba(10,10,11,0.98)] p-0 text-white shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        aria-describedby={undefined}
      >
        <DialogHeader className="border-b px-5 py-4" style={{ borderColor: 'rgba(201,166,70,0.12)' }}>
          <DialogTitle className="text-[15px] font-semibold text-[#E8E8E8]">
            Chart Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-[420px]">
          {/* Left tab rail (ATAS/FootprintSettingsDialog convention) */}
          <div
            className="flex w-[140px] flex-shrink-0 flex-col gap-0.5 border-r p-2"
            style={{ borderColor: 'rgba(201,166,70,0.10)' }}
            role="tablist"
            aria-label="Chart Settings sections"
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
            {activeTab === 'candles' && (
              <div className="flex flex-col gap-4">
                <div>
                  <SectionLabel>Body</SectionLabel>
                  <div className="flex flex-wrap items-center gap-4">
                    <ColorSwatchPicker
                      label="Up"
                      value={settings.candleUpColor}
                      onChange={(hex) => onChange({ candleUpColor: hex })}
                    />
                    <ColorSwatchPicker
                      label="Down"
                      value={settings.candleDownColor}
                      onChange={(hex) => onChange({ candleDownColor: hex })}
                    />
                  </div>
                </div>

                <SectionDivider />

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <SectionLabel>Borders</SectionLabel>
                    <ToggleSwitch
                      active={settings.candleBordersVisible}
                      onClick={() => onChange({ candleBordersVisible: !settings.candleBordersVisible })}
                      label={settings.candleBordersVisible ? 'On' : 'Off'}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <ColorSwatchPicker
                      label="Up"
                      value={settings.candleBorderUpColor ?? settings.candleUpColor}
                      onChange={(hex) => onChange({ candleBorderUpColor: hex })}
                    />
                    <ColorSwatchPicker
                      label="Down"
                      value={settings.candleBorderDownColor ?? settings.candleDownColor}
                      onChange={(hex) => onChange({ candleBorderDownColor: hex })}
                    />
                  </div>
                </div>

                <SectionDivider />

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <SectionLabel>Wick</SectionLabel>
                    <ToggleSwitch
                      active={settings.candleWicksVisible}
                      onClick={() => onChange({ candleWicksVisible: !settings.candleWicksVisible })}
                      label={settings.candleWicksVisible ? 'On' : 'Off'}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <ColorSwatchPicker
                      label="Up"
                      value={settings.candleWickUpColor ?? settings.candleUpColor}
                      onChange={(hex) => onChange({ candleWickUpColor: hex })}
                    />
                    <ColorSwatchPicker
                      label="Down"
                      value={settings.candleWickDownColor ?? settings.candleDownColor}
                      onChange={(hex) => onChange({ candleWickDownColor: hex })}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'canvas' && (
              <div className="flex flex-col gap-4">
                <div>
                  <SectionLabel>Background</SectionLabel>
                  <div className="flex flex-col gap-2">
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
                      <ColorSwatchPicker
                        value={settings.backgroundColor}
                        onChange={(hex) => onChange({ backgroundColor: hex })}
                      />
                    </div>
                  </div>
                </div>

                <SectionDivider />

                <div className="flex flex-col gap-2">
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
                </div>

                <SectionDivider />

                <div>
                  <SectionLabel>Crosshair</SectionLabel>
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

              </div>
            )}

            {activeTab === 'scales' && (
              <div className="flex flex-col gap-4">
                <FieldRow label="Last price line">
                  <ToggleSwitch
                    active={settings.lastPriceLineVisible}
                    onClick={() => onChange({ lastPriceLineVisible: !settings.lastPriceLineVisible })}
                    label={settings.lastPriceLineVisible ? 'On' : 'Off'}
                  />
                </FieldRow>

                <SectionDivider />

                <div>
                  <SectionLabel>Price axis font size</SectionLabel>
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
            )}

            {activeTab === 'time' && (
              <div className="flex flex-col gap-4">
                <div>
                  <SectionLabel>Timezone</SectionLabel>
                  <CleanSelect
                    value={settings.timezone}
                    options={TIMEZONE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    onChange={(v) => onChange({ timezone: v })}
                  />
                </div>

                <SectionDivider />

                <div>
                  <SectionLabel>Price precision</SectionLabel>
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
            )}
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
            Done
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
