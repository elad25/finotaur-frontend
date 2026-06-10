## In plain words

**Gamma Exposure (GEX)** measures the total **gamma** held by options market makers across all contracts in an underlying. Because dealers must **delta-hedge** their books to stay directionally neutral, their gamma position forces them to buy or sell shares as price moves. When dealers are net long gamma, their hedging activity acts as a brake — they sell into rallies and buy dips, dampening volatility. When dealers are net short gamma, they must chase price in the same direction it is moving, amplifying swings.

## Quick demo

Suppose dealers are collectively short a large amount of SPY gamma at the $500 strike. SPY rallies to $501. Each dealer's delta exposure just increased, so they must sell shares to re-hedge — which pushes price back toward $500. But if the rally continues to $505, the selling pressure grows, potentially destabilizing price further. Near earnings season or after a major options expiration, GEX flips, and traders who understand dealer positioning can anticipate whether the market is likely to pin near a strike or break sharply away from it.

## Full explanation

### Why dealers have gamma at all

Most retail and institutional options flow comes from buyers of puts and calls. Dealers are on the other side — they **sell** options, which makes them short gamma by default. To manage this, dealers continuously delta-hedge: adjusting their share position to offset the directional exposure that gamma creates as price moves.

### Gamma and delta hedging mechanics

- **Delta** tells a dealer how many shares to hold per contract to be directionally neutral.
- **Gamma** tells a dealer how fast that share count must change as price moves.

When a dealer is long gamma (a less common state, usually from buying back options): hedging means selling into strength and buying into weakness — a stabilizing, mean-reverting force on price.

When a dealer is short gamma (the typical state): hedging means buying into strength (adding shares as price rises and their delta exposure grows) and selling into weakness — a destabilizing, trend-amplifying force.

### How GEX is calculated

GEX aggregates gamma across all open interest, weighting each contract by:

1. The option's per-contract gamma (from the Black-Scholes formula or equivalent).
2. The number of open contracts.
3. The multiplier (usually 100 shares per contract).
4. The assumed dealer positioning — typically inferred by assuming dealers are short all single-leg puts and short calls sold by retail.

The result is expressed in dollar terms: "Dealers need to buy $500M in shares for every 1% move in the underlying."

### Strike pinning and gamma walls

Large concentrations of open interest at specific strikes create **gamma walls** — levels where dealer hedging activity becomes especially intense. Price often gravitates toward these strikes as expiration approaches (a phenomenon called **pinning**), because the hedging flows of dealers become a self-reinforcing attractor. Conversely, if price breaks through a large gamma wall, the hedging flow reverses direction, and the move accelerates.

### Positive vs. negative GEX regimes

- **Positive GEX (dealers net long gamma)** — tends to compress intraday volatility. Price oscillates in a tighter range. Market makers act as a shock absorber.
- **Negative GEX (dealers net short gamma)** — tends to amplify intraday moves. Breakouts extend further; dip-buying produces sharper bounces. Volatility expands.

For a trader, knowing whether the market is in a positive or negative GEX environment helps set realistic expectations for range versus trend behavior on any given day, and provides a structural reason to be more aggressive or more conservative about holding positions through intraday swings.
