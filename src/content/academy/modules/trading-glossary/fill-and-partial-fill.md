## In plain words
A **fill** is the confirmation that your order has been executed — you received the shares, contracts, or currency you ordered. A **partial fill** means only part of your order was executed, with the remainder still pending.

## Quick demo
You submit a limit order to buy 1,000 shares at $25.00. Only 600 shares are available at that price right now, so you receive a partial fill of 600 shares. The remaining 400 stay as an open order until more liquidity arrives at your price.

## Full explanation
When you place an order, the exchange (or your broker) attempts to match it against available liquidity. The execution confirmation is called a fill.

**Full fill:** The entire order quantity executes, ideally at or near your requested price.

**Partial fill:** Only a portion executes. This happens when:
- Insufficient volume is available at your limit price at that moment.
- Your order is too large relative to the available book.
- The price moved away from your limit before the full quantity could execute.

Partial fills create practical complications:
- Your average entry price may differ across fills received at slightly different prices.
- You may need to decide whether to cancel the remaining portion or leave it open.
- Risk calculations must account for your actual filled size, not the intended size.

**Market orders** almost always fill in full (in liquid markets) but may execute across multiple price levels. **Limit orders** carry partial fill risk in thin or fast-moving markets. Most trading platforms show fill status in real time and break out average fill price across partial fills.
