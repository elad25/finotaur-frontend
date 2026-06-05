## In plain words

**Black-Scholes** is a mathematical formula, published in 1973, that calculates a fair price for a European-style option. It takes five inputs — the current stock price, the strike price, time to expiration, the risk-free interest rate, and the asset's **volatility** — and outputs a theoretical value for a call or put. You do not need to memorize the equation, but understanding what goes into it tells you exactly what makes options more or less expensive.

## Quick demo

A stock is at $100, with a $100 strike call expiring in 30 days. The risk-free rate is 5% and the stock's annual volatility is 20%. Black-Scholes prices that call at roughly $2.30. Now double the volatility to 40% — the same call jumps to about $4.60. Volatility is the dominant driver of price, which is exactly why options traders obsess over it. Everything else was held constant; only the uncertainty estimate changed.

## Full explanation

### The five inputs

Black-Scholes takes five variables:

- **S** — Current price of the underlying asset.
- **K** — Strike price of the option.
- **T** — Time to expiration, expressed as a fraction of a year (30 days ≈ 0.082).
- **r** — Risk-free interest rate (typically the short-term government bond yield).
- **σ (sigma)** — The expected annualized volatility of the underlying.

### What the model actually does

Black-Scholes models the underlying asset's price as following a **log-normal random walk** — prices can't go negative and large moves are rarer than small ones, but the distribution has a defined shape. Given that assumption, the formula calculates the expected payoff of the option across all possible future prices, discounted back to today.

The output is two numbers: the fair value of a call and, using put-call parity, the fair value of a put.

### Key insights from the model

**Volatility is the wild card.** Every other input is observable (price, strike, rate, time). Volatility — specifically *future* volatility — is unknown. Market participants quote options not in dollars but in **implied volatility (IV)**: the volatility level that would make Black-Scholes produce the observed market price. When you say "IV is 30%," you mean the market is pricing the option as if the stock will move 30% annually.

**Time and volatility interact.** More time means a wider range of possible outcomes. The formula uses √T, meaning volatility's impact scales with the square root of time — doubling the time to expiration increases the option value by roughly 1.41×, not 2×.

### Limitations of the model

Black-Scholes makes assumptions that are known to be imperfect:

- It assumes constant volatility, but real volatility changes (the "volatility smile" exists because the market knows this).
- It assumes no dividends (a dividend-adjusted version exists).
- It uses continuous trading and log-normal distribution, which underprices extreme events (fat tails).
- It applies cleanly only to European-style options; American options require adjustments.

### Why it still matters

Despite its flaws, Black-Scholes remains the industry benchmark because it gives everyone a shared language. The Greeks — Delta, Gamma, Theta, Vega — are all partial derivatives of the Black-Scholes formula. When a market maker says an option is "cheap" or "rich," they mean relative to its theoretical Black-Scholes value at a given implied volatility level. Every serious options trader uses these concepts daily, whether they know the formula or not.
