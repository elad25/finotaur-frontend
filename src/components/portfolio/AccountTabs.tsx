// src/components/portfolio/AccountTabs.tsx
// ═══════════════════════════════════════════════════════════════
// Horizontal tab row for portfolio accounts.
// Active tab underlined (gold). Per-tab dropdown: Rename + Remove.
// "+" button at the end to add accounts.
// ═══════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { PortfolioAccount } from '@/lib/portfolio/types';
import { cn } from '@/lib/utils';

export interface AccountTabsProps {
  accounts: PortfolioAccount[];
  activeIndex: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onRename: (i: number, name: string) => void;
  onRemove: (i: number) => void;
}

export function AccountTabs({
  accounts,
  activeIndex,
  onSelect,
  onAdd,
  onRename,
  onRemove,
}: AccountTabsProps) {
  // Index of the tab whose dropdown is open; null when none
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  // Index of the tab currently being renamed inline
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus the rename input when it appears
  useEffect(() => {
    if (renamingIndex !== null) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingIndex]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdownIndex(null);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function startRename(index: number) {
    setRenamingIndex(index);
    setRenameValue(accounts[index]?.name ?? '');
    setOpenDropdownIndex(null);
  }

  function commitRename() {
    if (renamingIndex !== null) {
      const trimmed = renameValue.trim();
      if (trimmed) {
        onRename(renamingIndex, trimmed);
      }
    }
    setRenamingIndex(null);
    setRenameValue('');
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') {
      setRenamingIndex(null);
      setRenameValue('');
    }
  }

  return (
    <div ref={containerRef} className="flex items-center gap-0.5 border-b border-border-ds-subtle">
      {accounts.map((account, i) => {
        const isActive = i === activeIndex;
        const isRenaming = renamingIndex === i;

        return (
          <div key={i} className="relative flex items-stretch">
            {/* Tab button */}
            <button
              type="button"
              onClick={() => {
                onSelect(i);
                setOpenDropdownIndex(null);
              }}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'text-gold-primary border-b-2 border-gold-primary -mb-px'
                  : 'text-ink-secondary hover:text-ink-primary border-b-2 border-transparent -mb-px',
              )}
            >
              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleRenameKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-surface-1 border border-border-ds-subtle rounded px-1.5 py-0.5 text-sm text-ink-primary w-24 focus:outline-none focus:border-gold-primary"
                />
              ) : (
                <span>{account.name}</span>
              )}
            </button>

            {/* Dropdown caret — only visible on active tab */}
            {isActive && !isRenaming && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdownIndex(openDropdownIndex === i ? null : i);
                }}
                className="px-1 py-2 text-ink-secondary hover:text-ink-primary transition-colors"
                aria-label="Account options"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            )}

            {/* Dropdown menu */}
            {openDropdownIndex === i && (
              <div className="absolute top-full left-0 mt-1 z-50 w-36 rounded-md border border-border-ds-subtle bg-surface-1 shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => startRename(i)}
                  className="w-full text-left px-3 py-2 text-sm text-ink-primary hover:bg-white/5 transition-colors"
                >
                  Rename
                </button>
                <button
                  type="button"
                  disabled={accounts.length <= 1}
                  onClick={() => {
                    onRemove(i);
                    setOpenDropdownIndex(null);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm transition-colors',
                    accounts.length <= 1
                      ? 'text-ink-tertiary cursor-not-allowed'
                      : 'text-num-negative hover:bg-white/5',
                  )}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Add account button */}
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1 px-2 py-2 text-sm text-ink-secondary hover:text-ink-primary transition-colors"
        aria-label="Add account"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
