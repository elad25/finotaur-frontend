/**
 * Trading Arena — reusable TradingView-style color control.
 *
 * A small square swatch button showing the current color. Clicking opens a
 * Radix Popover (portal-rendered, so it is never clipped by the scrollable
 * content area of ChartSettingsDialog and composes correctly inside the Radix
 * Dialog — clicks inside the panel do not dismiss the dialog) containing:
 *   (a) a static palette grid — a grayscale row (white → black), a row of 10
 *       fully-saturated hues, then 5 shade rows (light → dark) for the same
 *       10 hues — the same 10-column matrix shape as TradingView's picker;
 *   (b) a "Custom" row — previously picked custom colors persisted in
 *       localStorage (`arena_chart_custom_colors_v1`, shared by every picker
 *       instance, newest first, capped) plus a "+" button revealing a native
 *       `<input type="color">` for free-form picking;
 *   (c) an Opacity row — checkerboard/gradient slider plus a TV-style
 *       editable "%" box.
 *
 * Output is a hex6 string when opacity is 100%, or hex8 (alpha byte
 * appended) when opacity < 100% — modern browsers accept 8-digit hex
 * directly as a CSS color, so callers/consumers (chartStyleMapping.ts,
 * lightweight-charts) can use the string as-is.
 *
 * Fires `onChange` live on every interaction (no Apply/Ok step), matching
 * every other control in ChartSettingsDialog.tsx / ChartSettingsMenu.tsx.
 */

import { useRef, useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

export interface ColorSwatchPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}

// ─── Palette matrix (10 columns — TradingView-style) ─────────────────────
const GRAYSCALE_ROW: readonly string[] = [
  '#FFFFFF', '#E0E0E0', '#C2C2C2', '#A3A3A3', '#858585',
  '#666666', '#484848', '#292929', '#141414', '#000000',
];

// Fully-saturated base hues (Material 500): red, orange, yellow, green,
// teal, cyan, blue, indigo, purple, pink.
const SATURATED_ROW: readonly string[] = [
  '#F44336', '#FF9800', '#FFEB3B', '#4CAF50', '#009688',
  '#00BCD4', '#2196F3', '#3F51B5', '#9C27B0', '#E91E63',
];

// Shade rows for the same 10 hues, light → dark (Material 100/200/300/700/900).
const SHADE_ROWS: readonly (readonly string[])[] = [
  ['#FFCDD2', '#FFE0B2', '#FFF9C4', '#C8E6C9', '#B2DFDB', '#B2EBF2', '#BBDEFB', '#C5CAE9', '#E1BEE7', '#F8BBD0'],
  ['#EF9A9A', '#FFCC80', '#FFF59D', '#A5D6A7', '#80CBC4', '#80DEEA', '#90CAF9', '#9FA8DA', '#CE93D8', '#F48FB1'],
  ['#E57373', '#FFB74D', '#FFF176', '#81C784', '#4DB6AC', '#4DD0E1', '#64B5F6', '#7986CB', '#BA68C8', '#F06292'],
  ['#D32F2F', '#F57C00', '#FBC02D', '#388E3C', '#00796B', '#0097A7', '#1976D2', '#303F9F', '#7B1FA2', '#C2185B'],
  ['#B71C1C', '#E65100', '#F57F17', '#1B5E20', '#004D40', '#006064', '#0D47A1', '#1A237E', '#4A148C', '#880E4F'],
];

const PALETTE_ROWS: readonly (readonly string[])[] = [
  GRAYSCALE_ROW,
  SATURATED_ROW,
  ...SHADE_ROWS,
];

// ─── Persistent custom colors (shared across all picker instances) ───────
const CUSTOM_COLORS_KEY = 'arena_chart_custom_colors_v1';
const CUSTOM_COLORS_MAX = 14;

function readCustomColors(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_COLORS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === 'string' && /^#[0-9a-fA-F]{6}$/.test(entry))
      .slice(0, CUSTOM_COLORS_MAX);
  } catch {
    return [];
  }
}

/** Dedupe (case-insensitive, move-to-front), cap, persist. Returns the updated list. */
function persistCustomColor(hex: string): string[] {
  const next = [
    hex,
    ...readCustomColors().filter((existing) => existing.toLowerCase() !== hex.toLowerCase()),
  ].slice(0, CUSTOM_COLORS_MAX);
  try {
    localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode / quota) — list just won't persist.
  }
  return next;
}

// ─── hex6/hex8 <-> {base, alphaPct} helpers ─────────────────────────────
function normalizeHex(v: string): { base: string; alphaPct: number } {
  if (/^#[0-9a-fA-F]{8}$/.test(v)) {
    const base = v.slice(0, 7);
    const alphaPct = Math.round((parseInt(v.slice(7, 9), 16) / 255) * 100);
    return { base, alphaPct };
  }
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return { base: v, alphaPct: 100 };
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1], g = v[2], b = v[3];
    return { base: `#${r}${r}${g}${g}${b}${b}`, alphaPct: 100 };
  }
  return { base: '#000000', alphaPct: 100 };
}

