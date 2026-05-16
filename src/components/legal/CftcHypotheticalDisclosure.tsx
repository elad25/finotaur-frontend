import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * CFTC HYPOTHETICAL PERFORMANCE DISCLOSURE PAGE
 */
const CftcHypotheticalDisclosure = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30">
        <div className="container mx-auto px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-2">CFTC Hypothetical Performance Disclosure</h1>
          <p className="text-sm text-muted-foreground mb-4">Required by CFTC Rule 4.41(b)</p>
          <p className="text-muted-foreground mb-8">Last updated: May 2026</p>

          {/* Official CFTC 4.41(b) statement — verbatim */}
          <div className="p-6 rounded-lg border border-border/60 bg-card/40 mb-12">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
              Official CFTC 4.41(b) Statement
            </p>
            <p className="text-sm font-medium uppercase leading-relaxed">
              Hypothetical or simulated performance results have certain inherent limitations. Unlike an actual performance record, simulated results do not represent actual trading. Also, since the trades have not been executed, the results may have under- or over-compensated for the impact, if any, of certain market factors, such as lack of liquidity. Simulated trading programs in general are also subject to the fact that they are designed with the benefit of hindsight. No representation is being made that any account will or is likely to achieve profits or losses similar to those shown.
            </p>
          </div>

          <p>
            Finotaur provides backtesting, strategy simulation, replay, walk-forward, Monte Carlo, and other hypothetical performance tools as part of its journal and analytics suite. Any output produced by these tools — including equity curves, win rates, profit factors, Sharpe ratios, drawdown statistics, expectancy values, and similar metrics — reflects hypothetical performance only and is subject to the limitations described below. The disclosures on this page apply to all such output and to any results derived from third-party data feeds referenced on this site, including Kinetick, NinjaTrader, Tradovate, or other market data providers.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">1. Limitations of Hypothetical Results</h2>
          <p>
            Hypothetical or simulated performance results have certain inherent limitations. Unlike an actual performance record, simulated results do not represent actual trading. Because the trades have not actually been executed in a live market, the results may have under- or over-compensated for the impact, if any, of certain market factors — including but not limited to lack of liquidity, slippage, partial fills, order rejection, exchange and clearing fees, broker commissions, financing costs, taxes, and other transaction expenses. Real trading conditions can produce materially different outcomes from those modeled.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">2. No Live Trading Record</h2>
          <p>
            No representation is being made that any account will or is likely to achieve profits or losses similar to those shown in any backtest, simulation, replay, or other hypothetical scenario produced by Finotaur. In fact, there are frequently sharp differences between hypothetical performance results and the actual results subsequently achieved by any particular trading program. The performance figures displayed on this site that are derived from non-live data reflect hypothetical results only and do not represent actual trades placed in a live market by any user.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">3. Hindsight Bias</h2>
          <p>
            Hypothetical performance is constructed with full knowledge of how markets actually behaved during the test period. Strategy parameters, entry and exit rules, position sizing, and risk controls can be — and frequently are — adjusted to better fit historical price action. This benefit of hindsight is unavailable in live trading, where future market behavior is unknown. A backtested or simulated result that appears profitable when viewed retrospectively may not be reproducible in forward live trading, and users should treat hypothetical metrics as illustrative rather than predictive.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">4. Market Conditions May Differ</h2>
          <p>
            Markets evolve. Volatility regimes shift, liquidity profiles change, regulatory frameworks are updated, exchange rules are revised, and the composition of market participants changes over time. A strategy that performed favorably under one set of market conditions may underperform — or fail entirely — under a different set of conditions. Hypothetical results derived from a specific historical window cannot account for future regime changes, structural market reforms, unanticipated geopolitical or macroeconomic events, or other factors that may materially affect live results.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">5. User Responsibility</h2>
          <p>
            Users are solely responsible for evaluating the suitability of any strategy, signal, or trading approach referenced on or derived from this site. Nothing presented as a hypothetical result constitutes investment advice, a guarantee of performance, or a recommendation to enter, exit, or hold any specific position. Users should consider consulting with an independent financial advisor before committing capital based on any backtested or simulated output.
          </p>

          <p className="mt-16 text-muted-foreground">
            &copy; {new Date().getFullYear()} Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CftcHypotheticalDisclosure;
