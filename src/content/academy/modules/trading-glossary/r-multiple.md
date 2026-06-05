## In plain words
An **R-multiple** expresses a trade's outcome as a multiple of the initial risk taken — turning every result into a comparable unit regardless of dollar size.

## Quick demo
You risk $200 on a trade (your stop-loss is $200 below entry). The trade hits your target for a $600 gain. That result is 3R — three times your initial risk.

## Full explanation
R stands for "risk" — specifically, the dollar amount you defined as your maximum loss when you entered the trade.

Once you define R, every outcome can be expressed in those units:
- A trade that earns exactly your risk amount = **1R**
- A trade that earns twice your risk = **2R**
- A trade that loses half your stop = **-0.5R**
- A trade stopped out fully = **-1R**

Why this matters:

R-multiples let you evaluate a trading system's performance independent of position size. A system that wins 40% of the time but averages 3R on winners and -1R on losers is profitable (expectancy = +0.8R per trade). A system that wins 60% but averages 0.8R winners and -1R losers is not (+0.08R per trade — marginal).

Expectancy formula: (Win rate × Average win in R) − (Loss rate × Average loss in R).

Thinking in R-multiples forces consistency: you cannot compare a $500 loss on a $100,000 position to a $500 gain on a $5,000 position without normalizing for risk. R does that normalization automatically.
