## In plain words

The **wheel strategy** is a systematic income approach that cycles between two defined-risk options positions: a **cash-secured put** and a **covered call**. You start by selling a put on a stock you are willing to own. If the put expires worthless, you collect premium and repeat. If you get assigned the shares, you immediately sell a covered call against them. When the call expires or the stock is called away, the cycle restarts. The strategy generates income from premium in both directions — on the way in and on the way out.

## Quick demo

You target XYZ stock, currently at $50, which you would be happy to own at $47. You sell a 30-day $47-strike put and collect $1.20. If XYZ stays above $47, the put expires worthless — you keep $120 and repeat. If XYZ falls to $45 at expiration, you are assigned 100 shares at $47 (effective cost basis: $47 − $1.20 = $45.80). You then sell a 30-day $48 covered call and collect another $0.90. If XYZ recovers and the call is exercised, you sell at $48 and pocket the gain plus the $0.90 premium — then start the wheel again.

## Full explanation

### Step one: the cash-secured put

The wheel begins with selling an out-of-the-money put on a stock you have researched and would genuinely want to own at the strike price. "Cash-secured" means you hold enough cash to purchase 100 shares at the strike if assigned. This is not a speculative naked put — the cash requirement is real collateral.

**Key selection criteria:**

- **Strike** — typically 1–2 strikes below the current price, often targeting a delta between 0.25 and 0.40 for a balance between premium collected and assignment probability.
- **Expiration** — most practitioners use 30–45 DTE to maximize **theta decay** while staying far enough from earnings and events.
- **Underlying selection** — the most important factor. The wheel works best on liquid, fundamentally sound stocks or ETFs where assignment would not be a catastrophe. Avoid high-IV meme stocks or companies with deteriorating fundamentals.

### Step two: the covered call

Once assigned shares, you shift to selling covered calls. The goal is to collect premium above your cost basis and either have the shares called away (exit at a profit) or continue generating income while holding.

**Key decisions:**

- **Strike above your cost basis** — ensures you don't lock in a loss if assigned. A common target is the original put strike, slightly above, or at a logical resistance level.
- **Duration** — again, 30–45 DTE for predictable theta decay.
- **Rolling** — if the call is approaching the money and you don't want to lose the shares, you can roll it up and out: buy it back and sell a higher strike at a later expiration. This resets the clock and adjusts your effective exit price.

### The risk the strategy does not eliminate

The wheel is often marketed as "safe income" — a framing that is misleading. The real risk is **underlying depreciation**. If you are assigned shares at $47 and the stock falls to $30, selling covered calls at $45 or $48 while the stock sits at $30 generates small premium income against a large unrealized loss. The covered call income will not save a fundamentally broken position. The wheel works well in sideways to modestly trending markets on quality underlyings; it can be damaging in strong downtrends.

### Why it matters for a trader

The wheel is a systematic way to express a moderately bullish to neutral view while generating consistent premium income. Its discipline — always having a plan for assignment, always selling against your position, never speculating beyond defined risk — makes it a useful structure for traders learning premium-selling mechanics. Understanding its limits is equally important: it is an income overlay on a long stock position, not a hedge.
