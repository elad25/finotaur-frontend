## In plain words

Every futures contract comes with a precise specification sheet that defines exactly what you are trading. The three numbers every trader must know are the **tick size** (the smallest price increment), the **point value** (how much one full point of price movement is worth in dollars), and the **expiration date** (when the contract stops trading). Misunderstanding these turns a correct price call into a miscalculated P&L.

## Quick demo

One ES (S&P 500 e-mini) contract has a tick size of 0.25 index points and a point value of $50. If ES moves from 5,200.00 to 5,201.00 — one full point — you made or lost $50. But that one point is four ticks of 0.25 each, worth $12.50 per tick. A five-point move equals $250. Knowing this before you trade prevents nasty surprises when you see your account balance.

## Full explanation

### Tick size and tick value

The **tick size** is the minimum increment a futures price can move. It varies by contract:

- ES (S&P 500 e-mini): 0.25 points = $12.50 per tick
- NQ (Nasdaq 100 e-mini): 0.25 points = $5.00 per tick
- CL (crude oil): $0.01 per barrel = $10.00 per tick
- GC (gold): $0.10 per troy ounce = $10.00 per tick

The **tick value** is the dollar amount gained or lost for every minimum move. Always confirm both numbers for your specific contract before trading.

### The contract multiplier

The multiplier (sometimes called the **point value**) converts an index or commodity price into dollars. The ES multiplier is $50 per point. If the index trades at 5,000, one contract represents $250,000 of notional exposure — even though your margin requirement is a fraction of that.

Mini and micro contracts use smaller multipliers, making them accessible to traders with smaller accounts.

### Expiration months and codes

Futures expire quarterly (or monthly for some contracts). Each expiration month has a standard letter code:

- **H** — March
- **M** — June
- **U** — September
- **Z** — December

So "ESZ25" means the S&P 500 e-mini expiring in December 2025. Most active traders focus on the **front-month contract** — the nearest upcoming expiration — which has the tightest spreads and deepest liquidity.

### Last trading day vs. expiration date

The **last trading day** is when you must close, roll, or accept delivery. For equity index futures like ES, this is typically the third Friday of the expiration month. After that, the contract no longer exists.

### Settlement method

Each contract settles either:
- **Cash settled** (financial futures like ES, NQ): the difference between your entry price and the final settlement price is credited or debited.
- **Physically delivered** (many commodity futures): the seller delivers the actual commodity. Most speculators roll or close before this happens.

### Why it matters for a trader

Reading the contract spec before placing your first trade is non-negotiable. Getting the tick value wrong by a factor of two or ten is one of the most common beginner errors — and it directly affects position sizing, stop placement, and risk calculation. Spend five minutes with the exchange's official contract spec before trading any new instrument.
