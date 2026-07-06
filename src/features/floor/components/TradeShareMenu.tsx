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
import { STRATEGY_CATEGORIES } from '@/lib/strategyCategories';
import { isBrokerVerifiedTrade } from '@/lib/trades/isBrokerVerifiedTrade';
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
  // Global share requires a strategy category — clicking "Global Feed" reveals the picker.
  const [globalPicking, setGlobalPicking] = useState(false);
  const { spaces } = useMySpaces();
  const { shareTrade } = useShareTrade();

  // Only broker-verified trades (broker !== 'manual') can post to the Global
  // Feed. Rooms (community) remain open to all trades.
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
      setGlobalPicking(false);
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
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setGlobalPicking(false); }}>
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
          Share to
        </p>

        <button
          type="button"
          onClick={() => setGlobalPicking((v) => !v)}
          disabled={!verified || !!pending}
          aria-expanded={globalPicking}
          title={verified ? undefined : 'Broker-verified trades only'}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
        >
          {pending === 'global' ? (
            <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
          ) : (
            <Globe className={`h-4 w-4 ${verified ? 'text-yellow-400' : 'text-zinc-500'}`} />
          )}
          <span className={verified ? undefined : 'text-zinc-500'}>Global Feed</span>
        </button>
        {!verified && (
          <p className="px-2 pb-1.5 text-[10px] text-zinc-500">
            Broker-verified trades only
          </p>
        )}

        {/* Strategy category picker — required before a global share */}
        {verified && globalPicking && (
          <div className="px-2 pb-1.5 pt-0.5">
            <p className="px-0.5 pb-1 text-[10px] text-zinc-500">Pick a strategy to share</p>
            <div className="flex flex-wrap gap-1">
              {STRATEGY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  disabled={!!pending}
                  onClick={() => handleShare('global', { scope: 'global' }, 'Global Feed', cat)}
                  className="rounded-full border border-zinc-700/60 bg-zinc-800/40 px-2 py-1 text-[11px] text-zinc-300 transition hover:border-yellow-500/50 hover:text-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
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
