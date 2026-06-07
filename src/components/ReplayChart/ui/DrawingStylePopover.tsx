// ui/DrawingStylePopover.tsx
// Per-drawing style popover — appears when exactly one drawing is selected.
// Dark theme, compact, positioned just right of the drawing toolbar.
// ENGLISH-ONLY labels (iron rule).

import React, { useRef } from 'react';
import {
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  X,
} from 'lucide-react';
import { Drawing, DrawingStyle, DrawingType, PositionRisk } from '../types';
import { computePositionStats } from '../drawings/positionMath';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DrawingStylePopoverProps {
  drawing: Drawing | null;
  onUpdateStyle: (patch: Partial<DrawingStyle>) => void;
  onUpdateDrawing?: (patch: Partial<Drawing>) => void;
  onDelete: () => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRESET_COLORS = [
  { hex: '#C9A646', label: 'Gold' },
  { hex: '#FFFFFF', label: 'White' },
  { hex: '#F44336', label: 'Red' },
  { hex: '#4CAF50', label: 'Green' },
  { hex: '#2196F3', label: 'Blue' },
  { hex: '#FF9800', label: 'Orange' },
  { hex: '#9C27B0', label: 'Purple' },
  { hex: '#000000', label: 'Black' },
];

const FILL_TYPES: DrawingType[] = [
  'rectangle',
  'rotated-rectangle',
  'circle',
  'ellipse',
  'triangle',
  'arc',
  'parallel-channel',
];

const TEXT_TYPES: DrawingType[] = ['text', 'note'];

const POSITION_TYPES: DrawingType[] = ['long-position', 'short-position'];

// These types are not in the current DrawingType union but may be added later.
// Using string[] intentionally to guard gracefully without compile errors.
const EMOJI_TYPES: string[] = ['emoji', 'sticker', 'icon'];

const EMOJI_PRESETS = ['📈', '📉', '⭐', '🔥', '✅', '❌', '⚠️', '🎯', '💰', '🐂', '🐻', '⚡'];

const LINE_WIDTHS = [1, 2, 3, 4];
const FONT_SIZES = [10, 12, 14, 18];

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------

/** Compact section label */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
    {children}
  </div>
);

