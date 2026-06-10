## In plain words

The **order book** is a live list of every pending buy and sell order for a security, organized by price. Buyers submit **bids** (the price they'll pay); sellers submit **asks** (the price they'll accept). A trade happens the instant a bid price meets or crosses an ask price. The **last traded price** becomes the market price you see on your screen.

## Quick demo

The order book for a stock shows three buyers willing to pay $50.00, $49.95, and $49.90, and three sellers asking $50.05, $50.10, and $50.20. The current spread is $0.05 ($50.00 bid, $50.05 ask). A new buyer enters and places a **market order** — "buy now at whatever price." The exchange immediately matches them with the best ask: $50.05. That $50.05 is now the new last price. The book updates, and every quote screen in the world refreshes.

## Full explanation

### The structure of an order book

The order book has two sides:

- **Bid side** — all buy orders, sorted from highest price (best bid) to lowest.
- **Ask side** (also called the offer side) — all sell orders, sorted from lowest price (best ask) to highest.

The **top of the book** is the best bid and best ask. The difference between them is the **bid-ask spread** — the immediate transaction cost of crossing the market.

### How price is discovered

Price discovery is the process by which new information gets incorporated into the price. It happens through the continuous matching of orders:

1. A trader submits a **limit order** at a specific price — it rests in the book waiting for a match.
2. Another trader submits a **market order** — it executes immediately against the best available limit order on the other side.
3. The matched price is reported as the last trade price.

When good news hits, buyers flood in with higher bids, the best ask gets lifted, and the price rises. When bad news hits, sellers undercut each other and the price falls. The order book is the mechanism through which this happens.

### Matching engine rules

Exchanges use a **price-time priority** matching algorithm (also called FIFO):

- At any given price level, the order that arrived first gets filled first.
- A better-priced order always takes priority over a worse-priced one.

This encourages traders to compete on price (getting a better fill) and to be early (being first in the queue at that price).

### Depth and liquidity

**Market depth** refers to the volume of orders stacked in the book at different price levels. A deep book (lots of size at many levels) means you can trade large quantities without moving the price much. A thin book means even a modest order can push the price significantly.

Institutional traders care deeply about depth because they often need to trade thousands of shares without revealing their hand and without moving the market against themselves.

### Continuous vs. auction markets

Most equity exchanges operate as **continuous markets** — orders can be submitted and matched at any time during trading hours. At the open and close, many exchanges switch to a **call auction** (or **fixing**): orders accumulate for a period, then the exchange calculates the single price that maximizes the number of shares traded.

### Why it matters for a trader or investor

Every fill you receive is a direct result of order book mechanics. Understanding depth explains why your market order on a thinly-traded small-cap gets a worse price than expected (**slippage**). Understanding the matching engine explains why being fast matters in short-term trading. And understanding how news hits the book — rapidly repricing as aggressive orders sweep through the queue — is fundamental to reading price action in real time.
