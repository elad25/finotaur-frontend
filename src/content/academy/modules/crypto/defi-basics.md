## In plain words

**DeFi** (Decentralized Finance) is a collection of financial services — lending, borrowing, trading, and earning yield — built on smart contracts rather than banks or brokerages. Anyone with a crypto wallet and an internet connection can access them, without filling out an application or getting approved. The trade-off is that there is no customer support, no deposit insurance, and no one to call if something goes wrong.

## Quick demo

Alice holds 10 ETH and wants to earn interest without selling. She deposits it into Aave, a lending protocol. Bob wants to borrow USDC to trade without selling his BTC. Bob locks $200,000 worth of BTC as collateral and borrows $100,000 in USDC. Alice earns the interest Bob pays — let's say 4% APY — automatically, in real time, with no bank setting rates or taking a spread. Both sides interact only with a smart contract.

## Full explanation

### The core DeFi primitives

DeFi is built from a handful of composable building blocks:

#### Decentralized exchanges (DEXs)
Automated market makers (AMMs) like Uniswap allow token swaps directly from wallets. Liquidity is provided by users who deposit token pairs into pools and earn a share of trading fees. No order book, no company matching trades.

#### Lending and borrowing
Protocols like Aave and Compound let users deposit assets to earn yield or borrow against collateral. Borrowing is **over-collateralized** — you must lock more value than you borrow. Loans are liquidated automatically if the collateral-to-loan ratio falls below a threshold.

#### Yield farming and liquidity mining
Many DeFi protocols incentivize early adoption by paying users in their native governance token for providing liquidity or using the protocol. This "yield farming" can offer high returns — often unsustainably high, because the value of the incentive token may fall as quickly as the yield appears attractive.

#### Staking
On Proof of Stake networks (Ethereum, Solana, etc.), holding the native token and locking it as a validator earns staking rewards. This is different from DeFi lending; staking rewards come from the protocol's issuance schedule.

### TVL — Total Value Locked

**TVL** is the main metric for measuring DeFi activity: the total dollar value of assets deposited in a protocol or across all DeFi. It's an imperfect metric — it counts the same dollar of collateral multiple times if it's looped through multiple protocols — but it remains the standard signal of ecosystem health and demand.

### Risks specific to DeFi

- **Smart contract risk** — code bugs can be exploited. Hundreds of millions of dollars have been stolen through protocol hacks, sometimes from code that was audited.
- **Liquidation risk** — if collateral drops in value during a borrowing position, the protocol liquidates automatically. Fast markets can cascade liquidations.
- **Oracle risk** — DeFi protocols rely on **price oracles** (external data feeds) to value collateral. Manipulating oracle prices is a common attack vector.
- **Rug pulls** — the project team withdraws liquidity and disappears. More common on newer, unaudited protocols.
- **Composability risk** — DeFi protocols integrate with each other. A failure in one can cascade through others that depend on it.

### Layer 2 and multi-chain DeFi

High gas fees on Ethereum's mainnet pushed significant DeFi activity to Layer 2 networks (Arbitrum, Base, Optimism) and alternative Layer 1s (Solana, Avalanche). Bridging assets between chains introduces additional technical and security risk.

### Why it matters for a trader

DeFi creates price dynamics that differ from traditional markets. Liquidation cascades can amplify down moves. Large liquidity pool imbalances affect token prices. Governance votes on protocol parameters can move assets overnight. For crypto traders, understanding DeFi mechanics — even if you don't use these protocols — helps explain why certain tokens move the way they do.
