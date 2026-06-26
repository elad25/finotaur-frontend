// src/components/community/SharedNotePanel.tsx
// Collaborative living note for a 1:1 mentor review.
//
// Both the mentor and the student see and edit the same note. Changes are
// debounced (~800ms) so typing feels instant. The hook's realtime subscription
// invalidates the query on remote edits — both parties stay in sync.
//
// Sections:
//   Goal   — one-line focus statement (e.g. "trail stops on every runner")
//   Body   — the living collaborative content
//   History — collapsible revision log, newest first

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronRight, History, NotebookPen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useSharedNote,
  useNoteRevisions,
  useUpdateSharedNote,
} from '@/features/mentor/hooks/useSharedNote';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Relative time helper — "2m ago", "3h ago", "5d ago". */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Truncate a string to maxLen chars, appending "…" if cut. */
function truncate(text: string, maxLen = 80): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}

// ── Save indicator ────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  return (
    <span
      className={cn(
        'font-sans text-[11px] font-medium transition-opacity duration-300',
        state === 'saving' && 'text-ink-tertiary',
        state === 'saved' && 'text-[#10b981]',
        state === 'error' && 'text-status-error',
      )}
    >
      {state === 'saving' && 'Saving…'}
      {state === 'saved' && 'Saved'}
      {state === 'error' && 'Save failed — check connection'}
    </span>
  );
}

// ── Revision history ──────────────────────────────────────────────────────────

interface RevisionHistoryProps {
  reviewId: string;
}

