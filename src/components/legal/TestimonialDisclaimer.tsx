import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * TESTIMONIAL DISCLAIMER PAGE
 */
const TestimonialDisclaimer = () => {
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
          <h1 className="text-4xl font-bold mb-4">Testimonial Disclaimer</h1>
          <p className="text-muted-foreground mb-8">Last updated: May 2026</p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">1. Individual Results May Vary</h2>
          <p>
            The testimonials, reviews, and case studies displayed on this site represent the experiences of the specific individuals identified. They do not necessarily represent the experience of every Finotaur user. Outcomes depend on numerous factors, including market conditions, an individual trader's discipline, capital, experience, time commitment, and personal decision-making. Finotaur makes no representation or warranty that any user will achieve results similar to those described.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">2. No Guarantee of Performance</h2>
          <p>
            Trading futures, equities, options, cryptocurrencies, and other financial instruments involves substantial risk of loss and is not suitable for every investor. Past performance — whether actual, hypothetical, or simulated — is not necessarily indicative of future results. No statement on this site is intended as a promise or guarantee of profit, success, or favorable outcomes of any kind.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">3. Compensation Disclosure</h2>
          <p>
            Some testimonials displayed on this site may come from individuals who received free access to Finotaur products, promotional credits, affiliate compensation, or other consideration in exchange for sharing their experience. Where this applies, Finotaur strives to disclose the material connection alongside the testimonial in accordance with the FTC's Endorsement Guides (16 C.F.R. Part 255). All compensated endorsers express opinions they genuinely hold based on their actual use of the platform.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">4. Risk Acknowledgment</h2>
          <p>
            Prospective users should not rely on any testimonial as a basis for trading decisions. Each user is responsible for evaluating whether the strategies, tools, market data, journal features, or trading approaches referenced are appropriate for their own financial situation, risk tolerance, and investment objectives. Finotaur does not provide personalized investment advice, and no testimonial is intended as a recommendation to buy, sell, or hold any specific security or instrument.
          </p>

          <p className="mt-16 text-muted-foreground">
            &copy; {new Date().getFullYear()} Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestimonialDisclaimer;
