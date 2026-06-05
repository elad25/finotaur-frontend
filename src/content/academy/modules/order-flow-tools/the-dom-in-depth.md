## In plain words

The **DOM** (Depth of Market), also called the **order book**, shows you the queue of **limit orders** waiting on both sides of the current price — buyers stacked on the **bid** below and sellers stacked on the **ask** above. It tells you where liquidity exists before a trade happens, not just after. Reading the DOM is like seeing the supply and demand schedule for the next few price levels in real time.

## Quick demo

NQ futures are at 19,100 bid / 19,100.25 ask. The DOM shows 400 contracts resting at 19,099.75, 850 at 19,099.50, and 1,200 at 19,099.25 on the bid side. When price ticks down to test 19,099.25, those 1,200 contracts either hold (price bounces) or get pulled and refilled lower (price continues falling). A tape reader watches whether that wall absorbs the selling or disappears — that single observation drives the trade decision.

## Full explanation

### Structure of the DOM

The DOM is typically displayed as a ladder with two columns:

- **Bid side (left or bottom)** — the size of limit buy orders resting at each price level below the current price. Someone willing to buy at 19,099.25 has posted a limit bid there.
- **Ask side (right or top)** — the size of limit sell orders resting at each price level above the current price.

The **spread** is the gap between the best bid and best ask. In liquid futures like ES or NQ, this is typically one tick.

### What moves the DOM

The DOM is not static. Every second:

- Limit orders are **added** (new participants post bids/asks).
- Limit orders are **pulled** (participants cancel before their order fills).
- Limit orders are **hit** — a market order trades against them, reducing the queue.

Watching this flow — additions, pulls, and fills — is the core skill. The raw number sitting at a price level tells you less than watching *whether it's growing or shrinking*.

### Key concepts

- **Thin vs. thick levels** — a price with very few resting orders offers little resistance; a price with a large cluster is a potential support or resistance zone.
- **Pulling** — when large limit orders disappear before they are hit, that is not a trade; it is a signal. A big bid that suddenly vanishes often means the participant who posted it lost confidence in that level, and price may fall through quickly.
- **Iceberg orders** — some large orders are hidden and only show a small quantity at a time (covered in full in the iceberg chapter). The DOM may show 20 contracts but a hidden 500 is behind it.
- **Stacking vs. pulling dynamic** — when bids are stacking (growing) as price approaches, participants are adding conviction. When they are being pulled rapidly as price descends, that's a sign of weak support.

### DOM vs. tape

The DOM shows you **intention** (what participants say they will do at a price). The tape shows you **reality** (what actually traded). The two complement each other:

- DOM tells you where the liquidity queue is.
- Tape confirms whether that queue held, absorbed, or collapsed.

Savvy traders use both simultaneously: they see a big offer on the DOM, watch the tape to see how aggressive buyers are hitting it, and judge whether price will punch through or reverse.

### Practical limitations

DOM data is one of the most **manipulated** data streams in markets. Participants — especially algorithms — post large limit orders they have no intention of filling to create a false picture of supply or demand, then pull them before execution. This is **spoofing** (covered in the iceberg/spoofing chapter). Never trade solely on DOM size; always require tape confirmation.

### Why it matters for a trader

The DOM gives you a real-time map of where the battle between buyers and sellers is concentrated. Understanding which price levels have genuine resting liquidity — and which are bluffs — is the difference between entering in front of a wall of real buyers and getting run over by a pulled bid. It is the intraday trader's equivalent of a support/resistance analysis, updated tick by tick.
