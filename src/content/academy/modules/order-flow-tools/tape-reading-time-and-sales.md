## In plain words

The **tape** is a live, scrolling record of every trade that just printed — price, size, and direction. **Time & Sales** is the modern version: a real-time feed showing the exact timestamp, price, and quantity of each executed transaction. Reading it tells you whether buyers or sellers are being aggressive right now, before that aggression shows up on a price chart.

## Quick demo

ES futures are hovering at 5,420. Suddenly the tape lights up: 200 contracts hit at 5,420.50, then 350 at 5,420.75, then 150 at 5,421.00 — all within four seconds, all on the offer. That stacked buying on the ask is a signal that an aggressive buyer is lifting offers and doesn't care about paying up. Price jumps to 5,422.50 within the next 30 seconds.

## Full explanation

### What the tape actually shows

Each row in the Time & Sales feed contains:

- **Time** — the precise timestamp (often to the millisecond).
- **Price** — where the trade executed.
- **Size** — how many shares, contracts, or lots changed hands.
- **Side** — whether the trade printed on the **bid** (seller aggressive) or the **ask** (buyer aggressive). Most platforms color-code: green = bought on the ask, red = sold on the bid.

The tape is the most raw, unfiltered data the exchange produces. Everything else — candlestick charts, volume bars, indicators — is derived from it.

### How to read aggression

The key concept is **trade initiation**. A **market order** (or a limit order that crosses the spread) takes liquidity. If a trade prints at the ask, a buyer made the decision to pay the current price immediately — they are the **aggressor**. If it prints at the bid, a seller is the aggressor.

Watch for these patterns:

- **Stacking on the ask** — multiple prints in a row at or above the offer. Buyers are urgent; they are lifting every available seller.
- **Stacking on the bid** — repeated prints at or below the bid. Sellers are hitting bids, driving price down.
- **Large single prints** — an unusually big lot that clears in one shot can indicate an institutional order. Context matters: is it at a key level? Does price react afterward?
- **Fading prints** — lots of size traded but price didn't move. That's absorption — the other side was large enough to soak it all up (covered in its own chapter).

### Filtering the noise

Raw tape is overwhelming in liquid markets. Experienced traders apply a **filter** — for example, only showing prints above 50 contracts in ES, or above 5,000 shares in a stock. This removes retail noise and focuses attention on meaningful orders.

Color intensity and font size changes are also used: a 500-lot trade in ES is usually highlighted differently from a 2-lot trade, making unusual size instantly visible.

### Tape vs. chart

A candlestick chart compresses what happened over a time period (1 min, 5 min, etc.) into a single bar. The tape shows you the sequence *within* that bar — which side was hitting, whether there was a burst of buying then a reversal, whether big size appeared at the high. Two identical-looking candles can tell completely different stories on the tape.

### Why it matters for a trader

Tape reading is the original order-flow skill — traders were reading paper tapes in the early 1900s. Today it remains the fastest signal available: you see the aggression happen before the candle closes. For scalpers and short-term traders, that edge of even a few seconds can be the difference between entering at the right price and chasing a move that's already over.
