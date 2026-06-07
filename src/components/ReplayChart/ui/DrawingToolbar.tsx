// ui/DrawingToolbar.tsx
// TradingView-style vertical drawing toolbar.
// • cursor + cross are standalone top buttons (no group)
// • every other group is rendered as a DrawingToolbarGroup (fly-out on chevron hover)
// • utility row: magnet, stay-in-tool, hide-all, lock-all, remove-all
// • bottom cluster: undo / redo / lock-selected / delete-selected / show-hide

import React from 'react';
import {
  MousePointer2,
  Crosshair,
  TrendingUp,
  TrendingDown,
  MoveUpRight,
  ArrowUpRight,
  ArrowRight,
  Minus,
  MoveVertical,
  MoveHorizontal,
  Maximize2,
  Plus,
  Equal,
  GitFork,
  Spline,
  Triangle,
  Percent,
  Square,
  SquareDashed,
  Grid3x3,
  Circle,
  Clock,
  PieChart,
  Pencil,
  Highlighter,
  Type,
  StickyNote,
  Ruler,
  Trash2,
  Undo2,
  Redo2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  LockKeyhole,
  Magnet,
  PenLine,
  // Emoji / icon group
  Smile,
  Sticker,
  Shapes,
  // Annotation group
  MessageSquareQuote,
  MessageSquare,
  Tag,
  Signpost,
  Flag,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  // Pattern group (P6)
  Activity,
  Waves,
  Repeat,
  AudioWaveform,
} from 'lucide-react';
import { Theme, DrawingType } from '../types';
import { cn } from '@/lib/utils';
import { DrawingToolbarGroup, type ToolGroup } from './DrawingToolbarGroup';

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
  // ── Utility row props ──
  magnetEnabled?: boolean;
  onToggleMagnet?: () => void;
  stayInTool?: boolean;
  onToggleStayInTool?: () => void;
  onHideAll?: () => void;
  onLockAll?: () => void;
  onRemoveAll?: () => void;
  className?: string;
}

// ── Grouped tool definitions ──────────────────────────────────────────
// cursor and cross are standalone; all other groups go through DrawingToolbarGroup.
const STANDALONE_TOOLS = [
  { id: 'cursor' as const, icon: MousePointer2, label: 'Select', shortcut: 'C' },
  { id: 'cross' as const, icon: Crosshair, label: 'Crosshair', shortcut: 'X' },
];

