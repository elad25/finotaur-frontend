/**
 * PaperTradeRailShell — collapsible wrapper around PaperTradeRail, shared by
 * every Arena tab that mounts the paper-trading rail (Chart / Order Flow /
 * Liquidity / DOM). Adds a LEFT-edge collapse/expand handle whose visual
 * language mirrors the main app Sidebar's own toggle tab (see
 * src/components/Sidebar.tsx's "Gold Toggle Tab") mirrored horizontally —
 * the Sidebar is docked left with its handle protruding right; this rail is
 * docked right with its handle protruding left.
 *
 * Collapse state is a single shared preference (usePaperTradeRailCollapse,
 * localStorage 'finotaur:arena:tradeRail:v1') so collapsing on one tab stays
 * collapsed after switching to another. Each tab keeps owning its OWN
 * resizable/fixed width (`railWidth` or a fixed constant) and passes it in
 * via `width` — this shell only layers the collapse affordance on top and
 * clamps to a slim strip when collapsed. `resizeHandle` is the tab's
 * existing drag-to-resize separator element (rendered only while expanded);
 * omit it for fixed-width call sites.
 *
 * A single persistent outer <div> (not two conditionally-rendered trees)
 * carries the width, so collapsing is a real CSS width transition (~200ms)
 * instead of an instant swap — only the INNER content changes on collapse,
 * not the element the transition runs on. The chart/ladder pane to the left
 * is a normal flex sibling (`flex-1 min-w-0`), so it naturally reflows into
 * the reclaimed width — no overlay involved.
 */

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePaperTradeRailCollapse } from '../hooks/usePaperTradeRailCollapse';

/** Collapsed strip width, px — within the 28-36px range the task specifies. */
const COLLAPSED_WIDTH = 32;

interface PaperTradeRailShellProps {
  /** Expanded width in px — the tab's own resizable/fixed rail width. */
  width: number;
  children: ReactNode;
  /** The tab's existing drag-to-resize separator — rendered only while expanded. Omit for fixed-width rails. */
  resizeHandle?: ReactNode;
  /** Chart Settings' Light Mode — only ChartTab.tsx is theme-aware today; every other call site stays dark-only (unchanged from before this feature). */
  light?: boolean;
}

export function PaperTradeRailShell({ width, children, resizeHandle, light = false }: PaperTradeRailShellProps) {
  const { collapsed, toggle } = usePaperTradeRailCollapse();

  return (
    <>
      {!collapsed && resizeHandle}
      <div
        className="relative flex-shrink-0 transition-all duration-200 ease-in-out"
        style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
      >
        {/* Collapse/expand handle — protrudes past the rail's LEFT edge,
            mirrors Sidebar.tsx's "Gold Toggle Tab" mirrored horizontally. */}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand trading panel' : 'Collapse trading panel'}
          title={collapsed ? 'Expand trading panel' : 'Collapse trading panel'}
          className={cn(
            'group absolute top-1/2 -translate-y-1/2 -left-[16px] z-20 flex h-24 w-[16px] items-center justify-center rounded-l-lg border border-r-0 transition-all duration-300 shadow-[0_0_8px_rgba(201,166,70,0.08)]',
            light
              ? 'bg-gradient-to-b from-[#ffffff] via-[#C9A646]/10 to-[#ffffff] border-[#C9A646]/25 hover:border-[#C9A646]/40'
              : 'bg-gradient-to-b from-[#1A1A1A] via-[#C9A646]/10 to-[#1A1A1A] border-[#C9A646]/25 hover:border-[#C9A646]/40',
          )}
        >
          {collapsed ? (
            <ChevronLeft
              className="h-3.5 w-3.5 text-[#C9A646]/50 group-hover:text-[#C9A646] transition-colors duration-300"
              aria-hidden="true"
            />
          ) : (
            <ChevronRight
              className="h-3.5 w-3.5 text-[#C9A646]/50 group-hover:text-[#C9A646] transition-colors duration-300"
              aria-hidden="true"
            />
          )}
        </button>

        <div
          className={cn(
            'h-full w-full border-l overflow-y-auto overflow-x-hidden',
            light ? 'border-[#e0e3eb] bg-[#ffffff]' : 'border-white/10 bg-[#0A0A0A]',
          )}
        >
          {collapsed ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <span
                className={cn(
                  'text-[10px] font-bold tracking-[0.15em] select-none',
                  light ? 'text-[#8a8d98]' : 'text-[#707070]',
                )}
                style={{ writingMode: 'vertical-rl' }}
              >
                TRADE
              </span>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </>
  );
}
