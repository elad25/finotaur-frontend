import { Link } from 'react-router-dom';

/**
 * Glossary content: Sector Rotation
 */
export default function SectorRotationContent() {
  return (
    <>
      <p>
        Sector rotation is the cyclical movement of investment capital between
        different sectors of the economy as the business cycle progresses.
        The theory — and it has substantial empirical backing — is that
        different sectors outperform at different stages of the economic cycle,
        and institutional investors actively reallocate between them in
        anticipation of what's coming next. When you understand which sectors
        historically lead and which lag at each phase, you have a framework
        for allocating capital that goes beyond individual stock selection.
      </p>

      <p>
        The rotation tends to follow a sequence loosely tied to four phases:
        early expansion (the recovery from recession), mid-cycle (growth
        accelerating), late cycle (growth slowing, inflation elevated), and
        contraction (recession). Capital doesn't wait for the official
        economic data to confirm the transition — it anticipates. The market
        is often already rotating into the next phase's leading sectors before
        the economic data catches up.
      </p>

      <h2>Which sectors lead at each phase</h2>

      <p>
        Early cycle: the sectors that come alive first out of recession are
        typically consumer discretionary (people start spending again),
        financials (credit spreads tighten, lending picks up), and real estate
        (interest-rate sensitive, benefits from the initial cut cycle). Technology
        also tends to lead early because the market reprices growth multiples
        quickly when rates fall. These are the sectors that get hit hardest
        in recessions and snap back fastest when conditions improve.
      </p>

      <p>
        Mid-cycle: technology continues to lead, industrials pick up as
        business investment accelerates, and materials benefit from
        infrastructure spending and supply chain restocking. This is the
        broadest-participation phase — the economic expansion is underway,
        most sectors are working, and the indices make strong upward progress.
        Most bull markets spend their longest stretch in mid-cycle.
      </p>

      <p>
        Late cycle: energy and materials often outperform as commodity prices
        rise with economic activity near its peak. Industrials can stay
        strong. Technology and consumer discretionary start to underperform
        relative to the cycle as valuations get stretched and the market
        begins pricing in the eventual slowdown. Inflation pressures are
        typically highest in late cycle, which is why the Fed is usually
        tightening here — creating headwinds for rate-sensitive sectors.
      </p>

      <p>
        Contraction: utilities, consumer staples, and healthcare lead. These
        are the defensive sectors — companies that sell things people need
        regardless of economic conditions (electricity, toothpaste, hospital
        visits). Their earnings are stable, their dividends are meaningful
        relative to falling equity returns elsewhere, and their low beta means
        less drawdown when the indices fall. A{' '}
        <Link to="/glossary/death-cross" className="text-primary hover:underline">
          death cross
        </Link>{' '}
        on the S&P 500 accompanied by relative strength in XLU and XLP is a
        strong signal that the market is pricing in the contraction phase.
      </p>

      <h2>How to trade sector rotation</h2>

      <p>
        The most common implementation is through sector ETFs. SPDR offers
        the full suite: XLK (technology), XLF (financials), XLE (energy),
        XLI (industrials), XLP (consumer staples), XLU (utilities), XLV
        (healthcare), XLY (consumer discretionary), XLB (materials), XLRE
        (real estate), XLC (communication services). Each gives you clean,
        diversified exposure to a sector without single-stock risk.
      </p>

      <p>
        The tactical edge comes from looking at relative strength — comparing
        each sector's performance against the broad market (SPY or the S&P
        500 index). A sector showing improving relative strength even as the
        market consolidates is often the next rotation target. A sector with
        a{' '}
        <Link to="/glossary/golden-cross" className="text-primary hover:underline">
          golden cross
        </Link>{' '}
        forming while the sector's relative strength line is also turning up
        is a high-conviction setup for the start of a multi-month leadership
        period.
      </p>

      <h2>Sector rotation and options flow</h2>

      <p>
        Large sector rotations leave distinctive signatures in{' '}
        <Link to="/glossary/options-flow" className="text-primary hover:underline">
          options flow
        </Link>
        . When institutional capital is rotating out of technology into
        defensive sectors, you see a surge in put buying on tech ETFs (XLK,
        QQQ) and call buying on defensive ETFs (XLU, XLV) often weeks before
        the price action makes the rotation obvious. Watching the flow on
        sector ETFs is one of the most reliable ways to see rotation happening
        in real time rather than catching it in the rearview.
      </p>

      <h2>Finotaur's Sector Analyzer</h2>

      <p>
        Finotaur's Sector Analyzer (Pro tier) maps relative strength across
        all eleven GICS sectors, overlays the moving average structure for
        each, and surfaces unusual options activity at the sector ETF level —
        giving you an integrated view of where institutional capital is moving
        before individual stock prices reflect the rotation.
      </p>
    </>
  );
}
