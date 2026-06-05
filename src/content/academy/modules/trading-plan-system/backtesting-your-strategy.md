## In plain words

**Backtesting** is the process of applying your trading rules to historical price data to see how the strategy would have performed in the past. It answers the question "does this edge actually exist?" before you risk real money. A backtest can disprove a bad strategy in an afternoon; without one, a bad strategy can cost months of losses before the truth becomes undeniable. Every professional trading system is backtested before it goes live.

## Quick demo

A trader believes that buying S&P 500 futures every time the RSI drops below 30 on a daily chart is profitable. He opens historical data going back five years and manually marks every instance where that condition occurred — 34 setups. He records the entry price, his planned stop, and what happened at his 2R target. Result: 21 of 34 won, giving a 62% win rate and a positive expectancy of 0.82R per trade. He now has evidence. Without the backtest, he had only a hunch that felt compelling.

## Full explanation

### What backtesting actually proves

A backtest proves one thing: the strategy had a positive (or negative) expectancy on the historical data you tested. It does not guarantee future results. Markets change. What worked in a trending bull market may fail in a choppy, low-volatility environment. This is not a reason to skip backtesting — it is a reason to do it rigorously and interpret results carefully.

### Manual vs. automated backtesting

- **Manual backtesting** means scrolling through historical charts and recording each trade outcome by hand. It is slow but forces you to see the market conditions behind each trade — which builds intuition and reveals patterns automated tools miss.
- **Automated backtesting** uses software to apply coded rules to data at scale. It is fast and eliminates subjectivity, but requires rules that can be expressed precisely in code. Ambiguous rules that rely on visual judgment cannot be automated.

Both approaches are valid. Most traders start manual and move to automation as their systems become more precisely defined.

### The data you need

- **Duration** — test across multiple years, ideally covering different market regimes: bull markets, bear markets, and sideways periods.
- **Sample size** — a minimum of 50–100 trades is needed for statistical significance. Fewer and the results may be noise.
- **Out-of-sample data** — split your historical data. Develop the strategy on one portion (in-sample) and test it on a period you never looked at during development (out-of-sample). If it works on both, the edge is more likely real.

### Common backtesting mistakes

**Overfitting (curve-fitting)** — tuning parameters (moving average lengths, RSI thresholds) until the strategy looks perfect on historical data. Overfitted strategies perform beautifully in the past and fail in live trading. A robust strategy works across a wide range of parameter values, not just one optimized setting.

**Survivorship bias** — testing only on assets that exist today. Stocks that went bankrupt or were delisted years ago are often missing from data sources. This inflates results because you are only testing on "winners" that survived.

**Ignoring costs** — every trade has bid-ask spread and commissions. A strategy that shows a 0.3R average win before costs may be a loser after costs. Always include realistic transaction costs in the analysis.

**Look-ahead bias** — accidentally using information that would not have been available at the time of the trade. A common example: entering on the closing price of a candle that your rule depends on. You cannot know the closing price until the candle closes.

### What to record

For each trade in your backtest:
- Date and instrument
- Entry price and entry conditions met
- Stop level and target level
- Exit price and reason (stop hit, target hit, or manual exit)
- Outcome in R-multiples

From these records you calculate win rate, average win, average loss, expectancy, maximum consecutive losses, and maximum drawdown. These numbers tell you whether the strategy is worth trading and what the emotional demands of trading it will be.

Backtesting is not a guarantee — it is the first layer of evidence. A strategy that cannot survive a backtest should not see real money. A strategy that does survive one has earned the right to be tested further.