/** A small pill/toggle button */
const PillBtn: React.FC<{
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  danger?: boolean;
  className?: string;
}> = ({ active, onClick, children, title, danger, className }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={cn(
      'flex h-6 min-w-[24px] items-center justify-center rounded px-1.5 text-xs transition-colors',
      active
        ? 'bg-white/20 text-white'
        : danger
        ? 'text-red-400 hover:bg-red-500/15'
        : 'text-zinc-300 hover:bg-white/10',
      className
    )}
  >
    {children}
  </button>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const DrawingStylePopover: React.FC<DrawingStylePopoverProps> = ({
  drawing,
  onUpdateStyle,
  onUpdateDrawing,
  onDelete,
  onClose,
}) => {
  const colorInputRef = useRef<HTMLInputElement>(null);

  if (!drawing) return null;

  const style: Partial<DrawingStyle> = drawing.style ?? {};
  const currentColor = style.color ?? drawing.color ?? '#FFFFFF';
  const currentLineWidth = style.lineWidth ?? drawing.lineWidth ?? 2;
  const currentLineStyle = style.lineStyle ?? 'solid';
  const currentFillColor = style.fillColor ?? '';
  const currentFillOpacity = style.fillOpacity ?? 0.2;

  const showFill     = FILL_TYPES.includes(drawing.type);
  const showText     = TEXT_TYPES.includes(drawing.type);
  const showEmoji    = EMOJI_TYPES.includes(drawing.type);
  const showPosition = POSITION_TYPES.includes(drawing.type);

  // Current text-related values (top-level fields on Drawing)
  const currentText = drawing.text ?? '';
  const currentFontSize = drawing.fontSize ?? 14;
  const currentFontWeight = drawing.fontWeight ?? 'normal';
  const currentTextAlign = drawing.textAlign ?? 'left';

  return (
    <div
      className="absolute left-12 top-2 z-[31] flex flex-col gap-3 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-3 shadow-xl"
      style={{ width: 212 }}
      // Prevent chart click-through when interacting with the popover
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold capitalize text-zinc-200">
          {drawing.type.replace(/-/g, ' ')}
        </span>
        <button
          type="button"
          title="Close"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <X size={13} />
        </button>
      </div>

      {/* ── Color ── */}
      <div>
        <SectionLabel>Color</SectionLabel>
        <div className="flex flex-wrap gap-1">
          {PRESET_COLORS.map(({ hex, label }) => (
            <button
              key={hex}
              type="button"
              title={label}
              onClick={() => onUpdateStyle({ color: hex })}
              className={cn(
                'h-5 w-5 rounded-sm border transition-transform hover:scale-110',
                currentColor.toLowerCase() === hex.toLowerCase()
                  ? 'border-white/80 ring-1 ring-white/40'
                  : 'border-white/10'
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
          {/* Custom color picker */}
          <button
            type="button"
            title="Custom color"
            onClick={() => colorInputRef.current?.click()}
            className="flex h-5 w-5 items-center justify-center rounded-sm border border-white/10 text-[10px] text-zinc-400 hover:bg-white/10"
          >
            +
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={currentColor}
            onChange={(e) => onUpdateStyle({ color: e.target.value })}
            className="sr-only"
            tabIndex={-1}
          />
        </div>
      </div>

      {/* ── Line width ── */}
      <div>
        <SectionLabel>Line Width</SectionLabel>
        <div className="flex gap-1">
          {LINE_WIDTHS.map((w) => (
            <PillBtn
              key={w}
              active={currentLineWidth === w}
              onClick={() => onUpdateStyle({ lineWidth: w })}
              title={`${w}px`}
            >
              {w}
            </PillBtn>
          ))}
        </div>
      </div>

      {/* ── Line style ── */}
      <div>
        <SectionLabel>Line Style</SectionLabel>
        <div className="flex gap-1">
          {(['solid', 'dashed', 'dotted'] as const).map((ls) => (
            <PillBtn
              key={ls}
              active={currentLineStyle === ls}
              onClick={() => onUpdateStyle({ lineStyle: ls })}
              title={ls.charAt(0).toUpperCase() + ls.slice(1)}
            >
              {ls === 'solid' ? '—' : ls === 'dashed' ? '- -' : '···'}
            </PillBtn>
          ))}
        </div>
      </div>

      {/* ── Fill (shapes only) ── */}
      {showFill && (
        <div>
          <SectionLabel>Fill</SectionLabel>
          <div className="flex items-center gap-2">
            {/* Fill color */}
            <div className="flex flex-wrap gap-1">
              {PRESET_COLORS.map(({ hex, label }) => (
                <button
                  key={hex}
                  type="button"
                  title={label}
                  onClick={() => onUpdateStyle({ fillColor: hex })}
                  className={cn(
                    'h-4 w-4 rounded-sm border transition-transform hover:scale-110',
                    currentFillColor.toLowerCase() === hex.toLowerCase()
                      ? 'border-white/80 ring-1 ring-white/40'
                      : 'border-white/10'
                  )}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
          {/* Opacity slider */}
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={currentFillOpacity}
              onChange={(e) => onUpdateStyle({ fillOpacity: Number(e.target.value) })}
              className="flex-1 accent-white/60"
              style={{ height: 4 }}
            />
            <span className="w-7 text-right text-[10px] text-zinc-400">
              {Math.round(currentFillOpacity * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* ── Text / Note settings (text / note types only) ── */}
      {showText && onUpdateDrawing && (
        <div>
          <SectionLabel>Text</SectionLabel>
          <input
            type="text"
            value={currentText}
            placeholder="Enter text…"
            onChange={(e) => onUpdateDrawing({ text: e.target.value })}
            className="mb-1.5 w-full rounded border border-[#2A2A2A] bg-[#111] px-2 py-1 text-xs text-white placeholder-zinc-600 outline-none focus:border-white/20"
          />
          {/* Font size */}
          <div className="mb-1.5 flex items-center gap-1">
            <span className="mr-1 text-[10px] text-zinc-500">Size</span>
            {FONT_SIZES.map((fs) => (
              <PillBtn
                key={fs}
                active={currentFontSize === fs}
                onClick={() => onUpdateDrawing({ fontSize: fs })}
                title={`${fs}px`}
              >
                {fs}
              </PillBtn>
            ))}
          </div>
          {/* Bold + align */}
          <div className="flex gap-1">
            <PillBtn
              active={currentFontWeight === 'bold'}
              onClick={() =>
                onUpdateDrawing({
                  fontWeight: currentFontWeight === 'bold' ? 'normal' : 'bold',
                })
              }
              title="Bold"
            >
              <Bold size={12} />
            </PillBtn>
            {(['left', 'center', 'right'] as const).map((align) => {
              const Icon =
                align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
              return (
                <PillBtn
                  key={align}
                  active={currentTextAlign === align}
                  onClick={() => onUpdateDrawing({ textAlign: align })}
                  title={`Align ${align}`}
                >
                  <Icon size={12} />
                </PillBtn>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Emoji grid (emoji / sticker / icon types only) ── */}
      {showEmoji && onUpdateDrawing && (
        <div>
          <SectionLabel>Emoji</SectionLabel>
          <div className="grid grid-cols-6 gap-0.5">
            {EMOJI_PRESETS.map((em) => (
              <button
                key={em}
                type="button"
                title={em}
                onClick={() => onUpdateDrawing({ emoji: em })}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded text-base transition-colors hover:bg-white/10',
                  drawing.emoji === em && 'bg-white/15'
                )}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Position section (long-position / short-position only) ── */}
      {showPosition && onUpdateDrawing && (
        <div>
          <SectionLabel>Position</SectionLabel>

          {/* Qty input */}
          <div className="mb-1.5 flex items-center gap-2">
            <span className="w-20 shrink-0 text-[10px] text-zinc-500">Qty</span>
            <input
              type="number"
              min={0.0001}
              step={1}
              value={drawing.risk?.qty ?? 1}
              onChange={(e) => {
                const qty = Math.max(0.0001, Number(e.target.value) || 1);
                // Build a valid PositionRisk — entry/stop/target come from points (cosmetic),
                // only qty and accountSize are stored here.
                const pts = drawing.points;
                const existingRisk = drawing.risk;
                const updated: PositionRisk = {
                  entry:       pts[0]?.price ?? existingRisk?.entry ?? 0,
                  stop:        pts[1]?.price ?? existingRisk?.stop  ?? 0,
                  target:      pts[2]?.price ?? existingRisk?.target ?? 0,
                  qty,
                  accountSize: existingRisk?.accountSize,
                };
                onUpdateDrawing({ risk: updated });
              }}
              className="w-full rounded border border-[#2A2A2A] bg-[#111] px-2 py-0.5 text-xs text-white outline-none focus:border-white/20"
            />
          </div>

          {/* Account size input (enables risk % display) */}
          <div className="mb-1.5 flex items-center gap-2">
            <span className="w-20 shrink-0 text-[10px] text-zinc-500">Account $</span>
            <input
              type="number"
              min={0}
              step={100}
              placeholder="optional"
              value={drawing.risk?.accountSize ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                const accountSize = raw === '' ? undefined : Math.max(0, Number(raw));
                const pts = drawing.points;
                const existingRisk = drawing.risk;
                const updated: PositionRisk = {
                  entry:       pts[0]?.price ?? existingRisk?.entry ?? 0,
                  stop:        pts[1]?.price ?? existingRisk?.stop  ?? 0,
                  target:      pts[2]?.price ?? existingRisk?.target ?? 0,
                  qty:         existingRisk?.qty ?? 1,
                  accountSize,
                };
                onUpdateDrawing({ risk: updated });
              }}
              className="w-full rounded border border-[#2A2A2A] bg-[#111] px-2 py-0.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-white/20"
            />
          </div>

          {/* Read-only stats derived from points */}
          {(() => {
            const stats = computePositionStats(drawing);
            if (!stats) return (
              <p className="text-[10px] text-zinc-600 italic">
                Place all 3 points to see stats
              </p>
            );
            return (
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-zinc-400">
                <span className="text-zinc-500">R:R</span>
                <span className="text-right text-white">{stats.rr.toFixed(2)}</span>
                <span className="text-zinc-500">Risk $</span>
                <span className="text-right text-red-400">{stats.riskAmount.toFixed(2)}</span>
                <span className="text-zinc-500">Reward $</span>
                <span className="text-right text-green-400">{stats.rewardAmount.toFixed(2)}</span>
                {stats.riskPct != null && (
                  <>
                    <span className="text-zinc-500">Risk %</span>
                    <span className="text-right text-red-400">{stats.riskPct.toFixed(2)}%</span>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Footer: Delete ── */}
      <div className="flex items-center justify-end border-t border-[#2A2A2A] pt-2">
        <PillBtn danger onClick={onDelete} title="Delete drawing">
          <Trash2 size={13} className="mr-1" />
          Delete
        </PillBtn>
      </div>
    </div>
  );
};
