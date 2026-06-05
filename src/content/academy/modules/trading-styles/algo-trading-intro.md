## In plain words

**Algorithmic trading** means using a computer program to execute trades based on a predefined set of rules — without human intervention in the moment of execution. **Systematic trading** is the broader concept: making every trading decision from a fixed rule set that is tested on historical data before it is deployed with real money. The goal is to remove emotion, enforce consistency, and scale an edge across many markets or time frames simultaneously.

## Quick demo

A trader notices that when the S&P 500's 10-day RSI drops below 30 and then crosses back above it, the index tends to produce above-average returns over the next five trading days. Instead of monitoring RSI manually every day, she writes a simple script that checks the RSI each morning, sends a buy order when the condition triggers, and sends a sell order five days later. She backtests this on 20 years of data, finds it had a positive expectancy, and deploys it with a defined maximum loss per trade. The strategy runs while she is asleep.

## Full explanation

### Discretionary vs. systematic trading

The spectrum runs from fully discretionary (every decision is a human judgment call) to fully systematic (no human involvement once the strategy is live). Most professional traders sit somewhere in between:

- **Fully discretionary** — a hedge fund manager deciding to short a bank stock based on research, gut, and experience.
- **Rules-guided discretionary** — a trader with a defined checklist of criteria who still exercises judgment on size and timing.
- **Systematic with discretionary override** — an algorithm generates signals; a human decides whether to take each one.
- **Fully systematic / algorithmic** — a computer generates and executes signals with no human approval per trade.

### What algorithms can do

- **Execute faster and more consistently** — an algorithm places an order in microseconds and never hesitates, freezes, or second-guesses.
- **Monitor many instruments simultaneously** — a human can watch a few charts; an algorithm can scan thousands of stocks, futures, or crypto pairs in real time.
- **Enforce strict rules** — it never moves a stop, never takes a trade outside the defined setup, and never trades when the daily loss limit is hit.
- **Backtest** — the rules can be applied to historical data to estimate how the strategy would have performed, revealing strengths and weaknesses before real capital is at risk.

### Types of algorithmic strategies

- **Trend following** — systematic entry and exit rules based on moving averages, breakouts, or channel signals. The CTA (Commodity Trading Advisor) industry manages tens of billions with these models.
- **Statistical arbitrage** — finding pairs or baskets of assets whose prices historically co-move and trading their divergences.
- **Market making** — posting bids and offers simultaneously to capture the spread, continuously updating quotes. Requires very low latency and is dominated by professional firms.
- **High-frequency trading (HFT)** — strategies operating on microsecond to millisecond timescales, co-located at exchanges to minimize latency. Not accessible to retail traders.
- **Event-driven** — trading on scheduled events (earnings releases, economic data) based on pre-defined rules. Some versions are accessible to retail.

### How retail traders build systematic strategies

The entry point is more accessible than most assume:

1. **Backtesting platforms** — tools like TradingView's Pine Script, Python with pandas/backtrader, or dedicated platforms allow non-engineers to test rules on historical data.
2. **Paper trading** — run the strategy live but with simulated money to verify that it behaves as the backtest suggested.
3. **Automated execution** — most major brokers offer APIs (Interactive Brokers, Alpaca, TD Ameritrade's thinkorswim) that allow a script to submit live orders.

The practical barrier for retail is not code — it is strategy: finding a rule set with a genuine edge that survives transaction costs and market changes.

### The critical pitfalls

- **Overfitting** — tuning a strategy's parameters to fit historical data perfectly, producing a backtest that looks excellent but fails on new data. The more parameters, the greater the risk.
- **Survivorship bias** — backtesting on the S&P 500's current constituents ignores companies that failed and were removed from the index, inflating apparent returns.
- **Execution slippage** — backtests assume fill at the signal price; in reality, orders fill slightly worse, especially for less liquid instruments.
- **Regime change** — a strategy that worked for 10 years may stop working when market structure changes (new regulation, new participants, macro shift).

### Why it matters for a trader

Even discretionary traders benefit from thinking systematically. Defining entry and exit rules precisely enough to backtest them forces clarity about what the actual edge is. If you cannot articulate your trading rules clearly enough for a computer to follow them, you may not have rules at all — only habits. The discipline of systematic thinking applies regardless of whether you ever write a line of code.
