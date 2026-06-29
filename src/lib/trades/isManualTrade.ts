// src/lib/trades/isManualTrade.ts
// A "manual" trade is one the user created by hand via the Add Trade form
// (import_source === 'manual'), as opposed to a broker-synced trade
// (tradovate / ibrit / tradingview / csv) or an AI screenshot extraction ('api').
//
// Manual trades have no reliable market-chart context, so we do not render the
// TradingView chart for them, and they cannot be shared to the community feed
// or to mentor rooms.

export function isManualTrade(
  trade: { import_source?: string | null } | null | undefined,
): boolean {
  return trade?.import_source === 'manual';
}
