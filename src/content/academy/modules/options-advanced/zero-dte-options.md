## In plain words

**Zero-DTE options** (zero days to expiration) are contracts that expire on the same calendar day they are traded. Because all their **time value** evaporates within hours, their pricing is dominated by **gamma** — small moves in the underlying can produce enormous percentage swings in option value. These instruments have exploded in popularity since the S&P 500 introduced daily expirations in 2022, now accounting for over half of SPX daily options volume.

## Quick demo

At 9:45 AM, SPX is at 5,000 and you buy a 5,010-strike call expiring at market close — about 6 hours away — for $2.50. SPX rallies to 5,015 by 11:00 AM. That call, now in the money with several hours left, might be worth $8.00 — a 220% gain. But if SPX reverses to 4,990 by 11:30 AM, the same call could be worth $0.10. The speed of decay in 0DTE options is unlike anything in longer-dated contracts.

## Full explanation

### How 0DTE pricing works

With zero days left, **theta** (time decay) is at its absolute maximum — the option loses value every minute. In practice, most 0DTE options expire worthless. Sellers capture premium that evaporates rapidly; buyers need a fast, directional move to profit before decay eats their position.

**Gamma** is extremely elevated in 0DTE contracts. A 0.50-delta option can swing from deeply out-of-the-money to in-the-money within a single hour. This creates a powerful feedback loop with dealer hedging (see GEX): as 0DTE volume has grown, dealer gamma exposure from same-day expiries has become a major intraday market force.

### The risk profile

0DTE options carry risks that differ from standard options:

- **Total loss is the norm** — the majority of 0DTE options bought expire at zero. That $2.50 premium is fully at risk.
- **Slippage and bid-ask spread** — because these contracts move so fast, bid-ask spreads can be wide relative to the option's price. A $2.50 option with a $0.30 spread means entering and exiting costs nearly 25% of premium.
- **Gamma risk for sellers** — the inverse side is treacherous. Selling 0DTE options (collecting premium) seems safe when the market is calm, but a sharp unexpected move can turn a small collected premium into a catastrophic loss within minutes.
- **Assignment risk** — any in-the-money 0DTE option that goes through expiration is subject to automatic exercise. Traders who don't monitor positions until close can find themselves with unexpected stock positions.

### Why 0DTE has grown so large

Several forces drove the 0DTE boom:

- **Daily expirations** — CBOE introduced Monday, Wednesday, and Friday SPX expirations, and subsequently daily expirations, giving traders contract-per-day access.
- **Retail interest** — the asymmetric payoff (pay small, win big) attracts lottery-ticket-style speculation.
- **Income strategies** — some institutional and systematic traders sell 0DTE premium as an intraday income strategy, betting on range-bound markets.

### What it means for the broader market

The scale of 0DTE volume has become large enough to move markets. Dealers hedging massive same-day gamma books create intraday flows that can pin the index to key strikes, accelerate breakouts, or produce sharp reversals near market close as dealers unwind hedges. Understanding 0DTE mechanics is no longer optional for any serious intraday options trader — or even for equity traders trying to understand why the market behaves the way it does in the afternoon session.
