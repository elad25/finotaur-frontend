import { Link } from 'react-router-dom';

/**
 * Glossary content: Golden Cross
 */
export default function GoldenCrossContent() {
  return (
    <>
      <p>
        A golden cross occurs when a stock's 50-day moving average crosses
        above its 200-day moving average. It's one of the oldest signals in
        technical analysis — a long-term trend confirmation that the
        intermediate-term momentum has shifted bullish relative to the
        longer-term baseline. When a stock that's been in a downtrend or
        consolidation starts printing higher, the 50-day eventually catches
        up to and surpasses the 200-day, and the crossover is marked as the
        official signal.
      </p>

      <p>
        The S&P 500 has produced golden crosses several times in the past
        decade, typically after major corrections: after the COVID crash in
        mid-2020, after the late-2018 correction, and following the
        2022-2023 bear market lows. In each case, the golden cross didn't
        mark the exact bottom — it came weeks to months after the low —
        but it confirmed that the trend had durably reversed rather than
        just bounced.
      </p>

      <h2>What the signal actually tells you</h2>

      <p>
        A golden cross is a lagging indicator by definition. Moving averages
        follow price — they can only cross after the underlying price has
        already moved enough to pull the faster average up through the slower
        one. You will never buy the bottom with a golden cross signal. What
        you get instead is confirmation: the trend has been up for long enough,
        and consistently enough, that the averages have realigned. That
        reduces false positives compared to shorter-term signals.
      </p>

      <p>
        The flip side: because it lags, you're often entering a position after
        a stock has already run 15-30% from its low. Whether that entry
        makes sense depends entirely on where you think the stock is headed
        from here, not where it was when it was cheaper. The golden cross
        answers "has the trend changed?" not "is this a good price to buy?"
      </p>

      <h2>Where golden crosses produce reliable signals vs. where they fail</h2>

      <p>
        Golden crosses work best on indices and sector ETFs over multi-month
        horizons, where the 50/200 MA relationship maps onto genuine
        business-cycle dynamics. They're used extensively by systematic
        trend-following funds — the reason the signal persists in backtests is
        partly because so many institutions act on it, creating a
        self-fulfilling element.
      </p>

      <p>
        On individual stocks, the signal is nosier. A stock recovering from
        a bad earnings quarter can produce a golden cross off a low base that
        means relatively little — the "trend" in the averages reflects an
        anomaly, not a structural change. Look for golden crosses on stocks
        where the fundamentals have also improved, not just the chart. And
        watch the volume during the crossover: a golden cross on expanding
        volume is more credible than one on thin, sideways trading.
      </p>

      <h2>The relationship to sector rotation</h2>

      <p>
        Golden crosses at the sector level are particularly useful because
        they often coincide with{' '}
        <Link to="/glossary/sector-rotation" className="text-primary hover:underline">
          sector rotation
        </Link>{' '}
        inflection points. When the technology sector ETF (XLK) prints a
        golden cross after a drawdown, it frequently signals that
        growth-oriented capital is returning to the sector. When defensive
        sectors like utilities (XLU) form golden crosses while the broad
        index is still in a downtrend, it's a warning about macro regime
        change — capital is rotating to safety.
      </p>

      <p>
        The inverse signal is the{' '}
        <Link to="/glossary/death-cross" className="text-primary hover:underline">
          death cross
        </Link>
        , where the 50-day crosses <em>below</em> the 200-day. In strong
        uptrends, death crosses on individual stocks or indices often produce
        false signals and are quickly reversed. But in genuine bear markets,
        the death cross on the broad indices has historically been a reliable
        warning of extended downside ahead.
      </p>

      <h2>Where to track it</h2>

      <p>
        Finotaur's{' '}
        <Link to="/app/stocks/overview" className="text-primary hover:underline">
          Stock Analyzer
        </Link>{' '}
        overlays the 50-day and 200-day moving averages alongside price
        action, making golden cross and death cross events visible at a glance
        without manual calculation.
      </p>
    </>
  );
}
