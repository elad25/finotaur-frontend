// ui/DrawingToolbarGroup.tsx
// TradingView-style fly-out group button for the drawing toolbar.
// One primary button shows the last-used tool's icon; hovering or clicking
// the chevron area opens a right-side popover listing every tool in the group.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { DrawingType } from '../types';
import { cn } from '@/lib/utils';

export interface ToolDef {
  id: DrawingType | 'cursor' | 'cross';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
}

export interface ToolGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  tools: ToolDef[];
}

export interface DrawingToolbarGroupProps {
  group: ToolGroup;
  activeTool: DrawingType | 'cursor' | 'cross';
  onSelectTool: (tool: DrawingType | 'cursor' | 'cross') => void;
}

export const DrawingToolbarGroup: React.FC<DrawingToolbarGroupProps> = ({
  group,
  activeTool,
  onSelectTool,
}) => {
  // Track the last-used tool within this group (default = first tool).
  const [lastUsed, setLastUsed] = useState<ToolDef>(group.tools[0]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep lastUsed in sync if activeTool is in this group (e.g. keyboard shortcut).
  useEffect(() => {
    const match = group.tools.find((t) => t.id === activeTool);
    if (match) setLastUsed(match);
  }, [activeTool, group.tools]);

  const isGroupActive = group.tools.some((t) => t.id === activeTool);

  // Close fly-out on outside click.
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handlePrimaryClick = useCallback(() => {
    onSelectTool(lastUsed.id);
  }, [lastUsed, onSelectTool]);

  const handleToolClick = useCallback(
    (tool: ToolDef) => {
      setLastUsed(tool);
      onSelectTool(tool.id);
      setOpen(false);
    },
    [onSelectTool]
  );

  const Icon = lastUsed.icon;

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* ── Primary button ── */}
      <button
        type="button"
        title={`${lastUsed.label}${lastUsed.shortcut ? ` (${lastUsed.shortcut})` : ''}`}
        onClick={handlePrimaryClick}
        className={cn(
          'group relative flex h-9 w-7 items-center justify-center rounded-l-md transition-colors',
          isGroupActive
            ? 'bg-white/15 text-white before:absolute before:left-[-4px] before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-r before:bg-white/60 before:content-[""]'
            : 'text-zinc-300 hover:bg-white/10'
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </button>

      {/* ── Chevron trigger ── */}
      <button
        type="button"
        aria-label={`Open ${group.name} tools`}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        className={cn(
          'flex h-9 w-[10px] items-center justify-center rounded-r-md transition-colors',
          isGroupActive
            ? 'bg-white/10 text-white/60 hover:bg-white/20'
            : 'text-zinc-600 hover:bg-white/10 hover:text-zinc-300'
        )}
      >
        <ChevronRight className="h-2.5 w-2.5" />
      </button>

      {/* ── Fly-out popover ── */}
      {open && (
        <div
          className="absolute left-full top-0 z-[40] ml-1 min-w-[180px] rounded border border-[#2A2A2A] bg-[#1A1A1A] py-1 shadow-xl"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {group.name}
          </div>
          {group.tools.map((tool) => {
            const TIcon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleToolClick(tool)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-300 hover:bg-[#2A2A2A] hover:text-white'
                )}
              >
                <TIcon className="h-[15px] w-[15px] shrink-0" />
                <span className="flex-1 truncate">{tool.label}</span>
                {tool.shortcut && (
                  <kbd className="rounded bg-white/10 px-1 text-[10px] text-zinc-500">
                    {tool.shortcut}
                  </kbd>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
