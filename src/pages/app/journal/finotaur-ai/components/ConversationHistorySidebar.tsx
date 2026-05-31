// src/pages/app/journal/finotaur-ai/components/ConversationHistorySidebar.tsx
// Conversation history sidebar for the AI Coach.
// Self-contained data fetching via React Query (same pattern as useUsage).
// Props wire onSelect / onNew to useFinotaurChat.loadConversation / newConversation.

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { deleteConversation, listConversations } from '../services/finotaurAIApi';
import type { ConversationListItem } from '../types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ── Props ─────────────────────────────────────────────────────────────────────

interface ConversationHistorySidebarProps {
  activeConversationId?: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a UTC ISO timestamp into a short human-readable label. */
function shortDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConversationHistorySidebar({
  activeConversationId,
  onSelect,
  onNew,
}: ConversationHistorySidebarProps): JSX.Element {
  const queryClient = useQueryClient();

  const { data: conversations, isLoading } = useQuery<ConversationListItem[]>({
    queryKey: ['finotaur-conversations'],
    queryFn: listConversations,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // ── Delete handler ──────────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  // Styled confirm dialog (replaces the native window.confirm).
  const [pendingDelete, setPendingDelete] = React.useState<ConversationListItem | null>(null);

  /** Open the styled confirm dialog for a conversation. */
  function requestDelete(e: React.MouseEvent, conv: ConversationListItem): void {
    e.stopPropagation();
    setPendingDelete(conv);
  }

  /** Perform the actual delete once the user confirms in the dialog. */
  async function confirmDelete(): Promise<void> {
    const conv = pendingDelete;
    if (!conv) return;
    setPendingDelete(null);
    setDeletingId(conv.id);
    try {
      await deleteConversation(conv.id);
      // Optimistically remove from cache
      queryClient.setQueryData<ConversationListItem[]>(
        ['finotaur-conversations'],
        (prev) => (prev ?? []).filter((c) => c.id !== conv.id),
      );
      // If the deleted conversation was active, reset to new
      if (activeConversationId === conv.id) {
        onNew();
      }
    } catch {
      // Silently refresh on failure — the item will reappear
      void queryClient.invalidateQueries({ queryKey: ['finotaur-conversations'] });
    } finally {
      setDeletingId(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const list = conversations ?? [];

  return (
    <div className="flex flex-col h-full gap-ds-2">
      {/* Header row */}
      <div className="flex items-center justify-between shrink-0 px-ds-1">
        <span className="font-sans text-small font-medium text-ink-tertiary uppercase tracking-wider">
          History
        </span>
        <Button
          variant="ghost"
          size="compact"
          showArrow={false}
          onClick={onNew}
          aria-label="New chat"
          title="New chat"
        >
          <Plus size={14} />
          <span className="text-xs">New chat</span>
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-ds-1 min-h-0">
        {isLoading && (
          <p className="font-sans text-small text-ink-tertiary px-ds-2 py-ds-1">
            Loading…
          </p>
        )}

        {!isLoading && list.length === 0 && (
          <div className="flex flex-col items-center gap-ds-2 py-ds-6 px-ds-3 text-center">
            <MessageSquare size={20} className="text-ink-muted" />
            <p className="font-sans text-small text-ink-tertiary">
              No conversations yet. Start chatting to build your history.
            </p>
          </div>
        )}

        {list.map((conv) => {
          const isActive = conv.id === activeConversationId;
          return (
            <Card
              key={conv.id}
              variant={isActive ? 'featured' : 'default'}
              padding="compact"
              className={[
                'cursor-pointer group flex items-start justify-between gap-ds-2',
                'transition-colors duration-base',
              ].join(' ')}
              onClick={() => onSelect(conv.id)}
              // Accessible keyboard navigation
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(conv.id);
                }
              }}
              aria-current={isActive ? 'true' : undefined}
            >
              <div className="flex-1 min-w-0">
                <p
                  className={[
                    'font-sans text-small truncate',
                    isActive ? 'text-ink-primary font-medium' : 'text-ink-secondary',
                  ].join(' ')}
                >
                  {conv.title ?? 'Untitled chat'}
                </p>
                <p className="font-sans text-xs text-ink-tertiary mt-0.5">
                  {shortDate(conv.updated_at)}
                </p>
              </div>

              {/* Delete button — shown on hover */}
              <button
                type="button"
                aria-label="Delete conversation"
                disabled={deletingId === conv.id}
                onClick={(e) => requestDelete(e, conv)}
                className={[
                  'shrink-0 p-0.5 rounded text-ink-muted',
                  'opacity-0 group-hover:opacity-100 focus:opacity-100',
                  'hover:text-num-negative transition-opacity duration-base',
                  'disabled:pointer-events-none disabled:opacity-30',
                ].join(' ')}
              >
                <Trash2 size={12} />
              </button>
            </Card>
          );
        })}
      </div>

      {/* Styled delete confirmation — replaces the native window.confirm */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#C9A646]">
              Delete this conversation?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {pendingDelete?.title ? (
                <>
                  You&apos;re about to delete{' '}
                  <span className="font-semibold text-zinc-200">
                    &ldquo;{pendingDelete.title}&rdquo;
                  </span>{' '}
                  permanently. This cannot be undone.
                </>
              ) : (
                <>
                  You&apos;re about to delete this conversation permanently. This
                  cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
