import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * 🔒 PRIVACY POLICY PAGE
 * Data collection, usage, and protection policies
 */
const PrivacyPolicy = () => {
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
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: November 2025</p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">1. Overview</h2>
          <p>
            Finotaur respects your privacy. This policy explains how we collect, use, and protect your data.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">2. Data We Collect</h2>
          <ul className="space-y-2">
            <li>Personal information such as name, email, and preferences during account creation.</li>
            <li>Technical data such as IP address, browser type, and cookies.</li>
            <li>Usage data related to how you interact with our dashboard and features.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12 mb-4">3. How We Use Data</h2>
          <ul className="space-y-2">
            <li>To provide and improve our Services.</li>
            <li>To send system notifications and updates.</li>
            <li>To analyze user behavior for better performance and experience.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12 mb-4">4. Data Sharing</h2>
          <p>
            We do not sell personal data. We may share limited data with secure third parties (e.g., PayPlus, Supabase) solely for functionality and compliance.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">5. Cookies</h2>
          <p>
            Finotaur uses cookies for analytics and session management. You can disable them in your browser settings.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">6. Data Retention</h2>
          <p>
            We retain data as long as necessary for legitimate business purposes or legal obligations.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">7. Security</h2>
          <p>
            We use encryption and secure protocols to protect your information. No system is 100% secure, but we take every reasonable measure.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">8. Your Rights</h2>
          <p>
            You can request data deletion or correction at any time by contacting us at{' '}
            <a href="mailto:legal@finotaur.com" className="text-primary hover:underline">
              legal@finotaur.com
            </a>.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">9. International Privacy Rights (GDPR &amp; CCPA)</h2>

          <h3 className="text-xl font-semibold mt-8 mb-3">Rights under GDPR (EEA, UK, Switzerland)</h3>
          <p>
            If you reside in the European Economic Area (EEA), the United Kingdom, or Switzerland,
            the EU General Data Protection Regulation (GDPR) grants you the following rights regarding
            your personal data:
          </p>
          <ul className="space-y-2 mt-4">
            <li><strong>Right of access</strong> — request a copy of the data we hold about you</li>
            <li><strong>Right of rectification</strong> — correct inaccurate or incomplete data</li>
            <li><strong>Right of erasure ("right to be forgotten")</strong> — request deletion of your data</li>
            <li><strong>Right of portability</strong> — receive your data in a machine-readable format</li>
            <li><strong>Right to restrict processing</strong> — limit how we use your data</li>
            <li><strong>Right to object</strong> — object to processing for marketing or analytics</li>
            <li>
              <strong>Right to withdraw consent</strong> — at any time, with no penalty (use the Cookie
              Settings link in the footer or contact support)
            </li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-3">Rights under CCPA (California residents)</h3>
          <p>
            If you reside in California, the California Consumer Privacy Act (CCPA) grants you:
          </p>
          <ul className="space-y-2 mt-4">
            <li>The right to know what personal information is collected, used, shared, or sold</li>
            <li>The right to delete personal information held by us</li>
            <li>The right to opt-out of the sale of personal information</li>
            <li>The right to non-discrimination for exercising your rights</li>
          </ul>

          <p className="mt-6">
            To exercise any of these rights, email{' '}
            <a href="mailto:support@finotaur.com" className="text-primary hover:underline">
              support@finotaur.com
            </a>
            . We respond within 30 days (GDPR) or 45 days (CCPA).
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">10. Data We Share with Third-Party Processors</h2>
          <p>
            We share limited operational data with the following processors to deliver the service.
            Each processor is either bound by a signed Data Processing Agreement (DPA) or governed by
            Terms of Service that include data processing provisions consistent with GDPR Article 28
            requirements:
          </p>

          <div className="not-prose overflow-x-auto mt-6 mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left py-3 pr-4 font-semibold text-foreground whitespace-nowrap">Processor</th>
                  <th className="text-left py-3 pr-4 font-semibold text-foreground">Purpose</th>
                  <th className="text-left py-3 pr-4 font-semibold text-foreground">Data shared</th>
                  <th className="text-left py-3 font-semibold text-foreground whitespace-nowrap">Location</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 whitespace-nowrap">Google LLC</td>
                  <td className="py-3 pr-4">Web analytics (GA4) — only after consent</td>
                  <td className="py-3 pr-4">Anonymized usage events, IP address (anonymized)</td>
                  <td className="py-3 whitespace-nowrap">United States</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 whitespace-nowrap">PostHog Inc.</td>
                  <td className="py-3 pr-4">Product analytics — only after consent</td>
                  <td className="py-3 pr-4">Distinct user ID, event metadata</td>
                  <td className="py-3 whitespace-nowrap">United States</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 whitespace-nowrap">Supabase Inc.</td>
                  <td className="py-3 pr-4">Database hosting + authentication</td>
                  <td className="py-3 pr-4">All user account data</td>
                  <td className="py-3 whitespace-nowrap">United States (ap-northeast-2 region)</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 whitespace-nowrap">Resend Inc.</td>
                  <td className="py-3 pr-4">Transactional + marketing email delivery</td>
                  <td className="py-3 pr-4">Email address, recipient name</td>
                  <td className="py-3 whitespace-nowrap">United States</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 whitespace-nowrap">Cloudflare Inc.</td>
                  <td className="py-3 pr-4">CDN + web hosting</td>
                  <td className="py-3 pr-4">IP address, request metadata</td>
                  <td className="py-3 whitespace-nowrap">Global</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 whitespace-nowrap">Whop Inc.</td>
                  <td className="py-3 pr-4">Subscription billing</td>
                  <td className="py-3 pr-4">Email, billing data</td>
                  <td className="py-3 whitespace-nowrap">United States</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 whitespace-nowrap">Railway Corp.</td>
                  <td className="py-3 pr-4">Backend application hosting</td>
                  <td className="py-3 pr-4">Request metadata, logs</td>
                  <td className="py-3 whitespace-nowrap">United States</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-semibold mt-12 mb-4">11. Data Retention</h2>
          <ul className="space-y-2">
            <li><strong>Account data</strong>: retained until account deletion</li>
            <li><strong>Analytics events (GA4 + PostHog)</strong>: 14 months</li>
            <li><strong>Email logs</strong>: 90 days</li>
            <li><strong>Support tickets</strong>: 2 years</li>
          </ul>

          <p className="mt-16 text-muted-foreground">
            © 2025 Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;