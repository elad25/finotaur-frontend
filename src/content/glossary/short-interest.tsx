import { Link } from 'react-router-dom';

/**
 * Glossary content: Short Interest
 */
export default function ShortInterestContent() {
  return (
    <>
      <p>
        Short interest is the total number of shares currently sold short
        and not yet covered, typically expressed as a percentage of a stock's
        float (the shares actually available to trade). If a company has 100
        million shares in its float and 20 million are currently short, short
        interest is 20%. That number tells you something specific: one in five
        shares in circulation has been borrowed and sold by someone betting
        the price goes down.
      </p>

      <p>
        FINRA requires brokerage firms to report short positions to exchanges
        twice a month — as of mid-month and end-of-month — and the data is
        published with roughly a two-week lag. This is one of the frustrations
        with using short interest as a signal: you're always working with data
        that's at least a few weeks old. A stock can squeeze violently before
        the next official short interest report even confirms the crowded trade.
      </p>

      <h2>What high short interest actually signals</h2>

      <p>
        High short interest — typically defined as above 15-20% of float —
        is a double-edged signal. On one hand, sophisticated investors have
        done the work to identify this stock as overvalued, fraudulent,
        fundamentally broken, or simply priced for perfection in a way the
        business can't justify. Professional short sellers aren't casually
        placing bets; the cost to borrow and hold a short position is real,
        so elevated short interest usually reflects genuine conviction on the
        bear side.
      </p>

      <p>
        On the other hand, that same crowded short trade is fuel. If buying
        pressure emerges — whether from fundamental re-rating, a short-term
        catalyst, or coordinated retail activity — short sellers are forced
        to cover (buy shares to close their positions). That mechanical buying
        can accelerate a move dramatically. The most violent upside moves in
        markets often happen on heavily shorted stocks. GME, AMC, BBBY, and
        numerous other names in 2021 became extreme examples of what happens
        when short interest collides with a catalyst and a wave of call buying
        that triggers a{' '}
        <Link to="/glossary/gamma-squeeze" className="text-primary hover:underline">
          gamma squeeze
        </Link>{' '}
        on top of the short squeeze.
      </p>

      <h2>Short interest ratio — the "days to cover" metric</h2>

      <p>
        Short interest percentage alone doesn't tell the whole story. A 20%
        short interest in a stock that trades 5 million shares a day is very
        different from 20% short interest in a stock that trades 100,000
        shares a day. The "days to cover" ratio (short interest divided by
        average daily volume) measures how many days of normal trading it
        would take for all short sellers to buy back their positions. A days-
        to-cover above 10 is considered very high — it means shorts are
        deeply trapped in a thin name. Even a moderate increase in buying
        pressure can trigger a covering cascade.
      </p>

      <h2>Short interest and the death cross — a combination to watch</h2>

      <p>
        Some of the most reliable bearish setups combine two things: a stock
        that just formed a{' '}
        <Link to="/glossary/death-cross" className="text-primary hover:underline">
          death cross
        </Link>{' '}
        on its chart (confirming technical trend breakdown) with short interest
        that has been <em>declining</em> — meaning bears have been taking
        profits. That combination suggests a trend break that doesn't have
        an overcrowded short trade to fuel a snap-back squeeze. Some of the
        cleanest downtrends in individual stocks follow this pattern.
      </p>

      <p>
        Conversely, a stock with a death cross on the chart but rising short
        interest approaching extreme levels is a candidate for a violent
        reversal, not a clean short. The bears are piling in late, and that
        is typically when the pain trade is a squeeze rather than continued
        capitulation.
      </p>

      <h2>How to use it practically</h2>

      <p>
        Short interest is most useful as a filter, not a standalone signal.
        Screeners that surface stocks with high short interest,{' '}
        <Link to="/glossary/options-flow" className="text-primary hover:underline">
          unusual options activity
        </Link>{' '}
        in calls, and a stock price near a technical breakout level give
        you the setup for a potential squeeze before it starts. The options
        flow piece is the leading indicator — it tells you whether smart money
        is positioning for the squeeze before the price confirms it.
      </p>

      <h2>Where to track it</h2>

      <p>
        Finotaur's{' '}
        <Link to="/app/stocks" className="text-primary hover:underline">
          Stock Analyzer
        </Link>{' '}
        surfaces short interest data alongside price action and technical
        indicators, so you can evaluate the squeeze potential of any name
        without piecing together data from multiple sources.
      </p>
    </>
  );
}
