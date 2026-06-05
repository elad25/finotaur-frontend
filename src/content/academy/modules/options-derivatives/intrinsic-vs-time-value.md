## In plain words

Every option premium is made of two parts. **Intrinsic value** is the amount an option is already worth if you exercised it right now — it exists only when an option is in the money. **Time value** (also called extrinsic value) is everything else in the price: the extra you pay for the possibility that the option will move further in your favor before it expires. As expiration approaches, time value drains away in a process called **theta decay**.

## Quick demo

A stock trades at $105. You own a call option with a $100 strike priced at $7. The intrinsic value is $5 — the option is $5 in the money right now. The remaining $2 is time value: the market is charging you for the chance the stock climbs even higher before expiration. If this option had only one day left, that time value might shrink to $0.05. With three months left, it might be $3. Time is money — literally.

## Full explanation

### Intrinsic value

Intrinsic value is straightforward arithmetic:

- **Call intrinsic value** = Current price − Strike price (if positive; otherwise zero)
- **Put intrinsic value** = Strike price − Current price (if positive; otherwise zero)

An option that is out of the money has zero intrinsic value — its entire price is time value. An option deep in the money has intrinsic value that tracks the underlying almost dollar for dollar.

### Time value (extrinsic value)

Time value = Option premium − Intrinsic value

Time value reflects two things:

- **Time remaining** — the more days until expiration, the more chances the underlying has to move favorably. Options with 60 days left cost more than otherwise identical options with 5 days left.
- **Implied volatility** — a more volatile underlying can swing further, so the option buyer is paying for a wider range of possible outcomes. High implied volatility inflates time value; low implied volatility deflates it.

### Theta decay and the "acceleration" effect

Time value does not drain linearly. It decays slowly at first and accelerates as expiration nears — the decay curve is convex. This is quantified by **theta**, one of the Greeks, which measures how much dollar value an option loses per day, all else equal.

- An option with 90 days left might lose $0.03/day in time value.
- The same option with 7 days left might lose $0.15/day.
- In the final hours on expiration day, time value collapses to nearly zero.

### Practical implications

For **option buyers**: time is working against you. Every day that passes without a favorable move is a small loss. Being right about direction but wrong about timing is still losing — a common trap for beginners.

For **option sellers**: time is working in your favor. Selling premium means collecting time value up front and watching it decay toward zero as the seller's profit.

### At-the-money options carry the most time value

ATM options have the most time value relative to their price because uncertainty about which way the underlying will move is highest at the strike. Deep ITM and deep OTM options have less time value because the outcome is less ambiguous.

Understanding the split between intrinsic and time value is essential for choosing strikes and expirations, evaluating whether a premium is fair, and knowing what you are actually buying or selling when you enter any options trade.
