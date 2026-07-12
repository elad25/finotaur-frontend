/**
 * Trading Arena — DOM tab "Settings ▾" menu.
 *
 * Follows the exact LiquiditySettingsMenu.tsx idiom: one ToolbarTrigger
 * dropdown, sectioned rows, pill-style toggles, purely presentational (all
 * state lives in the caller via `preferences`/`onChange` — see
 * useDomPreferences.ts). Never touches localStorage itself.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ToolbarTrigger } from './ToolbarTrigger';
import {
  DOM_DEPTH_COUNT_OPTIONS,
  DOM_UPDATE_MS_OPTIONS,
  DOM_AUTO_CENTER_SEC_OPTIONS,
  DOM_RECENTER_TICKS_OPTIONS,
  type DomPreferences,
} from '../hooks/useDomPreferences';

export interface DomSettingsMenuProps {
  preferences: DomPreferences;
  onChange: (patch: Partial<DomPreferences>) => void;
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

export function DomSettingsMenu({ preferences, onChange }: DomSettingsMenuProps) {
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
          {/* LADDER */}
          <div>
            <SectionLabel>Ladder</SectionLabel>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#C0C0C0]">
                <span>Depth</span>
                <div className="flex items-center gap-1" role="group" aria-label="Rows per side">
                  {DOM_DEPTH_COUNT_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onChange({ depthCount: n })}
                      className={pillClass(preferences.depthCount === n)}
                      title={`${n} rows above and below center`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#C0C0C0]">
                <span>Update rate</span>
                <div className="flex items-center gap-1" role="group" aria-label="Ladder update rate">
                  {DOM_UPDATE_MS_OPTIONS.map((ms) => (
                    <button
                      key={ms}
                      type="button"
                      onClick={() => onChange({ updateMs: ms })}
                      className={pillClass(preferences.updateMs === ms)}
                      title={`Redraw the ladder every ${ms}ms`}
                    >
                      {ms}ms
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <SectionDivider />

          {/* AUTO-CENTER */}
          <div>
            <SectionLabel>Auto-center</SectionLabel>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#C0C0C0]">
                <span>Follow price</span>
                <button
                  type="button"
                  onClick={() => onChange({ autoCenter: !preferences.autoCenter })}
                  aria-pressed={preferences.autoCenter}
                  className={pillClass(preferences.autoCenter)}
                  title="Recenter the ladder on the last traded price"
                >
                  {preferences.autoCenter ? 'On' : 'Off'}
                </button>
              </div>
              {preferences.autoCenter && (
                <>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#C0C0C0]">
                    <span>Interval</span>
                    <div className="flex items-center gap-1" role="group" aria-label="Auto-center interval">
                      {DOM_AUTO_CENTER_SEC_OPTIONS.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => onChange({ autoCenterSec: sec })}
                          className={pillClass(preferences.autoCenterSec === sec)}
                          title={`Recenter at least every ${sec}s`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#C0C0C0]">
                    <span>Recenter distance</span>
                    <div className="flex items-center gap-1" role="group" aria-label="Recenter distance in ticks">
                      {DOM_RECENTER_TICKS_OPTIONS.map((ticks) => (
                        <button
                          key={ticks}
                          type="button"
                          onClick={() => onChange({ recenterTicks: ticks })}
                          className={pillClass(preferences.recenterTicks === ticks)}
                          title={`Recenter immediately once price drifts ${ticks} ticks from center`}
                        >
                          {ticks}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#C0C0C0]">
                <span>Center line</span>
                <button
                  type="button"
                  onClick={() => onChange({ showCenterLine: !preferences.showCenterLine })}
                  aria-pressed={preferences.showCenterLine}
                  className={pillClass(preferences.showCenterLine)}
                  title="Gold accent line on the last-traded-price row"
                >
                  {preferences.showCenterLine ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </div>

          <SectionDivider />

          {/* COLUMNS */}
          <div>
            <SectionLabel>Columns</SectionLabel>
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#C0C0C0]">
              <span>Volume histogram</span>
              <button
                type="button"
                onClick={() => onChange({ showVolumeHistogram: !preferences.showVolumeHistogram })}
                aria-pressed={preferences.showVolumeHistogram}
                className={pillClass(preferences.showVolumeHistogram)}
                title="Session-cumulative traded volume by price row"
              >
                {preferences.showVolumeHistogram ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          <SectionDivider />

          {/* TRADING */}
          <div>
            <SectionLabel>Trading</SectionLabel>
            <OrderQtyControl
              value={preferences.orderQty}
              onCommit={(v) => onChange({ orderQty: v })}
            />
          </div>
        </div>
      </ToolbarTrigger>
    </div>
  );
}

// ─── Order size control (numeric input, commits on blur/Enter) ─────────────

interface OrderQtyControlProps {
  value: number;
  onCommit: (value: number) => void;
}

function OrderQtyControl({ value, onCommit }: OrderQtyControlProps) {
  const [text, setText] = useState<string>(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(text);
    if (text.trim() === '' || !Number.isFinite(parsed) || parsed < 0.001) {
      setText(String(value));
      return;
    }
    onCommit(parsed);
  };

  return (
    <div className="flex items-center justify-between gap-2 text-[11px] text-[#C0C0C0]">
      <span>Order size</span>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className="w-20 h-7 rounded border px-1.5 text-right text-[11px] text-[#E8E8E8] focus:outline-none"
        style={{ background: '#0D0D0F', borderColor: 'rgba(201,166,70,0.25)' }}
        aria-label="Default paper order size"
      />
    </div>
  );
}
