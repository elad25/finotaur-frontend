// src/components/landing-new/NinjaTraderCompliance.tsx
// ================================================
// COMPLIANCE FOOTER — Required full-text disclosures
//
// Created 2026-05-21 per NinjaTrader Vendor Guidelines feedback from
// Juliet Wu (Manager, Business Development, NT). Per the vendor review:
//
//   "Risk Disclosure, CFTC Hypothetical Performance Disclosure, and
//    Testimonial Disclaimer ... must appear as full written text on the
//    site — linked pages alone are not sufficient."
//
// 2026-05-23: condensed visual footprint per Elad's request — text is
// still rendered in full on the landing page (NT requirement intact),
// but presented in a compact, collapsible <details> block that opens
// by default and can be collapsed by the visitor. Smaller font, tighter
// spacing, bounded-height scroll container.
// ================================================

const NinjaTraderCompliance = () => {
  return (
    <section
      className="relative bg-section-deep border-t border-gold-eyebrow-hairline/40"
      aria-labelledby="compliance-disclosures-heading"
    >
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-4">
        <details open className="group">
          <summary
            id="compliance-disclosures-heading"
            className="flex items-center justify-between cursor-pointer list-none text-[10px] uppercase tracking-[0.2em] text-gold-primary/60 font-medium py-2 hover:text-gold-primary/80 transition-colors"
          >
            <span>Important Disclosures</span>
            <span
              aria-hidden="true"
              className="text-ink-muted text-[10px] transition-transform group-open:rotate-180"
            >
              ▾
            </span>
          </summary>

          <div className="mt-2 max-h-64 overflow-y-auto pr-3 space-y-3 text-[10px] leading-snug text-ink-muted/90">
            {/* ─── Risk Disclosure ──────────────────────────────────────── */}
            <div>
              <h3 className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider mb-1">
                Risk Disclosure
              </h3>
              <p className="mb-1.5">
                Trading futures contracts and options on futures involves substantial risk of loss and is not suitable for every investor. The value of an investment may go down as well as up, and a trader may lose more than the amount originally invested. A futures contract is a leveraged derivative instrument whose value is tied to an underlying asset such as an equity index, commodity, currency, or interest rate. Because positions are typically held with only a fraction of the contract's notional value deposited as initial margin, small adverse price movements can produce losses substantially greater than the amount deposited.
              </p>
              <p className="mb-1.5">
                Margin trading magnifies both gains and losses. The leveraged nature of futures means that a relatively small market movement may produce a proportionately larger movement — favorable or unfavorable — in the value of a trader's account. A trader may sustain a total loss of the initial margin funds and any additional funds deposited with the broker to maintain a position. If the market moves against an open position, the trader may be called upon to deposit additional funds on short notice; failure to do so may result in liquidation of the position at a loss.
              </p>
              <p className="mb-1.5">
                Futures markets can be highly volatile. Prices may move sharply and unpredictably in response to economic data releases, geopolitical events, central bank decisions, supply or demand shocks, and other factors. Under certain conditions — including limit-up or limit-down moves, low-liquidity sessions, gap openings, or broader market dislocations — it may be difficult or impossible to execute trades at desired prices. Stop-loss and stop-limit orders do not guarantee execution at the specified price and may be filled at substantially worse prices in fast-moving markets.
              </p>
              <p>
                Finotaur makes no representation or warranty that any user will achieve profits or avoid losses through use of the Finotaur platform, its trade journal, its analytics, or any integrated third-party service — including NinjaTrader, Kinetick, Tradovate, or any other broker or market data provider referenced on this site. The decision to enter, exit, or hold any position, and the responsibility for the outcome, rests solely with the individual user. Users should only commit capital they can afford to lose entirely, and are encouraged to consult with an independent financial advisor before engaging in futures trading. Nothing on this site, including any output from journal analytics, AI features, or third-party data integrations, constitutes investment advice, a solicitation, or a recommendation to buy, sell, or hold any specific security, futures contract, or other financial instrument.
              </p>
            </div>

            {/* ─── CFTC Rule 4.41(b) — verbatim ─────────────────────────── */}
            <div>
              <h3 className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider mb-1">
                CFTC Hypothetical Performance Disclosure (Rule 4.41(b))
              </h3>
              <p className="font-medium uppercase mb-1.5 text-ink-secondary">
                Hypothetical or simulated performance results have certain inherent limitations. Unlike an actual performance record, simulated results do not represent actual trading. Also, since the trades have not been executed, the results may have under- or over-compensated for the impact, if any, of certain market factors, such as lack of liquidity. Simulated trading programs in general are also subject to the fact that they are designed with the benefit of hindsight. No representation is being made that any account will or is likely to achieve profits or losses similar to those shown.
              </p>
              <p className="mb-1.5">
                Finotaur provides backtesting, strategy simulation, replay, walk-forward, Monte Carlo, and other hypothetical-performance tools as part of its journal and analytics suite. Any output produced by these tools — including equity curves, win rates, profit factors, Sharpe ratios, drawdown statistics, expectancy values, and similar metrics — reflects hypothetical performance only and is subject to the limitations described above. Real trading conditions can produce materially different outcomes from those modeled. Because simulated trades have not actually been executed in a live market, the results may have under- or over-compensated for slippage, partial fills, order rejection, exchange and clearing fees, broker commissions, financing costs, taxes, and other transaction expenses.
              </p>
              <p>
                Hypothetical performance is constructed with full knowledge of how markets actually behaved during the test period. Strategy parameters, entry and exit rules, position sizing, and risk controls can be — and frequently are — adjusted to better fit historical price action. This benefit of hindsight is unavailable in live trading. A backtested or simulated result that appears profitable when viewed retrospectively may not be reproducible in forward live trading, and users should treat hypothetical metrics as illustrative rather than predictive. There are frequently sharp differences between hypothetical performance results and the actual results subsequently achieved by any particular trading program.
              </p>
            </div>

            {/* ─── Testimonial Disclaimer ───────────────────────────────── */}
            <div>
              <h3 className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider mb-1">
                Testimonial Disclaimer
              </h3>
              <p className="mb-1.5">
                The testimonials, reviews, and case studies displayed on this site represent the experiences of the specific individuals identified. They do not necessarily represent the experience of every Finotaur user. Outcomes depend on numerous factors, including market conditions, an individual trader's discipline, capital, experience, time commitment, and personal decision-making. Finotaur makes no representation or warranty that any user will achieve results similar to those described.
              </p>
              <p className="mb-1.5">
                Some testimonials displayed on this site may come from individuals who received free access to Finotaur products, promotional credits, affiliate compensation, or other consideration in exchange for sharing their experience. Where this applies, Finotaur strives to disclose the material connection alongside the testimonial in accordance with the FTC's Endorsement Guides (16 C.F.R. Part 255). All compensated endorsers express opinions they genuinely hold based on their actual use of the platform.
              </p>
              <p>
                Prospective users should not rely on any testimonial as a basis for trading decisions. Each user is responsible for evaluating whether the strategies, tools, market data, journal features, or trading approaches referenced are appropriate for their own financial situation, risk tolerance, and investment objectives. Finotaur does not provide personalized investment advice, and no testimonial is intended as a recommendation to buy, sell, or hold any specific security or instrument.
              </p>
            </div>

            {/* ─── NinjaTrader vendor attribution ───────────────────────── */}
            <div className="pt-1.5 border-t border-gold-eyebrow-hairline/30">
              <p className="text-[9px] text-ink-muted/80">
                Finotaur is an Official Vendor of NinjaTrader, LLC. References to NinjaTrader, Tradovate, and Kinetick on this site describe a vendor / integration relationship. Finotaur is not affiliated with, owned by, or controlled by NinjaTrader, LLC. Use of the NinjaTrader, Tradovate, and Kinetick names and logos is governed by NinjaTrader's vendor brand guidelines. Trading on NinjaTrader and Tradovate, and use of Kinetick market data, are subject to those platforms' own terms, fees, and risk disclosures.
              </p>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
};

export default NinjaTraderCompliance;
