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
import { Share2, Globe } from 'lucide-react';
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
import { isBrokerVerifiedTrade } from '@/lib/trades/isBrokerVerifiedTrade';
import { FLOOR_CHANNELS, GENERAL_CATEGORY } from '@/features/floor/lib/floorChannels';
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
  /** Real broker (e.g. 'tradovate') = broker-verified; 'manual' or missing = not
   * verified. Gates the Global destination — see isBrokerVerifiedTrade. */
  broker?: string | null;
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
    body: privacy.caption ?? '',
    attached_trade_id: trade.id,
    trade_symbol: trade.symbol,
    trade_side: trade.side,
    author_avatar_url: null,
    trade_pnl: privacy.hidePnl ? null : (trade.pnl ?? null),
    trade_size: privacy.revealSize ? (trade.quantity ?? null) : null,
    trade_setup: trade.setup ?? null,
    trade_entry: privacy.showSetupOnly ? null : (trade.entry_price ?? null),
    trade_exit: privacy.showSetupOnly ? null : (trade.exit_price ?? null),
    trade_open_at: null,
    trade_close_at: trade.close_at ?? null,
    hide_pnl: privacy.hidePnl,
    show_setup_only: privacy.showSetupOnly,
    reveal_size: privacy.revealSize,
    pinned: false,
    created_at: now,
    comment_count: 0,
    reaction_count: 0,
    reactions: [],
    my_reaction: null,
    trade_emotion: null,
    trade_strategy_name: null,
    trade_strategy_category: privacy.strategyCategory ?? null,
    trade_r: null,
    author_tier: null,
    author_consistency_tier: null,
    author_win_rate: null,
    author_profit_factor: null,
  };
}

// ── Privacy toggle row ────────────────────────────────────────────────────────

interface ToggleRowProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
  disabled?: boolean;
}

function ToggleRow({ checked, onChange, label, description, disabled }: ToggleRowProps) {
  return (
    <label
      className={cn(
        'flex items-start gap-ds-3 group',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      )}
    >
      <div className="relative mt-[2px] shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
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

// ── Channel picker pill ────────────────────────────────────────────────────────

interface ChannelPillProps {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ChannelPill({ Icon, label, active, disabled, onClick }: ChannelPillProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-[6px] rounded-full px-[10px] py-[5px]',
        'font-sans text-[11px] font-medium border-[0.5px] transition-colors duration-base ease-out',
        'disabled:cursor-not-allowed',
        active
          ? 'bg-gradient-gold border-transparent text-surface-base'
          : 'bg-surface-2 border-border-ds-subtle text-ink-secondary hover:border-border-ds-default hover:text-ink-primary',
      )}
    >
      <Icon className="h-[12px] w-[12px]" />
      <span>{label}</span>
    </button>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

export function ShareTradeDialog({ trade, open, onOpenChange }: ShareTradeDialogProps) {
  const { user } = useAuth();
  const authorName = user?.user_metadata?.display_name ?? user?.email ?? 'You';

  const { spaces, isLoading: spacesLoading } = useMySpaces();
  const { shareTrade, isSharing } = useShareTrade();

  // Only broker-verified trades (broker !== 'manual') can be posted to the
  // Global Feed — server-enforced in share_trade(). Manual and AI-screenshot
  // trades can still go to community rooms and mentor review.
  const verified = isBrokerVerifiedTrade(trade);

  // ── Destination selection state ──────────────────────────────────────────────
  // Single-select channel: null = nothing picked, GENERAL_CATEGORY = Global,
  // otherwise one of FLOOR_CHANNELS' keys (a strategy category channel).
  const [channel, setChannel] = useState<string | null>(null);
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
    () => ({ hidePnl, showSetupOnly, revealSize, caption: caption || undefined, strategyCategory: channel }),
    [hidePnl, showSetupOnly, revealSize, caption, channel],
  );

  const previewItem = useMemo(
    () => buildPreviewItem(trade, privacy, authorName),
    [trade, privacy, authorName],
  );

  const hasAnyDestination = channel != null || communityRooms.size > 0 || mentorRooms.size > 0;

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

    // Defensive: never send a global destination for an unverified trade,
    // even if channel state somehow got set (the picker is disabled and
    // force-reset below, but this guards against any state drift).
    if (channel != null && verified) {
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
      setChannel(null);
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
          'w-full max-w-6xl',
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
        <div className="flex flex-col gap-ds-6 px-ds-5 py-ds-5 overflow-y-auto flex-1 min-h-0">

          {/* Preview — big, on top, true 1:1 of the feed card */}
          <div
            className={cn(
              'flex flex-col items-center gap-ds-3 -mx-ds-5 px-ds-5 pb-ds-5',
              'border-b border-border-ds-subtle bg-surface-1',
            )}
          >
            <div className="flex flex-col items-center gap-[2px]">
              <SectionLabel>Preview</SectionLabel>
              <p className="font-sans text-[11px] text-ink-tertiary">
                This is exactly what others will see.
              </p>
            </div>
            {/* Render SharedTradeCard in preview-only mode (reactions/comments disabled by wrapping in a non-interactive skin) */}
            <div className="w-full max-w-2xl mx-auto pointer-events-none select-none opacity-95">
              <SharedTradeCard item={previewItem} />
            </div>
          </div>

          {/* Controls — below the preview, two-up on wide dialogs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-ds-5">

            {/* Left cell: caption + channel */}
            <div className="flex flex-col gap-ds-5 min-w-0">

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

              {/* Channel */}
              <div className="flex flex-col gap-ds-3">
                <SectionLabel>Channel</SectionLabel>

                {/* Single-select channel picker — Global or one strategy channel.
                    Gated by broker-verification exactly like the old Global toggle. */}
                <div
                  role="radiogroup"
                  aria-label="Channel"
                  className={cn('flex flex-wrap gap-[6px]', !verified && 'opacity-50')}
                >
                  <ChannelPill
                    Icon={Globe}
                    label="Global"
                    active={channel === GENERAL_CATEGORY}
                    disabled={!verified}
                    onClick={() => setChannel((prev) => (prev === GENERAL_CATEGORY ? null : GENERAL_CATEGORY))}
                  />
                  {FLOOR_CHANNELS.map((ch) => (
                    <ChannelPill
                      key={ch.key}
                      Icon={ch.Icon}
                      label={ch.label}
                      active={channel === ch.key}
                      disabled={!verified}
                      onClick={() => setChannel((prev) => (prev === ch.key ? null : ch.key))}
                    />
                  ))}
                </div>
                {!verified && (
                  <p className="font-sans text-[11px] text-ink-tertiary pl-ds-1 -mt-ds-1">
                    Only broker-verified trades can be posted to the Global Feed.
                  </p>
                )}
              </div>
            </div>

            {/* Right cell: privacy + mentor-space rooms */}
            <div className="flex flex-col gap-ds-5 min-w-0">

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

              {/* Per-space community + mentor */}
              <div className="flex flex-col gap-ds-3">
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
            disabled={!hasAnyDestination || isSharing || (channel != null && !verified)}
            onClick={handleSubmit}
          >
            {isSharing ? 'Sharing…' : 'Share trade'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
