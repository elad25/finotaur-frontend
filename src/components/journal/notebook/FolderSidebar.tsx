import React, { useState } from 'react';
import { FolderOpen, FolderPlus, MoreHorizontal, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ds/Button';
import type { NotebookFolder, NotebookEntry } from '@/hooks/useNotebook';

interface FolderSidebarProps {
  folders: NotebookFolder[];
  entries: NotebookEntry[];
  selectedFolderId: string | null | 'all';
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string, color?: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
}

/** Returns count of entries for a given folderId (null = unfiled = shown under "All Notes") */
function countForFolder(entries: NotebookEntry[], folderId: string | null): number {
  if (folderId === null) return entries.length; // "All Notes" = everything
  return entries.filter(e => e.folderId === folderId).length;
}

const FOLDER_COLORS = [
  '#C9A646', // gold
  '#60a5fa', // blue
  '#4ade80', // green
  '#f87171', // red
  '#c084fc', // purple
  '#fb923c', // orange
];

export function FolderSidebar({
  folders,
  entries,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderSidebarProps) {
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<string | undefined>(undefined);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function submitCreate() {
    const name = newFolderName.trim();
    if (!name) return;
    onCreateFolder(name, newFolderColor);
    setNewFolderName('');
    setNewFolderColor(undefined);
    setCreatingFolder(false);
  }

  function cancelCreate() {
    setNewFolderName('');
    setNewFolderColor(undefined);
    setCreatingFolder(false);
  }

  function startRename(folder: NotebookFolder) {
    setRenamingId(folder.id);
    setRenameValue(folder.name);
    setOpenMenuId(null);
  }

  function submitRename(id: string) {
    const name = renameValue.trim();
    if (name) onRenameFolder(id, name);
    setRenamingId(null);
  }

  function confirmDelete(id: string) {
    setDeletingId(id);
    setOpenMenuId(null);
  }

  function executeDelete(id: string) {
    onDeleteFolder(id);
    setDeletingId(null);
    // If we deleted the selected folder, move to "All Notes"
    if (selectedFolderId === id) onSelectFolder(null);
  }

  const isAllSelected = selectedFolderId === null || selectedFolderId === 'all';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 mb-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary">
          Folders
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-ink-secondary hover:text-yellow-300"
          onClick={() => setCreatingFolder(true)}
          title="New folder"
        >
          <FolderPlus size={15} />
        </Button>
      </div>

      {/* "All Notes" pseudo-folder */}
      <FolderRow
        label="All Notes"
        count={entries.length}
        isSelected={isAllSelected}
        onClick={() => onSelectFolder(null)}
        color={null}
        icon={<FolderOpen size={14} />}
      />

      {/* User folders */}
      <div className="flex-1 overflow-y-auto space-y-0.5 mt-1">
        {folders.map(folder => {
          const count = countForFolder(entries, folder.id);
          const isSelected = selectedFolderId === folder.id;

          if (renamingId === folder.id) {
            return (
              <div key={folder.id} className="flex items-center gap-1 px-2 py-1">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitRename(folder.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onBlur={() => submitRename(folder.id)}
                  className="flex-1 rounded bg-surface-1 border border-ds-default px-2 py-0.5 text-sm text-ink-primary outline-none focus:ring-1 focus:ring-yellow-500/40"
                />
                <button
                  type="button"
                  onClick={() => submitRename(folder.id)}
                  className="text-yellow-400 hover:text-yellow-200"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setRenamingId(null)}
                  className="text-ink-tertiary hover:text-ink-secondary"
                >
                  <X size={13} />
                </button>
              </div>
            );
          }

          if (deletingId === folder.id) {
            const entryCount = countForFolder(entries, folder.id);
            return (
              <div key={folder.id} className="mx-2 rounded-lg border border-red-500/30 bg-red-900/20 p-2 text-xs">
                <p className="text-red-300 mb-1.5">
                  Delete <strong>"{folder.name}"</strong>?
                  {entryCount > 0 && (
                    <span className="block text-red-400/80 mt-0.5">
                      {entryCount} note{entryCount !== 1 ? 's' : ''} will become unfiled.
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => executeDelete(folder.id)}
                    className="rounded px-2 py-0.5 bg-red-700/60 text-red-100 hover:bg-red-700 text-xs"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(null)}
                    className="rounded px-2 py-0.5 text-ink-secondary hover:text-ink-primary text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={folder.id}
              className="relative group"
              onMouseLeave={() => setOpenMenuId(null)}
            >
              <FolderRow
                label={folder.name}
                count={count}
                isSelected={isSelected}
                onClick={() => onSelectFolder(folder.id)}
                color={folder.color}
              />
              {/* Hover context menu trigger */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === folder.id ? null : folder.id);
                }}
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2',
                  'h-6 w-6 flex items-center justify-center rounded',
                  'text-ink-tertiary hover:text-ink-secondary hover:bg-white/5',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  openMenuId === folder.id && 'opacity-100',
                )}
              >
                <MoreHorizontal size={13} />
              </button>

              {openMenuId === folder.id && (
                <div className="absolute right-2 top-8 z-20 min-w-[120px] rounded-lg border border-ds-default bg-surface-1 shadow-lg py-1">
                  <button
                    type="button"
                    onClick={() => startRename(folder)}
                    className="w-full px-3 py-1.5 text-left text-xs text-ink-secondary hover:text-ink-primary hover:bg-white/5"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(folder.id)}
                    className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    Delete folder
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New folder form */}
      {creatingFolder && (
        <div className="px-2 pt-2 pb-1 border-t border-ds-subtle mt-auto">
          <p className="text-xs text-ink-tertiary mb-1.5">New folder</p>
          <input
            autoFocus
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') submitCreate();
              if (e.key === 'Escape') cancelCreate();
            }}
            placeholder="Folder name..."
            className="w-full rounded bg-surface-1 border border-ds-default px-2 py-1 text-sm text-ink-primary outline-none focus:ring-1 focus:ring-yellow-500/40 mb-2"
          />
          {/* Color picker */}
          <div className="flex items-center gap-1.5 mb-2">
            {FOLDER_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setNewFolderColor(newFolderColor === c ? undefined : c)}
                className={cn(
                  'h-4 w-4 rounded-full border-2 transition-transform',
                  newFolderColor === c
                    ? 'border-white scale-110'
                    : 'border-transparent hover:scale-110',
                )}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={cancelCreate}>
              Cancel
            </Button>
            <Button
              variant="goldOutline"
              size="sm"
              className="flex-1 text-xs"
              onClick={submitCreate}
              disabled={!newFolderName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FolderRow helper ──────────────────────────────────────────────────────────

interface FolderRowProps {
  label: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
  color: string | null;
  icon?: React.ReactNode;
}

function FolderRow({ label, count, isSelected, onClick, color, icon }: FolderRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-left transition-colors',
        isSelected
          ? 'bg-yellow-600/25 text-yellow-100 border border-yellow-500/40'
          : 'text-ink-secondary hover:bg-white/5 hover:text-ink-primary border border-transparent',
      )}
    >
      {/* Color dot or folder icon */}
      {color ? (
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      ) : (
        <span className={cn('shrink-0', isSelected ? 'text-yellow-300' : 'text-ink-tertiary')}>
          {icon ?? <FolderOpen size={14} />}
        </span>
      )}
      <span className="flex-1 truncate font-medium">{label}</span>
      <span
        className={cn(
          'text-xs shrink-0',
          isSelected ? 'text-yellow-300/80' : 'text-ink-tertiary',
        )}
      >
        {count}
      </span>
    </button>
  );
}