function composeHex(base: string, alphaPct: number): string {
  if (alphaPct >= 100) return base;
  const alphaByte = Math.round((Math.max(0, alphaPct) / 100) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${base}${alphaByte}`;
}

// ─── Shared swatch button ────────────────────────────────────────────────
function PaletteSwatch({
  hex,
  selected,
  onSelect,
}: {
  hex: string;
  selected: boolean;
  onSelect: (hex: string) => void;
}) {
  return (
    <button
      type="button"
      title={hex}
      aria-pressed={selected}
      onClick={() => onSelect(hex)}
      className={cn(
        'h-4 w-4 flex-shrink-0 rounded-sm border transition-all duration-150',
        selected
          ? 'border-[#C9A646] ring-1 ring-[rgba(201,166,70,0.6)]'
          : 'border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.35)]',
      )}
      style={{ background: hex }}
    />
  );
}

export function ColorSwatchPicker({ value, onChange, label }: ColorSwatchPickerProps) {
  const [open, setOpen] = useState(false);
  const [customColors, setCustomColors] = useState<string[]>([]);
  // Latest hex picked via the native color input, not yet committed to the
  // persisted list (the input fires continuously while dragging in the OS
  // dialog — we apply live but save only once, on blur/close).
  const pendingCustomRef = useRef<string | null>(null);
  const { base, alphaPct } = normalizeHex(value);

  function commitPendingCustom() {
    const pending = pendingCustomRef.current;
    if (!pending) return;
    pendingCustomRef.current = null;
    setCustomColors(persistCustomColor(pending));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      // Re-read on every open so all picker instances share one list.
      setCustomColors(readCustomColors());
    } else {
      commitPendingCustom();
    }
    setOpen(nextOpen);
  }

  function selectBase(nextBase: string) {
    onChange(composeHex(nextBase, alphaPct));
  }

  function selectAlpha(nextAlphaPct: number) {
    onChange(composeHex(base, nextAlphaPct));
  }

  function handleAlphaInput(raw: string) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    selectAlpha(Math.min(100, Math.max(0, parsed)));
  }

  const isSelected = (hex: string) => base.toLowerCase() === hex.toLowerCase();

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <div className="relative inline-flex flex-shrink-0 items-center gap-1.5">
        {label && <span className="text-[10px] text-[#707070]">{label}</span>}
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label={label ? `${label} color` : 'Pick color'}
            className={cn(
              'h-6 w-6 flex-shrink-0 rounded border transition-all duration-150',
              open
                ? 'border-[rgba(201,166,70,0.65)] ring-1 ring-[rgba(201,166,70,0.45)]'
                : 'border-[rgba(255,255,255,0.18)] hover:border-[rgba(255,255,255,0.35)]',
            )}
            style={{ background: value }}
          />
        </PopoverPrimitive.Trigger>
      </div>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="z-[60] flex w-[240px] flex-col gap-2.5 rounded-lg border p-2.5 shadow-lg outline-none"
          style={{ background: '#0D0D0F', borderColor: 'rgba(201,166,70,0.25)' }}
          aria-label="Color picker"
        >
          {/* Palette grid — grayscale, saturated hues, then light → dark shades */}
          <div className="flex flex-col gap-1">
            {PALETTE_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-1">
                {row.map((hex) => (
                  <PaletteSwatch key={hex} hex={hex} selected={isSelected(hex)} onSelect={selectBase} />
                ))}
              </div>
            ))}
          </div>

          <div className="h-px" style={{ background: 'rgba(201,166,70,0.10)' }} aria-hidden="true" />

          {/* Custom colors — persisted picks + "+" native picker */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-[#707070]">Custom</span>
            <div className="flex flex-wrap items-center gap-1">
              {customColors.map((hex) => (
                <PaletteSwatch key={hex} hex={hex} selected={isSelected(hex)} onSelect={selectBase} />
              ))}
              <label
                className="relative flex h-4 w-4 flex-shrink-0 cursor-pointer items-center justify-center rounded-sm border border-dashed text-[11px] leading-none text-[#707070] transition-colors duration-150 hover:border-[rgba(255,255,255,0.45)] hover:text-[#C0C0C0]"
                style={{ borderColor: 'rgba(255,255,255,0.25)' }}
                title="Add custom color"
              >
                +
                <input
                  type="color"
                  value={base}
                  onChange={(e) => {
                    selectBase(e.target.value);
                    pendingCustomRef.current = e.target.value;
                  }}
                  onBlur={commitPendingCustom}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Custom color"
                />
              </label>
            </div>
          </div>

          {/* Opacity — checkerboard/gradient slider + editable % box */}
          <div className="flex flex-col gap-1 text-[10px] text-[#707070]">
            <span>Opacity</span>
            <div className="flex items-center gap-2">
              <div
                className="relative h-3 flex-1 overflow-hidden rounded-full"
                style={{
                  background: 'repeating-conic-gradient(#5a5a5a 0% 25%, #8a8a8a 0% 50%) 0 0 / 8px 8px',
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: `linear-gradient(to right, transparent, ${base})` }}
                  aria-hidden="true"
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={alphaPct}
                  onChange={(e) => selectAlpha(Number(e.target.value))}
                  className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
                  aria-label="Opacity"
                />
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={`${alphaPct}%`}
                onChange={(e) => handleAlphaInput(e.target.value.replace(/%/g, ''))}
                className="h-6 w-11 flex-shrink-0 rounded border bg-transparent text-center text-[11px] text-[#C0C0C0] outline-none focus:border-[rgba(201,166,70,0.55)]"
                style={{ borderColor: 'rgba(201,166,70,0.25)' }}
                aria-label="Opacity percent"
              />
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
