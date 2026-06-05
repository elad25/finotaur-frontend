## In plain words

The **covered call** and the **cash-secured put** are the two foundational income strategies in options trading, and they are more similar than they first appear. A **covered call** means you own 100 shares of stock and sell a call option against them — collecting premium in exchange for agreeing to sell your shares at the strike price if called away. A **cash-secured put** means you sell a put option and keep enough cash on hand to buy the shares if the put is exercised — collecting premium while agreeing to buy the stock at the strike if it falls there.

## Quick demo

You want to own XYZ at $95 — it currently trades at $100. Instead of placing a limit order and waiting, you sell a cash-secured put with a $95 strike expiring in 30 days for $1.50 premium ($150 per contract). If XYZ stays above $95, the put expires worthless and you keep the $150. If XYZ drops below $95, you buy 100 shares at $95 — but your effective cost is $93.50 after the premium. You got paid to wait to buy at your target price.

## Full explanation

### The covered call

**Setup**: Own 100 shares, sell one call option above the current price.

**Maximum profit**: Limited to the premium received plus the gain from the current price to the strike. If the stock is at $100, you sell a $105 call for $2, and the stock closes at or above $105 at expiration, your profit is $5 (price gain) + $2 (premium) = $7 per share.

**Maximum loss**: Significantly reduced but not eliminated. You can still lose on the shares (if the stock falls sharply), partially offset by the premium collected.

**When it works well**:
- You own the stock and expect it to be flat or mildly bullish.
- You are willing to sell the shares at the strike price.
- IV is elevated, making the premium attractive.

**Trade-off**: By selling the call, you cap your upside. If the stock surges to $120, you are obligated to sell at $105 and miss the additional gain.

### The cash-secured put

**Setup**: Hold cash equal to 100 × strike price, sell one put option at or below the current price.

**Maximum profit**: The premium collected. If the stock stays above the strike at expiration, the put expires worthless and you keep the cash plus the premium.

**Maximum loss**: Substantial — if the stock falls to zero, you buy 100 shares at the strike price with a partial offset of only the premium. This is similar in risk to owning the stock outright at the strike price.

**When it works well**:
- You want to buy the stock but only at a lower price.
- You are comfortable owning the shares at the strike.
- IV is elevated, meaning the premium is generous.

### The symmetry between the two strategies

These strategies are mirror images connected by **put-call parity**. Selling a cash-secured put at a given strike generates a similar risk/reward profile to owning the stock and selling a covered call at the same strike. Both strategies:

- Profit from premium decay (theta positive).
- Lose when the underlying falls significantly.
- Are capped on the upside (covered call) or limited by premium (CSP).

### The wheel strategy

Many traders combine the two in a "wheel": sell a cash-secured put → if assigned, own the stock → sell a covered call against those shares → if called away, sell another put. This cycle collects premium repeatedly. It works in range-bound or mildly bullish conditions but can accumulate losses in a sustained downtrend.

For any investor who already holds stocks, the covered call is one of the most practical tools available — it generates income from a position that would otherwise sit idle.
