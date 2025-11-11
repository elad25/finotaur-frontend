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
            We do not sell personal data. We may share limited data with secure third parties (e.g., PayPlus, Supabase, SnapTrade) solely for functionality and compliance.
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

          <p className="mt-16 text-muted-foreground">
            © 2025 Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;