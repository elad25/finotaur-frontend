// ui/DrawingToolbar.tsx
import React from 'react';
import {
  MousePointer2,
  TrendingUp,
  Minus,
  MoveVertical,
  GitCommit,
  Square,
  Circle,
  Pencil,
  Type,
  Ruler,
  Percent,
  Trash2,
  Undo2,
  Redo2,
  Lock,
  Unlock,
  Eye,
} from 'lucide-react';
import { Theme, DrawingType } from '../types';
import { cn } from '@/lib/utils';

// ✅ Export interface
export interface DrawingToolbarProps {
  currentTool: DrawingType | 'cursor' | 'cross';
  hasSelection: boolean;
  isSelectionLocked: boolean;
  canUndo: boolean;
  canRedo: boolean;
  theme: Theme;
  onToolSelect: (tool: DrawingType | 'cursor' | 'cross') => void;
  onDeleteSelected?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onLockToggle?: () => void;
  onVisibilityToggle?: () => void;
  className?: string;
}

// Tool groups — same 12 tool ids/icons/labels/shortcuts, sectioned TradingView-style.
const TOOL_GROUPS: Array<
  Array<{
    id: DrawingType | 'cursor' | 'cross';
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    shortcut?: string;
  }>
> = [
  // cursors
  [
    { id: 'cursor', icon: MousePointer2, label: 'Select', shortcut: 'C' },
    { id: 'cross', icon: MousePointer2, label: 'Crosshair', shortcut: 'X' },
  ],
  // lines
  [
    { id: 'trendline', icon: TrendingUp, label: 'Trend Line', shortcut: 'T' },
    { id: 'ray', icon: GitCommit, label: 'Ray', shortcut: 'R' },
    { id: 'horizontal', icon: Minus, label: 'Horizontal Line', shortcut: 'H' },
    { id: 'vertical', icon: MoveVertical, label: 'Vertical Line', shortcut: 'V' },
  ],
  // shapes
  [
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
  ],
  // annotate
  [
    { id: 'brush', icon: Pencil, label: 'Brush' },
    { id: 'text', icon: Type, label: 'Text' },
  ],
  // measure
  [
    { id: 'measure', icon: Ruler, label: 'Measure' },
    { id: 'fibonacci', icon: Percent, label: 'Fibonacci', shortcut: 'F' },
  ],
];

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  currentTool,
  hasSelection,
  isSelectionLocked,
  canUndo,
  canRedo,
  theme,
  onToolSelect,
  onDeleteSelected,
  onUndo,
  onRedo,
  onLockToggle,
  onVisibilityToggle,
  className = '',
}) => {
  const isDark = theme === 'dark';

  const divider = (
    <div
      className={cn(
        'my-1 h-px w-6',
        isDark ? 'bg-[#C9A646]/15' : 'bg-gray-200'
      )}
    />
  );

  const toolBtn = (
    tool: { id: DrawingType | 'cursor' | 'cross'; icon: React.ComponentType<{ className?: string }>; label: string; shortcut?: string }
  ) => {
    const isActive = currentTool === tool.id;
    return (
      <button
        key={tool.id}
        type="button"
        title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
        onClick={() => onToolSelect(tool.id)}
        className={cn(
          'group relative flex h-9 w-9 items-center justify-center rounded-md transition-colors',
          isActive
            ? 'bg-[#C9A646]/15 text-[#C9A646] before:absolute before:left-[-4px] before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-r before:bg-[#C9A646] before:content-[""]'
            : isDark
            ? 'text-zinc-400 hover:bg-white/5 hover:text-[#C9A646]'
            : 'text-gray-500 hover:bg-gray-100 hover:text-[#C9A646]'
        )}
      >
        <tool.icon className="h-[18px] w-[18px]" />
        {/* TradingView-style tooltip — appears to the right */}
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 opacity-0 shadow-xl transition-opacity duration-100 group-hover:opacity-100">
          {tool.label}
          {tool.shortcut && (
            <kbd className="ml-2 rounded bg-white/10 px-1 text-[10px] text-zinc-400">
              {tool.shortcut}
            </kbd>
          )}
        </span>
      </button>
    );
  };

  const actionBtn = ({
    icon: Icon,
    label,
    onClick,
    disabled = false,
    danger = false,
    shortcut,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    danger?: boolean;
    shortcut?: string;
  }) => (
    <button
      type="button"
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative flex h-9 w-9 items-center justify-center rounded-md transition-colors',
        'disabled:pointer-events-none disabled:opacity-30',
        danger
          ? 'text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400'
          : isDark
          ? 'text-zinc-400 hover:bg-white/5 hover:text-[#C9A646]'
          : 'text-gray-500 hover:bg-gray-100 hover:text-[#C9A646]'
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 opacity-0 shadow-xl transition-opacity duration-100 group-hover:opacity-100">
        {label}
        {shortcut && (
          <kbd className="ml-2 rounded bg-white/10 px-1 text-[10px] text-zinc-400">
            {shortcut}
          </kbd>
        )}
      </span>
    </button>
  );

  return (
    <div
      className={cn(
        'flex h-full w-11 flex-col items-center gap-0.5 border-r px-1 py-2 backdrop-blur-sm',
        isDark
          ? 'border-[#C9A646]/15 bg-[#0b0b0d]/95'
          : 'border-gray-200 bg-white/95',
        className
      )}
    >
      {/* Tool groups separated by dividers */}
      {TOOL_GROUPS.map((group, gi) => (
        <React.Fragment key={gi}>
          {group.map((tool) => toolBtn(tool))}
          {/* Divider after every group except the last */}
          {gi < TOOL_GROUPS.length - 1 && divider}
        </React.Fragment>
      ))}

      {/* Bottom action cluster — pushed to the bottom */}
      <div className="mt-auto flex flex-col items-center gap-0.5">
        {divider}
        {actionBtn({ icon: Undo2, label: 'Undo', onClick: onUndo, disabled: !canUndo, shortcut: 'Ctrl+Z' })}
        {actionBtn({ icon: Redo2, label: 'Redo', onClick: onRedo, disabled: !canRedo, shortcut: 'Ctrl+Shift+Z' })}
        {hasSelection && (
          <>
            {actionBtn({
              icon: isSelectionLocked ? Lock : Unlock,
              label: isSelectionLocked ? 'Unlock' : 'Lock',
              onClick: onLockToggle,
            })}
            {actionBtn({ icon: Trash2, label: 'Delete', onClick: onDeleteSelected, danger: true, shortcut: 'Del' })}
          </>
        )}
        {actionBtn({ icon: Eye, label: 'Show/Hide Drawings', onClick: onVisibilityToggle })}
      </div>
    </div>
  );
};
