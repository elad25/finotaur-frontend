## In plain words

A **futures contract** is a standardized legal agreement to buy or sell a specific asset at a predetermined price on a specific future date. Unlike options, futures are obligations — both parties must follow through. Futures trade on regulated exchanges for commodities (oil, gold, wheat), financial instruments (stock indices, bonds), and currencies. They are heavily leveraged instruments: you control a large contract value with a small deposit called **margin**, and gains or losses are settled daily through a process called **marking to market**.

## Quick demo

The S&P 500 E-mini futures contract (/ES) represents $50 × the S&P 500 index. With the index at 5,000, one /ES contract controls $250,000 in value. The initial margin required might be $12,000 — roughly 5% of the notional value. If the index moves 50 points in your favor, you gain $2,500. If it moves 50 points against you, you lose $2,500 — nearly 21% of your margin — in one day. This leverage cuts both ways sharply.

## Full explanation

### Contract structure

Every futures contract specifies:

- **Underlying asset**: a commodity (crude oil, gold, corn), financial index (S&P 500, Nasdaq), interest rate (Treasury bonds), or currency pair.
- **Contract size**: standardized — e.g., one crude oil futures contract covers 1,000 barrels.
- **Delivery date (expiration)**: when the contract settles — quarterly (March, June, September, December) for most financial futures.
- **Settlement method**: physical delivery (for some commodities) or cash settlement (for most financial futures).

### Margin and leverage

Futures require an **initial margin** deposit — a fraction of the contract's notional value — as collateral. This is not a down payment; it is a performance bond that guarantees your obligation.

- **Variation margin**: Profits and losses are calculated and transferred between accounts at the end of each trading day — this is "marking to market." You cannot hold a losing futures position without meeting margin calls.
- **Maintenance margin**: A lower threshold. If losses reduce your account below the maintenance margin, you receive a margin call and must deposit additional funds or close the position.

### The roll

Futures contracts expire. Traders who want continuous exposure — not delivery — must "roll" the contract: close the expiring contract and open the next month's contract. The price difference between contracts is called the **basis**. Markets in **contango** (future price above spot) have a negative roll cost; markets in **backwardation** (future price below spot) produce a positive roll benefit.

### Futures vs. options

| Feature | Futures | Options |
|---|---|---|
| Obligation | Both sides must perform | Buyer has right, not obligation |
| Premium | No premium — margin only | Buyer pays premium |
| Leverage | Very high | Variable (depends on option) |
| Time decay | None | Theta erodes value for buyer |
| Max loss (buyer) | Unlimited | Limited to premium paid |

### Common futures markets for traders

- **Equity index futures**: /ES (S&P 500), /NQ (Nasdaq 100), /YM (Dow) — highly liquid, nearly 24-hour trading.
- **Energy**: /CL (crude oil), /NG (natural gas) — commodity price exposure.
- **Metals**: /GC (gold), /SI (silver) — hedging and macro plays.
- **Fixed income**: /ZB (30-year Treasury), /ZN (10-year Treasury) — interest rate exposure.

Futures are the primary tool for institutional hedging of large stock portfolios, commodity price risk, and interest rate exposure. For active traders, index futures provide nearly round-the-clock access to market exposure with deep liquidity and clearly defined leverage — making them both powerful and demanding instruments to manage responsibly.
