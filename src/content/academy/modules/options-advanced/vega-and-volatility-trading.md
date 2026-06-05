## In plain words

**Vega** measures how much an option's price changes for every one-percentage-point change in **implied volatility (IV)**. A vega of 0.15 means the option gains or loses $0.15 for every 1% move in IV. Trading vega — also called **volatility trading** — means taking positions whose primary profit or loss driver is changes in implied volatility rather than changes in the underlying's price. It is possible to make money if IV rises or falls without predicting the direction of the stock.

## Quick demo

You buy a straddle on SPY when IV is at 15% (near a multi-month low). Each option has a vega of 0.20 and a total premium of $8.00 for the pair. A week later, a macro surprise pushes IV to 22% — a 7-point rise — and SPY barely moves. Your straddle is now worth roughly $8.00 + (7 × $0.20 × 2) = $10.80, a $2.80 gain per share ($280 per straddle) purely from the IV expansion, before any directional move has contributed.

## Full explanation

### Vega across strikes and expirations

Vega is not uniform across the volatility surface:

- **Higher for at-the-money options** — ATM options have the most extrinsic value and therefore the greatest sensitivity to IV changes.
- **Lower for deep in- or out-of-the-money options** — intrinsic value dominates for deep ITM; probability of reaching the money is low for deep OTM, so IV changes matter less.
- **Higher for longer-dated options** — more time means more opportunity for volatility to manifest. A 6-month option has roughly twice the vega of an equivalent 1-month option.

A long vega position profits when IV rises. A short vega position profits when IV falls.

### Long volatility strategies

Long vega trades are appropriate when IV is historically low, you expect a catalyst, or you believe the market is pricing in too little uncertainty.

- **Long straddle / strangle** — buy both a call and a put. Pure long-vol exposure; profits from IV expansion or a large price move.
- **Long calendar spread** — net long vega in the back month. Profits from rising IV because the long back-month option gains more than the short front-month.
- **Variance swaps (institutional)** — direct exposure to realized vs. implied variance. Not available retail but relevant for understanding how institutional vol desks operate.

### Short volatility strategies

Short vega trades profit when IV contracts from elevated levels back to historical norms. This is the basis of most premium-selling strategies.

- **Short straddle / strangle** — sell both a call and a put. Net short vega; profits from IV collapse and price stability.
- **Iron condor / butterfly** — defined-risk structures that express a short-vega, range-bound view.
- **Covered call / cash-secured put** — implicitly short vega because you sold an option; IV falling benefits the position.

### The VIX as a vega proxy

The VIX (CBOE Volatility Index) measures the 30-day implied volatility of the S&P 500 and serves as the market's headline "fear gauge." When traders say "buy vol" or "sell vol," they often mean taking positions that behave like buying or selling VIX — long vega when fear is low, short vega when fear is elevated.

VIX futures and VIX options allow direct exposure to volatility as an asset class, though the roll costs in VIX futures products (which are almost always in contango) make long volatility positions expensive to hold as a permanent hedge.

### Why IV mean-reverts

IV tends to revert toward historical norms over time. After a spike (a crisis, a Fed decision, earnings), the event passes and uncertainty resolves — IV falls. After a prolonged calm period, IV compresses to levels that understate the true risk of future moves. Understanding this cycle — and where IV sits relative to its historical range (IV rank and percentile) — is the foundation of timing volatility trades correctly.

For a trader, thinking in vega terms shifts the question from "where will the stock go?" to "is volatility priced correctly?" That is a different and often more answerable question — and it is what separates mechanical options buyers from genuine volatility traders.
