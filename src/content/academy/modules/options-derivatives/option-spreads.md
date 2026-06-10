## In plain words

A **spread** is an options strategy that involves buying one option and simultaneously selling another option on the same underlying asset. By combining a long and a short option, you reduce the cost of the trade and cap both your potential profit and your maximum loss. **Vertical spreads** use the same expiration but different strikes. **Calendar spreads** use the same strike but different expirations. **Diagonal spreads** combine both — different strikes and different expirations.

## Quick demo

Stock XYZ trades at $100. You are moderately bullish. Instead of buying a $100 call for $4 (all time value, fully at risk), you buy the $100 call and sell the $105 call, both expiring in 30 days. The $105 call you sold costs the buyer $2, so your net debit is $2 instead of $4. Your maximum gain: $5 (the spread width) minus $2 (cost) = $3. Your maximum loss: $2 (what you paid). Half the cost, half the max profit, but the break-even is much easier to reach.

## Full explanation

### Vertical spreads

Vertical spreads are defined by the relationship between the two strikes, using the same expiration.

**Bull call spread**: Buy a lower-strike call, sell a higher-strike call. This is a debit spread — you pay net premium. You profit if the underlying rises toward or above the higher strike.

**Bear put spread**: Buy a higher-strike put, sell a lower-strike put. Also a debit spread. You profit if the underlying falls toward or below the lower strike.

**Bull put spread**: Sell a higher-strike put, buy a lower-strike put. This is a credit spread — you collect net premium. You profit if the underlying stays above the short strike.

**Bear call spread**: Sell a lower-strike call, buy a higher-strike call. Also a credit spread. You profit if the underlying stays below the short strike.

Key characteristics of vertical spreads:
- Maximum profit and maximum loss are both defined at entry.
- The width of the spread (difference between strikes) determines the maximum value at expiration.
- Credit spreads are theta-positive (time decay helps you); debit spreads are theta-negative.

### Calendar spreads (horizontal spreads)

A calendar spread buys a longer-dated option and sells a shorter-dated option at the same strike. The goal is to profit from the difference in time decay rates — the short-dated option decays faster than the long-dated one.

- Best in low-volatility environments where the underlying stays near the strike.
- Long vega: profits from an increase in IV.
- Risk: a large price move through the strike can hurt the position.

### Diagonal spreads

A diagonal spread combines a different strike with a different expiration. The "poor man's covered call" is a common diagonal: buy a deep ITM long-dated call (a LEAPS) and sell shorter-dated OTM calls against it repeatedly. This simulates a covered call at a fraction of the capital required to own 100 shares.

### Why spreads matter

Spreads reduce the capital outlay and define maximum risk in advance — critical for sizing positions in a portfolio. They also allow traders to express a specific view (mildly bullish, strongly bearish, range-bound) with a payoff structure matched to that conviction. A trader who buys a naked call risks the entire premium; a trader who buys a debit spread risks a fraction of that, with clearly defined outcomes at both ends. This precision is why professionals use spreads far more than outright long options.
