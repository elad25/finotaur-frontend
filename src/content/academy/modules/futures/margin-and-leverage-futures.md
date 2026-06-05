## In plain words

In futures, **margin** is not a loan — it is a **good-faith deposit** that guarantees you can cover potential losses. You put up a fraction of the contract's total value to control the full position. This is **leverage**: a small deposit controls a large notional amount. Leverage amplifies both gains and losses equally and symmetrically.

## Quick demo

One ES futures contract represents roughly $260,000 of notional S&P 500 exposure. The exchange's initial margin requirement might be around $15,000. That means a $15,000 deposit controls $260,000 — leverage of roughly 17:1. If ES moves up 1%, your $2,600 gain on the notional represents a 17% return on your $15,000 margin. Move the other way, and the loss is just as fast.

## Full explanation

### Initial margin vs. maintenance margin

- **Initial margin** — the amount you must deposit to open a position. Set by the exchange (CME) and adjusted based on volatility.
- **Maintenance margin** — a lower threshold. If your account equity drops below this level due to losses, you receive a **margin call**.

A margin call requires you to deposit additional funds immediately to bring your account back up to the initial margin level. If you cannot or do not, the broker will liquidate (close) your position.

### Mark-to-market: daily settlement

Unlike stocks, futures positions are **marked to market** every day. Profits are credited to your account and losses are debited — in cash — at the end of each trading session. This daily settlement is why futures margin is a performance bond, not borrowed money. You are settling your gains and losses every single day, not at the end of the trade.

### Effective leverage and notional exposure

Leverage in futures is implicit. You do not apply for it; you get it by virtue of how the contract is structured. The leverage ratio is:

**Notional value ÷ Initial margin = Leverage multiple**

For highly leveraged contracts (especially micros and some commodity contracts), this ratio can exceed 20:1. Higher leverage means smaller adverse moves can wipe out your margin and trigger a margin call.

### Overnight margin vs. intraday margin

Many brokers offer a reduced **intraday margin** for day traders who close positions before the session ends. This can be significantly lower than the official exchange margin. However, if you carry a position overnight, the full initial margin requirement applies. Failing to meet this is a common beginner mistake.

### How leverage cuts both ways

- A 1% favorable move on a 17:1 leveraged contract returns 17% on your margin.
- A 1% unfavorable move costs 17% of your margin.
- A 6% adverse move can eliminate the entire deposit.

Because of this, futures traders must apply strict position sizing and stop-loss discipline. The leverage is not a bonus feature — it is a structural characteristic that demands respect.

### Why it matters for a trader

Margin and leverage are what make futures so capital-efficient — and so dangerous when misused. Professional futures traders almost never use the maximum leverage available to them. They size positions so that a typical adverse move (measured in ATR or ticks) represents a small, pre-defined percentage of their total trading capital. The margin requirement tells you the minimum; your risk management tells you the right size.
