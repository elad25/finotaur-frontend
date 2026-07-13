/**
 * Trading Arena — bottom workspace tab strip (NinjaTrader-style).
 *
 * Each tab is an independent workspace remembering { view, symbol, interval,
 * assetClass } (see ../hooks/useArenaWorkspaces.ts). This component is fully
 * controlled/presentational — all state lives in the hook, this only renders
 * + emits intent callbacks. Mounted as the third flex child in
 * TradingArena.tsx's root column, after the ChartStyleContext.Provider block.
 *
 * Interactions:
 *   - Click a tab           → onSelect(id)
 *   - Hover a tab           → reveals a small "×" close button (hidden when
 *                              only one workspace exists — there must always
 *                              be at least one)
 *   - Double-click a tab    → inline rename (swaps the label for an <input>,
 *                              commits on Enter/blur, Escape cancels)
 *   - "+" button            → onAdd() (clones the active workspace's context)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRADING_ARENA_TABS } from '../types';
import type { ArenaWorkspace } from '../hooks/useArenaWorkspaces';

interface ArenaWorkspaceTabsProps {
  workspaces: ArenaWorkspace[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

/** Auto-label for a workspace with no custom name: "15m BTCUSDT" (+ " · Liquidity" suffix when view !== 'chart'). */
function autoLabel(ws: ArenaWorkspace): string {
  const base = `${ws.interval} ${ws.symbol}`;
  if (ws.view === 'chart') return base;
  const tabLabel = TRADING_ARENA_TABS.find((t) => t.id === ws.view)?.label ?? ws.view;
  return `${base} · ${tabLabel}`;
}

function workspaceLabel(ws: ArenaWorkspace): string {
  return ws.name && ws.name.trim().length > 0 ? ws.name : autoLabel(ws);
}

export function ArenaWorkspaceTabs({
  workspaces,
  activeId,
  onSelect,
  onAdd,
  onRemove,
  onRename,
}: ArenaWorkspaceTabsProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) inputRef.current?.select();
  }, [renamingId]);

  const beginRename = useCallback((ws: ArenaWorkspace) => {
    setRenamingId(ws.id);
    setDraftName(ws.name ?? '');
  }, []);

  const commitRename = useCallback(() => {
    if (renamingId) onRename(renamingId, draftName);
    setRenamingId(null);
  }, [renamingId, draftName, onRename]);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
  }, []);

  const canClose = workspaces.length > 1;

  return (
    <div
      className="flex flex-shrink-0 items-center gap-0.5 px-1.5 border-t overflow-x-auto"
      style={{
        height: '30px',
        borderColor: 'rgba(201,166,70,0.15)',
        background: '#0A0A0B',
      }}
      role="tablist"
      aria-label="Workspaces"
    >
      {workspaces.map((ws) => {
        const active = ws.id === activeId;
        const isRenaming = renamingId === ws.id;

        return (
          <div
            key={ws.id}
            className={cn(
              'group relative flex items-center gap-1.5 h-[24px] rounded px-2 text-[11px] font-medium whitespace-nowrap transition-colors duration-150 flex-shrink-0 cursor-pointer',
              active
                ? 'bg-[rgba(201,166,70,0.12)] text-[#E8E8E8] border-b-2 border-[#C9A646]'
                : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-b-2 border-transparent',
            )}
            role="tab"
            aria-selected={active}
            tabIndex={0}
            onClick={() => !isRenaming && onSelect(ws.id)}
            onDoubleClick={() => beginRename(ws)}
            onKeyDown={(e) => {
              if (isRenaming) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(ws.id);
              }
            }}
          >
            {isRenaming ? (
              <input
                ref={inputRef}
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitRename();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelRename();
                  }
                }}
                placeholder={autoLabel(ws)}
                className="h-[18px] w-[120px] bg-transparent border border-[rgba(201,166,70,0.4)] rounded px-1 text-[11px] text-[#E8E8E8] outline-none"
              />
            ) : (
              <span>{workspaceLabel(ws)}</span>
            )}

            {!isRenaming && canClose && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(ws.id);
                }}
                aria-label={`Close ${workspaceLabel(ws)}`}
                className="hidden group-hover:flex items-center justify-center h-3.5 w-3.5 rounded-sm text-[#707070] hover:text-[#E8E8E8] hover:bg-[rgba(255,255,255,0.1)] transition-colors duration-150 flex-shrink-0"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAdd}
        aria-label="Add workspace"
        className="flex items-center justify-center h-[22px] w-[22px] rounded text-[#707070] hover:text-[#C9A646] hover:bg-[rgba(201,166,70,0.08)] transition-colors duration-150 flex-shrink-0"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
