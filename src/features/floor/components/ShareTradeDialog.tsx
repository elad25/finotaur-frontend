// src/components/community/ShareTradeDialog.tsx
// Dialog that lets a user publish a trade to one or more destinations:
//   • Global community feed
//   • A mentor space community tab (scope='community')
//   • A mentor's 1:1 review queue (scope='mentor')
//
// Shows a live preview using SharedTradeCard that reflects privacy toggles.
// On submit, calls shareTrade() from useShareTrade — one call fans out to
// all selected destinations.

import { useState, useMemo } from 'react';
import { Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ds/Button';
import { SharedTradeCard } from '@/features/floor/components/SharedTradeCard';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
// intentional: floor depends on mentor to offer rooms as share destinations (unidirectional, no cycle)
import { useMySpaces } from '@/features/mentor/hooks/useMentorshipSpaces';
import { useShareTrade } from '@/features/floor/hooks/useShareTrade';
import { cn } from '@/lib/utils';
import type { GlobalFeedItem, ShareDestination, SharePrivacy } from '@/features/floor/types/community';

// ── Trade shape — minimal subset of what TradeDetail.tsx exposes ──────────────
// We only need the fields that drive the preview card + the RPC call.

export interface ShareableTrade {
  id: string;
  symbol: string;
  side: string;
  pnl?: number | null;
  entry_price?: number | null;
  exit_price?: number | null;
  quantity?: number | null;
  close_at?: string | null;
  setup?: string | null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ShareTradeDialogProps {
  trade: ShareableTrade;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a GlobalFeedItem-shaped preview object from the raw trade and the
 * current privacy toggles, applying the same null-redaction rules the RPC uses:
 *   hide_pnl → trade_pnl = null
 *   show_setup_only → trade_entry = null, trade_exit = null
 *   !reveal_size → trade_size = null
 */
function buildPreviewItem(
  trade: ShareableTrade,
  privacy: SharePrivacy,
  authorName: string,
): GlobalFeedItem {
  const now = new Date().toISOString();
  return {
    id: 'preview',
    author_id: 'preview',
    author_name: authorName,
    author_avatar_url: null,
    body: privacy.caption ?? '',
    attached_trade_id: trade.id,
    trade_symbol: trade.symbol,
    trade_side: trade.side,
    trade_pnl: privacy.hidePnl ? null : (trade.pnl ?? null),
    trade_size: privacy.revealSize ? (trade.quantity ?? null) : null,
    trade_setup: trade.setup ?? null,
    trade_entry: privacy.showSetupOnly ? null : (trade.entry_price ?? null),
    trade_exit: privacy.showSetupOnly ? null : (trade.exit_price ?? null),
    trade_open_at: null,
    trade_close_at: trade.close_at ?? null,
    trade_emotion: null,
    hide_pnl: privacy.hidePnl,
    show_setup_only: privacy.showSetupOnly,
    reveal_size: privacy.revealSize,
    pinned: false,
    created_at: now,
    comment_count: 0,
    reaction_count: 0,
    reactions: [],
    my_reaction: null,
  };
}

// ── Privacy toggle row ────────────────────────────────────────────────────────

interface ToggleRowProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}

function ToggleRow({ checked, onChange, label, description }: ToggleRowProps) {
  return (
    <label className="flex items-start gap-ds-3 cursor-pointer group">
      <div className="relative mt-[2px] shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={cn(
            'h-[18px] w-[18px] rounded-[5px] border-[0.5px] flex items-center justify-center transition-colors duration-base ease-out',
            checked
              ? 'bg-gold-primary border-gold-primary'
              : 'bg-surface-2 border-border-ds-subtle group-hover:border-border-ds-default',
          )}
        >
          {checked && (
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
              <path d="M1 4.5L4 7.5L10 1.5" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-[2px] min-w-0">
        <span className="font-sans text-[13px] font-medium text-ink-primary leading-snug">
          {label}
        </span>
        <span className="font-sans text-[12px] text-ink-tertiary leading-snug">
          {description}
        </span>
      </div>
    </label>
  );
}

// ── Destination section header ────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-sans text-[10px] font-semibold tracking-[1px] uppercase text-ink-tertiary">
      {children}
    </span>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

export function ShareTradeDialog({ trade, open, onOpenChange }: ShareTradeDialogProps) {
  const { user } = useAuth();
  const authorName = user?.user_metadata?.display_name ?? user?.email ?? 'You';

  const { spaces, isLoading: spacesLoading } = useMySpaces();
  const { shareTrade, isSharing } = useShareTrade();

  // ── Destination selection state ──────────────────────────────────────────────
  const [globalSelected, setGlobalSelected] = useState(false);
  // communityRooms: Set of space_ids selected for community feed sharing
  const [communityRooms, setCommunityRooms] = useState<Set<string>>(new Set());
  // mentorRooms: Set of space_ids selected for mentor 1:1 review
  const [mentorRooms, setMentorRooms] = useState<Set<string>>(new Set());

  // ── Privacy state ────────────────────────────────────────────────────────────
  const [hidePnl, setHidePnl] = useState(false);
  const [showSetupOnly, setShowSetupOnly] = useState(false);
  const [revealSize, setRevealSize] = useState(false);
  const [caption, setCaption] = useState('');

  // ── Derived ──────────────────────────────────────────────────────────────────
  const privacy: SharePrivacy = useMemo(
    () => ({ hidePnl, showSetupOnly, revealSize, caption: caption || undefined }),
    [hidePnl, showSetupOnly, revealSize, caption],
  );

  const previewItem = useMemo(
    () => buildPreviewItem(trade, privacy, authorName),
    [trade, privacy, authorName],
  );

  const hasAnyDestination =
    globalSelected || communityRooms.size > 0 || mentorRooms.size > 0;

  function toggleCommunityRoom(spaceId: string) {
    setCommunityRooms((prev) => {
      const next = new Set(prev);
      if (next.has(spaceId)) next.delete(spaceId);
      else next.add(spaceId);
      return next;
    });
  }

  function toggleMentorRoom(spaceId: string) {
    setMentorRooms((prev) => {
      const next = new Set(prev);
      if (next.has(spaceId)) next.delete(spaceId);
      else next.add(spaceId);
      return next;
    });
  }

  async function handleSubmit() {
    const destinations: ShareDestination[] = [];

    if (globalSelected) {
      destinations.push({ scope: 'global' });
    }

    communityRooms.forEach((room_id) => {
      destinations.push({ scope: 'community', room_id });
    });

    mentorRooms.forEach((room_id) => {
      const space = spaces.find((s) => s.space_id === room_id);
      if (!space) return;
      destinations.push({ scope: 'mentor', room_id, target_mentor_id: space.owner_id });
    });

    if (destinations.length === 0) return;

    try {
      await shareTrade(trade.id, destinations, privacy);
      toast({ title: 'Trade shared successfully.' });
      onOpenChange(false);
      // Reset state for next open
      setGlobalSelected(false);
      setCommunityRooms(new Set());
      setMentorRooms(new Set());
      setCaption('');
      setHidePnl(false);
      setShowSetupOnly(false);
      setRevealSize(false);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to share trade. Please try again.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'w-full max-w-2xl',
          'bg-[#111111] border-[0.5px] border-border-ds-subtle',
          'rounded-[16px] p-0 overflow-hidden',
          'max-h-[90vh] flex flex-col',
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <DialogHeader className="px-ds-5 pt-ds-5 pb-ds-4 border-b border-border-ds-subtle shrink-0">
          <div className="flex items-center gap-ds-2">
            <Share2 size={16} className="text-gold-primary" aria-hidden="true" />
            <DialogTitle className="font-sans text-[16px] font-semibold text-ink-primary">
              Share trade — {trade.symbol}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-0 overflow-hidden flex-1 min-h-0">

          {/* Left column: destinations + privacy controls */}
          <div className="flex flex-col gap-ds-5 px-ds-5 py-ds-5 overflow-y-auto flex-1 min-w-0">

            {/* Caption */}
            <div className="flex flex-col gap-ds-2">
              <label className="font-sans text-[12px] font-semibold text-ink-secondary" htmlFor="share-caption">
                Caption <span className="text-ink-muted font-normal">(optional)</span>
              </label>
              <textarea
                id="share-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add context about this trade…"
                rows={2}
                maxLength={500}
                className={cn(
                  'w-full resize-none rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-2',
                  'px-ds-3 py-[9px]',
                  'font-sans text-[13px] text-ink-primary placeholder:text-ink-muted',
                  'focus:outline-none focus:border-border-ds-default',
                  'transition-colors duration-base ease-out',
                )}
              />
            </div>

            {/* Destinations */}
            <div className="flex flex-col gap-ds-3">
              <SectionLabel>Destinations</SectionLabel>

              {/* Global */}
              <ToggleRow
                checked={globalSelected}
                onChange={setGlobalSelected}
                label="FINOTAUR Global (public community)"
                description="Visible to all members of the FINOTAUR community."
              />

              {/* Per-space community + mentor */}
              {spacesLoading ? (
                <p className="font-sans text-[12px] text-ink-tertiary">Loading your rooms…</p>
              ) : spaces.length === 0 ? (
                <p className="font-sans text-[12px] text-ink-tertiary">
                  You are not a member of any mentor space.
                </p>
              ) : (
                spaces.map((space) => (
                  <div key={space.space_id} className="flex flex-col gap-ds-2 pl-ds-1">
                    <div
                      className={cn(
                        'rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-2',
                        'px-ds-3 py-ds-3 flex flex-col gap-ds-2',
                      )}
                    >
                      <span className="font-sans text-[12px] font-semibold text-ink-primary">
                        {space.name}
                      </span>
                      <div className="flex flex-col gap-ds-2">
                        <ToggleRow
                          checked={communityRooms.has(space.space_id)}
                          onChange={() => toggleCommunityRoom(space.space_id)}
                          label={`Share to ${space.name} feed`}
                          description="Visible to all members of this space's community tab."
                        />
                        <ToggleRow
                          checked={mentorRooms.has(space.space_id)}
                          onChange={() => toggleMentorRoom(space.space_id)}
                          label={`Send to ${space.name} mentor for 1:1 review`}
                          description="Submitted to the mentor's review queue — only you and the mentor see it."
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Privacy controls */}
            <div className="flex flex-col gap-ds-3">
              <SectionLabel>Privacy</SectionLabel>
              <ToggleRow
                checked={hidePnl}
                onChange={setHidePnl}
                label="Hide P&L"
                description="P&L amount is hidden from viewers — shown as •••"
              />
              <ToggleRow
                checked={showSetupOnly}
                onChange={setShowSetupOnly}
                label="Show setup only"
                description="Entry and exit prices are hidden — only setup and result direction visible."
              />
              <ToggleRow
                checked={revealSize}
                onChange={setRevealSize}
                label="Reveal position size"
                description="Shows the number of contracts / shares traded. Hidden by default."
              />
            </div>
          </div>

          {/* Right column: live preview */}
          <div
            className={cn(
              'lg:w-[320px] shrink-0',
              'border-t lg:border-t-0 lg:border-l border-border-ds-subtle',
              'px-ds-4 py-ds-5 bg-surface-1 overflow-y-auto',
            )}
          >
            <div className="flex flex-col gap-ds-3">
              <SectionLabel>Preview</SectionLabel>
              <p className="font-sans text-[11px] text-ink-tertiary -mt-ds-1">
                This is exactly what others will see.
              </p>
              {/* Render SharedTradeCard in preview-only mode (reactions/comments disabled by wrapping in a non-interactive skin) */}
              <div className="pointer-events-none select-none opacity-95">
                <SharedTradeCard item={previewItem} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div
          className={cn(
            'shrink-0 border-t border-border-ds-subtle',
            'px-ds-5 py-ds-4 flex items-center justify-end gap-ds-3',
          )}
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="font-sans text-[13px] text-ink-tertiary hover:text-ink-secondary transition-colors duration-base ease-out"
          >
            Cancel
          </button>
          <Button
            variant="gold"
            size="compact"
            showArrow={false}
            disabled={!hasAnyDestination || isSharing}
            onClick={handleSubmit}
          >
            {isSharing ? 'Sharing…' : 'Share trade'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
