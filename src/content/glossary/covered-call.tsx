import { Link } from 'react-router-dom';

/**
 * Glossary content: Covered Call
 */
export default function CoveredCallContent() {
  return (
    <>
      <p>
        A covered call is selling a call option against 100 shares you already
        own. You receive premium upfront in exchange for capping your upside at
        the strike price you sold. If the stock closes below the strike at
        expiration, the option expires worthless and you keep the premium as
        income. If the stock closes above the strike, your shares get called
        away at that price — you still made money, just not as much as you
        would have if you'd held the stock outright.
      </p>

      <p>
        It's the most widely used options strategy for a reason: it's
        straightforward, it generates real cash flow, and the risk profile
        is intuitive. You already own the stock. The worst that can happen is
        you sell it at a price you were willing to accept when you picked the
        strike. The best that can happen is the option expires worthless and
        you repeat the process next month.
      </p>

      <h2>The tradeoff you're actually making</h2>

      <p>
        Every covered call is a choice to exchange upside potential for
        immediate income. When you sell a call 5% out of the money, you're
        saying: "I'm willing to sell my shares at a 5% gain. In exchange,
        give me the premium now." If the stock runs 20%, you've capped
        yourself at 5% plus the premium. That can feel like a loss even
        though you made money — the cost of the strategy is measured in
        opportunity, not cash.
      </p>

      <p>
        This is why covered calls work best in specific market conditions:
        when you expect the stock to move sideways to modestly higher, or when
        you want to systematically lower your cost basis over time on a
        position you intend to hold long-term regardless. They work poorly on
        your highest-conviction, highest-growth positions — if you sell covered
        calls on NVDA and it doubles, the premium you collected is irrelevant.
      </p>

      <h2>Strike selection and the IV Rank question</h2>

      <p>
        Strike selection is where most of the strategy lives. A call sold at
        the money collects the most premium but puts you at maximum risk of
        assignment on any small uptick. A call sold 10-15% out of the money
        gives your position room to grow but collects less premium per cycle.
        Most retail traders land somewhere in the 3-7% OTM range — enough
        premium to be meaningful, enough buffer to absorb typical weekly
        volatility.
      </p>

      <p>
        The{' '}
        <Link to="/glossary/iv-rank" className="text-primary hover:underline">
          IV Rank
        </Link>{' '}
        of the underlying matters enormously here. When IV Rank is high —
        meaning options are expensive relative to the stock's own history —
        the same strike generates significantly more premium than when IV is
        depressed. Running covered calls on positions during high-IV periods
        is one of the most reliable ways to increase total return on a
        long-term hold.{' '}
        <Link to="/glossary/theta-decay" className="text-primary hover:underline">
          Theta decay
        </Link>{' '}
        works fastest on short-dated contracts, which is why many covered
        call sellers target expirations 3-6 weeks out where the theta-to-
        premium ratio is most favorable.
      </p>

      <h2>Assignment and how to avoid accidental selling</h2>

      <p>
        Early assignment on American-style options is rare but possible. If
        your stock pays a dividend and the call you sold is deep in the money,
        the call buyer might exercise early to capture the dividend. If you
        don't want to be assigned, buy the call back before it moves
        significantly into the money — don't wait until expiration and hope.
        The cost to close an in-the-money call a week before expiration is
        usually small relative to the premium you'd lose from assignment at
        the wrong time.
      </p>

      <p>
        The other practical point: covered calls on individual stocks carry
        earnings risk. A stock that reports earnings during your holding
        period can gap dramatically in either direction. Either buy back the
        call before earnings if you want the upside, or accept that if the
        stock gaps up you'll be called away at your strike regardless of
        how far it moves.
      </p>

      <h2>Finotaur's Options Suite</h2>

      <p>
        Finotaur's{' '}
        <Link to="/app/options" className="text-primary hover:underline">
          Options Suite
        </Link>{' '}
        surfaces IV Rank and{' '}
        <Link to="/glossary/options-flow" className="text-primary hover:underline">
          options flow
        </Link>{' '}
        for the stocks you hold, so you can time covered call sales for when
        premium is richest and gauge whether institutional positioning is
        pointing toward the kind of sustained move that would make selling
        upside particularly costly.
      </p>
    </>
  );
}
