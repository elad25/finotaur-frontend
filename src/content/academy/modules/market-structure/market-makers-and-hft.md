## In plain words

A **market maker** is a firm that continuously quotes both a buy price and a sell price for a security, standing ready to trade on either side. By always being there, market makers provide **liquidity** — the ability to buy or sell without waiting for a natural counterparty. **High-frequency trading (HFT)** firms use computers and extremely fast data connections to trade thousands of times per second, often acting as de facto market makers and profiting from tiny, repeated edges.

## Quick demo

You want to sell 500 shares of a stock immediately. There are no natural buyers at your price right now. A market maker steps in: it buys your 500 shares at $49.98 (the bid) even though it has no immediate buyer lined up. A moment later, it sells those shares to another investor at $50.00 (the ask). The market maker earns $0.02 per share — $10 on the trade. Multiply that by millions of transactions a day, and it is a substantial business. You got instant liquidity; the market maker took a tiny risk and earned the spread.

## Full explanation

### What market makers do

Market makers commit capital to buy or sell securities on demand. Their business model is:

- **Post a bid and an ask** — the spread is their gross profit per round trip.
- **Manage inventory risk** — if they buy and the price falls before they can sell, they lose. Hedging and speed reduce this risk.
- **Earn the spread at scale** — individually small, but across enormous volume it adds up.

In exchange for this role, market makers on designated exchanges (called **designated market makers** or DMMs on NYSE) receive certain privileges, such as access to order flow information, and take on obligations to maintain two-sided quotes during normal market conditions.

### The rise of electronic market making

Before the 1990s, human specialists on exchange floors performed market-making manually. Electronic trading and decimalization (switching from 1/8-dollar to penny pricing in 2001) compressed spreads dramatically and made the business more competitive. Today, electronic market makers and HFT firms dominate, providing the majority of displayed liquidity on major exchanges.

### High-frequency trading (HFT)

HFT is a broad category of strategies executed by algorithms at very high speeds, typically holding positions for seconds, milliseconds, or even microseconds. Common HFT strategies:

- **Electronic market making** — posting bids and asks and earning the spread thousands of times per second.
- **Statistical arbitrage** — exploiting tiny pricing discrepancies between related instruments (e.g., an ETF vs. its components) before they close.
- **Latency arbitrage** — being faster than competitors to react to new information (an earnings release, a trade on one exchange) and trade before stale quotes are updated elsewhere.

HFT firms invest heavily in **co-location** (placing servers physically inside or adjacent to exchange data centers) and **low-latency networking** (fiber, microwave, and laser links) to shave microseconds off their reaction times.

### Criticism and controversy

HFT is legitimately controversial. Critics argue that:
- Latency arbitrage is a tax on slower participants — HFT firms "pick off" stale quotes.
- Speed races consume resources without providing proportional social benefit.
- In times of stress, electronic market makers can withdraw liquidity instantly (the 2010 Flash Crash being the most cited example).

Defenders argue HFT has dramatically reduced bid-ask spreads for retail investors and made markets more efficient.

### Why it matters for a trader or investor

Market makers and HFT firms are your counterparties. Understanding their incentives helps you trade smarter:

- **Spreads are tighter** on liquid, large-cap stocks because competition among market makers is intense.
- **Market orders** on thinly-traded stocks give your counterparty (often an HFT algorithm) an information advantage — limit orders can protect you.
- **Volatile moments** (news releases, open/close) see market makers widen spreads or pull back, making execution more expensive and unpredictable. Trade accordingly.
