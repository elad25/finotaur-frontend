import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagChipsProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** If true, tags are read-only chips (no add/remove UI) */
  readOnly?: boolean;
  className?: string;
}

/**
 * TagChips — add/remove tag chips.
 * Press comma or Enter to confirm a tag; click X to remove.
 * In readOnly mode, chips are displayed without interaction controls.
 */
export function TagChips({ tags, onChange, readOnly = false, className }: TagChipsProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function commitDraft() {
    const trimmed = draft.trim().replace(/,+$/, '').trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setDraft('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag));
  }

  return (
    <div
      className={cn(
        'flex flex-wrap gap-1.5',
        !readOnly && 'cursor-text',
        className,
      )}
      onClick={() => !readOnly && inputRef.current?.focus()}
    >
      {tags.map(tag => (
        <span
          key={tag}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
            'bg-yellow-600/20 text-yellow-200 border border-yellow-500/30',
          )}
        >
          {tag}
          {!readOnly && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(tag); }}
              className="ml-0.5 text-yellow-300/70 hover:text-yellow-100 transition-colors"
              aria-label={`Remove tag ${tag}`}
            >
              <X size={10} />
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={tags.length === 0 ? 'Add tags...' : ''}
          className={cn(
            'min-w-[80px] flex-1 bg-transparent text-xs text-ink-primary outline-none',
            'placeholder:text-ink-tertiary',
          )}
        />
      )}
    </div>
  );
}
