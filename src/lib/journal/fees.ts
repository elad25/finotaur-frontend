// src/lib/journal/fees.ts
// =====================================================
// Fee normalization for what-if / Shadow counterfactuals.
// Pure function — no React, no I/O.
//
// Problem it solves: the trade's ACTUAL P&L is net of broker/exchange fees
// (trade.pnl), while every HYPOTHETICAL scenario (held-stop, held-target,
// breakeven, etc.) is computed gross from price*qty*multiplier. Comparing a
// net actual against gross hypotheticals biases every delta in the
// hypothetical's favor by the fee amount. estimateFeeUsd derives a single
// per-trade fee estimate so callers can subtract it from every hypothetical
// USD outcome, putting actual and hypothetical on the same net-of-fees basis.
// =====================================================

/** Fees are bounded by a conservative per-contract ceiling. See estimateFeeUsd. */
const MAX_FEE_PER_CONTRACT_USD = 50;

/**
 * Estimate the $ fees baked into a trade's net P&L.
 *
 * feeUsd = grossActualUsd - netPnlUsd. On a winner, fees eat into the gain
 * (grossActualUsd > netPnlUsd); on a loser, fees deepen the loss
 * (netPnlUsd is more negative than grossActualUsd) — either way this
 * subtraction yields the fee drag as a non-negative number when netPnlUsd
 * is a faithful net-of-fees figure for the same round-trip quantity.
 *
 * Sanity clamp: a real commission/exchange-fee amount is bounded by
 * MAX_FEE_PER_CONTRACT_USD per contract for futures/equities. If the
 * gross/net gap falls outside [0, cap], it is almost certainly NOT fees —
 * it's a symptom of a partial fill, a stale/incomplete net P&L, a scaled
 * exit not reflected in gross/qty, or otherwise bad data upstream — so we
 * return 0 rather than propagate a bogus number into every hypothetical
 * scenario's USD math.
 *
 * @param grossActualUsd - price-only P&L for the trade's actual exit
 *                          (entry/exit/qty/multiplier, no fees).
 * @param netPnlUsd       - the trade's recorded net P&L (fees deducted),
 *                          or null/undefined when unknown.
 * @param quantity        - contracts/shares traded; used for the clamp.
 */
export function estimateFeeUsd(
  grossActualUsd: number,
  netPnlUsd: number | null | undefined,
  quantity: number,
): number {
  if (netPnlUsd == null || !isFinite(netPnlUsd)) return 0;

  const feeUsd = grossActualUsd - netPnlUsd;
  const cap = MAX_FEE_PER_CONTRACT_USD * Math.abs(quantity);

  if (feeUsd < 0 || feeUsd > cap) return 0;
  return feeUsd;
}
