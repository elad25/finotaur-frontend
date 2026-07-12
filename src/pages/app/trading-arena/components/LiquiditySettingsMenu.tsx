/**
 * Trading Arena — Liquidity tab "Settings ▾" menu (Task S2 — ATAS/Bookmap
 * restyle).
 *
 * Follows the exact FootprintSettingsMenu.tsx idiom: one ToolbarTrigger
 * dropdown, sectioned rows, pill-style toggles, purely presentational (all
 * state lives in the caller via `preferences`/`onChange` — see
 * useLiquidityPreferences.ts). Never touches localStorage itself.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ToolbarTrigger } from './ToolbarTrigger';
import { DEPTH_PALETTE_IDS, DEPTH_PALETTE_LABELS, type DepthPaletteId } from '@/components/charting/depthPalettes';
import type { LiquidityPreferences, LiquidityBubbleThreshold } from '../hooks/useLiquidityPreferences';

export interface LiquiditySettingsMenuProps {
  preferences: LiquidityPreferences;
  onChange: (patch: Partial<LiquidityPreferences>) => void;
}

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

export function LiquiditySettingsMenu({ preferences, onChange }: LiquiditySettingsMenuProps) {
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
        panelClassName="max-h-[75vh] w-[280px] overflow-y-auto"
      >
        <div className="flex flex-col gap-3 p-3">
          {/* PALETTE */}
          <div>
            <SectionLabel>Palette</SectionLabel>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Heatmap color palette">
              {DEPTH_PALETTE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange({ palette: id as DepthPaletteId })}
                  className={pillClass(preferences.palette === id)}
                >
                  {DEPTH_PALETTE_LABELS[id]}
                </button>
              ))}
            </div>
          </div>

          <SectionDivider />

          {/* RENDER */}
          <div>
            <SectionLabel>Render</SectionLabel>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#C0C0C0]">
                <span>Smoothing</span>
                <button
                  type="button"
                  onClick={() => onChange({ smoothing: !preferences.smoothing })}
                  aria-pressed={preferences.smoothing}
                  className={pillClass(preferences.smoothing)}
                  title="Vertical band-smoothing + a soft bloom halo on the strongest walls"
                >
                  {preferences.smoothing ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </div>

          <SectionDivider />

          {/* VOLUME BUBBLES */}
          <div>
            <SectionLabel>Volume Bubbles</SectionLabel>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#C0C0C0]">
                <span>Show bubbles</span>
                <button
                  type="button"
                  onClick={() => onChange({ bubbles: !preferences.bubbles })}
                  aria-pressed={preferences.bubbles}
                  className={pillClass(preferences.bubbles)}
                  title="Executed-aggression markers sized by trade volume"
                >
                  {preferences.bubbles ? 'On' : 'Off'}
                </button>
              </div>
              {preferences.bubbles && (
                <BubbleThresholdControl
                  value={preferences.bubbleThreshold}
                  onCommit={(v) => onChange({ bubbleThreshold: v })}
                />
              )}
            </div>
          </div>

          <SectionDivider />

          {/* SIDE PROFILE */}
          <div>
            <SectionLabel>Depth Profile</SectionLabel>
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#C0C0C0]">
              <span>Resting book gutter</span>
              <button
                type="button"
                onClick={() => onChange({ sideProfile: !preferences.sideProfile })}
                aria-pressed={preferences.sideProfile}
                className={pillClass(preferences.sideProfile)}
                title="Right-edge overlay showing the current resting bid/ask book by size"
              >
                {preferences.sideProfile ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>
      </ToolbarTrigger>
    </div>
  );
}

// ─── Bubble threshold control (Auto pill + numeric override) ───────────────

interface BubbleThresholdControlProps {
  value: LiquidityBubbleThreshold;
  onCommit: (value: LiquidityBubbleThreshold) => void;
}

function BubbleThresholdControl({ value, onCommit }: BubbleThresholdControlProps) {
  const isAuto = value === 'auto';
  const [text, setText] = useState<string>(isAuto ? '' : String(value));

  useEffect(() => {
    setText(value === 'auto' ? '' : String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(text);
    if (text.trim() === '' || !Number.isFinite(parsed) || parsed < 0) {
      setText(value === 'auto' ? '' : String(value));
      return;
    }
    onCommit(parsed);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          setText('');
          onCommit('auto');
        }}
        aria-pressed={isAuto}
        className={pillClass(isAuto)}
        title="Top ~2% of visible trade volumes"
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
        className="w-20 h-7 rounded border px-1.5 text-right text-[11px] text-[#E8E8E8] focus:outline-none"
        style={{ background: '#0D0D0F', borderColor: 'rgba(201,166,70,0.25)' }}
        aria-label="Volume bubble threshold override"
      />
      <span className="text-[10px] text-[#707070]">vol</span>
    </div>
  );
}
