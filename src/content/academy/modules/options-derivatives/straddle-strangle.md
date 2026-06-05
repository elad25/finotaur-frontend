## In plain words

A **straddle** and a **strangle** are strategies designed to profit from a large move in the underlying asset, regardless of direction. With a **straddle**, you buy a call and a put at the same strike price (usually at-the-money). With a **strangle**, you buy a call and a put at different strikes — the call above the current price and the put below. Both strategies are bets on **volatility itself**: you make money if the asset moves more than the market expected, and you lose money if it sits still.

## Quick demo

A stock is at $100 ahead of a major earnings release. You expect a big move but don't know which direction. You buy the $100 call for $4 and the $100 put for $3.50 — a straddle costing $7.50 total. For the trade to profit at expiration, the stock must be above $107.50 or below $92.50. The stock jumps to $115 on strong earnings. Your call is worth $15, your put expires worthless. Profit: $15 − $7.50 = $7.50 per share, or $750 per contract.

## Full explanation

### The straddle

**Setup**: Buy one ATM call and one ATM put with the same strike and expiration.

**Profit**: The trade profits when the underlying moves significantly in either direction. The further it moves, the greater the profit on the winning leg, while the losing leg is capped at the premium paid.

**Maximum loss**: The total premium paid for both legs. This occurs if the stock is exactly at the strike price at expiration — both options expire worthless.

**Break-even levels**: Strike price ± total premium paid. A $7.50 straddle on a $100 stock breaks even at $107.50 to the upside and $92.50 to the downside.

**Key risk**: Straddles are expensive because you are buying two ATM options. IV crushes — common after earnings are announced — can kill the position even if the stock moves, because declining IV erodes the value of both options before the move fully plays out.

### The strangle

**Setup**: Buy an OTM call and an OTM put with the same expiration but different strikes.

**Example**: Stock at $100. Buy the $105 call for $2 and the $95 put for $2, paying $4 total.

**Advantage over straddle**: Cheaper to enter because both options are out of the money.

**Disadvantage**: Requires a larger move to be profitable. The break-even levels are further out: above $109 or below $91 in this example.

**Best for**: Traders who expect a very large move — such as a major catalyst — and want to reduce the cost of the position compared to a straddle, accepting the need for a bigger swing.

### Long vs. short volatility

The long straddle and strangle are **long volatility** (long vega) positions — they benefit from rising IV and suffer from falling IV. Conversely, selling a straddle or strangle creates a **short volatility** position: you collect the combined premium and profit if the underlying stays within the break-even range, but face unlimited loss in either direction (for the short call leg) if the move is large.

Short straddles and strangles are common premium-selling strategies in low-volatility environments, but they carry substantial tail risk and require careful risk management.

### When to use each

- **Straddle**: When you want maximum delta-neutrality and the ATM cost is manageable. Best when IV is low relative to history and you expect a large catalyst.
- **Strangle**: When the underlying is expensive (high IV on ATM options) and you want a cheaper structure, accepting that you need a larger move.

Volatility trading via straddles and strangles is a core tool for professional options desks. For individual traders, understanding when the market's expectations are too low — or too high — is the real skill.
