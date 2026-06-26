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

// Per Elad (2026-06-26): the entire drawing palette is reduced to a SINGLE
// tool — a horizontal ray that starts at a clicked point and extends to the
// RIGHT only. Every other tool/group was removed.
export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'lines',
    label: 'Horizontal Ray',
    icon: ArrowRight,
    tools: [
      { id: 'horizontal_ray', label: 'Horizontal Ray', icon: ArrowRight, supported: true, shortcut: 'H' },
    ],
  },
];

// ─── Utility tools (bottom section) ──────────────────────────────────────────
// Only "Remove All" survives so a user can clear rays they no longer want.
export const UTILITY_TOOLS: UtilityTool[] = [
  { id: 'remove_all', label: 'Remove All Drawings',  icon: Trash2,     kind: 'action', supported: true  },
];
