/**
 * drawings2/toolbarGroups.ts
 *
 * Defines the TradingView-style toolbar group structure for DrawingToolbar2.
 * Each group maps to one flyout panel containing sub-tools.
 *
 * Only tools with `supported: true` are wired to the drawing engine.
 * The rest appear as visually dimmed "Soon" items in the flyout.
 */

import type { LucideIcon } from 'lucide-react';
import {
  MousePointer2,
  Crosshair,
  Circle,
  Eraser,
  TrendingUp,
  Slash,
  Minus,
  MoveVertical,
  Plus,
  Equal,
  GitFork,
  Activity,
  Target,
  Square,
  Pencil,
  Highlighter,
  RotateCcw,
  Triangle,
  Spline,
  ArrowUpRight,
  Type,
  StickyNote,
  MessageSquare,
  Tag,
  Flag,
  Smile,
  Sticker,
  Ruler,
  ZoomIn,
  Magnet,
  PencilLine,
  Lock,
  Eye,
  Trash2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToolItem {
  /** Unique identifier. Supported tool ids match ToolId in base.ts. */
  id: string;
  label: string;
  icon: LucideIcon;
  /** When true, selecting this tool calls onSelectTool with its id. */
  supported: boolean;
  shortcut?: string;
}

export interface ToolGroup {
  /** Unique group id. */
  id: string;
  label: string;
  /** Icon shown as the group representative when no sub-tool is active. */
  icon: LucideIcon;
  tools: ToolItem[];
}

export type UtilityKind = 'tool' | 'toggle' | 'action';

export interface UtilityTool {
  id: string;
  label: string;
  icon: LucideIcon;
  kind: UtilityKind;
  supported: boolean;
}

// ─── Tool groups (top section) ────────────────────────────────────────────────

export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'cursors',
    label: 'Cursor',
    icon: MousePointer2,
    tools: [
      { id: 'cursor',      label: 'Cursor',     icon: MousePointer2, supported: true,  shortcut: 'C' },
      { id: 'crosshair',   label: 'Crosshair',  icon: Crosshair,     supported: false },
      { id: 'dot',         label: 'Dot',        icon: Circle,        supported: false },
      { id: 'eraser',      label: 'Eraser',     icon: Eraser,        supported: false },
    ],
  },
  {
    id: 'lines',
    label: 'Lines',
    icon: TrendingUp,
    tools: [
      { id: 'trendline',        label: 'Trend Line',      icon: TrendingUp,  supported: true,  shortcut: 'T' },
      { id: 'ray',              label: 'Ray',             icon: Slash,       supported: false },
      { id: 'info_line',        label: 'Info Line',       icon: ArrowUpRight, supported: false },
      { id: 'extended_line',    label: 'Extended Line',   icon: Slash,       supported: false },
      { id: 'trend_angle',      label: 'Trend Angle',     icon: Activity,    supported: false },
      { id: 'horizontal',       label: 'Horizontal Line', icon: Minus,       supported: true,  shortcut: 'H' },
      { id: 'horizontal_ray',   label: 'Horizontal Ray',  icon: Minus,       supported: false },
      { id: 'vertical_line',    label: 'Vertical Line',   icon: MoveVertical, supported: false },
      { id: 'cross_line',       label: 'Cross Line',      icon: Plus,        supported: false },
    ],
  },
  {
    id: 'channels',
    label: 'Channels',
    icon: Equal,
    tools: [
      { id: 'parallel_channel',  label: 'Parallel Channel',   icon: Equal,     supported: false },
      { id: 'regression_trend',  label: 'Regression Trend',   icon: Activity,  supported: false },
      { id: 'flat_top_bottom',   label: 'Flat Top/Bottom',    icon: Equal,     supported: false },
      { id: 'disjoint_channel',  label: 'Disjoint Channel',   icon: Equal,     supported: false },
    ],
  },
  {
    id: 'pitchfork',
    label: 'Pitchfork',
    icon: GitFork,
    tools: [
      { id: 'pitchfork',          label: 'Pitchfork',            icon: GitFork, supported: false },
      { id: 'schiff',             label: 'Schiff Pitchfork',     icon: GitFork, supported: false },
      { id: 'schiff_modified',    label: 'Modified Schiff',      icon: GitFork, supported: false },
      { id: 'inside_pitchfork',   label: 'Inside Pitchfork',     icon: GitFork, supported: false },
    ],
  },
  {
    id: 'fibonacci',
    label: 'Fibonacci & Gann',
    icon: Activity,
    tools: [
      { id: 'fib_retracement',      label: 'Fib Retracement',           icon: Activity, supported: false },
      { id: 'fib_extension',        label: 'Fib Extension',             icon: Activity, supported: false },
      { id: 'fib_time_zone',        label: 'Fib Time Zone',             icon: Activity, supported: false },
      { id: 'fib_channel',          label: 'Fib Channel',               icon: Activity, supported: false },
      { id: 'fib_trend_ext',        label: 'Trend-Based Fib Extension', icon: Activity, supported: false },
      { id: 'gann_box',             label: 'Gann Box',                  icon: Square,   supported: false },
      { id: 'gann_fan',             label: 'Gann Fan',                  icon: Activity, supported: false },
    ],
  },
  {
    id: 'measurement',
    label: 'Prediction & Measurement',
    icon: Target,
    tools: [
      { id: 'long_position',        label: 'Long Position',      icon: Target,  supported: false },
      { id: 'short_position',       label: 'Short Position',     icon: Target,  supported: false },
      { id: 'forecast',             label: 'Forecast',           icon: Target,  supported: false },
      { id: 'price_range',          label: 'Price Range',        icon: Ruler,   supported: false },
      { id: 'date_range',           label: 'Date Range',         icon: Ruler,   supported: false },
      { id: 'date_price_range',     label: 'Date & Price Range', icon: Ruler,   supported: false },
      { id: 'bars_pattern',         label: 'Bars Pattern',       icon: Activity, supported: false },
    ],
  },
  {
    id: 'shapes',
    label: 'Shapes & Brushes',
    icon: Square,
    tools: [
      { id: 'brush',               label: 'Brush',              icon: Pencil,       supported: false },
      { id: 'highlighter',         label: 'Highlighter',        icon: Highlighter,  supported: false },
      { id: 'rectangle',           label: 'Rectangle',          icon: Square,       supported: true,  shortcut: 'R' },
      { id: 'rotated_rectangle',   label: 'Rotated Rectangle',  icon: RotateCcw,    supported: false },
      { id: 'ellipse',             label: 'Ellipse',            icon: Circle,       supported: false },
      { id: 'triangle',            label: 'Triangle',           icon: Triangle,     supported: false },
      { id: 'arc',                 label: 'Arc',                icon: RotateCcw,    supported: false },
      { id: 'curve',               label: 'Curve',              icon: Spline,       supported: false },
      { id: 'polyline',            label: 'Polyline',           icon: Activity,     supported: false },
      { id: 'path',                label: 'Path',               icon: Pencil,       supported: false },
      { id: 'arrow',               label: 'Arrow',              icon: ArrowUpRight, supported: false },
    ],
  },
  {
    id: 'text',
    label: 'Text & Annotations',
    icon: Type,
    tools: [
      { id: 'text',               label: 'Text',          icon: Type,         supported: false },
      { id: 'anchored_text',      label: 'Anchored Text', icon: Type,         supported: false },
      { id: 'note',               label: 'Note',          icon: StickyNote,   supported: false },
      { id: 'callout',            label: 'Callout',       icon: MessageSquare, supported: false },
      { id: 'comment',            label: 'Comment',       icon: MessageSquare, supported: false },
      { id: 'price_label',        label: 'Price Label',   icon: Tag,          supported: false },
      { id: 'flag',               label: 'Flag',          icon: Flag,         supported: false },
    ],
  },
  {
    id: 'icons',
    label: 'Icons',
    icon: Smile,
    tools: [
      { id: 'icon',     label: 'Icon',    icon: Sticker, supported: false },
      { id: 'sticker',  label: 'Sticker', icon: Sticker, supported: false },
      { id: 'emoji',    label: 'Emoji',   icon: Smile,   supported: false },
    ],
  },
];

// ─── Utility tools (bottom section) ──────────────────────────────────────────

export const UTILITY_TOOLS: UtilityTool[] = [
  { id: 'measure',    label: 'Measure',              icon: Ruler,      kind: 'tool',   supported: false },
  { id: 'zoom_in',    label: 'Zoom In',              icon: ZoomIn,     kind: 'tool',   supported: false },
  { id: 'magnet',     label: 'Magnet',               icon: Magnet,     kind: 'toggle', supported: true  },
  { id: 'stay_draw',  label: 'Stay in Drawing Mode', icon: PencilLine, kind: 'toggle', supported: true  },
  { id: 'lock_all',   label: 'Lock All',             icon: Lock,       kind: 'toggle', supported: true  },
  { id: 'hide_all',   label: 'Hide All',             icon: Eye,        kind: 'toggle', supported: true  },
  { id: 'remove_all', label: 'Remove All Drawings',  icon: Trash2,     kind: 'action', supported: true  },
];
