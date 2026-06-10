import React, { useState, useMemo } from 'react';
import { Search, Pin, Plus, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ds/Button';
import type { NotebookEntry, NotebookFolder } from '@/hooks/useNotebook';

dayjs.extend(relativeTime);

interface EntryListProps {
  entries: NotebookEntry[];
  folders: NotebookFolder[];
  selectedFolderId: string | null;
  selectedEntryId: string | null;
  onSelectEntry: (id: string) => void;
  onCreateEntry: () => void;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-500/30 text-yellow-100 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function getSnippet(content: string, query: string, maxLen = 80): string {
  if (!content) return '';
  if (!query) return content.slice(0, maxLen);
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, maxLen);
  const start = Math.max(0, idx - 20);
  const snippet = content.slice(start, start + maxLen);
  return (start > 0 ? '...' : '') + snippet + (start + maxLen < content.length ? '...' : '');
}

export function EntryList({
  entries,
  folders,
  selectedFolderId,
  selectedEntryId,
  onSelectEntry,
  onCreateEntry,
}: EntryListProps) {
  const [query, setQuery] = useState('');

  // Filter by folder
  const folderFiltered = useMemo(() => {
    if (selectedFolderId === null) return entries; // "All Notes"
    return entries.filter(e => e.folderId === selectedFolderId);
  }, [entries, selectedFolderId]);

  // Filter by search query (title, content, tags)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return folderFiltered;
    return folderFiltered.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q)),
    );
  }, [folderFiltered, query]);

  const folderName = useMemo(() => {
    if (selectedFolderId === null) return 'All Notes';
    return folders.find(f => f.id === selectedFolderId)?.name ?? 'Notes';
  }, [folders, selectedFolderId]);

  const q = query.trim().toLowerCase();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-border-ds-subtle">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-ink-primary truncate">{folderName}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-ink-secondary hover:text-yellow-300"
            onClick={onCreateEntry}
            title="New note"
          >
            <Plus size={15} />
          </Button>
        </div>
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full rounded-lg bg-surface-1 border border-border-ds-subtle pl-7 pr-3 py-1.5 text-xs text-ink-primary outline-none focus:border-yellow-500/40 focus:ring-1 focus:ring-yellow-500/20 placeholder:text-ink-tertiary transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState hasSearch={!!query} onCreateEntry={onCreateEntry} />
        ) : (
          <ul>
            {filtered.map(entry => (
              <EntryRow
                key={entry.id}
                entry={entry}
                query={q}
                isSelected={selectedEntryId === entry.id}
                onSelect={() => onSelectEntry(entry.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── EntryRow ──────────────────────────────────────────────────────────────────

interface EntryRowProps {
  entry: NotebookEntry;
  query: string;
  isSelected: boolean;
  onSelect: () => void;
}

function EntryRow({ entry, query, isSelected, onSelect }: EntryRowProps) {
  const title = entry.title || 'Untitled';
  const snippet = getSnippet(entry.content, query);
  const updatedAt = dayjs(entry.updatedAt).fromNow();

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full text-left px-3 py-3 border-b border-border-ds-subtle transition-colors',
          isSelected
            ? 'bg-yellow-600/20 border-l-2 border-l-yellow-500'
            : 'hover:bg-white/[0.03] border-l-2 border-l-transparent',
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <span className={cn('text-sm font-medium truncate', isSelected ? 'text-yellow-100' : 'text-ink-primary')}>
            {highlight(title, query)}
          </span>
          {entry.pinned && (
            <Pin size={11} className="shrink-0 mt-0.5 text-yellow-400 rotate-45" />
          )}
        </div>
        {snippet && (
          <p className="text-xs text-ink-tertiary line-clamp-2 leading-relaxed mb-1">
            {highlight(snippet, query)}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-yellow-600/15 px-1.5 py-0 text-[10px] text-yellow-300/80 border border-yellow-500/20"
                >
                  {highlight(tag, query)}
                </span>
              ))}
              {entry.tags.length > 3 && (
                <span className="text-[10px] text-ink-tertiary">+{entry.tags.length - 3}</span>
              )}
            </div>
          )}
          <span className="text-[10px] text-ink-tertiary ml-auto shrink-0">{updatedAt}</span>
        </div>
      </button>
    </li>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ hasSearch, onCreateEntry }: { hasSearch: boolean; onCreateEntry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
      <FileText size={36} className="text-ink-tertiary mb-3 opacity-50" />
      {hasSearch ? (
        <p className="text-sm text-ink-secondary">No notes match your search.</p>
      ) : (
        <>
          <p className="text-sm text-ink-secondary mb-1">No notes yet</p>
          <p className="text-xs text-ink-tertiary mb-4">
            Capture your trading ideas, strategies, and lessons.
          </p>
          <Button variant="goldOutline" size="sm" onClick={onCreateEntry} showArrow={false}>
            Create first note
          </Button>
        </>
      )}
    </div>
  );
}
