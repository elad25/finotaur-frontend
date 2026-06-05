## In plain words

**Yield to maturity (YTM)** is the total annualized return you would earn if you bought a bond today, held it until it matures, and reinvested every coupon at the same rate. It is a single number that lets you compare bonds with different prices, coupons, and maturities on equal footing. **Current yield** is simpler — just the annual coupon divided by the current market price — but it ignores the gain or loss you get when the bond eventually pays back face value.

## Quick demo

Suppose you buy a bond for $950 that has a $1,000 face value, pays a $40 coupon each year, and matures in 5 years. Your current yield is $40 ÷ $950 = 4.2%. But you'll also pocket the $50 difference between what you paid and what you receive at maturity, spread over 5 years. YTM captures both the coupon income and that capital gain, producing a true all-in return — roughly 5.1% in this example.

## Full explanation

### Current yield — the quick estimate

Current yield is the bond's annual coupon payment divided by its current market price:

**Current yield = Annual coupon ÷ Market price**

If a bond's coupon is $60 and its price is $1,050, current yield is 5.7%. This is quick to calculate and useful for ballpark comparisons, but it misses the time dimension entirely — it does not account for the fact that an investor buying at $1,050 will receive only $1,000 at maturity, a guaranteed $50 loss.

### Yield to maturity — the complete picture

YTM solves the problem by solving for the interest rate *r* that equates the bond's market price to the present value of all its future cash flows:

- All coupon payments over the remaining life
- The face-value repayment at maturity

Because this requires solving an equation with compounding, it is typically calculated with a financial calculator or a formula. The key intuitions are:

- **Bond purchased at a discount** (price < face value): YTM > coupon rate, because you gain at maturity.
- **Bond purchased at par** (price = face value): YTM = coupon rate.
- **Bond purchased at a premium** (price > face value): YTM < coupon rate, because you lose at maturity.

### Reinvestment assumption — the hidden caveat

YTM assumes all coupon payments are reinvested at the same YTM rate throughout the bond's life. In practice, reinvestment rates change constantly. If rates fall after you buy, you'll reinvest coupons at lower rates and your actual return will be below the stated YTM. This gap is called **reinvestment risk** and is larger for bonds with higher coupons and longer maturities.

### Other yield variants

- **Yield to call (YTC)**: for callable bonds (where the issuer can repay early), YTC uses the call date and call price rather than maturity.
- **Yield to worst (YTW)**: the lowest of YTM and all YTC scenarios — the most conservative measure and the one professional investors quote for callable bonds.

### Why this matters for a trader or investor

When you see a bond advertised as "yielding 5%," that number is almost always YTM. It is the correct apples-to-apples comparator across bonds and the benchmark against which you measure whether a bond compensates you fairly for its credit risk and duration. Misunderstanding the difference between current yield and YTM is one of the most common ways retail investors miscalculate their actual returns.
