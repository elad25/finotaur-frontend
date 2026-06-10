## In plain words

**Bookmap** is a trading tool that records the DOM over time and displays it as a **heatmap** — a color-coded chart where the horizontal axis is time and the vertical axis is price. The intensity of the color at each price level shows how many resting limit orders were sitting there at that moment. Bright or dark clusters are **liquidity pools**, and watching how price interacts with them reveals whether participants are adding, pulling, or getting filled.

## Quick demo

On Bookmap, you can see a thick bright-yellow horizontal band at ES 5,400 that has been building for 20 minutes — thousands of contracts resting at that bid. Price dips toward 5,400 and the band holds: the heatmap shows the yellow staying intact as trade prints absorb the selling. Price bounces 8 points. A trader watching Bookmap saw that liquidity wall form in advance, recognized it as genuine demand (it didn't get pulled as price approached), and entered long as price touched the zone.

## Full explanation

### What the heatmap visualizes

The traditional DOM shows you a snapshot: what is resting right now. Bookmap turns that snapshot into a **movie**: it logs every DOM update and paints the history as a scrolling 2D grid.

- **Color intensity** represents order size. Most heatmaps use a spectrum from dark/cold (thin) to bright/hot (thick). A bright yellow or white cell means thousands of contracts rested at that price at that time.
- **Horizontal streaks** — a bright horizontal line that persists over time means a large participant kept their limit order in place. That is a potential support or resistance.
- **Fading streaks** — a bright band that fades and disappears means the limit orders were pulled before price reached them. That is a classic sign of spoofing or loss of conviction.
- **Diagonal patterns** — when price trades through a level, the heatmap shows filled orders as a diagonal consumed band. You can see exactly how much liquidity was absorbed.

### Key signals on Bookmap

- **Liquidity clusters as support/resistance** — a concentration of bids at a price level that has held through multiple tests is genuine support. Multiple tests without pulling signal conviction from the resting participant.
- **Iceberg detection** — when a bright area appears at a price but the DOM only shows a small visible size, a large hidden order is likely refreshing itself as it fills. Bookmap's "bubbles" feature can display actual traded volume at each cell, distinguishing resting from executed.
- **Absorption in real time** — when price grinds into a cluster and the cluster visibly consumes (shrinks row by row as trades execute) without price moving through, that is absorption — a large participant soaking up aggression.
- **Pulling before price arrives** — a wall that brightens as price approaches then suddenly vanishes is spoofing. Bookmap makes this visible as a disappearing bright band that leaves a gap price can fall through quickly.

### Reading momentum with Bookmap

Beyond static levels, Bookmap shows **momentum shifts**:

- If the ask-side heatmap is consistently thin while the bid side is thick, buyers have the structural advantage — sellers are not willing to commit resting orders near price.
- Sudden buildup on both sides (thick bids and asks compressing around current price) often precedes a large move when one side gives way.

### Bookmap vs. a plain DOM

The plain DOM is a single-frame photograph; Bookmap is the full film reel. Patterns like "the bid was huge but got pulled the moment price touched it" are invisible on a DOM snapshot but crystal-clear on the heatmap. This historical dimension is what makes Bookmap the preferred liquidity tool for professional scalpers and futures traders.

### Why it matters for a trader

Most retail traders see only price. Bookmap lets you see **where the money is sitting** and — critically — whether it runs or holds when tested. Trading near a genuine, persistent liquidity wall is very different from trading near a spoofed level. That distinction, made visible by the heatmap, separates high-probability setups from traps.
