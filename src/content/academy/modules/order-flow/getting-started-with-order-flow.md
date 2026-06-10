## In plain words

**Order flow** is the real-time record of every buy and sell order hitting a market. Instead of reading a price chart after the fact, order-flow tools let you watch the raw transactions — who is aggressive, how large the orders are, and whether buyers or sellers are in control right now. The three main tools are the **footprint chart**, the **depth of market (DOM)**, and **volume profile**.

## Quick demo

Imagine an E-mini S&P 500 futures contract trading at 5,200. In the past five seconds, 1,200 contracts were bought at the ask and only 300 sold at the bid. The **buy/sell imbalance** is 4-to-1 in favor of buyers. A price chart shows a single 5-second candle that went up two ticks. Order flow shows *why* it went up and how aggressively — data a candle alone cannot convey.

## Full explanation

### What order flow actually tracks

Every trade is one party being **aggressive** (taking liquidity at the current offer or bid) and another being **passive** (resting a limit order that gets hit). Order flow counts those aggressive transactions:

- **Buying volume** — contracts/shares lifted at the ask (aggressive buyers).
- **Selling volume** — contracts/shares hit at the bid (aggressive sellers).
- **Delta** — the difference: buy volume minus sell volume for any period.

A large positive delta means buyers dominated; a large negative delta means sellers dominated.

### The tools that surface order flow

**Footprint chart**: a candlestick chart where the body of each candle is replaced by a grid showing buy and sell volume at every individual price level inside that candle. You can see exactly where large buyers stepped in and where sellers overwhelmed bids.

**DOM / Depth of Market**: a live ladder showing resting limit orders above and below the current price — visible bids and offers before they trade. Watching the DOM reveals where large players are stacking orders and how quickly those orders are pulled or absorbed.

**Volume Profile**: a histogram rotated 90 degrees alongside the price chart, showing how much volume traded at each price level over a chosen period. High-volume nodes become magnet levels; low-volume gaps become fast-travel zones.

### Why order flow complements traditional charts

Candlestick charts summarize finished action. Order flow is live. A bullish candle with a collapsing delta (sellers overwhelmed buyers despite price rising) is a warning sign of weakness — a chart alone hides that. Order-flow traders use this mismatch to anticipate reversals and confirm entries with higher confidence.

### Why it matters for a trader

Order flow is the closest retail traders can get to seeing institutional behavior in real time. A breakout with heavy buy-side aggression and absorbed supply is fundamentally different from a breakout driven by a thin order book and thin volume. Understanding order flow helps you avoid chasing false moves and enter where the evidence of real commitment exists.
