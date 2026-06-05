## In plain words

A **broker** is the intermediary between you and the market — it holds your account, accepts your orders, and routes them for execution. Brokers earn money in several ways: commissions, interest on your cash balance, margin lending fees, and — most controversially — **payment for order flow (PFOF)**, where a wholesale market maker pays the broker for the right to execute your retail orders. Understanding how your broker makes money reveals whose interests it is actually optimizing for.

## Quick demo

You use a zero-commission app to buy 100 shares of a stock. Your broker sends your order not to the exchange, but to Citadel Securities (a large market maker). Citadel executes your order at $50.02, slightly better than the $50.03 ask — you get "price improvement" of $0.01. But Citadel also paid your broker $0.001 per share ($0.10 on your order) for the right to see and fill it first. Meanwhile, if you had routed directly to the exchange's order book, you might have been filled at $50.00 — the midpoint. "Free" trading cost you a few cents you never saw.

## Full explanation

### Types of brokers

- **Full-service brokers** — provide investment advice, research, and personalized service. Charge higher commissions or advisory fees. Examples: traditional wirehouses and private wealth management arms of large banks.
- **Discount brokers** — self-directed, no advice, lower or zero commissions. The dominant model for retail investors. Examples: Fidelity, Schwab, TD Ameritrade (now Schwab), Robinhood, Interactive Brokers.
- **Prime brokers** — serve institutional clients (hedge funds), providing leverage, securities lending, custody, and research. Not accessible to retail.
- **Introducing brokers** — take orders and customer relationships but pass execution to a larger "clearing" broker. Common in futures and forex.

### How brokers actually make money

Even zero-commission brokers are profitable businesses. Revenue sources include:

- **Net interest margin** — paying you little or nothing on your cash balance while earning the market rate investing or lending that cash.
- **Margin interest** — lending you money to buy more securities (on margin) at interest rates well above their cost of funds.
- **Securities lending** — lending your shares to short-sellers and keeping some or all of the fee.
- **Payment for order flow (PFOF)** — the most debated revenue source (see below).
- **Premium subscriptions and features** — some brokers charge for data, advanced tools, or priority support.

### Payment for order flow (PFOF)

PFOF is the practice where wholesale market makers (Citadel Securities, Virtu Financial, etc.) pay retail brokers for the right to execute their customers' orders "off-exchange" (internally, rather than routing to the public order book).

**The market maker's incentive**: retail order flow is considered "uninformed" — retail traders rarely have inside information. Executing retail flow is profitable because the market maker can earn the spread on predictable, low-risk trades.

**The broker's incentive**: PFOF revenue subsidizes zero commissions and generates profit. Some brokers earn hundreds of millions of dollars per year from PFOF.

**The investor's concern**: your order never reaches the public exchange, so it doesn't contribute to price discovery. You may receive price improvement over the quoted spread, but critics argue you would have received even better execution (at the midpoint or better) if the order had competed in the open order book.

PFOF is banned in the UK, Canada, and Australia, and has been the subject of ongoing SEC scrutiny in the US. Regulation Best Interest (Reg BI) requires brokers to act in the customer's best interest, but "best interest" in execution is measured statistically over time, not on any single trade.

### Conflicts of interest to understand

- **Revenue from interest** means brokers benefit when you hold cash in your account and earn more from uninvested balances.
- **Margin lending** means brokers benefit when you use leverage — they earn more interest, and you bear the risk.
- **PFOF** means your broker may have a financial incentive to route orders to the highest bidder rather than the venue with the best execution.

### Choosing a broker

For most traders and investors, key considerations are:

- **Execution quality** — does the broker route orders for best execution, or for PFOF revenue? Compare statistics on price improvement.
- **Product access** — does it offer the securities you need (options, futures, international stocks, crypto)?
- **Margin rates** — if you plan to use leverage, compare borrowing costs aggressively.
- **Platform and tools** — charting, order types, screeners, and API access matter for active traders.
- **Regulatory protection** — ensure accounts are SIPC-insured (US) and that the broker is registered with relevant regulators.

### Why it matters for a trader or investor

Your broker is not a neutral utility. It is a profit-seeking business with its own incentives. Knowing how it earns money — and where those incentives conflict with yours — helps you choose the right broker, use the right order types, and understand why "free" sometimes has a hidden price.
