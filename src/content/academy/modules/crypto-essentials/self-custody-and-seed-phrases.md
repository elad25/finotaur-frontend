## In plain words

**Self-custody** means holding your crypto in a wallet where only you control the **private key** — the secret that proves ownership and authorizes transactions. A **seed phrase** (also called a recovery phrase) is 12 or 24 ordinary words that can regenerate that key from scratch. If you lose the seed phrase, the crypto is gone forever. If someone else gets it, the crypto is theirs.

## Quick demo

Elena withdraws 1 ETH from her exchange to a hardware wallet. During setup, the wallet shows her 24 words — "vessel rain mirror table..." — and asks her to write them down and confirm. Three years later her wallet breaks. She buys a new one, enters those same 24 words, and her 1 ETH appears instantly, as if nothing happened. The seed phrase was the account; the device was just a reader.

## Full explanation

### Why self-custody exists

When crypto sits on an exchange, the exchange controls the actual keys. You have a legal claim — but the exchange can freeze accounts, get hacked, go bankrupt, or be seized by regulators. In each case, your coins may become inaccessible. Self-custody removes that counterparty risk: the blockchain doesn't know about the exchange, it only knows about keys.

### How keys and addresses work

Every crypto wallet has:
- A **private key** — a very large secret number. Controls the funds.
- A **public key** — derived from the private key, used to generate addresses.
- A **wallet address** — like an account number you share with others to receive funds.

The private key must never leave your possession. Anyone who has it can move your funds instantly, with no recourse.

### The seed phrase

Because a private key is an unwieldy 256-bit number, wallets encode it as 12 or 24 common English words — your **seed phrase** (technically a BIP-39 mnemonic). These words are mathematically equivalent to your key.

**Rules for your seed phrase:**
- Write it on paper (or steel); never type it into any device
- Never photograph it
- Never store it in email, cloud storage, a notes app, or a password manager
- Never enter it on any website — legitimate wallets never ask for it online
- Store it in at least two physically separate, secure locations
- Tell a trusted person how to find it (estate planning)

### Software wallets vs. hardware wallets

- **Software wallets** (MetaMask, Trust Wallet) — apps on your phone or browser. Convenient, but the key exists in software that is connected to the internet. Higher hacking surface.
- **Hardware wallets** (Ledger, Trezor) — physical devices that store the key offline. The key never touches an internet-connected computer. Required for any significant holdings.

### The self-custody workflow

1. Buy a hardware wallet directly from the manufacturer (never secondhand — it may be tampered with)
2. Initialize it, write down the seed phrase offline
3. Send a small test amount before transferring your full holdings
4. Confirm the test receives correctly before sending everything

### Why it matters

"Not your keys, not your coins" is the oldest rule in crypto because it has been proven repeatedly — by exchange hacks, collapses, and freezes that wiped out millions of users. Self-custody is not for experts; it is for anyone who owns more crypto than they can afford to lose on an exchange.
