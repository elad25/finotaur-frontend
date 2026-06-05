## In plain words

A **Discounted Cash Flow (DCF)** valuation estimates what a business is worth today by projecting all the cash it will generate in the future and discounting those future dollars back to the present. The logic is simple: a dollar received ten years from now is worth less than a dollar today because you could invest today's dollar and earn a return over those ten years. DCF is the theoretical foundation of all valuation — but it requires assumptions that make the output highly sensitive to small input changes.

## Quick demo

A company is projected to generate $10 million in free cash flow next year, growing at 15% annually for five years, then at 3% forever. Using a 10% discount rate, each future cash flow is worth less in today's dollars — $10M next year discounts to ~$9.1M today; the year-five cash flow of $20M discounts to ~$12.4M today. Sum the discounted five-year cash flows plus a discounted "terminal value" for all cash beyond year five, and you arrive at an estimated intrinsic value. If the company's market cap is below that number, a DCF analyst would call it undervalued.

## Full explanation

### The three building blocks

**1. Free Cash Flow Projections**
Free cash flow (FCF) = Operating Cash Flow − Capital Expenditures. This is what the company generates that can be returned to all capital providers (debtholders and equityholders). Projecting FCF requires assumptions about revenue growth, margin evolution, and capex intensity over a 5–10 year explicit forecast period.

**2. The Discount Rate (WACC)**
Future cash flows are discounted back to today using the **Weighted Average Cost of Capital (WACC)** — the blended required return for both equity and debt investors:

WACC = (Equity Weight × Cost of Equity) + (Debt Weight × After-Tax Cost of Debt)

The cost of equity is typically estimated using the **Capital Asset Pricing Model (CAPM)**:

Cost of Equity = Risk-Free Rate + Beta × Equity Risk Premium

Higher-risk companies (more volatile, more leveraged) have a higher cost of equity, which means their future cash flows discount more aggressively — reducing their estimated value.

**3. Terminal Value**
The DCF cannot project cash flows to infinity explicitly, so analysts calculate a **terminal value** at the end of the explicit forecast period, representing all cash flows beyond that point. The most common approach:

Terminal Value = Final Year FCF × (1 + g) / (WACC − g)

where g is the assumed long-term growth rate (usually 2–3%, near GDP growth). The terminal value often accounts for 60–80% of total estimated value — which is why the long-term growth rate assumption is by far the most sensitive input.

### Sensitivity analysis

Because a DCF involves multiple assumptions, professional analysts always run a **sensitivity table** showing estimated value across a range of growth rates and discount rates. A typical output:

| | WACC 8% | WACC 10% | WACC 12% |
|---|---|---|---|
| g = 2% | $85 | $62 | $48 |
| g = 3% | $95 | $70 | $53 |
| g = 4% | $110 | $80 | $59 |

The wide range of outputs is not a flaw — it is an honest acknowledgement of uncertainty. The art is in narrowing the range through business analysis.

### DCF limitations

- **Garbage in, garbage out**: small changes in growth rate or discount rate produce large changes in value. A 1% change in the terminal growth rate can shift the value by 20–40%.
- **Requires a long-term view**: DCF is poorly suited to highly cyclical or unpredictable businesses.
- **Not useful for pre-revenue companies**: no current cash flow to project from.
- **Ignores market sentiment**: a stock can trade far from its DCF value for years; the model provides an anchor, not a timing signal.

### Why DCF remains the gold standard

Despite its limitations, DCF forces the analyst to make the implicit explicit. Every multiple-based valuation (P/E, EV/EBITDA) is just a shorthand for a DCF with embedded growth and discount rate assumptions. Understanding DCF means you understand what any multiple is really saying about the market's view of a company's future — which gives you a framework for deciding when the market's implied assumptions are reasonable or extreme.
