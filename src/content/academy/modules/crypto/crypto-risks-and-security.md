## In plain words

Crypto markets carry a distinct set of risks that go beyond price volatility: **scams, protocol hacks, exchange failures, phishing attacks, and user errors** can result in permanent, unrecoverable loss. Unlike traditional finance, there is no deposit insurance, no fraud reversal, and no regulator you can call to recover stolen funds. Understanding the threat landscape before committing capital is not optional — it is a prerequisite for operating safely.

## Quick demo

In 2022, a trader received a Discord message from someone impersonating a support agent for a popular NFT project. They were told to "verify their wallet" by visiting a link and approving a transaction in MetaMask. The transaction they signed was a permission for the attacker's contract to transfer all NFTs and tokens from their wallet. Within seconds, $150,000 in assets was gone — no reversal, no recovery. The scam took less than 5 minutes from first contact to empty wallet.

## Full explanation

### Protocol and smart contract risk

Smart contracts are code, and code has bugs. Even audited contracts have been exploited:

- **Reentrancy attacks** — a malicious contract calls back into the victim contract before the first execution finishes, allowing funds to be drained multiple times.
- **Price oracle manipulation** — attackers manipulate the price feed a protocol relies on to revalue collateral, then exploit the mispricing.
- **Flash loan attacks** — using uncollateralized loans (borrowed and repaid within one transaction) to manipulate a protocol's state momentarily and drain funds.

Notable examples: Ronin Network (~$625M, 2022), Poly Network ($611M, 2021), Wormhole ($320M, 2022). Total crypto stolen in protocol exploits runs into billions annually.

### Exchange and custodial risk

Holding assets on a centralized exchange means trusting that entity with full custody. Points of failure include:

- **Insolvency** — FTX collapsed in November 2022, leaving roughly $8 billion in customer assets unrecoverable. It was the largest crypto failure to date.
- **Hacks** — Mt. Gox (2014, ~$450M at the time), Bitfinex (2016, $72M), Binance (2019, $40M). Exchanges remain prime targets.
- **Regulatory action** — exchanges can be forced to freeze withdrawals, delist assets, or shut down entirely in response to regulatory orders.

Mitigation: don't keep more on an exchange than you need for active trading. Move long-term holdings to self-custody.

### Phishing and social engineering

- **Fake websites** — attackers create near-identical copies of popular exchanges or wallet interfaces. Always check the URL.
- **Fake support** — no legitimate DeFi protocol or hardware wallet company will DM you first on Discord, Telegram, or Twitter and ask for your seed phrase or to "connect your wallet."
- **Seed phrase requests** — any instruction to enter your 12 or 24 seed words anywhere online is an attack. Your seed phrase should never be typed, photographed, or stored digitally.
- **Malicious approvals** — in DeFi, signing a token approval grants a contract permission to move your tokens. Check what you're approving before signing. Tools like Revoke.cash let you audit and revoke existing approvals.

### Rug pulls and project fraud

- **Exit scam (rug pull)** — the team deploys a contract, markets the token aggressively, waits for liquidity to build, then withdraws all liquidity and disappears. Common in new DeFi tokens and memecoins.
- **Honeypot** — a token that can be bought but not sold. The contract contains a restriction preventing any wallet except the creator's from executing sell transactions.
- **Anonymous teams** — not inherently a red flag in crypto, but combined with unrealistic yield promises and unaudited contracts, it is.

### Regulatory and legal risk

Crypto regulations differ widely by jurisdiction and continue to evolve. Assets that are legal to own and trade in one country may be restricted or classified differently in another. Exchange access, stablecoin availability, and tax treatment are all subject to change. Regulatory crackdowns can move prices significantly and restrict access without notice.

### Market manipulation

Lower-liquidity crypto markets are particularly susceptible to:

- **Pump and dump** — coordinated buying to inflate price, followed by selling into retail demand.
- **Wash trading** — a party trading with itself to simulate volume, creating a false impression of activity.
- **Whale manipulation** — large holders creating artificial support or resistance levels through order placement.

### Practical security checklist

- Use a hardware wallet for any significant holdings
- Enable two-factor authentication (2FA) — preferably app-based (Authy, Google Authenticator), not SMS
- Store your seed phrase offline, in multiple physical locations
- Never use the same password for crypto accounts as for anything else
- Bookmark legitimate sites; don't click links from DMs or emails
- Before approving any DeFi transaction, understand what permission you're granting

### Why it matters for a trader

Capital preservation is the first rule of trading. In crypto, losses from scams and hacks are distinct from market losses — they are often total and irreversible. Treating security as part of your trading infrastructure, not an afterthought, is what separates long-term participants from cautionary tales.
