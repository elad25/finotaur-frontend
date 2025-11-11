import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * 📜 TERMS OF USE PAGE
 * Complete legal terms and conditions for Finotaur platform
 */
const TermsOfUse = () => {
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
          <h1 className="text-4xl font-bold mb-4">Terms of Use</h1>
          <p className="text-muted-foreground mb-8">Last updated: November 2025</p>

          <p className="text-lg mb-6">
            Welcome to Finotaur. By accessing or using this website, platform, or any associated services ("Services"), you agree to these Terms of Use. If you do not agree, please do not use our Services.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">1. Educational Purpose Only</h2>
          <p>
            Finotaur provides market data, analytics, and trading tools for educational and informational purposes only. Nothing on this platform constitutes financial, investment, tax, or legal advice. All trades or financial decisions made based on information from Finotaur are at your own risk.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">2. Eligibility</h2>
          <p>
            You must be at least 18 years old to use Finotaur.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">3. Intellectual Property</h2>
          <p>
            All content, design, text, code, software, logos, and graphics are the property of Finotaur and protected by international copyright and trademark laws. You may not copy, reproduce, or distribute any content without written permission.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">4. Data Sources and Accuracy</h2>
          <p>
            Finotaur aggregates data from third-party providers such as Polygon, SEC, and FRED. We do not guarantee the accuracy, completeness, or timeliness of this information.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">5. Limitation of Liability</h2>
          <p>
            Finotaur and its affiliates shall not be liable for any direct, indirect, or consequential losses resulting from the use or inability to use the Services, including data errors or financial loss.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">6. User Conduct</h2>
          <p>
            You agree not to use Finotaur for unlawful purposes, scraping, reverse-engineering, or reselling data. Any abuse will result in immediate account termination.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">7. Subscriptions and Payments</h2>
          <p>
            All payments are processed securely via PayPlus. Finotaur does not store payment details. For billing, refunds, or disputes, refer to our Refund Policy.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">8. Governing Law</h2>
          <p>
            These Terms are governed by the laws of Israel. Any dispute shall be subject to the exclusive jurisdiction of the courts in Tel Aviv, Israel.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">9. Updates</h2>
          <p>
            We may update these Terms from time to time. Continued use of the platform constitutes acceptance of the latest version.
          </p>

          <p className="mt-16 text-muted-foreground">
            © 2025 Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;