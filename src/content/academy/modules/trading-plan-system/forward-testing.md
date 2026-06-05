## In plain words

**Forward testing** — also called **paper trading** — is trading your system in real market conditions but with simulated money. Unlike backtesting, which uses historical data, forward testing unfolds in live time: real prices, real news events, real market noise. It is the critical bridge between "this worked on historical charts" and "I am confident enough to risk real capital." Skipping it is one of the most expensive shortcuts a new trader can take.

## Quick demo

After backtesting a futures scalping strategy on one year of historical data, a trader opens a paper-trading account through his broker's platform. For six weeks, he trades the strategy every morning exactly as his plan describes — same entry triggers, same stops, same position sizes — but with simulated funds. Week one feels easy; week three hits a four-day losing streak that his backtest said was possible but that feels very different in real time. By week six he has 60 live trades logged, his results are close to the backtest expectancy, and he understands emotionally what the strategy demands. He moves to live capital with realistic expectations.

## Full explanation

### Why forward testing is not optional

A backtest tells you how a strategy behaved on data you already know. Forward testing tells you whether you can actually execute it — in real time, with incomplete information, against a market that is actively trying to trigger your worst instincts.

The two failure modes a backtest cannot catch:

- **Execution failure** — your entry trigger fires during a fast-moving candle and you get filled worse than expected. Stops trigger at prices that look clean on historical data but slip in live conditions. These costs are real and vary by instrument and session.
- **Psychological failure** — you know, intellectually, that a losing streak of six consecutive trades is within normal statistical range for your system. Experiencing it in real time, watching your simulated balance drop, feels completely different. Many traders deviate from their rules during a losing streak — and the forward test is where you discover whether you are one of them, at a cost of zero.

### How to forward test properly

Paper trading only produces useful data if you treat it as real. That means:

- **Follow every rule in your plan** — no "I would have taken that one" hindsight additions, no skipping a stop because it's simulated.
- **Record every trade** in your journal exactly as you would with real money.
- **Trade the same session and size** as you plan to trade live — if you plan to trade two contracts, paper-trade two contracts. Scaling up dramatically in paper trading inflates confidence.
- **Run for a meaningful duration** — a minimum of 30–50 trades, or one to two months. Short samples are dominated by luck.

### What to look for

After your forward test period, compare your results to the backtest:

- Is your win rate close to the backtested win rate? (±10% is normal variance; large gaps suggest execution problems or a changed market regime.)
- Is your average win-to-loss ratio close to expectations?
- Did you follow all your rules, or did you deviate? Which rules were hardest to follow?
- What were the conditions when you were most tempted to break the rules?

The deviations are as important as the performance numbers. If you consistently exit early on winning trades, your plan may need a different exit mechanism — or you need more deliberate work on following the plan before going live.

### Transitioning to live capital

Move to real money only when all three conditions are met:

1. Your forward-test expectancy is positive and reasonably close to the backtest
2. You followed your plan's rules consistently (not perfectly — but consistently)
3. You have experienced a realistic losing streak and stayed with the system

Start with smaller size than you plan to trade long-term. The psychology of real money differs from paper trading regardless of preparation — reduced size gives you room to adapt without catastrophic damage if your behavior changes under pressure.

Forward testing is where a strategy becomes a skill. Backtesting proves the idea; forward testing proves the trader.
