## In plain words

An **order type** is the instruction you give your broker about how to execute your trade. The two foundational types are the **market order** (buy or sell immediately at whatever the current price is) and the **limit order** (buy or sell only at a specific price or better). Everything else — stops, stop-limits, OCO — is a variation built on top of these two for managing risk or automating decisions.

## Quick demo

You own a stock trading at $100. You set a **stop-loss** at $92: if the price falls to $92, your broker automatically sells. The stock drops to $92 during a bad day. Your stop triggers, converting to a market order. You exit at roughly $92 (possibly $91.80 in a fast market) instead of riding it down to $75. Without the stop, you had to watch the screen all day or hope. With it, your maximum loss was defined before the trade ever went wrong.

## Full explanation

### Market orders

A **market order** instructs the broker to execute immediately at the best available price. You get certainty of execution, but not of price. In a fast-moving market or a thinly-traded stock, the price you receive can differ meaningfully from the last-quoted price — this is called **slippage**.

Use market orders when: speed of execution matters more than price precision (e.g., an emergency exit), and the security is highly liquid.

### Limit orders

A **limit order** specifies the maximum price you'll pay (buy limit) or the minimum price you'll accept (sell limit). It will execute only at that price or better — or not at all. Your order rests in the order book until a counterparty matches it.

- **Buy limit at $98**: only fills if the ask drops to $98 or below.
- **Sell limit at $102**: only fills if the bid rises to $102 or above.

Limit orders give you price control but no execution guarantee. The market might never reach your price.

### Stop orders (stop-loss)

A **stop order** becomes a market order once the price reaches a specified **trigger price** (the stop). It is designed to limit losses or protect profits.

- **Stop-sell at $90**: if the price falls to $90, a market sell order fires automatically.
- **Stop-buy at $110**: used by short-sellers to cap losses if the price rises against them.

Key risk: in a fast-declining market, the fill price may be well below the stop trigger (a **gap** or **slippage** on the stop).

### Stop-limit orders

A **stop-limit order** combines a stop (trigger) with a limit price. When the stop triggers, a limit order (not a market order) is placed. This gives price control but reintroduces the risk of no execution — if the price moves through your limit without filling, you remain in the position.

Example: Stop at $90, limit at $88. When price hits $90, a sell limit at $88 is placed. If the stock gaps down to $82, the limit order won't fill, and you're still holding a losing position.

### OCO (One Cancels the Other)

An **OCO order** is a pair of orders where executing one automatically cancels the other. Traders use it to simultaneously set a profit target and a stop-loss.

Example: You're long at $100. OCO: sell limit at $112 (target), stop-sell at $92 (stop). Whichever is hit first executes; the other cancels immediately. This lets you define both exit scenarios without monitoring the position.

### Trailing stop

A **trailing stop** adjusts the stop price automatically as the position moves in your favor. A trailing stop of $5 below market: if the stock rises from $100 to $115, the stop moves from $95 to $110 — locking in at least $10 of profit while still allowing further upside.

### Why order types matter for a trader or investor

Your order type is a direct expression of your trading plan. Using market orders carelessly on low-liquidity instruments is a hidden cost. A stop-loss without understanding slippage creates false confidence. Mastering order types is not a technicality — it is the difference between a plan that executes as intended and one that doesn't.
