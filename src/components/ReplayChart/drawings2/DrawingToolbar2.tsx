/**
 * drawings2/DrawingToolbar2.tsx
 *
 * Focused dark vertical toolbar for the 3-tool drawing system.
 * Tools: Cursor | Trend Line | Horizontal Line | Rectangle
 * Extras: color swatches, line-width buttons, Delete (when selected), Clear All
 */

import React from 'react';
import {
  MousePointer2,
  TrendingUp,
  Minus,
  Square,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { ToolId } from './base';

// ─── Color swatches ───────────────────────────────────────────────────────────

const SWATCHES = [
  { label: 'Gold',  value: '#C9A646' },
  { label: 'White', value: '#e4e4e7' },
  { label: 'Red',   value: '#ef4444' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue',  value: '#3b82f6' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DrawingToolbar2Props {
  activeTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  hasSelection: boolean;
  onDelete: () => void;
  onClear: () => void;
  color: string;
  width: number;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  className?: string;
}

// ─── Button component ─────────────────────────────────────────────────────────

interface ToolBtnProps {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}

function ToolBtn({ active, title, onClick, children, danger }: ToolBtnProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        'flex h-7 w-7 items-center justify-center rounded transition-colors',
        active
          ? 'bg-[#C9A646] text-black'
          : danger
          ? 'text-red-400 hover:bg-red-900/40'
          : 'text-zinc-300 hover:bg-zinc-700',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

export function DrawingToolbar2({
  activeTool,
  onSelectTool,
  hasSelection,
  onDelete,
  onClear,
  color,
  width,
  onColorChange,
  onWidthChange,
  className = '',
}: DrawingToolbar2Props) {
  return (
    <div
      className={[
        'flex w-8 flex-col items-center gap-0.5 bg-[#0d0d10] border-r border-zinc-800 py-1 select-none',
        className,
      ].join(' ')}
    >
      {/* ── Drawing tools ── */}
      <ToolBtn
        active={activeTool === 'cursor'}
        title="Cursor (C)"
        onClick={() => onSelectTool('cursor')}
      >
        <MousePointer2 size={14} />
      </ToolBtn>

      <ToolBtn
        active={activeTool === 'trendline'}
        title="Trend Line (T)"
        onClick={() => onSelectTool('trendline')}
      >
        <TrendingUp size={14} />
      </ToolBtn>

      <ToolBtn
        active={activeTool === 'horizontal'}
        title="Horizontal Line (H)"
        onClick={() => onSelectTool('horizontal')}
      >
        <Minus size={14} />
      </ToolBtn>

      <ToolBtn
        active={activeTool === 'rectangle'}
        title="Rectangle (R)"
        onClick={() => onSelectTool('rectangle')}
      >
        <Square size={14} />
      </ToolBtn>

      {/* ── Divider ── */}
      <div className="my-1 w-5 border-t border-zinc-700" />

      {/* ── Color swatches ── */}
      {SWATCHES.map(s => (
        <button
          key={s.value}
          type="button"
          title={s.label}
          onClick={() => onColorChange(s.value)}
          className={[
            'my-0.5 h-3.5 w-3.5 rounded-full border transition-transform',
            color === s.value ? 'scale-125 border-white' : 'border-zinc-600 hover:scale-110',
          ].join(' ')}
          style={{ backgroundColor: s.value }}
        />
      ))}

      {/* ── Divider ── */}
      <div className="my-1 w-5 border-t border-zinc-700" />

      {/* ── Line width buttons ── */}
      {([1, 2, 3] as const).map(w => (
        <button
          key={w}
          type="button"
          title={`Width ${w}`}
          onClick={() => onWidthChange(w)}
          className={[
            'flex h-6 w-6 items-center justify-center rounded text-[9px] font-bold transition-colors',
            width === w
              ? 'bg-[#C9A646] text-black'
              : 'text-zinc-400 hover:bg-zinc-700',
          ].join(' ')}
        >
          {w}
        </button>
      ))}

      {/* ── Divider ── */}
      <div className="my-1 w-5 border-t border-zinc-700" />

      {/* ── Delete selected ── */}
      {hasSelection && (
        <ToolBtn title="Delete selected (Del)" onClick={onDelete} danger>
          <Trash2 size={13} />
        </ToolBtn>
      )}

      {/* ── Clear all ── */}
      <ToolBtn title="Clear all drawings" onClick={onClear} danger>
        <XCircle size={13} />
      </ToolBtn>
    </div>
  );
}
