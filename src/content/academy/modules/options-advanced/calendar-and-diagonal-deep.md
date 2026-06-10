## In plain words

A **calendar spread** (also called a time spread) buys a longer-dated option and sells a shorter-dated option at the **same strike**, profiting from the difference in how quickly they decay. A **diagonal spread** does the same but uses **different strikes** across the two expirations — effectively combining a calendar's time-value edge with a directional or skew view. Both structures trade the **term structure of volatility**: the relationship between short-term and long-term implied volatility.

## Quick demo

XYZ is at $100. You sell a 30-day $100 call (collecting $3.00) and buy a 60-day $100 call (paying $4.50) — a calendar spread for a net debit of $1.50. If XYZ sits near $100 at the 30-day mark, the short call expires worthless while the long call still has 30 days of time value remaining — now worth roughly $2.80. You close for a $1.30 profit on a $1.50 investment. The strategy profits because the short-dated option decays faster than the long-dated one when price stays near the strike.

## Full explanation

### The calendar spread mechanics

The calendar's profit engine is **differential theta decay**. Near-dated options lose time value faster than far-dated options. By selling the fast-decaying front-month option and owning the slower-decaying back-month option, the trader captures the speed difference as profit — provided the underlying doesn't move sharply away from the strike.

**Maximum profit** for a calendar occurs when the underlying expires exactly at the strike of the sold option on expiration day — the short option is at zero and the long option retains most of its time value.

**Maximum loss** is limited to the net debit paid, assuming both options are held through the short expiration. In practice, the structure can also be closed before expiration.

### The volatility surface view

Calendars are inherently **long vega** in the back month and **short vega** in the front month. Because vega is proportional to time, the back-month option is more sensitive to IV changes than the front month. Calendars therefore profit not only from price stability but also from:

- **Increasing implied volatility** — rising IV expands the back-month option's price more than the front-month, widening the spread value.
- **Steepening term structure** — if short-term IV falls (for example, post-event) while long-term IV holds, the calendar gains.

Calendars are most effective when **IV is low and expected to rise**, or when a specific event (earnings, Fed meeting) will inflate front-month IV that then collapses post-event.

### Diagonal spreads: adding a directional view

A diagonal spread shifts the strike of the long option relative to the short. For example:

- Sell a 30-day $100 call, buy a 60-day $105 call. This is a **bullish diagonal**: you profit from price moving toward the $105 strike while selling premium to reduce cost.
- Sell a 30-day $100 put, buy a 60-day $95 put. A **bearish diagonal**.

The diagonal introduces **delta** into the structure — it is no longer purely a volatility trade. The payoff profile shifts: instead of peaking at the short strike, profit extends in one direction.

### The "poor man's covered call"

A popular form of the bullish diagonal uses a deep in-the-money long call (high delta, low extrinsic value) to simulate stock ownership cheaply, while selling shorter-dated out-of-the-money calls against it. This structure — sometimes called a PMCC (poor man's covered call) — replicates the covered call payoff at a fraction of the capital outlay.

### Key risks

- **IV contraction** — if implied volatility collapses across the board, the long back-month option loses more value than the short front-month, compressing the spread.
- **Large price move** — a sharp directional move away from the strike collapses the calendar's value because the time-value advantage disappears.
- **Assignment risk** — if the short option goes in the money, it may be exercised early, especially on dividend-paying stocks.

For a trader, calendars and diagonals offer a way to monetize time and volatility dynamics without taking a hard directional bet. Mastering them requires reading the volatility term structure — knowing whether front-month IV is cheap or rich relative to the back month determines whether the structure is worth entering at all.
