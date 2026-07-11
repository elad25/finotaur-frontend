// src/features/floor/lib/tradeCardData.ts
// Clean, feed-independent shape that TradeBusinessCard renders.
// A null numeric field means "hidden/absent" → the card renders ••• (never 0).

import type { GlobalFeedItem, SharePrivacy } from '@/features/floor/types/community';
import type { ShareableTrade } from '@/features/floor/components/ShareTradeDialog';

export interface TradeCardData {
  symbol: string;
  side: 'LONG' | 'SHORT' | string | null;
  /** null → render as hidden ••• */
  pnl: number | null;
  entry: number | null;
  exit: number | null;
  /** null → size not shown */
  size: number | null;
  closeAt: string | null;
  /** null → R not shown */
  r: number | null;
  strategyCategory: string | null;
}

/** Adapter from a feed item — applies the SAME redaction rules TradeBusinessCard used inline. */
export function tradeCardFromFeedItem(item: GlobalFeedItem): TradeCardData {
  const pnlHidden = item.hide_pnl || item.trade_pnl === null;
  const rHidden = item.hide_pnl || item.trade_r === null;
  const entryHidden = item.show_setup_only || item.trade_entry === null;
  const exitHidden = item.show_setup_only || item.trade_exit === null;
  const sizeHidden = !item.reveal_size || item.trade_size === null;
  return {
    symbol: item.trade_symbol ?? '',
    side: item.trade_side ?? null,
    pnl: pnlHidden ? null : item.trade_pnl,
    entry: entryHidden ? null : item.trade_entry,
    exit: exitHidden ? null : item.trade_exit,
    size: sizeHidden ? null : item.trade_size,
    closeAt: item.trade_close_at ?? null,
    r: rHidden ? null : item.trade_r,
    strategyCategory: item.trade_strategy_category ?? null,
  };
}

/** Adapter from a raw shareable trade + privacy toggles (used by the quick share menu). */
export function tradeCardFromShareable(trade: ShareableTrade, privacy: SharePrivacy): TradeCardData {
  return {
    symbol: trade.symbol,
    side: trade.side ?? null,
    pnl: privacy.hidePnl ? null : (trade.pnl ?? null),
    entry: privacy.showSetupOnly ? null : (trade.entry_price ?? null),
    exit: privacy.showSetupOnly ? null : (trade.exit_price ?? null),
    size: privacy.revealSize ? (trade.quantity ?? null) : null,
    closeAt: trade.close_at ?? null,
    r: null, // ShareableTrade carries no R multiple
    strategyCategory: privacy.strategyCategory ?? null,
  };
}
