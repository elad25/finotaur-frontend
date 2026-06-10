## In plain words

A **blockchain** is a database shared across thousands of computers at once, where new entries are grouped into **blocks** and chained together so that altering any past record would require re-doing all the work that came after it. No single company or government owns the database — the rules are enforced by the participants collectively. It is, at its core, a system for reaching agreement on truth without trusting any one party.

## Quick demo

Imagine 10,000 people each holding an identical copy of the same spreadsheet. When Alice sends Bob 1 bitcoin, that transaction is broadcast to all 10,000 participants. Most of them agree it's valid (Alice has the funds, the signature checks out), so the transaction is added to every copy simultaneously. If a hacker tries to rewrite Alice's balance on their own copy, the other 9,999 copies simply reject it. The majority consensus makes fraud computationally expensive to the point of being impractical.

## Full explanation

### The problem blockchains solve

Before Bitcoin, digital money had a fundamental flaw: a digital file can be copied perfectly. If you send me a digital dollar, who stops you from sending the same dollar to someone else a second later? The traditional solution was a trusted central party — a bank — that keeps the authoritative ledger and says which transaction counts. Blockchains solve this without a central party.

### How a block is built

Transactions are collected into a **block** over a short window (roughly every 10 minutes for Bitcoin). Each block contains:

- A batch of validated transactions
- A timestamp
- A **cryptographic hash** of the previous block — a unique fingerprint that links back in time

That last element is the "chain." Change any transaction in block #500 and you change its hash, which invalidates block #501's reference, which cascades forward. An attacker would need to redo all that computational work faster than the rest of the network — effectively impossible on a large, established chain.

### Consensus mechanisms

Participants don't just trust each other; they follow a **consensus mechanism** that defines the rules for agreeing on which version of history is correct:

- **Proof of Work (PoW)** — miners compete to solve a computationally hard puzzle. The winner gets to add the next block and earns a reward. Energy-intensive by design; that cost is what makes cheating expensive. Bitcoin uses PoW.
- **Proof of Stake (PoS)** — validators are chosen proportional to the amount of cryptocurrency they lock up ("stake") as collateral. Far more energy-efficient. Ethereum switched to PoS in 2022.

### Public vs. private blockchains

Most blockchains discussed in crypto markets are **public and permissionless** — anyone can participate and read every transaction. Corporations sometimes run **private blockchains** where access is restricted. These solve different problems; private chains are closer to a shared database than to what most people mean by "crypto."

### Immutability and its limits

A blockchain's immutability is probabilistic, not absolute. Transactions are considered "final" after several subsequent blocks are added on top. For high-value transfers, waiting for 6 confirmations (about an hour on Bitcoin) is standard practice. Smaller, newer blockchains with fewer participants are more vulnerable to what's called a **51% attack**, where a single actor controls enough of the network to rewrite recent history.

### Why it matters for a trader

Blockchain is the infrastructure layer beneath every crypto asset. Understanding it helps you evaluate network security (hash rate, validator count), interpret on-chain data (transactions per day, active addresses), and assess risks like congestion fees during high-demand periods. When a new chain launches or a major upgrade ships, those events directly affect the assets built on top — and therefore price.
