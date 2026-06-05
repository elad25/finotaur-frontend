## In plain words

**Delta hedging** is the practice of offsetting the directional risk of an options position by holding an opposing position in the underlying asset. An option's **delta** tells you how much the option's price changes for every one-dollar move in the underlying. By buying or selling shares (or futures) in proportion to the delta of your options position, you create a portfolio that is temporarily **delta-neutral** — indifferent to small price moves. The hedge must be continuously adjusted as price and time change.

## Quick demo

You own 10 call contracts on XYZ (1,000 total option units), each with a delta of 0.40. Your portfolio delta is 0.40 × 1,000 = 400 — meaning you gain approximately $400 for every $1 XYZ rises. To hedge, you short 400 shares of XYZ. Now your net delta is 0. XYZ moves up $2: the calls gain roughly $800; the short shares lose $800 — net effect is near zero. But because gamma increases the call delta as price rises, you now need to short more shares to re-hedge. This rebalancing is the continuous cost of maintaining delta neutrality.

## Full explanation

### Delta as a hedge ratio

Delta serves two interpretations simultaneously:

1. **Sensitivity measure** — how much the option price moves per dollar of underlying movement.
2. **Equivalent share count** — a 0.40-delta call is roughly equivalent to owning 40 shares for every contract.

A delta hedge converts a directional options position into one that profits (or loses) primarily from **volatility and time** rather than from price direction.

### Dynamic hedging and gamma

Delta is not constant — it changes as the underlying moves. **Gamma** measures the rate of that change. A position with high gamma requires frequent re-hedging; a low-gamma position is more stable.

This creates a fundamental trade-off:

- **Long gamma position** — as the underlying moves in either direction, delta increases in the direction of the move. Re-hedging means selling into rallies and buying dips — capturing the moves mechanically and profiting from realized volatility.
- **Short gamma position** — delta moves against you as price moves. Re-hedging means chasing price — buying into rallies and selling into dips — at a cost.

### Realized vs. implied volatility: the core of delta hedging P&L

The profit or loss from continuously delta-hedging an option position depends on whether the underlying's **realized volatility** (how much it actually moves) exceeds or falls short of the **implied volatility** at which the option was priced.

- Buy a straddle (long gamma) and continuously delta-hedge: you profit if realized vol exceeds implied vol.
- Sell a straddle (short gamma) and continuously delta-hedge: you profit if realized vol is less than implied vol.

This is not intuitive but is central to professional options market making and volatility arbitrage.

### Practical delta hedging for a trader

Few retail traders hedge dynamically in a continuous sense — the transaction costs of frequent share trading eat into the benefit. However, delta-hedging concepts are directly applicable:

- **Adjusting delta exposure** — if you hold a straddle and the market moves strongly in one direction, selling some of the profitable option side (or buying stock) reduces directional risk and locks in some of the gain.
- **Understanding dealer flows** — dealers hedging large books of options drive significant buying and selling pressure in the underlying. Knowing when large options positions expire, and how dealers will need to adjust their delta as those positions move in or out of the money, explains much of the intraday market microstructure that otherwise looks random.
- **Earnings positions** — a common advanced strategy is to buy an earnings straddle and delta-hedge against the overnight gap by trading futures, capturing the pure volatility payoff without the directional bet.

Delta hedging is the foundation of how institutional options desks operate, and understanding it transforms your view of why markets move the way they do, particularly around large options expirations and major events.
