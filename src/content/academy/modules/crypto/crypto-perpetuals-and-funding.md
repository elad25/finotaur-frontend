## In plain words

A **perpetual contract** (or "perp") is a derivative that lets you bet on the price of a crypto asset — long or short, with leverage — without ever owning the underlying coin and without an expiry date. They are by far the most heavily traded instrument in crypto markets. A **funding rate** is a periodic payment between longs and shorts that keeps the perpetual's price tethered to the spot price instead of drifting away from it.

## Quick demo

Suppose BTC is trading at $65,000 spot, but perpetual longs have piled in and the perp is trading at $65,200. To close that gap, the mechanism charges a **funding fee** to longs and pays it to shorts every 8 hours. With a 0.05% funding rate, holding a $100,000 long position costs you $50 every 8 hours — or about $1,800 per month — just to hold the trade. When funding turns negative (shorts outnumber longs), shorts pay longs. Extreme funding rates are often a contrarian signal: when it's very expensive to be long, the market may be overheated.

## Full explanation

### How perpetuals work

Traditional futures contracts settle on a fixed date — the March contract expires in March. Perpetuals have no expiry. You can hold them indefinitely, as long as your margin covers the position. This design made perps the dominant crypto derivative almost immediately after BitMEX introduced them in 2016, because traders didn't have to manage rolling contracts.

### The funding mechanism

Without a settlement date, the perp price needs another mechanism to stay linked to spot. That mechanism is the **funding rate**:

- Calculated from the difference between the perpetual price and the spot (index) price
- Charged or paid every 8 hours (most exchanges; some use 1 hour or continuous accrual)
- When perp > spot: longs pay shorts (funding is positive, market is bullish)
- When perp < spot: shorts pay longs (funding is negative, market is bearish or fearful)

Funding rates are paid peer-to-peer between position holders; the exchange does not receive or pay funding.

### Leverage and margin

Most perp platforms offer leverage from 2x to 100x (or higher on some venues). Leverage amplifies both gains and losses, and positions are liquidated if margin falls below the **maintenance margin** level. Because liquidations happen automatically and instantly, cascades are common during sharp moves: a wave of forced closes drives price further, triggering more liquidations.

### Open interest

**Open interest (OI)** is the total notional value of all outstanding perp positions. Rising OI during a rally means new money is entering leveraged longs — a sign of conviction but also of accumulated liquidation risk. Falling OI during a rally (price up, OI down) often indicates short covering rather than new buying, which tends to be a weaker setup. Watching OI and funding together gives a clearer picture of positioning than price alone.

### Perp dominance in crypto markets

Crypto perpetual volume routinely exceeds spot volume by a factor of 5–10x. This means that price discovery in crypto happens substantially in the derivatives market, not just in spot. Liquidation clusters — visible on many analytics platforms — are often where price moves accelerate or reverse, because exchange matching engines execute all those forced closes simultaneously.

### Key differences from traditional futures

| | Traditional Futures | Crypto Perpetuals |
|---|---|---|
| Expiry | Fixed date | None |
| Settlement | Cash or physical | Cash (usually USDC or the coin) |
| Roll needed? | Yes | No |
| Price anchor | Convergence at expiry | Funding rate |
| Leverage available | Typically up to 20x | Up to 100x or more |

### Why it matters for a trader

Even if you trade only spot crypto, perpetuals affect the price of the underlying. Large funding rate imbalances, over-leveraged positioning, and OI accumulation at key levels create identifiable dynamics. Sudden funding spikes and liquidation cascades are regular features of crypto price action. Understanding them helps you distinguish between a genuine breakout and a leverage flush.
