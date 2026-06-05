## In plain words

**Clearing** is the process of confirming and calculating what each party in a trade owes the other. **Settlement** is when the actual exchange happens — money moves from buyer to seller, and securities move from seller to buyer. In the US equity market, settlement currently occurs **T+1**, meaning one business day after the trade date. The process exists because trades are legally binding contracts, and transferring ownership of securities requires more than clicking a button.

## Quick demo

On Monday you buy 100 shares of a stock at $50 — that is your trade date (T). You don't actually own those shares in the legal, settled sense until Tuesday (T+1). During that day, a **clearinghouse** (in the US, the DTCC) nets all of Monday's trades across the entire market, calculates who owes what to whom, and oversees the final transfer of shares and cash. If the stock drops to $40 before Tuesday and your broker fails, the clearinghouse guarantees you still receive your shares. That guarantee is the entire point of the system.

## Full explanation

### Why clearing and settlement exist

When you trade, you are entering a legal contract with a counterparty you don't know. Settlement risk is the risk that the counterparty fails to deliver the cash or securities before the deal closes. The clearing and settlement system was built to eliminate that risk from individual participants.

### The clearinghouse: central counterparty (CCP)

A **clearinghouse** (also called a **central counterparty**, or CCP) steps between the buyer and seller after a trade is matched on an exchange. It becomes the buyer to every seller and the seller to every buyer. If one party defaults, the clearinghouse absorbs the loss using a default fund contributed to by all clearing members.

The DTCC (Depository Trust & Clearing Corporation) handles equity clearing in the US. LCH, Eurex Clearing, and CME Clearing handle major derivatives globally.

### The settlement timeline

- **T+0** — trade is executed and reported.
- **T+1** — settlement (US equities as of May 2024; previously T+2). You must have the cash or shares by this point.
- **T+2** — still standard for many international markets and some asset classes.
- **T+0 / instant** — the direction crypto markets moved toward, and where regulators are pushing equities in the longer run.

### Net settlement and netting

Rather than settling each trade individually (which would require massive cash and securities transfers), clearinghouses **net** obligations. If you bought 1,000 shares of MSFT and sold 700 shares of MSFT in the same day, the clearinghouse only requires you to receive the net 300 shares — a far smaller transfer. Netting reduces systemic risk and the volume of required settlements by orders of magnitude.

### Margin requirements

During the T+1 period, the clearinghouse faces risk that a position moves against a participant before settlement. To manage this, it requires **margin** — a deposit that acts as collateral. Options and futures have explicit daily margin requirements; equity margin is governed by Regulation T in the US.

### Fails to deliver

A **fail to deliver** occurs when a seller does not have the securities available to transfer at settlement. This happens most commonly with short selling (selling borrowed shares) and can indicate manipulation (called **naked short selling** when there is no good-faith borrow). Regulators track aggregate fail-to-deliver data and require persistent fails to be closed.

### Why it matters for a trader or investor

Settlement mechanics have real practical consequences:

- **Pattern Day Trader (PDT) rule** — US brokers require a $25,000 equity minimum for accounts that make 4+ day trades in a 5-day period, partly because of settlement-related margin rules.
- **Cash account rules** — in a cash (non-margin) account, you can't reuse proceeds from a sale until settlement (T+1) to avoid **free-riding**.
- **Dividend eligibility** — to receive a dividend, you must be the settled owner on the **record date**. With T+1, you must buy by the day before the record date (the **ex-dividend date**) to receive the payment.
- **Short interest** — the mechanics of borrowing shares, returning them at settlement, and the cost of the borrow are all part of the settlement infrastructure.
