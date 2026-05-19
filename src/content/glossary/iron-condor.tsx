import { Link } from 'react-router-dom';

/**
 * Glossary content: Iron Condor
 */
export default function IronCondorContent() {
  return (
    <>
      <p>
        An iron condor is a four-leg options strategy that profits when the
        underlying stock or index stays within a defined price range through
        expiration. You sell an out-of-the-money call and an out-of-the-money
        put simultaneously, then buy a further-out call and a further-out put
        to cap your maximum loss. The result is a position that collects a
        net credit up front and keeps it if the underlying doesn't wander
        outside the sold strikes.
      </p>

      <p>
        The "iron" in the name signals that both sides of the trade are
        credit spreads — a call credit spread (bear call spread) on the upside
        and a put credit spread (bull put spread) on the downside. This
        capping of the wings is what makes the risk defined. Unlike a naked
        strangle, the maximum loss on an iron condor is knowable in advance.
        You can't blow out your account on a gap overnight because the long
        wings absorb the worst of it.
      </p>

      <h2>The mechanics of a trade</h2>

      <p>
        Say SPY is trading at $560. You might sell the $575 call and buy the
        $580 call (bear call spread), and simultaneously sell the $545 put and
        buy the $540 put (bull put spread). If SPY closes anywhere between
        $545 and $575 at expiration, all four contracts expire worthless and
        you keep the entire credit. If SPY blasts above $580 or collapses
        below $540, you're at maximum loss — which is the spread width minus
        the credit collected.
      </p>

      <p>
        The math: if you collected $1.50 credit on both spreads ($3.00 total
        on a $5 wide iron condor), your maximum profit is $300 per contract.
        Your maximum loss is $500 minus $300 = $200 per side, or $200
        whichever wing gets tested. Profit zones, max loss, and breakeven
        prices are all visible at entry — that transparency is one reason
        professional premium sellers favor the structure.
      </p>

      <h2>When iron condors work — and when they don't</h2>

      <p>
        Iron condors are fundamentally a bet on low realized volatility.
        They work best when{' '}
        <Link to="/glossary/iv-rank" className="text-primary hover:underline">
          IV Rank
        </Link>{' '}
        is elevated (you collect richer premiums when you sell) and the
        underlying is in a quiet, range-bound period with no major catalysts
        on the horizon. Index products like SPY, QQQ, and IWM are the classic
        vehicle because indices move less violently than individual stocks
        and are less susceptible to overnight earnings gaps.
      </p>

      <p>
        They fail when the underlying makes a sustained directional move
        that pushes through one of the sold strikes. A trending market —
        the kind you see when macro data surprises significantly in one
        direction or when a major earnings event catalyzes sector rotation —
        is the natural enemy of the iron condor. The structure assumes the
        market won't pick a direction; when it does, you're wrong on
        both sides simultaneously because your delta exposure turns directional
        against you while your{' '}
        <Link to="/glossary/theta-decay" className="text-primary hover:underline">
          theta
        </Link>{' '}
        collection can't keep up.
      </p>

      <h2>Managing the trade</h2>

      <p>
        Most experienced condor traders don't hold to expiration. They set a
        profit target — typically 50% of maximum credit collected — and exit
        when the position reaches it. A 50% profit target, held across many
        trades, produces a win rate that mathematically overcomes the
        occasional full loss. Holding for the last few percentage points of
        credit exposes you to{' '}
        <Link to="/glossary/gamma-squeeze" className="text-primary hover:underline">
          gamma risk
        </Link>{' '}
        — near expiration, small moves can threaten the sold strikes much
        more violently than your theta collection can compensate for.
      </p>

      <p>
        When one side is challenged, you have options: take the loss and move
        on, roll the tested spread further out in time, or widen the
        untested side to bring in additional credit. None of these are
        automatically right — each depends on your market read and risk budget.
      </p>

      <h2>Finotaur's Options Suite</h2>

      <p>
        Finotaur's{' '}
        <Link to="/app/options" className="text-primary hover:underline">
          Options Suite
        </Link>{' '}
        shows the IV Rank for every potential condor candidate alongside the
        current price action, so you can evaluate whether the premium you'd
        collect is worth the risk at the current volatility level before
        committing to the structure.
      </p>
    </>
  );
}
