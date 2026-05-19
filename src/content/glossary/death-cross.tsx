import { Link } from 'react-router-dom';

/**
 * Glossary content: Death Cross
 */
export default function DeathCrossContent() {
  return (
    <>
      <p>
        A death cross occurs when a stock's 50-day moving average crosses
        below its 200-day moving average. It's the bearish counterpart to the{' '}
        <Link to="/glossary/golden-cross" className="text-primary hover:underline">
          golden cross
        </Link>
        , and carries the same fundamental interpretation: the
        intermediate-term trend has deteriorated enough relative to the
        longer-term baseline that the two averages have inverted. The 50-day,
        which tracks the last two months of trading, is now below the 200-day,
        which tracks the last year. Momentum has turned structurally negative.
      </p>

      <p>
        The S&P 500 formed a death cross in March 2020 — about two weeks
        before the exact bottom. It formed again in December 2022 near the
        lows of that bear market. Both times, a trader who acted on the signal
        alone would have sold into weakness and missed the recovery. This is
        the central tension with death crosses: they're accurate in trend
        markets, treacherous at turning points.
      </p>

      <h2>When death crosses are reliable warnings</h2>

      <p>
        The death cross has a genuine track record during secular bear markets
        and prolonged downtrends. The 2000-2002 dot-com bear, the 2008-2009
        financial crisis, and the 2022 rate-hike-driven bear all featured
        death crosses on the S&P 500 that correctly preceded extended
        downside. In these environments, the signal functions as intended:
        the trend is broken, the averages confirm it, and waiting for the
        golden cross to re-establish before re-entering preserved capital
        over months of further drawdown.
      </p>

      <p>
        The death cross is more reliable when it's accompanied by other
        confirming signals: expanding volume on down days, the broad market
        making lower highs and lower lows structurally, and{' '}
        <Link to="/glossary/sector-rotation" className="text-primary hover:underline">
          sector rotation
        </Link>{' '}
        into defensives (utilities, consumer staples, healthcare) while
        growth sectors lag. When these factors align, the death cross is
        marking a real regime change, not just a temporary pullback.
      </p>

      <h2>When death crosses produce false signals</h2>

      <p>
        In any strong uptrend interrupted by a sharp, fast correction, death
        crosses are notoriously unreliable. The 2018 Q4 sell-off produced a
        death cross on the S&P 500 right before a violent recovery. The
        COVID crash produced one two weeks before one of the strongest
        V-shaped recoveries in market history. In these cases, the sell-off
        was fast enough to drag the 50-day below the 200-day, but the
        underlying bull market was intact — and the death cross was purely
        a lagging artifact of the speed of the decline.
      </p>

      <p>
        On individual stocks, the false signal rate is even higher. A stock
        that has a bad quarter and drops 25% quickly can print a death cross
        even if the business is fundamentally sound and the stock is simply
        mean-reverting. Using the death cross as a sell trigger on a stock
        you have fundamental conviction in is a category error — it's a trend
        tool, not a fundamental tool.
      </p>

      <h2>Combining the death cross with other context</h2>

      <p>
        The traders who use moving average crossovers most effectively treat
        them as tiebreakers, not primary signals. If you already have a
        bearish fundamental view on a stock or macro environment, the death
        cross confirms that price action is aligning with your thesis and
        provides a timing reference. If you have no directional view, using
        the death cross alone for entry/exit decisions will produce mediocre
        results over a full cycle.
      </p>

      <p>
        Short interest levels are worth checking alongside a death cross.
        A stock with an active death cross and already elevated{' '}
        <Link to="/glossary/short-interest" className="text-primary hover:underline">
          short interest
        </Link>{' '}
        has a crowded bearish trade — if the stock starts recovering, the
        short squeeze potential can overwhelm the technical signal rapidly.
      </p>

      <h2>Where to track it</h2>

      <p>
        Finotaur's{' '}
        <Link to="/app/stocks" className="text-primary hover:underline">
          Stock Analyzer
        </Link>{' '}
        plots the 50-day and 200-day moving averages with historical crossover
        markers, so you can see both the current signal and how past crossovers
        resolved on the same chart — context that's missing when you only
        look at the current chart.
      </p>
    </>
  );
}
