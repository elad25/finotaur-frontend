## In plain words

**Arbitrage** means buying and selling the same (or equivalent) asset simultaneously in different markets to profit from a **pricing discrepancy**. In a perfect market, two identical things must cost the same — arbitrage is what enforces that. When a gap appears, the arbitrageur captures the difference with theoretically no directional risk. In practice, real arbitrage is rare; most retail-accessible "arbitrage" carries some risk.

## Quick demo

A share of ACME Corp trades at $100.00 on the New York Stock Exchange and $100.08 on another exchange at the same moment. An arbitrageur's algorithm instantly buys 10,000 shares at $100.00 and simultaneously sells 10,000 shares at $100.08, locking in $800 before either price moves. The trade takes milliseconds. By the time a human reads this sentence, the gap has already closed — which is exactly why this type of arbitrage is now dominated by high-frequency trading firms.

## Full explanation

### Pure vs. risk arbitrage

There are two fundamentally different things called "arbitrage":

**Pure (riskless) arbitrage** — identical assets at different prices in different markets, captured simultaneously. Genuinely riskless by construction if executed perfectly. Examples:
- Cross-exchange stock price discrepancies (millisecond opportunities, HFT-dominated).
- Currency triangular arbitrage (exploiting inconsistencies among three forex pairs).
- Cash-and-carry arbitrage in futures (buying spot, selling futures at a premium, delivering at expiry).

**Risk arbitrage (merger arbitrage)** — a company announces it will be acquired at $50 per share; its stock trades at $47. An arbitrageur buys at $47 expecting to receive $50 at close. The "risk" is that the deal falls through, sending the stock back to $35. This is not riskless — it is a bet on deal completion.

### Common arbitrage strategies accessible to retail

- **ETF vs. NAV arbitrage** — large ETF shares trade at a premium to the net asset value of their underlying holdings. Authorized participants (not retail traders) exploit this through creation/redemption, keeping prices aligned. Retail traders cannot execute this directly.
- **Convertible bond arbitrage** — buying a convertible bond and shorting the underlying equity. The bond's conversion feature gives equity exposure; the short hedges it. A hedge fund strategy requiring significant infrastructure.
- **Statistical arbitrage (pairs trading)** — trading two historically correlated instruments when they diverge, expecting the spread to close. This is a mean-reversion strategy with an arbitrage-like framing; it carries real statistical risk.
- **Cross-exchange crypto arbitrage** — buying bitcoin on one exchange at $68,400 and selling it on another at $68,550. Feasible for retail but constrained by withdrawal fees, transfer time, and the speed at which gaps close.

### Why pure arbitrage disappears quickly

Markets are efficient at closing pure arbitrage gaps because:
- Many participants monitor the same prices with low-latency tools.
- HFT algorithms react in microseconds.
- The act of buying the cheap asset and selling the expensive one pushes both prices toward parity.

The existence of arbitrage opportunities does not mean they are exploitable — transaction costs (commissions, spreads, withdrawal fees) often exceed the gap, and by the time a manual trader acts, the gap is gone.

### Limits of arbitrage

Even when a pricing gap is real and visible, capturing it may be impossible:
- **Execution risk** — one leg of the trade fills but the other does not (you bought but could not sell at the target price).
- **Funding risk** — arbitrage often requires leverage; a temporary adverse move can trigger a margin call before the gap closes.
- **Regulatory limits** — shorting restrictions or circuit breakers can prevent one side of the trade.
- **Model risk** — the statistical relationship assumed (two assets should trade at a fixed spread) may break down structurally.

The Long-Term Capital Management crisis (1998) is the canonical lesson: LTCM identified real, persistent pricing anomalies but was forced to unwind when the gaps widened before closing, destroying the fund despite being "right" in the long run.

### Why it matters for a trader

Understanding arbitrage teaches you why markets are as efficient as they are — and where inefficiencies can persist. It also clarifies how professional capital is deployed, which helps retail traders avoid strategies that sound like arbitrage but carry hidden risks. Recognizing the difference between "exploitable inefficiency" and "apparent gap that evaporates on execution" is a mark of trading sophistication.
