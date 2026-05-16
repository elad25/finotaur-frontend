import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * FUTURES RISK DISCLOSURE PAGE
 */
const FuturesRiskDisclosure = () => {
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
          <h1 className="text-4xl font-bold mb-4">Futures Risk Disclosure</h1>
          <p className="text-muted-foreground mb-8">Last updated: May 2026</p>

          <p>
            Trading futures contracts and options on futures involves substantial risk of loss and is not suitable for every investor. The value of an investment may go down as well as up, and a trader may lose more than the amount originally invested. Before engaging in futures trading through Finotaur or any third-party broker integration referenced on this site — including NinjaTrader, Kinetick, Tradovate, or any other platform — you should carefully read and understand the disclosures below.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">1. Nature of Futures Trading</h2>
          <p>
            A futures contract is a leveraged derivative instrument whose value is tied to an underlying asset such as an equity index, commodity, currency, or interest rate. Because positions are typically held with only a fraction of the contract's notional value deposited as initial margin, small adverse price movements can produce losses substantially greater than the amount deposited. Futures trading requires active risk management, sufficient capital, and a thorough understanding of contract specifications, margin mechanics, and settlement procedures. It is not suitable for all investors, and prospective participants should carefully consider their financial situation, objectives, level of experience, and risk appetite before trading.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">2. Margin and Leverage Risk</h2>
          <p>
            Margin trading magnifies both gains and losses. The leveraged nature of futures means that a relatively small market movement may produce a proportionately larger movement — favorable or unfavorable — in the value of a trader's account. A trader may sustain a total loss of the initial margin funds and any additional funds deposited with the broker to maintain a position. If the market moves against an open position, or if margin requirements are increased, the trader may be called upon to deposit additional funds on short notice in order to maintain the position. Failure to comply with a request for additional funds within the time prescribed may result in liquidation of the position at a loss, and the trader will be liable for any resulting deficit in the account.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">3. Market Volatility</h2>
          <p>
            Futures markets can be highly volatile. Prices may move sharply and unpredictably in response to economic data releases, geopolitical events, central bank decisions, supply or demand shocks, and other factors that may be difficult or impossible to anticipate. Under certain market conditions — including limit-up or limit-down moves, low-liquidity sessions, gap openings, or broader market dislocations — it may become difficult or impossible to execute trades at desired prices, or at all. Stop-loss and stop-limit orders do not guarantee execution at the specified price and may be filled at substantially worse prices in fast-moving markets.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">4. Past Performance Disclaimer</h2>
          <p>
            Past performance — whether actual, hypothetical, or simulated — is not necessarily indicative of future results. No trading method, strategy, system, journal, analytics tool, or platform can guarantee profits or eliminate losses. The fact that an account or strategy has performed in a particular manner during a specific period does not imply that it will perform similarly in the future. Market conditions, regulations, liquidity, and participant behavior change continually, and approaches that have worked in one environment may underperform or fail entirely in another.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">5. No Guarantee of Profit</h2>
          <p>
            Finotaur makes no representation or warranty that any user will achieve profits or avoid losses through use of the Finotaur platform, its trade journal, its analytics, or any integrated third-party service — including NinjaTrader, Kinetick, Tradovate, or any other broker or market data provider referenced on this site. The decision to enter, exit, or hold any position, and the responsibility for the outcome, rests solely with the individual user. Users should only commit capital they can afford to lose entirely, and are encouraged to consult with an independent financial advisor, accountant, or attorney before engaging in futures trading.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">6. No Investment Advice</h2>
          <p>
            Nothing on this site, including any output from journal analytics, AI features, or third-party data integrations, constitutes investment advice, a solicitation, or a recommendation to buy, sell, or hold any specific security, futures contract, or other financial instrument. Information is provided for educational and informational purposes only.
          </p>

          <p className="mt-16 text-muted-foreground">
            &copy; {new Date().getFullYear()} Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FuturesRiskDisclosure;
