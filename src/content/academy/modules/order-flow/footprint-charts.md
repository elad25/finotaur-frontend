## In plain words

A **footprint chart** (also called a cluster chart or order flow chart) replaces the solid body of a standard candlestick with a grid. Each row in the grid is a specific price level; each cell shows how many contracts were bought (at the ask) and sold (at the bid) at that exact price during that candle. Instead of seeing that a candle went up 10 ticks, you see *where* the buying happened, *how much*, and whether sellers put up a fight at any level.

## Quick demo

A 1-minute E-mini S&P candle forms between 5,200 and 5,202. In a standard chart you see a bullish candle. In the footprint version you see: 5,200 had 820 buys and 95 sells (heavy buy imbalance — the launch pad), 5,201 had 310 buys and 280 sells (a minor battle), and 5,202 had 40 buys and 510 sells (sellers overwhelmed buyers at the top — potential exhaustion). The candle was bullish, but the footprint shows conviction weakening as price climbed.

## Full explanation

### Anatomy of a footprint candle

Each candle in a footprint chart has:

- **Bid column** (left): aggressive sell volume at each price level.
- **Ask column** (right): aggressive buy volume at each price level.
- **Delta per level**: the difference between the two columns at each price.
- **Total candle delta**: sum of all per-level deltas — shown at the top or bottom of the candle.

Most platforms also display the **total volume per candle** and allow users to configure imbalance thresholds (e.g., highlight in red/green when ask volume is 3x bid volume or vice versa).

### Key patterns to recognize

**Buy imbalance clusters (stacked ask imbalances)**: consecutive price levels where ask volume heavily dominates bid volume. Often marks the origin of a move — where institutional buyers stepped in aggressively. These levels can act as support on a pullback.

**Sell imbalance clusters (stacked bid imbalances)**: consecutive levels where bid volume heavily dominates. Marks where sellers were aggressive — potential resistance.

**Delta divergence**: candle closes near its high but delta is negative — sellers won the volume battle even though price closed up. This warns that the move was driven by short covering or thin supply rather than genuine demand.

**High-volume nodes within a candle**: a single price level with a disproportionately large volume. This price attracted the most activity; it is the micro Point of Control and often acts as a magnet on revisits.

**Absorption**: one side threw volume at a level but price didn't move. Visible in the footprint as large sell volume at a level paired with minimal price decline — buyers absorbed every seller.

### Footprint types

Different platforms label footprint variants by how they display data:

- **Bid x Ask (cluster)**: shows raw bid and ask volume side by side at each price level — the most common format.
- **Delta footprint**: shows only the net delta per level (positive or negative number).
- **Volume footprint**: shows total traded volume per level without separating bid/ask.

Bid x Ask is the most information-dense and is standard for order-flow traders.

### Limitations

Footprint charts require **tick data** — second-by-second or trade-by-trade granularity. They are not available for all instruments; futures (ES, NQ, CL, GC) and major crypto pairs typically have the best data quality. For stocks, the data can be fragmented across multiple exchanges and is harder to read cleanly. Additionally, footprints show *traded* volume, not *intended* volume — a large order broken into many small pieces may not appear as a single dramatic event.

### Why it matters for a trader

The footprint chart is the closest thing retail traders have to the institutional tape. It answers the questions a candlestick can't: Was this move driven by real aggression or thin air? Where exactly did the big players step in? Is the momentum at the top or bottom of a move strengthening or exhausting? Those answers, read correctly, improve the timing and confidence of every entry and exit.
