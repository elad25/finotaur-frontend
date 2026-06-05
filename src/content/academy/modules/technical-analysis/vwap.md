## In plain words

**VWAP** stands for Volume-Weighted Average Price. It is the average price at which a stock has traded throughout the day, weighted by how much volume occurred at each price. If most of the day's volume happened at $50, the VWAP will be close to $50 — regardless of where price is trading right now. It is the intraday **fair value** benchmark: institutional traders use it to evaluate whether they bought or sold at a good average price relative to the market.

## Quick demo

Microsoft opens at $415 and climbs to $425 by mid-morning. The VWAP, however, sits at $418 — reflecting that most of the early morning's high-volume trading occurred between $415 and $420. When price pulls back from $425 to $418 at the VWAP, active traders see it as a potential support level: institutional algorithms that buy "at or better than VWAP" are natural buyers at exactly that level, and indeed price bounces sharply from $418.

## Full explanation

### How VWAP is calculated

VWAP is calculated from the market open, reset every day:

1. For each period (e.g., each 1-minute candle), calculate a typical price = (high + low + close) / 3.
2. Multiply the typical price by the period's volume.
3. Divide the running cumulative sum of (price × volume) by the running cumulative volume.

VWAP = Σ(Typical Price × Volume) / Σ(Volume)

Because it is cumulative from the open, VWAP only makes sense as an intraday tool on its native timeframe. A daily VWAP resets at 9:30 AM (for US equities) and reflects only that day's session.

### Who uses VWAP and why

**Institutional traders** and algorithms use VWAP as a benchmark for execution quality. A fund that needs to buy 1 million shares will often use a VWAP algorithm — breaking the order into many smaller trades to avoid moving the market and measure performance against the session's VWAP. Buying below VWAP = outperforming the benchmark.

**Day traders** use VWAP as a dynamic support/resistance level and as a trend filter:
- Price above VWAP → bulls are in control, VWAP is support on pullbacks.
- Price below VWAP → bears are in control, VWAP is resistance on rallies.

### VWAP as a trend filter

Many day traders use VWAP directionally:
- Long trades preferred when price is above VWAP and VWAP is rising.
- Short trades preferred when price is below VWAP and VWAP is flat or declining.
- A reclaim of VWAP after being below it (price breaks back above VWAP with volume) is often a bullish intraday signal.
- A failed attempt to reclaim VWAP — price rallies to VWAP and is rejected — is a bearish continuation signal.

### Anchored VWAP

**Anchored VWAP (AVWAP)** is a more flexible variation where the trader chooses the starting point rather than always the open. Common anchoring points:

- **Earnings date** — the AVWAP from earnings shows the average price since the news event.
- **Major swing low or high** — the AVWAP from a key turning point reveals how the subsequent trend has distributed volume.
- **IPO date** — the AVWAP from a stock's IPO is watched by traders as a long-term fair value reference.

Anchored VWAP has grown significantly in popularity because it provides context that standard daily VWAP cannot.

### VWAP bands (standard deviation bands)

Some trading platforms display VWAP with standard deviation bands above and below, creating a dynamic channel similar to Bollinger Bands. Price trading at +2 standard deviations above VWAP is statistically extended; price at -2 standard deviations below is statistically extended to the downside. Mean-reversion traders use these bands to identify potential fade setups.

### VWAP limitations

- **Intraday only** (for standard daily VWAP) — the daily reset makes VWAP irrelevant on daily or weekly charts. Use moving averages for longer timeframes.
- **Not predictive** — VWAP is a lagging measure of where the average transaction occurred. It does not predict where price will go.
- **Low-volume stocks** — VWAP can be distorted by a single large block trade at an unusual price, especially in illiquid securities.
- **Forex and crypto** — volume data reliability issues (same as noted for volume analysis generally) affect VWAP accuracy in those markets.

### Why it matters for a trader

VWAP is the single most important intraday indicator for active day traders and for understanding institutional behavior. Unlike moving averages, which are time-weighted, VWAP reflects where actual money changed hands — making it a more economically meaningful level. When VWAP aligns with a key chart level (prior support, Fibonacci retracement, moving average), the confluence creates high-probability intraday entry zones that institutions and traders alike are likely to react to.
