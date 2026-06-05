## In plain words

**Duration** measures how sensitive a bond's price is to a change in interest rates — the higher the duration, the more the price moves when rates shift. Think of it as the bond's interest-rate risk ruler. **Convexity** refines that estimate: because the price-yield relationship is a curve, not a straight line, convexity captures the way duration itself changes as rates move, and it always works in the bondholder's favor.

## Quick demo

You hold a bond with a **modified duration** of 7. If interest rates rise by 1 percentage point, the bond's price will fall by approximately 7%. If rates fall by 1%, the price will rise by approximately 7%. Convexity means the actual gain when rates fall is slightly *more* than 7%, and the actual loss when rates rise is slightly *less* — the curve bends in your favor as a holder. A bond with higher convexity is more valuable, all else equal.

## Full explanation

### Macaulay duration — the weighted average clock

**Macaulay duration** is the weighted average time to receive a bond's cash flows, where each payment is weighted by its present value. Measured in years, it tells you how long, on average, you are waiting to get your money back. A zero-coupon bond's Macaulay duration equals its maturity because you receive a single payment at the end. A coupon-paying bond's Macaulay duration is shorter than its maturity, because some cash arrives earlier via coupons.

### Modified duration — the price sensitivity measure

**Modified duration** converts Macaulay duration into a direct price-sensitivity estimate:

**Modified duration = Macaulay duration ÷ (1 + YTM/n)**

where *n* is the number of coupon periods per year. The interpretation is simple:

**% change in price ≈ −Modified duration × Change in yield**

If a bond has a modified duration of 5 and yields rise by 0.5%, the price falls by roughly 2.5%.

### What drives duration up or down

- **Longer maturity → higher duration**: cash flows stretch further into the future.
- **Lower coupon → higher duration**: less cash arrives early, so the weighted average is further out.
- **Lower yield → higher duration**: future cash flows are discounted less aggressively, increasing their weight.

Zero-coupon bonds have the highest duration relative to maturity and are therefore the most interest-rate sensitive instruments.

### Convexity — the curvature correction

Duration is a linear approximation of a non-linear relationship. At large rate moves, the linear estimate becomes inaccurate. **Convexity** measures how much the duration itself changes as yields move. Adding a convexity adjustment improves the price-change estimate:

**% price change ≈ (−Duration × Δy) + (½ × Convexity × Δy²)**

Positive convexity — found in most standard bonds — means price rises more than duration predicts when rates fall, and falls less than duration predicts when rates rise. Bonds with callable features can have **negative convexity** in certain yield ranges, which removes this cushion from the holder.

### Practical use

Portfolio managers express interest-rate sensitivity using **dollar duration** (also called DV01 or PVBP — the dollar change in price for a 1 basis-point move in yield). This lets them hedge precisely: if a portfolio has a $10,000 DV01, they can offset it by shorting a Treasury position with a matching DV01.

### Why this matters for a trader or investor

Duration and convexity are the primary tools for managing interest-rate risk in a bond portfolio. When you believe rates will rise, shortening duration protects value. When you believe rates will fall, extending duration amplifies gains. Understanding convexity helps you prefer bonds with better price behavior under large rate swings — a real advantage when volatility is high.
