## In plain words

**IV Rank** and **IV Percentile** are two ways to answer the same question: is today's implied volatility high or low *relative to the stock's own history*? Because every stock has its own typical IV range, a raw IV number like 30% means nothing without context. A 30% IV for a slow utility stock is extreme; for a biotech it may be quiet. IV Rank and IV Percentile provide that context, telling you whether volatility is currently **cheap** (good time to buy options) or **rich** (good time to sell premium).

## Quick demo

A stock's IV over the past year ranged from 20% (low) to 60% (high). Today's IV is 50%. Its IV Rank is (50 − 20) / (60 − 20) = 75. That means current IV is at the 75th percentile of its annual range — elevated, relatively expensive. A premium seller sees this and considers it a favorable environment to sell options. If IV were at 22%, IV Rank would be just 5 — options are cheap, making it a better environment for option buyers.

## Full explanation

### IV Rank (IVR)

IV Rank is calculated as:

**IVR = (Current IV − 52-week Low IV) / (52-week High IV − 52-week Low IV) × 100**

The result is a number from 0 to 100. It tells you where current IV sits within the observed annual range.

- IVR of 0 = IV is at its lowest point of the past year.
- IVR of 100 = IV is at its highest point of the past year.
- IVR above 50 is generally considered elevated; below 30 is considered low.

**Limitation**: IV Rank is sensitive to outliers. If there was a single extreme spike in IV (such as during a market crisis), the high is skewed upward and today's IV will always look relatively low, even if it is genuinely elevated.

### IV Percentile (IVP)

IV Percentile takes a different approach:

**IVP = (Number of days in the past year when IV was below today's IV) / 252 × 100**

- IVP of 80 means today's IV was higher than 80% of all daily IV readings in the past year.
- IVP is more robust to outliers because no single spike can distort the full distribution.

In practice, IV Rank is more commonly displayed by brokers and platforms; IV Percentile is preferred by statistically rigorous traders.

### How traders use IVR and IVP

**High IVR / IVP (above 50, ideally above 70):**
- Options premiums are rich relative to history.
- Favorable conditions for **premium selling strategies**: covered calls, cash-secured puts, iron condors, strangles.
- The logic: if IV is elevated, it is likely to mean-revert lower, which reduces option prices and benefits sellers.

**Low IVR / IVP (below 30):**
- Options premiums are cheap relative to history.
- More favorable for **option buying** or **long vega strategies**: long straddles, long calls or puts on a directional thesis.
- The risk: low IV can stay low, and buying cheap options still requires being right on timing and direction.

### What IVR doesn't tell you

IVR and IVP do not predict when IV will change or what the underlying will do. They describe the relative cost of options, not a trading signal by themselves. They work best when combined with a view on direction (or a lack of direction for range-bound strategies) and an understanding of any upcoming events — earnings, economic data — that might explain why IV is elevated.

For active options traders, checking IVR before entering any trade is a discipline as basic as checking the chart. It answers the fundamental first question: am I a buyer or seller of premium today?