function RevisionHistory({ reviewId }: RevisionHistoryProps) {
  const [open, setOpen] = useState(false);
  const { revisions, isLoading } = useNoteRevisions(open ? reviewId : undefined);

  return (
    <div className="flex flex-col gap-ds-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-ds-1 w-fit',
          'font-sans text-[12px] font-medium text-ink-tertiary',
          'hover:text-ink-secondary transition-colors duration-base ease-out',
        )}
      >
        {open ? (
          <ChevronDown size={13} aria-hidden="true" />
        ) : (
          <ChevronRight size={13} aria-hidden="true" />
        )}
        <History size={13} aria-hidden="true" />
        Revision history
      </button>

      {open && (
        <div
          className={cn(
            'rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-2',
            'px-ds-3 py-ds-3',
            'max-h-[260px] overflow-y-auto',
          )}
        >
          {isLoading ? (
            <p className="font-sans text-[12px] text-ink-tertiary">Loading history…</p>
          ) : revisions.length === 0 ? (
            <p className="font-sans text-[12px] text-ink-tertiary">No revisions yet.</p>
          ) : (
            <div className="flex flex-col gap-ds-3">
              {revisions.map((rev) => (
                <div key={rev.id} className="flex flex-col gap-[3px]">
                  {/* Editor row */}
                  <div className="flex items-baseline gap-ds-2">
                    <span className="font-sans text-[12px] font-medium text-ink-primary">
                      {rev.editor_name}
                    </span>
                    <span className="font-sans text-[11px] text-ink-tertiary">
                      {relativeTime(rev.created_at)}
                    </span>
                  </div>

                  {/* Goal diff (only show if non-empty) */}
                  {rev.goal && (
                    <span className="font-sans text-[11px] text-ink-secondary italic">
                      Goal: {truncate(rev.goal, 60)}
                    </span>
                  )}

                  {/* Body preview */}
                  {rev.body && (
                    <p className="font-sans text-[12px] text-ink-tertiary leading-relaxed">
                      {truncate(rev.body)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface SharedNotePanelProps {
  reviewId: string;
}

const DEBOUNCE_MS = 800;

export function SharedNotePanel({ reviewId }: SharedNotePanelProps) {
  const { note, isLoading, isError } = useSharedNote(reviewId);
  const { mutateAsync: updateNote } = useUpdateSharedNote();

  // Local edit state
  const [goal, setGoal] = useState('');
  const [body, setBody] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // Track whether we have initialised local state from the server value.
  // We only sync from server on FIRST load (or when reviewId changes) — after
  // that, local state leads (the user is typing) while realtime handles the
  // other party's edits by triggering a refetch, which we then apply if the
  // field is not currently being edited.
  const initialisedRef = useRef(false);
  const activeFieldRef = useRef<'goal' | 'body' | null>(null);

  // Initialise / re-sync when server note arrives (initial load or realtime push)
  useEffect(() => {
    if (!note) return;

    if (!initialisedRef.current) {
      // First load: populate unconditionally
      setGoal(note.goal ?? '');
      setBody(note.body ?? '');
      initialisedRef.current = true;
    } else {
      // Realtime update from the other party: only update fields the local
      // user is NOT currently typing in.
      if (activeFieldRef.current !== 'goal') setGoal(note.goal ?? '');
      if (activeFieldRef.current !== 'body') setBody(note.body ?? '');
    }
  }, [note]);

  // Reset when reviewId changes
  useEffect(() => {
    initialisedRef.current = false;
    setGoal('');
    setBody('');
    setSaveState('idle');
  }, [reviewId]);

  // ── Debounced save ────────────────────────────────────────────────────────
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(
    (nextGoal: string, nextBody: string) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setSaveState('saving');
      debounceTimerRef.current = setTimeout(async () => {
        try {
          await updateNote({ reviewId, goal: nextGoal, body: nextBody });
          setSaveState('saved');
          // Fade the "Saved" indicator back to idle after 2s
          setTimeout(() => setSaveState('idle'), 2000);
        } catch {
          setSaveState('error');
        }
      }, DEBOUNCE_MS);
    },
    [reviewId, updateNote],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // ── Input handlers ────────────────────────────────────────────────────────
  function handleGoalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setGoal(val);
    scheduleSave(val, body);
  }

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setBody(val);
    scheduleSave(goal, val);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="px-ds-4 py-ds-4">
        <p className="font-sans text-[13px] text-ink-tertiary">Loading shared note…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-ds-4 py-ds-4">
        <p className="font-sans text-[13px] text-status-error">
          Could not load shared note. Please refresh.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-ds-4',
        'rounded-[12px] border-[0.5px] border-border-ds-subtle',
        'bg-surface-2 px-ds-4 py-ds-4',
      )}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between gap-ds-3">
        <div className="flex items-center gap-ds-2">
          <NotebookPen size={14} className="text-gold-primary shrink-0" aria-hidden="true" />
          <span className="font-sans text-[13px] font-semibold text-ink-primary">
            Shared Note
          </span>
          <span className="font-sans text-[11px] text-ink-tertiary">
            — visible to mentor and student
          </span>
        </div>
        <SaveIndicator state={saveState} />
      </div>

      {/* Goal field */}
      <div className="flex flex-col gap-ds-1">
        <label
          htmlFor={`shared-note-goal-${reviewId}`}
          className="font-sans text-[11px] font-semibold tracking-[0.8px] uppercase text-ink-tertiary"
        >
          Goal
        </label>
        <input
          id={`shared-note-goal-${reviewId}`}
          type="text"
          value={goal}
          onFocus={() => { activeFieldRef.current = 'goal'; }}
          onBlur={() => { activeFieldRef.current = null; }}
          onChange={handleGoalChange}
          placeholder="What is the one thing to improve? e.g. trail stops on every runner"
          maxLength={200}
          className={cn(
            'w-full rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-1',
            'px-ds-3 py-[8px]',
            'font-sans text-[13px] text-ink-primary placeholder:text-ink-muted',
            'focus:outline-none focus:border-border-ds-default',
            'transition-colors duration-base ease-out',
          )}
        />
      </div>

      {/* Body field */}
      <div className="flex flex-col gap-ds-1">
        <label
          htmlFor={`shared-note-body-${reviewId}`}
          className="font-sans text-[11px] font-semibold tracking-[0.8px] uppercase text-ink-tertiary"
        >
          Notes
        </label>
        <textarea
          id={`shared-note-body-${reviewId}`}
          value={body}
          onFocus={() => { activeFieldRef.current = 'body'; }}
          onBlur={() => { activeFieldRef.current = null; }}
          onChange={handleBodyChange}
          placeholder={
            `Add collaborative notes here — both you and the mentor can edit.\n\nIdeas: execution breakdown, plan-vs-actual, what to do next time…`
          }
          rows={6}
          className={cn(
            'w-full resize-y rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-1',
            'px-ds-3 py-[9px]',
            'font-sans text-[13px] text-ink-primary placeholder:text-ink-muted leading-relaxed',
            'focus:outline-none focus:border-border-ds-default',
            'transition-colors duration-base ease-out',
          )}
        />
      </div>

      {/* Revision history (collapsible) */}
      <RevisionHistory reviewId={reviewId} />
    </div>
  );
}
