// [DRAFT — NOT LAWYER-REVIEWED] Last drafted: May 15, 2026
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

/**
 * FUTURES RISK DISCLOSURE PAGE
 * DRAFT — Pending NinjaTrader-provided text.
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
          {/* Warning Banner */}
          <div className="flex items-start gap-4 p-6 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-8">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-amber-500 mb-2">DRAFT — Pending NinjaTrader-provided text</h3>
              <p className="text-sm text-muted-foreground">
                This page will be populated with the official disclosure language upon receipt from NinjaTrader.
              </p>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4">Futures Risk Disclosure</h1>
          <p className="text-muted-foreground mb-8">Last updated: May 2026</p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">1. Nature of Futures Trading</h2>
          <p>
            [Awaiting official text from NinjaTrader.]
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">2. Margin and Leverage Risk</h2>
          <p>
            [Awaiting official text from NinjaTrader.]
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">3. Market Volatility</h2>
          <p>
            [Awaiting official text from NinjaTrader.]
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">4. Past Performance Disclaimer</h2>
          <p>
            [Awaiting official text from NinjaTrader.]
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">5. No Guarantee of Profit</h2>
          <p>
            [Awaiting official text from NinjaTrader.]
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
