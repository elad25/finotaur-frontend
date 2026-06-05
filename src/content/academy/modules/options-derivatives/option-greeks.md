## In plain words

The **Greeks** are sensitivity measures that tell you how an option's price will change when one input shifts — while everything else stays the same. **Delta** measures sensitivity to the underlying price. **Gamma** measures how fast delta changes. **Theta** measures time decay. **Vega** measures sensitivity to volatility. **Rho** measures sensitivity to interest rates. Together, they form the dashboard every options trader uses to understand what a position will do under different conditions.

## Quick demo

You own a call option with a delta of 0.40 and a theta of −$0.05. The stock rises $1 today and expiration is still three weeks away. Your option gains roughly $0.40 in value from delta — but loses $0.05 from theta (one day's time decay). Net change: approximately +$0.35 per share, or +$35 on a standard 100-share contract. Delta and theta are constantly pulling in opposite directions for an option buyer.

## Full explanation

### Delta (Δ)

**Delta** ranges from 0 to 1 for calls and −1 to 0 for puts. It tells you how much the option price moves per $1 change in the underlying.

- A delta of 0.50 (approximately ATM) means the option gains $0.50 for every $1 rise in the stock.
- A deep ITM call may have delta near 1.00 — it moves almost like owning the stock.
- A far OTM call may have delta near 0.05 — it barely responds to small moves.

Delta also approximates the probability that an option expires in the money.

### Gamma (Γ)

**Gamma** measures how fast delta changes as the underlying moves. It is highest for ATM options near expiration. Gamma is why an option can "accelerate" — a large move causes delta to rise, which causes the next move to produce an even bigger gain.

- **Long gamma** (option buyers) benefit from big moves in either direction.
- **Short gamma** (option sellers) are hurt by large moves; they want the underlying to sit still.

### Theta (Θ)

**Theta** is daily time decay — how much dollar value the option loses per calendar day, all else equal.

- Buyers pay theta: they are fighting against time eroding their option's value.
- Sellers collect theta: they benefit as each day passes and time value drains.
- Theta accelerates as expiration approaches, especially for ATM options.

### Vega (ν)

**Vega** measures sensitivity to a 1-percentage-point change in implied volatility.

- A vega of $0.15 means the option gains $0.15 if IV rises by 1%.
- Option buyers are **long vega**: they want volatility to expand after they buy.
- Option sellers are **short vega**: they want volatility to contract after they sell.
- Vega is highest for longer-dated, ATM options.

### Rho (ρ)

**Rho** measures sensitivity to a 1-percentage-point change in the risk-free interest rate. It is generally the least important Greek for most trades but matters more for long-dated options and LEAPS. Higher rates modestly increase call values and decrease put values.

### How Greeks work together

Real positions have Greek exposure across all dimensions simultaneously. A covered call is short an OTM call — the position has negative vega, positive theta, and reduced delta relative to owning the shares outright. Managing a portfolio of options means managing the aggregate Greeks, not individual contracts. Professional market makers aim to stay **delta-neutral** — hedging away directional exposure — so their profits come from the other Greeks: collecting theta and managing gamma risk.
