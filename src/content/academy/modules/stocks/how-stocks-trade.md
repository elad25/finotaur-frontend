## In plain words

When you buy a stock, you are not handing money directly to the company. Instead, your order travels through a broker to an **exchange** or an **ECN** (electronic communications network), where it is matched with someone willing to sell. The price you get — your **fill** — depends on the type of order you placed and the liquidity available at that moment.

## Quick demo

You place a market order to buy 100 shares of a tech stock trading at $50.00. Your broker routes the order to Nasdaq, where an automated matching engine finds sellers willing to part with their shares. Within milliseconds your order is filled — maybe at $50.01 because the market moved a cent in the time it took to route. That one-cent difference is called **slippage**, and on 100 shares it cost you $1.00 you never thought about.

## Full explanation

### The path of a stock order

Every trade you place follows a chain:

1. **You** send an order through your broker's platform.
2. **Your broker** decides where to route it — a national exchange, an alternative trading system (ATS), or a market maker via payment for order flow (PFOF).
3. **The matching engine** (at Nasdaq, NYSE, or an ECN like ARCA) pairs your order with the best available counterparty.
4. **The trade executes** and is reported to the tape (the official public record of every print).
5. **Clearing and settlement** follow: the trade is confirmed through a clearinghouse (DTCC in the US) and money + shares change hands, typically one business day later (T+1).

### Exchanges vs. ECNs

- **National exchanges** (NYSE, Nasdaq) are the primary venues. They set listing standards and publish consolidated quotes.
- **ECNs** (ARCA, EDGX, IEX) are electronic venues that match orders directly, often with lower fees for adding liquidity.
- **Dark pools** are private matching venues used mostly by institutions to move large blocks without revealing intentions to the market.
- **Market makers** are firms that quote both a bid and an ask, standing ready to buy or sell at any time — they profit from the spread.

### What determines your fill

- **Order type**: a market order fills immediately at whatever the best price is; a limit order fills only at your specified price or better.
- **Liquidity**: a stock trading 50 million shares a day will fill with less slippage than one trading 50,000.
- **Time of day**: the first and last 30 minutes of the regular session typically have the tightest spreads and deepest liquidity; pre- and after-hours markets are thinner and more volatile.
- **Routing decisions**: some brokers sell order flow to market makers (PFOF), which may subtly affect execution quality.

### Why this matters for a trader

Understanding how your orders actually move through the system prevents costly surprises. A market order in a thinly traded small-cap can gap far from the quoted price. Knowing that ECNs often offer price improvement, or that the open is chaotic because pre-market orders flood in at once, lets you choose the right order type and time your entries for the best possible execution.
