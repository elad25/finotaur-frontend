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
  ArrowRight,
  EyeOff,
  Lock,
  Magnet,
  Minus,
  Pin,
  Square,
  Trash2,
  TrendingUp,
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

// Per Elad (2026-06-26): the entire drawing palette had been temporarily
// reduced to a SINGLE tool — a horizontal ray that starts at a clicked point
// and extends to the RIGHT only. Every other tool/group was removed.
//
// REVERSED by Elad (2026-07-03): the latent trendline/horizontal/rectangle
// tools (already implemented in tools.ts) are re-enabled below, grouped by
// TradingView-style categories.
export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'lines',
    label: 'Lines',
    icon: TrendingUp,
    tools: [
      { id: 'trendline', label: 'Trend Line', icon: TrendingUp, supported: true, shortcut: 'T' },
      { id: 'horizontal', label: 'Horizontal Line', icon: Minus, supported: true, shortcut: 'M' },
      { id: 'horizontal_ray', label: 'Horizontal Ray', icon: ArrowRight, supported: true, shortcut: 'H' },
    ],
  },
  {
    id: 'shapes',
    label: 'Shapes',
    icon: Square,
    tools: [
      { id: 'rectangle', label: 'Rectangle', icon: Square, supported: true, shortcut: 'R' },
    ],
  },
];

// ─── Utility tools (bottom section) ──────────────────────────────────────────
// P2 (2026-07-03): magnet / stay-in-draw-mode / lock-all / hide-all toggles
// are now wired to real controller behavior (see DrawingController.ts).
// "Remove All" remains the only action-kind utility.
export const UTILITY_TOOLS: UtilityTool[] = [
  { id: 'magnet',      label: 'Magnet (snap to OHLC)',    icon: Magnet,  kind: 'toggle', supported: true },
  { id: 'stay_draw',   label: 'Stay in Drawing Mode',     icon: Pin,     kind: 'toggle', supported: true },
  { id: 'lock_all',    label: 'Lock All Drawings',        icon: Lock,    kind: 'toggle', supported: true },
  { id: 'hide_all',    label: 'Hide All Drawings',        icon: EyeOff,  kind: 'toggle', supported: true },
  { id: 'remove_all',  label: 'Remove All Drawings',      icon: Trash2,  kind: 'action', supported: true },
];
