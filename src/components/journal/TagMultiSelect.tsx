import React, { useState, useRef, useCallback } from 'react';
import { X, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useJournalTags } from '@/hooks/useJournalTags';
import { useNotebook } from '@/hooks/useNotebook';
import type { JournalTag, JournalTagCategory } from '@/hooks/useJournalTags';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface TagMultiSelectProps {
  category: JournalTagCategory;
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  readOnly?: boolean;
  /** Display label, e.g. "Mistakes" or "Mental" */
  label?: string;
}

// ── Chip ──────────────────────────────────────────────────────────────────────

interface ChipProps {
  tag: JournalTag;
  onRemove?: () => void;
  onNotebook?: () => void;
  notebookPending?: boolean;
  isMental: boolean;
}

function Chip({ tag, onRemove, onNotebook, notebookPending, isMental }: ChipProps) {
  const hasNote = tag.notebookEntryId !== null;
  const notebookTitle = hasNote ? 'Open mental note' : 'Create mental note';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        'bg-yellow-600/20 text-yellow-200 border border-yellow-500/30',
      )}
    >
      {tag.name}
      {isMental && onNotebook && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onNotebook(); }}
          disabled={notebookPending}
          title={notebookTitle}
          aria-label={notebookTitle}
          className={cn(
            'ml-0.5 transition-colors',
            hasNote
              ? 'text-[#C9A646] hover:text-yellow-300'
              : 'text-yellow-300/50 hover:text-yellow-200',
            notebookPending && 'opacity-40 cursor-wait',
          )}
        >
          <BookOpen size={10} />
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 text-yellow-300/70 hover:text-yellow-100 transition-colors"
          aria-label={`Remove tag ${tag.name}`}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}

// ── TagMultiSelect ────────────────────────────────────────────────────────────

export function TagMultiSelect({
  category,
  selectedTagIds,
  onChange,
  readOnly = false,
  label,
}: TagMultiSelectProps) {
  const { tags, isLoading, createTag, updateTag } = useJournalTags(category);
  const { createEntryAsync } = useNotebook();
  const navigate = useNavigate();

  const [inputValue, setInputValue] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingTagId, setPendingTagId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isMental = category === 'mental';

  // Tags that are currently selected (preserve order of selectedTagIds)
  const selectedTags = selectedTagIds
    .map(id => tags.find(t => t.id === id))
    .filter((t): t is JournalTag => t !== undefined);

  // Unselected tags filtered by current input
  const filteredOptions = tags.filter(
    t =>
      !selectedTagIds.includes(t.id) &&
      t.name.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const showCreateRow =
    inputValue.trim().length > 0 &&
    !tags.some(t => t.name.toLowerCase() === inputValue.trim().toLowerCase());

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const addTag = useCallback(
    (id: string) => {
      if (!selectedTagIds.includes(id)) {
        onChange([...selectedTagIds, id]);
      }
      setInputValue('');
      setDropdownOpen(false);
    },
    [selectedTagIds, onChange],
  );

  const removeTag = useCallback(
    (id: string) => {
      onChange(selectedTagIds.filter(sid => sid !== id));
    },
    [selectedTagIds, onChange],
  );

  const handleCreate = useCallback(async () => {
    const name = inputValue.trim();
    if (!name) return;
    try {
      const newTag = await createTag({ category, name });
      addTag(newTag.id);
    } catch {
      // leave input intact so user can retry
    }
  }, [inputValue, category, createTag, addTag]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredOptions.length === 1) {
          addTag(filteredOptions[0].id);
        } else if (showCreateRow) {
          void handleCreate();
        }
      } else if (e.key === 'Escape') {
        setDropdownOpen(false);
        setInputValue('');
      } else if (e.key === 'Backspace' && inputValue === '' && selectedTagIds.length > 0) {
        removeTag(selectedTagIds[selectedTagIds.length - 1]);
      }
    },
    [filteredOptions, showCreateRow, handleCreate, addTag, inputValue, selectedTagIds, removeTag],
  );

  // Mental tag → notebook navigation
  const handleNotebook = useCallback(
    async (tag: JournalTag) => {
      if (!isMental) return;

      if (tag.notebookEntryId) {
        // Entry already exists — navigate to notes page.
        // Notes.tsx uses local React state (no URL param) so we can only
        // navigate to the route; the user selects the note from the list.
        navigate('/app/journal/notes');
        return;
      }

      // No linked entry yet — create one and link it.
      setPendingTagId(tag.id);
      try {
        const entry = await createEntryAsync({
          title: tag.name,
          content: '',
          tags: [tag.name],
        });
        await updateTag(tag.id, { notebookEntryId: entry.id });
        navigate('/app/journal/notes');
      } catch {
        // silently surface nothing — entry creation error should not break the tag UI
      } finally {
        setPendingTagId(null);
      }
    },
    [isMental, navigate, createEntryAsync, updateTag],
  );

  // Close dropdown when clicking outside
  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setDropdownOpen(false);
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="flex flex-col gap-1" onBlur={handleBlur}>
      {label && (
        <span className="text-xs font-medium text-ink-secondary uppercase tracking-wide">
          {label}
        </span>
      )}

      {/* Chips + input row */}
      <div
        className={cn(
          'flex flex-wrap gap-1.5 min-h-[2rem] p-1.5 rounded-md',
          'border border-ink-tertiary/30 bg-surface-secondary/40',
          !readOnly && 'cursor-text focus-within:border-[#C9A646]/60',
        )}
        onClick={() => !readOnly && inputRef.current?.focus()}
      >
        {selectedTags.map(tag => (
          <Chip
            key={tag.id}
            tag={tag}
            isMental={isMental}
            onRemove={readOnly ? undefined : () => removeTag(tag.id)}
            onNotebook={isMental ? () => void handleNotebook(tag) : undefined}
            notebookPending={pendingTagId === tag.id}
          />
        ))}

        {!readOnly && (
          <input
            ref={inputRef}
            value={inputValue}
            disabled={isLoading}
            placeholder={selectedTags.length === 0 ? (isLoading ? 'Loading…' : 'Add tags…') : ''}
            onChange={e => {
              setInputValue(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={handleKeyDown}
            className={cn(
              'min-w-[80px] flex-1 bg-transparent text-xs text-ink-primary outline-none',
              'placeholder:text-ink-tertiary',
              isLoading && 'opacity-40 cursor-not-allowed',
            )}
          />
        )}
      </div>

      {/* Dropdown */}
      {!readOnly && dropdownOpen && (filteredOptions.length > 0 || showCreateRow) && (
        <div
          className={cn(
            'z-10 mt-0.5 rounded-md border border-ink-tertiary/30 bg-surface-primary',
            'shadow-lg py-1 max-h-48 overflow-y-auto',
          )}
        >
          {filteredOptions.map(tag => (
            <button
              key={tag.id}
              type="button"
              onMouseDown={e => e.preventDefault()} // prevent blur before click
              onClick={() => addTag(tag.id)}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs text-ink-primary',
                'hover:bg-yellow-600/10 hover:text-yellow-200 transition-colors',
              )}
            >
              {tag.name}
            </button>
          ))}
          {showCreateRow && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => void handleCreate()}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs',
                'text-[#C9A646] hover:bg-yellow-600/10 transition-colors',
              )}
            >
              Create &ldquo;{inputValue.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
