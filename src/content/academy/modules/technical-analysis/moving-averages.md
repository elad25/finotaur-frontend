## In plain words

A **moving average (MA)** smooths out a price series by averaging the past N closing prices, creating a flowing line on the chart. It filters out the noise of daily price swings so you can see the underlying trend more clearly. The two most common types are the **simple moving average (SMA)** — a plain average of N periods — and the **exponential moving average (EMA)** — which gives more weight to recent prices and responds faster to new data.

## Quick demo

The S&P 500 is at 5,200. Its 200-day SMA is at 4,900. Price pulling back from 5,200 to 4,900 would bring it to its long-term average — a level watched by millions. Institutional buyers often step in at the 200-day SMA because it represents the average cost for all holders over the past year. When the 50-day SMA crosses above the 200-day SMA, it is called a **golden cross** — a widely followed bullish signal.

## Full explanation

### Simple Moving Average (SMA)

The SMA adds the closing prices of the last N periods and divides by N. A 20-day SMA uses the 20 most recent daily closes. Every day, the oldest value drops off and the newest is added — the average "moves" forward.

Commonly watched SMAs: 20-day (short-term), 50-day (medium-term), 200-day (long-term). Each serves a different purpose depending on your trading horizon.

### Exponential Moving Average (EMA)

The EMA applies a multiplier that gives more weight to recent prices. The multiplier for an N-period EMA is: 2 / (N + 1). This makes the EMA react faster to price changes than the SMA.

- A 12-day EMA reacts to a price spike more quickly than a 12-day SMA.
- In fast-moving markets, EMAs are often preferred because they keep pace with price better.
- The MACD indicator (covered in its own chapter) is built from two EMAs.

Commonly watched EMAs: 9-day, 21-day (short-term traders), 50-day and 200-day (used both as SMA and EMA depending on platform defaults).

### Moving averages as dynamic support and resistance

A key use of MAs is as a **dynamic support or resistance level**: when price is above its 50-day MA, the MA may act as support — and price dipping to the MA may be a buying opportunity. When price is below the MA, the MA may act as resistance capping rallies. The strength of this support or resistance increases with the timeframe of the average (200-day > 50-day > 20-day).

### Crossovers

Moving average crossovers are one of the most widely used signals in TA:

- **Golden cross** — the 50-day MA crosses above the 200-day MA. Widely interpreted as a long-term bullish signal; markets tend to perform better on average in the months following a golden cross.
- **Death cross** — the 50-day MA crosses below the 200-day MA. A long-term bearish signal; has preceded several major market declines, though also produces false signals.
- **Short-term crossovers** — for active traders, the 9-EMA crossing the 21-EMA is a common entry signal on daily or intraday charts.

### Limitations of moving averages

Moving averages are **lagging indicators**: they are built from past prices, so they always trail current price action. In trending markets they work well; in choppy, sideways markets they generate many false signals as price repeatedly crosses back and forth through the MA. Using them alone, without regard for trend context, leads to many whipsaw trades.

### Why it matters for a trader

Moving averages are probably the most ubiquitous tool in technical analysis. They define the trend, identify dynamic support and resistance, and generate crossover signals. More importantly, they are watched by so many participants that they become self-fulfilling to a degree — if the majority of algorithmic systems buy the 200-day MA touch, price will react there. Understanding moving averages lets you anticipate where institutional and algorithmic orders are likely to cluster.
