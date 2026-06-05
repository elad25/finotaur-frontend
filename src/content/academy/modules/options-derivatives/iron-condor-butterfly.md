## In plain words

The **iron condor** and **iron butterfly** are defined-risk, premium-selling strategies that profit when the underlying stays within a specific price range by expiration. Both structures sell premium at strikes near the current price and buy options further away to cap the maximum loss. The iron condor uses a wider range (OTM call spread + OTM put spread); the iron butterfly concentrates around the ATM strike (ATM short straddle + long wings). Both collect premium and benefit from time decay and falling volatility.

## Quick demo

A stock is at $100 with elevated IV. You sell an iron condor: sell the $105 call, buy the $110 call, sell the $95 put, buy the $90 put — all expiring in 30 days. Net credit received: $1.50. Maximum profit is $1.50 (kept if stock stays between $95 and $105 at expiration). Maximum loss: $5.00 (spread width) − $1.50 (credit) = $3.50. You are risking $3.50 to make $1.50, but the probability of the stock staying in that range is high if IV is elevated and the stock is relatively stable.

## Full explanation

### Iron condor structure

An iron condor combines two vertical spreads:

- **Bear call spread** (above the market): Sell a call at a higher strike, buy a call further above. This defines the upside risk.
- **Bull put spread** (below the market): Sell a put at a lower strike, buy a put further below. This defines the downside risk.

The four legs form a "condor" shape on a payoff diagram: flat maximum profit in the middle, defined losses on either side beyond the short strikes.

**Maximum profit**: Net credit received. Achieved if the underlying closes between the two short strikes at expiration.

**Maximum loss**: Spread width minus credit received. Applies if the underlying breaches either short strike by expiration and keeps moving. Because the two spreads cannot both lose simultaneously (the stock can only be in one place), only one side can reach maximum loss.

**Break-even points**: Short call strike + net credit (upside), and short put strike − net credit (downside).

### Iron butterfly structure

An iron butterfly tightens the sold strikes to the same price — the ATM level:

- Sell an ATM call and an ATM put (a short straddle at the center).
- Buy an OTM call and an OTM put at equal distances (protection wings).

The result is a higher credit collected (ATM options are most expensive) and a narrower profit zone. The underlying must stay very close to the center strike to reach maximum profit.

The iron butterfly is higher-credit, higher-probability-of-touching-a-loss scenario, while the iron condor trades less premium for a wider profit range.

### Greeks and market conditions

Both strategies are:
- **Short vega**: They profit from declining implied volatility. Entering when IV is elevated is critical.
- **Positive theta**: Time decay works in the seller's favor every day.
- **Short gamma**: Large moves hurt — especially sudden, directional moves that breach a short strike.

**Ideal conditions**: Range-bound underlying, high IV Rank (above 50), no major catalysts in the expiration window.

### Managing the position

Most experienced traders do not hold iron condors to expiration. They set a profit target (often 50% of max credit) and close early, reducing both the time in the trade and the gamma risk near expiration. If the underlying moves toward a short strike, common adjustments include rolling the challenged spread further out or closing the position at a defined loss.

Iron condors and butterflies are among the most popular defined-risk premium-selling strategies because they are systematic, repeatable, and statistically well-suited to the tendency of IV to overstate realized movement. Understanding them is essential for any options trader interested in income generation.
