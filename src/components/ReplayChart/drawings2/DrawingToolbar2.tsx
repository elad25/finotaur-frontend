/**
 * drawings2/DrawingToolbar2.tsx
 *
 * TradingView-style vertical drawing toolbar, themed black/gold.
 *
 * Structure:
 *   TOP    — TOOL_GROUPS: each group = one icon button with a flyout to the right
 *   MIDDLE — "Style" group button: flyout contains color swatches + width buttons
 *   BOTTOM — UTILITY_TOOLS + conditional Delete-selected button
 *
 * Flyouts open on mouse-enter (120ms delay) and close on mouse-leave (150ms delay).
 * Only tools with `supported: true` are forwarded to `onSelectTool`; the rest
 * are visually dimmed "Soon" in the flyout and are no-ops.
 *
 * Props are kept identical to the previous flat toolbar so BacktestReplayChart
 * requires no changes.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Palette,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolId } from './base';
import { TOOL_GROUPS, UTILITY_TOOLS } from './toolbarGroups';
import type { ToolGroup, ToolItem, UtilityTool } from './toolbarGroups';
import { ToolbarFlyout } from './ToolbarFlyout';

// ─── Color swatches (data — hex kept here intentionally; not UI semantic color) ──

const SWATCHES = [
  { label: 'Gold',  value: '#C9A646' },
  { label: 'White', value: '#e4e4e7' },
  { label: 'Red',   value: '#ef4444' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue',  value: '#3b82f6' },
];

const LINE_WIDTHS = [1, 2, 3] as const;
type LineWidth = typeof LINE_WIDTHS[number];

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

// ─── Hook: flyout open/close with hover-delay timers ────────────────────────

function useFlyout() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback((id: string) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    openTimer.current = setTimeout(() => setOpenId(id), 120);
  }, []);

  const close = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    closeTimer.current = setTimeout(() => setOpenId(null), 150);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const closeImmediate = useCallback(() => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpenId(null);
  }, []);

  return { openId, open, close, cancelClose, closeImmediate };
}

// ─── GroupButton ─────────────────────────────────────────────────────────────

interface GroupButtonProps {
  group: ToolGroup;
  activeTool: ToolId;
  isOpen: boolean;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onFlyoutHoverEnter: () => void;
  onFlyoutHoverLeave: () => void;
  onClickGroup: () => void;
  onSelectSubTool: (item: ToolItem) => void;
}

function GroupButton({
  group,
  activeTool,
  isOpen,
  onHoverEnter,
  onHoverLeave,
  onFlyoutHoverEnter,
  onFlyoutHoverLeave,
  onClickGroup,
  onSelectSubTool,
}: GroupButtonProps) {
  // Is any tool in this group the active engine tool?
  const groupIsActive = group.tools.some((t) => t.id === activeTool);

  // Which icon to show: active sub-tool's icon, else the first supported tool's icon, else group icon
  const displayIcon = (() => {
    if (groupIsActive) {
      const activeSub = group.tools.find((t) => t.id === activeTool);
      if (activeSub) return activeSub.icon;
    }
    const firstSupported = group.tools.find((t) => t.supported);
    return firstSupported ? firstSupported.icon : group.icon;
  })();

  const IconEl = displayIcon;
  const hasMultiple = group.tools.length > 1;

  return (
    // Wrap button + flyout in a single hover zone so mouse travel into flyout
    // doesn't close it.
    <div
      className="relative"
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      <button
        type="button"
        title={group.label}
        onClick={onClickGroup}
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-md transition-colors',
          groupIsActive
            ? 'bg-gold-primary text-ink-on-gold'
            : 'text-ink-secondary hover:bg-surface-2 hover:text-ink-primary',
        )}
      >
        <IconEl size={15} />

        {/* Corner triangle indicator — shown when group has multiple tools */}
        {hasMultiple && (
          <ChevronRight
            size={8}
            className={cn(
              'absolute bottom-0 right-0',
              groupIsActive ? 'text-ink-on-gold' : 'text-ink-tertiary',
            )}
          />
        )}
      </button>

      {/* Flyout panel */}
      {isOpen && (
        <div
          onMouseEnter={onFlyoutHoverEnter}
          onMouseLeave={onFlyoutHoverLeave}
        >
          <ToolbarFlyout
            title={group.label}
            items={group.tools}
            activeToolId={activeTool}
            onSelect={onSelectSubTool}
          />
        </div>
      )}
    </div>
  );
}

