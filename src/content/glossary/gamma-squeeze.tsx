import { Link } from 'react-router-dom';

/**
 * Glossary content: Gamma Squeeze
 */
export default function GammaSqueezeContent() {
  return (
    <>
      <p>
        A gamma squeeze happens when a stock rises sharply and forces options
        market-makers to buy the underlying shares to stay delta-neutral —
        which drives the price up further, which forces more buying, which
        drives the price up more. It's a mechanical feedback loop baked into
        how options market-making works, and when the conditions are right it
        can produce moves that look insane but are actually completely
        explainable if you understand the plumbing.
      </p>

      <p>
        The most famous example: GME in January 2021. Going into that week,
        GME had massive short interest north of 100% of its float and an
        unusually large amount of open interest in out-of-the-money call
        options. As retail buying pushed the stock up, market-makers who had
        sold those calls needed to delta-hedge by buying shares. That buying
        pushed the stock higher, which pushed those OTM calls deeper
        in-the-money, which raised their delta, which required market-makers
        to buy even more shares. AMC went through a nearly identical squeeze
        a few months later. The gamma loop was doing most of the lifting.
      </p>

      <h2>How gamma works in options math</h2>

      <p>
        Delta measures how much an option's value changes for a $1 move in
        the underlying. Gamma measures how fast delta changes as the stock
        moves. At-the-money options near expiration have the highest gamma —
        a small stock move can flip their delta dramatically, and market-makers
        holding short positions in those contracts are forced to constantly
        re-hedge.
      </p>

      <p>
        When a stock is climbing and market-makers are short a lot of calls,
        they're in a structurally painful position. Rising stock price =
        rising deltas = they need more shares to hedge = their buying adds to
        the upward pressure. This is what traders mean by "short gamma." The
        market-maker is on the wrong side of convexity. Retail traders sitting
        long calls or long stock are effectively long gamma — they benefit
        nonlinearly from the move.
      </p>

      <h2>What sets up a gamma squeeze</h2>

      <p>
        Three ingredients tend to cluster before a squeeze: a heavily shorted
        float that creates a mechanical ceiling on shares available to
        borrow, unusual call buying activity concentrated near the current
        price in short-dated expirations, and a catalyst that attracts retail
        attention fast enough to overwhelm the normal liquidity in the options
        market. You need all three. High short interest alone doesn't cause
        gamma squeezes — it's the options open interest concentration that
        drives the mechanical buying.
      </p>

      <p>
        The short-dated expiration piece matters more than people realize.
        Gamma is dramatically higher on contracts expiring in days vs. weeks.
        A stock with heavy 0DTE or weekly call open interest concentrated just
        above the current price is sitting on a powder keg — a few percent move
        can shift those strikes from out-of-the-money to in-the-money and
        force a wave of delta-hedging buys simultaneously.
      </p>

      <h2>How to trade around a gamma squeeze</h2>

      <p>
        The traders who profited most in the GME squeeze weren't the ones
        buying at the top of the loop — they were the ones who recognized the
        setup before the squeeze started. The signal is in the{' '}
        <Link to="/glossary/options-flow" className="text-primary hover:underline">
          options flow
        </Link>
        : a surge of call buying concentrated at just-OTM strikes in the
        nearest expiration, especially if the stock also has high{' '}
        <Link to="/glossary/short-interest" className="text-primary hover:underline">
          short interest
        </Link>
        . That combination means market-makers are accumulating short gamma
        exposure, and any sustained buying pressure turns into jet fuel.
      </p>

      <p>
        What kills a gamma squeeze is time. As contracts expire or the stock
        reverses below the contested strike prices, the delta-hedging
        requirement collapses. Market-makers who were buying to hedge start
        selling. The same mechanism that accelerated the move up can
        accelerate the reversal. Squeezes are violent in both directions, which
        is why chasing them late is genuinely dangerous.
      </p>

      <h2>Where to spot gamma squeeze setups</h2>

      <p>
        Finotaur's{' '}
        <Link to="/app/options/flow" className="text-primary hover:underline">
          Options Flow Scanner
        </Link>{' '}
        surfaces unusual call buying activity in real time — the early signal
        before the mechanical buying cascade starts. Filter for sweep orders
        on short-dated OTM calls with premium thresholds above normal for the
        name, and pair that read with the stock's short interest data to assess
        whether the fuel is there.
      </p>
    </>
  );
}
