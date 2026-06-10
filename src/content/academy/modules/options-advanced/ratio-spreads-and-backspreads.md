## In plain words

A **ratio spread** sells more options than it buys at a different strike, creating an asymmetric payoff. A **backspread** is the mirror image: it buys more options than it sells. Both structures deliberately break the one-to-one symmetry of standard spreads to express a specific view on **direction, volatility, and skew**. Ratio spreads generate net premium credit but carry uncapped risk on one side; backspreads usually cost a net debit but profit from large moves.

## Quick demo

Stock XYZ is at $100. You buy one 105-strike call and sell two 110-strike calls — a **1×2 call ratio spread**. You collect a small net credit. If XYZ expires at $110, the maximum profit is realized (the one long call offsets one short call; the second short call expires at zero). If XYZ surges to $130, the position has significant uncapped losses because the second short call has no hedge above $110. The structure rewards a move to a specific target but punishes an overshoot.

## Full explanation

### Ratio spreads: structure and motivation

A standard ratio spread involves buying one option and selling two or more at a different strike, same expiration:

- **Call ratio spread** — buy 1 lower-strike call, sell 2 higher-strike calls. Nets a credit or small debit. Profits if the underlying rises moderately to the short strike but not beyond.
- **Put ratio spread** — buy 1 higher-strike put, sell 2 lower-strike puts. Profits if the underlying falls moderately to the short strike.

The reason to use a ratio spread instead of a simple vertical: **you extract more premium**, often bringing the structure to a net credit, and express the view that price will reach but not materially exceed the target strike. This is especially attractive when skew is steep — selling two out-of-the-money puts when their IV is elevated by skew generates much richer premium than a standard spread.

### The uncapped risk problem

The uncapped risk leg is what separates ratio spreads from defined-risk structures. The extra short option has no long hedge above (for calls) or below (for puts) the strike. A dramatic move through the short strikes can produce losses that dwarf the initial credit. Risk management is essential:

- Define a maximum loss threshold and close before it is breached.
- Use ratio spreads only in liquid underlyings where the move to an extreme level is genuinely improbable, not just uncommon.

### Backspreads: the inverse

A backspread reverses the ratio — more long options than short:

- **Call backspread** — sell 1 lower-strike call, buy 2 higher-strike calls. Net debit (usually). Profits from a large rally; loses if the underlying sits near the long strikes.
- **Put backspread** — sell 1 higher-strike put, buy 2 lower-strike puts. Profits from a large selloff.

Backspreads are **long volatility structures**: they benefit from large moves and suffer in quiet, range-bound markets. They are often used when a trader believes a breakout is coming but doesn't know the exact timing — the structure can be entered cheaply (sometimes at a credit in steep skew environments) and holds value if the explosive move materializes.

### Skew as the driver

Both structures are deeply tied to the volatility surface. When skew is steep:

- Selling out-of-the-money puts in a ratio spread captures inflated IV on the short legs.
- Buying a put backspread may cost very little because the extra long puts are priced with rich skew premium already built in.

Understanding where the structure sits on the volatility surface — which strikes are relatively cheap and which are expensive — is what makes ratio spreads and backspreads valuable tools rather than arbitrary constructs.

### Why it matters for a trader

Ratio spreads and backspreads give a trader fine-grained control over the payoff shape of a position. Rather than choosing between "buy a call" or "sell a put," these structures let you express calibrated views: "I think the stock moves up 8% but won't run away," or "I think volatility explodes but I want cheap entry." They require more active management than simple spreads, but reward traders who correctly read both direction and the volatility surface.