const TOOL_GROUPS: ToolGroup[] = [
  {
    name: 'Lines',
    icon: TrendingUp,
    tools: [
      { id: 'trendline', icon: TrendingUp, label: 'Trend Line', shortcut: 'T' },
      { id: 'ray', icon: MoveUpRight, label: 'Ray', shortcut: 'R' },
      { id: 'extended', icon: Minus, label: 'Extended Line' },
      { id: 'trend-angle', icon: Triangle, label: 'Trend Angle' },
      { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
      { id: 'horizontal', icon: Minus, label: 'Horizontal Line', shortcut: 'H' },
      { id: 'horizontal-ray', icon: ArrowRight, label: 'Horizontal Ray' },
      { id: 'vertical', icon: MoveVertical, label: 'Vertical Line', shortcut: 'V' },
      { id: 'cross-line', icon: Plus, label: 'Cross Line' },
    ],
  },
  {
    name: 'Channels',
    icon: Equal,
    tools: [
      { id: 'parallel-channel', icon: Equal, label: 'Parallel Channel' },
      { id: 'pitchfork', icon: GitFork, label: 'Pitchfork' },
      { id: 'gann-fan', icon: Spline, label: 'Gann Fan' },
    ],
  },
  {
    name: 'Fibonacci',
    icon: Percent,
    tools: [
      { id: 'fibonacci', icon: Percent, label: 'Fib Retracement', shortcut: 'F' },
      { id: 'fibonacci-extension', icon: Percent, label: 'Fib Extension' },
      { id: 'fib-channel', icon: Spline, label: 'Fib Channel' },
      { id: 'fib-timezone', icon: Clock, label: 'Fib Time Zone' },
      { id: 'fib-circles', icon: Circle, label: 'Fib Circles' },
      { id: 'fib-speed-fan', icon: Triangle, label: 'Fib Speed Fan' },
      { id: 'fib-spiral', icon: Spline, label: 'Fib Spiral' },
      { id: 'fib-wedge', icon: PieChart, label: 'Fib Wedge' },
      { id: 'pitchfan', icon: GitFork, label: 'Pitchfan' },
    ],
  },
  {
    name: 'Gann',
    icon: Grid3x3,
    tools: [
      { id: 'gann-box', icon: Grid3x3, label: 'Gann Box' },
      { id: 'gann-square', icon: Square, label: 'Gann Square' },
      { id: 'gann-square-fixed', icon: SquareDashed, label: 'Gann Square Fixed' },
      { id: 'pitchfork-schiff', icon: GitFork, label: 'Schiff Pitchfork' },
      { id: 'pitchfork-modified', icon: GitFork, label: 'Modified Schiff Pitchfork' },
      { id: 'pitchfork-inside', icon: GitFork, label: 'Inside Pitchfork' },
    ],
  },
  {
    name: 'Shapes',
    icon: Square,
    tools: [
      { id: 'rectangle', icon: Square, label: 'Rectangle' },
      { id: 'rotated-rectangle', icon: Square, label: 'Rotated Rectangle' },
      { id: 'circle', icon: Circle, label: 'Circle' },
      { id: 'ellipse', icon: Circle, label: 'Ellipse' },
      { id: 'triangle', icon: Triangle, label: 'Triangle' },
      { id: 'arc', icon: Spline, label: 'Arc' },
    ],
  },
  {
    name: 'Draw',
    icon: Pencil,
    tools: [
      { id: 'brush', icon: Pencil, label: 'Brush' },
      { id: 'highlighter', icon: Highlighter, label: 'Highlighter' },
    ],
  },
  {
    name: 'Annotate',
    icon: Type,
    tools: [
      { id: 'text', icon: Type, label: 'Text' },
      { id: 'note', icon: StickyNote, label: 'Note' },
      { id: 'measure', icon: Ruler, label: 'Measure' },
    ],
  },
  {
    name: 'Emoji',
    icon: Smile,
    tools: [
      { id: 'emoji', icon: Smile, label: 'Emoji' },
      { id: 'sticker', icon: Sticker, label: 'Sticker' },
      { id: 'icon', icon: Shapes, label: 'Icon' },
    ],
  },
  {
    name: 'Annotations',
    icon: MessageSquareQuote,
    tools: [
      { id: 'callout', icon: MessageSquareQuote, label: 'Callout' },
      { id: 'comment', icon: MessageSquare, label: 'Comment' },
      { id: 'price-label', icon: Tag, label: 'Price Label' },
      { id: 'signpost', icon: Signpost, label: 'Signpost' },
      { id: 'flag', icon: Flag, label: 'Flag' },
      { id: 'arrow-up', icon: ArrowUp, label: 'Arrow Up' },
      { id: 'arrow-down', icon: ArrowDown, label: 'Arrow Down' },
      { id: 'arrow-left', icon: ArrowLeft, label: 'Arrow Left' },
      { id: 'arrow-right', icon: ArrowRight, label: 'Arrow Right' },
    ],
  },
  {
    name: 'Position',
    icon: TrendingUp,
    tools: [
      { id: 'long-position', icon: TrendingUp, label: 'Long Position' },
      { id: 'short-position', icon: TrendingDown, label: 'Short Position' },
      { id: 'price-range', icon: MoveVertical, label: 'Price Range' },
      { id: 'date-range', icon: MoveHorizontal, label: 'Date Range' },
      { id: 'date-price-range', icon: Maximize2, label: 'Date & Price Range' },
    ],
  },
  {
    name: 'Patterns',
    icon: Activity,
    tools: [
      // Harmonic patterns
      { id: 'xabcd', icon: Spline, label: 'XABCD' },
      { id: 'cypher', icon: Spline, label: 'Cypher' },
      { id: 'abcd', icon: Spline, label: 'ABCD' },
      { id: 'three-drives', icon: Activity, label: 'Three Drives' },
      // Chart patterns
      { id: 'head-shoulders', icon: Activity, label: 'Head & Shoulders' },
      { id: 'triangle-pattern', icon: Triangle, label: 'Triangle Pattern' },
      // Elliott Wave
      { id: 'elliott-impulse', icon: Waves, label: 'Elliott Impulse (12345)' },
      { id: 'elliott-correction', icon: Waves, label: 'Elliott Correction (ABC)' },
      { id: 'elliott-triangle', icon: Waves, label: 'Elliott Triangle (ABCDE)' },
      { id: 'elliott-wxy', icon: Waves, label: 'Elliott Double Combo (WXY)' },
      { id: 'elliott-wxyxz', icon: Waves, label: 'Elliott Triple Combo (WXYXZ)' },
      // Cycles
      { id: 'cyclic-lines', icon: Repeat, label: 'Cyclic Lines' },
      { id: 'time-cycles', icon: Repeat, label: 'Time Cycles' },
      { id: 'sine-line', icon: AudioWaveform, label: 'Sine Line' },
    ],
  },
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
  magnetEnabled = false,
  onToggleMagnet,
  stayInTool = false,
  onToggleStayInTool,
  onHideAll,
  onLockAll,
  onRemoveAll,
  className = '',
}) => {
  const isDark = theme === 'dark';

  const divider = (
    <div
      className={cn(
        'my-1 h-px w-6 self-center',
        isDark ? 'bg-white/10' : 'bg-gray-200'
      )}
    />
  );

  /** Standalone tool button (cursor / cross) — full-width, no chevron. */
  const standaloneBtn = (tool: {
    id: DrawingType | 'cursor' | 'cross';
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    shortcut?: string;
  }) => {
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
            ? isDark
              ? 'bg-white/15 text-white before:absolute before:left-[-4px] before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-r before:bg-white/60 before:content-[""]'
              : 'bg-gray-200 text-gray-900 before:absolute before:left-[-4px] before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-r before:bg-gray-500 before:content-[""]'
            : isDark
            ? 'text-zinc-300 hover:bg-white/10'
            : 'text-gray-500 hover:bg-gray-100'
        )}
      >
        <tool.icon className="h-[18px] w-[18px]" />
        {/* Tooltip */}
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

  /** Generic action / toggle button used in both the utility row and action cluster. */
  const actionBtn = ({
    icon: Icon,
    label,
    onClick,
    disabled = false,
    danger = false,
    active = false,
    shortcut,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    danger?: boolean;
    active?: boolean;
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
          ? 'text-red-500 hover:bg-red-500/10'
          : active
          ? isDark
            ? 'bg-white/15 text-white'
            : 'bg-gray-200 text-gray-900'
          : isDark
          ? 'text-zinc-300 hover:bg-white/10'
          : 'text-gray-500 hover:bg-gray-100'
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

  const handleRemoveAll = () => {
    if (!onRemoveAll) return;
    if (window.confirm('Remove all drawings?')) {
      onRemoveAll();
    }
  };

  return (
    <div
      className={cn(
        'flex w-11 flex-col items-center gap-0.5 border-r px-1 py-2 backdrop-blur-sm',
        'overflow-y-auto max-h-full',
        isDark
          ? 'border-white/10 bg-black/90'
          : 'border-gray-200 bg-white/95',
        className
      )}
    >
      {/* ── Standalone cursor / crosshair ── */}
      {STANDALONE_TOOLS.map((t) => standaloneBtn(t))}

      {divider}

      {/* ── Grouped fly-out tool buttons ── */}
      {TOOL_GROUPS.map((group, gi) => (
        <React.Fragment key={group.name}>
          <DrawingToolbarGroup
            group={group}
            activeTool={currentTool}
            onSelectTool={onToolSelect}
          />
          {gi < TOOL_GROUPS.length - 1 && divider}
        </React.Fragment>
      ))}

      {/* ── Utility row ── */}
      <div className="mt-1 flex flex-col items-center gap-0.5">
        {divider}
        {actionBtn({
          icon: Magnet,
          label: 'Magnet Snap',
          onClick: onToggleMagnet,
          active: magnetEnabled,
          disabled: !onToggleMagnet,
        })}
        {actionBtn({
          icon: PenLine,
          label: 'Stay in Drawing Mode',
          onClick: onToggleStayInTool,
          active: stayInTool,
          disabled: !onToggleStayInTool,
        })}
        {actionBtn({
          icon: EyeOff,
          label: 'Hide All Drawings',
          onClick: onHideAll,
          disabled: !onHideAll,
        })}
        {actionBtn({
          icon: LockKeyhole,
          label: 'Lock All Drawings',
          onClick: onLockAll,
          disabled: !onLockAll,
        })}
        {actionBtn({
          icon: Trash2,
          label: 'Remove All Drawings',
          onClick: handleRemoveAll,
          danger: true,
          disabled: !onRemoveAll,
        })}
      </div>

      {/* ── Bottom action cluster — pushed to the bottom ── */}
      <div className="mt-auto flex flex-col items-center gap-0.5 pt-1">
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
