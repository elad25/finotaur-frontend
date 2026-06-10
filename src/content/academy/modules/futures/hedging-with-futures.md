## In plain words

**Hedging** means using one position to offset the risk of another. Futures were invented for this exact purpose. A portfolio manager who owns stocks can sell futures contracts to reduce their exposure to a market decline — without selling the stocks themselves. The futures position loses money if markets rise (offsetting gains in the portfolio) but makes money if markets fall (offsetting losses in the portfolio).

## Quick demo

A fund manager holds $5 million in S&P 500 stocks. She fears a correction before a major event but doesn't want to sell and trigger taxes. ES is trading at 5,000, so one contract = $250,000 notional. She sells 20 ES contracts (20 × $250,000 = $5,000,000) short. If the index falls 5%, her stock portfolio loses ~$250,000, but her 20 short ES contracts gain ~$250,000. The hedge worked. After the event, she buys back the futures and her portfolio is unhedged again.

## Full explanation

### What hedging achieves

A hedge is not designed to generate profit — it is designed to **reduce or eliminate a specific risk**. A perfect hedge eliminates all directional risk. In practice, hedges are rarely perfect, but they can substantially reduce the impact of adverse price movements.

Hedging has a cost: if the market moves in your favor, your gains are capped or offset by losses on the hedge. This is the price of insurance.

### Common users of futures hedges

- **Portfolio managers** hedging equity exposure before anticipated volatility (earnings season, elections, Fed meetings).
- **Airlines and shipping companies** hedging fuel costs using crude oil futures.
- **Farmers and commodity producers** locking in a selling price before harvest.
- **Importers and exporters** hedging currency risk using forex futures.
- **Bond portfolio managers** hedging interest rate risk with Treasury futures.

### Calculating the hedge ratio

To hedge a stock portfolio using ES futures, you need to account for the portfolio's **beta** — its sensitivity to the index.

**Number of contracts = (Portfolio value × Beta) ÷ (Futures price × Multiplier)**

A $2 million portfolio with a beta of 1.2 against the S&P 500, with ES at 5,000 and a $50 multiplier:
(2,000,000 × 1.2) ÷ (5,000 × 50) = 2,400,000 ÷ 250,000 = **9.6 contracts ≈ 10 contracts**

A portfolio with beta above 1.0 is more volatile than the index, so it needs more contracts to fully hedge.

### Partial hedges

Full hedges are rare. Most portfolio managers use partial hedges — reducing exposure by 30%, 50%, or some fraction — rather than eliminating it entirely. A partial hedge balances protection cost against continued upside participation.

### Delta hedging with futures

Options traders often use futures to **delta hedge** their options book. If an options position has a positive delta of +50 (equivalent to being long 50 shares of the underlying), selling one futures contract (which has a delta of approximately −100 shares) partially neutralizes the directional exposure. This dynamic hedging is central to how options market makers operate.

### The basis risk problem

**Basis risk** is the risk that the hedge does not move in perfect lockstep with the underlying position. For example, a technology-heavy portfolio hedged with the S&P 500 futures may not be perfectly hedged on a day when tech sells off but the broader index holds up. Choosing the correct futures contract — one that closely tracks the actual risk being hedged — minimizes basis risk.

### Why it matters for a trader

Even if you never use futures as a hedge yourself, understanding hedging behavior explains a lot about how futures markets move. When large institutions are forced to unwind hedges, they create predictable flows. Periods around options expiration (OpEx) and index rebalancing involve mass hedge adjustment by funds — these create the unusual price behavior that informed traders anticipate and position for.
