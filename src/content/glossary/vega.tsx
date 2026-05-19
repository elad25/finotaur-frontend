import { Link } from 'react-router-dom';

/**
 * Glossary content: Vega
 */
export default function VegaContent() {
  return (
    <>
      <p>
        Vega is the options Greek that measures sensitivity to changes in
        implied volatility. If an option has a vega of 0.10, the position
        gains $0.10 per contract for every one-percentage-point rise in
        implied volatility, and loses $0.10 for every one-point drop.
        Technically, vega isn't a Greek letter — it's a term traders adopted
        because the actual Greek letter nu (ν) was too easily confused in
        handwriting — but its role in the pricing model is just as real as
        delta or theta.
      </p>

      <p>
        Vega matters because implied volatility can move independently of the
        stock price. A stock can sit completely flat for a week while its
        options become dramatically more or less expensive depending on what
        IV does. Ignoring vega is how traders end up buying options before
        a catalyst, watching the stock move in their direction, and still
        losing money — because the "IV crush" that follows the catalyst
        destroyed more premium than the directional move created.
      </p>

      <h2>When vega is your friend vs. your enemy</h2>

      <p>
        Long options — whether calls or puts — have positive vega. When you
        buy an option, you want IV to rise. The option becomes worth more as
        the market prices in more uncertainty, even if the stock hasn't moved
        yet. This is the dominant dynamic in the days before earnings, FDA
        decisions, macro events, or other binary catalysts: IV climbs as the
        event approaches, and long option holders benefit.
      </p>

      <p>
        Short options — and any strategy where you're net short extrinsic value
        — have negative vega. You want IV to fall. Premium sellers collecting{' '}
        <Link to="/glossary/theta-decay" className="text-primary hover:underline">
          theta
        </Link>{' '}
        are also implicitly betting that implied volatility doesn't expand
        while they hold the position. An IV spike from 25% to 45% on a name
        where you're short a strangle can mean losses that dwarf months of
        theta collection.
      </p>

      <h2>Vega across strikes and expirations</h2>

      <p>
        Not all options have equal vega exposure. At-the-money options have
        the highest vega relative to their price — they're almost pure
        extrinsic value, and a change in IV has maximum impact on them.
        Deep in-the-money options have very little vega; their value is mostly
        intrinsic. Way out-of-the-money options have low absolute vega
        (cheap options don't move much in dollar terms) but can change
        dramatically in percentage terms during volatility spikes.
      </p>

      <p>
        Vega also scales with time to expiration. Longer-dated options have
        much higher vega than near-term options at the same strike. A
        LEAPS contract (one to two years out) is extremely sensitive to IV
        changes. A weekly option expiring in three days has negligible vega —{' '}
        <Link to="/glossary/theta-decay" className="text-primary hover:underline">
          theta
        </Link>{' '}
        dominates at that point. This creates a useful framework: if you want
        pure directional exposure with minimal IV sensitivity, short-dated
        options are more "clean." If you want to position on an IV expansion
        thesis, longer-dated options give you more vega bang per dollar.
      </p>

      <h2>Vega and IV Rank — the pairing that matters</h2>

      <p>
        The practical question vega raises is: what is IV likely to do from
        here? That's where{' '}
        <Link to="/glossary/iv-rank" className="text-primary hover:underline">
          IV Rank
        </Link>{' '}
        becomes the frame. If IV Rank is 90 — meaning current implied
        volatility is near its highest point of the past year — then being
        long vega is a bet against mean reversion. History says IV contracts
        more often than it expands from those levels. Conversely, at IV Rank
        10, buying options is cheap, vega is working with you, and if IV
        even returns to average levels the options become significantly more
        valuable.
      </p>

      <p>
        Understanding your vega exposure isn't just about hedging — it's
        about knowing what bet you're actually making. Every options position
        carries an implicit view on volatility, whether you articulated that
        view or not.
      </p>

      <h2>Finotaur's Options Suite</h2>

      <p>
        Finotaur's{' '}
        <Link to="/app/options" className="text-primary hover:underline">
          Options Suite
        </Link>{' '}
        shows vega, delta, and theta for every strike alongside the current
        IV Rank — so you can see the full Greek picture before entering a
        position, not just the directional delta you instinctively focus on.
      </p>
    </>
  );
}