// ─── StyleFlyout ─────────────────────────────────────────────────────────────

interface StyleFlyoutProps {
  color: string;
  width: number;
  onColorChange: (c: string) => void;
  onWidthChange: (w: LineWidth) => void;
}

function StyleFlyout({ color, width, onColorChange, onWidthChange }: StyleFlyoutProps) {
  return (
    <div
      className={cn(
        'absolute left-full top-0 ml-1 z-[60]',
        'bg-surface-1 backdrop-blur-md',
        'border border-border-ds-default',
        'rounded-[12px]',
        'shadow-xl',
        'min-w-[160px] p-3',
        'pointer-events-auto',
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary mb-2">
        Style
      </div>

      {/* Color swatches */}
      <div className="flex items-center gap-2 mb-3">
        {SWATCHES.map((s) => (
          <button
            key={s.value}
            type="button"
            title={s.label}
            onClick={() => onColorChange(s.value)}
            className={cn(
              'h-5 w-5 rounded-full border-2 transition-transform',
              color === s.value
                ? 'scale-125 border-gold-primary'
                : 'border-border-ds-subtle hover:scale-110',
            )}
            style={{ backgroundColor: s.value }}
          />
        ))}
      </div>

      {/* Width buttons */}
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary mb-1.5">
        Width
      </div>
      <div className="flex items-center gap-1.5">
        {LINE_WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            title={`Width ${w}`}
            onClick={() => onWidthChange(w)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold transition-colors',
              width === w
                ? 'bg-gold-primary text-ink-on-gold'
                : 'text-ink-secondary hover:bg-surface-2 hover:text-ink-primary border border-border-ds-subtle',
            )}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── UtilityButton ───────────────────────────────────────────────────────────

interface UtilityButtonProps {
  tool: UtilityTool;
  toggled?: boolean;
  onToggle?: () => void;
  onAction?: () => void;
}

function UtilityButton({ tool, toggled, onToggle, onAction }: UtilityButtonProps) {
  const isDisabled = !tool.supported;
  const IconEl = tool.icon;

  const handleClick = () => {
    if (isDisabled) return;
    if (tool.kind === 'toggle') onToggle?.();
    if (tool.kind === 'action') onAction?.();
  };

  return (
    <button
      type="button"
      title={tool.label}
      disabled={isDisabled}
      onClick={handleClick}
      className={cn(
        'relative flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        isDisabled
          ? 'text-ink-tertiary opacity-40 cursor-not-allowed'
          : toggled
          ? 'text-gold-primary'
          : 'text-ink-secondary hover:bg-surface-2 hover:text-ink-primary',
      )}
    >
      <IconEl size={15} />
    </button>
  );
}

// ─── DrawingToolbar2 ─────────────────────────────────────────────────────────

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
  const { openId, open, close, cancelClose, closeImmediate } = useFlyout();

  // Per-utility toggle states (local-only; wiring to controller is a later round)
  const [magnetOn, setMagnetOn]       = useState(false);
  const [stayDrawOn, setStayDrawOn]   = useState(false);
  const [lockAllOn, setLockAllOn]     = useState(false);
  const [hideAllOn, setHideAllOn]     = useState(false);

  // Handler: user picks a sub-tool from a group flyout
  const handleSubToolSelect = useCallback(
    (item: ToolItem) => {
      // Guard: only forward supported tools to the engine
      if (!item.supported) return;
      onSelectTool(item.id as ToolId);
      closeImmediate();
    },
    [onSelectTool, closeImmediate],
  );

  // Handler: clicking the group button itself selects the best tool in that group
  const handleGroupClick = useCallback(
    (group: ToolGroup) => {
      // Prefer: currently-active sub-tool in this group → keep it selected
      const alreadyActive = group.tools.find((t) => t.id === activeTool);
      if (alreadyActive) {
        closeImmediate();
        return;
      }
      // Else select the first supported tool in the group
      const firstSupported = group.tools.find((t) => t.supported);
      if (firstSupported) {
        onSelectTool(firstSupported.id as ToolId);
      }
      closeImmediate();
    },
    [activeTool, onSelectTool, closeImmediate],
  );

  // Utility toggle lookup
  const utilityToggles: Record<string, boolean> = {
    magnet: magnetOn,
    stay_draw: stayDrawOn,
    lock_all: lockAllOn,
    hide_all: hideAllOn,
  };

  const utilityToggleHandlers: Record<string, () => void> = {
    magnet:    () => setMagnetOn((v) => !v),
    stay_draw: () => setStayDrawOn((v) => !v),
    lock_all:  () => setLockAllOn((v) => !v),
    hide_all:  () => setHideAllOn((v) => !v),
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-0.5',
        'bg-surface-base border-r border-border-ds-subtle',
        'py-1.5 px-1 select-none w-10',
        // overflow-x must be visible so flyouts escape the strip;
        // no overflow-y-auto here — all groups fit without scrolling
        'overflow-visible',
        className,
      )}
    >
      {/* ── TOP: Drawing tool groups ── */}
      {/* Cursor group intentionally hidden: 'cursor' is the controller's default
          mode, so chart navigation/crosshair still works without the button. */}
      {TOOL_GROUPS.filter((group) => group.id !== 'cursors').map((group) => (
        <GroupButton
          key={group.id}
          group={group}
          activeTool={activeTool}
          isOpen={openId === group.id}
          onHoverEnter={() => open(group.id)}
          onHoverLeave={close}
          onFlyoutHoverEnter={cancelClose}
          onFlyoutHoverLeave={close}
          onClickGroup={() => handleGroupClick(group)}
          onSelectSubTool={handleSubToolSelect}
        />
      ))}

      {/* ── Divider ── */}
      <div className="my-1 h-px w-6 bg-border-ds-subtle" />

      {/* ── Style group (color + width flyout) ── */}
      <div
        className="relative"
        onMouseEnter={() => open('__style__')}
        onMouseLeave={close}
      >
        <button
          type="button"
          title="Style"
          className="relative flex h-8 w-8 items-center justify-center rounded-md transition-colors text-ink-secondary hover:bg-surface-2 hover:text-ink-primary"
        >
          {/* Small color dot preview */}
          <span
            className="h-4 w-4 rounded-full border border-border-ds-default"
            style={{ backgroundColor: color }}
          />
          <Palette
            size={8}
            className="absolute bottom-0.5 right-0.5 text-ink-tertiary"
          />
        </button>

        {openId === '__style__' && (
          <div
            onMouseEnter={cancelClose}
            onMouseLeave={close}
          >
            <StyleFlyout
              color={color}
              width={width as LineWidth}
              onColorChange={(c) => { onColorChange(c); closeImmediate(); }}
              onWidthChange={(w) => { onWidthChange(w); closeImmediate(); }}
            />
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="my-1 h-px w-6 bg-border-ds-subtle" />

      {/* ── BOTTOM: Utility tools ── */}
      {UTILITY_TOOLS.map((tool) => {
        if (tool.id === 'remove_all') {
          return (
            <UtilityButton
              key={tool.id}
              tool={tool}
              onAction={onClear}
            />
          );
        }
        return (
          <UtilityButton
            key={tool.id}
            tool={tool}
            toggled={utilityToggles[tool.id]}
            onToggle={utilityToggleHandlers[tool.id]}
          />
        );
      })}

      {/* ── Delete selected (shown only when a drawing is selected) ── */}
      {hasSelection && (
        <button
          type="button"
          title="Delete selected (Del)"
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors text-num-negative hover:bg-surface-2"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
