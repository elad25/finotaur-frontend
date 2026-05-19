import { Link } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { openPreferencesModal } from '@/lib/consent';

/**
 * 🍪 COOKIE POLICY PAGE
 * Cookie usage and user control information
 */
const CookiePolicy = () => {
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
          <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>

          {/* Manage preferences CTA — prominently placed at top of page */}
          <div className="not-prose mb-10">
            <button
              type="button"
              onClick={openPreferencesModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gold/30 bg-gold/5 text-gold hover:bg-gold/10 hover:border-gold/50 transition-colors text-sm font-medium"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Manage your cookie preferences
            </button>
          </div>

          <p className="text-lg">
            Finotaur uses cookies and similar technologies to enhance your browsing experience, analyze usage, and deliver personalized content.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Types of Cookies</h2>
          <ul className="space-y-2">
            <li><strong>Essential cookies</strong> — required for login and navigation.</li>
            <li><strong>Analytics cookies</strong> — for understanding platform usage (e.g., Google Analytics).</li>
            <li><strong>Marketing cookies</strong> — to measure ad performance and affiliate attribution.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Third Parties</h2>
          <p>
            We use the following third-party services that may set cookies or receive data subject to their own privacy policies:
          </p>
          <ul className="space-y-2">
            <li>
              <strong>Google LLC (Google Analytics 4)</strong> —{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Privacy Policy
              </a>
            </li>
            <li>
              <strong>PostHog Inc.</strong> —{' '}
              <a
                href="https://posthog.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                PostHog Privacy Policy
              </a>
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Cookies We Set</h2>
          <p>
            The cookies we may set are limited to the list below. Cookies labeled Analytics or Marketing are only set after you grant consent via the banner.
          </p>

          <div className="not-prose overflow-x-auto mt-6 mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left py-3 pr-4 font-semibold text-foreground whitespace-nowrap">Cookie name</th>
                  <th className="text-left py-3 pr-4 font-semibold text-foreground whitespace-nowrap">Category</th>
                  <th className="text-left py-3 pr-4 font-semibold text-foreground">Purpose</th>
                  <th className="text-left py-3 pr-4 font-semibold text-foreground whitespace-nowrap">Retention</th>
                  <th className="text-left py-3 font-semibold text-foreground whitespace-nowrap">Set by</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">finotaur_cc</td>
                  <td className="py-3 pr-4 whitespace-nowrap">Essential</td>
                  <td className="py-3 pr-4">Stores your cookie consent choices so we don't ask again</td>
                  <td className="py-3 pr-4 whitespace-nowrap">365 days</td>
                  <td className="py-3 whitespace-nowrap">Finotaur (1st party)</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">_ga</td>
                  <td className="py-3 pr-4 whitespace-nowrap">Analytics</td>
                  <td className="py-3 pr-4">Distinguishes unique visitors for traffic analysis</td>
                  <td className="py-3 pr-4 whitespace-nowrap">2 years</td>
                  <td className="py-3 whitespace-nowrap">Google LLC (Google Analytics 4)</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">_ga_QVNWXBTRVC</td>
                  <td className="py-3 pr-4 whitespace-nowrap">Analytics</td>
                  <td className="py-3 pr-4">Persists session state for Google Analytics</td>
                  <td className="py-3 pr-4 whitespace-nowrap">2 years</td>
                  <td className="py-3 whitespace-nowrap">Google LLC</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">_gid</td>
                  <td className="py-3 pr-4 whitespace-nowrap">Analytics</td>
                  <td className="py-3 pr-4">Distinguishes users for 24-hour session analysis (legacy GA, may appear)</td>
                  <td className="py-3 pr-4 whitespace-nowrap">24 hours</td>
                  <td className="py-3 whitespace-nowrap">Google LLC</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">ph_&lt;key&gt;_posthog</td>
                  <td className="py-3 pr-4 whitespace-nowrap">Analytics</td>
                  <td className="py-3 pr-4">Stores PostHog distinct ID and session info for product analytics</td>
                  <td className="py-3 pr-4 whitespace-nowrap">1 year</td>
                  <td className="py-3 whitespace-nowrap">PostHog Inc.</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">__ph_opt_in_out_&lt;key&gt;</td>
                  <td className="py-3 pr-4 whitespace-nowrap">Analytics</td>
                  <td className="py-3 pr-4">Stores your PostHog opt-out preference</td>
                  <td className="py-3 pr-4 whitespace-nowrap">10 years</td>
                  <td className="py-3 whitespace-nowrap">PostHog Inc.</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">finotaur_affiliate_code</td>
                  <td className="py-3 pr-4 whitespace-nowrap">Marketing</td>
                  <td className="py-3 pr-4">Stores your affiliate referral code for attribution during checkout</td>
                  <td className="py-3 pr-4 whitespace-nowrap">30 days</td>
                  <td className="py-3 whitespace-nowrap">Finotaur (1st party)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm text-muted-foreground">
            Third-party cookies (Google, PostHog) are governed by those providers' privacy policies — see the 'Third Parties' section above for links.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Your Control</h2>
          <p>
            You can disable cookies in your browser settings or use the preferences button above to update your choices at any time. By continuing to use Finotaur, you consent to our use of cookies as described.
          </p>

          <p className="mt-16 text-muted-foreground">
            © 2025 Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
