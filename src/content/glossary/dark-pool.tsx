import { Link } from 'react-router-dom';

/**
 * Glossary content: Dark Pool
 */
export default function DarkPoolContent() {
  return (
    <>
      <p>
        A dark pool is a private exchange where large orders get matched without
        showing up on the public order book until after the trade prints. The
        name sounds shadier than the reality. Pension funds, mutual funds, and
        institutional desks use them every day because executing a 2-million-share
        block on a lit exchange would tank the price before the order completed.
        Dark pools let them get filled without telegraphing intent.
      </p>

      <p>
        Roughly 40-50% of US equity volume now runs through dark pools and
        other off-exchange venues. That's not a niche — it's half the market.
        And it means that if you only watch what's happening on the NYSE and
        Nasdaq order books, you're missing where most of the real positioning
        actually happens.
      </p>

      <h2>Why retail should care</h2>

      <p>
        Dark pool prints are reported with a delay, but they <em>are</em>{' '}
        reported. The FINRA Trade Reporting Facility publishes them. The trick
        is interpretation. A $50M dark pool print at the bid on a small-cap
        with no news is a meaningful signal — someone with size is offloading.
        The same print on a mega-cap during an index rebalance window is
        probably mechanical and tells you nothing.
      </p>

      <p>
        I've learned to weight prints by three factors: size relative to the
        stock's average daily volume, the print's location vs. the bid-ask at
        the time it was reported, and clustering. One $20M block is suggestive.
        Five $20M blocks in the same direction across two trading days is a
        position being built.
      </p>

      <h2>What it does not tell you</h2>

      <p>
        Direction is genuinely hard to infer. A dark pool print at the midpoint
        could be either side. Even prints at the bid or ask can be misread —
        market makers route through dark pools constantly as part of normal
        hedging. The signal exists, but it's noisier than{' '}
        <Link to="/glossary/options-flow" className="text-primary hover:underline">
          options flow
        </Link>
        , where the contract itself encodes direction (calls vs puts) and
        leverage.
      </p>

      <h2>Where to track it</h2>

      <p>
        Finotaur's{' '}
        Dark Pool Scanner{' '}
        ranks prints by size relative to the stock's typical book, flags
        clustering across multiple days, and lets you watch specific tickers
        without drowning in the noise from index-level rebalancing flows.
      </p>
    </>
  );
}
