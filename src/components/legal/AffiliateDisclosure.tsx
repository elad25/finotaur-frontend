import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * AFFILIATE DISCLOSURE PAGE
 *
 * FTC-required disclosure for affiliate and partner links per
 * 16 C.F.R. Part 255 ("Endorsement Guides"). Created 2026-05-21 to
 * resolve broken /legal/affiliate-disclosure link flagged by
 * NinjaTrader Vendor compliance (Juliet Wu).
 */
const AffiliateDisclosure = () => {
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
          <h1 className="text-4xl font-bold mb-2">Affiliate Disclosure</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Pursuant to 16 C.F.R. Part 255 (FTC Endorsement Guides)
          </p>
          <p className="text-muted-foreground mb-8">Last updated: May 2026</p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">1. Material Connection Disclosure</h2>
          <p>
            Finotaur participates in affiliate marketing programs operated by select brokers, market-data providers, prop firms, educational publishers, and other service providers in the trading and financial technology space. When you click an outbound link on this site that is marked as a partner or sponsored link, or that routes through a tracking domain associated with one of our affiliate programs, Finotaur may receive a commission, referral payment, or other consideration if you subsequently sign up for, purchase, or fund an account with that third party. Receipt of compensation never affects the price you pay; affiliate commissions are paid by the third party out of their own marketing budget.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">2. Current Affiliate Relationships</h2>
          <p>
            As of the date above, Finotaur has affiliate or referral relationships with — among others — NinjaTrader, Tradovate, Kinetick, and various proprietary trading firms whose logos or names may appear on this site. Specific relationships may change over time without prior notice; the presence of a logo, link, or mention on this site does not necessarily indicate an active commercial relationship, and the absence of disclosure on a specific page does not imply that no relationship exists. Where a material connection applies, we strive to disclose it inline next to the relevant link or content in accordance with FTC guidance.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">3. Independence of Editorial Content</h2>
          <p>
            Finotaur produces educational content, market commentary, trade-journal analytics, and review material independently of any commercial relationship described above. We do not allow affiliate compensation to dictate the substance of reviews, ratings, or recommendations. Where a product is praised or criticized on this site, the assessment reflects the genuine opinion of the author based on actual use or independent research. That said, no review should be relied upon as a substitute for the reader's own due diligence; users are encouraged to evaluate any third-party product or service against their own financial situation, risk tolerance, and objectives before opening an account or committing capital.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">4. NinjaTrader Vendor Relationship</h2>
          <p>
            Finotaur is an Official Vendor of NinjaTrader, LLC. References to NinjaTrader, Tradovate, or Kinetick on this site describe a vendor / integration relationship under which Finotaur connects to those platforms to provide analytics and journaling services to mutual customers. Finotaur is not affiliated with, owned by, or controlled by NinjaTrader, LLC, and nothing on this site should be construed as an endorsement of Finotaur's trade-journal or analytics services by NinjaTrader. Use of the NinjaTrader, Tradovate, or Kinetick names and logos is governed by NinjaTrader's vendor brand guidelines.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">5. No Investment Advice or Performance Guarantee</h2>
          <p>
            The presence of an affiliate link on this site is not a recommendation to open an account, fund a position, purchase a service, or pursue any specific trading strategy. Trading futures, equities, options, cryptocurrencies, and other financial instruments involves substantial risk of loss and is not suitable for every investor. Past performance — whether actual, hypothetical, or simulated — is not necessarily indicative of future results. See our{' '}
            <Link to="/legal/futures-risk" className="text-primary hover:underline">Futures Risk Disclosure</Link>{' '}
            and{' '}
            <Link to="/legal/cftc-hypothetical-performance" className="text-primary hover:underline">CFTC Hypothetical Performance Disclosure</Link>{' '}
            for additional information.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">6. Questions</h2>
          <p>
            If you have questions about a specific affiliate relationship, a commission arrangement, or whether a particular link compensates Finotaur, please contact us at{' '}
            <a href="mailto:legal@finotaur.com" className="text-primary hover:underline">legal@finotaur.com</a>.
          </p>

          <p className="mt-16 text-muted-foreground">
            &copy; {new Date().getFullYear()} Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AffiliateDisclosure;
