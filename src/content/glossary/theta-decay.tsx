import { Link } from 'react-router-dom';

/**
 * Glossary content: Theta Decay
 */
export default function ThetaDecayContent() {
  return (
    <>
      <p>
        Theta is the options Greek that measures time decay — how much an
        option's value erodes with each passing day, all else equal. If you
        own a call with a theta of -0.05, you're losing roughly $5 per
        contract per day to time decay alone, independent of what the stock
        does. Options are wasting assets. The clock is always running, and
        theta is the rate at which the clock is costing you money.
      </p>

      <p>
        Sellers collect theta. Buyers pay it. This is the fundamental
        asymmetry of options: when you buy an option, time is your enemy;
        when you sell one, time is your ally. Neither side is inherently
        better — they're different risk profiles — but understanding which
        side you're on, and how fast you're winning or losing to the clock,
        is non-negotiable if you want to trade options seriously.
      </p>

      <h2>The acceleration that catches buyers off guard</h2>

      <p>
        Theta is not linear. It doesn't decay at a steady 5% per week for
        the life of the option. The decay accelerates as expiration approaches,
        following roughly a square-root function of time. An option with 90
        days to expiration loses much less time value per day than the same
        option with 10 days left. The last 30 days, and especially the last
        week, is where theta consumption becomes brutal for buyers.
      </p>

      <p>
        This creates a trap that catches a lot of newer options traders. You
        buy a call, you're right about direction, the stock moves in your
        favor — and you still lose money because the theta you paid over a
        week swamped the directional gain. The option needed to move faster,
        or further, or both, just to break even against the time you held it.
        "Right on direction, wrong on timing" is almost always a theta story.
      </p>

      <h2>Theta vs implied volatility — they interact</h2>

      <p>
        Theta and{' '}
        <Link to="/glossary/vega" className="text-primary hover:underline">
          vega
        </Link>{' '}
        pull in different directions. Options with high implied volatility
        have high extrinsic value — which means they also have higher theta,
        because there's more time premium to decay away. When you sell a
        high-IV option specifically to collect theta, you're simultaneously
        taking on vega risk: if IV expands further while you're short the
        option, your position loses even as theta works in your favor.
      </p>

      <p>
        This is why{' '}
        <Link to="/glossary/iv-rank" className="text-primary hover:underline">
          IV Rank
        </Link>{' '}
        matters when choosing a premium-selling strategy. Selling theta when
        IV Rank is elevated (above 50) means you're collecting richer premium
        and the vega wind is more likely to be at your back as IV eventually
        mean-reverts. Selling theta when IV is already depressed means you
        collect a thin premium while sitting exposed to a potential IV spike
        that can overwhelm weeks of theta collection in a single day.
      </p>

      <h2>Practical strategies built around theta collection</h2>

      <p>
        The strategies explicitly designed to harvest theta are the ones where
        you're net short extrinsic value: covered calls, cash-secured puts,
        credit spreads, iron condors, and short straddles or strangles. Each
        of these trades has a different risk profile and capital requirement,
        but they all share the same core thesis — time passing without a large
        move is profitable.
      </p>

      <p>
        The tradeoff is that theta-collecting positions are typically short
        gamma, meaning large, fast moves are painful. You're essentially
        getting paid to bet that the stock doesn't do something dramatic. When
        that bet is right, you collect steady, predictable income. When a
        stock gaps 15% overnight on earnings or unexpected news, the theta
        you've collected over weeks can evaporate instantly.
      </p>

      <h2>Finotaur's Options Suite</h2>

      <p>
        Finotaur's{' '}
        <Link to="/app/options" className="text-primary hover:underline">
          Options Suite
        </Link>{' '}
        shows you theta in context — alongside IV Rank, days to expiration,
        and the options flow in that name. Knowing how much theta you're
        collecting per day is only useful when you also know whether the IV
        environment actually supports selling premium right now.
      </p>
    </>
  );
}
