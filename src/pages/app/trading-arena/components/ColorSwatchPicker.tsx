/**
 * Trading Arena — reusable TradingView-style color control.
 *
 * A small square swatch button showing the current color. Clicking opens an
 * anchored popover panel (same absolute-positioned-div + outside-click/
 * Escape idiom as ToolbarTrigger.tsx / CleanSelect.tsx — no new dependency)
 * containing:
 *   (a) a static palette grid — a grayscale row (white → black) followed by
 *       a 9-hue × 5-shade grid (light → dark), same shape as TradingView's
 *       own color picker;
 *   (b) a "+" custom button revealing a native `<input type="color">`;
 *   (c) an Opacity slider (native range 0–100%).
 *
 * Output is a hex6 string when opacity is 100%, or hex8 (alpha byte
 * appended) when opacity < 100% — modern browsers accept 8-digit hex
 * directly as a CSS color, so callers/consumers (chartStyleMapping.ts,
 * lightweight-charts) can use the string as-is.
 *
 * Fires `onChange` live on every interaction (no Apply/Ok step), matching
 * every other control in ChartSettingsDialog.tsx / ChartSettingsMenu.tsx.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ColorSwatchPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}

// ─── Palette matrix ──────────────────────────────────────────────────────
const GRAYSCALE_ROW: readonly string[] = [
  '#FFFFFF', '#E0E0E0', '#C2C2C2', '#A3A3A3', '#858585',
  '#666666', '#484848', '#292929', '#141414', '#000000',
];

// 9 hues × 5 shades (light → dark), Material-ish palette — tasteful, legible on dark bg.
const HUE_COLUMNS: readonly (readonly string[])[] = [
  ['#FFCDD2', '#EF9A9A', '#E57373', '#F44336', '#B71C1C'], // red
  ['#FFE0B2', '#FFCC80', '#FFA726', '#FF9800', '#E65100'], // orange
  ['#FFF9C4', '#FFF59D', '#FFEE58', '#FFEB3B', '#F9A825'], // yellow
  ['#C8E6C9', '#A5D6A7', '#81C784', '#4CAF50', '#1B5E20'], // green
  ['#B2DFDB', '#80CBC4', '#4DB6AC', '#009688', '#004D40'], // teal
  ['#B2EBF2', '#80DEEA', '#4DD0E1', '#00BCD4', '#006064'], // cyan
  ['#BBDEFB', '#90CAF9', '#64B5F6', '#2196F3', '#0D47A1'], // blue
  ['#E1BEE7', '#CE93D8', '#BA68C8', '#9C27B0', '#4A148C'], // purple
  ['#F8BBD0', '#F48FB1', '#F06292', '#E91E63', '#880E4F'], // magenta
];

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

export function ColorSwatchPicker({ value, onChange, label }: ColorSwatchPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { base, alphaPct } = normalizeHex(value);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function selectBase(nextBase: string) {
    onChange(composeHex(nextBase, alphaPct));
  }

  function selectAlpha(nextAlphaPct: number) {
    onChange(composeHex(base, nextAlphaPct));
  }

  return (
    <div ref={containerRef} className="relative inline-flex flex-shrink-0 items-center gap-1.5">
      {label && <span className="text-[10px] text-[#707070]">{label}</span>}
      <button
        type="button"
        aria-label={label ? `${label} color` : 'Pick color'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'h-6 w-6 flex-shrink-0 rounded border transition-all duration-150',
          open
            ? 'border-[rgba(201,166,70,0.65)] ring-1 ring-[rgba(201,166,70,0.45)]'
            : 'border-[rgba(255,255,255,0.18)] hover:border-[rgba(255,255,255,0.35)]',
        )}
        style={{ background: value }}
      />

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 flex w-[220px] flex-col gap-2.5 rounded-lg border p-2.5 shadow-lg"
          style={{ background: '#0D0D0F', borderColor: 'rgba(201,166,70,0.25)' }}
          role="dialog"
          aria-label="Color picker"
        >
          {/* Grayscale row */}
          <div className="flex items-center gap-1">
            {GRAYSCALE_ROW.map((hex) => (
              <button
                key={hex}
                type="button"
                title={hex}
                aria-pressed={base.toLowerCase() === hex.toLowerCase()}
                onClick={() => selectBase(hex)}
                className={cn(
                  'h-4 w-4 flex-shrink-0 rounded-sm border transition-all duration-150',
                  base.toLowerCase() === hex.toLowerCase()
                    ? 'border-[#C9A646] ring-1 ring-[rgba(201,166,70,0.6)]'
                    : 'border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.35)]',
                )}
                style={{ background: hex }}
              />
            ))}
          </div>

          {/* Hue grid — 9 columns x 5 shades */}
          <div className="flex flex-col gap-1">
            {[0, 1, 2, 3, 4].map((shadeIndex) => (
              <div key={shadeIndex} className="flex items-center gap-1">
                {HUE_COLUMNS.map((column) => {
                  const hex = column[shadeIndex];
                  return (
                    <button
                      key={hex}
                      type="button"
                      title={hex}
                      aria-pressed={base.toLowerCase() === hex.toLowerCase()}
                      onClick={() => selectBase(hex)}
                      className={cn(
                        'h-4 w-4 flex-shrink-0 rounded-sm border transition-all duration-150',
                        base.toLowerCase() === hex.toLowerCase()
                          ? 'border-[#C9A646] ring-1 ring-[rgba(201,166,70,0.6)]'
                          : 'border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.35)]',
                      )}
                      style={{ background: hex }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="h-px" style={{ background: 'rgba(201,166,70,0.10)' }} aria-hidden="true" />

          {/* Custom color */}
          <label className="flex items-center justify-between gap-2 text-[10px] text-[#707070]">
            <span className="flex items-center gap-1.5">
              <span
                className="flex h-4 w-4 items-center justify-center rounded-sm border border-dashed text-[10px] leading-none text-[#707070]"
                style={{ borderColor: 'rgba(255,255,255,0.25)' }}
                aria-hidden="true"
              >
                +
              </span>
              Custom
            </span>
            <input
              type="color"
              value={base}
              onChange={(e) => selectBase(e.target.value)}
              className="h-6 w-10 cursor-pointer rounded border bg-transparent p-0"
              style={{ borderColor: 'rgba(201,166,70,0.25)' }}
              aria-label="Custom color"
            />
          </label>

          {/* Opacity */}
          <label className="flex flex-col gap-1 text-[10px] text-[#707070]">
            <span className="flex items-center justify-between">
              <span>Opacity</span>
              <span className="text-[#C0C0C0]">{alphaPct}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={alphaPct}
              onChange={(e) => selectAlpha(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-[#C9A646]"
              aria-label="Opacity"
            />
          </label>
        </div>
      )}
    </div>
  );
}
