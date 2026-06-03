/**
 * BulkActionBar — floating action bar for multi-selected trades.
 *
 * Mounts inside MyTrades. Visible only when >=1 trade is selected.
 * Actions:
 *   - Delete selected (with confirm dialog) → useBulkDeleteTrades
 *   - Add tag to selected (union-merge) → useUpdateTrade per trade
 *   - Clear selection
 */

import { useState, useCallback, memo } from "react";
import { Trash2, Tag, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BulkActionBarProps {
  /** IDs of the currently-selected trades. */
  selectedIds: Set<string>;
  /** Clear the caller's selection state. */
  onClearSelection: () => void;
  /** Trigger bulk-delete mutation. Resolves when done (throws on error). */
  onBulkDelete: (ids: string[]) => Promise<void>;
  /**
   * Merge a tag into each selected trade's tags array.
   * If undefined, the "Add tag" action is hidden (mutation not available).
   */
  onBulkTag?: (ids: string[], tag: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BulkActionBar = memo(function BulkActionBar({
  selectedIds,
  onClearSelection,
  onBulkDelete,
  onBulkTag,
}: BulkActionBarProps) {
  const count = selectedIds.size;

  // Local UI state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagInputVisible, setTagInputVisible] = useState(false);
  const [tagValue, setTagValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTagging, setIsTagging] = useState(false);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onBulkDelete(Array.from(selectedIds));
      toast.success(`${count} trade${count !== 1 ? "s" : ""} deleted`);
      onClearSelection();
      setDeleteDialogOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete trades";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, count, onBulkDelete, onClearSelection]);

  const handleApplyTag = useCallback(async () => {
    const trimmed = tagValue.trim();
    if (!trimmed || !onBulkTag) return;

    setIsTagging(true);
    try {
      await onBulkTag(Array.from(selectedIds), trimmed);
      toast.success(`Tag "${trimmed}" added to ${count} trade${count !== 1 ? "s" : ""}`);
      setTagValue("");
      setTagInputVisible(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add tag";
      toast.error(message);
    } finally {
      setIsTagging(false);
    }
  }, [tagValue, selectedIds, count, onBulkTag]);

  // Hide when nothing is selected.
  // NOTE: this early return MUST stay below every hook above — moving it up
  // changes the hook count between renders (0 selected → 5 hooks, then
  // selecting a trade → 7 hooks) and triggers React error #310.
  if (count === 0) return null;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Floating bar — sticky above page bottom                             */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        role="toolbar"
        aria-label="Bulk actions"
      >
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl"
          style={{
            background: "rgba(14, 14, 14, 0.95)",
            border: "1px solid rgba(201, 166, 70, 0.3)", // gold-primary/30
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,166,70,0.15)",
          }}
        >
          {/* Selection count badge */}
          <span className="flex h-7 min-w-[2.25rem] items-center justify-center rounded-xl bg-[#C9A646]/15 px-2.5 text-sm font-semibold text-[#C9A646]">
            {count}
          </span>
          <span className="text-sm font-medium text-zinc-300">
            {count === 1 ? "trade selected" : "trades selected"}
          </span>

          <div className="mx-1 h-5 w-px bg-zinc-700" />

          {/* Delete action */}
          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isDeleting}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:border-red-400/50 hover:bg-red-500/20 disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </button>

          {/* Add tag action — only when mutation is wired */}
          {onBulkTag && (
            <div className="relative">
              {tagInputVisible ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={tagValue}
                    onChange={(e) => setTagValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleApplyTag();
                      if (e.key === "Escape") {
                        setTagInputVisible(false);
                        setTagValue("");
                      }
                    }}
                    placeholder="Type tag, press Enter"
                    className="h-8 w-44 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#C9A646]/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleApplyTag()}
                    disabled={isTagging || !tagValue.trim()}
                    className="flex items-center gap-1 rounded-xl border border-[#C9A646]/30 bg-[#C9A646]/10 px-3 py-1.5 text-sm font-medium text-[#C9A646] transition-colors hover:bg-[#C9A646]/20 disabled:opacity-50"
                  >
                    {isTagging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTagInputVisible(false);
                      setTagValue("");
                    }}
                    className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setTagInputVisible(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700/60"
                >
                  <Tag className="h-4 w-4" />
                  Add tag
                </button>
              )}
            </div>
          )}

          {/* Clear selection */}
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:text-zinc-300"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Delete confirm dialog                                               */}
      {/* ------------------------------------------------------------------ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete {count} trade{count !== 1 ? "s" : ""}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently delete {count === 1 ? "this trade" : `all ${count} selected trades`}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </span>
              ) : (
                `Delete ${count === 1 ? "trade" : `${count} trades`}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

export { BulkActionBar };
