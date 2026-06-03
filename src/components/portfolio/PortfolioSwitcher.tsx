// src/components/portfolio/PortfolioSwitcher.tsx
// ═══════════════════════════════════════════════════════════════
// Dropdown to switch, rename, delete, and create portfolios.
// Consumed by MyPortfolioPage inside the page header.
// ═══════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown, Pencil, Trash2, Check, X } from 'lucide-react';
import type { PortfolioSummary } from '@/hooks/useUserPortfolios';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────

export interface PortfolioSwitcherProps {
  portfolios: PortfolioSummary[];
  activeId: string | null;
  maxPortfolios: number;
  canCreate: boolean;
  saving: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

// ── Component ──────────────────────────────────────────────────

export function PortfolioSwitcher({
  portfolios,
  activeId,
  maxPortfolios,
  canCreate,
  saving,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: PortfolioSwitcherProps) {
  const [open, setOpen] = useState(false);
  // Id being renamed (inline edit), or null
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // Id pending delete confirmation (second-click confirm), or null
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activePortfolio = portfolios.find((p) => p.id === activeId);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setRenamingId(null);
        setConfirmDeleteId(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus rename input when it becomes visible
  useEffect(() => {
    if (renamingId !== null) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingId]);

  function startRename(id: string, currentName: string) {
    setConfirmDeleteId(null);
    setRenamingId(id);
    setRenameValue(currentName);
  }

  async function commitRename(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== portfolios.find((p) => p.id === id)?.name) {
      await onRename(id, trimmed);
    }
    setRenamingId(null);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>, id: string) {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(id); }
    if (e.key === 'Escape') { setRenamingId(null); }
  }

  async function handleDeleteConfirm(id: string) {
    setConfirmDeleteId(null);
    setOpen(false);
    await onDelete(id);
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1',
          'text-ink-primary text-base font-semibold',
          'hover:bg-surface-1 transition-colors',
          open && 'bg-surface-1',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="max-w-[180px] truncate">
          {activePortfolio?.name ?? 'My Portfolio'}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-ink-secondary shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute left-0 top-full mt-1 z-50',
            'min-w-[240px] rounded-md shadow-xl',
            'bg-surface-base border border-border-ds-subtle',
          )}
          role="listbox"
        >
          {/* Portfolio list */}
          {portfolios.map((p) => {
            const isActive = p.id === activeId;
            const isRenaming = renamingId === p.id;
            const isConfirmingDelete = confirmDeleteId === p.id;

            return (
              <div
                key={p.id}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2',
                  'border-b border-border-ds-subtle last:border-b-0',
                  !isRenaming && 'hover:bg-surface-1 cursor-pointer',
                )}
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  if (isRenaming) return;
                  onSelect(p.id);
                  setOpen(false);
                  setConfirmDeleteId(null);
                }}
              >
                {/* Active indicator */}
                <span className="shrink-0 w-3.5">
                  {isActive && !isRenaming && (
                    <Check className="h-3.5 w-3.5 text-gold-primary" />
                  )}
                </span>

                {/* Name / rename input */}
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => handleRenameKeyDown(e, p.id)}
                    onBlur={() => commitRename(p.id)}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'flex-1 min-w-0 bg-surface-1 border border-gold-primary rounded px-2 py-0.5',
                      'text-sm text-ink-primary focus:outline-none',
                    )}
                  />
                ) : (
                  <span className="flex-1 min-w-0 truncate text-sm text-ink-primary">
                    {p.name}
                  </span>
                )}

                {/* Action buttons — only when not renaming */}
                {!isRenaming && (
                  <div
                    className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Rename */}
                    <button
                      type="button"
                      onClick={() => startRename(p.id, p.name)}
                      className="rounded p-0.5 text-ink-tertiary hover:text-ink-secondary hover:bg-surface-2 transition-colors"
                      aria-label={`Rename ${p.name}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>

                    {/* Delete — two-click confirm */}
                    {isConfirmingDelete ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteConfirm(p.id)}
                        disabled={saving}
                        className="rounded px-1 py-0.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-surface-1 transition-colors"
                        aria-label={`Confirm delete ${p.name}`}
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="rounded p-0.5 text-ink-tertiary hover:text-red-400 hover:bg-surface-2 transition-colors"
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}

                    {/* Cancel confirm */}
                    {isConfirmingDelete && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded p-0.5 text-ink-tertiary hover:text-ink-secondary hover:bg-surface-2 transition-colors"
                        aria-label="Cancel delete"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* + New Portfolio */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onNew();
            }}
            disabled={saving}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
              canCreate
                ? 'text-gold-primary hover:text-gold-bright hover:bg-surface-1'
                : 'text-ink-tertiary cursor-not-allowed',
            )}
          >
            <span className="text-base leading-none">+</span>
            <span>New Portfolio</span>
            {!canCreate && (
              <span className="ml-auto text-xs text-ink-tertiary">
                {portfolios.length}/{maxPortfolios}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
