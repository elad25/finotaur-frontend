## In plain words

**Delta** is the difference between the volume that traded on the **ask** (aggressive buyers) and the volume that traded on the **bid** (aggressive sellers) over a given period. Positive delta means buyers were more aggressive; negative delta means sellers were. **Cumulative Delta (CVD)** adds all those per-bar deltas together over time, creating a running total that shows who has controlled the tape across an entire session — and crucially, when that control starts to break down.

## Quick demo

ES rallies from 5,400 to 5,430 over two hours. The price chart looks bullish. But the CVD line, plotted underneath, has been falling the entire time — it peaked at +12,000 and is now at +2,000. That **divergence** means sellers have been systematically hitting the bid on every up-tick; the rally is being driven by a thinning bid side, not genuine buying enthusiasm. Within 20 minutes, price rolls over sharply and retraces to 5,410.

## Full explanation

### What delta measures

Every trade in the market is initiated by someone:
- A **buyer** who places a market order (or a limit order that crosses the spread) lifts the ask → that volume is counted as **ask volume** (positive).
- A **seller** who places a market order hits the bid → that volume is counted as **bid volume** (negative in the delta calculation).

**Delta = Ask Volume − Bid Volume**

A single candle might have a delta of +3,200, meaning buyers added 3,200 more contracts than sellers during that bar. A delta of −1,500 means sellers were in control by 1,500 contracts.

Delta is displayed in several ways:
- **Per-bar delta** — the net aggression for each individual candle.
- **Cumulative Delta (CVD)** — a running sum of per-bar deltas across the session, plotted as a line beneath the price chart.

### Reading per-bar delta

- A **large positive delta on a bull candle** — buyers drove price up and were aggressive. Normal, high-conviction move.
- A **large negative delta on a bull candle** — price went up, but sellers were hitting bids. Counterintuitive: buyers were passive (limit orders absorbed the selling); the move may lack follow-through.
- A **large positive delta on a bear candle** — price went down despite buyers being aggressive. This is classic **absorption**: sellers soaked up all the buy pressure and kept pushing. Often a continuation signal downward.

### The power of CVD divergence

CVD divergence is one of the highest-probability signals in order-flow trading:

**Bullish divergence (hidden strength)**
Price makes a new low, but CVD does not make a new low (or CVD is rising while price falls). Sellers are running out of ammunition; buyers are absorbing the selling pressure without price moving lower.

**Bearish divergence (hidden weakness)**
Price makes a new high, but CVD is declining. Sellers are consistently hitting bids on every up-tick; the rally is being driven by passive sellers stepping back, not by genuine new buyers. When the sellers become active again, the reversal is often fast.

### CVD vs. standard volume

Standard volume tells you total participation. CVD tells you **directional intent**. Two candles can have identical volume but opposite CVDs — one driven by buyers, one by sellers. CVD is the tool that separates the two.

### Limitations to respect

Delta is calculated from the **last tick** — whether a trade printed on the bid or ask at the moment of execution. In fast markets, large orders can execute across multiple price levels simultaneously, making tick-level attribution noisy. Additionally, CVD is a session-relative tool: it resets at the open and only shows relative aggression, not absolute positioning.

### Why it matters for a trader

CVD is the order-flow trader's leading indicator. While price tells you what the result was, CVD tells you the *process* — and when the process contradicts the result, a turning point is near. A market making new highs on deteriorating CVD is a market running on fumes. Catching that divergence early — before the price chart shows any crack — is one of the most reliable edges order-flow trading offers.
