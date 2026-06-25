// src/hooks/useShareTrade.ts
// Mutation hook that calls the share_trade() SECURITY DEFINER RPC.
//
// RPC signature:
//   share_trade(
//     p_trade_id      uuid,
//     p_destinations  jsonb,   -- array of ShareDestination objects
//     p_hide_pnl      bool,
//     p_show_setup_only bool,
//     p_reveal_size   bool,
//     p_caption       text
//   ) → trade_shares rows
//
// The caller provides a typed `destinations` array and a `privacy` object;
// this hook serialises them into the jsonb array the RPC expects.

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mapSpaceError } from '@/features/mentor/hooks/useMentorshipSpaces';
import type { ShareDestination, SharePrivacy } from '@/types/community';

/** Opaque row returned by share_trade(). Extend as the UI needs more fields. */
export interface TradeShareRow {
  id: string;
  trade_id: string;
  scope: string;
  room_id: string | null;
  target_mentor_id: string | null;
  created_at: string;
}

export interface UseShareTradeReturn {
  shareTrade: (
    tradeId: string,
    destinations: ShareDestination[],
    privacy: SharePrivacy,
  ) => Promise<TradeShareRow[]>;
  isSharing: boolean;
  error: Error | null;
}

/**
 * Returns a `shareTrade` imperative function along with loading and error state.
 *
 * Usage:
 *   const { shareTrade, isSharing, error } = useShareTrade();
 *   await shareTrade(tradeId, [{ scope: 'global' }], { hidePnl: false, ... });
 */
export function useShareTrade(): UseShareTradeReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const shareTrade = async (
    tradeId: string,
    destinations: ShareDestination[],
    privacy: SharePrivacy,
  ): Promise<TradeShareRow[]> => {
    setIsSharing(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('share_trade', {
        p_trade_id: tradeId,
        p_destinations: destinations, // supabase-js serialises this to jsonb
        p_hide_pnl: privacy.hidePnl,
        p_show_setup_only: privacy.showSetupOnly,
        p_reveal_size: privacy.revealSize,
        p_caption: privacy.caption ?? null,
      });

      if (rpcError) throw new Error(mapSpaceError(rpcError));
      return (data ?? []) as TradeShareRow[];
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      setError(wrapped);
      throw wrapped;
    } finally {
      setIsSharing(false);
    }
  };

  return { shareTrade, isSharing, error };
}
