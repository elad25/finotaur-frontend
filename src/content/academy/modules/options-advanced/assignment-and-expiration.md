## In plain words

**Assignment** occurs when the seller (writer) of an option is obligated to fulfill the contract — delivering shares for a call or purchasing shares for a put. **Pin risk** is the danger that a position expires very close to the short strike, leaving the trader uncertain whether they will be assigned until after the close. **Expiration mechanics** determine exactly what happens to every option at the end of its life — and the consequences can be dramatic if a trader is unprepared.

## Quick demo

You sold a covered call with a $50 strike. On expiration Friday, the stock closes at $50.02 — just two cents in the money. Retail brokers typically exercise in-the-money options automatically if they expire at least $0.01 in the money (the OCC threshold). You wake up Monday morning to find your 100 shares have been called away at $50, even though the stock opens at $52 on Monday due to overnight news. You missed a $2 gap — this is pin risk playing out. Had the stock closed at $49.99, the call would have expired worthless and you would have kept your shares.

## Full explanation

### The mechanics of assignment

Options assignment works differently for American-style vs. European-style options:

- **American-style options** (all equity options, most ETF options) — the holder can exercise at any time before or on expiration. Assignment can therefore happen at any point the option is in the money, not just on expiration day.
- **European-style options** (SPX, XSP, most index options) — exercise only at expiration. Assignment is predictable and cannot happen early.

When a holder exercises an option, the OCC (Options Clearing Corporation) randomly assigns the exercise to one of the holders of the corresponding short position. As a seller, you cannot choose to avoid assignment — it is random, but in proportion to your open interest.

### Early assignment: when it happens

Early assignment on American-style options is uncommon but real. It occurs most often when:

- **Deep in-the-money calls before an ex-dividend date** — the holder exercises the call early to capture the dividend, since owning the stock entitles them to it but the option does not. Traders short deep ITM calls must monitor ex-dividend dates carefully.
- **Deep in-the-money puts** — when the time value remaining in a put is negligible and the holder would rather have the cash from selling the stock than continue holding the put.

The rule of thumb: if the extrinsic value of your short option is less than the dividend (for calls) or near zero (for puts), early assignment risk is elevated.

### Pin risk

Pin risk arises when the underlying closes very near the strike of your short option at expiration. The problem: market makers and institutional traders may continue to exercise options in the after-hours window (up to 5:30 PM ET on expiration Friday) based on post-close price movements — even after you see the final print.

This means:
- Your position may appear safe at market close (stock just below your short call) but you could still receive assignment if the stock rises in after-hours trading and an option holder decides to exercise.
- Conversely, you may hedge assuming assignment (buying or selling shares to offset your option exposure) only to find the option expired worthless because the stock moved back below the strike.

The safest approach to manage pin risk is to close positions before expiration if the underlying is within $0.50 of your short strike.

### Cash settlement vs. physical settlement

- **Physically settled options** — exercise results in the actual delivery of shares. All equity and most ETF options are physically settled.
- **Cash settled options** — exercise results in a cash payment equal to the intrinsic value. SPX, VIX, and most broad index options settle in cash. There is no stock delivery — no pin risk in the same sense, but the settlement price is typically set based on a special opening auction price (SOQ) on expiration morning, not the prior close.

### Why it matters for a trader

Understanding assignment and expiration is non-negotiable for any options seller. The consequences of unexpected assignment range from margin calls (if you lack the shares or cash to fulfill the obligation) to unexpected long or short stock positions carried into the weekend. A trader running a complex spread approaching expiration must also understand that individual legs may be assigned independently — leaving a previously defined-risk position suddenly undefined. Closing short legs before expiration when they are in the money, or switching to cash-settled instruments for cleaner management, are the two practical responses to these risks.
