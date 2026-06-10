## In plain words

An **iceberg order** is a large limit order that only shows a small visible portion on the DOM, automatically refilling as each slice gets filled — like an iceberg hiding most of its mass below the waterline. **Spoofing** is the illegal practice of posting large visible limit orders with no intention of filling them, purely to mislead other traders about where demand or supply exists, then canceling before price touches them. Both involve deception about the true size of an order.

## Quick demo

The DOM shows 50 contracts offered at ES 5,430. Price trades through 50 contracts — but the offer immediately refreshes to 50 again. And again. And again. Price has consumed 2,000 contracts at 5,430 without the DOM ever showing more than 50. That is an iceberg: a seller with 2,000 contracts is hiding their full size and distributing without tipping their hand. Compare to spoofing: the DOM shows a 2,000-contract offer at 5,435, but the moment price ticks toward it, those 2,000 contracts vanish — it was never real. Price rips through 5,435 unimpeded.

## Full explanation

### Iceberg orders: mechanics

Exchanges allow participants to submit orders with a **disclosed quantity** and a **total quantity**:
- The exchange only displays the disclosed portion (e.g., 20 contracts).
- When those 20 fill, another 20 (or a random lot) automatically enter the queue.
- The process repeats until the full order is filled or canceled.

Icebergs are entirely legal and widely used by institutional traders to minimize market impact. If a hedge fund needs to buy 5,000 ES contracts, showing 5,000 on the bid would move the market against them before they finish filling. By hiding their size, they execute closer to their intended price.

### Detecting iceberg orders

Iceberg orders leave detectable footprints:

- **Repeated refill pattern at the same price** — the DOM shows a small number that never depletes despite continuous trades printing at that level.
- **Tape volume vs. DOM size mismatch** — if 2,000 contracts have printed at 5,430 but the DOM has never shown more than 50, an iceberg is present.
- **Bookmap bubbles** — on Bookmap, the "bubble" visualization tracks how much actually traded at each price level. A bright bubble at a price that shows thin resting size is the iceberg signal.
- **Price stall** — an iceberg on the offer side prevents a rally from proceeding. Repeated attempts to push through fail because the hidden seller keeps refilling.

### Spoofing: mechanics and intent

Spoofing involves placing a large limit order — visible on the DOM — that the trader intends to cancel before execution. The purpose is to:
- **Create a false impression of demand** (large bid) to push price up, then sell at the inflated price and cancel the fake bid.
- **Create a false impression of supply** (large offer) to push price down, then buy the dip and cancel the fake offer.

Unlike icebergs, spoofing is **illegal** under the Dodd-Frank Act (U.S.) and equivalent regulations globally. It constitutes market manipulation. Regulators prosecute based on the pattern: large orders placed and canceled repeatedly at the same level without fills.

### Recognizing spoofed levels

- **The order disappears as price approaches it** — genuine resting orders hold their position. Spoofed orders vanish the moment they are threatened with execution.
- **Immediate price reversal after the pull** — when a large bid is pulled as price falls toward it, that support was artificial. Price often drops sharply through the vacated level.
- **Rapid add-cancel cycles** — algorithmic spoofing repeats the pattern quickly. Bookmap's heatmap shows these as bright bands that appear and vanish in seconds without leaving filled bubbles.

### Why icebergs and spoofing co-exist

Both create a disconnect between the visible DOM and reality:
- Icebergs make **real size invisible** (the order is genuine but hidden).
- Spoofing makes **fake size visible** (the order is shown but unreal).

A sophisticated DOM reader watches for both patterns simultaneously and treats any single large order with skepticism until price touches it and the DOM either holds (real) or disappears (spoof).

### Why it matters for a trader

Trading blind to icebergs and spoofing is like reading a map that's been deliberately drawn wrong. If you buy a breakout above what looks like a 2,000-contract offer wall, only to discover 2,000 was a spoof and 3,000 more are hiding on an iceberg, your stop will be taken almost immediately. Developing the habit of confirming DOM levels through tape confirmation — does price actually trade through? does the DOM hold? — is the minimum defense against both phenomena.
