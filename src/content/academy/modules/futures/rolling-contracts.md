## In plain words

Futures contracts expire. When one expiration approaches, traders who want to maintain their position must **roll** — closing the expiring contract and simultaneously opening a new position in the next expiration month. Rolling is not optional if you want to stay in the trade; ignoring expiration means your position disappears or, for physical contracts, you may face delivery obligations.

## Quick demo

You are long one ES (S&P 500 e-mini) December contract. In mid-December, the contract expires. To stay long, you sell the December contract (closing it) and buy the March contract (opening the next one) in a single operation — ideally in one order to avoid being unintentionally flat. If December trades at 5,200 and March trades at 5,210, you pay a 10-point premium to roll forward. That cost is the **roll cost**, and it comes directly from your P&L.

## Full explanation

### Why futures expire

Futures were designed for commercial purposes — to lock in a price for a commodity to be delivered on a specific date. The expiration is not a flaw; it is the core mechanism. For financial futures (equity indexes, interest rates), expiry triggers cash settlement. For commodity futures, it triggers delivery unless the contract is closed or rolled first.

### When to roll

The most liquid rolling window is typically the two weeks before expiration, known as the **roll period**. For CME equity index futures (ES, NQ), most volume shifts from the expiring front-month to the new front-month starting around the Thursday before the expiration Friday (eight to nine days before expiry). Trading the expiring contract after that point means trading in a less liquid, wider-spread market.

### How to roll

A roll is two transactions:
1. **Close** the expiring contract (buy to close if short, sell to close if long).
2. **Open** the next contract (buy the new month if you want to stay long, sell if short).

These can be done as two separate orders or as a single **spread order** (a "calendar spread"), which executes both legs simultaneously and reduces the risk of being unintentionally flat between fills.

### The roll cost and roll credit

The price difference between the two expiration months is not arbitrary:
- **In contango** (far month priced higher): rolling a long position costs money. You close at a lower price and re-open at a higher price.
- **In backwardation** (far month priced lower): rolling a long position earns a credit. You close at a higher price and re-open at a lower price.

Over months and years, this roll cost (or credit) compounds and materially affects total returns — particularly for commodity ETFs and anyone trading futures as a long-term position.

### Open interest shift: reading the roll

Watching **open interest** as expiry approaches is a reliable signal of when the roll is happening. Open interest in the expiring contract shrinks while open interest in the next contract grows. Traders and data providers publish the official "first notice day" and "last trading day" for every contract on the exchange website.

### Continuous futures charts

Charting platforms stitch together successive contract months into a **continuous (perpetual) futures chart** using one of two methods: back-adjustment (the most common, which removes price gaps) or unadjusted (shows the raw roll gaps). When you see an ES chart going back years, you are looking at a continuous chart — it is not one contract, it is dozens of them spliced together.

### Why it matters for a trader

Missing an expiration is a beginner mistake that can be costly. Set a calendar reminder for the last trading day of every contract you hold. Understand whether rolling costs you money (contango) or gives you a credit (backwardation) — it is real P&L, not an abstraction. And when using continuous charts for backtesting, know which adjustment method was applied.
