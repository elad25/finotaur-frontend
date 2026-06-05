## In plain words

Every transaction on a blockchain costs a small fee paid to the network's validators — this is called a **gas fee**. Gas prices fluctuate based on how congested the network is at that moment. Different blockchains have wildly different fee levels, and sending crypto on the **wrong network** is one of the most common and irreversible mistakes beginners make.

## Quick demo

Sophie wants to send $50 of USDC to a friend. On Ethereum mainnet during peak hours, the gas fee to transfer is $18 — 36% of her transfer. She switches to Polygon, a compatible network, and pays $0.01 for the same transaction. However, when she tries to use those funds on an Ethereum-based app, she has to bridge them back — which costs another fee. Understanding which network to use when saves real money.

## Full explanation

### What gas fees actually are

Blockchains are decentralized networks where validators (miners or stakers) process and confirm transactions. Gas fees compensate them for the computational work. The fee is not fixed — it is an auction: when many people want transactions confirmed quickly, they bid higher fees to jump the queue.

On Ethereum, gas is measured in **gwei** (a small unit of ETH). The total fee you pay equals:
> gas units used × gas price (in gwei) × ETH/dollar price

A simple transfer uses ~21,000 gas units. A complex DeFi interaction might use 200,000+.

### Why fees spike

- High network activity (NFT mints, token launches, market crashes)
- Popular DeFi protocols experiencing surges in usage
- Time of day — activity tends to peak during US and European market hours

### Layer 1 vs. Layer 2 networks

**Layer 1 (L1)** — the base blockchain. Bitcoin, Ethereum, Solana, Avalanche. Fees vary dramatically:
- Ethereum: can range from $2 to $50+ per transaction
- Solana: typically fractions of a cent
- Bitcoin: $1–$30+ depending on mempool congestion

**Layer 2 (L2)** — networks built on top of Ethereum that process transactions off-chain and settle on Ethereum. Examples: Arbitrum, Optimism, Base, zkSync. Fees are typically $0.01–$0.10, with full compatibility with Ethereum applications.

### The network mismatch trap

Every token on every network has an address. The same USDC address on Ethereum is a different asset than USDC on Arbitrum, even though they look the same. Sending tokens to the **wrong network** — for example, sending Ethereum-network USDC to an address expecting Arbitrum USDC — can result in funds that are stuck or permanently lost.

**Always verify:**
- Which network the receiving address supports
- Which network you are sending from
- That both networks match before confirming

### Bridging between networks

To move assets from one network to another, you use a **bridge** — a protocol that locks tokens on one chain and mints equivalent tokens on the destination chain. Bridges have their own fees and their own risks (bridge hacks have cost users hundreds of millions of dollars in aggregate). Use only established, audited bridges.

### Practical fee tips

- Check gas trackers (Ethereum Gas Tracker, etc.) before transacting — fees can differ 10x between peak and off-peak hours
- For small amounts, choose low-fee networks (Solana, L2s) by default
- For large amounts on Ethereum, set a gas limit, not just a gas price
- Never set gas so low that your transaction fails (you still pay the gas, but nothing happens)

### Why it matters

Gas fees are not just a cost — they are a signal about network congestion and architectural trade-offs. Understanding them lets you choose the right network for each task, avoid costly mistakes, and keep more of your money working rather than being consumed by transaction costs.
