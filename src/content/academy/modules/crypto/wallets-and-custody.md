## In plain words

A **crypto wallet** doesn't actually store coins — it stores the **private keys** that prove you own them. The coins themselves live on the blockchain; the wallet is the tool that signs transactions on your behalf. **Custody** refers to who controls those keys: if you hold them yourself, you have full control; if a platform holds them, you're trusting that platform not to be hacked, mismanaged, or shut down.

## Quick demo

Think of a bank safe-deposit box. You can give the bank a copy of the key (custodial), or you can keep the only key yourself (self-custody). If you give the bank your key and the bank fails — as FTX did in 2022 — you join a line of creditors hoping to recover a fraction of your funds. If you keep the key yourself and lose it, the box is sealed forever. Both approaches carry risk; understanding each is the starting point.

## Full explanation

### Private keys and public addresses

Every crypto wallet is built on a **key pair**:

- **Private key** — a secret number (256 bits in Bitcoin) that authorizes transactions. Anyone with this key can spend your funds.
- **Public key / address** — derived from the private key, this is the address you share to receive funds. It's safe to publish.

The mathematics of **public-key cryptography** ensures that knowing a public key tells you nothing useful about the private key.

### Seed phrases

Because raw private keys are unwieldy (a 64-character hex string), wallets use a **seed phrase** (also called a recovery phrase or mnemonic): typically 12 or 24 plain-English words generated from a standard wordlist. The seed phrase is a human-readable backup of the master private key. Anyone who obtains your seed phrase can access all funds in that wallet. Write it down, store it offline, never type it into a website.

### Types of wallets

- **Hot wallets** — software connected to the internet. Desktop apps (MetaMask, Exodus), mobile apps, browser extensions. Convenient for frequent transactions; higher attack surface because the private key is online.
- **Cold wallets (hardware wallets)** — dedicated devices (Ledger, Trezor) that store keys offline and sign transactions without exposing the private key to the internet. The gold standard for significant holdings.
- **Paper wallets** — a private key printed or written on paper. Fully offline but fragile and inconvenient to use.
- **Custodial wallets** — accounts on exchanges (Coinbase, Binance). The platform holds the keys. You get the UX convenience of a username and password; you also inherit the platform's risks.

### Custodial vs. non-custodial

| | Custodial | Non-custodial |
|---|---|---|
| Key control | Exchange / platform | You |
| Recovery option | Username + password reset | Seed phrase only |
| Counterparty risk | Yes (platform failure) | No |
| Usability | High | Requires more care |

The phrase **"not your keys, not your coins"** is a reference to custodial risk: if the exchange freezes withdrawals or becomes insolvent, your balance may be inaccessible.

### Multi-signature wallets

A **multisig** wallet requires approval from multiple private keys before a transaction can be executed. A 2-of-3 setup, for example, means any two of three designated keys must sign. Used by institutions and serious holders to eliminate single points of failure.

### Why it matters for a trader

Custody decisions directly affect your risk profile. Keeping large amounts on an exchange is operationally convenient but adds counterparty risk. Self-custody removes that risk but introduces the risk of losing your seed phrase. Traders who actively trade on-chain (DeFi, NFTs, new token launches) must also understand how to safely connect a wallet to smart contracts — and the risks of signing malicious transactions.
