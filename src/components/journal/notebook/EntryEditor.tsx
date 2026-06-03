import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Pin, Trash2, FolderInput, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ds/Button';
import { TagChips } from './TagChips';
import type { NotebookEntry, NotebookFolder } from '@/hooks/useNotebook';

interface EntryEditorProps {
  entry: NotebookEntry;
  folders: NotebookFolder[];
  onUpdate: (id: string, partial: Partial<Pick<NotebookEntry, 'folderId' | 'title' | 'content' | 'tags' | 'pinned'>>) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

type SaveState = 'saved' | 'dirty' | 'saving';

const AUTOSAVE_DELAY_MS = 1200;

export function EntryEditor({ entry, folders, onUpdate, onDelete, onTogglePin }: EntryEditorProps) {
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [tags, setTags] = useState(entry.tags);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when the selected entry changes externally
  useEffect(() => {
    setTitle(entry.title);
    setContent(entry.content);
    setTags(entry.tags);
    setSaveState('saved');
    setShowDeleteConfirm(false);
  }, [entry.id]); // intentional: only reset when entry ID changes

  const persist = useCallback(
    (patch: Partial<Pick<NotebookEntry, 'title' | 'content' | 'tags' | 'folderId' | 'pinned'>>) => {
      setSaveState('saving');
      onUpdate(entry.id, patch);
      // Optimistically flip to "saved" — the hook's mutation will invalidate
      setTimeout(() => setSaveState('saved'), 600);
    },
    [entry.id, onUpdate],
  );

  // Debounced save for title/content
  const scheduleSave = useCallback(
    (patch: { title?: string; content?: string }) => {
      setSaveState('dirty');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        persist(patch);
      }, AUTOSAVE_DELAY_MS);
    },
    [persist],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    scheduleSave({ title: e.target.value, content });
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    scheduleSave({ title, content: e.target.value });
  }

  function handleBlur() {
    if (saveState === 'dirty') {
      if (timerRef.current) clearTimeout(timerRef.current);
      persist({ title, content });
    }
  }

  function handleTagsChange(newTags: string[]) {
    setTags(newTags);
    persist({ tags: newTags });
  }

  function handleMoveToFolder(folderId: string | null) {
    onUpdate(entry.id, { folderId });
    setShowFolderPicker(false);
  }

  function handleDelete() {
    onDelete(entry.id);
  }

  const currentFolder = folders.find(f => f.id === entry.folderId);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-ds-subtle shrink-0">
        {/* Left: folder picker + save state */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFolderPicker(v => !v)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-secondary hover:text-ink-primary hover:bg-white/5 transition-colors border border-ds-subtle"
            >
              <FolderInput size={12} />
              <span className="truncate max-w-[120px]">{currentFolder?.name ?? 'Unfiled'}</span>
              <ChevronDown size={11} className="shrink-0 text-ink-tertiary" />
            </button>

            {showFolderPicker && (
              <div className="absolute top-8 left-0 z-20 min-w-[160px] rounded-lg border border-ds-default bg-surface-1 shadow-lg py-1">
                <FolderOption
                  label="Unfiled"
                  isActive={entry.folderId === null}
                  color={null}
                  onClick={() => handleMoveToFolder(null)}
                />
                {folders.map(f => (
                  <FolderOption
                    key={f.id}
                    label={f.name}
                    isActive={entry.folderId === f.id}
                    color={f.color}
                    onClick={() => handleMoveToFolder(f.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Save state indicator */}
          <SaveIndicator state={saveState} />
        </div>

        {/* Right: pin + delete */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onTogglePin(entry.id)}
            title={entry.pinned ? 'Unpin' : 'Pin note'}
            className={cn(
              'h-7 w-7 flex items-center justify-center rounded-md transition-colors',
              entry.pinned
                ? 'text-yellow-400 bg-yellow-600/20 hover:bg-yellow-600/30'
                : 'text-ink-tertiary hover:text-yellow-300 hover:bg-white/5',
            )}
          >
            <Pin size={13} className={entry.pinned ? 'rotate-45' : ''} />
          </button>

          {showDeleteConfirm ? (
            <div className="flex items-center gap-1 rounded-md border border-red-500/40 bg-red-900/20 px-2 py-0.5">
              <span className="text-xs text-red-300 mr-1">Delete?</span>
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs text-red-300 hover:text-red-100 font-medium"
              >
                Yes
              </button>
              <span className="text-ink-tertiary text-xs">/</span>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs text-ink-secondary hover:text-ink-primary"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete note"
              className="h-7 w-7 flex items-center justify-center rounded-md text-ink-tertiary hover:text-red-400 hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="px-5 pt-4 pb-2 shrink-0">
        <input
          value={title}
          onChange={handleTitleChange}
          onBlur={handleBlur}
          placeholder="Untitled"
          className="w-full bg-transparent text-xl font-semibold text-ink-primary outline-none placeholder:text-ink-tertiary"
        />
      </div>

      {/* Tags */}
      <div className="px-5 pb-3 shrink-0 border-b border-ds-subtle">
        <TagChips tags={tags} onChange={handleTagsChange} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <textarea
          value={content}
          onChange={handleContentChange}
          onBlur={handleBlur}
          placeholder="Start writing your note..."
          className="w-full h-full min-h-[200px] bg-transparent text-sm text-ink-primary leading-relaxed outline-none resize-none placeholder:text-ink-tertiary"
        />
      </div>
    </div>
  );
}

// ── FolderOption ──────────────────────────────────────────────────────────────

function FolderOption({
  label,
  isActive,
  color,
  onClick,
}: {
  label: string;
  isActive: boolean;
  color: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ink-secondary hover:text-ink-primary hover:bg-white/5 transition-colors"
    >
      {color ? (
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      ) : (
        <span className="h-2 w-2 rounded-full shrink-0 bg-ink-tertiary/40" />
      )}
      <span className="flex-1 text-left truncate">{label}</span>
      {isActive && <Check size={11} className="text-yellow-400 shrink-0" />}
    </button>
  );
}

// ── SaveIndicator ──────────────────────────────────────────────────────────────

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'saved') {
    return <span className="text-[10px] text-ink-tertiary">Saved</span>;
  }
  if (state === 'dirty') {
    return <span className="text-[10px] text-ink-tertiary">Unsaved</span>;
  }
  return (
    <span className="text-[10px] text-yellow-400/70 flex items-center gap-1">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
      Saving...
    </span>
  );
}
