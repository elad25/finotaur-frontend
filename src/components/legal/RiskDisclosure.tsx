import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

/**
 * ⚠️ RISK DISCLOSURE PAGE
 * Trading risk warnings and disclaimers
 */
const RiskDisclosure = () => {
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
              <h3 className="text-lg font-semibold text-amber-500 mb-2">Important Risk Warning</h3>
              <p className="text-sm text-muted-foreground">
                Trading financial instruments involves substantial risk and may not be suitable for all investors.
              </p>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-8">Risk Disclosure Statement</h1>

          <p className="text-lg">
            Trading involves substantial risk of loss and is not suitable for every investor. You may lose more than your initial investment.
          </p>

          <p className="mt-6">
            Before trading, carefully consider your financial objectives, level of experience, and risk appetite. You are solely responsible for any losses incurred as a result of trading activities or reliance on Finotaur's tools and insights.
          </p>

          <p className="mt-6">
            Finotaur does not guarantee profitability or performance. Data and analysis are for educational purposes only.
          </p>

          <p className="mt-16 text-muted-foreground">
            © 2025 Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RiskDisclosure;