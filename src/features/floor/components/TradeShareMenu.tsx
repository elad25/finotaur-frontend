// src/features/floor/components/TradeShareMenu.tsx
// Minimal "Share" control for the trade-detail chart toolbar (replaces the old
// Dark theme toggle). Telegram-style send icon opens a small popover with two
// kinds of destinations:
//   • Global Feed                       — scope: 'global'
//   • Each Room the user is a member of — scope: 'community', room_id
//
// Privacy defaults to "share everything except position size", matching the
// ShareTradeDialog defaults. For richer control (hide P&L, setup-only, reveal
// size, caption, preview) the full ShareTradeDialog still exists.
//
// Manual and AI-screenshot trades (broker='manual') CAN be shared to rooms —
// only the Global Feed destination is broker-verification-gated (server-
// enforced in share_trade()). See isBrokerVerifiedTrade.

import { useState } from 'react';
import { Send, Globe, Users, Loader2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { useMySpaces } from '@/features/mentor/hooks/useMentorshipSpaces';
import { useShareTrade } from '@/features/floor/hooks/useShareTrade';
import { isBrokerVerifiedTrade } from '@/lib/trades/isBrokerVerifiedTrade';
import { FLOOR_CHANNELS, GENERAL_CATEGORY } from '@/features/floor/lib/floorChannels';
import type { ShareDestination, SharePrivacy } from '@/features/floor/types/community';

const DEFAULT_PRIVACY: SharePrivacy = {
  hidePnl: false,
  showSetupOnly: false,
  revealSize: false,
};

export interface TradeShareMenuTrade {
  id: string;
  import_source?: string | null;
  broker?: string | null;
}

export function TradeShareMenu({ trade }: { trade: TradeShareMenuTrade }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const { spaces } = useMySpaces();
  const { shareTrade } = useShareTrade();

  // Only broker-verified trades (broker !== 'manual') can post to a channel
  // (Global or a strategy channel). Rooms (community) remain open to all trades.
  const verified = isBrokerVerifiedTrade(trade);

  const handleShare = async (
    key: string,
    destination: ShareDestination,
    label: string,
    strategyCategory?: string,
  ) => {
    if (pending) return;
    setPending(key);
    try {
      await shareTrade(trade.id, [destination], { ...DEFAULT_PRIVACY, strategyCategory });
      toast({ title: 'Trade shared', description: `Shared to ${label}.` });
      setOpen(false);
    } catch (err) {
      toast({
        title: 'Could not share trade',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-transparent bg-[#0284c7] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-[#0ea5e9]"
          aria-label="Share trade"
          title="Share trade"
        >
          <Send className="h-3.5 w-3.5" />
          Share
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-60 border-zinc-800 bg-zinc-900 p-1.5 text-sm text-zinc-200"
      >
        <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Post to a channel
        </p>

        {/* Global row */}
        <button
          type="button"
          onClick={() => handleShare('global', { scope: 'global' }, 'Global', GENERAL_CATEGORY)}
          disabled={!verified || !!pending}
          title={verified ? undefined : 'Broker-verified trades only'}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
        >
          {pending === 'global' ? (
            <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
          ) : (
            <Globe className={`h-4 w-4 ${verified ? 'text-yellow-400' : 'text-zinc-500'}`} />
          )}
          <span className={verified ? undefined : 'text-zinc-500'}>Global</span>
        </button>

        {/* One row per strategy channel */}
        {FLOOR_CHANNELS.map((ch) => {
          const key = `channel:${ch.key}`;
          return (
            <button
              key={ch.key}
              type="button"
              onClick={() => handleShare(key, { scope: 'global' }, ch.label, ch.key)}
              disabled={!verified || !!pending}
              title={verified ? undefined : 'Broker-verified trades only'}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            >
              {pending === key ? (
                <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
              ) : (
                <ch.Icon className={`h-4 w-4 ${verified ? 'text-yellow-400' : 'text-zinc-500'}`} />
              )}
              <span className={verified ? undefined : 'text-zinc-500'}>{ch.label}</span>
            </button>
          );
        })}
        {!verified && (
          <p className="px-2 pb-1.5 text-[10px] text-zinc-500">
            Broker-verified trades only
          </p>
        )}

        {spaces.length > 0 && <div className="my-1 border-t border-zinc-800" />}

        {spaces.map((space) => {
          const key = `room:${space.space_id}`;
          return (
            <button
              key={space.space_id}
              type="button"
              onClick={() =>
                handleShare(
                  key,
                  { scope: 'community', room_id: space.space_id },
                  space.name,
                )
              }
              disabled={!!pending}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending === key ? (
                <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
              ) : (
                <Users className="h-4 w-4 text-zinc-400" />
              )}
              <span className="truncate">{space.name}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
