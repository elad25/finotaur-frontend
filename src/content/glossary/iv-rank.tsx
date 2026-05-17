import { Link } from 'react-router-dom';

/**
 * Glossary content: IV Rank
 */
export default function IvRankContent() {
  return (
    <>
      <p>
        IV Rank tells you where a stock's current implied volatility sits
        relative to its own range over the past year. If TSLA's IV Rank is 80,
        that means current IV is higher than 80% of the readings from the
        past 12 months. If it's 15, current IV is unusually cheap by the
        stock's own historical standard.
      </p>

      <p>
        The point is context. An absolute IV reading of 45% is meaningless on
        its own — that's expensive for KO and dirt cheap for GME. IV Rank
        normalizes it. You can compare options "expensiveness" across the
        entire market on the same scale, which is the only way to know whether
        you should be selling premium or buying it.
      </p>

      <h2>The rule of thumb most traders use</h2>

      <p>
        Above IV Rank 50 — premiums are rich, lean toward selling (credit
        spreads, iron condors, cash-secured puts). Below IV Rank 30 — premiums
        are cheap, lean toward buying (debit spreads, long calls or puts,
        diagonals). It's not law. It's a starting bias that gets refined by
        whatever directional read you have, earnings proximity, and how the
        IV got to where it is.
      </p>

      <p>
        That last part is the one people skip. IV Rank of 90 going into
        earnings is normal and will collapse the day after — that's not a
        premium-selling opportunity, that's just{' '}
        <em>buying the IV crush trade</em> from the wrong side. IV Rank of 90
        with no catalyst is genuinely elevated and worth selling. The number
        is the same; the trade is opposite.
      </p>

      <h2>IV Rank vs IV Percentile</h2>

      <p>
        Close cousins, often confused. IV Rank looks at the high-low range
        over the lookback period — <code>(current IV - 52w low) / (52w high - 52w low)</code>.
        IV Percentile counts what fraction of days were below current IV. Rank
        is more sensitive to outliers (one volatility spike can dominate the
        range); Percentile is more stable. I default to Rank for fast reads
        and check Percentile when Rank looks off.
      </p>

      <h2>Where to track it</h2>

      <p>
        Finotaur's{' '}
        <Link to="/app/options/iv-rank" className="text-primary hover:underline">
          IV Rank screener
        </Link>{' '}
        gives you both metrics side-by-side, plus the chart of the past year
        so you can see how IV got to its current level before committing
        capital. Pair it with{' '}
        <Link to="/glossary/options-flow" className="text-primary hover:underline">
          options flow
        </Link>{' '}
        to see whether the elevated IV is being bought or sold by the people
        moving the most premium.
      </p>
    </>
  );
}
