## In plain words

A **stablecoin** is a cryptocurrency designed to maintain a stable value — usually pegged to $1. It combines the programmability and speed of crypto with the price stability of a traditional currency. Stablecoins are the primary way traders hold "cash" inside the crypto ecosystem without leaving it, and they power most DeFi protocols and exchange settlement.

## Quick demo

Imagine you're long Bitcoin at $60,000 and you think a correction is coming. Rather than selling BTC for US dollars — which means withdrawing to a bank, paying fees, and waiting days — you sell BTC for USDC on an exchange. Your USDC balance stays at exactly $1 per coin regardless of what Bitcoin does. When you're ready to re-enter, you swap back instantly, 24/7. That's the practical value of a stablecoin: it's dollars that move at blockchain speed.

## Full explanation

### Types of stablecoins

There are three distinct mechanisms for maintaining a $1 peg, each with different risk profiles:

#### 1. Fiat-backed (custodial)
The issuer holds US dollars (or equivalent short-term Treasuries) in a bank account and mints one token per dollar held.

- **USDC** (Circle) and **USDT** (Tether) are the two largest, together accounting for the vast majority of stablecoin volume.
- Risk: counterparty risk on the issuer, reserve transparency, regulatory action. USDC briefly de-pegged to ~$0.87 in March 2023 when Silicon Valley Bank (which held some Circle reserves) failed — and recovered within days once it was clear reserves were safe.
- These are the most stable in practice because the peg is backed by real dollars.

#### 2. Crypto-backed (over-collateralized)
Users lock up cryptocurrency (e.g., ETH) as collateral worth more than the stablecoins they mint. The excess collateral is the buffer against price drops.

- **DAI** (MakerDAO) is the leading example. To mint $100 DAI, you might need to deposit $150 worth of ETH. If the collateral falls below a liquidation threshold, it's automatically sold to maintain the peg.
- Risk: if collateral prices fall faster than liquidations can clear, the system can become undercollateralized. Governance risk also applies.

#### 3. Algorithmic (uncollateralized or under-collateralized)
The peg is maintained by an algorithm that expands or contracts supply in response to demand — no full reserve backing.

- **TerraUSD (UST)** was the most prominent example. It collapsed in May 2022 in a "death spiral": a large redemption pressure broke confidence in the mechanism, causing a bank run that brought both UST and its paired token LUNA to near zero within days, wiping out roughly $40 billion in market value.
- Algorithmic stablecoins are considered high-risk and have largely lost market confidence after the Terra collapse.

### Yield on stablecoins

Stablecoins can be lent or deposited in DeFi protocols to earn yield. Rates vary widely based on protocol demand, risk, and market conditions. High advertised yields (>20% APY) are a common warning sign — understand the source of that yield before committing funds.

### Regulatory landscape

Stablecoins have attracted significant regulatory attention globally. In the US, legislation around stablecoin reserves and issuer requirements has been in development for several years. Reserve audits, issuer licensing, and limits on algorithmic designs are all active policy topics. Regulatory changes can affect which stablecoins remain accessible in specific jurisdictions.

### Why it matters for a trader

Stablecoins are the primary unit of account in crypto trading. Understanding the peg mechanism matters because peg breaks create sudden volatility — not just in the stablecoin itself, but across any protocol or asset priced in it. Knowing which stablecoin your exchange or protocol uses as its settlement asset tells you what counterparty risk you're implicitly holding.
