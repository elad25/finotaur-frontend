import { Link } from 'react-router-dom';

/**
 * Glossary content: Payment for Order Flow (PFOF)
 */
export default function PaymentForOrderFlowContent() {
  return (
    <>
      <p>
        Payment for order flow (PFOF) is the practice of retail brokerages
        routing customer orders to specific market-makers in exchange for
        payment. Robinhood, Webull, TD Ameritrade (before its Schwab merger),
        and most retail-facing brokerages participate in some form of PFOF.
        For every buy or sell order you place, the broker receives a small
        per-share payment from the market-maker who fills it. This is the
        primary revenue source for "commission-free" trading — the commission
        didn't disappear, it moved to a different line of the income statement.
      </p>

      <p>
        The market-maker on the other side profits by executing your order at
        a slightly worse price than the best available quote in the market,
        and pocketing the spread difference. The difference between the price
        you received and the best possible price is called "price improvement"
        (or lack thereof). The controversy around PFOF is fundamentally about
        whether the convenience and zero-commission structure that retail
        traders received in exchange was a fair trade for the execution quality
        they may have given up.
      </p>

      <h2>Why this matters for active traders</h2>

      <p>
        For long-term buy-and-hold investors trading large-cap stocks with
        tight spreads, PFOF has a negligible practical impact. A penny or two
        per share on a quarterly purchase of SPY is economically irrelevant
        against years of compounding. For active traders making dozens of
        trades per week, or anyone trading less liquid names where spreads
        are wider, the cumulative execution quality drag can be meaningful.
      </p>

      <p>
        The numbers that surface occasionally from regulatory analysis are
        instructive. Studies have found that retail orders routed through
        PFOF arrangements sometimes receive materially worse fills than the
        national best bid and offer (NBBO) — particularly in options markets,
        where spreads are wider and the economics favor the market-maker more.
        An options trader making 20 trades a week with a consistent half-cent-
        per-contract drag is giving up real money over the course of a year
        without realizing it.
      </p>

      <h2>How to measure your own fill quality</h2>

      <p>
        The most direct way to evaluate whether PFOF is costing you is to
        compare your actual fill prices against the NBBO at the time your
        orders executed. Most brokerages are now required to publish trade
        execution quality statistics quarterly. These reports, filed under SEC
        Rule 605 and 606, show average price improvement (or lack thereof)
        by order type and stock. They're dense, but they're public.
      </p>

      <p>
        At the practical level, you can monitor your fills manually. When
        you enter a market order on a liquid stock with a $0.01 spread, you
        should fill at or very near the midpoint. If you're consistently
        filling at the offer when buying or at the bid when selling, with
        no improvement, your broker is capturing the full spread rather
        than passing any savings to you.{' '}
        <Link to="/glossary/dark-pool" className="text-primary hover:underline">
          Dark pool
        </Link>{' '}
        executions through some brokers can actually provide better fills
        on large orders by accessing institutional counterparties, which adds
        another layer of complexity to the quality picture.
      </p>

      <h2>The regulatory debate and what might change</h2>

      <p>
        PFOF is currently banned in the UK and Canada, and has been under
        continuous SEC scrutiny in the US. SEC Chair Gary Gensler proposed
        reforms in 2022-2023 that would have introduced an auction mechanism
        for retail orders, theoretically creating competition for fills.
        The rule was controversial, attracted significant pushback from
        both brokerages and some market-making firms, and its final form
        remained uncertain at the time of writing. The debate is unlikely
        to end — the question of who captures the economics of retail order
        flow is too large to settle quietly.
      </p>

      <h2>Track your fills in your Trade Journal</h2>

      <p>
        The most actionable response to PFOF concerns is to track your own
        execution quality systematically. Finotaur's{' '}
        <Link to="/app/journal" className="text-primary hover:underline">
          Trade Journal
        </Link>{' '}
        lets you log every fill with the actual executed price, so you can
        review your fill quality across brokers and order types over time.
        Alongside the{' '}
        <Link to="/glossary/options-flow" className="text-primary hover:underline">
          options flow
        </Link>{' '}
        data showing institutional fills, you start to see the full picture
        of how your execution quality compares to the professionals operating
        on the same names.
      </p>
    </>
  );
}
