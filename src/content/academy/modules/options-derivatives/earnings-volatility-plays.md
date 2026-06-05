## In plain words

Every quarter, publicly traded companies report earnings — and before they do, **implied volatility** in their options rises sharply as the market prices in uncertainty about the outcome. This **IV ramp** creates two distinct trading opportunities: buying volatility before the report (betting the actual move will be larger than priced in) or selling volatility before the report (betting the actual move will be smaller). After the announcement, IV almost always collapses — a phenomenon called the **IV crush** — which dramatically affects option prices regardless of what the stock does.

## Quick demo

A company reports earnings in two days. The ATM straddle on a $100 stock costs $8 — implying the market expects roughly an 8% move. The stock actually moves 5% on earnings. Even though it moved, the straddle buyer loses money: the option that was $8 is now worth about $5 on a 5% move, while IV collapsed from 90% to 30% post-announcement. The move was real, but the "expected move" was priced at 8%, so a 5% move disappointed the straddle.

## Full explanation

### The IV ramp before earnings

Options market makers know that earnings create binary risk. They raise IV to compensate for this uncertainty, which inflates premiums on all options, but especially the ATM ones with shorter expirations.

- The ramp typically begins 2–5 weeks before the earnings date for large-cap stocks.
- The "implied move" — derived from the ATM straddle price divided by the stock price — tells you what the market is pricing as the expected one-standard-deviation move.
- If the ATM straddle is $8 on a $100 stock, the implied move is approximately ±8%.

### IV crush after earnings

Once the news is out, uncertainty is resolved. IV resets rapidly — often within minutes of the announcement — falling to its typical "quiet" level. This is IV crush.

- An option that was trading at IV of 80% may drop to IV of 25% immediately after earnings.
- The stock could move 6% in the right direction, but if IV drops from 80% to 25%, the option may be worth less than what you paid — even though you were directionally correct.

### Strategy 1: Buying volatility (long straddle before earnings)

**Thesis**: The actual move will exceed the implied move.

**Requirements**:
- The stock has a history of moving more than the implied move (check historical earnings moves vs. implied moves).
- IV is not already stretched to an extreme (buying very rich IV is expensive).
- You enter 1–3 days before earnings, before the final ramp inflates costs further. (Some traders enter 1–2 weeks early to capture the IV ramp itself.)

**Risk**: IV crush can wipe out gains even if the stock moves significantly. The move must convincingly exceed the implied move.

### Strategy 2: Selling volatility (short straddle or strangle before earnings)

**Thesis**: The actual move will be smaller than the implied move; IV is overpriced.

**Structure**: Sell a straddle or strangle and close it after the earnings announcement once IV crushes.

**Requirements**:
- The stock has a history of moving less than its implied move.
- IV Rank is elevated (above 50–70).
- You define maximum loss in advance — often by using an iron condor structure to avoid uncapped risk on a surprise move.

**Risk**: An earnings surprise (a large unexpected move) can produce rapid, large losses on the short side. This is the "blowup risk" in earnings volatility plays.

### Practical considerations

- **Check the historical earnings move vs. implied move** before every trade. Some stocks reliably under-deliver; others frequently surprise.
- **Close before earnings if buying IV** to bank the ramp, or **hold through earnings if selling IV** to capture the crush.
- Defined-risk structures (iron condor, spread) are strongly preferred over naked straddles/strangles for risk control.

Earnings seasons create some of the highest-probability setups in options — if you know which side of the volatility equation to be on.
