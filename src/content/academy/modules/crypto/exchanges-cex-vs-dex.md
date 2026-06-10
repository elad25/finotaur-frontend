## In plain words

A **centralized exchange (CEX)** is a company — like Coinbase or Binance — that holds your funds, matches your orders, and acts as an intermediary. A **decentralized exchange (DEX)** is a smart contract running on a blockchain that lets you trade directly from your own wallet, with no company in the middle. Each model has different trade-offs in speed, cost, safety, and available assets.

## Quick demo

On Binance (a CEX), you deposit USDT, place a buy order for ETH at $3,500, and the exchange's internal matching engine finds a seller. The transaction happens in milliseconds; your balance updates in their database. On Uniswap (a DEX), you connect your MetaMask wallet, type in how much ETH you want, and a smart contract swaps it against a pool of liquidity — your wallet balance changes on-chain. No accounts, no deposits, no company involved. The trade settles on Ethereum in about 12 seconds, and you pay gas fees to the network.

## Full explanation

### Centralized exchanges (CEX)

A CEX is built like a traditional brokerage:

- **Order book or matching engine** — the exchange matches buyers and sellers internally.
- **Custody** — you deposit funds into the exchange's wallets. The exchange holds your private keys.
- **KYC/AML** — regulated CEXs require identity verification (Know Your Customer / Anti-Money Laundering compliance).
- **Liquidity** — major CEXs offer deep order books on popular pairs, tight spreads, and fast execution.
- **Risk** — counterparty risk (FTX, Mt. Gox), withdrawal freezes, regulatory action, hacks.

Well-known CEXs: Coinbase, Binance, Kraken, Bybit, OKX.

### Decentralized exchanges (DEX)

A DEX replaces the company with a smart contract:

- **Automated Market Maker (AMM)** — instead of an order book, most DEXs use liquidity pools. Pairs like ETH/USDC are funded by **liquidity providers** who deposit both assets and earn a fee from every trade against the pool.
- **Self-custody** — you never give up your private keys. Trades execute directly from your wallet.
- **No KYC** — anyone with a wallet and internet access can trade.
- **Transparent** — every trade is a transaction visible on the blockchain.
- **Trade-offs** — slower, more expensive (gas fees), potential for **slippage** on large trades or thin pools, no fiat on-ramp, and the risk of interacting with a malicious smart contract.

Well-known DEXs: Uniswap (Ethereum), Curve (stablecoins), Raydium (Solana), dYdX (perpetuals).

### Price discovery and arbitrage

Because DEX prices update via on-chain transactions, they can briefly diverge from CEX prices. **Arbitrageurs** — including bots — continuously exploit these gaps, which is actually what keeps DEX prices aligned with the broader market. Understanding this helps explain why DEX prices can spike momentarily during volatile periods.

### Perpetual DEXs

Beyond spot trading, a growing category of DEXs offers **perpetual futures** (see the Perpetuals chapter) in a decentralized setting. Platforms like dYdX and GMX let traders go long or short with leverage without a centralized intermediary holding collateral.

### Hybrid models

Some platforms combine elements of both: centralized order books with on-chain settlement, or CEX interfaces that route through DEX liquidity. The distinction is blurring as the industry matures.

### Why it matters for a trader

Most retail crypto traders begin on CEXs for their ease of use and fiat access. As you move into DeFi, new token launches, or on-chain strategies, DEXs become essential. Understanding liquidity pool mechanics also explains phenomena you'll see in price action: large trades moving thin DEX pools sharply, or new tokens that only exist on a single DEX spiking on speculative demand.
