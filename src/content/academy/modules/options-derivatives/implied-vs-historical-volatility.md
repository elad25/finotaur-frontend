## In plain words

**Historical volatility (HV)** is a backward-looking measurement: how much the underlying asset actually moved over some past period. **Implied volatility (IV)** is forward-looking: the volatility level the options market is pricing into contracts right now, derived by back-solving the Black-Scholes formula from the observed option price. HV describes what happened; IV describes what the market expects will happen — or more precisely, what traders are willing to pay for protection and speculation.

## Quick demo

A stock has moved an average of 15% annually over the past year — that is its 30-day historical volatility annualized. But next week it reports earnings. The options market knows a big move is possible, so IV has risen to 40%. The options look "expensive" compared to recent realized movement. After earnings, the stock moves only 8%. IV collapses back to 18%. Traders who sold premium before earnings (selling rich IV) and bought back cheaply afterward made money — not from direction, but from the gap between expected and actual volatility.

## Full explanation

### How historical volatility is calculated

HV is computed from actual price returns over a defined lookback window — 10, 20, or 30 days are common — then annualized. The formula is the standard deviation of daily log returns multiplied by √252 (trading days per year).

- A 30-day HV of 20% means the stock moved in a way consistent with a 20% annual range over the past month.
- HV is objective and backward-looking: it is a fact, not a forecast.

### How implied volatility is derived

IV is inferred. You take the current market price of an option, along with all observable inputs (stock price, strike, expiration, interest rate), and solve for the single volatility value that makes Black-Scholes output that price. That number is IV.

- IV reflects the collective opinion of all buyers and sellers of options at that moment.
- It bakes in not just expected movement but also supply and demand dynamics — fear, earnings uncertainty, known events, hedging demand.

### IV tends to overstate realized moves

Research consistently shows that IV is, on average, higher than subsequent realized volatility. This gap — called the **volatility risk premium** — is one reason that selling options has historically been profitable as a strategy class. The market consistently pays extra for insurance.

### When IV diverges sharply from HV

- **IV >> HV**: options are "expensive" or "rich." This commonly occurs before earnings, FDA decisions, or macro events. Sellers of premium benefit if the realized move is smaller than IV implied.
- **IV << HV**: options are "cheap." This occurs in calm periods or after a vol crush. Buyers of options benefit if actual movement picks up beyond what was priced.

### The volatility smile and surface

In a perfect Black-Scholes world, IV would be the same across all strikes and expirations. In reality, IV varies by strike (the "volatility smile" or "skew") and by expiration (the "term structure"). Puts on equities typically have higher IV than calls at the same distance from the current price — the market prices downside protection more expensively than upside speculation.

Understanding the gap between implied and historical volatility is the foundation for deciding whether to buy or sell premium on any given setup. It is one of the most practical edges in options trading.
