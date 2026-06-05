## In plain words

The **Depth of Market (DOM)** — also called the order ladder or Level 2 — is a live list of resting limit orders sitting above and below the current price. It shows you *exactly* how many contracts buyers are willing to buy at each price below the market and how many sellers are willing to sell at each price above it. A **heatmap** is a visual overlay on a price chart that records and colors where large DOM orders have appeared over time, turning the ephemeral DOM into a persistent map of liquidity.

## Quick demo

Crude oil is trading at $80.00. The DOM shows 3,200 contracts resting at $79.80 (a large buy wall) and only 150 contracts at each price between $79.80 and $80.00. A seller trying to push price below $80.00 would have to consume all those thin levels — then slam into 3,200 contracts. The heatmap would mark $79.80 in a bright color because that cluster has been sitting there for several minutes. Price is likely to slow or reverse at that level.

## Full explanation

### The DOM (Depth of Market)

The DOM displays the **order book** in real time:

- **Bid side** (left/below current price): resting limit buy orders. The more contracts at a level, the harder it is for sellers to push price through.
- **Ask side** (right/above current price): resting limit sell orders. Dense ask clusters act as resistance.
- **Best bid / best ask**: the innermost levels on each side — together they define the current spread.

The DOM updates continuously. Orders appear, fill, and are canceled within milliseconds. Reading the DOM requires speed and practice; most retail traders focus on the heatmap, which makes DOM data accessible by slowing it down visually.

### What a heatmap shows

A heatmap records where large orders have been sitting on the DOM over a chosen lookback period and renders them as colored bands on the price chart:

- **Hot colors (red, orange, white)**: levels where large order sizes clustered most persistently — high-probability support or resistance.
- **Cool colors (blue, purple)**: smaller, less persistent order activity.
- **Diagonal streaks**: large orders that were repeatedly refreshed as price moved — a sign of an active, defending participant.

Because large orders on the DOM are sometimes **canceled before trading** (spoofing), heatmaps that also overlay *actual traded volume* at each level are more reliable than raw order-book displays.

### Key heatmap signals

**Walls and absorption zones**: a thick, persistent hot band at a level means a large passive participant has been defending that price. Price often stalls, reverses, or uses it as a launching pad.

**Disappearing walls**: a large bid or offer that vanishes as price approaches is a spoof. The heatmap shows its ghost — it was there, but it evaporated. A trader who acted on it as real support will be caught off guard.

**Vacuum (thin book)**: levels with little to no order activity on the heatmap are low-friction zones. Price tends to move through them quickly. These zones often explain fast, seemingly random price spikes — there was simply nothing to slow it down.

**Liquidity voids above highs / below lows**: once a key level breaks, the heatmap often shows a thin zone beyond it where price can extend rapidly before finding the next cluster of resting orders.

### DOM strategies

Experienced DOM traders watch for:

- **Stacking**: large orders being repeatedly added to one side as price approaches — genuine defense.
- **Flipping**: a large bid at a key level that suddenly converts to a large offer (or vice versa) — a market maker repositioning, often coinciding with a directional move.
- **Bid/offer sweeps**: rapid consumption of multiple DOM levels in sequence — the signature of an institutional market order entering.

### Limitations

DOM data for futures (E-mini, crude, gold, treasuries) is authoritative because all orders are centrally cleared. For stocks, the DOM reflects only one exchange; dark pools and off-exchange flow are invisible. This is why DOM/heatmap analysis is most reliable in centrally-cleared futures markets.

### Why it matters for a trader

The heatmap and DOM give you a forward-looking map of where liquidity sits — before price gets there. This is qualitatively different from every indicator that only analyzes past price action. Knowing that a major buy wall sits 10 ticks below the current price changes how you size and manage a trade. It doesn't guarantee a bounce, but it tells you where the market's own structure says the next battle is most likely to occur.
