## In plain words

**Volatility skew** describes the pattern where options at different strike prices trade at different **implied volatilities (IV)**, even when they share the same expiration. For equity markets, out-of-the-money puts almost always carry higher IV than equivalent calls — a pattern called the **put skew** or **negative skew**. The reason is structural demand: investors routinely buy downside puts to hedge portfolios, bidding up their price and therefore their implied volatility.

## Quick demo

Suppose SPY is trading at $500. A 480-strike put (4% out of the money) might show an IV of 22%, while a 520-strike call (4% out of the money) shows only 16%. Both are equally far from the current price — yet the put costs more to buy. A trader selling the 480 put is paid a richer premium than a trader selling the 520 call, precisely because market participants value downside protection more highly than upside speculation.

## Full explanation

### Why skew exists

After the 1987 market crash, options markets repriced the probability of extreme downside moves upward permanently. Before 1987, implied volatility was roughly flat across strikes — the "smile" was symmetric. Post-crash, a persistent **smirk** emerged: IV rises steeply as you move to lower strikes and falls modestly as you move to higher strikes.

Three forces sustain the skew today:

- **Portfolio hedging demand** — institutional investors continuously buy puts to insure long equity books, creating persistent bid pressure on downside strikes.
- **Crash risk premium** — markets assign a higher-than-lognormal probability to large, fast moves downward (fat left tails).
- **Supply imbalance** — fewer natural sellers of downside puts exist relative to buyers, so sellers demand extra premium as compensation.

### The smile vs. the smirk

In some markets — particularly FX and short-dated index options — skew is more symmetric, with both deep puts and deep calls trading at elevated IV relative to at-the-money options. This shape is called the **volatility smile**. In equity index markets, the shape is better described as a **smirk**: IV rises sharply to the left (lower strikes) but rises only gently or falls slightly to the right (higher strikes).

### How to read skew

Several practical metrics summarize skew:

- **25-delta risk reversal** — the difference in IV between the 25-delta call and the 25-delta put. A negative number in equities confirms the put skew.
- **Skew slope** — how steeply IV changes per unit of strike distance. Steep skew means downside protection is very expensive relative to upside.
- **Term structure of skew** — near-term expirations often show steeper skew than long-dated ones, because short-term crash risk is priced more aggressively.

### Reading skew in practice

When skew is steep, **selling puts is richly compensated** but carries more tail risk than the premium alone suggests. When skew is flat or inverted, downside fear has abated and put spreads become a relatively cheaper hedge. Traders also watch for skew shifts ahead of events — a sudden steepening of put skew often signals institutional hedging into a catalyst, even before price moves.

For a trader, understanding skew means never treating implied volatility as a single number for an expiration. It is a curve across strikes, and reading that curve tells you what the market is genuinely afraid of.
